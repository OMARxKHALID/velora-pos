"use server"

import { actionResult, authorize } from "@/features/auth/server/session"
import { getDb, getMongoClient } from "@/lib/db/client"
import { deleteProduct, importCatalog, saveProduct, setProductStatus } from "./server/service"

const asSupervisor = (work) =>
  actionResult(async () => {
    const user = await authorize("manager")
    const result = await work({ db: getDb(), client: getMongoClient(), user, shopId: user.shopId })
    return { record: result }
  })

export const saveProductAction = async (request) => asSupervisor((deps) => saveProduct(deps, request))

export const setProductStatusAction = async (productId, status) => asSupervisor((deps) => setProductStatus(deps, { productId, status }))

export const deleteProductAction = async (productId) => asSupervisor((deps) => deleteProduct(deps, { productId }))

export const importCatalogAction = async (rows) => asSupervisor((deps) => importCatalog(deps, { rows }))
