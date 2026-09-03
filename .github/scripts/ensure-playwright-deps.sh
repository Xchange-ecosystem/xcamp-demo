#!/usr/bin/env bash
set -euo pipefail

readonly PREFIX="${RUNNER_TEMP:-${TMPDIR:-/tmp}}/pw-sysdeps"
readonly PROBE_LOG="${RUNNER_TEMP:-${TMPDIR:-/tmp}}/playwright-launch-probe.log"
readonly APT_LISTS="$PREFIX/apt-lists"
BROWSER_PATH=""
INSPECT_PATH=""
PACKAGE_MANAGER="unknown"

log() {
  printf '[playwright-deps] %s\n' "$*"
}

install_browser() {
  if [[ "${PW_DEPS_SKIP_BROWSER_INSTALL:-0}" == "1" ]]; then
    log "Browser install skipped by PW_DEPS_SKIP_BROWSER_INSTALL=1."
    return
  fi
  log "Installing the Playwright Chromium browser."
  bunx playwright install chromium
}

locate_browsers() {
  if [[ -n "${PW_DEPS_BROWSER_PATH:-}" ]]; then
    BROWSER_PATH="$PW_DEPS_BROWSER_PATH"
    INSPECT_PATH="$PW_DEPS_BROWSER_PATH"
    return
  fi

  BROWSER_PATH="$(bun -e 'import { chromium } from "playwright"; process.stdout.write(chromium.executablePath())')"
  INSPECT_PATH="$BROWSER_PATH"

  local browser_root headless_shell
  browser_root="$(dirname "$(dirname "$BROWSER_PATH")")"
  browser_root="$(dirname "$browser_root")"
  headless_shell="$(find "$browser_root" -type f -name chrome-headless-shell -perm -u+x -print -quit 2>/dev/null || true)"
  if [[ -n "$headless_shell" ]]; then
    INSPECT_PATH="$headless_shell"
  fi
}

probe_browser() {
  : >"$PROBE_LOG"
  if [[ -n "${PW_DEPS_BROWSER_PATH:-}" ]]; then
    PW_DEPS_PROBE_EXECUTABLE="$BROWSER_PATH" bun -e '
      import { chromium } from "playwright";
      const browser = await chromium.launch({
        headless: true,
        executablePath: process.env.PW_DEPS_PROBE_EXECUTABLE,
      });
      const page = await browser.newPage();
      await page.goto("data:text/html,<title>playwright-dependency-probe</title>");
      if ((await page.title()) !== "playwright-dependency-probe") process.exitCode = 2;
      await browser.close();
    ' >"$PROBE_LOG" 2>&1
  else
    bun -e '
      import { chromium } from "playwright";
      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      await page.goto("data:text/html,<title>playwright-dependency-probe</title>");
      if ((await page.title()) !== "playwright-dependency-probe") process.exitCode = 2;
      await browser.close();
    ' >"$PROBE_LOG" 2>&1
  fi
}

report_probe_failure() {
  log "Chromium launch probe failed:"
  sed 's/^/[playwright-deps]   /' "$PROBE_LOG" >&2
}

missing_libraries() {
  if [[ ! -x "$INSPECT_PATH" ]] || ! command -v ldd >/dev/null 2>&1; then
    return 0
  fi
  ldd "$INSPECT_PATH" 2>/dev/null | awk '$2 == "=>" && $3 == "not" && $4 == "found" { print $1 }' | sort -u
}

activate_prefix() {
  local set_dir="$1"
  local joined=""
  local directory

  while IFS= read -r directory; do
    joined="${joined:+$joined:}$directory"
  done < <(find "$set_dir" -type f -o -type l 2>/dev/null | grep -E '/[^/]*\.so([.][0-9]+)*$' | xargs -r -n1 dirname | sort -u)

  if [[ -z "$joined" ]]; then
    return 1
  fi

  export LD_LIBRARY_PATH="${joined}${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
  if [[ -n "${GITHUB_ENV:-}" ]]; then
    printf 'LD_LIBRARY_PATH=%s\n' "$LD_LIBRARY_PATH" >>"$GITHUB_ENV"
  fi
  log "Activated userspace libraries from $set_dir."
}

