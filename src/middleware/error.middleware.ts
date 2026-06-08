import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

import { env } from "../config/env";
import { AppError } from "../utils/AppError";

type ErrorResponse = {
  message: string;
  errors?: Array<{
    path: string;
    message: string;
  }>;
  stack?: string;
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return "Internal server error";
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    const response: ErrorResponse = {
      message: "Validation failed",
      errors: err.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    };

    res.status(400).json(response);
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      message: err.message,
    });
    return;
  }

  const response: ErrorResponse = {
    message:
      env.NODE_ENV === "production"
        ? "Internal server error"
        : getErrorMessage(err),
  };

  if (env.NODE_ENV !== "production" && err instanceof Error) {
    response.stack = err.stack;
  }

  res.status(500).json(response);
};
