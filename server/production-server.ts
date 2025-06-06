import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { setupAuth } from "./auth.js";
import apiRoutes from "./routes.js";
import { ensureDefaultAdminExists } from "./init-db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startProductionServer() {
  const app = express();
  
  // Initialize database
  await ensureDefaultAdminExists();
  
  // Basic middleware
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  
  // Setup authentication
  setupAuth(app);
  
  // API routes
  app.use("/api", apiRoutes);
  
  // Serve static files from client build
  const clientBuildPath = path.join(__dirname, "../client/dist");
  app.use(express.static(clientBuildPath));
  
  // Handle all other routes - serve index.html for SPA
  app.get("*", (req, res) => {
    res.sendFile(path.join(clientBuildPath, "index.html"));
  });
  
  const port = process.env.PORT || 3000;
  
  app.listen(port, "0.0.0.0", () => {
    console.log(`🚀 Production server running on port ${port}`);
    console.log(`🌐 URL: http://localhost:${port}`);
  });
}

startProductionServer().catch(console.error);