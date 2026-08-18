// @ts-check

import {cleanup, fireEvent, render, waitFor} from "@testing-library/react"
import {createElement} from "react"
import {registerFrontendModel} from "velocious/build/src/frontend-models/model-registry.js"

import SearchFilter from "../src/components/search-filter.jsx"
import {emptySearchFilter, parseSearchFilter} from "../src/filter-contract.js"

class SearchFilterBuild {
  static getModelName() { return "SearchFilterBuild" }
  static relationshipDefinitions() { return {} }
  static relationshipModelClasses() { return {} }
  static resourceConfig() { return {attributes: ["id", "name", "status"]} }
}

class SearchFilterBuildGroup {
  static getModelName() { return "SearchFilterBuildGroup" }
  static relationshipDefinitions() { return {builds: {type: "hasMany"}} }
  static relationshipModelClasses() { return {builds: "SearchFilterBuild"} }
  static resourceConfig() { return {attributes: ["id", "name"]} }
}

/**
 * @param {import("../src/filter-contract.js").SearchFilter} filter - Filter prop.
 * @param {jasmine.Spy} onFilterChange - Change callback.
 * @param {(message: string) => string} [translate] - Display translation callback.
 * @returns {import("react").ReactElement} - Search filter element.
 */
function searchFilterElement(filter, onFilterChange, translate) {
  return createElement(SearchFilter, {
    filter,
    modelClass: /** @type {import("velocious/build/src/frontend-models/base.js").FrontendModelClass} */ (SearchFilterBuildGroup),
    onFilterChange,
    searchableFields: [
      {attribute: "id", path: []},
      {attribute: "name", path: []},
      {attribute: "id", path: ["builds"]},
      {attribute: "name", path: ["builds"]}
    ],
    testID: "buildGroupSearchFilter",
    translate
  })
}

