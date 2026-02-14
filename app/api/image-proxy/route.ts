/**
 * Image Proxy API - Bypasses Instagram CDN CORS restrictions
 * 
 * Usage: /api/image-proxy?url=<encoded_instagram_url>
 */
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    const url = request.nextUrl.searchParams.get('url')

    if (!url) {
        return NextResponse.json({ error: 'URL parameter required' }, { status: 400 })
    }

    try {
        // Validate URL is from Instagram CDN
        const parsedUrl = new URL(url)
        const allowedHosts = [
            'scontent.cdninstagram.com',
            'instagram.com',
            'cdninstagram.com',
            'fbcdn.net'
        ]

        const isAllowed = allowedHosts.some(host =>
            parsedUrl.hostname.includes(host)
        )

        if (!isAllowed) {
            return NextResponse.json({ error: 'Only Instagram CDN URLs allowed' }, { status: 403 })
        }

        // Fetch image from Instagram CDN
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'image/*',
            },
        })

        if (!response.ok) {
            return NextResponse.json({ error: 'Failed to fetch image' }, { status: response.status })
        }

        const contentType = response.headers.get('content-type') || 'image/jpeg'
        const buffer = await response.arrayBuffer()

        // Return proxied image with proper CORS headers
        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=3600',
                'Access-Control-Allow-Origin': '*',
            }
        })

    } catch (error) {
        console.error('[Image Proxy] Error:', error)
        return NextResponse.json({ error: 'Proxy error' }, { status: 500 })
    }
}
