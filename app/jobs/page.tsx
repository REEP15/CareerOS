import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function JobsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Jobs"
        description="Job collection and automation are intentionally deferred. This route exists to lock in the application structure for later phases."
      />
      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            Job scraping, collection, and AI matching are not part of Phase 1.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          The `jobs` Firestore collection is reserved and the page is ready for future features.
        </CardContent>
      </Card>
    </div>
  );
}
