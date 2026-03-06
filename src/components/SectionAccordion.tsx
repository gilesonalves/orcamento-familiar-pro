import { useMemo, useState, type ReactNode } from 'react'

export type SectionAccordionItem = {
  id: string
  title: string
  summary?: ReactNode
  content: ReactNode
}

type SectionAccordionProps = {
  sections: SectionAccordionItem[]
  defaultOpenId?: string | null
  value?: string | null
  onValueChange?: (value: string | null) => void
}

export function SectionAccordion({
  sections,
  defaultOpenId = null,
  value,
  onValueChange,
}: SectionAccordionProps) {
  const [internalValue, setInternalValue] = useState<string | null>(defaultOpenId)

  const openId = value !== undefined ? value : internalValue

  const setOpenId = (nextValue: string | null) => {
    if (value === undefined) {
      setInternalValue(nextValue)
    }
    onValueChange?.(nextValue)
  }

  const orderedSections = useMemo(() => sections, [sections])

  return (
    <div className="space-y-3">
      {orderedSections.map(section => {
        const isOpen = openId === section.id

        return (
          <section
            key={section.id}
            className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40"
          >
            <h3>
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : section.id)}
                className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left hover:bg-slate-800/50"
                aria-expanded={isOpen}
                aria-controls={`accordion-content-${section.id}`}
              >
                <span className="min-w-0">
                  <span className="block text-base font-semibold text-white">
                    {section.title}
                  </span>
                  {section.summary && (
                    <span className="mt-1 block truncate text-xs text-slate-300">
                      {section.summary}
                    </span>
                  )}
                </span>
                <span
                  className={`shrink-0 text-slate-300 transition-transform ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                  aria-hidden="true"
                >
                  ▼
                </span>
              </button>
            </h3>

            {isOpen && (
              <div
                id={`accordion-content-${section.id}`}
                className="border-t border-slate-800 px-4 py-4"
              >
                {section.content}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
