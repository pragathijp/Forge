# Project Conventions

## Tenant Scoping

Every query on a tenant-scoped model (Project, Task, Comment, ActivityLog, Notification, Attachment)
must include `organizationId` in its `where` clause — either directly, or via a relation
(e.g. `project: { organizationId }` for models that don't have their own `organizationId` field).

Never call a bare `prisma.model.findUnique({ where: { id } })` on a tenant-scoped model.
Always go through a repository helper function that takes `organizationId` explicitly as a parameter.

This prevents a request from one organization ever accidentally reading or modifying
another organization's data.

## Position Field & Fractional Ordering (Task 2.5)

`Task.position` is a `Float`, not `Decimal`. This is a deliberate choice, not an oversight:

- **Float** is simpler and faster for the common case — native JS/Postgres double-precision
  comparisons, no external decimal library needed, and it's what the index on
  `[projectId, status, position]` is built against.
- **The tradeoff:** repeatedly inserting between the same two neighbors converges toward
  floating-point precision limits over many insertions, since each insert computes a
  midpoint that gets closer and closer to its neighbors.
- **This tradeoff is intentionally mitigated, not avoided upfront** — Task 2.6 implements
  epsilon-detection and a renumbering pass specifically to reset position values to clean,
  evenly-spaced numbers once the gap between neighbors gets too small to safely subdivide.
  Decimal would have avoided this problem entirely but at the cost of complexity and
  performance on every read/write; Float + periodic renumbering was chosen as the simpler,
  faster default with a known, bounded failure mode that's explicitly handled elsewhere.

**Insertion logic:** new task position = midpoint of its neighbors' positions.
- Both neighbors exist: `(prevPosition + nextPosition) / 2`
- No previous neighbor (inserting at start): `nextPosition / 2` (or `nextPosition - 1000` if `nextPosition` is already very small)
- No next neighbor (inserting at end): `prevPosition + 1000`
- Empty column: default starting position `1000`

## Known Accepted Vulnerability — mysql2 (via Prisma)

`npm audit` flags `mysql2` (2 CVEs, high/moderate severity) as a transitive dependency of
Prisma. This is accepted as a non-issue: Forge is Postgres-only, connecting exclusively via
`@prisma/adapter-pg`. `mysql2` is never imported or executed anywhere in this codebase — it's
an unused optional driver Prisma bundles regardless of which database you actually use.

`npm audit fix --force` would resolve this by downgrading Prisma to `6.19.3`, a breaking
change we're not taking for a vulnerability with zero real exposure. To be revisited only if
Prisma ships a fix that doesn't require a downgrade.


