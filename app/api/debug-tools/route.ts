/**
 * Debug API for testing tool calling
 */

import { NextRequest, NextResponse } from "next/server"
import { getSmartHeadlines } from "@/lib/services/smart-headlines"

export async function GET(req: NextRequest) {
    try {
        // Test with д143 dataset
        const datasetId = "cmkt0o6a90001a9o4r95daco0"

        console.log("[Debug] Testing getSmartHeadlines with datasetId:", datasetId)

        const result = await getSmartHeadlines(datasetId, { limit: 5 })

        console.log("[Debug] Result:", result)

        return NextResponse.json({
            success: true,
            result,
            message: "Tool function works correctly"
        })
    } catch (error: any) {
        console.error("[Debug] Error:", error)
        return NextResponse.json({
            success: false,
            error: error.message,
            stack: error.stack
        }, { status: 500 })
    }
}
