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
            subscriptionPlan: 'PRO', // Corrected field name
            subscriptionStatus: 'ACTIVE',
            subscriptionEndsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Corrected field name
        },
        create: {
            email,
            password: hashedPassword,
            username: 'YoussefGhazii', // Corrected: schema has username, not name
            role: 'TRADER',
            subscriptionPlan: 'PRO',
            subscriptionStatus: 'ACTIVE',
            subscriptionEndsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            // tradingCapital: 10000, // Removed
            tradingCapitalPercent: 20,
            riskLevel: 'AGGRESSIVE', // Keeping as user requested, might be useful if DB updated later
            preferredExchange: 'binance',
        },
    });

    console.log(`✅ User seeded successfully!`);
    console.log(`🆔 ID: ${user.id}`);
    console.log(`📧 Email: ${user.email}`);
    console.log(`💎 Plan: ${user.subscriptionPlan}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
