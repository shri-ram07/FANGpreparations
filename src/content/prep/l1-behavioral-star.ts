import type { Module } from '../types'

const m: Module = {
  id: 'prep-l1-behavioral-star',
  subjectId: 'prep',
  level: 1,
  title: 'Behavioral Interviews: Eight STAR Stories From Your Own Work',
  whyItMatters:
    'FAANG loops typically include at least one round that is not about code, and Amazon publishes Leadership Principles that its behavioral questions are widely reported to follow. Strong engineers fail this round for boring reasons: no structure, no ownership inside the story, and nothing actually at stake. Eight stories written from your own projects fix that in a weekend, and the same eight work at every company you interview with.',
  estMinutes: 55,
  sections: [
    {
      type: 'intuition',
      title: 'The round that is not about code',
      md: `This is not a personality test, and it is not small talk before the real interview. It checks three things: do you own your work, do you know what you are bad at, and can you stay clear while mildly stressed.

- The interviewer is filling a form with named areas — ownership, collaboration, handling ambiguity, bar for quality. Your story is evidence for one of those boxes. Evidence that fits no box scores nothing.
- Failure mode one: **rambling**. Four minutes of background, no structure, and the listener quietly checks out at minute two.
- Failure mode two: **nothing at stake**. No hard decision, nothing that could have gone wrong, nothing that changed. Pleasant, and unscorable.
- Both failures are structural, not personal. Both are fixed by writing the stories down *before* the interview instead of improvising inside it.
- Most strong engineers fail here because they prepared three hundred hours for DSA and zero minutes for this.`,
    },
    {
      type: 'intuition',
      title: 'STAR, and the proportions nobody keeps',
      md: `STAR is Situation, Task, Action, Result. The letters are easy. The proportions are where answers die.

- **Situation** — two sentences of context. Who, what, how long, what constraint. That is the whole budget.
- **Task** — what was *yours*. Not what the team had to do. One sentence naming your scope.
- **Action** — the bulk, roughly 60–70 percent of the answer. Specific decisions you made, in first person singular, in the order you made them.
- **Result** — what changed, with a number if one honestly exists, plus one sentence of what you learned.
- The defect in almost every unprepared answer: **eighty percent Situation, twenty percent Action**. The interviewer ends up knowing a lot about your college fest and nothing about you.
- Target length: about two minutes. If Action is not the longest part, the answer is broken regardless of how good the project was.`,
    },
    {
      type: 'intuition',
      title: 'The weak version — what the interviewer actually hears',
      md: `Same true story, told without preparation. Read it as the interviewer, holding a form with an "ownership" box to fill.

*"So in fifth semester we had this project, there were five of us, and the college fest team wanted some feedback analysis thing. Everyone was busy with other subjects, the dataset was messy, and there was this whole discussion about which model to use — my teammate wanted BERT, I wasn't sure, we discussed it a lot. Eventually we figured it out and it worked, and the faculty liked the demo."*

- Ninety seconds gone, and the first ninety seconds were all Situation.
- The word **we** does every piece of work. There is no sentence the interviewer can attribute to the candidate.
- "We discussed it a lot" is not an Action. No mechanism, no decision, no reason.
- "It worked" is not a Result. Nothing measured, nothing learned, nothing that would be different next time.
- The ownership box stays empty. The story was true, the project was real, and it scored zero.`,
    },
    {
      type: 'intuition',
      title: 'The same story, told well',
      md: `Nothing was added. The context was cut, the pronoun changed, and the decisions got specific.

*"Five-person semester project, five weeks, no GPU — classify about 4,000 free-text feedback entries from the college fest. I owned the model choice and the evaluation. Rohit wanted to fine-tune BERT; I thought a linear baseline would do. Before arguing I asked him why, and his reason was good — a bag-of-words model had missed negation for him on an earlier project. So I proposed we stop trading opinions and spend one evening measuring, with the deciding numbers agreed in advance: macro-F1 and retrain wall-clock. I built the TF-IDF plus logistic-regression baseline, he ran the fine-tune on a free Colab tier, and I put his negation examples into the test set so his concern was covered whichever model won. Baseline: 0.79 macro-F1, 40 seconds to retrain. Fine-tune: 0.83, about three hours and two session timeouts. We shipped the baseline in week 4 instead of week 5, and he owned the negation checks for the rest of the project. What I took from it: a disagreement with an agreed metric is just an experiment, and an experiment ends in an evening."*

- Same length as the weak version. Context is two sentences instead of ninety seconds.
- Every Action verb is **I**, and the other person is described fairly rather than as an obstacle.
- The decision has a *mechanism* — agreed metric, timeboxed test — not a winner of an argument.
- The Result carries numbers, and the lesson is one sentence, stated plainly.
- Nothing here is industry-scale. That is the point: student-scale material is legitimate raw material when it is told with ownership.`,
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'One story, weak telling to strong telling',
        notice: 'Left: what leaves your mouth. Right: what the interviewer can actually write in the form. Step through and watch the empty boxes fill.',
        leftLabel: 'what you say',
        rightLabel: "interviewer's form",
        frames: [
          {
            note: 'Weak telling. Ninety seconds of fest backstory, "we" for every decision, and an ending with nothing measured. Three boxes stay empty — the story was true and it scored zero.',
            stack: [
              { name: 'S: 90 sec of backstory', to: 'ctx', danger: true },
              { name: 'A: "we discussed a lot"', to: 'own', danger: true },
              { name: 'R: "it worked"', to: 'res', danger: true },
            ],
            heap: [
              { id: 'ctx', value: 'context — still going', label: 'situation', danger: true },
              { id: 'own', value: '"we" x7 — his part?', label: 'ownership: EMPTY', danger: true },
              { id: 'res', value: 'nothing measured', label: 'result: EMPTY', danger: true },
              { id: 'grw', value: 'no lesson stated', label: 'growth: EMPTY', danger: true },
            ],
          },
          {
            note: 'Fix one: cut the Situation to two sentences and name the Task. Fifteen seconds now buys the interviewer more than ninety did — the scope line tells them which parts of the story are yours to judge.',
            stack: [
              { name: 'S: two sentences', to: 'ctx' },
              { name: 'T: "I owned the model"', to: 'own' },
            ],
            heap: [
              { id: 'ctx', value: '5 people, 5 wk, no GPU', label: 'situation: 15 sec' },
              { id: 'own', value: 'scope: model + eval', label: 'ownership: scoped' },
              { id: 'res', value: 'waiting', label: 'result' },
              { id: 'grw', value: 'waiting', label: 'growth' },
            ],
          },
          {
            note: 'Fix two: the Action becomes the bulk, in first person singular, one decision per sentence. Note the second line — stating his reason fairly is what keeps this a conflict story instead of a complaint.',
            stack: [
              { name: 'A: I asked his reason', to: 'own' },
              { name: 'A: I fixed the metric', to: 'own' },
              { name: 'A: I built the baseline', to: 'own' },
            ],
            heap: [
              { id: 'ctx', value: '5 people, 5 wk, no GPU', label: 'situation' },
              { id: 'own', value: 'his decisions, my decisions', label: 'ownership: clear' },
              { id: 'res', value: 'waiting', label: 'result' },
              { id: 'grw', value: 'waiting', label: 'growth' },
            ],
          },
          {
            note: 'Fix three: a Result with real numbers and one sentence of lesson. 0.79 vs 0.83 macro-F1, 40 s vs 3 h to retrain, shipped a week early. The number does not have to be big — it has to be honest and yours.',
            stack: [
              { name: 'R: 0.79 F1, 40 s retrain', to: 'res' },
              { name: 'R: shipped week 4 of 5', to: 'res' },
              { name: 'Lesson: metric ends it', to: 'grw' },
            ],
            heap: [
              { id: 'ctx', value: '5 people, 5 wk, no GPU', label: 'situation' },
              { id: 'own', value: 'his and my decisions', label: 'ownership: clear' },
              { id: 'res', value: 'measured, shipped early', label: 'result: filled' },
              { id: 'grw', value: 'one-line lesson', label: 'growth: filled' },
            ],
          },
          {
            note: 'The round is decided here. "How did he react?" — he owned the negation checks afterwards. "What was the data?" — 4,012 rows, 3 classes, 71 percent positive, which is why I reported macro-F1. A story that survives three follow-ups was actually yours.',
            stack: [
              { name: 'Q: how did he react?', to: 'f1' },
              { name: 'Q: what was the data?', to: 'f2' },
              { name: 'Q: do differently?', to: 'f3' },
            ],
            heap: [
              { id: 'f1', value: 'he owned checks after', label: 'relationship intact' },
              { id: 'f2', value: '4,012 rows, 71% positive', label: 'you were really there' },
              { id: 'f3', value: 'agree metric earlier', label: 'judgement' },
              { id: 'grw', value: 'three for three', label: 'story holds' },
            ],
          },
        ],
      },
    },
    {
      type: 'intuition',
      title: 'The pronoun test: I, not we',
      md: `Interviewers listen for the pronoun. It is the cheapest signal in the room and they use it.

- Team context belongs in the Situation: *"a five-person project"*, *"my mentor owned the deployment"*. That is honest framing and costs you nothing.
- The Action must be yours: *"I measured"*, *"I proposed"*, *"I rewrote"*, *"I told the team on day one"*.
- **"We decided to move to a queue"** gives no evidence. **"I proposed the queue after measuring that 80 percent of request time was the email send, then implemented the worker and the retry"** gives four.
- Sharing credit explicitly — naming what a teammate did — reads as strength, not weakness. Hiding inside a **we** reads as neither.
- Practical drill: read your written story and count the sentences that begin with **I** and describe a decision. Fewer than four in the Action, and the story is not ready.`,
    },
    {
      type: 'note',
      md: 'The eight stories below cover the five themes the study plan names — conflict, failure, leadership, ambiguity, deadline — plus the three that round out a standard loop. One section each. For every one: what is actually being probed, prompt variants, what a student-scale version looks like, and the trap specific to that story.',
    },
    {
      type: 'intuition',
      title: '1. Conflict — the disagreement, not the villain',
      md: `**Probing:** can you disagree with a peer and still reach a decision, without it turning personal.

- **Prompt variants:** *"Tell me about a time you disagreed with a teammate."* / *"Describe a conflict on a team project."* / *"A time you had to convince someone of a technical decision."*
- **Student-scale versions:** the model-choice argument above; a partner who wanted to rewrite working code in a new framework two weeks before submission; an open-source maintainer who rejected your approach on a pull request; a hackathon teammate adding features while integration was broken.
- **The trap:** making the other person a villain. It is audible immediately, and it costs more than the story earns.
- **The good version** states their reasoning fairly *before* yours, shows how the decision actually got made — data, a timeboxed test, a tiebreaker you both agreed to — and ends with the working relationship intact.
- Honest check: if you cannot say why the other person believed what they believed, you do not understand the conflict well enough to tell it.`,
    },
    {
      type: 'intuition',
      title: '2. Failure — something that genuinely did not work',
      md: `**Probing:** ownership without excuses, and whether a failure actually changes your behaviour.

- **Prompt variants:** *"Tell me about a time you failed."* / *"What is the biggest mistake you have made?"* / *"Tell me about something you built that broke."*
- **Student-scale versions:** a model at 97 percent validation accuracy that turned out to be leaking a column; a side project you shipped and nobody used because you never spoke to a user; a key committed to a public repo; a pull request left so long it was closed as stale.
- **The trap:** the fake failure. *"I work too hard"* is a non-answer, and so is a failure that turned out fine anyway — no cost means no story.
- **Required ending:** what you changed afterwards, plus evidence you did it. *"I now build the split and run a leakage check before the first model — that is the first cell in every notebook I have written since."*
- Pick a failure whose cost was real but which you can tell without dragging a named teammate down with you. Owning your part fully is what is being measured.`,
    },
    {
      type: 'intuition',
      title: '3. Leadership without authority',
      md: `**Probing:** whether you can move a group when nothing gives you the right to.

- **Prompt variants:** *"Tell me about a time you led something."* / *"A time you took initiative."* / *"How did you get people to do something when you were not in charge?"*
- **Student-scale versions:** you set up the repo, branch rules and pull-request reviews for a team that was emailing zip files; you ran a weekly 30-minute sync for a study group; you took over integration when nobody owned it; you triaged and labelled a class project backlog so people stopped duplicating work.
- **The trap:** claiming a team outcome as yours. *"I made the project succeed"* is heard as inflation and drags everything else you said down with it.
- **The good version** names what you did *and* what others did, and shows the persuasion: how you got buy-in from people who could have ignored you, and what you did when one of them did ignore you.
- The measurable part is usually behavioural, not financial: *"before, three people were editing the same file over email; after two weeks, every change came in as a pull request."*`,
    },
    {
      type: 'intuition',
      title: '4. Ambiguity — an underspecified problem',
      md: `**Probing:** can you start moving before the problem is fully defined, and can you cut scope on purpose.

- **Prompt variants:** *"Tell me about a time the requirements were unclear."* / *"A decision you made without all the data."* / *"A time you had to define the problem yourself."*
- **Student-scale versions:** a professor hands you a dataset and says "do something useful"; an internship mentor asks whether LLMs could help with support tickets; a hackathon theme that is one word; an open-source issue titled "performance is bad".
- **The trap:** skipping straight to the solution. *"I built an XGBoost model and got 0.91 AUC"* answers a different question and wastes the prompt.
- **The good version** shows the first two days: the questions you asked and who you asked, the two or three candidate framings you wrote down, what you deliberately **excluded**, and the smallest thing you built to test the direction before committing weeks to it.
- Saying *"I picked the narrow version on purpose and wrote down what I was not doing"* is the whole signal. Waiting for clarification is the anti-signal.`,
    },
    {
      type: 'intuition',
      title: '5. Deadline and pressure',
      md: `**Probing:** prioritisation under a hard constraint, and whether you tell people early.

- **Prompt variants:** *"Tell me about a tight deadline."* / *"A time you had more work than time."* / *"A time you had to say no or cut scope."*
- **Student-scale versions:** two submissions and an exam in one week; a demo in two days with the API down; an internship task that turned out three times bigger than scoped; a release blocked by one flaky test the night before.
- **The trap:** heroics as the moral. *"I stayed up three nights and finished everything"* signals bad planning and does not repeat.
- **The good version** names the tradeoff you made deliberately and **what you dropped**: *"I cut the admin dashboard, told my teammate on day one that it was going, and shipped the demo path — the part that was actually graded — with a day to spare."*
- Communicating early is half the credit. A dropped feature announced on day one is a decision; the same feature missing on the last day is a failure.`,
    },
    {
      type: 'intuition',
      title: '6. Learning something hard, fast',
      md: `**Probing:** your learning method, and your honesty about the starting point. This is the friendliest prompt a student gets — most of your recent life is evidence.

- **Prompt variants:** *"Tell me about a time you had to learn a new technology quickly."* / *"How do you get up to speed on something unfamiliar?"* / *"Something you learned outside your coursework."*
- **Student-scale versions:** Docker in a week because the internship deploy needed it; enough CUDA to explain why a batch size choked; a 40,000-line codebase you had to change one function inside; PyTorch after only ever using scikit-learn.
- **The trap:** making it sound effortless, or listing the tutorials you watched. Consumption is not learning and interviewers know it.
- **The good version** names the method and the cost: *"I skipped the tutorial and built the smallest thing that ran — one container with one endpoint — then broke it on purpose. I lost a full day to a volume mount before I understood that the image is not the filesystem."*
- The honest version beats the polished one here. Naming what confused you is evidence you actually went through it.`,
    },
    {
      type: 'intuition',
      title: '7. Feedback you received and acted on',
      md: `**Probing:** coachability — can you hear criticism without defending, and does anything change afterwards.

- **Prompt variants:** *"Tell me about critical feedback you received."* / *"What is the toughest feedback anyone has given you?"* / *"How do you handle review comments you disagree with?"*
- **Student-scale versions:** a reviewer who said your 900-line pull request was unreviewable; a mentor who said your standup updates were too vague to act on; a professor who said your report had no baseline so the numbers meant nothing.
- **The trap:** flattering feedback dressed as criticism — *"they told me I should take on more responsibility"*. It reads as evasion and burns the question.
- **The good version** includes your first reaction honestly (*"my first thought was that the PR had to be big"*), the concrete behaviour change, and how you know it stuck: *"I split the next one into four PRs of under 200 lines each and they were all reviewed the same day."*
- If you disagreed with the feedback, say so and say what you did with it. Disagreeing and still testing it is a stronger answer than instant compliance.`,
    },
    {
      type: 'intuition',
      title: '8. A decision you would make differently now',
      md: `**Probing:** judgement and growth. Distinct from the failure story — here the outcome may have been perfectly fine.

- **Prompt variants:** *"What would you do differently on your last project?"* / *"A technical decision you regret."* / *"If you restarted that project today, what changes?"*
- **Student-scale versions:** picked MongoDB with no reason and later needed joins; wrote your own auth instead of using a library; trained from scratch when fine-tuning would have done; spent three weeks on the frontend of a project whose value was entirely in the model.
- **The trap one:** the safe non-answer — *"I would add more tests"*. **Trap two:** the humblebrag — *"I would have been even more ambitious"*.
- **The good version** shows the decision was reasonable *given what you knew*, then names what you would check now: *"Choosing Mongo was fine for the two weeks I could see. What I would do differently is spend twenty minutes writing the three queries the app would need before picking the store — that alone would have shown me the joins."*
- This one rewards a real answer more than a tidy one. An engineer who never revises a good decision is not learning from it.`,
    },
    {
      type: 'intuition',
      title: 'The story bank as a system',
      md: `Improvising eight stories is eight chances to ramble. Writing them once turns the whole round into recall.

- One file per story, same template every time, in the repo or notes app you actually open. Written once, reused for every company.
- Roughly eight stories cover most prompts you will be asked, because prompts are variations — *"a conflict"*, *"a difficult teammate"*, and *"convincing someone"* are the same story with three doors.
- **Tag each story** with the themes it can serve. One good story usually answers three prompts; a tagged bank means you pick in two seconds instead of stalling.
- Rehearse **out loud** to about two minutes. Out loud is non-negotiable — the gap between "I know this story" and "I can say this story" only shows up when you say it.
- Do not memorise word for word. Memorised answers sound memorised, and they collapse the moment a follow-up moves off the script. Bullets in, different words out, every rehearsal.
- Keep the numbers in the file. The number is the part you will blank on under pressure, and it is the part that scores.`,
    },
    {
      type: 'code',
      lang: 'yaml',
      title: 'The story-bank template — one file per story',
      code: `# stories/conflict-model-choice.yaml
# One file per story. Same fields every time - the sameness is what makes it fast.
title: The BERT-vs-baseline argument I turned into an experiment
themes: [conflict, data-driven decision, deadline]   # which prompts this can answer
lp_tags:                                             # Amazon Leadership Principles
  - Have Backbone, Disagree and Commit
  - Dive Deep
rehearsed_minutes: 2

situation: |
  Five-person semester project, five weeks, no GPU. About 4,000 free-text
  feedback entries from the college fest to classify. Two sentences. Stop.

task: >
  Mine specifically - pick the model and own the evaluation. Not "the team had
  to build a classifier".

action:            # the bulk. First person singular, one decision per bullet.
  - I asked Rohit for his reason before I argued - a bag-of-words model had
    missed negation for him on an earlier project.
  - I proposed we settle it with one evening of measurement, not opinions.
  - I fixed the deciding numbers UP FRONT - macro-F1 and retrain wall-clock.
  - I built the TF-IDF + logistic-regression baseline; he ran the fine-tune.
  - I put his negation examples in the test set so his concern stayed covered.

result:
  number: 0.79 macro-F1 vs 0.83, 40 s vs ~3 h to retrain; shipped in week 4
  changed: we stopped arguing by preference and started agreeing on metrics
lesson: >
  A disagreement with an agreed metric is just an experiment, and an experiment
  ends in an evening.

followups:         # the round is won or lost here, not in the story
  reaction: He was fine once his failure case was in the test set - he owned
    that check for the rest of the project.
  do_differently: Write the metric down before the argument, not during it.
  the_data: 4,012 rows, 3 classes, 71 percent positive - which is why I
    reported macro-F1 and not accuracy.`,
      annotations: {
        4: 'Themes are the index. When a prompt lands, you search tags, not memory — one story usually serves three prompts.',
        5: 'Tag against Amazon\'s published Leadership Principles too. Tagging is for YOUR retrieval; never recite the principle name in the answer.',
        8: 'Rehearsed length, out loud. Two minutes is the target for the story itself, before follow-ups.',
        10: 'Block scalar, and keep it to two sentences. If this field grows past three lines, the answer is already broken.',
        18: 'The bulk of the answer lives here. Every bullet starts with "I" and names a decision, not an activity.',
        27: 'The number field exists so you cannot skip it. If a story has no honest number, say what changed in behaviour instead — but never invent one.',
        33: 'Three anticipated follow-ups per story. A story you cannot follow up on was too thin to tell.',
      },
    },
    {
      type: 'intuition',
      title: 'Amazon: tag your stories against the Leadership Principles',
      md: `Amazon is the one loop where behavioral answers are not a side round. Amazon publishes its Leadership Principles openly, and its interviewers map questions to them.

- The published list currently runs to sixteen principles, including Customer Obsession, Ownership, Invent and Simplify, Are Right A Lot, Learn and Be Curious, Insist on the Highest Standards, Bias for Action, Frugality, Earn Trust, Dive Deep, Have Backbone / Disagree and Commit, and Deliver Results. Read them from [Amazon's own page](https://www.amazon.jobs/content/en/our-workplace/leadership-principles) rather than a blog — the list has been amended over the years.
- Tag every story in your bank with two or three principles. Ownership, Dive Deep, Bias for Action and Learn and Be Curious are the ones student-scale stories most naturally support.
- Tags are for your retrieval, not for the answer. Saying *"this demonstrates my Customer Obsession"* out loud is the tell of someone who read a list last night. Demonstrate it and let the interviewer do the mapping.
- Amazon describes a **Bar Raiser** interviewer in its own hiring material — an interviewer from outside the hiring team who is there to hold the standard. The finer mechanics of how they weigh in are widely reported rather than fully documented, so do not over-plan around them.
- Aim for at least one story per principle you expect to be asked about, and accept overlap: one strong story tagged to four principles beats four thin ones.
- Per-company detail — Google's Googleyness signals, Meta's speed and product sense, Amazon's LP-driven loop — lives in *Company Research: Google, Meta & Amazon*. This module is the story machinery those rounds all consume.`,
    },
    {
      type: 'intuition',
      title: 'The follow-up is the real interview',
      md: `The story is the setup. The grading happens in the three questions after it.

- The standard three: *"What would you do differently?"*, *"How did the other person react?"*, *"What was the data — what were the actual numbers?"*
- Others that recur: *"Why did you choose that?"*, *"What did the rest of the team think?"*, *"What happened after you left the project?"*
- A story that cannot survive three follow-ups was too thin. Usually for one of two reasons: you were not really the one who did it, or nothing was ever measured.
- So prepare the follow-ups, not just the story — three written answers per story, in the file. This is where preparation actually pays.
- Follow-ups are also why memorised answers fail. The recital ends, the first real question lands, and the fluency vanishes with it.
- If you genuinely do not remember a number, say so plainly and give the shape: *"I do not remember the exact figure — it was roughly a fifth of the runtime."* Guessing precisely is how people get caught.`,
    },
    {
      type: 'note',
      md: `**Questions to ask them.** You get three to five minutes at the end, and the interviewer remembers what you asked.

- A generic question is a wasted signal. *"What is the culture like?"* and *"What tech stack do you use?"* are answerable from the careers page, so asking them tells the interviewer you did not read it.
- Ask what only *this person* can answer: what they are working on this quarter, the tradeoff their team is currently living with, how the team decides what to build next, what they would want someone in this role to have shipped in six months.
- Best of all: a question that follows from something they said earlier. It proves you were listening, which is itself the signal.
- Keep two prepared per interviewer, and route compensation, leave and level questions to the recruiter — not to the engineer who just interviewed you.`,
    },
    {
      type: 'note',
      md: `**One closing rule: do not fabricate.** Invented stories fail on follow-ups — the numbers do not hold, the other person has no reaction, the timeline slips — and the downside if you are caught is not partial credit, it is a no. Your coursework, team projects, internship, open-source pull requests, hackathons and abandoned side projects are enough material for all eight. Told with real ownership and one honest number, student-scale beats an inflated story every single time.`,
    },
  ],
  quiz: [
    {
      question: 'A conflict story. Which Action section gives the interviewer the most usable evidence?',
      options: [
        {
          text: '"We discussed the options as a team and eventually we agreed on the simpler model."',
          explanation: '"We" hides the decision. Nothing here can be attributed to the candidate, so the ownership box stays empty.',
        },
        {
          text: '"I asked why he wanted the fine-tune, heard the negation failure that had burned him before, then proposed we settle it in one evening — macro-F1 and retrain time agreed before we started."',
          explanation: 'Correct. His reasoning stated fairly, a decision mechanism instead of a winner, and every verb in first person singular.',
        },
        {
          text: '"I explained that BERT was overkill and he eventually came around."',
          explanation: 'An assertion, not a method — and it quietly casts the teammate as the one who was wrong. No evidence of how the decision was actually made.',
        },
        {
          text: '"I raised it with our project guide, who decided for us."',
          explanation: 'Escalation with no first attempt shows no influence. Sometimes escalation is right, but it cannot be the whole story of a peer disagreement.',
        },
      ],
      correct: 1,
    },
    {
      question: 'What is the most common structural defect in an unprepared STAR answer?',
      options: [
        { text: 'Too little Situation — the interviewer lacks context', explanation: 'Rare. Two sentences of context is almost always enough, and under-explaining is not the failure people actually make.' },
        { text: 'Too many numbers in the Result', explanation: 'Numbers are the scarce ingredient, not the excess one. An honest number is what makes a Result scoreable.' },
        { text: 'Situation swallows the answer; Action shrinks to a couple of vague sentences', explanation: 'Correct. The classic 80 percent Situation, 20 percent Action split. The interviewer learns the project and nothing about the candidate.' },
        { text: 'The Task is stated too specifically', explanation: 'Backwards — a specific Task ("I owned the model choice and evaluation") is exactly what tells the interviewer which parts of the story are yours.' },
      ],
      correct: 2,
    },
    {
      question: 'Which of these is a usable answer to "tell me about a time you failed"?',
      options: [
        { text: '"I work too hard and burn myself out on projects."', explanation: 'A non-failure dressed as one. It reads as evasion, and the burnout framing adds a second problem for free.' },
        { text: '"I missed my deadline, but my teammates covered for me and we shipped fine anyway."', explanation: 'No real cost, and the recovery belongs to other people. The story ends with someone else fixing it.' },
        { text: '"The dataset we were given was bad, so the project never worked."', explanation: 'Blames the material. The interviewer is specifically listening for ownership, and this answer has none.' },
        {
          text: '"My model hit 97 percent validation accuracy and I presented it before noticing a leaked column — the real number was 71. I now build the split and run a leakage check before the first model."',
          explanation: 'Correct. Real cost, fully owned, and it ends with a concrete change in behaviour rather than a sentiment.',
        },
      ],
      correct: 3,
    },
    {
      question: 'What is the specific trap of the "leadership without authority" story?',
      options: [
        { text: 'Claiming the whole team outcome as yours ("I made the project succeed")', explanation: 'Correct. Inflation is heard instantly and it discounts everything else you said in the round.' },
        { text: 'Naming which parts your teammates did', explanation: 'That is the fix, not the trap. Explicit credit-sharing reads as confidence.' },
        { text: 'Telling a story where you had no formal title', explanation: 'That is the entire premise of the question — moving a group with nothing that gives you the right to.' },
        { text: 'Mentioning that you asked someone for help', explanation: 'Asking for help is normal and often a positive signal. It is not what sinks this story.' },
      ],
      correct: 0,
    },
    {
      question: 'The prompt is "tell me about a time the requirements were unclear". Which opening is stronger?',
      options: [
        { text: '"The professor gave us a dataset and I built an XGBoost model that reached 0.91 AUC."', explanation: 'Skips the ambiguity entirely and answers a different question. The result is fine and the prompt was wasted.' },
        {
          text: '"The brief was literally \'do something useful with this data\'. In the first two days I wrote down three questions it could answer, asked the professor which one he would actually use, and dropped the other two — then built the smallest version of that one."',
          explanation: 'Correct. It shows the scope cut, who was consulted, what was deliberately excluded, and a cheap test before committing.',
        },
        { text: '"It was unclear, so I waited for the requirements to be clarified before starting."', explanation: 'Waiting is the anti-signal for this exact competency. The question exists to see whether you can move without full information.' },
        { text: '"I built all three versions and let him pick at the end."', explanation: 'Expensive, and it shows no prioritisation — the point is choosing under uncertainty, not avoiding the choice.' },
      ],
      correct: 1,
    },
    {
      question: 'For a deadline story, which ending is the strongest?',
      options: [
        { text: '"I worked three nights straight and got everything done."', explanation: 'Heroics as the moral. It signals weak planning, and it does not repeat — nobody can staff a team on all-nighters.' },
        { text: '"I asked for an extension and got one."', explanation: 'Sometimes the right call, but as the whole story it shows no tradeoff and no decision you owned.' },
        { text: '"We all pulled together as a team and made it happen."', explanation: 'No "I", no tradeoff, nothing measurable. Warm and unscorable.' },
        {
          text: '"I cut the admin dashboard, told my teammate on day one it was going, and shipped the graded demo path with a day to spare."',
          explanation: 'Correct. A deliberate tradeoff, something explicitly dropped, and early communication — which is half the credit on this competency.',
        },
      ],
      correct: 3,
    },
    {
      question: 'Which sentence gives an interviewer evidence they can actually write down?',
      options: [
        { text: '"We decided to move the email sending to a queue."', explanation: 'A team decision with no author. The interviewer cannot tell whether you proposed it, built it, or watched it happen.' },
        { text: '"Our team improved API latency by 60 percent."', explanation: 'A real number attached to nobody. Good numbers do not rescue a "we" — the ownership box is still empty.' },
        {
          text: '"I proposed the queue after measuring that 80 percent of request time was the email send, then implemented the worker and the retry path."',
          explanation: 'Correct. Measurement, proposal, implementation — three attributable decisions in one sentence, all in first person.',
        },
        { text: '"The project was a success and the faculty were happy with it."', explanation: 'An outcome with no mechanism and no author. This is the ending the weak version of every story uses.' },
      ],
      correct: 2,
    },
    {
      question: 'How should the eight stories be rehearsed?',
      options: [
        {
          text: 'Bullets in a file, said out loud to about two minutes, worded differently each time, with three follow-ups drilled per story',
          explanation: 'Correct. Fixed content, flexible wording — that is what survives the follow-up questions where the round is actually decided.',
        },
        { text: 'Memorised word for word and recited', explanation: 'Memorised answers sound memorised, and they collapse the moment a follow-up steps off the script.' },
        { text: 'Not rehearsed at all — spontaneity keeps it honest', explanation: 'Spontaneity is exactly what produces the ninety-second Situation and the "we discussed it a lot" Action.' },
        { text: 'Recorded and rewritten until it is a polished five-minute narrative', explanation: 'Length is the failure mode, not the goal. Five minutes means the interviewer stopped listening around minute two.' },
      ],
      correct: 0,
    },
  ],
  interviewQuestions: [
    {
      question: 'Tell me about a time you disagreed with a teammate.',
      answer:
        'Probing: can you disagree with a peer without it turning personal, and did a decision actually get made. Model answer, about two minutes. Situation: "Five-person semester project, five weeks, no GPU — about 4,000 free-text feedback entries to classify." Task: "I owned the model choice and the evaluation." Action: "Rohit wanted to fine-tune BERT; I thought a linear baseline would do. Before arguing I asked him why, and his reason was good — a bag-of-words model had missed negation for him on an earlier project. So I proposed we stop trading opinions and spend one evening measuring, with the deciding numbers agreed in advance: macro-F1 and retrain wall-clock. I built the TF-IDF plus logistic-regression baseline, he ran the fine-tune on a free Colab tier, and I put his negation cases into the test set so his concern was covered whichever won." Result: "0.79 macro-F1 against 0.83, but 40 seconds to retrain against roughly three hours with two session timeouts. We shipped the baseline in week 4 of 5, and he owned the negation checks afterwards. What I took from it: a disagreement with an agreed metric is just an experiment, and an experiment ends in an evening." What that answer does: states his reasoning fairly first, gives the decision a mechanism rather than a winner, and lands a number.',
      isCaseBased: true,
    },
    {
      question: 'Tell me about a time you failed.',
      answer:
        'Probing: ownership without excuses, and whether the failure changed your behaviour. Model answer. Situation: "Solo ML project, predicting whether a support ticket would be reopened, about 30,000 rows." Task: "Everything — data, model, and the write-up I presented to the class." Action: "I got 97 percent validation accuracy and presented it. A classmate asked which features mattered most, and the top one was a status field that is only written after a ticket closes. I had leaked the answer into the input. I said so in the same session rather than quietly fixing the slides, rebuilt the split by ticket creation time instead of random shuffle, dropped every field written after ticket creation, and re-ran it." Result: "The honest number was 71 percent, which was still better than the majority baseline of 63. I re-presented the following week with both numbers side by side. What changed permanently: a leakage check is now the first cell of every notebook I write — for each feature I ask when it becomes known relative to prediction time." Note what makes it usable: a real cost, no one else to blame, and evidence the change stuck rather than a promise that it did.',
      isCaseBased: true,
    },
    {
      question: 'Tell me about a time you had to deliver under a tight deadline.',
      answer:
        'Probing: prioritisation under a constraint, and whether you communicate early. Model answer. Situation: "Internship, two weeks left, and the demo my mentor wanted for a review had three pieces: an ingestion job, the model API, and an admin dashboard." Task: "The API and the dashboard were mine." Action: "In the first two days I estimated the dashboard alone at a week and told my mentor immediately that all three would not land. I proposed dropping the dashboard and shipping a documented API with a Postman collection instead, because the review was about whether the model could be called, not about how it looked. He agreed. I spent the saved week on retries and a health endpoint, and I wrote down what was dropped and why so nobody discovered it on demo day." Result: "The API shipped four days before the review with a 99th-percentile latency under 300 ms in our load test. The dashboard was built by an intern the following month using that API. The lesson: cutting scope on day one is a decision, and cutting it on the last day is a failure — same feature, completely different signal." The moral is the tradeoff, not the effort.',
      isCaseBased: true,
    },
    {
      question: 'Tell me about a time you led something without being in charge of it.',
      answer:
        'Probing: influence with no authority, and honest attribution. Model answer. Situation: "Four-person capstone, three weeks in, and the code was moving over WhatsApp as zip files. We had already lost two days of work to overwriting each other." Task: "Nothing formally — I was one of four, with no lead role." Action: "Instead of proposing a whole process, I made the smallest useful thing: a repo with the current code merged, a README with three commands, and one pull request showing what a review looked like. I demoed it in ten minutes at our next meeting. One teammate resisted because he had never used branches, so I paired with him for half an hour on his first PR rather than arguing that he should learn it." Result: "Within two weeks every change came through a pull request and we did not lose work again. To be clear about credit: the CI setup on top of it was his idea and he built it. What I learned is that a working example moves people faster than a proposal does." Note the two moves being graded: the persuasion mechanism, and naming what someone else did.',
      isCaseBased: true,
    },
    {
      question: 'Tell me about a project where the requirements were unclear.',
      answer:
        'Probing: comfort starting without full information, and whether you can cut scope deliberately. Model answer. Situation: "A professor handed our group a 200,000-row dataset of campus energy readings and said, roughly, do something useful with it." Task: "I took the framing — deciding what question we were actually answering." Action: "I spent the first two days writing down three candidate questions: forecast next-day consumption, detect anomalous meters, or rank buildings by waste. Then I asked the professor one question — which of these would he act on — and he said anomaly detection, because the facilities team already asks him about odd bills. That killed two of the three. I wrote a one-page scope note saying explicitly what we were not doing, then built the cheapest possible version in a day: a rolling z-score per meter, no model at all, to see whether the anomalies it surfaced looked real to him." Result: "The crude version flagged 11 meters, and he confirmed 7 were genuinely odd, so the direction was validated before we spent three weeks on it. We shipped a proper seasonal model in week four. The lesson: the fastest way out of ambiguity is a cheap test of the framing, not a better model."',
      isCaseBased: true,
    },
    {
      question: 'If the job is technical, why does this round exist at all?',
      answer:
        'Because the failure modes of an engineer on a team are mostly not technical. The round tests three things that code screens cannot: ownership (do you treat the outcome as yours or as something that happened to you), self-awareness (can you name a real mistake and what you changed), and communication under mild pressure (can you structure a story on the spot). It is not a personality test and not a likeability contest — interviewers are filling a form with named competency areas and your story is evidence for one of them. The practical consequence: a story that fits no competency box scores nothing, however interesting it is. That is why the preparation is written stories mapped to competencies, not general charm.',
      isCaseBased: false,
    },
    {
      question: 'A prompt lands that does not match any story you prepared. What do you do?',
      answer:
        'Match on the underlying competency, not the wording. Most prompts are variations: "a difficult teammate", "a disagreement", and "convincing someone of a technical decision" all want the conflict story. That is exactly why each story in the bank carries theme tags — you search tags rather than memory, and it takes seconds instead of stalling. If nothing matches, two moves are legitimate. One: buy five seconds out loud — "let me think of the best example" is fine and far better than filler. Two: reframe honestly — "the closest thing I have is X, where the constraint was Y — is that the kind of situation you mean?" Interviewers accept that; what they cannot use is a story stretched to fit a prompt it does not answer.',
      isCaseBased: false,
    },
    {
      question: 'You are a student with no full-time industry experience. What do these stories come from?',
      answer:
        'Coursework projects, team projects, internships, open-source contributions, hackathons, and side projects that failed. All of it is legitimate raw material, because the competency being tested is identical at any scale: did you own a decision, did you handle a person, did you cut scope, did you learn from the outcome. A four-person semester project with a real deadline and a real disagreement demonstrates conflict resolution exactly as well as a production incident does. What does not work is inflating it — calling a class project "a platform" or a two-week script "a system" is heard instantly and costs more than the story earns. Say the scale plainly in the Situation, then spend the answer on the decisions. Told with ownership and one honest number, student-scale is enough.',
      isCaseBased: false,
    },
    {
      question: 'How would you prepare for Amazon specifically?',
      answer:
        'Amazon publishes its Leadership Principles, and its interviewers map questions to them — that is the one loop where behavioral answers are the main event rather than a side round. The preparation is mechanical: tag every story in your bank with two or three principles, and check for gaps. Ownership, Dive Deep, Bias for Action and Learn and Be Curious are the ones student-scale stories most naturally support; Customer Obsession usually needs a story where you actually talked to a user. Two cautions. The tags are for your retrieval, not for the answer — announcing "this shows my Customer Obsession" is the tell of someone who read the list last night. And Amazon describes a Bar Raiser interviewer in its own hiring material, an interviewer from outside the hiring team who holds the standard; the finer mechanics of how they weigh in are widely reported rather than fully documented, so do not over-plan around them. Also expect Dive Deep follow-ups on numbers, which is another reason the numbers live in the file.',
      isCaseBased: false,
    },
    {
      question: 'What follow-up questions should you expect, and how do you prepare for them?',
      answer:
        'The three that recur everywhere: "what would you do differently", "how did the other person react", and "what was the data — what were the actual numbers". Close behind: "why did you choose that", "what did the rest of the team think", and "what happened after you left". The rule to internalise is that a story which cannot survive three follow-ups was too thin, and it is thin for one of two reasons — you were not really the person who did it, or nothing was ever measured. So preparation means writing three anticipated follow-ups per story into the same file as the story, which is also a diagnostic: if you cannot write them, pick a different story. And if you genuinely do not remember a number, say so and give the shape — "I do not recall the exact figure, it was roughly a fifth of the runtime" — because a confident precise guess is how people get caught.',
      isCaseBased: false,
    },
    {
      question: 'What questions do you have for me?',
      answer:
        'Treat this as a scored part of the round, because the interviewer remembers what you asked. A generic question is a wasted signal: "what is the culture like" or "what stack do you use" are answerable from the careers page, so asking them says you did not read it. Ask what only this person can answer — what they are working on this quarter, the tradeoff their team is currently living with, how the team decides what to build next, what they would want someone in this role to have shipped after six months. The strongest version is a question that follows from something they said earlier in the interview, because it proves you were listening. Keep two prepared per interviewer, and route compensation, level and leave questions to the recruiter rather than the engineer who just interviewed you.',
      isCaseBased: false,
    },
    {
      question: 'How long should a behavioral answer be, and how do you keep it there?',
      answer:
        'About two minutes for the story, then let the follow-ups extend it — the interviewer will pull on whatever they want more of, and that is the conversation you want. Keeping it there is a structural problem, not a discipline problem. Two sentences of Situation is the hard budget; one sentence of Task; the Action is 60 to 70 percent of the words; the Result is what changed plus one line of lesson. The trainable part is rehearsing out loud against a timer, because reading a story silently always feels shorter than saying it. Do not memorise the wording — memorised answers sound memorised and collapse on the first follow-up — but do memorise the four beats and the numbers. If you overrun, it is almost always Situation, and the fix is to cut context rather than to speak faster.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'STAR proportions', back: 'Situation = 2 sentences. Task = 1 sentence, YOUR scope. Action = 60–70 percent of the answer, first person, specific decisions. Result = what changed + a number + one line of lesson. Total about 2 minutes.' },
    { front: 'The most common STAR defect', back: '80 percent Situation, 20 percent Action. The interviewer learns the project and nothing about you. If Action is not the longest part, the answer is broken.' },
    { front: 'The pronoun rule', back: '"We" belongs in the Situation (team context). The Action must be "I" — I measured, I proposed, I implemented, I told them on day one. Fewer than four decision sentences starting with "I" means the story is not ready.' },
    { front: 'The eight stories', back: 'Conflict · Failure · Leadership without authority · Ambiguity · Deadline/pressure · Learning something hard fast · Feedback acted on · A decision you would make differently.' },
    { front: 'Conflict story — trap and fix', back: 'Trap: making the other person a villain. Fix: state their reasoning fairly before yours, show the decision mechanism (agreed metric, timeboxed test), end with the relationship intact.' },
    { front: 'Failure story — the two requirements', back: 'A real cost (not "I work too hard", not a failure that turned out fine anyway) AND what you changed afterwards, with evidence the change stuck.' },
    { front: 'Deadline story — the moral', back: 'Not heroics. Name the tradeoff you made deliberately, what you DROPPED, and that you said so early. Cutting scope on day one is a decision; on the last day it is a failure.' },
    { front: 'Failure vs "would do differently"', back: 'Failure: the outcome was bad and you own it. Would-do-differently: the outcome may have been fine — this probes judgement and growth on a decision that was reasonable given what you knew.' },
    { front: 'The follow-up rule', back: 'Expect three: what would you do differently, how did they react, what were the numbers. A story that cannot survive three follow-ups was too thin — write three anticipated follow-ups per story in the file.' },
    { front: 'Amazon Leadership Principles — how to use them', back: 'Publicly published (currently 16). Tag each story with 2–3 for YOUR retrieval; never announce the principle name in the answer. A Bar Raiser interviewer from outside the team is described in Amazon\'s own hiring material; finer mechanics are widely reported, not documented.' },
  ],
  mindmapMarkdown: `- Behavioral Interviews: Eight STAR Stories
  - Why the round exists
    - Ownership, self-awareness, clarity under pressure
    - Fails: rambling, or nothing at stake
  - STAR proportions
    - S: two sentences of context
    - T: what was YOURS
    - A: the bulk, first person, decisions
    - R: number + one-line lesson
    - Defect: 80% Situation, 20% Action
  - "I" in the Action, "we" only in context
  - The eight stories
    - Conflict — not a villain
    - Failure — real cost + what changed
    - Leadership without authority — share credit
    - Ambiguity — show the scope cut
    - Deadline — the tradeoff, not heroics
    - Learning fast — the method, honestly
    - Feedback — the behaviour change
    - Would do differently — judgement
  - Story bank
    - One file per story, fixed template
    - Tag themes + LPs; one story serves three prompts
    - Rehearse aloud to 2 min, never word-for-word
  - Amazon Leadership Principles
    - Tag stories, do not recite names
    - Bar Raiser round
  - Follow-ups are the real test
    - Differently / their reaction / the data
  - Questions to ask them — never generic
  - Never fabricate: it dies on follow-ups`,
}

export default m
