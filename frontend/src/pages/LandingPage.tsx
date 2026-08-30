import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Check, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createNoise2D } from 'simplex-noise';

export function LandingPage() {
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
    <div className="min-h-screen overflow-x-hidden bg-[#e8e3ff] text-[#14131b]">
      <style>{`
        .ambient-glow {
          transform: translate3d(calc(var(--mx, 0) * 28px), calc(var(--my, 0) * 28px), 0);
          will-change: transform;
        }

        @media (prefers-reduced-motion: reduce) {
          .ambient-glow { transform: none !important; }
        }
      `}</style>

      {/* Header */}
      <header className="relative z-50 mx-auto flex h-16 max-w-[1140px] items-center justify-between px-5 sm:px-8">
        <Link to="/" className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-[#14131b]" />
          <span className="text-sm font-semibold tracking-[-0.01em]">Labora</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link to="/login" className="hidden sm:block">
            <Button
              variant="ghost"
              className="h-8.5 rounded-full px-3.5 text-xs text-[#454151] hover:bg-white/60"
            >
              Sign in
            </Button>
          </Link>

          <Link to="/login">
            <Button className="h-8.5 rounded-full bg-[#111116] px-4 text-xs font-semibold text-white shadow-[0_4px_14px_rgba(17,17,22,.12)] hover:bg-[#292632]">
              Get Started
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main>
        <section
          ref={heroRef}
          className="relative mx-auto min-h-[calc(100vh-64px)] max-w-[1240px] px-3 pb-3 sm:px-5"
        >
          {/* White product canvas */}
          <div className="relative min-h-[calc(100vh-80px)] overflow-hidden rounded-2xl border border-white/80 bg-[#fffefe] shadow-[0_14px_50px_rgba(73,61,132,.12)] sm:rounded-[24px]">
            {/* Ambient light — now actually parallaxes with the cursor */}
            <div
              className="ambient-glow pointer-events-none absolute left-[48%] top-[42%] z-0 h-[400px] w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[90px]"
              style={{
                background:
                  'radial-gradient(ellipse, rgba(214,207,255,.72) 0%, rgba(239,236,255,.42) 42%, transparent 76%)',
              }}
            />

            {/* Interactive particle field, replaces the static dot pattern */}
            <LavenderGridCanvas />

            {/* Main hero content: text left, image placeholder right */}
            <div className="relative z-20 flex min-h-[calc(100vh-80px)] items-center px-5 py-12 sm:px-8 lg:px-12">
              <div className="mx-auto grid w-full max-w-[1040px] items-center gap-8 lg:grid-cols-2 lg:gap-12">
                {/* Left: copy */}
                <div className="text-center lg:text-left">
                  <motion.h1
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.06 }}
                    className="max-w-[520px] text-[32px] font-semibold leading-[1.06] tracking-[-0.045em] text-[#121117] sm:text-[42px] lg:text-[48px]"
                  >
                    Professional lab records in minutes
                  </motion.h1>

                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.15 }}
                    className="mx-auto mt-4 max-w-[440px] text-sm leading-[1.65] text-[#625d6d] sm:text-[15px] lg:mx-0"
                  >
                    Generate formatted lab record tables with permanent QR codes,
                    GitHub links, and one-click DOCX &amp; PDF exports.
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.25 }}
                    className="mt-6 flex flex-wrap justify-center gap-3 lg:justify-start"
                  >
                    <Link to="/login">
                      <Button
                        size="default"
                        className="h-9.5 rounded-xl bg-[#111116] px-4.5 text-xs font-semibold text-white shadow-[0_8px_20px_rgba(17,17,22,.15)] hover:bg-[#292632]"
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
                    className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-[11px] text-[#858092] lg:justify-start"
                  >
                    <span className="flex items-center gap-1.5">
                      <Check className="h-3 w-3 text-emerald-600" />
                      Permanent QR redirects
                    </span>
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

                {/* Right: Lab Record Document Template / DOCX Preview */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.15 }}
                  className="mx-auto w-full max-w-[520px] lg:max-w-none"
                >
                  <div className="relative overflow-hidden rounded-2xl border border-[#dcd6eb] bg-white shadow-[0_16px_40px_rgba(55,40,95,0.09)]">
                    {/* Window Top Bar */}
                    <div className="flex items-center justify-between border-b border-[#eeeaf5] bg-[#faf8fc] px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#f87171]/80" />
                        <span className="h-2.5 w-2.5 rounded-full bg-[#fbbf24]/80" />
                        <span className="h-2.5 w-2.5 rounded-full bg-[#34d399]/80" />
                        <span className="ml-2 font-mono text-[11px] text-[#787288]">
                          19MA220-Lab-Record.docx
                        </span>
                      </div>
                      <span className="rounded-md bg-[#eeeaff] px-2 py-0.5 text-[10px] font-semibold text-[#5845c4]">
                        DOCX &amp; PDF Template
                      </span>
                    </div>

                    {/* Document Paper Mockup */}
                    <div className="p-4 sm:p-5 font-serif text-black select-none">
                      {/* Banner */}
                      <img
                        src="/college-banner.png"
                        alt="College banner"
                        className="mx-auto mb-2 block h-9 sm:h-10 w-auto max-w-full object-contain"
                      />

                      {/* Course Title Line */}
                      <div className="mb-0.5 text-center font-bold tracking-tight text-[10.5px] sm:text-[11.5px] uppercase">
                        19MA220/SH2220 - Mathematics for Artificial Intelligence
                      </div>
                      <div className="mb-2.5 text-center text-[9px] sm:text-[10px] font-bold text-neutral-800 uppercase tracking-wide">
                        Record of Practical Work
                      </div>

                      {/* Lab Record Table */}
                      <table className="w-full border-collapse border border-black text-center text-[9px] sm:text-[10px]">
                        <thead>
                          <tr className="bg-neutral-50 font-bold">
                            <th className="border border-black p-1 w-[8%]">Exp</th>
                            <th className="border border-black p-1 w-[15%]">Date</th>
                            <th className="border border-black p-1 text-left w-[47%] pl-2">Name of The Experiment</th>
                            <th className="border border-black p-1 w-[14%]">QR Code</th>
                            <th className="border border-black p-1 w-[8%]">Mark</th>
                            <th className="border border-black p-1 w-[8%]">Sign</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="border border-black p-1 font-mono">01</td>
                            <td className="border border-black p-1 text-[8.5px] whitespace-nowrap">12-08-2026</td>
                            <td className="border border-black p-1 text-left pl-2">
                              <div className="font-semibold text-black leading-tight">Matrix Inversion &amp; Linear Systems</div>
                              <div className="truncate font-sans text-[7.5px] text-[#0563c1]">
                                github.com/student/ai-math-lab
                              </div>
                            </td>
                            <td className="border border-black p-1">
                              <div className="mx-auto flex h-7 w-7 items-center justify-center">
                                <QrCodePreviewSvg />
                              </div>
                            </td>
                            <td className="border border-black p-1" />
                            <td className="border border-black p-1" />
                          </tr>
                          <tr>
                            <td className="border border-black p-1 font-mono">02</td>
                            <td className="border border-black p-1 text-[8.5px] whitespace-nowrap">19-08-2026</td>
                            <td className="border border-black p-1 text-left pl-2">
                              <div className="font-semibold text-black leading-tight">Eigenvalues &amp; PCA Decomposition</div>
                              <div className="truncate font-sans text-[7.5px] text-[#0563c1]">
                                github.com/student/pca-analysis
                              </div>
                            </td>
                            <td className="border border-black p-1">
                              <div className="mx-auto flex h-7 w-7 items-center justify-center">
                                <QrCodePreviewSvg />
                              </div>
                            </td>
                            <td className="border border-black p-1" />
                            <td className="border border-black p-1" />
                          </tr>
                        </tbody>
                      </table>

                      {/* Footer Declaration & Student Credentials */}
                      <div className="mt-2.5 flex items-center justify-between border-t border-neutral-300 pt-1.5 text-[8.5px] sm:text-[9.5px] text-neutral-800">
                        <span>Name: <strong className="text-black">Nikhil</strong></span>
                        <span>Register No: <strong className="font-mono text-black">212224040219</strong></span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#d5d0e3] bg-[#e2ddf8] py-5 text-center text-[11px] text-[#716b80]">
        © {new Date().getFullYear()} Labora
      </footer>
    </div>
  );
}