package_for_library() {
  local manager="$1"
  local library="$2"
  case "$manager:$library" in
    apt:libnspr4.so) echo 'libnspr4' ;;
    apt:libnss3.so) echo 'libnss3' ;;
    apt:libnssutil3.so) echo 'libnss3' ;;
    apt:libsmime3.so) echo 'libnss3' ;;
    apt:libatk-1.0.so.0) echo 'libatk1.0-0t64|libatk1.0-0' ;;
    apt:libatk-bridge-2.0.so.0) echo 'libatk-bridge2.0-0t64|libatk-bridge2.0-0' ;;
    apt:libcups.so.2) echo 'libcups2t64|libcups2' ;;
    apt:libdrm.so.2) echo 'libdrm2' ;;
    apt:libxkbcommon.so.0) echo 'libxkbcommon0' ;;
    apt:libatspi.so.0) echo 'libatspi2.0-0t64|libatspi2.0-0' ;;
    apt:libXcomposite.so.1) echo 'libxcomposite1' ;;
    apt:libXdamage.so.1) echo 'libxdamage1' ;;
    apt:libXfixes.so.3) echo 'libxfixes3' ;;
    apt:libXrandr.so.2) echo 'libxrandr2' ;;
    apt:libgbm.so.1) echo 'libgbm1' ;;
    apt:libpango-1.0.so.0) echo 'libpango-1.0-0' ;;
    apt:libcairo.so.2) echo 'libcairo2' ;;
    apt:libasound.so.2) echo 'libasound2t64|libasound2' ;;
    apt:libglib-2.0.so.0|apt:libgobject-2.0.so.0) echo 'libglib2.0-0t64|libglib2.0-0' ;;
    apt:libdbus-1.so.3) echo 'libdbus-1-3' ;;
    apt:libX11.so.6) echo 'libx11-6' ;;
    apt:libxcb.so.1) echo 'libxcb1' ;;
    apt:libXext.so.6) echo 'libxext6' ;;
    dnf:libnspr4.so) echo 'nspr' ;;
    dnf:libnss3.so|dnf:libnssutil3.so|dnf:libsmime3.so) echo 'nss' ;;
    dnf:libatk-1.0.so.0) echo 'atk' ;;
    dnf:libatk-bridge-2.0.so.0) echo 'at-spi2-atk' ;;
    dnf:libatspi.so.0) echo 'at-spi2-core' ;;
    dnf:libcups.so.2) echo 'cups-libs' ;;
    dnf:libdrm.so.2) echo 'libdrm' ;;
    dnf:libxkbcommon.so.0) echo 'libxkbcommon' ;;
    dnf:libXcomposite.so.1) echo 'libXcomposite' ;;
    dnf:libXdamage.so.1) echo 'libXdamage' ;;
    dnf:libXfixes.so.3) echo 'libXfixes' ;;
    dnf:libXrandr.so.2) echo 'libXrandr' ;;
    dnf:libgbm.so.1) echo 'mesa-libgbm' ;;
    dnf:libpango-1.0.so.0) echo 'pango' ;;
    dnf:libcairo.so.2) echo 'cairo' ;;
    dnf:libasound.so.2) echo 'alsa-lib' ;;
    apk:libnspr4.so) echo 'nspr' ;;
    apk:libnss3.so|apk:libnssutil3.so|apk:libsmime3.so) echo 'nss' ;;
    apk:libatk-1.0.so.0) echo 'atk' ;;
    apk:libatk-bridge-2.0.so.0|apk:libatspi.so.0) echo 'at-spi2-core' ;;
    apk:libcups.so.2) echo 'cups-libs' ;;
    apk:libdrm.so.2) echo 'libdrm' ;;
    apk:libxkbcommon.so.0) echo 'libxkbcommon' ;;
    apk:libXcomposite.so.1) echo 'libxcomposite' ;;
    apk:libXdamage.so.1) echo 'libxdamage' ;;
    apk:libXfixes.so.3) echo 'libxfixes' ;;
    apk:libXrandr.so.2) echo 'libxrandr' ;;
    apk:libgbm.so.1) echo 'mesa-gbm' ;;
    apk:libpango-1.0.so.0) echo 'pango' ;;
    apk:libcairo.so.2) echo 'cairo' ;;
    apk:libasound.so.2) echo 'alsa-lib' ;;
    pacman:libnspr4.so) echo 'nspr' ;;
    pacman:libnss3.so|pacman:libnssutil3.so|pacman:libsmime3.so) echo 'nss' ;;
    pacman:libatk-1.0.so.0|pacman:libatk-bridge-2.0.so.0|pacman:libatspi.so.0) echo 'at-spi2-core' ;;
    pacman:libcups.so.2) echo 'libcups' ;;
    pacman:libdrm.so.2) echo 'libdrm' ;;
    pacman:libxkbcommon.so.0) echo 'libxkbcommon' ;;
    pacman:libXcomposite.so.1) echo 'libxcomposite' ;;
    pacman:libXdamage.so.1) echo 'libxdamage' ;;
    pacman:libXfixes.so.3) echo 'libxfixes' ;;
    pacman:libXrandr.so.2) echo 'libxrandr' ;;
    pacman:libgbm.so.1) echo 'mesa' ;;
    pacman:libpango-1.0.so.0) echo 'pango' ;;
    pacman:libcairo.so.2) echo 'cairo' ;;
    pacman:libasound.so.2) echo 'alsa-lib' ;;
    *) return 1 ;;
  esac
}

