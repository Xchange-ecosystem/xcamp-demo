import type { ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { useHeroImage } from "@/lib/useHeroImage";

type Props = {
  seed?: string;
  image?: string;
  children: ReactNode;
  heroHeight?: number;
  overlap?: number;
  eyebrow?: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  logo?: ReactNode;
  align?: "left" | "center";
  showImageReload?: boolean;
};

export function PageHeroShell({
  seed,
  image,
  children,
  overlap = 56,
  eyebrow,
  title,
  subtitle,
  actions,
  logo,
  align = "left",
  showImageReload = true,
}: Props) {
  const { url: fetched, reload, canReload } = useHeroImage(image ? undefined : seed);
  const heroUrl = image ?? fetched;

  const fallbackGradient = "var(--skin-accent-gradient)";
  const hasHeader = Boolean(eyebrow || title || subtitle || actions);

  return (
    <div className="min-h-screen w-full" style={{ background: "var(--skin-surface)" }}>
      <div
        className="relative w-full overflow-hidden h-[150px] sm:h-[280px] md:h-[320px]"
        style={{ background: fallbackGradient }}
      >
        {heroUrl && (
          <img
            src={heroUrl}
            alt=""
            aria-hidden
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover x-fade-in"
          />
        )}

        {/* Accent colour multiply filter — tints the hero with the active brand accent
            (Xcamp #4de0c1 / Nox #b689e6 via --skin-accent) */}
        {heroUrl && (
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "var(--skin-accent)",
              mixBlendMode: "multiply",
              opacity: 0.55,
            }}
          />
        )}

        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(135deg, rgba(52,172,191,0.45) 0%, transparent 60%)",
            mixBlendMode: "soft-light",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, rgba(77,224,193,0.22) 0%, transparent 55%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-2/3 pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, transparent 0%, color-mix(in srgb, var(--skin-surface) 55%, transparent) 55%, var(--skin-surface) 100%)",
          }}
        />

        {showImageReload && canReload && !image && (
          <button
            type="button"
            onClick={reload}
            aria-label="Reload hero image"
            title="Reload hero image"
            className="absolute top-4 right-4 z-20 flex items-center gap-1.5 rounded-full bg-black/30 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-white/90 hover:bg-black/50 transition-colors cursor-pointer"
          >
            <RefreshCw size={14} />
            <span className="hidden sm:inline">New image</span>
          </button>
        )}

      </div>

      <div
        className="relative mx-auto w-full px-4 sm:px-6 lg:w-[80%] lg:max-w-[1400px]"
        style={{ marginTop: -overlap }}
      >
        <div
          className="rounded-2xl shadow-xl"
          style={{
            background: "var(--skin-bg)",
            border: "1px solid var(--skin-line)",
            color: "var(--skin-ink)",
          }}
        >
          {hasHeader && (
            <div
              className={`flex gap-3 sm:gap-4 px-4 pt-4 pb-3 sm:px-5 sm:pt-5 ${
                align === "center"
                  ? "flex-col items-center text-center"
                  : "flex-row items-center justify-between sm:items-end"
              }`}
            >
              <div className={align === "center" ? "mx-auto" : "min-w-0"}>
                {logo && (
                  <div className="mb-2 sm:mb-3">{logo}</div>
                )}
                {eyebrow && (
                  <div className="text-[var(--skin-ink-soft)] text-[11px] sm:text-xs uppercase tracking-[0.18em]">
                    {eyebrow}
                  </div>
                )}
                {title && (
                  <h1 className="mt-0.5 sm:mt-1 text-xl sm:text-3xl md:text-4xl font-semibold tracking-tight" style={{ color: "var(--skin-ink)" }}>
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="mt-1 sm:mt-2 text-[13px] sm:text-base" style={{ color: "var(--skin-ink-soft)" }}>
                    {subtitle}
                  </p>
                )}
              </div>
              {actions && align !== "center" && (
                <div className="flex items-center gap-2 shrink-0 flex-wrap">{actions}</div>
              )}
            </div>
          )}
          {children}
        </div>
      </div>

      <div className="h-12" />
    </div>
  );
}
