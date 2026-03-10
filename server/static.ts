import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(`[static] Build directory not found: ${distPath}`);
    app.use("/{*path}", (_req, res) => {
      res.status(503).send("Application is starting. Please rebuild with: npm run build");
    });
    return;
  }

  console.log(`[static] Serving frontend from: ${distPath}`);
  app.use(express.static(distPath));

  app.use("/{*path}", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
