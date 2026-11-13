import { sendEmailMessages } from "../email-blaster/emailBlaster.service";
import type { SendCertificateBlastBody } from "./certificateBlaster.schema";

const escapeHtml = (value: string): string => {
  return value.replace(/[&<>"']/g, (character) => {
    return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!;
  });
};

export const sendCertificateBlast = async (payload: SendCertificateBlastBody) => {
  const seenEmails = new Set<string>();
  const recipients = payload.recipients.filter(({ email }) => {
    if (seenEmails.has(email)) return false;
    seenEmails.add(email);
    return true;
  });

  return sendEmailMessages(recipients.map(({ email, name, certificateUrl }) => {
    // ponytail: two literal placeholders; add a template engine only for conditional content.
    const body = payload.body?.replace(/\{\{(name|certificateUrl)\}\}/g, (_match, key: string) => {
      return key === "name" ? name : certificateUrl;
    });

    return {
      email,
      payload: {
        recipients: [email],
        subject: payload.subject,
        delayMs: payload.delayMs,
        text: body === undefined
          ? `Hello ${name},\n\nThank you for participating! Your certificate is ready.\n\nView your certificate: ${certificateUrl}`
          : `${body}\n\nView your certificate: ${certificateUrl}`,
        html: `${body === undefined
          ? `<p>Hello ${escapeHtml(name)},</p><p>Thank you for participating! Your certificate is ready.</p>`
          : `<p>${escapeHtml(body).replace(/\r\n|\r|\n/g, "<br>")}</p>`}<p><a href="${escapeHtml(certificateUrl)}">View your certificate</a></p>`,
      },
    };
  }), payload.delayMs);
};
