// @ts-check

import FrontendModelBaseResource from "velocious/build/src/frontend-model-resource/base-resource.js"
import {normalizeRansackGroup} from "velocious/build/src/utils/ransack.js"
import VelociousError from "velocious/build/src/velocious-error.js"

import {
  parseSearchFilter,
  searchFilterIsEmpty,
  searchFilterToRansack
} from "./filter-contract.js"

const packageSearchQueries = new WeakSet()

/**
 * Backend resource base that understands velocious-search descriptors.
 * @template {typeof import("velocious/build/src/database/record/index.js").default} [TModelClass=typeof import("velocious/build/src/database/record/index.js").default]
 * @augments {FrontendModelBaseResource<TModelClass>}
 */
export default class SearchableResource extends FrontendModelBaseResource {
  /**
   * Declares relationship paths whose unscoped related rows may affect root search results.
   * @returns {string[][]} - Explicitly searchable relationship paths.
   */
  static searchableRelationshipPaths() {
    return []
  }

  /**
   * Applies package searches after independently validating backend resource exposure.
   * @param {object} args - Search args.
   * @param {import("velocious/build/src/frontend-model-resource/base-resource.js").FrontendModelResourceController} args.controller - Controller handling the query.
   * @param {import("velocious/build/src/frontend-model-resource/base-resource.js").FrontendModelResourceAnyQuery} args.query - Already-authorized index query.
   * @param {import("velocious/build/src/frontend-model-resource/base-resource.js").FrontendModelResourceSearch} args.search - Search descriptor.
   * @returns {void}
   */
  applyFrontendModelIndexSearch({controller, query, search}) {
    if (search.path.length > 0 || search.column !== "__velociousSearch") {
      super.applyFrontendModelIndexSearch({controller, query, search})
      return
    }
    if (search.operator !== "eq") {
      throw VelociousError.safe("Velocious Search descriptors must use the eq operator.", {
        code: "velocious-search-invalid-filter"
      })
    }
    if (packageSearchQueries.has(query)) {
      throw VelociousError.safe("Only one Velocious Search descriptor is allowed per query.", {
        code: "velocious-search-invalid-filter"
      })
    }

    packageSearchQueries.add(query)

    /** @type {import("./filter-contract.js").SearchFilter} */
    let filter

    try {
      filter = parseSearchFilter(search.value)
    } catch (error) {
      throw VelociousError.safe("Invalid Velocious Search filter.", {
        cause: error,
        code: "velocious-search-invalid-filter"
      })
    }

    if (searchFilterIsEmpty(filter)) return

    const traversesHasMany = this.validateFilterExposure({controller, filter})
    const ransack = searchFilterToRansack(filter)

    this.validateRansackResolution({filter, ransack})
    query.ransack(ransack)
    if (traversesHasMany) query.distinct(true)
  }

  /**
   * @param {object} args - Validation inputs.
   * @param {import("velocious/build/src/frontend-model-resource/base-resource.js").FrontendModelResourceController} args.controller - Typed frontend-model controller.
   * @param {import("./filter-contract.js").SearchFilter} args.filter - Parsed filter.
   * @returns {boolean} - Whether any condition traverses a has-many relationship.
   */
  validateFilterExposure({controller, filter}) {
    let traversesHasMany = false
    const groups = [filter.root]

    while (groups.length > 0) {
      const group = groups.pop()

      if (!group) throw new Error("Expected a search group")

      groups.push(...group.groups)

      for (const condition of group.conditions) {
        if (this.validateConditionExposure({condition, controller})) traversesHasMany = true
      }
    }

    return traversesHasMany
  }

  /**
   * @param {object} args - Validation inputs.
   * @param {import("./filter-contract.js").SearchCondition} args.condition - Parsed condition.
   * @param {import("velocious/build/src/frontend-model-resource/base-resource.js").FrontendModelResourceController} args.controller - Typed frontend-model controller.
   * @returns {boolean} - Whether the condition traverses a has-many relationship.
   */
  validateConditionExposure({condition, controller}) {
    let modelClass = /** @type {typeof import("velocious/build/src/database/record/index.js").default} */ (this.modelClass())
    let traversesHasMany = false

    if (condition.path.length > 0) {
      const ResourceClass = /** @type {typeof SearchableResource} */ (this.constructor)
      const pathAllowed = ResourceClass.searchableRelationshipPaths().some((searchablePath) => (
        searchablePath.length === condition.path.length &&
        searchablePath.every((relationshipName, index) => relationshipName === condition.path[index])
      ))

      if (!pathAllowed) {
        throw VelociousError.safe(`Relationship path ${condition.path.join(".")} is not searchable.`, {
          code: "velocious-search-forbidden-filter"
        })
      }
    }

    for (const relationshipName of condition.path) {
      const resource = controller.frontendModelResourceConfigurationForModelClass(modelClass)

      if (!resource) {
        throw VelociousError.safe(`Relationship ${modelClass.name}#${relationshipName} is not searchable.`, {
          code: "velocious-search-forbidden-filter"
        })
      }

      const exposedRelationships = resource.resourceConfiguration.relationships

      if (!exposedRelationships || !exposedRelationships.includes(relationshipName)) {
        throw VelociousError.safe(`Relationship ${modelClass.name}#${relationshipName} is not searchable.`, {
          code: "velocious-search-forbidden-filter"
        })
      }

      const relationship = modelClass.getRelationshipsMap()[relationshipName]

      if (!relationship) {
        throw new Error(`Resource ${resource.modelName} exposes missing relationship ${modelClass.name}#${relationshipName}`)
      }
      if (relationship.getPolymorphic()) {
        throw VelociousError.safe(`Relationship ${modelClass.name}#${relationshipName} is not searchable.`, {
          code: "velocious-search-forbidden-filter"
        })
      }
      if (relationship.through) {
        throw VelociousError.safe(`Relationship ${modelClass.name}#${relationshipName} is not searchable.`, {
          code: "velocious-search-forbidden-filter"
        })
      }

      const targetModelClass = relationship.getTargetModelClass()

      if (!targetModelClass) {
        throw VelociousError.safe(`Relationship ${modelClass.name}#${relationshipName} is not searchable.`, {
          code: "velocious-search-forbidden-filter"
        })
      }
      if (modelClass.getDatabaseIdentifier() !== targetModelClass.getDatabaseIdentifier()) {
        throw VelociousError.safe(`Relationship ${modelClass.name}#${relationshipName} is not searchable.`, {
          code: "velocious-search-forbidden-filter"
        })
      }
      if (relationship.getType() === "hasMany") traversesHasMany = true

      modelClass = targetModelClass
    }

    const targetResource = controller.frontendModelResourceConfigurationForModelClass(modelClass)

    if (!targetResource || !this.resourceExposesAttribute({
      attributeName: condition.attribute,
      modelClass,
      resourceConfiguration: targetResource.resourceConfiguration
    })) {
      throw VelociousError.safe(`Attribute ${modelClass.name}#${condition.attribute} is not searchable.`, {
        code: "velocious-search-forbidden-filter"
      })
    }

    return traversesHasMany
  }

