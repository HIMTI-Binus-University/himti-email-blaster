import type { Request, Response } from "express";

import { getMailjetConfig, getMailjetConfigStatus } from "../../config/env";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendEmailBlast } from "./emailBlaster.service";
import type { SendEmailBlastBody } from "./emailBlaster.types";

export const testMailjetConfigController = asyncHandler(
  async (_req: Request, res: Response) => {
    const status = getMailjetConfigStatus();

    if (!status.isConfigured) {
      return res.status(500).json({
        message: "Mailjet SMTP configuration is incomplete",
        missingKeys: status.missingKeys,
        errors: status.errors,
      });
    }

    const mailjetConfig = getMailjetConfig();

    return res.status(200).json({
      message: "Mailjet SMTP configuration is available",
      config: {
        host: mailjetConfig.host,
        port: mailjetConfig.port,
        fromEmail: mailjetConfig.fromEmail,
        fromName: mailjetConfig.fromName,
      },
    });
  },
);

export const sendEmailBlastController = asyncHandler(
  async (req: Request, res: Response) => {
    const payload = req.body as SendEmailBlastBody;
    const response = await sendEmailBlast(payload);

    return res.status(200).json(response);
  },
);
