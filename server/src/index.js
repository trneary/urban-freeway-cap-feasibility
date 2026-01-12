

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import app from './app.js';

// Resolve repo-root /dist (Vite build output)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../../dist');
const indexHtmlPath = path.join(distPath, 'index.html');

// Log and validate build presence
console.log(`Serving static assets from: ${distPath}`);
if (!fs.existsSync(indexHtmlPath)) {
  console.error(`❌ index.html not found at ${indexHtmlPath}`);
  console.error('Run "npm run build" in the repo root to generate the frontend build.');
}

// Static assets after API routes
app.use(express.static(distPath));

// SPA fallback (do not hijack APIs or assets)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  if (req.path.startsWith('/assets')) return next();
  if (req.path.includes('.')) return next();
  return res.sendFile(indexHtmlPath);
});

const HOST = process.env.HOST || '0.0.0.0';
const PORT = process.env.PORT || 3001;

app.listen(PORT, HOST, () => {
  console.log(`Backend listening on http://${HOST}:${PORT}`);
});
