import { Request } from "express";

export function parseQueryInt(req: Request, key: string): number | undefined {
  return req.query[key] && parseInt(req.query[key] as string);
}