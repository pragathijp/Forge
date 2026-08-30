# Project Conventions

## Tenant Scoping

Every query on a tenant-scoped model (Project, Task, Comment, ActivityLog, Notification, Attachment)
must include `organizationId` in its `where` clause — either directly, or via a relation
(e.g. `project: { organizationId }` for models that don't have their own `organizationId` field).

Never call a bare `prisma.model.findUnique({ where: { id } })` on a tenant-scoped model.
Always go through a repository helper function that takes `organizationId` explicitly as a parameter.

This prevents a request from one organization ever accidentally reading or modifying
another organization's data.