  /**
   * Ensures Velocious resolves the compiled Ransack descriptor to the authorized paths.
   * @param {object} args - Resolution inputs.
   * @param {import("./filter-contract.js").SearchFilter} args.filter - Parsed filter.
   * @param {Record<string, ReturnType<typeof JSON.parse>>} args.ransack - Compiled Ransack descriptor.
   * @returns {void}
   */
  validateRansackResolution({filter, ransack}) {
    try {
      const normalizedGroup = normalizeRansackGroup(
        /** @type {typeof import("velocious/build/src/database/record/index.js").default} */ (this.modelClass()),
        ransack
      )

      this.assertRansackGroupResolution({filterGroup: filter.root, normalizedGroup})
    } catch (error) {
      throw VelociousError.safe("Velocious Search filter does not resolve to searchable database attributes.", {
        cause: error,
        code: "velocious-search-forbidden-filter"
      })
    }
  }

  /**
   * Compares one parsed filter group with its normalized Velocious Ransack group.
   * @param {object} args - Group comparison inputs.
   * @param {import("./filter-contract.js").SearchGroup} args.filterGroup - Parsed filter group.
   * @param {import("velocious/build/src/utils/ransack.js").RansackGroup} args.normalizedGroup - Normalized Ransack group.
   * @returns {void}
   */
  assertRansackGroupResolution({filterGroup, normalizedGroup}) {
    if (filterGroup.combinator !== normalizedGroup.combinator ||
      filterGroup.conditions.length !== normalizedGroup.conditions.length ||
      filterGroup.groups.length !== normalizedGroup.groupings.length) {
      throw new Error("Compiled Ransack group did not preserve the parsed search group")
    }

    for (let index = 0; index < filterGroup.conditions.length; index += 1) {
      const filterCondition = filterGroup.conditions[index]
      const normalizedCondition = normalizedGroup.conditions[index]

      if (!normalizedCondition || normalizedCondition.attributes.length !== 1) {
        throw new Error("Compiled Ransack condition did not resolve to one attribute")
      }

      const normalizedAttribute = normalizedCondition.attributes[0]

      if (!normalizedAttribute ||
        normalizedAttribute.attributeName !== filterCondition.attribute ||
        normalizedAttribute.path.length !== filterCondition.path.length ||
        !normalizedAttribute.path.every((relationshipName, pathIndex) => relationshipName === filterCondition.path[pathIndex])) {
        throw new Error("Compiled Ransack condition resolved to a different attribute path")
      }
    }

    for (let index = 0; index < filterGroup.groups.length; index += 1) {
      const childFilterGroup = filterGroup.groups[index]
      const childNormalizedGroup = normalizedGroup.groupings[index]

      if (!childFilterGroup || !childNormalizedGroup) {
        throw new Error("Compiled Ransack group did not preserve nested groups")
      }

      this.assertRansackGroupResolution({filterGroup: childFilterGroup, normalizedGroup: childNormalizedGroup})
    }
  }

  /**
   * @param {object} args - Attribute exposure inputs.
   * @param {string} args.attributeName - Requested attribute name.
   * @param {typeof import("velocious/build/src/database/record/index.js").default} args.modelClass - Target backend model class.
   * @param {import("velocious/build/src/configuration-types.js").NormalizedFrontendModelResourceConfiguration} args.resourceConfiguration - Target backend resource configuration.
   * @returns {boolean} - Whether the resource declares the attribute.
   */
  resourceExposesAttribute({attributeName, modelClass, resourceConfiguration}) {
    const attributes = resourceConfiguration.attributes

    if (!attributes || (Array.isArray(attributes) ? attributes.length < 1 : Object.keys(attributes).length < 1)) {
      return Object.prototype.hasOwnProperty.call(modelClass.getAttributeNameToColumnNameMap(), attributeName)
    }
    if (!Array.isArray(attributes)) {
      return Object.prototype.hasOwnProperty.call(attributes, attributeName)
    }

    for (const attribute of attributes) {
      if (typeof attribute === "string" && attribute === attributeName) return true
      if (typeof attribute !== "string" && attribute.name === attributeName) return true
    }

    return false
  }
}
