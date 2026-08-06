"use strict";
/**
 * Answer resolver for automation
 * Maps CareerOS ResumeProfile to automation answers
 * Mirrors v0_phase3/generic/answer-resolver.ts with CareerOS data model integration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapResumeProfileToUserProfile = mapResumeProfileToUserProfile;
exports.resolveAnswer = resolveAnswer;
const field_classifier_1 = require("./field-classifier");
function pickBooleanOption(options, want) {
    if (!options)
        return undefined;
    const yes = /\b(yes|true|i (am|do)|authorized|eligible)\b/i;
    const no = /\b(no|false|not|un(authorized|eligible))\b/i;
    return options.find((o) => (want ? yes : no).test(`${o.label} ${o.value}`));
}
function match(option, value) {
    if (!option)
        return value;
    const lower = value.toLowerCase();
    const exact = option.find((o) => o.value.toLowerCase() === lower || o.label.toLowerCase() === lower);
    if (exact)
        return exact.value;
    const partial = option.find((o) => o.label.toLowerCase().includes(lower));
    return partial === null || partial === void 0 ? void 0 : partial.value;
}
function mapResumeProfileToUserProfile(resume, userId) {
    var _a;
    const experience = (_a = resume.experience[0]) !== null && _a !== void 0 ? _a : {};
    const totalYears = resume.experience.reduce((acc, exp) => {
        if (!exp.startDate)
            return acc;
        const start = new Date(exp.startDate);
        const end = exp.endDate ? new Date(exp.endDate) : new Date();
        const years = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
        return acc + years;
    }, 0);
    return {
        userId,
        firstName: resume.personal.name.split(" ")[0],
        lastName: resume.personal.name.split(" ").slice(1).join(" "),
        fullName: resume.personal.name,
        email: resume.personal.email,
        phone: resume.personal.phone,
        address: {
            line1: resume.personal.location,
            city: undefined,
            state: undefined,
            country: undefined,
            postalCode: undefined,
        },
        links: {
            linkedin: resume.personal.linkedin,
            portfolio: resume.personal.portfolio,
            github: resume.personal.github,
            website: undefined,
        },
        workAuthorization: {
            status: undefined,
            authorizedToWork: undefined,
            requiresSponsorship: undefined,
        },
        experience: {
            yearsOfExperience: Math.round(totalYears),
            currentCompany: experience.company,
            currentTitle: experience.title,
            expectedSalary: undefined,
            noticePeriod: undefined,
        },
        customAnswers: {},
    };
}
function resolveAnswer(field, inputs) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0;
    const { profile, resume, coverLetter, resumePath, coverLetterPath } = inputs;
    const p = profile;
    if (field_classifier_1.SENSITIVE_SEMANTICS.has(field.semantic))
        return null;
    const base = {
        fieldId: field.id,
        semantic: field.semantic,
    };
    const cap = field.classificationConfidence;
    const conf = (raw) => Math.min(raw, cap);
    const text = (value, confidence, rationale, source = "profile") => value
        ? { ...base, value, confidence: conf(confidence), source, rationale }
        : null;
    switch (field.semantic) {
        case "full_name":
            return text((_a = p.fullName) !== null && _a !== void 0 ? _a : ([p.firstName, p.lastName].filter(Boolean).join(" ") || undefined), 0.95, "Full name from profile");
        case "first_name":
            return text(p.firstName, 0.95, "First name from profile");
        case "last_name":
            return text(p.lastName, 0.95, "Last name from profile");
        case "email":
            return text(p.email, 0.97, "Email from profile");
        case "phone":
            return text(p.phone, 0.95, "Phone from profile");
        case "address_line":
            return text((_b = p.address) === null || _b === void 0 ? void 0 : _b.line1, 0.9, "Street address from profile");
        case "city":
            return text((_c = p.address) === null || _c === void 0 ? void 0 : _c.city, 0.9, "City from profile");
        case "state":
            return text((_d = p.address) === null || _d === void 0 ? void 0 : _d.state, 0.9, "State from profile");
        case "country":
            return text((_e = p.address) === null || _e === void 0 ? void 0 : _e.country, 0.9, "Country from profile");
        case "postal_code":
            return text((_f = p.address) === null || _f === void 0 ? void 0 : _f.postalCode, 0.9, "Postal code from profile");
        case "linkedin_url":
            return text((_g = p.links) === null || _g === void 0 ? void 0 : _g.linkedin, 0.9, "LinkedIn URL from profile");
        case "portfolio_url":
            return text((_h = p.links) === null || _h === void 0 ? void 0 : _h.portfolio, 0.9, "Portfolio URL from profile");
        case "github_url":
            return text((_j = p.links) === null || _j === void 0 ? void 0 : _j.github, 0.9, "GitHub URL from profile");
        case "website_url":
            return text((_k = p.links) === null || _k === void 0 ? void 0 : _k.website, 0.85, "Website URL from profile");
        case "current_company":
            return text((_l = p.experience) === null || _l === void 0 ? void 0 : _l.currentCompany, 0.85, "Current company from profile");
        case "current_title":
            return text((_m = p.experience) === null || _m === void 0 ? void 0 : _m.currentTitle, 0.85, "Current title from profile");
        case "expected_salary":
            return text((_o = p.experience) === null || _o === void 0 ? void 0 : _o.expectedSalary, 0.8, "Expected salary from profile");
        case "notice_period":
            return text((_p = p.experience) === null || _p === void 0 ? void 0 : _p.noticePeriod, 0.8, "Notice period from profile");
        case "years_of_experience": {
            const years = (_q = p.experience) === null || _q === void 0 ? void 0 : _q.yearsOfExperience;
            if (years == null)
                return null;
            return { ...base, value: String(years), confidence: conf(0.85), source: "profile", rationale: "Years of experience from profile" };
        }
        case "resume_upload":
            return {
                ...base,
                filePath: resumePath,
                confidence: conf(0.97),
                source: "resume_version",
                rationale: `Selected resume version "${resume.label}"`,
            };
        case "cover_letter_upload":
            if (!coverLetter || !coverLetterPath)
                return null;
            return {
                ...base,
                filePath: coverLetterPath,
                confidence: conf(0.95),
                source: "cover_letter_version",
                rationale: `Selected cover letter "${coverLetter.label}"`,
            };
        case "cover_letter_text":
            if (!(coverLetter === null || coverLetter === void 0 ? void 0 : coverLetter.bodyText))
                return null;
            return {
                ...base,
                value: coverLetter.bodyText,
                confidence: conf(0.9),
                source: "cover_letter_version",
                rationale: `Cover letter body from "${coverLetter.label}"`,
            };
        case "work_authorization": {
            const status = (_r = p.workAuthorization) === null || _r === void 0 ? void 0 : _r.status;
            if ((_s = field.options) === null || _s === void 0 ? void 0 : _s.length) {
                const chosen = status ? match(field.options, status) : undefined;
                if (!chosen)
                    return null;
                return { ...base, optionValue: chosen, confidence: conf(0.75), source: "profile", rationale: "Work authorization status from profile" };
            }
            return text(status, 0.8, "Work authorization status from profile");
        }
        case "requires_sponsorship": {
            const requires = (_t = p.workAuthorization) === null || _t === void 0 ? void 0 : _t.requiresSponsorship;
            if (requires == null)
                return null;
            if (field.kind === "checkbox") {
                return { ...base, checked: requires, confidence: conf(0.85), source: "profile", rationale: "Sponsorship requirement from profile" };
            }
            const opt = pickBooleanOption(field.options, requires);
            if (((_u = field.options) === null || _u === void 0 ? void 0 : _u.length) && !opt)
                return null;
            return {
                ...base,
                optionValue: opt === null || opt === void 0 ? void 0 : opt.value,
                value: opt ? undefined : requires ? "Yes" : "No",
                confidence: conf(0.85),
                source: "profile",
                rationale: "Sponsorship requirement from profile",
            };
        }
        case "how_did_you_hear": {
            const saved = (_v = p.customAnswers) === null || _v === void 0 ? void 0 : _v["how_did_you_hear"];
            if (!saved)
                return null;
            const chosen = ((_w = field.options) === null || _w === void 0 ? void 0 : _w.length) ? match(field.options, saved) : undefined;
            if (((_x = field.options) === null || _x === void 0 ? void 0 : _x.length) && !chosen)
                return null;
            return {
                ...base,
                optionValue: chosen,
                value: chosen ? undefined : saved,
                confidence: conf(0.7),
                source: "custom_answer",
                rationale: "Saved custom answer",
            };
        }
        default: {
            const key = normalizeKey((_z = (_y = field.signals.labelText) !== null && _y !== void 0 ? _y : field.signals.ariaLabel) !== null && _z !== void 0 ? _z : "");
            const saved = key ? (_0 = p.customAnswers) === null || _0 === void 0 ? void 0 : _0[key] : undefined;
            if (!saved)
                return null;
            return {
                ...base,
                value: saved,
                confidence: conf(0.65),
                source: "custom_answer",
                rationale: "Matched a saved custom answer",
            };
        }
    }
}
function normalizeKey(label) {
    return label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
}
