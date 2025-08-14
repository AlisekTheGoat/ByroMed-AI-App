// Umožní TypeScriptu vědět o window.api i když preload zatím není hotový.
export {};
declare global {
  interface Window {
    api?: unknown;
  }
}
