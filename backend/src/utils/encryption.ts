import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // For AES, this is always 16
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

// Get key from env or throw error
// In production, this must be a 32-byte hex string or high-entropy secret
const getMasterKey = (): Buffer => {
    const secret = process.env.ENCRYPTION_KEY;
    if (!secret) {
        throw new Error('ENCRYPTION_KEY is not defined in .env');
    }
    // If the key is already hex and 32 bytes (64 chars), use it directly
    if (secret.length === 64 && /^[0-9a-fA-F]+$/.test(secret)) {
        return Buffer.from(secret, 'hex');
    }
    // Otherwise, derive a key using scrypt (mostly for dev convenience, but better to use a fixed hex key)
    // For this implementation, let's enforce a proper key or fallback to a derivation for dev
    return crypto.scryptSync(secret, 'salt', KEY_LENGTH);
};

export interface EncryptedData {
    iv: string;
    content: string;
    tag: string;
}

export const encrypt = (text: string): EncryptedData => {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = getMasterKey();

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    return {
        iv: iv.toString('hex'),
        content: encrypted,
        tag: tag.toString('hex')
    };
};

export const decrypt = (data: EncryptedData): string => {
    const iv = Buffer.from(data.iv, 'hex');
    const key = getMasterKey();
    const tag = Buffer.from(data.tag, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(data.content, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
};
