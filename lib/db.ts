// lib/db.ts
import Database from "better-sqlite3";

const db = new Database("chats.db");

// Enable WAL mode for better concurrency
db.pragma("journal_mode = WAL");

// Create schema
db.exec(`
  CREATE TABLE IF NOT EXISTS chats (
    id TEXT PRIMARY KEY,
    role TEXT,
    patientId TEXT,
    title TEXT,
    createdAt INTEGER,
    updatedAt INTEGER,
    lastMessage TEXT,
    messages TEXT NOT NULL
  );
`);

// Enable foreign keys and other safety pragmas
db.pragma("foreign_keys = ON");

export default db;