detect_package_manager() {
  if command -v apt-get >/dev/null 2>&1 && command -v dpkg-deb >/dev/null 2>&1; then
    PACKAGE_MANAGER="apt"
  elif command -v dnf >/dev/null 2>&1 && command -v rpm2cpio >/dev/null 2>&1 && command -v cpio >/dev/null 2>&1; then
    PACKAGE_MANAGER="dnf"
  elif command -v apk >/dev/null 2>&1 && command -v tar >/dev/null 2>&1; then
    PACKAGE_MANAGER="apk"
  elif command -v pacman >/dev/null 2>&1 && command -v tar >/dev/null 2>&1; then
    PACKAGE_MANAGER="pacman"
  fi
}

prepare_package_manager() {
  if [[ "$PACKAGE_MANAGER" != "apt" ]]; then
    return 0
  fi

  mkdir -p "$APT_LISTS/partial"
  if find "$APT_LISTS" -type f -name '*Packages*' -print -quit | grep -q .; then
    return 0
  fi

  log "Refreshing apt package metadata in the userspace prefix."
  apt-get -o "Dir::State::lists=$APT_LISTS" update
}

resolve_packages() {
  local library alternatives candidate
  local -a resolved=()
  for library in "$@"; do
    alternatives="$(package_for_library "$PACKAGE_MANAGER" "$library" 2>/dev/null || true)"
    [[ -n "$alternatives" ]] || continue
    IFS='|' read -r -a candidates <<<"$alternatives"
    for candidate in "${candidates[@]}"; do
      if [[ "$PACKAGE_MANAGER" != "apt" ]] || apt-cache -o "Dir::State::lists=$APT_LISTS" show "$candidate" >/dev/null 2>&1; then
        resolved+=("$candidate")
        break
      fi
    done
  done
  if ((${#resolved[@]})); then
    printf '%s\n' "${resolved[@]}" | sort -u
  fi
}

download_and_extract() {
  local destination="$1"
  shift
  local -a packages=("$@")
  local downloads="$destination/downloads"
  mkdir -p "$downloads" "$destination/root"

  case "$PACKAGE_MANAGER" in
    apt)
      (cd "$downloads" && apt-get -o "Dir::State::lists=$APT_LISTS" download "${packages[@]}")
      find "$downloads" -type f -name '*.deb' -print0 | while IFS= read -r -d '' archive; do
        dpkg-deb -x "$archive" "$destination/root"
      done
      ;;
    dnf)
      dnf download --resolve --alldeps --destdir "$downloads" "${packages[@]}"
      find "$downloads" -type f -name '*.rpm' -print0 | while IFS= read -r -d '' archive; do
        (cd "$destination/root" && rpm2cpio "$archive" | cpio -idm --quiet)
      done
      ;;
    apk)
      (cd "$downloads" && apk fetch --recursive "${packages[@]}")
      find "$downloads" -type f -name '*.apk' -print0 | while IFS= read -r -d '' archive; do
        tar -xzf "$archive" -C "$destination/root"
      done
      ;;
    pacman)
      local db="$destination/pacman-db"
      mkdir -p "$db"
      pacman -Syw --noconfirm --dbpath "$db" --cachedir "$downloads" "${packages[@]}"
      find "$downloads" -type f -name '*.pkg.tar.*' -print0 | while IFS= read -r -d '' archive; do
        tar -xf "$archive" -C "$destination/root"
      done
      ;;
    *) return 1 ;;
  esac
}

