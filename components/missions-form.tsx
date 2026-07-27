"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { MissionInput } from "@/types/mission";

type MissionResponse =
  | { success: true; mission: MissionInput }
  | { success: false; error: string };

const EMPTY_MISSION: MissionInput = {
  name: "",
  keywords: [],
  excludedKeywords: [],
  locations: [],
  remote: false,
  minimumMatch: 60,
  sources: [],
  active: true,
};

const MISSION_PRESETS: Record<string, MissionInput> = {
  "Software Engineer": {
    name: "Software Engineer",
    keywords: ["software engineer", "developer", "programming", "software development", "coding"],
    excludedKeywords: ["intern", "junior", "entry level"],
    locations: ["Remote", "San Francisco", "New York", "Seattle"],
    remote: true,
    minimumMatch: 70,
    sources: ["LinkedIn", "Wellfound", "Greenhouse", "Lever"],
    active: true,
  },
  "Frontend Developer": {
    name: "Frontend Developer",
    keywords: ["frontend", "react", "vue", "angular", "javascript", "typescript", "ui", "ux"],
    excludedKeywords: ["intern", "junior", "entry level"],
    locations: ["Remote", "San Francisco", "New York", "Austin"],
    remote: true,
    minimumMatch: 70,
    sources: ["LinkedIn", "Wellfound", "Greenhouse"],
    active: true,
  },
  "Backend Developer": {
    name: "Backend Developer",
    keywords: ["backend", "api", "server", "database", "nodejs", "python", "java", "go"],
    excludedKeywords: ["intern", "junior", "entry level"],
    locations: ["Remote", "San Francisco", "Seattle", "Boston"],
    remote: true,
    minimumMatch: 70,
    sources: ["LinkedIn", "Wellfound", "Greenhouse"],
    active: true,
  },
  "Full Stack Developer": {
    name: "Full Stack Developer",
    keywords: ["full stack", "fullstack", "frontend", "backend", "react", "nodejs", "typescript"],
    excludedKeywords: ["intern", "junior", "entry level"],
    locations: ["Remote", "San Francisco", "New York", "Seattle"],
    remote: true,
    minimumMatch: 70,
    sources: ["LinkedIn", "Wellfound", "Greenhouse", "Lever"],
    active: true,
  },
  "AI Engineer": {
    name: "AI Engineer",
    keywords: ["ai engineer", "machine learning", "ml", "artificial intelligence", "deep learning", "llm"],
    excludedKeywords: ["intern", "junior", "entry level"],
    locations: ["Remote", "San Francisco", "New York", "Seattle"],
    remote: true,
    minimumMatch: 75,
    sources: ["LinkedIn", "Wellfound", "Greenhouse"],
    active: true,
  },
  "Machine Learning Engineer": {
    name: "Machine Learning Engineer",
    keywords: ["machine learning", "ml engineer", "data science", "python", "tensorflow", "pytorch"],
    excludedKeywords: ["intern", "junior", "entry level"],
    locations: ["Remote", "San Francisco", "New York", "Seattle"],
    remote: true,
    minimumMatch: 75,
    sources: ["LinkedIn", "Wellfound", "Greenhouse"],
    active: true,
  },
  "Data Scientist": {
    name: "Data Scientist",
    keywords: ["data scientist", "data science", "analytics", "python", "sql", "statistics"],
    excludedKeywords: ["intern", "junior", "entry level"],
    locations: ["Remote", "San Francisco", "New York", "Boston"],
    remote: true,
    minimumMatch: 70,
    sources: ["LinkedIn", "Wellfound", "Greenhouse"],
    active: true,
  },
  "DevOps Engineer": {
    name: "DevOps Engineer",
    keywords: ["devops", "aws", "kubernetes", "docker", "ci/cd", "infrastructure", "cloud"],
    excludedKeywords: ["intern", "junior", "entry level"],
    locations: ["Remote", "San Francisco", "Seattle", "Austin"],
    remote: true,
    minimumMatch: 70,
    sources: ["LinkedIn", "Wellfound", "Greenhouse"],
    active: true,
  },
  "Cloud Engineer": {
    name: "Cloud Engineer",
    keywords: ["cloud engineer", "aws", "gcp", "azure", "infrastructure", "devops"],
    excludedKeywords: ["intern", "junior", "entry level"],
    locations: ["Remote", "San Francisco", "Seattle", "Austin"],
    remote: true,
    minimumMatch: 70,
    sources: ["LinkedIn", "Wellfound", "Greenhouse"],
    active: true,
  },
  "Cybersecurity Analyst": {
    name: "Cybersecurity Analyst",
    keywords: ["cybersecurity", "security", "information security", "penetration testing", "infosec"],
    excludedKeywords: ["intern", "junior", "entry level"],
    locations: ["Remote", "Washington DC", "New York", "San Francisco"],
    remote: true,
    minimumMatch: 70,
    sources: ["LinkedIn", "Wellfound", "Greenhouse"],
    active: true,
  },
  "Product Manager": {
    name: "Product Manager",
    keywords: ["product manager", "pm", "product", "agile", "scrum", "roadmap"],
    excludedKeywords: ["intern", "junior", "associate"],
    locations: ["Remote", "San Francisco", "New York", "Seattle"],
    remote: true,
    minimumMatch: 65,
    sources: ["LinkedIn", "Wellfound", "Greenhouse", "Lever"],
    active: true,
  },
  "UI/UX Designer": {
    name: "UI/UX Designer",
    keywords: ["ui designer", "ux designer", "product designer", "figma", "design", "user experience"],
    excludedKeywords: ["intern", "junior", "entry level"],
    locations: ["Remote", "San Francisco", "New York", "Los Angeles"],
    remote: true,
    minimumMatch: 65,
    sources: ["LinkedIn", "Wellfound", "Greenhouse"],
    active: true,
  },
};

