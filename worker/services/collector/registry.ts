import type { JobCollector } from "../../../../shared/types/collector";

import { LinkedInCollector } from "@/services/collector/linkedin";
import { WellfoundCollector } from "@/services/collector/wellfound";

export const collectors: JobCollector[] = [
  new LinkedInCollector(),
  new WellfoundCollector(),
];
