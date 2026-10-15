import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Reveal } from "@/components/site/Reveal";
import { publicApi } from "@/lib/api";
import type { SiteSettings } from "@/lib/types";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch about commissions, rates and availability.",
};

interface ContactItem {
  label: string;
  value: string;
  icon: ReactNode;
  href?: string;
  external?: boolean;
}

export default async function ContactPage() {
  let settings: SiteSettings = {};
  try {
    settings = await publicApi.settings();
  } catch {
    // the list falls back to whatever is present
  }

  const items = [
    settings.contactEmail && {
      label: "Email",
      value: settings.contactEmail,
      icon: <MailIcon />,
      href: `mailto:${settings.contactEmail}`,
    },
    settings.contactPhone && {
      label: "Phone",
      value: settings.contactPhone,
      icon: <PhoneIcon />,
      href: `tel:${settings.contactPhone.replace(/\s+/g, "")}`,
    },
    settings.whatsappUrl && {
      label: "WhatsApp",
      value: "Send a message",
      icon: <ChatIcon />,
      href: settings.whatsappUrl,
      external: true,
    },
    settings.instagramUrl && {
      label: "Instagram",
      value: settings.instagramUrl.replace(/^https?:\/\/(www\.)?instagram\.com\//, "@").replace(/\/$/, ""),
      icon: <InstagramIcon />,
      href: settings.instagramUrl,
      external: true,
    },
    settings.location && { label: "Based in", value: settings.location, icon: <PinIcon /> },
  ].filter(Boolean) as ContactItem[];

  return (
    <div className="mx-auto max-w-350 px-6 pt-32 pb-28 lg:px-12 lg:pt-44">
      <div className="grid gap-16 lg:grid-cols-[1fr_1.1fr] lg:gap-24">
        <Reveal>
          <p className="text-[11px] font-medium tracking-[0.3em] text-accent uppercase">
            Get in touch
          </p>
          <h1 className="mt-4 text-5xl font-semibold tracking-tight sm:text-6xl">
            Let&apos;s work together
          </h1>
          <div className="mt-6 h-px w-16 bg-accent" />
          <p className="mt-8 max-w-md text-[15px] leading-[1.85] text-fg-muted">
            For commissions, rates or anything else — email is the fastest way to reach me. I
            usually reply within a day or two.
          </p>

          {settings.contactEmail && (
            <a
              href={`mailto:${settings.contactEmail}`}
              className="mt-10 inline-block rounded-full bg-accent px-8 py-3.5 text-[11px] font-semibold tracking-[0.22em] text-ink uppercase shadow-[0_12px_40px_-12px_rgba(200,168,130,0.6)] transition-all duration-300 hover:bg-accent-bright hover:shadow-[0_16px_50px_-12px_rgba(200,168,130,0.8)]"
            >
              Send an email
            </a>
          )}
        </Reveal>

        <Reveal delay={120}>
          {items.length > 0 ? (
            <ul className="-mx-4 space-y-2 sm:-mx-5 lg:mt-2">
              {items.map((item) => (
                <li key={item.label}>
                  <ContactRow {...item} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-fg-subtle">
              Contact details are being added. Please check back soon.
            </p>
          )}
        </Reveal>
      </div>
    </div>
  );
}

function ContactRow({ label, value, icon, href, external }: ContactItem) {
  const body = (
    <>
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent ring-1 ring-accent/20 transition-colors duration-300 group-hover:bg-accent group-hover:text-ink">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-medium tracking-[0.2em] text-fg-subtle uppercase">
          {label}
        </span>
        <span className="mt-1 block text-lg wrap-break-word text-fg transition-colors group-hover:text-accent-bright sm:text-xl">
          {value}
        </span>
      </span>
      {href && (
        <span
          aria-hidden="true"
          className="-translate-x-2 text-xl text-accent opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
        >
          →
        </span>
      )}
    </>
  );

  const classes =
    "group flex items-center gap-5 rounded-2xl px-4 py-4 transition-colors duration-300 sm:px-5";

  if (!href) return <div className={classes}>{body}</div>;

  return (
    <a
      href={href}
      className={`${classes} hover:bg-white/3`}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {body}
    </a>
  );
}

/* Small stroke icons, matching the line weight used across the site. */

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const MailIcon = () => (
  <Icon>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </Icon>
);

const PhoneIcon = () => (
  <Icon>
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
  </Icon>
);

const ChatIcon = () => (
  <Icon>
    <path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.6A8.4 8.4 0 1 1 21 11.5Z" />
  </Icon>
);

const InstagramIcon = () => (
  <Icon>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
  </Icon>
);

const PinIcon = () => (
  <Icon>
    <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </Icon>
);
