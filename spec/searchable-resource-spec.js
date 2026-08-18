// @ts-check

import VelociousError from "velocious/build/src/velocious-error.js"

import {emptySearchFilter} from "../src/filter-contract.js"
import SearchableResource from "../src/searchable-resource.js"

class SearchResourceUserModel {
  static bindRecordMetadataModelClass(modelClass) { return modelClass }
  static getAttributeNameToColumnNameMap() { return {email: "email"} }
  static getDatabaseIdentifier() { return "default" }
  static getModelName() { return "SearchResourceUser" }
  static getRelationshipsMap() { return {} }
}

const ownerRelationship = {
  getPolymorphic: () => false,
  getTargetModelClass: () => SearchResourceUserModel,
  getType: () => "belongsTo",
  through: undefined
}

class SearchResourceBuildModel {
  static bindRecordMetadataModelClass(modelClass) { return modelClass }
  static getAttributeNameToColumnNameMap() { return {id: "id", name: "name", ownerId: "owner_id"} }
  static getDatabaseIdentifier() { return "default" }
  static getModelName() { return "SearchResourceBuild" }
  static getRelationshipsMap() { return {owner: ownerRelationship} }
}

const buildsRelationship = {
  getPolymorphic: () => false,
  getTargetModelClass: () => SearchResourceBuildModel,
  getType: () => "hasMany",
  through: undefined
}

class SearchResourceRootModel {
  static bindRecordMetadataModelClass(modelClass) { return modelClass }
  static getAttributeNameToColumnNameMap() { return {buildsName: "builds_name", id: "id"} }
  static getDatabaseIdentifier() { return "default" }
  static getModelName() { return "SearchResourceRoot" }
  static getRelationshipsMap() { return {builds: buildsRelationship} }
}

class SearchResource extends SearchableResource {
  static searchableFields() {
    return [
      {attribute: "id", path: []},
      {attribute: "displayLabel", path: []},
      {attribute: "id", path: ["builds"]},
      {attribute: "name", path: ["builds"]},
      {attribute: "secret", path: ["builds"]},
      {attribute: "email", path: ["builds", "owner"]}
    ]
  }

  static searchableRelationshipPaths() {
    return [["builds"], ["builds", "owner"]]
  }
}

/**
 * @param {Map<Function, {attributes: string[] | Record<string, object>, relationships: string[]}>} configurations - Resource declarations by backend model class.
 * @returns {{applyFrontendModelSearch: jasmine.Spy, frontendModelResourceConfigurationForModelClass: (modelClass: Function) => {resourceConfiguration: {attributes: string[] | Record<string, object>, relationships: string[]}} | null}}
 */
function controllerWithConfigurations(configurations) {
  return {
    applyFrontendModelSearch: jasmine.createSpy("applyFrontendModelSearch"),
    frontendModelResourceConfigurationForModelClass(modelClass) {
      const resourceConfiguration = configurations.get(modelClass)
      return resourceConfiguration ? {resourceConfiguration} : null
    }
  }
}

/** @returns {{distinct: jasmine.Spy, ransack: jasmine.Spy}} */
function searchQuery() {
  return {
    distinct: jasmine.createSpy("distinct"),
    ransack: jasmine.createSpy("ransack")
  }
}

/**
 * @param {ReturnType<typeof controllerWithConfigurations>} controller - Fake typed frontend-model controller.
 * @returns {SearchResource}
 */
function searchableResource(controller) {
  return new SearchResource({
    controller,
    modelClass: SearchResourceRootModel,
    modelName: "SearchResourceRoot",
    params: {},
    resourceConfiguration: {attributes: ["id"], relationships: ["builds"]}
  })
}

/**
 * @param {import("../src/filter-contract.js").SearchCondition} condition - Root-group condition.
 * @returns {import("../src/filter-contract.js").SearchFilter}
 */
function filterWithCondition(condition) {
  return {
    root: {combinator: "and", conditions: [condition], groups: []},
    version: 1
  }
}

