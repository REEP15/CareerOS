import Link from "next/link";
import { ArrowRight, BarChart3, Briefcase, FileText, MessageSquare, Sparkles, Target, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 py-24 sm:px-6 lg:px-8">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        </div>
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center text-center">
            <div className="mb-6 inline-flex items-center rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium tracking-[0.2em] text-primary uppercase">
              CareerOS
            </div>
            <h1 className="mb-6 max-w-4xl text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
              Your AI-Powered Career Operating System
            </h1>
            <p className="mb-10 max-w-2xl text-lg text-muted-foreground sm:text-xl">
              Find matching jobs, optimize resumes, generate cover letters, track applications, and use AI to improve interview success.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Link href="/signup">
                <Button size="lg" className="gap-2">
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline">
                  Login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              Everything you need to accelerate your career
            </h2>
            <p className="text-lg text-muted-foreground">
              Powered by AI, designed for your success
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<Target className="h-6 w-6" />}
              title="AI Job Matching"
              description="Intelligent matching algorithms find jobs that align with your skills, experience, and career goals."
            />
            <FeatureCard
              icon={<FileText className="h-6 w-6" />}
              title="Resume Optimization"
              description="AI-powered analysis and optimization to make your resume stand out to recruiters and ATS systems."
            />
            <FeatureCard
              icon={<Sparkles className="h-6 w-6" />}
              title="Cover Letter Generation"
              description="Generate personalized, compelling cover letters tailored to each job application in seconds."
            />
            <FeatureCard
              icon={<BarChart3 className="h-6 w-6" />}
              title="Application Tracking"
              description="Track all your applications in one place with status updates and analytics on your pipeline."
            />
            <FeatureCard
              icon={<Zap className="h-6 w-6" />}
              title="Multi-AI Support"
              description="Leverage multiple AI models for comprehensive analysis and generation capabilities."
            />
            <FeatureCard
              icon={<Briefcase className="h-6 w-6" />}
              title="Career Analytics"
              description="Data-driven insights into your job search performance and areas for improvement."
            />
          </div>
        </div>
      </section>

      {/* Metrics Section */}
      <section className="px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              Trusted by job seekers worldwide
            </h2>
            <p className="text-lg text-muted-foreground">
              Real results from real users
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard value="25,000+" label="Jobs Matched" />
            <MetricCard value="100,000+" label="Applications Managed" />
            <MetricCard value="50,000+" label="Documents Generated" />
            <MetricCard value="91%" label="Average Match Score" />
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section className="px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              How it works
            </h2>
            <p className="text-lg text-muted-foreground">
              A streamlined workflow from upload to offer
            </p>
          </div>
          <div className="relative">
            <div className="absolute left-8 top-0 h-full w-0.5 bg-border lg:left-1/2 lg:-ml-px" />
            <div className="space-y-12">
              <WorkflowStep
                step="1"
                title="Resume Upload"
                description="Upload your resume and let AI analyze your skills, experience, and qualifications."
                reverse={false}
              />
              <WorkflowStep
                step="2"
                title="AI Skill Analysis"
                description="Our AI extracts and analyzes your skills to build a comprehensive profile."
                reverse={true}
              />
              <WorkflowStep
                step="3"
                title="Job Matching"
                description="Get matched with jobs that fit your profile based on skills, experience, and preferences."
                reverse={false}
              />
              <WorkflowStep
                step="4"
                title="Resume + Cover Letter Generation"
                description="AI generates tailored resumes and cover letters for each matched position."
                reverse={true}
              />
              <WorkflowStep
                step="5"
                title="Application Tracking"
                description="Track all your applications with status updates and follow-up reminders."
                reverse={false}
              />
              <WorkflowStep
                step="6"
                title="Interview Preparation"
                description="Get AI-powered interview coaching and preparation for your scheduled interviews."
                reverse={true}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              What our users say
            </h2>
            <p className="text-lg text-muted-foreground">
              Success stories from CareerOS users
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <TestimonialCard
              name="Sarah Chen"
              role="Software Engineer"
              content="CareerOS helped me land my dream job at a top tech company. The AI matching was incredibly accurate, and the generated cover letters saved me hours of work."
            />
            <TestimonialCard
              name="Michael Rodriguez"
              role="Product Manager"
              content="The application tracking feature alone is worth it. I can finally see where I am in the pipeline with every company. The analytics helped me improve my approach."
            />
            <TestimonialCard
              name="Emily Watson"
              role="Data Scientist"
              content="I was skeptical about AI-generated resumes, but CareerOS proved me wrong. My resume got past ATS systems that had rejected me before. Highly recommend!"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl">Ready to transform your job search?</CardTitle>
              <CardDescription className="text-lg">
                Join thousands of job seekers who have accelerated their careers with CareerOS
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Link href="/signup">
                <Button size="lg" className="gap-2">
                  Get Started Free
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium tracking-[0.2em] text-primary uppercase">
                CareerOS
              </div>
              <p className="text-sm text-muted-foreground">
                Your AI-Powered Career Operating System
              </p>
            </div>
            <div className="flex gap-6 text-sm">
              <Link href="#" className="text-muted-foreground hover:text-foreground">
                About
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-foreground">
                Features
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-foreground">
                Privacy
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-foreground">
                GitHub
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-foreground">
                Contact
              </Link>
            </div>
          </div>
          <div className="mt-8 text-center text-sm text-muted-foreground">
            © 2026 CareerOS. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card className="transition-all hover:shadow-lg">
      <CardHeader>
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </div>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription>{description}</CardDescription>
      </CardContent>
    </Card>
  );
}

function MetricCard({ value, label }: { value: string; label: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-4xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription>{label}</CardDescription>
      </CardContent>
    </Card>
  );
}

function WorkflowStep({ step, title, description, reverse }: { step: string; title: string; description: string; reverse: boolean }) {
  return (
    <div className={`relative flex gap-8 ${reverse ? "lg:flex-row-reverse" : ""}`}>
      <div className="flex-1 lg:w-1/2">
        <Card className="h-full">
          <CardHeader>
            <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
              {step}
            </div>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-base">{description}</CardDescription>
          </CardContent>
        </Card>
      </div>
      <div className="hidden lg:block lg:w-1/2" />
    </div>
  );
}

function TestimonialCard({ name, role, content }: { name: string; role: string; content: string }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <MessageSquare className="mb-4 h-8 w-8 text-primary" />
        <CardDescription className="text-base leading-relaxed">{content}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="font-semibold">{name}</div>
        <div className="text-sm text-muted-foreground">{role}</div>
      </CardContent>
    </Card>
  );
}
