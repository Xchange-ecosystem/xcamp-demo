import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme, type ThemeMode } from "@/lib/theme";
import { LANGUAGES, setLanguage, type LanguageCode } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/profile/appearance")({
  component: AppearancePage,
});

function AppearancePage() {
  const { t, i18n } = useTranslation();
  const { mode, setMode } = useTheme();

  const themeOptions: { value: ThemeMode; labelKey: string; icon: typeof Sun }[] = [
    { value: "light", labelKey: "appearance.light", icon: Sun },
    { value: "dark", labelKey: "appearance.dark", icon: Moon },
    { value: "system", labelKey: "appearance.system", icon: Monitor },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">{t("appearance.title")}</h1>

      {/* Theme */}
      <Card>
        <CardHeader>
          <CardTitle>{t("appearance.theme")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {themeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setMode(opt.value)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-lg border p-4 text-sm transition-colors",
                  mode === opt.value
                    ? "border-primary bg-accent text-foreground"
                    : "border-border text-muted-foreground hover:bg-accent/50",
                )}
              >
                <opt.icon className="h-5 w-5" />
                {t(opt.labelKey)}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Language */}
      <Card>
        <CardHeader>
          <CardTitle>{t("appearance.language")}</CardTitle>
          <CardDescription>{t("appearance.languageHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={i18n.language} onValueChange={(v) => setLanguage(v as LanguageCode)}>
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => (
                <SelectItem key={l.code} value={l.code}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    </div>
  );
}
