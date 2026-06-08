import type Mail from "nodemailer/lib/mailer";

import { getMailjetConfig, type MailjetConfig } from "../../config/env";
import { getMailjetTransporter } from "../../config/mailjet";
import { sleep } from "../../utils/sleep";
import type {
  EmailBlastResponse,
  EmailSendResult,
  SendEmailBlastBody,
} from "./emailBlaster.types";

const DEFAULT_DELAY_MS = 1500;
const MIN_DELAY_MS = 500;

const deduplicateRecipients = (recipients: string[]): string[] => {
  const seenEmails = new Set<string>();
  const uniqueRecipients: string[] = [];

  for (const recipient of recipients) {
    const normalizedEmail = recipient.trim().toLowerCase();

    if (!seenEmails.has(normalizedEmail)) {
      seenEmails.add(normalizedEmail);
      uniqueRecipients.push(normalizedEmail);
    }
  }

  return uniqueRecipients;
};

const getSafeErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return "Failed to send email";
};

const createMailOptions = (
  recipient: string,
  payload: SendEmailBlastBody,
  mailjetConfig: MailjetConfig,
): Mail.Options => {
  return {
    from: {
      address: mailjetConfig.fromEmail,
      name: mailjetConfig.fromName,
    },
    to: recipient,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
  };
};

export const sendEmailToRecipient = async (
  recipient: string,
  payload: SendEmailBlastBody,
  mailjetConfig: MailjetConfig,
): Promise<void> => {
  const transporter = getMailjetTransporter();
  await transporter.sendMail(createMailOptions(recipient, payload, mailjetConfig));
};

export const sendEmailBlast = async (
  payload: SendEmailBlastBody,
): Promise<EmailBlastResponse> => {
  const mailjetConfig = getMailjetConfig();
  const recipients = deduplicateRecipients(payload.recipients);
  const delayMs = Math.max(payload.delayMs ?? DEFAULT_DELAY_MS, MIN_DELAY_MS);
  const results: EmailSendResult[] = [];

  for (const [index, recipient] of recipients.entries()) {
    try {
      await sendEmailToRecipient(recipient, payload, mailjetConfig);
      results.push({
        email: recipient,
        status: "success",
      });
    } catch (error) {
      results.push({
        email: recipient,
        status: "failed",
        error: getSafeErrorMessage(error),
      });
    }

    const hasNextRecipient = index < recipients.length - 1;

    if (hasNextRecipient) {
      await sleep(delayMs);
    }
  }

  const success = results.filter((result) => result.status === "success").length;
  const failed = results.length - success;

  return {
    message:
      failed > 0
        ? "Email blast completed with some failures"
        : "Email blast completed",
    summary: {
      totalRecipients: recipients.length,
      success,
      failed,
    },
    results,
  };
};
