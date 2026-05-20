import { describe, it, expect, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { createPublicClient, http } from "viem";
import { arbitrum } from "viem/chains";
import type { Address } from "viem";
import { VaultContext, type VaultContextValue } from "../../provider/VaultContext";
import type { WalletAdapter } from "../../types/wallet";
import { useUserAddress } from "../useUserAddress";

const addrA = "0x00000000000000000000000000000000000000aa" as Address;
const addrB = "0x00000000000000000000000000000000000000bb" as Address;

function createTestAdapter(): WalletAdapter & {
  emit: (address: Address | null) => void;
} {
  let current: Address | null = null;
  const listeners = new Set<(address: Address | null) => void>();

  return {
    platform: "web",
    connect: vi.fn(),
    disconnect: vi.fn(),
    getAddress: vi.fn(async () => current),
    sendTransaction: vi.fn(),
    isConnected: () => current !== null,
    onAccountsChanged(callback) {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    emit(address) {
      current = address;
      for (const listener of listeners) {
        listener(address);
      }
    },
  };
}

describe("useUserAddress", () => {
  it("updates when the wallet account changes", async () => {
    const walletAdapter = createTestAdapter();
    const publicClient = createPublicClient({
      chain: arbitrum,
      transport: http("https://arb1.arbitrum.io/rpc"),
    });

    const value: VaultContextValue = {
      config: { chainId: 42161, rpcUrl: "https://arb1.arbitrum.io/rpc" },
      walletAdapter,
      publicClient,
    };

    const { result } = renderHook(() => useUserAddress(), {
      wrapper: ({ children }) => (
        <VaultContext.Provider value={value}>{children}</VaultContext.Provider>
      ),
    });

    await waitFor(() => expect(result.current).toBeNull());

    act(() => {
      walletAdapter.emit(addrA);
    });
    await waitFor(() => expect(result.current).toBe(addrA));

    act(() => {
      walletAdapter.emit(addrB);
    });
    await waitFor(() => expect(result.current).toBe(addrB));

    act(() => {
      walletAdapter.emit(null);
    });
    await waitFor(() => expect(result.current).toBeNull());
  });
});
