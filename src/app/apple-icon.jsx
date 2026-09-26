import { ImageResponse } from "next/og"
import { VeloraMark } from "./icon"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

const AppleIcon = () => new ImageResponse(<VeloraMark size={180} />, size)

export default AppleIcon
