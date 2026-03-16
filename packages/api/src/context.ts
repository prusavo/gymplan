import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import jwt from "jsonwebtoken";
import { db, type Database } from "./db/index.js";
import { s3Client } from "./services/s3.js";
import type { S3Client } from "@aws-sdk/client-s3";

export interface UserPayload {
  id: string;
  email: string;
}

export interface Context {
  db: Database;
  s3: S3Client;
  user: UserPayload | null;
}

export async function createContext({
  req,
}: CreateFastifyContextOptions): Promise<Context> {
  let user: UserPayload | null = null;

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const payload = jwt.verify(
        token,
        process.env.JWT_SECRET!
      ) as UserPayload;
      user = { id: payload.id, email: payload.email };
    } catch {
      // Invalid token - user remains null
    }
  }

  return { db, s3: s3Client, user };
}
