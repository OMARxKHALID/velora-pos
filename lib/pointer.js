// True on devices with a mouse or trackpad. On touch screens we skip autoFocus so the on-screen keyboard
// does not open by itself and cover the dialog or card the person is looking at.
export const hasFinePointer = () => typeof window !== "undefined" && Boolean(window.matchMedia?.("(pointer: fine)").matches)
