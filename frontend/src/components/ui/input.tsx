import { cn } from "@/lib/utils"

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-card border border-pebble bg-surface px-4 text-body text-ink placeholder:text-pebble transition-colors duration-150 hover:border-slate focus:border-forest focus:outline-none disabled:opacity-40",
        className
      )}
      {...props}
    />
  )
}
