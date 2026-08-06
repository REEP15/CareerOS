import type { JobCollector } from "@/types/collector";

import { LinkedInCollector } from "../collector/linkedin";
import { WellfoundCollector } from "../collector/wellfound";

export const collectors: JobCollector[] = [
  new LinkedInCollector(),
  new WellfoundCollector(),
];
