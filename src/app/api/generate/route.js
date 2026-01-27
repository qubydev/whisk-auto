import { generateImage } from "@/lib/whisk"

export async function POST(request) {
    let body
    try {
        body = await request.json()
    } catch {
        return new Response(
            JSON.stringify({ error: "Invalid JSON body" }),
            { status: 400 }
        )
    }

    const prompt = body.prompt
    const token = body.token || ""
    const aspectRatio = body.aspect_ratio || "IMAGE_ASPECT_RATIO_LANDSCAPE"

    if (!prompt) {
        return new Response(
            JSON.stringify({ error: "Prompt is required for image generation" }),
            { status: 400 }
        )
    }

    if (!token) {
        return new Response(
            JSON.stringify({ error: "Authentication token is required for image generation" }),
            { status: 400 }
        )
    }

    try {
        const result = await generateImage({
            prompt,
            token,
            aspectRatio
        })

        return new Response(JSON.stringify(result), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        })
    } catch (err) {
        return new Response(
            JSON.stringify({ error: `ERROR: ${err.message}` }),
            { status: 500 }
        )
    }
}
