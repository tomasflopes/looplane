export function solve(value: unknown) {
  return String(Math.min(...(value as number[])));
}
