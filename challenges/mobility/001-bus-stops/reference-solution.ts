export function solve(value: unknown) {
  return String((value as number[]).reduce((total, n) => total + n, 0));
}
