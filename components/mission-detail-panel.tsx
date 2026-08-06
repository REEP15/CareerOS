"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ArrowLeft, Copy, Pencil, Power, PowerOff, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authFetch } from "@/lib/auth-fetch";
import type { Mission } from "@/types/mission";

type MissionResponse =
  | { success: true; mission: Mission; error?: string }
  | { success: false; error: string };

export function MissionDetailPanel({ mission }: { mission: Mission }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleAction = (action: "delete" | "duplicate" | "enable" | "disable") => {
    startTransition(async () => {
      try {
        const response = await authFetch("/api/missions", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: mission.id, action }),
        });
        const payload = (await response.json()) as MissionResponse;

        if (!response.ok || !payload.success) {
          toast.error(payload.error || "Action failed.");
          return;
        }

        toast.success(`Mission ${action === "delete" ? "deleted" : action + "d"}.`);
        
        if (action === "delete") {
          router.push("/missions");
        } else {
          router.refresh();
        }
      } catch {
        toast.error("An unexpected error occurred.");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/missions">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4" />
            Back to Missions
          </Button>
        </Link>
        <Badge variant={mission.active ? "success" : "secondary"}>
          {mission.active ? "Active" : "Inactive"}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{mission.name}</CardTitle>
          <CardDescription>
            {mission.keywords.join(", ") || "No keywords"} · Min match {mission.minimumMatch}%
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium">Keywords</p>
              <p className="text-sm text-muted-foreground">{mission.keywords.join(", ") || "None"}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Excluded Keywords</p>
              <p className="text-sm text-muted-foreground">{mission.excludedKeywords.join(", ") || "None"}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Locations</p>
              <p className="text-sm text-muted-foreground">{mission.locations.join(", ") || "Any"}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Sources</p>
              <p className="text-sm text-muted-foreground">{mission.sources.join(", ") || "All"}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Minimum Salary</p>
              <p className="text-sm text-muted-foreground">{mission.minimumSalary ? `$${mission.minimumSalary.toLocaleString()}` : "No minimum"}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Remote Only</p>
              <p className="text-sm text-muted-foreground">{mission.remote ? "Yes" : "No"}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Minimum Match</p>
              <p className="text-sm text-muted-foreground">{mission.minimumMatch}%</p>
            </div>
            <div>
              <p className="text-sm font-medium">Created</p>
              <p className="text-sm text-muted-foreground">{new Date(mission.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-4">
            <Link href={`/missions/${mission.id}/edit`}>
              <Button size="sm" variant="outline">
                <Pencil className="h-3 w-3" />
                Edit
              </Button>
            </Link>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAction(mission.active ? "disable" : "enable")}
              disabled={isPending}
            >
              {mission.active ? <PowerOff className="h-3 w-3" /> : <Power className="h-3 w-3" />}
              {mission.active ? "Disable" : "Enable"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAction("duplicate")}
              disabled={isPending}
            >
              <Copy className="h-3 w-3" />
              Duplicate
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAction("delete")}
              disabled={isPending}
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
