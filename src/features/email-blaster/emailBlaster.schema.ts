import { z } from "zod";

const optionalEmailContentSchema = z.string().trim().min(1).optional();

export const sendEmailBlastSchema = z
  .object({
    recipients: z.array(z.string().trim().email()).min(1).max(200),
    subject: z.string().trim().min(1).max(150),
    html: optionalEmailContentSchema,
    text: optionalEmailContentSchema,
    delayMs: z.coerce.number().int().min(500).optional().default(1500),
  })
  .strict()
  .refine((data) => data.html || data.text, {
    message: "At least one of html or text must be provided",
    path: ["html"],
  });
