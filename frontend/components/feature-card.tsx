'use client'

import Link from 'next/link'
import { ChevronRight, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type FeatureCardProps = {
  title: string
  description: string
  icon: LucideIcon
  iconBg: string
  iconColor: string
  href?: string
  onClick?: () => void
}

const cardClassName =
  'group relative flex items-start gap-4 rounded-xl border border-white/60 bg-card/70 p-6 pb-10 text-left shadow-[0_6px_16px_rgb(80,120,200,0.16)] backdrop-blur-md transition-all hover:-translate-y-1 hover:bg-card/90 hover:shadow-[0_10px_22px_rgb(80,120,200,0.24)]'

export function FeatureCard({
  title,
  description,
  icon: Icon,
  iconBg,
  iconColor,
  href,
  onClick,
}: FeatureCardProps) {
  const content = (
    <>
      <div
        className={cn(
          'flex size-12 shrink-0 items-center justify-center rounded-xl',
          iconBg,
          iconColor,
        )}
      >
        <Icon className="size-6" />
      </div>
      <div className="min-w-0">
        <h4 className="font-semibold text-foreground">{title}</h4>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      <ChevronRight className="absolute right-4 bottom-4 size-5 text-muted-foreground/50 transition-colors group-hover:text-primary" />
    </>
  )

  if (href) {
    return (
      <Link href={href} className={cardClassName}>
        {content}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} className={cardClassName}>
      {content}
    </button>
  )
}
