export type UiVariant = "classic" | "kontur";

const KONTUR_BRAND = "green";
const KONTUR_ACCENT = "gray";

/**
 * The app ships two interchangeable UI layers. The classic layer is the
 * default; `?ui=kontur` renders the same screens with @skbkontur/react-ui
 * components and @skbkontur/colors tokens.
 */
export function getUiVariant(): UiVariant {
  if (typeof window === "undefined") return "classic";
  return new URLSearchParams(window.location.search).get("ui") === "kontur" ? "kontur" : "classic";
}

export function isKonturUi(): boolean {
  return getUiVariant() === "kontur";
}

/** Activates the `@skbkontur/colors` brand/accent token set for the Kontur layer. */
export function applyColorTokens(): void {
  if (!isKonturUi()) return;
  const root = document.documentElement;
  root.dataset.kBrand = KONTUR_BRAND;
  root.dataset.kAccent = KONTUR_ACCENT;
}

/** href for the same location with the UI layer switched. */
export function uiVariantHref(variant: UiVariant): string {
  const url = new URL(window.location.href);
  if (variant === "kontur") url.searchParams.set("ui", "kontur");
  else url.searchParams.delete("ui");
  return url.toString();
}
