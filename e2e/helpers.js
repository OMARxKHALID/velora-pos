import { expect } from "@playwright/test"
import { E2E_ENV } from "../playwright.config"

const PEOPLE = { owner: "asif", supervisor: "bilal", cashier: "hamza" }

export const signIn = async (browser, who) => {
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto("/")
  await page.getByLabel("Username").fill(PEOPLE[who])
  await page.getByLabel("Password").fill(E2E_ENV.SAMPLE_PASSWORD)
  await page.getByRole("button", { name: /^Sign in$/ }).click()
  await page.waitForURL((url) => url.pathname !== "/")
  return { context, page }
}

export const ledger = (page) => page.evaluate(async () => (await fetch("/api/ledger")).json())

export const openShift = async (page) => {
  await page.goto("/pos")
  const open = page.getByRole("button", { name: /Open shift/i })
  const since = page.getByText(/Shift since/)
  await expect(open.or(since)).toBeVisible()
  if (await open.isVisible()) await open.click()
  await expect(since).toBeVisible()
}

export const inStock = async (page, minimum = 3) => {
  const data = await ledger(page)
  const variant = data.variants.find(({ id, active }) => active && (data.stock[id] ?? 0) >= minimum)
  return { variant, quantity: data.stock[variant.id] }
}

export const sellByScan = async (page, barcode) => {
  await page.locator("body").click({ position: { x: 5, y: 5 } })
  await page.keyboard.type(barcode, { delay: 5 })
  await page.keyboard.press("Enter")
  await expect(page.getByText(/Cart is empty/).first()).not.toBeVisible()
  await page.keyboard.press("F2")
  await page.getByRole("button", { name: /^Exact$/i }).click()
  await page.getByRole("button", { name: /Complete cash sale/i }).click()
  const receipt = page.getByRole("dialog")
  await expect(receipt).toContainText(/SH1-R1-X?\d{5,6}/)
  const number = (await receipt.innerText()).match(/SH1-R1-X?\d{5,6}/)[0]
  await page.keyboard.press("Escape")
  await expect(receipt).not.toBeVisible()
  return number
}
