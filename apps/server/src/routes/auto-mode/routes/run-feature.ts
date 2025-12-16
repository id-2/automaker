/**
 * POST /run-feature endpoint - Run a single feature
 */

import type { Request, Response } from "express";
import type { AutoModeService } from "../../../services/auto-mode-service.js";
import { createLogger } from "../../../lib/logger.js";
import { getErrorMessage, logError } from "../common.js";

const logger = createLogger("AutoMode");

export function createRunFeatureHandler(autoModeService: AutoModeService) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectPath, featureId, useWorktrees, worktreePath } = req.body as {
        projectPath: string;
        featureId: string;
        useWorktrees?: boolean;
        worktreePath?: string; // Optional: Use an existing user-managed worktree
      };

      if (!projectPath || !featureId) {
        res
          .status(400)
          .json({
            success: false,
            error: "projectPath and featureId are required",
          });
        return;
      }

      // Start execution in background
      // If worktreePath is provided, use it; otherwise use per-feature worktrees if enabled
      autoModeService
        .executeFeature(
          projectPath,
          featureId,
          worktreePath ? false : (useWorktrees ?? true), // Don't create per-feature worktree if using existing
          false,
          worktreePath // Pass the existing worktree path
        )
        .catch((error) => {
          logger.error(`[AutoMode] Feature ${featureId} error:`, error);
        });

      res.json({ success: true });
    } catch (error) {
      logError(error, "Run feature failed");
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}
