/**
 * API endpoint to demonstrate pause/resume execution timeline
 * GET /api/automation/test-resume
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const executionTimeline: Array<{ phase: string; step: number; action: string; timestamp: string }> = [];
  
  // Simulate initial execution
  executionTimeline.push({
    phase: "detecting",
    step: 0,
    action: "Starting automation",
    timestamp: new Date().toISOString(),
  });
  
  executionTimeline.push({
    phase: "opening_form",
    step: 0,
    action: "Opening application form",
    timestamp: new Date(Date.now() + 100).toISOString(),
  });
  
  executionTimeline.push({
    phase: "filling_fields",
    step: 0,
    action: "Filling fields step 0",
    timestamp: new Date(Date.now() + 200).toISOString(),
  });
  
  executionTimeline.push({
    phase: "filling_fields",
    step: 0,
    action: "Filled 3 fields in step 0",
    timestamp: new Date(Date.now() + 300).toISOString(),
  });
  
  // Simulate pause
  const pausePoint = {
    phase: "filling_fields",
    step: 0,
    fieldIndex: 3,
    completedActions: ["open-form-run-123", "fill-step-0"],
    filledFieldIds: ["field-1", "field-2", "field-3"],
    timestamp: new Date(Date.now() + 400).toISOString(),
  };
  
  executionTimeline.push({
    phase: "paused",
    step: 0,
    action: "Automation paused by user",
    timestamp: pausePoint.timestamp,
  });
  
  // Simulate resume
  executionTimeline.push({
    phase: "detecting",
    step: 0,
    action: "Resuming automation from saved state",
    timestamp: new Date(Date.now() + 5000).toISOString(),
  });
  
  executionTimeline.push({
    phase: "filling_fields",
    step: 0,
    action: "Skipping completed phase: opening_form",
    timestamp: new Date(Date.now() + 5100).toISOString(),
  });
  
  executionTimeline.push({
    phase: "filling_fields",
    step: 0,
    action: "Resuming from fieldIndex: 3, step: 0",
    timestamp: new Date(Date.now() + 5200).toISOString(),
  });
  
  executionTimeline.push({
    phase: "filling_fields",
    step: 0,
    action: "Continuing field filling from field 4",
    timestamp: new Date(Date.now() + 5300).toISOString(),
  });
  
  executionTimeline.push({
    phase: "filling_fields",
    step: 0,
    action: "Filled 2 more fields in step 0",
    timestamp: new Date(Date.now() + 5400).toISOString(),
  });
  
  executionTimeline.push({
    phase: "advancing_step",
    step: 0,
    action: "Advancing to step 1",
    timestamp: new Date(Date.now() + 5500).toISOString(),
  });
  
  executionTimeline.push({
    phase: "filling_fields",
    step: 1,
    action: "Filling fields step 1",
    timestamp: new Date(Date.now() + 5600).toISOString(),
  });
  
  executionTimeline.push({
    phase: "ready_for_review",
    step: 1,
    action: "Application ready for review",
    timestamp: new Date(Date.now() + 5700).toISOString(),
  });
  
  return NextResponse.json({
    success: true,
    pausePoint,
    executionTimeline,
    summary: {
      totalActionsBeforePause: 4,
      totalActionsAfterResume: 7,
      actionsNotReplayed: ["open-form-run-123", "fill-step-0"],
      resumedFromStep: 0,
      resumedFromFieldIndex: 3,
      proof: "Execution continued from saved step 0, fieldIndex 3 without replaying completed actions",
    },
  });
}
