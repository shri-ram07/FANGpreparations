import type { Module } from '../types'

const m: Module = {
  id: 'prep-l1-company-research',
  subjectId: 'prep',
  level: 1,
  title: 'Company Research: Google, Meta & Amazon',
  whyItMatters:
    'Two candidates with identical skills should spend their final month differently depending on where they are interviewing. That allocation decision is the entire point of company research — not memorising trivia about round counts. This module gives you what these companies publicly document, labels the rest honestly, and turns it into a four-week plan and a story-to-Leadership-Principle matrix you can fill in tonight.',
  estMinutes: 45,
  sections: [
    {
      type: 'intuition',
      title: 'Research is an allocation decision, not trivia',
      md: `Two candidates. Same DSA level, same projects, same three weeks left. One is interviewing at Amazon, one at Google. If they study identically, at least one of them is wasting the three weeks.

- Company research answers exactly one question: **where do my remaining hours go?** Everything else is gossip with a company logo on it.
- Knowing "Amazon has Leadership Principles" is worth nothing. Having eight stories tagged against those principles, with the empty rows found, is worth a great deal.
- The test for any fact you read: *does it change what I do tomorrow morning?* If not, drop it and move on.
- Facts about a process expire. Skills built *because of* a fact do not — DSA fluency, narration and honest stories survive any process change.
- So this module runs in one direction: what is documented → what that implies you should practise → a schedule.`,
    },
    {
      type: 'note',
      md: `Read this before the rest. Hiring processes change, and they vary by team, org, level and country. Much of what circulates online is one person\'s anecdote from one loop two years ago, repeated until it sounds like policy.

- Everything below is either **publicly documented by the company** or **widely and consistently reported** — labelled as such wherever it appears.
- No round counts, durations, scoring rubrics or internal committee mechanics are stated here as fact. Those are exactly the parts that vary and change.
- Your **recruiter** is the single most reliable source for the current process for *your* role, at *your* level, in *your* location. They expect this question; answering it is part of their job.
- The durable content of this module is the **preparation strategy**. If a detail here goes stale, the strategy still holds.`,
    },
    {
      type: 'intuition',
      title: 'Google — algorithms, plus a publicly named "Googleyness"',
      md: `*Publicly documented:* Google describes its own hiring on its careers site — including that candidates are assessed on more than coding, and that hiring decisions go through **committee review** rather than resting with the interviewers alone. That single documented fact matters: you are writing for a reader who was not in the room, so what your interviewer can *write down* about you is the actual output of the hour.

- *Widely and consistently reported:* the coding rounds lean hard on data structures and algorithms, with a genuine bar on **clean, correct code** — not just the right idea gestured at.
- *Publicly named by Google:* "Googleyness and Leadership". Their own material describes it in terms like comfort with ambiguity, collaboration, and intellectual humility. Treat it as a real part of the loop, not a formality.
- The behaviour that maps to it: saying "I do not know — here is how I would find out" without flinching, and changing course when given a hint instead of defending a wrong approach.
- Hints are data, not charity. An interviewer who nudges you is spending their hour on you; taking the nudge well is signal, and ignoring it is also signal.
- Thinking out loud is not a personality trait. It is a trained motor skill, and it is trained the boring way.`,
    },
    {
      type: 'note',
      md: `Preparing for a Google-weighted loop — two things, trained separately.

- **Depth on the DSA ladder.** Work this site\'s DSA subject in order. Reread *The Practice System — How to Actually Get Good* first: it is the difference between 400 problems that compound and 1000 that evaporate.
- **Narration.** Solve at least one problem a day *out loud*, alone, to a wall or a recording. Brute force and its cost, then the improvement and its cost, then code. It feels ridiculous for a week and then it is automatic.
- **Hint rehearsal.** Have a peer interrupt you mid-solve with a suggestion, sometimes a bad one. Practise engaging with it — restate it, name what it buys and costs — instead of steamrolling.
- **Code quality.** Name the variables, handle the empty input, say what you would test. The "well-reasoned code" bar is mostly these three habits.`,
    },
    {
      type: 'intuition',
      title: 'Meta — speed, and reasoning about the product',
      md: `*Publicly documented:* Meta publishes interview-preparation material on its careers site and points candidates at coding, design and behavioural preparation.

- *Widely and consistently reported:* the coding bar rewards **arriving at a working solution with time left to improve it**, rather than a beautiful solution delivered at the buzzer. Pace is part of what is being observed.
- *Widely reported:* candidates who reason about **users and product tradeoffs** do better — and ML or product-flavoured roles probe *why a feature exists*, not only how you would build it.
- The question behind the question: "what would you build" is usually also "what should this move, and how would you know it moved".
- If you cannot name the metric a feature is supposed to improve, you are describing an implementation, not a product decision. That gap is visible from across the table.
- One more honest note: "speed" here means not stalling, not typing fast. A candidate who spends four minutes clarifying and then writes steadily is fast.`,
    },
    {
      type: 'note',
      md: `Preparing for a Meta-weighted loop.

- **Timed practice.** Two mediums in roughly 35 minutes total, on a visible clock. Untimed practice does not train the thing being tested; it trains a different thing that feels similar.
- **Bias toward shipping.** Get the working solution on the board, state its complexity, *then* optimise out loud. A stalled elegant attempt scores worse than a working ordinary one plus a stated improvement.
- **Metric reasoning.** The Metrics subject\'s *Pick the Metric: Case Studies That Decide the Interview* is the exact drill: given a feature, choose what it should move, and defend it against a guardrail metric.
- **A cheap daily rep.** Pick three products you actually use. For each, say in one sentence what its main metric probably is, and one way that metric could be gamed by a bad feature.`,
    },
    {
      type: 'intuition',
      title: 'Amazon — the Leadership Principles are the syllabus',
      md: `*Publicly documented:* Amazon publishes its Leadership Principles on its jobs site and states that they are used in hiring. This is the rare case where a company hands you the rubric in advance.

- At the time of writing the published list has sixteen: Customer Obsession, Ownership, Invent and Simplify, Are Right A Lot, Learn and Be Curious, Hire and Develop the Best, Insist on the Highest Standards, Think Big, Bias for Action, Frugality, Earn Trust, Dive Deep, Have Backbone (Disagree and Commit), Deliver Results, Strive to be Earth\'s Best Employer, and Success and Scale Bring Broad Responsibility.
- The list has been added to over the years. Check amazon.jobs for the current wording before you build anything on it — including this matrix.
- *Publicly discussed by Amazon, and widely reported:* the **Bar Raiser**, an interviewer from outside the hiring team whose role is to hold the hiring standard. Do not model the internal mechanics. Do assume at least one person in your loop is not motivated to fill this specific role quickly.
- *Widely reported:* behavioural questions are asked against these principles, and follow-ups dig for specifics — your numbers, your decision, what *you* personally did. "Dive Deep" is itself a principle; expect to be dived into.
- Say "I" where you mean I. "We" is the most common way a strong story quietly loses its owner.`,
    },
    {
      type: 'note',
      md: `The actionable core: do not *learn* the principles. **Map your stories onto them, then hunt the holes.**

- Write the stories first. *Behavioral Interviews: Eight STAR Stories From Your Own Work* covers how to build them — this module does not re-teach STAR.
- Then build a matrix: your stories on one axis, the published principles on the other. Tag a story with a principle only when the story\'s **specific actions** demonstrate it. Two or three tags per story, not six.
- Invert it. For every principle, list the stories that cover it. The empty rows are your prep list, in priority order.
- Fill gaps by **mining, not inventing**. The moment almost always already happened somewhere in your own project history; you simply never wrote it down. An invented story dies on the third follow-up.`,
    },
    {
      type: 'code',
      lang: 'yaml',
      title: 'story-lp-matrix.yaml — the coverage file you actually fill in',
      code: `# story-lp-matrix.yaml — keep it in your notes; update it as the stories improve.
# Rule: a story goes under a principle ONLY if the story's specific ACTIONS show
# it. "Customer Obsession, because the project had users" does not count.

stories:
  rag-latency-cut:
    one_line: "Cut p95 retrieval latency from 2.4s to 380ms by re-chunking + caching."
    strongest_signal: Dive Deep
    covers:
      - Dive Deep                        # profiled each stage, found the real bottleneck
      - Insist on the Highest Standards
      - Deliver Results
    weak_for:
      - Think Big                        # scope was one service — do not claim it

  labelling-disagreement:
    one_line: "Argued against a label taxonomy, lost, implemented it, brought data back."
    strongest_signal: Have Backbone (Disagree and Commit)
    covers:
      - Have Backbone (Disagree and Commit)
      - Earn Trust
      - Are Right A Lot

  model-rollback:
    one_line: "Shipped a model that hurt one user segment; caught it, rolled back, wrote the postmortem."
    strongest_signal: Ownership
    covers:
      - Ownership
      - Customer Obsession
      - Learn and Be Curious

# Every principle on the published list gets a row. Then count what is in it.
coverage:
  Customer Obsession: [model-rollback]
  Ownership: [model-rollback]
  Invent and Simplify: []
  Are Right A Lot: [labelling-disagreement]
  Learn and Be Curious: [model-rollback]
  Hire and Develop the Best: []
  Insist on the Highest Standards: [rag-latency-cut]
  Think Big: []
  Bias for Action: []
  Frugality: []
  Earn Trust: [labelling-disagreement]
  Dive Deep: [rag-latency-cut]
  Have Backbone (Disagree and Commit): [labelling-disagreement]
  Deliver Results: [rag-latency-cut]
  Strive to be Earth's Best Employer: []
  Success and Scale Bring Broad Responsibility: []

gaps:
  # The empty rows worth fixing first, turned into homework. Fill by MINING your own
  # history — the moment already happened — never by inventing a story.
  - principle: Bias for Action
    fix: "A time you shipped with incomplete information. Name what you did not know."
  - principle: Think Big
    fix: "A time you argued for the bigger version of a plan — even if it was rejected."
  - principle: Hire and Develop the Best
    fix: "Mentoring, onboarding, a review that changed how someone worked. Juniors count."
  - principle: Frugality
    fix: "A cost or compute limit you designed around. GPU budget, free tier, one laptop."
  - principle: Invent and Simplify
    fix: "A time you deleted complexity rather than adding it. Note: the latency story is
          tempting here, but its actions were profiling and caching — that is Dive Deep.
          Tagging it twice is exactly the inflation this file exists to prevent."`,
      annotations: {
        2: 'The whole file is worthless without this rule. Loose tagging produces a matrix with no empty rows and no information.',
        10: 'The inline comment is the evidence. If you cannot write one clause naming the ACTION that shows the principle, the tag is not real.',
        13: 'weak_for is the honest half. Writing down what a story does NOT prove stops you reaching for it under pressure and getting dived into.',
        33: 'This block inverts the index: stories-to-principles becomes principles-to-stories. The inversion is where the gaps become visible.',
        39: 'An empty list is the finding, not a failure. It means one question in the loop currently has no answer behind it.',
        52: 'Mining beats inventing on every axis. A real moment survives "what exactly did you say?" — an invented one does not survive the second follow-up.',
      },
    },
    {
      type: 'intuition',
      title: 'The boring part is where most of the value sits',
      md: `Company-specific tuning is the last 20% of your preparation. Here is the 80% that pays at all three — and at every company that is not one of the three.

- **DSA fluency.** Not company-specific, the price of entry nearly everywhere, and the slowest thing to build. It never leaves the schedule, whatever your target.
- **Clear communication.** Think out loud, state complexity unprompted, ask clarifying questions before writing code. This is graded in every loop and rehearsed by almost nobody.
- **One or two projects you can defend to the bottom.** Why this model, why this database, what broke, what you would change. Depth on two beats a resume list of eight.
- **An honest failure story.** A real failure with a real lesson lands better everywhere than a disguised humblebrag. "I work too hard" is heard as "I have not thought about this".
- **Good questions at the end.** About the team\'s actual work and current problems. The weak questions are the ones already answered on the careers page.`,
    },
    {
      type: 'intuition',
      title: 'Where an ML-flavoured candidate actually differentiates',
      md: `For ML, data-science and AI-engineer flavours of these roles, the DSA bar generally does not disappear — a second bar gets stacked on top of it. That second bar is where you win, because fewer candidates clear it.

- **ML depth** — the ML, DL and GenAI subjects here. Expect "why this loss", "why this architecture", "what happens if you remove this".
- **ML system design** — the System Design module *Case Study: Recommendations & LLM Serving at Scale* is the closest thing on this site to that round: candidate generation and ranking, features, training/serving skew, latency budgets, and how the thing gets retrained.
- **Metric reasoning** — offline metric versus online metric versus guardrail; what you would ship on, and what you would roll back on.
- The differentiator sentence to be able to say out loud: *"the model was the easy part — here is what made it survive in production."*
- This is also what makes a Meta product question and an Amazon Dive Deep follow-up easy in the same week: you have real numbers from a system you actually ran.`,
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'One candidate, four weeks, allocated three ways',
        notice: 'Same person, same skills, same 4 weeks. Only the target changed. Watch which block grows and which one shrinks — nothing is added, hours are moved.',
        leftLabel: 'The four weeks',
        rightLabel: 'Where the hours go',
        frames: [
          {
            note: 'Frame 0 — the neutral baseline. No target chosen yet, so every bucket gets roughly equal weight. This is the plan you adapt, never the plan you follow.',
            stack: [
              { name: 'Week 1', to: 'dsa' },
              { name: 'Week 2', to: 'sd' },
              { name: 'Week 3', to: 'ml' },
              { name: 'Week 4', to: 'story' },
            ],
            heap: [
              { id: 'dsa', value: 'DSA — 2 timed problems/day', label: 'about 35%' },
              { id: 'sd', value: 'System design — 2 mocks/week', label: 'about 25%' },
              { id: 'ml', value: 'ML depth + metric reasoning', label: 'about 20%' },
              { id: 'story', value: 'Stories + project defence', label: 'about 20%' },
            ],
          },
          {
            note: 'Google-weighted. DSA grows — the reported emphasis is algorithmic depth with clean, correct code. Narration becomes its own line item, because thinking out loud is trained, not innate. Stories stay on the board: Googleyness and Leadership is a publicly named part of the process.',
            stack: [
              { name: 'Week 1', to: 'dsa' },
              { name: 'Week 2', to: 'dsa' },
              { name: 'Week 3', to: 'narrate' },
              { name: 'Week 4', to: 'story' },
            ],
            heap: [
              { id: 'dsa', value: 'DSA — hard tier, timed, daily', label: 'GROWS to about 45%' },
              { id: 'narrate', value: 'Narrated solves + hint rehearsal', label: 'NEW, about 15%' },
              { id: 'sd', value: 'System design', label: 'shrinks to about 15%' },
              { id: 'ml', value: 'ML depth + metrics', label: 'about 10%' },
              { id: 'story', value: 'Collaboration + ambiguity stories', label: 'about 15%' },
            ],
          },
          {
            note: 'Meta-weighted. The widely reported emphasis is speed and product sense, so timed medium sets replace slow grinding on hard problems, and metric reasoning gets real hours: for any feature, what should it move and how would you know.',
            stack: [
              { name: 'Week 1', to: 'timed' },
              { name: 'Week 2', to: 'timed' },
              { name: 'Week 3', to: 'product' },
              { name: 'Week 4', to: 'product' },
            ],
            heap: [
              { id: 'timed', value: 'Timed DSA — 2 mediums in 35 min', label: 'GROWS to about 40%' },
              { id: 'product', value: 'Product sense + picking the metric', label: 'GROWS to about 25%' },
              { id: 'sd', value: 'System design, incl. ML systems', label: 'about 20%' },
              { id: 'story', value: 'Stories + project defence', label: 'shrinks to about 15%' },
            ],
          },
          {
            note: 'Amazon-weighted. The Leadership Principles are published and behavioural questions map to them, so the story matrix becomes the single biggest block. DSA does not vanish — it simply stops being the thing you add hours to.',
            stack: [
              { name: 'Week 1', to: 'matrix' },
              { name: 'Week 2', to: 'matrix' },
              { name: 'Week 3', to: 'dsa' },
              { name: 'Week 4', to: 'rehearse' },
            ],
            heap: [
              { id: 'matrix', value: 'Story x LP matrix — write, tag, fill gaps', label: 'GROWS to about 40%' },
              { id: 'rehearse', value: 'Out-loud rehearsal + Dive Deep drilling', label: 'NEW, about 15%' },
              { id: 'dsa', value: 'DSA — maintenance, 2/day', label: 'holds at about 30%' },
              { id: 'sd', value: 'System design', label: 'shrinks to about 15%' },
            ],
          },
          {
            note: 'The anti-pattern: grind LeetCode for all three, prepare no stories. It feels productive because the problem counter goes up every day. It fails the one round that happens at all three — where a human asks you about your own work — and you never learned what your loop even contains.',
            stack: [
              { name: 'Week 1', to: 'grind', danger: true },
              { name: 'Week 2', to: 'grind', danger: true },
              { name: 'Week 3', to: 'grind', danger: true },
              { name: 'Week 4', to: 'grind', danger: true },
            ],
            heap: [
              { id: 'grind', value: 'LeetCode — untimed, silent, unnarrated', label: '100% of the hours' },
              { id: 'gap1', value: 'Stories: none written', label: 'guaranteed round, zero prep', danger: true },
              { id: 'gap2', value: 'Project defence: never rehearsed', label: 'asked everywhere', danger: true },
              { id: 'gap3', value: 'Recruiter: never asked what the loop contains', label: 'free information, unclaimed', danger: true },
            ],
          },
        ],
      },
    },
    {
      type: 'intuition',
      title: 'The final four weeks — a template to adapt, not a law',
      md: `Built on the practice cadence in the study plan: two timed DSA problems a day, two mock designs a week, mocks with peers. Change the weights by target; keep the cadence.

1. **Week 1 — baseline and inventory.** Two timed DSA problems/day. One mock design. Write the story list (titles only, no polish) and build the story-to-principle matrix. By Sunday you know your gaps instead of guessing at them.
2. **Week 2 — fill the biggest gap.** Same DSA cadence. Two mock designs. The extra hours go wherever week 1 exposed weakness — usually stories for Amazon, hard-tier DSA for Google, the clock for Meta.
3. **Week 3 — under conditions.** Everything timed and out loud, with peers where you can get them: mock coding rounds, two mock designs, stories rehearsed aloud rather than read.
4. **Week 4 — taper and consolidate.** Re-solve starred problems from memory, one full mock loop, re-read your own project\'s numbers until they are recall not lookup. No new topics. Sleep is a performance input.`,
    },
    {
      type: 'note',
      md: `Adapting the template honestly.

- Only three weeks? Drop week 2, not week 1. Knowing your gaps is what makes the remaining time count; skipping the inventory means optimising blind.
- Interviewing at two of the three in the same month? Keep the shared 80% (DSA, communication, project defence) as the spine, and swap only the top block — the story matrix or the timed sets — in the week before each loop.
- If a mock exposes something ugly, the schedule loses to the mock. The plan is a default, and a measured weakness always outranks a default.`,
    },
    {
      type: 'intuition',
      title: 'The durable skill: researching any company in an hour',
      md: `Company facts expire. The method does not, and it works for the fourth company nobody wrote a blog post about. Five sources, in order of signal.

- **The job description, read word by word.** It names the actual stack and the actual responsibilities. "Experience with recommendation systems" in a JD is a promise that you will be asked about recommendation systems.
- **The company\'s own engineering blog.** What they publish is what they are proud of and what they are currently fighting — and it hands you one specific, non-generic question to ask at the end.
- **Their published interview-prep material.** Google, Meta and Amazon all publish some. Read the primary source instead of a summary of a summary of it.
- **Recent public launches.** One recent launch you can discuss intelligently beats a memorised company history every time.
- **The recruiter.** Highest signal, lowest cost, most consistently under-used source in the entire process.`,
    },
    {
      type: 'note',
      md: `Ask the recruiter these on the intro call. They are normal questions asked every day; asking reads as preparation, not presumption.

- What does the loop look like for this role — how many rounds, and what is each one?
- Is there a system design round, and is it general system design or ML system design?
- Which language should I use, and is it a shared editor or a whiteboard?
- How much of the loop is behavioural, and is there anything specific I should prepare for it?
- What does this team actually work on day to day, and what would I own first?
- Is there anything candidates for this role commonly under-prepare for?

Then act on the answers. They are more current than anything you will read online — including this module.`,
    },
  ],
  quiz: [
    {
      question: 'You have three weeks and an Amazon onsite scheduled. What do you do FIRST?',
      options: [
        {
          text: 'Memorise all sixteen Leadership Principles word for word',
          explanation: 'Reciting the list is not what gets asked. You get asked for stories; the principles are the index, not the content. Memorising costs an evening and changes nothing.',
        },
        {
          text: 'Add a third daily LeetCode problem',
          explanation: 'DSA still matters, but it is the bucket you were already training. The published, Amazon-specific requirement is behavioural coverage — and that takes longest from a standing start.',
        },
        {
          text: 'Write your story list, tag each story against the published principles, and work the empty rows',
          explanation: 'Correct. The inventory takes one evening and converts three weeks of guessing into a prioritised list. Empty rows are questions you currently cannot answer.',
        },
        {
          text: 'Read a dozen interview experiences online to reconstruct the round order',
          explanation: 'Anecdotes are stale and vary by team, level and location. One email to your recruiter answers it better, and answers it for YOUR loop.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Which of these is safe to rely on when planning your preparation?',
      options: [
        {
          text: 'Amazon publishes its Leadership Principles and states they are used in hiring',
          explanation: 'Correct. This is documented by the company on its own jobs site — the rare case where the rubric is handed over in advance. Confirm the current wording there, since the list has grown over time.',
        },
        {
          text: 'A Google loop is exactly five rounds',
          explanation: 'Round counts vary by role, level and location, and they change. Never build a schedule on a number you read on a forum.',
        },
        {
          text: 'Meta grades coding rounds on a published four-point rubric',
          explanation: 'Internal scoring mechanics are not something to state as fact or plan against. Plan around behaviour you control: pace, working solution first, stated complexity.',
        },
        {
          text: 'A Bar Raiser vetoes candidates using a checklist available online',
          explanation: 'The Bar Raiser role is publicly discussed by Amazon, but its internal mechanics are not something to model your preparation on. The usable takeaway is simply that not everyone in the loop is motivated to fill the role fast.',
        },
      ],
      correct: 0,
    },
    {
      question: 'Mid-solve in a Google-style coding round, the interviewer suggests an approach you believe is worse. Strongest move?',
      options: [
        { text: 'Ignore it and finish your version — confidence reads well', explanation: 'It reads as not listening. Comfort with being challenged is part of what the loop is looking at, and steamrolling is visible signal in the wrong direction.' },
        { text: 'Abandon yours instantly and implement theirs', explanation: 'Equally weak in the other direction. Instant capitulation shows you cannot evaluate an idea, only obey one.' },
        { text: 'Say you will consider it later and keep typing', explanation: 'A polite version of ignoring it. The interviewer spent their nudge; deferring it wastes the data they just handed you.' },
        {
          text: 'Restate what their approach buys and costs, ask what they saw, and change course if they are right',
          explanation: 'Correct. Hints are data. Engaging with one on the merits is exactly the collaboration-and-humility behaviour the process publicly names.',
        },
      ],
      correct: 3,
    },
    {
      question: 'Late in a timed coding round — the speed-weighted kind Meta is reported to run — you have a working O(n squared) solution and a half-finished O(n) rewrite, with a few minutes left. What do you do?',
      options: [
        { text: 'Finish the O(n) rewrite — only the optimal counts', explanation: 'A gamble with five minutes left. If it does not compile you end with nothing working, which is the worst possible ending.' },
        {
          text: 'Revert to the working solution, state its complexity, and describe the O(n) plan out loud with its cost',
          explanation: 'Correct. Working code plus a clearly stated improvement beats a broken elegant attempt. This is the shipping bias the emphasis on pace actually rewards.',
        },
        { text: 'Delete both and restart cleanly', explanation: 'Throws away your only working artifact with five minutes left. Never trade something that runs for something that might.' },
        { text: 'Say nothing and keep typing until time is called', explanation: 'Silence is the one unrecoverable state. The interviewer cannot grade what they cannot hear.' },
      ],
      correct: 1,
    },
    {
      question: 'Your story matrix has three stories, all tagged only Deliver Results and Ownership. What is the finding?',
      options: [
        { text: 'The stories are weak and need rewriting', explanation: 'Not implied. They may be strong stories with narrow coverage. The matrix measures spread, not quality.' },
        { text: 'You need more projects before you can interview', explanation: 'Usually false. Most gaps are moments you never wrote down, inside projects you already have.' },
        { text: 'Tag each story with more principles until every row has an entry', explanation: 'That is how you end up with one story stretched over six principles that demonstrates none of them sharply. Coverage by inflation is not coverage.' },
        {
          text: 'You currently have no story for conflict, ambiguity, frugality or mentoring — mine your own history for those moments',
          explanation: 'Correct. The empty rows are the output of the exercise. Fill them by mining real moments, because an invented story dies on the third follow-up.',
        },
      ],
      correct: 3,
    },
    {
      question: 'The most reliable source for what YOUR specific loop contains is…',
      options: [
        { text: 'Your recruiter', explanation: 'Correct. Current, specific to your role and location, and free. They expect the question; answering it is part of their job.' },
        { text: 'A popular interview-experience forum thread', explanation: 'One person, one team, often years ago. Useful colour at best, and frequently wrong about the details you would plan against.' },
        { text: 'This module', explanation: 'This module describes patterns as of writing and labels what is documented versus reported. It cannot know your team, level or country.' },
        { text: 'A friend who interviewed there last year', explanation: 'Better than a forum, still one sample from one team at one point in time. Use it as a hypothesis, then confirm with the recruiter.' },
      ],
      correct: 0,
    },
    {
      question: 'For an ML-flavoured role at any of the three, which gives the largest differentiation relative to other candidates?',
      options: [
        { text: 'Solving a larger number of Hard-rated DSA problems', explanation: 'DSA is table stakes and everyone is training it. More of the same bucket produces less marginal separation.' },
        {
          text: 'Being able to defend an end-to-end ML system: features, serving, training/serving skew, retraining, metrics',
          explanation: 'Correct. This is the second bar stacked on top of DSA, and far fewer candidates clear it. It also feeds product questions and Dive Deep follow-ups from the same material.',
        },
        { text: 'Knowing more model architectures by name', explanation: 'Naming is cheap and easily tested away. "Why this loss, what breaks if you remove it" is the depth actually probed.' },
        { text: 'A longer project list on your resume', explanation: 'Depth on two defensible projects beats a list of eight you cannot be dived into. Length invites the wrong question.' },
      ],
      correct: 1,
    },
    {
      question: 'You read a fact about a company\'s process. It changes nothing about tomorrow morning\'s study. What should you do with it?',
      options: [
        { text: 'Memorise it in case it comes up', explanation: 'It will not come up, and memorising it competes for the attention your gaps need.' },
        { text: 'Mention it in the interview to show you researched', explanation: 'Reciting process trivia at an interviewer reads as odd, not prepared. Research shows up in the questions you ask about their work.' },
        { text: 'Drop it', explanation: 'Correct. The only test that matters is whether a fact changes your allocation. Facts that do not are entertainment, and they expire anyway.' },
        { text: 'Build your schedule around it', explanation: 'Backwards — you just established it changes nothing. Schedules get built from your measured gaps, not from trivia.' },
      ],
      correct: 2,
    },
  ],
  interviewQuestions: [
    {
      question: 'Case: three weeks left, Amazon onsite booked, and you have never written a behavioural story. Plan the three weeks out loud.',
      answer:
        'Week 1 is inventory, not polish. Evening one: list every project moment I remember — a rollback, a disagreement, a deadline, something I shipped without full information — as titles only. Evening two: build the matrix, stories on one axis, the published Leadership Principles on the other, tagging a story to a principle only where its specific actions demonstrate it, two or three tags max. That produces the real finding: the empty rows. Meanwhile DSA holds its baseline of two timed problems a day, because it is the slowest skill to rebuild and dropping it is not recoverable in a week. Week 2 goes to the empty rows, filled by mining my own history rather than inventing — for each gap I go back to project logs and commit history and find the moment that already happened. Week 3 is out loud: stories rehearsed aloud rather than read, with a peer asking Dive Deep follow-ups (what exactly did you say, what was the number, what would you do differently), plus mock coding rounds and two mock designs. I would also email the recruiter in week 1 asking what the loop contains, so I am allocating against the real thing rather than my assumption about it. What I am probing for in myself: can I say "I" instead of "we", and can I survive the third follow-up on every story.',
      isCaseBased: true,
    },
    {
      question: 'Case: same candidate, same three weeks, but it is a Google onsite instead. What changes and what stays?',
      answer:
        'The spine stays: DSA daily, communication, and one or two projects I can defend to the bottom. What grows is algorithmic depth — harder tier, timed, with real attention to clean and correct code rather than just the right idea, because clean code is the reported bar and it is a separate skill from having the insight. What becomes a distinct line item is narration: one problem a day solved out loud, brute force and its cost, then the improvement and its cost, then code. I would also rehearse taking hints, with a peer interrupting me mid-solve, sometimes with a bad suggestion, so that engaging with an idea on its merits is a reflex rather than an ambush. Stories do not get dropped: Googleyness and Leadership is a publicly named part of their process, so I keep collaboration, ambiguity and intellectual-humility stories ready — just at a smaller share of the hours than I would for an Amazon loop. What shrinks: system design and ML depth get maintenance rather than growth. And I would confirm the shape of the loop with the recruiter rather than assume, because round composition varies by role and level.',
      isCaseBased: true,
    },
    {
      question: 'Case: forty minutes into a 45-minute coding round you have a working brute force and a half-written optimal solution. Talk me through the decision.',
      answer:
        'I revert to what runs. Concretely: keep the working O(n squared), say out loud "this is correct at O(n squared) time, O(1) extra space — let me tell you the O(n) version", then describe the improvement precisely enough that the interviewer can see I had it: which structure replaces the inner scan, what it costs in time and space, and where the edge case would be. That ends the hour with correct code plus demonstrated optimisation, which is strictly better than a broken rewrite plus an apology. The reasoning behind the rule: the interviewer is writing notes for people who were not in the room, and "solved it, knew how to improve it" is a sentence they can write. This is also the habit that the widely reported emphasis on pace actually rewards — not typing fast, but never being in a state where nothing works.',
      isCaseBased: true,
    },
    {
      question: 'Case: your story matrix shows four principles with no story attached. Walk me through filling one of them honestly.',
      answer:
        'Take Bias for Action as the example. I do not invent a story — invented stories collapse on the third follow-up, which is exactly the kind of follow-up these loops are known for. Instead I mine: I reread project notes, commit history and old messages looking for a moment where I moved before I had full information. Usually it is there and was never framed that way — shipping a caching fix during an incident with only a partial diagnosis, or launching a rough evaluation harness rather than waiting for the good one. Then I write it as a real story with the uncomfortable parts intact: what I did not know at the time, why waiting was worse than acting, the specific action I personally took, the outcome with a number, and what I would do differently. The honest bit is naming the risk I accepted. If, after genuinely searching, a principle has no moment behind it, I say so if asked rather than manufacturing one — and I go make one in my current work, because that is a real gap, not a presentation problem.',
      isCaseBased: true,
    },
    {
      question: 'What is "Googleyness" and how do you prepare for something that vague?',
      answer:
        'It is a term Google itself uses publicly — "Googleyness and Leadership" appears in their own hiring material — described in terms like comfort with ambiguity, collaboration and intellectual humility. I would not pretend to know how it is scored internally, and I would not plan against a rubric I have not seen. What I can do is prepare the observable behaviours: saying "I do not know, here is how I would find out" without defensiveness; treating a hint as data and engaging with it rather than defending a wrong approach; asking clarifying questions before coding instead of assuming a spec; and having two or three real stories about working with people who disagreed with me. It is the same preparation that helps everywhere, which is the point — the vagueness is a reason to train behaviour rather than memorise a definition.',
      isCaseBased: false,
    },
    {
      question: 'How is preparing for a Meta loop different from preparing for a Google loop, in your own words?',
      answer:
        'With the honest caveat that both processes vary by team and change over time, and that I would confirm specifics with the recruiter: the widely reported difference is emphasis rather than content. Google-weighted preparation puts more hours into algorithmic depth and into writing code that is clean and correct the first time, plus narration, because thinking out loud under a committee-reviewed process is what gets written down about you. Meta-weighted preparation puts more hours on the clock — two mediums in about 35 minutes, working solution first and optimise after — and on product reasoning: for a given feature, what metric should it move, what guardrail could it break, how would I know. Both keep the same spine: DSA fluency, clear communication, projects I can defend, and real stories. If I only had one sentence: for Google I would train depth and narration, for Meta I would train pace and metric reasoning.',
      isCaseBased: false,
    },
    {
      question: 'What do you know about Amazon\'s Leadership Principles, and how have you used them?',
      answer:
        'They are published on Amazon\'s jobs site — sixteen at the time I last checked, and the list has been added to over the years, so I reread the current wording rather than trusting a copy. I have not tried to memorise them as recitation, because the questions ask for stories, not definitions. What I did instead was build a coverage matrix: my stories on one axis, the principles on the other, tagging a story to a principle only where its specific actions demonstrate it — two or three per story, never six. Then I inverted it and looked at which principles had no story. Those empty rows became the prep list, and I filled them by going back through my own project history rather than inventing anything. The most useful side effect was discovering which of my stories I had been over-claiming: a latency fix that genuinely shows Dive Deep and Deliver Results does not show Think Big, and pretending otherwise just invites a follow-up I cannot survive.',
      isCaseBased: false,
    },
    {
      question: 'How do you research a company you have never interviewed at, and where none of the popular guides apply?',
      answer:
        'Five sources, in order of signal. The job description read word by word — it names the actual stack and responsibilities, and a line like "experience with recommendation systems" is effectively a promise about what I will be asked. The company\'s own engineering blog — it shows what they are proud of and currently fighting, and gives me one specific question that is obviously not generic. Their own published interview-preparation material, read as a primary source rather than someone\'s summary of it. Recent public launches, so I can discuss one intelligently. And the recruiter, who is the highest-signal and lowest-cost source and the one candidates skip. The reason I order it this way is that the first four are inference and the last one is fact — so I use the first four to form a hypothesis and the recruiter to confirm it.',
      isCaseBased: false,
    },
    {
      question: 'What do you ask a recruiter on the intro call, and why those questions?',
      answer:
        'What the loop looks like for this role and what each round is; whether there is a system design round and whether it is general or ML system design; which language and whether it is a shared editor or a whiteboard; how much of the loop is behavioural and whether anything specific should be prepared; what the team actually works on and what I would own first; and whether there is anything candidates for this role commonly under-prepare for. Each one changes my allocation, which is the only reason to ask anything. The last question is the highest-yield and the most under-asked — it invites the recruiter to hand over the failure mode they watch happen. These are normal questions recruiters answer daily, so asking reads as preparation, not presumption. And the answers are more current than any article, including the ones I would otherwise be planning against.',
      isCaseBased: false,
    },
    {
      question: 'Someone tells you their plan is to grind LeetCode for all three companies and skip everything else. What is wrong with it?',
      answer:
        'It optimises the bucket that is easiest to measure and skips the ones that are guaranteed to be tested. DSA is genuinely necessary — it is the price of entry and it never leaves the schedule — but at all three companies a human will ask about your own work, and at Amazon the rubric for those questions is published in advance. Untimed, silent grinding also trains the wrong version of the skill: it builds no pace and no narration, and the interview is a spoken exam. There is a further cost that is invisible from inside the plan — they never asked the recruiter what the loop contains, so they are allocating four weeks against an assumption. The fix is not less DSA; it is moving hours, not adding them: keep the daily cadence, put the freed hours into stories, project defence, and one timed narrated solve a day.',
      isCaseBased: false,
    },
    {
      question: 'How much of your preparation should actually be company-specific?',
      answer:
        'Roughly the last fifth of it, and I would say that out loud rather than pretend otherwise. The shared eighty percent is DSA fluency, clear communication with unprompted complexity statements, one or two projects I can defend down to the decisions I regret, an honest failure story, and questions at the end that are not answered on the careers page. That set pays at all three companies and at every company that is not one of the three. The company-specific fifth is a reallocation on top: more depth and narration for a Google-weighted loop, more clock and metric reasoning for a Meta-weighted one, more story-matrix work for an Amazon-weighted one. Framing it this way also protects me when the process turns out to be different from what I read — the spine still holds, and only the top block was ever a bet.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'What company research is actually for', back: 'Deciding where the last few weeks of hours go. Test any fact you read: does it change what I do tomorrow morning? If not, drop it — process facts expire, skills built from them do not.' },
    { front: 'Google — documented vs widely reported', back: 'Documented by Google: assessment beyond coding, committee review of hiring decisions, and "Googleyness and Leadership" as a named part of the process. Widely reported: heavy DSA emphasis with a real bar on clean, correct code.' },
    { front: 'Googleyness — the behaviours to train', back: 'Collaboration, comfort with ambiguity, intellectual humility. In practice: say "I do not know, here is how I would find out"; treat hints as data and change course; clarify before coding. Train narration daily, out loud.' },
    { front: 'Meta — the reported emphasis, and the drill', back: 'Speed (working solution first, then improve) and product sense (why a feature exists, what metric it should move). Drill: two mediums in ~35 min on a clock, plus Pick the Metric case studies.' },
    { front: 'Amazon Leadership Principles — the honest facts', back: 'Published by Amazon on its jobs site and stated to be used in hiring; sixteen at the time of writing, and the list has grown over the years. Check amazon.jobs for current wording before building anything on it.' },
    { front: 'Bar Raiser — what is safe to say', back: 'Publicly discussed by Amazon: an interviewer from outside the hiring team who holds the hiring standard. Do not model the internal mechanics. Usable takeaway: not everyone in the loop wants this role filled quickly.' },
    { front: 'The story-to-LP matrix, in four steps', back: '1) Write the stories first. 2) Tag a story to a principle only where its specific ACTIONS show it — 2-3 tags, never six. 3) Invert: for each principle, list covering stories. 4) Empty rows are the prep list; fill by mining your own history, never inventing.' },
    { front: 'The shared 80% (pays at all three)', back: 'DSA fluency; thinking out loud with unprompted complexity; one or two projects defensible to the bottom; an honest failure story; closing questions not answered on the careers page.' },
    { front: 'The AIML differentiator', back: 'ML depth (why this loss/architecture), ML system design (candidate generation and ranking, features, training-serving skew, latency, retraining), and metric reasoning (offline vs online vs guardrail). The line: "the model was the easy part."' },
    { front: 'Six recruiter questions worth asking', back: 'What is each round? System design — general or ML? Language and editor or whiteboard? How much is behavioural, prepare anything specific? What does the team own day to day? What do candidates under-prepare for?' },
  ],
  mindmapMarkdown: `- Company Research: Google, Meta & Amazon
  - Allocation, not trivia — where the last hours go
  - Honesty rule
    - Documented vs widely reported (label both)
    - Recruiter answers YOUR loop; processes change
  - Google
    - DSA depth + clean, correct code
    - Googleyness & Leadership (publicly named)
    - Prep: DSA ladder, narrate daily, take hints well
  - Meta
    - Speed: working solution first, then improve
    - Product sense: name the metric it moves
    - Prep: timed medium sets + Pick the Metric
  - Amazon
    - Leadership Principles — published, used in hiring
    - Bar Raiser — publicly discussed, mechanics unknown
    - Story x LP matrix, then work the empty rows
  - Common to all three (the 80%)
    - DSA fluency + thinking out loud
    - Two projects defended in depth
    - An honest failure story
    - Questions not answered on the careers page
  - AIML differentiator
    - ML depth + ML system design case study
    - Offline vs online vs guardrail metrics
  - Final four weeks (template, not law)
    - W1 baseline + story inventory
    - W2 fill the biggest exposed gap
    - W3 timed, out loud, with peers
    - W4 taper, re-solve starred, no new topics
  - Research it yourself: JD, eng blog, launches, recruiter`,
}

export default m
