// The floating ask-anything bubble. Mounted once in AppShell, outside <Suspense>,
// so a lazy route swap never unmounts it mid-stream.
//
// data-no-anno on the panel: blocksIn() in src/lib/anchor.ts honours that
// attribute, and without it the highlighter would treat chat replies as
// annotatable page text.

import { useEffect, useRef, useState } from 'react'
import { Md } from '@/lib/md'
import { buildContext, clearKey, getKey, setKey, streamAnswer, testKey } from '@/lib/chat/gemini'
import { useChat } from '@/stores/chat'
import { PROVIDERS } from '@/lib/chat/providers'

const FENCE = /```[a-z]*\n?/gi

/** Md renders no fenced code blocks, by design — every content page depends on
 *  that narrow grammar. A model still emits fences, so split them off here
 *  rather than widening Md. */
function Answer({ text }: { text: string }) {
  const parts = text.split(/```[a-z]*\n?/i)
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <pre
            key={i}
            className="my-2 overflow-x-auto rounded-md bg-raised p-2.5 font-mono text-[12.5px] leading-relaxed"
          >
            {p.replace(/\n$/, '')}
          </pre>
        ) : p.trim() === '' ? null : (
          <Md key={i} text={p} />
        ),
      )}
    </>
  )
}

function KeyPanel({ onDone, onCancel }: { onDone: () => void; onCancel?: () => void }) {
  const [v, setV] = useState(() => getKey())
  const [diag, setDiag] = useState('')
  const [testing, setTesting] = useState(false)
  const save = () => {
    if (v.trim() === '') return
    setKey(v)
    onDone()
  }
  const test = async () => {
    setTesting(true)
    setDiag('Asking Google…')
    setDiag(await testKey(v))
    setTesting(false)
  }
  return (
    <div className="overflow-y-auto p-4 text-[14px]">
      <p className="font-semibold">Your API key</p>
      <p className="mt-1.5 text-ink-soft">
        Stored in this browser only, and sent nowhere except the provider. This site ships no key of its own — a
        frontend-only page cannot hide one.
      </p>
      <p className="mt-1.5 text-[13px] text-ink-soft">
        Works with a Google key (<span className="font-mono">AIza…</span>), or a free key from{' '}
        {PROVIDERS.map((p, i) => (
          <span key={p.id}>
            {i > 0 && ', '}
            <a href={p.signup} target="_blank" rel="noreferrer" className="text-accent hover:underline">
              {p.label}
            </a>
          </span>
        ))}
        . Google&apos;s newer <span className="font-mono">AQ.</span> keys are currently rejected by Google&apos;s own
        API — press Test key to see exactly what it says.
      </p>
      <input
        type="password"
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && save()}
        placeholder="AIza..."
        className="mt-3 w-full rounded-md border border-line px-2.5 py-1.5 font-mono text-[13px] outline-none focus:border-accent"
      />
      <div className="mt-2.5 flex flex-wrap items-center gap-3">
        <button
          disabled={v.trim() === ''}
          onClick={save}
          className="rounded-md bg-accent px-3.5 py-1.5 font-medium text-white disabled:opacity-40"
        >
          Save
        </button>
        <button
          disabled={v.trim() === '' || testing}
          onClick={() => void test()}
          className="rounded-md border border-line px-3 py-1.5 font-medium disabled:opacity-40 hover:border-accent hover:text-accent"
        >
          Test key
        </button>
        <a href={PROVIDERS[0].signup} target="_blank" rel="noreferrer" className="text-accent hover:underline">
          Get a free key
        </a>
        {onCancel && (
          <button onClick={onCancel} className="text-ink-soft hover:text-ink">
            Cancel
          </button>
        )}
      </div>

      {/* Google's own words, unedited — the point is to stop guessing. */}
      {diag !== '' && (
        <pre className="mt-3 max-h-40 overflow-auto rounded-md bg-raised p-2.5 font-mono text-[12px] whitespace-pre-wrap">
          {diag}
        </pre>
      )}

      {getKey() !== '' && (
        <button
          onClick={() => {
            clearKey()
            setV('')
            setDiag('Key removed from this browser.')
          }}
          className="mt-3 text-[12px] text-ink-soft hover:text-wrong"
        >
          Remove the stored key
        </button>
      )}
    </div>
  )
}

