/**
 * JSON Schema for feature generation output
 * Used with Claude Agent SDK's structured output feature
 */

export const FEATURE_GENERATION_SCHEMA = {
  type: "object",
  properties: {
    features: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "A unique lowercase-hyphenated identifier",
          },
          category: {
            type: "string",
            description:
              "Functional category (e.g., 'Core', 'UI', 'API', 'Authentication', 'Database')",
          },
          title: {
            type: "string",
            description: "Short descriptive title",
          },
          description: {
            type: "string",
            description: "What this feature does (2-3 sentences)",
          },
          priority: {
            type: "number",
            enum: [1, 2, 3],
            description: "Priority level: 1 (high), 2 (medium), or 3 (low)",
          },
          complexity: {
            type: "string",
            enum: ["simple", "moderate", "complex"],
            description: "Complexity level",
          },
          dependencies: {
            type: "array",
            items: {
              type: "string",
            },
            description: "Array of feature IDs this depends on (can be empty)",
          },
        },
        required: [
          "id",
          "category",
          "title",
          "description",
          "priority",
          "complexity",
          "dependencies",
        ],
      },
    },
  },
  required: ["features"],
} as const;

