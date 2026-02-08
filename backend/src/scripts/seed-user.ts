import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const email = 'youssef.ghazii@gmail.com';
    const password = '321@_Abc';
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log(`🌱 Seeding user: ${email}...`);

    // Upsert user (create if new, update if exists)
    const user = await prisma.user.upsert({
        where: { email },
        update: {
            password: hashedPassword,
            subscriptionTier: 'PRO',
            subscriptionStatus: 'ACTIVE',
            subscriptionExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        },
        create: {
            email,
            password: hashedPassword,
            name: 'Youssef Ghazii',
            role: 'USER',
            subscriptionTier: 'PRO',
            subscriptionStatus: 'ACTIVE',
            subscriptionExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
            tradingCapital: 10000,
            tradingCapitalPercent: 20,
            riskLevel: 'AGGRESSIVE',
            preferredExchange: 'binance',
        },
    });

    console.log(`✅ User seeded successfully!`);
    console.log(`🆔 ID: ${user.id}`);
    console.log(`📧 Email: ${user.email}`);
    console.log(`💎 Tier: ${user.subscriptionTier}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
