import type { HighlighterCore } from 'shiki/core'

// Lazy singleton. Everything — engine included — sits behind dynamic imports,
// so no shiki code lands in the entry chunk. JS regex engine, not Oniguruma:
// no WASM, smaller, faster startup; all five grammars work on it.
//
// NEVER import 'shiki' or 'shiki/bundle/*' anywhere — that ships every
// grammar (multi-MB). Only shiki/core, shiki/engine/javascript,
// @shikijs/langs/*, @shikijs/themes/* are allowed.

let p: Promise<HighlighterCore> | null = null

export function getHighlighter(): Promise<HighlighterCore> {
  return (p ??= (async () => {
    const [{ createHighlighterCore }, { createJavaScriptRegexEngine }] = await Promise.all([
      import('shiki/core'),
      import('shiki/engine/javascript'),
    ])
    return createHighlighterCore({
      engine: createJavaScriptRegexEngine({ forgiving: true }),
      themes: [import('@shikijs/themes/github-light')],
      langs: [
        import('@shikijs/langs/python'),
        import('@shikijs/langs/cpp'),
        import('@shikijs/langs/sql'),
        import('@shikijs/langs/yaml'),
        import('@shikijs/langs/bash'),
      ],
    })
  })())
}
