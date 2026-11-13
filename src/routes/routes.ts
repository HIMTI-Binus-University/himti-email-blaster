import { Router } from "express";

import emailBlasterRoutes from "../features/email-blaster/emailBlaster.routes";
import certificateBlasterRoutes from "../features/certificate-blaster/certificateBlaster.routes";

const router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Email blaster API is running",
  });
});

router.use("/email-blast", emailBlasterRoutes);
router.use("/certificate-blast", certificateBlasterRoutes);

export default router;
