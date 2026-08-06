/**
 * Field scanner - discovers and classifies form fields
 * Mirrors v0_phase3/generic/field-scanner.ts
 */

import type { BrowserElement, BrowserPage } from "../../../../shared/types/browser";
import type {
  ControlKind,
  DetectedField,
  FieldOption,
  FieldSignals,
} from "../../../../shared/types/automation";
import { classifyField } from "../field-classifier";

/**
 * A discovered field paired with its live element handle.
 */
export interface ScannedField {
  field: DetectedField;
  element: BrowserElement;
}

const CONTROL_SELECTOR = [
  "input:not([type=hidden]):not([type=submit]):not([type=button])",
  "textarea",
  "select",
  "[role=combobox]",
  "[role=radiogroup]",
  "[contenteditable=true]",
].join(",");

let fieldCounter = 0;

async function normalizeKind(el: BrowserElement): Promise<ControlKind> {
  const tag = (await el.tagName()).toLowerCase();
  if (tag === "textarea") return "textarea";
  if (tag === "select") return "select";

  const role = await el.getAttribute("role");
  if (role === "combobox") return "combobox";
  if (role === "radiogroup") return "radio_group";

  if (tag === "input") {
    const type = (await el.getAttribute("type"))?.toLowerCase() ?? "text";
    switch (type) {
      case "email":
        return "email";
      case "tel":
        return "tel";
      case "url":
        return "url";
      case "number":
        return "number";
      case "file":
        return "file";
      case "date":
        return "date";
      case "radio":
        return "radio_group";
      case "checkbox":
        return "checkbox";
      default:
        return "text";
    }
  }
  return "unknown";
}

async function harvestSignals(el: BrowserElement): Promise<FieldSignals> {
  const [
    tagName,
    inputType,
    role,
    name,
    idAttr,
    labelText,
    placeholder,
    ariaLabel,
    ariaDescribedByText,
    autocomplete,
    nearbyText,
    requiredAttr,
    ariaRequired,
  ] = await Promise.all([
    el.tagName(),
    el.getAttribute("type"),
    el.getAttribute("role"),
    el.getAttribute("name"),
    el.getAttribute("id"),
    el.accessibleLabel(),
    el.getAttribute("placeholder"),
    el.getAttribute("aria-label"),
    el.describedByText(),
    el.getAttribute("autocomplete"),
    el.nearbyText(),
    el.getAttribute("required"),
    el.getAttribute("aria-required"),
  ]);

  return {
    tagName,
    inputType,
    role,
    name,
    idAttr,
    labelText,
    placeholder,
    ariaLabel,
    ariaDescribedByText,
    autocomplete,
    nearbyText,
    required: requiredAttr != null || ariaRequired === "true",
  };
}

async function readOptions(
  el: BrowserElement,
  kind: ControlKind,
): Promise<FieldOption[] | undefined> {
  if (kind === "select" || kind === "radio_group") {
    const opts = await el.options().catch(() => []);
    return opts.length ? opts : undefined;
  }
  return undefined;
}

/**
 * Fully describe a single control: normalize its kind, harvest signals, read
 * options, and classify it.
 */
export async function describeControl(
  el: BrowserElement,
  semanticOverride?: DetectedField["semantic"],
): Promise<ScannedField | null> {
  if (!(await el.isVisible())) return null;

  const kind = await normalizeKind(el);
  const signals = await harvestSignals(el);
  const classified = classifyField(signals, kind);
  const currentValue = await el.inputValue().catch(() => "");
  const options = await readOptions(el, kind);

  return {
    field: {
      id: `f_${++fieldCounter}`,
      kind,
      semantic: semanticOverride ?? classified.semantic,
      classificationConfidence: semanticOverride ? 0.98 : classified.confidence,
      required: signals.required ?? false,
      signals,
      options,
      prefilled: currentValue.trim().length > 0,
    },
    element: el,
  };
}

/** A stable identity for a field, used to de-duplicate hinted vs scanned. */
export function fieldKey(field: DetectedField): string {
  const s = field.signals;
  return [s.name, s.idAttr, s.labelText, s.ariaLabel, s.placeholder]
    .map((x) => (x ?? "").trim().toLowerCase())
    .join("|");
}

/**
 * Discover and classify every actionable field across the page and its frames.
 */
export async function scanFields(root: BrowserPage): Promise<ScannedField[]> {
  const pages = [root, ...root.frames()];
  const fields: ScannedField[] = [];

  for (const page of pages) {
    let controls: BrowserElement[];
    try {
      controls = await page.queryAll(CONTROL_SELECTOR);
    } catch {
      continue; // Cross-origin frame or detached; skip gracefully.
    }

    for (const el of controls) {
      const described = await describeControl(el);
      if (described) fields.push(described);
    }
  }

  return fields;
}