import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";

export const validateBody = (schema: ZodTypeAny) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsedBody = schema.safeParse(req.body);

    if (!parsedBody.success) {
      next(parsedBody.error);
      return;
    }

    req.body = parsedBody.data;
    next();
  };
};
