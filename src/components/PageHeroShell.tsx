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
        className="relative w-full overflow-hidden h-[220px] sm:h-[280px] md:h-[320px]"
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
              "linear-gradient(to bottom, transparent 0%, rgba(248,250,251,0.55) 55%, var(--skin-surface) 100%)",
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

        {hasHeader && (
          <div className="relative z-10 h-full mx-auto w-full px-4 sm:px-6 pb-6 sm:pb-8 flex items-end lg:w-[80%] lg:max-w-[1400px]">
            <div
              className={`flex w-full gap-3 sm:gap-4 ${
                align === "center"
                  ? "flex-col items-center text-center"
                  : "flex-col sm:flex-row sm:items-end sm:justify-between"
              }`}
            >
              <div className={align === "center" ? "mx-auto" : "min-w-0"}>
                {eyebrow && (
                  <div className="text-white/85 text-xs uppercase tracking-[0.18em] drop-shadow-sm">
                    {eyebrow}
                  </div>
                )}
                {title && (
                  <h1 className="mt-1 text-white text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight drop-shadow-sm">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="mt-2 text-white/90 text-sm sm:text-base drop-shadow-sm">
                    {subtitle}
                  </p>
                )}
              </div>
              {actions && align !== "center" && (
                <div className="flex items-center gap-2 shrink-0 flex-wrap">{actions}</div>
              )}
            </div>
          </div>
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
          {children}
        </div>
      </div>

      <div className="h-12" />
    </div>
  );
}