describe("search filter", () => {
  beforeAll(() => {
    registerFrontendModel(SearchFilterBuild)
    registerFrontendModel(SearchFilterBuildGroup)
  })

  afterEach(() => {
    cleanup()
  })

  it("builds and applies a related string condition without mutating the filter prop", async () => {
    const filter = emptySearchFilter()
    Object.freeze(filter.root.conditions)
    Object.freeze(filter.root.groups)
    Object.freeze(filter.root)
    Object.freeze(filter)
    const onFilterChange = jasmine.createSpy("onFilterChange")
    const view = render(searchFilterElement(filter, onFilterChange))

    fireEvent.click(view.getByTestId("buildGroupSearchFilter/addCondition"))
    fireEvent.click(await view.findByTestId("buildGroupSearchFilter/condition/0/field"))
    fireEvent.click(await view.findByTestId("buildGroupSearchFilter/condition/0/fieldOption/3"))
    fireEvent.click(await view.findByTestId("buildGroupSearchFilter/condition/0/predicate"))
    fireEvent.click(await view.findByTestId("buildGroupSearchFilter/condition/0/predicateOption/cont"))
    const valueInput = /** @type {HTMLInputElement | HTMLTextAreaElement} */ (await view.findByTestId("buildGroupSearchFilter/condition/0/value"))

    fireEvent.change(valueInput, {target: {value: "Needle"}})
    await waitFor(() => expect(valueInput.value).toBe("Needle"))
    fireEvent.click(view.getByTestId("buildGroupSearchFilter/apply"))

    await waitFor(() => {
      expect(onFilterChange).toHaveBeenCalledOnceWith({
        root: {
          combinator: "and",
          conditions: [{attribute: "name", path: ["builds"], predicate: "cont", value: "Needle"}],
          groups: []
        },
        version: 1
      })
    })
    expect(filter).toEqual(emptySearchFilter())
  })

  it("keeps incomplete drafts local and displays a validation error", async () => {
    const onFilterChange = jasmine.createSpy("onFilterChange")
    const view = render(searchFilterElement(emptySearchFilter(), onFilterChange))

    fireEvent.click(view.getByTestId("buildGroupSearchFilter/addCondition"))
    await view.findByTestId("buildGroupSearchFilter/condition/0")
    fireEvent.click(view.getByTestId("buildGroupSearchFilter/apply"))

    expect(onFilterChange).not.toHaveBeenCalled()
    expect((await view.findByTestId("buildGroupSearchFilter/validationError")).textContent).toMatch(/value/i)
  })

  it("translates controls and generated field labels through the consumer callback", async () => {
    const view = render(searchFilterElement(
      emptySearchFilter(),
      jasmine.createSpy("onFilterChange"),
      (message) => `Translated ${message}`
    ))

    expect(view.getByTestId("buildGroupSearchFilter/combinator/and/label").textContent).toBe("Translated Match all")
    expect(view.getByTestId("buildGroupSearchFilter/addCondition/label").textContent).toBe("Translated + Add condition")

    fireEvent.click(view.getByTestId("buildGroupSearchFilter/addCondition"))

    expect((await view.findByTestId("buildGroupSearchFilter/condition/0/field/label")).textContent).toBe("Translated Id")
    expect(view.getByTestId("buildGroupSearchFilter/condition/0/predicate/label").textContent).toBe("Translated equals")
    expect(view.getByTestId("buildGroupSearchFilter/condition/0/remove/label").textContent).toBe("Translated Remove")
  })

  it("renders only explicitly allowed catalog fields", async () => {
    const view = render(searchFilterElement(emptySearchFilter(), jasmine.createSpy("onFilterChange")))

    fireEvent.click(view.getByTestId("buildGroupSearchFilter/addCondition"))
    fireEvent.click(await view.findByTestId("buildGroupSearchFilter/condition/0/field"))

    expect(view.getAllByTestId(/buildGroupSearchFilter\/condition\/0\/fieldOption\/\d+$/).length).toBe(4)
    expect(view.queryByText("Builds / Status")).toBeNull()
  })

  it("does not turn consumer callback exceptions into validation errors", async () => {
    const onFilterChange = jasmine.createSpy("onFilterChange").and.throwError("consumer callback failed")
    const view = render(searchFilterElement(emptySearchFilter(), onFilterChange))
    /** @type {Error | null} */
    let reportedError = null
    /** @param {ErrorEvent} event - Browser error event. */
    const onError = (event) => {
      if (event.error instanceof Error) reportedError = event.error
      event.preventDefault()
    }

    window.addEventListener("error", onError)

    try {
      fireEvent.click(view.getByTestId("buildGroupSearchFilter/apply"))
      await waitFor(() => expect(reportedError?.message).toBe("consumer callback failed"))
    } finally {
      window.removeEventListener("error", onError)
    }

    expect(onFilterChange).toHaveBeenCalled()
    expect(view.queryByTestId("buildGroupSearchFilter/validationError")).toBeNull()
  })

  it("converts list and null editor values to valid filter values", async () => {
    const onFilterChange = jasmine.createSpy("onFilterChange")
    const view = render(searchFilterElement(emptySearchFilter(), onFilterChange))

    fireEvent.click(view.getByTestId("buildGroupSearchFilter/addCondition"))
    fireEvent.click(await view.findByTestId("buildGroupSearchFilter/condition/0/predicate"))
    fireEvent.click(await view.findByTestId("buildGroupSearchFilter/condition/0/predicateOption/in"))
    const valueInput = /** @type {HTMLInputElement} */ (await view.findByTestId("buildGroupSearchFilter/condition/0/value"))

    fireEvent.change(valueInput, {target: {value: "passed\nfailed\ncancelled"}})
    await waitFor(() => expect(valueInput.value).toBe("passed\nfailed\ncancelled"))
    fireEvent.click(view.getByTestId("buildGroupSearchFilter/apply"))

    await waitFor(() => expect(onFilterChange).toHaveBeenCalledTimes(1))

    const listFilter = /** @type {import("../src/filter-contract.js").SearchFilter} */ (onFilterChange.calls.mostRecent().args[0])

    expect(listFilter.root.conditions[0].value).toEqual(["passed", "failed", "cancelled"])
    expect(() => parseSearchFilter(listFilter)).not.toThrow()

    fireEvent.click(view.getByTestId("buildGroupSearchFilter/condition/0/predicate"))
    fireEvent.click(await view.findByTestId("buildGroupSearchFilter/condition/0/predicateOption/null"))
    fireEvent.click(await view.findByTestId("buildGroupSearchFilter/condition/0/nullValue"))
    await waitFor(() => expect(view.getByTestId("buildGroupSearchFilter/condition/0/nullValue/label").textContent).toBe("No"))
    fireEvent.click(view.getByTestId("buildGroupSearchFilter/apply"))

    await waitFor(() => expect(onFilterChange).toHaveBeenCalledTimes(2))

    const nullFilter = /** @type {import("../src/filter-contract.js").SearchFilter} */ (onFilterChange.calls.mostRecent().args[0])

    expect(nullFilter.root.conditions[0].value).toBeFalse()
    expect(() => parseSearchFilter(nullFilter)).not.toThrow()
  })

  it("preserves unchanged scalar and list value types", async () => {
    const onFilterChange = jasmine.createSpy("onFilterChange")
    const filter = parseSearchFilter({
      root: {
        combinator: "and",
        conditions: [
          {attribute: "id", path: [], predicate: "eq", value: 42},
          {attribute: "name", path: ["builds"], predicate: "in", value: [1, true, "a,b"]}
        ],
        groups: []
      },
      version: 1
    })
    const view = render(searchFilterElement(filter, onFilterChange))

    fireEvent.click(view.getByTestId("buildGroupSearchFilter/apply"))
    await waitFor(() => expect(onFilterChange).toHaveBeenCalledTimes(1))

    const appliedFilter = /** @type {import("../src/filter-contract.js").SearchFilter} */ (onFilterChange.calls.mostRecent().args[0])

    expect(appliedFilter.root.conditions[0].value).toBe(42)
    expect(appliedFilter.root.conditions[1].value).toEqual([1, true, "a,b"])

    fireEvent.click(view.getByTestId("buildGroupSearchFilter/condition/0/predicate"))
    fireEvent.click(await view.findByTestId("buildGroupSearchFilter/condition/0/predicateOption/gt"))
    fireEvent.click(view.getByTestId("buildGroupSearchFilter/condition/1/predicate"))
    fireEvent.click(await view.findByTestId("buildGroupSearchFilter/condition/1/predicateOption/not_in"))
    fireEvent.click(view.getByTestId("buildGroupSearchFilter/apply"))
    await waitFor(() => expect(onFilterChange).toHaveBeenCalledTimes(2))

    const predicateChangedFilter = /** @type {import("../src/filter-contract.js").SearchFilter} */ (onFilterChange.calls.mostRecent().args[0])

    expect(predicateChangedFilter.root.conditions[0]).toEqual({attribute: "id", path: [], predicate: "gt", value: 42})
    expect(predicateChangedFilter.root.conditions[1]).toEqual({attribute: "name", path: ["builds"], predicate: "not_in", value: [1, true, "a,b"]})
  })

  it("supports root combinators and removing conditions", async () => {
    const onFilterChange = jasmine.createSpy("onFilterChange")
    const view = render(searchFilterElement(emptySearchFilter(), onFilterChange))

    fireEvent.click(view.getByTestId("buildGroupSearchFilter/addCondition"))
    await view.findByTestId("buildGroupSearchFilter/condition/0")
    fireEvent.click(view.getByTestId("buildGroupSearchFilter/addCondition"))
    await view.findByTestId("buildGroupSearchFilter/condition/1")
    fireEvent.click(view.getByTestId("buildGroupSearchFilter/combinator/or"))
    await waitFor(() => {
      expect(view.getByTestId("buildGroupSearchFilter/combinator/or").style.backgroundColor).toBe("rgb(15, 23, 42)")
    })
    fireEvent.click(view.getByTestId("buildGroupSearchFilter/condition/1/remove"))
    await waitFor(() => expect(view.queryByTestId("buildGroupSearchFilter/condition/1")).toBeNull())
    fireEvent.click(view.getByTestId("buildGroupSearchFilter/condition/0/remove"))
    await waitFor(() => expect(view.queryByTestId("buildGroupSearchFilter/condition/0")).toBeNull())
    fireEvent.click(view.getByTestId("buildGroupSearchFilter/apply"))

    await waitFor(() => {
      expect(onFilterChange).toHaveBeenCalledOnceWith({
        root: {combinator: "or", conditions: [], groups: []},
        version: 1
      })
    })
  })

  it("resets its draft when the controlled filter prop changes", async () => {
    const onFilterChange = jasmine.createSpy("onFilterChange")
    const firstFilter = parseSearchFilter({
      root: {
        combinator: "and",
        conditions: [{attribute: "name", path: [], predicate: "cont", value: "first"}],
        groups: []
      },
      version: 1
    })
    const secondFilter = parseSearchFilter({
      root: {
        combinator: "and",
        conditions: [{attribute: "name", path: [], predicate: "cont", value: "second"}],
        groups: []
      },
      version: 1
    })
    const view = render(searchFilterElement(firstFilter, onFilterChange))

    expect(/** @type {HTMLInputElement} */ (view.getByTestId("buildGroupSearchFilter/condition/0/value")).value).toBe("first")

    view.rerender(searchFilterElement(secondFilter, onFilterChange))

    await waitFor(() => {
      expect(/** @type {HTMLInputElement} */ (view.getByTestId("buildGroupSearchFilter/condition/0/value")).value).toBe("second")
    })
  })
})
