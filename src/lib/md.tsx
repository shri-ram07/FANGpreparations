import type { ReactNode } from 'react'

// Tiny markdown subset for in-repo content: paragraphs, "- " bullets (one
// nesting level), "1. " ordered lists, **bold**, *italic*, `code`, [text](url).
// ponytail: not a full parser — all content is authored in this repo; extend
// only when a module actually needs more.

const INLINE = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g

function inline(text: string): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>
    if (part.startsWith('`') && part.endsWith('`'))
      return (
        <code key={i} className="rounded bg-raised px-1 py-0.5 text-[0.88em]">
          {part.slice(1, -1)}
        </code>
      )
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part)
    if (link)
      return (
        <a key={i} href={link[2]} target="_blank" rel="noreferrer" className="text-accent hover:underline">
          {link[1]}
        </a>
      )
    return part
  })
}

interface Li {
  text: string
  children: string[]
}

function parseList(lines: string[]): Li[] {
  const items: Li[] = []
  for (const l of lines) {
    const child = /^\s+[-*]\s+(.*)$/.exec(l)
    const top = /^[-*]\s+(.*)$/.exec(l)
    if (top) items.push({ text: top[1]!, children: [] })
    else if (child && items.length > 0) items[items.length - 1]!.children.push(child[1]!)
  }
  return items
}

export function Md({ text }: { text: string }) {
  const blocks = text.trim().split(/\n\s*\n/)
  return (
    <div className="max-w-[70ch] space-y-3">
      {blocks.map((block, bi) => {
        const lines = block.split('\n')
        if (/^[-*]\s/.test(lines[0]!)) {
          return (
            <ul key={bi} className="list-disc space-y-1.5 pl-5 marker:text-ink-soft">
              {parseList(lines).map((item, i) => (
                <li key={i}>
                  {inline(item.text)}
                  {item.children.length > 0 && (
                    <ul className="mt-1 list-[circle] space-y-1 pl-5 marker:text-ink-soft">
                      {item.children.map((c, j) => (
                        <li key={j}>{inline(c)}</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )
        }
        if (/^\d+\.\s/.test(lines[0]!)) {
          // A "1." block may also contain "- " sub-bullets or continuation lines;
          // attach them to the item above instead of turning them into items.
          const items: { text: string; children: string[] }[] = []
          for (const l of lines) {
            const numbered = /^\d+\.\s+(.*)$/.exec(l)
            if (numbered) items.push({ text: numbered[1]!, children: [] })
            else if (items.length > 0) items[items.length - 1]!.children.push(l.replace(/^\s*[-*]\s+/, ''))
          }
          return (
            <ol key={bi} className="list-decimal space-y-1.5 pl-5 marker:text-ink-soft">
              {items.map((item, i) => (
                <li key={i}>
                  {inline(item.text)}
                  {item.children.length > 0 && (
                    <ul className="mt-1 list-disc space-y-1 pl-5 marker:text-ink-soft">
                      {item.children.map((c, j) => (
                        <li key={j}>{inline(c)}</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          )
        }
        return <p key={bi}>{inline(lines.join(' '))}</p>
      })}
    </div>
  )
}
