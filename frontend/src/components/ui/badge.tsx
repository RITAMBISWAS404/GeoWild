import { cn } from "@/lib/utils"

const tones = {
  linen: "bg-linen text-forest",
  dark: "bg-forest text-lime",
  clay: "bg-clay text-bark",
  line: "border border-line text-slate",
}

export function Badge({
  tone = "linen",
  className,
  ...props
}: React.ComponentProps<"span"> & { tone?: keyof typeof tones }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-micro font-medium", tones[tone], className)}
      {...props}
    />
  )
}
