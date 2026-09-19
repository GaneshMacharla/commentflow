import { describe, it, expect } from 'vitest';
import { encryptToken, decryptToken } from '../lib/security/encryption';

describe('Token Encryption (AES-256-GCM)', () => {
  it('should encrypt and decrypt tokens correctly without data loss', () => {
    const originalToken = 'EAABwzLixnjYBO1mock_long_lived_instagram_token_xyz987';
    const encrypted = encryptToken(originalToken);

    expect(encrypted).not.toBe(originalToken);
    expect(encrypted.split(':').length).toBe(3); // iv:authTag:content

    const decrypted = decryptToken(encrypted);
    expect(decrypted).toBe(originalToken);
  });

  it('should fail cleanly on tampered or corrupted encrypted strings', () => {
    expect(() => decryptToken('invalid_token_string')).toThrow();
  });
});
