import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FlaskConical, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-5 text-center">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex flex-col items-center"
      >
        <FlaskConical className="mb-4 h-10 w-10 text-foreground" />

        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Error 404
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Page not found
        </h1>
        <p className="mt-3 max-w-sm text-xs leading-5 text-muted-foreground">
          The page you're looking for doesn't exist, or may have moved. Check
          the link, or head back to your workspace.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/">
            <Button
              size="lg"
              className="gap-2 rounded-xl bg-primary px-5 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90"
            >
              <Home className="h-4 w-4" />
              Back to workspace
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}