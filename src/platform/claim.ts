import type { Platform } from './types';

export interface ClaimResult {
  delivered: boolean;
  notice: string;
}

export async function claimProduct(
  platform: Platform,
  serverUrl: string,
  productId: string,
): Promise<ClaimResult> {
  const result = await platform.purchase(productId);
  if (!result?.purchaseId) {
    return { delivered: false, notice: result?.notice ?? 'The purchase could not start.' };
  }
  const session = await platform.session();
  if (!session) {
    return { delivered: false, notice: 'Lagos Life did not provide a session for delivery.' };
  }
  try {
    const response = await fetch(`${serverUrl}/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session, purchaseId: result.purchaseId }),
    });
    return response.ok
      ? { delivered: true, notice: 'Ankara counter unlocked.' }
      : { delivered: false, notice: 'The purchase could not be delivered.' };
  } catch {
    return { delivered: false, notice: 'The purchase could not be delivered.' };
  }
}
