"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getElectronAPI } from "@/lib/electron";
import {
  CheckCircle2,
  Loader2,
  GitPullRequest,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { StatusBadge } from "../components";

interface GhSetupStepProps {
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

type GhStatus = "checking" | "installed" | "not_installed" | "error";

export function GhSetupStep({ onNext, onBack, onSkip }: GhSetupStepProps) {
  const [status, setStatus] = useState<GhStatus>("checking");
  const [version, setVersion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkGhInstalled = useCallback(async () => {
    setStatus("checking");
    setError(null);

    try {
      const api = getElectronAPI();
      if (!api?.setup?.getGhStatus) {
        // In browser mode, skip the check
        setStatus("not_installed");
        return;
      }

      const result = await api.setup.getGhStatus();

      if (result.success && result.installed) {
        if (result.version) {
          setVersion(result.version);
        }
        setStatus("installed");
      } else {
        setStatus("not_installed");
        if (result.error) {
          setError(result.error);
        }
      }
    } catch (err) {
      // gh not found or error running command
      setStatus("not_installed");
    }
  }, []);

  useEffect(() => {
    checkGhInstalled();
  }, [checkGhInstalled]);

  const getStatusBadge = () => {
    switch (status) {
      case "checking":
        return <StatusBadge status="checking" label="Checking..." />;
      case "installed":
        return <StatusBadge status="authenticated" label="Installed" />;
      case "not_installed":
        return <StatusBadge status="not_installed" label="Not Installed" />;
      case "error":
        return <StatusBadge status="error" label="Error" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-xl bg-brand-500/10 flex items-center justify-center mx-auto mb-4">
          <GitPullRequest className="w-8 h-8 text-brand-500" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          GitHub CLI (Optional)
        </h2>
        <p className="text-muted-foreground">
          Required for creating pull requests from within the app
        </p>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <GitPullRequest className="w-5 h-5" />
              GitHub CLI Status
            </CardTitle>
            <div className="flex items-center gap-2">
              {getStatusBadge()}
              <Button
                variant="ghost"
                size="sm"
                onClick={checkGhInstalled}
                disabled={status === "checking"}
              >
                <RefreshCw
                  className={`w-4 h-4 ${status === "checking" ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </div>
          <CardDescription>
            The GitHub CLI (gh) allows you to create pull requests directly from Automaker
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "checking" && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
              <p className="text-foreground">Checking for GitHub CLI...</p>
            </div>
          )}

          {status === "installed" && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <div>
                <p className="font-medium text-foreground">
                  GitHub CLI is installed!
                </p>
                {version && (
                  <p className="text-sm text-muted-foreground">
                    Version: {version}
                  </p>
                )}
              </div>
            </div>
          )}

          {status === "not_installed" && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">
                    GitHub CLI not detected
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Without gh, you won&apos;t be able to create pull requests from within Automaker.
                    You can still use all other features.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/30 border border-border">
                <p className="font-medium text-foreground mb-3">
                  How to install GitHub CLI:
                </p>
                <div className="space-y-2 text-sm">
                  <p className="text-muted-foreground">
                    <strong>macOS:</strong> <code className="bg-muted px-1.5 py-0.5 rounded">brew install gh</code>
                  </p>
                  <p className="text-muted-foreground">
                    <strong>Windows:</strong> <code className="bg-muted px-1.5 py-0.5 rounded">winget install GitHub.cli</code>
                  </p>
                  <p className="text-muted-foreground">
                    <strong>Linux:</strong> See installation guide
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => window.open("https://cli.github.com/", "_blank")}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Installation Guide
                </Button>
              </div>

              <p className="text-sm text-muted-foreground">
                After installing, run <code className="bg-muted px-1.5 py-0.5 rounded">gh auth login</code> to authenticate.
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
              <div>
                <p className="font-medium text-foreground">Error checking gh</p>
                <p className="text-sm text-red-400 mt-1">{error}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button
          variant="ghost"
          onClick={onBack}
          className="text-muted-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={onSkip}
            className="text-muted-foreground"
          >
            Skip
          </Button>
          <Button
            onClick={onNext}
            className="bg-brand-500 hover:bg-brand-600 text-white"
            data-testid="gh-next-button"
          >
            {status === "installed" ? "Continue" : "Continue without gh"}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
