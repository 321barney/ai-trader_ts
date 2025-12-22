import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Querying recent AgentDecisions...');
    const decisions = await prisma.agentDecision.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
    });

    console.log(`Found ${decisions.length} decisions.`);

    for (const d of decisions) {
        console.log('------------------------------------------------');
        console.log(`ID: ${d.id}`);
        console.log(`Type: ${d.agentType}`);
        console.log(`CreatedAt: ${d.createdAt}`);
        console.log(`ThoughtSteps Type: ${typeof d.thoughtSteps}`);
        console.log(`ThoughtSteps Value:`, JSON.stringify(d.thoughtSteps, null, 2));
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
