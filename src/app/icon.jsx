import { ImageResponse } from "next/og"

const SIZES = [192, 512]

export const generateImageMetadata = () => SIZES.map((size) => ({ id: String(size), contentType: "image/png", size: { width: size, height: size } }))

export const VeloraMark = ({ size }) => (
  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0c0b09", color: "#d4af37", fontSize: size * 0.62, fontWeight: 700 }}>V</div>
)

const Icon = async ({ id }) => {
  const size = Number(await id)
  return new ImageResponse(<VeloraMark size={size} />, { width: size, height: size })
}

export default Icon
