import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createApp } from "./createApp.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const port = Number(process.env.PORT) || 3001;
const distDir = path.join(rootDir, "dist");

const app = createApp({
  staticDir: fs.existsSync(distDir) ? distDir : null,
});

app.listen(port, () => {
  console.log(`PaperPilot API listening on http://localhost:${port}`);
});
