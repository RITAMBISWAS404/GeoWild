import { Icon } from "@/components/Icon"
import { COLOR } from "@/lib/ui"
import { cn } from "@/lib/utils"

/*
 * Shared surface system (canonical: the Overview).
 *   page gutter 20 / 32px · grid gap 16px · section gap 32px · major section gap 48px · module padding 20 / 24px
 *   shapes: controls 10px, surfaces 16px (rounded-surface), the main visualization 20px (rounded-hero)
 *   surfaces: page (bone) > primary (surface) > secondary (tonal: metadata, control bars)
 */
export const GAP = "gap-4"
export const PAD = "p-5 md:p-6"
export const PAGE = "mx-auto max-w-page px-5 pt-6 pb-4 md:px-8 lg:pt-8"

/** Square icon container used in every module header. */
export function IconBox({ icon, tone = COLOR.ink }: { icon: string; tone?: string }) {
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-control bg-tonal" style={{ color: tone }}>
      <Icon name={icon} className="text-[22px]" />
    </span>
  )
}

type ModuleProps = {
  icon: string
  tone?: string
  title: string
  meta?: React.ReactNode
  action?: React.ReactNode
  footer?: React.ReactNode
  className?: string
  children: React.ReactNode
}

/** One module: header (icon, title, metadata, action) / primary content / optional footer. */
export function Module({ icon, tone, title, meta, action, footer, className, children }: ModuleProps) {
  return (
    <section className={cn("flex min-w-0 flex-col rounded-surface border border-line bg-surface", PAD, className)}>
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <IconBox icon={icon} tone={tone} />
          <div className="min-w-0">
            <h2 className="text-[18px] leading-tight font-bold tracking-[-0.01em] text-ink">{title}</h2>
            {meta && <p className="mt-0.5 text-caption text-slate">{meta}</p>}
          </div>
        </div>
        {action}
      </header>
      <div className="mt-5 flex-1">{children}</div>
      {footer && <footer className="mt-5 border-t border-line pt-4">{footer}</footer>}
    </section>
  )
}

/** The main visualization window: header, plot, legend, and a tonal control bar. */
export function VizSurface({
  icon,
  tone,
  title,
  meta,
  action,
  legend,
  controls,
  className,
  children,
}: {
  icon: string
  tone?: string
  title: string
  meta?: React.ReactNode
  action?: React.ReactNode
  legend?: React.ReactNode
  controls?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <section className={cn("flex min-w-0 flex-col overflow-hidden rounded-hero border border-line bg-surface shadow-[0_6px_20px_rgba(14,15,12,0.04)]", className)}>
      <header className="flex items-start justify-between gap-3 px-5 pt-5 md:px-6 md:pt-6">
        <div className="flex min-w-0 items-center gap-3">
          <IconBox icon={icon} tone={tone} />
          <div className="min-w-0">
            <h2 className="text-[18px] leading-tight font-bold tracking-[-0.01em] text-ink">{title}</h2>
            {meta && <p className="mt-0.5 text-caption text-slate">{meta}</p>}
          </div>
        </div>
        {action}
      </header>
      <div className="flex-1 px-2 pt-3 sm:px-3 md:px-5">{children}</div>
      {legend && <div className="px-5 pt-1 pb-4 text-caption text-charcoal md:px-6">{legend}</div>}
      {controls && <div className="border-t border-line bg-tonal px-5 py-3.5 md:px-6">{controls}</div>}
    </section>
  )
}

/** Label / value metadata on the secondary (tonal) surface. */
export function MetaList({ children, className }: { children: React.ReactNode; className?: string }) {
  return <dl className={cn("rounded-control bg-tonal px-4 py-1", className)}>{children}</dl>
}

export const Row = ({ k, children, mono }: { k: string; children: React.ReactNode; mono?: boolean }) => (
  <div className="flex items-baseline justify-between gap-4 border-b border-line/80 py-2 last:border-b-0">
    <dt className="text-caption whitespace-nowrap text-slate">{k}</dt>
    <dd className={cn("min-w-0 text-right text-caption font-medium text-ink", mono && "num font-mono text-[13px]")}>{children}</dd>
  </div>
)

export const Metric = ({ children, unit, color, className }: { children: React.ReactNode; unit?: string; color?: string; className?: string }) => (
  <p className={cn("num text-[40px] leading-none font-black tracking-[-0.03em] text-ink", className)} style={color ? { color } : undefined}>
    {children}
    {unit && <span className="ml-2 text-body font-medium tracking-normal text-slate">{unit}</span>}
  </p>
)

export const DashedMark = ({ w = "w-5" }: { w?: string }) => <span className={cn("inline-block h-0 border-t-2 border-dashed", w)} style={{ borderColor: COLOR.pair }} aria-hidden />

/** Page header for the algorithm pages: same type scale as the Overview. */
export function PageHeader({
  icon,
  tone,
  eyebrow,
  title,
  description,
  right,
}: {
  icon: string
  tone?: string
  eyebrow: string
  title: string
  description: string
  right?: React.ReactNode
}) {
  return (
    <header className="rise flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
      <div className="min-w-0 max-w-xl">
        <p className="flex items-center gap-2.5 text-caption font-medium text-slate">
          <IconBox icon={icon} tone={tone} />
          {eyebrow}
        </p>
        <h1 className="mt-4 text-[clamp(28px,3.2vw,38px)] leading-none font-black tracking-[-0.04em] text-ink">{title}</h1>
        <p className="mt-3 text-body leading-snug text-charcoal">{description}</p>
      </div>
      {right && <div className="flex flex-wrap items-center gap-3">{right}</div>}
    </header>
  )
}
