"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logApply = logApply;
exports.withRetry = withRetry;
function logApply(level, message, data) {
    const payload = data ? { message, ...data } : { message };
    switch (level) {
        case "info":
            console.log("[apply][info]", payload);
            break;
        case "warn":
            console.warn("[apply][warn]", payload);
            break;
        case "error":
            console.error("[apply][error]", payload);
            break;
        case "debug":
            console.debug("[apply][debug]", payload);
            break;
        default:
            console.log("[apply]", payload);
    }
}
async function withRetry(fn, options = 3, delayMs = 1500) {
    var _a, _b, _c;
    const opts = typeof options === "number"
        ? { attempts: options, delayMs }
        : { attempts: (_a = options.attempts) !== null && _a !== void 0 ? _a : 3, delayMs: (_b = options.delayMs) !== null && _b !== void 0 ? _b : delayMs, label: options.label };
    let attempt = 0;
    while (true) {
        try {
            return await fn();
        }
        catch (error) {
            attempt += 1;
            if (attempt >= ((_c = opts.attempts) !== null && _c !== void 0 ? _c : 3)) {
                const labelMsg = opts.label ? ` after ${opts.label}` : "";
                const errMsg = error instanceof Error ? error.message : String(error);
                console.warn(`[apply][retry] failed${labelMsg}: ${errMsg}`);
                throw error;
            }
            await new Promise((resolve) => { var _a; return setTimeout(resolve, (_a = opts.delayMs) !== null && _a !== void 0 ? _a : 1500); });
        }
    }
}
