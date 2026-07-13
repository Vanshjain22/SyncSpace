import { FolderOpen } from "lucide-react";

import { Card } from "@/components/ui/card";

export default function FilesPage() {
  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-xl font-bold tracking-tight">Workspace Files</h1>
      <Card className="p-12 text-center max-w-md mx-auto bg-muted/20 border-border/50">
        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
          <FolderOpen className="h-6 w-6 text-emerald-500" />
        </div>
        <p className="text-sm font-bold text-zinc-300 uppercase tracking-wider">Coming Soon</p>
        <p className="text-xs text-muted-foreground mt-2">
          The project files storage manager and assets browser is coming soon in a future update.
          We're currently focus-building the Kanban board core features.
        </p>
      </Card>
    </div>
  );
}
