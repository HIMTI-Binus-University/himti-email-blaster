import nodemailer, { type Transporter } from "nodemailer";

import { getMailjetConfig } from "./env";

let transporter: Transporter | null = null;

export const getMailjetTransporter = (): Transporter => {
  const mailjetConfig = getMailjetConfig();

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: mailjetConfig.host,
      port: mailjetConfig.port,
      secure: mailjetConfig.port === 465,
      requireTLS: mailjetConfig.port === 587,
      auth: {
        user: mailjetConfig.user,
        pass: mailjetConfig.pass,
      },
    });
  }

  return transporter;
};
