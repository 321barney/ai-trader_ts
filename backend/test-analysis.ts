
import { tradingService } from './src/services/trading.service';
import { prisma } from './src/utils/prisma';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
    console.log("Starting Manual Analysis Test...");
    try {
        const user = await prisma.user.findFirst();
        if (!user) {
            console.error("No user found");
            return;
        }
        console.log(`Running analysis for user ${user.username} (${user.id}) on BTC-USDT`);
        const result = await tradingService.runAnalysis(user.id, 'BTC-USDT');
        console.log("Analysis Result:", JSON.stringify(result, null, 2));

        const decisions = await prisma.agentDecision.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
            take: 1
        });
        console.log("Latest Decision:", JSON.stringify(decisions[0], null, 2));

    } catch (error) {
        console.error("Test Failed:", error);
    }
}

main();
