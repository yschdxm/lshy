'use client'

import { services } from '@/lib/mock-data'
import { FeatureCard } from '@/components/feature-card'

export function ServiceGrid() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {services.map((service) => (
        <FeatureCard
          key={service.title}
          title={service.title}
          description={service.description}
          icon={service.icon}
          iconBg={service.iconBg}
          iconColor={service.iconColor}
          href={service.href}
        />
      ))}
    </div>
  )
}
