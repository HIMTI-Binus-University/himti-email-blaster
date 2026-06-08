import type { NextFunction, Request, Response } from "express";

import { env } from "../config/env";
import { AppError } from "../utils/AppError";

export const apiKeyMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const apiKey = req.header("x-api-key");

  if (!apiKey || apiKey !== env.APP_API_KEY) {
    next(new AppError("Missing or invalid API key", 401));
    return;
  }

  next();
};
