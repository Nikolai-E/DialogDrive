// An extension by Nikolai Eidheim, built with WXT + TypeScript.
// Shared placeholder utilities for prompts like: "Please do X with [thing] and [other]".

export function extractPlaceholders(text: string): string[] {
  const out: string[] = [];
  const re = /\[([^\]]+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.push(m[1]);
  return out;
}

export function replacePlaceholders(text: string, map: Record<string, string>): string {
  return text.replace(/\[([^\]]+)\]/g, (_match, p1) => map[p1] ?? '');
}
