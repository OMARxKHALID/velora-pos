export const printNode = (node) => {
  const frame = document.createElement("iframe")
  Object.assign(frame.style, { position: "fixed", width: "0", height: "0", border: "0" })
  document.body.append(frame)

  const doc = frame.contentDocument
  doc.head.innerHTML = [...document.querySelectorAll('link[rel="stylesheet"], style')].map((el) => el.outerHTML).join("")
  doc.body.innerHTML = node.outerHTML

  setTimeout(() => {
    frame.contentWindow.focus()
    frame.contentWindow.print()
    setTimeout(() => frame.remove(), 1000)
  }, 300)
}
