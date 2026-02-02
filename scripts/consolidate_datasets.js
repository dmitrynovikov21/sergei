
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function consolidateDatasets() {
    console.log('Starting DUPLICATE SOURCE consolidation (with collision handling)...');

    try {
        const allSources = await prisma.trackingSource.findMany({
            orderBy: { createdAt: 'desc' }
        });

        const sourcesByUsername = {};
        for (const source of allSources) {
            if (!source.username) continue;
            if (!sourcesByUsername[source.username]) {
                sourcesByUsername[source.username] = [];
            }
            sourcesByUsername[source.username].push(source);
        }

        let migratedCount = 0;
        let deletedCount = 0;
        let deletedSources = 0;

        for (const [username, sources] of Object.entries(sourcesByUsername)) {
            if (sources.length <= 1) continue;

            console.log(`\nFound ${sources.length} duplicates for @${username}`);
            const masterSource = sources[0];
            const duplicates = sources.slice(1);

            console.log(`Master Source: ${masterSource.id} (Dataset: ${masterSource.datasetId})`);

            for (const dup of duplicates) {
                console.log(`  Processing duplicate: ${dup.id} (Dataset: ${dup.datasetId})`);

                // Get items in chunks to avoid memory issues
                const items = await prisma.contentItem.findMany({
                    where: { datasetId: dup.datasetId }
                });

                console.log(`    Found ${items.length} items to process.`);

                for (const item of items) {
                    // Check if exists in master
                    const existing = await prisma.contentItem.findUnique({
                        where: {
                            instagramId_datasetId: {
                                instagramId: item.instagramId,
                                datasetId: masterSource.datasetId
                            }
                        }
                    });

                    if (existing) {
                        // Collision: Item already exists in master. Delete duplicate.
                        // Ideally we check if duplicate has better data, but let's assume master (latest run) is best or equal.
                        await prisma.contentItem.delete({
                            where: { id: item.id }
                        });
                        deletedCount++;
                    } else {
                        // No collision: Move to master
                        await prisma.contentItem.update({
                            where: { id: item.id },
                            data: { datasetId: masterSource.datasetId }
                        });
                        migratedCount++;
                    }
                }

                // Delete ParseHistory
                await prisma.parseHistory.deleteMany({
                    where: { sourceId: dup.id }
                });

                // Delete Source
                await prisma.trackingSource.delete({
                    where: { id: dup.id }
                });
                deletedSources++;

                // Delete Dataset (if empty)
                try {
                    await prisma.dataset.delete({
                        where: { id: dup.datasetId }
                    });
                } catch (e) {
                    // Ignore
                }
            }
        }

        console.log(`\nConsolidation complete!`);
        console.log(`Migrated: ${migratedCount}`);
        console.log(`Deleted Duplicates (Collisions): ${deletedCount}`);
        console.log(`Deleted Duplicate Sources: ${deletedSources}`);

    } catch (error) {
        console.error('Error during consolidation:', error);
    } finally {
        await prisma.$disconnect();
    }
}

consolidateDatasets();
