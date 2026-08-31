import { Router } from 'express';
import { prisma } from '../config/prisma';
import { requireAuth } from '../middleware/requireAuth';
import { createProjectSchema, updateProjectSchema } from '../dto/projectDto';
import { findProjectByIdForOrg, findAllProjectsForOrg } from '../repositories/projectRepository';
import { ValidationError, NotFoundError } from '../utils/errors';

const router = Router();

router.use(requireAuth);

router.post('/', async (req, res) => {
  const parsed = createProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError('Invalid project data', parsed.error.format());
  }

  const { name, description } = parsed.data;
  const organizationId = req.user!.organizationId;

  const project = await prisma.project.create({
    data: { name, description, organizationId },
  });

  res.status(201).json(project);
});

router.get('/', async (req, res) => {
  const organizationId = req.user!.organizationId;
  const projects = await findAllProjectsForOrg(organizationId);
  res.status(200).json(projects);
});

router.get('/:id', async (req, res) => {
  const organizationId = req.user!.organizationId;
  const project = await findProjectByIdForOrg(req.params.id, organizationId);
  if (!project) {
    throw new NotFoundError('Project not found');
  }
  res.status(200).json(project);
});

router.patch('/:id', async (req, res) => {
  const parsed = updateProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError('Invalid project data', parsed.error.format());
  }

  const organizationId = req.user!.organizationId;
  const existing = await findProjectByIdForOrg(req.params.id, organizationId);
  if (!existing) {
    throw new NotFoundError('Project not found');
  }

  const project = await prisma.project.update({
    where: { id: req.params.id },
    data: parsed.data,
  });

  res.status(200).json(project);
});

router.delete('/:id', async (req, res) => {
  const organizationId = req.user!.organizationId;
  const existing = await findProjectByIdForOrg(req.params.id, organizationId);
  if (!existing) {
    throw new NotFoundError('Project not found');
  }

  await prisma.project.delete({ where: { id: req.params.id } });

  res.status(204).send();
});

export default router;
