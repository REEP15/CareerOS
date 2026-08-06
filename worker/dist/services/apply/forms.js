"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KNOWN_FIELDS = void 0;
exports.getKnownApplicationFields = getKnownApplicationFields;
exports.KNOWN_FIELDS = {
    fullName: ["name", "full name", "candidate name"],
    email: ["email", "email address"],
    phone: ["phone", "phone number", "mobile"],
    linkedin: ["linkedin", "linkedin profile"],
    github: ["github", "github profile"],
    portfolio: ["portfolio", "website", "personal website"],
};
function getKnownApplicationFields(resume) {
    return [
        {
            labels: exports.KNOWN_FIELDS.fullName,
            value: resume.personal.name,
        },
        {
            labels: exports.KNOWN_FIELDS.email,
            value: resume.personal.email,
        },
        {
            labels: exports.KNOWN_FIELDS.phone,
            value: resume.personal.phone,
        },
        {
            labels: exports.KNOWN_FIELDS.linkedin,
            value: resume.personal.linkedin,
        },
        {
            labels: exports.KNOWN_FIELDS.github,
            value: resume.personal.github,
        },
        {
            labels: exports.KNOWN_FIELDS.portfolio,
            value: resume.personal.portfolio,
        },
    ];
}
