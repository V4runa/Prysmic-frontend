"use client";
import { createContext, useCallback, useContext, useState } from "react";
import SessionExpiredToast from "./SessionExpiredToast";

const SessionToastContext = createContext<() => void>(() => {
  console.warn("🚨 useSessionToast called with no provider");
});

export function useSessionToast() {
  return useContext(SessionToastContext);
}

export function SessionToastProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);

  const triggerToast = useCallback(() => {
    setVisible(true);
    setTimeout(() => {
      setVisible(false);
      localStorage.removeItem("token");
      window.location.href = "/login";
    }, 3000);
  }, []);

  return (
    <SessionToastContext.Provider value={triggerToast}>
      <>
        {children}
        {visible && <SessionExpiredToast />}
      </>
    </SessionToastContext.Provider>
  );
}
