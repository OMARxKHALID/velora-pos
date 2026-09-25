import { expect, test } from "@playwright/test"
import { inStock, ledger, openShift, sellByScan, signIn } from "./helpers"

test("a sale at the till takes the stock the supervisor sees and lands in the sales list", async ({ browser }) => {
  const { page: till } = await signIn(browser, "cashier")
  const { page: office } = await signIn(browser, "supervisor")
  await openShift(till)
  const { variant, quantity } = await inStock(till)

  const number = await sellByScan(till, variant.barcode)
  expect(number).toMatch(/^SH1-R1-\d{6}$/)

  await expect.poll(async () => (await ledger(office)).stock[variant.id]).toBe(quantity - 1)
  await office.goto("/sales")
  await expect(office.getByText(number)).toBeVisible()
})
