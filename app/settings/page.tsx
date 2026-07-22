import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Settings will later manage the single-user CareerOS environment, but Phase 1 only reserves the route and Firestore collection."
      />
      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            Authentication, notifications, and advanced preferences remain out of scope.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Firebase configuration is driven by environment variables rather than UI forms in this
          phase.
        </CardContent>
      </Card>
    </div>
  );
}
