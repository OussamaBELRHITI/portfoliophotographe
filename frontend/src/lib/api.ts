import type {
  Category,
  CloudinarySignature,
  LoginResponse,
  Media,
  ProblemDetail,
  SiteSettings,
} from "./types";

/**
 * Two different base URLs on purpose:
 *
 * - Server Components render inside the container/host, so they can reach the backend directly.
 * - Client Components run in the browser and need a publicly reachable URL.
 *
 * In local dev both are http://localhost:8080; they diverge once deployed (Vercel talking to
 * Render, say) which is why they're separate variables rather than one.
 */
const SERVER_BASE = process.env.API_URL ?? "http://localhost:8080";
const BROWSER_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

/** Fired on `window` when an admin call is rejected for a missing or expired token. */
export const SESSION_EXPIRED_EVENT = "admin:session-expired";

const base = () => (typeof window === "undefined" ? SERVER_BASE : BROWSER_BASE);

export class ApiError extends Error {
  status: number;
  problem?: ProblemDetail;

  constructor(status: number, message: string, problem?: ProblemDetail) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.problem = problem;
  }

  /** Flattened field errors from a 400, ready to drop next to form inputs. */
  get fieldErrors(): Record<string, string> {
    return this.problem?.errors ?? {};
  }
}

async function toApiError(res: Response): Promise<ApiError> {
  let problem: ProblemDetail | undefined;
  try {
    problem = (await res.json()) as ProblemDetail;
  } catch {
    // Some responses (401 from the entry point) have no body at all.
  }
  const message =
    problem?.detail ?? problem?.title ?? `Request failed with status ${res.status}`;
  return new ApiError(res.status, message, problem);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${base()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined" && path.startsWith("/api/admin/")) {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    throw await toApiError(res);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/* ------------------------------------------------------------------ */
/* Public endpoints — no auth                                          */
/* ------------------------------------------------------------------ */

/**
 * `revalidate` keeps the public site fast without going fully static: pages are cached and
 * refreshed in the background, so a gallery edit shows up within the window rather than
 * requiring a redeploy.
 */
const PUBLIC_CACHE: RequestInit = { next: { revalidate: 60 } } as RequestInit;

export const publicApi = {
  categories: () => request<Category[]>("/api/public/categories", PUBLIC_CACHE),

  /**
   * Uncached category list, for build-time work only.
   *
   * `generateStaticParams` and the sitemap must see the *current* data. With the normal cached
   * fetch they read whatever is in `.next/cache`, which survives between builds — and on Vercel
   * survives between deployments — so a gallery deleted months ago can still be prerendered
   * into a fresh production build. Runtime pages keep the 60s cache; only these two bypass it.
   */
  categoriesFresh: () =>
    request<Category[]>("/api/public/categories", { cache: "no-store" }),

  category: (slug: string) =>
    request<Category>(`/api/public/categories/${encodeURIComponent(slug)}`, PUBLIC_CACHE),

  categoryMedia: (slug: string) =>
    request<Media[]>(
      `/api/public/categories/${encodeURIComponent(slug)}/media`,
      PUBLIC_CACHE,
    ),

  videos: () => request<Media[]>("/api/public/videos", PUBLIC_CACHE),

  categoryVideos: (slug: string) =>
    request<Media[]>(
      `/api/public/categories/${encodeURIComponent(slug)}/videos`,
      PUBLIC_CACHE,
    ),

  /** Hero media. Resolves to null when the API returns 204 (no media uploaded yet). */
  hero: async (): Promise<Media | null> => {
    const res = await fetch(`${base()}/api/public/hero`, PUBLIC_CACHE);
    if (res.status === 204) return null;
    if (!res.ok) throw await toApiError(res);
    return (await res.json()) as Media;
  },

  featured: () => request<Media[]>("/api/public/featured", PUBLIC_CACHE),

  settings: () => request<SiteSettings>("/api/public/settings", PUBLIC_CACHE),
};

/* ------------------------------------------------------------------ */
/* Admin endpoints — bearer token required                             */
/* ------------------------------------------------------------------ */

const auth = (token: string, init: RequestInit = {}): RequestInit => ({
  ...init,
  // Admin data must never be cached — it includes hidden items and changes constantly.
  cache: "no-store",
  headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}` },
});

export const authApi = {
  login: (username: string, password: string) =>
    request<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  /** Changes the signed-in admin's username and/or password; returns a fresh token. */
  updateAccount: (
    token: string,
    body: { currentPassword: string; username: string; newPassword?: string },
  ) =>
    request<LoginResponse>(
      "/api/auth/account",
      auth(token, { method: "PUT", body: JSON.stringify(body) }),
    ),

  me: (token: string) =>
    request<{ username: string; authorities: { authority: string }[] }>(
      "/api/auth/me",
      auth(token),
    ),
};

export const adminApi = {
  /* categories */
  categories: (token: string) => request<Category[]>("/api/admin/categories", auth(token)),

  createCategory: (
    token: string,
    body: {
      name: string;
      slug?: string;
      description?: string;
      visible?: boolean;
      displayOrder?: number;
    },
  ) =>
    request<Category>(
      "/api/admin/categories",
      auth(token, { method: "POST", body: JSON.stringify(body) }),
    ),

  updateCategory: (
    token: string,
    id: number,
    body: {
      name: string;
      slug?: string;
      description?: string;
      visible?: boolean;
      displayOrder?: number;
    },
  ) =>
    request<Category>(
      `/api/admin/categories/${id}`,
      auth(token, { method: "PUT", body: JSON.stringify(body) }),
    ),

  setCategoryVisibility: (token: string, id: number, visible: boolean) =>
    request<Category>(
      `/api/admin/categories/${id}/visibility?visible=${visible}`,
      auth(token, { method: "PATCH" }),
    ),

  reorderCategories: (token: string, orderedIds: number[]) =>
    request<void>(
      "/api/admin/categories/reorder",
      auth(token, { method: "PATCH", body: JSON.stringify({ orderedIds }) }),
    ),

  deleteCategory: (token: string, id: number) =>
    request<void>(`/api/admin/categories/${id}`, auth(token, { method: "DELETE" })),

  /* media */
  media: (token: string, categoryId?: number) =>
    request<Media[]>(
      `/api/admin/media${categoryId != null ? `?categoryId=${categoryId}` : ""}`,
      auth(token),
    ),

  uploadSignature: (token: string) =>
    request<CloudinarySignature>(
      "/api/admin/media/upload-signature",
      auth(token, { method: "POST" }),
    ),

  createMedia: (
    token: string,
    body: {
      title?: string;
      description?: string;
      url: string;
      publicId: string;
      type: "IMAGE" | "VIDEO";
      width?: number;
      height?: number;
      format?: string;
      bytes?: number;
      durationSeconds?: number;
      categoryId?: number | null;
      visible?: boolean;
    },
  ) =>
    request<Media>(
      "/api/admin/media",
      auth(token, { method: "POST", body: JSON.stringify(body) }),
    ),

  updateMedia: (
    token: string,
    id: number,
    body: {
      title?: string;
      description?: string;
      categoryId?: number;
      /** Moves the item out of its gallery; a missing categoryId alone means "unchanged". */
      removeFromCategory?: boolean;
      visible?: boolean;
      featured?: boolean;
      displayOrder?: number;
    },
  ) =>
    request<Media>(
      `/api/admin/media/${id}`,
      auth(token, { method: "PATCH", body: JSON.stringify(body) }),
    ),

  reorderMedia: (token: string, orderedIds: number[]) =>
    request<void>(
      "/api/admin/media/reorder",
      auth(token, { method: "PATCH", body: JSON.stringify({ orderedIds }) }),
    ),

  deleteMedia: (token: string, id: number) =>
    request<void>(`/api/admin/media/${id}`, auth(token, { method: "DELETE" })),

  /* settings */
  settings: (token: string) => request<SiteSettings>("/api/admin/settings", auth(token)),

  updateSettings: (token: string, body: SiteSettings) =>
    request<SiteSettings>(
      "/api/admin/settings",
      auth(token, { method: "PUT", body: JSON.stringify(body) }),
    ),
};

/* ------------------------------------------------------------------ */
/* Cloudinary direct upload                                            */
/* ------------------------------------------------------------------ */

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
  duration?: number;
  resource_type: string;
}

/**
 * Step 3 of the upload flow: the file goes straight from the browser to Cloudinary, so it
 * never passes through the Spring server.
 *
 * The signed fields must match exactly what the backend hashed (folder + timestamp) — adding
 * or omitting one here makes Cloudinary reject the signature.
 *
 * Uses XMLHttpRequest rather than fetch purely because it reports upload progress.
 */
export function uploadToCloudinary(
  file: File,
  sig: CloudinarySignature,
  onProgress?: (percent: number) => void,
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    form.append("api_key", sig.apiKey);
    form.append("timestamp", String(sig.timestamp));
    form.append("signature", sig.signature);
    form.append("folder", sig.folder);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", sig.uploadUrl);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText) as CloudinaryUploadResult);
      } else {
        let detail = xhr.responseText;
        try {
          detail = JSON.parse(xhr.responseText)?.error?.message ?? detail;
        } catch {
          /* keep raw text */
        }
        reject(new Error(`Cloudinary upload failed (${xhr.status}): ${detail}`));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during Cloudinary upload"));
    xhr.send(form);
  });
}
