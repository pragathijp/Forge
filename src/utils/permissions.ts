interface TaskLike {
  assigneeId: string | null;
  creatorId: string;
}

interface UserLike {
  userId: string;
  role: string;
}

export function isAssigneeOrAdmin(task: TaskLike, user: UserLike): boolean {
  return user.role === 'ADMIN' || task.assigneeId === user.userId;
}

export function isCreatorOrAdmin(entity: { creatorId: string } | { authorId: string }, user: UserLike): boolean {
  const ownerId = 'creatorId' in entity ? entity.creatorId : entity.authorId;
  return user.role === 'ADMIN' || ownerId === user.userId;
}