"use client";

import { generateUploadButton } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";

const UploadButton = generateUploadButton<OurFileRouter>();

interface UploadThingResumeUploaderProps {
  onUploadComplete: (fileUrl: string) => void;
  onError?: (error: Error) => void;
}

export function UploadThingResumeUploader({ onUploadComplete, onError }: UploadThingResumeUploaderProps) {
  return (
    <UploadButton
      endpoint="resumeUploader"
      onClientUploadComplete={(files) => {
        console.log("Upload complete:", files);
        if (files && files.length > 0) {
          onUploadComplete(files[0].ufsUrl);
        }
      }}
      onUploadError={(error: Error) => {
        console.error("Upload error:", error);
        if (onError) {
          onError(error);
        }
      }}
    />
  );
}