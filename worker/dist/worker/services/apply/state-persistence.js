"use strict";
/**
 * State persistence service for pause/resume functionality
 * Stores automation run state in Firebase for recovery
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.statePersistenceService = exports.StatePersistenceService = void 0;
const firestore_1 = require("firebase/firestore");
const firebase_1 = require("@/lib/firebase");
class StatePersistenceService {
    /**
     * Save initial run state when automation starts
     */
    async initializeRun(state) {
        if (!(0, firebase_1.isFirebaseConfigured)()) {
            throw new Error("Firebase environment variables are missing.");
        }
        const collection = (0, firebase_1.getUserAutomationStateCollection)(state.userId);
        const docRef = (0, firestore_1.doc)(collection, state.runId);
        const initialState = {
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
        await (0, firestore_1.setDoc)(docRef, initialState);
    }
    /**
     * Update run state during execution
     */
    async updateRunState(userId, runId, updates) {
        if (!(0, firebase_1.isFirebaseConfigured)()) {
            throw new Error("Firebase environment variables are missing.");
        }
        const collection = (0, firebase_1.getUserAutomationStateCollection)(userId);
        const docRef = (0, firestore_1.doc)(collection, runId);
        await (0, firestore_1.updateDoc)(docRef, updates);
    }
    /**
     * Pause automation and persist state
     */
    async pauseRun(userId, runId, options) {
        if (!(0, firebase_1.isFirebaseConfigured)()) {
            throw new Error("Firebase environment variables are missing.");
        }
        const collection = (0, firebase_1.getUserAutomationStateCollection)(userId);
        const docRef = (0, firestore_1.doc)(collection, runId);
        await (0, firestore_1.updateDoc)(docRef, {
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
    async resumeRun(userId, runId) {
        if (!(0, firebase_1.isFirebaseConfigured)()) {
            throw new Error("Firebase environment variables are missing.");
        }
        const collection = (0, firebase_1.getUserAutomationStateCollection)(userId);
        const docRef = (0, firestore_1.doc)(collection, runId);
        const snapshot = await (0, firestore_1.getDoc)(docRef);
        if (!snapshot.exists()) {
            return null;
        }
        const state = snapshot.data();
        // Update resume timestamp
        await (0, firestore_1.updateDoc)(docRef, {
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
    async completeRun(userId, runId, finalState, metadata) {
        if (!(0, firebase_1.isFirebaseConfigured)()) {
            throw new Error("Firebase environment variables are missing.");
        }
        const collection = (0, firebase_1.getUserAutomationStateCollection)(userId);
        const docRef = (0, firestore_1.doc)(collection, runId);
        await (0, firestore_1.updateDoc)(docRef, {
            state: finalState,
            completedAt: new Date().toISOString(),
            metadata,
        });
    }
    /**
     * Load saved run state
     */
    async loadRunState(userId, runId) {
        if (!(0, firebase_1.isFirebaseConfigured)()) {
            throw new Error("Firebase environment variables are missing.");
        }
        const collection = (0, firebase_1.getUserAutomationStateCollection)(userId);
        const docRef = (0, firestore_1.doc)(collection, runId);
        const snapshot = await (0, firestore_1.getDoc)(docRef);
        if (!snapshot.exists()) {
            return null;
        }
        return snapshot.data();
    }
    /**
     * Get all paused runs for a user
     */
    async getPausedRuns(userId) {
        if (!(0, firebase_1.isFirebaseConfigured)()) {
            return [];
        }
        const collection = (0, firebase_1.getUserAutomationStateCollection)(userId);
        const q = (0, firestore_1.query)(collection, (0, firestore_1.where)("state", "==", "awaiting_user"));
        const snapshot = await (0, firestore_1.getDocs)(q);
        return snapshot.docs.map((doc) => doc.data());
    }
    /**
     * Delete run state (cleanup after completion or cancellation)
     */
    async deleteRunState(userId, runId) {
        if (!(0, firebase_1.isFirebaseConfigured)()) {
            throw new Error("Firebase environment variables are missing.");
        }
        const collection = (0, firebase_1.getUserAutomationStateCollection)(userId);
        const docRef = (0, firestore_1.doc)(collection, runId);
        await (0, firestore_1.deleteDoc)(docRef);
    }
    /**
     * Update field state during automation
     */
    async updateFieldState(userId, runId, fieldId, action) {
        const state = await this.loadRunState(userId, runId);
        if (!state) {
            throw new Error("Run state not found.");
        }
        const updates = {};
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
exports.StatePersistenceService = StatePersistenceService;
// Singleton instance
exports.statePersistenceService = new StatePersistenceService();
