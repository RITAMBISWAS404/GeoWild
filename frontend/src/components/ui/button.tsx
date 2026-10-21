import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-control font-medium whitespace-nowrap select-none cursor-pointer transition-[transform,background-color,color,border-color] duration-150 ease-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        primary: "bg-lime text-forest hover:bg-[#8fdc5c]",
        dark: "bg-forest text-lime hover:bg-spruce",
        outline: "border border-forest bg-surface text-forest hover:bg-linen",
        ghost: "text-forest hover:bg-forest/8",
        link: "rounded-none px-0! py-2 h-auto! text-forest underline underline-offset-4 decoration-forest/40 hover:decoration-forest active:scale-100",
      },
      size: {
        md: "h-11 px-6 text-body",
        sm: "h-10 px-4 text-caption",
        icon: "size-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
)

function Button({
  className,
  variant,
  size,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return <ButtonPrimitive className={cn(buttonVariants({ variant, size }), className)} {...props} />
}

export { Button }
