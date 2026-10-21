import { Icon } from "@/components/Icon"
import { cn } from "@/lib/utils"

export type NavId = "overview" | "closest" | "kdtree"

const NAV: { id: NavId; label: string; short: string; icon: string }[] = [
  { id: "overview", label: "Live habitat", short: "Habitat", icon: "grid_on" },
  { id: "closest", label: "Closest pair", short: "Closest pair", icon: "straighten" },
  { id: "kdtree", label: "KD-Tree search", short: "KD-Tree", icon: "account_tree" },
]

function Brand({ light }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-9 place-items-center rounded-full bg-lime text-forest">
        <Icon name="pets" fill className="text-[20px]" />
      </span>
      <span className={cn("text-[20px] font-black tracking-[-0.04em]", light ? "text-white" : "text-ink")}>GeoWild</span>
    </div>
  )
}

export function AppShell({ active, onNav, children }: { active: NavId; onNav: (id: NavId) => void; children: React.ReactNode }) {
  return (
    <div className="lg:grid lg:grid-cols-[248px_1fr]">
      {/* Desktop sidebar */}
      <aside className="on-dark sticky top-0 hidden h-dvh flex-col justify-between bg-forest p-5 lg:flex">
        <div>
          <div className="px-2 pt-1 pb-8">
            <Brand light />
          </div>
          <nav aria-label="Primary" className="flex flex-col gap-1">
            {NAV.map((n) => {
              const on = n.id === active
              return (
                <button
                  key={n.id}
                  onClick={() => onNav(n.id)}
                  aria-current={on ? "page" : undefined}
                  className={cn(
                    "flex h-11 cursor-pointer items-center gap-3 rounded-control px-4 text-body font-medium transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.98]",
                    on ? "bg-lime text-forest" : "text-white/75 hover:bg-white/8 hover:text-white"
                  )}
                >
                  <Icon name={n.icon} fill={on} />
                  {n.label}
                </button>
              )
            })}
          </nav>
        </div>
        <div className="border-t border-white/12 px-2 pt-4">
          <p className="flex items-center gap-2 text-caption font-semibold text-lime">
            <Icon name="science" className="text-[18px]" /> Simulated data
          </p>
          <p className="mt-1.5 text-caption leading-snug text-white/65">Fifty simulated animals on a 100 × 100 habitat. Synthetic, not real wildlife data.</p>
        </div>
      </aside>

      <div className="min-w-0">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-[600] flex h-14 items-center justify-between border-b border-line bg-bone/95 px-5 lg:hidden">
          <Brand />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-forest px-3 py-1 text-micro font-medium text-lime">
            <Icon name="science" className="text-[14px]" /> Simulated
          </span>
        </header>

        <main className="pb-28 lg:pb-16">{children}</main>
      </div>

      {/* Mobile tab bar */}
      <nav aria-label="Primary" className="on-dark fixed inset-x-3 bottom-3 z-[600] flex justify-between rounded-2xl bg-forest p-1.5 lg:hidden">
        {NAV.map((n) => {
          const on = n.id === active
          return (
            <button
              key={n.id}
              onClick={() => onNav(n.id)}
              aria-current={on ? "page" : undefined}
              className={cn(
                "flex h-12 flex-1 cursor-pointer flex-col items-center justify-center rounded-xl text-[11px] font-medium transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.96]",
                on ? "bg-lime text-forest" : "text-white/75"
              )}
            >
              <Icon name={n.icon} fill={on} className="text-[22px]" />
              {n.short}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
