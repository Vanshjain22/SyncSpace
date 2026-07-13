"use client";

import { useMutation } from "@tanstack/react-query";

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
  };
}
