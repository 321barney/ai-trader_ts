import { Router, Request, Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

const router = Router();

// List API Keys
router.get('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const keys = await prisma.apiKey.findMany({
            where: { userId: req.user!.id },
            select: {
                id: true,
                name: true,
                keyPrefix: true,
                createdAt: true,
                lastUsedAt: true,
                permissions: true
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ success: true, data: keys });
    } catch (error) {
        console.error('List keys error:', error);
        res.status(500).json({ success: false, error: 'Failed to list API keys' });
    }
});

// Generate New API Key
router.post('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { name, permissions } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, error: 'Key name is required' });
        }

        // Generate full key: "pk_" + 32 random bytes (hex)
        const randomBytes = crypto.randomBytes(24).toString('hex');
        const apiKey = `pk_${randomBytes}`; // Total length: 3 + 48 = 51 chars
        const keyPrefix = apiKey.substring(0, 8);

        // Hash the key for storage
        const keyHash = await bcrypt.hash(apiKey, 10);

        const newKey = await prisma.apiKey.create({
            data: {
                userId: req.user!.id,
                name,
                keyPrefix,
                keyHash,
                permissions: permissions || []
            }
        });

        res.json({
            success: true,
            data: {
                id: newKey.id,
                name: newKey.name,
                apiKey: apiKey, // ONLY SHOWN ONCE
                message: "Save this key now. It will not be shown again."
            }
        });
    } catch (error) {
        console.error('Create key error:', error);
        res.status(500).json({ success: false, error: 'Failed to create API key' });
    }
});

// Revoke API Key
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        await prisma.apiKey.deleteMany({
            where: {
                id,
                userId: req.user!.id // Ensure ownership
            }
        });

        res.json({ success: true, message: 'API key revoked' });
    } catch (error) {
        console.error('Revoke key error:', error);
        res.status(500).json({ success: false, error: 'Failed to revoke API key' });
    }
});

export default router;
