import { getQueueBoardApp } from '@/server/queues/queue-board';
import { getUnifiedAuthContext } from '@/server/utils/auth-context';
import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function hasQueueBoardPermission(context: Awaited<ReturnType<typeof getUnifiedAuthContext>>) {
  if (context.type === 'user') {
    if (context.user?.isAdmin) return true;
    return context.permissions?.includes('loans:read') ?? false;
  }

  return context.permissions?.includes('loans:read') ?? false;
}

const app = new Hono();

app.use('*', async (c, next) => {
  try {
    const authContext = await getUnifiedAuthContext(c.req.raw as NextRequest);
    if (!hasQueueBoardPermission(authContext)) {
      return c.json(
        {
          code: 'FORBIDDEN',
          message: 'Forbidden',
        },
        403
      );
    }

    await next();
  } catch (error) {
    const rawStatus =
      typeof (error as { status?: unknown })?.status === 'number'
        ? (error as { status: number }).status
        : 401;
    const status: 401 | 403 = rawStatus === 403 ? 403 : 401;

    return c.json(
      {
        code: status === 403 ? 'FORBIDDEN' : 'UNAUTHENTICATED',
        message: status === 403 ? 'Forbidden' : 'Not authenticated',
      },
      status
    );
  }
});

const queueBoardApp = getQueueBoardApp();
app.route('/api/queue', queueBoardApp);
app.route('/', queueBoardApp);

const handler = handle(app);

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
