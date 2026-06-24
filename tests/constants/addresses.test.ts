import { describe, it, expect } from "vitest";
import {
  getContracts,
  isChainSupported,
  getSupportedChainIds,
} from "../../src/constants/addresses";

describe("getContracts", () => {
  it("returns contracts for Arbitrum (42161)", () => {
    const contracts = getContracts(42161);
    expect(contracts).toBeDefined();
    expect(contracts?.USDC).toBe("0xaf88d065e77c8cC2239327C5EDb3A432268e5831");
  });

  it("returns contracts for Ethereum mainnet (1)", () => {
    const contracts = getContracts(1);
    expect(contracts).toBeDefined();
    expect(contracts?.USDC).toBe("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
  });

  it("returns contracts for Base (8453)", () => {
    const contracts = getContracts(8453);
    expect(contracts?.USDC).toBe("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913");
  });

  it("returns contracts for BSC (56)", () => {
    const contracts = getContracts(56);
    expect(contracts?.USDC).toBe("0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d");
  });

  it("returns an entry for HyperEVM (999) without a hardcoded USDC", () => {
    const contracts = getContracts(999);
    expect(contracts).toBeDefined();
    expect(contracts?.USDC).toBeUndefined();
  });

  it("returns null for unsupported chain", () => {
    const contracts = getContracts(12345);
    expect(contracts).toBeNull();
  });
});

describe("isChainSupported", () => {
  it("returns true for supported chains", () => {
    expect(isChainSupported(42161)).toBe(true);
    expect(isChainSupported(1)).toBe(true);
    expect(isChainSupported(8453)).toBe(true);
    expect(isChainSupported(56)).toBe(true);
    expect(isChainSupported(999)).toBe(true);
  });

  it("returns false for unsupported chains", () => {
    expect(isChainSupported(12345)).toBe(false);
  });
});

describe("getSupportedChainIds", () => {
  it("returns array of supported chain IDs", () => {
    const chainIds = getSupportedChainIds();
    expect(chainIds).toContain(42161);
    expect(chainIds).toContain(1);
    expect(chainIds).toContain(8453);
    expect(chainIds).toContain(56);
    expect(chainIds).toContain(999);
  });
});
