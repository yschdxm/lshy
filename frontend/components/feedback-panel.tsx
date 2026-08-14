'use client'

import { ChevronRight, HelpCircle, Phone, ArrowRight } from 'lucide-react'
import { feedbackFaqs, feedbackContact } from '@/lib/mock-data'

export function FeedbackPanel() {
  return (
    <aside className="flex w-full shrink-0 flex-col gap-6 lg:w-56">
      {/* FAQs */}
      <section className="rounded-xl bg-white p-4 shadow-[0_6px_16px_rgb(80,120,200,0.16)]">
        <div className="flex items-center gap-2">
          <HelpCircle className="size-5 text-primary" />
          <h3 className="text-base font-bold text-foreground">常见问题</h3>
        </div>
        <div className="mt-3 flex flex-col gap-1">
          {feedbackFaqs.map((q) => (
            <button
              key={q}
              type="button"
              className="group flex items-center gap-2 rounded-lg px-1 py-2 text-left text-sm text-foreground transition-colors hover:text-primary"
            >
              <ChevronRight className="size-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-primary" />
              <span className="min-w-0 flex-1">{q}</span>
            </button>
          ))}
          <button
            type="button"
            className="mt-1 flex items-center gap-1 px-1 text-sm font-medium text-primary transition-opacity hover:opacity-80"
          >
            更多问题
            <ArrowRight className="size-4" />
          </button>
        </div>
      </section>

      {/* Contact us */}
      <section className="rounded-xl bg-white p-4 shadow-[0_6px_16px_rgb(80,120,200,0.16)]">
        <div className="flex items-center gap-2">
          <Phone className="size-5 text-emerald-500" />
          <h3 className="text-base font-bold text-foreground">联系我们</h3>
        </div>
        <p className="mt-3 text-xl font-bold text-foreground">
          {feedbackContact.phone}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {feedbackContact.hours}
        </p>
      </section>
    </aside>
  )
}
