import { useMemo, useCallback } from "react";
import { Feature } from "@/store/app-store";

type ColumnId = Feature["status"];

interface UseBoardColumnFeaturesProps {
  features: Feature[];
  runningAutoTasks: string[];
  searchQuery: string;
  currentWorktree: string | null; // null = main branch, string = worktree path
}

export function useBoardColumnFeatures({
  features,
  runningAutoTasks,
  searchQuery,
  currentWorktree,
}: UseBoardColumnFeaturesProps) {
  // Memoize column features to prevent unnecessary re-renders
  const columnFeaturesMap = useMemo(() => {
    const map: Record<ColumnId, Feature[]> = {
      backlog: [],
      in_progress: [],
      waiting_approval: [],
      verified: [],
      completed: [], // Completed features are shown in the archive modal, not as a column
    };

    // Filter features by search query (case-insensitive)
    const normalizedQuery = searchQuery.toLowerCase().trim();
    let filteredFeatures = normalizedQuery
      ? features.filter(
          (f) =>
            f.description.toLowerCase().includes(normalizedQuery) ||
            f.category?.toLowerCase().includes(normalizedQuery)
        )
      : features;

    // Filter by worktree:
    // - Features in backlog (no worktreePath) are always shown regardless of selected worktree
    // - Features with a worktreePath are only shown when the matching worktree is selected
    // - When main is selected (currentWorktree = null), show features without worktreePath or main branch features
    filteredFeatures = filteredFeatures.filter((f) => {
      // Backlog features (no worktreePath) should always be visible
      if (!f.worktreePath) {
        return true;
      }

      // Feature has a worktree - check if it matches selected worktree
      if (currentWorktree === null) {
        // Main is selected - only show features without worktree or explicitly on main
        return false;
      }

      // A specific worktree is selected - only show features on that worktree
      return f.worktreePath === currentWorktree;
    });

    filteredFeatures.forEach((f) => {
      // If feature has a running agent, always show it in "in_progress"
      const isRunning = runningAutoTasks.includes(f.id);
      if (isRunning) {
        map.in_progress.push(f);
      } else {
        // Otherwise, use the feature's status (fallback to backlog for unknown statuses)
        const status = f.status as ColumnId;
        if (map[status]) {
          map[status].push(f);
        } else {
          // Unknown status, default to backlog
          map.backlog.push(f);
        }
      }
    });

    // Sort backlog by priority: 1 (high) -> 2 (medium) -> 3 (low) -> no priority
    map.backlog.sort((a, b) => {
      const aPriority = a.priority ?? 999; // Features without priority go last
      const bPriority = b.priority ?? 999;
      return aPriority - bPriority;
    });

    return map;
  }, [features, runningAutoTasks, searchQuery, currentWorktree]);

  const getColumnFeatures = useCallback(
    (columnId: ColumnId) => {
      return columnFeaturesMap[columnId];
    },
    [columnFeaturesMap]
  );

  // Memoize completed features for the archive modal
  const completedFeatures = useMemo(() => {
    return features.filter((f) => f.status === "completed");
  }, [features]);

  return {
    columnFeaturesMap,
    getColumnFeatures,
    completedFeatures,
  };
}
