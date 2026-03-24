import { NextResponse } from 'next/server';

const CROPINTEL_URL = 'https://corn-intel-api-production.up.railway.app/api';

/**
 * Server-side proxy for CropIntel Railway API.
 * Bypasses CORS restrictions since this runs on the server, not the browser.
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '200';
    const crop = searchParams.get('crop') || 'Yellow Corn';

    try {
        const res = await fetch(
            `${CROPINTEL_URL}/buyers?limit=${limit}&crop=${encodeURIComponent(crop)}`,
            {
                headers: { 'Accept': 'application/json' },
                next: { revalidate: 300 }, // Cache for 5 minutes
            },
        );

        if (!res.ok) {
            return NextResponse.json(
                { error: `CropIntel API returned ${res.status}` },
                { status: res.status },
            );
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (err: any) {
        return NextResponse.json(
            { error: `CropIntel proxy error: ${err.message}` },
            { status: 502 },
        );
    }
}
