export const noStore = { "Cache-Control": "no-store" }

export const denied = (status, error) => Response.json({ error }, { status, headers: noStore })
