export function isReactNative(): boolean {
  return typeof navigator !== "undefined" && navigator.product === "ReactNative";
}

export function isWeb(): boolean {
  return !isReactNative();
}

export function getPlatform(): "web" | "native" {
  return isReactNative() ? "native" : "web";
}
