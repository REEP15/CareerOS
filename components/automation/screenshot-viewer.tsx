"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, Download, ExternalLink } from "lucide-react";
import { authFetch } from "@/lib/auth-fetch";

interface ScreenshotViewerProps {
  jobId: string;
  runId?: string;
  isOpen: boolean;
  onClose: () => void;
}

interface Screenshot {
  id: string;
  url: string;
  label: string;
  timestamp: string;
}

export function ScreenshotViewer({ jobId, runId, isOpen, onClose }: ScreenshotViewerProps) {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!isOpen || !runId) return;

    const fetchScreenshots = async () => {
      try {
        const response = await authFetch(`/api/automation/screenshots?jobId=${jobId}&runId=${runId}`);
        if (response.ok) {
          const payload = await response.json();
          setScreenshots(payload.screenshots || []);
          setCurrentIndex(0);
        }
      } catch (error) {
        console.error("Failed to fetch screenshots:", error);
      }
    };

    fetchScreenshots();
  }, [isOpen, jobId, runId]);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : screenshots.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < screenshots.length - 1 ? prev + 1 : 0));
  };

  const handleDownload = async () => {
    const current = screenshots[currentIndex];
    if (!current) return;

    try {
      const response = await fetch(current.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${current.label}-${new Date(current.timestamp).getTime()}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Failed to download screenshot:", error);
    }
  };

  if (!isOpen || screenshots.length === 0) return null;

  const current = screenshots[currentIndex];

  return (
    <Card className="fixed bottom-4 right-4 w-[700px] max-h-[600px] z-50 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg">Screenshots</CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {currentIndex + 1} / {screenshots.length}
          </span>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
          <img
            src={current.url}
            alt={current.label}
            className="w-full h-full object-contain"
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevious}
              disabled={screenshots.length <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              disabled={screenshots.length <= 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">{current.label}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(current.timestamp).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(current.url, "_blank")}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
