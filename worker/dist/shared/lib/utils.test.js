"use strict";
/**
 * Test cases for regex utility functions with special characters
 * This file validates that skills with special characters don't cause regex errors
 *
 * These are validation examples that can be used to test the regex functions manually
 * or integrated into a test suite.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSkillPatternValidation = exports.escapeRegExpValidation = void 0;
exports.validateRegexUtilities = validateRegexUtilities;
const utils_1 = require("./utils");
// Test data with skills containing special characters
const specialCharacterSkills = [
    'C++',
    'C#',
    'Node.js',
    'Next.js',
    'React.js',
    '.NET',
    'ASP.NET',
    'Express.js',
    'TensorFlow',
    'TensorFlow Lite',
    'Objective-C',
    'SwiftUI',
    'Kotlin',
    'Go',
    'Rust',
    'C',
    'Python',
    'Java',
    'JavaScript',
    'TypeScript',
    'SQL',
    'Firebase',
    'AWS',
    'Docker',
    'Kubernetes',
];
/**
 * Validation examples for escapeRegExp function
 */
exports.escapeRegExpValidation = [
    { input: 'C++', expected: 'C\\+\\+' },
    { input: 'C#', expected: 'C\\#' },
    { input: 'Node.js', expected: 'Node\\.js' },
    { input: '.NET', expected: '\\.NET' },
    { input: 'Express.js', expected: 'Express\\.js' },
    { input: 'TensorFlow Lite', expected: 'TensorFlow Lite' },
    { input: 'Objective-C', expected: 'Objective\\-C' },
];
/**
 * Validation examples for createSkillPattern function
 * Tests that patterns match correctly without false positives
 */
exports.createSkillPatternValidation = [
    { skill: 'C++', shouldMatch: 'Experience with C++', shouldNotMatch: 'Experience with C' },
    { skill: 'Node.js', shouldMatch: 'Node.js development', shouldNotMatch: 'Node development' },
    { skill: '.NET', shouldMatch: '.NET framework', shouldNotMatch: 'NET framework' },
    { skill: 'React.js', shouldMatch: 'React.js components', shouldNotMatch: 'React components' },
    { skill: 'C#', shouldMatch: 'C# programming', shouldNotMatch: 'C programming' },
];
/**
 * Manual test function to validate regex utilities
 * Call this function to test the implementations
 */
function validateRegexUtilities() {
    const errors = [];
    // Test escapeRegExp
    for (const { input, expected } of exports.escapeRegExpValidation) {
        const result = (0, utils_1.escapeRegExp)(input);
        if (result !== expected) {
            errors.push(`escapeRegExp("${input}") returned "${result}", expected "${expected}"`);
        }
    }
    // Test createSkillPattern - ensure no regex errors are thrown
    for (const skill of specialCharacterSkills) {
        try {
            const pattern = (0, utils_1.createSkillPattern)(skill, 'i');
            // Test basic matching
            const testSentence = `I have experience with ${skill} and other technologies`;
            if (!pattern.test(testSentence)) {
                errors.push(`createSkillPattern("${skill}") failed to match in test sentence`);
            }
        }
        catch (error) {
            errors.push(`createSkillPattern("${skill}") threw error: ${error}`);
        }
    }
    // Test for false positives
    for (const { skill, shouldMatch, shouldNotMatch } of exports.createSkillPatternValidation) {
        const pattern = (0, utils_1.createSkillPattern)(skill, 'i');
        if (!pattern.test(shouldMatch)) {
            errors.push(`Pattern for "${skill}" should match "${shouldMatch}" but didn't`);
        }
        if (pattern.test(shouldNotMatch)) {
            errors.push(`Pattern for "${skill}" should NOT match "${shouldNotMatch}" but did`);
        }
    }
    return {
        success: errors.length === 0,
        errors
    };
}
