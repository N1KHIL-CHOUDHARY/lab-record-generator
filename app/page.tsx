"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Check,
  ChevronDown,
  FileText,
  FlaskConical,
  QrCode,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createNoise2D } from 'simplex-noise';

export default function LandingPage() {
  const heroRef = useRef<HTMLElement>(null);
  const rafRef = useRef<number | null>(null);
  const targetRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;

    const update = () => {
      const current = currentRef.current;
      const target = targetRef.current;

      current.x += (target.x - current.x) * 0.08;
      current.y += (target.y - current.y) * 0.08;

      hero.style.setProperty('--mx', `${current.x.toFixed(4)}`);
      hero.style.setProperty('--my', `${current.y.toFixed(4)}`);

      rafRef.current = requestAnimationFrame(update);
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = hero.getBoundingClientRect();
      if (
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
      ) {
        targetRef.current.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
        targetRef.current.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
      } else {
        targetRef.current.x = 0;
        targetRef.current.y = 0;
      }
    };

    const onPointerLeave = () => {
      targetRef.current.x = 0;
      targetRef.current.y = 0;
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerleave', onPointerLeave);
    rafRef.current = requestAnimationFrame(update);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#e8e3ff] text-[#14131b]">
      <style>{`
        .ambient-glow {
          transform: translate3d(calc(var(--mx, 0) * 28px), calc(var(--my, 0) * 28px), 0);
          will-change: transform;
        }

        @media (prefers-reduced-motion: reduce) {
          .ambient-glow { transform: none !important; }
        }
      `}</style>

      <header className="relative z-50 mx-auto flex h-16 max-w-[1140px] items-center justify-between px-4 sm:px-8">
        <Link href="/" className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-[#14131b]" />
          <span className="text-sm font-semibold tracking-[-0.01em]">Labora</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link href="/login" className="hidden sm:block">
            <Button
              variant="ghost"
              className="h-8.5 rounded-full px-3.5 text-xs text-[#454151] hover:bg-white/60"
            >
              Sign in
            </Button>
          </Link>

          <Link href="/login">
            <Button className="h-8.5 rounded-full bg-[#111116] px-4 text-xs font-semibold text-white shadow-[0_4px_14px_rgba(17,17,22,.12)] hover:bg-[#292632]">
              Get Started
            </Button>
          </Link>
        </div>
      </header>

      <main>
        <section
          ref={heroRef}
          className="relative mx-auto min-h-[calc(100vh-64px)] max-w-[1240px] px-2.5 pb-3 sm:px-5"
        >
          <div className="relative min-h-[calc(100vh-80px)] overflow-hidden rounded-2xl border border-white/80 bg-[#fffefe] shadow-[0_14px_50px_rgba(73,61,132,.12)] sm:rounded-[24px]">
            <div
              className="ambient-glow pointer-events-none absolute left-[48%] top-[42%] z-0 h-[300px] w-[350px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[70px] sm:h-[400px] sm:w-[620px] sm:blur-[90px]"
              style={{
                background:
                  'radial-gradient(ellipse, rgba(214,207,255,.72) 0%, rgba(239,236,255,.42) 42%, transparent 76%)',
              }}
            />

            <LavenderGridCanvas />

            <div className="relative z-20 flex min-h-[calc(100vh-80px)] items-center px-3 py-8 sm:px-8 sm:py-12 lg:px-12">
              <div className="mx-auto grid w-full max-w-[1040px] items-center gap-8 lg:grid-cols-2 lg:gap-12">
                <div className="text-center lg:text-left">
                  <motion.h1
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.06 }}
                    className="mx-auto max-w-[540px] text-[24px] font-semibold leading-[1.18] tracking-[-0.03em] text-[#121117] sm:text-[38px] sm:leading-[1.12] sm:tracking-[-0.04em] lg:mx-0 lg:text-[44px]"
                  >
                    Instant Lab Record Generator for Saveetha Engineering College
                  </motion.h1>

                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.15 }}
                    className="mx-auto mt-3 max-w-[440px] text-xs leading-[1.65] text-[#625d6d] sm:mt-4 sm:text-[15px] lg:mx-0"
                  >
                    Generate formatted lab record tables with permanent QR codes,
                    GitHub links, and one-click DOCX &amp; PDF exports.
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.25 }}
                    className="mt-5 flex flex-wrap justify-center gap-3 sm:mt-6 lg:justify-start"
                  >
                    <Link href="/login">
                      <Button
                        size="default"
                        className="h-9 rounded-xl bg-[#111116] px-4 text-xs font-semibold text-white shadow-[0_8px_20px_rgba(17,17,22,.15)] hover:bg-[#292632] sm:h-9.5 sm:px-4.5"
                      >
                        Start free
                        <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.45, delay: 0.35 }}
                    className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-[10.5px] text-[#858092] sm:mt-5 sm:text-[11px] lg:justify-start"
                  >
                    <span className="flex items-center gap-1.5">
                      <Check className="h-3 w-3 text-emerald-600" />
                      GitHub validated
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Check className="h-3 w-3 text-emerald-600" />
                      DOCX &amp; PDF ready
                    </span>
                  </motion.div>
                </div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 16 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="relative mx-auto w-full max-w-[540px] select-none lg:max-w-none"
                >
                  {/* Stacked Sheet Underlayer */}
                  <div className="absolute inset-0 translate-y-2.5 scale-[0.97] rounded-xl bg-[#eae5f8] opacity-70 blur-[1px] sm:translate-y-3 sm:scale-[0.96] sm:rounded-2xl" />
                  <div className="absolute inset-0 translate-y-1 scale-[0.985] rounded-xl bg-[#f5f2fd] opacity-90 shadow-xs sm:translate-y-1.5 sm:scale-[0.98] sm:rounded-2xl" />

                  {/* Main Paper Window */}
                  <div className="relative overflow-hidden rounded-xl border border-[#d8d2e8] bg-white shadow-[0_16px_40px_-10px_rgba(45,35,80,0.12)] transition-all duration-300 sm:rounded-2xl sm:shadow-[0_24px_60px_-12px_rgba(45,35,80,0.14)] hover:-translate-y-1 hover:shadow-[0_32px_70px_-12px_rgba(45,35,80,0.2)]">
                    
                    {/* Window Chrome Bar */}
                    <div className="flex items-center justify-between border-b border-[#eeeaf5] bg-[#faf8fc] px-3 py-2 sm:px-4 sm:py-2.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="h-2 w-2 rounded-full bg-[#f87171]/80 sm:h-2.5 sm:w-2.5 shrink-0" />
                        <span className="h-2 w-2 rounded-full bg-[#fbbf24]/80 sm:h-2.5 sm:w-2.5 shrink-0" />
                        <span className="h-2 w-2 rounded-full bg-[#34d399]/80 sm:h-2.5 sm:w-2.5 shrink-0" />
                        <span className="ml-1.5 truncate font-mono text-[10px] font-medium text-[#736c84] sm:ml-2 sm:text-[11px]">
                          19AI410-Lab-Record.pdf
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 pl-1">
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#eeeaff] px-1.5 py-0.5 text-[9px] font-semibold text-[#5845c4] sm:px-2 sm:text-[10px]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#6351ce] animate-pulse" />
                          Live Preview
                        </span>
                      </div>
                    </div>

                    {/* Scrollable Container on Mobile */}
                    <div className="w-full overflow-x-auto">
                      <div className="min-w-[340px] sm:min-w-0 relative bg-white p-3.5 sm:p-7 font-serif text-black">
                        
                        {/* Watermark / Background Texture accent */}
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#f1eefa_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />

                        {/* College / Institution Header Banner */}
                        <div className="relative mb-2.5 flex flex-col items-center border-b border-black/80 pb-2 text-center sm:mb-3 sm:pb-2.5">
                          <Image
                            src="/images/college-logo.png"
                            alt="Saveetha Engineering College Autonomous Logo"
                            width={180}
                            height={44}
                            priority
                            className="mb-1 block h-7 sm:h-11 w-auto max-w-full object-contain"
                          />

                          <div className="font-bold tracking-tight text-[10px] sm:text-[12.5px] uppercase leading-snug">
                            19AI410 / Machine Learning Laboratory
                          </div>
                          <div className="text-[8px] sm:text-[10px] font-bold text-neutral-800 uppercase tracking-widest mt-0.5">
                            Record of Laboratory Work
                          </div>
                        </div>

                        {/* Compact Official Table */}
                        <table className="relative w-full border-collapse border border-black text-center text-[8px] sm:text-[10px]">
                          <thead>
                            <tr className="bg-neutral-100/80 font-bold">
                              <th className="border border-black p-0.5 sm:p-1 w-[8%] font-sans">Exp</th>
                              <th className="border border-black p-0.5 sm:p-1 w-[15%] font-sans">Date</th>
                              <th className="border border-black p-0.5 sm:p-1 text-left w-[47%] pl-1.5 sm:pl-2.5 font-sans">
                                Name of The Experiment
                              </th>
                              <th className="border border-black p-0.5 sm:p-1 w-[14%] font-sans">QR Code</th>
                              <th className="border border-black p-0.5 sm:p-1 w-[8%] font-sans">Mark</th>
                              <th className="border border-black p-0.5 sm:p-1 w-[8%] font-sans">Sign</th>
                            </tr>
                          </thead>
                          <tbody>
                            {/* Row 1 */}
                            <tr className="hover:bg-neutral-50/70 transition-colors">
                              <td className="border border-black p-1 sm:p-1.5 font-mono text-[8px] sm:text-[9px]">01</td>
                              <td className="border border-black p-1 sm:p-1.5 text-[7.5px] sm:text-[8.5px] whitespace-nowrap text-neutral-800 font-sans">
                                12/08/2026
                              </td>
                              <td className="border border-black p-1 sm:p-1.5 text-left pl-1.5 sm:pl-2.5">
                                <div className="font-semibold text-black leading-tight text-[8px] sm:text-[10px]">
                                  Linear &amp; Polynomial Regression
                                </div>
                                <div className="truncate font-sans text-[6.5px] sm:text-[7.5px] text-[#0563c1] hover:underline">
                                  https://github.com/student/ml-lab/exp-1
                                </div>
                              </td>
                              <td className="border border-black p-0.5 sm:p-1">
                                <div className="mx-auto flex h-5 w-5 sm:h-7 sm:w-7 items-center justify-center rounded bg-neutral-50 p-0.5 shadow-2xs">
                                  <QrCodePreviewSvg />
                                </div>
                              </td>
                              <td className="border border-black p-1 sm:p-1.5 font-mono text-neutral-400">10</td>
                              <td className="border border-black p-1 sm:p-1.5">
                                <span className="font-serif italic text-blue-900 text-[8.5px] sm:text-[10px] opacity-80 select-none">
                                  Staff
                                </span>
                              </td>
                            </tr>

                            {/* Row 2 */}
                            <tr className="hover:bg-neutral-50/70 transition-colors">
                              <td className="border border-black p-1 sm:p-1.5 font-mono text-[8px] sm:text-[9px]">02</td>
                              <td className="border border-black p-1 sm:p-1.5 text-[7.5px] sm:text-[8.5px] whitespace-nowrap text-neutral-800 font-sans">
                                19/08/2026
                              </td>
                              <td className="border border-black p-1 sm:p-1.5 text-left pl-1.5 sm:pl-2.5">
                                <div className="font-semibold text-black leading-tight text-[8px] sm:text-[10px]">
                                  Support Vector Machine Classification
                                </div>
                                <div className="truncate font-sans text-[6.5px] sm:text-[7.5px] text-[#0563c1] hover:underline">
                                  https://github.com/student/ml-lab/exp-2
                                </div>
                              </td>
                              <td className="border border-black p-0.5 sm:p-1">
                                <div className="mx-auto flex h-5 w-5 sm:h-7 sm:w-7 items-center justify-center rounded bg-neutral-50 p-0.5 shadow-2xs">
                                  <QrCodePreviewSvg />
                                </div>
                              </td>
                              <td className="border border-black p-1 sm:p-1.5 font-mono text-neutral-400">10</td>
                              <td className="border border-black p-1 sm:p-1.5">
                                <span className="font-serif italic text-blue-900 text-[8.5px] sm:text-[10px] opacity-80 select-none">
                                  Staff
                                </span>
                              </td>
                            </tr>

                            {/* Row 3 */}
                            <tr className="hover:bg-neutral-50/70 transition-colors">
                              <td className="border border-black p-1 sm:p-1.5 font-mono text-[8px] sm:text-[9px]">03</td>
                              <td className="border border-black p-1 sm:p-1.5 text-[7.5px] sm:text-[8.5px] whitespace-nowrap text-neutral-800 font-sans">
                                26/08/2026
                              </td>
                              <td className="border border-black p-1 sm:p-1.5 text-left pl-1.5 sm:pl-2.5">
                                <div className="font-semibold text-black leading-tight text-[8px] sm:text-[10px]">
                                  K-Means Clustering &amp; PCA Reduction
                                </div>
                                <div className="truncate font-sans text-[6.5px] sm:text-[7.5px] text-[#0563c1] hover:underline">
                                  https://github.com/student/ml-lab/exp-3
                                </div>
                              </td>
                              <td className="border border-black p-0.5 sm:p-1">
                                <div className="mx-auto flex h-5 w-5 sm:h-7 sm:w-7 items-center justify-center rounded bg-neutral-50 p-0.5 shadow-2xs">
                                  <QrCodePreviewSvg />
                                </div>
                              </td>
                              <td className="border border-black p-1 sm:p-1.5 font-mono text-neutral-400">10</td>
                              <td className="border border-black p-1 sm:p-1.5">
                                <span className="font-serif italic text-blue-900 text-[8.5px] sm:text-[10px] opacity-80 select-none">
                                  Staff
                                </span>
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* Verification / Declaration Footer */}
                        <div className="relative mt-2.5 pt-1.5 text-[7.5px] sm:text-[9px] text-neutral-800 font-sans">
                          <div className="italic text-neutral-600 mb-1.5">
                            "I confirm that the experiments and GitHub links provided are entirely my own work."
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 border-t border-black/80 pt-1.5 font-serif text-[7.5px] sm:text-[9.5px]">
                            <div>
                              <div>Name: <strong className="text-black font-semibold">Nikhil R</strong></div>
                              <div className="mt-0.5 text-neutral-600">Date: <span className="font-mono">26-08-2026</span></div>
                            </div>
                            <div className="text-right">
                              <div>Register No: <strong className="font-mono text-black font-semibold">212224040219</strong></div>
                              <div className="mt-0.5 italic text-neutral-500">Learner's Signature</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </section>


       

  
      </main>

      <footer className="border-t border-[#d5d0e3] bg-[#e2ddf8] py-5 text-center text-xs text-[#716b80] sm:py-6">
        <div className="mx-auto max-w-[1240px] px-4">
          <p>© {new Date().getFullYear()} Labora — Saveetha Engineering College Lab Record Generator</p>
          <p className="mt-1 text-[10.5px] text-[#8e889e] sm:text-[11px]">
            Standardized format generator for educational laboratory submissions and Anna University affiliated curricula.
          </p>
        </div>
      </footer>
    </div>
  );
}

function LavenderGridCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const noise2D = createNoise2D();
    let animationFrameId: number;
    let width = 0;
    let height = 0;

    type Particle = {
      x: number;
      y: number;
      originX: number;
      originY: number;
      vx: number;
      vy: number;
      size: number;
    };

    const particles: Particle[] = [];
    const spacing = 32;
    const mouse = { x: -1000, y: -1000, targetX: -1000, targetY: -1000, radius: 170 };

    const initGrid = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      if (width === 0 || height === 0) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      particles.length = 0;
      const cols = Math.ceil(width / spacing);
      const rows = Math.ceil(height / spacing);

      for (let i = 0; i <= cols; i++) {
        for (let j = 0; j <= rows; j++) {
          const x = i * spacing + spacing / 2;
          const y = j * spacing + spacing / 2;
          particles.push({
            x,
            y,
            originX: x,
            originY: y,
            vx: 0,
            vy: 0,
            size: Math.random() * 1.2 + 1.1,
          });
        }
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const inBounds =
        e.clientX >= rect.left - 40 &&
        e.clientX <= rect.right + 40 &&
        e.clientY >= rect.top - 40 &&
        e.clientY <= rect.bottom + 40;

      if (inBounds) {
        mouse.targetX = e.clientX - rect.left;
        mouse.targetY = e.clientY - rect.top;
      } else {
        mouse.targetX = -1000;
        mouse.targetY = -1000;
      }
    };

    const onPointerLeave = () => {
      mouse.targetX = -1000;
      mouse.targetY = -1000;
    };

    let time = 0;
    const render = () => {
      time += 0.005;
      ctx.clearRect(0, 0, width, height);

      mouse.x += (mouse.targetX - mouse.x) * 0.15;
      mouse.y += (mouse.targetY - mouse.y) * 0.15;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        const n = noise2D(p.originX * 0.004 + time * 0.4, p.originY * 0.004 + time * 0.3);
        const angle = n * Math.PI * 2;
        const dist = n * 7;
        const targetX = p.originX + Math.cos(angle) * dist;
        const targetY = p.originY + Math.sin(angle) * dist;

        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const mDist = Math.hypot(dx, dy);

        if (mDist < mouse.radius && mDist > 0) {
          const force = (1 - mDist / mouse.radius) ** 1.8;
          const a = Math.atan2(dy, dx);
          p.vx -= Math.cos(a) * force * 5.5;
          p.vy -= Math.sin(a) * force * 5.5;
        }

        p.vx += (targetX - p.x) * 0.06;
        p.vy += (targetY - p.y) * 0.06;

        p.vx *= 0.86;
        p.vy *= 0.86;

        p.x += p.vx;
        p.y += p.vy;

        const proximity = Math.min(1, Math.max(0, 1 - mDist / (mouse.radius * 1.3)));
        const alpha = 0.22 + proximity * 0.55;
        const currentSize = p.size * (1 + proximity * 0.6);

        ctx.fillStyle = `rgba(102, 81, 202, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    initGrid();

    const ro = new ResizeObserver(() => {
      initGrid();
    });
    ro.observe(canvas);

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerleave', onPointerLeave);

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!mq.matches) {
      animationFrameId = requestAnimationFrame(render);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      ro.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-90"
      style={{
        maskImage:
          'radial-gradient(ellipse at center, black 30%, rgba(0,0,0,.75) 60%, transparent 92%)',
        WebkitMaskImage:
          'radial-gradient(ellipse at center, black 30%, rgba(0,0,0,.75) 60%, transparent 92%)',
      }}
      aria-hidden="true"
    />
  );
}

function QrCodePreviewSvg() {
  return (
    <svg viewBox="0 0 29 29" className="h-4 w-4 sm:h-6 sm:w-6 text-neutral-900" fill="currentColor">
      <rect x="0" y="0" width="7" height="7" />
      <rect x="1" y="1" width="5" height="5" fill="white" />
      <rect x="2" y="2" width="3" height="3" />
      <rect x="22" y="0" width="7" height="7" />
      <rect x="23" y="1" width="5" height="5" fill="white" />
      <rect x="24" y="2" width="3" height="3" />
      <rect x="0" y="22" width="7" height="7" />
      <rect x="1" y="23" width="5" height="5" fill="white" />
      <rect x="2" y="24" width="3" height="3" />
      <rect x="9" y="2" width="2" height="2" />
      <rect x="13" y="0" width="2" height="2" />
      <rect x="17" y="2" width="2" height="2" />
      <rect x="9" y="6" width="3" height="2" />
      <rect x="15" y="6" width="2" height="3" />
      <rect x="2" y="9" width="3" height="2" />
      <rect x="6" y="13" width="2" height="3" />
      <rect x="2" y="17" width="2" height="2" />
      <rect x="9" y="10" width="3" height="3" />
      <rect x="14" y="11" width="2" height="2" />
      <rect x="18" y="9" width="3" height="2" />
      <rect x="10" y="15" width="2" height="3" />
      <rect x="14" y="15" width="3" height="2" />
      <rect x="19" y="13" width="2" height="4" />
      <rect x="24" y="9" width="2" height="2" />
      <rect x="22" y="13" width="2" height="2" />
      <rect x="25" y="16" width="3" height="2" />
      <rect x="9" y="22" width="2" height="3" />
      <rect x="13" y="20" width="2" height="2" />
      <rect x="17" y="22" width="3" height="2" />
      <rect x="10" y="26" width="3" height="2" />
      <rect x="15" y="25" width="2" height="3" />
      <rect x="20" y="21" width="2" height="2" />
      <rect x="24" y="24" width="3" height="3" />
    </svg>
  );
}