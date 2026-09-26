import { saleDetail } from "@/features/sales/server/queries"
import { viewerScope } from "@/features/sales/server/request"
import { denied, noStore } from "@/server/http"

export const GET = async (_request, { params }) => {
  const { id } = await params
  if (typeof id !== "string" || id.length > 64) return denied(400, "Bad sale id")
  const scope = await viewerScope(null)
  if (scope.error) return scope.error
  const detail = await saleDetail(scope.db, { saleId: id, shopIds: scope.shopIds, viewer: scope.viewer })
  return detail ? Response.json(detail, { headers: noStore }) : denied(404, "Sale not found")
}
