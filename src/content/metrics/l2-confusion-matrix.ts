import type { Module } from '../types'

const m: Module = {
  id: 'metrics-l2-confusion-matrix',
  subjectId: 'metrics',
  level: 2,
  title: 'The Confusion Matrix: Precision, Recall & F1',
  whyItMatters:
    'A classifier makes two kinds of mistakes: it shouts when it should have stayed quiet, and it stays quiet when it should have shouted. Almost every number people quote about a classifier — precision, recall, F1, accuracy — is just those two mistake counts, divided by something. Once you can build the 2x2 table of counts and read a ratio off it, you can compute every one of these by hand, and you can say which one your problem actually needs.',
  assumes: [
    'You know what a percentage is, and can divide two numbers',
    'You have seen a Python for loop and a list',
    'You know what a classifier is: a program that looks at one item and answers yes or no',
    'Read "Loss vs Metric" first if you have not — this module only measures models, it never trains one',
  ],
  estMinutes: 44,
  sections: [
    {
      type: 'intuition',
      title: 'One table, and every metric falls out of it',
      md: `A spam filter runs over **1,000 emails**. 200 are genuinely spam, 800 are genuine mail. We call spam the **positive** class — "positive" just means the thing we are hunting for, not the thing that is good.

- The filter flags **180** emails as spam.
- Of those 180, **150** really were spam. The other **30** were real emails sent to the spam folder.
- **50** spam got through into the inbox.
- **770** real emails were correctly left alone.
- Four numbers. 150, 30, 50, 770. Every metric in this module is one of these numbers divided by a sum of two of them. Nothing harder than that happens on this page.`,
    },
    {
      type: 'intuition',
      title: 'The naming trick that ends the confusion forever',
      md: `Read every label as **two words, right to left**. The second word is what the MODEL said. The first word says whether the model was right.

- **True Positive (TP)** — model said positive, and that was true. *150 spam caught.*
- **False Positive (FP)** — model said positive, and that was false. *30 real emails in the spam folder.*
- **False Negative (FN)** — model said negative, and that was false. *50 spam in the inbox.*
- **True Negative (TN)** — model said negative, and that was true. *770 real emails delivered.*
- So "False Positive" never means "a positive that was false" — it means the model *shouted positive and was wrong*. Read the second word first and you can never flip them again.
- The model's two mistakes are FP and FN. The whole rest of this module is about which of the two you would rather have.`,
    },
    {
      type: 'math',
      intro: 'The confusion matrix for the spam filter. Rows are the truth, columns are what the model said.',
      latex: [
        '\\begin{array}{c|cc} & \\textbf{model: spam} & \\textbf{model: real} \\\\ \\hline \\textbf{truly spam} & TP = 150 & FN = 50 \\\\ \\textbf{truly real} & FP = 30 & TN = 770 \\end{array}',
        '\\text{Row sums are the truth (200 spam, 800 real). Column sums are the model (180 flagged, 820 left alone).}',
      ],
    },
    {
      type: 'intuition',
      title: 'Precision: of everything I flagged, how much was real',
      md: `Precision looks **down the column you acted on**. It only sees the 180 emails the filter touched.

- **Precision = TP / (TP + FP)** = 150 / 180 = **0.833**.
- Read it: *"when this filter says spam, it is right 83% of the time."*
- The denominator is your alarms. Precision is the trust people can put in your alarm.
- What it charges you for: **false positives** — the cost of a false alarm. Here, a real email nobody ever reads.
- The 770 correctly delivered emails are nowhere in the formula. Precision does not care how much of the world you got right, only how clean your flags were.`,
    },
    {
      type: 'intuition',
      title: 'Recall: of everything real, how much did I catch',
      md: `Recall looks **across the row that was actually positive**. It only sees the 200 emails that truly were spam.

- **Recall = TP / (TP + FN)** = 150 / 200 = **0.750**. It also goes by two other names, **sensitivity** and the **true positive rate (TPR)** — three names, one formula, and you will meet TPR again when we get to ROC curves.
- Read it: *"of all the spam that existed, this filter caught 75%."*
- The denominator is reality. Recall is your coverage of the thing you are hunting.
- What it charges you for: **false negatives** — the cost of a miss. Here, spam in the inbox.
- Notice what is missing: **neither formula contains TN.** Precision and recall are both blind to the boring majority — and that is exactly why they still say something useful when 99% of your data is negative.`,
    },
    {
      type: 'hinglish',
      md: `**Precision** = *jo maine positive bola, usme se kitne sach me positive nikle.* Meri baat ka **bharosa**. **Recall** = *jitne sach me positive the, unme se kitne maine pakde.* Meri **pakad**.

Bharosa badhaana hai? Sirf pakke cases pe ungli uthao — precision upar, par bahut saare chhoot jaayenge (recall neeche). Pakad badhaani hai? Sab pe shak karo — recall upar, par aadhe bebaqsoor bhi pakde jaayenge (bharosa gaya). Threshold ka slider bas yehi ek sawaal poochta hai: **bharosa ya pakad?** Dono ek saath 100% chahiye — woh option menu me hai hi nahi.`,
    },
    {
      type: 'math',
      intro: 'Every formula in this module, in one place. Nothing here has more than one division.',
      latex: [
        '\\text{Precision} = \\frac{TP}{TP + FP} \\qquad \\text{Recall} = \\text{Sensitivity} = \\text{TPR} = \\frac{TP}{TP + FN}',
        '\\text{Specificity} = \\text{TNR} = \\frac{TN}{TN + FP} \\qquad \\text{FPR} = \\frac{FP}{FP + TN} = 1 - \\text{Specificity}',
        '\\text{Accuracy} = \\frac{TP + TN}{TP + TN + FP + FN} \\qquad F_1 = 2\\,\\frac{P \\cdot R}{P + R}',
        '\\text{Spam filter: } P = 0.833,\\; R = 0.750,\\; F_1 = 0.789,\\; \\text{Acc} = 0.920,\\; \\text{Spec} = 0.9625,\\; \\text{FPR} = 0.0375',
      ],
    },
    {
      type: 'intuition',
      title: 'The trade: one slider, two metrics moving apart',
      md: `A classifier does not really output a label. It outputs a **score** — a number, usually between 0 and 1, saying how spam-like this email looks. A **threshold** is the cut-off you pick: score above it, call it spam; below it, leave it alone. Move the threshold and the four cells move.

- **Lower the threshold** (flag more emails): TP goes up *and* FP goes up. Recall rises, precision falls.
- **Raise the threshold** (flag fewer emails): FP goes down *and* FN goes up. Precision rises, recall falls.
- The two extremes are worth memorising. **Flag everything**: FN = 0, so recall = 1.0. But precision collapses to the **base rate** — the fraction of the data that is genuinely positive, here 200/1000 = 0.20.
- **Flag nothing**: FP = 0 and TP = 0, so recall = 0, and precision is 0/0 — *undefined*. Different libraries print different things for it; that trap is in the last section.
- So neither metric alone can be trusted: each one has a cheat strategy that maxes it while the model does nothing useful. You quote them **as a pair**, always.`,
    },
    { type: 'visual', component: 'ConfusionMatrixLab', props: {} },
    {
      type: 'note',
      md: `Drag the threshold and watch the four cells and the four metrics move **together** — that is the whole lesson of this module in one gesture. Push the slider left and you flag more: TP and FP both climb, recall marches toward 1.0 while precision bleeds out. Push it right: FP drains away, precision climbs, and FN quietly fills up. Watch the pairs that move in lockstep — TP up always means FN down (they share the same 200 real spam), FP up always means TN down (they share the same 800 real emails). Only two of the four cells are free to move; the other two follow.`,
    },
    {
      type: 'intuition',
      title: 'F1: why the harmonic mean, and not the ordinary one',
      md: `When you must report a single number, you combine precision and recall. F1 is their **harmonic mean**: instead of averaging the two numbers, you average their reciprocals (1 divided by each) and then flip the answer back over. That sounds fussy, and it is doing real work.

- A model flags exactly one email, and it is spam. Precision = **1.00**. Recall = 1/200 = **0.005**. Call it 0.01 to keep the arithmetic clean.
- **Arithmetic mean** (the ordinary one): (1.00 + 0.01) / 2 = **0.505**. That model is useless and just scored above half marks.
- **Harmonic mean**: 2 x (1.00 x 0.01) / (1.00 + 0.01) = 0.02 / 1.01 = **0.0198**. Correct verdict: near zero.
- Why it behaves that way: 1/0.01 = 100 while 1/1.00 = 1. The reciprocal of the small number is enormous and swamps the sum, so the harmonic mean is dragged down to sit near the *smaller* of the two.
- So F1 asks *"are BOTH decent?"*, while the arithmetic mean asks *"is the total okay?"* and lets one metric pay for the other's failure.
- The rule: **F1 cannot be high unless both are high.** Our spam filter: 2 x 0.833 x 0.750 / 1.583 = **0.789**, honestly sitting between the two.`,
    },
    {
      type: 'math',
      intro: 'You will see F1 written two ways. They are the same formula — here is the algebra that turns one into the other, so you never have to take it on trust.',
      latex: [
        'F_1 = \\frac{2}{\\frac{1}{P} + \\frac{1}{R}} \\qquad \\text{(the definition: flip both, average them, flip back)}',
        '\\frac{1}{P} + \\frac{1}{R} = \\frac{R}{PR} + \\frac{P}{PR} = \\frac{P + R}{PR} \\qquad \\text{(common denominator } PR \\text{)}',
        'F_1 = \\frac{2}{\\frac{P+R}{PR}} = 2 \\cdot \\frac{PR}{P+R} \\qquad \\text{(dividing by a fraction = multiplying by it upside down)}',
      ],
    },
    {
      type: 'intuition',
      title: 'F-beta: letting a miss count for more than a false alarm',
      md: `F1 hides an assumption. Look at the definition again: it adds 1/P and 1/R with **equal weight**, half each. That is a statement that a false alarm and a miss hurt you equally. They almost never do.

- **F-beta** is the same harmonic mean with the two halves replaced by unequal weights. The weights still add up to 1: precision gets **1/(1 + beta squared)**, recall gets **beta squared / (1 + beta squared)**.
- Try beta = 2. Then beta squared = 4, and the weights are 1/5 = **0.2** on precision and 4/5 = **0.8** on recall. Recall is being counted 4 times as heavily.
- Try beta = 0.5. Then beta squared = 0.25, and the weights are 1/1.25 = **0.8** on precision and 0.25/1.25 = **0.2** on recall. Now precision counts 4 times as heavily.
- Try beta = 1. Both weights are 1/2. F-beta collapses back into F1, exactly.
- So there is one thing to remember, and it is a ratio: **recall's weight divided by precision's weight is beta squared.** The next box shows that in two lines of algebra, and turns the weighted form into the formula libraries actually use.`,
    },
    {
      type: 'math',
      intro: 'F-beta from the weighted harmonic mean. Line 1 is the definition, line 4 is the ratio of the two weights, and line 3 is the form sklearn computes.',
      latex: [
        '\\frac{1}{F_\\beta} = \\underbrace{\\frac{1}{1+\\beta^2}}_{\\text{weight on }P} \\cdot \\frac{1}{P} \\;+\\; \\underbrace{\\frac{\\beta^2}{1+\\beta^2}}_{\\text{weight on }R} \\cdot \\frac{1}{R} \\qquad \\text{(the two weights sum to } 1 \\text{)}',
        '\\frac{1}{F_\\beta} = \\frac{R}{(1+\\beta^2)PR} + \\frac{\\beta^2 P}{(1+\\beta^2)PR} = \\frac{\\beta^2 P + R}{(1+\\beta^2)\\,PR} \\qquad \\text{(same common denominator trick)}',
        'F_\\beta = (1+\\beta^2)\\,\\frac{P \\cdot R}{\\beta^2 P + R} \\qquad \\text{(flip both sides over)}',
        '\\frac{\\text{weight on } 1/R}{\\text{weight on } 1/P} = \\frac{\\beta^2/(1+\\beta^2)}{1/(1+\\beta^2)} = \\beta^2 \\qquad \\text{(the } (1+\\beta^2) \\text{ cancels)}',
      ],
    },
    {
      type: 'intuition',
      title: 'Choosing beta, honestly',
      md: `The algebra above proves exactly one thing: **beta squared is how many times more weight recall gets than precision.** It does not tell you what beta should be. That part is a decision you make, and it is worth being clear about where the maths stops.

- **beta > 1 leans toward recall.** F2 (beta = 2) counts recall 4 times as heavily. Use it when a miss is expensive: disease screening, fraud, safety alerts.
- **beta < 1 leans toward precision.** F0.5 counts precision 4 times as heavily. Use it when a false alarm is expensive: spam, content takedowns, auto-blocking accounts.
- The common rule of thumb is *"set beta squared equal to the cost ratio"*, i.e. beta = the square root of (cost of a miss / cost of a false alarm). Read that for what it is: you have a knob whose meaning is a weight ratio, and you are choosing to point it at your cost ratio. It is a sensible translation, not a theorem — nothing above derives it, and nothing can, because F-beta never mentions money.
- If you genuinely know both costs in rupees, do not use F-beta at all. Directly add up what the model costs you: **(cost of a miss) x FN + (cost of a false alarm) x FP**, and pick the threshold that makes that total smallest. F-beta is for when you only know the *direction* of the asymmetry, not its price.
- Our spam filter, same four cells: **F2 = 0.765** (drags toward the weaker recall), **F0.5 = 0.815** (drags toward the stronger precision), F1 = 0.789 in the middle. Same model, three verdicts — so pick beta *before* comparing two models, or you are just picking a winner.`,
    },
    {
      type: 'intuition',
      title: 'Specificity and FPR: the other row of the table',
      md: `Precision and recall both live in the positive column and the positive row. The negatives have their own pair, and you will need them for ROC curves in the next module.

- **Specificity (also called TNR) = TN / (TN + FP)** = 770 / 800 = **0.9625**. It is recall's mirror image: *of all the genuine emails, how many did I correctly leave alone?*
- **FPR (false positive rate) = FP / (FP + TN)** = 30 / 800 = **0.0375**. Same denominator, so it is simply **1 - specificity**: *what fraction of innocent cases did I wrongly accuse?*
- Recall is computed inside the positive row; specificity inside the negative row. Neither one knows the other exists — which is why medicine quotes both ("this test is 90% sensitive, 95% specific").
- The **ROC curve plots TPR against FPR** as the threshold sweeps from 1 down to 0. That is its whole definition, and both of its axes are now defined for you.
- One thing to carry forward: FPR's denominator is the entire negative class. When negatives are 99% of the data, thousands of new false alarms barely move FPR — while precision, whose denominator is only what you flagged, collapses. That single fact is the reason the next module spends time on when ROC flatters a bad model.`,
    },
    {
      type: 'intuition',
      title: 'Accuracy: when it is fine, and when it is a lie',
      md: `**Accuracy = (TP + TN) / everything** = 920 / 1000 = **0.920**. It is not a bad metric. It is a metric with two preconditions that people forget to check.

- **Fine when the classes are roughly balanced** — so no single class can win the score just by being common.
- **Fine when the two error types cost about the same** — because accuracy counts an FP and an FN identically, by construction.
- Both hold for something like handwritten digit recognition: ten roughly equal classes, and mistaking a 3 for an 8 costs the same as the reverse. Report accuracy there and stop.
- **A lie when positives are rare.** You will see this happen with real numbers two sections from now.
- **A lie when the costs are lopsided**, even at a perfect 50/50 split. Accuracy will happily prefer a model that trades 10 caught tumours for 10 fewer false alarms.
- The habit that saves you: accuracy only means something next to the **majority-class baseline** — the score you would get by always guessing the more common class. Our filter's baseline is 800/1000 = 0.80, so 0.92 is real progress. Without that comparison the number is uninterpretable.`,
    },
    {
      type: 'intuition',
      title: 'Which one matters more? Ask what each mistake costs',
      md: `There is no universal answer. Name the two costs, and the metric picks itself.

- **Spam filter — precision wins.** A false negative is one spam in your inbox: you delete it in a second. A false positive is a job offer, an invoice, a doctor's result rotting in the spam folder — possibly never seen. The costs are not close, so favour precision (F0.5), raise the threshold, and accept letting some spam through.
- **Cancer screening — recall wins.** A false negative is a tumour that grows for another year. A false positive is one more test, some anxiety, a few thousand rupees. Favour recall (F2 or higher), lower the threshold, and accept many false alarms.
- Same mathematics, opposite decisions, because the cost ratio is inverted. Nothing about the model changed.
- One real-world bound: recall is capped by **capacity**. If lowering the threshold generates 5,000 follow-up scans a day and the hospital can do 500, the extra recall is imaginary. The cost ratio sets the direction; capacity sets how far you can actually go.`,
    },
    {
      type: 'visual',
      component: 'PythonPlayground',
      props: {
        code: `# 12 emails, each already scored by the model. Higher score = looks more like spam.
scores = [0.95, 0.88, 0.80, 0.72, 0.65, 0.61, 0.44, 0.35, 0.28, 0.14, 0.09, 0.03]
truth  = [1, 1, 0, 1, 0, 1, 1, 0, 0, 0, 0, 0]
THRESHOLD = 0.60

TP = FP = FN = TN = 0
for score, actual in zip(scores, truth):
    flagged = score >= THRESHOLD
    if flagged and actual == 1:
        TP += 1
    elif flagged:
        FP += 1
    elif actual == 1:
        FN += 1
    else:
        TN += 1

print('THRESHOLD %.2f  ->  TP=%d  FP=%d  FN=%d  TN=%d' % (THRESHOLD, TP, FP, FN, TN))`,
        annotations: {
          2: 'A plain Python list of 12 numbers, sorted from most spam-like to least. This is what a classifier really produces: scores, not labels.',
          3: 'The true answer for each email, in the same order. 1 means it really was spam, 0 means it really was a genuine email. Position 3 in this list describes the email with score 0.80.',
          4: 'The cut-off. Any email scoring 0.60 or above will be called spam. Change this one number and every count below changes.',
          6: 'Start all four counters at zero. Python lets you assign the same value to several names in one line: TP, FP, FN and TN all become 0.',
          7: 'zip(scores, truth) walks both lists at the same time and hands you one pair per turn: the first score with the first truth value, then the second with the second, and so on. score and actual are the two halves of that pair.',
          8: 'Compare this score to the cut-off. The result is True or False, and it is the model saying spam or not-spam for this one email.',
          9: 'Both conditions true: the model said spam AND it really was spam. That is the definition of a true positive.',
          10: 'Add one to the TP counter. += 1 is shorthand for TP = TP + 1.',
          11: 'We only get here if the line above was false, so actual is not 1. flagged is still true, so the model said spam about a genuine email: a false positive.',
          12: 'Add one to the FP counter.',
          13: 'We only get here if flagged is false, so the model said not-spam. If the truth was 1, the model missed a real spam: a false negative.',
          14: 'Add one to the FN counter.',
          15: 'Everything left over: the model said not-spam and it really was not spam.',
          16: 'Add one to the TN counter. Every email lands in exactly one of the four counters, so TP + FP + FN + TN is always 12.',
          18: 'Print the four numbers. %.2f prints a number with two decimals, %d prints a whole number, and the values in the brackets after % fill those slots in order.',
        },
        precomputedOutput: `THRESHOLD 0.60  ->  TP=4  FP=2  FN=1  TN=5`,
        caption:
          'Change THRESHOLD and re-run. At 0.40 you get TP=5 FP=2 FN=0 TN=5 (recall 1.00, precision 0.714). At 0.85 you get TP=2 FP=0 FN=3 TN=7 (precision 1.00, recall 0.40). Same model, same emails — only the cut-off moved.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Part 2: the four counts turn into the four metrics',
      code: `TP, FP, FN, TN = 4, 2, 1, 5

precision = TP / (TP + FP)
recall = TP / (TP + FN)
f1 = 2 * precision * recall / (precision + recall)
accuracy = (TP + TN) / (TP + FP + FN + TN)

print('precision = %d/%d = %.3f' % (TP, TP + FP, precision))
print('recall    = %d/%d = %.3f' % (TP, TP + FN, recall))
print('f1        = %.3f' % f1)
print('accuracy  = %.3f' % accuracy)

# ---- real output ----
# precision = 4/6 = 0.667
# recall    = 4/5 = 0.800
# f1        = 0.727
# accuracy  = 0.750`,
      annotations: {
        1: 'The four numbers the loop printed, typed in by hand. Python unpacks the four values on the right into the four names on the left, in order.',
        3: 'Precision: divide TP by everything the model flagged, which is TP + FP = 4 + 2 = 6.',
        4: 'Recall: divide TP by everything that really was positive, which is TP + FN = 4 + 1 = 5. One character different from the line above, completely different question.',
        5: 'F1 in the form we derived: 2 times the product over the sum. Safe here because both numbers are above zero; if both were zero this line would divide by zero.',
        6: 'Accuracy: the two correct cells over all four cells, so 9 out of 12.',
        8: 'Print the division itself, not just the answer, so you can check it against the table by eye.',
        9: 'Same line for recall. Notice the printed denominators differ: 6 versus 5.',
        10: 'F1 to three decimals. It sits between 0.667 and 0.800, closer to the smaller one, exactly as the harmonic mean should.',
        11: 'Accuracy is 0.750 here. This small example is nearly balanced (5 spam, 7 real), so accuracy is not yet lying. The next section breaks it.',
      },
    },
    {
      type: 'intuition',
      title: 'Worked case: a camera checking bottles on a factory line',
      md: `A camera inspects **600 bottles**. **60** of them are genuinely cracked (the positive class). The camera flags **50** bottles for removal, and **36** of those really were cracked. Work out every metric from that, by hand.

- First recover the four cells. **TP = 36** (flagged and cracked). **FP = 50 - 36 = 14** (flagged but fine). **FN = 60 - 36 = 24** (cracked but missed). **TN = 600 - 36 - 14 - 24 = 526**.
- Sanity check before anything else: 36 + 14 + 24 + 526 = **600**. Row sums: 36 + 24 = 60 cracked, 14 + 526 = 540 fine. Both correct, so the cells are right.
- **Precision** = 36 / (36 + 14) = 36 / 50 = **0.720**. When the camera rejects a bottle, it is right 72% of the time.
- **Recall** = 36 / (36 + 24) = 36 / 60 = **0.600**. It catches only 6 of every 10 cracked bottles.
- **F1** = 2 x 0.720 x 0.600 / (0.720 + 0.600) = 0.864 / 1.320 = **0.655**. Sitting between them, nearer the weaker recall.
- **Specificity** = 526 / 540 = **0.974**, and **FPR** = 14 / 540 = **0.026** = 1 - 0.974.
- **Accuracy** = (36 + 526) / 600 = 562 / 600 = **0.937** — but the majority-class baseline (always say "fine") is 540 / 600 = **0.900**. Three and a half points of real progress, not ninety-four.`,
    },
    {
      type: 'intuition',
      title: 'The same case, with the cost put in',
      md: `A cracked bottle reaching a customer is a complaint and a refund. A good bottle thrown away costs the price of one bottle. So a miss costs far more than a false alarm here — recall is the weak side and the expensive side at the same time.

- **F2** (recall counted 4x) = 5 x 0.720 x 0.600 / (4 x 0.720 + 0.600) = 2.160 / 3.480 = **0.621**. Lower than F1, because it leans on our weaker number.
- **F0.5** (precision counted 4x) = 1.25 x 0.720 x 0.600 / (0.25 x 0.720 + 0.600) = 0.540 / 0.780 = **0.692**. Higher, because it leans on our stronger number.
- Same model, three scores: 0.621, 0.655, 0.692. The model did not change; only the question changed.
- What to actually do: lower the threshold so more bottles get flagged. Recall rises, precision falls, and you accept throwing away some good bottles.
- How far to lower it: until the line's reject-handling capacity is full, or until one more thrown-away bottle costs more than one more escaped crack. Not until F1 peaks.`,
    },
    {
      type: 'intuition',
      title: 'The classic mistake: the accuracy paradox',
      md: `Now the mistake almost everyone makes once. A new spam dataset: **1,000 emails, 950 genuine and 50 spam** — a 95/5 split. A junior engineer trains a model, reports **95% accuracy**, and ships it. The model is worthless, and here is the proof in four numbers.

- The model has learned exactly one behaviour: **always answer "not spam"**. It never flags anything.
- Its four cells: **TP = 0** (it never flagged, so it never correctly flagged). **FP = 0** (it never flagged, so it never wrongly flagged). **FN = 50** (all 50 spam missed). **TN = 950** (all genuine mail left alone).
- **Accuracy** = (0 + 950) / 1000 = **0.950**. A real, correctly computed 95%.
- Why accuracy lies here: it is the fraction of *all* rows the model got right, and 950 of the 1,000 rows are the easy negative class. The model harvests all of them for free. The 50 rows anybody cares about contribute 5% of the score at most.
- The check that catches it in one second: the majority-class baseline is also 950/1000 = **0.950**. The model scores exactly what guessing scores. Zero progress.`,
    },
    {
      type: 'intuition',
      title: 'What precision and recall say about the same model',
      md: `Run the same four cells through precision and recall instead, and the lie collapses immediately.

- **Recall** = TP / (TP + FN) = 0 / (0 + 50) = **0.000**. It caught none of the spam. This number alone kills the model.
- **Precision** = TP / (TP + FP) = 0 / 0 — **undefined**. There are no alarms to judge. Some libraries print 0.0 here, some print 1.0; either way the honest reading is "there is nothing to measure".
- **F1** = 2PR / (P + R) is 0 as soon as recall is 0. No amount of precision rescues it, which is the whole point of the harmonic mean.
- The structural reason: accuracy contains TN, and TN is 950 here. Precision and recall contain no TN at all, so the free 950 cannot inflate them.
- Compare a real model on the same data — say TP = 35, FP = 20, FN = 15, TN = 930. Accuracy = 965/1000 = **0.965**, only 1.5 points above the useless model. But precision = 35/55 = **0.636** and recall = 35/50 = **0.700**, versus undefined and 0.000. The pair separates the two models by a mile; accuracy barely notices the difference.
- The habit to keep: whenever someone quotes accuracy, ask for the class split and the majority-class baseline in the same breath. If they are close together, accuracy told you nothing.`,
    },
    {
      type: 'intuition',
      title: 'Practice problems',
      md: `Work these on paper first. Full solutions are in the next two sections — do not read ahead.

1. A fraud model is run on 1,000 transactions. **TP = 80, FP = 20, FN = 40, TN = 860.** Compute precision, recall, F1 and accuracy, and state the majority-class baseline.
2. A rare-disease test is run on 1,000 people; 30 actually have the disease. The test says "healthy" for every single person. Give all four cells, accuracy, recall and precision, and say in one sentence what is wrong.
3. A model has precision 0.50 and recall 0.90. Your product owner says a miss costs about 9 times what a false alarm costs. Which beta does the rule of thumb suggest, what weight does recall then carry, and what is the resulting F-beta score?
4. Two models. **A: precision 0.90, recall 0.50.** **B: precision 0.60, recall 0.75.** Compute F1 and F2 for both. Which one wins under each, and what changed?`,
    },
    {
      type: 'intuition',
      title: 'Solutions: problems 1 and 2',
      md: `**Problem 1.** Check the cells first: 80 + 20 + 40 + 860 = 1,000. Actual positives = 80 + 40 = 120. Flagged = 80 + 20 = 100.

- Precision = 80 / (80 + 20) = 80/100 = **0.800**. Recall = 80 / (80 + 40) = 80/120 = **0.667**.
- F1 = 2 x 0.800 x 0.667 / (0.800 + 0.667) = 1.0667 / 1.4667 = **0.727**.
- Accuracy = (80 + 860) / 1000 = **0.940**. Majority-class baseline = 880/1000 = **0.880**, since 880 of the 1,000 transactions are genuine. So 0.940 is six points of real gain, not a great score by itself.

**Problem 2.** The test never says "diseased", so it never flags: **TP = 0, FP = 0, FN = 30, TN = 970.**

- Accuracy = (0 + 970) / 1000 = **0.970**. Recall = 0 / 30 = **0.000**. Precision = 0/0, **undefined**.
- What is wrong: this is the accuracy paradox. 97% accuracy is exactly the majority-class baseline, and a test that finds nobody with the disease has no medical value whatsoever.`,
    },
    {
      type: 'intuition',
      title: 'Solutions: problems 3 and 4',
      md: `**Problem 3.** The rule of thumb sets beta squared equal to the cost ratio, so beta squared = 9 and **beta = 3**.

- Recall's weight is beta squared / (1 + beta squared) = 9/10 = **0.9**; precision gets 1/10 = 0.1. Recall counts 9 times as heavily, which matches the stated costs.
- F3 = (1 + 9) x 0.50 x 0.90 / (9 x 0.50 + 0.90) = 10 x 0.45 / (4.5 + 0.9) = 4.500 / 5.400 = **0.833**.
- Sanity check on the direction: F1 here would be 2 x 0.45 / 1.40 = 0.643. F3 is much higher because it mostly reports our strong recall — which is what you asked it to do.

**Problem 4.** Note that both models have the same product P x R = 0.45, so any difference comes from the denominators.

- Model A: F1 = 2 x 0.45 / (0.90 + 0.50) = 0.900 / 1.400 = **0.643**. Model B: F1 = 2 x 0.45 / (0.60 + 0.75) = 0.900 / 1.350 = **0.667**. B wins, narrowly.
- Model A: F2 = 5 x 0.45 / (4 x 0.90 + 0.50) = 2.250 / 4.100 = **0.549**. Model B: F2 = 5 x 0.45 / (4 x 0.60 + 0.75) = 2.250 / 3.150 = **0.714**. B wins by a lot.
- What changed: nothing about the models. F2 counts recall four times as heavily, and B has the better recall, so B pulls further ahead. If instead you compute F0.5, A wins (0.804 against 0.625) because A has the better precision.
- The lesson: the ranking of two models depends on beta. Choose beta from the costs *before* you compare, never after seeing the scores.`,
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `Everything above stands on its own. This last part is for a second pass, or for the day you meet a problem with more than two classes.

- **More than two classes.** With k classes you get a k x k table, and precision, recall and F1 **per class**. Turning those into one number is a choice with three common answers.
- **Micro** — pool the raw counts across all classes first (total TP, total FP, total FN), then compute the metric once. Every *sample* counts equally, so big classes dominate. When each item gets exactly one predicted class, micro-F1 equals accuracy, exactly.
- **Macro** — compute F1 separately for each class, then take a plain average. Every *class* counts equally: a class with 10 samples has the same vote as a class with 10,000. This is the one that exposes a model ignoring rare classes.
- **Weighted** — macro, but each class's F1 is multiplied by its **support**, meaning how many true samples that class has. This pulls the answer back toward micro, so it rarely tells you anything new.
- **Which to report** on imbalanced multi-class: macro, plus the full per-class table. A big gap between micro and macro is itself the finding.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Beyond the basics: micro 0.932 vs macro 0.628, on identical predictions',
      code: `import numpy as np
from sklearn.metrics import f1_score, classification_report, accuracy_score

M = np.array([[880, 15,  5],
              [ 30, 48,  2],
              [ 14,  2,  4]])
y_true = np.repeat([0, 0, 0, 1, 1, 1, 2, 2, 2], M.ravel())
y_pred = np.repeat([0, 1, 2, 0, 1, 2, 0, 1, 2], M.ravel())

for avg in ('micro', 'macro', 'weighted'):
    print('%-8s F1 = %.3f' % (avg, f1_score(y_true, y_pred, average=avg)))
print('accuracy = %.3f' % accuracy_score(y_true, y_pred))
print(classification_report(y_true, y_pred, target_names=['A', 'B', 'C'], digits=3))

# ---- real output ----
# micro    F1 = 0.932
# macro    F1 = 0.628
# weighted F1 = 0.927
# accuracy = 0.932
#               precision    recall  f1-score   support
#            A      0.952     0.978     0.965       900
#            B      0.738     0.600     0.662        80
#            C      0.364     0.200     0.258        20
#     macro avg     0.685     0.593     0.628      1000
#  weighted avg     0.923     0.932     0.927      1000`,
      annotations: {
        1: 'numpy, imported under its usual short name np. Here it is only used to hold the table and repeat labels.',
        2: 'Three functions from sklearn: the F1 score, a ready-made per-class report, and accuracy.',
        4: 'A 3x3 confusion matrix typed in directly. Row = the true class, column = the class the model predicted. Class A is common (900 samples), B is rare (80), C is rarest (20).',
        5: 'Row B: of 48 + 30 + 2 = 80 true B samples, 48 were called B and 30 were called A.',
        6: 'Row C: of 20 true C samples, 14 were called A, 2 were called B, and only 4 were correct. That single row is the story of this model.',
        7: 'M.ravel() flattens the 3x3 table into 9 numbers, reading left to right, top to bottom. np.repeat then repeats each label that many times, rebuilding a full list of 1,000 true labels.',
        8: 'The same trick for the predicted labels. The nine class pairs line up with the nine cells, so the two lists agree cell by cell.',
        10: 'Loop over the three averaging modes. They are just three strings passed to the same function.',
        11: 'Print each one. %-8s pads the mode name to 8 characters on the left so the numbers line up.',
        12: 'Accuracy on the same predictions, printed for comparison with micro F1.',
        13: 'classification_report prints precision, recall, F1 and support for every class at once. digits=3 asks for three decimals. Read it and micro versus macro stops being abstract: micro says 0.932 and macro says 0.628, because class C scores 0.258 and macro gives it a full equal vote.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Beyond the basics: two sklearn traps — ravel order, and 0/0',
      code: `import numpy as np
from sklearn.metrics import confusion_matrix, precision_score, recall_score

y    = np.array([1, 1, 0, 1, 0, 1, 1, 0, 0, 0, 0, 0])
pred = np.array([1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0])

tn, fp, fn, tp = confusion_matrix(y, pred).ravel()
print('tn=%d fp=%d fn=%d tp=%d' % (tn, fp, fn, tp))
print('precision %.3f' % precision_score(y, pred))
print('recall    %.3f' % recall_score(y, pred))

nothing = np.zeros(12, int)
print('flag-nothing precision, zero_division=0 -> %.1f' % precision_score(y, nothing, zero_division=0))
print('flag-nothing precision, zero_division=1 -> %.1f' % precision_score(y, nothing, zero_division=1))

# ---- real output ----
# tn=5 fp=2 fn=1 tp=4
# precision 0.667
# recall    0.800
# flag-nothing precision, zero_division=0 -> 0.0
# flag-nothing precision, zero_division=1 -> 1.0`,
      annotations: {
        1: 'numpy again, only to build two arrays of labels.',
        2: 'Three sklearn functions: the confusion matrix itself, precision and recall.',
        4: 'The true labels of the same 12 emails from the playground earlier, in the same order.',
        5: 'What the model predicted at threshold 0.60: the top six scores flagged, the rest not. Compare position by position with the line above and you can count the four cells by eye.',
        7: 'confusion_matrix returns a 2x2 array; .ravel() flattens it into four numbers reading left to right, top to bottom. The order is tn, fp, fn, tp — negatives first. Unpacking it as tp, fp, fn, tn is a real and common bug, and it silently swaps your precision and recall.',
        8: 'Print them to confirm: tn=5, fp=2, fn=1, tp=4, matching the loop we wrote by hand.',
        9: 'sklearn precision on the same data: 0.667, the same number our four-line version produced.',
        10: 'sklearn recall: 0.800. The library is not doing anything you cannot do on paper.',
        12: 'np.zeros(12, int) builds a list of twelve zeros: a model that flags nothing at all. Now TP and FP are both 0, so precision is 0/0.',
        13: 'zero_division tells sklearn what to print instead of crashing. With 0 it prints 0.0.',
        14: 'With 1 it prints 1.0 — a model that predicts nothing reports perfect precision. This is why "precision 1.0" always deserves the follow-up question: how many positives did it predict at all?',
      },
    },
    {
      type: 'note',
      md: `**Read the matrix, not just the averages.** In the 3-class output above, class C is not merely "hard": **14 of its 20 samples were called A specifically**. That points at fixes an F1 score never could — C may be under-represented in training, its features may overlap A's, or the labels themselves may be inconsistent between A and C. Confusion that runs both ways (A called C and C called A) suggests genuinely similar-looking classes; confusion running one way only, into the big class, usually means the model falls back on the common answer when unsure. Also deliberately not covered here: **ROC and AUC** (next module — you already have its two axes, TPR and FPR) and threshold selection under heavy imbalance (the Class Imbalance module).`,
    },
  ],
  quiz: [
    {
      question: 'A model produces FP = 40. In plain English, what happened 40 times?',
      options: [
        {
          text: 'The true label was positive but the model missed it',
          explanation: 'That is a false NEGATIVE. Read the second word first: "positive" means the model said positive.',
        },
        {
          text: 'The model said positive and was wrong',
          explanation: 'Correct. Second word = what the model said (positive). First word = whether it was right (false). Model shouted, model was wrong.',
        },
        {
          text: 'The model said negative and was wrong about a positive case',
          explanation: 'Also a false negative — model said negative, and that was false. Different cell entirely.',
        },
      ],
      correct: 1,
    },
    {
      question: 'A spam filter flags 180 emails; 150 are truly spam. There were 200 spam in total. Precision and recall?',
      options: [
        { text: 'P = 0.75, R = 0.833', explanation: 'Swapped. Dividing by 200 (what really existed) gives recall; dividing by 180 (what you flagged) gives precision.' },
        { text: 'P = 0.833, R = 0.75', explanation: 'Correct. P = 150/180 = 0.833 (of my alarms, how many were real). R = 150/200 = 0.75 (of the real spam, how much I caught).' },
        { text: 'P = 0.833, R = 0.833', explanation: 'They only coincide when the flagged count equals the true positive count. 180 flagged versus 200 real spam guarantees they differ.' },
      ],
      correct: 1,
    },
    {
      question: '1,000 emails, 50 of them spam. A model always answers "not spam". What are its accuracy and recall?',
      options: [
        {
          text: 'Accuracy 0.950, recall 0.000',
          explanation: 'Correct. TN = 950 and TP = 0, so accuracy = 950/1000 while recall = 0/50 = 0. This is the accuracy paradox: the score matches the majority-class baseline exactly, so the model added nothing.',
        },
        { text: 'Accuracy 0.050, recall 0.950', explanation: 'Backwards. It gets all 950 genuine emails right and all 50 spam wrong, so accuracy is high and recall is zero.' },
        { text: 'Accuracy 0.950, recall 1.000', explanation: 'Recall counts caught spam over total spam. It caught none, so recall is 0, not 1.' },
      ],
      correct: 0,
    },
    {
      question: 'Precision = 1.00, recall = 0.01. Why does F1 report about 0.02 when the arithmetic mean says 0.505?',
      options: [
        { text: 'F1 uses a geometric mean, which is smaller', explanation: 'The geometric mean would be the square root of 1 x 0.01 = 0.1 — still ten times too generous. F1 is the harmonic mean.' },
        { text: 'F1 halves the arithmetic mean by convention', explanation: 'No convention involved. 0.505 halved is 0.2525, nowhere near 0.0198. The formula is genuinely different.' },
        {
          text: 'The harmonic mean averages reciprocals, so the smaller value dominates the result',
          explanation: 'Correct. 1/R = 100 swamps 1/P = 1, so the average reciprocal is huge and flipping it back gives something tiny. That is exactly the property you want: F1 stays low unless BOTH are high.',
        },
      ],
      correct: 2,
    },
    {
      question: 'In F-beta, what exactly does beta squared mean?',
      options: [
        { text: 'The number of times recall is multiplied before averaging', explanation: 'Close in spirit but wrong mechanically. The weights are beta squared/(1+beta squared) and 1/(1+beta squared); they always add to 1, so nothing is simply multiplied.' },
        {
          text: 'The ratio of recall\'s weight to precision\'s weight inside the harmonic mean',
          explanation: 'Correct, and it is two lines of algebra: the weights are beta squared/(1+beta squared) and 1/(1+beta squared), and dividing one by the other cancels the (1+beta squared), leaving beta squared.',
        },
        { text: 'The cost of a miss divided by the cost of a false alarm', explanation: 'That is the rule of thumb people point beta at, not what beta squared IS. F-beta contains no costs at all; equating the weight ratio to the cost ratio is a choice you make.' },
      ],
      correct: 1,
    },
    {
      question: 'A camera flags 50 bottles; 36 were really cracked, and 60 bottles were cracked in total. What is F1?',
      options: [
        { text: '0.655', explanation: 'Correct. P = 36/50 = 0.720, R = 36/60 = 0.600, F1 = 2 x 0.720 x 0.600 / 1.320 = 0.864/1.320 = 0.655.' },
        { text: '0.660', explanation: 'That is the plain arithmetic mean of 0.720 and 0.600. F1 is the harmonic mean, which always sits at or below the arithmetic one.' },
        { text: '0.937', explanation: 'That is the accuracy, (36 + 526)/600. F1 never uses TN, which is why the two numbers are so far apart here.' },
      ],
      correct: 0,
    },
  ],
  interviewQuestions: [
    {
      question: 'Define precision and recall without using the words "true positive".',
      answer:
        'Precision: of everything the model flagged, what fraction was genuinely positive — the trustworthiness of an alarm. Recall: of everything that genuinely was positive, what fraction the model found — the coverage of the hunt. The denominators are the real answer: precision divides by what the MODEL claimed, recall divides by what REALITY contained. The consequence worth adding: precision is what you pay for false alarms, recall is what you pay for misses, and neither one contains true negatives, which is why both still mean something when the negative class is 99% of the data and accuracy does not.',
      isCaseBased: false,
    },
    {
      question: 'Why is F1 the harmonic mean rather than the arithmetic mean? Show the arithmetic.',
      answer:
        'Because the arithmetic mean lets one metric pay for the other\'s failure. Take a model that flags a single email and gets it right: precision 1.0, recall 0.01. Arithmetic mean = (1.0 + 0.01)/2 = 0.505 — a useless model scoring above half. Harmonic mean = 2(1.0 x 0.01)/(1.0 + 0.01) = 0.02/1.01 = 0.0198, the honest verdict. The mechanism: the harmonic mean averages reciprocals, and 1/0.01 = 100 dwarfs 1/1.0 = 1, so the average reciprocal is huge and its inverse is tiny — the result is dragged toward the smaller input. The behavioural summary: F1 cannot be high unless BOTH are high. It is a conjunction, not a total.',
      isCaseBased: false,
    },
    {
      question: 'How do you choose beta in practice, and when should you not use F-beta at all?',
      answer:
        'beta > 1 leans recall (screening, fraud, safety), beta < 1 leans precision (spam, auto-takedowns, anything that punishes a user), and the common heuristic is beta = sqrt(cost of a miss / cost of a false alarm) — a miss costing 4x gives beta = 2, a miss costing 100x gives beta = 10. Two caveats matter. First, choose beta before comparing models: the ranking can flip with beta, so picking it afterwards is just picking a winner. Second, if you actually know both costs in currency, drop F-beta and minimise expected cost directly — pick the threshold that minimises C_FN x FN + C_FP x FP, which uses the real numbers instead of squashing them into one dimensionless knob. F-beta earns its place only when you know the direction of the asymmetry but not its price.',
      isCaseBased: false,
    },
    {
      question: 'What is the accuracy paradox, and how do you detect it in thirty seconds?',
      answer:
        'When one class dominates, a model that always predicts that class scores its share of the data as accuracy while being useless. At 95% genuine mail, always answering "not spam" gives TP=0, FP=0, FN=50, TN=950 on 1,000 emails: accuracy 0.950, recall 0.000, precision undefined (0/0). Accuracy lies because it counts TN, and TN is the free 950. The thirty-second detection: ask for the class split, compute the majority-class baseline (1 minus the positive rate), and put it next to the reported accuracy. If they are close, the model has added nothing. Then ask for the raw four cells — recall and precision contain no TN, so they cannot be inflated by the easy majority, and they separate a real model from the do-nothing one immediately.',
      isCaseBased: false,
    },
    {
      question: 'Case: your team ships a fraud model at F1 0.82. Six weeks later the ops lead says the alert queue is unusable and the fraud team is missing real cases. F1 has not moved. Explain how both can be true.',
      answer:
        'F1 is a single number summarising a two-dimensional trade, so many different (precision, recall) pairs give the same F1 — 0.82 could be P 0.95/R 0.72 or P 0.72/R 0.95, and those are entirely different products. First move: stop looking at F1 and pull the raw confusion matrix plus alerts-per-day. Second: F1 assumes a false alarm and a miss cost the same, which for fraud is false — get the cost of a miss (chargeback plus goodwill) and the cost of a false alarm (a few minutes of analyst time) and re-pick the threshold by minimising C_FN x FN + C_FP x FP, or simply by filling exactly the queue capacity the team has. Third: check for drift — the score distribution can shift under a fixed threshold so that precision falls while a summary number looks stable. The takeaway to state plainly: F1 was never the objective, it was a proxy nobody re-derived from the costs.',
      isCaseBased: true,
    },
    {
      question: 'Case: a spam filter\'s precision drops from 0.90 to 0.60 over a quarter. The model was not retrained and its recall is unchanged. What happened?',
      answer:
        'Almost certainly the mix of incoming mail changed, not the model. Precision = TP/(TP+FP) depends on how common spam is in the traffic being scored, because a fixed false-alarm rate on the genuine class produces more FPs when there is more genuine mail. If total volume grew but spam volume did not, FP grows with the negatives while TP stays flat, and precision falls with no change in the model at all. Recall is computed entirely inside the positive row, so it is untouched — which is exactly the fingerprint you are seeing. Diagnosis order: pull the raw four cells for both periods, compute the positive rate for each, and check whether specificity (TN/(TN+FP)) is stable — if specificity held and precision fell, it is a mix change, and if specificity also fell, the score distribution has genuinely drifted and the model needs attention. Fix by re-tuning the threshold for the new mix, and monitor the positive rate as a first-class signal, not just the metric.',
      isCaseBased: true,
    },
    {
      question: 'A colleague reports "precision 1.0" on a rare-disease classifier. What do you check first?',
      answer:
        'How many positives it predicted at all. Precision = TP/(TP+FP) is undefined when the model flags nothing (0/0), and libraries print 0 or 1 depending on a setting — sklearn calls it zero_division — so "precision 1.0" is entirely consistent with a model that flags two obvious cases, or none. Ask for the raw counts: TP, FP, FN, and the number of predicted positives. If it flagged 3 of 400 true cases, precision 1.0 sits next to recall 0.0075 and the model is worthless. The general rule: precision and recall are only meaningful as a pair, because each has a cheat strategy that maximises it — flag nothing for precision, flag everything for recall.',
      isCaseBased: false,
    },
    {
      question: 'Case: two candidate models for a fraud system. Model A: precision 0.90, recall 0.45. Model B: precision 0.55, recall 0.80. Which do you ship?',
      answer:
        'Refuse to answer until you have three things, and say so. One: the cost ratio. A chargeback averages several thousand rupees; a manual review costs a few minutes of analyst time, so the ratio is often 50x or more, which points hard at Model B. Two: capacity. At 1% fraud on 100k daily transactions, B\'s precision of 0.55 means roughly 1,450 alerts a day versus A\'s roughly 500 — if the team can process 600, B\'s extra recall is fiction and you either ship A, or ship B with a raised threshold. Three: whether these are really two different models or one model at two thresholds — if the underlying ranking is identical, you are not choosing a model at all, you are choosing a cut-off, and it should come from cost and capacity. Final answer with numbers: compute C_FN x FN + C_FP x FP for both under the real positive rate, subject to the queue constraint, and ship the cheaper one.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'The naming trick for TP/FP/FN/TN', back: 'Second word = what the MODEL said. First word = whether it was right. False Positive = model shouted positive and was wrong.' },
    { front: 'Precision', back: 'TP/(TP+FP) — of everything I flagged, how much was real. Denominator = my alarms. Pays for false alarms.' },
    { front: 'Recall (= sensitivity = TPR)', back: 'TP/(TP+FN) — of everything real, how much I caught. Denominator = reality. Pays for misses.' },
    { front: 'Specificity and FPR', back: 'Spec = TN/(TN+FP); FPR = FP/(FP+TN) = 1 - spec. Both live in the negative row. TPR against FPR = the ROC curve.' },
    { front: 'Why F1 is harmonic, not arithmetic', back: 'Averaging reciprocals lets the smaller value dominate. P=1.0, R=0.01: harmonic 0.0198 against arithmetic 0.505. F1 is high only if BOTH are high.' },
    { front: 'What beta squared means in F-beta', back: 'Weights are 1/(1+b^2) on precision and b^2/(1+b^2) on recall; their ratio is b^2. So b^2 = how many times more recall counts. b>1 recall (screening), b<1 precision (spam).' },
    { front: 'The two cheat strategies', back: 'Flag everything: recall = 1, precision = base rate. Flag nothing: recall = 0, precision = 0/0 undefined. Never quote one without the other.' },
    { front: 'The accuracy paradox', back: '95/5 split, always answer "not spam": TP=0 FP=0 FN=50 TN=950, accuracy 0.950 = the majority-class baseline, recall 0.000. Accuracy counts TN; precision and recall do not.' },
  ],
  mindmapMarkdown: `- The Confusion Matrix: Precision, Recall & F1
  - The four cells
    - TP 150, FP 30, FN 50, TN 770 (spam filter)
    - Naming trick: 2nd word = model said, 1st word = right?
    - False Positive = shouted positive, was wrong
    - Errors are FP and FN — pick which one you prefer
  - Precision
    - TP/(TP+FP) = 0.833
    - denominator = what I flagged
    - cost of a false alarm
  - Recall (sensitivity, TPR)
    - TP/(TP+FN) = 0.750
    - denominator = what was real
    - cost of a miss
    - neither contains TN → survives imbalance
  - The threshold trade
    - lower → recall up, precision down
    - flag everything: R=1, P=base rate
    - flag nothing: R=0, P undefined (0/0)
  - F1
    - definition 2/(1/P + 1/R), rewritten 2PR/(P+R)
    - harmonic mean sits near the smaller number
    - P=1.0, R=0.01 → F1 0.02 vs arithmetic 0.505
  - F-beta
    - weights 1/(1+b²) on P, b²/(1+b²) on R
    - weight ratio = b² (that is all b² means)
    - library form (1+b²)PR/(b²P + R)
    - beta from costs is a convention, not a proof
    - know real costs → minimise C_FN·FN + C_FP·FP
  - Negative-row metrics
    - specificity TN/(TN+FP) = 0.9625
    - FPR = 1 - specificity = 0.0375
    - ROC = TPR vs FPR (next module)
  - Accuracy and the accuracy paradox
    - (TP+TN)/all = 0.920
    - fine: balanced classes + symmetric costs
    - 95/5 always-negative: accuracy 0.950, recall 0.000
    - always show majority-class baseline
  - Which metric wins
    - spam → precision (real mail lost)
    - cancer → recall (missed tumour)
    - recall capped by review capacity
  - Worked case: bottle camera
    - TP 36, FP 14, FN 24, TN 526
    - P 0.720, R 0.600, F1 0.655
    - accuracy 0.937 vs baseline 0.900
  - Beyond the basics
    - micro = pooled counts = accuracy
    - macro = per-class mean, classes equal
    - weighted = macro × support
    - worked: micro 0.932 vs macro 0.628
    - ravel() order is tn, fp, fn, tp
    - zero_division decides what 0/0 prints`,
}

export default m
