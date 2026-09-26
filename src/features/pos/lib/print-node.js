const pageStyles = {
  receipt: "@page { size: 80mm auto; margin: 0 } html, body { margin: 0; background: #fff }",
  "receipt-58": "@page { size: 58mm auto; margin: 0 } html, body { margin: 0; background: #fff }",
  sheet: "@page { size: A4; margin: 10mm } html, body { margin: 0; background: #fff }",
}

const PRINT_TIMEOUT = 2500

const whenLoaded = (doc) => {
  const links = [...doc.querySelectorAll('link[rel="stylesheet"]')]
  const ready = Promise.all(
    links.map((link) => new Promise((resolve) => {
      link.addEventListener("load", resolve, { once: true })
      link.addEventListener("error", resolve, { once: true })
    }))
  ).then(() => doc.fonts?.ready)
  return Promise.race([ready, new Promise((resolve) => setTimeout(resolve, PRINT_TIMEOUT))])
}

export const printNode = async (node, { paper = "sheet", copies = 1 } = {}) => {
  const frame = document.createElement("iframe")
  frame.setAttribute("aria-hidden", "true")
  Object.assign(frame.style, { position: "fixed", width: "0", height: "0", border: "0" })
  document.body.append(frame)

  const doc = frame.contentDocument
  doc.head.innerHTML =
    [...document.querySelectorAll('link[rel="stylesheet"], style')].map((element) => element.outerHTML).join("") +
    `<style>${pageStyles[paper] ?? pageStyles.sheet} .print-copy + .print-copy { break-before: page }</style>`
  doc.body.innerHTML = Array.from({ length: Math.max(1, copies) }, () => `<div class="print-copy">${node.outerHTML}</div>`).join("")

  await whenLoaded(doc)

  const cleanup = () => frame.remove()
  frame.contentWindow.addEventListener("afterprint", cleanup, { once: true })
  setTimeout(cleanup, 120000)
  frame.contentWindow.focus()
  frame.contentWindow.print()
}
