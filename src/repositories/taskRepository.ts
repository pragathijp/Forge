import { prisma } from '../config/prisma';
import { TaskStatus } from '../generated/prisma/client';

export async function findTaskByIdForOrg(id: string, organizationId: string) {
  return prisma.task.findFirst({
    where: { id, project: { organizationId } },
  });
}

export function findAllTasksForOrg(organizationId: string) {
  return prisma.task.findMany({ where: { project: { organizationId } } });
}

export async function findTaskPositionNeighbors(
  projectId: string,
  status: TaskStatus,
  insertAfterTaskId: string | null | undefined
) {
  if (insertAfterTaskId === undefined) {
    // No insertion point specified — insert at the end of the column
    const last = await prisma.task.findFirst({
      where: { projectId, status },
      orderBy: { position: 'desc' },
    });
    return { prev: last, next: null };
  }

  if (insertAfterTaskId === null) {
    // Insert at the very start of the column
    const first = await prisma.task.findFirst({
      where: { projectId, status },
      orderBy: { position: 'asc' },
    });
    return { prev: null, next: first };
  }

  // Insert after a specific task
  const prev = await prisma.task.findUnique({ where: { id: insertAfterTaskId } });
  if (!prev) return { prev: null, next: null };

  const next = await prisma.task.findFirst({
    where: { projectId, status, position: { gt: prev.position } },
    orderBy: { position: 'asc' },
  });

  return { prev, next };
}