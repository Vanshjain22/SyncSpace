"use client";

import { useEffect, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckSquare, MessageSquare, UserPlus } from "lucide-react";

import { type ApiResponse } from "@syncspace/shared";

import { api } from "@/lib/api-client";
import { useSocket } from "@/providers/SocketProvider";

interface Notification {
  id: string;
  type:
    | "TASK_ASSIGNED"
    | "TASK_COMMENTED"
    | "TASK_STATUS_CHANGED"
    | "MENTION"
    | "INVITE_RECEIVED"
    | "INVITE_ACCEPTED";
  title: string;
  body: string;
  isRead: boolean;
  entityId: string | null;
  entityType: string | null;
  createdAt: string;
  trigger?: {
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null;
}

export function NotificationDropdown() {
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const [isOpen, setIsOpen] = useState(false);

  // 1. Fetch user notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Notification[]>>("/notifications");
      return res.data;
    },
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // 2. Mark as read mutation
  const readMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // 3. Mark all as read mutation
  const readAllMutation = useMutation({
    mutationFn: async () => {
      await api.post("/notifications/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // 4. Socket listener for real-time notifications
  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleNewNotification = () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    };

    socket.on("notification-received", handleNewNotification);

    return () => {
      socket.off("notification-received", handleNewNotification);
    };
  }, [socket, queryClient]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "TASK_ASSIGNED":
        return <UserPlus className="h-3.5 w-3.5 text-blue-500" />;
      case "TASK_COMMENTED":
        return <MessageSquare className="h-3.5 w-3.5 text-emerald-500" />;
      default:
        return <Bell className="h-3.5 w-3.5 text-primary" />;
    }
  };

  return (
    <div className="relative">
      {/* Bell Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        aria-label="View notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-4 min-w-4 px-1 rounded-full bg-destructive text-[9px] font-bold text-white flex items-center justify-center border-2 border-background">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          <div className="absolute right-0 mt-2 w-80 z-50 rounded-xl border border-border bg-popover shadow-dropdown overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-semibold text-foreground">Notifications</span>
              {unreadCount > 0 && (
                <button
                  onClick={() => readAllMutation.mutate()}
                  className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors"
                >
                  <CheckSquare className="h-3 w-3" /> Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-72 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="h-5 w-5 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No notifications yet</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    className={`w-full flex items-start gap-3 p-3 transition-colors hover:bg-accent/60 text-left relative ${
                      !n.isRead ? "bg-primary/[0.03]" : ""
                    }`}
                    onClick={() => {
                      if (!n.isRead) {
                        readMutation.mutate(n.id);
                      }
                    }}
                  >
                    {/* Icon */}
                    <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center shrink-0 mt-0.5">
                      {getNotificationIcon(n.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="text-sm font-medium text-foreground truncate">{n.title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                        {n.body}
                      </p>
                      <p className="text-[11px] text-muted-foreground/50 mt-1">
                        {new Date(n.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>

                    {/* Unread dot */}
                    {!n.isRead && (
                      <span className="absolute right-3 top-4 h-2 w-2 rounded-full bg-primary" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
