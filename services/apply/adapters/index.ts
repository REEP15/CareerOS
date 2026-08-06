/**
 * Adapter registration
 * Mirrors v0_phase3/adapters/index.ts with SmartRecruiters instead of iCIMS
 */

import type { SiteAdapter } from "./base";
import { AdapterRegistry } from "./base";
import { AshbyAdapter } from "./ashby";
import { GreenhouseAdapter } from "./greenhouse";
import { IndeedAdapter } from "./indeed";
import { LeverAdapter } from "./lever";
import { NaukriAdapter } from "./naukri";
import { WellfoundAdapter } from "./wellfound";
import { WorkableAdapter } from "./workable";
import { WorkdayAdapter } from "./workday";
import { SmartRecruitersAdapter } from "./smartrecruiters";

/** All supported site adapters, in detection priority order. */
export function createDefaultAdapters(): SiteAdapter[] {
  return [
    // Dedicated ATS platforms (most specific DOM signatures first).
    new GreenhouseAdapter(),
    new LeverAdapter(),
    new WorkdayAdapter(),
    new AshbyAdapter(),
    new SmartRecruitersAdapter(),
    new WorkableAdapter(),
    // Job boards.
    new NaukriAdapter(),
    new IndeedAdapter(),
    new WellfoundAdapter(),
  ];
}

/** Build a registry with all supported adapters */
export function buildRegistry(): AdapterRegistry {
  return new AdapterRegistry().registerAll(createDefaultAdapters());
}

export {
  AshbyAdapter,
  GreenhouseAdapter,
  IndeedAdapter,
  LeverAdapter,
  NaukriAdapter,
  WellfoundAdapter,
  WorkableAdapter,
  WorkdayAdapter,
  SmartRecruitersAdapter,
};