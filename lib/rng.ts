import crypto from "node:crypto";

import { env } from "@/lib/env";
import "server-only";

export interface DeterministicRng {
  nextFloat(): number;
  nextInt(minInclusive: number, maxInclusive: number): number;
  pick<T>(items: readonly T[]): T;
  boolean(probability?: number): boolean;
}
class Mulberry32 implements DeterministicRng {
  constructor(private state: number) {}
  nextFloat() {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  nextInt(min: number, max: number) {
    if (!Number.isInteger(min) || !Number.isInteger(max) || min > max)
      throw new Error("Invalid integer range");
    return min + Math.floor(this.nextFloat() * (max - min + 1));
  }
  pick<T>(items: readonly T[]) {
    if (!items.length) throw new Error("Cannot pick from empty array");
    return items[this.nextInt(0, items.length - 1)];
  }
  boolean(probability = 0.5) {
    if (probability < 0 || probability > 1)
      throw new Error("Invalid probability");
    return this.nextFloat() < probability;
  }
}
export function createRngFromSeed(seed: Buffer) {
  return new Mulberry32(seed.readUInt32BE(0));
}
export function challengeRng(
  studentId: string,
  challengeId: string,
  version: number,
) {
  const key = env().CHALLENGE_SERVER_SECRET;
  const seed = crypto
    .createHmac("sha256", key)
    .update(`${studentId}:${challengeId}:${version}`)
    .digest();
  return createRngFromSeed(seed);
}
