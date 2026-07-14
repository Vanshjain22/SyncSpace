"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

import { api, getApiErrorMessage } from "@/lib/api-client";

interface ReportResponse {
  success: boolean;
  data: {
    reportText: string;
  };
}

interface ChatResponse {
  success: boolean;
  data: {
    responseText: string;
  };
}

export interface AIInsightAction {
  type: "PING_USER" | "GENERATE_REPORT" | "FILTER_BLOCKED" | "ASK_AI";
  label: string;
  payload: any;
}

interface AIInsightResponse {
  success: boolean;
  data: {
    insightsText: string;
    insightsBullets: string[];
    actions: AIInsightAction[];
    metrics: {
      totalProjects: number;
      completedTasks: number;
      totalTasks: number;
      productivityScore: number;
      teamMembersCount: number;
      pendingReviewsCount?: number;
      overdueTasksCount?: number;
    };
  };
}

export function useAI() {
  // ─── Generate Report Mutation ──────────────────────────────────────────────
  const generateReportMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const response = await api.post<ReportResponse>(`/ai/projects/${projectId}/report`);
      return response.data;
    },
  });

  // ─── Ask Assistant Mutation ────────────────────────────────────────────────
  const askAssistantMutation = useMutation({
    mutationFn: async ({ projectId, query }: { projectId: string; query: string }) => {
      const response = await api.post<ChatResponse>("/ai/chat", { projectId, query });
      return response.data;
    },
  });

  // ─── Query AI Dashboard Insights ──────────────────────────────────────────
  const useOrgAIInsights = (orgId: string | undefined) => {
    return useQuery({
      queryKey: ["org-ai-insights", orgId],
      queryFn: async () => {
        const response = await api.get<AIInsightResponse>(`/ai/org/${orgId}/insights`);
        return response.data;
      },
      enabled: !!orgId,
      refetchOnWindowFocus: false,
    });
  };

  // ─── Ping Member Mutation ──────────────────────────────────────────────────
  const pingMemberMutation = useMutation({
    mutationFn: async ({ userId, taskId }: { userId: string; taskId: string }) => {
      // Simulated endpoint delay for feedback loop
      await new Promise((resolve) => setTimeout(resolve, 600));
      return { success: true, pinged: { userId, taskId } };
    },
  });

  return {
    generateReport: generateReportMutation.mutateAsync,
    isGeneratingReport: generateReportMutation.isPending,
    generateReportError: generateReportMutation.error
      ? getApiErrorMessage(generateReportMutation.error)
      : null,

    askAssistant: askAssistantMutation.mutateAsync,
    isAskingAssistant: askAssistantMutation.isPending,
    askAssistantError: askAssistantMutation.error
      ? getApiErrorMessage(askAssistantMutation.error)
      : null,

    useOrgAIInsights,
    pingMember: pingMemberMutation.mutateAsync,
    isPinging: pingMemberMutation.isPending,
  };
}
