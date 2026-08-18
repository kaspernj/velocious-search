// @ts-check

import {
  forcedArray,
  forcedBoolean,
  forcedBoundedString,
  forcedFloat,
  forcedOneOf,
  forcedPlainObject
} from "typanic"

/** @typedef {null | boolean | number | string} SearchScalar */
/** @typedef {SearchScalar | SearchScalar[]} SearchConditionValue */
/** @typedef {"eq" | "not_eq" | "cont" | "start" | "end" | "gt" | "gteq" | "lt" | "lteq"} SearchScalarPredicate */
/** @typedef {"eq" | "not_eq" | "cont" | "start" | "end" | "gt" | "gteq" | "lt" | "lteq" | "in" | "not_in" | "null"} SearchPredicate */

export const MAX_SEARCH_RELATIONSHIP_DEPTH = 3

export const SEARCH_PREDICATES = /** @type {const} */ ([
  "eq",
  "not_eq",
  "cont",
  "start",
  "end",
  "gt",
  "gteq",
  "lt",
  "lteq",
  "in",
  "not_in",
  "null"
])

const SEARCH_COMBINATORS = /** @type {const} */ (["and", "or"])

/**
 * Shared searchable attribute path.
 * @typedef {object} SearchConditionTarget
 * @property {string[]} path - Relationship path from the root resource.
 * @property {string} attribute - Exposed target-resource attribute.
 */

/** @typedef {SearchConditionTarget & {predicate: SearchScalarPredicate, value: boolean | number | string}} SearchScalarCondition */
/** @typedef {SearchConditionTarget & {predicate: "in" | "not_in", value: Array<boolean | number | string>}} SearchListCondition */
/** @typedef {SearchConditionTarget & {predicate: "null", value: boolean}} SearchNullCondition */
/** @typedef {SearchScalarCondition | SearchListCondition | SearchNullCondition} SearchCondition */

/**
 * Recursive search condition group.
 * @typedef {object} SearchGroup
 * @property {"and" | "or"} combinator - How direct conditions and child groups are combined.
 * @property {SearchCondition[]} conditions - Conditions directly inside this group.
 * @property {SearchGroup[]} groups - Nested condition groups.
 */

/**
 * Versioned search filter envelope.
 * @typedef {object} SearchFilter
 * @property {1} version - Filter contract version.
 * @property {SearchGroup} root - Root condition group.
 */

/**
 * Parser complexity limits.
 * @typedef {object} SearchFilterLimits
 * @property {number} [maxRelationshipDepth] - Maximum relationship edges in one condition path.
 * @property {number} [maxGroupDepth] - Maximum recursive group depth including the root group.
 * @property {number} [maxGroups] - Maximum groups including the root group.
 * @property {number} [maxConditions] - Maximum conditions across the whole filter.
 * @property {number} [maxListValues] - Maximum entries in one JSON/list value.
 * @property {number} [maxStringLength] - Maximum characters in one string.
 */

/**
 * Creates a new empty version-one filter.
 * @returns {SearchFilter} - Empty filter with independent group arrays.
 */
export function emptySearchFilter() {
  return {
    root: {
      combinator: "and",
      conditions: [],
      groups: []
    },
    version: 1
  }
}

/**
 * Parses and validates an untrusted search-filter value.
 * @param {unknown} value - Candidate filter value.
 * @param {SearchFilterLimits} [limits] - Optional complexity-limit overrides.
 * @returns {SearchFilter} - Parsed independent filter value.
 */
export function parseSearchFilter(value, limits) {
  return new SearchFilterParser(limits).parse(value)
}

/**
 * Checks whether a parsed filter contains no conditions at any depth.
 * @param {SearchFilter} filter - Parsed search filter.
 * @returns {boolean} - Whether the filter has no conditions.
 */
export function searchFilterIsEmpty(filter) {
  if (filter.root.conditions.length > 0) return false

  const groups = [...filter.root.groups]

  while (groups.length > 0) {
    const group = groups.pop()

    if (!group) throw new Error("Expected a search group")
    if (group.conditions.length > 0) return false

    groups.push(...group.groups)
  }

  return true
}

