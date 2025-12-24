import 'dotenv/config'; // Load env vars
import { prisma } from '../utils/prisma.js';
import { tradingService } from '../services/trading.service.js';
import { schedulerService } from '../services/scheduler.service.js';

async function main() {
    console.log('Environment loaded.');
    console.log('Database URL present:', !!process.env.DATABASE_URL);
    console.log('Triggering manual analysis...');

    const user = await prisma.user.findFirst({
        where: { tradingEnabled: true }
    });

    if (!user) {
        console.error('No user with trading enabled found.');
        return;
    }

    console.log(`Found user: ${user.id} (${user.email})`);
    const symbol = 'BTCUSDT';

    // Fetch data manually using scheduler service helper
    const multiTF = await schedulerService.fetchMultiTFData(
        symbol,
        ['1h'], // Default timeframe for manual trigger
        user.asterApiKey || undefined,
        user.asterApiSecret || undefined
    );

    console.log('Market data fetched. Running execution pipeline...');

    // Force analysis and execution
    await tradingService.executeScheduledAnalysis(user.id, symbol, multiTF);

    console.log('Done.');
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
