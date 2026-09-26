import { z } from "zod"

const databaseSchema = z.object({
  MONGODB_URI: z.url({ protocol: /^mongodb(\+srv)?$/, error: "MONGODB_URI must be a mongodb:// or mongodb+srv:// connection string" }),
  MONGODB_DB: z
    .string()
    .regex(/^[A-Za-z0-9_-]{1,63}$/, { error: "MONGODB_DB may only use letters, digits, _ and -" })
    .default("velora"),
})

const appSchema = z.object({
  SAMPLE_DATA: z.stringbool().default(false),
  PIN_SECRET: z.string().min(32, { error: "PIN_SECRET must be at least 32 characters" }).optional(),
})

const authSchema = z.object({
  BETTER_AUTH_SECRET: z.string().min(32, { error: "BETTER_AUTH_SECRET must be at least 32 characters" }),
  BETTER_AUTH_URL: z.url({ protocol: /^https?$/ }).optional(),
  SAMPLE_PASSWORD: z.string().min(8, { error: "SAMPLE_PASSWORD must be at least 8 characters" }).default("velora-sample"),
})

const cloudinarySchema = z.object({
  CLOUDINARY_CLOUD_NAME: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/, { error: "CLOUDINARY_CLOUD_NAME may only use letters, digits, _ and -" }).optional(),
  CLOUDINARY_API_KEY: z.string().regex(/^\d{6,20}$/, { error: "CLOUDINARY_API_KEY must be digits" }).optional(),
  CLOUDINARY_API_SECRET: z.string().min(16, { error: "CLOUDINARY_API_SECRET looks too short" }).optional(),
})

const read = (schema, name) => {
  const result = schema.safeParse(process.env)
  if (!result.success) throw new Error(`Invalid ${name} environment variables:\n${z.prettifyError(result.error)}`)
  return result.data
}

let database
let app
let auth
let cloudinary

export const databaseEnv = () => (database ??= read(databaseSchema, "database"))

export const appEnv = () => (app ??= read(appSchema, "app"))

export const authEnv = () => (auth ??= read(authSchema, "auth"))

export const cloudinaryEnv = () => {
  const { CLOUDINARY_CLOUD_NAME: cloudName, CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: apiSecret } = (cloudinary ??= read(cloudinarySchema, "Cloudinary"))
  return cloudName && apiKey && apiSecret ? { cloudName, apiKey, apiSecret } : null
}

export const pinSecret = () => appEnv().PIN_SECRET ?? authEnv().BETTER_AUTH_SECRET
