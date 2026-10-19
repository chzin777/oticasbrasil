/**
 * Utility function for conditional class names.
 * Simplified version without clsx/tailwind-merge dependencies.
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}