import Redis from "ioredis"

const redis = new Redis(process.env.REDIS_URL)

const WHISK_SESSION_KEY = "whisk:session"

export async function getWhiskSession() {
    const raw = await redis.get(WHISK_SESSION_KEY)

    if (!raw) {
        return { expired: true, reason: "session not found" }
    }

    let data
    try {
        data = JSON.parse(raw)
    } catch {
        return { expired: true, reason: "invalid session data" }
    }

    if (typeof data !== "object" || data === null) {
        return { expired: true, reason: "invalid session structure" }
    }

    const accessToken = data.access_token
    const expires = data.expires

    if (!accessToken || !expires) {
        return { expired: true, reason: "missing access token or expiry" }
    }

    const expiresAt = new Date(expires)

    if (Number.isNaN(expiresAt.getTime())) {
        return { expired: true, reason: "invalid expiry format" }
    }

    if (expiresAt <= new Date()) {
        return { expired: true, reason: "token expired" }
    }

    return data
}

export async function updateWhiskSession(token) {
    const url = "https://labs.google/fx/api/auth/session"

    const response = await fetch(url, {
        method: "GET",
        headers: {
            Cookie: `__Secure-next-auth.session-token=${token}`
        }
    })

    if (!response.ok) {
        throw new Error(`Failed to update session: ${response.status} ${await response.text()}`)
    }

    const data = await response.json()

    if (data.error) {
        throw new Error(`Failed to update session: ${data.error}`)
    }

    await redis.set(WHISK_SESSION_KEY, JSON.stringify(data))
    return true
}

export async function getAccessToken(token) {
    let session = await getWhiskSession()

    if (session.expired) {
        await updateWhiskSession(token)
        session = await getWhiskSession()
    }

    const accessToken = session.access_token

    if (!accessToken) {
        throw new Error("Access token not found in session data.")
    }

    return accessToken
}

export async function generateImage({
    model = "IMAGEN_3_5",
    prompt = "",
    aspectRatio = "IMAGE_ASPECT_RATIO_SQUARE",
    token = ""
} = {}) {
    const url = "https://aisandbox-pa.googleapis.com/v1/whisk:generateImage"
    const accessToken = await getAccessToken(token)

    const payload = {
        imageModelSettings: {
            imageModel: model,
            aspectRatio
        },
        prompt
    }

    const response = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    })

    if (!response.ok) {
        throw new Error(`Failed to generate image: ${response.status} ${await response.text()}`)
    }

    return response.json()
}