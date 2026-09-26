export const hasFinePointer = () => typeof window !== "undefined" && Boolean(window.matchMedia?.("(pointer: fine)").matches)
