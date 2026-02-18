/**
 * Platform Detection Utilities
 * Detect whether running in web browser or React Native
 */

/**
 * Detect if running in React Native environment
 * @returns true if React Native, false if web browser
 */
export function isReactNative(): boolean {
  return (
    typeof navigator !== "undefined" && navigator.product === "ReactNative"
  );
}

/**
 * Detect if running in web browser
 * @returns true if web browser, false if React Native
 */
export function isWeb(): boolean {
  return !isReactNative();
}

/**
 * Get the current platform
 * @returns "web" or "native"
 */
export function getPlatform(): "web" | "native" {
  return isReactNative() ? "native" : "web";
}
