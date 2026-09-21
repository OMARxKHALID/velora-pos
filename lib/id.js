const hex = (byte) => byte.toString(16).padStart(2, "0")

// crypto.randomUUID() only exists in secure contexts (https / localhost).
// Fall back to getRandomValues so the demo also works over plain http on a LAN.
export const newId = () => {
  const source = globalThis.crypto
  if (typeof source?.randomUUID === "function") return source.randomUUID()

  const bytes = new Uint8Array(16)
  if (source?.getRandomValues) source.getRandomValues(bytes)
  else for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256)

  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const h = [...bytes].map(hex)
  return `${h.slice(0, 4).join("")}-${h.slice(4, 6).join("")}-${h.slice(6, 8).join("")}-${h.slice(8, 10).join("")}-${h.slice(10).join("")}`
}