/**
 * Compiles a parsed filter to Velocious advanced Ransack parameters.
 * @param {SearchFilter} filter - Parsed search filter.
 * @returns {Record<string, ReturnType<typeof JSON.parse>>} - Advanced Ransack group descriptor.
 */
export function searchFilterToRansack(filter) {
  return searchGroupToRansack(filter.root)
}

/** Parses an untrusted search filter while enforcing global complexity limits. */
class SearchFilterParser {
  /** @type {number} */
  conditionCount = 0

  /** @type {number} */
  groupCount = 0

  /**
   * @param {SearchFilterLimits} [limits] - Optional complexity-limit overrides.
   */
  constructor({
    maxConditions = 25,
    maxGroupDepth = 3,
    maxGroups = 25,
    maxListValues = 100,
    maxRelationshipDepth = MAX_SEARCH_RELATIONSHIP_DEPTH,
    maxStringLength = 500
  } = {}) {
    this.maxConditions = maxConditions
    this.maxGroupDepth = maxGroupDepth
    this.maxGroups = maxGroups
    this.maxListValues = maxListValues
    this.maxRelationshipDepth = maxRelationshipDepth
    this.maxStringLength = maxStringLength
  }

  /**
   * @param {unknown} value - Candidate filter value.
   * @returns {SearchFilter} - Parsed filter.
   */
  parse(value) {
    const filter = forcedPlainObject(value, "search filter")

    this.assertExactKeys(filter, ["root", "version"], "search filter")

    return {
      root: this.parseGroup(filter.root, "search filter.root", 1),
      version: forcedOneOf(filter.version, [1], "search filter.version")
    }
  }

  /**
   * @param {unknown} value - Candidate group value.
   * @param {string} label - Value label used in validation errors.
   * @param {number} depth - Current group depth including the root.
   * @returns {SearchGroup} - Parsed group.
   */
  parseGroup(value, label, depth) {
    this.groupCount += 1

    if (this.groupCount > this.maxGroups) {
      throw new TypeError(`Expected search filter to contain at most ${this.maxGroups} groups`)
    }
    if (depth > this.maxGroupDepth) {
      throw new TypeError(`Expected ${label} depth to be at most ${this.maxGroupDepth}`)
    }

    const group = forcedPlainObject(value, label)
    const conditions = forcedArray(group.conditions, `${label}.conditions`)
    const groups = forcedArray(group.groups, `${label}.groups`)

    this.assertExactKeys(group, ["combinator", "conditions", "groups"], label)

    /** @type {SearchCondition[]} */
    const parsedConditions = []

    for (let index = 0; index < conditions.length; index += 1) {
      parsedConditions.push(this.parseCondition(conditions[index], `${label}.conditions[${index}]`))
    }

    /** @type {SearchGroup[]} */
    const parsedGroups = []

    for (let index = 0; index < groups.length; index += 1) {
      parsedGroups.push(this.parseGroup(groups[index], `${label}.groups[${index}]`, depth + 1))
    }

    return {
      combinator: forcedOneOf(group.combinator, SEARCH_COMBINATORS, `${label}.combinator`),
      conditions: parsedConditions,
      groups: parsedGroups
    }
  }

