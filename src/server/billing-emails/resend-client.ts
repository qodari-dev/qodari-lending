import { env } from '@/env';
import { Resend } from 'resend';

type ResendAttachment = {
  filename: string;
  content: string;
};

type SendResendEmailInput = {
  from: string;
  to: string[];
  cc?: string[];
  subject: string;
  html: string;
  text: string;
  attachments?: ResendAttachment[];
};

type SendResendEmailResult = {
  id: string;
};

declare global {
  var __resendSdkClient: Resend | undefined;
}

function getResendClient() {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY no configurado');
  }

  if (!globalThis.__resendSdkClient) {
    globalThis.__resendSdkClient = new Resend(apiKey);
  }

  return globalThis.__resendSdkClient;
}

export async function sendResendEmail(input: SendResendEmailInput): Promise<SendResendEmailResult> {
  const resend = getResendClient();
  const response = await resend.emails.send({
    from: input.from,
    to: input.to,
    cc: input.cc,
    subject: input.subject,
    html: input.html,
    text: input.text,
    attachments: input.attachments,
  });

  if (response.error || !response.data?.id) {
    throw new Error(response.error?.message || 'No fue posible enviar correo en Resend');
  }

  return { id: response.data.id };
}
