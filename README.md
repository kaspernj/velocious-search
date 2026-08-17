# velocious-search

Reusable relationship-aware filters for Velocious frontend-model resources.

The package provides one React Native-compatible JSX component that discovers
the attributes and relationships exposed by a generated Velocious model. It
produces a versioned filter value that can be applied to normal frontend-model
queries without replacing their count, pagination, preload, or serialization
behavior.

```jsx
import applySearch from "velocious-search/apply-search"
import SearchFilter from "velocious-search/search-filter"

const searchableFields = [
  {attribute: "name", path: []},
  {attribute: "name", path: ["builds"]}
]

<SearchFilter
  filter={filter}
  modelClass={BuildGroup}
  onFilterChange={onFilterChange}
  searchableFields={searchableFields}
  testID="buildGroupSearchFilter"
/>

const buildGroups = await applySearch(BuildGroup.all(), filter).toArray()
```

Backend resources opt in once through their shared base resource:

```js
import SearchableResource from "velocious-search/searchable-resource"

export default class BaseResource extends SearchableResource {
  // Existing application authorization and resource helpers stay here.
}
```

Root attributes exposed by a resource are searchable automatically. Relationship
searches inspect related rows outside the root resource's authorization scope, so
each root resource must explicitly allow the safe paths it needs:

```js
export default class BuildGroupResource extends BaseResource {
  static searchableRelationshipPaths() {
    return [["builds"]]
  }
}
```

Only database-backed attributes can be searched. Polymorphic, through, and
cross-database relationship paths are rejected. `searchableFields` is an
explicit frontend allowlist and should mirror the database-backed attributes
and related paths approved by the backend resources.

`SearchFilter` edits flat root conditions. The filter contract supports nested
groups for programmatic clients, but the component rejects nested groups it
cannot display. See [`docs/filter-contract.md`](docs/filter-contract.md) for the
filter format and security boundary.

## Development

- `npm run lint` checks ESLint and JSDoc/TypeScript contracts.
- `npm test -- spec/path-to-spec.js` runs a focused spec.
- `npm run test:package-entrypoints` builds and loads every published subpath.
- `npm run build` generates publishable JavaScript and declarations under `build/`.
- `npm pack --dry-run` verifies package contents and entrypoints.

Frontend and backend source compile in separate TypeScript projects. The frontend
project skips dependency declaration checking because React Native and Node
intentionally declare overlapping runtime globals; package source remains fully
checked, and the backend project checks dependency declarations normally.

## License

ISC
