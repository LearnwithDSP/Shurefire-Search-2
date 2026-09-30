import type { IncomingMessage, ServerResponse } from "http";
import serverModule, { app as namedApp } from "../server.js";

const appInstance = namedApp || (serverModule as any)?.app || serverModule;

/**
 * Vercel Serverless Function Bridge:
 * Passes all incoming /api/* requests directly into the Express application.
 * Preserves all existing Express routes, Gemini embeddings, and Supabase operations.
 */
export default function handler(req: IncomingMessage, res: ServerResponse) {
  return (appInstance as any)(req, res);
}

