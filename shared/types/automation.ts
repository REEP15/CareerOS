/**
 * Automation core types - shared across engine, adapters, and tracker
 * Mirrors v0_phase3/core/types.ts for clean type definitions
 */

/** Canonical semantic meaning of a form field, independent of any site markup */
export type FieldSemantic =
  | "full_name"
  | "first_name"
  | "last_name"
  | "email"
  | "phone"
  | "address_line"
  | "city"
  | "state"
  | "country"
  | "postal_code"
  | "linkedin_url"
  | "portfolio_url"
  | "github_url"
  | "website_url"
  | "work_authorization"
  | "requires_sponsorship"
  | "resume_upload"
  | "cover_letter_upload"
  | "cover_letter_text"
  | "years_of_experience"
  | "current_company"
  | "current_title"
  | "expected_salary"
  | "notice_period"
  | "gender"
  | "race_ethnicity"
  | "veteran_status"
  | "disability_status"
  | "how_did_you_hear"
  | "unknown";

/** The kind of control we are interacting with, normalized across sites */
export type ControlKind =
  | "text"
  | "textarea"
  | "email"
  | "tel"
  | "url"
  | "number"
  | "select"
  | "combobox"
  | "radio_group"
  | "checkbox"
  | "checkbox_group"
  | "date"
  | "file"
  | "unknown";

/** Where a resolved answer came from — used for auditing and UI display */
export type AnswerSource =
  | "profile"
  | "resume_version"
  | "cover_letter_version"
  | "custom_answer"
  | "derived"
  | "user_provided";

/**
 * A field discovered on the page together with the metadata used to classify it
 */
export interface DetectedField {
  /** Stable-ish id for correlating confirmations and logs */
  id: string;
  kind: ControlKind;
  semantic: FieldSemantic;
  /** 0..1 confidence in the semantic classification (not the answer) */
  classificationConfidence: number;
  required: boolean;
  /** Raw signals captured from the DOM/accessibility tree, for auditing */
  signals: FieldSignals;
  /** Options for select/radio/checkbox groups, when applicable */
  options?: FieldOption[];
  /** Whether the field already has a value on the page */
  prefilled: boolean;
}

export interface FieldOption {
  label: string;
  value: string;
}

/** Accessibility / semantic signals harvested from a control */
export interface FieldSignals {
  tagName: string;
  inputType?: string | null;
  role?: string | null;
  name?: string | null;
  idAttr?: string | null;
  labelText?: string | null;
  placeholder?: string | null;
  ariaLabel?: string | null;
  ariaDescribedByText?: string | null;
  autocomplete?: string | null;
  nearbyText?: string | null;
  required?: boolean;
}

/** An answer the engine intends to apply to a field */
export interface ResolvedAnswer {
  fieldId: string;
  semantic: FieldSemantic;
  /** For text-like controls */
  value?: string;
  /** For select/radio: the option value or label to choose */
  optionValue?: string;
  /** For checkboxes / boolean questions */
  checked?: boolean;
  /** For file inputs: an absolute path or a downloadable URL the driver fetches */
  filePath?: string;
  /** 0..1 confidence in the *answer* (distinct from classification confidence) */
  confidence: number;
  source: AnswerSource;
  /** Human-readable rationale surfaced in the tracker and confirmation UI */
  rationale: string;
}

/** Reasons the engine may need a human before continuing */
export type ConfirmationReason =
  | "low_confidence"
  | "unanswerable_from_profile"
  | "ambiguous_field"
  | "sensitive_question"
  | "final_submit";

/** A request handed to the human-in-the-loop layer */
export interface ConfirmationRequest {
  runId: string;
  reason: ConfirmationReason;
  field?: DetectedField;
  /** The engine's best (possibly empty) proposal, for the user to accept/edit */
  proposedAnswer?: ResolvedAnswer;
  question: string;
  /** Options to present when the field is a choice control */
  options?: FieldOption[];
}

/** The user's response to a confirmation request */
export interface ConfirmationResponse {
  /** When false, the engine skips the field (leaving it untouched) */
  answered: boolean;
  answer?: Partial<ResolvedAnswer>;
  /** For `final_submit`: whether the user authorizes submission */
  approvedSubmit?: boolean;
  /** User aborted the whole run */
  abort?: boolean;
}

/** Terminal / intermediate states of an automation run */
export type RunState =
  | "detecting"
  | "filling"
  | "awaiting_user"
  | "ready_for_review"
  | "submitted"
  | "completed_manual"
  | "failed"
  | "aborted";

export interface AutomationResult {
  runId: string;
  state: RunState;
  adapterId: string;
  usedGenericFallback: boolean;
  filledFields: number;
  skippedFields: number;
  userAnsweredFields: number;
  failureReason?: string;
}