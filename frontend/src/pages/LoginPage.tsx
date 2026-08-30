import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FlaskConical, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

export function LoginPage() {
  const { signInWithGoogle, user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) navigate('/records/new', { replace: true });
  }, [user, navigate]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithGoogle();
      navigate('/records/new', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Check Firebase configuration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-sm"
      >
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-foreground" />
            <span className="text-base font-semibold tracking-tight text-foreground">
              Labora
            </span>
          </Link>
        </div>

        <div className="rounded-2xl border border-border bg-card p-7 shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-none sm:p-8">
          <h1 className="text-center text-xl font-semibold tracking-tight text-foreground">
            Sign in
          </h1>
          <p className="mt-2 text-center text-xs leading-5 text-muted-foreground">
            Sign in with Google to create and manage your lab records.
          </p>

          {error && (
            <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-xs text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            className="mt-6 h-11 w-full gap-2.5 rounded-xl bg-primary font-semibold text-primary-foreground shadow-sm hover:opacity-90"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in…
              </>
            ) : (
              <>
                <GoogleIcon className="h-4 w-4" />
                Continue with Google
              </>
            )}
          </Button>

          <p className="mt-6 text-center text-[11px] leading-relaxed text-muted-foreground">
            Fast, secure authentication. No password required.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.85A11 11 0 0 0 12 23z" fill="#34A853" />
      <path d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.05H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.95l3.66-2.85z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.82 6.05l3.66 2.85c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
    </svg>
  );
}