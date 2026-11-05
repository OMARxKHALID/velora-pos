export const stripSpaces = (text) => text.replace(/\s/g, "")

export const isBarcodeLike = (text) => /^[A-Za-z0-9-]{6,}$/.test(text) && /\d/.test(text)
