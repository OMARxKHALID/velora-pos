import { expect, test } from "bun:test"
import { heldAt } from "./held-carts"

test("held carts are listed per counter", () => {
  const carts = [{ id: "a", registerId: "reg-1" }, { id: "b", registerId: "reg-2" }, { id: "c", registerId: "reg-1" }]
  expect(heldAt(carts).map(({ id }) => id)).toEqual(["a", "c"])
  expect(heldAt(carts, "reg-2").map(({ id }) => id)).toEqual(["b"])
})
