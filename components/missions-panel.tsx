"use client";

import { useEffect, useState, useTransition } from "react";
import { Copy, Pencil, Plus, Power, PowerOff, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import { EmptyMissions } from "@/components/empty-states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { authFetch } from "@/lib/auth-fetch";
import type { Mission, MissionInput } from "@/types/mission";

type MissionsResponse =
  | { success: true; missions: Mission[] }
  | { success: false; error: string };

type MissionResponse =
  | { success: true; mission: Mission; error?: string }
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

export function MissionsPanel() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [form, setForm] = useState<MissionInput>(EMPTY_MISSION);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  const loadMissions = () => {
    void authFetch("/api/missions")
      .then((response) => response.json())
      .then((payload: MissionsResponse) => {
        if (payload.success) {
          setMissions(payload.missions);
        }
      });
  };

  useEffect(() => {
    loadMissions();
  }, []);

  const handleSave = () => {
    startTransition(async () => {
      try {
        const response = await authFetch("/api/missions", {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            editingId ? { id: editingId, action: "update", data: form } : form,
          ),
        });
        const payload = (await response.json()) as MissionResponse;

        if (!response.ok || !payload.success) {
          toast.error(payload.error || "Failed to save mission.");
          return;
        }

        toast.success(editingId ? "Mission updated." : "Mission created.");
        setShowForm(false);
        setEditingId(null);
        setForm(EMPTY_MISSION);
        loadMissions();
      } catch {
        toast.error("An unexpected error occurred.");
      }
    });
  };

  const handleAction = (id: string, action: "delete" | "duplicate" | "enable" | "disable") => {
    startTransition(async () => {
      try {
        const response = await authFetch("/api/missions", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, action }),
        });
        const payload = (await response.json()) as MissionResponse;

        if (!response.ok || !payload.success) {
          toast.error(payload.error || "Action failed.");
          return;
        }

        toast.success(`Mission ${action === "delete" ? "deleted" : action + "d"}.`);
        loadMissions();
      } catch {
        toast.error("An unexpected error occurred.");
      }
    });
  };

  const startEdit = (mission: Mission) => {
    setEditingId(mission.id);
    setForm({
      name: mission.name,
      keywords: mission.keywords,
      excludedKeywords: mission.excludedKeywords,
      locations: mission.locations,
      remote: mission.remote,
      minimumSalary: mission.minimumSalary,
      minimumMatch: mission.minimumMatch,
      sources: mission.sources,
      active: mission.active,
    });
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditingId(null);
            setForm(EMPTY_MISSION);
            setShowForm(true);
          }}
        >
          <Plus className="h-4 w-4" />
          New Mission
        </Button>
      </div>

      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit Mission" : "Create Mission"}</CardTitle>
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
                {isPending ? "Saving..." : editingId ? "Update Mission" : "Create Mission"}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {missions.length === 0 && !showForm ? (
        <EmptyMissions />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {missions.map((mission) => (
            <Card key={mission.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {mission.name}
                    <Badge variant={mission.active ? "success" : "secondary"}>
                      {mission.active ? "Active" : "Inactive"}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {mission.keywords.join(", ") || "No keywords"} · Min match {mission.minimumMatch}%
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  <p>Locations: {mission.locations.join(", ") || "Any"}</p>
                  <p>Sources: {mission.sources.join(", ") || "All"}</p>
                  {mission.remote ? <p>Remote only</p> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => startEdit(mission)}>
                    <Pencil className="h-3 w-3" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction(mission.id, mission.active ? "disable" : "enable")}
                    disabled={isPending}
                  >
                    {mission.active ? <PowerOff className="h-3 w-3" /> : <Power className="h-3 w-3" />}
                    {mission.active ? "Disable" : "Enable"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction(mission.id, "duplicate")}
                    disabled={isPending}
                  >
                    <Copy className="h-3 w-3" />
                    Duplicate
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction(mission.id, "delete")}
                    disabled={isPending}
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
