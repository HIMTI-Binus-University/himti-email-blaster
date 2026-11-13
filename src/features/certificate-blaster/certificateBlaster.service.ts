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

  return sendEmailMessages(recipients.map(({ email, name, certificateUrl, certificateUrls }) => {
    const urls = [...new Set(certificateUrls ?? [certificateUrl!])];
    const label = (index: number) => urls.length === 1 ? "View your certificate" : `View your certificate ${index + 1}`;
    const textLinks = urls.map((url, index) => `${label(index)}: ${url}`).join("\n");
    const htmlLinks = urls.map((url, index) => `<p><a href="${escapeHtml(url)}">${label(index)}</a></p>`).join("");
    const message = urls.length === 1
      ? "Thank you for participating! Your certificate is ready."
      : "Thank you for participating! Your certificates are ready.";
    // ponytail: literal placeholders only; add a template engine for conditional content.
    const body = payload.body?.replace(/\{\{(name|certificateUrl|certificateUrls)\}\}/g, (_match, key: string) => {
      return key === "name" ? escapeHtml(name)
        : key === "certificateUrl" ? escapeHtml(urls[0]!)
        : urls.map(escapeHtml).join("<br>");
    });
    const htmlContent = body ?? `<p>Hello ${escapeHtml(name)},</p><p>${message}</p>`;
    const html = /<\/body\s*>/i.test(htmlContent)
      ? htmlContent.replace(/<\/body\s*>/i, (closingTag) => `${htmlLinks}${closingTag}`)
      : `${htmlContent}${htmlLinks}`;

    return {
      email,
      payload: {
        recipients: [email],
        subject: payload.subject,
        delayMs: payload.delayMs,
        // ponytail: default text fallback; use an HTML parser if custom text conversion is needed.
        text: `Hello ${name},\n\n${message}\n\n${textLinks}`,
        html,
      },
    };
  }), payload.delayMs);
};
