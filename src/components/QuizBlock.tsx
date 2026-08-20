import { useState } from 'react'
import type { MCQ } from '@/content/types'

export function QuizBlock({ quiz }: { quiz: MCQ[] }) {
  const [picked, setPicked] = useState<Record<number, number>>({})
  const answered = Object.keys(picked).length
  const score = quiz.reduce((n, q, i) => (picked[i] === q.correct ? n + 1 : n), 0)

  return (
    <section className="my-8">
      <h2 className="text-xl font-bold">Quick quiz</h2>
      <div className="mt-3 space-y-5">
        {quiz.map((q, qi) => {
          const p = picked[qi]
          const done = p !== undefined
          return (
            <div key={qi} className="max-w-[75ch] rounded-lg border border-line p-4">
              <p className="font-medium">
                {qi + 1}. {q.question}
              </p>
              <div className="mt-2.5 space-y-1.5">
                {q.options.map((o, oi) => {
                  const isCorrect = oi === q.correct
                  const isPicked = p === oi
                  let cls = 'border-line hover:border-accent'
                  if (done && isCorrect) cls = 'border-correct bg-correct/5'
                  else if (done && isPicked) cls = 'border-wrong bg-wrong/5'
                  else if (done) cls = 'border-line opacity-60'
                  return (
                    <div key={oi}>
                      <button
                        disabled={done}
                        onClick={() => setPicked({ ...picked, [qi]: oi })}
                        className={`w-full rounded-md border px-3 py-2 text-left text-[15px] transition-colors ${cls}`}
                      >
                        {o.text}
                      </button>
                      {done && (
                        <p
                          className={`mt-1 mb-2 pl-3 text-sm ${
                            isCorrect ? 'text-correct' : isPicked ? 'text-wrong' : 'text-ink-soft'
                          }`}
                        >
                          {o.explanation}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
      {answered === quiz.length && quiz.length > 0 && (
        <p className="mt-4 font-medium">
          Score: {score}/{quiz.length}
          {score === quiz.length ? ' — clean sweep.' : ' — reread the ones you missed before moving on.'}
        </p>
      )}
    </section>
  )
}
