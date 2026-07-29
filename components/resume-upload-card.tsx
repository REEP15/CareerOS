"use client";

import { useState, useTransition } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { authFetch } from "@/lib/auth-fetch";
import { UploadThingResumeUploader } from "@/components/uploadthing-resume-uploader";
import type { ResumeProfile } from "@/types/resume";

type ResumeUploadResponse = {
  profile: ResumeProfile;
  storagePath: string | null;
  stored: boolean;
};

export function ResumeUploadCard({ onSuccess }: { onSuccess?: () => void }) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [response, setResponse] = useState<ResumeUploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleUploadThingComplete = async (fileUrl: string) => {
    if (!selectedFile) {
      setError("Please select a file first.");
      return;
    }

    // Send to API with UploadThing URL - parsing happens server-side
    startTransition(async () => {
      setError(null);
      
      try {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("uploadthingUrl", fileUrl);

        const uploadResponse = await authFetch("/api/resume", {
          method: "POST",
          body: formData,
        });

        const payload = (await uploadResponse.json()) as ResumeUploadResponse | { error: string };

        if (!uploadResponse.ok || "error" in payload) {
          setResponse(null);
          setError("error" in payload ? payload.error : "Resume upload failed.");
          return;
        }

        setResponse(payload);
        if (onSuccess) {
          onSuccess();
        }
      } catch (err) {
        setResponse(null);
        setError("An unexpected error occurred while uploading the resume.");
        console.error(err);
      }
    });
  };

  const handleUploadThingError = (error: Error) => {
    setError(error.message);
  };

  return (
    <Card className="border-border/80 bg-card/90 shadow-sm">
      <CardHeader>
        <CardTitle>Resume Upload</CardTitle>
        <CardDescription>
          Upload a PDF to extract text, normalize it into a structured profile, and save it to
          Firestore using UploadThing for file storage.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Input
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            type="file"
            onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
          />
          <p className="text-sm text-muted-foreground">
            Upload PDF or DOCX files. The parser supports both formats and extracts text automatically.
          </p>
        </div>
        {selectedFile && (
          <div className="space-y-2">
            <UploadThingResumeUploader
              onUploadComplete={handleUploadThingComplete}
              onError={handleUploadThingError}
            />
          </div>
        )}
        {error ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}
        {response ? (
          <div className="space-y-3 rounded-2xl border border-border/80 bg-muted/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{response.profile.personal.name}</p>
                <p className="text-sm text-muted-foreground">{response.profile.personal.email}</p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p>{response.stored ? "Stored in Firestore" : "Parsed locally only"}</p>
                <p>{response.storagePath ?? "No Storage path recorded"}</p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
                Skills
              </p>
              <div className="flex flex-wrap gap-2">
                {response.profile.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full bg-card px-3 py-1 text-xs font-medium text-foreground shadow-sm"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
