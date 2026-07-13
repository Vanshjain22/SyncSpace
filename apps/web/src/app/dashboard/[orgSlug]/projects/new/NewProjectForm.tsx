"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FolderPlus } from "lucide-react";
import { z } from "zod";

import { type ApiResponse } from "@syncspace/shared";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { api, getApiErrorMessage } from "@/lib/api-client";
import { useOrgStore } from "@/stores/org.store";

const projectFormSchema = z.object({
  name: z.string().min(2, "Project name must be at least 2 characters").max(100).trim(),
  description: z
    .string()
    .max(500, "Description must be under 500 characters")
    .optional()
    .or(z.literal("")),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

interface NewProjectFormProps {
  paramsPromise: Promise<{ orgSlug: string }>;
}

export function NewProjectForm({ paramsPromise }: NewProjectFormProps) {
  const params = use(paramsPromise);
  const orgSlug = params.orgSlug;

  const router = useRouter();
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrgStore();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (payload: ProjectFormValues) => {
      const orgId = currentOrganization?.id;
      if (!orgId) {
        throw new Error("Organization context not loaded");
      }

      const res = await api.post<ApiResponse<unknown>>(`/projects/org/${orgId}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ["org-stats", currentOrganization?.id] });
      router.push(`/dashboard/${orgSlug}`);
    },
    onError: (err) => {
      setErrorMsg(getApiErrorMessage(err));
    },
  });

  const onSubmit = (values: ProjectFormValues) => {
    setErrorMsg(null);
    mutation.mutate(values);
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card p-6 shadow-card animate-fade-in max-w-lg mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-purple-600 shadow-brand-glow mb-4">
          <FolderPlus className="h-6 w-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Create a new project</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Initialize a brand new board workspace for tracking task boards.
        </p>
      </div>

      {errorMsg && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Creation Failed</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Q3 Roadmap"
                    type="text"
                    disabled={mutation.isPending}
                    {...field}
                  />
                </FormControl>
                <FormDescription>This name will represent your Kanban task boards.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description (Optional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Brief overview of project goals..."
                    type="text"
                    disabled={mutation.isPending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex items-center gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              asChild
              disabled={mutation.isPending}
            >
              <Link href={`/dashboard/${orgSlug}`}>Cancel</Link>
            </Button>
            <Button type="submit" className="flex-1" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <div className="flex items-center gap-2 justify-center">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Creating...
                </div>
              ) : (
                "Create Project"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
