"use strict";
/**
 * Base adapter interface and registry
 * Mirrors v0_phase3/adapters/base-adapter.ts and adapter-registry.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdapterRegistry = void 0;
class AdapterRegistry {
    constructor() {
        this.adapters = [];
    }
    register(adapter) {
        if (this.adapters.some((a) => a.id === adapter.id)) {
            throw new Error(`Adapter "${adapter.id}" is already registered`);
        }
        this.adapters.push(adapter);
        return this;
    }
    registerAll(adapters) {
        adapters.forEach((a) => this.register(a));
        return this;
    }
    list() {
        return this.adapters;
    }
    getAdapters() {
        return this.adapters;
    }
    /** First adapter whose `matches` returns true, or null for generic fallback. */
    async detect(page) {
        for (const adapter of this.adapters) {
            try {
                if (await adapter.matches(page))
                    return adapter;
            }
            catch {
                // A misbehaving detector must never break detection for the rest.
            }
        }
        return null;
    }
}
exports.AdapterRegistry = AdapterRegistry;
