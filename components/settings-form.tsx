"use client";

import { useEffect, useState, useTransition } from "react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { AppSettings } from "@/types/settings";

type SettingsResponse =
  | { success: true; settings: AppSettings }
  | { success: false; error: string };

export function SettingsForm() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    void fetch("/api/settings")
      .then((response) => response.json())
      .then((payload: SettingsResponse) => {
        if (payload.success) {
          setSettings(payload.settings);
        }
      });
  }, []);

  const handleSave = () => {
    if (!settings) {
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            aiProvider: settings.aiProvider,
            aiModel: settings.aiModel,
            playwrightHeadless: settings.playwrightHeadless,
            playwrightTimeoutMs: settings.playwrightTimeoutMs,
            preferredLocations: settings.preferredLocations,
            preferredSalaryMinimum: settings.preferredSalaryMinimum,
            theme: settings.theme,
          }),
        });
        const payload = (await response.json()) as SettingsResponse;

        if (!response.ok || !payload.success) {
          toast.error(payload.success ? "Failed to save settings." : payload.error);
          return;
        }

        setSettings(payload.settings);
        toast.success("Settings saved.");
      } catch {
        toast.error("An unexpected error occurred.");
      }
    });
  };

  if (!settings) {
    return <p className="text-sm text-muted-foreground">Loading settings...</p>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Environment</CardTitle>
          <CardDescription>Firebase and runtime configuration status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${settings.firebaseConfigured ? "bg-emerald-500" : "bg-destructive"}`}
            />
            {settings.firebaseConfigured ? "Firebase configured" : "Firebase not configured — check environment variables"}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI Provider</CardTitle>
          <CardDescription>Configure the AI provider for matching, tailoring, and cover letters</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="aiProvider">Provider</Label>
            <Select
              id="aiProvider"
              value={settings.aiProvider}
              onChange={(event) =>
                setSettings({ ...settings, aiProvider: event.target.value as AppSettings["aiProvider"] })
              }
            >
              <option value="none">None (heuristics)</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="google">Google</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="aiModel">Model</Label>
            <Input
              id="aiModel"
              value={settings.aiModel}
              onChange={(event) => setSettings({ ...settings, aiModel: event.target.value })}
              placeholder="e.g. gpt-4o"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Playwright</CardTitle>
          <CardDescription>Browser automation settings for assisted applications</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="playwrightHeadless">Headless mode</Label>
            <Select
              id="playwrightHeadless"
              value={settings.playwrightHeadless ? "true" : "false"}
              onChange={(event) =>
                setSettings({ ...settings, playwrightHeadless: event.target.value === "true" })
              }
            >
              <option value="false">Visible browser</option>
              <option value="true">Headless</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="playwrightTimeout">Timeout (ms)</Label>
            <Input
              id="playwrightTimeout"
              type="number"
              min={5000}
              max={300000}
              value={settings.playwrightTimeoutMs}
              onChange={(event) =>
                setSettings({ ...settings, playwrightTimeoutMs: Number.parseInt(event.target.value, 10) })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>Job search preferences used by matching and missions</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="preferredLocations">Preferred locations (comma-separated)</Label>
            <Input
              id="preferredLocations"
              value={settings.preferredLocations.join(", ")}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  preferredLocations: event.target.value
                    .split(",")
                    .map((location) => location.trim())
                    .filter(Boolean),
                })
              }
              placeholder="Remote, San Francisco, New York"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="preferredSalary">Minimum salary</Label>
            <Input
              id="preferredSalary"
              type="number"
              min={0}
              value={settings.preferredSalaryMinimum}
              onChange={(event) =>
                setSettings({ ...settings, preferredSalaryMinimum: Number.parseInt(event.target.value, 10) || 0 })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="theme">Theme</Label>
            <Select
              id="theme"
              value={settings.theme}
              onChange={(event) =>
                setSettings({ ...settings, theme: event.target.value as AppSettings["theme"] })
              }
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={isPending}>
        {isPending ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  );
}
