const escapeCell = (value) => {
  const text = String(value ?? "")
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export const toCsv = (rows) => rows.map((row) => row.map(escapeCell).join(",")).join("\r\n")

export const parseCsv = (input) => {
  const text = input.replace(/^﻿/, "")
  const rows = []
  let row = []
  let field = ""
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"'
        index += 1
      } else if (char === '"') quoted = false
      else field += char
    } else if (char === '"') quoted = true
    else if (char === ",") {
      row.push(field)
      field = ""
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") index += 1
      row.push(field)
      rows.push(row)
      row = []
      field = ""
    } else field += char
  }

  if (field || row.length) rows.push([...row, field])
  return rows.filter((cells) => cells.some((cell) => cell.trim()))
}
