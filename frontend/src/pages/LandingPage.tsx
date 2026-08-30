import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Check, FlaskConical, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

      current.x += (target.x - current.x) * 0.075;
      current.y += (target.y - current.y) * 0.075;

      hero.style.setProperty('--mx', `${current.x}`);
      hero.style.setProperty('--my', `${current.y}`);

      rafRef.current = requestAnimationFrame(update);
    };

    const onMove = (event: MouseEvent) => {
      const rect = hero.getBoundingClientRect();

      targetRef.current.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      targetRef.current.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    };

    const onLeave = () => {
      targetRef.current.x = 0;
      targetRef.current.y = 0;
    };

    hero.addEventListener('mousemove', onMove);
    hero.addEventListener('mouseleave', onLeave);
    rafRef.current = requestAnimationFrame(update);

    return () => {
      hero.removeEventListener('mousemove', onMove);
      hero.removeEventListener('mouseleave', onLeave);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#e8e3ff] text-[#14131b]">
      <style>{`
        @keyframes driftPattern {
          0%, 100% { transform: translate3d(-1%, -1%, 0); }
          50% { transform: translate3d(1.5%, 1%, 0); }
        }

        @keyframes pulseLight {
          0%, 100% { opacity: .35; transform: scale(1); }
          50% { opacity: .55; transform: scale(1.06); }
        }

        .pattern-drift { animation: driftPattern 26s ease-in-out infinite; }
        .pulse-light { animation: pulseLight 8s ease-in-out infinite; }

        .hero-pattern {
          background-image:
            radial-gradient(circle, rgba(111, 91, 220, .22) 1.2px, transparent 1.2px),
            linear-gradient(rgba(111, 91, 220, .07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(111, 91, 220, .07) 1px, transparent 1px);
          background-size: 14px 14px, 56px 56px, 56px 56px;
          mask-image: radial-gradient(ellipse at center, black 25%, rgba(0,0,0,.78) 55%, transparent 88%);
          -webkit-mask-image: radial-gradient(ellipse at center, black 25%, rgba(0,0,0,.78) 55%, transparent 88%);
        }

        @media (prefers-reduced-motion: reduce) {
          .pattern-drift,
          .pulse-light {
            animation: none !important;
          }
        }
      `}</style>

      {/* Header */}
      <header className="relative z-50 mx-auto flex h-16 max-w-[1140px] items-center justify-between px-5 sm:px-8">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center">
            <FlaskConical className="h-5 w-6 text-black" />
          </div>
          <span className="text-sm font-semibold tracking-[-0.01em]">
            Smart Lab Record
          </span>
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
            {/* Ambient light */}
            <div
              className="pulse-light pointer-events-none absolute left-[48%] top-[42%] z-0 h-[400px] w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[90px]"
              style={{
                background:
                  'radial-gradient(ellipse, rgba(214,207,255,.72) 0%, rgba(239,236,255,.42) 42%, transparent 76%)',
              }}
            />

            {/* Background data/glyph field */}
            <div className="pattern-drift hero-pattern pointer-events-none absolute inset-0 z-0 opacity-75" />

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

                {/* Right: simple image placeholder */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.15 }}
                  className="mx-auto flex aspect-[4/3] w-full max-w-[460px] items-center justify-center rounded-2xl border border-dashed border-[#d9d3ee] bg-white/70 shadow-[0_14px_35px_rgba(44,38,75,.06)] backdrop-blur lg:max-w-none"
                >
                  <div className="flex flex-col items-center gap-2 text-[#a49dbd]">
                    <ImageIcon className="h-7 w-7" />
                    <span className="text-xs font-medium">Product image</span>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#d5d0e3] bg-[#e2ddf8] py-5 text-center text-[11px] text-[#716b80]">
        © {new Date().getFullYear()} Smart Lab Record Generator
      </footer>
    </div>
  );
}