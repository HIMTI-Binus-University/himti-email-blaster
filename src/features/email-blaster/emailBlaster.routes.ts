import { Router } from "express";

import { apiKeyMiddleware } from "../../middleware/apiKey.middleware";
import { validateBody } from "../../middleware/validate.middleware";
import {
  sendEmailBlastController,
  testMailjetConfigController,
} from "./emailBlaster.controller";
import { sendEmailBlastSchema } from "./emailBlaster.schema";

const router = Router();

router.get("/test", testMailjetConfigController);
router.post(
  "/send",
  apiKeyMiddleware,
  validateBody(sendEmailBlastSchema),
  sendEmailBlastController,
);

export default router;
