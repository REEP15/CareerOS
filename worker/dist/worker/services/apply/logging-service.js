"use strict";
/**
 * Structured automation logging system
 * Captures and stores detailed logs during automation runs
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.automationLoggingService = exports.AutomationLoggingService = void 0;
const firestore_1 = require("firebase/firestore");
const firebase_1 = require("@/lib/firebase");
class AutomationLoggingService {
    /**
     * Log an automation event
     */
    async log(entry) {
        if (!(0, firebase_1.isFirebaseConfigured)()) {
            console.log(`[${entry.level.toUpperCase()}] ${entry.message}`, entry.data);
            return;
        }
        const collection = (0, firebase_1.getUserAutomationLogsCollection)(entry.userId);
        await (0, firestore_1.addDoc)(collection, {
            ...entry,
            timestamp: new Date().toISOString(),
        });
    }
    /**
     * Get logs for a specific run
     */
    async getRunLogs(userId, runId) {
        if (!(0, firebase_1.isFirebaseConfigured)()) {
            return [];
        }
        const collection = (0, firebase_1.getUserAutomationLogsCollection)(userId);
        const q = (0, firestore_1.query)(collection, (0, firestore_1.where)("runId", "==", runId), (0, firestore_1.orderBy)("timestamp", "asc"));
        const snapshot = await (0, firestore_1.getDocs)(q);
        return snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
            };
        });
    }
    /**
     * Get logs for a specific job (across all runs)
     */
    async getJobLogs(userId, jobId) {
        if (!(0, firebase_1.isFirebaseConfigured)()) {
            return [];
        }
        const collection = (0, firebase_1.getUserAutomationLogsCollection)(userId);
        const q = (0, firestore_1.query)(collection, (0, firestore_1.where)("jobId", "==", jobId), (0, firestore_1.orderBy)("timestamp", "desc"));
        const snapshot = await (0, firestore_1.getDocs)(q);
        return snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
            };
        });
    }
    /**
     * Get logs for a specific run and job
     */
    async getLogsByRun(userId, jobId, runId) {
        if (!(0, firebase_1.isFirebaseConfigured)()) {
            return [];
        }
        const collection = (0, firebase_1.getUserAutomationLogsCollection)(userId);
        let q = (0, firestore_1.query)(collection, (0, firestore_1.where)("jobId", "==", jobId), (0, firestore_1.orderBy)("timestamp", "asc"));
        if (runId) {
            q = (0, firestore_1.query)(collection, (0, firestore_1.where)("jobId", "==", jobId), (0, firestore_1.where)("runId", "==", runId), (0, firestore_1.orderBy)("timestamp", "asc"));
        }
        const snapshot = await (0, firestore_1.getDocs)(q);
        return snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
            };
        });
    }
    /**
     * Get logs by level
     */
    async getLogsByLevel(userId, runId, level) {
        if (!(0, firebase_1.isFirebaseConfigured)()) {
            return [];
        }
        const collection = (0, firebase_1.getUserAutomationLogsCollection)(userId);
        const q = (0, firestore_1.query)(collection, (0, firestore_1.where)("runId", "==", runId), (0, firestore_1.where)("level", "==", level), (0, firestore_1.orderBy)("timestamp", "asc"));
        const snapshot = await (0, firestore_1.getDocs)(q);
        return snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
            };
        });
    }
    /**
     * Get error logs for a run
     */
    async getErrorLogs(userId, runId) {
        return this.getLogsByLevel(userId, runId, "error");
    }
    /**
     * Clear logs for a specific run
     */
    async clearRunLogs(userId, runId) {
        if (!(0, firebase_1.isFirebaseConfigured)()) {
            return;
        }
        const logs = await this.getRunLogs(userId, runId);
        const collection = (0, firebase_1.getUserAutomationLogsCollection)(userId);
        for (const log of logs) {
            if (log.id) {
                await (0, firestore_1.setDoc)((0, firestore_1.doc)(collection, log.id), { deleted: true }, { merge: true });
            }
        }
    }
}
exports.AutomationLoggingService = AutomationLoggingService;
// Singleton instance
exports.automationLoggingService = new AutomationLoggingService();
