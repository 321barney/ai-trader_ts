import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    // Users to seed
    const users = [
        {
            email: 'youssef.ghazii@gmail.com',
            username: 'YoussefGhazii',
            passwordHash: '$2a$10$k35KJIXQcZKNmjzg.HcjtebsW/oxnVP6fqg5NifYpEuaVklWdtJDG'
        },
        {
            email: 'barnros89@gmail.com',
            username: 'BarnRos89',
            passwordHash: '$2a$10$k35KJIXQcZKNmjzg.HcjtebsW/oxnVP6fqg5NifYpEuaVklWdtJDG'
        }
    ];

    console.log(`🌱 Seeding ${users.length} users...`);

    for (const u of users) {
        // Upsert user (create if new, update if exists)
        const user = await prisma.user.upsert({
            where: { email: u.email },
            update: {
                password: u.passwordHash,
            },
            create: {
                email: u.email,
                password: u.passwordHash,
                username: u.username,
                role: 'TRADER',
                tradingCapitalPercent: 20,
                preferredExchange: 'binance',
            },
        });

        console.log(`✅ Seeded: ${user.email} (ID: ${user.id})`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
