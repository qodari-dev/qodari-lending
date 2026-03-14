import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { HonoAdapter } from '@bull-board/hono';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { agreementBillingEmailQueue } from './agreement-billing-email';
import { billingConceptsQueue } from './billing-concepts';
import { currentInsuranceQueue } from './current-insurance';
import { currentInterestQueue } from './current-interest';
import { lateInterestQueue } from './late-interest';
import { subsidyPledgePaymentVoucherQueue } from './subsidy-pledge-payment-voucher';

const QUEUE_BOARD_BASE_PATH = '/api/queues';

declare global {
  var __queueBoardApp: Hono | undefined;
}

function buildQueueBoardApp() {
  const serverAdapter = new HonoAdapter(serveStatic);
  serverAdapter.setBasePath(QUEUE_BOARD_BASE_PATH);

  createBullBoard({
    queues: [
      new BullMQAdapter(agreementBillingEmailQueue),
      new BullMQAdapter(billingConceptsQueue),
      new BullMQAdapter(currentInterestQueue),
      new BullMQAdapter(currentInsuranceQueue),
      new BullMQAdapter(lateInterestQueue),
      new BullMQAdapter(subsidyPledgePaymentVoucherQueue),
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
