/**
 * State persistence service for pause/resume functionality
 * Stores automation run state in Firebase for recovery
 */

import { doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, query, where } from "firebase/firestore";
import { getUserAutomationStateCollection, isFirebaseConfigured } from "@/lib/firebase";
import type { RunState } from "@/types/automation";

export type ExecutionPhase = 
  | "detecting"
  | "navigating"
  | "opening_form"
  | "filling_fields"
  | "advancing_step"
  | "ready_for_review"
  | "submitting"
  | "completed"
  | "paused"
  | "error";

export interface AutomationRunState {
  runId: string;
  userId: string;
  jobId: string;
  state: RunState;
  step: string;
  startedAt: string;
  pausedAt?: string;
  resumedAt?: string;
  completedAt?: string;
  context: {
    company: string;
    jobTitle: string;
    jobUrl: string;
    source: string;
  };
  fieldState: {
    filledFieldIds: string[];
    pendingFieldIds: string[];
    skippedFieldIds: string[];
  };
  executionState: {
    phase: ExecutionPhase;
    currentStepIndex: number;
    currentUrl: string;
    lastAction: string;
    adapterId: string;
    usedGenericFallback: boolean;
    filledFields: number;
    skippedFields: number;
    userAnsweredFields: number;
    fieldIndex: number; // Current field index within the current step
    completedActions: string[]; // List of completed action IDs
  };
  pendingConfirmation?: {
    fieldId: string;
    question: string;
    proposedAnswer?: any;
    timestamp: string;
  };
  browserState?: {
    cookies: string;
    localStorage: string;
    sessionStorage: string;
  };
  error?: {
    message: string;
    step: string;
    timestamp: string;
  };
  metadata: {
    adapterId?: string;
    usedGenericFallback?: boolean;
    totalFields?: number;
    filledFields?: number;
    skippedFields?: number;
    userAnsweredFields?: number;
  };
}

export interface PauseOptions {
  reason: string;
  step: string;
  phase?: ExecutionPhase;
  fieldState?: {
    filledFieldIds: string[];
    pendingFieldIds: string[];
    skippedFieldIds: string[];
  };
  executionState?: Partial<AutomationRunState["executionState"]>;
  pendingConfirmation?: AutomationRunState["pendingConfirmation"];
  browserState?: AutomationRunState["browserState"];
  error?: AutomationRunState["error"];
  metadata?: Partial<AutomationRunState["metadata"]>;
}

export class StatePersistenceService {
  /**
   * Save initial run state when automation starts
   */
  async initializeRun(state: {
    runId: string;
    userId: string;
    jobId: string;
    context: AutomationRunState["context"];
    executionState?: AutomationRunState["executionState"];
  }): Promise<void> {
    if (!isFirebaseConfigured()) {
      throw new Error("Firebase environment variables are missing.");
    }

    const collection = getUserAutomationStateCollection(state.userId);
    const docRef = doc(collection, state.runId);

    const initialState: AutomationRunState = {
      ...state,
      state: "detecting",
      step: "initialization",
      startedAt: new Date().toISOString(),
      fieldState: {
        filledFieldIds: [],
        pendingFieldIds: [],
        skippedFieldIds: [],
      },
      executionState: state.executionState || {
        phase: "detecting",
        currentStepIndex: 0,
        currentUrl: state.context.jobUrl,
        lastAction: "initialization",
        adapterId: "",
        usedGenericFallback: false,
        filledFields: 0,
        skippedFields: 0,
        userAnsweredFields: 0,
        fieldIndex: 0,
        completedActions: [],
      },
      metadata: {},
    };

    await setDoc(docRef, initialState);
  }

  /**
   * Update run state during execution
   */
  async updateRunState(
    userId: string,
    runId: string,
    updates: Partial<AutomationRunState>
  ): Promise<void> {
    if (!isFirebaseConfigured()) {
      throw new Error("Firebase environment variables are missing.");
    }

    const collection = getUserAutomationStateCollection(userId);
    const docRef = doc(collection, runId);

    await updateDoc(docRef, updates);
  }

