import { useTheme } from "@/lib/theme";
import xcampLogo from "@/assets/xcamp-logo.svg.asset.json";
import xcampIcon from "@/assets/xcamp-icon.png.asset.json";
import noxLogo from "@/assets/nox-logo.png.asset.json";
import noxIcon from "@/assets/nox-icon.png.asset.json";

export function useBrand() {
  const { resolved } = useTheme();
  const isNox = resolved === "dark";
  return {
    isNox,
    name: isNox ? "Nox" : "Xcamp",
    logoUrl: isNox ? noxLogo.url : xcampLogo.url,
    iconUrl: isNox ? noxIcon.url : xcampIcon.url,
  };
}
