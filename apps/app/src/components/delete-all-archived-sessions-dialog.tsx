"use client";

import { Archive, Trash2 } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

interface DeleteAllArchivedSessionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  archivedCount: number;
  onConfirm: () => void;
}

export function DeleteAllArchivedSessionsDialog({
  open,
  onOpenChange,
  archivedCount,
  onConfirm,
}: DeleteAllArchivedSessionsDialogProps) {
  return (
    <DeleteConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title="Delete All Archived Sessions"
      description="Are you sure you want to delete all archived sessions? This action cannot be undone."
      confirmText="Delete All"
      testId="delete-all-archived-sessions-dialog"
      confirmTestId="confirm-delete-all-archived-sessions"
    >
      <div className="flex items-center gap-3 p-4 rounded-lg bg-sidebar-accent/10 border border-sidebar-border">
        <div className="w-10 h-10 rounded-lg bg-destructive/20 border border-destructive/30 flex items-center justify-center shrink-0">
          <Archive className="w-5 h-5 text-destructive" />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-foreground">
            {archivedCount} archived session{archivedCount !== 1 ? "s" : ""}
          </p>
          <p className="text-xs text-muted-foreground">
            All sessions will be permanently deleted
          </p>
        </div>
      </div>
    </DeleteConfirmDialog>
  );
}
