"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { registerSchema } from "@syncspace/shared";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";

const registerFormSchema = registerSchema
  .extend({
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerFormSchema>;

export function RegisterForm() {
  const { register, isRegistering, registerError } = useAuth();
  const [generalError, setGeneralError] = useState<string | null>(null);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setGeneralError(null);
    try {
      const { confirmPassword, ...registerPayload } = values;
      void confirmPassword;
      await register(registerPayload);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred. Please try again.";
      setGeneralError(message);
    }
  };

  // Password strength indicator
  const password = form.watch("password");
  const strength = getPasswordStrength(password);

  return (
    <div className="animate-fade-in">
      {/* Mobile logo */}
      <div className="lg:hidden flex items-center gap-2.5 mb-8">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
          <svg
            className="w-4 h-4 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <span className="font-bold text-lg tracking-tight">SyncSpace</span>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Create an account</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Get started with SyncSpace today</p>
      </div>

      {(registerError || generalError) && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{registerError || generalError}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">Full Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="John Doe"
                    type="text"
                    autoComplete="name"
                    disabled={isRegistering}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">Email</FormLabel>
                <FormControl>
                  <Input
                    placeholder="name@company.com"
                    type="email"
                    autoComplete="email"
                    disabled={isRegistering}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">Password</FormLabel>
                <FormControl>
                  <Input
                    placeholder="••••••••"
                    type="password"
                    autoComplete="new-password"
                    disabled={isRegistering}
                    {...field}
                  />
                </FormControl>
                {/* Password strength bar */}
                {password.length > 0 && (
                  <div className="flex items-center gap-2 pt-1">
                    <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden flex gap-0.5">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={`flex-1 h-full rounded-full transition-colors duration-300 ${
                            strength.level >= level
                              ? strength.level <= 1
                                ? "bg-red-500"
                                : strength.level <= 2
                                  ? "bg-orange-500"
                                  : strength.level <= 3
                                    ? "bg-yellow-500"
                                    : "bg-emerald-500"
                              : "bg-transparent"
                          }`}
                        />
                      ))}
                    </div>
                    <span
                      className={`text-[10px] font-medium ${
                        strength.level <= 1
                          ? "text-red-500"
                          : strength.level <= 2
                            ? "text-orange-500"
                            : strength.level <= 3
                              ? "text-yellow-500"
                              : "text-emerald-500"
                      }`}
                    >
                      {strength.label}
                    </span>
                  </div>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">Confirm Password</FormLabel>
                <FormControl>
                  <Input
                    placeholder="••••••••"
                    type="password"
                    autoComplete="new-password"
                    disabled={isRegistering}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={isRegistering}>
            {isRegistering ? (
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Creating account...
              </div>
            ) : (
              "Create Account"
            )}
          </Button>
        </form>
      </Form>

      <p className="text-center text-sm text-muted-foreground mt-6">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

/* ─── Password Strength Helper ─────────────────────────────────────────────── */

function getPasswordStrength(password: string): { level: number; label: string } {
  if (!password) {
    return { level: 0, label: "" };
  }

  let score = 0;
  if (password.length >= 6) {
    score++;
  }
  if (password.length >= 10) {
    score++;
  }
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) {
    score++;
  }
  if (/\d/.test(password)) {
    score++;
  }
  if (/[^A-Za-z0-9]/.test(password)) {
    score++;
  }

  if (score <= 1) {
    return { level: 1, label: "Weak" };
  }
  if (score <= 2) {
    return { level: 2, label: "Fair" };
  }
  if (score <= 3) {
    return { level: 3, label: "Good" };
  }
  return { level: 4, label: "Strong" };
}
