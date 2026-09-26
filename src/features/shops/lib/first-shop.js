import { REGISTER_CODE, REGISTER_ID, SHOP_ID } from "@/features/catalog/lib/catalog"
import { defaultPricingSettings } from "@/features/pricing/lib/pricing"
import { SHOP_TIME_ZONE } from "@/shared/lib/zoned"
import { SHOP_NAME } from "./constants"

export const firstShopDocuments = (now = new Date()) => ({
  shop: { _id: SHOP_ID, code: "SH1", type: "footwear", name: SHOP_NAME, timezone: SHOP_TIME_ZONE, address: "", city: "Lahore", phone: "", ntn: "", strn: "", active: true, createdAt: now },
  register: { _id: REGISTER_ID, shopId: SHOP_ID, code: REGISTER_CODE, name: "Counter 1", fbrPosId: "", autoPrint: false, copies: 1, drawerOnCash: true, manualDrawer: true, lastReceiptSeq: 0, lastOfflineSeq: 0, lastFbrSeq: 0 },
  settings: { _id: SHOP_ID, shopId: SHOP_ID, ...defaultPricingSettings() },
})
