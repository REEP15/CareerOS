"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cn = cn;
exports.removeUndefined = removeUndefined;
exports.escapeRegExp = escapeRegExp;
exports.createSkillPattern = createSkillPattern;
const clsx_1 = require("clsx");
const tailwind_merge_1 = require("tailwind-merge");
function cn(...inputs) {
    return (0, tailwind_merge_1.twMerge)((0, clsx_1.clsx)(inputs));
}
/**
 * Recursively removes undefined values from an object.
 * This is useful for sanitizing data before sending to Firestore,
 * which rejects undefined values.
 */
function removeUndefined(obj) {
    if (obj === null || obj === undefined) {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map((item) => removeUndefined(item));
    }
    if (typeof obj === 'object') {
        const result = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                const value = obj[key];
                if (value !== undefined) {
                    result[key] = removeUndefined(value);
                }
            }
        }
        return result;
    }
    return obj;
}
/**
 * Escapes special regex characters in a string to safely use it in RegExp constructors.
 * This prevents errors when strings contain characters like +, *, ?, ., etc.
 */
function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
/**
 * Creates a safe regex pattern for matching skills/technologies that may contain special characters.
 * Instead of using word boundaries (\b) which fail for things like "C++" or "Node.js",
 * we use a more flexible pattern that matches the skill as a whole word while allowing internal special chars.
 */
function createSkillPattern(skill, flags = 'i') {
    const escaped = escapeRegExp(skill);
    // Match the skill as a whole word, but allow for internal special characters
    // This pattern matches: start of string or non-word char, then the skill, then end of string or non-word char
    return new RegExp(`(?:^|\\W)${escaped}(?:$|\\W)`, flags);
}
