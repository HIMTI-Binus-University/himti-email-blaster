import dotenv from "dotenv";
import { z } from "zod";

import { AppError } from "../utils/AppError";

dotenv.config();

const appEnvSchema = z.object({
  PORT: z.coerce.number().int().positive(),
  NODE_ENV: z.enum(["development", "test", "production"]),
  APP_API_KEY: z.string().trim().min(1, "APP_API_KEY is required"),
});

const mailjetEnvSchema = z.object({
  MAILJET_SMTP_HOST: z.string().trim().min(1),
  MAILJET_SMTP_PORT: z.coerce.number().int().positive(),
  MAILJET_SMTP_USER: z.string().trim().min(1),
  MAILJET_SMTP_PASS: z.string().trim().min(1),
  MAIL_FROM_EMAIL: z.string().trim().email(),
  MAIL_FROM_NAME: z.string().trim().min(1),
});

const appEnv = appEnvSchema.safeParse(process.env);

if (!appEnv.success) {
  const errors = appEnv.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("\n");

  console.error(`Invalid application environment variables:\n${errors}`);
  process.exit(1);
}

const mailjetEnvKeys = [
  "MAILJET_SMTP_HOST",
  "MAILJET_SMTP_PORT",
  "MAILJET_SMTP_USER",
  "MAILJET_SMTP_PASS",
  "MAIL_FROM_EMAIL",
  "MAIL_FROM_NAME",
] as const;

export type MailjetConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
};

export const env = {
  PORT: appEnv.data.PORT,
  NODE_ENV: appEnv.data.NODE_ENV,
  APP_API_KEY: appEnv.data.APP_API_KEY,
} as const;

const hasValue = (value: string | undefined): boolean => {
  return typeof value === "string" && value.trim().length > 0;
};

export const getMailjetConfigStatus = (): {
  isConfigured: boolean;
  missingKeys: string[];
  errors: string[];
} => {
  const parsed = mailjetEnvSchema.safeParse(process.env);

  if (parsed.success) {
    return {
      isConfigured: true,
      missingKeys: [],
      errors: [],
    };
  }

  return {
    isConfigured: false,
    missingKeys: mailjetEnvKeys.filter((key) => !hasValue(process.env[key])),
    errors: parsed.error.issues.map((issue) => {
      return `${issue.path.join(".")}: ${issue.message}`;
    }),
  };
};

export const getMailjetConfig = (): MailjetConfig => {
  const parsed = mailjetEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    const status = getMailjetConfigStatus();
    throw new AppError(
      `Missing or invalid Mailjet SMTP configuration: ${status.errors.join("; ")}`,
      500,
    );
  }

  return {
    host: parsed.data.MAILJET_SMTP_HOST,
    port: parsed.data.MAILJET_SMTP_PORT,
    user: parsed.data.MAILJET_SMTP_USER,
    pass: parsed.data.MAILJET_SMTP_PASS,
    fromEmail: parsed.data.MAIL_FROM_EMAIL,
    fromName: parsed.data.MAIL_FROM_NAME,
  };
};
