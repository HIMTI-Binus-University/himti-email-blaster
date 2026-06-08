import { Router } from "express";

import emailBlasterRoutes from "../features/email-blaster/emailBlaster.routes";

const router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Email blaster API is running",
  });
});

router.use("/email-blast", emailBlasterRoutes);

export default router;
