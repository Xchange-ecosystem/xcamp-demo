import * as React from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface MultiSelectDropdownProps {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  label?: string;
  single?: boolean;
  disabled?: boolean;
}

export function MultiSelectDropdown({
  options,
  selected,
  onChange,
  placeholder = "Select…",
  label,
  single = false,
  disabled = false,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggle = (value: string) => {
    if (single) {
      onChange(selected.includes(value) ? [] : [value]);
      setOpen(false);
      return;
    }
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const selectedLabels = selected
    .map((v) => options.find((o) => o.value === v)?.label)
    .filter(Boolean) as string[];

  const displayText =
    selectedLabels.length === 0
      ? placeholder
      : selectedLabels.length === 1
        ? selectedLabels[0]
        : `${selectedLabels.length} selected`;

  return (
    <div ref={ref} className="relative" style={{ width: "100%" }}>
      {label && (
        <label
          className="mb-1 block text-xs font-medium"
          style={{ color: "var(--skin-ink-soft)" }}
        >
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm",
          disabled && "opacity-50 cursor-not-allowed",
        )}
        style={{
          border: "1px solid var(--skin-line)",
          background: "var(--skin-surface)",
          color: selected.length > 0 ? "var(--skin-ink)" : "var(--skin-ink-faint)",
        }}
      >
        <span className="min-w-0 truncate">{displayText}</span>
        <ChevronDown
          size={14}
          style={{
            flexShrink: 0,
            transition: "transform 0.2s",
            transform: open ? "rotate(180deg)" : "none",
            color: "var(--skin-ink-faint)",
          }}
        />
      </button>

      {open && (
        <div
          className="absolute z-50 w-full rounded-lg py-1 shadow-lg"
          style={{
            border: "1px solid var(--skin-line)",
            background: "var(--skin-surface-raised, var(--skin-surface))",
            marginTop: 4,
            maxHeight: 280,
            overflowY: "auto",
          }}
        >
          {options.length === 0 ? (
            <div className="px-3 py-2 text-sm" style={{ color: "var(--skin-ink-faint)" }}>
              No options
            </div>
          ) : (
            options.map((option) => {
              const isSelected = selected.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggle(option.value)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:opacity-80"
                  style={{
                    background: isSelected
                      ? "var(--skin-accent-soft, rgba(77,224,193,0.12))"
                      : "transparent",
                    color: isSelected ? "var(--skin-accent)" : "var(--skin-ink-soft)",
                    textAlign: "left",
                  }}
                >
                  <span
                    className="grid place-content-center"
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: single ? 999 : 4,
                      border: `1.5px solid ${isSelected ? "var(--skin-accent)" : "var(--skin-line)"}`,
                      background: isSelected ? "var(--skin-accent)" : "transparent",
                      flexShrink: 0,
                    }}
                  >
                    {isSelected && (
                      <Check size={10} style={{ color: "#fff" }} />
                    )}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                </button>
              );
            })
          )}
        </div>
      )}

      {!single && selected.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {selectedLabels.map((label) => (
            <span
              key={label}
              className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs"
              style={{
                background: "var(--skin-accent-soft)",
                color: "var(--skin-accent)",
              }}
            >
              {label}
              <button
                type="button"
                onClick={() => {
                  const val = options.find((o) => o.label === label)?.value;
                  if (val) onChange(selected.filter((v) => v !== val));
                }}
                aria-label={`Remove ${label}`}
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
