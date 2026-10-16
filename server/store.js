import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

export function createPaperStore(dataDir) {
  const filePath = path.join(dataDir, "papers.json");

  function readAll() {
    if (!fs.existsSync(filePath)) return {};
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  }

  function writeAll(data) {
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
  }

  return {
    save({ config, paper, seed = null, title = null }) {
      const id = randomUUID();
      const all = readAll();
      all[id] = {
        id,
        config,
        paper,
        seed,
        title,
        createdAt: new Date().toISOString(),
      };
      writeAll(all);
      return all[id];
    },
    load(id) {
      const all = readAll();
      return all[id] ?? null;
    },
  };
}
