import { Icon } from "@/components/Icon"

/** Loading / error / empty state, shared by every screen. */
export function Notice({
  eyebrow,
  icon,
  title,
  text,
  action,
}: {
  eyebrow: string
  icon: string
  title: string
  text: string
  action?: React.ReactNode
}) {
  return (
    <div className="mx-auto max-w-page px-5 pt-8 md:px-10 lg:pt-12">
      <p className="eyebrow">{eyebrow}</p>
      <div role={icon === "progress_activity" ? "status" : "alert"} className="mt-10 grid min-h-[320px] place-items-center rounded-panel border border-line text-center">
        <div className="max-w-sm px-6">
          <Icon name={icon} className={icon === "progress_activity" ? "animate-spin text-pebble" : "text-pebble"} />
          <p className="mt-3 text-lead font-bold text-ink">{title}</p>
          <p className="mt-1 text-body text-slate">{text}</p>
          {action && <div className="mt-5">{action}</div>}
        </div>
      </div>
    </div>
  )
}
