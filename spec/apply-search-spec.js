// @ts-check

import applySearch from "../src/apply-search.js"
import {emptySearchFilter} from "../src/filter-contract.js"

describe("apply search", () => {
  it("returns an unchanged clone for an empty filter", () => {
    const clone = {search: jasmine.createSpy("search")}
    const query = {clone: jasmine.createSpy("clone").and.returnValue(clone)}

    const result = applySearch(query, emptySearchFilter())

    expect(result).toBe(clone)
    expect(query.clone).toHaveBeenCalledOnceWith()
    expect(clone.search).not.toHaveBeenCalled()
  })

  it("appends exactly one built-in descriptor containing the parsed filter", () => {
    const clone = {search: jasmine.createSpy("search")}
    clone.search.and.returnValue(clone)
    const query = {clone: jasmine.createSpy("clone").and.returnValue(clone)}
    const filter = {
      root: {
        combinator: "and",
        conditions: [{attribute: "name", path: ["builds"], predicate: "cont", value: "api"}],
        groups: []
      },
      version: 1
    }

    const result = applySearch(query, filter)
    const appliedFilter = clone.search.calls.argsFor(0)[3]

    expect(result).toBe(clone)
    expect(clone.search).toHaveBeenCalledOnceWith([], "__velociousSearch", "eq", jasmine.any(Object))
    expect(appliedFilter).toEqual(filter)
    expect(appliedFilter).not.toBe(filter)
  })

  it("fails loudly for malformed filters without mutating the query", () => {
    const clone = {search: jasmine.createSpy("search")}
    const query = {clone: jasmine.createSpy("clone").and.returnValue(clone)}

    expect(() => applySearch(query, {root: null, version: 1})).toThrow()
    expect(clone.search).not.toHaveBeenCalled()
  })
})
