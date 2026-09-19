import { expect, test } from "bun:test"
import { parseCsv, toCsv } from "./csv"

test("csv round-trips quotes, commas and newlines", () => {
  const rows = [
    ["product", "note"],
    ['Velora "Aurum" Runner', "size 42, black"],
    ["Line\nbreak", ""],
  ]
  expect(parseCsv(toCsv(rows))).toEqual(rows)
  expect(parseCsv("﻿a,b\r\n1,2\r\n\r\n")).toEqual([["a", "b"], ["1", "2"]])
})
