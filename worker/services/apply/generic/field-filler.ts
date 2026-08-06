/**
 * Field filler - applies resolved answers to form fields
 * Mirrors v0_phase3/generic/field-filler.ts
 */

import type { BrowserElement } from "../../../../shared/types/browser";
import type { ControlKind, ResolvedAnswer } from "../../../../shared/types/automation";
import { SENSITIVE_SEMANTICS } from "../field-classifier";

export interface FillOutcome {
  ok: boolean;
  reason?: string;
}

export async function fillField(
  element: BrowserElement,
  kind: ControlKind,
  answer: ResolvedAnswer,
): Promise<FillOutcome> {
  try {
    switch (kind) {
      case "text":
      case "textarea":
      case "email":
      case "tel":
      case "url":
      case "number":
        if (answer.value !== undefined) {
          await element.fill(answer.value);
          return { ok: true };
        }
        return { ok: false, reason: "No text value provided" };

      case "select":
      case "combobox":
        if (answer.optionValue !== undefined) {
          await element.selectOption(answer.optionValue);
          return { ok: true };
        }
        if (answer.value !== undefined) {
          await element.selectOption(answer.value);
          return { ok: true };
        }
        return { ok: false, reason: "No option value provided" };

      case "checkbox":
        if (answer.checked !== undefined) {
          if (answer.checked) {
            await element.check();
          } else {
            await element.uncheck();
          }
          return { ok: true };
        }
        return { ok: false, reason: "No checkbox state provided" };

      case "radio_group":
        if (answer.optionValue !== undefined) {
          await element.selectOption(answer.optionValue);
          return { ok: true };
        }
        if (answer.value !== undefined) {
          await element.selectOption(answer.value);
          return { ok: true };
        }
        return { ok: false, reason: "No radio option provided" };

      case "file":
        if (answer.filePath !== undefined) {
          await element.setInputFiles(answer.filePath);
          return { ok: true };
        }
        return { ok: false, reason: "No file path provided" };

      default:
        return { ok: false, reason: `Unsupported control kind: ${kind}` };
    }
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "Unknown error",
    };
  }
}