import { expect, test } from "@playwright/test"
import { signIn } from "./helpers"

test("a wrong password is refused", async ({ page }) => {
  await page.goto("/")
  await page.getByLabel("Username").fill("hamza")
  await page.getByLabel("Password").fill("not-the-password")
  await page.getByRole("button", { name: /^Sign in$/ }).click()
  await expect(page.getByText("Wrong username or password")).toBeVisible()
})

test("guessing passwords locks the username out for a while", async ({ page }) => {
  await page.goto("/")
  const guess = async () => {
    await page.getByLabel("Username").fill("intruder")
    await page.getByLabel("Password").fill("guess-guess")
    await page.getByRole("button", { name: /^Sign in$/ }).click()
  }
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await guess()
    await expect(page.getByText("Wrong username or password")).toBeVisible()
    await page.reload()
  }
  await guess()
  await expect(page.getByText(/Too many attempts/)).toBeVisible()
})

test("each role lands on its own screen and cannot open the owner's", async ({ browser }) => {
  const cashier = await signIn(browser, "cashier")
  await expect(cashier.page).toHaveURL(/\/pos$/)
  await cashier.page.goto("/dashboard")
  await expect(cashier.page).toHaveURL(/\/pos$/)
  expect((await cashier.page.request.get("/api/dashboard")).status()).toBe(403)

  const supervisor = await signIn(browser, "supervisor")
  await expect(supervisor.page).toHaveURL(/\/sales$/)

  const owner = await signIn(browser, "owner")
  await expect(owner.page).toHaveURL(/\/dashboard$/)
  await expect(owner.page.getByText("Best sellers")).toBeVisible()
})

test("signed-out visitors are sent to sign in", async ({ page }) => {
  await page.goto("/pos")
  await expect(page).toHaveURL(/\/$/)
  expect((await page.request.get("/api/ledger")).status()).toBe(401)
})
