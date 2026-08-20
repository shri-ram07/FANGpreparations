// Lazy chunk: katex JS + CSS load together, only when a math section is
// expanded. (Named MathTex, not Math — shadowing the global breaks Math.min.)
import { useMemo } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

export default function MathTex({ tex, display = true }: { tex: string; display?: boolean }) {
  const html = useMemo(
    () => katex.renderToString(tex, { displayMode: display, throwOnError: false, output: 'html' }),
    [tex, display],
  )
  if (display) return <div className="my-3 overflow-x-auto" dangerouslySetInnerHTML={{ __html: html }} />
  return <span dangerouslySetInnerHTML={{ __html: html }} />
}
