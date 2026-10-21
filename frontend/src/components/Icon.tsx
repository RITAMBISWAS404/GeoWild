import { cn } from "@/lib/utils"

type IconProps = { name: string; fill?: boolean; className?: string }

/** Google Material Symbols Rounded. `fill` marks selected/active states. */
export function Icon({ name, fill, className }: IconProps) {
  return (
    <span aria-hidden className={cn("material-symbols-rounded", className)} data-fill={fill ? 1 : 0}>
      {name}
    </span>
  )
}
