import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

type ViewMode = 'cards' | 'list';

interface UIStateContextValue {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

const UIStateContext = createContext<UIStateContextValue | undefined>(undefined);
const SIDEBAR_KEY = 'apto-admin.sidebarCollapsed';
const VIEW_KEY = 'apto-admin.viewMode';

export function UIStateProvider({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem(SIDEBAR_KEY) === '1');
  const [viewMode, setViewModeState] = useState<ViewMode>(
    () => (localStorage.getItem(VIEW_KEY) as ViewMode) || 'cards'
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const value = useMemo(
    () => ({
      sidebarCollapsed,
      toggleSidebar: () =>
        setSidebarCollapsed((prev) => {
          const next = !prev;
          localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0');
          return next;
        }),
      viewMode,
      setViewMode: (mode: ViewMode) => {
        localStorage.setItem(VIEW_KEY, mode);
        setViewModeState(mode);
      },
      mobileMenuOpen,
      setMobileMenuOpen,
    }),
    [sidebarCollapsed, viewMode, mobileMenuOpen]
  );

  return <UIStateContext.Provider value={value}>{children}</UIStateContext.Provider>;
}

export function useUIState() {
  const ctx = useContext(UIStateContext);
  if (!ctx) throw new Error('useUIState debe usarse dentro de UIStateProvider');
  return ctx;
}
