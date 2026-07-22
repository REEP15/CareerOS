import { PageHeader } from "@/components/page-header";
import { ResumeUploadCard } from "@/components/resume-upload-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ResumePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Resume"
        description="Phase 1 ships the Resume Brain: upload a PDF, extract text, normalize it into a ResumeProfile, and persist it to Firebase when configured."
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <ResumeUploadCard />
        <Card>
          <CardHeader>
            <CardTitle>Workflow</CardTitle>
            <CardDescription>The resume flow implemented in this phase is intentionally narrow.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>1. Upload `Resume.pdf`</p>
            <p>2. Extract raw text with `pdf-parse`</p>
            <p>3. Normalize and shape into `ResumeProfile`</p>
            <p>4. Save the PDF to Firebase Storage</p>
            <p>5. Save the profile to Firestore</p>
            <p>6. Return structured JSON to the client</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
