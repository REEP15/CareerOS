import { createUploadthing, type FileRouter } from "uploadthing/next";
import { verifyAuthToken } from "@/lib/server-auth";

const f = createUploadthing();

export const ourFileRouter = {
  resumeUploader: f({
    pdf: {
      maxFileSize: "8MB",
      maxFileCount: 1,
    },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
      maxFileSize: "8MB",
      maxFileCount: 1,
    },
  })
  .middleware(async ({ req }) => {
    // This code runs on your server before upload
    const authResult = await verifyAuthToken(req);
    
    if (!authResult) {
      throw new Error("Unauthorized");
    }
    
    // Whatever is returned here is accessible in onUploadComplete as `metadata`
    return { userId: authResult.uid };
  })
  .onUploadComplete(async ({ file, metadata }) => {
    // This code RUNS ON YOUR SERVER after or before upload
    console.log("Upload complete for userId:", metadata.userId);
    console.log("File url", file.ufsUrl);
    
    return {
      url: file.ufsUrl,
      userId: metadata.userId,
    };
  }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;