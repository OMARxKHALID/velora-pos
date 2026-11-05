import { toast } from "sonner"

export const notifyDiscountDropped = (dropped) => {
  if (!dropped) return
  toast.info("Discount removed", { description: "The cart changed after the supervisor approved it. Apply the discount again to ask for a new approval." })
}
