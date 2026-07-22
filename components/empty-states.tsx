import { EmptyState } from "@/components/empty-state";

export function EmptyJobs() {
  return (
    <EmptyState
      title="No jobs found"
      description="Run the collector to seed your pipeline, or adjust your filters."
    />
  );
}

export function EmptyMissions() {
  return (
    <EmptyState
      title="No missions yet"
      description="Create a mission to define targeted job search criteria."
      actionHref="/missions/new"
      actionLabel="Create Mission"
    />
  );
}

export function EmptyNotifications() {
  return (
    <EmptyState
      title="No notifications"
      description="Notifications will appear here when jobs are collected, matched, or applications are ready."
    />
  );
}

export function EmptySearchResults() {
  return (
    <EmptyState
      title="No results"
      description="Try a different search term."
    />
  );
}
