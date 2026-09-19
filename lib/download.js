export const downloadFile = (name, content, type = "text/csv;charset=utf-8") => {
  const url = URL.createObjectURL(new Blob(["﻿", content], { type }))
  const link = Object.assign(document.createElement("a"), { href: url, download: name })
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
