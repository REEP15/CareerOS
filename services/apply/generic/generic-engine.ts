/**
 * Generic engine - best-effort, selector-agnostic form filling
 * Mirrors v0_phase3/generic/generic-engine.ts
 */

import type { BrowserPage } from "@/types/browser";
import type { ConfirmationRequest, ResolvedAnswer } from "@/types/automation";
import type { AutomationRunContext, EngineHooks } from "../engine/context";
import type { AdapterFieldHint } from "../adapters/base";
import { resolveAnswer } from "../answer-resolver";
import { fillField } from "./field-filler";
import { SENSITIVE_SEMANTICS } from "../field-classifier";
import {
  describeControl,
  fieldKey,
  scanFields,
  type ScannedField,
} from "./field-scanner";

export interface FillSummary {
  filled: number;
  skipped: number;
  userAnswered: number;
  aborted: boolean;
  filledFieldIds: string[];
}

/** Turn adapter hints into described fields, tagged as authoritative. */
async function resolveHints(
  formPage: BrowserPage,
  hints: AdapterFieldHint[],
): Promise<ScannedField[]> {
  const out: ScannedField[] = [];
  for (const hint of hints) {
    const el = await formPage.query(hint.selector).catch(() => null);
    if (!el) continue;
    const described = await describeControl(el, hint.semantic);
    if (described) out.push(described);
  }
  return out;
}

function confirmationQuestion(field: ScannedField["field"]): string {
  const label =
    field.signals.labelText ??
    field.signals.ariaLabel ??
    field.signals.placeholder ??
    field.signals.name ??
    "this field";
  if (SENSITIVE_SEMANTICS.has(field.semantic)) {
    return `"${label}" is a voluntary/EEO question. How would you like to answer (or skip)?`;
  }
  if (field.semantic === "unknown") {
    return `We couldn't confidently understand "${label}". What should we enter?`;
  }
  return `Please confirm the value for "${label}".`;
}

/**
 * Fill every field on `formPage` for the current step.
 */
export async function fillForm(
  formPage: BrowserPage,
  ctx: AutomationRunContext,
  hooks: EngineHooks,
  hints: AdapterFieldHint[] = [],
): Promise<FillSummary> {
  const summary: FillSummary = {
    filled: 0,
    skipped: 0,
    userAnswered: 0,
    aborted: false,
    filledFieldIds: [],
  };

  const hinted = await resolveHints(formPage, hints);
  const hintedKeys = new Set(hinted.map((h) => fieldKey(h.field)));
  const scanned = (await scanFields(formPage)).filter(
    (s) => !hintedKeys.has(fieldKey(s.field)),
  );

  const all = [...hinted, ...scanned];
  hooks.log("info", `Detected ${all.length} field(s) on current step`, {
    hinted: hinted.length,
    scanned: scanned.length,
  });

  for (const { field, element } of all) {
    if (hooks.isAborted()) {
      summary.aborted = true;
      return summary;
    }

    // Leave already-populated non-file fields untouched unless they're wrong;
    // we don't clobber a user's manual edits.
    if (field.prefilled && field.kind !== "file") {
      summary.skipped++;
      continue;
    }

    let answer: ResolvedAnswer | null = resolveAnswer(field, ctx.resolver);

    const needsUser =
      !answer ||
      answer.confidence < ctx.confidenceThreshold ||
      SENSITIVE_SEMANTICS.has(field.semantic);

    if (needsUser) {
      const req: ConfirmationRequest = {
        runId: ctx.runId,
        reason: !answer
          ? "unanswerable_from_profile"
          : SENSITIVE_SEMANTICS.has(field.semantic)
            ? "sensitive_question"
            : "low_confidence",
        field,
        proposedAnswer: answer ?? undefined,
        question: confirmationQuestion(field),
        options: field.options,
      };

      const response = await hooks.requestConfirmation(req);
      if (response.abort) {
        summary.aborted = true;
        return summary;
      }
      if (!response.answered || !response.answer) {
        // User chose to skip (e.g. optional/voluntary field).
        summary.skipped++;
        continue;
      }

      answer = {
        fieldId: field.id,
        semantic: field.semantic,
        confidence: 1,
        source: "user_provided",
        rationale: "Provided by the user during confirmation",
        ...response.answer,
      };
      summary.userAnswered++;
    }

    const outcome = await fillField(element, field.kind, answer!);
    if (outcome.ok) {
      summary.filled++;
      summary.filledFieldIds.push(field.id);
      hooks.onFieldFilled?.(field, answer!);
      hooks.log("debug", `Filled ${field.semantic}`, {
        source: answer!.source,
        confidence: answer!.confidence,
      });
    } else {
      summary.skipped++;
      hooks.log("warn", `Could not fill ${field.semantic}: ${outcome.reason}`);
    }
  }

  return summary;
}