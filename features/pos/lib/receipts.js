export const OFFLINE_BLOCK = 30
export const TOP_UP_BELOW = 10
export const MAX_BLOCKS = 10

export const receiptNumber = (registerCode, seq) => `${registerCode}-${String(seq).padStart(6, "0")}`

export const offlineNumber = (registerCode, seq) => `${registerCode}-X${String(seq).padStart(5, "0")}`

const blockSeqs = (blocks = []) => blocks.flatMap(({ from, to }) => Array.from({ length: to - from + 1 }, (_, index) => from + index))

export const offlineNumbers = (registerCode, blocks = []) => blockSeqs(blocks).map((seq) => offlineNumber(registerCode, seq))

export const inBlocks = (registerCode, blocks, number) => offlineNumbers(registerCode, blocks).includes(number)

export const numbersLeft = (blocks = [], used = 0) => Math.max(blockSeqs(blocks).length - used, 0)
