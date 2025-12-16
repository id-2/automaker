"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { GitPullRequest, Loader2, ExternalLink } from "lucide-react";
import { getElectronAPI } from "@/lib/electron";
import { toast } from "sonner";

interface WorktreeInfo {
  path: string;
  branch: string;
  isMain: boolean;
  hasChanges?: boolean;
  changedFilesCount?: number;
}

interface CreatePRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worktree: WorktreeInfo | null;
  onCreated: () => void;
}

export function CreatePRDialog({
  open,
  onOpenChange,
  worktree,
  onCreated,
}: CreatePRDialogProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [baseBranch, setBaseBranch] = useState("main");
  const [commitMessage, setCommitMessage] = useState("");
  const [isDraft, setIsDraft] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prUrl, setPrUrl] = useState<string | null>(null);

  // Reset state when dialog opens or worktree changes
  useEffect(() => {
    if (open) {
      setTitle("");
      setBody("");
      setCommitMessage("");
      setBaseBranch("main");
      setIsDraft(false);
      setError(null);
      setPrUrl(null);
    }
  }, [open, worktree?.path]);

  const handleCreate = async () => {
    if (!worktree) return;

    setIsLoading(true);
    setError(null);

    try {
      const api = getElectronAPI();
      if (!api?.worktree?.createPR) {
        setError("Worktree API not available");
        return;
      }
      const result = await api.worktree.createPR(worktree.path, {
        commitMessage: commitMessage || undefined,
        prTitle: title || worktree.branch,
        prBody: body || `Changes from branch ${worktree.branch}`,
        baseBranch,
        draft: isDraft,
      });

      if (result.success && result.result) {
        if (result.result.prCreated && result.result.prUrl) {
          setPrUrl(result.result.prUrl);
          toast.success("Pull request created!", {
            description: `PR created from ${result.result.branch}`,
            action: {
              label: "View PR",
              onClick: () => window.open(result.result!.prUrl!, "_blank"),
            },
          });
          onCreated();
        } else {
          toast.success("Branch pushed", {
            description: result.result.committed
              ? `Commit ${result.result.commitHash} pushed to ${result.result.branch}`
              : `Branch ${result.result.branch} pushed`,
          });
          if (!result.result.prCreated) {
            // Show the specific error if available
            const prError = result.result.prError;
            if (prError) {
              // Parse common gh CLI errors for better messages
              let errorMessage = prError;
              if (prError.includes("No commits between")) {
                errorMessage = "No new commits to create PR. Make sure your branch has changes compared to the base branch.";
              } else if (prError.includes("already exists")) {
                errorMessage = "A pull request already exists for this branch.";
              } else if (prError.includes("not logged in") || prError.includes("auth")) {
                errorMessage = "GitHub CLI not authenticated. Run 'gh auth login' in terminal.";
              }
              toast.error("PR creation failed", {
                description: errorMessage,
                duration: 8000,
              });
            } else {
              toast.info("PR not created", {
                description: "GitHub CLI (gh) may not be installed or authenticated",
              });
            }
          }
          onCreated();
          onOpenChange(false);
        }
      } else {
        setError(result.error || "Failed to create pull request");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create PR");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after dialog closes
    setTimeout(() => {
      setTitle("");
      setBody("");
      setCommitMessage("");
      setBaseBranch("main");
      setIsDraft(false);
      setError(null);
      setPrUrl(null);
    }, 200);
  };

  if (!worktree) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitPullRequest className="w-5 h-5" />
            Create Pull Request
          </DialogTitle>
          <DialogDescription>
            Push changes and create a pull request from{" "}
            <code className="font-mono bg-muted px-1 rounded">
              {worktree.branch}
            </code>
          </DialogDescription>
        </DialogHeader>

        {prUrl ? (
          <div className="py-6 text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10">
              <GitPullRequest className="w-8 h-8 text-green-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Pull Request Created!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Your PR is ready for review
              </p>
            </div>
            <Button
              onClick={() => window.open(prUrl, "_blank")}
              className="gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              View Pull Request
            </Button>
          </div>
        ) : (
          <>
            <div className="grid gap-4 py-4">
              {worktree.hasChanges && (
                <div className="grid gap-2">
                  <Label htmlFor="commit-message">
                    Commit Message{" "}
                    <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="commit-message"
                    placeholder="Leave empty to auto-generate"
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    {worktree.changedFilesCount} uncommitted file(s) will be
                    committed
                  </p>
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="pr-title">PR Title</Label>
                <Input
                  id="pr-title"
                  placeholder={worktree.branch}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="pr-body">Description</Label>
                <Textarea
                  id="pr-body"
                  placeholder="Describe the changes in this PR..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="base-branch">Base Branch</Label>
                  <Input
                    id="base-branch"
                    placeholder="main"
                    value={baseBranch}
                    onChange={(e) => setBaseBranch(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="flex items-end">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="draft"
                      checked={isDraft}
                      onCheckedChange={(checked) => setIsDraft(checked === true)}
                    />
                    <Label htmlFor="draft" className="cursor-pointer">
                      Create as draft
                    </Label>
                  </div>
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={handleClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <GitPullRequest className="w-4 h-4 mr-2" />
                    Create PR
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
