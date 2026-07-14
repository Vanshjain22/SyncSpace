"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  type ApiResponse,
  type CreateOrganizationInput,
  createOrganizationSchema,
} from "@syncspace/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

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
import { type Organization, useOrgStore } from "@/stores/org.store";

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

export function NewOrgForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setCurrentOrganization } = useOrgStore();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const form = useForm<CreateOrganizationInput>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: {
      name: "",
      slug: "",
    },
  });

  const orgName = form.watch("name");

  // Automatically sync slug with organization name
  useEffect(() => {
    const currentSlug = form.getValues("slug");
    const autoSlug = slugify(orgName);
    // Only update if slug field hasn't been manually touched or matches previous slugification
    if (!form.getFieldState("slug").isDirty || currentSlug === slugify(orgName.slice(0, -1))) {
      form.setValue("slug", autoSlug, { shouldValidate: true });
    }
  }, [orgName, form]);

  const mutation = useMutation({
    mutationFn: async (payload: CreateOrganizationInput) => {
      const res = await api.post<ApiResponse<Organization>>("/organizations", payload);
      return res.data;
    },
    onSuccess: (data) => {
      setCurrentOrganization(data);
      queryClient.invalidateQueries({ queryKey: ["user-organizations"] });
      router.push(`/dashboard/${data.slug}`);
      router.refresh();
    },
    onError: (err) => {
      setErrorMsg(getApiErrorMessage(err));
    },
  });

  const onSubmit = (values: CreateOrganizationInput) => {
    setErrorMsg(null);
    mutation.mutate(values);
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card p-6 shadow-card animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Create a new organization
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set up your workspace to collaborate with your team
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
                <FormLabel>Organization Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Acme Corp"
                    type="text"
                    disabled={mutation.isPending}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  This is the display name of your company or workspace.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Workspace URL</FormLabel>
                <div className="flex items-center rounded-md border border-input bg-transparent shadow-sm">
                  <span className="pl-3 text-sm text-muted-foreground select-none">
                    syncspace.com/
                  </span>
                  <Input
                    className="border-0 shadow-none focus-visible:ring-0 pl-1"
                    placeholder="acme-corp"
                    type="text"
                    disabled={mutation.isPending}
                    {...field}
                    onChange={(e) => {
                      field.onChange(slugify(e.target.value));
                    }}
                  />
                </div>
                <FormDescription>A unique URL-friendly handle for your workspace.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full mt-2" disabled={mutation.isPending}>
            {mutation.isPending ? (
              <div className="flex items-center gap-2 justify-center">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Creating workspace...
              </div>
            ) : (
              "Create Workspace"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}
