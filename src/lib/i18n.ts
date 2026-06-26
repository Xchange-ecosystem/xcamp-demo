import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const STORAGE_KEY = "xcamp-language";

export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

const resources = {
  en: {
    translation: {
      nav: {
        home: "Home",
        notes: "Notes",
        journal: "Notes",
        journalApp: "Journal",
        projectBuilder: "Project Builder",
        navigator: "Navigator",
        profile: "Profile",
        signOut: "Sign out",
        back: "Back",
      },
      profile: {
        title: "Profile",
        account: "Profile",
        appearance: "Appearance",
        avatar: "Avatar",
        uploadAvatar: "Upload avatar",
        removeAvatar: "Remove",
        name: "Display name",
        namePlaceholder: "Your name",
        email: "Email",
        emailHint: "Changing your email requires confirmation via a link sent to the new address.",
        updateEmail: "Update email",
        password: "Password",
        passwordReset: "Send a password reset link to your email.",
        sendReset: "Send reset link",
        save: "Save changes",
        saved: "Saved",
        saving: "Saving…",
      },
      appearance: {
        title: "Appearance",
        theme: "Theme",
        light: "Xcamp mode",
        dark: "Nox mode",
        system: "System",
        language: "Language",
        languageHint: "Choose the language used across the app.",
      },
    },
  },
  es: {
    translation: {
      nav: {
        home: "Inicio",
        notes: "Notas",
        journal: "Notas",
        journalApp: "Diario",
        projectBuilder: "Constructor de proyectos",
        navigator: "Navegador",
        profile: "Perfil",
        signOut: "Cerrar sesión",
        back: "Atrás",
      },
      profile: {
        title: "Perfil",
        account: "Perfil",
        appearance: "Apariencia",
        avatar: "Avatar",
        uploadAvatar: "Subir avatar",
        removeAvatar: "Quitar",
        name: "Nombre",
        namePlaceholder: "Tu nombre",
        email: "Correo electrónico",
        emailHint: "Cambiar tu correo requiere confirmación mediante un enlace enviado a la nueva dirección.",
        updateEmail: "Actualizar correo",
        password: "Contraseña",
        passwordReset: "Envía un enlace para restablecer tu contraseña.",
        sendReset: "Enviar enlace",
        save: "Guardar cambios",
        saved: "Guardado",
        saving: "Guardando…",
      },
      appearance: {
        title: "Apariencia",
        theme: "Tema",
        light: "Modo Xcamp",
        dark: "Modo Nox",
        system: "Sistema",
        language: "Idioma",
        languageHint: "Elige el idioma usado en la aplicación.",
      },
    },
  },
  fr: {
    translation: {
      nav: {
        home: "Accueil",
        notes: "Notes",
        journal: "Notes",
        journalApp: "Journal",
        projectBuilder: "Créateur de projet",
        navigator: "Navigateur",
        profile: "Profil",
        signOut: "Déconnexion",
        back: "Retour",
      },
      profile: {
        title: "Profil",
        account: "Profil",
        appearance: "Apparence",
        avatar: "Avatar",
        uploadAvatar: "Téléverser un avatar",
        removeAvatar: "Supprimer",
        name: "Nom affiché",
        namePlaceholder: "Votre nom",
        email: "E-mail",
        emailHint: "Changer votre e-mail nécessite une confirmation via un lien envoyé à la nouvelle adresse.",
        updateEmail: "Mettre à jour l'e-mail",
        password: "Mot de passe",
        passwordReset: "Envoyez un lien de réinitialisation à votre e-mail.",
        sendReset: "Envoyer le lien",
        save: "Enregistrer",
        saved: "Enregistré",
        saving: "Enregistrement…",
      },
      appearance: {
        title: "Apparence",
        theme: "Thème",
        light: "Mode Xcamp",
        dark: "Mode Nox",
        system: "Système",
        language: "Langue",
        languageHint: "Choisissez la langue utilisée dans l'application.",
      },
    },
  },
  de: {
    translation: {
      nav: {
        home: "Startseite",
        notes: "Notizen",
        journal: "Notizen",
        journalApp: "Journal",
        projectBuilder: "Projekt-Builder",
        navigator: "Navigator",
        profile: "Profil",
        signOut: "Abmelden",
        back: "Zurück",
      },
      profile: {
        title: "Profil",
        account: "Profil",
        appearance: "Darstellung",
        avatar: "Avatar",
        uploadAvatar: "Avatar hochladen",
        removeAvatar: "Entfernen",
        name: "Anzeigename",
        namePlaceholder: "Dein Name",
        email: "E-Mail",
        emailHint: "Eine E-Mail-Änderung erfordert eine Bestätigung über einen Link an die neue Adresse.",
        updateEmail: "E-Mail aktualisieren",
        password: "Passwort",
        passwordReset: "Sende einen Link zum Zurücksetzen des Passworts an deine E-Mail.",
        sendReset: "Link senden",
        save: "Änderungen speichern",
        saved: "Gespeichert",
        saving: "Speichern…",
      },
      appearance: {
        title: "Darstellung",
        theme: "Thema",
        light: "Xcamp-Modus",
        dark: "Nox-Modus",
        system: "System",
        language: "Sprache",
        languageHint: "Wähle die in der App verwendete Sprache.",
      },
    },
  },
};

const initialLanguage =
  (typeof window !== "undefined" && (localStorage.getItem(STORAGE_KEY) as LanguageCode)) || "en";

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: initialLanguage,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });
}

export function setLanguage(code: LanguageCode) {
  i18n.changeLanguage(code);
  if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, code);
}

export default i18n;
