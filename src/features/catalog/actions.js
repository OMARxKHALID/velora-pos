"use server"

import { recordAction } from "@/features/auth/server/session"
import { deleteCategory, saveCategory } from "./server/categories"
import { deleteProduct, importCatalog, saveProduct, setProductStatus } from "./server/service"

export const saveProductAction = async (request) => recordAction(["manager"], (deps) => saveProduct(deps, request))

export const setProductStatusAction = async (productId, status) => recordAction(["manager"], (deps) => setProductStatus(deps, { productId, status }))

export const deleteProductAction = async (productId) => recordAction(["manager"], (deps) => deleteProduct(deps, { productId }))

export const importCatalogAction = async (rows) => recordAction(["manager"], (deps) => importCatalog(deps, { rows }))

export const saveCategoryAction = async (input) => recordAction(["manager"], (deps) => saveCategory(deps, input))

export const deleteCategoryAction = async (categoryId) => recordAction(["manager"], (deps) => deleteCategory(deps, { categoryId }))
