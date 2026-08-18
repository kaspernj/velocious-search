# Filter contract

Velocious Search uses a versioned JSON filter value. A group combines conditions
and nested groups with `and` or `or`; each condition names an exposed resource
attribute and an optional exposed relationship path.

The browser catalog is only presentation metadata. `SearchableResource` rebuilds
and validates the catalog on the backend before applying the filter to the
already-authorized Velocious index query.

`SearchFilter` also requires an explicit `searchableFields` allowlist. This keeps
computed attributes and backend-forbidden relationship paths out of the editor.
The backend remains authoritative: the root resource must independently declare
the same attribute paths through `searchableFields()`.

Initial safeguards:

- only attributes declared by the target frontend-model resource are searchable;
- every attribute path must be explicitly listed by the root resource's `searchableFields()` method;
- searchable values are scalar JSON values, with scalar arrays reserved for `in` and `not_in`;
- every traversed relationship must be declared by its source resource;
- related paths must be explicitly listed by the root resource's `searchableRelationshipPaths()` method;
- polymorphic and cross-database traversal are not supported;
- through relationships are not supported;
- computed resource attributes that do not map to database attributes are rejected;
- relationship, group, condition, list, and value sizes are bounded;
- compiled Ransack descriptors must resolve back to the exact authorized paths and attributes;
- traversing a to-many relationship makes the root query distinct;
- malformed filters fail loudly instead of becoming an unfiltered query.

Root-record authorization remains owned by the consuming resource. Related-row
authorization is not automatically applied to SQL joins, so applications should
only list a related field in `searchableFields()` and its relationship path in
`searchableRelationshipPaths()` when those related rows are safe to use without
an additional authorization scope.
