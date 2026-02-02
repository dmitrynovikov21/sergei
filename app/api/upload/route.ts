
import { NextRequest, NextResponse } from "next/server"
import { join } from "path"
import { writeFile, mkdir } from "fs/promises"
import { v4 as uuidv4 } from "uuid"

export const runtime = "nodejs"



export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData()
        const file = formData.get("file") as File | null

        if (!file) {
            return NextResponse.json(
                { error: "No file provided" },
                { status: 400 }
            )
        }

        // Accept all file types
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Ensure uploads directory exists
        const uploadDir = join(process.cwd(), "public", "uploads")
        try {
            await mkdir(uploadDir, { recursive: true })
        } catch (e) {
            // Ignore if exists
        }

        // Generate unique filename
        // Sanitize original filename
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
        const fileName = `${uuidv4()}-${safeName}`
        const filePath = join(uploadDir, fileName)

        // Write file
        await writeFile(filePath, buffer)

        // For images, return base64 data URL (required for Claude API)
        // For other files, return the file path
        let url: string
        if (file.type.startsWith('image/')) {
            // Convert to base64 for Claude API
            const base64 = buffer.toString('base64')
            url = `data:${file.type};base64,${base64}`
        } else {
            url = `/uploads/${fileName}`
        }

        return NextResponse.json({
            url,
            name: file.name,
            type: file.type
        })

    } catch (error) {
        console.error("Upload error:", error)
        return NextResponse.json(
            { error: "Upload failed" },
            { status: 500 }
        )
    }
}
