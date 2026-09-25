import { useMediaQuery } from "./use-media-query"

export const NAV_BREAKPOINT = 1280

export const useIsMobile = () => useMediaQuery(`(max-width: ${NAV_BREAKPOINT - 1}px)`)
