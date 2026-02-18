import { describe, it, expect } from "vitest";
import { isReactNative, isWeb, getPlatform } from "../../src/utils/platform";

describe("Platform Detection", () => {
  it("detects web platform in test environment", () => {
    expect(isWeb()).toBe(true);
    expect(isReactNative()).toBe(false);
    expect(getPlatform()).toBe("web");
  });

  // Note: React Native detection tests would require mocking navigator.product
  // which is more complex and better suited for integration tests
});
