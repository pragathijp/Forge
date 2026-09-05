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
    const last = await prisma.task.findFirst({
      where: { projectId, status },
      orderBy: { position: 'desc' },
    });
    return { prev: last, next: null };
  }

  if (insertAfterTaskId === null) {
    const first = await prisma.task.findFirst({
      where: { projectId, status },
      orderBy: { position: 'asc' },
    });
    return { prev: null, next: first };
  }

  const prev = await prisma.task.findUnique({ where: { id: insertAfterTaskId } });
  if (!prev) return { prev: null, next: null };

  const next = await prisma.task.findFirst({
    where: { projectId, status, position: { gt: prev.position } },
    orderBy: { position: 'asc' },
  });

  return { prev, next };
}

const POSITION_EPSILON = 0.001;

export async function renumberColumnIfNeeded(
  projectId: string,
  status: TaskStatus,
  candidatePosition: number,
  neighborPosition: number | null
) {
  if (neighborPosition === null) {
    return;
  }

  const gap = Math.abs(candidatePosition - neighborPosition);
  if (gap >= POSITION_EPSILON) {
    return;
  }

  const tasksInColumn = await prisma.task.findMany({
    where: { projectId, status },
    orderBy: { position: 'asc' },
  });

  await prisma.$transaction(
    tasksInColumn.map((task, index) =>
      prisma.task.update({
        where: { id: task.id },
        data: { position: (index + 1) * 1000 },
      })
    )
  );
}