"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { type ApiResponse } from "@syncspace/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Bell,
  Building2,
  Check,
  CheckCircle2,
  CreditCard,
  Crown,
  Globe,
  Info,
  Lock,
  Mail,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  Trash2,
  Upload,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { use, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { api, getApiErrorMessage } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth.store";
import { useOrgStore } from "@/stores/org.store";

interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  description?: string | null;
  website?: string | null;
  role?: string;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
}

interface Member {
  id: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
}

interface Invite {
  id: string;
  email: string;
  role: "ADMIN" | "MEMBER";
  token: string;
  expiresAt: string;
  createdAt: string;
  sender: {
    name: string;
    email: string;
  };
}

interface OrgSettingsProps {
  paramsPromise: Promise<{ orgSlug: string }>;
}

const orgUpdateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  description: z
    .string()
    .max(500, "Description must be under 500 characters")
    .optional()
    .or(z.literal("")),
  website: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  logoUrl: z.string().optional().or(z.literal("")),
});

type OrgUpdateValues = z.infer<typeof orgUpdateSchema>;

export function OrgSettings({ paramsPromise }: OrgSettingsProps) {
  const params = use(paramsPromise);
  const orgSlug = params.orgSlug;

  const queryClient = useQueryClient();
  const { setCurrentOrganization } = useOrgStore();
  const { user: currentUser, setUser } = useAuthStore();

  // Profile & Password & Billing States
  const [userName, setUserName] = useState("");
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [showBillingModal, setShowBillingModal] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setUserName(currentUser.name);
    }
  }, [currentUser]);

  const updateProfileMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await api.patch<{ data: { user: any } }>("/auth/me", { name });
      return res.data.user;
    },
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      setProfileSuccess("Profile name updated successfully.");
      setProfileError(null);
    },
    onError: (err) => {
      setProfileError(getApiErrorMessage(err));
      setProfileSuccess(null);
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) {
        throw new Error("New passwords do not match.");
      }
      await api.post("/auth/change-password", {
        currentPassword,
        newPassword,
      });
    },
    onSuccess: () => {
      setPasswordSuccess("Password updated successfully.");
      setPasswordError(null);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err: any) => {
      setPasswordError(err.message || getApiErrorMessage(err));
      setPasswordSuccess(null);
    },
  });

  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"general" | "members" | "profile" | "billing">(
    "general",
  );

  useEffect(() => {
    if (
      tabParam === "profile" ||
      tabParam === "billing" ||
      tabParam === "members" ||
      tabParam === "general"
    ) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [generalSuccess, setGeneralSuccess] = useState<string | null>(null);

  // Invitation State
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<boolean>(false);

  // Mock states for redesigned panels (non-functional visual parameters)
  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiModel, setAiModel] = useState("gemini");
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifPush, setNotifPush] = useState(false);
  const [notifMentions, setNotifMentions] = useState(true);
  const [securityPrivacy, setSecurityPrivacy] = useState("invite-only");
  const [security2fa, setSecurity2fa] = useState(true);
  const [brandColor, setBrandColor] = useState("#10b981");

  // 1. Fetch organization details
  const orgQuery = useQuery({
    queryKey: ["org", orgSlug],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Organization>>(`/organizations/slug/${orgSlug}`);
      return res.data;
    },
    retry: 1,
  });

  const org = orgQuery.data;
  const orgId = org?.id;

  // Determine user permission
  const userOrgRole = org?.role;
  const isOwner = userOrgRole === "OWNER";
  const isAdmin = userOrgRole === "ADMIN" || isOwner;

  // Form setup for updates
  const form = useForm<OrgUpdateValues>({
    resolver: zodResolver(orgUpdateSchema),
    defaultValues: {
      name: "",
      description: "",
      website: "",
      logoUrl: "",
    },
  });

  useEffect(() => {
    if (org) {
      form.reset({
        name: org.name || "",
        description: org.description || "",
        website: org.website || "",
        logoUrl: org.logoUrl || "",
      });
    }
  }, [org, form]);

  // 2. Fetch members
  const membersQuery = useQuery({
    queryKey: ["members", orgId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Member[]>>(`/organizations/${orgId}/members`);
      return res.data;
    },
    enabled: !!orgId,
  });

  // 3. Fetch invites
  const invitesQuery = useQuery({
    queryKey: ["invites", orgId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Invite[]>>(`/invites/org/${orgId}`);
      return res.data;
    },
    enabled: !!orgId && isAdmin,
  });

  // 4. Fetch projects
  const projectsQuery = useQuery({
    queryKey: ["projects", orgId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Project[]>>(`/projects/org/${orgId}`);
      return res.data;
    },
    enabled: !!orgId,
  });

  const projects = projectsQuery.data || [];

  // ─── Mutations ─────────────────────────────────────────────────────────────

  const updateOrgMutation = useMutation({
    mutationFn: async (values: Partial<OrgUpdateValues>) => {
      const res = await api.patch<{ data: Organization }>(`/organizations/${orgId}`, values);
      return res.data;
    },
    onSuccess: (updatedOrg) => {
      setGeneralSuccess("Organization details updated successfully.");
      setCurrentOrganization(updatedOrg);
      queryClient.invalidateQueries({ queryKey: ["org", orgSlug] });
    },
    onError: (err) => {
      setGeneralError(getApiErrorMessage(err));
    },
  });

  const sendInviteMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<ApiResponse<unknown>>(`/invites/org/${orgId}`, {
        email: inviteEmail,
        role: inviteRole,
      });
      return res.data;
    },
    onSuccess: () => {
      setInviteSuccess(true);
      setInviteEmail("");
      queryClient.invalidateQueries({ queryKey: ["invites", orgId] });
    },
    onError: (err) => {
      setInviteError(getApiErrorMessage(err));
    },
  });

  const revokeInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      await api.delete(`/invites/org/${orgId}/${inviteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invites", orgId] });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      await api.delete(`/organizations/${orgId}/members/${memberId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", orgId] });
    },
  });

  const changeRoleMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: "ADMIN" | "MEMBER" }) => {
      await api.patch(`/organizations/${orgId}/members/${memberId}`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", orgId] });
    },
  });

  const onSubmitGeneral = (values: OrgUpdateValues) => {
    setGeneralError(null);
    setGeneralSuccess(null);
    updateOrgMutation.mutate(values);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setGeneralError("Logo image size must be under 10MB");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setGeneralError(null);
      setGeneralSuccess(null);

      const uploadRes = await api.post<ApiResponse<{ url: string }>>(
        "/files/upload/logo",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      const uploadedUrl = uploadRes.data.url;
      updateOrgMutation.mutate({ logoUrl: uploadedUrl });
    } catch (err) {
      setGeneralError("Logo upload failed: " + getApiErrorMessage(err));
    }
  };

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviteSuccess(false);
    sendInviteMutation.mutate();
  };

  if (orgQuery.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-4 text-sm text-[#94a3b8] animate-pulse">Loading settings...</p>
      </div>
    );
  }

  if (orgQuery.isError || !org) {
    return (
      <div className="text-center py-16">
        <p className="text-rose-500 font-extrabold text-lg">Failed to load workspace settings.</p>
      </div>
    );
  }

  const members = membersQuery.data || [];
  const invites = invitesQuery.data || [];

  return (
    <div className="relative min-h-screen bg-[#071017] text-white overflow-hidden pb-24 pr-4 pl-4 md:pr-6 md:pl-6 pt-6">
      {/* Background radial glows */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none z-0" />
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[50%] rounded-full bg-[#10b981]/5 blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#06b6d4]/5 blur-[120px] pointer-events-none z-0" />

      <div className="relative z-10 space-y-6 max-w-7xl mx-auto">
        {/* Top actions header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <Building2 className="h-8 w-8 text-[#10b981]" />
              Workspace Settings
            </h1>
            <p className="text-[#94a3b8] text-sm mt-1 font-medium">
              Manage your organization settings, team permissions, AI engine configs, and billing
              logs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => form.reset()}
              disabled={!form.formState.isDirty}
              className="h-9 px-3 border-white/5 bg-[#0f1c25]/30 hover:bg-[#0f1c25]/60 hover:text-white transition-all text-xs font-bold"
            >
              Discard Changes
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!form.formState.isDirty || updateOrgMutation.isPending}
              onClick={form.handleSubmit(onSubmitGeneral)}
              className="h-9 px-4.5 text-xs font-bold shadow-[0_0_15px_rgba(16,185,129,0.25)]"
            >
              {updateOrgMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>

        {/* Tab selection */}
        <div className="flex border-b border-white/5 gap-6 select-none">
          <button
            onClick={() => setActiveTab("general")}
            className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors relative focus:outline-none flex items-center gap-2 ${
              activeTab === "general"
                ? "text-white font-extrabold"
                : "text-[#94a3b8] hover:text-white"
            }`}
          >
            <Settings className="h-4.5 w-4.5 text-[#10b981]" />
            General Profile
            {activeTab === "general" && (
              <motion.div
                layoutId="settingsTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#10b981]"
              />
            )}
          </button>
          <button
            onClick={() => setActiveTab("members")}
            className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors relative focus:outline-none flex items-center gap-2 ${
              activeTab === "members"
                ? "text-white font-extrabold"
                : "text-[#94a3b8] hover:text-white"
            }`}
          >
            <Users className="h-4.5 w-4.5 text-[#10b981]" />
            Members & Invites
            {activeTab === "members" && (
              <motion.div
                layoutId="settingsTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#10b981]"
              />
            )}
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors relative focus:outline-none flex items-center gap-2 ${
              activeTab === "profile"
                ? "text-white font-extrabold"
                : "text-[#94a3b8] hover:text-white"
            }`}
          >
            <Crown className="h-4.5 w-4.5 text-[#10b981]" />
            My Profile
            {activeTab === "profile" && (
              <motion.div
                layoutId="settingsTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#10b981]"
              />
            )}
          </button>
          <button
            onClick={() => setActiveTab("billing")}
            className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors relative focus:outline-none flex items-center gap-2 ${
              activeTab === "billing"
                ? "text-white font-extrabold"
                : "text-[#94a3b8] hover:text-white"
            }`}
          >
            <CreditCard className="h-4.5 w-4.5 text-[#10b981]" />
            Billing & Usage
            {activeTab === "billing" && (
              <motion.div
                layoutId="settingsTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#10b981]"
              />
            )}
          </button>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left Side: Forms / Members (70%) */}
          <div className="lg:col-span-2 space-y-6">
            {activeTab === "general" ? (
              <div className="space-y-6">
                {/* 1. General Profile Glass Card */}
                <Card className="p-6 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)] transition-shadow duration-300">
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2.5 uppercase tracking-wider border-b border-white/5 pb-3.5 mb-5">
                    <Building2 className="h-5 w-5 text-[#10b981]" />
                    Workspace Profile Form
                  </h3>

                  {generalError && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertTitle>Update Failed</AlertTitle>
                      <AlertDescription>{generalError}</AlertDescription>
                    </Alert>
                  )}

                  {generalSuccess && (
                    <Alert className="mb-4 bg-[#10b981]/10 border-[#10b981]/25 text-[#10b981]">
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertTitle>Success</AlertTitle>
                      <AlertDescription>{generalSuccess}</AlertDescription>
                    </Alert>
                  )}

                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmitGeneral)} className="space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem className="space-y-1.5">
                              <FormLabel className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider">
                                Workspace Name
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Acme Corp"
                                  type="text"
                                  disabled={!isAdmin || updateOrgMutation.isPending}
                                  className="rounded-2xl border-white/5 bg-[#071017]/40 text-sm focus:border-[#10b981]/60 focus:ring-0 text-white placeholder:text-zinc-600 transition-colors h-11"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="website"
                          render={({ field }) => (
                            <FormItem className="space-y-1.5">
                              <FormLabel className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider">
                                Website
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="https://example.com"
                                  type="text"
                                  disabled={!isAdmin || updateOrgMutation.isPending}
                                  className="rounded-2xl border-white/5 bg-[#071017]/40 text-sm focus:border-[#10b981]/60 focus:ring-0 text-white placeholder:text-zinc-600 transition-colors h-11"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider">
                              Description
                            </FormLabel>
                            <FormControl>
                              <textarea
                                placeholder="Describe the workspace purpose..."
                                disabled={!isAdmin || updateOrgMutation.isPending}
                                className="w-full min-h-[90px] rounded-2xl border border-white/5 bg-[#071017]/40 text-sm focus:border-[#10b981]/60 focus:ring-0 text-white placeholder:text-zinc-600 transition-colors p-3.5 outline-none"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Mock metadata settings parameters */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider">
                            Industry
                          </Label>
                          <select className="w-full flex h-11 items-center justify-between rounded-2xl border border-white/5 bg-[#071017]/40 px-3.5 text-sm focus:outline-none focus:border-[#10b981]/60 cursor-pointer font-bold text-white uppercase tracking-wider">
                            <option className="bg-[#0f1c25]">Technology</option>
                            <option className="bg-[#0f1c25]">Finance</option>
                            <option className="bg-[#0f1c25]">Design Agency</option>
                            <option className="bg-[#0f1c25]">Healthcare</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider">
                            Company Size
                          </Label>
                          <select className="w-full flex h-11 items-center justify-between rounded-2xl border border-white/5 bg-[#071017]/40 px-3.5 text-sm focus:outline-none focus:border-[#10b981]/60 cursor-pointer font-bold text-white uppercase tracking-wider">
                            <option className="bg-[#0f1c25]">1 - 10 members</option>
                            <option className="bg-[#0f1c25]">11 - 50 members</option>
                            <option className="bg-[#0f1c25]">50 - 250 members</option>
                            <option className="bg-[#0f1c25]">250+ enterprise</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider">
                            Custom Domain
                          </Label>
                          <Input
                            placeholder="workspace.acme.com"
                            className="rounded-2xl border-white/5 bg-[#071017]/40 text-sm focus:border-[#10b981]/60 focus:ring-0 text-white transition-colors h-11"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider">
                            Workspace Color
                          </Label>
                          <div className="flex items-center gap-2 h-11">
                            {["#10b981", "#06b6d4", "#f43f5e", "#f59e0b", "#14b8a6"].map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => setBrandColor(c)}
                                style={{ backgroundColor: c }}
                                className="w-7.5 h-7.5 rounded-full border border-white/10 relative transition-transform hover:scale-110 flex items-center justify-center"
                              >
                                {brandColor === c && (
                                  <Check className="w-4 h-4 text-zinc-950 font-black" />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-2">
                        <span className="text-xs text-[#94a3b8] font-bold">
                          Customize corporate avatars
                        </span>
                        <div className="flex items-center gap-3">
                          {org?.logoUrl && (
                            <img
                              src={org.logoUrl}
                              alt="Brand Preview"
                              className="h-8 w-8 rounded-lg object-cover border border-white/10"
                            />
                          )}
                          <input
                            type="file"
                            id="org-logo-upload-input"
                            className="hidden"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            disabled={updateOrgMutation.isPending}
                          />
                          <label htmlFor="org-logo-upload-input" className="cursor-pointer">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="border-white/5 bg-white/5 text-xs text-white pointer-events-none"
                            >
                              <Upload className="w-4 h-4 mr-1.5" /> Upload Brand Logo
                            </Button>
                          </label>
                        </div>
                      </div>
                    </form>
                  </Form>
                </Card>

                {/* 2. AI engine configuration */}
                <Card className="p-6 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)] transition-shadow duration-300">
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2.5 uppercase tracking-wider border-b border-white/5 pb-3.5 mb-5">
                    <Sparkles className="h-5 w-5 text-[#10b981]" />
                    AI Engine Configs
                  </h3>

                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-bold text-white block">
                          Enable AI Autopilot
                        </Label>
                        <span className="text-xs text-[#94a3b8] block mt-0.5">
                          Let SyncSpace automate backlog sorting and tasks predictions.
                        </span>
                      </div>
                      <button
                        onClick={() => setAiEnabled(!aiEnabled)}
                        className={`w-11 h-6 rounded-full p-0.5 transition-colors relative duration-300 ${aiEnabled ? "bg-[#10b981]" : "bg-white/10"}`}
                      >
                        <motion.div
                          layout
                          className="w-5 h-5 rounded-full bg-zinc-950"
                          animate={{ x: aiEnabled ? 20 : 0 }}
                        />
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider">
                        AI Diagnostic Engine Model
                      </Label>
                      <select
                        value={aiModel}
                        onChange={(e) => setAiModel(e.target.value)}
                        className="w-full flex h-11 items-center justify-between rounded-2xl border border-white/5 bg-[#071017]/40 px-3.5 text-sm focus:outline-none focus:border-[#10b981]/60 cursor-pointer font-bold text-white uppercase tracking-wider"
                      >
                        <option value="gemini" className="bg-[#0f1c25]">
                          Gemini Pro 1.5 (Recommended)
                        </option>
                        <option value="claude" className="bg-[#0f1c25]">
                          Claude 3.5 Sonnet
                        </option>
                        <option value="gpt" className="bg-[#0f1c25]">
                          GPT-4o Omniverse
                        </option>
                        <option value="deepseek" className="bg-[#0f1c25]">
                          DeepSeek Coder V2
                        </option>
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/5 pt-4 text-xs font-bold text-[#94a3b8]">
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          defaultChecked
                          className="rounded border-zinc-700 bg-zinc-950 text-[#10b981] focus:ring-0 h-4.5 w-4.5"
                        />
                        <span>Smart Suggestions</span>
                      </label>
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          defaultChecked
                          className="rounded border-zinc-700 bg-zinc-950 text-[#10b981] focus:ring-0 h-4.5 w-4.5"
                        />
                        <span>Auto Sprint Planning</span>
                      </label>
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          defaultChecked
                          className="rounded border-zinc-700 bg-zinc-950 text-[#10b981] focus:ring-0 h-4.5 w-4.5"
                        />
                        <span>Meeting Summaries</span>
                      </label>
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          defaultChecked
                          className="rounded border-zinc-700 bg-zinc-950 text-[#10b981] focus:ring-0 h-4.5 w-4.5"
                        />
                        <span>Task Predictions</span>
                      </label>
                    </div>
                  </div>
                </Card>

                {/* 3. Notifications card */}
                <Card className="p-6 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)] transition-shadow duration-300">
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2.5 uppercase tracking-wider border-b border-white/5 pb-3.5 mb-5">
                    <Bell className="h-5 w-5 text-[#10b981]" />
                    Notification Preferences
                  </h3>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-bold text-white block">Email Alerts</span>
                        <span className="text-xs text-[#94a3b8] block mt-0.5">
                          Send daily workload digests and tasks actions updates.
                        </span>
                      </div>
                      <button
                        onClick={() => setNotifEmail(!notifEmail)}
                        className={`w-11 h-6 rounded-full p-0.5 transition-colors relative duration-300 ${notifEmail ? "bg-[#10b981]" : "bg-white/10"}`}
                      >
                        <motion.div
                          layout
                          className="w-5 h-5 rounded-full bg-zinc-950"
                          animate={{ x: notifEmail ? 20 : 0 }}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-bold text-white block">
                          Push Notifications
                        </span>
                        <span className="text-xs text-[#94a3b8] block mt-0.5">
                          Receive immediate alerts inside browser view on updates.
                        </span>
                      </div>
                      <button
                        onClick={() => setNotifPush(!notifPush)}
                        className={`w-11 h-6 rounded-full p-0.5 transition-colors relative duration-300 ${notifPush ? "bg-[#10b981]" : "bg-white/10"}`}
                      >
                        <motion.div
                          layout
                          className="w-5 h-5 rounded-full bg-zinc-950"
                          animate={{ x: notifPush ? 20 : 0 }}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-bold text-white block">
                          Mentions & Assignments
                        </span>
                        <span className="text-xs text-[#94a3b8] block mt-0.5">
                          Only trigger system push alerts when teammate tags profile.
                        </span>
                      </div>
                      <button
                        onClick={() => setNotifMentions(!notifMentions)}
                        className={`w-11 h-6 rounded-full p-0.5 transition-colors relative duration-300 ${notifMentions ? "bg-[#10b981]" : "bg-white/10"}`}
                      >
                        <motion.div
                          layout
                          className="w-5 h-5 rounded-full bg-zinc-950"
                          animate={{ x: notifMentions ? 20 : 0 }}
                        />
                      </button>
                    </div>
                  </div>
                </Card>

                {/* 4. Security configuration */}
                <Card className="p-6 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)] transition-shadow duration-300">
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2.5 uppercase tracking-wider border-b border-white/5 pb-3.5 mb-5">
                    <Lock className="h-5 w-5 text-[#10b981]" />
                    Workspace Security
                  </h3>

                  <div className="space-y-5">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider">
                        Workspace Privacy
                      </Label>
                      <select
                        value={securityPrivacy}
                        onChange={(e) => setSecurityPrivacy(e.target.value)}
                        className="w-full flex h-11 items-center justify-between rounded-2xl border border-white/5 bg-[#071017]/40 px-3.5 text-sm focus:outline-none focus:border-[#10b981]/60 cursor-pointer font-bold text-white uppercase tracking-wider"
                      >
                        <option value="public" className="bg-[#0f1c25]">
                          Public (Searchable by anyone)
                        </option>
                        <option value="private" className="bg-[#0f1c25]">
                          Private (Hidden from search engines)
                        </option>
                        <option value="invite-only" className="bg-[#0f1c25]">
                          Invite Only (Need invite tokens to join)
                        </option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/5 pt-4">
                      <div>
                        <span className="text-sm font-bold text-white block">
                          Two-Factor Authentication (2FA)
                        </span>
                        <span className="text-xs text-[#94a3b8] block mt-0.5">
                          Force all Admins and Owners to set up OTP.
                        </span>
                      </div>
                      <button
                        onClick={() => setSecurity2fa(!security2fa)}
                        className={`w-11 h-6 rounded-full p-0.5 transition-colors relative duration-300 ${security2fa ? "bg-[#10b981]" : "bg-white/10"}`}
                      >
                        <motion.div
                          layout
                          className="w-5 h-5 rounded-full bg-zinc-950"
                          animate={{ x: security2fa ? 20 : 0 }}
                        />
                      </button>
                    </div>
                  </div>
                </Card>

                {/* 5. Team role permissions preview */}
                <Card className="p-6 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)] transition-shadow duration-300">
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2.5 uppercase tracking-wider border-b border-white/5 pb-3.5 mb-5">
                    <Sliders className="h-5 w-5 text-[#10b981]" />
                    Team Roles Settings
                  </h3>

                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2.5">
                      <div className="px-3 py-1.5 rounded-full border border-yellow-500/20 bg-yellow-500/10 text-yellow-500 text-xs font-bold flex items-center gap-1.5">
                        <Crown className="w-3.5 h-3.5" /> OWNER
                      </div>
                      <div className="px-3 py-1.5 rounded-full border border-[#10b981]/20 bg-[#10b981]/10 text-[#10b981] text-xs font-bold">
                        ADMIN
                      </div>
                      <div className="px-3 py-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/10 text-[#06b6d4] text-xs font-bold">
                        EDITOR
                      </div>
                      <div className="px-3 py-1.5 rounded-full border border-zinc-700 bg-zinc-800/40 text-[#94a3b8] text-xs font-bold">
                        VIEWER
                      </div>
                      <div className="px-3 py-1.5 rounded-full border border-zinc-800 bg-zinc-900/40 text-zinc-500 text-xs font-bold">
                        GUEST
                      </div>
                    </div>
                    <p className="text-xs text-[#94a3b8] leading-relaxed">
                      Admins hold configurations permissions. Editors edit task boards. Viewers are
                      read-only. Guests have temporary single-board access.
                    </p>
                  </div>
                </Card>

                {/* 6. Preferences Card */}
                <Card className="p-6 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)] transition-shadow duration-300">
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2.5 uppercase tracking-wider border-b border-white/5 pb-3.5 mb-5">
                    <Globe className="h-5 w-5 text-[#10b981]" />
                    Local Preferences
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-bold">
                    <div className="space-y-1.5">
                      <Label className="text-[#94a3b8] uppercase tracking-wider">Timezone</Label>
                      <select className="w-full flex h-11 items-center justify-between rounded-2xl border border-white/5 bg-[#071017]/40 px-3 py-1 cursor-pointer text-white">
                        <option className="bg-[#0f1c25]">GMT +05:30 (IST)</option>
                        <option className="bg-[#0f1c25]">GMT -08:00 (PST)</option>
                        <option className="bg-[#0f1c25]">GMT +00:00 (UTC)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[#94a3b8] uppercase tracking-wider">Language</Label>
                      <select className="w-full flex h-11 items-center justify-between rounded-2xl border border-white/5 bg-[#071017]/40 px-3 py-1 cursor-pointer text-white">
                        <option className="bg-[#0f1c25]">English (US)</option>
                        <option className="bg-[#0f1c25]">Spanish (ES)</option>
                        <option className="bg-[#0f1c25]">Japanese (JP)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[#94a3b8] uppercase tracking-wider">DateFormat</Label>
                      <select className="w-full flex h-11 items-center justify-between rounded-2xl border border-white/5 bg-[#071017]/40 px-3 py-1 cursor-pointer text-white">
                        <option className="bg-[#0f1c25]">MM/DD/YYYY</option>
                        <option className="bg-[#0f1c25]">DD-MM-YYYY</option>
                        <option className="bg-[#0f1c25]">YYYY-MM-DD</option>
                      </select>
                    </div>
                  </div>
                </Card>

                {/* 7. Danger Zone Card */}
                <Card className="p-6 border-rose-500/20 bg-rose-500/[0.02] hover:shadow-[0_0_40px_rgba(244,63,94,0.15)] transition-shadow duration-300">
                  <h3 className="text-base font-extrabold text-rose-500 flex items-center gap-2.5 uppercase tracking-wider border-b border-rose-500/10 pb-3.5 mb-5">
                    <AlertTriangle className="h-5 w-5 text-rose-500" />
                    Danger Zone
                  </h3>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <span className="text-sm font-bold text-white block">
                          Archive Workspace
                        </span>
                        <span className="text-xs text-[#94a3b8] block mt-0.5">
                          Temporarily freeze all projects, boards, and members active logs.
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-rose-500/20 text-rose-400 hover:bg-rose-500/10 text-xs font-bold shrink-0"
                      >
                        Archive
                      </Button>
                    </div>

                    <div className="flex items-center justify-between gap-4 border-t border-rose-500/10 pt-4">
                      <div>
                        <span className="text-sm font-bold text-white block">Delete Workspace</span>
                        <span className="text-xs text-[#94a3b8] block mt-0.5">
                          Permanently delete this organization, including all metadata database
                          entries.
                        </span>
                      </div>
                      <Button
                        variant="danger"
                        size="sm"
                        className="bg-[#f43f5e] hover:bg-red-600 text-xs font-bold shrink-0"
                      >
                        Delete Workspace
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            ) : activeTab === "members" ? (
              <div className="space-y-6">
                {/* Active Team members cards */}
                <Card className="p-6 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)] transition-shadow duration-300">
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2.5 uppercase tracking-wider border-b border-white/5 pb-3.5 mb-5">
                    <Users className="h-5 w-5 text-[#10b981]" />
                    Active Members ({members.length})
                  </h3>

                  <div className="divide-y divide-white/5">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="py-4 flex items-center justify-between first:pt-0 last:pb-0"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="h-10 w-10 rounded-xl bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/20 flex items-center justify-center font-bold text-sm shrink-0">
                            {member.user.name[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-sm text-white truncate block">
                              {member.user.name}
                              {member.user.id === currentUser?.id && (
                                <span className="text-[9px] bg-[#10b981]/15 text-[#10b981] font-bold px-2 py-0.5 rounded-full ml-1.5 tracking-wider uppercase border border-[#10b981]/20">
                                  You
                                </span>
                              )}
                            </h4>
                            <span className="text-xs text-[#94a3b8]/75 truncate block mt-0.5">
                              {member.user.email}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                          {/* Role Selector dropdown */}
                          {isOwner &&
                          member.user.id !== currentUser?.id &&
                          member.role !== "OWNER" ? (
                            <select
                              value={member.role}
                              onChange={(e) =>
                                changeRoleMutation.mutate({
                                  memberId: member.id,
                                  role: e.target.value as "ADMIN" | "MEMBER",
                                })
                              }
                              className="bg-[#0f1c25] border border-white/5 rounded-xl px-2 py-1 text-xs text-white focus:outline-none focus:border-[#10b981]/50 cursor-pointer font-semibold"
                            >
                              <option value="MEMBER">Member</option>
                              <option value="ADMIN">Admin</option>
                            </select>
                          ) : (
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/5 border border-white/5 text-[#94a3b8] flex items-center gap-1.5">
                              {member.role === "OWNER" ? (
                                <ShieldAlert className="h-3.5 w-3.5 text-[#f59e0b]" />
                              ) : (
                                <ShieldCheck className="h-3.5 w-3.5 text-[#10b981]" />
                              )}
                              {member.role}
                            </span>
                          )}

                          {/* Member revocation button */}
                          {isAdmin &&
                            member.user.id !== currentUser?.id &&
                            member.role !== "OWNER" && (
                              <button
                                onClick={() => {
                                  if (confirm(`Remove ${member.user.name} from the workspace?`)) {
                                    removeMemberMutation.mutate(member.id);
                                  }
                                }}
                                className="text-zinc-500 hover:text-[#f43f5e] transition-colors p-1"
                                title="Remove member"
                              >
                                <UserMinus className="h-4.5 w-4.5" />
                              </button>
                            )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Team Invitations panels */}
                {isAdmin && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Invite form widget */}
                    <Card className="p-6 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)] transition-shadow duration-300">
                      <h3 className="text-base font-extrabold text-white flex items-center gap-2.5 uppercase tracking-wider border-b border-white/5 pb-3.5 mb-4">
                        <UserPlus className="h-5 w-5 text-[#10b981]" />
                        Invite New Member
                      </h3>

                      {inviteError && (
                        <Alert variant="destructive" className="mb-3">
                          <AlertDescription>{inviteError}</AlertDescription>
                        </Alert>
                      )}

                      {inviteSuccess && (
                        <Alert className="mb-3 bg-[#10b981]/10 border-[#10b981]/25 text-[#10b981]">
                          <CheckCircle2 className="h-4 w-4" />
                          <AlertDescription>Invitation token generated.</AlertDescription>
                        </Alert>
                      )}

                      <form onSubmit={handleSendInvite} className="space-y-4">
                        <div className="space-y-1.5">
                          <Label
                            htmlFor="email"
                            className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider"
                          >
                            Email Address
                          </Label>
                          <Input
                            id="email"
                            type="email"
                            required
                            placeholder="teammate@example.com"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            disabled={sendInviteMutation.isPending}
                            className="rounded-2xl border-white/5 bg-[#071017]/40 text-sm focus:border-[#10b981]/60 focus:ring-0 text-white h-11"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label
                            htmlFor="role"
                            className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider"
                          >
                            Role Permission
                          </Label>
                          <select
                            id="role"
                            value={inviteRole}
                            onChange={(e) => setInviteRole(e.target.value as "ADMIN" | "MEMBER")}
                            className="w-full flex h-11 items-center justify-between rounded-2xl border border-white/5 bg-[#071017]/40 px-3 text-sm focus:outline-none focus:border-[#10b981]/60 cursor-pointer font-bold text-white uppercase tracking-wider"
                            disabled={sendInviteMutation.isPending}
                          >
                            <option value="MEMBER" className="bg-[#0f1c25]">
                              Member (Read/Write)
                            </option>
                            <option value="ADMIN" className="bg-[#0f1c25]">
                              Admin (Full control)
                            </option>
                          </select>
                        </div>

                        <Button
                          type="submit"
                          disabled={sendInviteMutation.isPending}
                          className="w-full h-11 text-sm font-bold shadow-[0_0_15px_rgba(16,185,129,0.2)] mt-2"
                        >
                          {sendInviteMutation.isPending ? "Sending..." : "Create Invitation"}
                        </Button>
                      </form>
                    </Card>

                    {/* Pending Invites list widget */}
                    <Card className="p-6 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)] transition-shadow duration-300">
                      <h3 className="text-base font-extrabold text-white flex items-center gap-2.5 uppercase tracking-wider border-b border-white/5 pb-3.5 mb-4">
                        <Mail className="h-5 w-5 text-[#10b981]" />
                        Pending Invitations
                      </h3>

                      {invites.length === 0 ? (
                        <p className="text-sm text-[#94a3b8]/50 text-center py-10 italic">
                          No pending invitations.
                        </p>
                      ) : (
                        <div className="divide-y divide-white/5 max-h-[220px] overflow-y-auto pr-2">
                          {invites.map((invite) => (
                            <div
                              key={invite.id}
                              className="py-3 flex items-center justify-between first:pt-0 last:pb-0"
                            >
                              <div className="min-w-0 flex-1 mr-3">
                                <p className="text-sm font-bold text-white truncate">
                                  {invite.email}
                                </p>
                                <button
                                  onClick={() => {
                                    const link = `${window.location.origin}/invites/${invite.token}`;
                                    navigator.clipboard.writeText(link);
                                    alert("Link copied!");
                                  }}
                                  className="text-[10px] font-bold text-[#10b981] hover:underline block text-left mt-0.5"
                                  title="Click to copy invite URL"
                                >
                                  Copy accept link
                                </button>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                <span className="text-[9px] bg-white/5 border border-white/5 text-[#94a3b8] font-bold px-2 py-0.5 rounded-full">
                                  {invite.role}
                                </span>
                                <button
                                  onClick={() => {
                                    if (confirm(`Revoke invitation for ${invite.email}?`)) {
                                      revokeInviteMutation.mutate(invite.id);
                                    }
                                  }}
                                  className="text-zinc-500 hover:text-[#f43f5e] transition-colors p-1"
                                  title="Revoke invite"
                                >
                                  <Trash2 className="h-4.5 w-4.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  </div>
                )}
              </div>
            ) : activeTab === "profile" ? (
              <div className="space-y-6">
                {/* User Information Card */}
                <Card className="p-6 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)] transition-shadow duration-300">
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2.5 uppercase tracking-wider border-b border-white/5 pb-3.5 mb-5">
                    <Building2 className="h-5 w-5 text-[#10b981]" />
                    My Account Profile
                  </h3>

                  <div className="space-y-6">
                    {profileSuccess && (
                      <Alert className="mb-2 bg-[#10b981]/10 border-[#10b981]/25 text-[#10b981] py-2 px-3">
                        <AlertDescription className="text-xs font-bold">
                          {profileSuccess}
                        </AlertDescription>
                      </Alert>
                    )}

                    {profileError && (
                      <Alert variant="destructive" className="mb-2 py-2 px-3">
                        <AlertDescription className="text-xs font-bold">
                          {profileError}
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="flex items-center gap-4.5">
                      <div className="h-16 w-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[#10b981] font-black text-xl shadow-inner">
                        {currentUser?.name?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <span className="text-sm font-bold text-white block">
                          {currentUser?.name || "Vansh Jain"}
                        </span>
                        <span className="text-xs text-[#94a3b8] block mt-0.5">
                          {currentUser?.email || "vansh@example.com"}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div className="space-y-1.5">
                        <Label className="text-[#94a3b8] uppercase tracking-wider text-xs font-bold">
                          User Name
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            value={userName}
                            onChange={(e) => setUserName(e.target.value)}
                            disabled={updateProfileMutation.isPending}
                            className="bg-white/[0.02] border-white/5 text-slate-300 font-bold focus:border-[#10b981]/60 h-11"
                          />
                          {userName !== currentUser?.name && userName.trim().length >= 2 && (
                            <Button
                              onClick={() => updateProfileMutation.mutate(userName)}
                              disabled={updateProfileMutation.isPending}
                              variant="primary"
                              size="sm"
                              className="h-11 px-4 text-xs font-bold shadow-sm"
                            >
                              {updateProfileMutation.isPending ? "Saving..." : "Save"}
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[#94a3b8] uppercase tracking-wider text-xs font-bold">
                          Email Address
                        </Label>
                        <Input
                          value={currentUser?.email || ""}
                          disabled
                          className="bg-white/[0.02] border-white/5 text-slate-500 font-bold h-11 cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div className="border-t border-white/5 pt-4">
                      <div className="flex items-center justify-between text-xs text-zinc-500">
                        <span>
                          User Account ID:{" "}
                          <span className="font-mono text-[10px] text-zinc-400 font-bold">
                            {currentUser?.id || "N/A"}
                          </span>
                        </span>
                        <span>Created: July 2026</span>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Password Change form card */}
                <Card className="p-6 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)] transition-shadow duration-300">
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2.5 uppercase tracking-wider border-b border-white/5 pb-3.5 mb-5">
                    <Lock className="h-5 w-5 text-[#10b981]" />
                    Security Settings
                  </h3>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setPasswordError(null);
                      setPasswordSuccess(null);
                      if (newPassword.length < 6) {
                        setPasswordError("New password must be at least 6 characters long.");
                        return;
                      }
                      if (newPassword !== confirmPassword) {
                        setPasswordError("New passwords do not match.");
                        return;
                      }
                      changePasswordMutation.mutate();
                    }}
                    className="space-y-4.5"
                  >
                    {passwordSuccess && (
                      <Alert className="bg-[#10b981]/10 border-[#10b981]/25 text-[#10b981] py-2 px-3">
                        <AlertDescription className="text-xs font-bold">
                          {passwordSuccess}
                        </AlertDescription>
                      </Alert>
                    )}

                    {passwordError && (
                      <Alert variant="destructive" className="py-2 px-3">
                        <AlertDescription className="text-xs font-bold">
                          {passwordError}
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="space-y-1.5">
                      <Label className="text-[#94a3b8] uppercase tracking-wider text-xs font-bold">
                        Current Password
                      </Label>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        disabled={changePasswordMutation.isPending}
                        className="bg-white/[0.01] border-white/5 focus:border-[#10b981]/60 h-11"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[#94a3b8] uppercase tracking-wider text-xs font-bold">
                        New Password
                      </Label>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        disabled={changePasswordMutation.isPending}
                        className="bg-white/[0.01] border-white/5 focus:border-[#10b981]/60 h-11"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[#94a3b8] uppercase tracking-wider text-xs font-bold">
                        Confirm New Password
                      </Label>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={changePasswordMutation.isPending}
                        className="bg-white/[0.01] border-white/5 focus:border-[#10b981]/60 h-11"
                      />
                    </div>
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={changePasswordMutation.isPending}
                      className="h-9 px-4.5 text-xs font-bold shadow-sm"
                    >
                      {changePasswordMutation.isPending ? "Updating..." : "Update Password"}
                    </Button>
                  </form>
                </Card>
              </div>
            ) : (
              <div className="space-y-6 animate-fade-in">
                {/* Billing Summary Card */}
                <Card className="p-6 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)] transition-shadow duration-300">
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2.5 uppercase tracking-wider border-b border-white/5 pb-3.5 mb-5">
                    <CreditCard className="h-5 w-5 text-[#10b981]" />
                    Subscription Plan Details
                  </h3>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs text-[#94a3b8] uppercase tracking-wider block">
                          Current Plan
                        </span>
                        <h4 className="text-lg font-black text-white mt-1 flex items-center gap-2">
                          SyncSpace Pro Plan
                          <Badge
                            variant="success"
                            className="text-[9px] uppercase font-bold py-0.5 px-2"
                          >
                            Active
                          </Badge>
                        </h4>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-[#94a3b8] uppercase tracking-wider block">
                          Cost
                        </span>
                        <span className="text-lg font-black text-[#10b981] mt-1 block">
                          $12 / seat / mo
                        </span>
                      </div>
                    </div>

                    {/* Usage Progress sections */}
                    <div className="space-y-4 border-t border-white/5 pt-4.5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                        Resource Usage Overview
                      </h4>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-[#94a3b8]">Workspace seats occupied</span>
                          <span className="text-white">{members.length} / 20 seats</span>
                        </div>
                        <Progress
                          value={(members.length / 20) * 100}
                          className="h-1.5 bg-white/5"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-[#94a3b8]">Projects usage allowance</span>
                          <span className="text-white">{projects.length} / 15 projects</span>
                        </div>
                        <Progress
                          value={(projects.length / 15) * 100}
                          className="h-1.5 bg-white/5"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-[#94a3b8]">Storage cap usage</span>
                          <span className="text-white">4.2 GB / 50 GB Used</span>
                        </div>
                        <Progress value={(4.2 / 50) * 100} className="h-1.5 bg-white/5" />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 border-t border-white/5 pt-4.5">
                      <Button
                        onClick={() => setShowBillingModal(true)}
                        variant="primary"
                        className="h-9 px-4.5 text-xs font-bold shadow-sm cursor-pointer"
                      >
                        Upgrade Tier
                      </Button>
                      <Button
                        onClick={() => setShowBillingModal(true)}
                        variant="outline"
                        className="h-9 px-4.5 text-xs font-bold border-white/5 hover:bg-white/5 text-zinc-300 hover:text-white cursor-pointer"
                      >
                        Manage Subscription
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* Invoices List Table Card */}
                <Card className="p-6 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)] transition-shadow duration-300">
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2.5 uppercase tracking-wider border-b border-white/5 pb-3.5 mb-5">
                    <CreditCard className="h-5 w-5 text-[#10b981]" />
                    Past Invoices Logs
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-bold border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 text-zinc-500 uppercase tracking-wider">
                          <th className="pb-3 font-bold">Invoice Ref</th>
                          <th className="pb-3 font-bold">Billing Date</th>
                          <th className="pb-3 font-bold">Amount</th>
                          <th className="pb-3 font-bold text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-slate-300">
                        <tr>
                          <td className="py-3.5 font-mono text-[#10b981]">INV-2026-001</td>
                          <td className="py-3.5 text-zinc-400">July 01, 2026</td>
                          <td className="py-3.5 text-white">$12.00</td>
                          <td className="py-3.5 text-right">
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[#10b981] font-extrabold">
                              Paid
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td className="py-3.5 font-mono text-[#10b981]">INV-2026-002</td>
                          <td className="py-3.5 text-zinc-400">June 01, 2026</td>
                          <td className="py-3.5 text-white">$12.00</td>
                          <td className="py-3.5 text-right">
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[#10b981] font-extrabold">
                              Paid
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}
          </div>

          {/* Right Side: Sticky Overview Panel (30%) */}
          <div className="space-y-6 lg:sticky lg:top-24">
            {activeTab === "profile" ? (
              <Card className="p-6 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] transition-shadow duration-300 space-y-5">
                <div className="flex items-center gap-2.5 border-b border-white/5 pb-3">
                  <Info className="h-5 w-5 text-[#10b981]" />
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                    Account Summary
                  </h3>
                </div>

                <div className="flex flex-col items-center text-center space-y-3 py-2">
                  <div className="h-16 w-16 rounded-3xl bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 flex items-center justify-center font-black text-2xl shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                    {currentUser?.name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <h4 className="text-base font-extrabold text-white">{currentUser?.name}</h4>
                    <span className="text-xs text-[#94a3b8] font-bold block mt-0.5">
                      {currentUser?.email}
                    </span>
                  </div>
                </div>

                <div className="space-y-3.5 text-xs font-semibold border-t border-white/5 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[#94a3b8]">Security Rating</span>
                    <span className="text-[#10b981] font-bold">98% (Secure)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#94a3b8]">Two-Factor (2FA)</span>
                    <span className="text-emerald-400 font-bold">Activated</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#94a3b8]">Active Sessions</span>
                    <span className="text-white font-bold">1 Windows PC</span>
                  </div>
                </div>
              </Card>
            ) : activeTab === "billing" ? (
              <Card className="p-6 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] transition-shadow duration-300 space-y-5">
                <div className="flex items-center gap-2.5 border-b border-white/5 pb-3">
                  <Info className="h-5 w-5 text-[#10b981]" />
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                    Billing Overview
                  </h3>
                </div>

                <div className="flex flex-col items-center text-center space-y-3 py-2">
                  <div className="h-16 w-16 rounded-3xl bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 flex items-center justify-center font-black text-2xl shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                    $
                  </div>
                  <div>
                    <h4 className="text-base font-extrabold text-white">Stripe Subscription</h4>
                    <Badge
                      variant="success"
                      className="text-[10px] uppercase font-bold py-0.5 px-2.5 mt-1"
                    >
                      Active
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3.5 text-xs font-semibold border-t border-white/5 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[#94a3b8]">Cycle Frequency</span>
                    <span className="text-white font-bold">Monthly</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#94a3b8]">Renewal Date</span>
                    <span className="text-emerald-400 font-bold">Aug 01, 2026</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#94a3b8]">Registered Seats</span>
                    <span className="text-white font-bold">{members.length} seats</span>
                  </div>
                </div>
              </Card>
            ) : (
              <>
                {/* Summary Overview Card */}
                <Card className="p-6 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] transition-shadow duration-300 space-y-5">
                  <div className="flex items-center gap-2.5 border-b border-white/5 pb-3">
                    <Info className="h-5 w-5 text-[#10b981]" />
                    <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                      Workspace Summary
                    </h3>
                  </div>

                  <div className="flex flex-col items-center text-center space-y-3 py-2">
                    {org.logoUrl ? (
                      <img
                        src={org.logoUrl}
                        alt={`${org.name} Logo`}
                        className="h-16 w-16 rounded-3xl object-cover shadow-[0_0_20px_rgba(16,185,129,0.2)] border border-white/10"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-3xl bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 flex items-center justify-center font-black text-2xl shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                        {org.name[0]?.toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h4 className="text-base font-extrabold text-white">{org.name}</h4>
                      <Badge
                        variant="success"
                        className="text-[10px] uppercase font-bold py-0.5 px-2.5 mt-1"
                      >
                        Pro Plan
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-3.5 text-xs font-semibold">
                    <div className="flex items-center justify-between">
                      <span className="text-[#94a3b8]">Workspace Health</span>
                      <span className="text-[#10b981] font-bold">96/100 (Optimal)</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[#94a3b8]">Total Members</span>
                      <span className="text-white font-bold">{members.length} seats</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[#94a3b8]">Total Projects</span>
                      <span className="text-white font-bold">{projects.length} active</span>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[#94a3b8]">Storage Used</span>
                        <span className="text-white font-bold">4.2 GB / 50 GB (8.4%)</span>
                      </div>
                      <Progress
                        value={8.4}
                        className="h-1.5"
                        indicatorClassName="from-emerald-500 to-teal-500"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[#94a3b8]">Created On</span>
                      <span className="text-white font-bold">Jul 2026</span>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <span className="text-[#94a3b8] text-[10px] block uppercase tracking-wider">
                        Workspace ID
                      </span>
                      <div className="flex items-center gap-2 bg-[#071017]/40 border border-white/5 rounded-xl p-2">
                        <span className="font-mono text-[10px] text-zinc-500 select-all truncate flex-1">
                          {org.id}
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(org.id);
                            alert("Workspace ID copied!");
                          }}
                          className="text-[10px] text-[#10b981] font-bold shrink-0 hover:underline"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Billing limits overview */}
                <Card className="p-6 hover:shadow-[0_0_30px_rgba(245,158,11,0.1)] transition-shadow duration-300 space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <Crown className="w-4 h-4 text-amber-500" />
                    </div>
                    <span className="text-xs font-extrabold uppercase tracking-wider text-white">
                      Billing usage limits
                    </span>
                  </div>
                  <p className="text-xs text-[#94a3b8] leading-relaxed font-semibold">
                    You are utilizing 12% of your monthly seat quotas. Upgrade to unlock unlimited
                    file storage.
                  </p>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => setShowBillingModal(true)}
                    className="w-full text-xs font-bold h-9 cursor-pointer"
                  >
                    Upgrade Workspace
                  </Button>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Bottom Save Bar when form is dirty */}
      <AnimatePresence>
        {form.formState.isDirty && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-6 left-6 right-6 z-50 rounded-3xl border border-white/5 bg-[#0f1c25]/90 backdrop-blur-xl p-4.5 flex items-center justify-between shadow-2xl max-w-4xl mx-auto"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
              <span className="text-xs font-bold text-white">
                Unsaved workspace profile modifications
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => form.reset()}
                className="h-9 border-white/5 bg-white/5 text-xs font-bold text-white"
              >
                Discard
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={form.handleSubmit(onSubmitGeneral)}
                disabled={updateOrgMutation.isPending}
                className="h-9 px-4.5 text-xs font-bold shadow-[0_0_15px_rgba(16,185,129,0.25)]"
              >
                {updateOrgMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stripe Billing Portal Simulator Modal */}
      <Dialog open={showBillingModal} onOpenChange={setShowBillingModal}>
        <DialogContent className="border border-white/5 bg-[#0f1c25] text-white rounded-3xl max-w-md shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold uppercase tracking-wider text-white flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-[#10b981]" />
              Stripe Billing Simulator
            </DialogTitle>
            <DialogDescription className="text-sm text-[#94a3b8] mt-2 font-medium">
              You are running SyncSpace in local development mode. Payment and subscription gateways
              are sandboxed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="rounded-2xl border border-white/5 bg-[#071017]/40 p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-zinc-300">Mock Plan Tier:</span>
                <span className="text-[#10b981] font-black uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-xs">
                  Pro Enterprise
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-zinc-300">Simulated Price:</span>
                <span className="text-white font-extrabold">$29.00 / month</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-zinc-300">Payment Status:</span>
                <span className="text-emerald-400 font-extrabold flex items-center gap-1">
                  Active (Development)
                </span>
              </div>
            </div>

            <p className="text-xs text-zinc-500 leading-relaxed font-semibold">
              In a production environment, this triggers a Stripe Checkout flow or redirects the
              user to the Stripe Billing Customer Portal.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setShowBillingModal(false)}
              className="h-10 text-xs font-bold border-white/5 bg-white/5 hover:bg-white/10 text-white cursor-pointer"
            >
              Close Portal
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setShowBillingModal(false);
                alert(
                  "Simulated upgrade complete! Workspace tier has been bumped to Pro Enterprise.",
                );
              }}
              className="h-10 text-xs font-bold shadow-sm cursor-pointer"
            >
              Simulate Upgrade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
