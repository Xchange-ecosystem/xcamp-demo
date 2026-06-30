import type { LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: LucideIcon;
  label: string;
}

export function ActionPillButton({ icon: Icon, label, className, style, ...props }: Props) {
  return (
    <button
      {...props}
      className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer ${className ?? ""}`}
      style={{
        borderRadius: "var(--xr-pill)",
        background: "var(--skin-accent-gradient)",
        border: "none",
        ...style,
      }}
    >
      {Icon && <Icon size={16} />}
      {label}
    </button>
  );
}
