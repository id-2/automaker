/**
 * Parse agent response and create feature files
 */

import path from "path";
import fs from "fs/promises";
import type { EventEmitter } from "../../lib/events.js";
import { createLogger } from "../../lib/logger.js";
import { getFeaturesDir } from "../../lib/automaker-paths.js";

const logger = createLogger("SpecRegeneration");

export async function parseAndCreateFeatures(
  projectPath: string,
  content: string | object,
  events: EventEmitter
): Promise<void> {
  logger.info("========== parseAndCreateFeatures() started ==========");
  
  let parsed: { features: any[] };
  
  try {
    // Check if content is already a parsed object (from structured_output)
    if (typeof content === "object" && content !== null) {
      logger.info("Content is already a structured object (from structured_output)");
      logger.info("Structured content:", JSON.stringify(content, null, 2));
      parsed = content as { features: any[] };
    } else {
      // Extract JSON from text response (fallback for compatibility)
      logger.info(`Content length: ${typeof content === "string" ? content.length : "N/A"} chars`);
      logger.info("========== CONTENT RECEIVED FOR PARSING ==========");
      logger.info(typeof content === "string" ? content : JSON.stringify(content, null, 2));
      logger.info("========== END CONTENT ==========");
      
      logger.info("Extracting JSON from text response...");
      logger.info(`Looking for pattern: /{[\\s\\S]*"features"[\\s\\S]*}/`);
      const jsonMatch = (content as string).match(/\{[\s\S]*"features"[\s\S]*\}/);
      if (!jsonMatch) {
        logger.error("❌ No valid JSON found in response");
        logger.error("Full content received:");
        logger.error(typeof content === "string" ? content : JSON.stringify(content, null, 2));
        throw new Error("No valid JSON found in response");
      }

      logger.info(`JSON match found (${jsonMatch[0].length} chars)`);
      logger.info("========== MATCHED JSON ==========");
      logger.info(jsonMatch[0]);
      logger.info("========== END MATCHED JSON ==========");

      parsed = JSON.parse(jsonMatch[0]);
    }
    
    logger.info(`Parsed ${parsed.features?.length || 0} features`);
    logger.info("Parsed features:", JSON.stringify(parsed.features, null, 2));

    const featuresDir = getFeaturesDir(projectPath);
    await fs.mkdir(featuresDir, { recursive: true });

    const createdFeatures: Array<{ id: string; title: string }> = [];

    for (const feature of parsed.features) {
      logger.debug("Creating feature:", feature.id);
      const featureDir = path.join(featuresDir, feature.id);
      await fs.mkdir(featureDir, { recursive: true });

      const featureData = {
        id: feature.id,
        category: feature.category || "Uncategorized",
        title: feature.title,
        description: feature.description,
        status: "backlog", // Features go to backlog - user must manually start them
        priority: feature.priority || 2,
        complexity: feature.complexity || "moderate",
        dependencies: feature.dependencies || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await fs.writeFile(
        path.join(featureDir, "feature.json"),
        JSON.stringify(featureData, null, 2)
      );

      createdFeatures.push({ id: feature.id, title: feature.title });
    }

    logger.info(`✓ Created ${createdFeatures.length} features successfully`);

    events.emit("spec-regeneration:event", {
      type: "spec_regeneration_complete",
      message: `Spec regeneration complete! Created ${createdFeatures.length} features.`,
      projectPath: projectPath,
    });
  } catch (error) {
    logger.error("❌ parseAndCreateFeatures() failed:");
    logger.error("Error:", error);
    events.emit("spec-regeneration:event", {
      type: "spec_regeneration_error",
      error: (error as Error).message,
      projectPath: projectPath,
    });
  }

  logger.debug("========== parseAndCreateFeatures() completed ==========");
}
