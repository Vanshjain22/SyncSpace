"use client";

import { type ApiResponse } from "@syncspace/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Mail, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { api, getApiErrorMessage } from "@/lib/api-client";

interface InviteDetails {
  id: string;
  email: string;
  role: string;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  sender: {
    name: string;
    email: string;
  };
}

interface InviteResolverProps {
  paramsPromise: Promise<{ token: string }>;
}

export function InviteResolver({ paramsPromise }: InviteResolverProps) {
  const params = use(paramsPromise);
  const token = params.token;

  const router = useRouter();
  const queryClient = useQueryClient();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch Invite Details
  const inviteQuery = useQuery({
    queryKey: ["invite-token", token],
    queryFn: async () => {
      const res = await api.get<ApiResponse<InviteDetails>>(`/invites/token/${token}`);
      return res.data;
    },
    retry: 0,
  });

  // Accept Mutation
  const acceptMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<ApiResponse<{ slug: string }>>(`/invites/token/${token}/accept`);
      return res.data;
    },
    onSuccess: (org) => {
      // Set session cookie indicator in case it's not present
      document.cookie = "syncspace_has_session=true; path=/; max-age=604800; SameSite=Lax";
      queryClient.invalidateQueries({ queryKey: ["user-organizations"] });
      router.push(`/dashboard/${org.slug}`);
      router.refresh();
    },
    onError: (err) => {
      setErrorMsg(getApiErrorMessage(err));
    },
  });

  // Decline Mutation
  const declineMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/invites/token/${token}/decline`);
    },
    onSuccess: () => {
      router.push("/");
    },
    onError: (err) => {
      setErrorMsg(getApiErrorMessage(err));
    },
  });

  if (inviteQuery.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-4 text-sm text-muted-foreground animate-pulse font-medium">
          Resolving invitation link...
        </p>
      </div>
    );
  }

  if (inviteQuery.isError || !inviteQuery.data) {
    const apiError = inviteQuery.error ? getApiErrorMessage(inviteQuery.error) : null;
    return (
      <div className="rounded-xl border border-border/50 bg-card p-6 text-center max-w-md mx-auto animate-fade-in">
        <div className="w-12 h-12 rounded-xl bg-destructive/15 flex items-center justify-center mx-auto mb-4">
          <XCircle className="h-6 w-6 text-destructive" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Invalid Invitation</h2>
        <p className="text-sm text-muted-foreground mb-6">
          {apiError ||
            "This invitation link is invalid, expired, or has already been accepted/declined."}
        </p>
        <Button asChild className="w-full">
          <Link href="/">Go to Home</Link>
        </Button>
      </div>
    );
  }

  const invite = inviteQuery.data;

  return (
    <div className="rounded-xl border border-border/50 bg-card p-6 max-w-md mx-auto text-center animate-fade-in">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-purple-600 shadow-brand-glow flex items-center justify-center mx-auto mb-4">
        <Mail className="h-6 w-6 text-white" />
      </div>

      <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1">Join Workspace</h1>
      <p className="text-xs text-muted-foreground mb-6">
        Invitation code:{" "}
        <code className="text-primary bg-muted px-1.5 py-0.5 rounded">{token.slice(0, 8)}</code>
      </p>

      {errorMsg && (
        <Alert variant="destructive" className="mb-6 text-left">
          <AlertTitle>Action Failed</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      <div className="rounded-xl bg-muted/20 border border-border/40 p-5 mb-8 text-left space-y-3">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground font-semibold">{invite.sender.name}</strong> (
          {invite.sender.email}) has invited you to collaborate in:
        </p>
        <div className="flex items-center gap-3 bg-muted/50 p-3 rounded-lg border border-border/50">
          <div className="h-8 w-8 rounded bg-primary/10 text-primary font-bold flex items-center justify-center">
            {invite.organization.name[0]?.toUpperCase()}
          </div>
          <div>
            <h4 className="font-bold text-sm text-foreground">{invite.organization.name}</h4>
            <p className="text-[10px] text-muted-foreground">Role permission: {invite.role}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => declineMutation.mutate()}
          disabled={acceptMutation.isPending || declineMutation.isPending}
        >
          Decline
        </Button>
        <Button
          className="flex-1"
          onClick={() => acceptMutation.mutate()}
          disabled={acceptMutation.isPending || declineMutation.isPending}
        >
          {acceptMutation.isPending ? (
            <div className="flex items-center gap-1 justify-center">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Joining...
            </div>
          ) : (
            <span className="flex items-center gap-1 justify-center">
              Accept
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
