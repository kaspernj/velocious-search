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
  translate={translate}
/>

const buildGroups = await applySearch(BuildGroup.all(), filter).toArray()
```

`translate` is optional and receives every built-in control, predicate, and
generated catalog label. Omit it when English identity labels are appropriate.

Backend resources opt in once through their shared base resource:

```js
import SearchableResource from "velocious-search/searchable-resource"

/**
 * @template {typeof import("velocious/build/src/database/record/index.js").default} [TModelClass=typeof import("velocious/build/src/database/record/index.js").default]
 * @augments {SearchableResource<TModelClass>}
 */
export default class BaseResource extends SearchableResource {
  // Existing application authorization and resource helpers stay here.
}
```

`SearchableResource` preserves the consuming resource base's generic backend
model type, so typed methods such as `authorizedQuery()` continue returning the
application's concrete record class.

Every resource must explicitly allow the safe root and relationship fields it
needs. Relationship searches also inspect related rows outside the root
resource's authorization scope, so relationship paths require a second explicit
opt-in:

```js
export default class BuildGroupResource extends BaseResource {
  static searchableFields() {
    return [
      {attribute: "name", path: []},
      {attribute: "name", path: ["builds"]}
    ]
  }

  static searchableRelationshipPaths() {
    return [["builds"]]
  }
}
```

Only database-backed attributes can be searched. Polymorphic, through, and
cross-database relationship paths are rejected. The `SearchFilter`
`searchableFields` prop is presentation metadata and should mirror the backend
resource's authoritative `searchableFields()` declaration.

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
