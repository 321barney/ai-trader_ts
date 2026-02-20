
import { prisma } from '../utils/prisma.js';
import { encrypt, decrypt } from '../utils/encryption.js';

export class VaultService {
    /**
     * Save a secret to the vault
     */
    async saveSecret(userId: string, key: string, value: string): Promise<void> {
        if (!value) return;

        const { iv, content, tag } = encrypt(value);

        await prisma.vaultSecret.upsert({
            where: {
                userId_key: {
                    userId,
                    key
                }
            },
            update: {
                encryptedValue: content,
                iv,
                authTag: tag
            },
            create: {
                userId,
                key,
                encryptedValue: content,
                iv,
                authTag: tag
            }
        });
    }

    /**
     * Get a decrypted secret from the vault
     */
    async getSecret(userId: string, key: string): Promise<string | null> {
        const secret = await prisma.vaultSecret.findUnique({
            where: {
                userId_key: {
                    userId,
                    key
                }
            }
        });

        if (!secret) return null;

        try {
            return decrypt({
                iv: secret.iv,
                content: secret.encryptedValue,
                tag: secret.authTag
            });
        } catch (error) {
            console.error(`Failed to decrypt secret ${key} for user ${userId}`, error);
            return null;
        }
    }

    /**
     * Check if a secret exists (without decrypting)
     */
    async hasSecret(userId: string, key: string): Promise<boolean> {
        const count = await prisma.vaultSecret.count({
            where: {
                userId,
                key
            }
        });
        return count > 0;
    }

    /**
     * Delete a secret
     */
    async deleteSecret(userId: string, key: string): Promise<void> {
        await prisma.vaultSecret.delete({
            where: {
                userId_key: {
                    userId,
                    key
                }
            }
        }).catch(() => {
            // Ignore if not found
        });
    }
}

export const vaultService = new VaultService();
