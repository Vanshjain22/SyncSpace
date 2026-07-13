import { MessageSquare } from "lucide-react";

import { Card } from "@/components/ui/card";

export default function MessagesPage() {
  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-xl font-bold tracking-tight">Workspace Messages</h1>
      <Card className="p-12 text-center max-w-md mx-auto bg-muted/20 border-border/50">
        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
          <MessageSquare className="h-6 w-6 text-emerald-500" />
        </div>
        <p className="text-sm font-bold text-zinc-300 uppercase tracking-wider">Coming Soon</p>
        <p className="text-xs text-muted-foreground mt-2">
          The real-time team direct messages and chat channels are coming soon in a future update.
          We're currently focus-building the Kanban board core features.
        </p>
      </Card>
    </div>
  );
}
