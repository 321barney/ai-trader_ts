
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Checking User Statuses...');
    const users = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            username: true,
            tradingEnabled: true,
            tradingMode: true,
            // Check if they have an active model too
            tradingModels: {
                where: { isActive: true },
                select: { id: true, timeframes: true }
            }
        }
    });

    if (users.length === 0) {
        console.log('No users found in database!');
    } else {
        console.table(users.map(u => ({
            email: u.email,
            enabled: u.tradingEnabled,
            mode: u.tradingMode,
            activeModel: u.tradingModels.length > 0 ? 'YES' : 'NO',
            timeframes: u.tradingModels[0]?.timeframes || 'N/A'
        })));
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