admin_packages() {
  case "$PACKAGE_MANAGER" in
    apt) echo 'libasound2t64/libasound2 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdbus-1-3 libdrm2 libgbm1 libglib2.0-0 libnspr4 libnss3 libpango-1.0-0 libx11-6 libxcb1 libxcomposite1 libxdamage1 libxext6 libxfixes3 libxkbcommon0 libxrandr2' ;;
    dnf) echo 'alsa-lib atk at-spi2-atk at-spi2-core cairo cups-libs libdrm libXcomposite libXdamage libXfixes libXrandr libxkbcommon mesa-libgbm nspr nss pango' ;;
    apk) echo 'alsa-lib at-spi2-core atk cairo cups-libs libdrm libxcomposite libxdamage libxfixes libxkbcommon libxrandr mesa-gbm nspr nss pango' ;;
    pacman) echo 'alsa-lib at-spi2-core cairo libcups libdrm libxcomposite libxdamage libxfixes libxkbcommon libxrandr mesa nspr nss pango' ;;
    *) echo '(detect the equivalent packages for the missing libraries above)' ;;
  esac
}

install_browser
locate_browsers
log "Layer 1/3: probing a real headless Chromium launch."
if probe_browser; then
  log "Chromium launched successfully; no system dependency bootstrap is needed."
  exit 0
fi
report_probe_failure

log "Layer 2/3: checking for root or passwordless sudo."
if [[ "${PW_DEPS_DISABLE_ROOT:-0}" != "1" ]] && { [[ "$(id -u)" == "0" ]] || sudo -n true >/dev/null 2>&1; }; then
  log "Privilege is available; running Playwright's supported dependency installer."
  if bunx playwright install --with-deps chromium; then
    locate_browsers
    if probe_browser; then
      log "Chromium launched successfully after the privileged dependency install."
      exit 0
    fi
    report_probe_failure
  else
    log "Privileged dependency installation failed; continuing to the no-root fallback."
  fi
else
  log "No root/passwordless sudo is available; continuing without mutating the host."
fi

mapfile -t initial_missing < <(missing_libraries)
if ((${#initial_missing[@]})); then
  log "Missing libraries reported by ldd: ${initial_missing[*]}"
else
  log "ldd did not report a mappable missing library (inspect target: $INSPECT_PATH)."
fi

detect_package_manager
missing_key="$(printf '%s\n' "${initial_missing[@]:-browser-unavailable}" | sha256sum | cut -c1-16)"
set_dir="$PREFIX/sets/$PACKAGE_MANAGER-$missing_key"

log "Layer 3/3: checking the cached userspace dependency set $set_dir."
if [[ -d "$set_dir/root" ]] && activate_prefix "$set_dir/root" && probe_browser; then
  log "Chromium launched successfully with the cached userspace libraries."
  exit 0
fi

if [[ "${PW_DEPS_DISABLE_USERSPACE:-0}" != "1" ]] && [[ "$PACKAGE_MANAGER" != "unknown" ]] && ((${#initial_missing[@]})); then
  rm -rf "$set_dir"
  mkdir -p "$set_dir"
  if ! prepare_package_manager; then
    log "Could not prepare $PACKAGE_MANAGER metadata for no-root downloads."
  fi
  current_missing=("${initial_missing[@]}")
  for round in 1 2 3; do
    mapfile -t packages < <(resolve_packages "${current_missing[@]}")
    if ((${#packages[@]} == 0)); then
      log "No package mapping was found for the exact libraries reported by ldd."
      break
    fi

    log "Userspace round $round: downloading (not installing) $PACKAGE_MANAGER packages: ${packages[*]}"
    if ! download_and_extract "$set_dir" "${packages[@]}" || ! activate_prefix "$set_dir/root"; then
      log "Userspace package download/extraction failed."
      break
    fi
    if probe_browser; then
      log "Chromium launched successfully with workspace-local system libraries."
      exit 0
    fi
    report_probe_failure
    mapfile -t current_missing < <(missing_libraries)
    if ((${#current_missing[@]} == 0)); then
      log "No additional missing shared libraries were exposed after userspace round $round."
      break
    fi
    log "Libraries still missing after userspace round $round: ${current_missing[*]}"
  done
else
  log "Userspace provisioning is unavailable or disabled (package manager: $PACKAGE_MANAGER)."
fi

mapfile -t final_missing < <(missing_libraries)
missing_text="${final_missing[*]:-${initial_missing[*]:-unknown (browser executable unavailable or launch failed for another reason)}}"
packages_text="$(admin_packages)"
printf '::error::Chromium still cannot launch. Missing libraries: %s. Runner admin: from this checkout run `sudo bunx playwright install --with-deps chromium` (equivalent: `sudo npx playwright install-deps chromium`). %s package family: %s. Probe log: %s\n' \
  "$missing_text" "$PACKAGE_MANAGER" "$packages_text" "$PROBE_LOG" >&2
exit 1
