import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <h2 className="text-2xl font-semibold">Job not found</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        This job may have been removed or the link is incorrect.
      </p>
      <Link href="/jobs" className="mt-6">
        <Button>Back to Jobs</Button>
      </Link>
    </div>
  );
}
