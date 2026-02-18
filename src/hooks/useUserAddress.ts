/**
 * Hook to get the current user's wallet address.
 * Uses the WalletAdapter from VaultContext.
 */

import { useState, useEffect } from "react";
import type { Address } from "viem";
import { useVaultContext } from "../provider/VaultContext";

export function useUserAddress(): Address | null {
  const { walletAdapter } = useVaultContext();
  const [address, setAddress] = useState<Address | null>(null);

  useEffect(() => {
    let cancelled = false;

    walletAdapter.getAddress().then((addr) => {
      if (!cancelled) setAddress(addr);
    });

    return () => { cancelled = true; };
  }, [walletAdapter]);

  return address;
}
