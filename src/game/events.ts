export function logEvent(
  name: string,
  fields: Record<string, number | string | boolean> = {},
): void {
  console.info(JSON.stringify({ event: name, ...fields }));
}
