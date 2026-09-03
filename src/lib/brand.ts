import xcampLogo from "@/assets/Xcamp logo.png";
import xcampIcon from "@/assets/Xcamp icon emerald.png";

// xcamp-companion is single-brand: Xcamp in both light and dark mode. It no
// longer follows xcamp-nox-founder-app's Xcamp(light)/Nox(dark) brand split
// — dark mode gets a teal-brand-appropriate accent (see styles.css's .dark
// block), not a separate "Nox" identity. `isNox` is kept (always false) so
// existing call sites that branch on it don't need individual edits.
export function useBrand() {
  return {
    isNox: false as const,
    name: "Xcamp",
    logoUrl: xcampLogo,
    iconUrl: xcampIcon,
  };
}
