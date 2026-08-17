// @ts-check

import {registerFrontendModel} from "velocious/build/src/frontend-models/model-registry.js"

import buildSearchCatalog from "../src/search-catalog.js"

describe("search catalog", () => {
  it("flattens generated attributes and relationship metadata without mutating it", () => {
    const organizationAttributes = Object.freeze(["name"])
    const organizationRelationships = Object.freeze({})
    const organizationModelClasses = Object.freeze({})
    class CatalogOrganization {
      static getModelName() { return "SearchCatalogOrganization" }
      static resourceConfig() { return {attributes: organizationAttributes} }
      static relationshipDefinitions() { return organizationRelationships }
      static relationshipModelClasses() { return organizationModelClasses }
    }

    const userAttributes = Object.freeze(["displayName"])
    const userRelationships = Object.freeze({organization: Object.freeze({type: "belongsTo"})})
    const userModelClasses = Object.freeze({organization: "SearchCatalogOrganization"})
    class CatalogUser {
      static getModelName() { return "SearchCatalogUser" }
      static resourceConfig() { return {attributes: userAttributes} }
      static relationshipDefinitions() { return userRelationships }
      static relationshipModelClasses() { return userModelClasses }
    }

    const projectAttributes = Object.freeze(["name", "buildsCount"])
    const projectRelationships = Object.freeze({owner: Object.freeze({type: "belongsTo"})})
    const projectModelClasses = Object.freeze({owner: "SearchCatalogUser"})
    class CatalogProject {
      static getModelName() { return "SearchCatalogProject" }
      static resourceConfig() { return {attributes: projectAttributes} }
      static relationshipDefinitions() { return projectRelationships }
      static relationshipModelClasses() { return projectModelClasses }
    }

    const rootAttributes = Object.freeze(["createdAt"])
    const rootRelationships = Object.freeze({projects: Object.freeze({type: "hasMany"})})
    const rootModelClasses = Object.freeze({projects: "SearchCatalogProject"})
    class CatalogRoot {
      static getModelName() { return "SearchCatalogRoot" }
      static resourceConfig() { return {attributes: rootAttributes} }
      static relationshipDefinitions() { return rootRelationships }
      static relationshipModelClasses() { return rootModelClasses }
    }

    for (const modelClass of [CatalogOrganization, CatalogUser, CatalogProject, CatalogRoot]) {
      registerFrontendModel(modelClass)
    }

    expect(buildSearchCatalog(CatalogRoot)).toEqual([
      {attribute: "createdAt", label: "Created at", path: [], toMany: false},
      {attribute: "name", label: "Projects / Name", path: ["projects"], toMany: true},
      {attribute: "buildsCount", label: "Projects / Builds count", path: ["projects"], toMany: true},
      {attribute: "displayName", label: "Projects / Owner / Display name", path: ["projects", "owner"], toMany: true},
      {attribute: "name", label: "Projects / Owner / Organization / Name", path: ["projects", "owner", "organization"], toMany: true}
    ])
    expect(rootAttributes).toEqual(["createdAt"])
    expect(rootRelationships).toEqual({projects: {type: "hasMany"}})
    expect(rootModelClasses).toEqual({projects: "SearchCatalogProject"})
  })

  it("honors relationship-depth overrides", () => {
    class DepthLeaf {
      static getModelName() { return "SearchCatalogDepthLeaf" }
      static resourceConfig() { return {attributes: ["name"]} }
      static relationshipDefinitions() { return {} }
      static relationshipModelClasses() { return {} }
    }
    class DepthChild {
      static getModelName() { return "SearchCatalogDepthChild" }
      static resourceConfig() { return {attributes: ["title"]} }
      static relationshipDefinitions() { return {leaf: {type: "belongsTo"}} }
      static relationshipModelClasses() { return {leaf: "SearchCatalogDepthLeaf"} }
    }
    class DepthRoot {
      static getModelName() { return "SearchCatalogDepthRoot" }
      static resourceConfig() { return {attributes: ["id"]} }
      static relationshipDefinitions() { return {child: {type: "hasOne"}} }
      static relationshipModelClasses() { return {child: "SearchCatalogDepthChild"} }
    }

    for (const modelClass of [DepthLeaf, DepthChild, DepthRoot]) {
      registerFrontendModel(modelClass)
    }

    expect(buildSearchCatalog(DepthRoot, {maxRelationshipDepth: 1})).toEqual([
      {attribute: "id", label: "Id", path: [], toMany: false},
      {attribute: "title", label: "Child / Title", path: ["child"], toMany: false}
    ])
  })

  it("allows repeated model classes up to the relationship-depth limit", () => {
    class CycleChild {
      static getModelName() { return "SearchCatalogCycleChild" }
      static resourceConfig() { return {attributes: ["name"]} }
      static relationshipDefinitions() { return {parent: {type: "belongsTo"}} }
      static relationshipModelClasses() { return {parent: "SearchCatalogCycleRoot"} }
    }
    class CycleRoot {
      static getModelName() { return "SearchCatalogCycleRoot" }
      static resourceConfig() { return {attributes: ["id"]} }
      static relationshipDefinitions() { return {children: {type: "hasMany"}} }
      static relationshipModelClasses() { return {children: "SearchCatalogCycleChild"} }
    }

    registerFrontendModel(CycleChild)
    registerFrontendModel(CycleRoot)

    expect(buildSearchCatalog(CycleRoot)).toEqual([
      {attribute: "id", label: "Id", path: [], toMany: false},
      {attribute: "name", label: "Children / Name", path: ["children"], toMany: true},
      {attribute: "id", label: "Children / Parent / Id", path: ["children", "parent"], toMany: true},
      {attribute: "name", label: "Children / Parent / Children / Name", path: ["children", "parent", "children"], toMany: true}
    ])
  })

  it("rejects catalog depths above the shared filter contract", () => {
    class DepthRoot {
      static resourceConfig() { return {attributes: ["id"]} }
      static relationshipDefinitions() { return {} }
      static relationshipModelClasses() { return {} }
    }

    expect(() => buildSearchCatalog(DepthRoot, {maxRelationshipDepth: 4})).toThrowError(/depth/i)
  })

  it("throws when a declared relationship target cannot be resolved", () => {
    class UnresolvedRoot {
      static getModelName() { return "SearchCatalogUnresolvedRoot" }
      static resourceConfig() { return {attributes: ["id"]} }
      static relationshipDefinitions() { return {missing: {type: "belongsTo"}} }
      static relationshipModelClasses() { return {missing: "SearchCatalogMissingTarget"} }
    }

    expect(() => buildSearchCatalog(UnresolvedRoot)).toThrowError(/missing.*resolve|resolve.*missing/i)
  })
})
