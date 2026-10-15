import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { AuthProvider } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Admin",
  // The dashboard has no business in search results.
  robots: { index: false, follow: false },
};

/**
 * The admin tree sits outside the `(site)` route group, so it gets no public header/footer.
 * AuthProvider wraps everything here; AdminShell handles the redirect for unauthenticated
 * visitors and renders the sidebar.
 */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <AuthProvider>
      <AdminShell>{children}</AdminShell>
    </AuthProvider>
  );
}
