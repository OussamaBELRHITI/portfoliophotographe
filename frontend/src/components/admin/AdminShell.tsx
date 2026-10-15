"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { useSiteName } from "@/lib/useSiteName";
import {
  ExternalIcon,
  FolderIcon,
  HomeIcon,
  ImageIcon,
  LogoutIcon,
  SettingsIcon,
  UserIcon,
} from "./icons";
import { Spinner } from "./ui";

const NAV = [
  { href: "/admin", label: "Overview", icon: HomeIcon, exact: true },
  { href: "/admin/categories", label: "Categories", icon: FolderIcon },
  { href: "/admin/media", label: "Media", icon: ImageIcon },
  { href: "/admin/settings", label: "Settings", icon: SettingsIcon },
  { href: "/admin/account", label: "Account", icon: UserIcon },
];

/**
 * Client-side route guard.
 *
 * Worth being clear about what this is and isn't: it controls what the *UI* shows. It is not
 * the security boundary — every admin endpoint is enforced server-side by Spring Security, so
 * bypassing this in devtools gets you an empty page and a pile of 401s.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const { token, username, ready, logout } = useAuth();
  const siteName = useSiteName();
  const pathname = usePathname();
  const router = useRouter();

  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (ready && !token && !isLoginPage) router.replace("/admin/login");
  }, [ready, token, isLoginPage, router]);

  // Waiting on the stored token avoids flashing the login screen for an authenticated admin.
  if (!ready) return <FullScreen><Spinner label="Checking session" /></FullScreen>;

  if (isLoginPage) return <>{children}</>;

  if (!token) return <FullScreen><Spinner label="Redirecting" /></FullScreen>;

  const isActive = (item: (typeof NAV)[number]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <div className="flex min-h-screen flex-col bg-ink lg:flex-row">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-surface lg:flex">
        <div className="flex items-center gap-3 px-5 py-6">
          <Monogram name={siteName} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-fg">{siteName}</p>
            <p className="text-xs text-fg-subtle">Dashboard</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {NAV.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-accent/12 text-accent"
                    : "text-fg-muted hover:bg-surface-raised hover:text-fg"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}

          <div className="my-3 border-t border-line" />

          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-raised hover:text-fg"
          >
            <ExternalIcon size={18} />
            View website
          </Link>
        </nav>

        <div className="m-3 flex items-center gap-3 rounded-lg border border-line bg-ink p-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-raised text-xs font-semibold text-fg uppercase">
            {username?.charAt(0) ?? "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-fg">{username}</p>
            <p className="text-xs text-fg-subtle">Administrator</p>
          </div>
          <button
            type="button"
            onClick={logout}
            aria-label="Sign out"
            title="Sign out"
            className="rounded-md p-1.5 text-fg-subtle transition-colors hover:bg-surface-raised hover:text-red-400"
          >
            <LogoutIcon size={17} />
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <Monogram name={siteName} />
            <p className="text-sm font-semibold">{siteName}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-fg-muted hover:bg-surface-raised hover:text-fg"
          >
            <LogoutIcon size={15} />
            Sign out
          </button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3">
          {NAV.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-accent/12 text-accent" : "text-fg-muted hover:bg-surface-raised"
                }`}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="min-w-0 flex-1 px-4 py-8 sm:px-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}

function Monogram({ name }: { name: string }) {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-sm font-bold text-ink">
      {name.trim().charAt(0).toUpperCase()}
    </div>
  );
}

function FullScreen({ children }: { children: ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center bg-ink">{children}</div>;
}
