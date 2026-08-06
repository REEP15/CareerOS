"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, X } from "lucide-react";

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (answer: any) => void;
  onSkip: () => void;
  onAbort: () => void;
  question: string;
  reason: string;
  proposedAnswer?: any;
  field?: {
    semantic: string;
    options?: { label: string; value: string }[];
  };
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  onSkip,
  onAbort,
  question,
  reason,
  proposedAnswer,
  field,
}: ConfirmationDialogProps) {
  const [answer, setAnswer] = useState("");
  const [selectedOption, setSelectedOption] = useState("");

  useEffect(() => {
    if (proposedAnswer?.value) {
      setAnswer(proposedAnswer.value);
    }
  }, [proposedAnswer]);

  const handleConfirm = () => {
    const answerData = field?.options
      ? { value: selectedOption }
      : { value: answer };
    onConfirm(answerData);
    handleClose();
  };

  const handleSkip = () => {
    onSkip();
    handleClose();
  };

  const handleAbort = () => {
    onAbort();
    handleClose();
  };

  const handleClose = () => {
    setAnswer("");
    setSelectedOption("");
    onClose();
  };

  const isSensitive = reason === "sensitive_question";
  const isLowConfidence = reason === "low_confidence";
  const isUnanswerable = reason === "unanswerable_from_profile";

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-[500px] max-h-[80vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            {isSensitive && <AlertCircle className="h-5 w-5 text-yellow-500" />}
            {isLowConfidence && <AlertCircle className="h-5 w-5 text-orange-500" />}
            {isUnanswerable && <AlertCircle className="h-5 w-5 text-red-500" />}
            {reason === "final_submit" && <CheckCircle className="h-5 w-5 text-green-500" />}
            User Input Required
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="text-sm">
            {reason === "final_submit" && (
              <span className="text-green-600 dark:text-green-400 block mb-2">
                The application is ready to submit. Please confirm you want to proceed.
              </span>
            )}
            {isSensitive && (
              <span className="text-yellow-600 dark:text-yellow-400 block mb-2">
                This is a voluntary/EEO question. Your answer is optional.
              </span>
            )}
            {isLowConfidence && (
              <span className="text-orange-600 dark:text-orange-400 block mb-2">
                We're not confident about the suggested answer. Please verify or provide the correct value.
              </span>
            )}
            {isUnanswerable && (
              <span className="text-red-600 dark:text-red-400 block mb-2">
                We couldn't find this information in your profile. Please provide it to continue.
              </span>
            )}
          </div>

          {field?.semantic && (
            <div className="flex items-center gap-2">
              <Label>Field:</Label>
              <Badge variant="outline">{field.semantic}</Badge>
            </div>
          )}

          <div className="space-y-2">
            <Label>{question}</Label>
            
            {field?.options ? (
              <div className="space-y-2">
                {field.options.map((option) => (
                  <div key={option.value} className="flex items-center gap-2">
                    <input
                      type="radio"
                      id={option.value}
                      name="option"
                      value={option.value}
                      checked={selectedOption === option.value}
                      onChange={(e) => setSelectedOption(e.target.value)}
                      className="w-4 h-4"
                    />
                    <label htmlFor={option.value} className="text-sm cursor-pointer">
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
            ) : (
              <Textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Enter your answer..."
                rows={3}
              />
            )}
          </div>

          {proposedAnswer && !field?.options && (
            <div className="bg-muted rounded-lg p-3 space-y-2">
              <Label className="text-sm font-medium">Suggested Answer:</Label>
              <p className="text-sm text-muted-foreground">{proposedAnswer.value}</p>
              <p className="text-xs text-muted-foreground">
                Confidence: {Math.round((proposedAnswer.confidence || 0) * 100)}%
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            {reason !== "final_submit" && (
              <Button variant="destructive" onClick={handleAbort}>
                Abort Automation
              </Button>
            )}
            {isSensitive && (
              <Button variant="outline" onClick={handleSkip}>
                Skip
              </Button>
            )}
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleConfirm}>
              {reason === "final_submit" ? "Submit Application" : "Confirm"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
