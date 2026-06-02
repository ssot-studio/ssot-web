import { useEffect, useState } from 'react';
import { Link, Outlet, useParams } from '@tanstack/react-router';
import { Button } from '@/components/Button';
import { cn } from '@/lib/cn';
import type { ViewName } from '@/router';

const VIEWS: { id: ViewName; label: string }[] = [
  { id: 'graph', label: '그래프' },
  { id: 'tree', label: '트리' },
  { id: 'matrix', label: '표' },
];

function useTheme(): [string, () => void] {
  const [theme, setTheme] = useState<string>(() => {
    if (typeof document === 'undefined') return 'light';
    return document.documentElement.dataset.theme ?? 'light';
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return [theme, () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))];
}

export function RootLayout(): React.JSX.Element {
  const [theme, toggleTheme] = useTheme();
  // /$view 경로일 때만 view param 이 존재 — 인덱스 redirect 중에는 없음.
  const params = useParams({ strict: false });
  const activeView = (params as { view?: ViewName }).view;

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex h-12 shrink-0 items-center gap-4 border-b border-border px-4">
        <div className="flex items-center gap-2">
          <img
            src={`${import.meta.env.BASE_URL}logo.svg`}
            alt="SSOT Studio"
            className="h-6 w-6 rounded-md"
          />
          <span className="text-sm font-semibold">SSOT Studio</span>
          <span className="text-xs text-[var(--foreground-subtle)]">Single Source of Truth Explorer</span>
        </div>
        <nav className="flex items-center gap-1">
          {VIEWS.map((v) => (
            <Link key={v.id} to="/$view" params={{ view: v.id }} search={(prev) => prev}>
              {({ isActive }) => (
                <span
                  className={cn(
                    'inline-flex h-7 items-center rounded-md px-3 text-xs font-medium transition-colors',
                    isActive || activeView === v.id
                      ? 'bg-[var(--surface-hover)] text-foreground'
                      : 'text-[var(--foreground-muted)] hover:bg-[var(--surface-hover)] hover:text-foreground',
                  )}
                >
                  {v.label}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="ml-auto">
          <Button size="sm" variant="ghost" onClick={toggleTheme}>
            {theme === 'dark' ? '라이트' : '다크'}
          </Button>
        </div>
      </header>
      <main className="min-h-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
}
