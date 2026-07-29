import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Recursively removes undefined values from an object.
 * This is useful for sanitizing data before sending to Firestore,
 * which rejects undefined values.
 */
export function removeUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => removeUndefined(item)) as T;
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = (obj as Record<string, unknown>)[key];
        if (value !== undefined) {
          result[key] = removeUndefined(value);
        }
      }
    }
    return result as T;
  }

  return obj;
}

/**
 * Escapes special regex characters in a string to safely use it in RegExp constructors.
 * This prevents errors when strings contain characters like +, *, ?, ., etc.
 */
export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Creates a safe regex pattern for matching skills/technologies that may contain special characters.
 * Instead of using word boundaries (\b) which fail for things like "C++" or "Node.js",
 * we use a more flexible pattern that matches the skill as a whole word while allowing internal special chars.
 */
export function createSkillPattern(skill: string, flags: string = 'i'): RegExp {
  const escaped = escapeRegExp(skill);
  // Match the skill as a whole word, but allow for internal special characters
  // This pattern matches: start of string or non-word char, then the skill, then end of string or non-word char
  return new RegExp(`(?:^|\\W)${escaped}(?:$|\\W)`, flags);
}
