export const beep = (ok = true) => {
  const AudioContext = window.AudioContext ?? window.webkitAudioContext
  if (!AudioContext) return
  const audio = new AudioContext()
  const oscillator = audio.createOscillator()
  const gain = audio.createGain()
  oscillator.type = ok ? "sine" : "square"
  oscillator.frequency.value = ok ? 1320 : 220
  gain.gain.value = 0.06
  oscillator.connect(gain).connect(audio.destination)
  oscillator.onended = () => audio.close()
  oscillator.start()
  oscillator.stop(audio.currentTime + (ok ? 0.08 : 0.25))
}
