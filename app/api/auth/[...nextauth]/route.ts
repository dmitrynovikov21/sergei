import { GET as AuthGET, POST as AuthPOST } from "@/auth"
import { NextRequest } from "next/server"

export async function GET(req: NextRequest) {
    try {
        return await AuthGET(req)
    } catch (error) {
        console.error("[Auth Route] GET error:", error)
        throw error
    }
}

export async function POST(req: NextRequest) {
    try {
        return await AuthPOST(req)
    } catch (error) {
        console.error("[Auth Route] POST error:", error)
        throw error
    }
}