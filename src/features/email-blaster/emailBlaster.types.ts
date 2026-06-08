import type { z } from "zod";

import type { sendEmailBlastSchema } from "./emailBlaster.schema";

export type SendEmailBlastBody = z.infer<typeof sendEmailBlastSchema>;

export type EmailSendResult =
  | {
      email: string;
      status: "success";
    }
  | {
      email: string;
      status: "failed";
      error: string;
    };

export type EmailBlastSummary = {
  totalRecipients: number;
  success: number;
  failed: number;
};

export type EmailBlastResponse = {
  message: string;
  summary: EmailBlastSummary;
  results: EmailSendResult[];
};
