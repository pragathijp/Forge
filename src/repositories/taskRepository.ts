import { prisma } from '../config/prisma';

export async function findTaskByIdForOrg(id: string, organizationId: string) {
  return prisma.task.findFirst({
    where: { id, project: { organizationId } },
  });
}

export function findAllTasksForOrg(organizationId: string) {
  return prisma.task.findMany({ where: { project: { organizationId } } });
}