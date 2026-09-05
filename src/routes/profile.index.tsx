import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Camera, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/lib/supabase";
import { updateAvatar, updateDisplayName } from "@/lib/xcamp-api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/profile/")({
  component: ProfileAccountPage,
});

// Downscale an image file to a compact JPEG data URL for inline storage.
async function fileToAvatarDataUrl(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  const scale = Math.max(size / img.width, size / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
  return canvas.toDataURL("image/jpeg", 0.85);
}

function ProfileAccountPage() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user?.displayName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [savingName, setSavingName] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  if (!user) return null;

  const initials = (user.displayName || "U")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleAvatarFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    setUploadingAvatar(true);
    try {
      const url = await fileToAvatarDataUrl(file);
      await updateAvatar(user.centralId, url);
      await refreshUser();
      toast.success(t("profile.saved"));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setUploadingAvatar(true);
    try {
      await updateAvatar(user.centralId, null);
      await refreshUser();
      toast.success(t("profile.saved"));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveName = async () => {
    setSavingName(true);
    try {
      await updateDisplayName(user.centralId, name.trim());
      await refreshUser();
      toast.success(t("profile.saved"));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingName(false);
    }
  };

  const handleUpdateEmail = async () => {
    setSavingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: email.trim() });
      if (error) throw error;
      toast.success(t("profile.emailHint"));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingEmail(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user.email) return;
    setSendingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) throw error;
      toast.success(t("profile.passwordReset"));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSendingReset(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">{t("profile.title")}</h1>

      {/* Avatar */}
      <Card>
        <CardHeader>
          <CardTitle>{t("profile.avatar")}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Avatar className="h-20 w-20">
            {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={user.displayName} /> : null}
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleAvatarFile(f);
                e.target.value = "";
              }}
            />
            <Button
              variant="outline"
              size="sm"
              disabled={uploadingAvatar}
              onClick={() => fileRef.current?.click()}
            >
              <Camera className="mr-2 h-4 w-4" />
              {t("profile.uploadAvatar")}
            </Button>
            {user.avatarUrl ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={uploadingAvatar}
                onClick={handleRemoveAvatar}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t("profile.removeAvatar")}
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Name */}
      <Card>
        <CardHeader>
          <CardTitle>{t("profile.name")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label htmlFor="display-name" className="sr-only">
            {t("profile.name")}
          </Label>
          <Input
            id="display-name"
            value={name}
            placeholder={t("profile.namePlaceholder")}
            onChange={(e) => setName(e.target.value)}
          />
          <Button onClick={handleSaveName} disabled={savingName || !name.trim()}>
            {savingName ? t("profile.saving") : t("profile.save")}
          </Button>
        </CardContent>
      </Card>

      {/* Email */}
      <Card>
        <CardHeader>
          <CardTitle>{t("profile.email")}</CardTitle>
          <CardDescription>{t("profile.emailHint")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button
            onClick={handleUpdateEmail}
            disabled={savingEmail || !email.trim() || email.trim() === user.email}
          >
            {savingEmail ? t("profile.saving") : t("profile.updateEmail")}
          </Button>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader>
          <CardTitle>{t("profile.password")}</CardTitle>
          <CardDescription>{t("profile.passwordReset")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={handlePasswordReset}
            disabled={sendingReset || !user.email}
          >
            {sendingReset ? t("profile.saving") : t("profile.sendReset")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
