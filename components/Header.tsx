"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { useSelectedFolder } from "@/hooks/useSelectedFolder";
import { useDriveSync } from "@/hooks/useDriveSync";

export function Header() {
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);
  
  const [selectedFolder] = useSelectedFolder();
  const { isSyncing, syncProgress, lastSyncTime, sync } = useDriveSync(selectedFolder?.id);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <header className="flex justify-between items-center px-margin-mobile md:px-margin-desktop py-4 w-full sticky top-0 z-50 bg-surface dark:bg-surface-dim shadow-sm">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-primary text-2xl icon-fill">
          cloud_sync
        </span>
        <span className="text-headline-md font-headline-md text-on-surface dark:text-inverse-on-surface">
          My Drive Finder
        </span>
      </div>
      <div className="flex items-center gap-4">
        {selectedFolder && (
          <div className="hidden md:flex items-center gap-2 text-label-sm font-label-sm text-on-surface-variant bg-surface-container-highest px-3 py-1.5 rounded-full">
            {isSyncing ? (
              <>
                <span className="material-symbols-outlined text-primary animate-spin text-sm">refresh</span>
                <span className="truncate max-w-[200px]">{syncProgress || "동기화 중..."}</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-secondary-fixed"></span>
                {lastSyncTime ? `동기화됨 (${new Date(lastSyncTime).toLocaleTimeString()})` : "동기화 대기 중"}
              </>
            )}
          </div>
        )}
        
        {/* Dark Mode Toggle */}
        <button 
          onClick={toggleTheme}
          className="text-on-surface-variant hover:bg-surface-variant/50 p-2 rounded-full transition-colors flex items-center justify-center"
          aria-label="Toggle Dark Mode"
        >
          {mounted ? (
            <span className="material-symbols-outlined">
              {theme === "dark" ? "light_mode" : "dark_mode"}
            </span>
          ) : (
            <span className="material-symbols-outlined">dark_mode</span>
          )}
        </button>

        <button 
          onClick={() => sync()}
          disabled={!selectedFolder || isSyncing}
          className="text-on-surface-variant hover:bg-surface-variant/50 p-2 rounded-full transition-colors flex items-center justify-center disabled:opacity-50"
        >
          <span className={`material-symbols-outlined ${isSyncing ? "animate-spin" : ""}`} data-icon="sync">
            sync
          </span>
        </button>
        
        {session ? (
          <button 
            onClick={() => signOut()}
            className="text-on-surface-variant hover:bg-surface-variant/50 p-1 rounded-full transition-colors flex items-center justify-center overflow-hidden"
            title="로그아웃"
          >
            <img
              alt="User profile"
              className="w-8 h-8 rounded-full object-cover"
              src={session.user?.image || "https://lh3.googleusercontent.com/aida-public/AB6AXuDqKLuYp2yN9FVaUYYxOoMvjYUCPygVIfzv0nINbGRqEt6HpS27nlmd1HyL3PWm_n47Jh-xxURjXrg_woQenFkJEGc11NP6zLsTL9pfWL3qXkVNaRp6Q2-3xWMGANqa0udiGtEWaRoVFJzrlc9zjrYKVzDTaQ-OFLxVIm8_Wc0fCBjU7F8NlJbXDuYjYPOtVJTEqQ37SY2dfXnJMASWoVq-7U7VXeksJtM75FvPKbb9lBSODrSEqS2G"}
            />
          </button>
        ) : (
          <button 
            onClick={() => signIn("google")}
            className="text-label-md font-label-md text-primary hover:bg-primary/10 px-4 py-2 rounded-full transition-colors font-medium border border-primary/20"
          >
            로그인
          </button>
        )}
      </div>
    </header>
  );
}
