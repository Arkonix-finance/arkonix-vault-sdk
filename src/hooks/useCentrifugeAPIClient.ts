import { useVaultContext } from "../provider/VaultContext";
import { CentrifugeAPIClient } from "../core/api";

/**
 * Hook to get the CentrifugeAPIClient from the VaultProvider context.
 * Returns undefined if no Centrifuge API configuration was provided.
 * 
 * @returns CentrifugeAPIClient instance or undefined
 */
export function useCentrifugeAPIClient(): CentrifugeAPIClient | undefined {
  const { centrifugeAPIClient } = useVaultContext();
  return centrifugeAPIClient;
}

/**
 * Hook to get the CentrifugeAPIClient from the VaultProvider context.
 * Creates a new instance if not available in context.
 * 
 * @param fallbackConfig Optional configuration for creating a new client if needed
 * @returns CentrifugeAPIClient instance (always defined)
 */
export function useCentrifugeAPIClientOrCreate(
  fallbackConfig?: { apiUrl?: string; timeout?: number }
): CentrifugeAPIClient {
  const { centrifugeAPIClient } = useVaultContext();
  
  if (centrifugeAPIClient) {
    return centrifugeAPIClient;
  }
  
  // Create a default client if none exists
  return new CentrifugeAPIClient(fallbackConfig);
}