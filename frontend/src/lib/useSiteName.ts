"use client";

import { useEffect, useState } from "react";
import { publicApi } from "./api";
import { SETTINGS_FALLBACK } from "./types";

/**
 * The studio name, for client components that need it outside the server-rendered site tree.
 *
 * Reads the *public* settings endpoint rather than the admin one so it also works on the login
 * screen, where there is no token yet.
 */
export function useSiteName(): string {
  const [name, setName] = useState<string>(SETTINGS_FALLBACK.siteName);

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        const settings = await publicApi.settings();
        if (active && settings.siteName) setName(settings.siteName);
      } catch {
        // keep the fallback
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, []);

  return name;
}
