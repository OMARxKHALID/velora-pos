import { useEffect, useEffectEvent, useRef } from "react"

export const useBarcodeScanner = (onScan, { minLength = 6, maxGap = 35 } = {}) => {
  const buffer = useRef("")
  const last = useRef(0)
  const handleScan = useEffectEvent(onScan)

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.target.closest?.("input, textarea, select, [contenteditable]")) return
      if (document.querySelector("[role=dialog]")) return
      const now = performance.now()
      if (now - last.current > maxGap) buffer.current = ""
      last.current = now
      if (event.key === "Enter") {
        if (buffer.current.length >= minLength) {
          event.preventDefault()
          handleScan(buffer.current)
        }
        buffer.current = ""
        return
      }
      if (event.key.length === 1) buffer.current += event.key
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [minLength, maxGap])
}
