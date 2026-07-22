import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="The CareerOS dashboard will become the single place to track resume readiness, job pipeline, and mission progress."
      />
      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            Phase 1 establishes the shell only. Job matching, analytics, and automation are out of
            scope for now.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Resume Brain and Firebase foundations are now the primary focus.
        </CardContent>
      </Card>
    </div>
  );
}
