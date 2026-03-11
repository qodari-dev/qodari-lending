import {
  db,
  loanApprovalLevels,
  loanApprovalLevelUsers,
  loanApplicationApprovalHistory,
  loanApplications,
} from '@/server/db';
import { throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { toNumber } from '@/server/utils/value-utils';
import { and, asc, eq, sql } from 'drizzle-orm';

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DbLike = typeof db | DbTransaction;

type LoanApplicationApprovalState = Pick<
  typeof loanApplications.$inferSelect,
  | 'id'
  | 'status'
  | 'requestedAmount'
  | 'currentApprovalLevelId'
  | 'targetApprovalLevelId'
  | 'assignedApprovalUserId'
  | 'assignedApprovalUserName'
  | 'approvalAssignedAt'
>;

type UserContext = {
  userId: string;
  userName: string;
};

function validateConfigurationOrder(
  levels: Array<{
    id: number;
    levelOrder: number;
    maxApprovalAmount: string | null;
  }>
) {
  let previousMax = -1;

  for (let index = 0; index < levels.length; index += 1) {
    const level = levels[index];
    const isLast = index === levels.length - 1;

    if (level.maxApprovalAmount === null) {
      if (!isLast) {
        throwHttpError({
          status: 409,
          message: 'Configuracion invalida de niveles: solo el ultimo puede no tener tope',
          code: 'CONFLICT',
        });
      }
      continue;
    }

    const maxAmount = toNumber(level.maxApprovalAmount);
    if (!Number.isFinite(maxAmount) || maxAmount <= 0) {
      throwHttpError({
        status: 409,
        message: 'Configuracion invalida de niveles: tope de monto no valido',
        code: 'CONFLICT',
      });
    }

    if (maxAmount <= previousMax) {
      throwHttpError({
        status: 409,
        message: 'Configuracion invalida de niveles: topes no ascendentes',
        code: 'CONFLICT',
      });
    }

    previousMax = maxAmount;
  }
}

async function listActiveLevels(tx: DbLike) {
  const levels = await tx.query.loanApprovalLevels.findMany({
    where: eq(loanApprovalLevels.isActive, true),
    columns: {
      id: true,
      levelOrder: true,
      maxApprovalAmount: true,
    },
    orderBy: [asc(loanApprovalLevels.levelOrder)],
  });

  if (!levels.length) {
    throwHttpError({
      status: 409,
      message: 'No hay niveles de aprobacion activos configurados',
      code: 'CONFLICT',
    });
  }

  validateConfigurationOrder(levels);
  return levels;
}

export async function resolveTargetApprovalLevel(tx: DbLike, requestedAmount: string | number) {
  const amount = toNumber(requestedAmount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throwHttpError({
      status: 400,
      message: 'Monto solicitado invalido para determinar nivel de aprobacion',
      code: 'BAD_REQUEST',
    });
  }

  const levels = await listActiveLevels(tx);

  const target =
    levels.find((level) => {
      if (level.maxApprovalAmount === null) return true;
      const maxAmount = toNumber(level.maxApprovalAmount);
      return amount <= maxAmount;
    }) ?? null;

  if (!target) {
    throwHttpError({
      status: 409,
      message: 'No existe nivel de aprobacion que cubra el monto solicitado',
      code: 'CONFLICT',
    });
  }

  return {
    targetLevelId: target.id,
    levels,
  };
}

async function pickAssigneeForLevel(
  tx: DbLike,
  levelId: number,
  options?: {
    fixedUserId?: string;
    excludeUserIds?: string[];
  }
) {
  const levelLockResult = await tx.execute(sql<{ roundRobinCursor: number }>`
    SELECT round_robin_cursor AS "roundRobinCursor"
    FROM ${loanApprovalLevels}
    WHERE ${loanApprovalLevels.id} = ${levelId}
    FOR UPDATE
  `);

  const levelRow = levelLockResult.rows[0];
  if (!levelRow) {
    throwHttpError({
      status: 409,
      message: 'Nivel de aprobacion no encontrado',
      code: 'CONFLICT',
    });
  }

  const users = await tx.query.loanApprovalLevelUsers.findMany({
    where: and(
      eq(loanApprovalLevelUsers.loanApprovalLevelId, levelId),
      eq(loanApprovalLevelUsers.isActive, true)
    ),
    columns: {
      userId: true,
      userName: true,
      id: true,
    },
    orderBy: [asc(loanApprovalLevelUsers.sortOrder), asc(loanApprovalLevelUsers.id)],
  });

  if (!users.length) {
    throwHttpError({
      status: 409,
      message: 'El nivel de aprobacion no tiene usuarios activos configurados',
      code: 'CONFLICT',
    });
  }

  if (options?.fixedUserId) {
    const fixed = users.find((user) => user.userId === options.fixedUserId);

    if (!fixed) {
      throwHttpError({
        status: 409,
        message: 'El usuario destino no pertenece al nivel de aprobacion',
        code: 'CONFLICT',
      });
    }

    return {
      userId: fixed.userId,
      userName: fixed.userName,
    };
  }

  const excluded = new Set(options?.excludeUserIds ?? []);
  const availableUsers = users.filter((user) => !excluded.has(user.userId));
  if (!availableUsers.length) {
    throwHttpError({
      status: 409,
      message: 'No hay usuarios disponibles para reasignar en el nivel de aprobacion',
      code: 'CONFLICT',
    });
  }

  const cursor = Number(levelRow.roundRobinCursor ?? 0);
  const selectedIndex = cursor % availableUsers.length;
  const selected = availableUsers[selectedIndex]!;

  await tx
    .update(loanApprovalLevels)
    .set({ roundRobinCursor: cursor + 1 })
    .where(eq(loanApprovalLevels.id, levelId));

  return {
    userId: selected.userId,
    userName: selected.userName,
  };
}

async function writeApprovalHistory(
  tx: DbLike,
  args: {
    loanApplicationId: number;
    levelId: number | null;
    action:
      | 'ASSIGNED'
      | 'REASSIGNED'
      | 'APPROVED_FORWARD'
      | 'APPROVED_FINAL'
      | 'REJECTED'
      | 'CANCELED';
    actorUserId?: string;
    actorUserName?: string;
    assignedToUserId?: string | null;
    assignedToUserName?: string | null;
    approvalAssignedAt?: Date | null;
    note?: string | null;
    metadata?: Record<string, unknown>;
  }
) {
  await tx.insert(loanApplicationApprovalHistory).values({
    loanApplicationId: args.loanApplicationId,
    levelId: args.levelId,
    action: args.action,
    actorUserId: args.actorUserId ?? null,
    actorUserName: args.actorUserName ?? null,
    assignedToUserId: args.assignedToUserId ?? null,
    assignedToUserName: args.assignedToUserName ?? null,
    approvalAssignedAt: args.approvalAssignedAt ?? null,
    note: args.note ? args.note.slice(0, 255) : null,
    metadata: args.metadata ?? null,
  });
}

export async function assignInitialApproval(
  tx: DbLike,
  args: {
    loanApplicationId: number;
    requestedAmount: string | number;
    actor?: UserContext;
    action?: 'ASSIGNED' | 'REASSIGNED';
    note?: string;
  }
) {
  const { targetLevelId, levels } = await resolveTargetApprovalLevel(tx, args.requestedAmount);
  const firstLevel = levels[0];
  const approvalAssignedAt = new Date();

  if (!firstLevel) {
    throwHttpError({
      status: 409,
      message: 'No hay niveles de aprobacion configurados',
      code: 'CONFLICT',
    });
  }

  const assignee = await pickAssigneeForLevel(tx, firstLevel.id);

  await tx
    .update(loanApplications)
    .set({
      currentApprovalLevelId: firstLevel.id,
      targetApprovalLevelId: targetLevelId,
      assignedApprovalUserId: assignee.userId,
      assignedApprovalUserName: assignee.userName,
      approvalAssignedAt,
    })
    .where(eq(loanApplications.id, args.loanApplicationId));

  await writeApprovalHistory(tx, {
    loanApplicationId: args.loanApplicationId,
    levelId: firstLevel.id,
    action: args.action ?? 'ASSIGNED',
    actorUserId: args.actor?.userId,
    actorUserName: args.actor?.userName,
    assignedToUserId: assignee.userId,
    assignedToUserName: assignee.userName,
    approvalAssignedAt,
    note: args.note,
    metadata: {
      targetLevelId,
      levelOrder: firstLevel.levelOrder,
    },
  });

  return {
    currentApprovalLevelId: firstLevel.id,
    targetApprovalLevelId: targetLevelId,
    assignedApprovalUserId: assignee.userId,
    assignedApprovalUserName: assignee.userName,
    approvalAssignedAt,
  };
}

export async function ensurePendingAssignment(
  tx: DbLike,
  loanApplication: LoanApplicationApprovalState,
  actor?: UserContext
) {
  if (loanApplication.status !== 'PENDING') {
    return loanApplication;
  }

  const isAssigned =
    !!loanApplication.currentApprovalLevelId &&
    !!loanApplication.targetApprovalLevelId &&
    !!loanApplication.assignedApprovalUserId;

  if (isAssigned) {
    return loanApplication;
  }

  const assigned = await assignInitialApproval(tx, {
    loanApplicationId: loanApplication.id,
    requestedAmount: loanApplication.requestedAmount,
    actor,
    action: 'REASSIGNED',
    note: 'Asignacion inicial por enrutamiento lazy',
  });

  return {
    ...loanApplication,
    ...assigned,
  };
}

export function assertAssignedApprover(loanApplication: LoanApplicationApprovalState, userId: string) {
  if (!loanApplication.assignedApprovalUserId || loanApplication.assignedApprovalUserId !== userId) {
    throwHttpError({
      status: 403,
      message: 'La solicitud no esta asignada al usuario autenticado',
      code: 'FORBIDDEN',
    });
  }
}

export async function approveIntermediateLevel(
  tx: DbLike,
  args: {
    loanApplicationId: number;
    currentLevelId: number;
    targetLevelId: number;
    actor: UserContext;
    note: string;
  }
) {
  const levels = await listActiveLevels(tx);
  const currentIndex = levels.findIndex((level) => level.id === args.currentLevelId);

  if (currentIndex === -1) {
    throwHttpError({
      status: 409,
      message: 'Nivel actual de aprobacion no encontrado o inactivo',
      code: 'CONFLICT',
    });
  }

  const nextLevel = levels[currentIndex + 1];
  const approvalAssignedAt = new Date();
  if (!nextLevel) {
    throwHttpError({
      status: 409,
      message: 'No existe siguiente nivel de aprobacion para continuar el flujo',
      code: 'CONFLICT',
    });
  }

  const targetIndex = levels.findIndex((level) => level.id === args.targetLevelId);
  if (targetIndex === -1) {
    throwHttpError({
      status: 409,
      message: 'Nivel objetivo de aprobacion no encontrado o inactivo',
      code: 'CONFLICT',
    });
  }

  if (currentIndex >= targetIndex) {
    throwHttpError({
      status: 409,
      message: 'La solicitud ya llego al nivel objetivo de aprobacion',
      code: 'CONFLICT',
    });
  }

  const assignee = await pickAssigneeForLevel(tx, nextLevel.id);

  await tx
    .update(loanApplications)
    .set({
      currentApprovalLevelId: nextLevel.id,
      assignedApprovalUserId: assignee.userId,
      assignedApprovalUserName: assignee.userName,
      approvalAssignedAt,
    })
    .where(eq(loanApplications.id, args.loanApplicationId));

  await writeApprovalHistory(tx, {
    loanApplicationId: args.loanApplicationId,
    levelId: args.currentLevelId,
    action: 'APPROVED_FORWARD',
    actorUserId: args.actor.userId,
    actorUserName: args.actor.userName,
    assignedToUserId: assignee.userId,
    assignedToUserName: assignee.userName,
    approvalAssignedAt,
    note: args.note,
    metadata: {
      fromLevelId: args.currentLevelId,
      toLevelId: nextLevel.id,
      targetLevelId: args.targetLevelId,
    },
  });

  return {
    currentApprovalLevelId: nextLevel.id,
    assignedApprovalUserId: assignee.userId,
    assignedApprovalUserName: assignee.userName,
    approvalAssignedAt,
  };
}

export async function reassignApplicationApproval(
  tx: DbLike,
  args: {
    loanApplicationId: number;
    currentLevelId: number;
    fromAssignedUserId: string;
    actor: UserContext;
    strategy: 'TO_USER' | 'ROUND_ROBIN';
    toAssignedUserId?: string;
    note?: string;
  }
) {
  const approvalAssignedAt = new Date();
  const assignee =
    args.strategy === 'TO_USER'
      ? await pickAssigneeForLevel(tx, args.currentLevelId, {
          fixedUserId: args.toAssignedUserId,
        })
      : await pickAssigneeForLevel(tx, args.currentLevelId, {
          excludeUserIds: [args.fromAssignedUserId],
        });

  await tx
    .update(loanApplications)
    .set({
      assignedApprovalUserId: assignee.userId,
      assignedApprovalUserName: assignee.userName,
      approvalAssignedAt,
    })
    .where(eq(loanApplications.id, args.loanApplicationId));

  await writeApprovalHistory(tx, {
    loanApplicationId: args.loanApplicationId,
    levelId: args.currentLevelId,
    action: 'REASSIGNED',
    actorUserId: args.actor.userId,
    actorUserName: args.actor.userName,
    assignedToUserId: assignee.userId,
    assignedToUserName: assignee.userName,
    approvalAssignedAt,
    note: args.note,
    metadata: {
      strategy: args.strategy,
      fromAssignedUserId: args.fromAssignedUserId,
      toAssignedUserId: assignee.userId,
    },
  });
}

export async function recordFinalApproval(
  tx: DbLike,
  args: {
    loanApplicationId: number;
    levelId: number | null;
    actor: UserContext;
    note: string;
    metadata?: Record<string, unknown>;
  }
) {
  await writeApprovalHistory(tx, {
    loanApplicationId: args.loanApplicationId,
    levelId: args.levelId,
    action: 'APPROVED_FINAL',
    actorUserId: args.actor.userId,
    actorUserName: args.actor.userName,
    assignedToUserId: null,
    assignedToUserName: null,
    note: args.note,
    metadata: args.metadata,
  });
}

export async function recordRejectedOrCanceled(
  tx: DbLike,
  args: {
    loanApplicationId: number;
    levelId: number | null;
    action: 'REJECTED' | 'CANCELED';
    actor: UserContext;
    note: string;
    metadata?: Record<string, unknown>;
  }
) {
  await writeApprovalHistory(tx, {
    loanApplicationId: args.loanApplicationId,
    levelId: args.levelId,
    action: args.action,
    actorUserId: args.actor.userId,
    actorUserName: args.actor.userName,
    assignedToUserId: null,
    assignedToUserName: null,
    note: args.note,
    metadata: args.metadata,
  });
}
