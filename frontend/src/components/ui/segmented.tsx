import { cn } from "@/lib/utils"

type Option<T extends string> = { value: T; label: string }

/** Pill segmented control. The single active segment is lime. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: Option<T>[]
  value: T
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-xl border border-line bg-surface p-1">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            "h-9 cursor-pointer rounded-[8px] px-3.5 whitespace-nowrap text-caption font-medium text-charcoal transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.97]",
            o.value === value ? "bg-lime font-semibold text-forest" : "hover:bg-linen"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
