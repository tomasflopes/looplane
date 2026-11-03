import { describe, expect, it } from "vitest";

import { normalizeEmail, passwordProblem } from "@/lib/password";

describe("password policy", () => {
  it("accepts a reasonable passphrase", () =>
    expect(passwordProblem("correct horse battery")).toBeNull());
  it("rejects short, repetitive and over-long passwords", () => {
    expect(passwordProblem("short")).toMatch(/at least/);
    expect(passwordProblem("aaaaaaaaaaaa")).toMatch(/repetitive/);
    expect(passwordProblem("é".repeat(40))).toMatch(/too long/);
  });
  it("normalises emails", () =>
    expect(normalizeEmail("  Alice@Example.COM ")).toBe("alice@example.com"));
});
