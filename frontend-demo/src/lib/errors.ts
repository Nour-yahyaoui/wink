/**
 * Human-first error mapping (`global-ui-reformat` Step 4 + `frontend-craft`).
 * Never exposes stack traces, storage internals, or raw exception strings to users.
 */

export interface AppError {
  title: string;
  message: string;
  retryable: boolean;
  errorId: string;
}

export function toAppError(err: unknown): AppError {
  const errorId = Math.random().toString(36).slice(2, 8).toUpperCase();
  // Developer diagnostics go to console with correlation ID, never into rendered JSX
  console.error(`[WINK-ERR ${errorId}]`, err);

  const raw = String((err as { message?: string })?.message || '');

  if (raw.startsWith('Validation:')) {
    return {
      title: 'Check your request details',
      message: raw.replace(/^Validation:\s*/, ''),
      retryable: false,
      errorId,
    };
  }

  if (/ECONNREFUSED|Simulated localStorage|NetworkError|fetch failed/i.test(raw)) {
    return {
      title: 'Storage connection interrupted',
      message:
        "We couldn't read or save the campus board right now (fault simulation may be active). Nothing you typed was lost — disable fault simulation or try again.",
      retryable: true,
      errorId,
    };
  }

  if (/Incompatible intent blocked/i.test(raw)) {
    return {
      title: 'Purposes do not match',
      message:
        'W.I.N.K only pairs requests when activity, purpose, role, and availability align.',
      retryable: false,
      errorId,
    };
  }

  return {
    title: "We couldn't complete that step",
    message:
      'Nothing was lost. Try again in a moment, or share the reference code below if this keeps happening.',
    retryable: true,
    errorId,
  };
}

export async function withTimeout<T>(promise: Promise<T>, timeoutMs = 8000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Request timed out')), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
