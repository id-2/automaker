"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  GitBranch,
  Plus,
  Trash2,
  MoreHorizontal,
  RefreshCw,
  GitCommit,
  GitPullRequest,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import { useAppStore } from "@/store/app-store";
import { getElectronAPI } from "@/lib/electron";
import { cn } from "@/lib/utils";

interface WorktreeInfo {
  path: string;
  branch: string;
  isMain: boolean;
  hasChanges?: boolean;
  changedFilesCount?: number;
}

interface WorktreeSelectorProps {
  projectPath: string;
  onCreateWorktree: () => void;
  onDeleteWorktree: (worktree: WorktreeInfo) => void;
  onCommit: (worktree: WorktreeInfo) => void;
  onCreatePR: (worktree: WorktreeInfo) => void;
}

export function WorktreeSelector({
  projectPath,
  onCreateWorktree,
  onDeleteWorktree,
  onCommit,
  onCreatePR,
}: WorktreeSelectorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [worktrees, setWorktrees] = useState<WorktreeInfo[]>([]);
  const currentWorktree = useAppStore((s) => s.getCurrentWorktree(projectPath));
  const setCurrentWorktree = useAppStore((s) => s.setCurrentWorktree);
  const setWorktreesInStore = useAppStore((s) => s.setWorktrees);

  const fetchWorktrees = useCallback(async () => {
    if (!projectPath) return;
    setIsLoading(true);
    try {
      const api = getElectronAPI();
      if (!api?.worktree?.listAll) {
        console.warn("Worktree API not available");
        return;
      }
      const result = await api.worktree.listAll(projectPath, true);
      if (result.success && result.worktrees) {
        setWorktrees(result.worktrees);
        setWorktreesInStore(projectPath, result.worktrees);
      }
    } catch (error) {
      console.error("Failed to fetch worktrees:", error);
    } finally {
      setIsLoading(false);
    }
  }, [projectPath, setWorktreesInStore]);

  useEffect(() => {
    fetchWorktrees();
  }, [fetchWorktrees]);

  const handleSelectWorktree = (worktree: WorktreeInfo) => {
    setCurrentWorktree(projectPath, worktree.isMain ? null : worktree.path);
  };

  const selectedWorktree =
    worktrees.find((w) =>
      currentWorktree ? w.path === currentWorktree : w.isMain
    ) || worktrees.find((w) => w.isMain);

  if (worktrees.length === 0 && !isLoading) {
    // No git repo or loading
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-glass/50 backdrop-blur-sm">
      <GitBranch className="w-4 h-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground mr-2">Worktree:</span>

      {/* Worktree Tabs */}
      <div className="flex items-center gap-1 flex-wrap">
        {worktrees.map((worktree) => {
          const isSelected = selectedWorktree?.path === worktree.path;

          // Main branch - simple button
          if (worktree.isMain) {
            return (
              <Button
                key={worktree.path}
                variant={isSelected ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "h-7 px-3 text-xs font-mono",
                  isSelected && "bg-primary text-primary-foreground",
                  !isSelected && "hover:bg-secondary"
                )}
                onClick={() => handleSelectWorktree(worktree)}
              >
                main
                {worktree.hasChanges && (
                  <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-[1rem] px-1 text-[10px] font-medium rounded bg-background/80 text-foreground border border-border">
                    {worktree.changedFilesCount}
                  </span>
                )}
              </Button>
            );
          }

          // Non-main worktrees - button with integrated dropdown
          return (
            <DropdownMenu key={worktree.path}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={isSelected ? "default" : "ghost"}
                  size="sm"
                  className={cn(
                    "h-7 px-3 text-xs font-mono gap-1.5",
                    isSelected && "bg-primary text-primary-foreground",
                    !isSelected && "hover:bg-secondary"
                  )}
                >
                  {worktree.branch}
                  {worktree.hasChanges && (
                    <span className="inline-flex items-center justify-center h-4 min-w-[1rem] px-1 text-[10px] font-medium rounded bg-background/80 text-foreground border border-border">
                      {worktree.changedFilesCount}
                    </span>
                  )}
                  <ChevronDown className="w-3 h-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem
                  onClick={() => handleSelectWorktree(worktree)}
                  className="text-xs"
                >
                  <GitBranch className="w-3.5 h-3.5 mr-2" />
                  Switch to this worktree
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {worktree.hasChanges && (
                  <>
                    <DropdownMenuItem
                      onClick={() => onCommit(worktree)}
                      className="text-xs"
                    >
                      <GitCommit className="w-3.5 h-3.5 mr-2" />
                      Commit Changes
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem
                  onClick={() => onCreatePR(worktree)}
                  className="text-xs"
                >
                  <GitPullRequest className="w-3.5 h-3.5 mr-2" />
                  Create Pull Request
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDeleteWorktree(worktree)}
                  className="text-xs text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                  Delete Worktree
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        })}

        {/* Add Worktree Button */}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          onClick={onCreateWorktree}
          title="Create new worktree"
        >
          <Plus className="w-4 h-4" />
        </Button>

        {/* Refresh Button */}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          onClick={fetchWorktrees}
          disabled={isLoading}
          title="Refresh worktrees"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
        </Button>
      </div>
    </div>
  );
}
