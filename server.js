const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const documentRoutes = require("./routes/documents");
const { errorHandler } = require("./middleware/errorHandler");

const app = express();
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin is not allowed by CORS"));
    },
  }),
);
app.use(express.json({ limit: "2mb" }));

app.get("/", (req, res) => {
  res.json({ success: true, data: { message: "Ajaia Docs API is running" } });
});
app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);
app.use((req, res) => {
  res.status(404).json({ success: false, error: "Route not found" });
});
app.use(errorHandler);

async function startServer() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI must be configured in the backend environment");
  }
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be configured with at least 32 characters");
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("MongoDB connected successfully");

  const port = process.env.PORT || 5000;
  app.listen(port, () => {
    console.log(`Backend running at http://localhost:${port}`);
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error("Backend startup failed:", error.message);
    process.exit(1);
  });
}

module.exports = { app, startServer };
