import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BookOpen, History, Settings, LogOut, FlaskConical, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/records/new', label: 'Workspace', icon: BookOpen },
  { to: '/history', label: 'History', icon: History },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const Sidebar = () => (
    <div className="flex h-full flex-col bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-5">
        <Link to="/records/new" className="flex items-center gap-2.5">
          <FlaskConical className="h-5 w-5 text-foreground" />
          <span className="text-[15px] font-semibold tracking-tight text-foreground">
            Labora
          </span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-lg text-muted-foreground hover:bg-muted lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <nav className="flex-1 space-y-1.5 p-3">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-secondary text-secondary-foreground font-semibold'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-lg transition-colors',
                    isActive
                      ? 'bg-[#6351ce] text-white dark:bg-[#9d8df2] dark:text-[#0e0d13]'
                      : 'text-muted-foreground group-hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.85} />
                </span>
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border p-4">
        <div className="mb-3 flex items-center gap-3 px-1">
          {user?.avatar ? (
            <img src={user.avatar} alt="" className="h-8 w-8 rounded-full ring-1 ring-border" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
              {user?.name?.[0] || 'U'}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{user?.name || 'User'}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full justify-start gap-2 rounded-xl text-muted-foreground hover:text-foreground"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Log out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden h-screen w-64 shrink-0 border-r border-border bg-card lg:flex lg:flex-col">
        <Sidebar />
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
              className="absolute left-0 top-0 h-full w-72 shadow-2xl"
            >
              <Sidebar />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content Area - Only this scrolls */}
      <div className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4 lg:hidden">
          <Link to="/records/new" className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-foreground" />
            <span className="text-sm font-semibold tracking-tight text-foreground">
              Labora
            </span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-lg text-muted-foreground hover:bg-muted"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}