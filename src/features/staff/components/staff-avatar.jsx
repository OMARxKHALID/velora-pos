import { UserIcon } from "@phosphor-icons/react"
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar"

const initialsOf = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("")

export const StaffAvatar = ({ person, className, fallbackClassName, size }) => (
  <Avatar size={size} className={className}>
    {person?.photo && <AvatarImage src={person.photo} alt="" />}
    <AvatarFallback className={fallbackClassName}>{person?.avatar || initialsOf(person?.name) || <UserIcon className="size-1/2 text-muted-foreground" />}</AvatarFallback>
  </Avatar>
)
