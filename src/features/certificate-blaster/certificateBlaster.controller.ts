import { asyncHandler } from "../../utils/asyncHandler";
import type { SendCertificateBlastBody } from "./certificateBlaster.schema";
import { sendCertificateBlast } from "./certificateBlaster.service";

export const sendCertificateBlastController = asyncHandler(async (req, res) => {
  const response = await sendCertificateBlast(req.body as SendCertificateBlastBody);
  return res.status(200).json(response);
});
