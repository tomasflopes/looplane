import "server-only";
import { z } from "zod";

const schema = z
  .object({
    DATABASE_URL: z.string().min(1),
    SESSION_SECRET: z.string().min(24),
    CHALLENGE_SERVER_SECRET: z.string().min(24),
    // Set to "false" only when serving over plain HTTP (e.g. a LAN demo with
    // no TLS): browsers refuse to store Secure cookies on http:// origins.
    COOKIE_SECURE: z.preprocess(
      (v) => (v === "" ? undefined : v),
      z.enum(["true", "false"]).optional(),
    ),
  })
  .superRefine((value, ctx) => {
    if (value.SESSION_SECRET === value.CHALLENGE_SERVER_SECRET)
      ctx.addIssue({
        code: "custom",
        message:
          "SESSION_SECRET and CHALLENGE_SERVER_SECRET must be different values.",
      });
    // Rotating CHALLENGE_SERVER_SECRET changes every student's input and
    // invalidates what they solved against, so refuse to boot with the
    // template value in production rather than discover it later.
    if (process.env.NODE_ENV === "production")
      for (const key of ["SESSION_SECRET", "CHALLENGE_SERVER_SECRET"] as const)
        if (/^(replace-with|change-this)/i.test(value[key]))
          ctx.addIssue({
            code: "custom",
            message: `${key} is still the placeholder from .env.example.`,
          });
  });

export function env() {
  return schema.parse(process.env);
}
