import { ZodError } from "zod";
import type { ActionDataState, ActionErrorKind } from "./action-data-state";

type ErrorWithKind = Error & { errorKind?: ActionErrorKind };

export function formatActionError(err: unknown): {
  error: string;
  errorKind?: ActionErrorKind;
} {
  if (err instanceof ZodError) {
    return { error: err.issues[0]?.message ?? "Validation failed" };
  }

  if (err instanceof Error) {
    return {
      error: err.message,
      errorKind: (err as ErrorWithKind).errorKind,
    };
  }

  return { error: "Something went wrong" };
}

export async function tryAction<T>(
  response: ActionDataState<T>,
  fn: () => Promise<void>,
): Promise<void> {
  try {
    await fn();
  } catch (err) {
    const formatted = formatActionError(err);
    response.error = formatted.error;
    response.errorKind = formatted.errorKind;
  }
}
