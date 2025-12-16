/**
 * GET /gh-status endpoint - Check if GitHub CLI is installed
 */

import type { Request, Response } from "express";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Extended PATH to include common tool installation locations
const extendedPath = [
  process.env.PATH,
  "/opt/homebrew/bin",
  "/usr/local/bin",
  "/home/linuxbrew/.linuxbrew/bin",
  `${process.env.HOME}/.local/bin`,
].filter(Boolean).join(":");

const execEnv = {
  ...process.env,
  PATH: extendedPath,
};

export function createGhStatusHandler() {
  return async (_req: Request, res: Response): Promise<void> => {
    try {
      // Try to run gh --version
      const { stdout } = await execAsync("gh --version", { env: execEnv });

      // Parse version from output like "gh version 2.40.1 (2024-01-01)"
      const versionMatch = stdout.match(/gh version ([^\s]+)/);
      const version = versionMatch ? versionMatch[1] : undefined;

      res.json({
        success: true,
        installed: true,
        version,
      });
    } catch (error) {
      // gh not found or error running command
      res.json({
        success: true,
        installed: false,
      });
    }
  };
}
