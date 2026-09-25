import { expect, test } from "@playwright/test"
import { inStock, ledger, openShift, sellByScan, signIn } from "./helpers"

test("the till keeps selling offline and uploads each sale once when the connection is back", async ({ browser }) => {
  const { context, page: till } = await signIn(browser, "cashier")
  const { page: office } = await signIn(browser, "supervisor")
  await openShift(till)
  await till.evaluate(() => navigator.serviceWorker.ready)
  await till.reload()
  await expect(till.getByText(/Shift since/)).toBeVisible()
  const { variant, quantity } = await inStock(till)

  await context.setOffline(true)
  await expect(till.getByText(/Keep selling/)).toBeVisible()
  const first = await sellByScan(till, variant.barcode)
  expect(first).toMatch(/^SH1-R1-X\d{5}$/)
  await expect(till.getByText(/1 sale is saved on this till/)).toBeVisible()

  await till.reload()
  await expect(till.getByText(/Shift since/)).toBeVisible()
  await expect(till.getByText(/1 sale is saved on this till/)).toBeVisible()

  const second = await sellByScan(till, variant.barcode)
  expect(second).not.toBe(first)
  await expect(till.getByRole("button", { name: /Close shift/ })).toBeDisabled()

  await context.setOffline(false)
  await expect(till.getByText(/saved on this till/)).toHaveCount(0, { timeout: 15_000 })
  await expect.poll(async () => (await ledger(office)).stock[variant.id]).toBe(quantity - 2)

  const sales = await office.evaluate(async () => (await fetch("/api/sales?range=today&q=offline")).json())
  expect(sales.rows.map(({ number }) => number)).toEqual(expect.arrayContaining([first, second]))
  expect(sales.rows.filter(({ number }) => number === first)).toHaveLength(1)
})
