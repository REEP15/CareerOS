import { BaseCollector } from "@/services/collector/base";

export class LinkedInCollector extends BaseCollector {
  name = "LinkedIn";

  async collect() {
    return this.normalizeJobs([
      {
        title: "AI Engineer",
        company: "OpenAI",
        location: "Remote",
        salary: "₹8-12 LPA",
        description:
          "Build and improve AI-powered product workflows. Work closely with product and platform teams to ship reliable user-facing systems.",
        applyUrl: "https://www.linkedin.com/jobs/view/mock-openai-ai-engineer",
      },
      {
        title: "Frontend Engineer",
        company: "Vercel",
        location: "Bengaluru, India",
        salary: "₹20-28 LPA",
        description:
          "Own responsive product interfaces in Next.js. Partner with design to deliver polished workflows and strong developer ergonomics.",
        applyUrl: "https://www.linkedin.com/jobs/view/mock-vercel-frontend-engineer",
      },
      {
        title: "Full Stack Engineer",
        company: "Notion",
        location: "Remote",
        salary: "₹18-26 LPA",
        description:
          "Build product features end to end across TypeScript services and React applications with an emphasis on performance and maintainability.",
        applyUrl: "https://www.linkedin.com/jobs/view/mock-notion-full-stack-engineer",
      },
      {
        title: "Platform Engineer",
        company: "Stripe",
        location: "Singapore",
        salary: "₹30-40 LPA",
        description:
          "Strengthen internal platform tooling, observability, and deployment workflows for product engineering teams.",
        applyUrl: "https://www.linkedin.com/jobs/view/mock-stripe-platform-engineer",
      },
    ]);
  }
}
