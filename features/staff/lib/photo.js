export const photoFromFile = (file, size = 160) =>
  new Promise((resolve, reject) => {
    if (!file?.type.startsWith("image/")) return reject(new Error("Choose an image file."))
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      const side = Math.min(image.width, image.height)
      const canvas = document.createElement("canvas")
      canvas.width = size
      canvas.height = size
      canvas.getContext("2d").drawImage(image, (image.width - side) / 2, (image.height - side) / 2, side, side, 0, 0, size, size)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL("image/jpeg", 0.85))
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("That image could not be read."))
    }
    image.src = url
  })
