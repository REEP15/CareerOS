"use strict";
/**
 * Semantic field classification
 * Mirrors v0_phase3/generic/field-classifier.ts for consistent field detection
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SENSITIVE_SEMANTICS = void 0;
exports.classifyField = classifyField;
const RULES = [
    {
        semantic: "first_name",
        strong: { autocomplete: ["given-name"] },
        keywords: [/\bfirst[\s_-]*name\b/i, /\bgiven[\s_-]*name\b/i, /\bfore[\s_-]*name\b/i],
    },
    {
        semantic: "last_name",
        strong: { autocomplete: ["family-name"] },
        keywords: [/\blast[\s_-]*name\b/i, /\bfamily[\s_-]*name\b/i, /\bsur[\s_-]*name\b/i],
    },
    {
        semantic: "full_name",
        strong: { autocomplete: ["name"] },
        keywords: [/\bfull[\s_-]*name\b/i, /\byour name\b/i, /^name$/i, /\bname\b/i],
        negative: [/first|last|given|family|sur|user|company|file|nick/i],
    },
    {
        semantic: "email",
        strong: { autocomplete: ["email"], inputType: ["email"] },
        keywords: [/\be[\s_-]?mail\b/i],
    },
    {
        semantic: "phone",
        strong: { autocomplete: ["tel"], inputType: ["tel"] },
        keywords: [/\bphone\b/i, /\bmobile\b/i, /\bcontact number\b/i, /\btelephone\b/i],
    },
    {
        semantic: "linkedin_url",
        keywords: [/\blinked[\s_-]?in\b/i],
    },
    {
        semantic: "github_url",
        keywords: [/\bgit[\s_-]?hub\b/i],
    },
    {
        semantic: "portfolio_url",
        keywords: [/\bportfolio\b/i, /\bpersonal site\b/i, /\bwork sample/i],
    },
    {
        semantic: "website_url",
        strong: { autocomplete: ["url"], inputType: ["url"] },
        keywords: [/\bwebsite\b/i, /\bweb\s*url\b/i, /\bhomepage\b/i],
        negative: [/portfolio|linkedin|github/i],
    },
    {
        semantic: "postal_code",
        strong: { autocomplete: ["postal-code"] },
        keywords: [/\bzip\b/i, /\bpostal\b/i, /\bpin[\s_-]?code\b/i],
    },
    {
        semantic: "city",
        strong: { autocomplete: ["address-level2"] },
        keywords: [/\bcity\b/i, /\btown\b/i],
    },
    {
        semantic: "state",
        strong: { autocomplete: ["address-level1"] },
        keywords: [/\bstate\b/i, /\bprovince\b/i, /\bregion\b/i],
    },
    {
        semantic: "country",
        strong: { autocomplete: ["country", "country-name"] },
        keywords: [/\bcountry\b/i],
    },
    {
        semantic: "address_line",
        strong: { autocomplete: ["street-address", "address-line1"] },
        keywords: [/\baddress\b/i, /\bstreet\b/i],
        negative: [/e[\s_-]?mail/i],
    },
    {
        semantic: "requires_sponsorship",
        keywords: [/\bsponsor/i, /\bvisa sponsorship\b/i, /\brequire.*(sponsor|visa)\b/i],
    },
    {
        semantic: "work_authorization",
        keywords: [/\bwork authoriz/i, /\bauthoriz(ed|ation) to work\b/i, /\blegally.*work\b/i, /\bwork permit\b/i, /\beligib.*work\b/i],
    },
    {
        semantic: "years_of_experience",
        keywords: [/\byears? of experience\b/i, /\bexperience.*years?\b/i, /\btotal experience\b/i],
    },
    {
        semantic: "current_company",
        strong: { autocomplete: ["organization"] },
        keywords: [/\bcurrent (company|employer)\b/i, /\bpresent employer\b/i],
    },
    {
        semantic: "current_title",
        strong: { autocomplete: ["organization-title"] },
        keywords: [/\bcurrent (title|role|designation)\b/i, /\bjob title\b/i],
    },
    {
        semantic: "expected_salary",
        keywords: [/\bexpected (salary|ctc|compensation)\b/i, /\bsalary expectation\b/i, /\bdesired salary\b/i],
    },
    {
        semantic: "notice_period",
        keywords: [/\bnotice period\b/i, /\bavailab.*start\b/i, /\bstart date\b/i],
    },
    {
        semantic: "cover_letter_upload",
        keywords: [/\bcover letter\b/i],
    },
    {
        semantic: "cover_letter_text",
        keywords: [/\bcover letter\b/i, /\bwhy .*(interested|apply|role)\b/i, /\bmessage to.*hiring\b/i],
    },
    {
        semantic: "resume_upload",
        keywords: [/\bresume\b/i, /\bcv\b/i, /\bcurriculum vitae\b/i],
    },
    {
        semantic: "gender",
        keywords: [/\bgender\b/i, /\bsex\b/i],
    },
    {
        semantic: "race_ethnicity",
        keywords: [/\brace\b/i, /\bethnicit/i],
    },
    {
        semantic: "veteran_status",
        keywords: [/\bveteran\b/i, /\bprotected veteran\b/i],
    },
    {
        semantic: "disability_status",
        keywords: [/\bdisabilit/i],
    },
    {
        semantic: "how_did_you_hear",
        keywords: [/\bhow did you hear\b/i, /\bhear about\b/i, /\bsource\b/i, /\breferr/i],
    },
];
exports.SENSITIVE_SEMANTICS = new Set([
    "gender",
    "race_ethnicity",
    "veteran_status",
    "disability_status",
]);
function combinedText(signals) {
    return [
        signals.labelText,
        signals.ariaLabel,
        signals.placeholder,
        signals.name,
        signals.idAttr,
        signals.ariaDescribedByText,
        signals.nearbyText,
    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
}
function classifyField(signals, kind) {
    var _a, _b, _c, _d, _e, _f, _g;
    const text = combinedText(signals);
    const autocomplete = ((_a = signals.autocomplete) !== null && _a !== void 0 ? _a : "").toLowerCase();
    const inputType = ((_b = signals.inputType) !== null && _b !== void 0 ? _b : "").toLowerCase();
    let best = { semantic: "unknown", confidence: 0 };
    for (const rule of RULES) {
        if (rule.semantic === "resume_upload" || rule.semantic === "cover_letter_upload") {
            if (kind !== "file")
                continue;
        }
        if (rule.semantic === "cover_letter_text" && kind === "file")
            continue;
        let score = 0;
        if ((_d = (_c = rule.strong) === null || _c === void 0 ? void 0 : _c.autocomplete) === null || _d === void 0 ? void 0 : _d.some((a) => autocomplete === a || autocomplete.endsWith(a))) {
            score = Math.max(score, 0.97);
        }
        if ((_f = (_e = rule.strong) === null || _e === void 0 ? void 0 : _e.inputType) === null || _f === void 0 ? void 0 : _f.includes(inputType)) {
            score = Math.max(score, 0.9);
        }
        if (rule.keywords.some((re) => re.test(text))) {
            const inLabel = rule.keywords.some((re) => { var _a; return re.test(((_a = signals.labelText) !== null && _a !== void 0 ? _a : "").toLowerCase()); }) ||
                rule.keywords.some((re) => { var _a; return re.test(((_a = signals.ariaLabel) !== null && _a !== void 0 ? _a : "").toLowerCase()); });
            score = Math.max(score, inLabel ? 0.85 : 0.62);
        }
        if (score === 0)
            continue;
        if ((_g = rule.negative) === null || _g === void 0 ? void 0 : _g.some((re) => re.test(text)))
            continue;
        if (score > best.confidence) {
            best = { semantic: rule.semantic, confidence: score };
            if (score >= 0.97)
                break;
        }
    }
    return best;
}
