// @ts-check

import {parseSearchFilter, searchFilterIsEmpty} from "./filter-contract.js"

/**
 * Clones a frontend-model query and appends the package search descriptor.
 * @template {import("velocious/build/src/frontend-models/base.js").FrontendModelClass} T
 * @param {import("velocious/build/src/frontend-models/query.js").default<T>} query - Caller-owned frontend-model query.
 * @param {unknown} filter - Untrusted versioned filter value.
 * @returns {import("velocious/build/src/frontend-models/query.js").default<T>} - Independent query with the search applied.
 */
export default function applySearch(query, filter) {
  const parsedFilter = parseSearchFilter(filter)
  const clonedQuery = query.clone()

  if (searchFilterIsEmpty(parsedFilter)) return clonedQuery

  return clonedQuery.search([], "__velociousSearch", "eq", parsedFilter)
}
