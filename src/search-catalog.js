// @ts-check

import {resolveFrontendModelClass} from "velocious/build/src/frontend-models/model-registry.js"

import {MAX_SEARCH_RELATIONSHIP_DEPTH} from "./filter-contract.js"

/**
 * One searchable frontend-model field.
 * @typedef {object} SearchCatalogField
 * @property {string} attribute - Target frontend-model attribute.
 * @property {string} label - Stable human-readable path and attribute label.
 * @property {string[]} path - Relationship path from the root model.
 * @property {boolean} toMany - Whether the path traverses a has-many relationship.
 */

/**
 * Catalog traversal options.
 * @typedef {object} SearchCatalogOptions
 * @property {number} [maxRelationshipDepth] - Maximum relationship edges to traverse.
 */

/**
 * Builds searchable field metadata from generated frontend-model declarations.
 * @param {import("velocious/build/src/frontend-models/base.js").FrontendModelClass} modelClass - Root generated frontend-model class.
 * @param {SearchCatalogOptions} [options] - Traversal options.
 * @returns {SearchCatalogField[]} - Flattened searchable fields.
 */
export default function buildSearchCatalog(modelClass, options) {
  return new SearchCatalogBuilder(options).build(modelClass)
}

/** Builds flattened searchable fields from generated frontend-model metadata. */
class SearchCatalogBuilder {
  /**
   * @param {SearchCatalogOptions} [options] - Traversal options.
   */
  constructor({maxRelationshipDepth = MAX_SEARCH_RELATIONSHIP_DEPTH} = {}) {
    if (maxRelationshipDepth > MAX_SEARCH_RELATIONSHIP_DEPTH) {
      throw new Error(`Search catalog relationship depth cannot exceed ${MAX_SEARCH_RELATIONSHIP_DEPTH}`)
    }

    this.maxRelationshipDepth = maxRelationshipDepth
  }

  /**
   * @param {import("velocious/build/src/frontend-models/base.js").FrontendModelClass} modelClass - Root model class.
   * @returns {SearchCatalogField[]} - Flattened searchable fields.
   */
  build(modelClass) {
    /** @type {SearchCatalogField[]} */
    const fields = []

    this.appendModelFields({
      fields,
      modelClass,
      path: [],
      toMany: false
    })

    return fields
  }

  /**
   * @param {object} args - Current traversal state.
   * @param {SearchCatalogField[]} args.fields - Output field list.
   * @param {import("velocious/build/src/frontend-models/base.js").FrontendModelClass} args.modelClass - Current model class.
   * @param {string[]} args.path - Current relationship path.
   * @param {boolean} args.toMany - Whether the current path traverses a has-many relationship.
   * @returns {void}
   */
  appendModelFields({fields, modelClass, path, toMany}) {
    for (const attribute of this.attributeNames(modelClass)) {
      fields.push({
        attribute,
        label: [...path, attribute].map((segment) => humanizeCatalogSegment(segment)).join(" / "),
        path: [...path],
        toMany
      })
    }

    if (path.length >= this.maxRelationshipDepth) return

    const definitions = modelClass.relationshipDefinitions()
    const relationshipModelClasses = modelClass.relationshipModelClasses()

    for (const [relationshipName, definition] of Object.entries(definitions)) {
      const targetModelClass = /** @type {import("velocious/build/src/frontend-models/base.js").FrontendModelClass | null} */ (
        resolveFrontendModelClass(relationshipModelClasses[relationshipName])
      )

      if (!targetModelClass) {
        throw new Error(`Could not resolve declared relationship target ${modelClass.name}#${relationshipName}`)
      }
      this.appendModelFields({
        fields,
        modelClass: targetModelClass,
        path: [...path, relationshipName],
        toMany: toMany || definition.type === "hasMany"
      })
    }
  }

  /**
   * @param {import("velocious/build/src/frontend-models/base.js").FrontendModelClass} modelClass - Generated frontend-model class.
   * @returns {string[]} - Declared attribute names.
   */
  attributeNames(modelClass) {
    const attributes = modelClass.resourceConfig().attributes

    if (!attributes) throw new Error(`${modelClass.name} resourceConfig().attributes is required`)
    if (!Array.isArray(attributes)) return Object.keys(attributes)

    return attributes.map((attribute) => {
      if (typeof attribute === "string") return attribute
      if (!attribute.name) throw new Error(`${modelClass.name} has an attribute declaration without a name`)

      return attribute.name
    })
  }
}

/**
 * @param {string} value - Generated camelCase metadata name.
 * @returns {string} - Stable human-readable text.
 */
function humanizeCatalogSegment(value) {
  const spaced = value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()

  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}
