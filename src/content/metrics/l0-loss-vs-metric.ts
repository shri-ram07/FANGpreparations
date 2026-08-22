import type { Module } from '../types'

const m: Module = {
  id: 'metrics-l0-loss-vs-metric',
  subjectId: 'metrics',
  level: 0,
  title: 'Loss vs Metric: The Number the Model Uses, and the Number You Judge By',
  whyItMatters:
    'Every model you will ever train prints two kinds of numbers, and they are not the same kind of thing. One number exists so the computer knows which way to adjust itself. The other exists so a person can decide whether the model is any good. Mixing them up is why people say "training went great" about a model that does not work. This module builds both numbers from scratch, with six hand-written predictions and a Python for loop, so you can see exactly why one of them can be improved step by step and the other cannot.',
  assumes: [
    'You know what a percentage is, and what an average is',
    'You have seen a Python list, a for loop, and an if statement',
    'You remember from school maths what the slope of a line means: how much the height changes when you move one step sideways',
    'No machine learning background is needed. Every term used here is defined here.',
  ],
  estMinutes: 45,
  sections: [
    {
      type: 'intuition',
      title: 'Six emails, one model, two very different numbers',
      md: `A spam filter looks at six emails and outputs a number between 0 and 1 for each one. The number is how sure the model is that the email is spam: 0.9 means "almost certainly spam", 0.2 means "almost certainly fine".

- The model's six outputs, in order: **0.9, 0.8, 0.6, 0.4, 0.3, 0.2**.
- The truth, written by a human who read all six: **spam, spam, not-spam, spam, not-spam, not-spam**. We write spam as 1 and not-spam as 0, so the truth is **1, 1, 0, 1, 0, 0**.
- To turn a number into a decision we need a cut-off. Use the obvious one: **above 0.5 means spam**.
- That gives the model's decisions: spam, spam, spam, not-spam, not-spam, not-spam — or **1, 1, 1, 0, 0, 0**.
- Compare decision to truth, one email at a time: correct, correct, **wrong**, **wrong**, correct, correct.
- Four out of six correct. That fraction, **4/6 = 0.6667**, is a number a human can act on.

Hold onto both things we just produced: the six raw output numbers, and the single fraction 0.6667. The rest of this module is about the difference between them.`,
    },
    {
      type: 'visual',
      component: 'Plot',
      props: {
          title: 'The same training run, measured two ways',
          notice: 'Between epoch 8 and epoch 11 the loss falls from 0.241 to 0.178 while accuracy does not move at all. The model IS improving — it is getting more confident about answers it already had right — but accuracy only changes when a prediction actually crosses 0.5, so it sits flat and then jumps. Loss is smooth because it can be differentiated; accuracy is a staircase, which is exactly why you cannot train on it.',
          kind: 'line',
          xLabel: 'epoch',
          yLabel: 'value',
          yMin: 0,
          yMax: 1.05,
          series: [
            {
              name: 'accuracy',
              points: [[0, 0.5], [1, 0.5], [2, 0.5], [3, 0.62], [4, 0.62], [5, 0.62], [6, 0.62], [7, 0.75], [8, 0.75], [9, 0.75], [10, 0.75], [11, 0.75], [12, 0.81], [13, 0.81], [14, 0.81], [15, 0.81], [16, 0.88], [17, 0.88], [18, 0.88], [19, 0.88], [20, 0.88], [21, 0.88], [22, 0.94], [23, 0.94], [24, 0.94], [25, 0.94]],
            },
            {
              name: 'loss',
              points: [[0, 0.69], [1, 0.5964], [2, 0.5171], [3, 0.45], [4, 0.3932], [5, 0.3451], [6, 0.3044], [7, 0.27], [8, 0.2408], [9, 0.2161], [10, 0.1952], [11, 0.1775], [12, 0.1626], [13, 0.1499], [14, 0.1392], [15, 0.1301], [16, 0.1224], [17, 0.1159], [18, 0.1104], [19, 0.1057], [20, 0.1018], [21, 0.0984], [22, 0.0956], [23, 0.0932], [24, 0.0912], [25, 0.0895]],
            },
          ],
        },
    },
    {
      type: 'intuition',
      title: 'What a metric is',
      md: `That 0.6667 has a name. It is called **accuracy**: the fraction of examples the model got right.

- A **metric** is a number computed from the model's decisions and the true answers, whose job is to let a *person* make a decision. Ship it or do not ship it. Keep this version or roll back.
- Accuracy is a metric. It is built by *counting*: count the correct ones, divide by the total. Counting is the important detail, and we will come back to it.
- A metric is normally computed on data the model has never been trained on, called **held-out data** — because a number measured on the exact examples the model already memorised tells you nothing about new email.
- Metrics are computed rarely. Once at the end of a training run, or once every pass through the data.
- A metric does not have to be easy to do arithmetic on. It only has to be meaningful. "Rupees of fraud we stopped last month" is a perfectly good metric and nobody differentiates it.`,
    },
    {
      type: 'intuition',
      title: 'What "training a model" actually is: turning knobs',
      md: `Before we can say what a loss is, we need to know what the model is doing while it trains. Four words, defined now, used for the rest of the module.

- **Model weights** — the adjustable numbers inside the model. Think of a machine with a few thousand knobs on the front. Turning a knob changes every output the model produces. Training means finding a good setting for every knob. Nothing else.
- **Batch** — a small group of examples, say 32 or 256 of them, that the model looks at together before it adjusts the knobs once. Data is fed in batches because adjusting after every single example is noisy and adjusting only after all million examples is slow.
- **Epoch** — one complete pass through the whole training dataset. If you have 10,000 examples and a batch of 100, one epoch is 100 batches.
- **Gradient** — the *slope*. If you nudge one knob a tiny bit to the right, does the number you are trying to improve go up or down, and by how much per unit of nudge? That answer is the slope. When there are many knobs at once, the collection of all their slopes is called the gradient. "Gradient" and "slope" mean the same thing here; the word just handles many knobs at once.
- **Differentiable** — a function is differentiable if it has a well-defined slope everywhere. Smooth, no jumps, no flat cliffs. If a function is differentiable, you can always ask "which way should I turn this knob?" and get a real answer.

The whole of training is this loop: compute a number, ask which way each knob should move to make that number smaller, move every knob a tiny step that way, repeat. The asking-which-way step needs a slope. That is the entire reason the next section exists.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 1: compute accuracy with a for loop and nothing else',
      code: `p = [0.9, 0.8, 0.6, 0.4, 0.3, 0.2]
y = [1, 1, 0, 1, 0, 0]

correct = 0
for i in range(6):
    guess = 1 if p[i] > 0.5 else 0
    if guess == y[i]:
        correct = correct + 1

print(correct)
print(correct / 6)

# ---- real output ----
# 4
# 0.6666666666666666`,
      annotations: {
        1: 'p holds the model\'s six raw outputs, one per email. A plain Python list of floats. p is short for "probability".',
        2: 'y holds the six true answers, using 1 for spam and 0 for not-spam. Same order as p, so p[3] and y[3] describe the same email.',
        4: 'A counter, starting at zero. We will add 1 to it each time the model was right.',
        5: 'range(6) produces 0, 1, 2, 3, 4, 5 — the six positions in both lists. i is the position we are looking at.',
        6: 'The cut-off. "1 if condition else 0" is a Python conditional expression: it evaluates the condition, and the whole thing becomes 1 when the condition is true and 0 when it is false. So guess is the model\'s yes/no decision for email i.',
        7: '== compares the decision to the truth. It is either exactly equal or it is not — there is no in-between.',
        8: 'Add one to the counter. Only whole numbers ever get added, which is the fact that will matter in step 2.',
        10: 'Prints how many of the six were right.',
        11: 'Divides by 6 to get the fraction. Python prints the full float, 0.6666666666666666 — the same 4/6 we computed by hand.',
      },
    },
    {
      type: 'intuition',
      title: 'Step 2: nudge a prediction and watch accuracy refuse to move',
      md: `Look at email number 4 in the list — position 3, since Python counts from zero. The model output **0.4** and the truth is **1 (spam)**. The model is wrong about it, and it is wrong in an interesting way: 0.4 is not very far below the 0.5 cut-off.

- Suppose training turns a knob and this output rises from 0.40 to 0.41. The model has genuinely improved on this email — it is less wrong than before.
- But 0.41 is still below 0.5, so the decision is still "not spam", so the email is still counted as wrong.
- Accuracy is still exactly 4/6.
- Push it to 0.42. Still 4/6. To 0.45. Still 4/6. To 0.49. Still 4/6.
- Accuracy did not move by a millionth. Its slope, over that entire range, is exactly zero.

Run it rather than take my word for it.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 2 in code: five different predictions, one unchanged accuracy',
      code: `def accuracy(p, y):
    correct = 0
    for i in range(len(p)):
        guess = 1 if p[i] > 0.5 else 0
        if guess == y[i]:
            correct = correct + 1
    return correct / len(p)

y = [1, 1, 0, 1, 0, 0]
for nudge in [0.0, 0.01, 0.02, 0.05, 0.09]:
    p = [0.9, 0.8, 0.6, 0.4 + nudge, 0.3, 0.2]
    print(round(0.4 + nudge, 2), round(accuracy(p, y), 4))

# ---- real output ----
# 0.4 0.6667
# 0.41 0.6667
# 0.42 0.6667
# 0.45 0.6667
# 0.49 0.6667`,
      annotations: {
        1: 'Same counting code as step 1, wrapped in a function so we can call it many times with different predictions.',
        2: 'The counter again, reset to zero on every call.',
        3: 'len(p) is the number of predictions — 6 here. Using len instead of a hard-coded 6 lets this function work on any list length.',
        4: 'The same cut-off rule as before: above 0.5 means the model said spam.',
        5: 'The same exact comparison against the truth.',
        6: 'The same increment by one.',
        7: 'Hand back the fraction correct. Nothing new — this is step 1, made reusable.',
        9: 'The truth list, unchanged. Only the predictions will change below.',
        10: 'Five different amounts to add to the fourth prediction. Each loop pass builds a slightly better model.',
        11: 'Rebuild the six predictions with position 3 raised by the current nudge. Every other prediction stays identical, so any change in the printed number must come from this one prediction.',
        12: 'round(x, 2) cuts a float to 2 decimal places so 0.4 + 0.01 prints as 0.41 instead of 0.41000000000000003. The second print value is accuracy, rounded to 4 places.',
      },
    },
    {
      type: 'intuition',
      title: 'Step 3: a number that does move — the loss',
      md: `We need a number that notices the improvement accuracy ignored. Here is the simplest one that works: instead of asking "was the decision right?", ask "how far off was the raw output?"

- For each email, take the model's output minus the truth, and **square it**. Squaring makes the result positive whether the model was too high or too low, and it punishes large mistakes harder than small ones.
- Then average the six squared distances. That average is called the **squared-error loss**, or **mean squared error**.
- Compute it by hand for the original six: (0.9−1)² = 0.01, (0.8−1)² = 0.04, (0.6−0)² = 0.36, (0.4−1)² = 0.36, (0.3−0)² = 0.09, (0.2−0)² = 0.04.
- Add them: 0.01 + 0.04 + 0.36 + 0.36 + 0.09 + 0.04 = **0.90**. Divide by 6: the loss is **0.15**.
- Now nudge the fourth prediction from 0.40 to 0.41. Only that email's term changes: (0.41−1)² = 0.3481 instead of 0.36. The total drops by 0.0119, so the loss drops to 0.14802.

The loss moved. Small improvement in, small improvement out. That is the property accuracy did not have.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 3 in code: the same five nudges, a loss that responds every time',
      code: `def squared_loss(p, y):
    total = 0.0
    for i in range(len(p)):
        total = total + (p[i] - y[i]) ** 2
    return total / len(p)

y = [1, 1, 0, 1, 0, 0]
for nudge in [0.0, 0.01, 0.02, 0.05, 0.09]:
    p = [0.9, 0.8, 0.6, 0.4 + nudge, 0.3, 0.2]
    print(round(0.4 + nudge, 2), round(squared_loss(p, y), 5))

# ---- real output ----
# 0.4 0.15
# 0.41 0.14802
# 0.42 0.14607
# 0.45 0.14042
# 0.49 0.13335`,
      annotations: {
        1: 'Takes the same two lists as accuracy() did, so the two functions are directly comparable.',
        2: 'A running total, starting at 0.0. Written as 0.0 rather than 0 to make it clear this accumulates decimals, not whole numbers.',
        3: 'Walk the six positions, exactly as before.',
        4: '(p[i] - y[i]) is how far the raw output is from the truth, and ** 2 squares it. This is the whole difference from accuracy: no cut-off, no yes/no, just the distance itself. A change of any size in p[i] changes this term.',
        5: 'Average over the six examples so the number does not grow just because the dataset is bigger.',
        7: 'The same unchanged truth list.',
        8: 'The same five nudges as step 2, so the two outputs can be read side by side.',
        9: 'The same rebuilt prediction list, one value raised.',
        10: 'Print the nudged prediction and the loss to 5 decimal places. Compare with step 2: there the second column never changed, here it changes on every single row.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 4: measure both slopes directly',
      code: `def make(v):
    return [0.9, 0.8, 0.6, v, 0.3, 0.2]

step = 0.01
acc_slope = (accuracy(make(0.41), y) - accuracy(make(0.40), y)) / step
loss_slope = (squared_loss(make(0.41), y) - squared_loss(make(0.40), y)) / step
print(f'accuracy slope = {acc_slope:.4f}')
print(f'loss slope     = {loss_slope:.4f}')

# ---- real output ----
# accuracy slope = 0.0000
# loss slope     = -0.1983`,
      annotations: {
        1: 'A tiny helper that builds the six predictions with position 3 set to whatever value v you pass in. Saves rewriting the list every time.',
        2: 'The list, with v dropped into the fourth slot.',
        4: 'How far sideways we move: one hundredth. This is the "run" in rise-over-run.',
        5: 'Slope of accuracy: the change in accuracy (the rise) divided by the size of the sideways move (the run). Exactly the slope formula from school maths.',
        6: 'The same slope calculation applied to the loss. Same two prediction lists, same step size, so the only difference is which number we measured.',
        7: 'f-strings: anything inside {curly braces} is evaluated and pasted into the text. The :.4f after the colon is a format instruction meaning "show this as a decimal with exactly 4 digits after the point".',
        8: 'Same formatting for the loss slope. The result is negative, which means: raising this prediction makes the loss go DOWN. That minus sign is the instruction to the optimiser — keep going this way.',
      },
    },
    {
      type: 'note',
      md: `Read the two results together. The accuracy slope is **0.0000**: it tells the training loop "moving this knob changes nothing, so take a step of size zero". If you tried to train on accuracy, every knob would get a step of zero, forever, and the model would end training exactly as it started. The loss slope is **−0.1983**: it tells the training loop both *which way* (up, because the slope is negative) and *how strongly* (about 0.2 units of loss per unit of prediction). One number is an instruction. The other is silence.`,
    },
    {
      type: 'intuition',
      title: 'But accuracy does change eventually — and that is the other half of the problem',
      md: `Accuracy is not permanently frozen. Push that fourth prediction past 0.5 and the decision flips from not-spam to spam, the email becomes correct, and accuracy jumps from 4/6 to 5/6.

- The jump is 5/6 − 4/6 = 1/6 = **0.1667**, and it happens the instant the prediction crosses 0.5.
- So accuracy is flat, flat, flat, then a vertical step, then flat again. Like a staircase, not a ramp.
- On the flat parts the slope is zero, which gives no direction. At the step, the slope is not a number at all: the rise is 0.1667 and the run is as close to zero as you like, so the "slope" grows without limit the more carefully you measure it.
- Measure it with a sideways step of 0.01 and you read 16.7. Use 0.001 and you read 166.7. Use 0.0001 and you read 1666.7. It keeps multiplying by ten.
- That is what "not differentiable" means in practice: there is no single correct answer to "what is the slope here?"

Zero everywhere useful, and a meaningless spike at the one place something happens. Neither half can steer a training loop. That is the entire reason nobody trains on accuracy.`,
    },
    {
      type: 'visual',
      component: 'PythonPlayground',
      props: {
        code: `def accuracy(p, y):
    correct = 0
    for i in range(len(p)):
        guess = 1 if p[i] > 0.5 else 0
        if guess == y[i]:
            correct = correct + 1
    return correct / len(p)

def make(v):
    return [0.9, 0.8, 0.6, v, 0.3, 0.2]

y = [1, 1, 0, 1, 0, 0]
for step in [0.01, 0.001, 0.0001]:
    rise = accuracy(make(0.5 + step), y) - accuracy(make(0.5), y)
    print(f'step {step:<8} rise {rise:.4f}  slope {rise / step:.1f}')`,
        precomputedOutput: `step 0.01     rise 0.1667  slope 16.7
step 0.001    rise 0.1667  slope 166.7
step 0.0001   rise 0.1667  slope 1666.7`,
        caption: 'The rise stays 0.1667 while the run shrinks, so the measured slope multiplies by ten each time. There is no single slope at the flip point.',
        annotations: {
          1: 'Defines a function called accuracy that takes p (the six predicted scores) and y (the six true labels).',
          2: 'Start a counter at zero. It will hold how many of the six we got right.',
          3: 'Loop once per email. len(p) is 6, so range(len(p)) gives i = 0, 1, 2, 3, 4, 5.',
          4: 'Turn a score into a yes/no guess: 1 if the score is above 0.5, otherwise 0. This one-line form is the Python if-expression, read as "1 if the test passes else 0".',
          5: 'Compare our guess with the true label for this email.',
          6: 'If they match, add one to the counter.',
          7: 'Hand back the fraction correct: how many we got right, divided by how many there were.',
          9: 'Defines a helper that builds a fresh list of six scores, where the fourth score is whatever value v we pass in.',
          10: 'The five other scores never move. Only position four changes, so only one email can ever flip.',
          12: 'The true labels: the first, second and fourth emails really are spam (1); the rest are not (0).',
          13: 'Try three step sizes, each ten times smaller than the last.',
          14: 'The rise: accuracy just above the 0.5 cut-off, minus accuracy exactly at it. This is the only line doing real work.',
          15: 'Print the step, the rise, and rise divided by step - which is what "slope" means: how much the answer moved, per unit we moved the input.',
        },
      },
    },
    {
      type: 'note',
      md: `The format spec \`{step:<8}\` in that snippet means "print step, left-aligned, padded out to 8 characters" — it is only there to keep the columns lined up. \`{rise:.4f}\` and \`{rise / step:.1f}\` are the same decimal-places instruction you saw in step 4. The only line doing real work is \`rise = accuracy(...) - accuracy(...)\`, and its result never changes: crossing the cut-off always fixes exactly one of the six emails, worth exactly 1/6, no matter how narrowly you straddle the crossing.`,
    },
    {
      type: 'intuition',
      title: 'The definitions, now that you have seen both',
      md: `Everything above was one experiment. Here is what it establishes.

- A **loss** is the number the model itself uses. It is computed on every batch, and its one job is to have a slope, so the training loop knows which way to turn each knob. Its actual value is not meant to be meaningful to a human — "our loss is 0.14802" tells a manager nothing.
- A **metric** is the number a person uses. It is computed occasionally, on held-out data, and its one job is to support a decision. It does not need a slope, because nothing is being optimised with it — a human reads it.
- They differ because they answer to different masters. A loss must be smooth, because gradient descent is a machine that can only feel slopes. A metric must be honest about what you care about, and the things people care about are usually counts: how many caught, how many missed, how many rupees.
- Counting is what makes a metric unusable as a loss. A count can only change by whole steps, so as a function of the model's knobs it is a staircase — flat then jumping — exactly what we measured.
- Sometimes one formula plays both roles. Squared error is the clean example: you can descend it during training *and* report it, because "average squared distance from the truth" is both smooth and meaningful.
- The practical order of work: decide the metric first, from the decision the model will drive, then pick the loss that best pushes that metric in the right direction.`,
    },
    {
      type: 'math',
      intro: 'The two formulas we just computed by hand, written in symbols. N is the number of examples, p is the model output for example i, y is its true label (0 or 1).',
      latex: [
        '\\text{Loss} \\;=\\; \\frac{1}{N}\\sum_{i=1}^{N}\\,(p_i - y_i)^2 \\qquad \\text{for our six emails: } \\frac{0.90}{6} = 0.15',
        '\\text{Accuracy} \\;=\\; \\frac{\\text{number of examples where the decision equals the truth}}{N} \\;=\\; \\frac{4}{6} = 0.6667',
        '\\frac{\\partial\\,\\text{Loss}}{\\partial p_i} \\;=\\; \\frac{2\\,(p_i - y_i)}{N} \\qquad \\text{a real number for every } p_i',
        '\\text{Accuracy changes only when } p_i \\text{ crosses the cut-off: slope } 0 \\text{ elsewhere, no slope at all there.}',
      ],
    },
    {
      type: 'note',
      md: `That third line is worth reading slowly. The curly-d symbol just means "the slope of the thing on top, when you nudge the thing on the bottom" — it is the same rise-over-run you computed in step 4, done with algebra instead of two evaluations. Plug in our numbers: p = 0.40, y = 1, N = 6 gives 2(0.40 − 1)/6 = −1.2/6 = **−0.2**, which matches the −0.1983 the code measured. (The code is slightly off because it used a finite sideways step of 0.01 instead of an infinitely small one.) Notice the formula's shape: **prediction minus truth**. The slope of the loss literally is the mistake, which is why it points straight at the fix.`,
    },
    {
      type: 'intuition',
      title: 'Worked case: a fraud model, computed by hand',
      md: `A bank scores 10 transactions overnight. Two of them are genuinely fraudulent. Here are the model's outputs and the truth, and here is what each layer of numbers says.

- Outputs, in the order the transactions arrived: **0.05, 0.90, 0.10, 0.20, 0.70, 0.03, 0.02, 0.45, 0.06, 0.01**.
- Truth (1 = fraud): **0, 1, 0, 0, 1, 0, 0, 0, 0, 0**. So transactions 2 and 5 are the frauds.
- **Metric, accuracy at cut-off 0.5.** Decisions: 0, 1, 0, 0, 1, 0, 0, 0, 0, 0. Compare to truth: all ten match. Accuracy = 10/10 = **1.0000**.
- **Loss, squared error.** Terms: 0.0025, 0.01, 0.01, 0.04, 0.09, 0.0009, 0.0004, 0.2025, 0.0036, 0.0001. Sum = 0.36. Divide by 10: loss = **0.0360**.
- Now retrain. The new model outputs **0.05, 0.95, 0.10, 0.20, 0.75, 0.03, 0.02, 0.30, 0.06, 0.01** — more confident on both frauds, and it pulled the borderline 0.45 down to 0.30.
- **New loss.** The three changed terms are (0.95−1)² = 0.0025 instead of 0.01, (0.75−1)² = 0.0625 instead of 0.09, and (0.30−0)² = 0.09 instead of 0.2025. The sum drops by 0.0075 + 0.0275 + 0.1125 = 0.1475, to 0.2125. New loss = **0.0213**, a 41% improvement.
- **New accuracy.** Every decision is identical — nothing crossed 0.5. Accuracy = **1.0000**, unchanged.

The loss improved by 41% and the metric did not move by anything, because the metric was already at its ceiling and only reads which side of the cut-off each score sits on. Both numbers are correct. They are simply measuring different things: the loss measures distance, the metric measures decisions.`,
    },
    {
      type: 'intuition',
      title: 'The classic mistake, walked into on purpose',
      md: `A team is asked to catch fraud. Fraud is rare: in their year of data, **1 in 1,000 transactions** is fraudulent. They decide to judge models by accuracy, because accuracy is the metric everyone understands.

- Their dataset has 1,000,000 transactions, of which **1,000 are fraud** and **999,000 are legitimate**.
- The model they ship scores **99.9% accuracy** on held-out data. The number goes in the slide deck. Everyone is happy.
- Three months later the fraud losses are exactly what they were before the model existed. Nothing was caught.
- Here is the diagnosis. Write down the accuracy of a model that answers "not fraud" to every single transaction, without looking at anything: it is right on all 999,000 legitimate ones and wrong on all 1,000 frauds, so its accuracy is 999,000/1,000,000 = **0.9990**, or 99.9%.
- That is the same 99.9% the shipped model scored. The metric could not tell the difference between a real model and a rubber stamp, because 99.9% of the score comes from the boring majority class.
- The failure is not in the training, the loss, or the model. It is that accuracy answers "what fraction of rows did you label correctly?" while the business question is "of the frauds, how many did you catch, and how many innocent customers did you annoy?" Those are different questions.

The fix is to pick the metric from the decision. The decision here is "send this transaction to a human reviewer", the reviewers can handle a fixed number of cases per day, and so the honest metric is "how much fraud is caught in the top N scored transactions". You will build exactly those metrics in the next two modules. The point for now: the metric was chosen out of habit rather than from the decision, and no amount of good training could rescue that.`,
    },
    {
      type: 'note',
      md: `Notice what the loss was doing while this happened. Squared-error loss averaged over a million rows is also dominated by the 999,000 legitimate ones — pushing all of those outputs to 0.001 lowers the loss a lot, and it is achieved by a model that has learned only "say no". The loss curve went down beautifully. A falling loss curve is evidence that the optimiser is working. It is not, by itself, evidence that the model is useful. Those are two separate claims, and this module exists so you never merge them.`,
    },
    {
      type: 'intuition',
      title: 'Practice problems',
      md: `Do these with pen and paper before reading the solutions in the next section. All the arithmetic is small on purpose.

1. A model outputs **0.8, 0.3, 0.6, 0.1** for four examples whose truths are **1, 0, 1, 1**. Using cut-off 0.5, compute the accuracy and the squared-error loss.
2. In problem 1, the last prediction rises from 0.1 to 0.2. Recompute both numbers. Which one changed, and by how much?
3. In problem 1, the last prediction instead rises from 0.1 to 0.6. Recompute both numbers. What is different about this nudge compared to problem 2?
4. A dataset has 200 examples, 190 of one class and 10 of the other. What accuracy does a model get if it always predicts the majority class, and what does that tell you about using accuracy here?
5. Someone proposes training a model by directly maximising accuracy with gradient descent, arguing that accuracy is what they care about, so it should be what they optimise. In two sentences, say what goes wrong mechanically.`,
    },
    {
      type: 'intuition',
      title: 'Worked solutions',
      md: `Check every step against your own working, not just the final number.

1. Decisions at cut-off 0.5 are **1, 0, 1, 0** (0.1 is below 0.5). Truths are 1, 0, 1, 1. The first three match, the fourth does not. **Accuracy = 3/4 = 0.75.** Loss terms: (0.8−1)² = 0.04, (0.3−0)² = 0.09, (0.6−1)² = 0.16, (0.1−1)² = 0.81. Sum = 1.10, divided by 4: **loss = 0.275**.
2. Decisions are unchanged — 0.2 is still below 0.5 — so **accuracy stays 0.75**. Only the fourth loss term changes: (0.2−1)² = 0.64 instead of 0.81, so the sum falls by 0.17 to 0.93. **New loss = 0.2325**, an improvement of 0.0425. The loss moved, the metric did not. Slope of the loss over this nudge: −0.0425 / 0.1 = **−0.425**; slope of accuracy: 0/0.1 = **0**.
3. Now 0.6 is above the cut-off, so the fourth decision flips to 1 and all four match: **accuracy = 4/4 = 1.0**, a jump of 0.25 all at once. Loss term: (0.6−1)² = 0.16, so the sum is 0.45 and the **loss = 0.1125**. The difference from problem 2 is that this nudge crossed the cut-off. The loss moved smoothly in both problems; accuracy did nothing in one and jumped a quarter in the other. That is the staircase.
4. Always predicting the majority class gives 190 correct out of 200 = **0.95**. So 95% accuracy is the score for a model that has learned nothing at all. Any real model must be compared against that 0.95 floor, and on this dataset accuracy has almost no room left to distinguish good models from useless ones.
5. Mechanically: accuracy is a count of correct decisions, so it only changes when a prediction crosses the cut-off, which means its slope is exactly zero everywhere else. Gradient descent multiplies the slope by a step size to decide how far to move each weight, so every step would have size zero and the model would never move from where it started.`,
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `Everything above stands on its own. This section names the ideas you will meet later, so the words are not new when you get there. You do not need any of it to answer "what is the difference between a loss and a metric".

- **Surrogate loss.** The general name for what we did: you cannot descend the metric you care about, so you descend a smooth stand-in that tends to move with it. Squared error was our stand-in for accuracy. A surrogate is a bet — "if this goes down, the thing I care about goes up" — and the bet is not guaranteed, which is exactly the fraud case earlier in this module.
- **Cross-entropy** is the surrogate actually used for classification, in place of squared error. Instead of squaring the distance, it takes the logarithm of the probability the model assigned to the correct answer, and negates it. The effect is that being confidently wrong is punished far more harshly than squaring does. Its slope has the same shape we derived — prediction minus truth — which is why it is the default.
- **Soft versions of counting metrics.** Some metrics built from counts can be made smooth by replacing each count with a sum of probabilities instead of a sum of yes/no answers. Once the counting is gone, the formula has a slope and can be trained on directly. You will see this after you learn the counting metrics themselves.
- **Regularisation.** Training sometimes adds an extra term to the number being minimised, computed only from the model's weights and not from any prediction. It exists to keep the weights small, which tends to stop the model from memorising the training data. The important consequence here: this term cannot possibly appear in any metric, because a metric measures predictions and this term never looks at one. So the number printed as "training loss" and the number printed as "validation loss" may not even be the same formula.
- **Optimising a metric without a slope.** There are methods that get a usable training signal from a metric that has no slope at all, by making the model's output random and measuring which random choices scored better on average. They work, they are used for things like optimising text-generation scores, and they are much noisier than descending a smooth loss. The cheap version of the same idea is what you will actually do most of the time: train the weights with a smooth loss, then tune the one or two decision numbers — like our 0.5 cut-off — directly against the metric by trying values.
- **Vocabulary you will see used loosely.** "Loss" strictly means the penalty on one example and "cost" the average over many, a distinction almost nobody maintains in conversation. "Objective" means whatever the optimiser actually works on, including regularisation, and it is sometimes maximised rather than minimised. "Criterion" is simply PyTorch's name for the loss object in code. None of these change an answer; just say which one you mean and keep going.`,
    },
  ],
  quiz: [
    {
      question: 'In the six-email example, the fourth prediction was raised from 0.40 to 0.49 and accuracy stayed at 0.6667. Why?',
      options: [
        {
          text: 'The prediction never crossed the 0.5 cut-off, so the decision for that email never changed, so the count of correct decisions never changed',
          explanation: 'Correct. Accuracy is built by counting decisions. A decision only changes when the raw output crosses the cut-off, so anything that happens strictly on one side of 0.5 is invisible to it.',
        },
        { text: 'Accuracy is rounded to four decimal places, which hid a small change', explanation: 'No rounding is involved. The count went from 4 correct to 4 correct — the underlying fraction was identically 4/6 on every row.' },
        { text: 'The model got better on that email but worse on another, and the two cancelled out', explanation: 'Only one prediction was changed; the other five were rebuilt identically on every loop pass, so there was nothing to cancel against.' },
      ],
      correct: 0,
    },
    {
      question: 'What does it mean, in plain terms, for a function to have a slope of zero at the current setting of a knob?',
      options: [
        { text: 'The function is at its lowest possible value', explanation: 'That is one situation where a slope is zero, but a completely flat region has slope zero everywhere along it and is nowhere near a minimum. Accuracy is the flat-region case.' },
        {
          text: 'Nudging that knob a tiny bit in either direction does not change the function\'s value, so the number gives no instruction about which way to move',
          explanation: 'Correct. Slope is rise over run. A rise of zero means the number is silent about direction, and a training step sized by that slope is a step of zero.',
        },
        { text: 'The function cannot be computed at that point', explanation: 'It computes fine — the six-email accuracy was a perfectly well-defined 0.6667 at every setting. The problem is that it was the same 0.6667 each time.' },
      ],
      correct: 1,
    },
    {
      question: 'Measuring accuracy\'s slope right at the flip point gave 16.7, then 166.7, then 1666.7 as the sideways step shrank. What does that pattern show?',
      options: [
        { text: 'The measurement is buggy and should use a larger step', explanation: 'A larger step just gives a smaller wrong answer. The instability is a property of the staircase itself, not of how carefully it was measured.' },
        { text: 'Accuracy has a very large but finite slope there', explanation: 'If the slope were a fixed number, shrinking the step would make the measurement settle down on that number. Instead it multiplies by ten every time, without limit.' },
        {
          text: 'There is no single slope at that point — the rise stays fixed at 1/6 while the run shrinks toward zero, so the ratio grows without limit',
          explanation: 'Correct. That is precisely what "not differentiable at this point" means: the rise-over-run has no value it settles on, so there is no honest answer to "which way and how far".',
        },
      ],
      correct: 2,
    },
    {
      question: 'A dataset has 999,000 legitimate transactions and 1,000 frauds. A model reports 99.9% accuracy. What should you check first?',
      options: [
        { text: 'Whether the model was trained for enough epochs', explanation: 'Training length cannot explain the number. The score is suspicious before you know anything about the training run.' },
        {
          text: 'What accuracy a model that always says "not fraud" would get — because that baseline is also 99.9%',
          explanation: 'Correct. 999,000/1,000,000 = 0.999. The reported score is indistinguishable from a model that never looks at the input, so the metric has no room to tell you anything.',
        },
        { text: 'Whether the held-out data leaked into training', explanation: 'Worth checking in general, but leakage is not needed to explain this number — the class imbalance alone produces it.' },
      ],
      correct: 1,
    },
    {
      question: 'In the worked fraud case, the loss improved 41% while accuracy stayed at exactly 1.0000. What is the correct reading?',
      options: [
        { text: 'There is a bug — a lower loss must improve the metric', explanation: 'No. The two formulas read different things: the loss reads distances between the raw outputs and the truth, the metric reads which side of the cut-off each output landed on.' },
        {
          text: 'The model became more confident on scores that were already on the correct side of the cut-off, which the loss rewards and the metric cannot see',
          explanation: 'Correct. Every score stayed on its original side of 0.5, so no decision changed, so no count changed. Meanwhile every score moved closer to its true label, which is exactly what squared error measures.',
        },
        { text: 'Accuracy should have gone above 1.0', explanation: 'Accuracy is a fraction of examples correct, so 1.0 means all ten were correct. There is nothing above it.' },
      ],
      correct: 1,
    },
    {
      question: 'Why does a metric NOT need to be differentiable, while a loss does?',
      options: [
        { text: 'Metrics are computed on smaller datasets, so the exact value matters less', explanation: 'Dataset size is unrelated. A metric on a billion rows still needs no slope.' },
        {
          text: 'Nothing is optimised using the metric — a person reads it and makes a decision, and people do not need slopes',
          explanation: 'Correct. Differentiability is required only by gradient descent, which is the machine that adjusts the weights. The metric never feeds that machine, so it is free to be a count, a ranking, or a rupee total.',
        },
        { text: 'Metrics are always differentiable in practice, the requirement is just never stated', explanation: 'The opposite: most useful metrics are built from counting or sorting and are staircases, exactly like the accuracy we measured.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'What is the difference between a loss function and a metric?',
      answer:
        'A loss is the number the model optimises. It is computed on every batch of training data, and its job is to produce a slope — the training loop needs to know which way to adjust each weight, and the only way to know that is to ask how the number responds to a tiny nudge. That requirement forces the loss to be smooth. A metric is the number a person uses to make a decision about the model: computed occasionally, on held-out data, and free to be anything meaningful, because nothing is being differentiated through it. Accuracy is a metric and cannot be a loss, because it counts decisions and therefore only changes when a prediction crosses the cut-off — flat everywhere else. Squared error can be both, which is why the distinction is easy to miss when you learn on regression problems.',
      isCaseBased: false,
    },
    {
      question: 'Why can you not train a model by gradient descent directly on accuracy?',
      answer:
        'Because accuracy is a count of correct decisions, and a count changes only in whole steps. Concretely: take six predictions, raise one of them from 0.40 to 0.49 with a cut-off at 0.5, and accuracy is identically 4/6 the whole way — measured slope exactly 0.0000. Gradient descent sizes each weight update by the slope, so a slope of zero means an update of zero, and the model never leaves its starting point. Then at the exact value where a prediction crosses the cut-off, accuracy jumps by 1/N in no distance at all: measure the slope with a step of 0.01 and you get 16.7, with 0.001 you get 166.7, with 0.0001 you get 1666.7 — it never settles, so there is no slope there either. Zero where nothing happens and undefined where something does. Neither half can steer the loop, so you descend a smooth stand-in instead.',
      isCaseBased: false,
    },
    {
      question: 'Define gradient, batch, epoch, and model weights, as if to someone who has never trained a model.',
      answer:
        'Model weights are the adjustable numbers inside the model — imagine a machine with thousands of knobs, and training is the search for a good setting of every knob. A batch is a small group of training examples, typically tens to hundreds, that the model processes together before the knobs get adjusted once; adjusting after every single example is noisy and adjusting only after the whole dataset is slow, so batches are the compromise. An epoch is one complete pass through the entire training dataset, so with 10,000 examples and a batch of 100, an epoch is 100 adjustments. A gradient is a slope: nudge one knob slightly and ask how much the loss changed per unit of nudge, and that ratio is the slope for that knob. With many knobs at once, the whole collection of slopes is called the gradient. The training loop is just: compute the loss on a batch, get the gradient, move every knob a small step in the direction that lowers the loss, repeat.',
      isCaseBased: false,
    },
    {
      question: 'Case: a teammate says "validation loss dropped 40% this week, let\'s ship". What do you ask, and what is your first hypothesis?',
      answer:
        'Ask what the metric did, and then ask how many actual decisions would change if this model were deployed. First hypothesis before hearing the answer: nothing downstream changed. A loss that measures distance between the raw output and the truth rewards the model for becoming more confident about examples it already handled correctly, and that improvement is invisible to any metric that only reads which side of the cut-off a score fell on. I can build that on paper: ten transactions where retraining moves 0.90 to 0.95, 0.70 to 0.75, and 0.45 to 0.30 gives a 41% loss improvement with accuracy identically 1.0000 both times. Other explanations for the same symptom: the loss formula changed between runs, for example a regularisation term was added or removed or the class weighting changed, in which case the two numbers are not comparable at all. The concrete request is the count of decisions that flip. If zero decisions flip, there is nothing to ship.',
      isCaseBased: true,
    },
    {
      question: 'Case: a fraud team reports 99.9% accuracy and three months later fraud losses are unchanged. Diagnose it.',
      answer:
        'Start by computing the score of a model that does nothing. If fraud is 1 in 1,000, then answering "not fraud" to all 1,000,000 transactions is right 999,000 times, which is 99.9% accuracy. The shipped model scored the same as a rubber stamp, so the reported number carried no information about whether the model works. The failure is in the choice of metric, not in the training: accuracy asks "what fraction of rows did you label correctly", and when 99.9% of rows are one class, that question is answered almost entirely by the boring majority. The business question is different — of the frauds, how many were caught, and how many innocent customers were flagged. The repair is to go back to the decision: the model output feeds a review queue, the reviewers can handle a fixed number of cases per day, so the metric should be how much fraud appears in the top N scored transactions. Then re-evaluate the same model against that. It may well be fine and merely mis-measured.',
      isCaseBased: true,
    },
    {
      question: 'Why should you pick the metric before the loss, rather than the other way around?',
      answer:
        'Because the loss is a means and the metric is the end, and choosing a means before you have named an end is how projects end up with beautiful training curves and useless models. The chain runs: what decision does this model drive, who acts on it, what does each kind of mistake cost, and what capacity constraints exist. That fixes the metric. Only then do you go shopping for a smooth loss that pushes that metric in the right direction, and possibly for a weighting or a threshold that reflects the cost asymmetry. Doing it in the reverse order means starting with whatever loss the tutorial used, training until it goes down, and then looking around for a number that makes the result presentable. That is choosing the scoreboard after the game, and it is exactly what produces the 99.9%-accuracy fraud model that catches nothing.',
      isCaseBased: false,
    },
    {
      question: 'Your training loss keeps falling but your held-out metric is flat. List the possible causes in order.',
      answer:
        'First: the loss is improving on things the metric does not read. Extra confidence on examples already decided correctly lowers a distance-based loss and moves no count-based metric at all — this is the most common cause and the cheapest to check, by counting how many decisions changed. Second: the model is memorising the training data rather than learning a pattern, so the loss falls on data it has seen while the held-out metric, measured on data it has not, does not move. Third: the metric is saturated or degenerate — if the classes are heavily imbalanced, the metric may be pinned near its ceiling by the majority class and simply unable to register improvement. Fourth: the two numbers are not the same formula, because the training number includes terms like regularisation that are computed from the weights and never appear in any metric, so a change in that term moves the training number and could not possibly move the metric. Diagnose in that order because the cost of checking rises as you go down the list.',
      isCaseBased: false,
    },
    {
      question: 'Case: a search team optimises a smooth loss on click data and their offline metric improves 4%, but in the live A/B test engagement is flat. Where can this break?',
      answer:
        'Three separate joints, each with a different fix. Joint one, loss to metric: the loss treats every result on the page as equally important, while the metric almost certainly weights the top positions far more heavily, so an offline win can come entirely from reordering results far down the page that nobody scrolls to. Check where in the ranking the improvement lives; the fix is to weight the loss by position. Joint two, offline metric to live behaviour: the offline metric is computed on logged clicks, and those clicks were produced under the old ranking, so results the old system never showed have no data at all. A model that reproduces the old ordering scores well by construction. The fix is a live test or interleaving rather than replaying logs. Joint three, engagement to value: clicks are a proxy for satisfaction and can be raised by results that get clicked and disappoint. The discipline is to name which joint broke before changing the model, because two of the three fixes are not model changes at all.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'Loss vs metric, in one line', back: 'Loss = the number the model uses to know which way to adjust its weights; must be smooth, computed every batch. Metric = the number a person uses to decide something; needs no slope, computed on held-out data.' },
    { front: 'Gradient, in plain words', back: 'The slope. Nudge one weight a tiny bit; how much does the loss change per unit of nudge? With many weights, the collection of all their slopes is the gradient.' },
    { front: 'Why accuracy cannot be a loss', back: 'It counts decisions, so it only changes when a prediction crosses the cut-off. Measured on six emails: raising a prediction 0.40 to 0.49 gives slope exactly 0.0000. Zero slope means zero-sized training steps forever.' },
    { front: 'The staircase, in numbers', back: 'At the flip point accuracy rises 1/6 = 0.1667 no matter how small the sideways step. Step 0.01 reads slope 16.7, step 0.001 reads 166.7, step 0.0001 reads 1666.7 — it never settles, so there is no slope there.' },
    { front: 'Squared-error loss', back: 'For each example, (prediction - truth) squared; then average. Six emails: 0.01+0.04+0.36+0.36+0.09+0.04 = 0.90, divided by 6 = 0.15. Smooth, so it always has a slope.' },
    { front: 'Slope of squared-error loss', back: '2(p - y)/N — literally prediction minus truth, scaled. The slope IS the mistake, which is why it points straight at the fix. At p=0.40, y=1, N=6: -0.2.' },
    { front: 'Batch and epoch', back: 'Batch = a small group of examples processed together before the weights are adjusted once. Epoch = one complete pass through the whole training dataset.' },
    { front: 'Loss down, metric flat', back: 'Normal, not a bug. The model got more confident about examples already on the correct side of the cut-off. Worked case: loss 0.0360 to 0.0213 (-41%) with accuracy 1.0000 both times.' },
  ],
  mindmapMarkdown: `- Loss vs Metric
  - The six-email experiment
    - outputs 0.9 0.8 0.6 0.4 0.3 0.2
    - truth 1 1 0 1 0 0, cut-off 0.5
    - accuracy = 4/6 = 0.6667
    - squared-error loss = 0.90/6 = 0.15
  - Vocabulary defined here
    - model weights = the adjustable knobs
    - batch = examples processed before one adjustment
    - epoch = one full pass through the data
    - gradient = the slope, for many knobs at once
    - differentiable = has a slope everywhere
  - What a metric is
    - built from counting decisions
    - read by a person, on held-out data
    - needs no slope, nothing optimises it
  - What a loss is
    - built from distances, not counts
    - read by the optimiser, every batch
    - must have a slope or training cannot move
  - The measured result
    - nudge 0.40 to 0.49: accuracy slope 0.0000
    - same nudge: loss slope -0.1983
    - at the flip: slope 16.7, 166.7, 1666.7
    - flat everywhere, undefined at the jump
  - Worked fraud case
    - loss 0.0360 to 0.0213, a 41% gain
    - accuracy 1.0000 to 1.0000, unchanged
    - no score crossed the cut-off
  - The classic mistake
    - 1,000 frauds in 1,000,000 rows
    - always-say-no scores 99.9%
    - metric chosen by habit, not by the decision
  - Beyond the basics
    - surrogate loss = smooth stand-in for the metric
    - cross-entropy replaces squaring with a log
    - regularisation lives in the loss, never a metric
    - tune the cut-off against the metric directly`,
}

export default m
