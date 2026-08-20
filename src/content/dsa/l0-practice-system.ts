import type { Module } from '../types'

const m: Module = {
  id: 'dsa-l0-practice-system',
  subjectId: 'dsa',
  level: 0,
  title: 'The Practice System — How to Actually Get Good',
  whyItMatters:
    'The syllabus tells you WHAT to learn. This module is the HOW: which problem lists, in what order, with what habits. People fail FAANG interviews after 1000 solved problems because they trained volume, not patterns. Twenty minutes here saves months of wasted grinding.',
  estMinutes: 20,
  sections: [
    {
      type: 'intuition',
      title: 'Grinding is not training',
      md: `A cricketer who plays 1000 street matches stays a street player. 400 net sessions with a coach's notebook builds a professional. Same ball, different system.

- Solving a problem is not learning it. Learning = you can name WHY the trick worked and spot the same trick wearing a different costume.
- The classic failure: 1000 problems, no notes, no re-solves. Six months later you *recognize* problems but cannot *solve* them. Recognition is not recall.
- The fix is a system with four parts: a **ladder** of problem lists, a **note template**, a **revision loop**, and three **interview meta-skills** trained like gym reps.
- The target: **~400–500 quality problems with pattern notes** — not 1000 random ones. A problem counts only when you extracted its pattern.`,
    },
    {
      type: 'intuition',
      title: 'The ladder — five rungs, climbed in order',
      md: `Each rung exists for ONE reason. Use it for that reason, then move up.

- **Striver A2Z sheet** — *structure*. The full syllabus in dependency order. Guarantees no topic gets skipped. Your spine.
- **NeetCode 150** — *patterns*. Curated so each problem teaches a named, reusable pattern, with videos. Your pattern vocabulary.
- **LeetCode top-interview + company-tagged** — *frequency*. What is actually asked, tuned to your target companies. Your exam syllabus.
- **CSES problem set** — *quality*. Clean statements, tight constraints, zero hints. Forces bug-free implementation under honest limits.
- **Weekly contests** (LeetCode weekly, Codeforces) — *pressure*. Unseen problems on a clock. The closest legal simulation of an interview.`,
    },
    {
      type: 'note',
      md: 'You do NOT finish 100% of every rung. The 400–500 target is the total across the whole ladder. When a rung stops teaching you new patterns — when problems start feeling like reruns — climb.',
    },
    {
      type: 'intuition',
      title: 'The pattern note — four lines or it did not happen',
      md: `After every solve (or failed solve), write exactly four lines. Ninety seconds. This is the difference between 400 problems that compound and 1000 that evaporate.

- **Trigger phrase** — the words in a problem statement that should fire this pattern. This is what your brain will actually search for in an interview.
- **Invariant** — the one property your algorithm keeps true the whole time. If you can state it, you can re-derive the code.
- **Complexity** — time AND space, of the best approach, with one reason word.
- **Gotcha** — the bug you hit or almost hit. Your personal trap list, worth more than any editorial.`,
    },
    {
      type: 'note',
      md: `Worked example — the note for *Longest Substring Without Repeating Characters*:

- **Trigger:** "longest substring/subarray satisfying a condition" → sliding window.
- **Invariant:** window [l..r] never contains a duplicate; r expands every step, l chases only when the invariant breaks.
- **Complexity:** O(n) time — each index enters and leaves the window at most once; O(k) space for the seen-set.
- **Gotcha:** shrink with a *while*, not an *if* — one new character can force several left-steps.`,
    },
    {
      type: 'intuition',
      title: 'Star it. Then beat it from memory.',
      md: `Re-reading an old solution feels like knowing. Re-solving it in a blank editor IS knowing. The star marks which problems get that treatment.

- Star a problem when: you needed the editorial, it took 40+ minutes, or the trick genuinely surprised you.
- Starred = scheduled: re-solve from memory after ~3 days, again after ~2 weeks. Spaced repetition, applied to code.
- Re-solve means blank editor, no peeking. Getting stuck again is the system working — that gap is exactly what it found.
- Stuck 30–40 minutes on a NEW problem with no fresh idea? Read the editorial *actively* — stop at the key idea and try to finish alone — then note, star, schedule. That is not cheating; unbounded struggle trains frustration, not patterns.`,
    },
    {
      type: 'intuition',
      title: 'The daily rhythm: 1 + 1',
      md: `Two problems a day, every day, beats fourteen every Sunday.

- **1 new problem** from your current ladder rung — moves the frontier.
- **1 revision problem** — a starred problem, re-solved from memory — locks the territory.
- The math: 2/day ≈ 60/month ≈ the full 400–500 target in about 7 months, retention included.
- Skipping revision to do two new problems feels faster and is slower — you are refilling a leaking bucket.`,
    },
    {
      type: 'intuition',
      title: 'Meta-skill 1: say your complexity out loud',
      md: `Interviewers cannot grade what stays in your head. The strongest one-line signal in any interview is an unprompted complexity statement.

- The script: state time AND space, with one reason clause. *"O(n log n) time — the sort dominates — and O(1) extra space."*
- Tiny dialogue. **You (unprompted):** "This runs in O(n) — each element enters and leaves the window once." **Interviewer:** "Why not O(n²)? There are two nested-looking loops." **You:** "The inner pointer only moves forward — n total steps across all iterations, not n per iteration."
- Read the constraints as a budget BEFORE coding: ~10⁸ simple operations per second. n ≤ 10⁵ → need O(n log n) or better. n ≤ 10³ → O(n²) fine. n ≤ 20 → even O(2ⁿ) survives.
- The trainable habit: after EVERY practice problem, say the complexity aloud, with its reason. Feels silly alone at a desk. Becomes automatic exactly when it counts.`,
    },
    { type: 'visual', component: 'BigOGrowthChart', props: {} },
    {
      type: 'intuition',
      title: 'Meta-skill 2: brute → better → best',
      md: `Never open with the optimal. Walk the ladder out loud — it shows reasoning, and it leaves working code on the table if the clever version stalls.

- Two Sum, narrated: **Brute** — "check all pairs, O(n²). Let me do better." (one sentence, never coded). **Better** — "sort + two pointers, O(n log n) — but sorting loses the original indices." **Best** — "one-pass hash map: for each x, look up target−x. O(n) time, O(n) space."
- Each step names its complexity AND the reason it is not good enough — that sentence is the whole performance.
- Sometimes brute IS the answer: n ≤ 100 makes O(n²) fine, and saying so shows judgment, not weakness.
- The trainable habit: your pattern note's complexity line records all three levels, even when you only coded the best.`,
    },
    {
      type: 'intuition',
      title: 'Meta-skill 3: the follow-up is the real interview',
      md: `The first solution proves you practiced. The follow-up proves you understood. Interviewers mutate the problem on purpose.

- Tiny dialogue, after you finish Two Sum. **Interviewer:** "Now the array is sorted." **You:** "Then I drop the hash map — two pointers, O(n) time, O(1) space." **Interviewer:** "Now the numbers arrive as a stream." **You:** "Keep a running hash set of what I've seen — still O(1) per element, but no multiple passes."
- The move is always the same: ask *what changed*, restate what that breaks (random access? extra memory? second pass?), and adapt the invariant — never restart from zero.
- Follow-ups are where memorizers die: they learned THE answer, not the pattern that generated it.
- The trainable habit: after each practice problem, open 2–3 of its listed related problems and answer one question — "what changes?"`,
    },
    {
      type: 'note',
      md: `Where this site slots into the loop:

- After each module here: drill its **flashcards** until answers are instant — they hold exactly the trigger phrases and complexities your pattern notes will reuse.
- Weekly: sweep the subject **mind map** and re-derive one fact from every node. Blank nodes tell you what to revise — before an interviewer does.
- Cannot picture an algorithm's motion? [VisuAlgo](https://visualgo.net) animates it step by step — watch it once, then re-solve.
- Division of labor: flashcards = triggers and costs, mind maps = structure, problems = the actual muscle.`,
    },
  ],
  quiz: [
    {
      question: 'The target is ~400–500 problems, not 1000. What makes a solved problem actually COUNT toward it?',
      options: [
        { text: 'It was rated Hard', explanation: 'Difficulty labels are not the metric — an extracted pattern from a Medium beats a fluked Hard.' },
        { text: 'You wrote its pattern note and could re-solve it from memory', explanation: 'Correct. Quality = extraction + retention. Without the note and the re-solve, the problem evaporates.' },
        { text: 'You watched the full editorial video', explanation: 'Watching is recognition, not recall. It feels like learning and fades in days.' },
        { text: 'It came from a famous sheet', explanation: 'The sheets order the work; they do not make it stick. The note and re-solve do.' },
      ],
      correct: 1,
    },
    {
      question: 'You just solved a sliding-window problem in 35 minutes. Per the system, the very next action is…',
      options: [
        { text: 'Start the next new problem immediately', explanation: 'Volume thinking. You just skipped the 90 seconds that make the last 35 minutes permanent.' },
        { text: 'Write the four-line pattern note: trigger → invariant → complexity → gotcha', explanation: 'Correct. The note is written right after every solve, while the trap you almost fell into is still fresh.' },
        { text: 'Re-solve it from memory right now', explanation: 'Immediate re-solving only echoes short-term memory. The re-solve is scheduled days later — that gap is what tests real recall.' },
        { text: 'Watch three video solutions for alternative approaches', explanation: 'Sometimes useful, never first. Extraction of YOUR solve comes before consuming others.' },
      ],
      correct: 1,
    },
    {
      question: 'Which rung of the ladder exists specifically to train the interview clock — unseen problems under time pressure?',
      options: [
        { text: 'Striver A2Z sheet', explanation: 'A2Z is structure — complete topic coverage in dependency order, untimed.' },
        { text: 'NeetCode 150', explanation: 'NeetCode is pattern vocabulary — curated and explained, not timed.' },
        { text: 'CSES problem set', explanation: 'CSES trains clean implementation under tight constraints — but on your own schedule.' },
        { text: 'Weekly contests (LeetCode weekly, Codeforces)', explanation: 'Correct. A contest is unseen problems on a clock — the closest simulation of a real interview round.' },
      ],
      correct: 3,
    },
    {
      question: 'When does a problem earn a star?',
      options: [
        { text: 'Every problem you solve, to be safe', explanation: 'Starring everything dilutes the revision queue until it is useless. Stars mark the gaps, not the history.' },
        { text: 'You needed the editorial, took 40+ minutes, or the trick surprised you', explanation: 'Correct. A star means "my recall failed here" — and schedules a from-memory re-solve at ~3 days and ~2 weeks.' },
        { text: 'Only problems rated Hard', explanation: 'The label is irrelevant. An Easy that fooled you is a gap; a Hard you cruised through is not.' },
        { text: 'Problems you solved quickly, to build confidence', explanation: 'Backwards — fast clean solves need the LEAST revision. Stars go where the struggle was.' },
      ],
      correct: 1,
    },
    {
      question: 'In the daily "1 new + 1 revision" rhythm, the revision slot means…',
      options: [
        { text: 'Re-read your old solution and nod along', explanation: 'Re-reading produces recognition, which impersonates knowledge. Interviews test recall from a blank editor.' },
        { text: 'Re-solve a starred problem from memory in a blank editor', explanation: 'Correct. No peeking. Getting stuck again is the system successfully finding a gap before an interviewer does.' },
        { text: 'Watch a recap video on the topic', explanation: 'Passive input. The revision slot is output — code produced from memory.' },
        { text: 'Solve a brand-new problem on an old topic', explanation: 'That is a second NEW problem. Useful, but it does not verify you retained the specific starred patterns.' },
      ],
      correct: 1,
    },
    {
      question: 'Constraints say n ≤ 10⁵. Before writing any code, your complexity budget is roughly…',
      options: [
        { text: 'O(n²) is fine', explanation: 'That is 10¹⁰ operations against a ~10⁸ ops/sec budget — a guaranteed TLE, off by 100×.' },
        { text: 'O(n log n) or better', explanation: 'Correct. n log n ≈ 1.7×10⁶ — comfortable. Reading the constraint as a budget BEFORE coding is meta-skill 1 in action.' },
        { text: 'Only O(1) or O(log n) will pass', explanation: 'Over-strict — you usually must at least read the input, which is already O(n).' },
        { text: 'Constraints only matter after you TLE', explanation: 'Constraints are the interviewer\'s hint about the intended solution. Reading them late means coding the wrong approach first.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Case: you have been stuck on a practice problem for 25 minutes with no fresh idea. What do you do at minute 26?',
      answer:
        'One last structured pass, then a controlled exit. Minute 26: restate the constraints, compute the complexity budget (n ≤ 10⁵ → the intended answer is O(n log n) or better), and scan the statement for trigger phrases — "longest substring", "smallest X that works", "k-th largest" — asking which pattern family they point at. If nothing fires by ~minute 35–40: read the editorial ACTIVELY — stop at the key idea, close it, try to finish alone — then write the pattern note, star the problem, and schedule a from-memory re-solve in 3 days. Unbounded struggle trains frustration; instant peeking trains nothing; the cap-and-star loop trains patterns. (In a live interview the protocol changes: keep talking — restate, propose the brute force with its complexity, solve a smaller version. Silence is the only unrecoverable state.)',
      isCaseBased: true,
    },
    {
      question: 'Case: your solution TLEs at n = 10⁵. Walk me through what you do next.',
      answer:
        'First, translate the constraint into a budget: ~10⁸ simple ops/sec means n = 10⁵ demands O(n log n) or O(n); a TLE there almost certainly means I wrote O(n²). Second, locate the n² — it is nearly always a linear search inside a linear loop. Third, apply the standard downgrades to that inner search: hash map (O(n) lookup → O(1)), sort + two pointers, a heap for repeated min/max, prefix sums for repeated range sums, sliding window for contiguous conditions, or binary search on the answer for monotonic "min X that works". The sentence to say out loud: "I need to remove a factor of n from the inner step." That names the plan before the code.',
      isCaseBased: true,
    },
    {
      question: 'Case: you present an optimal in-memory solution and the interviewer says "now the input arrives as a stream and does not fit in memory." How do you react?',
      answer:
        'Not by restarting. The follow-up move is: ask what changed, state what it breaks, adapt the invariant. Streaming breaks random access and multiple passes — so any sort or second loop is gone. The adaptation is a running structure updated per element: a hash set for membership, a size-k heap for top-k (O(log k) per element, O(k) memory), a monotonic deque for sliding extremes. I would state the new costs explicitly — "O(log k) per element, memory bounded by k, independent of stream length" — because the follow-up is testing whether I own the pattern or memorized one answer to one problem. This reaction is trainable: after every practice problem, open its related problems and answer "what changes?"',
      isCaseBased: true,
    },
    {
      question: 'How do you structure your DSA preparation? (Asked in screens more often than people expect.)',
      answer:
        'A ladder, a target, and a loop. Ladder: Striver A2Z for complete structure → NeetCode 150 for pattern vocabulary → LeetCode top-interview and company-tagged for frequency → CSES for implementation quality → weekly LeetCode/Codeforces contests for time pressure. Target: ~400–500 quality problems, where "quality" means each has a four-line pattern note (trigger → invariant → complexity → gotcha) and survives a from-memory re-solve. Loop: 1 new + 1 revision problem daily. The tradeoff I accepted deliberately: fewer total problems, far higher retention — 400 extracted patterns beat 1000 evaporated solves.',
      isCaseBased: false,
    },
    {
      question: 'How should a candidate communicate complexity during a solution — and how do you train that?',
      answer:
        'Unprompted, both dimensions, with a reason clause: "O(n log n) time — the sort dominates — and O(1) extra space." Never wait to be asked; the unprompted statement is the signal. Also read constraints as a budget before coding — n ≤ 10⁵ means O(n log n) or better at ~10⁸ ops/sec — and say the budget out loud so the interviewer sees the plan precede the code. Training is embarrassingly literal: after every practice problem, say the complexity aloud with its reason, alone at your desk. It feels silly for a week, then becomes the automatic first sentence of every solution.',
      isCaseBased: false,
    },
    {
      question: 'Why present brute → better → best instead of jumping straight to the optimal solution you already know?',
      answer:
        'Three reasons. Signal: the interviewer grades the reasoning path, and the ladder shows you derive solutions rather than recall them. Safety: if the optimal stalls mid-implementation, the stated brute force is working code you can fall back to — a hung interview with no code fails; a working O(n²) with a described O(n) plan often passes. Judgment: sometimes brute IS correct — n ≤ 100 makes O(n²) fine, and saying so shows engineering sense. The Two Sum script: "all pairs is O(n²); sort + two pointers is O(n log n) but loses indices; one-pass hash map is O(n) time, O(n) space." Each rung is one sentence naming its cost and its flaw.',
      isCaseBased: false,
    },
    {
      question: 'What goes into a pattern note, and why exactly those fields?',
      answer:
        'Four lines. Trigger phrase — the statement words that should fire the pattern ("longest substring with condition" → sliding window), because interviews are a retrieval task and triggers are the index. Invariant — the property kept true throughout (window never holds a duplicate), because an invariant lets you re-derive code instead of memorizing it. Complexity — time and space with one reason word, because that sentence is mandatory in every interview. Gotcha — the bug you personally hit (shrink with while, not if), because your own traps repeat and editorials never list them. Ninety seconds per problem; it converts a solve into an asset.',
      isCaseBased: false,
    },
    {
      question: 'How do you make sure you can still solve a problem you did two months ago?',
      answer:
        'By never trusting recognition. Starred problems — the ones where recall failed the first time — get re-solved from a blank editor, from memory, on a spaced schedule: ~3 days, then ~2 weeks. The daily rhythm reserves one of two slots for exactly this. Between re-solves, flashcards keep trigger phrases and complexities warm cheaply, and a weekly mind-map sweep (re-derive one fact per node) finds decayed areas before an interviewer does. The honest tradeoff: revision spends time that could add new problems — and it is still the better trade, because an interview is a recall exam, not a recognition exam.',
      isCaseBased: false,
    },
    {
      question: 'Interviews are not competitive programming — so why do weekly contests at all?',
      answer:
        'For the one thing sheets cannot give: unseen problems on a running clock. Contests train pacing (when to bail on an approach), pressure tolerance (thinking while the timer visibly drains), and honest implementation speed — Codeforces in particular punishes sloppy edge cases that a LeetCode judge with weak tests would forgive. The boundary to respect: contests are the exam, sheets are the classes. Contest-only practice produces speed without breadth; sheet-only practice produces knowledge that collapses under a clock. One contest a week on top of the daily 1+1 rhythm is the balanced dose.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'The practice ladder, in order', back: 'Striver A2Z (structure) → NeetCode 150 (patterns) → LeetCode top-interview + company-tagged (frequency) → CSES (quality) → weekly contests (pressure).' },
    { front: 'The target number — and the rule behind it', back: '~400–500 QUALITY problems with pattern notes, not 1000 random. A problem counts when it has a note and survives a from-memory re-solve.' },
    { front: 'Pattern-note template (4 lines)', back: 'Trigger phrase → invariant → complexity (time + space + reason) → gotcha. Written immediately after every solve.' },
    { front: 'When to star a problem', back: 'Needed the editorial, took 40+ minutes, or the trick surprised you. Starred = scheduled for from-memory re-solves at ~3 days and ~2 weeks.' },
    { front: 'Daily rhythm', back: '1 new problem (current ladder rung) + 1 revision (starred problem, blank editor, from memory). 2/day ≈ target in ~7 months.' },
    { front: 'The three interview meta-skills', back: '(1) Say complexity out loud — time AND space, unprompted, with a reason. (2) Brute → better → best, each with its cost. (3) Follow-ups: ask "what changed?", adapt the invariant.' },
    { front: 'Complexity budget from constraints', back: '~10⁸ simple ops/sec. n ≤ 10⁵ → O(n log n) or better · n ≤ 10³ → O(n²) fine · n ≤ 20 → O(2ⁿ) survives. Read BEFORE coding.' },
    { front: 'Stuck protocol (practice)', back: 'Cap at ~30–40 min → read editorial actively (stop at the key idea, finish alone) → pattern note → star → re-solve from memory in 3 days.' },
  ],
  mindmapMarkdown: `- The Practice System — How to Actually Get Good
  - The ladder (in order)
    - Striver A2Z — structure
    - NeetCode 150 — patterns
    - LC top-interview + company tags — frequency
    - CSES — quality
    - Contests (LC weekly, Codeforces) — pressure
  - Target: 400–500 with notes ≫ 1000 random
  - Pattern note (4 lines)
    - Trigger phrase
    - Invariant
    - Complexity + reason
    - Gotcha
  - Starred problems
    - Star: editorial / 40+ min / surprise
    - Re-solve from memory: 3 days, 2 weeks
  - Daily rhythm: 1 new + 1 revision
  - Meta-skills
    - Complexity out loud + constraint budget
    - Brute → better → best
    - Follow-ups: ask "what changed?"
  - Site tools
    - Flashcards after each module
    - Weekly mind-map sweep
    - VisuAlgo for algorithm motion`,
}

export default m