  /**
   * @param {unknown} value - Candidate condition value.
   * @param {string} label - Value label used in validation errors.
   * @returns {SearchCondition} - Parsed condition.
   */
  parseCondition(value, label) {
    this.conditionCount += 1

    if (this.conditionCount > this.maxConditions) {
      throw new TypeError(`Expected search filter to contain at most ${this.maxConditions} conditions`)
    }

    const condition = forcedPlainObject(value, label)
    const pathValues = forcedArray(condition.path, `${label}.path`)

    this.assertExactKeys(condition, ["attribute", "path", "predicate", "value"], label)

    if (pathValues.length > this.maxRelationshipDepth) {
      throw new TypeError(`Expected ${label}.path to contain at most ${this.maxRelationshipDepth} relationships`)
    }

    const predicate = forcedOneOf(condition.predicate, SEARCH_PREDICATES, `${label}.predicate`)
    /** @type {SearchConditionValue} */
    let parsedValue

    if (predicate === "in" || predicate === "not_in") {
      const listValues = forcedArray(condition.value, `${label}.value`)

      if (listValues.length < 1) {
        throw new TypeError(`Expected ${label}.value to contain at least one entry`)
      }
      if (listValues.length > this.maxListValues) {
        throw new TypeError(`Expected ${label}.value to contain at most ${this.maxListValues} entries`)
      }

      /** @type {SearchScalar[]} */
      const parsedListValues = []

      for (let index = 0; index < listValues.length; index += 1) {
        const listValue = this.parseScalar(listValues[index], `${label}.value[${index}]`)

        if (listValue === null || (typeof listValue === "string" && listValue.trim().length < 1)) {
          throw new TypeError(`Expected ${label}.value entries not to be blank`)
        }

        parsedListValues.push(listValue)
      }

      parsedValue = parsedListValues
    } else if (predicate === "null") {
      parsedValue = this.parseScalar(condition.value, `${label}.value`)
      forcedBoolean(parsedValue, `${label}.value`)
    } else {
      parsedValue = this.parseScalar(condition.value, `${label}.value`)

      if (parsedValue === null || (typeof parsedValue === "string" && parsedValue.trim().length < 1)) {
        throw new TypeError(`Expected ${label}.value not to be blank`)
      }
    }

    /** @type {string[]} */
    const path = []

    for (let index = 0; index < pathValues.length; index += 1) {
      path.push(this.parseNonBlankString(pathValues[index], `${label}.path[${index}]`))
    }

    return /** @type {SearchCondition} */ ({
      attribute: this.parseNonBlankString(condition.attribute, `${label}.attribute`),
      path,
      predicate,
      value: parsedValue
    })
  }

  /**
   * @param {unknown} value - Candidate scalar value.
   * @param {string} label - Value label used in validation errors.
   * @returns {SearchScalar} - Parsed scalar value.
   */
  parseScalar(value, label) {
    if (value === null) return null
    if (typeof value === "string") {
      return forcedBoundedString(value, {maxLength: this.maxStringLength, minLength: 0}, label)
    }
    if (typeof value === "number") return forcedFloat(value, label)
    if (typeof value === "boolean") return forcedBoolean(value, label)

    throw new TypeError(`Expected ${label} to be a JSON scalar`)
  }

  /**
   * @param {unknown} value - Candidate string.
   * @param {string} label - Value label used in validation errors.
   * @returns {string} - Bounded non-blank string.
   */
  parseNonBlankString(value, label) {
    const stringValue = forcedBoundedString(value, {maxLength: this.maxStringLength}, label)

    if (stringValue.trim().length < 1) {
      throw new TypeError(`Expected ${label} not to be blank`)
    }

    return stringValue
  }

  /**
   * @param {Record<string, unknown>} value - Parsed plain object.
   * @param {string[]} expectedKeys - Exact allowed property names.
   * @param {string} label - Value label used in validation errors.
   * @returns {void}
   */
  assertExactKeys(value, expectedKeys, label) {
    for (const key of Object.keys(value)) {
      if (!expectedKeys.includes(key)) throw new TypeError(`Unexpected ${label} property: ${key}`)
    }
  }
}

/**
 * @param {SearchGroup} group - Parsed search group.
 * @returns {Record<string, ReturnType<typeof JSON.parse>>} - Advanced Ransack group.
 */
function searchGroupToRansack(group) {
  return {
    c: group.conditions.map((condition) => ({
      a: searchConditionRansackAttribute(condition),
      p: condition.predicate,
      v: condition.value
    })),
    g: group.groups.map((childGroup) => searchGroupToRansack(childGroup)),
    m: group.combinator
  }
}

/**
 * @param {SearchCondition} condition - Parsed search condition.
 * @returns {string} - CamelCase Ransack relationship path and attribute.
 */
function searchConditionRansackAttribute(condition) {
  if (condition.path.length < 1) return condition.attribute

  let attributePath = condition.path[0]

  for (let index = 1; index < condition.path.length; index += 1) {
    attributePath += upperFirst(condition.path[index])
  }

  return attributePath + upperFirst(condition.attribute)
}

/**
 * @param {string} value - CamelCase segment.
 * @returns {string} - Segment with an uppercase first character.
 */
function upperFirst(value) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
