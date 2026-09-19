import { colorSwatches } from "./catalog"

const fashionColors = {
  nude: "#e3bc9a",
  camel: "#c19a6b",
  cognac: "#9a463d",
  burgundy: "#800020",
  wine: "#722f37",
  maroon: "#6d1f2c",
  mustard: "#e1ad01",
  rust: "#b7410e",
  charcoal: "#36454f",
  cream: "#fffdd0",
  "off white": "#f8f8f0",
  ivory: "#fffff0",
  champagne: "#f7e7ce",
  "rose gold": "#b76e79",
  blush: "#de5d83",
  peach: "#ffcba4",
  mint: "#98ff98",
  mauve: "#e0b0ff",
  lilac: "#c8a2c8",
  taupe: "#8b7d6b",
  khaki: "#c3b091",
  "navy blue": "#1f2a44",
  "sky blue": "#87ceeb",
  "bottle green": "#006a4e",
  "army green": "#4b5320",
  denim: "#1560bd",
  silver: "#c0c0c0",
  copper: "#b87333",
  bronze: "#cd7f32",
  "leopard": "#c68e3f",
}

const known = Object.fromEntries(Object.entries(colorSwatches).map(([name, value]) => [name.toLowerCase(), value]))

const cssColor = (name) => {
  if (typeof CSS === "undefined" || !CSS.supports) return null
  const compact = name.replace(/\s+/g, "").toLowerCase()
  return CSS.supports("color", compact) ? compact : null
}

export const colorValue = (name = "") => {
  const key = name.trim().toLowerCase()
  if (!key) return null
  return known[key] ?? fashionColors[key] ?? cssColor(key)
}

export const swatchStyle = (name = "") => {
  const parts = name.split("/").map(colorValue)
  if (parts.length === 2 && parts.every(Boolean)) return { background: `linear-gradient(135deg, ${parts[0]} 50%, ${parts[1]} 50%)` }
  const value = colorValue(name) ?? parts.find(Boolean)
  return value ? { backgroundColor: value } : null
}

export const mostUsedColors = (products, limit = 10) => {
  const counts = {}
  for (const product of products) {
    for (const color of product.colors) {
      for (const part of color.split("/")) counts[part] = (counts[part] ?? 0) + 1
    }
  }
  return Object.entries(counts)
    .toSorted((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([color, count]) => ({ color, count }))
}

const titleCase = (text) => text.replace(/\b\w/g, (letter) => letter.toUpperCase())

export const colorNames = [...new Set([...Object.keys(colorSwatches).filter((name) => !name.includes("/")), ...Object.keys(fashionColors).map(titleCase)])].toSorted()

export const suggestColors = (draft, exclude = [], limit = 6) => {
  const query = draft.trim().toLowerCase()
  if (!query) return []
  return colorNames.filter((name) => name.toLowerCase().includes(query) && !exclude.includes(name)).slice(0, limit)
}
