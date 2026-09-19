import crypto from 'crypto';

/**
 * Validates Meta webhook signature from X-Hub-Signature-256 header.
 * Header format: sha256=<signature_hex>
 */
export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret?: string
): boolean {
  const secret = appSecret || process.env.META_APP_SECRET;
  
  // If no secret configured or header missing, cannot verify
  if (!secret || !signatureHeader) {
    return false;
  }
  
  if (!signatureHeader.startsWith('sha256=')) {
    return false;
  }
  
  const expectedHash = signatureHeader.slice(7);
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(rawBody);
  const actualHash = hmac.digest('hex');
  
  try {
    const expectedBuffer = Buffer.from(expectedHash, 'hex');
    const actualBuffer = Buffer.from(actualHash, 'hex');
    
    if (expectedBuffer.length !== actualBuffer.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
  } catch {
    return false;
  }
}

/**
 * Validates Meta Webhook Verification handshake (GET request).
 */
export function verifyMetaHandshake(
  mode: string | null,
  token: string | null,
  challenge: string | null,
  expectedVerifyToken?: string
): string | null {
  const verifyToken =
    expectedVerifyToken ||
    process.env.INSTAGRAM_VERIFY_TOKEN ||
    process.env.META_VERIFY_TOKEN;
  
  if (mode === 'subscribe' && token === verifyToken && challenge) {
    return challenge;
  }
  
  return null;
}
