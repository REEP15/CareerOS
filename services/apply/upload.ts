import path from "node:path";

export function publicUrlToFilePath(url: string | undefined) {
  if (!url?.startsWith("/generated/")) {
    return null;
  }

  return path.join(process.cwd(), "public", url.replace(/^\//, ""));
}
