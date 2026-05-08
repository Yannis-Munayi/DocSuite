import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

const STORAGE_DIR = join(process.cwd(), "storage");
const USERS_FILE = join(STORAGE_DIR, "users.json");

interface StoredUser {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
}

function ensureStorage() {
  if (!existsSync(STORAGE_DIR)) mkdirSync(STORAGE_DIR, { recursive: true });
}

function readUsers(): StoredUser[] {
  ensureStorage();
  if (!existsSync(USERS_FILE)) return [];
  try {
    return JSON.parse(readFileSync(USERS_FILE, "utf-8")) as StoredUser[];
  } catch {
    return [];
  }
}

function writeUsers(users: StoredUser[]) {
  ensureStorage();
  writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
}

export async function createUser(username: string, password: string) {
  const users = readUsers();
  const existing = users.find(
    (u) => u.username.toLowerCase() === username.toLowerCase()
  );
  if (existing) throw new Error("Username already taken");

  const passwordHash = await bcrypt.hash(password, 12);
  const user: StoredUser = {
    id: randomUUID(),
    username,
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  writeUsers(users);
  return { id: user.id, username: user.username };
}

export async function verifyUser(username: string, password: string) {
  const users = readUsers();
  const user = users.find(
    (u) => u.username.toLowerCase() === username.toLowerCase()
  );
  if (!user) return null;
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;
  return { id: user.id, username: user.username };
}
