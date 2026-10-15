"use client";

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ImageField } from "@/components/admin/ImageField";
import { Alert, Button, Card, Input, PageHeader, Spinner, Textarea } from "@/components/admin/ui";
import { adminApi, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { SiteSettings } from "@/lib/types";

/**
 * Every word on the public site, editable here.
 *
 * This is the page that makes "manage everything yourself" true — before it, the studio name,
 * tagline, bio and contact details lived in environment variables.
 */
export default function SettingsPage() {
  const { token } = useAuth();
  const [form, setForm] = useState<SiteSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setForm(await adminApi.settings(token));
      setDirty(false);
      setFieldErrors({});
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load settings");
      setForm({});
    }
  }, [token]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (active) await load();
    };
    void run();
    return () => {
      active = false;
    };
  }, [load]);

  // Warn before leaving with unsaved edits — a bio is easy to lose with one stray click.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // The "Saved" banner fades out on its own.
  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 3500);
    return () => clearTimeout(t);
  }, [saved]);

  function set<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
    setForm((f) => ({ ...(f ?? {}), [key]: value }));
    setSaved(false);
    setDirty(true);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!token || !form) return;

    setBusy(true);
    setError(null);
    setFieldErrors({});

    try {
      const updated = await adminApi.updateSettings(token, form);
      setForm(updated);
      setSaved(true);
      setDirty(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFieldErrors(err.fieldErrors);
      } else {
        setError("Something went wrong");
      }
    } finally {
      setBusy(false);
    }
  }

  if (!form) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Everything here appears on your website. Changes go live within a minute."
      />

      {error && (
        <div className="mb-6">
          <Alert kind="error">{error}</Alert>
        </div>
      )}

      <form onSubmit={save} className="space-y-6 pb-4">
        <Section
          id="identity"
          title="Identity"
          description="Your name and the opening words on the home page."
        >
          <Input
            label="Studio or your name"
            value={form.siteName ?? ""}
            onChange={(e) => set("siteName", e.target.value)}
            error={fieldErrors.siteName}
            placeholder="Studio"
          />
          <Input
            label="Small line above the name"
            value={form.heroEyebrow ?? ""}
            onChange={(e) => set("heroEyebrow", e.target.value)}
            error={fieldErrors.heroEyebrow}
            placeholder="Photography & Film"
          />
          <Textarea
            label="Tagline"
            rows={2}
            value={form.heroTagline ?? ""}
            onChange={(e) => set("heroTagline", e.target.value)}
            error={fieldErrors.heroTagline}
            placeholder="One sentence about what you do."
          />
        </Section>

        <Section
          id="about"
          title="Biography"
          description="Shown on the home page next to your portrait, and in full on the About page."
        >
          <ImageField
            label="Your portrait"
            shape="portrait"
            hint="A vertical photo works best. It's shown with a soft shadow beside your bio."
            value={form.aboutPortraitUrl}
            onChange={(url) => set("aboutPortraitUrl", url)}
            error={fieldErrors.aboutPortraitUrl}
          />
          <Input
            label="About page heading"
            value={form.aboutHeading ?? ""}
            onChange={(e) => set("aboutHeading", e.target.value)}
            error={fieldErrors.aboutHeading}
            placeholder="About"
          />
          <Textarea
            label="Biography"
            rows={10}
            value={form.aboutBody ?? ""}
            onChange={(e) => set("aboutBody", e.target.value)}
            error={fieldErrors.aboutBody}
            placeholder={"Who you are and how you work.\n\nA second paragraph."}
            hint="Leave an empty line between paragraphs. The home page shows the first two."
          />
        </Section>

        <Section
          id="banners"
          title="Page banners"
          description="Optional photo strips above the Work and Film pages. Without one, the page opens with a plain title."
        >
          <ImageField
            label="Work page banner"
            value={form.workBannerUrl}
            onChange={(url) => set("workBannerUrl", url)}
            error={fieldErrors.workBannerUrl}
          />
          <ImageField
            label="Film page banner"
            value={form.videosBannerUrl}
            onChange={(url) => set("videosBannerUrl", url)}
            error={fieldErrors.videosBannerUrl}
          />
        </Section>

        <Section
          id="contact"
          title="Contact"
          description="Shown in the footer and on the Contact page. Empty fields are hidden."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Input
              label="Email"
              type="email"
              value={form.contactEmail ?? ""}
              onChange={(e) => set("contactEmail", e.target.value)}
              error={fieldErrors.contactEmail}
              placeholder="you@example.com"
            />
            <Input
              label="Phone"
              value={form.contactPhone ?? ""}
              onChange={(e) => set("contactPhone", e.target.value)}
              error={fieldErrors.contactPhone}
              placeholder="+212 6 00 00 00 00"
            />
            <Input
              label="Instagram link"
              value={form.instagramUrl ?? ""}
              onChange={(e) => set("instagramUrl", e.target.value)}
              error={fieldErrors.instagramUrl}
              placeholder="https://instagram.com/…"
            />
            <Input
              label="WhatsApp link"
              value={form.whatsappUrl ?? ""}
              onChange={(e) => set("whatsappUrl", e.target.value)}
              error={fieldErrors.whatsappUrl}
              placeholder="https://wa.me/212600000000"
            />
          </div>
          <Input
            label="Location"
            value={form.location ?? ""}
            onChange={(e) => set("location", e.target.value)}
            error={fieldErrors.location}
            placeholder="Casablanca — available worldwide"
          />
        </Section>

        <Section
          id="seo"
          title="Search engines"
          description="The short description Google shows under your site's name."
        >
          <Textarea
            label="Description"
            rows={3}
            value={form.metaDescription ?? ""}
            onChange={(e) => set("metaDescription", e.target.value)}
            error={fieldErrors.metaDescription}
            hint={`${(form.metaDescription ?? "").length}/300 characters — around 150 is ideal.`}
          />
        </Section>

        <div className="sticky bottom-0 z-10 -mx-4 border-t border-line bg-surface px-4 py-4 shadow-[0_-12px_30px_rgba(0,0,0,0.6)] sm:mx-0 sm:rounded-xl sm:border sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-fg-subtle">
              {saved ? (
                <span className="text-emerald-400">✓ Saved — live on your website</span>
              ) : dirty ? (
                "You have unsaved changes"
              ) : (
                "All changes saved"
              )}
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={load} disabled={busy || !dirty}>
                Discard
              </Button>
              <Button type="submit" disabled={busy || !dirty}>
                {busy ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card className="p-6">
      <section id={id} className="scroll-mt-28 grid gap-6 lg:grid-cols-[220px_1fr] lg:gap-10">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          {description && <p className="mt-1 text-sm text-fg-subtle">{description}</p>}
        </div>
        <div className="min-w-0 space-y-5">{children}</div>
      </section>
    </Card>
  );
}
