// @ts-check

/** @import {NamedExoticComponent, ReactNode} from "react" */

import {memo} from "react"
import PropTypes from "prop-types"
import propTypesExact from "prop-types-exact"
import Pressable from "react-native-propforge/pressable"
import {createStyleCache} from "react-native-propforge/style-cache"
import Text from "react-native-propforge/text"
import View from "react-native-propforge/view"
import {shapeComponent, ShapeComponent} from "set-state-compare/build/shape-component.js"
import useNow from "set-state-compare/build/use-now.js"
import {errorMessage} from "typanic"

import {parseSearchFilter} from "../filter-contract.js"
import buildSearchCatalog from "../search-catalog.js"
import SearchFilterConditionRow from "./search-filter-condition-row.js"

const styles = createStyleCache()

/**
 * @param {string} message - Untranslated fallback message.
 * @returns {string} - Original message.
 */
const identityTranslate = (message) => message

/**
 * @typedef {object} SearchFilterDraftCondition
 * @property {string} attribute - Selected catalog attribute.
 * @property {boolean | number | string | Array<boolean | number | string>} [originalValue] - Unedited typed value.
 * @property {string[]} path - Selected catalog relationship path.
 * @property {import("../filter-contract.js").SearchPredicate} predicate - Selected predicate.
 * @property {boolean} valueEdited - Whether valueText replaced the original typed value.
 * @property {string} valueText - Editable scalar, list, or null-boolean value.
 */

/**
 * @typedef {object} SearchFilterDraftConditionChange
 * @property {SearchFilterDraftCondition} condition - Replacement draft condition.
 * @property {number} index - Condition position.
 */

/**
 * @typedef {object} SearchFilterDraft
 * @property {"and" | "or"} combinator - Root condition combinator.
 * @property {SearchFilterDraftCondition[]} conditions - Flat editable conditions.
 */

/**
 * @typedef {object} SearchFilterProps
 * @property {import("../filter-contract.js").SearchFilter} filter - Controlled version-one filter.
 * @property {import("velocious/build/src/frontend-models/base.js").FrontendModelClass} modelClass - Root generated frontend-model class.
 * @property {(filter: import("../filter-contract.js").SearchFilter) => void} onFilterChange - Applied filter callback.
 * @property {Array<{attribute: string, path: string[]}>} searchableFields - Backend-approved searchable field targets.
 * @property {string} testID - Stable selector base.
 * @property {(message: string) => string} [translate] - Consumer translation callback.
 */

/**
 * @typedef {object} SearchFilterState
 * @property {SearchFilterDraft} draftFilter - Current editable flat filter.
 * @property {import("../filter-contract.js").SearchFilter} sourceFilter - Controlled filter used to create the draft.
 * @property {string | null} validationError - Expected draft validation failure.
 */

