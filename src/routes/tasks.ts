import { Router } from 'express';
import { prisma } from '../config/prisma';
import { requireAuth } from '../middleware/requireAuth';
import { createTaskSchema, updateTaskSchema } from '../dto/taskDto';
import { findTaskByIdForOrg, findAllTasksForOrg } from '../repositories/taskRepository';
import { findProjectByIdForOrg } from '../repositories/projectRepository';
import { isCreatorOrAdmin } from '../utils/permissions';
import { ValidationError, NotFoundError, ForbiddenError } from '../utils/errors';

const router = Router();

router.use(requireAuth);

router.post('/', async (req, res) => {
  const parsed = createTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError('Invalid task data', parsed.error.format());
  }

  const { projectId, title, description, assigneeId, priority, dueDate } = parsed.data;
  const organizationId = req.user!.organizationId;

  const project = await findProjectByIdForOrg(projectId, organizationId);
  if (!project) {
    throw new NotFoundError('Project not found');
  }

  const task = await prisma.task.create({
    data: {
      title,
      description,
      projectId,
      assigneeId,
      priority,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      creatorId: req.user!.userId,
      position: 0,
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

router.patch('/:id', async (req, res) => {
  const parsed = updateTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError('Invalid task data', parsed.error.format());
  }

  const organizationId = req.user!.organizationId;
  const existing = await findTaskByIdForOrg(req.params.id, organizationId);
  if (!existing) {
    throw new NotFoundError('Task not found');
  }

  if (!isCreatorOrAdmin(existing, req.user!)) {
    throw new ForbiddenError('Only the task creator or an admin can update this task');
  }

  const { dueDate, ...rest } = parsed.data;

  const task = await prisma.task.update({
    where: { id: req.params.id },
    data: {
      ...rest,
      ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
    },
  });

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