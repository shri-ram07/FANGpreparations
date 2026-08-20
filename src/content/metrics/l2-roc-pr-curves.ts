import type { Module } from '../types'

const m: Module = {
  id: 'metrics-l2-roc-pr-curves',
  subjectId: 'metrics',
  level: 2,
  title: 'ROC, AUC & PR Curves: Threshold-Free Judgement',
  whyItMatters:
    'Precision, recall and F1 all describe a model at ONE cutoff. Change the cutoff and every number moves — so "model A beats model B" usually means "A beat B at a threshold somebody picked by accident". Curves compare models across every threshold at once, and "ROC-AUC vs PR-AUC under imbalance" is a guaranteed FAANG question. This module is also where you learn the axis nobody asks about until production breaks: calibration.',
  estMinutes: 55,
  sections: [
    {
      type: 'intuition',
      title: 'The problem with every number you have used so far',
      md: `Your classifier does not output "fraud" or "not fraud". It outputs a **score** — 0.83, 0.12, 0.51. A label only appears when you compare that score to a **threshold**.

- Precision, recall, F1, accuracy: all of them are computed *after* the threshold has been applied.
- Move the threshold from 0.5 to 0.3 and every one of those numbers changes. The model did not.
- So "model A has F1 0.71, model B has 0.68" is really "A beat B at one arbitrary cut".
- Maybe B is better everywhere else on the range. You cannot tell from one number.
- Fix: stop reporting the model at one threshold. Evaluate it at **all of them**, and draw the result.
- That drawing is a **curve**, and the area under it is one number that no longer depends on a cutoff.`,
    },
    {
      type: 'intuition',
      title: 'Building the ROC curve: sort, then sweep',
      md: `**ROC** = Receiver Operating Characteristic (a WWII radar name, ignore it). The recipe is three steps and you should be able to do it on a whiteboard.

- **Sort** every prediction by score, highest first. The labels are now a sequence like P P N P P N N P N N.
- **Sweep** the threshold from 1 down to 0. Each time it passes a score, exactly one more row gets flagged positive.
- **Plot** the pair (FPR, TPR) after each row crosses. FPR = false-positive rate, TPR = recall.
- A flagged **positive** raises TPR → the pen moves **up** by 1/P.
- A flagged **negative** raises FPR → the pen moves **right** by 1/N.
- That is the whole curve: a staircase of up-moves and right-moves. Nothing else happens.`,
    },
    {
      type: 'intuition',
      title: 'Ten samples, walked by hand',
      md: `Scores, sorted: 0.95(P) 0.90(P) 0.80(N) 0.75(P) 0.60(P) 0.55(N) 0.40(N) 0.35(P) 0.20(N) 0.10(N). So P = 5, N = 5 — each up-step is 0.2, each right-step is 0.2.

- Threshold above 0.95 — nothing flagged: **(0.0, 0.0)**.
- Pass 0.95 and 0.90, both positives — pen goes straight up twice: (0.0, 0.2) then **(0.0, 0.4)**.
- Pass 0.80, a negative — first sideways step: **(0.2, 0.4)**.
- Pass 0.75 and 0.60, positives — up twice: (0.2, 0.6) then **(0.2, 0.8)**.
- Pass 0.55 and 0.40, negatives — right twice: (0.4, 0.8) then **(0.6, 0.8)**.
- Pass 0.35 (positive) — up to the ceiling: **(0.6, 1.0)**. Then 0.20 and 0.10 drag it right to **(1.0, 1.0)**.
- Read the shape: the curve climbs fast early because the top-scored rows are mostly positives. That climb IS the model's skill.`,
    },
    {
      type: 'note',
      md: `The two anchor points are free, and every ROC curve has them. **(0,0)**: threshold at 1 — you flag nothing, so no true positives and no false positives. **(1,1)**: threshold at 0 — you flag everything, so you catch all positives (TPR = 1) at the cost of flagging all negatives (FPR = 1). Both extremes are trivially achievable by a model that has learned nothing, which is why the interesting question is only ever the *shape between them*. The diagonal line from (0,0) to (1,1) is random guessing: to gain 10% more recall you pay exactly 10% more false alarms.`,
    },
    {
      type: 'math',
      intro: 'The two axes, and what the threshold does to them.',
      latex: [
        '\\text{TPR (recall)} = \\frac{TP}{TP + FN} \\qquad \\text{FPR} = \\frac{FP}{FP + TN}',
        '\\text{ROC point at threshold } t \\;=\\; \\big(\\,\\text{FPR}(t),\\; \\text{TPR}(t)\\,\\big)',
        't \\to 1 \\;\\Rightarrow\\; (0,0) \\;\\; \\text{flag nothing} \\qquad t \\to 0 \\;\\Rightarrow\\; (1,1) \\;\\; \\text{flag everything}',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The ROC curve from scratch — the sweep is 4 lines',
      code: `import numpy as np
from sklearn.metrics import roc_auc_score, roc_curve

s = np.array([0.95, 0.90, 0.80, 0.75, 0.60, 0.55, 0.40, 0.35, 0.20, 0.10])
y = np.array([1, 1, 0, 1, 1, 0, 0, 1, 0, 0])    # already sorted by score, desc

P, N = y.sum(), (1 - y).sum()
tp = fp = 0
pts = [(0.0, 0.0)]                              # threshold above every score
for score, label in zip(s, y):
    tp, fp = tp + label, fp + (1 - label)       # let exactly one more row cross
    pts.append((fp / N, tp / P))                # plot (FPR, TPR) after each row
print(' '.join('(%.1f,%.1f)' % pt for pt in pts))

fpr, tpr, _ = roc_curve(y, s)
print('trapezoid AUC=%.3f   sklearn AUC=%.3f' % (np.trapezoid(tpr, fpr), roc_auc_score(y, s)))

# ---- real output ----
# (0.0,0.0) (0.0,0.2) (0.0,0.4) (0.2,0.4) (0.2,0.6) (0.2,0.8) (0.4,0.8) (0.6,0.8) (0.6,1.0) (0.8,1.0) (1.0,1.0)
# trapezoid AUC=0.800   sklearn AUC=0.800`,
      annotations: {
        11: 'label is 1 or 0, so this single line does "positive -> step up, negative -> step right" with no if statement.',
        12: 'One point per row. Ten rows plus the origin = eleven points — exactly the staircase walked by hand above.',
        16: 'Trapezoid area = sklearn = 0.800 = the 20/25 pair count from the next section. The score VALUES never entered the computation, only their order.',
      },
    },
    { type: 'visual', component: 'ConfusionMatrixLab', props: {} },
    {
      type: 'note',
      md: `Drag the threshold and watch the ROC panel: the dot you are moving is the (FPR, TPR) pair for the cutoff you chose — one point, one confusion matrix. Now press **Sweep 1→0**. That button is literally the loop from the code above: it starts with the threshold above every score at (0,0), lowers it past one prediction at a time, and drops a point for each. Up-step means it just crossed a real positive; right-step means it just crossed a negative. The finished staircase is the curve, and the area it encloses is the AUC. Everything else in this module is a consequence of that one animation.`,
    },
    {
      type: 'intuition',
      title: 'AUC and the interpretation worth memorising',
      md: `The **area under the ROC curve** collapses the whole staircase to one number. Its definition sounds like geometry; its meaning is not.

- **AUC = the probability that a randomly chosen positive scores higher than a randomly chosen negative.**
- Say that sentence in an interview and stop. It is the single most valuable line in this module.
- Check it on our ten samples: there are 5 × 5 = 25 (positive, negative) pairs. Count the correctly ordered ones: 20.
- 20/25 = **0.80** — the exact area the trapezoid rule gave. Not a coincidence; the ROC area *is* that pair count.
- Consequence: AUC only reads the **ranking**. Multiply every score by 7, or square them, or pass them through any monotonic function — the order is unchanged, so the AUC is byte-for-byte identical.
- So AUC is completely blind to whether your "0.9" means 90%. A model with terrible probabilities can score 0.95. Hold that thought for the calibration section.`,
    },
    {
      type: 'math',
      intro: 'AUC two ways — area, and pair counting (the Mann-Whitney U statistic in disguise).',
      latex: [
        '\\text{AUC} \\;=\\; P\\big(s(x^{+}) > s(x^{-})\\big), \\quad x^{+} \\sim \\text{positives}, \\; x^{-} \\sim \\text{negatives}',
        '\\text{AUC} \\;=\\; \\frac{\\#\\{\\text{pairs ordered correctly}\\}}{P \\cdot N} \\;=\\; \\frac{20}{5 \\cdot 5} \\;=\\; 0.8',
        '\\text{AUC}\\big(f(s)\\big) = \\text{AUC}(s) \\quad \\text{for any strictly increasing } f \\;\\; (\\text{rank-based, scale-free})',
      ],
    },
    {
      type: 'note',
      md: `Reading AUC values honestly. **0.5** = the diagonal = coin flip; your features carry no signal for this label. **Below 0.5** is not "worse than useless" — it means your ranking is *inverted*: you passed the wrong column, flipped the labels, or handed sklearn \`predict\` (0/1 labels) instead of \`predict_proba[:, 1]\`. Fix the sign and you have a model. **0.70–0.85** is the honest range for most real business problems. **0.99 on real-world data is a bug report, not a result** — look for leakage first: a feature computed after the outcome, an ID that encodes the label, a duplicate row split across train and test. Search for the leak before you celebrate.`,
    },
    {
      type: 'intuition',
      title: 'The PR curve: same sweep, different axes',
      md: `Build it exactly like the ROC — sort, sweep, plot — but plot **precision** (y) against **recall** (x).

- Recall is the same quantity as TPR, so the x-axis of PR is the y-axis of ROC. Only the other axis changed.
- Precision = TP/(TP+FP): of the rows I flagged, how many were real. Its denominator is **only the rows you flagged**.
- FPR's denominator is the entire negative class. That one difference drives this whole module.
- The PR curve is jagged, not a clean staircase: adding one row changes both numerator and denominator of precision, so it can jump down and then recover.
- Its summary number is **average precision (AP)** — precision at each recall step, weighted by how much recall that step bought. sklearn calls it \`average_precision_score\`; people say "PR-AUC" and mean this.
- Same ten samples: AP = 0.835 while AUC = 0.800. Different questions, different answers, both correct.`,
    },
    {
      type: 'note',
      md: `The baseline that catches people out: a **random** model's ROC curve is the diagonal, so ROC-AUC ≈ 0.5 always, on every dataset. A random model's PR curve is a flat line at the **positive rate**. At 50% positives that flat line sits at 0.5; at 1% positives it sits at **0.01**. So a PR-AUC of 0.30 is contemptible on balanced data and outstanding at 1% prevalence — it is 30× the baseline. The consequence people miss: **PR-AUC values from different datasets are not comparable**, because their baselines differ. Always report the positive rate next to any AP number, or the number means nothing.`,
    },
    {
      type: 'math',
      intro: 'PR axes and the AP summary. Note what precision does NOT contain: true negatives.',
      latex: [
        '\\text{Precision} = \\frac{TP}{TP + FP} \\qquad \\text{Recall} = \\frac{TP}{TP + FN}',
        'AP = \\sum_{k} \\big(R_k - R_{k-1}\\big)\\, P_k \\quad \\text{(precision at each recall step, recall-weighted)}',
        '\\text{Random baseline: ROC-AUC} = 0.5 \\;\\; \\text{always}; \\qquad \\text{PR-AUC} = \\pi \\;\\; (\\text{the positive rate})',
      ],
    },
    {
      type: 'intuition',
      title: 'Imbalance: where ROC starts lying, with real numbers',
      md: `One million card transactions. 10,000 are fraud (1%), 990,000 are legitimate. Your model is set to catch 90% of fraud.

- Result: TP = 9,000, FN = 1,000, and it raises **30,000** false alarms.
- FPR = 30,000 / 990,000 = **0.030**. On the ROC plot that is the point (0.03, 0.90) — hugging the top-left corner. Gorgeous.
- Precision = 9,000 / 39,000 = **0.231**. Three out of four alerts your analysts open are innocent customers.
- Now imagine a worse model that adds 20,000 more false positives at the same recall. FPR climbs to 0.051 — a move of two hundredths, invisible on a plot, worth ~0.02 of AUC.
- The same change drops precision from 0.231 to **0.153**: a third of the alert quality, gone.
- The mechanism in one line: **FPR divides by 990,000, precision divides by 39,000.** The huge negative class anaesthetises the ROC curve.`,
    },
    {
      type: 'math',
      intro: 'The same arithmetic, side by side. Two denominators, two very different sensitivities.',
      latex: [
        '\\text{FPR} = \\frac{30{,}000}{990{,}000} = 0.030 \\qquad \\text{Precision} = \\frac{9{,}000}{39{,}000} = 0.231',
        '+20{,}000 \\text{ false positives} \\;\\Rightarrow\\; \\text{FPR} = 0.051 \\;(\\Delta = +0.02) \\qquad \\text{Precision} = 0.153 \\;(-34\\%)',
        '\\text{Precision depends on prevalence } \\pi; \\;\\; \\text{TPR and FPR do not.}',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Same model quality, two prevalences — ROC-AUC shrugs, AP collapses',
      code: `import numpy as np
from sklearn.metrics import roc_auc_score, average_precision_score

rng = np.random.default_rng(0)

def make(n_pos, n_neg):                          # identical model quality both times
    s_pos = rng.normal(2.0, 1.0, n_pos)          # positives score around 2
    s_neg = rng.normal(0.0, 1.0, n_neg)          # negatives score around 0
    return (np.r_[np.ones(n_pos), np.zeros(n_neg)], np.r_[s_pos, s_neg])

for name, n_pos, n_neg in [('balanced 50%', 20000, 20000), ('rare      1%', 2000, 198000)]:
    y, s = make(n_pos, n_neg)
    t = np.quantile(s[y == 1], 0.10)             # cutoff that catches 90% of positives
    prec = (s[y == 1] >= t).sum() / (s >= t).sum()
    print('%s  base=%.3f  ROC-AUC=%.3f  AP=%.3f  precision@recall0.90=%.3f'
          % (name, y.mean(), roc_auc_score(y, s), average_precision_score(y, s), prec))

# ---- real output ----
# balanced 50%  base=0.500  ROC-AUC=0.922  AP=0.921  precision@recall0.90=0.797
# rare      1%  base=0.010  ROC-AUC=0.921  AP=0.272  precision@recall0.90=0.035`,
      annotations: {
        6: 'Scores are drawn from fixed distributions instead of a fitted model on purpose: it holds model quality EXACTLY constant, so the only thing changing between the two rows is prevalence.',
        7: 'Positives at mean 2, negatives at mean 0, both sd 1 — an overlap giving AUC ~0.92 in both runs.',
        13: 'The operating point a business would actually pick: catch 90% of the positives. Then ask what the alerts look like.',
        19: 'Balanced: AP and ROC-AUC agree almost exactly (0.921 vs 0.922). With no imbalance the two curves tell the same story.',
        20: 'Rare: ROC-AUC moved by 0.001 and would be reported as "0.92, ship it". AP fell to 0.272, and at 90% recall only 3.5% of alerts are real — 27 wasted reviews per catch.',
      },
    },
    {
      type: 'note',
      md: `Read those two lines like an interviewer. Nothing about the model changed — the score distributions are identical by construction. ROC-AUC moved by 0.001 and would have been reported as "0.92, ship it". AP fell by a factor of three, and the operating number the analyst team actually feels — 3.5% of alerts being real — is the truth. ROC-AUC did not lie; it answered "how well do I rank a positive above a negative", which is prevalence-free by definition. Nobody asked that question. They asked "if I open these alerts, how many are worth opening".`,
    },
    {
      type: 'intuition',
      title: 'The rule, and when ROC is still the right curve',
      md: `Do not learn "PR-AUC is better". Learn which question each curve answers.

- **ROC-AUC** when the classes are roughly balanced, or when both classes matter equally — is a photo a cat or a dog, is this MRI slice left or right side.
- **ROC-AUC** also when prevalence will *change* after deployment and you want a measure that does not move with it — it is invariant to the class ratio, which is a feature when you are comparing models across time or across regions.
- **PR-AUC (AP)** when the positive class is rare **and** it is the class you care about: fraud, disease, defects, spam, churn.
- Rule of thumb for the ratio: past roughly 10:1 imbalance, lead with PR-AUC.
- Report both. Decide with PR-AUC, and always print the positive rate beside it.
- The interview sentence: *"ROC-AUC is prevalence-independent, which is exactly why it hides the cost of false positives when negatives outnumber positives 99 to 1."*`,
    },
    {
      type: 'intuition',
      title: 'From a curve to a decision: picking the operating point',
      md: `A curve is not a deployment. At some point you pick one threshold, and that choice is a business conversation, not a modelling one.

- **Given a cost ratio**: minimise expected cost. The optimal ROC point is where the curve's *slope* equals C_FP(1−π) / (C_FN·π) — steep costs of misses push you right and down the curve.
- **Given a recall requirement**: "regulation says catch 95% of money laundering" → read the threshold off the curve at recall 0.95 and accept whatever precision comes with it.
- **Given a capacity constraint**: "the team reviews 500 cases a day". That is not a threshold at all — it is a **top-k** rule. Rank every case by score and send the top 500.
- The right metric then is **precision@500**: of the 500 we shipped, how many were real. AP averages over all k; your business only lives at one k.
- Top-k is also self-correcting under drift: a fixed threshold produces 200 alerts one week and 5,000 the next when the score distribution moves. Top-k always produces 500.
- Say this in an interview and you sound like you have run something in production, because that failure is how everyone learns it.`,
    },
    {
      type: 'math',
      intro: 'Choosing the point — the cost-slope rule, and the capacity rule.',
      latex: [
        '\\mathbb{E}[\\text{cost}](t) = C_{FN}\\,\\pi\\,\\big(1 - \\text{TPR}(t)\\big) \\;+\\; C_{FP}\\,(1-\\pi)\\,\\text{FPR}(t)',
        '\\text{minimised where } \\frac{d\\,\\text{TPR}}{d\\,\\text{FPR}} = \\frac{C_{FP}(1-\\pi)}{C_{FN}\\,\\pi} \\quad (\\text{a slope on the ROC curve})',
        '\\text{Capacity } k: \\;\\; \\text{take the top } k \\text{ scores} \\;\\Rightarrow\\; \\text{report precision@}k, \\;\\; \\text{not a fixed } t',
      ],
    },
    {
      type: 'intuition',
      title: 'Calibration: the axis nobody asks about until production',
      md: `AUC only reads order. So a model can rank *perfectly* and still be wrong about every number it prints.

- **Calibrated** means: of all the cases you scored 0.70, about 70% really are positive. The number is a probability, not a vibe.
- A model with AUC 0.95 can output 0.9 for cases that are true 20% of the time. Perfect ranking, useless numbers.
- Why it happens: class weights and resampling deliberately distort the base rate; regularisation shrinks scores toward the middle; SVMs and boosted trees output margins, not probabilities (trees are typically over-confident near 0 and 1, naive Bayes wildly so).
- **Reliability diagram** — the diagnostic: bucket predictions into ten bins by score, plot mean predicted probability against actual positive rate per bin. Perfect calibration is the 45° diagonal. Below it = over-confident.
- **Brier score** — the single number: mean squared error on the probabilities. Lower is better; it moves with both calibration and sharpness, so read it beside the diagram, not instead of it.
- Fixes, both fit on a **held-out** set: **Platt scaling** (fit a sigmoid to the scores — 2 parameters, safe on small data, assumes a sigmoid shape) and **isotonic regression** (any non-decreasing step function — more flexible, needs ~1000+ points or it overfits).`,
    },
    {
      type: 'math',
      intro: 'Brier score, and the two standard recalibrators. Both are monotonic — they cannot fix a bad ranking.',
      latex: [
        '\\text{Brier} = \\frac{1}{N}\\sum_{i=1}^{N}\\big(\\hat{p}_i - y_i\\big)^2 \\qquad (\\text{MSE on probabilities; } 0 \\text{ is perfect})',
        '\\text{Platt: } \\hat{p}_{\\text{cal}} = \\sigma(a\\,s + b) \\qquad \\text{Isotonic: } \\hat{p}_{\\text{cal}} = g(s), \\;\\; g \\text{ non-decreasing}',
        '\\text{Both are monotonic} \\;\\Rightarrow\\; \\text{AUC is (essentially) unchanged. Calibration is a separate axis from ranking.}',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Proof that AUC and calibration are independent axes',
      code: `import numpy as np
from sklearn.metrics import roc_auc_score, brier_score_loss
from sklearn.isotonic import IsotonicRegression

rng = np.random.default_rng(7)
p = rng.uniform(0.02, 0.98, 20000)              # honest probabilities
y = (rng.uniform(size=20000) < p).astype(int)   # labels drawn from them
bad = p ** 3                                    # monotone squash = same ranking

tr, te = slice(0, 10000), slice(10000, None)
iso = IsotonicRegression(out_of_bounds='clip').fit(bad[tr], y[tr])
for name, q in [('honest p', p[te]), ('cubed   ', bad[te]), ('isotonic', iso.predict(bad[te]))]:
    print('%s  AUC=%.4f  Brier=%.4f  mean_pred=%.3f  actual_rate=%.3f'
          % (name, roc_auc_score(y[te], q), brier_score_loss(y[te], q), q.mean(), y[te].mean()))

# ---- real output ----
# honest p  AUC=0.8237  Brier=0.1714  mean_pred=0.503  actual_rate=0.499
# cubed     AUC=0.8237  Brier=0.2495  mean_pred=0.243  actual_rate=0.499
# isotonic  AUC=0.8231  Brier=0.1716  mean_pred=0.502  actual_rate=0.499`,
      annotations: {
        8: 'Cubing is strictly increasing, so it preserves every pairwise comparison — the model ranks identically and is now badly under-confident.',
        11: 'Isotonic is fit on one half and applied to the other. Fitting calibration on the data you evaluate it on is the same sin as fitting a model on its test set.',
        17: 'The reference row: probabilities that are true by construction (mean_pred 0.503 vs actual 0.499).',
        18: 'AUC identical to four decimals — proof that AUC cannot see calibration. But Brier jumps 0.171 to 0.250 and mean_pred reads 0.243 while half the cases are positive: every expected-value calculation downstream is halved.',
        19: 'Isotonic restores Brier and the mean prediction while leaving AUC essentially untouched (0.8231 vs 0.8237 — it creates ties, which costs a hair).',
      },
    },
    {
      type: 'note',
      md: `When calibration actually matters: **whenever you use the probability as a number.** Expected-value decisions (0.02 × ₹80,000 loss vs a ₹50 review — the arithmetic is nonsense if 0.02 is not really 2%), insurance and credit pricing, thresholds derived from costs, ensembling or averaging several models' probabilities, and anything a human reads as "70% chance". When it does **not** matter: when only the **ordering** is consumed — ranking search results, sending the top 500 cases to a review queue, A/B-testing which model surfaces better items. In those cases chase AUC/AP and ignore Brier entirely. Knowing which of the two situations you are in is the whole skill.`,
    },
    {
      type: 'intuition',
      title: 'The four sentences to carry into the interview',
      md: `Everything above compresses to this.

- *"F1 measures the model at one threshold; curves measure the model at all of them."*
- *"AUC is the probability a random positive outranks a random negative — so it is rank-based and blind to calibration."*
- *"ROC-AUC is prevalence-independent; at 99% negatives that is exactly why it hides the false-positive cost. Lead with PR-AUC and print the base rate."*
- *"A model can rank perfectly and still be badly calibrated. Which one you need depends on whether the downstream consumer reads the order or the number."*
- And the closing move that ends the question: *"Then I would pick the operating point from a cost ratio or the review team's capacity, not from argmax F1."*`,
    },
  ],
  quiz: [
    {
      question: 'What does a single point on an ROC curve represent?',
      options: [
        { text: 'One model, compared against another model', explanation: 'A whole curve describes one model; a point is finer-grained than that.' },
        {
          text: 'One threshold — its (FPR, TPR) pair, equivalently one confusion matrix',
          explanation: 'Correct. Every point is a complete confusion matrix collapsed to two rates. The curve is the set of all of them as the threshold sweeps 1 to 0.',
        },
        { text: 'One data point in the test set', explanation: 'Rows contribute to the curve, but a point on it summarises the entire test set at one cutoff, not a single row.' },
      ],
      correct: 1,
    },
    {
      question: 'A model gets ROC-AUC 0.92 on a balanced test set. Deployed at 1% prevalence with the same score distributions, ROC-AUC stays 0.92 but analysts complain most alerts are junk. What happened?',
      options: [
        { text: 'The model degraded in production', explanation: 'By construction the score distributions are unchanged — the model is exactly as good at ranking as before.' },
        { text: 'ROC-AUC was computed incorrectly', explanation: 'It was computed correctly. ROC-AUC is invariant to the class ratio; that is a mathematical property, not a bug.' },
        {
          text: 'Nothing broke — precision depends on prevalence while TPR and FPR do not, so ROC-AUC could never have predicted the alert quality',
          explanation: 'Correct. FPR divides by the huge negative class; precision divides only by what you flagged. AP or precision@k would have shown the collapse before launch.',
        },
      ],
      correct: 2,
    },
    {
      question: 'You replace every predicted probability p with p³ and re-evaluate. What happens to ROC-AUC?',
      options: [
        {
          text: 'Exactly nothing — cubing is strictly increasing, so the ranking is identical',
          explanation: 'Correct, and it is the point of the AUC definition: AUC counts correctly ordered (positive, negative) pairs, and a monotonic transform cannot reorder anything.',
        },
        { text: 'It falls, because the probabilities are now wrong', explanation: 'The probabilities are indeed now wrong — Brier score would triple — but AUC never reads their values, only their order.' },
        { text: 'It rises, because the scores are more separated', explanation: 'Cubing compresses scores toward 0, and in any case AUC is scale-free. Separation of values is irrelevant to a rank statistic.' },
      ],
      correct: 0,
    },
    {
      question: 'What is the baseline (random-model) value of the PR curve?',
      options: [
        { text: '0.5, the same as ROC', explanation: 'That is the ROC baseline, and only the ROC baseline. It is 0.5 on every dataset, which is exactly what PR is not.' },
        { text: '0, since a random model gets nothing right', explanation: 'A random model still flags positives at the base rate by luck, so its precision is not zero.' },
        {
          text: 'The positive rate — so 0.01 on a 1% dataset',
          explanation: 'Correct, and it is why AP values from different datasets cannot be compared. AP 0.30 at 1% prevalence is 30× baseline; the same 0.30 on balanced data is below baseline.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Your model scores ROC-AUC 0.42 on the test set. Best first action?',
      options: [
        { text: 'Collect more training data — the model has not learned', explanation: 'A genuinely signal-free model sits at 0.5. Consistently below 0.5 means there IS signal, pointed the wrong way.' },
        {
          text: 'Check for an inverted ranking — flipped labels, wrong column, or predict() instead of predict_proba()[:, 1]',
          explanation: 'Correct. 0.42 means positives are systematically scored BELOW negatives. Flip the sign and you have AUC 0.58 — a real, if modest, model.',
        },
        { text: 'Lower the decision threshold', explanation: 'AUC is threshold-free. Moving the threshold cannot change it by a single decimal.' },
      ],
      correct: 1,
    },
    {
      question: 'Why does every ROC curve pass through (0,0) and (1,1)?',
      options: [
        {
          text: 'They are the two threshold extremes: flag nothing, and flag everything',
          explanation: 'Correct. At t above every score, TP = FP = 0. At t below every score, you catch all positives and all negatives. Both are free, so only the shape between them carries information.',
        },
        { text: 'Because sklearn pads the curve for plotting', explanation: 'sklearn does add the endpoint, but the reason it is legitimate is the threshold argument, not a plotting convenience.' },
        { text: 'Only well-trained models reach those corners', explanation: 'Backwards — a model that has learned nothing reaches both corners just as easily. That is precisely why the corners are uninformative.' },
      ],
      correct: 0,
    },
    {
      question: 'Which of these use cases genuinely needs calibrated probabilities, not just good ranking?',
      options: [
        { text: 'Ranking search results for a query', explanation: 'Only the order is consumed — the user sees positions, never the scores. Chase AUC/NDCG here and ignore Brier.' },
        { text: 'Sending the top 500 fraud cases to a review queue each day', explanation: 'A top-k rule reads only the ordering. Calibration would not change which 500 cases are sent.' },
        {
          text: 'Deciding to block a transaction when p × ₹80,000 loss exceeds a ₹50 review cost',
          explanation: 'Correct. The moment p is multiplied by money, a p that means "0.02 but really 0.10" produces a wrong decision. Expected-value maths requires the number to be true, not just correctly ordered.',
        },
      ],
      correct: 2,
    },
    {
      question: 'The compliance team can review exactly 500 alerts per day. What should you report and optimise?',
      options: [
        { text: 'F1 at threshold 0.5', explanation: 'Both parts are wrong: 0.5 is arbitrary, and F1 assumes a false alarm and a miss cost the same — the capacity constraint says otherwise.' },
        {
          text: 'precision@500 (and recall@500) from a top-k rule, not a fixed threshold',
          explanation: 'Correct. Rank and take the top 500: the metric matches the constraint, and a top-k rule keeps the volume constant when the score distribution drifts, which a fixed threshold does not.',
        },
        { text: 'ROC-AUC, since it summarises all thresholds', explanation: 'Useful for model selection, but it averages over operating points you will never use. Your business lives at exactly one k.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Walk me through building an ROC curve from raw predictions. No libraries.',
      answer:
        'Sort all predictions by score, descending. Start with the threshold above every score: nothing is flagged, so you are at (0,0). Lower the threshold one prediction at a time; each row that crosses becomes a positive prediction. If that row is truly positive, TP increments and the curve steps UP by 1/P; if it is truly negative, FP increments and the curve steps RIGHT by 1/N. Plot (FPR, TPR) after each step. You end at (1,1) once everything is flagged. The result is a staircase, and the area under it is the AUC. Two details that show depth: ties in scores produce diagonal segments rather than clean steps, and the curve is fully determined by the ORDER of the scores — their values never enter the computation.',
      isCaseBased: false,
    },
    {
      question: 'What does AUC mean, in a sentence a non-technical stakeholder would accept?',
      answer:
        '"If I pick one fraudulent transaction and one legitimate one at random, AUC is the chance the model scores the fraudulent one higher." That framing is exact, not an analogy — it is the Mann-Whitney U statistic normalised by P·N, and it equals the geometric area under the curve. Two consequences follow immediately and interviewers listen for them: AUC is rank-based, so any monotonic rescaling of the scores leaves it unchanged; and it is prevalence-independent, since it is defined per pair rather than over the population mix.',
      isCaseBased: false,
    },
    {
      question: 'ROC-AUC vs PR-AUC under class imbalance — when do you use which, and why exactly does ROC flatter?',
      answer:
        'Mechanism first: ROC plots TPR against FPR = FP/(FP+TN). With 990,000 negatives, adding 20,000 false positives moves FPR by 0.02 — invisible. Precision = TP/(TP+FP) divides only by what you flagged, so the same 20,000 drops precision from 0.231 to 0.153. Concretely: a model catching 90% of fraud with 30,000 false alarms sits at ROC point (0.03, 0.90), which looks excellent, while only 23% of its alerts are real. Rule: ROC-AUC when classes are roughly balanced or both classes matter equally, or when you specifically want a prevalence-invariant number for comparing across time and regions; PR-AUC once imbalance passes roughly 10:1 and the rare class is the one you care about. Report both, decide on PR-AUC, and always state the positive rate — the PR baseline is the positive rate, so an AP number without it is uninterpretable.',
      isCaseBased: false,
    },
    {
      question: 'Case: a teammate reports ROC-AUC 0.995 on a churn model. What do you do?',
      answer:
        'Treat it as a bug report, not a result. Leakage checklist in order: (1) a feature recorded after or because of the outcome — a cancellation-reason code, a refund flag, a support ticket opened during churn; (2) an identifier that encodes the label — account status, a segment field updated at churn time; (3) duplicate or near-duplicate rows split across train and test; (4) a time leak — random splitting on time-ordered data so the model saw the future, or a feature computed with a window that overlaps the label period; (5) preprocessing fit on the full dataset (scalers, target encoding, feature selection) before splitting. The diagnostic that finds it fastest: train on one feature at a time and look for a single feature carrying most of the AUC alone, then read that column\'s definition. Business cost of not checking: the model ships, production AUC is 0.70, and the team spends a quarter debugging "drift" that was never there.',
      isCaseBased: true,
    },
    {
      question: 'A model has AUC 0.95 but outputs 0.9 for cases that are only true 20% of the time. Is that possible, and does it matter?',
      answer:
        'Entirely possible: AUC reads only the ordering of scores, so any monotonic distortion — cubing, an over-confident tree ensemble, class-weighted training, heavy regularisation — leaves it untouched while wrecking the numbers. Whether it matters depends on the consumer. If only the ranking is used (search results, a top-k review queue, an A/B comparison), it does not matter at all. If the probability is multiplied by anything — expected loss, a price, a cost-derived threshold, an average across ensembled models, or a human reading "90% chance" — it matters enormously, and every downstream decision is wrong in a systematic direction. Diagnose with a reliability diagram plus Brier score, fix with Platt scaling (sigmoid, two parameters, safe on small data) or isotonic regression (flexible step function, needs roughly a thousand points), always fit on held-out data.',
      isCaseBased: false,
    },
    {
      question: 'Case: fraud model, offline ROC-AUC 0.94, but a month after launch the review team says most alerts are innocent customers. Debug it.',
      answer:
        'First hypothesis, and usually correct: ROC-AUC was never the right offline metric. At 1% prevalence, ROC-AUC 0.94 is fully consistent with precision under 5% at high recall — recompute AP and precision@k at the deployed operating point on the same offline data, and the "surprise" will usually already be visible there. Second: prevalence mismatch — if the offline set was resampled, fraud-enriched, or from a different period, precision estimates were inflated, because precision moves with the base rate while TPR and FPR do not. Third: the operating point was chosen by maximising F1, which silently assumes a miss and a false alarm cost the same; re-derive it from the cost ratio, or better, from review capacity as a top-k rule. Fourth: drift — the score distribution moved under a fixed threshold, so alert volume rose without any change in model quality; a top-k rule would have absorbed it. Order of action: recompute AP and precision@k offline, compare the offline and online score histograms, then reset the operating point from capacity.',
      isCaseBased: true,
    },
    {
      question: 'How do you pick a decision threshold from a curve?',
      answer:
        'Never by argmax F1 — that maximises an equal-cost assumption nobody agreed to. Three defensible routes. (1) Cost ratio: minimise C_FN·π·(1−TPR) + C_FP·(1−π)·FPR; the optimum sits where the ROC curve has slope C_FP(1−π)/(C_FN·π). (2) A hard requirement: "catch 95% of laundering" fixes recall, and you read off the threshold and accept its precision. (3) Capacity: "500 reviews a day" is not a threshold at all — rank and take the top 500, then report precision@500. Prefer (3) when a human queue is involved, because a fixed threshold sends 200 alerts one week and 5,000 the next as the score distribution drifts, while top-k holds volume constant. Always pick the point on validation data, never on test, and re-derive it after every retrain.',
      isCaseBased: false,
    },
    {
      question: 'Why is average precision usually a better summary than the area under a naively interpolated PR curve?',
      answer:
        'The PR curve is not monotone and not a clean staircase: adding one prediction changes both the numerator and denominator of precision, so the curve jumps down and recovers. Linear interpolation between PR points is not valid — the segment between two achievable points is not itself achievable, so trapezoidal area can be optimistic. Average precision avoids the issue by summing precision at each recall step weighted by the recall gained, AP = Σ (R_k − R_{k−1})·P_k, which is exactly what sklearn\'s average_precision_score computes and why it is preferred over auc(recall, precision). Practical note for the interview: people say "PR-AUC" and mean AP; say which one you computed, because they can differ by a couple of points on small or highly imbalanced test sets.',
      isCaseBased: false,
    },
    {
      question: 'Two models: A has ROC-AUC 0.88 and AP 0.31; B has ROC-AUC 0.85 and AP 0.44. Positive rate is 1.5%. Which ships?',
      answer:
        'B, and the reasoning is the answer. At 1.5% positives the rare class is the one that matters, so the number that reflects alert quality is AP: B is 29× its baseline (0.44 vs 0.015) against A at 21×. A\'s higher ROC-AUC says it ranks better averaged over ALL thresholds, including the huge low-score region nobody will ever operate in; B does better in the high-precision head of the ranking, which is where deployment lives. Before committing, confirm at the actual operating point — compare precision@k or precision at the required recall, not just the summary — and check the difference exceeds cross-validation fold variance, which on a rare class is often larger than the gap between two models.',
      isCaseBased: false,
    },
    {
      question: 'A model has ROC-AUC 0.50. What are the possible explanations?',
      answer:
        'Ranked by likelihood: (1) the features genuinely carry no signal for this label; (2) a bug in the evaluation — labels shuffled relative to predictions, an index misalignment after a merge, or the wrong probability column; (3) constant or near-constant predictions, from a model that collapsed to the majority class under heavy imbalance, or where all scores tie (ties sit on the diagonal by construction); (4) predictions and labels compared on different rows after a reindex. Distinguish them fast: check the score histogram (constant scores are obvious), check AUC on the training set (0.5 on train too means learning failed; 0.99 on train and 0.5 on test means pure memorisation), and re-verify the alignment of y_true and y_score. And distinguish 0.50 from BELOW 0.50 — the latter is not a failed model, it is an inverted one.',
      isCaseBased: false,
    },
    {
      question: 'Case: you must choose a single metric for a medical screening model, prevalence 0.8%, and defend it to both a clinician and a data-science panel. What do you propose?',
      answer:
        'Refuse a single metric and propose a primary plus guardrails, then justify it. Primary for model selection: PR-AUC (AP), because at 0.8% prevalence ROC-AUC will read 0.93 for a model whose alerts are 95% false, and the positive class is the one with clinical value — report it next to the 0.008 baseline so the panel can see the multiple. Operating point for the clinician: fixed at the recall the clinical protocol demands, say 98% sensitivity, with the resulting precision (and therefore biopsy volume) stated explicitly — that is the conversation the clinician actually needs, since a false negative is a missed cancer and a false positive is an anxious patient plus a procedure. Guardrails: calibration, because a screening score shown to a patient or fed into a risk calculator must be a real probability — track Brier and a reliability diagram, and recalibrate with isotonic on held-out data. Monitoring: precision@k against the follow-up clinic\'s capacity, since a screen that produces more referrals than the health system can absorb has failed regardless of its AUC. The judgement being tested is that the model-selection metric, the deployment operating point, and the monitoring metric are three different choices.',
      isCaseBased: true,
    },
    {
      question: 'Is ROC-AUC ever preferable precisely BECAUSE it is prevalence-independent?',
      answer:
        'Yes, and saying so shows you learned the rule rather than the slogan. When you compare the same model across regions, seasons, or cohorts with different base rates, AP will move purely because prevalence moved — you cannot tell whether the model degraded or the world did. ROC-AUC holds the class mix constant by construction, so a drop in it is genuine ranking degradation. Same argument for evaluating on a deliberately down-sampled negative set (common when negatives run to billions): ROC-AUC on the sample estimates ROC-AUC on the full population, whereas precision and AP must be re-scaled to the true prevalence before they mean anything. Practical stance: ROC-AUC for tracking model health over time and across segments, PR-AUC and precision@k for deciding what to ship and where to set the cutoff.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'How is an ROC curve built?', back: 'Sort by score desc, sweep the threshold 1 to 0. Each positive crossed = step UP 1/P; each negative = step RIGHT 1/N. Plot (FPR, TPR). Ends at (1,1).' },
    { front: 'ROC axes', back: 'x = FPR = FP/(FP+TN). y = TPR = recall = TP/(TP+FN). The anchors (0,0) "flag nothing" and (1,1) "flag everything" are free for any model.' },
    { front: 'AUC, the one-sentence definition', back: 'The probability a randomly chosen positive scores higher than a randomly chosen negative. Equals correctly-ordered pairs / (P·N).' },
    { front: 'Why AUC ignores calibration', back: 'It is rank-based: any strictly increasing transform of the scores (×7, squared, cubed) leaves the order — and so the AUC — unchanged.' },
    { front: 'Reading AUC values', back: '0.5 = coin flip. Below 0.5 = inverted ranking (flipped labels / wrong column / predict instead of predict_proba). 0.70–0.85 = honest. 0.99 on real data = hunt for leakage.' },
    { front: 'PR curve and its baseline', back: 'Precision (y) vs recall (x), same threshold sweep. Random baseline = the positive rate (0.01 at 1%), NOT 0.5 — so AP across different datasets is not comparable.' },
    { front: 'Average precision (AP)', back: 'AP = Σ (R_k − R_{k−1})·P_k. The PR-curve summary; people say "PR-AUC" and mean this. sklearn: average_precision_score.' },
    { front: 'Why ROC flatters under imbalance', back: 'FPR divides by the huge negative class (990k), precision by only what you flagged (39k). +20k false positives: FPR +0.02, precision 0.231 → 0.153.' },
    { front: 'ROC-AUC or PR-AUC?', back: 'ROC when balanced, both classes matter, or you need a prevalence-invariant number across time/segments. PR when the positive class is rare AND is what you care about (past ~10:1).' },
    { front: 'Calibration: tools and when it matters', back: 'Reliability diagram + Brier score to diagnose; Platt (sigmoid, 2 params) or isotonic (step function, needs ~1000+ points) to fix, on held-out data. Matters when the probability is used as a NUMBER (expected value, pricing, cost thresholds), not when only the ORDER is consumed.' },
  ],
  mindmapMarkdown: `- ROC, AUC & PR Curves: Threshold-Free Judgement
  - Why curves
    - precision/recall/F1 = one threshold
    - comparing models at an arbitrary cut
    - curves = all thresholds at once
  - Building the ROC
    - sort by score, descending
    - sweep threshold 1 to 0
    - positive crossed -> up 1/P
    - negative crossed -> right 1/N
    - staircase; ties make diagonals
  - Anchors
    - (0,0) flag nothing
    - (1,1) flag everything
    - diagonal = random guessing
  - AUC
    - area under the staircase
    - P(random positive > random negative)
    - pairs correct / (P x N) = 20/25 = 0.8
    - rank-based, monotone-invariant
    - blind to calibration
  - Reading AUC
    - 0.5 coin flip
    - below 0.5 = inverted ranking
    - 0.99 real data = check leakage
  - PR curve
    - precision vs recall
    - baseline = positive rate, not 0.5
    - not comparable across datasets
    - AP = summary (average precision)
  - Imbalance showdown
    - FPR denominator 990,000
    - precision denominator 39,000
    - +20k FP: FPR +0.02, precision -34%
    - code: AUC 0.922 -> 0.921, AP 0.921 -> 0.272
    - rule: ROC balanced, PR rare-and-cared-about
    - ROC still wins for cross-segment tracking
  - Operating point
    - cost ratio -> ROC slope C_FP(1-pi)/C_FN·pi
    - recall requirement -> read off threshold
    - capacity 500/day -> top-k, precision@k
    - top-k survives drift, fixed threshold does not
  - Calibration
    - separate axis from ranking
    - reliability diagram, Brier score
    - Platt (sigmoid) vs isotonic (step)
    - fit on held-out data
    - matters when probability is a NUMBER
    - irrelevant when only ORDER is used`,
}

export default m
