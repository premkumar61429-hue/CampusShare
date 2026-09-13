const path = require("path");
const fs = require("fs");

const ROOT = path.resolve(__dirname, "../../");
const dataDir = path.join(ROOT, "data");
const uploadsDir = path.join(ROOT, "uploads");

// Auto-create essential directories if missing
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const dbPath = path.join(dataDir, "campusshare.db");

let dbInstance = null;

function getDatabase() {
  if (dbInstance) return dbInstance;

  try {
    // Try node:sqlite (Built-in to Node 22.5.0+, zero native compilation required)
    const { DatabaseSync } = require("node:sqlite");
    const rawDb = new DatabaseSync(dbPath);
    
    try { rawDb.exec("PRAGMA journal_mode = WAL;"); } catch (_) {}
    try { rawDb.exec("PRAGMA foreign_keys = ON;"); } catch (_) {}

    dbInstance = {
      exec: (sql) => rawDb.exec(sql),
      prepare: (sql) => {
        const stmt = rawDb.prepare(sql);
        return {
          run: (...params) => {
            const result = stmt.run(...params);
            return {
              changes: result?.changes || 0,
              lastInsertRowid: Number(result?.lastInsertRowid || 0)
            };
          },
          get: (...params) => {
            const res = stmt.get(...params);
            return res ? { ...res } : undefined;
          },
          all: (...params) => {
            const rows = stmt.all(...params);
            return (rows || []).map((row) => ({ ...row }));
          }
        };
      },
      pragma: (str) => {
        try { rawDb.exec(`PRAGMA ${str};`); } catch (_) {}
      }
    };
    console.log("✓ SQLite initialized using native Node.js DatabaseSync engine.");
  } catch (err1) {
    try {
      // Fallback to better-sqlite3 if available
      const Database = require("better-sqlite3");
      const bDb = new Database(dbPath);
      bDb.pragma("journal_mode = WAL");
      bDb.pragma("foreign_keys = ON");
      
      dbInstance = {
        exec: (sql) => bDb.exec(sql),
        prepare: (sql) => {
          const stmt = bDb.prepare(sql);
          return {
            run: (...params) => stmt.run(...params),
            get: (...params) => stmt.get(...params),
            all: (...params) => stmt.all(...params)
          };
        },
        pragma: (str) => bDb.pragma(str)
      };
      console.log("✓ SQLite initialized using better-sqlite3 engine.");
    } catch (err2) {
      console.error("FATAL: Could not initialize SQLite database:", err1, err2);
      throw new Error("Failed to initialize SQLite database engine.");
    }
  }

  return dbInstance;
}

const db = getDatabase();

module.exports = {
  db,
  ROOT,
  dataDir,
  uploadsDir,
  dbPath
};
