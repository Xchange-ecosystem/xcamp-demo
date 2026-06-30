import { useTheme } from "@/lib/theme";
import xcampLogo from "@/assets/Xcamp logo.png";
import xcampIcon from "@/assets/Xcamp icon emerald.png";
import noxLogo   from "@/assets/Nox logo.png";
import noxIcon   from "@/assets/Nox icon square.png";

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
