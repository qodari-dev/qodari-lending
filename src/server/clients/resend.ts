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

const resend = new Resend(env.RESEND_API_KEY);

export async function sendResendEmail(input: SendResendEmailInput): Promise<SendResendEmailResult> {
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

type GenericEmailInput = {
  from: string;
  to: string[];
  cc?: string[];
  attachments?: ResendAttachment[];
  variables: {
    PREVIEW_TEXT: string;
    SUBJECT: string;
    HTML_CONTENT: string;
  };
};

export async function sendResendGenericEmail(input: GenericEmailInput) {
  const response = await resend.emails.send({
    from: input.from,
    to: input.to,
    cc: input.cc,
    attachments: input.attachments,
    subject: input.variables.SUBJECT,
    template: {
      id: 'general-template',
      variables: input.variables,
    },
  });
  if (response.error || !response.data?.id) {
    throw new Error(response.error?.message || 'No fue posible enviar correo en Resend');
  }

  return { id: response.data.id };
}
