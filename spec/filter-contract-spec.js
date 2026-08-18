// @ts-check

import {
  emptySearchFilter,
  parseSearchFilter,
  searchFilterIsEmpty,
  searchFilterToRansack
} from "../src/filter-contract.js"

/** @returns {import("../src/filter-contract.js").SearchCondition} */
function nameCondition() {
  return {attribute: "name", path: [], predicate: "cont", value: "api"}
}

/**
 * @param {import("../src/filter-contract.js").SearchGroup} root - Root group.
 * @returns {import("../src/filter-contract.js").SearchFilter}
 */
function filterWithRoot(root) {
  return {root, version: 1}
}

describe("filter contract", () => {
  it("creates independent empty version-one filters", () => {
    const first = emptySearchFilter()
    const second = emptySearchFilter()

    expect(first).toEqual({
      root: {combinator: "and", conditions: [], groups: []},
      version: 1
    })
    expect(first).not.toBe(second)
    expect(first.root.conditions).not.toBe(second.root.conditions)
    expect(first.root.groups).not.toBe(second.root.groups)
  })

  it("parses an untrusted filter into an independent value", () => {
    const value = {
      root: {
        combinator: "or",
        conditions: [{
          attribute: "status",
          path: ["builds"],
          predicate: "in",
          value: ["passed", "failed"]
        }],
        groups: []
      },
      version: 1
    }

    const parsed = parseSearchFilter(value)

    expect(parsed).toEqual(value)
    expect(parsed).not.toBe(value)
    expect(parsed.root).not.toBe(value.root)
    expect(parsed.root.conditions[0].value).not.toBe(value.root.conditions[0].value)
  })

  it("recognizes empty filters recursively", () => {
    const nestedEmpty = filterWithRoot({
      combinator: "and",
      conditions: [],
      groups: [{combinator: "or", conditions: [], groups: []}]
    })
    const nestedCondition = filterWithRoot({
      combinator: "and",
      conditions: [],
      groups: [{combinator: "or", conditions: [nameCondition()], groups: []}]
    })

    expect(searchFilterIsEmpty(nestedEmpty)).toBeTrue()
    expect(searchFilterIsEmpty(nestedCondition)).toBeFalse()
  })

  it("compiles recursive groups to advanced Ransack with camelCase paths", () => {
    const filter = parseSearchFilter(filterWithRoot({
      combinator: "and",
      conditions: [{attribute: "createdAt", path: [], predicate: "gteq", value: "2026-01-01"}],
      groups: [{
        combinator: "or",
        conditions: [
          {attribute: "name", path: ["builds"], predicate: "cont", value: "api"},
          {attribute: "status", path: ["builds", "imageBuild"], predicate: "not_in", value: ["failed", "cancelled"]}
        ],
        groups: []
      }]
    }))

    expect(searchFilterToRansack(filter)).toEqual({
      c: [{a: "createdAt", p: "gteq", v: "2026-01-01"}],
      g: [{
        c: [
          {a: "buildsName", p: "cont", v: "api"},
          {a: "buildsImageBuildStatus", p: "not_in", v: ["failed", "cancelled"]}
        ],
        g: [],
        m: "or"
      }],
      m: "and"
    })
  })

  it("rejects malformed and blank conditions instead of discarding them", () => {
    const invalidConditions = [
      {attribute: "", path: [], predicate: "eq", value: "value"},
      {attribute: "name", path: ["  "], predicate: "eq", value: "value"},
      {attribute: "name", path: [], predicate: "unknown", value: "value"},
      {attribute: "name", path: [], predicate: "eq", value: ""},
      {attribute: "name", path: [], predicate: "eq", value: undefined},
      {attribute: "name", path: [], predicate: "eq", value: ["value"]},
      {attribute: "name", path: [], predicate: "eq", value: {nested: "value"}},
      {attribute: "name", path: [], predicate: "in", value: "value"},
      {attribute: "name", path: [], predicate: "in", value: []},
      {attribute: "name", path: [], predicate: "in", value: [null]},
      {attribute: "name", path: [], predicate: "in", value: [["nested"]]},
      {attribute: "name", path: [], predicate: "in", value: [{nested: "value"}]},
      {attribute: "name", path: [], predicate: "null", value: "true"}
    ]

    for (const condition of invalidConditions) {
      const value = filterWithRoot({
        combinator: "and",
        conditions: [condition],
        groups: []
      })

      expect(() => parseSearchFilter(value)).withContext(JSON.stringify(condition)).toThrow()
    }
  })

  it("rejects malformed envelopes, groups, and unexpected keys", () => {
    expect(() => parseSearchFilter(null)).toThrow()
    expect(() => parseSearchFilter({root: {combinator: "and", conditions: [], groups: []}, version: 2})).toThrow()
    expect(() => parseSearchFilter({root: {combinator: "xor", conditions: [], groups: []}, version: 1})).toThrow()
    expect(() => parseSearchFilter({root: {combinator: "and", conditions: {}, groups: []}, version: 1})).toThrow()
    expect(() => parseSearchFilter({extra: true, root: {combinator: "and", conditions: [], groups: []}, version: 1})).toThrow()
  })

  it("rejects sparse arrays instead of skipping unvalidated entries", () => {
    const sparseConditions = new Array(1)
    const sparseGroups = new Array(1)
    const sparsePath = new Array(1)
    const sparseList = new Array(1)

    expect(() => parseSearchFilter(filterWithRoot({combinator: "and", conditions: sparseConditions, groups: []}))).toThrow()
    expect(() => parseSearchFilter(filterWithRoot({combinator: "and", conditions: [], groups: sparseGroups}))).toThrow()
    expect(() => parseSearchFilter(filterWithRoot({
      combinator: "and",
      conditions: [{...nameCondition(), path: sparsePath}],
      groups: []
    }))).toThrow()
    expect(() => parseSearchFilter(filterWithRoot({
      combinator: "and",
      conditions: [{attribute: "id", path: [], predicate: "in", value: sparseList}],
      groups: []
    }))).toThrow()
  })

  it("enforces the named default complexity limits", () => {
    const tooDeepPath = filterWithRoot({
      combinator: "and",
      conditions: [{...nameCondition(), path: ["one", "two", "three", "four"]}],
      groups: []
    })
    const tooDeepGroups = filterWithRoot({
      combinator: "and",
      conditions: [],
      groups: [{
        combinator: "and",
        conditions: [],
        groups: [{
          combinator: "and",
          conditions: [],
          groups: [{combinator: "and", conditions: [], groups: []}]
        }]
      }]
    })
    const tooManyGroups = filterWithRoot({
      combinator: "and",
      conditions: [],
      groups: Array.from({length: 25}, () => ({combinator: "and", conditions: [], groups: []}))
    })
    const tooManyConditions = filterWithRoot({
      combinator: "and",
      conditions: Array.from({length: 26}, nameCondition),
      groups: []
    })
    const tooManyListValues = filterWithRoot({
      combinator: "and",
      conditions: [{attribute: "id", path: [], predicate: "in", value: Array.from({length: 101}, (_, index) => index)}],
      groups: []
    })
    const tooLongString = filterWithRoot({
      combinator: "and",
      conditions: [{attribute: "name", path: [], predicate: "eq", value: "x".repeat(501)}],
      groups: []
    })

    for (const value of [tooDeepPath, tooDeepGroups, tooManyGroups, tooManyConditions, tooManyListValues, tooLongString]) {
      expect(() => parseSearchFilter(value)).toThrow()
    }
  })

  it("supports stricter named limit overrides", () => {
    const value = filterWithRoot({
      combinator: "and",
      conditions: [nameCondition(), {...nameCondition(), attribute: "status"}],
      groups: []
    })

    expect(() => parseSearchFilter(value, {maxConditions: 1})).toThrow()
    expect(() => parseSearchFilter(value, {maxConditions: 2})).not.toThrow()
  })
})
