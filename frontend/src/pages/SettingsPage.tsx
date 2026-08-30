import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Moon, Sun, User, QrCode } from 'lucide-react';

export function SettingsPage() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-0 sm:py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account preferences and application appearance.
        </p>
      </header>

      {/* Profile Card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
            <User className="h-4.5 w-4.5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Profile</h2>
            <p className="text-xs text-muted-foreground">Your authenticated Google account details</p>
          </div>
        </div>

        <div className="flex items-center gap-4 pt-5">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt=""
              className="h-12 w-12 rounded-full ring-2 ring-border"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-base font-semibold text-secondary-foreground">
              {user?.name?.[0] || 'U'}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{user?.name || 'User'}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Appearance Card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
            {theme === 'dark' ? <Moon className="h-4.5 w-4.5" /> : <Sun className="h-4.5 w-4.5" />}
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Appearance</h2>
            <p className="text-xs text-muted-foreground">Toggle between light and dark mode</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-5">
          <div>
            <p className="text-xs font-medium text-foreground">Color Scheme</p>
            <p className="text-xs text-muted-foreground capitalize">
              Currently active: <span className="font-semibold text-foreground">{theme}</span> mode
            </p>
          </div>
          <Button
            variant="outline"
            onClick={toggleTheme}
            className="h-9 gap-2 rounded-xl border-border px-4 text-xs font-semibold text-foreground hover:bg-muted"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="h-3.5 w-3.5 text-amber-500" />
                Switch to light
              </>
            ) : (
              <>
                <Moon className="h-3.5 w-3.5 text-[#6351ce]" />
                Switch to dark
              </>
            )}
          </Button>
        </div>
      </div>

      {/* QR Info Card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-start gap-3.5">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
            <QrCode className="h-4.5 w-4.5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Dynamic QR Code Redirects</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              QR codes generated in your documents use persistent short URLs (e.g. <span className="font-mono text-foreground">/r/abc123</span>). When you update your repository links in the workspace, scans will automatically redirect to the new URL without requiring document re-printing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}