"use client";

import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileText, Film, ImageIcon, Loader2, Paperclip, Trash2 } from "lucide-react";

import { type ApiResponse } from "@syncspace/shared";

import { api } from "@/lib/api-client";

interface FileRecord {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

interface AttachmentsPanelProps {
  taskId: string;
}

export function AttachmentsPanel({ taskId }: AttachmentsPanelProps) {
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);

  // 1. Fetch file attachments for this task
  const { data: files = [], isLoading } = useQuery({
    queryKey: ["attachments", taskId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<FileRecord[]>>(`/files/task/${taskId}`);
      return res.data;
    },
  });

  // 2. Upload Mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post<ApiResponse<FileRecord>>(
        `/files/upload/task/${taskId}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attachments", taskId] });
      queryClient.invalidateQueries({ queryKey: ["board"] }); // Invalidate board to refresh bubble indicators if any
    },
  });

  // 3. Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      await api.delete(`/files/${fileId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attachments", taskId] });
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    setIsUploading(true);
    try {
      await uploadMutation.mutateAsync(file);
    } catch (error) {
      console.error("Upload failed", error);
    } finally {
      setIsUploading(false);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) {
      return <ImageIcon className="h-4 w-4 text-blue-500" />;
    }
    if (mimeType.startsWith("video/")) {
      return <Film className="h-4 w-4 text-red-500" />;
    }
    return <FileText className="h-4 w-4 text-amber-500" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Paperclip className="h-3.5 w-3.5" /> Attachments ({files.length})
        </h4>
        <label className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors cursor-pointer flex items-center gap-1">
          {isUploading ? (
            <span className="flex items-center gap-1">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading...
            </span>
          ) : (
            <>
              <Paperclip className="h-3.5 w-3.5" /> Upload File
            </>
          )}
          <input
            type="file"
            className="hidden"
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </label>
      </div>

      {isLoading ? (
        <div className="text-xs text-muted-foreground animate-pulse">Loading attachments...</div>
      ) : files.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No file attachments added yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/30 text-xs hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0 mr-2">
                {getFileIcon(file.mimeType)}
                <div className="min-w-0">
                  <p className="font-bold text-foreground truncate max-w-[120px]" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {(file.sizeBytes / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={file.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title="Download File"
                >
                  <Download className="h-3.5 w-3.5" />
                </a>
                <button
                  onClick={() => {
                    if (confirm(`Remove attachment "${file.name}"?`)) {
                      deleteMutation.mutate(file.id);
                    }
                  }}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  title="Delete Attachment"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
