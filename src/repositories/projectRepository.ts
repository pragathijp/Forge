import { prisma } from '../config/prisma';

export function findProjectByIdForOrg(id: string, organizationId: string) {
  return prisma.project.findFirst({ where: { id, organizationId } });
}

export function findAllProjectsForOrg(organizationId: string) {
  return prisma.project.findMany({ where: { organizationId } });
}