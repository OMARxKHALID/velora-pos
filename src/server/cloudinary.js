import "server-only"
import { createHash } from "node:crypto"
import { cloudinaryEnv } from "@/config/env"

const DELIVERY = "c_fill,g_face,w_160,h_160/f_auto,q_auto"

export const signParams = (params, apiSecret) =>
  createHash("sha1")
    .update(
      Object.keys(params)
        .toSorted()
        .map((key) => `${key}=${params[key]}`)
        .join("&") + apiSecret
    )
    .digest("hex")

const signDelivery = (toSign, apiSecret) =>
  createHash("sha1")
    .update(toSign + apiSecret)
    .digest("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .slice(0, 8)

export const createCloudinary = ({ cloudName, apiKey, apiSecret, fetcher = globalThis.fetch, now = () => Date.now() }) => {
  const call = async (action, params, file = null) => {
    const signed = { ...params, timestamp: Math.floor(now() / 1000) }
    const body = new FormData()
    for (const [key, value] of Object.entries(signed)) body.set(key, String(value))
    body.set("api_key", apiKey)
    body.set("signature", signParams(signed, apiSecret))
    if (file) body.set("file", file)
    const response = await fetcher(`https://api.cloudinary.com/v1_1/${cloudName}/image/${action}`, { method: "POST", body, signal: AbortSignal.timeout(20_000) })
    const result = await response.json().catch(() => null)
    if (!response.ok || result?.error) throw new Error(result?.error?.message ?? `Cloudinary ${action} failed (${response.status})`)
    return result
  }

  return {
    upload: async (publicId, file) => {
      const { public_id, version } = await call("upload", { public_id: publicId, type: "authenticated", overwrite: "true", invalidate: "true" }, file)
      return { photoId: public_id, photoVersion: version }
    },
    remove: (publicId) => call("destroy", { public_id: publicId, type: "authenticated", invalidate: "true" }),
    url: (publicId, version) => {
      const signature = signDelivery(`${DELIVERY}/${publicId}`, apiSecret)
      return `https://res.cloudinary.com/${cloudName}/image/authenticated/s--${signature}--/${DELIVERY}/v${version}/${publicId}`
    },
  }
}

let shared

export const cloudinary = () => {
  const env = cloudinaryEnv()
  if (!env) return null
  shared ??= createCloudinary(env)
  return shared
}
