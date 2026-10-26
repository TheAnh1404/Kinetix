import express from "express";
import cors from "cors";
import * as dotenv from "dotenv";
import { apiRouter } from "./routes/apiRoutes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// API Routes
app.use("/api", apiRouter);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "Kinetix Backend API",
    network: "Avalanche Fuji & Family L1",
    database: "Neon Serverless PostgreSQL",
    timestamp: new Date().toISOString(),
  });
});

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log("=================================================");
    console.log(`🚀 Kinetix Backend API đang chạy tại: http://localhost:${PORT}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/health`);
    console.log("=================================================");
  });
}

export default app;
