import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FlaskConical, QrCode, FileText, Github, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';
import { Moon, Sun } from 'lucide-react';

const features = [
  {
    icon: QrCode,
    title: 'Permanent QR Codes',
    description: 'Short redirect links — update GitHub URLs anytime without reprinting QR codes.',
  },
  {
    icon: Github,
    title: 'GitHub Integration',
    description: 'Link each experiment to your repository with validated GitHub URLs.',
  },
  {
    icon: FileText,
    title: 'DOCX & PDF Export',
    description: 'Print-ready lab records with tables, QR images, and declaration sections.',
  },
];

export function LandingPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <FlaskConical className="h-5 w-5" />
          </div>
          <span className="font-semibold">Smart Lab Record</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Link to="/login">
            <Button variant="outline">Sign in</Button>
          </Link>
          <Link to="/login">
            <Button>Get Started</Button>
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-24 pt-16 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <span className="mb-4 inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            Built for college students
          </span>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Professional lab records in minutes
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Generate formatted lab record tables with permanent QR codes, GitHub links, and
            one-click DOCX & PDF exports.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link to="/login">
              <Button size="lg" className="gap-2">
                Start free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#features">
              <Button size="lg" variant="outline">
                Learn more
              </Button>
            </a>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mx-auto mt-16 max-w-4xl rounded-2xl border border-border bg-card p-2 shadow-2xl"
        >
          <div className="rounded-xl bg-muted/30 p-8 text-left">
            <div className="mb-4 flex gap-2">
              <div className="h-3 w-3 rounded-full bg-red-400" />
              <div className="h-3 w-3 rounded-full bg-yellow-400" />
              <div className="h-3 w-3 rounded-full bg-green-400" />
            </div>
            <div className="space-y-3 font-mono text-sm text-muted-foreground">
              <p>Subject: Data Structures Lab</p>
              <p>Code: CS301 | Semester: 5</p>
              <div className="mt-4 grid grid-cols-5 gap-2 border-t border-border pt-4 text-xs">
                <span className="font-semibold text-foreground">No.</span>
                <span className="col-span-2 font-semibold text-foreground">Experiment</span>
                <span className="font-semibold text-foreground">GitHub</span>
                <span className="font-semibold text-foreground">QR</span>
                <span>1</span>
                <span className="col-span-2">Binary Search Tree</span>
                <span>github.com/...</span>
                <span className="text-primary">▣ QR</span>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      <section id="features" className="border-t border-border bg-muted/30 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-12 text-center text-3xl font-bold">Everything you need</h2>
          <div className="grid gap-8 md:grid-cols-3">
            {features.map(({ icon: Icon, title, description }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="rounded-xl border border-border bg-card p-6 shadow-sm"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Smart Lab Record Generator
      </footer>
    </div>
  );
}
