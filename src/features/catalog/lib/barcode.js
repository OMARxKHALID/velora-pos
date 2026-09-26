const ean13CheckDigit = (twelveDigits) => {
  const sum = [...twelveDigits].reduce((total, digit, index) => total + Number(digit) * (index % 2 ? 3 : 1), 0)
  return (10 - (sum % 10)) % 10
}

export const internalEan13 = (serial) => {
  const base = `20${String(serial).padStart(10, "0")}`
  return `${base}${ean13CheckDigit(base)}`
}

export const isValidEan13 = (code) =>
  /^\d{13}$/.test(code) && ean13CheckDigit(code.slice(0, 12)) === Number(code[12])