export function ChatBubble() {
  const open = useChat((s) => s.open)
  const messages = useChat((s) => s.messages)
  const pending = useChat((s) => s.pending)
  const error = useChat((s) => s.error)
  const selection = useChat((s) => s.selection)
  const overrides = useChat((s) => s.overrides)
  const moduleTitle = useChat((s) => s.state.moduleTitle as string | undefined)

  const s = useChat.getState
  const [hasKey, setHasKey] = useState(() => getKey() !== '')
  const [showKey, setShowKey] = useState(false)
  const [draft, setDraft] = useState('')
  const abortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages, pending])

  // A stream still running after the panel closes would setState into nothing.
  useEffect(() => {
    if (!open) abortRef.current?.abort()
  }, [open])
  useEffect(() => () => abortRef.current?.abort(), [])

  async function ask(text: string) {
    const q = text.trim()
    if (q === '' || s().pending) return
    setDraft('')
    s().addUser(q)
    s().startModel()
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac

    const sel = s().selection
    const context = buildContext({
      moduleTitle: s().state.moduleTitle as string | undefined,
      selection: sel?.text,
      page: s().state.pageText as string | undefined,
    })

    try {
      for await (const delta of streamAnswer(s().messages, context, ac.signal)) s().appendModel(delta)
      s().finish()
    } catch (e) {
      s().finish(e instanceof Error ? e.message : String(e))
    }
  }

  /** Swap this answer into the page, over whatever is currently selected. */
  function replaceWith(text: string) {
    const sel = s().selection
    if (!sel) return
    s().addOverride({
      id: crypto.randomUUID(),
      moduleId: sel.moduleId,
      find: sel.text,
      prefix: sel.prefix,
      replace: text.replace(FENCE, '').trim(),
    })
    s().setSelection(null)
  }

  if (!open) {
    return (
      <button
        onClick={() => s().setOpen(true)}
        aria-label="Ask a question"
        className="fixed right-5 bottom-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-[21px] font-semibold text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
      >
        ?
      </button>
    )
  }

  return (
    <div
      data-no-anno
      className="fixed right-5 bottom-5 z-40 flex max-h-[min(34rem,80vh)] w-[min(24rem,calc(100vw-2.5rem))] flex-col rounded-xl border border-line bg-bg shadow-2xl"
    >
      <header className="flex items-center gap-2 border-b border-line px-3.5 py-2.5">
        <span className="font-display text-[15px] font-semibold">Ask</span>
        {moduleTitle && <span className="min-w-0 flex-1 truncate text-[12px] text-ink-soft">{moduleTitle}</span>}
        <div className="ml-auto flex shrink-0 items-center gap-2 text-[12px] text-ink-soft">
          {messages.length > 0 && (
            <button onClick={() => s().reset()} className="hover:text-ink">
              Clear
            </button>
          )}
          {hasKey && (
            <button onClick={() => setShowKey(true)} className="hover:text-ink">
              Key
            </button>
          )}
          <button onClick={() => s().setOpen(false)} aria-label="Close chat" className="text-[15px] hover:text-ink">
            ✕
          </button>
        </div>
      </header>

      {!hasKey || showKey ? (
        <KeyPanel
          onDone={() => {
            setHasKey(getKey() !== '')
            setShowKey(false)
          }}
          onCancel={hasKey ? () => setShowKey(false) : undefined}
        />
      ) : (
        <>
          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-3.5 py-3 text-[14px]">
            {messages.length === 0 && (
              <p className="text-ink-soft">
                Ask anything about what you are reading. Select text on the page first to ask about that specific bit —
                and to be able to replace it with the answer.
              </p>
            )}
            {messages.map((m, i) =>
              m.role === 'user' ? (
                <p key={i} className="mt-3 rounded-lg bg-raised px-2.5 py-1.5 font-medium first:mt-0">
                  {m.text}
                </p>
              ) : (
                <div key={i} className="mt-2">
                  <Answer text={m.text} />
                  {m.text !== '' && !pending && selection && (
                    <button
                      onClick={() => replaceWith(m.text)}
                      className="mt-1 rounded border border-line px-2 py-0.5 text-[12px] text-ink-soft hover:border-accent hover:text-accent"
                    >
                      Replace selected text with this
                    </button>
                  )}
                </div>
              ),
            )}
            {pending && messages[messages.length - 1]?.text === '' && <p className="mt-2 text-ink-soft">Thinking…</p>}
            {error !== '' && <p className="mt-2 text-[13px] text-wrong">{error}</p>}
          </div>

          {selection && (
            <div className="flex items-center gap-2 border-t border-line px-3.5 py-1.5 text-[12px] text-ink-soft">
              <span className="min-w-0 flex-1 truncate">Selected: {selection.text}</span>
              <button onClick={() => void ask('Explain this.')} className="shrink-0 text-accent hover:underline">
                Explain
              </button>
            </div>
          )}

          {overrides.length > 0 && (
            <div className="flex items-center gap-2 border-t border-line px-3.5 py-1.5 text-[12px] text-ink-soft">
              <span>
                {overrides.length} replacement{overrides.length > 1 ? 's' : ''} this session
              </span>
              <button
                onClick={() => useChat.setState({ overrides: [] })}
                className="ml-auto text-accent hover:underline"
              >
                Restore original
              </button>
            </div>
          )}

          <div className="flex items-end gap-2 border-t border-line p-2.5">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void ask(draft)
                }
              }}
              rows={1}
              placeholder="Ask anything…"
              className="max-h-24 min-h-[2rem] flex-1 resize-none rounded-md border border-line px-2.5 py-1.5 text-[14px] outline-none focus:border-accent"
            />
            <button
              onClick={() => void ask(draft)}
              disabled={pending || draft.trim() === ''}
              className="rounded-md bg-accent px-3 py-1.5 text-[14px] font-medium text-white disabled:opacity-40"
            >
              Send
            </button>
          </div>
        </>
      )}
    </div>
  )
}
