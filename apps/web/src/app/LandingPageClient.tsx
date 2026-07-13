"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useEffect, useRef, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  ArrowRight,
  Briefcase,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronDown,
  ListTodo,
  Plus,
  Shield,
  Sliders,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

import { type ApiResponse } from "@syncspace/shared";

import { NotificationDropdown } from "@/components/NotificationDropdown";
import { HelpModal } from "@/components/dashboard/HelpModal";
import { KeyboardShortcutsModal } from "@/components/dashboard/KeyboardShortcutsModal";
import { UserDropdownMenu } from "@/components/dashboard/UserDropdownMenu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api-client";
import { useOrgStore } from "@/stores/org.store";

interface LandingPageClientProps {
  hasSession: boolean;
}

/* ─── Count Up Subcomponent ─── */
function CountUp({
  from,
  to,
  duration = 2,
  suffix = "",
}: {
  from: number;
  to: number;
  duration?: number;
  suffix?: string;
}) {
  const [count, setCount] = useState(from);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!inView) {
      return;
    }
    if (shouldReduceMotion) {
      setCount(to);
      return;
    }
    const controls = animate(from, to, {
      duration,
      onUpdate: (value) => setCount(Math.round(value)),
    });
    return () => {
      controls.stop();
    };
  }, [from, to, inView, duration, shouldReduceMotion]);

  return (
    <span ref={ref}>
      {count}
      {suffix}
    </span>
  );
}

