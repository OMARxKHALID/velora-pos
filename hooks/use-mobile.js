import { useMediaQuery } from "./use-media-query"

// The app shell switches from an off-canvas menu to a docked sidebar at this width.
// Below it (phones AND tablets, portrait and landscape) pages get the full width.
export const NAV_BREAKPOINT = 1280

export const useIsMobile = () => useMediaQuery(`(max-width: ${NAV_BREAKPOINT - 1}px)`)
