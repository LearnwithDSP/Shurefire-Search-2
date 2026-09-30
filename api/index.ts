import type { IncomingMessage, ServerResponse } from "http";
import { app } from "../server.ts";

/**
 * Vercel Serverless Function Bridge:
 * Passes all incoming /api/* requests directly into the Express application.
 * Preserves all existing Express routes, Gemini embeddings, and Supabase operations.
 */
export default function handler(req: IncomingMessage, res: ServerResponse) {
  return (app as any)(req, res);
}
