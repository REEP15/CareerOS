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
