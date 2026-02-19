import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { HonoAdapter } from '@bull-board/hono';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { getBillingConceptsQueueInstance } from './billing-concepts-queue';
import { getCurrentInsuranceQueueInstance } from './current-insurance-queue';
import { getCurrentInterestQueueInstance } from './current-interest-queue';
import { getLateInterestQueueInstance } from './late-interest-queue';

const QUEUE_BOARD_BASE_PATH = '/api/queue';

declare global {
  var __queueBoardApp: Hono | undefined;
}

function buildQueueBoardApp() {
  const serverAdapter = new HonoAdapter(serveStatic);
  serverAdapter.setBasePath(QUEUE_BOARD_BASE_PATH);

  createBullBoard({
    queues: [
      new BullMQAdapter(getBillingConceptsQueueInstance()),
      new BullMQAdapter(getCurrentInterestQueueInstance()),
      new BullMQAdapter(getCurrentInsuranceQueueInstance()),
      new BullMQAdapter(getLateInterestQueueInstance()),
    ],
    serverAdapter,
    options: {
      uiConfig: {
        boardTitle: 'Qodari Lending - Queue Board',
      },
    },
  });

  return serverAdapter.registerPlugin();
}

export function getQueueBoardApp() {
  if (!globalThis.__queueBoardApp) {
    globalThis.__queueBoardApp = buildQueueBoardApp();
  }

  return globalThis.__queueBoardApp;
}
