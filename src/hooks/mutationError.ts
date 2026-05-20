import type { TxState } from "../types/transaction";

export function getErrorMessage(err: unknown, fallback = "Transaction failed"): string {
  if (err && typeof err === "object") {
    const shortMessage = (err as { shortMessage?: string }).shortMessage;
    if (typeof shortMessage === "string" && shortMessage.length > 0) {
      return shortMessage;
    }
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return fallback;
}

export function failMutation(
  message: string,
  setTxState: (state: TxState) => void,
  setError: (error: string | null) => void,
): never {
  setTxState("error");
  setError(message);
  throw new Error(message);
}

export function handleMutationError(
  err: unknown,
  setTxState: (state: TxState) => void,
  setError: (error: string | null) => void,
): never {
  const message = getErrorMessage(err);
  setTxState("error");
  setError(message);
  throw err instanceof Error ? err : new Error(message);
}