  /**
   * Pause automation and persist state
   */
  async pauseRun(userId: string, runId: string, options: PauseOptions): Promise<void> {
    if (!isFirebaseConfigured()) {
      throw new Error("Firebase environment variables are missing.");
    }

    const collection = getUserAutomationStateCollection(userId);
    const docRef = doc(collection, runId);

    await updateDoc(docRef, {
      state: "awaiting_user",
      step: options.step,
      pausedAt: new Date().toISOString(),
      fieldState: options.fieldState,
      executionState: options.executionState,
      pendingConfirmation: options.pendingConfirmation,
      browserState: options.browserState,
      error: options.error,
      metadata: options.metadata,
    });
  }

  /**
   * Resume automation from paused state
   */
  async resumeRun(userId: string, runId: string): Promise<AutomationRunState | null> {
    if (!isFirebaseConfigured()) {
      throw new Error("Firebase environment variables are missing.");
    }

    const collection = getUserAutomationStateCollection(userId);
    const docRef = doc(collection, runId);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) {
      return null;
    }

    const state = snapshot.data() as AutomationRunState;

    // Update resume timestamp
    await updateDoc(docRef, {
      resumedAt: new Date().toISOString(),
      state: "detecting", // Reset to detecting for re-evaluation
    });

    return {
      ...state,
      resumedAt: new Date().toISOString(),
      state: "detecting",
    };
  }

  /**
   * Complete automation run
   */
  async completeRun(
    userId: string,
    runId: string,
    finalState: RunState,
    metadata?: Partial<AutomationRunState["metadata"]>
  ): Promise<void> {
    if (!isFirebaseConfigured()) {
      throw new Error("Firebase environment variables are missing.");
    }

    const collection = getUserAutomationStateCollection(userId);
    const docRef = doc(collection, runId);

    await updateDoc(docRef, {
      state: finalState,
      completedAt: new Date().toISOString(),
      metadata,
    });
  }

  /**
   * Load saved run state
   */
  async loadRunState(userId: string, runId: string): Promise<AutomationRunState | null> {
    if (!isFirebaseConfigured()) {
      throw new Error("Firebase environment variables are missing.");
    }

    const collection = getUserAutomationStateCollection(userId);
    const docRef = doc(collection, runId);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) {
      return null;
    }

    return snapshot.data() as AutomationRunState;
  }

  /**
   * Get all paused runs for a user
   */
  async getPausedRuns(userId: string): Promise<AutomationRunState[]> {
    if (!isFirebaseConfigured()) {
      return [];
    }

    const collection = getUserAutomationStateCollection(userId);
    const q = query(collection, where("state", "==", "awaiting_user"));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => doc.data() as AutomationRunState);
  }

  /**
   * Delete run state (cleanup after completion or cancellation)
   */
  async deleteRunState(userId: string, runId: string): Promise<void> {
    if (!isFirebaseConfigured()) {
      throw new Error("Firebase environment variables are missing.");
    }

    const collection = getUserAutomationStateCollection(userId);
    const docRef = doc(collection, runId);

    await deleteDoc(docRef);
  }

  /**
   * Update field state during automation
   */
  async updateFieldState(
    userId: string,
    runId: string,
    fieldId: string,
    action: "filled" | "pending" | "skipped"
  ): Promise<void> {
    const state = await this.loadRunState(userId, runId);
    if (!state) {
      throw new Error("Run state not found.");
    }

    const updates: Partial<AutomationRunState["fieldState"]> = {};

    switch (action) {
      case "filled":
        updates.filledFieldIds = [...state.fieldState.filledFieldIds, fieldId];
        updates.pendingFieldIds = state.fieldState.pendingFieldIds.filter((id) => id !== fieldId);
        break;
      case "pending":
        updates.pendingFieldIds = [...state.fieldState.pendingFieldIds, fieldId];
        break;
      case "skipped":
        updates.skippedFieldIds = [...state.fieldState.skippedFieldIds, fieldId];
        updates.pendingFieldIds = state.fieldState.pendingFieldIds.filter((id) => id !== fieldId);
        break;
    }

    await this.updateRunState(userId, runId, { fieldState: { ...state.fieldState, ...updates } });
  }
}

// Singleton instance
export const statePersistenceService = new StatePersistenceService();
