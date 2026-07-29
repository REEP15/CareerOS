"use client";

import { useEffect, useState } from "react";
import { Download, Trash2, FileText, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

import { PageHeader } from "@/components/page-header";
import { ResumeUploadCard } from "@/components/resume-upload-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { authFetch } from "@/lib/auth-fetch";
import type { ResumeProfile } from "@/types/resume";

type ResumeResponse =
  | { success: true; profile: ResumeProfile }
  | { success: false; error: string };

export default function ResumePage() {
  const [profile, setProfile] = useState<ResumeProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadResume = () => {
    setIsLoading(true);
    authFetch("/api/resume")
      .then((res) => res.json())
      .then((payload: ResumeResponse) => {
        if (payload.success) {
          setProfile(payload.profile);
        }
      })
      .catch((error) => {
        console.error("Failed to load resume:", error);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadResume();
  }, []);

  const handleDelete = () => {
    if (!confirm("Are you sure you want to delete your resume? This cannot be undone.")) {
      return;
    }

    setIsDeleting(true);
    authFetch("/api/resume", { method: "DELETE" })
      .then((res) => res.json())
      .then((payload: ResumeResponse) => {
        if (payload.success) {
          toast.success("Resume deleted successfully");
          setProfile(null);
        } else {
          toast.error(payload.error || "Failed to delete resume");
        }
      })
      .catch((error) => {
        toast.error("Failed to delete resume");
        console.error(error);
      })
      .finally(() => setIsDeleting(false));
  };

  const handleDownload = () => {
    if (profile?.resumeUrl) {
      window.open(profile.resumeUrl, "_blank");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resume"
        description="Upload, manage, and tailor your resume for job applications."
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <ResumeUploadCard onSuccess={loadResume} />
        
        {isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Loading resume...</p>
            </CardContent>
          </Card>
        ) : profile ? (
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Resume Profile</CardTitle>
                  <CardDescription>Parsed from {profile.sourceFileName || "uploaded file"}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleDownload}>
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDelete} disabled={isDeleting}>
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-semibold">Personal Information</h3>
                <div className="grid gap-2 text-sm">
                  <div><span className="text-muted-foreground">Name:</span> {profile.personal.name}</div>
                  <div><span className="text-muted-foreground">Email:</span> {profile.personal.email}</div>
                  <div><span className="text-muted-foreground">Phone:</span> {profile.personal.phone}</div>
                  <div><span className="text-muted-foreground">Location:</span> {profile.personal.location}</div>
                  {profile.personal.linkedin && (
                    <div><span className="text-muted-foreground">LinkedIn:</span> 
                      <a href={profile.personal.linkedin} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1">
                        {profile.personal.linkedin}
                      </a>
                    </div>
                  )}
                  {profile.personal.github && (
                    <div><span className="text-muted-foreground">GitHub:</span> 
                      <a href={profile.personal.github} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1">
                        {profile.personal.github}
                      </a>
                    </div>
                  )}
                  {profile.personal.portfolio && (
                    <div><span className="text-muted-foreground">Portfolio:</span> 
                      <a href={profile.personal.portfolio} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1">
                        {profile.personal.portfolio}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">Summary</h3>
                <p className="text-sm text-muted-foreground">{profile.summary}</p>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill) => (
                    <Badge key={skill} variant="secondary">{skill}</Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">Experience</h3>
                {profile.experience.length > 0 ? (
                  <div className="space-y-3">
                    {profile.experience.map((exp, index) => (
                      <div key={index} className="text-sm border-l-2 border-border pl-3">
                        <div className="font-medium">{exp.title} at {exp.company}</div>
                        <div className="text-muted-foreground text-xs">
                          {exp.location && <span>{exp.location}</span>}
                          {(exp.startDate || exp.endDate) && (
                            <span className="ml-2">
                              {exp.startDate && <span>{exp.startDate}</span>}
                              {exp.startDate && exp.endDate && <span> - </span>}
                              {exp.endDate && <span>{exp.endDate}</span>}
                            </span>
                          )}
                        </div>
                        {(exp.highlights && exp.highlights.length > 0) && (
                          <ul className="text-muted-foreground list-disc list-inside mt-1">
                            {exp.highlights.map((highlight, hIndex) => (
                              <li key={hIndex}>{highlight}</li>
                            ))}
                          </ul>
                        )}
                        {exp.technologies && exp.technologies.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {exp.technologies.map((tech, tIndex) => (
                              <Badge key={tIndex} variant="outline" className="text-xs">{tech}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No experience listed</p>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">Education</h3>
                {profile.education.length > 0 ? (
                  <div className="space-y-3">
                    {profile.education.map((edu, index) => (
                      <div key={index} className="text-sm border-l-2 border-border pl-3">
                        <div className="font-medium">{edu.degree}</div>
                        <div className="text-muted-foreground">{edu.institution}</div>
                        <div className="text-muted-foreground text-xs mt-1">
                          {edu.location && <span>{edu.location}</span>}
                          {(edu.startYear || edu.endYear) && (
                            <span className="ml-2">
                              {edu.startYear && <span>{edu.startYear}</span>}
                              {edu.startYear && edu.endYear && <span> - </span>}
                              {edu.endYear && <span>{edu.endYear}</span>}
                            </span>
                          )}
                        </div>
                        {(edu.cgpa || edu.percentage || edu.board || edu.school) && (
                          <div className="text-muted-foreground text-xs mt-1">
                            {edu.cgpa && <span>CGPA: {edu.cgpa}</span>}
                            {edu.percentage && <span className="ml-2">Percentage: {edu.percentage}%</span>}
                            {edu.board && <span className="ml-2">Board: {edu.board}</span>}
                            {edu.school && <span className="ml-2">School: {edu.school}</span>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No education listed</p>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">Projects</h3>
                {profile.projects.length > 0 ? (
                  <div className="space-y-3">
                    {profile.projects.map((project, index) => (
                      <div key={index} className="text-sm border-l-2 border-border pl-3">
                        <div className="font-medium">{project.name}</div>
                        <div className="text-muted-foreground">{project.description}</div>
                        {project.technologies && project.technologies.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {project.technologies.map((tech, tIndex) => (
                              <Badge key={tIndex} variant="outline" className="text-xs">{tech}</Badge>
                            ))}
                          </div>
                        )}
                        {project.bulletPoints && project.bulletPoints.length > 0 && (
                          <ul className="text-muted-foreground list-disc list-inside mt-1">
                            {project.bulletPoints.map((point, pIndex) => (
                              <li key={pIndex}>{point}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No projects listed</p>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">Certifications</h3>
                {profile.certifications.length > 0 ? (
                  <div className="space-y-3">
                    {profile.certifications.map((cert, index) => (
                      <div key={index} className="text-sm border-l-2 border-border pl-3">
                        <div className="font-medium">{cert.title}</div>
                        <div className="text-muted-foreground text-xs">
                          {cert.organization && <span>{cert.organization}</span>}
                          {cert.dates && <span className="ml-2">{cert.dates}</span>}
                        </div>
                        {cert.bulletPoints && cert.bulletPoints.length > 0 && (
                          <ul className="text-muted-foreground list-disc list-inside mt-1">
                            {cert.bulletPoints.map((point, pIndex) => (
                              <li key={pIndex}>{point}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No certifications listed</p>
                )}
              </div>

              <div className="text-xs text-muted-foreground pt-4 border-t">
                <div>Uploaded: {profile.uploadedAt ? new Date(profile.uploadedAt).toLocaleString() : "N/A"}</div>
                <div>Last Parsed: {profile.lastParsedAt ? new Date(profile.lastParsedAt).toLocaleString() : "N/A"}</div>
                <div>Parser Version: {profile.parserVersion || "N/A"}</div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
              <FileText className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <p className="font-medium">No resume uploaded</p>
                <p className="text-sm text-muted-foreground">Upload a resume to get started</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
