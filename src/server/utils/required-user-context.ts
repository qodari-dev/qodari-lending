import { UnifiedAuthContext } from '@/server/utils/auth-context';
import { throwHttpError } from '@/server/utils/generic-ts-rest-error';

export function getRequiredUserContext(session: UnifiedAuthContext): {
  userId: string;
  userName: string;
} {
  if (session.type !== 'user' || !session.user) {
    throwHttpError({
      status: 400,
      message: 'La operacion requiere contexto de usuario',
      code: 'BAD_REQUEST',
    });
  }

  return {
    userId: session.userId,
    userName: `${session.user.firstName} ${session.user.lastName}`.trim(),
  };
}
