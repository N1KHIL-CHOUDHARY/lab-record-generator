"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import { FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/dashboard");
    }
  }, [user, authLoading, router]);

  if (user) return null;

  return (
    <div className="relative flex min-h-screen w-full flex-col justify-between overflow-hidden bg-[#f7f5fd] text-neutral-900 font-sans antialiased selection:bg-[#ddd6fe] selection:text-neutral-950">
      
      {/* ─────────────────────────────────────────────────────────────
          CELESTIAL / MESH SPHERE BACKGROUND (Matching the Image)
      ─────────────────────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        {/* Soft Radial Ambient Lighting */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[750px] w-[1100px] rounded-full bg-gradient-to-tr from-[#ede8fc] via-white/80 to-[#f3efff] blur-3xl opacity-80" />

        {/* Top-Right Large Celestial Planet Sphere */}
        <div className="absolute -top-28 -right-36 h-[500px] w-[500px] sm:h-[620px] sm:w-[620px] rounded-full bg-gradient-to-br from-white via-[#e8e2fa] to-[#d8cef6] shadow-[inset_-25px_-25px_80px_rgba(147,126,220,0.35),0_30px_90px_rgba(180,165,240,0.25)] opacity-85" />
        
        {/* Bottom-Left Planet Sphere */}
        <div className="absolute -bottom-36 -left-36 h-[460px] w-[460px] sm:h-[580px] sm:w-[580px] rounded-full bg-gradient-to-tr from-[#d5caf5] via-[#ece7fc] to-white shadow-[inset_25px_25px_70px_rgba(135,110,215,0.3),0_30px_90px_rgba(165,145,235,0.2)] opacity-80" />

        {/* Small Floating Moon Particle (Top Left) */}
        <div className="absolute top-40 left-12 sm:left-24 h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-gradient-to-br from-white via-[#eee9fc] to-[#d6cbfa] shadow-[inset_-4px_-4px_12px_rgba(140,118,215,0.35),0_10px_25px_rgba(165,145,235,0.18)]" />

        {/* Small Floating Moon Particle (Bottom Right) */}
        <div className="absolute bottom-32 right-12 sm:right-28 h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-gradient-to-tl from-[#cfc3f5] via-[#ece7fc] to-white shadow-[inset_6px_6px_16px_rgba(135,110,215,0.3),0_12px_30px_rgba(165,145,235,0.18)]" />
      </div>

      {/* ─────────────────────────────────────────────────────────────
          FLOATING PILL NAVBAR
      ─────────────────────────────────────────────────────────────── */}
      <header className="relative z-50 mx-auto w-full max-w-[820px] px-4 pt-6 sm:pt-8">
        <div className="flex h-12 items-center justify-between rounded-full border border-white/80 bg-white/70 px-4.5 shadow-[0_4px_25px_rgba(130,110,205,0.08)] backdrop-blur-md">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2 transition-transform hover:scale-[1.02]">
            <FlaskConical className="h-4 w-4 text-neutral-900"></FlaskConical>
            <span className="text-xs font-bold tracking-tight text-neutral-900">Labora</span>
          </Link>

          {/* Nav Links */}
          <nav className="hidden sm:flex items-center gap-6 text-xs font-medium text-neutral-500">
            <Link href="/" className="text-neutral-950 font-semibold transition-colors">
              Product
            </Link>
            <Link href="/templates" className="hover:text-neutral-950 transition-colors">
              Templates
            </Link>
            <Link href="/templates" className="hover:text-neutral-950 transition-colors">
              Features
            </Link>
            <Link href="/templates" className="hover:text-neutral-950 transition-colors">
              Changelog
            </Link>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button
                variant="ghost"
                className="h-8 rounded-full px-3 text-xs font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950"
              >
                Sign In
              </Button>
            </Link>

            <Link href="/login">
              <Button className="h-8 rounded-full bg-neutral-950 px-4 text-xs font-semibold text-white shadow-xs hover:bg-neutral-800 transition-all">
                Get started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          CENTERED HERO CONTENT (Full Viewport Focus)
      ─────────────────────────────────────────────────────────────── */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          
          {/* Main Title */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-[34px] sm:text-[50px] lg:text-[54px] font-bold tracking-tight text-neutral-950 leading-[1.14]"
          >
            One workspace, from idea to ship
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mx-auto mt-4 max-w-md text-xs sm:text-[14.5px] leading-relaxed text-neutral-600"
          >
            One workspace to plan, generate, and automate your lab records, with the speed and calm your team actually wants.
          </motion.p>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-7 flex items-center justify-center gap-3"
          >
            <Link href="/login">
              <button className="h-10 rounded-full bg-neutral-950 px-6 text-xs sm:text-sm font-semibold text-white shadow-md transition-all hover:bg-neutral-800 hover:scale-[1.02] active:scale-98">
                Start for free
              </button>
            </Link>

            <Link href="/templates">
              <button className="h-10 rounded-full border border-neutral-200/90 bg-white/80 px-6 text-xs sm:text-sm font-semibold text-neutral-700 shadow-xs backdrop-blur-sm transition-all hover:bg-white hover:text-neutral-950 hover:scale-[1.02] active:scale-98">
                Explore templates
              </button>
            </Link>
          </motion.div>

        </div>
      </main>

      {/* ─────────────────────────────────────────────────────────────
          CLEAN MINIMAL FOOTER
      ─────────────────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-purple-100/60 bg-white/40 py-6 text-xs text-neutral-500 backdrop-blur-xs">
        <div className="mx-auto max-w-5xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <p>© {new Date().getFullYear()} Labora. Saveetha Autonomous Record Generator.</p>
          <div className="flex items-center gap-5 text-neutral-600">
            <Link href="/templates" className="hover:text-neutral-950 transition-colors">
              Templates
            </Link>
            <Link href="/login" className="hover:text-neutral-950 transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </footer>

    </div>
  );
}