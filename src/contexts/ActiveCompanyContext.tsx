import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type ActiveCompanyContextType = {
  activeCompanyId: string | null;
  setActiveCompanyId: (companyId: string | null) => void;
};

const STORAGE_KEY = "creativeStudio.activeCompanyId";

const ActiveCompanyContext = createContext<ActiveCompanyContextType | undefined>(undefined);

export function ActiveCompanyProvider({ children }: { children: React.ReactNode }) {
  const [activeCompanyId, setActiveCompanyIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const setActiveCompanyId = (companyId: string | null) => {
    setActiveCompanyIdState(companyId);
    try {
      if (companyId) localStorage.setItem(STORAGE_KEY, companyId);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    // keep state in sync if other tabs change it
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setActiveCompanyIdState(e.newValue);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo(() => ({ activeCompanyId, setActiveCompanyId }), [activeCompanyId]);

  return <ActiveCompanyContext.Provider value={value}>{children}</ActiveCompanyContext.Provider>;
}

export function useActiveCompany() {
  const ctx = useContext(ActiveCompanyContext);
  if (!ctx) throw new Error("useActiveCompany must be used within ActiveCompanyProvider");
  return ctx;
}
