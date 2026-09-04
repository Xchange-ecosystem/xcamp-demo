import { Link } from "@tanstack/react-router";
import { useBrand } from "@/lib/brand";

interface AppLogoProps {
  collapsed: boolean;
}

export function AppLogo({ collapsed }: AppLogoProps) {
  const { logoUrl, iconUrl, name } = useBrand();

  if (collapsed) {
    return (
      <Link to="/home" aria-label="Go to Companion">
        <img src={iconUrl} alt={name} style={{ height: 32, width: 32, objectFit: "contain" }} />
      </Link>
    );
  }

  return (
    <Link to="/home" aria-label="Go to Companion">
      <img src={logoUrl} alt={name} style={{ height: 28, objectFit: "contain" }} />
    </Link>
  );
}
