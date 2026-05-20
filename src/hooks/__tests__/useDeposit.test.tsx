import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { createPublicClient, http } from "viem";
import { arbitrum } from "viem/chains";
import { VaultContext, type VaultContextValue } from "../../provider/VaultContext";
import type { WalletAdapter } from "../../types/wallet";
import { useDeposit } from "../useDeposit";

const vault = "0x0000000000000000000000000000000000000001" as const;
const asset = "0x0000000000000000000000000000000000000002" as const;
const user = "0x00000000000000000000000000000000000000aa" as const;

function renderUseDeposit(
  walletAdapter: WalletAdapter,
  options?: { allowance?: bigint },
) {
  const publicClient = createPublicClient({
    chain: arbitrum,
    transport: http("https://arb1.arbitrum.io/rpc"),
  });

  vi.spyOn(publicClient, "readContract").mockResolvedValue(options?.allowance ?? 0n);

  const value: VaultContextValue = {
    config: { chainId: 42161, rpcUrl: "https://arb1.arbitrum.io/rpc" },
    walletAdapter,
    publicClient,
  };

  return renderHook(() => useDeposit(vault, asset, 6, "ASYNC"), {
    wrapper: ({ children }) => (
      <VaultContext.Provider value={value}>{children}</VaultContext.Provider>
    ),
  });
}

function walletWithAddress(
  address: typeof user | null,
  overrides: Partial<WalletAdapter> = {},
): WalletAdapter {
  return {
    platform: "web",
    connect: vi.fn(),
    disconnect: vi.fn(),
    getAddress: vi.fn().mockResolvedValue(address),
    sendTransaction: vi.fn(),
    isConnected: () => address !== null,
    onAccountsChanged(callback) {
      callback(address);
      return () => {};
    },
    ...overrides,
  };
}

describe("useDeposit", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects when wallet is not connected", async () => {
    const { result } = renderUseDeposit(walletWithAddress(null));

    let caught: Error | undefined;
    await act(async () => {
      try {
        await result.current.deposit("100");
      } catch (err) {
        caught = err as Error;
      }
    });

    expect(caught?.message).toBe("Wallet not connected");
    await waitFor(() => {
      expect(result.current.txState).toBe("error");
      expect(result.current.error).toBe("Wallet not connected");
    });
  });

  it("rejects when sendTransaction fails", async () => {
    const { result } = renderUseDeposit(
      walletWithAddress(user, {
        sendTransaction: vi.fn().mockRejectedValue(new Error("user rejected")),
      }),
      { allowance: 1_000_000n },
    );

    let caught: Error | undefined;
    await act(async () => {
      try {
        await result.current.deposit("1");
      } catch (err) {
        caught = err as Error;
      }
    });

    expect(caught?.message).toBe("user rejected");
    await waitFor(() => {
      expect(result.current.txState).toBe("error");
      expect(result.current.error).toBe("user rejected");
    });
  });
});
