import { expect, test } from "bun:test"
import { createCloudinary, signParams } from "./cloudinary"

test("upload parameters are signed the way Cloudinary documents", () => {
  const params = { timestamp: 1315060510, public_id: "sample_image", eager: "w_400,h_300,c_pad|w_260,h_200,c_crop" }
  expect(signParams(params, "abcd")).toBe("bfd09f95f331f558cbd1320e67aa8d488770583e")
})

test("a photo is uploaded privately with a signed request, and shown only through a signed link", async () => {
  const sent = []
  const store = createCloudinary({
    cloudName: "velora-test",
    apiKey: "123456",
    apiSecret: "secret-for-tests-only",
    now: () => 1_700_000_000_000,
    fetcher: async (url, { body }) => {
      sent.push({ url, fields: Object.fromEntries(body.entries()) })
      return Response.json({ public_id: "velora/staff/p1", version: 42 })
    },
  })
  expect(await store.upload("velora/staff/p1", "data:image/jpeg;base64,AAAA")).toEqual({ photoId: "velora/staff/p1", photoVersion: 42 })
  const [{ url, fields }] = sent
  expect(url).toBe("https://api.cloudinary.com/v1_1/velora-test/image/upload")
  expect(fields).toMatchObject({ public_id: "velora/staff/p1", type: "authenticated", timestamp: "1700000000", api_key: "123456", file: "data:image/jpeg;base64,AAAA" })
  const { file: _file, api_key: _key, signature, ...signed } = fields
  expect(signature).toBe(signParams(signed, "secret-for-tests-only"))
  expect(JSON.stringify(sent)).not.toContain("secret-for-tests-only")
  expect(store.url("velora/staff/p1", 42)).toMatch(/^https:\/\/res\.cloudinary\.com\/velora-test\/image\/authenticated\/s--[\w-]{8}--\/.+\/v42\/velora\/staff\/p1$/)
})

test("a refused upload surfaces Cloudinary's message", async () => {
  const store = createCloudinary({ cloudName: "c", apiKey: "123456", apiSecret: "secret-for-tests-only", fetcher: async () => Response.json({ error: { message: "Invalid Signature" } }, { status: 401 }) })
  await expect(store.upload("x", "data:image/png;base64,AAAA")).rejects.toThrow("Invalid Signature")
})
