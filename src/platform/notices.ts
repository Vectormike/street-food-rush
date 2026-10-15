const NOTICES: Record<string, string> = {
  not_framed: 'Open Street Food Rush inside Lagos Life to use your player profile and leaderboard.',
  signed_out: 'Sign in to Lagos Life to submit a score. Practice mode is still available.',
  timeout: 'Lagos Life took too long to respond. Practice mode is still available.',
  rate_limited: 'Lagos Life is rate limiting requests. Try the leaderboard again shortly.',
  too_soon: 'A score can be submitted once every 20 seconds.',
  sdk_unavailable: 'The Lagos Life game SDK could not load. Practice mode is still available.',
  cancelled: 'The purchase was cancelled.',
  not_for_sale: 'That item is not available yet.',
  payment_failed: 'The payment did not go through.',
  owned: 'You already own the Ankara counter.',
};

export function noticeFor(code: string): string {
  return NOTICES[code] ?? 'Lagos Life could not complete that request. You can keep playing.';
}

export function errorCode(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = error.code;
    if (typeof code === 'string' && code.trim()) return code;
  }
  return 'error';
}