function parseList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

type MissionsFormProps = {
  initialData?: MissionInput & { id?: string };
  isEdit?: boolean;
  redirectPath?: string;
};

export function MissionsForm({ initialData = EMPTY_MISSION, isEdit = false, redirectPath = "/missions" }: MissionsFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<MissionInput>(initialData);
  const [isPending, startTransition] = useTransition();
  const [selectedPreset, setSelectedPreset] = useState("");

  const handlePresetChange = (presetName: string) => {
    setSelectedPreset(presetName);
    if (presetName && MISSION_PRESETS[presetName]) {
      setForm(MISSION_PRESETS[presetName]);
    }
  };

  const handleSave = () => {
    startTransition(async () => {
      try {
        const response = await fetch("/api/missions", {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(isEdit ? { id: initialData.id as string, action: "update", data: form } : form),
        });
        const payload = (await response.json()) as MissionResponse;

        if (!response.ok || !payload.success) {
          toast.error(payload.success ? "Failed to save mission." : payload.error);
          return;
        }

        toast.success(isEdit ? "Mission updated." : "Mission created.");
        router.push(redirectPath);
      } catch {
        toast.error("An unexpected error occurred.");
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? "Edit Mission" : "Create Mission"}</CardTitle>
        <CardDescription>Define targeted job search criteria</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {!isEdit && (
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="preset">Start with a preset</Label>
            <Select
              id="preset"
              value={selectedPreset}
              onChange={(event) => handlePresetChange(event.target.value)}
            >
              <option value="">Custom mission</option>
              {Object.keys(MISSION_PRESETS).map((preset) => (
                <option key={preset} value={preset}>
                  {preset}
                </option>
              ))}
            </Select>
          </div>
        )}
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="Senior Frontend — Remote"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="keywords">Keywords (comma-separated)</Label>
          <Input
            id="keywords"
            value={form.keywords.join(", ")}
            onChange={(event) => setForm({ ...form, keywords: parseList(event.target.value) })}
            placeholder="react, typescript, frontend"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="excludedKeywords">Excluded keywords</Label>
          <Input
            id="excludedKeywords"
            value={form.excludedKeywords.join(", ")}
            onChange={(event) => setForm({ ...form, excludedKeywords: parseList(event.target.value) })}
            placeholder="intern, junior"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="locations">Locations</Label>
          <Input
            id="locations"
            value={form.locations.join(", ")}
            onChange={(event) => setForm({ ...form, locations: parseList(event.target.value) })}
            placeholder="Remote, San Francisco"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sources">Sources</Label>
          <Input
            id="sources"
            value={form.sources.join(", ")}
            onChange={(event) => setForm({ ...form, sources: parseList(event.target.value) })}
            placeholder="LinkedIn, Wellfound"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="minimumMatch">Minimum match %</Label>
          <Input
            id="minimumMatch"
            type="number"
            min={0}
            max={100}
            value={form.minimumMatch}
            onChange={(event) =>
              setForm({ ...form, minimumMatch: Number.parseInt(event.target.value, 10) || 0 })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="minimumSalary">Minimum salary</Label>
          <Input
            id="minimumSalary"
            type="number"
            min={0}
            value={form.minimumSalary ?? ""}
            onChange={(event) =>
              setForm({
                ...form,
                minimumSalary: event.target.value ? Number.parseInt(event.target.value, 10) : undefined,
              })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="remote">Remote only</Label>
          <Select
            id="remote"
            value={form.remote ? "true" : "false"}
            onChange={(event) => setForm({ ...form, remote: event.target.value === "true" })}
          >
            <option value="false">No</option>
            <option value="true">Yes</option>
          </Select>
        </div>
        <div className="flex gap-2 sm:col-span-2">
          <Button onClick={handleSave} disabled={isPending || !form.name}>
            {isPending ? "Saving..." : isEdit ? "Update Mission" : "Create Mission"}
          </Button>
          <Button variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
