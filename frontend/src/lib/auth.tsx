"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { authApi, SESSION_EXPIRED_EVENT } from "./api";
import type { LoginResponse } from "./types";

const TOKEN_KEY = "portfolio.admin.token";
const EXPIRY_KEY = "portfolio.admin.expiresAt";

interface AuthState {
  token: string | null;
  username: string | null;
  /** False until the stored token has been read — guards against a login-screen flash. */
  ready: boolean;
  login: (username: string, password: string) => Promise<void>;
  /** Stores a token issued by something other than login — e.g. after renaming the account. */
  applySession: (res: LoginResponse) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

/**
 * The token lives in localStorage.
 *
 * Trade-off worth knowing: localStorage is readable by any script on the page, so an XSS bug
 * would expose the token. An httpOnly cookie would not be — but the backend issues a stateless
 * bearer token and is CSRF-disabled on that basis, so cookies would mean reworking the server
 * too. For a single-admin dashboard this is the standard pairing; revisit it if the admin
 * surface ever renders untrusted content.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXPIRY_KEY);
    setToken(null);
    setUsername(null);
  }, []);

  // A token can expire while the dashboard is open (they last 12 hours). The API client
  // announces any 401 from an admin endpoint; signing out here sends the shell back to the
  // login screen instead of leaving every button failing with "Request failed".
  useEffect(() => {
    window.addEventListener(SESSION_EXPIRED_EVENT, logout);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, logout);
  }, [logout]);

  // Restore a stored session on mount, discarding it if expired or no longer accepted.
  useEffect(() => {
    // `active` guards against setting state after unmount if the verify call is still in
    // flight. The work lives in a nested async function so nothing is set synchronously
    // during the effect body.
    let active = true;

    const restore = async () => {
      const stored = localStorage.getItem(TOKEN_KEY);
      const expiresAt = Number(localStorage.getItem(EXPIRY_KEY) ?? 0);

      if (!stored || Date.now() >= expiresAt) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(EXPIRY_KEY);
        if (active) setReady(true);
        return;
      }

      // Verifying with the server catches a token the backend has since stopped honouring —
      // a restart with a different JWT_SECRET, for instance.
      try {
        const me = await authApi.me(stored);
        if (active) {
          setToken(stored);
          setUsername(me.username);
        }
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(EXPIRY_KEY);
        if (active) {
          setToken(null);
          setUsername(null);
        }
      } finally {
        if (active) setReady(true);
      }
    };

    void restore();
    return () => {
      active = false;
    };
  }, []);

  const applySession = useCallback((res: LoginResponse) => {
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(EXPIRY_KEY, String(Date.now() + res.expiresInMs));
    setToken(res.token);
    setUsername(res.username);
  }, []);

  const login = useCallback(
    async (user: string, password: string) => applySession(await authApi.login(user, password)),
    [applySession],
  );

  const value = useMemo(
    () => ({ token, username, ready, login, applySession, logout }),
    [token, username, ready, login, applySession, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
