// @ts-check

describe("package entrypoints", () => {
  it("loads every documented built subpath", async () => {
    const [applySearch, filterContract, searchCatalog, searchFilter, searchableResource] = await Promise.all([
      import("velocious-search/apply-search"),
      import("velocious-search/filter-contract"),
      import("velocious-search/search-catalog"),
      import("velocious-search/search-filter"),
      import("velocious-search/searchable-resource")
    ])

    expect(applySearch.default).toEqual(jasmine.any(Function))
    expect(filterContract.parseSearchFilter).toEqual(jasmine.any(Function))
    expect(searchCatalog.default).toEqual(jasmine.any(Function))
    expect(searchFilter.default).toBeDefined()
    expect(searchableResource.default).toEqual(jasmine.any(Function))
  })
})
