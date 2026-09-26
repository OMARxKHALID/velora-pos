import { requireRole } from "@/features/auth/server/session"
import { PosScreen } from "@/features/pos/components/pos-screen"

const PosPage = async () => {
  const user = await requireRole("cashier")
  return <PosScreen user={user} />
}

export default PosPage