/**
 * Cursor-reactive particle grid with simplex noise fluid motion.
 * Uses window-level pointer tracking and ResizeObserver so interactivity works flawlessly.
 */
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

      // Smooth mouse interpolation
      mouse.x += (mouse.targetX - mouse.x) * 0.15;
      mouse.y += (mouse.targetY - mouse.y) * 0.15;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Organic ambient motion using simplex noise
        const n = noise2D(p.originX * 0.004 + time * 0.4, p.originY * 0.004 + time * 0.3);
        const angle = n * Math.PI * 2;
        const dist = n * 7;
        const targetX = p.originX + Math.cos(angle) * dist;
        const targetY = p.originY + Math.sin(angle) * dist;

        // Interactive cursor repulsion
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const mDist = Math.hypot(dx, dy);

        if (mDist < mouse.radius && mDist > 0) {
          const force = (1 - mDist / mouse.radius) ** 1.8;
          const a = Math.atan2(dy, dx);
          p.vx -= Math.cos(a) * force * 5.5;
          p.vy -= Math.sin(a) * force * 5.5;
        }

        // Spring return to natural position
        p.vx += (targetX - p.x) * 0.06;
        p.vy += (targetY - p.y) * 0.06;

        // Damping
        p.vx *= 0.86;
        p.vy *= 0.86;

        p.x += p.vx;
        p.y += p.vy;

        // Color and alpha based on mouse proximity
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
    <svg viewBox="0 0 29 29" className="h-6 w-6 text-neutral-900" fill="currentColor">
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