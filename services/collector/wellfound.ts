import { BaseCollector } from "@/services/collector/base";

export class WellfoundCollector extends BaseCollector {
  name = "Wellfound";

  async collect() {
    return this.normalizeJobs([
      {
        title: "AI Engineer",
        company: "OpenAI",
        location: "Remote",
        salary: "₹8-12 LPA",
        description:
          "Work on production AI features, evaluation loops, and internal tooling that support fast iteration across teams.",
        applyUrl: "https://wellfound.com/jobs/mock-openai-ai-engineer",
      },
      {
        title: "Product Engineer",
        company: "Linear",
        location: "Remote",
        salary: "₹24-32 LPA",
        description:
          "Build fast product surfaces with React and TypeScript while contributing to backend APIs and shared design infrastructure.",
        applyUrl: "https://wellfound.com/jobs/mock-linear-product-engineer",
      },
      {
        title: "Frontend Engineer",
        company: "Vercel",
        location: "Bengaluru, India",
        salary: "₹20-28 LPA",
        description:
          "Help shape customer-facing interfaces across the platform with strong attention to detail, accessibility, and runtime quality.",
        applyUrl: "https://wellfound.com/jobs/mock-vercel-frontend-engineer",
      },
      {
        title: "Developer Experience Engineer",
        company: "PostHog",
        location: "Remote",
        salary: "₹16-24 LPA",
        description:
          "Improve onboarding, SDK documentation, and feedback loops for developers building on the product.",
        applyUrl: "https://wellfound.com/jobs/mock-posthog-devex-engineer",
      },
    ]);
  }
}
