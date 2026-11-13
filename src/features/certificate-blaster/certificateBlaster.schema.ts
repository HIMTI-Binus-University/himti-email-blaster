import { z } from "zod";

const certificateUrlSchema = z.string().trim().url().refine((value) => {
  if (!URL.canParse(value)) return false;
  const url = new URL(value);
  return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password;
}, "Certificate URL must use HTTP or HTTPS without credentials");

export const sendCertificateBlastSchema = z.object({
  recipients: z.array(z.object({
    email: z.string().trim().email().transform((email) => email.toLowerCase()),
    name: z.string().trim().min(1).max(200),
    certificateUrl: certificateUrlSchema.optional(),
    certificateUrls: z.array(certificateUrlSchema).min(1).max(20).optional(),
  }).strict().refine((recipient) => {
    return (recipient.certificateUrl !== undefined) !== (recipient.certificateUrls !== undefined);
  }, "Provide exactly one of certificateUrl or certificateUrls")).min(1).max(200),
  subject: z.string().trim().min(1).max(150),
  body: z.string().trim().min(1).max(100000).optional(),
  delayMs: z.coerce.number().int().min(500).optional().default(1500),
}).strict();

export type SendCertificateBlastBody = z.infer<typeof sendCertificateBlastSchema>;
