import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard for AES-GCM
const AUTH_TAG_LENGTH = 16;

/**
 * Derives a 32-byte Buffer key from the environment variable TOKEN_ENCRYPTION_KEY.
 * Falls back to a consistent fallback key for local dev if unset.
 */
function getEncryptionKey(): Buffer {
  const envKey = process.env.TOKEN_ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  
  if (envKey.length === 64 && /^[0-9a-fA-F]+$/.test(envKey)) {
    return Buffer.from(envKey, 'hex');
  }
  
  // If not a 64-char hex string, hash it to derive exactly 32 bytes
  return crypto.createHash('sha256').update(envKey).digest();
}

/**
 * Encrypts sensitive tokens (such as Instagram User Access Tokens).
 * Output format: iv_hex:authTag_hex:encrypted_hex
 */
export function encryptToken(plainToken: string): string {
  if (!plainToken) return '';
  
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plainToken, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts encrypted tokens.
 */
export function decryptToken(encryptedString: string): string {
  if (!encryptedString) return '';
  
  const parts = encryptedString.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted token format. Expected iv:authTag:content.');
  }
  
  const [ivHex, authTagHex, encryptedHex] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
