/**
 * POST /list endpoint - List all worktrees
 */

import type { Request, Response } from "express";
import { exec } from "child_process";
import { promisify } from "util";
import { isGitRepo, getErrorMessage, logError } from "../common.js";

const execAsync = promisify(exec);

interface WorktreeInfo {
  path: string;
  branch: string;
  isMain: boolean;
  hasChanges?: boolean;
  changedFilesCount?: number;
  aheadBehind?: { ahead: number; behind: number };
}

export function createListHandler() {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectPath, includeDetails } = req.body as {
        projectPath: string;
        includeDetails?: boolean;
      };

      if (!projectPath) {
        res.status(400).json({ success: false, error: "projectPath required" });
        return;
      }

      if (!(await isGitRepo(projectPath))) {
        res.json({ success: true, worktrees: [] });
        return;
      }

      const { stdout } = await execAsync("git worktree list --porcelain", {
        cwd: projectPath,
      });

      const worktrees: WorktreeInfo[] = [];
      const lines = stdout.split("\n");
      let current: { path?: string; branch?: string } = {};
      let isFirst = true;

      for (const line of lines) {
        if (line.startsWith("worktree ")) {
          current.path = line.slice(9);
        } else if (line.startsWith("branch ")) {
          current.branch = line.slice(7).replace("refs/heads/", "");
        } else if (line === "") {
          if (current.path && current.branch) {
            worktrees.push({
              path: current.path,
              branch: current.branch,
              isMain: isFirst, // First worktree in list is the main one
            });
            isFirst = false;
          }
          current = {};
        }
      }

      // Optionally get details for each worktree
      if (includeDetails) {
        for (const wt of worktrees) {
          try {
            // Get changed files count
            const { stdout: status } = await execAsync(
              "git status --porcelain",
              { cwd: wt.path }
            );
            const changedFiles = status
              .split("\n")
              .filter(Boolean);
            wt.hasChanges = changedFiles.length > 0;
            wt.changedFilesCount = changedFiles.length;

            // Get ahead/behind info
            try {
              const { stdout: revList } = await execAsync(
                `git rev-list --left-right --count origin/${wt.branch}...HEAD`,
                { cwd: wt.path }
              );
              const [behind, ahead] = revList.trim().split("\t").map(Number);
              wt.aheadBehind = { ahead: ahead || 0, behind: behind || 0 };
            } catch {
              // Branch might not have upstream
              wt.aheadBehind = { ahead: 0, behind: 0 };
            }
          } catch {
            // Failed to get details, continue
          }
        }
      }

      res.json({ success: true, worktrees });
    } catch (error) {
      logError(error, "List worktrees failed");
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}
