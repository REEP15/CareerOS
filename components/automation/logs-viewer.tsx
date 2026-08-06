"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { authFetch } from "@/lib/auth-fetch";

type LogLevel = "info" | "warn" | "error" | "debug";

interface AutomationLogEntry {
  id?: string;
  runId: string;
  userId: string;
  jobId: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: Record<string, unknown>;
  category?: string;
  screenshotUrl?: string;
}

interface LogsViewerProps {
  jobId: string;
  runId?: string;
  isOpen: boolean;
  onClose: () => void;
}

const LEVEL_COLORS: Record<LogLevel, string> = {
  info: "bg-blue-500",
  warn: "bg-yellow-500",
  error: "bg-red-500",
  debug: "bg-gray-500",
};

const LEVEL_ICONS: Record<LogLevel, string> = {
  info: "ℹ️",
  warn: "⚠️",
  error: "❌",
  debug: "🔍",
};

export function LogsViewer({ jobId, runId, isOpen, onClose }: LogsViewerProps) {
  const [logs, setLogs] = useState<AutomationLogEntry[]>([]);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [filterLevel, setFilterLevel] = useState<LogLevel | "all">("all");

  useEffect(() => {
    if (!isOpen || !runId) return;

    const fetchLogs = async () => {
      try {
        const response = await authFetch(`/api/automation/logs?jobId=${jobId}&runId=${runId}`);
        if (response.ok) {
          const payload = await response.json();
          setLogs(payload.logs || []);
        }
      } catch (error) {
        console.error("Failed to fetch logs:", error);
      }
    };

    fetchLogs();
  }, [isOpen, jobId, runId]);

  const toggleLog = (logId: string) => {
    setExpandedLogs((prev) => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  };

  const filteredLogs = logs.filter((log) => 
    filterLevel === "all" || log.level === filterLevel
  );

  if (!isOpen) return null;

  return (
    <Card className="fixed bottom-4 right-4 w-[600px] max-h-[500px] z-50 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg">Automation Logs</CardTitle>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {(["all", "info", "warn", "error"] as const).map((level) => (
              <Button
                key={level}
                variant={filterLevel === level ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterLevel(level)}
              >
                {level === "all" ? "All" : level.toUpperCase()}
              </Button>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] overflow-y-auto space-y-2">
          {filteredLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No logs available
            </p>
          ) : (
            filteredLogs.map((log, index) => {
              const logId = log.id || `${index}`;
              const isExpanded = expandedLogs.has(logId);
              const hasData = log.data && Object.keys(log.data).length > 0;
              const hasScreenshot = log.screenshotUrl;

              return (
                <div
                  key={logId}
                  className="border rounded-lg p-3 space-y-2 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <Badge
                      variant="outline"
                      className={`${LEVEL_COLORS[log.level]} text-white border-0 shrink-0`}
                    >
                      {LEVEL_ICONS[log.level]} {log.level.toUpperCase()}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{log.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.timestamp).toLocaleTimeString()}
                        {log.category && ` • ${log.category}`}
                      </p>
                    </div>
                    {(hasData || hasScreenshot) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleLog(logId)}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                  {isExpanded && (
                    <div className="space-y-2 pl-2 border-l-2 border-muted">
                      {hasData && (
                        <div className="bg-muted rounded p-2">
                          <p className="text-xs font-semibold mb-1">Data:</p>
                          <pre className="text-xs overflow-x-auto">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        </div>
                      )}
                      {hasScreenshot && (
                        <div>
                          <p className="text-xs font-semibold mb-1">Screenshot:</p>
                          <a
                            href={log.screenshotUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:underline"
                          >
                            View Screenshot
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