describe("searchable resource", () => {
  it("delegates non-package searches unchanged", () => {
    const controller = controllerWithConfigurations(new Map())
    const resource = searchableResource(controller)
    const query = searchQuery()
    const ordinarySearch = {column: "name", operator: /** @type {const} */ ("eq"), path: [], value: "api"}
    const nestedPackageColumn = {column: "__velociousSearch", operator: /** @type {const} */ ("eq"), path: ["builds"], value: emptySearchFilter()}

    resource.applyFrontendModelIndexSearch({controller, query, search: ordinarySearch})
    resource.applyFrontendModelIndexSearch({controller, query, search: nestedPackageColumn})

    expect(controller.applyFrontendModelSearch).toHaveBeenCalledWith({query, search: ordinarySearch})
    expect(controller.applyFrontendModelSearch).toHaveBeenCalledWith({query, search: nestedPackageColumn})
  })

  it("validates exposed relationships and attributes before applying Ransack to the supplied query", () => {
    const controller = controllerWithConfigurations(new Map([
      [SearchResourceRootModel, {attributes: ["id"], relationships: ["builds"]}],
      [SearchResourceBuildModel, {attributes: ["id"], relationships: ["owner"]}],
      [SearchResourceUserModel, {attributes: ["email"], relationships: []}]
    ]))
    const resource = searchableResource(controller)
    const query = searchQuery()
    const filter = filterWithCondition({
      attribute: "email",
      path: ["builds", "owner"],
      predicate: "cont",
      value: "example.com"
    })

    resource.applyFrontendModelIndexSearch({
      controller,
      query,
      search: {column: "__velociousSearch", operator: "eq", path: [], value: filter}
    })

    expect(query.ransack).toHaveBeenCalledOnceWith({
      c: [{a: "buildsOwnerEmail", p: "cont", v: "example.com"}],
      g: [],
      m: "and"
    })
    expect(query.distinct).toHaveBeenCalledOnceWith(true)
    expect(controller.applyFrontendModelSearch).not.toHaveBeenCalled()
  })

  it("does not apply Ransack or distinct for an empty package filter", () => {
    const controller = controllerWithConfigurations(new Map())
    const resource = searchableResource(controller)
    const query = searchQuery()

    resource.applyFrontendModelIndexSearch({
      controller,
      query,
      search: {column: "__velociousSearch", operator: "eq", path: [], value: emptySearchFilter()}
    })

    expect(query.ransack).not.toHaveBeenCalled()
    expect(query.distinct).not.toHaveBeenCalled()
    expect(controller.applyFrontendModelSearch).not.toHaveBeenCalled()
  })

  it("does not make root-only filters distinct", () => {
    const controller = controllerWithConfigurations(new Map([
      [SearchResourceRootModel, {attributes: ["id"], relationships: ["builds"]}]
    ]))
    const resource = searchableResource(controller)
    const query = searchQuery()

    resource.applyFrontendModelIndexSearch({
      controller,
      query,
      search: {
        column: "__velociousSearch",
        operator: "eq",
        path: [],
        value: filterWithCondition({attribute: "id", path: [], predicate: "eq", value: "build-group-id"})
      }
    })

    expect(query.ransack).toHaveBeenCalled()
    expect(query.distinct).not.toHaveBeenCalled()
  })

  it("allows database-backed root attributes when an empty declaration exposes all columns", () => {
    const configurations = [
      {attributes: [], relationships: ["builds"]},
      {attributes: {}, relationships: ["builds"]}
    ]

    for (const rootConfiguration of configurations) {
      const controller = controllerWithConfigurations(new Map([
        [SearchResourceRootModel, rootConfiguration]
      ]))
      const query = searchQuery()

      searchableResource(controller).applyFrontendModelIndexSearch({
        controller,
        query,
        search: {
          column: "__velociousSearch",
          operator: "eq",
          path: [],
          value: filterWithCondition({attribute: "id", path: [], predicate: "eq", value: "build-group-id"})
        }
      })

      expect(query.ransack).toHaveBeenCalled()
    }
  })

  it("rejects multiple package descriptors on one query", () => {
    const controller = controllerWithConfigurations(new Map([
      [SearchResourceRootModel, {attributes: ["id"], relationships: ["builds"]}]
    ]))
    const resource = searchableResource(controller)
    const query = searchQuery()
    const search = {
      column: "__velociousSearch",
      operator: /** @type {const} */ ("eq"),
      path: [],
      value: filterWithCondition({attribute: "id", path: [], predicate: "eq", value: "build-group-id"})
    }

    resource.applyFrontendModelIndexSearch({controller, query, search})

    expect(() => resource.applyFrontendModelIndexSearch({controller, query, search})).toThrowError(VelociousError)
  })

  it("rejects undeclared edges at every relationship depth", () => {
    const rootForbiddenController = controllerWithConfigurations(new Map([
      [SearchResourceRootModel, {attributes: ["id"], relationships: []}]
    ]))
    const nestedForbiddenController = controllerWithConfigurations(new Map([
      [SearchResourceRootModel, {attributes: ["id"], relationships: ["builds"]}],
      [SearchResourceBuildModel, {attributes: ["id"], relationships: []}]
    ]))
    const rootFilter = filterWithCondition({attribute: "id", path: ["builds"], predicate: "eq", value: "id"})
    const nestedFilter = filterWithCondition({attribute: "email", path: ["builds", "owner"], predicate: "eq", value: "user@example.com"})

    expect(() => searchableResource(rootForbiddenController).applyFrontendModelIndexSearch({
      controller: rootForbiddenController,
      query: searchQuery(),
      search: {column: "__velociousSearch", operator: "eq", path: [], value: rootFilter}
    })).toThrowError(VelociousError, /Relationship SearchResourceRootModel#builds is not searchable/)
    expect(() => searchableResource(nestedForbiddenController).applyFrontendModelIndexSearch({
      controller: nestedForbiddenController,
      query: searchQuery(),
      search: {column: "__velociousSearch", operator: "eq", path: [], value: nestedFilter}
    })).toThrowError(VelociousError, /Relationship SearchResourceBuildModel#owner is not searchable/)
  })

  it("rejects attributes not declared by the target resource", () => {
    const controller = controllerWithConfigurations(new Map([
      [SearchResourceRootModel, {attributes: ["id"], relationships: ["builds"]}],
      [SearchResourceBuildModel, {attributes: ["id"], relationships: []}]
    ]))
    const resource = searchableResource(controller)
    const query = searchQuery()
    const filter = filterWithCondition({attribute: "secret", path: ["builds"], predicate: "eq", value: "value"})

    expect(() => resource.applyFrontendModelIndexSearch({
      controller,
      query,
      search: {column: "__velociousSearch", operator: "eq", path: [], value: filter}
    })).toThrowError(VelociousError, /Attribute SearchResourceBuildModel#secret is not searchable/)
  })

  it("rejects exposed root attributes outside the resource search allowlist", () => {
    const controller = controllerWithConfigurations(new Map([
      [SearchResourceRootModel, {attributes: ["buildsName", "id"], relationships: ["builds"]}]
    ]))
    const resource = searchableResource(controller)
    const query = searchQuery()

    expect(() => resource.applyFrontendModelIndexSearch({
      controller,
      query,
      search: {
        column: "__velociousSearch",
        operator: "eq",
        path: [],
        value: filterWithCondition({attribute: "buildsName", path: [], predicate: "cont", value: "private"})
      }
    })).toThrowError(VelociousError, /Field buildsName is not searchable/)
    expect(query.ransack).not.toHaveBeenCalled()
  })

  it("rejects related paths that the root resource did not explicitly opt into", () => {
    class RootOnlySearchResource extends SearchableResource {
      static searchableFields() { return [{attribute: "name", path: ["builds"]}] }
    }

    const controller = controllerWithConfigurations(new Map([
      [SearchResourceRootModel, {attributes: ["id"], relationships: ["builds"]}],
      [SearchResourceBuildModel, {attributes: ["id", "name"], relationships: []}]
    ]))
    const resource = new RootOnlySearchResource({
      controller,
      modelClass: SearchResourceRootModel,
      modelName: "SearchResourceRoot",
      params: {},
      resourceConfiguration: {attributes: ["id"], relationships: ["builds"]}
    })

    expect(() => resource.applyFrontendModelIndexSearch({
      controller,
      query: searchQuery(),
      search: {
        column: "__velociousSearch",
        operator: "eq",
        path: [],
        value: filterWithCondition({attribute: "name", path: ["builds"], predicate: "cont", value: "api"})
      }
    })).toThrowError(VelociousError, /Relationship path builds is not searchable/)
  })

  it("rejects a compiled Ransack attribute that resolves to a different path", () => {
    const controller = controllerWithConfigurations(new Map([
      [SearchResourceRootModel, {attributes: ["buildsName", "id"], relationships: ["builds"]}],
      [SearchResourceBuildModel, {attributes: ["id", "name"], relationships: []}]
    ]))

    expect(() => searchableResource(controller).applyFrontendModelIndexSearch({
      controller,
      query: searchQuery(),
      search: {
        column: "__velociousSearch",
        operator: "eq",
        path: [],
        value: filterWithCondition({attribute: "name", path: ["builds"], predicate: "cont", value: "api"})
      }
    })).toThrowError(VelociousError, /Velocious Search filter does not resolve to searchable database attributes/)
  })

  it("rejects exposed attributes that are not database-backed Ransack attributes", () => {
    const controller = controllerWithConfigurations(new Map([
      [SearchResourceRootModel, {attributes: ["displayLabel", "id"], relationships: ["builds"]}]
    ]))

    expect(() => searchableResource(controller).applyFrontendModelIndexSearch({
      controller,
      query: searchQuery(),
      search: {
        column: "__velociousSearch",
        operator: "eq",
        path: [],
        value: filterWithCondition({attribute: "displayLabel", path: [], predicate: "cont", value: "api"})
      }
    })).toThrowError(VelociousError, /Velocious Search filter does not resolve to searchable database attributes/)
  })

  it("rejects polymorphic, through, and cross-database relationship paths", () => {
    class UnsupportedBuildModel extends SearchResourceBuildModel {
      static getDatabaseIdentifier() { return "analytics" }
    }

    const unsupportedRelationships = [
      {...buildsRelationship, getPolymorphic: () => true},
      {...buildsRelationship, through: "memberships"},
      {...buildsRelationship, getTargetModelClass: () => UnsupportedBuildModel}
    ]

    for (const relationship of unsupportedRelationships) {
      class UnsupportedRootModel extends SearchResourceRootModel {
        static getRelationshipsMap() { return {builds: relationship} }
      }
      class UnsupportedSearchResource extends SearchableResource {
        static searchableFields() { return [{attribute: "name", path: ["builds"]}] }
        static searchableRelationshipPaths() { return [["builds"]] }
      }

      const controller = controllerWithConfigurations(new Map([
        [UnsupportedRootModel, {attributes: ["id"], relationships: ["builds"]}],
        [relationship.getTargetModelClass(), {attributes: ["id", "name"], relationships: []}]
      ]))
      const resource = new UnsupportedSearchResource({
        controller,
        modelClass: UnsupportedRootModel,
        modelName: "UnsupportedRoot",
        params: {},
        resourceConfiguration: {attributes: ["id"], relationships: ["builds"]}
      })

      expect(() => resource.applyFrontendModelIndexSearch({
        controller,
        query: searchQuery(),
        search: {
          column: "__velociousSearch",
          operator: "eq",
          path: [],
          value: filterWithCondition({attribute: "name", path: ["builds"], predicate: "cont", value: "api"})
        }
      })).toThrowError(VelociousError, /Relationship UnsupportedRootModel#builds is not searchable/)
    }
  })

  it("rejects malformed filters and package descriptors with client-safe errors", () => {
    const controller = controllerWithConfigurations(new Map())
    const resource = searchableResource(controller)
    const query = searchQuery()

    for (const search of [
      {column: "__velociousSearch", operator: /** @type {const} */ ("notEq"), path: [], value: emptySearchFilter()},
      {column: "__velociousSearch", operator: /** @type {const} */ ("eq"), path: [], value: {root: null, version: 1}}
    ]) {
      try {
        resource.applyFrontendModelIndexSearch({controller, query, search})
        throw new Error("Expected package search to fail")
      } catch (error) {
        if (!(error instanceof VelociousError)) throw error

        expect(error.safeToExpose).toBeTrue()
      }
    }
  })
})
