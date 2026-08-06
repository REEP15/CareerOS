"use client";

import { useEffect, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/components/auth-provider";
import { authFetch } from "@/lib/auth-fetch";
import type { AppSettings } from "@/types/settings";

type SettingsResponse =
  | { success: true; settings: AppSettings; error?: string }
  | { success: false; error: string };

type ApiKeyCheckResponse =
  | { success: true; hasKey: boolean }
  | { success: false; error: string };

type ApiKeyValidateResponse =
  | { success: true; valid: true }
  | { success: false; error: string };

type DeleteAccountResponse =
  | { success: true; error?: string }
  | { success: false; error: string };

export function SettingsForm() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [apiKeyStored, setApiKeyStored] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isValidating, setIsValidating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const { setTheme } = useTheme();
  const { logout } = useAuth();
  const router = useRouter();

  const checkApiKey = async (provider: AppSettings["aiProvider"]): Promise<boolean> => {
    if (provider === "none") {
      setApiKeyStored(false);
      return false;
    }

    try {
      const response = await authFetch(`/api/api-keys?provider=${provider}`);
      const payload = (await response.json()) as ApiKeyCheckResponse;
      if (payload.success) {
        setApiKeyStored(payload.hasKey);
        return payload.hasKey;
      }
    } catch {
      setApiKeyStored(false);
    }
    return false;
  };

  useEffect(() => {
    void authFetch("/api/settings")
      .then((response) => response.json())
      .then((payload: SettingsResponse) => {
        if (payload.success) {
          setSettings(payload.settings);
          setTheme(payload.settings.theme);
          void checkApiKey(payload.settings.aiProvider);
        }
      });
  }, [setTheme]);

  const handleProviderChange = async (newProvider: AppSettings["aiProvider"]) => {
    if (!settings) return;

    setSettings({ ...settings, aiProvider: newProvider });

    if (newProvider === "none") {
      setApiKeyStored(false);
      setApiKey("");
      return;
    }

    const hasKey = await checkApiKey(newProvider);

    if (hasKey) {
      toast.success("AI provider changed successfully.");
    } else {
      toast.error("No API key found for this provider. Please add your API key.");
    }
  };

  const handleSaveApiKey = async () => {
    if (!settings || settings.aiProvider === "none" || !apiKey.trim()) {
      return;
    }

    setIsValidating(true);

    try {
      const validateResponse = await authFetch("/api/api-keys/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: settings.aiProvider, apiKey: apiKey.trim() }),
      });
      const validatePayload = (await validateResponse.json()) as ApiKeyValidateResponse;

      if (!validateResponse.ok || !validatePayload.success) {
        const errorMessage = validatePayload.success === false ? validatePayload.error : "Invalid API key or wrong AI provider selected.";
        toast.error(errorMessage);
        setIsValidating(false);
        return;
      }

      const saveResponse = await authFetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: settings.aiProvider, apiKey: apiKey.trim() }),
      });

      if (saveResponse.ok) {
        setApiKey("");
        setApiKeyStored(true);
        toast.success("API key saved successfully.");
      } else {
        toast.error("Failed to save API key.");
      }
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsValidating(false);
    }
  };

  const handleSaveSettings = () => {
    if (!settings) {
      return;
    }

    startTransition(async () => {
      try {
        const response = await authFetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            aiProvider: settings.aiProvider,
            playwrightHeadless: settings.playwrightHeadless,
            playwrightTimeoutMs: settings.playwrightTimeoutMs,
            preferredLocations: settings.preferredLocations,
            preferredSalaryMinimum: settings.preferredSalaryMinimum,
            theme: settings.theme,
          }),
        });
        const payload = (await response.json()) as SettingsResponse;

        if (!response.ok || !payload.success) {
          toast.error(payload.error || "Failed to save settings.");
          return;
        }

        setSettings(payload.settings);
        setTheme(payload.settings.theme);
        toast.success("Settings saved.");
      } catch {
        toast.error("An unexpected error occurred.");
      }
    });
  };

  const handleThemeChange = (newTheme: AppSettings["theme"]) => {
    if (!settings) return;
    setSettings({ ...settings, theme: newTheme });
    setTheme(newTheme);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") {
      toast.error("Please type DELETE to confirm.");
      return;
    }

    setIsDeleting(true);

    try {
      const response = await authFetch("/api/account/delete", {
        method: "POST",
      });
      const payload = (await response.json()) as DeleteAccountResponse;

      if (!response.ok || !payload.success) {
        toast.error(payload.error || "Failed to delete account.");
        setIsDeleting(false);
        return;
      }

      toast.success("Account deleted successfully.");
      await logout();
      router.push("/login");
    } catch {
      toast.error("An unexpected error occurred.");
      setIsDeleting(false);
    }
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
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="aiProvider">AI Provider</Label>
            <Select
              id="aiProvider"
              value={settings.aiProvider}
              onChange={(event) =>
                handleProviderChange(event.target.value as AppSettings["aiProvider"])
              }
            >
              <option value="none">None (heuristics)</option>
              <option value="chatgpt">ChatGPT</option>
              <option value="gemini">Gemini</option>
              <option value="deepseek">DeepSeek</option>
            </Select>
          </div>

          {settings.aiProvider !== "none" && (
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="apiKey"
                    type={showApiKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(event) => setApiKey(event.target.value)}
                    placeholder={apiKeyStored ? "API Key Stored" : "Enter your API key"}
                    disabled={apiKeyStored}
                    className="pr-10"
                  />
                  {!apiKeyStored && (
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  )}
                </div>
                {!apiKeyStored && (
                  <Button onClick={handleSaveApiKey} disabled={isValidating || !apiKey.trim()}>
                    {isValidating ? "Validating..." : "Save"}
                  </Button>
                )}
              </div>
              {apiKeyStored && (
                <p className="text-xs text-muted-foreground">API key is securely stored. You can change providers to enter a new key.</p>
              )}
            </div>
          )}
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
              onChange={(event) => handleThemeChange(event.target.value as AppSettings["theme"])}
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSaveSettings} disabled={isPending}>
        {isPending ? "Saving..." : "Save Settings"}
      </Button>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Delete Account</CardTitle>
          <CardDescription>Permanently delete your account and all associated data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showDeleteConfirm ? (
            <Button
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete Account
            </Button>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This action cannot be undone. All your data including missions, jobs, applications, and settings will be permanently deleted.
              </p>
              <div className="space-y-2">
                <Label htmlFor="deleteConfirm">Type "DELETE" to confirm</Label>
                <Input
                  id="deleteConfirm"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={handleDeleteAccount}
                  disabled={isDeleting || deleteConfirmText !== "DELETE"}
                >
                  {isDeleting ? "Deleting..." : "Confirm Delete"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmText("");
                  }}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
