import { cn } from "@/lib/utils"

/** On / off toggle. On = lime track with a forest knob. */
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="group inline-flex h-9 cursor-pointer items-center gap-2.5 rounded-full pr-1 text-caption font-medium text-ink"
    >
      <span
        className={cn(
          "relative h-6 w-10 shrink-0 rounded-full border transition-colors duration-150 ease-out",
          checked ? "border-forest bg-lime" : "border-pebble bg-fog group-hover:bg-line"
        )}
      >
        <span
          className={cn(
            "absolute top-1/2 left-0.5 size-4 -translate-y-1/2 rounded-full transition-transform duration-150 ease-out",
            checked ? "translate-x-[1.1rem] bg-forest" : "bg-pebble"
          )}
        />
      </span>
      {label}
    </button>
  )
}
