import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FlaskConical } from 'lucide-react';
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
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        <div className="mb-12 text-center">
          <Link to="/" className="inline-flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl text-foreground">
              <FlaskConical className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold tracking-tight">Smart Lab Record</span>
          </Link>
        </div>
        <div className="border border-border bg-card p-8">
          <h1 className="text-center text-lg font-semibold">Sign in</h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Continue with Google to start your lab record.
          </p>
          {error && (
            <p className="mt-4 border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <Button
            className="mt-8 h-11 w-full"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Continue with Google'}
          </Button>
        </div>
      </div>
    </div>
  );
}
