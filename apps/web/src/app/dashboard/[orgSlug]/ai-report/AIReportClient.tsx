"use client";

import { type ApiResponse } from "@syncspace/shared";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Bot,
  Clipboard,
  FileText,
  Loader2,
  RefreshCw,
  Send,
  Sparkles,
  TrendingUp,
  User,
} from "lucide-react";
import { use, useEffect, useRef, useState } from "react";

import { useAI } from "@/hooks/useAI";
import { api } from "@/lib/api-client";

interface Organization {
  id: string;
  name: string;
  slug: string;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
}

interface Message {
  sender: "user" | "ai";
  text: string;
}

interface AIReportClientProps {
  paramsPromise: Promise<{ orgSlug: string }>;
}

export function AIReportClient({ paramsPromise }: AIReportClientProps) {
  const params = use(paramsPromise);
  const orgSlug = params.orgSlug;

  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [report, setReport] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);

  // Chat States
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    generateReport,
    isGeneratingReport,
    generateReportError,
    askAssistant,
    isAskingAssistant,
  } = useAI();

  // Fetch Organization Details
  const orgQuery = useQuery({
    queryKey: ["org", orgSlug],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Organization>>(`/organizations/slug/${orgSlug}`);
      return res.data;
    },
  });

  const orgId = orgQuery.data?.id;

  // Fetch Projects in this Organization
  const projectsQuery = useQuery({
    queryKey: ["projects", orgId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Project[]>>(`/projects/org/${orgId}`);
      return res.data;
    },
    enabled: !!orgId,
  });

  const projects = projectsQuery.data ?? [];

  // Pre-select first project if available
  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0]!.id);
    }
  }, [projects, selectedProjectId]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleGenerateReport = async () => {
    if (!selectedProjectId) {
      return;
    }
    try {
      const responseData = await generateReport(selectedProjectId);
      setReport(responseData.reportText);
    } catch {
      // Handled by hook error state
    }
  };

  const handleSendMessage = async (e?: React.FormEvent, customQuery?: string) => {
    e?.preventDefault();
    const query = customQuery ?? chatInput;
    if (!query.trim() || !selectedProjectId) {
      return;
    }

    if (!customQuery) {
      setChatInput("");
    }

    // Add user message
    setMessages((prev) => [...prev, { sender: "user", text: query }]);

    try {
      const responseData = await askAssistant({
        projectId: selectedProjectId,
        query,
      });
      setMessages((prev) => [...prev, { sender: "ai", text: responseData.responseText }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: "Sorry, I encountered an error trying to process that request." },
      ]);
    }
  };

  const copyToClipboard = () => {
    if (!report) {
      return;
    }
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper function to render markdown text in React without external packages
  const parseMarkdown = (text: string) => {
    if (!text) {
      return null;
    }

    const lines = text.split("\n");
    let listItems: React.ReactNode[] = [];
    const elements: React.ReactNode[] = [];

    // Table parsing states
    let inTable = false;
    let tableHeaders: string[] = [];
    let tableRows: string[][] = [];

    const flushList = (key: number) => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`list-${key}`} className="list-disc pl-6 my-3 space-y-1 text-zinc-300">
            {listItems}
          </ul>,
        );
        listItems = [];
      }
    };

    const flushTable = (key: number) => {
      if (tableHeaders.length > 0 || tableRows.length > 0) {
        elements.push(
          <div
            key={`table-wrapper-${key}`}
            className="overflow-x-auto my-4 rounded-lg border border-white/5 bg-[#0d1b2a]/30"
          >
            <table className="min-w-full divide-y divide-white/10 text-left text-xs">
              <thead className="bg-[#0b1622]">
                <tr>
                  {tableHeaders.map((h, i) => (
                    <th key={`th-${i}`} className="px-4 py-3 font-semibold text-zinc-200">
                      {h.trim()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {tableRows.map((row, rowIndex) => (
                  <tr key={`tr-${rowIndex}`} className="hover:bg-white/5 transition-colors">
                    {row.map((cell, cellIndex) => (
                      <td key={`td-${cellIndex}`} className="px-4 py-3 text-zinc-300">
                        {parseInlineMarkdown(cell.trim())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        );
        tableHeaders = [];
        tableRows = [];
        inTable = false;
      }
    };

    const parseInlineMarkdown = (inlineText: string) => {
      // Bold matches **text**
      const boldRegex = /\*\*(.*?)\*\*/g;
      const parts: React.ReactNode[] = [];
      let lastIndex = 0;
      let match;

      while ((match = boldRegex.exec(inlineText)) !== null) {
        if (match.index > lastIndex) {
          parts.push(inlineText.substring(lastIndex, match.index));
        }
        parts.push(
          <strong key={match.index} className="text-white font-bold">
            {match[1]}
          </strong>,
        );
        lastIndex = boldRegex.lastIndex;
      }
      if (lastIndex < inlineText.length) {
        parts.push(inlineText.substring(lastIndex));
      }
      return parts.length > 0 ? parts : inlineText;
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      // Check table rows (starts and ends with |)
      if (trimmed.startsWith("|")) {
        flushList(index);
        const cells = trimmed.split("|").slice(1, -1);

        // Skip separator line: |---|---|
        if (cells.every((c) => c.trim().startsWith("-"))) {
          return;
        }

        if (!inTable) {
          inTable = true;
          tableHeaders = cells;
        } else {
          tableRows.push(cells);
        }
        return;
      } else {
        flushTable(index);
      }

      // Check for headers
      if (trimmed.startsWith("#")) {
        flushList(index);
        const match = trimmed.match(/^(#{1,6})\s+(.*)$/);
        if (match) {
          const level = match[1]!.length;
          const content = parseInlineMarkdown(match[2]!);
          if (level === 1) {
            elements.push(
              <h1
                key={index}
                className="text-xl font-bold text-white mt-6 mb-3 tracking-tight border-b border-white/10 pb-1"
              >
                {content}
              </h1>,
            );
          } else if (level === 2) {
            elements.push(
              <h2
                key={index}
                className="text-lg font-semibold text-emerald-400 mt-5 mb-2.5 tracking-wide"
              >
                {content}
              </h2>,
            );
          } else {
            elements.push(
              <h3 key={index} className="text-base font-semibold text-zinc-100 mt-4 mb-2">
                {content}
              </h3>,
            );
          }
        }
        return;
      }

      // Check for lists
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        const content = parseInlineMarkdown(trimmed.substring(2));
        listItems.push(
          <li key={index} className="text-sm">
            {content}
          </li>,
        );
        return;
      } else {
        flushList(index);
      }

      // Empty line
      if (!trimmed) {
        return;
      }

      // Default paragraph
      elements.push(
        <p key={index} className="text-sm text-zinc-300 leading-relaxed my-2.5">
          {parseInlineMarkdown(trimmed)}
        </p>,
      );
    });

    // Final flush
    flushList(lines.length);
    flushTable(lines.length);

    return elements;
  };

  const suggestedQuestions = [
    "Which tasks are critical or overdue?",
    "Give me a summary of current progress.",
    "Who is assigned to the most tasks?",
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-[#040a12] p-6 text-zinc-300 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border border-white/5 bg-[#0b1622]/40 relative overflow-hidden select-none">
        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
              AI Intelligent Assistant
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-emerald-400" />
            Workspace AI Assistant
          </h1>
          <p className="text-zinc-400 text-xs max-w-xl">
            Leverage Gemini 2.5 Flash to generate executive status updates, track deadlines, uncover
            process bottlenecks, and ask direct workspace queries.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0 z-10">
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
              Selected Project
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                setReport("");
                setMessages([]);
              }}
              className="bg-[#0f1c25] border border-white/10 rounded-xl px-4 py-2 text-xs font-semibold text-white focus:outline-none focus:border-emerald-500 transition-colors"
            >
              {projects.length === 0 ? (
                <option value="">No projects found</option>
              ) : (
                projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
        <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-gradient-to-l from-emerald-500/5 to-transparent blur-2xl pointer-events-none" />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side: Report Generator */}
        <div className="flex flex-col rounded-2xl border border-white/5 bg-[#0b1622]/30 p-6 min-h-[500px]">
          <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
            <div className="flex items-center gap-2.5">
              <FileText className="w-5 h-5 text-emerald-400" />
              <div>
                <h2 className="text-sm font-black text-white tracking-wider uppercase">
                  Project Status Report
                </h2>
                <p className="text-[10px] text-zinc-500 font-medium">
                  Generate structured health summaries
                </p>
              </div>
            </div>

            {report && (
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-1 text-[10px] font-bold text-zinc-400 hover:text-emerald-400 border border-white/5 hover:border-emerald-500/20 bg-white/5 hover:bg-emerald-500/10 rounded-lg px-2.5 py-1.5 transition-all cursor-pointer"
              >
                <Clipboard className="w-3.5 h-3.5" />
                {copied ? "Copied!" : "Copy Report"}
              </button>
            )}
          </div>

          <div className="flex-1 flex flex-col justify-center">
            {isGeneratingReport ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
                <p className="text-xs text-zinc-400 animate-pulse font-semibold">
                  Analyzing database tasks and generating summary...
                </p>
              </div>
            ) : generateReportError ? (
              <div className="flex items-center gap-3 p-4 rounded-xl border border-rose-500/10 bg-rose-500/5 text-rose-400 text-xs">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{generateReportError}</span>
              </div>
            ) : report ? (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-1 overflow-y-auto max-h-[500px] pr-2 space-y-1"
              >
                <div className="prose prose-invert prose-sm max-w-none">
                  {parseMarkdown(report)}
                </div>
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 select-none">
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-500">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-white">No Report Generated Yet</p>
                  <p className="text-[10px] text-zinc-500 max-w-xs">
                    Select a project from the top right and trigger a comprehensive status update
                    below.
                  </p>
                </div>
                <button
                  onClick={handleGenerateReport}
                  disabled={!selectedProjectId}
                  className="flex items-center gap-2 text-xs font-bold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-xl px-5 py-2.5 transition-colors cursor-pointer shadow-[0_0_20px_rgba(52,211,153,0.2)] hover:shadow-[0_0_25px_rgba(52,211,153,0.35)]"
                >
                  <RefreshCw className="w-4 h-4 animate-slow-spin" />
                  Generate Status Report
                </button>
              </div>
            )}
          </div>

          {report && !isGeneratingReport && (
            <div className="mt-4 pt-4 border-t border-white/5 flex justify-end">
              <button
                onClick={handleGenerateReport}
                className="flex items-center gap-2 text-xs font-bold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl px-5 py-2.5 transition-colors cursor-pointer shadow-[0_0_20px_rgba(52,211,153,0.2)]"
              >
                <RefreshCw className="w-4 h-4" />
                Regenerate Report
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Chat Assistant */}
        <div className="flex flex-col rounded-2xl border border-white/5 bg-[#0b1622]/30 p-6 min-h-[500px]">
          <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
            <div className="flex items-center gap-2.5">
              <Bot className="w-5 h-5 text-emerald-400" />
              <div>
                <h2 className="text-sm font-black text-white tracking-wider uppercase">
                  Workspace Chat
                </h2>
                <p className="text-[10px] text-zinc-500 font-medium">
                  Ask details about active tasks
                </p>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto max-h-[360px] space-y-4 mb-4 pr-2 scrollbar-hidden">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col justify-center items-center text-center py-8 space-y-4 select-none">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">
                  Suggested Queries
                </p>
                <div className="flex flex-col gap-2 w-full max-w-sm">
                  {suggestedQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(undefined, q)}
                      disabled={!selectedProjectId}
                      className="text-left text-[11px] font-medium text-zinc-300 border border-white/5 hover:border-emerald-500/20 hover:text-white bg-[#0b1622]/40 hover:bg-emerald-500/5 rounded-xl px-4 py-2.5 transition-all cursor-pointer"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 ${
                      msg.sender === "user" ? "flex-row-reverse" : ""
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                        msg.sender === "user"
                          ? "bg-zinc-950 border-white/10 text-white"
                          : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      }`}
                    >
                      {msg.sender === "user" ? (
                        <User className="w-4 h-4" />
                      ) : (
                        <Bot className="w-4 h-4" />
                      )}
                    </div>
                    <div
                      className={`rounded-2xl px-4 py-2.5 max-w-[80%] text-xs leading-relaxed ${
                        msg.sender === "user"
                          ? "bg-white/5 border border-white/5 text-zinc-200 rounded-tr-none"
                          : "bg-[#0b1622]/60 border border-white/5 text-zinc-300 rounded-tl-none prose prose-invert max-w-none"
                      }`}
                    >
                      {msg.sender === "user" ? (
                        msg.text
                      ) : (
                        <div className="space-y-1">{parseMarkdown(msg.text)}</div>
                      )}
                    </div>
                  </div>
                ))}
                {isAskingAssistant && (
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="bg-[#0b1622]/60 border border-white/5 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                      <span className="text-[10px] text-zinc-500 font-bold animate-pulse uppercase tracking-wider">
                        Assistant is analyzing...
                      </span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Chat Input */}
          <form onSubmit={(e) => handleSendMessage(e)} className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={
                selectedProjectId
                  ? "Ask about tasks, priorities, or blockers..."
                  : "Select a project to start chatting"
              }
              disabled={!selectedProjectId || isAskingAssistant}
              className="flex-1 bg-[#0b1622]/40 border border-white/10 hover:border-white/20 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
            />
            <button
              type="submit"
              disabled={!selectedProjectId || isAskingAssistant || !chatInput.trim()}
              className="flex items-center justify-center w-11 h-11 bg-emerald-400 hover:bg-emerald-300 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-xl text-zinc-950 transition-colors cursor-pointer shrink-0 shadow-[0_0_15px_rgba(52,211,153,0.15)]"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
