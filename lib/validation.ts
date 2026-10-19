export function normalizeAnswer(value: string) {
  return value.replace(/\r\n?/g, "\n").replace(/\n+$/, "");
}
export function isStrictNumber(value: string, type: "integer" | "decimal") {
  return type === "integer"
    ? /^[+-]?\d+$/.test(value)
    : /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(value);
}
export function validateAnswer(
  answer: string,
  expected: string,
  type?: "integer" | "decimal" | "text",
) {
  const normalizedAnswer = normalizeAnswer(answer),
    normalizedExpected = normalizeAnswer(expected);
  if (type === "integer" && !isStrictNumber(normalizedAnswer, "integer"))
    return false;
  if (type === "decimal" && !isStrictNumber(normalizedAnswer, "decimal"))
    return false;
  return normalizedAnswer === normalizedExpected;
}
export type NumericDirection = "high" | "low" | "equivalent" | null;
/**
 * Compare a submitted number against the expected one.
 *
 * "equivalent" means the two numbers are equal but their text differs (for
 * example "4.20" against "4.2"): the student is right about the value and
 * wrong about the format, which deserves its own message.
 */
export function numericDirection(
  answer: string,
  expected: string,
  type: "integer" | "decimal",
): NumericDirection {
  const a = normalizeAnswer(answer),
    e = normalizeAnswer(expected);
  if (!isStrictNumber(a, type) || !isStrictNumber(e, type)) return null;
  const actual = Number(a),
    target = Number(e);
  if (actual === target) return "equivalent";
  return actual > target ? "high" : "low";
}
