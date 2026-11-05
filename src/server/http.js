import "server-only"
export const noStore = { "Cache-Control": "no-store" }

export const readQuery = (request, schema) => schema.safeParse(Object.fromEntries(new URL(request.url).searchParams))

export const denied = (status, error) => Response.json({ error }, { status, headers: noStore })
