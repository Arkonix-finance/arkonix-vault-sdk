import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Address } from "viem";
import { WebWalletAdapter } from "../WebWalletAdapter";

const addrA = "0x00000000000000000000000000000000000000aa" as Address;
const addrB = "0x00000000000000000000000000000000000000bb" as Address;

describe("WebWalletAdapter", () => {
  const handlers: Record<string, (...args: unknown[]) => void> = {};

  beforeEach(() => {
    handlers.accountsChanged = () => {};
    (globalThis as { window?: unknown }).window = {
      ethereum: {
        request: vi.fn(async ({ method }: { method: string }) => {
          if (method === "eth_accounts") return [];
          return [];
        }),
        on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
          handlers[event] = handler;
        }),
      },
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as { window?: unknown }).window;
  });

  it("notifies subscribers on accountsChanged", async () => {
    const adapter = new WebWalletAdapter();
    const seen: (Address | null)[] = [];

    adapter.onAccountsChanged((address) => {
      seen.push(address);
    });

    handlers.accountsChanged([addrA]);
    handlers.accountsChanged([addrB]);
    handlers.accountsChanged([]);

    expect(seen).toEqual([addrA, addrB, null]);
    expect(await adapter.getAddress()).toBeNull();
  });
});
