/**
 * POST /create endpoint - Create a new git worktree
 */

import type { Request, Response } from "express";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";
import { isGitRepo, getErrorMessage, logError } from "../common.js";

const execAsync = promisify(exec);

export function createCreateHandler() {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectPath, branchName, baseBranch } = req.body as {
        projectPath: string;
        branchName: string;
        baseBranch?: string; // Optional base branch to create from (defaults to current HEAD)
      };

      if (!projectPath || !branchName) {
        res.status(400).json({
          success: false,
          error: "projectPath and branchName required",
        });
        return;
      }

      if (!(await isGitRepo(projectPath))) {
        res.status(400).json({
          success: false,
          error: "Not a git repository",
        });
        return;
      }

      // Sanitize branch name for directory usage
      const sanitizedName = branchName.replace(/[^a-zA-Z0-9_-]/g, "-");
      const worktreesDir = path.join(projectPath, ".worktrees");
      const worktreePath = path.join(worktreesDir, sanitizedName);

      // Create worktrees directory if it doesn't exist
      await fs.mkdir(worktreesDir, { recursive: true });

      // Check if worktree already exists
      try {
        await fs.access(worktreePath);
        res.status(400).json({
          success: false,
          error: `Worktree for branch '${branchName}' already exists`,
        });
        return;
      } catch {
        // Worktree doesn't exist, good to proceed
      }

      // Check if branch exists
      let branchExists = false;
      try {
        await execAsync(`git rev-parse --verify ${branchName}`, {
          cwd: projectPath,
        });
        branchExists = true;
      } catch {
        // Branch doesn't exist
      }

      // Create worktree
      let createCmd: string;
      if (branchExists) {
        // Use existing branch
        createCmd = `git worktree add "${worktreePath}" ${branchName}`;
      } else {
        // Create new branch from base or HEAD
        const base = baseBranch || "HEAD";
        createCmd = `git worktree add -b ${branchName} "${worktreePath}" ${base}`;
      }

      await execAsync(createCmd, { cwd: projectPath });

      // Symlink .automaker directory to worktree so features are shared
      const mainAutomaker = path.join(projectPath, ".automaker");
      const worktreeAutomaker = path.join(worktreePath, ".automaker");

      try {
        // Check if .automaker exists in main project
        await fs.access(mainAutomaker);
        // Create symlink in worktree pointing to main .automaker
        // Use 'junction' on Windows, 'dir' on other platforms
        const symlinkType = process.platform === "win32" ? "junction" : "dir";
        await fs.symlink(mainAutomaker, worktreeAutomaker, symlinkType);
      } catch (symlinkError) {
        // .automaker doesn't exist or symlink failed
        // Log but don't fail - worktree is still usable without shared .automaker
        console.warn("[Worktree] Could not create .automaker symlink:", symlinkError);
      }

      res.json({
        success: true,
        worktree: {
          path: worktreePath,
          branch: branchName,
          isNew: !branchExists,
        },
      });
    } catch (error) {
      logError(error, "Create worktree failed");
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}