/* ─── Magnetic Button Subcomponent ─── */
function MagneticButton({
  children,
  className,
  onClick,
  href,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  href?: string;
}) {
  const ref = useRef<HTMLButtonElement | HTMLAnchorElement | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const shouldReduceMotion = useReducedMotion();

  const handleMouseMove = (e: React.MouseEvent) => {
    if (shouldReduceMotion || !ref.current) {
      return;
    }
    const { clientX, clientY } = e;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const x = clientX - (left + width / 2);
    const y = clientY - (top + height / 2);
    setPosition({ x: x * 0.18, y: y * 0.18 });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  if (href) {
    return (
      <motion.div
        animate={{ x: position.x, y: position.y }}
        transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
        className="inline-block"
      >
        <Link
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className={className}
        >
          {children}
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      animate={{ x: position.x, y: position.y }}
      transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
      className="inline-block"
    >
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        onClick={onClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={className}
      >
        {children}
      </button>
    </motion.div>
  );
}

/* ─── Interactive Feature Card Subcomponent ─── */
function FeatureCard({
  icon: Icon,
  title,
  description,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  color: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [glowPos, setGlowPos] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) {
      return;
    }
    const { clientX, clientY } = e;
    const { left, top } = ref.current.getBoundingClientRect();
    setGlowPos({ x: clientX - left, y: clientY - top });
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      whileHover={shouldReduceMotion ? {} : { y: -8 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="relative rounded-3xl border border-white/5 bg-[#0f1c25]/45 backdrop-blur-xl p-7 overflow-hidden group hover:shadow-[0_0_35px_rgba(20,184,166,0.18)]"
    >
      {/* Dynamic Cursor Spotlight Border/Background */}
      {hovered && (
        <div
          style={{
            background: `radial-gradient(400px circle at ${glowPos.x}px ${glowPos.y}px, rgba(20, 184, 166, 0.08), transparent 80%)`,
          }}
          className="absolute inset-0 pointer-events-none transition-opacity duration-300"
        />
      )}

      {/* Border glow shine */}
      <div className="absolute inset-0 border border-[#10b981]/0 group-hover:border-[#10b981]/20 rounded-3xl transition-colors duration-300 pointer-events-none" />

      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg mb-5 transition-transform duration-300 group-hover:scale-110 border"
        style={{
          backgroundColor: `${color}15`,
          borderColor: `${color}30`,
          color: color,
        }}
      >
        <Icon className="w-5 h-5" />
      </div>

      <h3 className="text-lg font-bold text-white mb-2.5 tracking-tight">{title}</h3>
      <p className="text-sm text-[#94a3b8] leading-relaxed font-semibold">{description}</p>
    </motion.div>
  );
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
}

export function LandingPageClient({ hasSession }: LandingPageClientProps) {
  const router = useRouter();
  // Accessibility check
  const shouldReduceMotion = useReducedMotion();

  // Unified authentication state hook
  const { isAuthenticated, user } = useAuth();
  const { currentOrganization, setOrganizations, setCurrentOrganization } = useOrgStore();

  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
  const [isAuth, setIsAuth] = useState(hasSession);

  useEffect(() => {
    setIsAuth(isAuthenticated);
  }, [isAuthenticated]);

  // Query organizations for switcher on landing page header
  const { data: orgs = [] } = useQuery({
    queryKey: ["user-organizations"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Organization[]>>("/organizations");
      setOrganizations(res.data);
      if (res.data.length > 0 && !currentOrganization) {
        setCurrentOrganization(res.data[0] ?? null);
      }
      return res.data;
    },
    enabled: isAuthenticated,
    retry: 1,
  });

  // Initial loading state
  const [loading] = useState(false);

  // Persistent Motion Values for cursor coordinates mapping
  const mX = useMotionValue(0);
  const mY = useMotionValue(0);

  // Mouse tilt states for 3D Hero dashboard
  const heroRef = useRef<HTMLDivElement>(null);

  // Spotlight cursor trail (follows cursor slowly)
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });

  // AI Prompt live demo states
  const [aiText, setAiText] = useState("");
  const [aiState, setAiState] = useState<"idle" | "thinking" | "streaming" | "done">("idle");

  const fullPrompt = "SyncSpace AI, draft our sprint tasks for the landing page release.";
  const aiTasks = [
    "1. Define UI components & layout grids.",
    "2. Build custom glass frames for settings.",
    "3. Integrate Framer Motion spring values.",
    "4. Conduct lighthouse speed audit.",
  ];

  // Recharts animation data
  const chartData = [
    { name: "M", value: 30 },
    { name: "T", value: 48 },
    { name: "W", value: 40 },
    { name: "T", value: 72 },
    { name: "F", value: 58 },
    { name: "S", value: 85 },
    { name: "S", value: 92 },
  ];

  // Live progress bars animation
  const [progressVal, setProgressVal] = useState(0);
  const [checkedTasks, setCheckedTasks] = useState([true, false, true]);

  useEffect(() => {
    // Live UI progress interval loop
    const progInt = setInterval(() => {
      setProgressVal((prev) => (prev >= 100 ? 0 : prev + 1));
    }, 250);

    // Live UI checkbox tick-tock loop
    const checkInt = setInterval(() => {
      setCheckedTasks((prev) => [!prev[0], !prev[1], prev[2] ?? false]);
    }, 4000);

    return () => {
      clearInterval(progInt);
      clearInterval(checkInt);
    };
  }, []);

  // Global mouse coordinates logger for spotlight
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      setCursorPos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleGlobalMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
    };
  }, []);

  // AI Streaming trigger loop
  useEffect(() => {
    if (loading) {
      return;
    }

    const runAiSequence = async () => {
      // Step 1: Idle state
      setAiState("idle");
      setAiText("");
      await new Promise((r) => setTimeout(r, 1000));

      // Step 2: Typing user prompt
      setAiState("streaming");
      for (let i = 0; i <= fullPrompt.length; i++) {
        setAiText(fullPrompt.substring(0, i));
        await new Promise((r) => setTimeout(r, 60));
      }
      await new Promise((r) => setTimeout(r, 800));

      // Step 3: Thinking indicator
      setAiState("thinking");
      await new Promise((r) => setTimeout(r, 1500));

      // Step 4: Stream response tasks
      setAiState("streaming");
      setAiText("");
      let accum = "";
      for (const task of aiTasks) {
        accum += task + "\n";
        setAiText(accum);
        await new Promise((r) => setTimeout(r, 500));
      }
      setAiState("done");
      await new Promise((r) => setTimeout(r, 5000));

      // Loop restart
      runAiSequence();
    };

    runAiSequence();
  }, [loading]);

  const handleHeroMouseMove = (e: React.MouseEvent) => {
    if (!heroRef.current || shouldReduceMotion) {
      return;
    }
    const { left, top, width, height } = heroRef.current.getBoundingClientRect();
    const x = (e.clientX - left) / width - 0.5; // -0.5 to 0.5
    const y = (e.clientY - top) / height - 0.5; // -0.5 to 0.5
    mX.set(x);
    mY.set(y);
  };

  // Scroll opacity conversions
  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -80]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0]);

  // Spring values for smooth rotation tilts
  const springConfig = { stiffness: 100, damping: 20, mass: 0.5 };
  const rotateX = useSpring(useTransform(mY, [-0.5, 0.5], [4, -4]), springConfig);
  const rotateY = useSpring(useTransform(mX, [-0.5, 0.5], [-4, 4]), springConfig);

  // Parallax layers depth springs

  const layer2X = useSpring(useTransform(mX, [-0.5, 0.5], [-40, 40]), springConfig);
  const layer2Y = useSpring(useTransform(mY, [-0.5, 0.5], [-40, 40]), springConfig);

  const layer3X = useSpring(useTransform(mX, [-0.5, 0.5], [-60, 60]), springConfig);
  const layer3Y = useSpring(useTransform(mY, [-0.5, 0.5], [-60, 60]), springConfig);

  // Headline reveal stagger words configuration
  const titleWords = "Where enterprise teams ship great products.".split(" ");

  const titleContainerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const titleWordVariants = {
    hidden: {
      opacity: 0,
      y: 24,
      filter: "blur(8px)",
    },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: {
        type: "spring",
        stiffness: 90,
        damping: 14,
      } as const,
    },
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#071017] text-white">
        <motion.div
          animate={{ scale: [0.95, 1.05, 0.95], opacity: [0.7, 1, 0.7] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          className="flex items-center gap-3.5 mb-6"
        >
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#10b981] to-[#14b8a6] flex items-center justify-center shadow-[0_0_20px_rgba(20,184,166,0.4)]">
            <svg
              className="w-6 h-6 text-zinc-950 font-black"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="font-extrabold text-2xl tracking-wider text-white uppercase">
            SyncSpace
          </span>
        </motion.div>
        <div className="w-48 h-1 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            initial={{ left: "-100%" }}
            animate={{ left: "100%" }}
            transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
            className="w-1/2 h-full bg-gradient-to-r from-[#10b981] to-[#14b8a6] relative"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#071017] text-white overflow-hidden">
      <KeyboardShortcutsModal />
      <HelpModal />
      {/* Dynamic Cursor spotlight wrapper */}
      {!shouldReduceMotion && (
        <div
          style={{
            left: cursorPos.x - 250,
            top: cursorPos.y - 250,
            background:
              "radial-gradient(circle, rgba(20, 184, 166, 0.04) 0%, rgba(20, 184, 166, 0) 70%)",
          }}
          className="fixed w-[500px] h-[500px] pointer-events-none z-[80] rounded-full mix-blend-screen transition-opacity duration-300"
        />
      )}

      {/* Living background: slowly drifting aurora meshes */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.008)_1px,transparent_1px),linear-gradient(to_right,rgba(255,255,255,0.008)_1px,transparent_1px)] bg-[size:50px_50px] bg-center [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none z-0" />

      {!shouldReduceMotion && (
        <>
          <motion.div
            animate={{
              x: [0, 50, -30, 0],
              y: [0, -40, 50, 0],
              scale: [1, 1.1, 0.95, 1],
            }}
            transition={{ repeat: Infinity, duration: 25, ease: "easeInOut" }}
            className="absolute top-[-10%] left-[-15%] w-[65%] h-[65%] rounded-full bg-[#10b981]/4 blur-[130px] pointer-events-none z-0"
          />
          <motion.div
            animate={{
              x: [0, -50, 40, 0],
              y: [0, 60, -30, 0],
              scale: [1, 0.9, 1.1, 1],
            }}
            transition={{ repeat: Infinity, duration: 30, ease: "easeInOut" }}
            className="absolute bottom-[-10%] right-[-15%] w-[65%] h-[65%] rounded-full bg-[#14b8a6]/4 blur-[130px] pointer-events-none z-0"
          />
          <motion.div
            animate={{
              x: [-40, 40, -40],
              y: [50, -50, 50],
            }}
            transition={{ repeat: Infinity, duration: 22, ease: "easeInOut" }}
            className="absolute top-[25%] left-[20%] w-[50%] h-[50%] rounded-full bg-[#34d399]/2 blur-[150px] pointer-events-none z-0"
          />
        </>
      )}

      {/* ─── Navigation Header ─── */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#071017]/80 backdrop-blur-xl select-none">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#10b981] to-[#14b8a6] flex items-center justify-center shadow-[0_0_15px_rgba(20,184,166,0.3)] transition-transform duration-300 group-hover:scale-105">
              <svg
                className="w-5 h-5 text-zinc-950 font-black"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="font-extrabold text-lg tracking-wider text-white uppercase group-hover:text-[#10b981] transition-colors">
              SyncSpace
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-wider text-[#94a3b8]">
            <a href="#features" className="hover:text-white transition-colors">
              Features
            </a>
            <a href="#ai-sprints" className="hover:text-white transition-colors">
              AI Sprints
            </a>
            <a href="#statistics" className="hover:text-white transition-colors">
              Statistics
            </a>
            <a href="#pricing" className="hover:text-white transition-colors">
              Pricing
            </a>
          </div>

          <div className="flex items-center gap-4">
            {isAuth ? (
              <>
                {/* Notification Bell */}
                <NotificationDropdown />

                {/* Workspace Switcher (only if user belongs to multiple organizations) */}
                {orgs.length > 1 && (
                  <div className="relative">
                    <button
                      onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
                      className="h-9 px-3.5 rounded-xl border border-white/5 bg-[#0b1620]/45 hover:bg-[#0b1620]/80 transition-colors flex items-center gap-2 text-xs font-bold text-white max-w-[170px]"
                    >
                      <div className="w-5.5 h-5.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[#10b981] text-[10px] font-black shrink-0">
                        {(currentOrganization || orgs[0])?.name?.[0]?.toUpperCase() || "?"}
                      </div>
                      <span className="truncate">
                        {(currentOrganization || orgs[0])?.name || "Workspace"}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    </button>

                    {isOrgDropdownOpen && (
                      <div className="absolute top-full mt-2 right-0 z-50 w-48 rounded-xl border border-white/5 bg-[#0f1c25]/90 backdrop-blur-xl py-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                        {orgs.map((org) => (
                          <button
                            key={org.id}
                            onClick={() => {
                              setCurrentOrganization(org);
                              setIsOrgDropdownOpen(false);
                              router.push(`/dashboard/${org.slug}`);
                            }}
                            className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-zinc-400 hover:text-white hover:bg-white/5 transition-colors text-left ${
                              org.id === (currentOrganization || orgs[0])?.id
                                ? "bg-white/5 font-semibold text-white"
                                : ""
                            }`}
                          >
                            <div className="w-5.5 h-5.5 rounded bg-emerald-500/10 flex items-center justify-center text-[#10b981] text-[9px] font-bold">
                              {org.name[0]?.toUpperCase()}
                            </div>
                            <span className="truncate">{org.name}</span>
                          </button>
                        ))}
                        <div className="h-px bg-white/5 my-1.5" />
                        <button
                          onClick={() => {
                            setIsOrgDropdownOpen(false);
                            router.push("/orgs/new");
                          }}
                          className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-emerald-400 hover:bg-white/5 transition-colors text-left font-bold"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Create workspace
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* User Avatar Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                    title={user?.name || "User Avatar"}
                    className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[#10b981] text-xs font-extrabold flex items-center justify-center cursor-pointer hover:bg-emerald-500/20 transition-all focus:outline-none"
                  >
                    {user?.name
                      ? user.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)
                      : "?"}
                  </button>
                  <UserDropdownMenu
                    isOpen={isUserDropdownOpen}
                    onClose={() => setIsUserDropdownOpen(false)}
                    align="bottom"
                  />
                </div>
              </>
            ) : (
              <>
                <MagneticButton
                  href="/login"
                  className="h-9 px-4.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-all flex items-center justify-center"
                >
                  Sign In
                </MagneticButton>
                <MagneticButton
                  href="/register"
                  className="h-9 px-4.5 rounded-xl bg-gradient-to-r from-[#10b981] to-[#14b8a6] hover:from-[#34d399] hover:to-[#10b981] text-zinc-950 text-xs font-extrabold flex items-center justify-center shadow-[0_0_15px_rgba(20,184,166,0.3)] transition-all"
                >
                  Get Started
                </MagneticButton>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ─── Hero Section ─── */}
      <section
        ref={heroRef}
        onMouseMove={handleHeroMouseMove}
        onMouseLeave={() => {
          mX.set(0);
          mY.set(0);
        }}
        className="relative max-w-7xl mx-auto px-6 pt-20 pb-28 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center min-h-[calc(100vh-64px)]"
      >
        {/* Left Side: Headline & buttons */}
        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="lg:col-span-6 space-y-7 z-10"
        >
          {/* Status beta pill */}
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-[#10b981] text-[10px] font-bold uppercase tracking-widest select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
            SyncSpace public release is live
          </div>

          {/* Staggered word title masking reveal */}
          <motion.h1
            variants={titleContainerVariants}
            initial="hidden"
            animate="visible"
            className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.05] text-white flex flex-wrap gap-x-3 gap-y-1"
          >
            {titleWords.map((word, idx) => (
              <motion.span
                key={idx}
                variants={titleWordVariants}
                className={
                  idx >= 3 && idx <= 4
                    ? "bg-gradient-to-r from-[#10b981] via-[#34d399] to-[#14b8a6] bg-clip-text text-transparent"
                    : "text-white"
                }
              >
                {word}
              </motion.span>
            ))}
          </motion.h1>

          <p className="text-base sm:text-lg text-[#94a3b8] leading-relaxed font-semibold max-w-lg">
            SyncSpace integrates kanban task management, visual analytics metrics, and active AI
            sprints engines to unify product development.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <MagneticButton
              href={isAuth ? "/dashboard" : "/register"}
              className="h-12 px-6 rounded-2xl bg-gradient-to-r from-[#10b981] to-[#14b8a6] text-zinc-950 font-extrabold text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(20,184,166,0.3)]"
            >
              {isAuth ? "Open Workspace Console" : "Start for Free Now"}
              <ArrowRight className="w-4 h-4" />
            </MagneticButton>
            <a
              href="#features"
              className="h-12 px-6 rounded-2xl border border-white/5 bg-white/5 text-white font-extrabold text-sm flex items-center hover:bg-white/10 transition-colors"
            >
              Explore Features
            </a>
          </div>

          <div className="flex items-center gap-3 pt-6 text-xs text-[#94a3b8] font-bold">
            <div className="flex -space-x-2">
              {["A", "B", "C", "D"].map((n, i) => (
                <div
                  key={i}
                  className="w-7.5 h-7.5 rounded-full bg-[#0f1c25] border border-white/10 flex items-center justify-center font-bold text-[10px] text-[#10b981]"
                >
                  {n}
                </div>
              ))}
            </div>
            <span>Trusted by 2,000+ teams worldwide</span>
          </div>
        </motion.div>

        {/* Right Side: 3D Parallax Perspective Floating Dashboard Grid */}
        <div
          style={{
            perspective: 1200,
            transformStyle: "preserve-3d",
          }}
          className="lg:col-span-6 relative flex items-center justify-center h-[450px]"
        >
          {/* Depth Layer 3 (Highest translateZ: 80px) - Calendar Reminder Widget */}
          <motion.div
            style={{
              x: shouldReduceMotion ? 0 : layer3X,
              y: shouldReduceMotion ? 0 : layer3Y,
              transform: "translateZ(85px)",
              transformStyle: "preserve-3d",
            }}
            animate={shouldReduceMotion ? {} : { y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="absolute right-[-20px] top-[20px] z-30 rounded-2xl border border-white/5 bg-[#0f1c25]/90 backdrop-blur-xl p-4.5 shadow-2xl hover:shadow-[0_0_30px_rgba(20,184,166,0.25)] transition-all max-w-[190px]"
          >
            <div className="flex items-center gap-2 mb-2">
              <CalendarIcon className="w-4 h-4 text-[#14b8a6]" />
              <span className="text-[9px] font-bold text-[#94a3b8] uppercase tracking-wider">
                Milestone
              </span>
            </div>
            <h5 className="text-[11px] font-extrabold text-white">Sprint Release Beta</h5>
            <p className="text-[9px] text-[#94a3b8] mt-1">Friday at 14:00 (EST)</p>
          </motion.div>

          {/* Depth Layer 2 (translateZ: 50px) - Parallax task card widget */}
          <motion.div
            style={{
              x: shouldReduceMotion ? 0 : layer2X,
              y: shouldReduceMotion ? 0 : layer2Y,
              transform: "translateZ(55px)",
              transformStyle: "preserve-3d",
            }}
            animate={shouldReduceMotion ? {} : { y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 4.8, ease: "easeInOut" }}
            className="absolute left-[-35px] top-[90px] z-20 rounded-2xl border border-white/5 bg-[#0f1c25]/90 backdrop-blur-xl p-4 shadow-2xl hover:shadow-[0_0_35px_rgba(20,184,166,0.25)] transition-all max-w-[170px]"
          >
            <div className="flex items-center gap-2 mb-2">
              <ListTodo className="w-4 h-4 text-[#10b981]" />
              <span className="text-[9px] font-bold text-[#94a3b8] uppercase tracking-wider">
                Workspace Checklist
              </span>
            </div>
            <div className="space-y-2 text-[10px] font-bold">
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded border border-[#10b981] flex items-center justify-center">
                  {checkedTasks[0] && <CheckCircle2 className="w-2.5 h-2.5 text-[#10b981]" />}
                </div>
                <span className={checkedTasks[0] ? "line-through text-zinc-500" : "text-white"}>
                  Gateway SSL
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded border border-[#10b981] flex items-center justify-center">
                  {checkedTasks[1] && <CheckCircle2 className="w-2.5 h-2.5 text-[#10b981]" />}
                </div>
                <span className={checkedTasks[1] ? "line-through text-zinc-500" : "text-white"}>
                  Redesign Hero
                </span>
              </div>
            </div>
          </motion.div>

          {/* Depth Layer 2 (translateZ: 40px) - Team avatars widget */}
          <motion.div
            style={{
              x: shouldReduceMotion ? 0 : layer2X,
              y: shouldReduceMotion ? 0 : layer2Y,
              transform: "translateZ(45px)",
              transformStyle: "preserve-3d",
            }}
            animate={shouldReduceMotion ? {} : { y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 5.2, ease: "easeInOut" }}
            className="absolute left-[30px] bottom-[20px] z-20 rounded-2xl border border-white/5 bg-[#0f1c25]/85 backdrop-blur-xl p-3 shadow-2xl max-w-[150px] flex items-center gap-2"
          >
            <div className="flex -space-x-1.5">
              {["A", "B", "C"].map((n, idx) => (
                <div
                  key={idx}
                  className="w-6 h-6 rounded-full bg-[#071017] border border-white/10 flex items-center justify-center font-bold text-[8px] text-[#10b981]"
                >
                  {n}
                </div>
              ))}
            </div>
            <div className="text-left leading-none">
              <span className="text-[9px] font-bold text-white block">3 Active</span>
              <span className="text-[7px] text-[#10b981] font-bold">Online Now</span>
            </div>
          </motion.div>

          {/* Depth Layer 3 (translateZ: 70px) - Parallax Floating AI Card widget */}
          <motion.div
            style={{
              x: shouldReduceMotion ? 0 : layer3X,
              y: shouldReduceMotion ? 0 : layer3Y,
              transform: "translateZ(75px)",
              transformStyle: "preserve-3d",
            }}
            animate={shouldReduceMotion ? {} : { y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut" }}
            className="absolute right-[-30px] bottom-[50px] z-25 rounded-2xl border border-[#14b8a6]/20 bg-[#0f1c25]/95 backdrop-blur-xl p-4 shadow-2xl hover:shadow-[0_0_30px_rgba(20,184,166,0.25)] transition-all max-w-[190px]"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="w-4 h-4 text-[#14b8a6]" />
              <span className="text-[9px] font-bold text-white uppercase tracking-wider">
                Velocity Diagnostic
              </span>
            </div>
            <p className="text-[10px] text-[#94a3b8] leading-relaxed font-semibold">
              Project throughput is up by <span className="text-[#10b981] font-bold">18%</span> this
              week.
            </p>
          </motion.div>

          {/* Depth Layer 0 (translateZ: 0px) - Main 3D Dashboard box */}
          <motion.div
            style={{
              rotateX: rotateX,
              rotateY: rotateY,
              transformStyle: "preserve-3d",
            }}
            className="w-full max-w-[480px] h-[330px] rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-xl p-5 shadow-2xl relative overflow-hidden flex flex-col justify-between"
          >
            {/* Gloss reflection shimmer overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.015] to-transparent pointer-events-none" />

            {/* Dashboard top window header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
              </div>
              <div className="h-5 px-3 rounded-full bg-white/5 border border-white/5 text-[9px] font-bold text-[#94a3b8] flex items-center">
                syncspace.com/dashboard/analytics
              </div>
              <div className="w-5 h-5 rounded-lg bg-white/5 border border-white/5" />
            </div>

            {/* Content preview grids */}
            <div className="grid grid-cols-3 gap-3.5 h-full pt-4">
              {/* Grid 1: Analytics Sparkline */}
              <div className="col-span-2 rounded-2xl border border-white/5 bg-[#071017]/50 p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-bold text-[#94a3b8] uppercase tracking-wider">
                      Velocity Score
                    </span>
                    <h4 className="text-lg font-black text-white mt-0.5">
                      <CountUp from={0} to={98} duration={2} suffix="%" />
                    </h4>
                  </div>
                  <div className="px-2 py-0.5 rounded-full bg-[#10b981]/10 border border-[#10b981]/20 text-[#10b981] text-[9px] font-bold">
                    +16%
                  </div>
                </div>

                {/* Animated drawing sparkline */}
                <div className="h-20 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="landingGlow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#landingGlow)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Grid 2: Circular Progress widget */}
              <div className="rounded-2xl border border-white/5 bg-[#071017]/50 p-4 flex flex-col items-center justify-between text-center">
                <span className="text-[9px] font-bold text-[#94a3b8] uppercase tracking-wider">
                  Optimize
                </span>

                {/* SVG circular progress indicator */}
                <div className="relative w-16 h-16 flex items-center justify-center my-1.5">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="32"
                      cy="32"
                      r="26"
                      stroke="rgba(255,255,255,0.03)"
                      strokeWidth="4.5"
                      fill="transparent"
                    />
                    <circle
                      cx="32"
                      cy="32"
                      r="26"
                      stroke="#14b8a6"
                      strokeWidth="4.5"
                      fill="transparent"
                      strokeDasharray={163}
                      strokeDashoffset={163 - (163 * progressVal) / 100}
                      className="transition-all duration-200"
                    />
                  </svg>
                  <span className="absolute text-[10px] font-black text-white">{progressVal}%</span>
                </div>

                <span className="text-[9px] font-bold text-[#14b8a6] uppercase tracking-widest animate-pulse">
                  Running
                </span>
              </div>
            </div>

            {/* Checklist tasks bottom indicators */}
            <div className="border-t border-white/5 pt-3 mt-3 flex items-center justify-between text-[9px] font-bold text-[#94a3b8]">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-ping" />
                <span>Live updates channel open</span>
              </div>
              <span>240ms ping</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Live AI Interactive Sprints section ─── */}
      <section
        id="ai-sprints"
        className="relative py-24 px-6 border-y border-white/5 bg-white/[0.005]"
      >
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Visual AI Card simulator */}
          <div className="relative">
            {/* Background spotlight orbs */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-[#14b8a6]/5 blur-[70px] pointer-events-none" />

            <Card className="rounded-3xl border border-white/5 bg-[#0f1c25]/50 backdrop-blur-xl p-6 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4 select-none">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#14b8a6]/10 border border-[#14b8a6]/25 flex items-center justify-center">
                    <Sparkles className="w-4.5 h-4.5 text-[#14b8a6]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">
                      SyncSpace AI Engine
                    </h4>
                    <span className="text-[9px] text-[#94a3b8] block">Powered by Gemini Pro</span>
                  </div>
                </div>
                <Badge variant="success" className="text-[9px] uppercase font-bold py-0.5 px-2">
                  Autopilot
                </Badge>
              </div>

              {/* Chat console feed mock */}
              <div className="space-y-4 min-h-[190px] font-mono text-[11px] leading-relaxed">
                {/* User Input Prompt */}
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center font-bold text-[9px] text-[#94a3b8] shrink-0 mt-0.5 border border-white/5">
                    U
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-2xl px-4 py-2 text-white/90">
                    <p className="font-semibold">{fullPrompt}</p>
                  </div>
                </div>

                {/* AI Response Output */}
                {(aiState === "thinking" || aiState === "streaming" || aiState === "done") && (
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded bg-[#14b8a6]/10 border border-[#14b8a6]/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#14b8a6]" />
                    </div>
                    <div className="bg-[#14b8a6]/5 border border-[#14b8a6]/10 rounded-2xl px-4 py-2.5 text-[#14b8a6] flex-1">
                      {aiState === "thinking" ? (
                        <div className="flex items-center gap-2 text-xs">
                          <div className="w-3 h-3 border-2 border-[#14b8a6] border-t-transparent animate-spin rounded-full" />
                          <span className="text-[10px] uppercase font-bold animate-pulse">
                            Analyzing backlogs...
                          </span>
                        </div>
                      ) : (
                        <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-slate-300 font-bold">
                          {aiText}
                        </pre>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Texts details explanation */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2.5 px-3 py-1 rounded-full border border-[#14b8a6]/20 bg-[#14b8a6]/10 text-[#14b8a6] text-[10px] font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              SyncSpace AI Companion
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Sprint planning, automated.
            </h2>
            <p className="text-sm text-[#94a3b8] leading-relaxed font-semibold">
              SyncSpace reads task structures, compiles velocity metrics, and automatically writes
              sprint summaries and code structures.
            </p>
            <ul className="space-y-3.5 text-xs font-bold text-[#94a3b8]">
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4.5 h-4.5 text-[#10b981]" />
                <span>Auto-writes sprint releases logs.</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4.5 h-4.5 text-[#10b981]" />
                <span>Detects blocks and tasks delays.</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4.5 h-4.5 text-[#10b981]" />
                <span>Automated prioritization scoring.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ─── Features Grid Section ─── */}
      <section id="features" className="py-24 px-6 relative max-w-7xl mx-auto">
        <div className="text-center mb-16 space-y-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#10b981]">
            Complete Features Ecosystem
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white">
            Everything needed to build products.
          </h2>
          <p className="text-[#94a3b8] text-sm font-semibold max-w-md mx-auto">
            From drag-and-drop boards to visual heatmaps, manage features releases all inside one
            dashboard.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard
            icon={Briefcase}
            title="Kanban Board Stream"
            description="Real-time synchronized boards featuring multi-priority tags, stacked user initials assignees, and quick add inputs."
            color="#10b981"
          />
          <FeatureCard
            icon={Zap}
            title="Socket Sync"
            description="Teammate actions are broadcasted in real time. Task boards, checklist details, and comment logs are instantly updated."
            color="#14b8a6"
          />
          <FeatureCard
            icon={TrendingUp}
            title="Visual Metrics Charts"
            description="Clean Recharts Area charts rendering velocity trends, sprint burndown schedules, andPriority/Status breakouts."
            color="#06b6d4"
          />
          <FeatureCard
            icon={Shield}
            title="Enterprise Security"
            description="Workspace settings containing Public/Private privacy selectors, Two-Factor Authentication enforcement, and SSO."
            color="#10b981"
          />
          <FeatureCard
            icon={Sliders}
            title="Flexible Preferences"
            description="Accent color customizer, user timezone selectors, custom domains integrations, and danger configuration blocks."
            color="#14b8a6"
          />
          <FeatureCard
            icon={CalendarIcon}
            title="Visual Calendars"
            description="Integrated scheduling grids indicating deadlines, synced meetings, milestones, and release code freezes."
            color="#06b6d4"
          />
        </div>
      </section>

      {/* ─── Metric Statistics Section ─── */}
      <section
        id="statistics"
        className="py-24 px-6 border-t border-white/5 bg-[#0f1c25]/20 relative select-none"
      >
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          <div className="space-y-1">
            <h4 className="text-4xl sm:text-5xl font-black text-white">
              <CountUp from={0} to={2000} duration={2.5} suffix="+" />
            </h4>
            <span className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider">
              Active Teams Using SyncSpace
            </span>
          </div>

          <div className="space-y-1">
            <h4 className="text-4xl sm:text-5xl font-black text-white">
              <CountUp from={0} to={98} duration={2} suffix="%" />
            </h4>
            <span className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider">
              Sprint Velocity Rating
            </span>
          </div>

          <div className="space-y-1">
            <h4 className="text-4xl sm:text-5xl font-black text-white">
              <CountUp from={0} to={40} duration={2} suffix="k+" />
            </h4>
            <span className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider">
              Tasks Released Daily
            </span>
          </div>
        </div>
      </section>

      {/* ─── Pricing Cards Section ─── */}
      <section id="pricing" className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16 space-y-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#10b981]">
            Pricing Plans
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white">Choose plan sizing.</h2>
          <p className="text-[#94a3b8] text-sm font-semibold max-w-md mx-auto">
            From single developer sprints to large-scale product organizations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* Free Plan */}
          <Card className="p-7 border-white/5 bg-[#0f1c25]/40 backdrop-blur-xl rounded-3xl flex flex-col justify-between hover:shadow-[0_0_30px_rgba(20,184,166,0.1)] transition-shadow duration-300">
            <div className="space-y-4">
              <span className="text-xs font-bold text-[#94a3b8] uppercase tracking-widest">
                Free Plan
              </span>
              <h4 className="text-4xl font-black text-white">$0</h4>
              <p className="text-xs text-[#94a3b8] font-semibold leading-relaxed">
                Perfect for small teams getting started.
              </p>
              <div className="h-px bg-white/5 my-3" />
              <ul className="space-y-2 text-xs font-bold text-[#94a3b8]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981]" /> Up to 5 members
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981]" /> 3 active projects
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981]" /> Standard analytics
                </li>
              </ul>
            </div>
            <Button
              variant="outline"
              className="w-full h-10 mt-6 border-white/5 bg-white/5 text-xs text-white"
            >
              Get Started
            </Button>
          </Card>

          {/* Pro Plan */}
          <Card className="p-7 border-[#10b981]/20 bg-[#10b981]/[0.02] backdrop-blur-xl rounded-3xl flex flex-col justify-between shadow-[0_0_30px_rgba(16,185,129,0.15)] relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-[#10b981] text-zinc-950 font-black text-[8px] uppercase tracking-widest px-3 py-1 rounded-bl-xl">
              Popular
            </div>
            <div className="space-y-4">
              <span className="text-xs font-bold text-[#10b981] uppercase tracking-widest">
                Pro Plan
              </span>
              <h4 className="text-4xl font-black text-white">$12</h4>
              <p className="text-xs text-[#94a3b8] font-semibold leading-relaxed">
                For growing teams that need more velocity.
              </p>
              <div className="h-px bg-white/5 my-3" />
              <ul className="space-y-2 text-xs font-bold text-[#94a3b8]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981]" /> Unlimited members
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981]" /> Unlimited projects
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981]" /> Advanced AI engine
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981]" /> Custom field metadata
                </li>
              </ul>
            </div>
            <Button
              variant="primary"
              className="w-full h-10 mt-6 text-xs shadow-[0_0_15px_rgba(16,185,129,0.3)]"
            >
              Start Trial
            </Button>
          </Card>

          {/* Enterprise Plan */}
          <Card className="p-7 border-white/5 bg-[#0f1c25]/40 backdrop-blur-xl rounded-3xl flex flex-col justify-between hover:shadow-[0_0_30px_rgba(20,184,166,0.1)] transition-shadow duration-300">
            <div className="space-y-4">
              <span className="text-xs font-bold text-[#94a3b8] uppercase tracking-widest">
                Enterprise
              </span>
              <h4 className="text-4xl font-black text-white">Custom</h4>
              <p className="text-xs text-[#94a3b8] font-semibold leading-relaxed">
                For organizations with compliance needs.
              </p>
              <div className="h-px bg-white/5 my-3" />
              <ul className="space-y-2 text-xs font-bold text-[#94a3b8]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981]" /> Everything in Pro
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981]" /> SSO & 2FA Enforcements
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981]" /> Dedicated audit logs
                </li>
              </ul>
            </div>
            <Button
              variant="outline"
              className="w-full h-10 mt-6 border-white/5 bg-white/5 text-xs text-white"
            >
              Contact Sales
            </Button>
          </Card>
        </div>
      </section>

      {/* ─── Footer Section ─── */}
      <footer className="border-t border-white/5 py-12 px-6 bg-[#071017] text-xs font-bold text-[#94a3b8] select-none">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#10b981] to-[#14b8a6] flex items-center justify-center shadow-[0_0_10px_rgba(20,184,166,0.25)]">
              <svg
                className="w-4 h-4 text-zinc-950 font-black"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="font-extrabold uppercase tracking-wider text-white">SyncSpace</span>
          </div>
          <span>© 2026 SyncSpace Inc. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
