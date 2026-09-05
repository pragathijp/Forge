import { Router, Request } from 'express';
import { prisma } from '../config/prisma';
import { requireAuth } from '../middleware/requireAuth';
import { createTaskSchema, updateTaskSchema } from '../dto/taskDto';
import { findTaskByIdForOrg, findAllTasksForOrg, findTaskPositionNeighbors, renumberColumnIfNeeded } from '../repositories/taskRepository';
import { findProjectByIdForOrg } from '../repositories/projectRepository';
import { isCreatorOrAdmin, isAssigneeOrAdmin } from '../utils/permissions';
import { ValidationError, NotFoundError, ForbiddenError, ConflictError } from '../utils/errors';
import { idempotency } from '../middleware/idempotency';
import { computePosition } from '../utils/position';

const router = Router();
router.use(requireAuth);

router.post('/', idempotency, async (req: Request, res) => {
  const parsed = createTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError('Invalid task data', parsed.error.format());
  }

  const { projectId, title, description, assigneeId, priority, dueDate, insertAfterTaskId } = parsed.data;
  const organizationId = req.user!.organizationId;

  const project = await findProjectByIdForOrg(projectId, organizationId);
  if (!project) {
    throw new NotFoundError('Project not found');
  }

  const { prev, next } = await findTaskPositionNeighbors(projectId, 'TODO', insertAfterTaskId);
  const position = computePosition(prev?.position ?? null, next?.position ?? null);
  await renumberColumnIfNeeded(projectId, 'TODO', position, prev?.position ?? next?.position ?? null);

  const task = await prisma.task.create({
    data: {
      title,
      description,
      projectId,
      assigneeId,
      priority,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      creatorId: req.user!.userId,
      position,
    },
  });

  res.status(201).json(task);
});

router.get('/', async (req, res) => {
  const organizationId = req.user!.organizationId;
  const tasks = await findAllTasksForOrg(organizationId);
  res.status(200).json(tasks);
});

router.get('/:id', async (req, res) => {
  const organizationId = req.user!.organizationId;
  const task = await findTaskByIdForOrg(req.params.id, organizationId);
  if (!task) {
    throw new NotFoundError('Task not found');
  }
  res.status(200).json(task);
});

router.patch('/:id', idempotency, async (req: Request<{ id: string }>, res) => {
  const parsed = updateTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError('Invalid task data', parsed.error.format());
  }

  const organizationId = req.user!.organizationId;
  const existing = await findTaskByIdForOrg(req.params.id, organizationId);
  if (!existing) {
    throw new NotFoundError('Task not found');
  }

  if (!isAssigneeOrAdmin(existing, req.user!)) {
    throw new ForbiddenError('Only the task assignee or an admin can update this task');
  }

    const { dueDate, version, ...rest } = parsed.data;

  const result = await prisma.task.updateMany({
    where: { id: req.params.id, version },
    data: {
      ...rest,
      ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
      version: { increment: 1 },
    },
  });

  if (result.count === 0) {
    throw new ConflictError('Task was modified by someone else — please reload and try again');
  }

  const task = await prisma.task.findUnique({ where: { id: req.params.id } });

  res.status(200).json(task);
});

router.delete('/:id', async (req, res) => {
  const organizationId = req.user!.organizationId;
  const existing = await findTaskByIdForOrg(req.params.id, organizationId);
  if (!existing) {
    throw new NotFoundError('Task not found');
  }

  if (!isCreatorOrAdmin(existing, req.user!)) {
    throw new ForbiddenError('Only the task creator or an admin can delete this task');
  }

  await prisma.task.delete({ where: { id: req.params.id } });

  res.status(204).send();
});

export default router;