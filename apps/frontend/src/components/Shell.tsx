import { NavLink } from "react-router-dom";
import type { PropsWithChildren } from "react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { logout, type CurrentUser } from "../api/auth";
import { getPublicSettings } from "../api/settings";

const navGroups = [
  {
    label: "Main",
    items: [
      {
        to: "/",
        label: "Dashboard",
        roles: ["admin", "teacher"],
        icon: (
          <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        ),
      },
      {
        to: "/students",
        label: "Students",
        roles: ["admin", "teacher"],
        icon: (
          <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path strokeLinecap="round" d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        ),
      },
      {
        to: "/attendance",
        label: "Attendance",
        roles: ["admin", "teacher"],
        icon: (
          <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
            <rect x="9" y="3" width="6" height="4" rx="1" />
            <path strokeLinecap="round" d="M9 12h6M9 16h4" />
          </svg>
        ),
      },
      {
        to: "/webcam",
        label: "Live Webcam",
        roles: ["admin", "teacher"],
        icon: (
          <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" d="M15 10l4.553-2.069A1 1 0 0 1 21 8.82v6.362a1 1 0 0 1-1.447.894L15 14M3 8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z" />
          </svg>
        ),
      },
      {
        to: "/review-queue",
        label: "Review Queue",
        roles: ["admin", "teacher"],
        icon: (
          <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" d="M9 12l2 2 4-4M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
          </svg>
        ),
      },
    ],
  },
  {
    label: "Reports",
    items: [
      {
        to: "/reports/weekly",
        label: "Weekly Report",
        roles: ["admin", "teacher"],
        icon: (
          <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path strokeLinecap="round" d="M3 9h18M9 21V9" />
          </svg>
        ),
      },
      {
        to: "/reports/monthly",
        label: "Monthly Report",
        roles: ["admin", "teacher"],
        icon: (
          <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path strokeLinecap="round" d="M16 3v4M8 3v4M3 11h18M7 15h2M11 15h2M15 15h2M7 19h2M11 19h2M15 19h2" />
          </svg>
        ),
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        to: "/cameras",
        label: "Cameras",
        roles: ["admin"],
        icon: (
          <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path strokeLinecap="round" d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
          </svg>
        ),
      },
      {
        to: "/audit",
        label: "Audit",
        roles: ["admin"],
        icon: (
          <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M12 12l2 2 4-4" />
          </svg>
        ),
      },
      {
        to: "/users",
        label: "Users",
        roles: ["admin"],
        icon: (
          <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path strokeLinecap="round" d="M19 8v6M22 11h-6" />
          </svg>
        ),
      },
      {
        to: "/classes",
        label: "Classes",
        roles: ["admin"],
        icon: (
          <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        ),
      },
      {
        to: "/rules",
        label: "Rules",
        roles: ["admin"],
        icon: (
          <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        ),
      },
      {
        to: "/notifications",
        label: "Notifications",
        roles: ["admin"],
        icon: (
          <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path strokeLinecap="round" d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        ),
      },
      {
        to: "/setup",
        label: "Setup",
        roles: ["admin"],
        icon: (
          <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path strokeLinecap="round" d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83l-.06.06a2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2h-.1a2 2 0 0 1-2-2v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0l-.06-.06a2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2v-.1a2 2 0 0 1 2-2h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83l.06-.06a2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2h.1a2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0l.06.06a2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2v.1a2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        ),
      },
    ],
  },
];

export function Shell({ children, currentUser }: PropsWithChildren<{ currentUser: CurrentUser }>) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const settingsQuery = useQuery({
    queryKey: ["public-settings"],
    queryFn: getPublicSettings,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
  
  const hybridLearningEnabled = settingsQuery.data?.hybrid_learning_enabled ?? false;
  
  const filteredGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items
        .filter((item) => item.roles.includes(currentUser.role))
        .filter((item) => {
          // Hide Review Queue if hybrid learning is disabled
          if (item.to === "/review-queue" && !hybridLearningEnabled) {
            return false;
          }
          return true;
        }),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <style>{`
        /* Hide scrollbars */
        ::-webkit-scrollbar {
          display: none;
        }
        * {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* ── Sidebar ── */}
      <aside className={`flex flex-shrink-0 flex-col bg-blue-950 relative overflow-hidden transition-all duration-300 ${sidebarOpen ? 'w-56' : 'w-16'}`}>

        {/* Dot grid texture */}
        <div className="pointer-events-none absolute inset-0 [background-image:radial-gradient(rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:20px_20px]" />

        {/* Logo */}
        <div className="relative flex items-center gap-3 border-b border-white/[0.07] px-4 py-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 transition"
          >
            <svg className="h-4 w-4 text-blue-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {sidebarOpen ? <path strokeLinecap="round" d="M15 19l-7-7 7-7" /> : <path strokeLinecap="round" d="M9 5l7 7-7 7" />}
            </svg>
          </button>
          {sidebarOpen && (
            <div className="min-w-0">
              <p className="text-[13px] font-bold leading-tight text-slate-100 truncate">Face Attendance</p>
              <p className="text-[10px] font-medium text-blue-300 truncate">School Admin Console</p>
            </div>
          )}
        </div>

        {/* Nav */}
        {sidebarOpen && (
          <nav className="relative flex-1 overflow-y-auto px-2.5 py-3 space-y-4 scrollbar-none">
            {filteredGroups.map((group) => (
              <div key={group.label}>
                <p className="mb-1.5 px-2 text-[9px] font-bold uppercase tracking-[0.14em] text-blue-400/60">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === "/"}
                      className={({ isActive }) =>
                        [
                          "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-150",
                          isActive
                            ? "bg-gradient-to-r from-blue-700 to-blue-600 text-white shadow-lg shadow-blue-900/40"
                            : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-200",
                        ].join(" ")
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span className={isActive ? "text-blue-200" : "text-slate-500"}>
                            {item.icon}
                          </span>
                          {item.label}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        )}

        {/* Logout */}
        {sidebarOpen && (
          <div className="relative border-t border-white/[0.07] p-3">
            <button
              onClick={logout}
              className="flex w-full items-center gap-2.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-400 transition-all hover:bg-red-500/20 hover:text-red-300"
            >
              <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
              Logout
            </button>
          </div>
        )}
      </aside>

      {/* ── Main ── */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Top bar */}
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-5 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400">Admin Console</span>
            <svg className="h-3 w-3 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" d="M9 18l6-6-6-6" />
            </svg>
            <NavLink to="/" end className="font-semibold text-blue-800">
              {({ isActive }) => (isActive ? "Dashboard" : "")}
            </NavLink>
            {filteredGroups.flatMap((g) => g.items).map((item) =>
              item.to !== "/" ? (
                <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? "font-semibold text-blue-800" : "hidden")}>
                  {item.label}
                </NavLink>
              ) : null
            )}
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            <span className="text-[11px] font-semibold text-slate-400">Live</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-5">
          <div className="min-h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}