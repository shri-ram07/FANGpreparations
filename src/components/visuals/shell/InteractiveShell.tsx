import type { ReactNode } from 'react'

/** Consistent frame for every interactive: title, reset, "what to notice". */
export function InteractiveShell({
  title,
  notice,
  onReset,
  children,
}: {
  title: string
  notice: string
  onReset?: () => void
  children: ReactNode
}) {
  return (
    <figure className="my-6 overflow-hidden rounded-xl border border-line bg-bg">
      <header className="flex items-center justify-between border-b border-line bg-raised px-4 py-2">
        <h4 className="font-display text-sm font-semibold">{title}</h4>
        {onReset && (
          <button onClick={onReset} className="text-xs text-ink-soft hover:text-ink">
            ↺ Reset
          </button>
        )}
      </header>
      <div className="p-4">{children}</div>
      <figcaption className="border-t border-line px-4 py-2 text-[13px] text-ink-soft">
        <span className="mr-2 text-[11px] font-semibold tracking-wide uppercase">What to notice</span>
        {notice}
      </figcaption>
    </figure>
  )
}