/** @type {NamedExoticComponent<SearchFilterProps>} */
const SearchFilter = memo(shapeComponent(/** @augments {ShapeComponent<SearchFilterProps, SearchFilterState>} */ class SearchFilter extends ShapeComponent {
  static propTypes = propTypesExact({
    filter: PropTypes.object.isRequired,
    modelClass: PropTypes.func.isRequired,
    onFilterChange: PropTypes.func.isRequired,
    searchableFields: PropTypes.arrayOf(PropTypes.exact({
      attribute: PropTypes.string.isRequired,
      path: PropTypes.arrayOf(PropTypes.string.isRequired).isRequired
    }).isRequired).isRequired,
    testID: PropTypes.string.isRequired,
    translate: PropTypes.func
  })

  /** @type {SearchFilterState} */
  state = {
    draftFilter: this.draftFilterFromFilter(this.props.filter),
    sourceFilter: this.props.filter,
    validationError: null
  }

  /** @type {import("../search-catalog.js").SearchCatalogField[]} */
  catalog = this.hookField()

  /** @returns {void} - Resolves generated model metadata for this render. */
  setup() {
    useNow(() => {
      if (this.s.sourceFilter === this.p.filter) return

      this.setState({
        draftFilter: this.draftFilterFromFilter(this.p.filter),
        sourceFilter: this.p.filter,
        validationError: null
      })
    }, [this.p.filter])

    this.catalog = this.cache("catalog", () => this.searchCatalog(), [this.p.modelClass, this.p.searchableFields])
  }

  /** @returns {ReactNode} - Search condition editor. */
  render() {
    const {catalog} = this.tt
    const {testID} = this.p
    const translate = this.p.translate ?? identityTranslate

    return (
      <View
        style={styles.root ||= {
          backgroundColor: "#ffffff",
          borderColor: "#cbd5e1",
          borderRadius: 16,
          borderWidth: 1,
          gap: 12,
          padding: 14
        }}
        testID={testID}
      >
        <View
          style={styles.header ||= {
            alignItems: "center",
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            justifyContent: "space-between"
          }}
          testID={`${testID}/header`}
        >
          <View
            style={styles.combinators ||= {flexDirection: "row", gap: 6}}
            testID={`${testID}/combinator`}
          >
            <Pressable
              accessibilityRole="button"
              onPress={this.tt.onAndPress}
              style={styles[`combinatorAnd-${this.s.draftFilter.combinator}`] ||= {
                backgroundColor: this.s.draftFilter.combinator === "and" ? "#0f172a" : "#f1f5f9",
                borderRadius: 8,
                paddingHorizontal: 11,
                paddingVertical: 8
              }}
              testID={`${testID}/combinator/and`}
            >
              <Text
                style={styles[`combinatorAndLabel-${this.s.draftFilter.combinator}`] ||= {
                  color: this.s.draftFilter.combinator === "and" ? "#ffffff" : "#334155",
                  fontSize: 13,
                  fontWeight: "600"
                }}
                testID={`${testID}/combinator/and/label`}
              >
                {translate("Match all")}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={this.tt.onOrPress}
              style={styles[`combinatorOr-${this.s.draftFilter.combinator}`] ||= {
                backgroundColor: this.s.draftFilter.combinator === "or" ? "#0f172a" : "#f1f5f9",
                borderRadius: 8,
                paddingHorizontal: 11,
                paddingVertical: 8
              }}
              testID={`${testID}/combinator/or`}
            >
              <Text
                style={styles[`combinatorOrLabel-${this.s.draftFilter.combinator}`] ||= {
                  color: this.s.draftFilter.combinator === "or" ? "#ffffff" : "#334155",
                  fontSize: 13,
                  fontWeight: "600"
                }}
                testID={`${testID}/combinator/or/label`}
              >
                {translate("Match any")}
              </Text>
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={catalog.length < 1}
            onPress={this.tt.onAddConditionPress}
            style={styles[`addButton-${catalog.length < 1}`] ||= {
              backgroundColor: catalog.length < 1 ? "#e2e8f0" : "#eff6ff",
              borderColor: catalog.length < 1 ? "#cbd5e1" : "#93c5fd",
              borderRadius: 8,
              borderWidth: 1,
              paddingHorizontal: 11,
              paddingVertical: 8
            }}
            testID={`${testID}/addCondition`}
          >
            <Text
              style={styles[`addButtonLabel-${catalog.length < 1}`] ||= {
                color: catalog.length < 1 ? "#64748b" : "#1d4ed8",
                fontSize: 14,
                fontWeight: "600"
              }}
              testID={`${testID}/addCondition/label`}
            >
              {translate("+ Add condition")}
            </Text>
          </Pressable>
        </View>
        {catalog.length < 1 &&
          <Text
            style={styles.emptyCatalog ||= {color: "#64748b", fontSize: 14}}
            testID={`${testID}/emptyCatalog`}
          >
            {translate("This model has no searchable fields.")}
          </Text>
        }
        <View
          style={styles.conditions ||= {gap: 10}}
          testID={`${testID}/conditions`}
        >
          {this.s.draftFilter.conditions.map((condition, index) =>
            <SearchFilterConditionRow
              condition={condition}
              fields={catalog}
              index={index}
              key={index}
              onChange={this.tt.onConditionChange}
              onRemove={this.tt.onConditionRemove}
              testID={`${testID}/condition/${index}`}
              translate={translate}
            />
          )}
        </View>
        {this.s.validationError &&
          <Text
            style={styles.validationError ||= {color: "#b91c1c", fontSize: 14}}
            testID={`${testID}/validationError`}
          >
            {this.s.validationError}
          </Text>
        }
        <Pressable
          accessibilityRole="button"
          onPress={this.tt.onApplyPress}
          style={styles.applyButton ||= {
            alignSelf: "flex-start",
            backgroundColor: "#2563eb",
            borderRadius: 9,
            paddingHorizontal: 16,
            paddingVertical: 10
          }}
          testID={`${testID}/apply`}
        >
          <Text
            style={styles.applyButtonLabel ||= {color: "#ffffff", fontSize: 14, fontWeight: "700"}}
            testID={`${testID}/apply/label`}
          >
            {translate("Apply filters")}
          </Text>
        </Pressable>
      </View>
    )
  }

  /** @returns {void} - Adds a blank condition for the first catalog field. */
  onAddConditionPress = () => {
    const firstField = this.catalog[0]

    if (!firstField) throw new Error("Cannot add a search condition without a searchable field")

    this.s.draftFilter = {
      ...this.s.draftFilter,
      conditions: [
        ...this.s.draftFilter.conditions,
        {
          attribute: firstField.attribute,
          path: [...firstField.path],
          predicate: "eq",
          valueEdited: true,
          valueText: ""
        }
      ]
    }
    this.s.validationError = null
  }

  /**
   * @param {SearchFilterDraftConditionChange} change - Replacement draft condition.
   * @returns {void}
   */
  onConditionChange = ({condition, index}) => {
    const conditions = [...this.s.draftFilter.conditions]

    if (!conditions[index]) throw new Error(`Search filter condition does not exist at index ${index}`)

    conditions[index] = condition
    this.s.draftFilter = {...this.s.draftFilter, conditions}
    this.s.validationError = null
  }

  /**
   * @param {number} index - Condition position to remove.
   * @returns {void}
   */
  onConditionRemove = (index) => {
    if (!this.s.draftFilter.conditions[index]) {
      throw new Error(`Search filter condition does not exist at index ${index}`)
    }

    this.s.draftFilter = {
      ...this.s.draftFilter,
      conditions: this.s.draftFilter.conditions.filter((_condition, conditionIndex) => conditionIndex !== index)
    }
    this.s.validationError = null
  }

  /** @returns {void} - Selects the root AND combinator. */
  onAndPress = () => {
    this.s.draftFilter = {...this.s.draftFilter, combinator: "and"}
  }

  /** @returns {void} - Selects the root OR combinator. */
  onOrPress = () => {
    this.s.draftFilter = {...this.s.draftFilter, combinator: "or"}
  }

  /** @returns {void} - Validates and applies the current draft. */
  onApplyPress = () => {
    /** @type {import("../filter-contract.js").SearchFilter} */
    let filter

    try {
      filter = parseSearchFilter({
        root: {
          combinator: this.s.draftFilter.combinator,
          conditions: this.s.draftFilter.conditions.map((condition) => ({
            attribute: condition.attribute,
            path: [...condition.path],
            predicate: condition.predicate,
            value: this.valueFromDraftCondition(condition)
          })),
          groups: []
        },
        version: 1
      })
    } catch (error) {
      this.s.validationError = errorMessage(error)
      return
    }

    this.s.validationError = null
    this.p.onFilterChange(filter)
  }

  /**
   * @param {import("../filter-contract.js").SearchFilter} filter - Controlled filter value.
   * @returns {SearchFilterDraft} - Independent editable draft.
   */
  draftFilterFromFilter(filter) {
    const parsedFilter = parseSearchFilter(filter)

    if (parsedFilter.root.groups.length > 0) {
      throw new Error("SearchFilter cannot edit nested filter groups")
    }

    return {
      combinator: parsedFilter.root.combinator,
      conditions: parsedFilter.root.conditions.map((condition) => ({
        attribute: condition.attribute,
        originalValue: Array.isArray(condition.value) ? [...condition.value] : condition.value,
        path: [...condition.path],
        predicate: condition.predicate,
        valueEdited: false,
        valueText: Array.isArray(condition.value) ? condition.value.join("\n") : String(condition.value)
      }))
    }
  }

  /**
   * @param {SearchFilterDraftCondition} condition - Editable draft condition.
   * @returns {boolean | number | string | Array<boolean | number | string>} - Filter-contract value.
   */
  valueFromDraftCondition(condition) {
    if (!condition.valueEdited) {
      if (condition.originalValue === undefined) {
        throw new Error("Unedited search condition is missing its original value")
      }

      return Array.isArray(condition.originalValue) ? [...condition.originalValue] : condition.originalValue
    }
    if (condition.predicate === "null") return condition.valueText === "true"
    if (condition.predicate === "in" || condition.predicate === "not_in") {
      return condition.valueText.split("\n").map((value) => value.trim()).filter((value) => value.length > 0)
    }

    return condition.valueText
  }

  /** @returns {import("../search-catalog.js").SearchCatalogField[]} - Explicitly allowed generated catalog fields. */
  searchCatalog() {
    const generatedCatalog = buildSearchCatalog(this.p.modelClass)
    /** @type {import("../search-catalog.js").SearchCatalogField[]} */
    const searchableCatalog = []

    for (const searchableField of this.p.searchableFields) {
      const catalogField = generatedCatalog.find((field) => (
        field.attribute === searchableField.attribute &&
        field.path.length === searchableField.path.length &&
        field.path.every((relationshipName, index) => relationshipName === searchableField.path[index])
      ))

      if (!catalogField) {
        throw new Error(`Searchable field is not exposed by the generated model: ${[...searchableField.path, searchableField.attribute].join(".")}`)
      }
      if (searchableCatalog.includes(catalogField)) {
        throw new Error(`Searchable field was declared more than once: ${[...searchableField.path, searchableField.attribute].join(".")}`)
      }

      searchableCatalog.push(catalogField)
    }

    return searchableCatalog
  }
}))

export default SearchFilter
