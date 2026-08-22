import type { Module } from '../types'

const m: Module = {
  id: 'metrics-l1-classification-losses',
  subjectId: 'metrics',
  level: 1,
  title: 'Classification Losses: Cross-Entropy, Focal & Hinge',
  whyItMatters:
    'Every classifier you will ever train is minimising one of these numbers. This module does not hand you the cross-entropy formula. It starts from one honest question about a single prediction, and the formula falls out of the answer in three steps you can check yourself. Then it shows the three common variations on it, with real numbers for each, so that "why this loss?" becomes a question you answer from arithmetic rather than from memory.',
  assumes: [
    'You know what a probability is: a number between 0 and 1, where 1 means certain',
    'You have seen a Python for loop, a list, and a function definition',
    'You know what a slope is from school maths: how much a number moves when you nudge its input',
    'Read *Loss vs Metric* first - it explains what a loss is for and why it must be smooth',
    'No calculus and no machine-learning background is needed. Every term used here is defined here.',
  ],
  estMinutes: 47,
  sections: [
    {
      type: 'intuition',
      title: 'Start from the only honest question',
      md: `A model looks at one email and outputs **p = 0.7**. That means: "I think there is a 70% chance this is spam." Then the true label **y** arrives. How do we score that one prediction?

- Do not invent a formula yet. Ask a simpler question: **how probable was what actually happened, according to the model?**
- If the email really was spam (y = 1), the model had assigned probability **0.7** to what happened. Good.
- If it really was not spam (y = 0), the model had assigned probability **1 − 0.7 = 0.3** to what happened. Not so good.
- Give that number a name: **p_t**, the probability the model gave *the true label*. It is 0.7 in the first case and 0.3 in the second.
- A good model makes p_t large on every row. That is the whole objective, and we have stated it before any loss exists.

Everything in this module is a re-weighting of p_t. If you hold on to one symbol, hold on to that one.`,
    },
    {
      type: 'visual',
      component: 'Plot',
      props: {
          title: 'Cross-entropy vs focal loss, as the model gets the answer right',
          notice: 'x is the probability the model gave the CORRECT class. Cross-entropy still charges 0.105 at p = 0.90 — multiply that by 10,000 easy examples and the easy ones drown out the hard ones. Focal loss multiplies by (1-p)^2, so the same p = 0.90 costs 0.001: a hundred times less. That is the whole idea — spend the gradient on what the model is still getting wrong.',
          kind: 'line',
          xLabel: 'probability given to the true class',
          yLabel: 'loss',
          yMin: 0,
          yMax: 3,
          series: [
            {
              name: 'cross-entropy',
              points: [[0.01, 4.6052], [0.015, 4.1997], [0.02, 3.912], [0.025, 3.6889], [0.03, 3.5066], [0.035, 3.3524], [0.04, 3.2189], [0.045, 3.1011], [0.05, 2.9957], [0.055, 2.9004], [0.06, 2.8134], [0.065, 2.7334], [0.07, 2.6593], [0.075, 2.5903], [0.08, 2.5257], [0.085, 2.4651], [0.09, 2.4079], [0.095, 2.3539], [0.1, 2.3026], [0.105, 2.2538], [0.11, 2.2073], [0.115, 2.1628], [0.12, 2.1203], [0.125, 2.0794], [0.13, 2.0402], [0.135, 2.0025], [0.14, 1.9661], [0.145, 1.931], [0.15, 1.8971], [0.155, 1.8643], [0.16, 1.8326], [0.165, 1.8018], [0.17, 1.772], [0.175, 1.743], [0.18, 1.7148], [0.185, 1.6874], [0.19, 1.6607], [0.195, 1.6348], [0.2, 1.6094], [0.205, 1.5847], [0.21, 1.5606], [0.215, 1.5371], [0.22, 1.5141], [0.225, 1.4917], [0.23, 1.4697], [0.235, 1.4482], [0.24, 1.4271], [0.245, 1.4065], [0.25, 1.3863], [0.255, 1.3665], [0.26, 1.3471], [0.265, 1.328], [0.27, 1.3093], [0.275, 1.291], [0.28, 1.273], [0.285, 1.2553], [0.29, 1.2379], [0.295, 1.2208], [0.3, 1.204], [0.305, 1.1874], [0.31, 1.1712], [0.315, 1.1552], [0.32, 1.1394], [0.325, 1.1239], [0.33, 1.1087], [0.335, 1.0936], [0.34, 1.0788], [0.345, 1.0642], [0.35, 1.0498], [0.355, 1.0356], [0.36, 1.0217], [0.365, 1.0079], [0.37, 0.9943], [0.375, 0.9808], [0.38, 0.9676], [0.385, 0.9545], [0.39, 0.9416], [0.395, 0.9289], [0.4, 0.9163], [0.405, 0.9039], [0.41, 0.8916], [0.415, 0.8795], [0.42, 0.8675], [0.425, 0.8557], [0.43, 0.844], [0.435, 0.8324], [0.44, 0.821], [0.445, 0.8097], [0.45, 0.7985], [0.455, 0.7875], [0.46, 0.7765], [0.465, 0.7657], [0.47, 0.755], [0.475, 0.7444], [0.48, 0.734], [0.485, 0.7236], [0.49, 0.7133], [0.495, 0.7032], [0.5, 0.6931], [0.505, 0.6832], [0.51, 0.6733], [0.515, 0.6636], [0.52, 0.6539], [0.525, 0.6444], [0.53, 0.6349], [0.535, 0.6255], [0.54, 0.6162], [0.545, 0.607], [0.55, 0.5978], [0.555, 0.5888], [0.56, 0.5798], [0.565, 0.5709], [0.57, 0.5621], [0.575, 0.5534], [0.58, 0.5447], [0.585, 0.5361], [0.59, 0.5276], [0.595, 0.5192], [0.6, 0.5108], [0.605, 0.5025], [0.61, 0.4943], [0.615, 0.4861], [0.62, 0.478], [0.625, 0.47], [0.63, 0.462], [0.635, 0.4541], [0.64, 0.4463], [0.645, 0.4385], [0.65, 0.4308], [0.655, 0.4231], [0.66, 0.4155], [0.665, 0.408], [0.67, 0.4005], [0.675, 0.393], [0.68, 0.3857], [0.685, 0.3783], [0.69, 0.3711], [0.695, 0.3638], [0.7, 0.3567], [0.705, 0.3496], [0.71, 0.3425], [0.715, 0.3355], [0.72, 0.3285], [0.725, 0.3216], [0.73, 0.3147], [0.735, 0.3079], [0.74, 0.3011], [0.745, 0.2944], [0.75, 0.2877], [0.755, 0.281], [0.76, 0.2744], [0.765, 0.2679], [0.77, 0.2614], [0.775, 0.2549], [0.78, 0.2485], [0.785, 0.2421], [0.79, 0.2357], [0.795, 0.2294], [0.8, 0.2231], [0.805, 0.2169], [0.81, 0.2107], [0.815, 0.2046], [0.82, 0.1985], [0.825, 0.1924], [0.83, 0.1863], [0.835, 0.1803], [0.84, 0.1744], [0.845, 0.1684], [0.85, 0.1625], [0.855, 0.1567], [0.86, 0.1508], [0.865, 0.145], [0.87, 0.1393], [0.875, 0.1335], [0.88, 0.1278], [0.885, 0.1222], [0.89, 0.1165], [0.895, 0.1109], [0.9, 0.1054], [0.905, 0.0998], [0.91, 0.0943], [0.915, 0.0888], [0.92, 0.0834], [0.925, 0.078], [0.93, 0.0726], [0.935, 0.0672], [0.94, 0.0619], [0.945, 0.0566], [0.95, 0.0513], [0.955, 0.046], [0.96, 0.0408], [0.965, 0.0356], [0.97, 0.0305], [0.975, 0.0253], [0.98, 0.0202], [0.985, 0.0151], [0.99, 0.0101], [0.995, 0.005], [1, 0]],
            },
            {
              name: 'focal (γ=2)',
              points: [[0.01, 4.5135], [0.015, 4.0747], [0.02, 3.7571], [0.025, 3.5067], [0.03, 3.2993], [0.035, 3.1218], [0.04, 2.9665], [0.045, 2.8283], [0.05, 2.7036], [0.055, 2.5901], [0.06, 2.4859], [0.065, 2.3896], [0.07, 2.3], [0.075, 2.2163], [0.08, 2.1378], [0.085, 2.0638], [0.09, 1.994], [0.095, 1.9279], [0.1, 1.8651], [0.105, 1.8053], [0.11, 1.7484], [0.115, 1.694], [0.12, 1.6419], [0.125, 1.5921], [0.13, 1.5442], [0.135, 1.4983], [0.14, 1.4541], [0.145, 1.4116], [0.15, 1.3707], [0.155, 1.3312], [0.16, 1.2931], [0.165, 1.2563], [0.17, 1.2207], [0.175, 1.1863], [0.18, 1.153], [0.185, 1.1208], [0.19, 1.0896], [0.195, 1.0594], [0.2, 1.03], [0.205, 1.0016], [0.21, 0.974], [0.215, 0.9472], [0.22, 0.9212], [0.225, 0.8959], [0.23, 0.8714], [0.235, 0.8475], [0.24, 0.8243], [0.245, 0.8017], [0.25, 0.7798], [0.255, 0.7584], [0.26, 0.7377], [0.265, 0.7174], [0.27, 0.6977], [0.275, 0.6786], [0.28, 0.6599], [0.285, 0.6417], [0.29, 0.624], [0.295, 0.6068], [0.3, 0.5899], [0.305, 0.5736], [0.31, 0.5576], [0.315, 0.542], [0.32, 0.5269], [0.325, 0.5121], [0.33, 0.4977], [0.335, 0.4836], [0.34, 0.4699], [0.345, 0.4566], [0.35, 0.4435], [0.355, 0.4309], [0.36, 0.4185], [0.365, 0.4064], [0.37, 0.3946], [0.375, 0.3831], [0.38, 0.3719], [0.385, 0.361], [0.39, 0.3504], [0.395, 0.34], [0.4, 0.3299], [0.405, 0.32], [0.41, 0.3104], [0.415, 0.301], [0.42, 0.2918], [0.425, 0.2829], [0.43, 0.2742], [0.435, 0.2657], [0.44, 0.2575], [0.445, 0.2494], [0.45, 0.2415], [0.455, 0.2339], [0.46, 0.2264], [0.465, 0.2192], [0.47, 0.2121], [0.475, 0.2052], [0.48, 0.1985], [0.485, 0.1919], [0.49, 0.1855], [0.495, 0.1793], [0.5, 0.1733], [0.505, 0.1674], [0.51, 0.1617], [0.515, 0.1561], [0.52, 0.1507], [0.525, 0.1454], [0.53, 0.1402], [0.535, 0.1352], [0.54, 0.1304], [0.545, 0.1257], [0.55, 0.1211], [0.555, 0.1166], [0.56, 0.1123], [0.565, 0.108], [0.57, 0.1039], [0.575, 0.1], [0.58, 0.0961], [0.585, 0.0923], [0.59, 0.0887], [0.595, 0.0852], [0.6, 0.0817], [0.605, 0.0784], [0.61, 0.0752], [0.615, 0.0721], [0.62, 0.069], [0.625, 0.0661], [0.63, 0.0633], [0.635, 0.0605], [0.64, 0.0578], [0.645, 0.0553], [0.65, 0.0528], [0.655, 0.0504], [0.66, 0.048], [0.665, 0.0458], [0.67, 0.0436], [0.675, 0.0415], [0.68, 0.0395], [0.685, 0.0375], [0.69, 0.0357], [0.695, 0.0338], [0.7, 0.0321], [0.705, 0.0304], [0.71, 0.0288], [0.715, 0.0272], [0.72, 0.0258], [0.725, 0.0243], [0.73, 0.0229], [0.735, 0.0216], [0.74, 0.0204], [0.745, 0.0191], [0.75, 0.018], [0.755, 0.0169], [0.76, 0.0158], [0.765, 0.0148], [0.77, 0.0138], [0.775, 0.0129], [0.78, 0.012], [0.785, 0.0112], [0.79, 0.0104], [0.795, 0.0096], [0.8, 0.0089], [0.805, 0.0082], [0.81, 0.0076], [0.815, 0.007], [0.82, 0.0064], [0.825, 0.0059], [0.83, 0.0054], [0.835, 0.0049], [0.84, 0.0045], [0.845, 0.004], [0.85, 0.0037], [0.855, 0.0033], [0.86, 0.003], [0.865, 0.0026], [0.87, 0.0024], [0.875, 0.0021], [0.88, 0.0018], [0.885, 0.0016], [0.89, 0.0014], [0.895, 0.0012], [0.9, 0.0011], [0.905, 0.0009], [0.91, 0.0008], [0.915, 0.0006], [0.92, 0.0005], [0.925, 0.0004], [0.93, 0.0004], [0.935, 0.0003], [0.94, 0.0002], [0.945, 0.0002], [0.95, 0.0001], [0.955, 0.0001], [0.96, 0.0001], [0.965, 0], [0.97, 0], [0.975, 0], [0.98, 0], [0.985, 0], [0.99, 0], [0.995, 0], [1, 0]],
            },
          ],
        },
    },
    {
      type: 'intuition',
      title: 'Four words we need before going further',
      md: `These four appear on every line from here on, so they get defined now rather than used first and glossed later.

- **log** — written \`log(x)\`. It answers "what power do I raise e ≈ 2.718 to, in order to get x?" You need three facts only: log(1) = 0, the log of a number below 1 is negative, and log turns multiplication into addition because log(a·b) = log(a) + log(b). That third fact is the one we will use.
- **monotonic** — a function is monotonic increasing if a bigger input always gives a bigger output. log is monotonic: 0.7 > 0.3, and log(0.7) = −0.357 > log(0.3) = −1.204. The consequence that matters: **whatever setting makes a quantity largest also makes its log largest**, so you may take a log without changing which answer wins.
- **sigmoid** — the function \`sigmoid(z) = 1 / (1 + e^(−z))\`. Feed it any number and it hands back something strictly between 0 and 1. sigmoid(0) = 0.5, sigmoid(2) = 0.881, sigmoid(−3) = 0.047. It is how a model turns an unbounded score into a probability.
- **logit** — the raw score **z** that goes *into* the sigmoid. It is unbounded: it can be 0.3, or −7, or 1002. It is not a probability, it is the number that becomes one. Whenever you read "logit" below, read "the raw score the model printed, before any squashing".

One more consequence of monotonic, worth naming because we lean on it twice: sigmoid is also monotonic, so **the biggest logit always becomes the biggest probability**. Ranking by logits and ranking by probabilities give the same order.`,
    },
    {
      type: 'intuition',
      title: 'From "probability of the data" to a loss, in three moves',
      md: `Both cases from the first section collapse into one expression: **p^y · (1−p)^(1−y)**. Check it before believing it. Set y = 1: the second factor becomes (1−p)^0 = 1, leaving p. Set y = 0: the first factor becomes p^0 = 1, leaving (1−p). One formula, no if-statement, and it equals p_t every time.

- **Move 1 — multiply.** We assume the rows are independent, meaning one email being spam tells you nothing about the next. Under that assumption the probability of the *whole dataset* is the product of those per-row terms. That product has a name: the **likelihood**.
- **Move 2 — take the log.** Multiplying 10,000 numbers that are all below 1 gives something so small the computer rounds it to exactly 0.0. Log turns that product into a *sum* of 10,000 manageable numbers. And because log is monotonic, the weights that maximise the product also maximise the sum. Nothing was approximated.
- **Move 3 — negate.** Optimisers walk downhill, so they minimise. Maximising a number is the same as minimising its negative. Divide by N too, so the value does not grow with the dataset.
- What you have written after those three moves **is binary cross-entropy**. Nobody designed it. It is the answer to "how probable was what actually happened", rearranged so a computer can descend it.
- The payoff sentence: **minimising cross-entropy is exactly maximising likelihood.** That is why its outputs behave like real probabilities and not just scores.`,
    },
    {
      type: 'math',
      intro: 'The three moves, in symbols. Nothing new is introduced between lines - each one is the previous one rewritten.',
      latex: [
        'P(y \\mid p) = p^{\\,y}\\,(1-p)^{\\,1-y} \\;=\\; p_t, \\qquad y \\in \\{0, 1\\}',
        '\\mathcal{L} = \\prod_{i=1}^{N} p_i^{\\,y_i}(1-p_i)^{\\,1-y_i} \\;\\;\\xrightarrow{\\;\\log\\;}\\;\\; \\sum_{i=1}^{N}\\Big[\\, y_i \\log p_i + (1-y_i)\\log(1-p_i) \\Big]',
        '\\text{BCE} = -\\frac{1}{N}\\sum_{i=1}^{N}\\Big[\\, y_i \\log p_i + (1-y_i)\\log(1-p_i) \\Big] \\;=\\; -\\frac{1}{N}\\sum_{i=1}^{N} \\log p_{t,i}',
      ],
    },
    {
      type: 'note',
      md: `That last equality is worth more than the two lines above it. **Binary cross-entropy is just the average of −log(p_t)** — one number per row, with the label already absorbed into p_t. Every other loss in this module changes that single quantity in one small way: label smoothing changes what p_t is compared against, focal loss multiplies it by a weight, hinge replaces it with a distance. Learn −log(p_t) properly and the rest is bookkeeping.`,
    },
    {
      type: 'intuition',
      title: 'The shape of the penalty: gentle when right, brutal when confidently wrong',
      md: `Feed −log(p_t) some numbers. It is not a straight line, and that curve is the entire behaviour of the loss.

- p_t = 0.9 → penalty **0.105**. You were right, and you pay almost nothing.
- p_t = 0.5 → penalty **0.693**. You shrugged, and you pay a fixed modest fee.
- p_t = 0.1 → penalty **2.303**. You were wrong, and you had said so out loud. That is 22 times the first row.
- p_t = 0.01 → penalty **4.605**. 44 times the first row, and it keeps climbing without limit as p_t approaches 0.
- Read the pattern: being *right* is cheap no matter how right you were. Being *wrong* is cheap only if you had hedged.
- The expensive corner is **confident and wrong**. Cross-entropy charges for overconfidence, not merely for error.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The penalty table, computed rather than quoted',
      code: `import math

for pt in [0.9, 0.5, 0.1, 0.01]:
    print(pt, round(-math.log(pt), 3))

# ---- real output ----
# 0.9 0.105
# 0.5 0.693
# 0.1 2.303
# 0.01 4.605`,
      annotations: {
        1: 'math is Python\'s standard maths module. math.log(x) is the natural log defined two sections ago.',
        3: 'Loop over four values of p_t, from "very sure and right" down to "very sure and wrong".',
        4: 'Compute the penalty for this row and print it. round(x, 3) cuts the float to 3 decimal places so the numbers line up.',
      },
    },
    {
      type: 'note',
      md: `This unbounded tail is also why one mislabelled row can dominate a training batch. If a human typed the wrong label and the model is (correctly) confident, p_t lands near 0.001 and that single row contributes about 6.9, while a thousand well-classified rows contribute about 0.05 each. So **cross-entropy is not robust to label noise**. If your labels came from a crowd of annotators, label smoothing (below) is not decoration — it is what stops a handful of typos from steering the model.`,
    },
    {
      type: 'intuition',
      title: 'Why not squared error? Measure both slopes and see',
      md: `Squaring the gap between the prediction and the label is the obvious first idea, and it is a bad loss for classification. The reason is mechanical, and we can measure it instead of asserting it.

- Take one row whose true label is 1, and let the model be **confidently wrong**: logit z = −6, so p = sigmoid(−6) = **0.0025**. About as wrong as a model gets.
- Training needs the *slope* of the loss with respect to z: how much does the loss fall if we nudge z upward? A big slope means a big correction.
- We can measure a slope without calculus, exactly as in *Loss vs Metric*: evaluate the loss at z, evaluate it again at z + 0.001, and divide the change by 0.001.
- Do that for cross-entropy and for squared error on the same row, and compare the two numbers.
- Squared error's slope carries a factor of **p·(1−p)**, which at p = 0.0025 is about 0.0025 — so it shrinks the correction by roughly 400 times exactly when the model is most wrong.
- Cross-entropy is built so that factor cancels. Its slope stays close to −1: full-strength correction, no throttle.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Slope of cross-entropy vs slope of squared error, on the same row',
      code: `import math

def sigmoid(z):
    return 1 / (1 + math.exp(-z))

def ce(z):
    return -math.log(sigmoid(z))

def mse(z):
    return 0.5 * (sigmoid(z) - 1) ** 2

print('   z   CE slope   MSE slope   ratio')
for z in [-6.0, 0.0, 2.0]:
    ce_slope = (ce(z + 0.001) - ce(z)) / 0.001
    mse_slope = (mse(z + 0.001) - mse(z)) / 0.001
    print('%5.1f %10.5f %11.5f %7.1f' % (z, ce_slope, mse_slope, ce_slope / mse_slope))

# ---- real output ----
#    z   CE slope   MSE slope   ratio
#  -6.0   -0.99753    -0.00246   405.2
#   0.0   -0.49988    -0.12497     4.0
#   2.0   -0.11915    -0.01251     9.5`,
      annotations: {
        1: 'The standard maths module, for exp and log.',
        3: 'Define the sigmoid from the earlier section: turn a raw score z into a probability.',
        4: 'The formula itself. math.exp(-z) is e raised to the power minus z.',
        6: 'Cross-entropy for a row whose true label is 1. When y = 1 the true-label probability p_t is just sigmoid(z).',
        7: 'Minus the log of that probability - the only loss formula we have so far.',
        9: 'Squared error on the same row: how far the probability is from the label, squared.',
        10: 'The 0.5 in front is the usual convention. It only scales the whole loss, so it cannot change which z is best.',
        12: 'A header row so the printed columns have names.',
        13: 'Three settings: confidently wrong (z = −6), completely unsure (z = 0), mildly right (z = 2).',
        14: 'Rise over run for cross-entropy: how much the loss changed, divided by how far we moved z. That is the slope, measured rather than derived.',
        15: 'The identical measurement for squared error. Same row, same nudge, different loss.',
        16: 'Print all four numbers. The %5.1f style codes only fix column widths and decimal places.',
      },
    },
    {
      type: 'note',
      md: `Read the first output row. At z = −6 the model is about as wrong as it can be, and cross-entropy answers with a slope of **−0.998** — nearly the strongest correction it ever gives. Squared error answers with **−0.0025**, which is **405 times weaker**. Squared error is quietest precisely where you need it loudest, because the p·(1−p) factor collapses toward zero at both extremes. That is the whole argument, and you just measured it. There is a second, smaller reason: squared error wrapped around a sigmoid has more than one local low point, so descent can settle in the wrong one, while cross-entropy around a sigmoid has exactly one.`,
    },
    {
      type: 'intuition',
      title: 'More than two classes: softmax and categorical cross-entropy',
      md: `Now the model must pick one of K classes, say K = 3. It emits **three logits** — three raw scores, for example **2.0, 1.0, 0.0**. They are not probabilities: they do not sit inside 0 to 1 and they do not add to 1. **Softmax** fixes both problems in two steps.

- **Step 1 — exponentiate each score.** e^2.0 = 7.389, e^1.0 = 2.718, e^0.0 = 1.000. Everything is now positive, and the gaps have been stretched.
- **Step 2 — divide each by the total.** The total is 11.107, giving **0.665, 0.245, 0.090**. All positive, and they sum to 1. That is a probability distribution.
- The true label is written **one-hot**: a list with 1 in the correct slot and 0 everywhere else, so class 0 is written (1, 0, 0).
- Categorical cross-entropy is minus the sum over classes of y_k · log p_k. Every term whose y_k is 0 vanishes, so only the true class survives: the loss is **−log(0.665) = 0.408**. The same −log(p_t) as before.
- The other classes are not ignored, though: they sit in that shared total of 11.107. Pushing one score up pushes every other probability down. The classes **compete**.
- With K = 2, softmax reduces algebraically to the sigmoid. Binary and categorical cross-entropy are one object seen from two sides, not two different losses.`,
    },
    {
      type: 'math',
      intro: 'Softmax and categorical cross-entropy, with the one-hot collapse made explicit.',
      latex: [
        '\\hat{p}_k = \\text{softmax}(z)_k = \\frac{e^{z_k}}{\\sum_{j=1}^{K} e^{z_j}} \\qquad\\Longrightarrow\\qquad \\sum_k \\hat{p}_k = 1',
        '\\text{CCE} = -\\sum_{k=1}^{K} y_k \\log \\hat{p}_k \\;\\overset{\\text{one-hot}}{=}\\; -\\log \\hat{p}_c \\quad (c = \\text{the true class})',
        '\\text{A model that guesses uniformly scores } -\\log\\tfrac{1}{K} = \\log K: \\;\\; 0.693\\,(K{=}2),\\;\\; 2.303\\,(K{=}10),\\;\\; 6.908\\,(K{=}1000).',
      ],
    },
    {
      type: 'note',
      md: `That third line is a free diagnostic and costs nothing to remember. A freshly initialised model knows nothing, so it should spread its probability evenly and score **log K** on the first batch. If a 10-class model's loss starts near 2.303, the wiring is fine. If it starts at 40, the model is confidently wrong about everything on step one, which points at the initialisation, a missing input normalisation, or the double-softmax bug diagnosed later in this module.`,
    },
    {
      type: 'intuition',
      title: 'The numerical trap: never softmax then log',
      md: `A confident model produces logits in the hundreds or thousands. That breaks the two-step softmax recipe on a real computer, and it breaks it silently.

- \`e^1000\` is larger than any number a 64-bit float can hold. Python raises an error; a numeric library quietly returns **inf** instead.
- Then inf divided by inf is **nan** ("not a number"), and log(nan) is nan. Your loss is nan before the optimiser ever sees it, and every weight it touches becomes nan too.
- The fix is one line: **subtract the largest logit from all of them before exponentiating.** With 1000, 1001, 1002 you get −2, −1, 0.
- This changes nothing mathematically. Multiplying the top and bottom of a fraction by the same number leaves the fraction alone, and subtracting M inside the exponent is exactly that: e^(z−M) = e^z · e^(−M), and the e^(−M) cancels between top and bottom.
- Now the largest term is e^0 = 1 and every other term is smaller, so nothing can overflow. Combining this shift with the log is called **log-sum-exp**, and it is what every framework runs internally.
- In practice you never write it. Hand your model's **logits** to the loss function, not your own softmax output, and the framework uses the stable fused version.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The overflow, and the one-line fix',
      code: `import math

z = [1000.0, 1001.0, 1002.0]

try:
    total = sum(math.exp(v) for v in z)
except OverflowError as problem:
    print('naive denominator failed:', problem)

biggest = max(z)
shifted = [v - biggest for v in z]
denom = sum(math.exp(v) for v in shifted)
log_softmax = [v - math.log(denom) for v in shifted]
print('stable log-softmax:', [round(v, 3) for v in log_softmax])
print('cross-entropy if class 0 is the true label:', round(-log_softmax[0], 3))

# ---- real output ----
# naive denominator failed: math range error
# stable log-softmax: [-2.408, -1.408, -0.408]
# cross-entropy if class 0 is the true label: 2.408`,
      annotations: {
        1: 'The standard maths module, for exp, log, and the overflow error it raises.',
        3: 'Three logits from a very confident model. Perfectly ordinary numbers on their own.',
        5: 'try starts a block that Python runs while watching for a specific failure.',
        6: 'The softmax total, computed naively. "math.exp(v) for v in z" is a generator expression: it produces e raised to v for each v in turn, and sum adds them up.',
        7: 'except catches that specific failure. "as problem" gives the error object a name so we can print it.',
        8: 'Print it instead of crashing. A numeric library would return inf here rather than raising, which is worse: nothing tells you anything went wrong.',
        10: 'max returns the largest logit, 1002.0. This one line is the entire fix.',
        11: 'A list comprehension: build a new list by subtracting biggest from every entry. The result is [-2.0, -1.0, 0.0].',
        12: 'The same total as line 6, but on the shifted values, so the largest term is e^0 = 1 and nothing overflows.',
        13: 'log-softmax in one pass: the shifted score minus the log of the total. Subtracting a log is the same as dividing, then taking the log.',
        14: 'Print the three results, each rounded to 3 places by a second list comprehension.',
        15: 'The loss if class 0 were the true label: minus its log-probability. Class 0 had the smallest logit, so it pays the most.',
      },
    },
    {
      type: 'intuition',
      title: 'Label smoothing: stop demanding certainty',
      md: `Cross-entropy with a hard target of 1.0 can never be satisfied. To drive −log(p) all the way to zero the model needs p = 1 exactly, and sigmoid only reaches 1 at a logit of **infinity**. So the model keeps inflating its weights forever, chasing a target it cannot reach, and every prediction drifts toward 0.999.

- **Label smoothing** replaces the hard target with a soft one. Spread a small amount of belief ε evenly over all K classes: the true class keeps **(1 − ε) + ε/K** and each other class gets **ε/K**.
- Two classes, ε = 0.1: the true class gets 0.9 + 0.05 = **0.95** and the other gets **0.05**. Ten classes, ε = 0.1: the true class gets 0.9 + 0.01 = **0.91** and each of the nine others gets **0.01**. Check that they still sum to 1 in both cases.
- Now the loss has a **finite lowest value at a finite logit**. With targets 0.95 and 0.05 the best possible loss is **0.1985**, reached exactly at p = 0.95. Overshooting to p = 0.99 makes the loss *worse*: 0.2398.
- Effects: it holds the logits to a sensible size, it improves **calibration** (the model's 0.9 starts to mean 90% rather than 99%), and it limits how much a single mislabelled row can cost.
- The cost, which is real: you have deliberately compressed the gap between the top scores. Anything downstream that reads that gap — ranking items by score, or thresholding at a very extreme confidence — loses information.
- Rule of thumb: ε = 0.1 when you have many classes or noisy labels. Skip it when you need maximally separated confidence scores.`,
    },
    {
      type: 'math',
      intro: 'The smoothed target and the floor it creates. Check both arithmetic examples against the section above.',
      latex: [
        'y^{\\text{LS}}_k = (1 - \\varepsilon)\\, y_k + \\frac{\\varepsilon}{K}',
        '\\varepsilon = 0.1,\\; K = 2 \\;\\Rightarrow\\; (0.95,\\, 0.05). \\qquad \\varepsilon = 0.1,\\; K = 10 \\;\\Rightarrow\\; 0.91 \\text{ true},\\; 0.01 \\text{ each other.}',
        '\\min_{p}\\; -\\Big[\\, 0.95 \\log p + 0.05 \\log(1-p) \\Big] \\;=\\; 0.1985 \\quad\\text{at } p = 0.95 \\;\\; (\\text{a finite logit } z = 2.944)',
      ],
    },
    {
      type: 'intuition',
      title: 'Focal loss: when almost every row is already easy',
      md: `Imagine a dataset where the interesting class is very rare — one row in a thousand — and the other 999 are not merely common, they are **obvious**. The model separates them correctly after the first epoch. Fraud among ordinary card swipes, a defect among clean parts, one relevant document among a million.

- Each easy row is cheap on its own: at p_t = 0.99, cross-entropy charges only **0.010**.
- But there are so many of them. A thousand easy rows at 0.010 contribute 10.0, while ten genuinely hard rows at 1.204 each contribute 12.0. The easy majority is roughly half the total signal despite being individually trivial.
- Scale that up. At 100,000 easy rows against 20 hard ones, the easy side owns well over 95% of the total. The model is not confused, it is **outvoted**. It spends its capacity making already-correct rows slightly more correct.
- **Focal loss** fixes this with one multiplier: scale each row's cross-entropy by **(1 − p_t)^γ**, where γ (gamma) is usually 2.
- p_t = 0.99 → multiplier (0.01)² = **0.0001**. That row now counts for one ten-thousandth of what it did.
- p_t = 0.1 → multiplier (0.9)² = **0.81**. The hard rows keep nearly everything.
- So focal loss is a volume knob that turns itself down as a row becomes easy. Nothing is sampled, nothing is discarded, and there is one extra term in the loss.`,
    },
    {
      type: 'math',
      intro: 'Focal loss. The whole idea is the factor sitting in front of the cross-entropy you already have.',
      latex: [
        '\\text{FL}(p_t) = -\\,(1 - p_t)^{\\gamma}\\,\\log(p_t), \\qquad \\gamma \\ge 0',
        '\\gamma = 0 \\;\\Longrightarrow\\; (1-p_t)^0 = 1 \\;\\Longrightarrow\\; \\text{FL} = \\text{plain cross-entropy}. \\quad \\text{The usual choice is } \\gamma = 2.',
        '\\gamma = 2:\\quad p_t = 0.99 \\to \\times 0.0001, \\quad p_t = 0.9 \\to \\times 0.01, \\quad p_t = 0.5 \\to \\times 0.25, \\quad p_t = 0.1 \\to \\times 0.81',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Who owns the loss: 1000 easy rows against 10 hard ones',
      code: `import math

easy = [0.95] * 1000
hard = [0.30] * 10
bce_easy = sum(-math.log(pt) for pt in easy)
bce_hard = sum(-math.log(pt) for pt in hard)
foc_easy = sum((1 - pt) ** 2 * -math.log(pt) for pt in easy)
foc_hard = sum((1 - pt) ** 2 * -math.log(pt) for pt in hard)
print('easy rows own %.1f%% of the BCE total' % (100 * bce_easy / (bce_easy + bce_hard)))
print('easy rows own %.1f%% of the focal total' % (100 * foc_easy / (foc_easy + foc_hard)))

# ---- real output ----
# easy rows own 81.0% of the BCE total
# easy rows own 2.1% of the focal total`,
      annotations: {
        1: 'The maths module, for log.',
        3: '[0.95] * 1000 repeats the one-item list a thousand times, giving 1000 rows the model already gets right with p_t = 0.95.',
        4: 'Ten rows it finds difficult: it gives the true label only 30% probability.',
        5: 'Total plain cross-entropy from the easy rows. Each term is small, and there are a thousand of them.',
        6: 'Total plain cross-entropy from the ten hard rows.',
        7: 'The same easy rows under focal loss: each term multiplied by (1 − p_t) squared, which is 0.0025 here.',
        8: 'The same hard rows under focal loss: multiplied by (1 − 0.30) squared = 0.49, so most of the penalty survives.',
        9: 'What share of the total signal the easy rows own under cross-entropy. %.1f%% prints one decimal place and then a literal percent sign.',
        10: 'The same share under focal loss. Same data, same model, same predictions - only the loss changed.',
      },
    },
    {
      type: 'note',
      md: `Two honest warnings about focal loss, both worth more than the formula. **First: never reach for it when your labels are noisy.** A mislabelled row looks exactly like a hard row — low p_t — so focal loss turns its volume *up*. It amplifies precisely the rows you wish it would ignore. **Second: it breaks calibration.** Once rows have been reweighted, the output is no longer maximising likelihood, so a score of 0.7 no longer means 70%. If something downstream reads the score as a probability, you must recalibrate afterwards. For ordinary imbalance on tabular data — 1% fraud in 100,000 rows, clean labels — plain class weights and moving your decision threshold are the cheaper first move, and often the whole fix.`,
    },
    {
      type: 'intuition',
      title: 'Hinge loss: the margin, not the probability',
      md: `Hinge loss stops talking about probabilities entirely. Write the labels as **y = +1 or y = −1**, and let the model output a raw score **f(x)** that can be any number.

- First define **margin**. The model's decision boundary is where f(x) = 0; positives should sit above it, negatives below. The margin is the empty strip you insist on keeping on either side of that boundary, so the two groups are not merely separated but separated with room to spare. Hinge loss fixes the width of that strip at 1.
- The quantity to watch is **y · f(x)**. If the label and the score agree in sign, this is positive; if they disagree, it is negative. It packs "which side?" and "how far?" into one number.
- The loss is **max(0, 1 − y·f(x))**. Read it as a demand: *be correct, and clear the boundary by at least 1.*
- y·f(x) = 2.0 → loss max(0, −1) = **0**. Past the margin. Nothing is owed.
- y·f(x) = 0.4 → loss **0.6**. Correct side, but inside the strip, so it is still charged.
- y·f(x) = −3.0 → loss **4.0**. Wrong side by 3, charged **in a straight line** by how far short it fell.
- The consequence that defines support vector machines: points comfortably past the margin have exactly zero loss and therefore exactly zero slope. Delete them from the dataset and the trained model does not change at all. The points that remain — on or inside the strip — are the **support vectors**.
- Contrast with cross-entropy, which is **never** exactly zero: −log(0.999) is still 0.001. Every point keeps pulling forever, which is why logistic regression has no support vectors.`,
    },
    {
      type: 'math',
      intro: 'Hinge loss and its zero condition. Compare the last line with the never-zero behaviour of minus log p_t.',
      latex: [
        '\\ell_{\\text{hinge}}\\big(y, f(x)\\big) = \\max\\!\\big(0,\\; 1 - y\\,f(x)\\big), \\qquad y \\in \\{-1, +1\\}',
        '\\ell = 0 \\iff y\\,f(x) \\ge 1 \\quad\\Longrightarrow\\quad \\text{zero slope} \\;\\Longrightarrow\\; \\text{this point does not affect the model at all.}',
        '\\text{Cross-entropy: } -\\log p_t > 0 \\text{ for every } p_t < 1, \\text{ and } p_t = 1 \\text{ is unreachable.}',
      ],
    },
    { type: 'visual', component: 'PointerBoxDiagram', props: {
      title: 'The penalty landscape: same four predictions, three losses',
      notice: 'p_t is the probability the model gave the TRUE label. Step through and watch which rows each loss decides to care about.',
      leftLabel: 'the prediction',
      rightLabel: 'what it pays',
      frames: [
        {
          note: 'Four predictions covering the four situations. Nothing is charged yet - this is only how much probability each one put on the correct answer.',
          stack: [
            { name: 'A confident-right', value: 'p_t = 0.95', to: 'a' },
            { name: 'B unsure-right', value: 'p_t = 0.60', to: 'b' },
            { name: 'C unsure-wrong', value: 'p_t = 0.40', to: 'c' },
            { name: 'D confident-WRONG', value: 'p_t = 0.05', to: 'd', danger: true },
          ],
          heap: [
            { id: 'a', value: 'penalty = ?', label: 'easy' },
            { id: 'b', value: 'penalty = ?', label: 'fine' },
            { id: 'c', value: 'penalty = ?', label: 'hard' },
            { id: 'd', value: 'penalty = ?', label: 'disaster' },
          ],
        },
        {
          note: 'Cross-entropy = -log(p_t). D pays 59 times what A pays. But notice A still pays something: cross-entropy never reaches zero.',
          stack: [
            { name: 'A confident-right', value: 'p_t = 0.95', to: 'a' },
            { name: 'B unsure-right', value: 'p_t = 0.60', to: 'b' },
            { name: 'C unsure-wrong', value: 'p_t = 0.40', to: 'c' },
            { name: 'D confident-WRONG', value: 'p_t = 0.05', to: 'd', danger: true },
          ],
          heap: [
            { id: 'a', value: 'CE = 0.051', label: 'still > 0' },
            { id: 'b', value: 'CE = 0.511', label: '10x A' },
            { id: 'c', value: 'CE = 0.916', label: '18x A' },
            { id: 'd', value: 'CE = 2.996', label: '59x A' },
          ],
        },
        {
          note: 'Focal, gamma = 2: multiply each row by (1 - p_t) squared. A shrinks 400-fold, D barely moves. The gap between D and A grows from 59x to over 21,000x.',
          stack: [
            { name: 'A confident-right', value: 'x (1-0.95)^2 = 0.0025', to: 'a' },
            { name: 'B unsure-right', value: 'x (1-0.60)^2 = 0.16', to: 'b' },
            { name: 'C unsure-wrong', value: 'x (1-0.40)^2 = 0.36', to: 'c' },
            { name: 'D confident-WRONG', value: 'x (1-0.05)^2 = 0.90', to: 'd', danger: true },
          ],
          heap: [
            { id: 'a', value: 'focal = 0.0001', label: 'silenced' },
            { id: 'b', value: 'focal = 0.082', label: 'quieted' },
            { id: 'c', value: 'focal = 0.330', label: 'kept' },
            { id: 'd', value: 'focal = 2.704', label: 'kept, 90%' },
          ],
        },
        {
          note: 'Hinge, on the margin score y*f(x). A is past the margin so it pays EXACTLY zero: no slope, and deleting it changes nothing. Cross-entropy charged it 0.051 forever.',
          stack: [
            { name: 'A confident-right', value: 'y*f = 2.0', to: 'a' },
            { name: 'B unsure-right', value: 'y*f = 0.4', to: 'b' },
            { name: 'C unsure-wrong', value: 'y*f = -0.4', to: 'c' },
            { name: 'D confident-WRONG', value: 'y*f = -3.0', to: 'd', danger: true },
          ],
          heap: [
            { id: 'a', value: 'hinge = 0.000', label: 'past margin' },
            { id: 'b', value: 'hinge = 0.600', label: 'inside margin' },
            { id: 'c', value: 'hinge = 1.400', label: 'support vector' },
            { id: 'd', value: 'hinge = 4.000', label: 'linear, not log' },
          ],
        },
      ],
    } },
    {
      type: 'note',
      md: `Compare frames 2 and 4 on row **D**. Cross-entropy charges 2.996, and would charge 4.6 at p_t = 0.01 and 6.9 at 0.001 — it grows without limit. Hinge charges 4.0 and grows only in a straight line, so one catastrophic outlier drags a cross-entropy model much harder than a hinge model. That is hinge's quiet robustness advantage, and the price is that its output is a score with no probability meaning attached.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'All three losses on the same six predictions',
      code: `import math

y = [1, 1, 1, 0, 0, 0]
z = [3.0, 1.2, 0.3, -3.0, -0.3, 2.5]

print(' y      z    p_t     BCE   focal   hinge')
for i in range(6):
    p = 1 / (1 + math.exp(-z[i]))
    pt = p if y[i] == 1 else 1 - p
    bce = -math.log(pt)
    focal = (1 - pt) ** 2 * bce
    signed = 1 if y[i] == 1 else -1
    hinge = max(0.0, 1 - signed * z[i])
    print('%2d %6.1f %6.3f %7.3f %7.3f %7.3f' % (y[i], z[i], pt, bce, focal, hinge))

# ---- real output ----
#  y      z    p_t     BCE   focal   hinge
#  1    3.0  0.953   0.049   0.000   0.000
#  1    1.2  0.769   0.263   0.014   0.000
#  1    0.3  0.574   0.554   0.100   0.700
#  0   -3.0  0.953   0.049   0.000   0.000
#  0   -0.3  0.574   0.554   0.100   0.700
#  0    2.5  0.076   2.579   2.202   3.500`,
      annotations: {
        1: 'The maths module, for exp and log.',
        3: 'Six true labels, written as 0 and 1.',
        4: 'The six raw scores the model produced. Positive leans towards label 1, negative towards label 0.',
        6: 'A header row so the six printed lines have column names.',
        7: 'Walk through the six rows one at a time. range(6) gives i = 0, 1, 2, 3, 4, 5.',
        8: 'Sigmoid: turn this row\'s raw score into the probability that the label is 1.',
        9: 'The probability given to the TRUE label. "a if test else b" is Python\'s conditional expression: it becomes p when the label is 1 and 1 − p when it is 0.',
        10: 'Cross-entropy for this row: minus the log of that number.',
        11: 'Focal loss is literally cross-entropy multiplied by (1 − p_t) squared. Two characters of maths, one whole paper.',
        12: 'Hinge wants labels written as +1 and −1, so translate 1 to +1 and 0 to −1.',
        13: 'The hinge formula, applied to the raw score directly. No sigmoid appears - hinge never asks for a probability.',
        14: 'Print the row. The format codes only control column width and decimal places.',
      },
    },
    {
      type: 'note',
      md: `Read the last output row, the confident mistake: the model gave the true label only **7.6%**. Cross-entropy charges 2.579 against 0.049 for an easy row — 53 times more. Focal keeps 2.202 of that 2.579, about 85% of it, while cutting the easy rows to 0.000. And hinge charges 3.500, growing in a straight line rather than a curve. Three losses, one set of predictions, three different opinions about which rows deserve attention.`,
    },
    {
      type: 'intuition',
      title: 'Worked case: five spam predictions, computed by hand',
      md: `A spam model scores five emails. Its probabilities that each is spam are **0.90, 0.80, 0.60, 0.30, 0.05**, and the truth is **spam, spam, not-spam, not-spam, spam** — written as **1, 1, 0, 0, 1**.

- **Step 1 — write down p_t for each row.** Rows 1, 2 and 5 have y = 1, so p_t is p itself: 0.90, 0.80, 0.05. Rows 3 and 4 have y = 0, so p_t is 1 − p: 0.40 and 0.70.
- **Step 2 — take minus the log of each.** 0.1054, 0.2231, 0.9163, 0.3567, **2.9957**. The sum is 4.5972, so cross-entropy is **4.5972 / 5 = 0.9194**.
- **Step 3 — see who is paying.** That fifth row alone is 2.9957 of the 4.5972, which is **65.2%** of the total loss from one email out of five. It is the row where the model said "5% chance of spam" about a spam email.
- **Step 4 — now apply focal loss with γ = 2.** The multipliers are (1 − p_t) squared: 0.01, 0.04, 0.36, 0.09, **0.9025**.
- **Step 5 — multiply through.** 0.0011, 0.0089, 0.3299, 0.0321, **2.7036**. The sum is 3.0756, so focal loss is **0.6151**.
- **Step 6 — see who is paying now.** The fifth row is 2.7036 of 3.0756 = **87.9%** of the total. Focal moved that row's share from 65% to 88% by squeezing the four easy rows almost out of existence.

Two things to take from the arithmetic. Focal loss does not make anything more expensive — every multiplier is at most 1, so every single row got cheaper. What it changes is the *proportion*: the hard row now dominates. And the total dropped from 0.9194 to 0.6151, which is why you can never compare a focal-loss number against a cross-entropy number and call one model better.`,
    },
    {
      type: 'intuition',
      title: 'The classic mistake, walked into on purpose',
      md: `A team builds a 3-class classifier. They apply softmax at the end of the model, because a classifier should output probabilities, and then pass that output to a loss function called \`CrossEntropyLoss\`. Training runs. The loss falls from 1.08 to 0.79 and then flattens. Accuracy is mediocre and nobody can see why.

- The bug: \`CrossEntropyLoss\` **applies its own softmax internally**. It expects logits. So the softmax ran twice.
- Follow the numbers. Logits 2.0, 1.0, 0.0. The first softmax gives **0.665, 0.245, 0.090** — correct, and if the true class is 0 the loss should be −log(0.665) = **0.408**.
- Now the loss applies softmax a second time, treating those probabilities as if they were raw scores. e^0.665 = 1.945, e^0.245 = 1.278, e^0.090 = 1.094, total 4.316.
- Divide through: **0.451, 0.296, 0.254**. The loss reported is −log(0.451) = **0.797**, nearly double the true value.
- Look at what happened to the spread. The model's real confidence in class 0 was 0.665 against 0.090 for the worst class, a ratio of 7.4. After the second softmax it is 0.451 against 0.254, a ratio of 1.8. **Every difference has been flattened.**
- That flattening is the real damage. The correction the model trains on is roughly "predicted minus true", and predictions squeezed into a narrow band around 1/K produce a weak, near-identical correction for every class. The model still learns, only slowly and badly.
- The diagnostic that catches it in ten seconds: a 3-class model must start near **log 3 = 1.0986**. This one started at 1.08, close enough to look fine, but it **cannot get far below about 0.55 no matter what**, because a doubly-softmaxed probability can never approach 1. A loss curve that flattens well above zero at a suspiciously fixed number is the signature.

The rule that prevents it: **hand the loss function your logits, never your probabilities.** The framework's loss does the softmax and the log together, stably, and doing the softmax yourself first is the most common way to break training without crashing it.`,
    },
    {
      type: 'intuition',
      title: 'Practice problems',
      md: `Pen and paper first. All the arithmetic is small, and the log values you need are: log(0.2) = −1.609, log(3) = 1.099, log(10) = 2.303.

1. A model outputs p = 0.2 for a row whose true label is 1. Compute p_t, the cross-entropy penalty, and the focal-loss penalty with γ = 2.
2. You are training a 5-class classifier with label smoothing at ε = 0.1. Write out the full target list for a row whose true class is class 2, and check that it sums to 1.
3. A model scores f(x) = 0.7 on a row. Compute the hinge loss if the true label is y = +1, and again if it is y = −1.
4. A colleague's 10-class model prints a training loss of 0.0004 after one epoch, on 50,000 images. What would you check, and why?
5. You have 100,000 rows of tabular data with 1% fraud and clean, carefully reviewed labels. A teammate proposes switching from cross-entropy to focal loss with γ = 2. Give two reasons to try something else first.`,
    },
    {
      type: 'intuition',
      title: 'Worked solutions',
      md: `Check each step against your own working, not only the final number.

1. The label is 1, so **p_t = p = 0.2**. Cross-entropy is −log(0.2) = **1.609**. The focal multiplier is (1 − 0.2)² = 0.64, so focal loss is 0.64 × 1.609 = **1.030**. Note that it went *down*: focal loss never charges more than cross-entropy, it only charges less, and it charges far less on the easy rows.
2. Each class gets ε/K = 0.1/5 = **0.02**, and the true class additionally keeps 1 − ε = 0.9, so it gets 0.92. The target list is **(0.02, 0.02, 0.92, 0.02, 0.02)**. Sum: 0.92 + 4 × 0.02 = 0.92 + 0.08 = **1.0**. Correct.
3. With y = +1, the margin score y·f(x) = +0.7, so the loss is max(0, 1 − 0.7) = **0.3**. It is on the correct side but inside the margin strip, so it is still charged. With y = −1, the margin score is −0.7, so the loss is max(0, 1 + 0.7) = **1.7**. Wrong side, and charged in a straight line by how far.
4. A 10-class model starts at log(10) = 2.303 when it knows nothing, and 0.0004 after one epoch means it is essentially perfect already. That is not learning, it is **leakage**: the label, or something computed from it, has ended up among the input features. Check the feature list for a column that could only have been filled in after the label was known, and check that the validation split was made before any preprocessing that looked at the whole dataset. A loss far *below* what the problem should allow is as much of a red flag as one far above it.
5. First, this is ordinary **label imbalance**, not easy-versus-hard imbalance: 1,000 fraud rows against 99,000 normal ones, where plenty of the normal rows are genuinely borderline. Focal loss targets datasets where the majority is overwhelming *and* trivially easy, which is not this. Second, focal loss adds a hyperparameter (γ) to tune and **breaks calibration**, and a fraud system usually needs a real probability for a cost decision such as "review it if the fraud probability times ₹8,000 exceeds the ₹50 review cost". Cheaper first moves: class weights, and sweeping the decision threshold against a cost-aware metric. Change the loss only when those are not enough.`,
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `Everything above stands on its own. This section names ideas you will meet later, so the words are not new when you get there.

- **The α term in focal loss.** The full formula is −α·(1 − p_t)^γ·log(p_t). α is a plain per-class weight doing a different job from γ: γ down-weights by how *easy* a row is, α by *which class* it is. The two interact, so tune γ first. The paper that introduced focal loss puts α = 0.25 on the rare class, which looks backwards until you notice γ has already crushed the common one.
- **Squared hinge.** max(0, 1 − y·f(x)) squared, which smooths the sharp corner at the margin. The corner matters because a corner has no single slope, so plain hinge is solved with a different family of optimisers. The price of smoothing it is that outliers are punished by a square again, losing the robustness you chose hinge for.
- **Temperature scaling.** If your model is accurate but overconfident, fit a single number T on validation data and divide every logit by it. It cannot change any prediction, because dividing all logits by the same positive number leaves their order alone, so it is a free calibration fix that needs no retraining.
- **Perplexity.** Language models are trained with categorical cross-entropy over the vocabulary, and perplexity is simply e raised to that loss. A cross-entropy of 2.303 is a perplexity of 10, which reads as "the model is as unsure as if it were choosing uniformly among 10 words".
- **Losses that ask a different question.** Everything here answers "which class is this?" over a fixed set of classes. When the real question is "are these two inputs the same thing?" — face verification, image search — you need contrastive and triplet loss instead, taught in *Contrastive & Triplet Loss: Learning What "Similar" Means*.`,
    },
  ],
  quiz: [
    {
      question: 'Where does binary cross-entropy actually come from?',
      options: [
        {
          text: 'It was chosen because logarithms are numerically convenient',
          explanation: 'The log is a step in the derivation, not the reason for it. Convenience does not explain why this expression and not some other one.',
        },
        {
          text: 'Write the probability of what actually happened, multiply it across rows, take the log, and negate',
          explanation: 'Correct. p^y(1−p)^(1−y) per row, multiplied over rows, logged so the product becomes a sum, negated so an optimiser can walk downhill. Minimising cross-entropy is exactly maximising likelihood.',
        },
        {
          text: 'It is the squared distance between the predicted probability and the label',
          explanation: 'That is squared error, a different loss, and the one with the collapsing-slope problem measured earlier in this module.',
        },
      ],
      correct: 1,
    },
    {
      question: 'Your model outputs 0.01 for a row whose true label is 1. What cross-entropy does that single row contribute?',
      options: [
        { text: '0.01 - the loss is just the probability gap', explanation: 'Cross-entropy is minus the log of p_t, not a linear gap. A linear penalty would make confident mistakes cheap, which is the opposite of what the loss is for.' },
        { text: '0.99 - one minus the probability', explanation: 'Also linear, also wrong. It would cap the penalty at 1 however catastrophic the confident error was.' },
        {
          text: '4.605 - and it keeps growing without limit as the probability approaches 0',
          explanation: 'Correct: minus log of 0.01 is 4.605, about 44 times the 0.105 charged at p_t = 0.9. Confident and wrong is the expensive corner, by construction.',
        },
      ],
      correct: 2,
    },
    {
      question: 'At logit z = −6 on a row whose true label is 1, the measured slope of cross-entropy was −0.998 and of squared error −0.0025. What does that mean in practice?',
      options: [
        {
          text: 'Squared error gives a correction about 400 times weaker exactly where the model is most wrong, because its slope carries a p(1−p) factor that collapses at the extremes',
          explanation: 'Correct. Cross-entropy is built so that factor cancels, leaving a full-strength correction. That is the mechanical reason it is used for classification and squared error is not.',
        },
        { text: 'Squared error is 400 times more numerically stable there', explanation: 'Stability is not the issue; both computed fine. The problem is that squared error is nearly silent on the row that needs the loudest correction.' },
        { text: 'Cross-entropy is 400 times larger in value at that point', explanation: 'The comparison was between slopes, not values. The value tells you how bad the row is; the slope tells you how hard training will push on it.' },
      ],
      correct: 0,
    },
    {
      question: 'Why do frameworks want logits rather than probabilities passed to the loss function?',
      options: [
        { text: 'Logits are smaller numbers, so they train faster', explanation: 'Logits are unbounded and often much larger than probabilities. Speed is not what is at stake.' },
        { text: 'The loss cannot be computed from probabilities at all', explanation: 'It can - the formula is defined on probabilities. The problem is that computing them first either overflows or, worse, applies softmax twice.' },
        {
          text: 'e raised to a large logit overflows to infinity, and the fused log-sum-exp form subtracts the largest logit first, which is exact and stable',
          explanation: 'Correct. Subtracting the maximum is algebra, not an approximation. It also prevents the double-softmax bug of squashing inside the model and again in the loss.',
        },
      ],
      correct: 2,
    },
    {
      question: 'With label smoothing at ε = 0.1 on a two-class problem, what are the targets, and what is the real cost?',
      options: [
        { text: 'Targets (0.9, 0.1); the cost is slower training', explanation: 'Two errors. The formula gives the true class (1 − ε) + ε/K = 0.9 + 0.05 = 0.95, not 0.9. And training speed is untouched - it is one change to the target list.' },
        {
          text: 'Targets (0.95, 0.05); the cost is compressed confidence separation, which hurts anything that reads the gap between the top scores',
          explanation: 'Correct on both. Capping the target below 1 caps how far apart the logits can grow. Calibration improves, and the score gap is deliberately given up.',
        },
        { text: 'Targets (0.95, 0.05); the cost is that the loss can no longer reach a minimum', explanation: 'Backwards. Smoothing is what gives the loss a reachable minimum, 0.1985 at p = 0.95, where a hard target needs an infinite logit.' },
      ],
      correct: 1,
    },
    {
      question: 'A training point sits comfortably past the margin, at y·f(x) = 2.5. What does it contribute under hinge loss?',
      options: [
        {
          text: 'Exactly zero loss and exactly zero slope - delete it and the trained model is identical',
          explanation: 'Correct. max(0, 1 − 2.5) = 0. That flat region is precisely why only the support vectors define an SVM, and why the trained model can discard most of the data.',
        },
        { text: 'A small positive loss that shrinks as the margin grows', explanation: 'That describes cross-entropy, which is never exactly zero, which is exactly why logistic regression has no support vectors.' },
        { text: 'A negative loss, since the model is more than correct', explanation: 'The max(0, ·) floors it at zero. No loss in common use pays you for being extra-correct.' },
      ],
      correct: 0,
    },
  ],
  interviewQuestions: [
    {
      question: 'Derive binary cross-entropy from first principles, out loud.',
      answer:
        'For one row the model claims probability p that y = 1. Ask how probable the thing that actually happened was: p if y = 1, and 1 − p if y = 0. Those two cases compress into p^y(1−p)^(1−y) — check both, one factor always collapses to 1. Rows are assumed independent, so the probability of the whole dataset is the product over rows, called the likelihood. A product of thousands of numbers below 1 underflows to zero on a computer, so take the log: it becomes a sum, and because log is monotonic the setting that maximises the product also maximises the sum, so nothing is approximated. Optimisers minimise, so negate and divide by N. That is binary cross-entropy. Nothing was designed; it fell out. The payoff: minimising cross-entropy is exactly maximising likelihood, which is why its outputs behave like calibrated probabilities rather than arbitrary scores.',
      isCaseBased: false,
    },
    {
      question: 'Why cross-entropy and not squared error for classification? Give me the mechanical argument.',
      answer:
        'Squared error through a sigmoid has a slope carrying an extra p(1−p) factor, and that factor collapses toward zero at both extremes of the sigmoid. So on a row where the model is confidently wrong, meaning a large logit on the wrong side, the correction is nearly zero exactly when it should be largest. Concretely, at logit −6 with true label 1 the cross-entropy slope is about −0.998 while squared error gives about −0.0025, roughly 400 times weaker. Cross-entropy is constructed so that factor cancels, leaving a full-strength correction. Two smaller reasons: squared error wrapped around a sigmoid has more than one local low point, so descent can settle in the wrong one; and squared error implicitly assumes the target is a real-valued measurement with symmetric noise, which is a false description of a 0/1 label. Assuming a coin flip instead hands you cross-entropy automatically.',
      isCaseBased: false,
    },
    {
      question: 'Explain focal loss and tell me when you would use it instead of class weights.',
      answer:
        'Focal loss is cross-entropy multiplied by (1 − p_t) to the power gamma. The multiplier is near zero for rows the model already gets right — at gamma = 2 and p_t = 0.99 it is 0.0001 — and near one for hard rows, so it is a volume knob that turns itself down as a row becomes easy. Nothing is sampled and nothing is discarded. The distinction that matters: class weights split rows by which label they carry, focal splits them by how hard they are. Use focal when the majority is both enormous and trivially easy: dense object detection, per-pixel segmentation, retrieval against millions of obvious non-matches. Use class weights and a moved decision threshold for ordinary tabular imbalance, since that is one keyword argument, no new hyperparameter, and calibration stays intact. Two costs to name out loud: focal breaks calibration, and because a mislabelled row looks exactly like a hard row, focal amplifies label noise.',
      isCaseBased: false,
    },
    {
      question: 'Case: a detector for a rare defect trains to a low loss but predicts "no defect" almost everywhere. The business metric is near zero. Diagnose and fix.',
      answer:
        'Classic easy-majority domination. Each image contains a huge number of candidate regions and perhaps one defect, so nearly all the loss terms come from obviously-clean background. Each contributes almost nothing individually, around 0.01 of cross-entropy, but a hundred thousand of them at 0.01 dwarfs twenty hard regions at 2.3 each. The model minimises the total by perfecting the background. The falling loss is real; it is just measuring the wrong thing. First diagnostic, before changing anything: split the loss into a positive-region component and a negative-region component and log both separately. If the negative component is over 90% of the total, that is your answer. Fixes in order: focal loss with gamma = 2, which reweights by difficulty and was designed for exactly this; or hard-negative mining with a fixed negative-to-positive sampling ratio, which is cruder because the cutoff is a hard threshold rather than a smooth weight. Then check the labelling rule itself, since a region-assignment threshold that is too strict can leave true defects labelled as background, and no loss function can fix a wrong label. Finally, initialise the output bias so the model starts out predicting the true defect rate rather than 50/50, which stops early training from diverging.',
      isCaseBased: true,
    },
    {
      question: 'Case: a shipped classifier is 94% accurate but every prediction comes back at 0.999 confidence, including the wrong ones. Product wants to display a confidence number. What is happening, and what do you do?',
      answer:
        'The model is accurate but badly calibrated, so its confidences carry no information. Cause: with hard 1/0 targets, cross-entropy has its minimum at an infinite logit, so a model with enough capacity keeps inflating logit magnitude chasing a floor it can never reach, especially once training accuracy hits 100% and the only remaining way to lower the loss is more confidence. Measure before fixing: bucket the predictions by confidence and compare each bucket to its actual accuracy, which is a reliability diagram, and summarise the gap as expected calibration error. Then fix in cost order. First, temperature scaling: fit one number T on a validation set and divide every logit by it. It cannot change any prediction, because dividing all logits by the same positive number preserves their order, so it is a free win and should always be tried first. Second, label smoothing at epsilon = 0.1 in the next training run, which gives the loss a reachable minimum at a finite logit. Third, stop training earlier, since calibration degrades over the long tail after accuracy has plateaued. One cost to state: label smoothing compresses the gap between top scores, so if anything downstream ranks by score, prefer temperature scaling, which leaves the ordering untouched.',
      isCaseBased: true,
    },
    {
      question: 'Cross-entropy versus hinge loss - when would you actually choose hinge?',
      answer:
        'Hinge is max(0, 1 − y·f(x)) with labels written as +1 and −1. It is exactly zero once a point is correct and a full margin clear, so satisfied points contribute no loss and no slope at all. That buys three things: sparsity, since only the points on or inside the margin affect the model, giving a genuinely compact predictor; growth that is a straight line rather than a curve on extreme errors, so one catastrophic outlier drags the fit less; and a decision rule that is about geometry rather than probability. Choose it when the margin is the product and the model must stay small, such as a support vector machine on small to mid-size tabular data, or a linear model on very wide sparse text features. Refuse it when you need probabilities: hinge is not a likelihood, so its score has no calibrated meaning, and any cost-based decision would need a second model fitted on top to convert scores into probabilities.',
      isCaseBased: false,
    },
    {
      question: 'What does "minimising cross-entropy equals maximising likelihood" buy you in practice?',
      answer:
        'Three concrete things. First, calibration for free: the setting that minimises the objective is the one whose predicted probabilities match the real conditional probabilities, which is why a well-specified logistic regression\'s 0.7 really does mean about 70%, and why a random forest usually needs a calibration step bolted on. Second, a principled way to choose a loss: the loss follows from what you assume about the labels. Coin-flip labels give cross-entropy, real-valued measurements with symmetric noise give squared error, counts give a Poisson loss. So "why this loss?" becomes "what did I assume about the data?", which is a much stronger answer than a preference. Third, a caveat worth volunteering: class weights, focal loss and resampling all break the likelihood interpretation, so each costs you calibration, and you should recalibrate afterwards if anything downstream reads the score as a probability.',
      isCaseBased: false,
    },
    {
      question: 'A junior hands you a 10-class model whose training loss starts at 40 and drops to 8 over ten epochs. What do you say?',
      answer:
        'Both numbers are wrong, and the second is worse. A freshly initialised 10-class classifier knows nothing, so it should spread probability evenly and score log(10) = 2.303 on the first batch. Starting at 40 means it begins wildly confident about wrong classes: check the initialisation scale, check that the inputs are normalised, and check for a double softmax, meaning softmax applied inside the model and again by a loss function that applies its own. And 8 is still far above the random-guess baseline of 2.303, so after ten epochs the model is doing worse than guessing uniformly. That is not slow convergence, it is a broken pipeline. Fastest triage: take ten examples and deliberately overfit that single batch. A correct setup drives that loss to near zero within a few hundred steps; if it cannot, the bug is in the model or the loss wiring rather than in the data or the learning rate. The habit worth keeping: always know your loss\'s random baseline, log K, so a broken run is visible on the very first printed line.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'p_t in one line', back: 'The probability the model gave the TRUE label: p if y = 1, and 1 − p if y = 0. Every loss in this module is a re-weighting of −log(p_t).' },
    { front: 'Binary cross-entropy, derived in three moves', back: 'Write the probability of what happened, p^y(1−p)^(1−y). Multiply over rows to get the likelihood. Take the log so the product becomes a sum, which is safe because log is monotonic. Negate so an optimiser can walk downhill.' },
    { front: 'The −log penalty numbers', back: 'p_t = 0.9 gives 0.105, 0.5 gives 0.693, 0.1 gives 2.303, 0.01 gives 4.605. Gentle when right, unbounded when confidently wrong.' },
    { front: 'Why not squared error for classification', back: 'Its slope carries a p(1−p) factor that collapses at both extremes. At logit −6 with true label 1, cross-entropy\'s slope is −0.998 and squared error\'s is −0.0025, about 400 times weaker: quietest exactly where the model is most wrong.' },
    { front: 'Random-guess loss baseline', back: 'log K: 0.693 for 2 classes, 2.303 for 10, 6.908 for 1000. If training starts far above it the pipeline is broken; far below it, suspect leakage.' },
    { front: 'Why logits and not probabilities go into the loss', back: 'e raised to a large logit overflows to infinity, and infinity over infinity is nan. Log-sum-exp subtracts the largest logit first, which is exact and stable. It also prevents applying softmax twice.' },
    { front: 'Label smoothing: recipe, gain, cost', back: 'Target = (1 − ε)·y + ε/K. At ε = 0.1 and K = 2 that is (0.95, 0.05). Gain: a reachable minimum at a finite logit, better calibration, tolerance to a few wrong labels. Cost: the gap between the top scores is compressed.' },
    { front: 'Focal loss, and when not to use it', back: 'FL = −(1 − p_t)^γ · log(p_t), usually γ = 2, so p_t = 0.99 is multiplied by 0.0001 and p_t = 0.1 by 0.81. Use it when the majority is enormous AND trivially easy. Never on noisy labels: a wrong label looks like a hard row, so focal amplifies it. It also breaks calibration.' },
  ],
  mindmapMarkdown: `- Classification Losses: Cross-Entropy, Focal & Hinge
  - The four words first
    - log: turns multiplication into addition
    - monotonic: the best setting does not move
    - sigmoid: raw score to probability
    - logit: the raw score itself
  - Binary cross-entropy
    - p_t = probability given to the true label
    - Probability of what happened: p^y(1−p)^(1−y)
    - Multiply, then log, then negate
    - Minimise CE = maximise likelihood
  - The penalty shape
    - 0.9 gives 0.105, 0.5 gives 0.693, 0.01 gives 4.605
    - Confident and wrong is the expensive corner
    - Unbounded, so not robust to label noise
  - Why not squared error
    - Slope carries a p(1−p) factor
    - At z = −6: −0.998 against −0.0025, 400x weaker
    - Weakest exactly where the model is most wrong
  - Multi-class
    - Softmax: exponentiate, then divide by the total
    - One-hot label: only the true class term survives
    - Classes compete through the shared total
    - Random baseline is log K
  - Numerical stability
    - e^1000 overflows, inf over inf is nan
    - Subtract the largest logit first
    - Pass logits, never probabilities
    - Double softmax flattens every difference
  - Label smoothing
    - Target (1−ε)y + ε/K
    - ε = 0.1, K = 2 gives 0.95 and 0.05
    - Reachable minimum, better calibration
    - Cost: compressed score gap
  - Focal loss
    - Cross-entropy times (1 − p_t)^γ
    - γ = 2 is standard, γ = 0 is plain CE
    - Easy rows: 81% of BCE becomes 2.1% of focal
    - Never on noisy labels; breaks calibration
  - Hinge loss
    - max(0, 1 − y·f(x)), labels +1 and −1
    - Margin: keep a clear strip around the boundary
    - Exactly zero past the margin, so zero slope
    - Support vectors are what is left
    - A score, not a probability
  - Picking one
    - Need probabilities: cross-entropy
    - Enormous and trivially easy majority: focal
    - Ordinary label imbalance: class weights + threshold
    - Noisy labels: label smoothing, never focal
    - Compact margin model: hinge`,
}

export default m
