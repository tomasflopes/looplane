import "server-only";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(24),
  CHALLENGE_SERVER_SECRET: z.string().min(24),
});
export function env() {
  return schema.parse(process.env);
}
