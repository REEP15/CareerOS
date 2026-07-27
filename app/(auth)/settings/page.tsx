import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "@/components/settings-form";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage AI providers, Playwright automation, and job search preferences."
      />
      <SettingsForm />
    </div>
  );
}
