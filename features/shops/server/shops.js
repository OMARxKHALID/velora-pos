import { defaultPricingSettings } from "@/features/pricing/lib/pricing"
import { COLLECTIONS as C } from "@/lib/db/collections"

const toShop = ({ _id, code, name, address = "", city = "", phone = "", ntn = "", strn = "", active = true }, settings) => ({
  id: _id,
  code,
  name,
  address,
  city,
  phone,
  ntn,
  strn,
  active,
  settings: { ...defaultPricingSettings(), ...settings },
})

export const listShops = async (db, shopIds = null) => {
  const filter = shopIds ? { _id: { $in: shopIds } } : {}
  const [shops, settings] = await Promise.all([
    db.collection(C.shops).find(filter, { sort: { createdAt: 1, _id: 1 } }).toArray(),
    db.collection(C.settings).find(shopIds ? { _id: { $in: shopIds } } : {}).toArray(),
  ])
  const byShop = Object.fromEntries(settings.map(({ _id, shopId: _shop, ...rest }) => [_id, rest]))
  return shops.map((shop) => toShop(shop, byShop[shop._id]))
}

export const listRegisters = async (db, shopIds) =>
  (await db.collection(C.registers).find({ shopId: { $in: shopIds } }, { sort: { code: 1 } }).toArray()).map(
    ({ _id, shopId, code, name, fbrPosId = "", autoPrint = false, copies = 1, drawerOnCash = true, manualDrawer = true }) => ({
      id: _id,
      shopId,
      code,
      name: name ?? code,
      fbrPosId,
      autoPrint,
      copies,
      drawerOnCash,
      manualDrawer,
    })
  )
