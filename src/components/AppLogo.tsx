import { useBrand } from '@/lib/brand';

interface AppLogoProps {
  collapsed: boolean;
}

export function AppLogo({ collapsed }: AppLogoProps) {
  const { logoUrl, iconUrl, name } = useBrand();

  if (collapsed) {
    return (
      <img
        src={iconUrl}
        alt={name}
        style={{ height: 32, width: 32, objectFit: 'contain' }}
      />
    );
  }

  return (
    <img
      src={logoUrl}
      alt={name}
      style={{ height: 28, objectFit: 'contain' }}
    />
  );
}
