import { Router } from "express";

import { apiKeyMiddleware } from "../../middleware/apiKey.middleware";
import { validateBody } from "../../middleware/validate.middleware";
import { sendCertificateBlastController } from "./certificateBlaster.controller";
import { sendCertificateBlastSchema } from "./certificateBlaster.schema";

const router = Router();

router.post("/send", apiKeyMiddleware, validateBody(sendCertificateBlastSchema), sendCertificateBlastController);

export default router;
