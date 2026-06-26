import { useTheme } from "@/lib/theme";
// Vite returns the resolved asset URL (string) for `.svg` imports.
// NOTE: these are placeholder marks — Claude Design will supply real branding.
import xcampLogo from "@/assets/xcamp-logo.svg";
import xcampIcon from "@/assets/xcamp-icon.svg";
import noxLogo from "@/assets/nox-logo.svg";
import noxIcon from "@/assets/nox-icon.svg";

export function useBrand() {
  const { resolved } = useTheme();
  const isNox = resolved === "dark";
  return {
    isNox,
    name: isNox ? "Nox" : "Xcamp",
    logoUrl: isNox ? noxLogo : xcampLogo,
    iconUrl: isNox ? noxIcon : xcampIcon,
  };
}
