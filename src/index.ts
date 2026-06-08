import cors from "cors";
import express from "express";

import { env } from "./config/env";
import { errorHandler } from "./middleware/error.middleware";
import routes from "./routes/routes";
import { AppError } from "./utils/AppError";

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.use("/api", routes);

app.use((req, _res, next) => {
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404));
});

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`Email blaster API is running on port ${env.PORT}`);
});
