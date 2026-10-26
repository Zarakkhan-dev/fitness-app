/** Joins class names, dropping falsy values — the whole of "clsx" we need. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
