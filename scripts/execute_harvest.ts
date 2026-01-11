
import { harvestAllSources } from "../lib/parser/harvester"

async function main() {
    console.log("============ STARTING HARVEST ============")
    try {
        const result = await harvestAllSources()
        console.log("Harvest Result:", JSON.stringify(result, null, 2))
    } catch (error) {
        console.error("Harvest Failed:", error)
    }
    console.log("============ FINISHED HARVEST ============")
}

main()
