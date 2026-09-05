import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../config/prisma';
import { findTaskPositionNeighbors, renumberColumnIfNeeded } from './taskRepository';
import { computePosition } from '../utils/position';

describe('Position renumbering under repeated same-slot inserts', () => {
  let organizationId: string;
  let projectId: string;

  beforeAll(async () => {
    const org = await prisma.organization.create({ data: { name: 'Renumber Test Org' } });
    organizationId = org.id;

    const user = await prisma.user.create({
      data: {
        email: `renumber-test-${Date.now()}@test.com`,
        passwordHash: 'not-a-real-hash',
        name: 'Renumber Tester',
        role: 'ADMIN',
        organizationId,
      },
    });

    const project = await prisma.project.create({
      data: { name: 'Renumber Test Project', organizationId },
    });
    projectId = project.id;

    // Two starting tasks to insert between, repeatedly
    await prisma.task.create({
      data: { title: 'Start', projectId, creatorId: user.id, position: 1000 },
    });
    await prisma.task.create({
      data: { title: 'End', projectId, creatorId: user.id, position: 2000 },
    });
  });

  afterAll(async () => {
    // Clean up everything created for this test
    await prisma.task.deleteMany({ where: { projectId } });
    await prisma.project.deleteMany({ where: { organizationId } });
    await prisma.user.deleteMany({ where: { organizationId } });
    await prisma.organization.delete({ where: { id: organizationId } });
  });

  it('survives 50 sequential same-slot inserts without float precision corruption or ordering breakage', async () => {
    const startTask = await prisma.task.findFirstOrThrow({ where: { projectId, title: 'Start' } });

    // Repeatedly insert a new task right after "Start" — the tightest possible squeeze,
    // since each new task becomes the new "next" neighbor for the following insert.
    for (let i = 0; i < 50; i++) {
      const { prev, next } = await findTaskPositionNeighbors(projectId, 'TODO', startTask.id);
      const position = computePosition(prev?.position ?? null, next?.position ?? null);

      await renumberColumnIfNeeded(projectId, 'TODO', position, prev?.position ?? next?.position ?? null);

      // Re-fetch prev/next AFTER a possible renumber, since positions may have shifted
      const { prev: freshPrev, next: freshNext } = await findTaskPositionNeighbors(projectId, 'TODO', startTask.id);
      const finalPosition = computePosition(freshPrev?.position ?? null, freshNext?.position ?? null);

      await prisma.task.create({
        data: {
          title: `Inserted ${i}`,
          projectId,
          creatorId: startTask.creatorId,
          position: finalPosition,
        },
      });
    }

    // Fetch the full, real, ordered column from the database
    const allTasks = await prisma.task.findMany({
      where: { projectId },
      orderBy: { position: 'asc' },
    });

    // 1. No corruption: every position is a finite, valid number
    for (const task of allTasks) {
      expect(Number.isFinite(task.position)).toBe(true);
      expect(Number.isNaN(task.position)).toBe(false);
    }

    // 2. No ordering breakage: strictly increasing positions, no duplicates or reversals
    for (let i = 1; i < allTasks.length; i++) {
      expect(allTasks[i].position).toBeGreaterThan(allTasks[i - 1].position);
    }

    // 3. Correct count: original 2 + 50 inserted = 52
    expect(allTasks.length).toBe(52);
  });
});