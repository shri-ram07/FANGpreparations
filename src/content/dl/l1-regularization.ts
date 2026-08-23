import type { Module } from '../types'

const m: Module = {
  id: 'dl-l1-regularization',
  subjectId: 'dl',
  level: 1,
  title: 'Regularization: Weight Decay, Dropout, Early Stopping',
  whyItMatters:
    'A network with more parameters than data points can memorise it exactly and learn nothing. Regularisation is every technique that trades a little training accuracy for generalisation — and in one worked case it cut the weight norm from 7.4 to 1.4 at a cost of 0.0003 in training error.',
  assumes: [
    'You know what overfitting is: training error falling while test error rises',
    'You have seen a NumPy array',
  ],
  estMinutes: 20,
  sections: [
    {
      type: 'intuition',
      title: 'Why large weights are the symptom',
      md: `Overfitting is a model fitting the noise in its training data. What that looks like inside the model is almost always **large weights that nearly cancel**.

Give a model two nearly identical features and it can fit noise by putting a huge positive weight on one and a huge negative weight on the other. The difference is tiny and controlled; the individual weights are enormous, and a slightly different input sends the prediction somewhere absurd.

**Weight decay** attacks exactly that. Add a penalty proportional to the squared size of the weights, and the model must justify every unit of weight with a real reduction in error.`,
    },
    {
      type: 'math',
      intro:
        'The penalised objective and its closed-form solution for linear regression. λ controls the trade: 0 is ordinary least squares, and large λ drives every weight toward 0. The λI term is also what makes the matrix invertible when the features are collinear.',
      latex: [
        'L = \\|Xw - y\\|^2 + \\lambda\\|w\\|^2',
        'w = (X^{T}X + \\lambda I)^{-1} X^{T} y',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Two nearly identical features, with and without the penalty',
      code: `import numpy as np
np.random.seed(3)
X = np.random.randn(8, 5)
X[:, 4] = X[:, 0] + 0.001 * np.random.randn(8)     # column 5 duplicates column 1
y = X @ np.array([2.0, 0, 0, 0, 0]) + 0.1 * np.random.randn(8)

for lam in [0.0, 0.1, 1.0, 10.0]:
    w = np.linalg.solve(X.T @ X + lam * np.eye(5), X.T @ y)
    print('lambda=%5.1f  w=%-42s  ||w||=%.3f  train MSE=%.4f'
          % (lam, str(np.round(w, 3).tolist()), np.linalg.norm(w), ((X @ w - y)**2).mean()))

# ---- real output ----
# lambda=  0.0  w=[6.143, 0.089, 0.006, 0.048, -4.163]        ||w||=7.422  train MSE=0.0082
# lambda=  0.1  w=[0.981, 0.092, 0.004, 0.03, 0.98]           ||w||=1.390  train MSE=0.0085
# lambda=  1.0  w=[0.911, 0.103, 0.0, -0.085, 0.911]          ||w||=1.296  train MSE=0.0246
# lambda= 10.0  w=[0.639, 0.125, -0.007, -0.289, 0.639]       ||w||=0.957  train MSE=0.4418`,
      annotations: {
        4: 'Column 5 is column 1 plus a thousandth of noise. Eight examples, five features — a deliberately underdetermined problem, which is the regime every deep network lives in.',
        13: 'Unpenalised: +6.143 and −4.163 on two nearly identical columns. They nearly cancel, the true signal is 2.0, and both weights are wildly wrong individually. This is overfitting made visible.',
        14: 'λ = 0.1 splits the load evenly — 0.981 and 0.98, summing to the correct 1.96 — and cuts the norm from 7.422 to 1.390. Training MSE rose from 0.0082 to 0.0085, a cost of three ten-thousandths.',
        16: 'λ = 10 has gone too far: every weight is shrunk toward zero and the training MSE is 0.4418, fifty times worse. Regularisation strength is a real trade-off, not a free improvement.',
      },
    },
    {
      type: 'note',
      label: 'L1 versus L2, and weight decay in an adaptive optimizer',
      md: `**L2** (the squared penalty above) shrinks weights smoothly toward zero without reaching it, and spreads the load across correlated features — which is exactly what the 0.981/0.98 split shows.

**L1** penalises the absolute value, whose gradient does not shrink as the weight approaches zero, so weights land on **exactly** zero. That makes it a feature selector: it picks one of a correlated pair and discards the other, where L2 keeps both.

One trap. Adding L2 to the loss is the same as decaying the weights only under plain SGD. Inside **Adam**, the L2 gradient gets divided by the adaptive term along with everything else, so it stops functioning as weight decay. **AdamW** applies the decay directly to the weights instead, which is why it is the default now.`,
    },
    {
      type: 'intuition',
      title: 'Dropout, and the scaling that is easy to get wrong',
      md: `**Dropout** zeroes a random fraction p of activations at each training step. The unit that is present cannot rely on any particular other unit being there, so the network cannot build fragile co-adapted chains.

But zeroing half the activations halves the layer's expected output — and at test time nothing is dropped, so the layer suddenly outputs twice what the next layer was trained to expect.

**Inverted dropout** fixes this at training time by dividing the survivors by (1 − p). Then the expected output matches, and inference needs no adjustment at all. Every framework does this, and the next snippet is why.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Dropout scaling, measured',
      code: `np.random.seed(4)
h = np.random.rand(100000) * 2
p = 0.5
mask = np.random.rand(100000) > p

print('no dropout, mean activation  %.4f' % h.mean())
print('drop only                    %.4f' % (h * mask).mean())
print('drop and divide by (1 - p)   %.4f' % ((h * mask) / (1 - p)).mean())

# ---- real output ----
# no dropout, mean activation  0.9997
# drop only                    0.4990
# drop and divide by (1 - p)   0.9980`,
      annotations: {
        4: 'The mask keeps each activation with probability 1 − p, independently. Dropout is per-activation and resampled every step, not a fixed set of disabled units.',
        8: '0.4990 against 0.9997 — half the signal. A layer trained on this and then run without dropout receives twice what it expects, and the network\'s calibration is silently wrong.',
        9: 'Dividing the survivors by (1 − p) restores 0.9980. The remaining gap from 0.9997 is sampling noise over 100,000 draws, not bias.',
      },
    },
    {
      type: 'note',
      label: 'Where dropout belongs, and where it does not',
      md: `Dropout is **off at inference**, which is what \`model.eval()\` switches. Leaving it on makes predictions random from one call to the next — a real and confusing production bug.

It goes in **fully-connected layers**, typically at p = 0.5. It is largely **out of favour in convolutional networks**, where BatchNorm already supplies regularising noise and spatial dropout on whole channels works better than dropping individual pixels, since neighbouring pixels are correlated enough that dropping one leaks through its neighbours.

Transformers use it at a much lower rate, around 0.1, applied to attention weights and to the feed-forward block.

One deliberate exception: keeping dropout **on** at inference and averaging several forward passes is **Monte Carlo dropout**, a cheap way to get an uncertainty estimate from a network that was not built to provide one.`,
    },
    {
      type: 'note',
      label: 'Early stopping and augmentation',
      md: `**Early stopping** watches validation loss and stops when it has not improved for a set number of epochs — the *patience* — then restores the best checkpoint rather than the last one. Restoring the best is the part people forget, and without it the mechanism does nothing.

It is the cheapest regulariser available and it costs nothing but a validation set, which is why it belongs in every training run regardless of what else you use.

**Data augmentation** is usually the most effective of all, because it attacks the actual problem: too little data. Flips, crops and colour jitter for images; mixup and cutmix, which blend two examples and their labels; and for text, back-translation or paraphrase. The constraint is that the transformation must preserve the label — a horizontal flip is fine for a cat and destroys a handwritten digit, and that judgement is domain knowledge, not a hyperparameter.`,
    },
  ],
  quiz: [
    {
      question: 'Unpenalised regression gave +6.143 and −4.163 on two nearly identical features. What is that?',
      options: [
        { text: 'A numerical error in the solver', explanation: 'The solve is exact; the solution genuinely is that.' },
        { text: 'Overfitting made visible — huge weights that nearly cancel, fitting noise while the true signal is 2.0', explanation: 'Correct, and it is why penalising weight size attacks overfitting directly.' },
        { text: 'Evidence the features are unrelated', explanation: 'They are nearly identical, which is what allows the cancellation.' },
        { text: 'The correct answer for this data', explanation: 'It fits the training noise; the true coefficient is 2.0 on the first feature.' },
      ],
      correct: 1,
    },
    {
      question: 'λ = 0.1 cut the weight norm from 7.422 to 1.390 while training MSE rose from 0.0082 to 0.0085. What does that tell you?',
      options: [
        { text: 'Regularisation is always free', explanation: 'λ = 10 raised the MSE to 0.4418 — the trade is real at higher strengths.' },
        { text: 'A large reduction in weight magnitude bought at a cost of three ten-thousandths in training error — an excellent trade at this λ', explanation: 'Correct, and the split becomes an even 0.981/0.98 which sums to the right value.' },
        { text: 'The model got worse', explanation: 'Its weights became far more sensible for a negligible training cost.' },
        { text: 'λ should be raised further', explanation: 'λ = 10 shrinks everything and raises MSE fifty-fold.' },
      ],
      correct: 1,
    },
    {
      question: 'Given two highly correlated features, how do L1 and L2 differ?',
      options: [
        { text: 'They behave identically', explanation: 'They behave very differently on correlated features.' },
        { text: 'L2 spreads the load across both (0.981 and 0.98); L1 picks one and sets the other to exactly zero', explanation: 'Correct — L1\'s gradient does not shrink near zero, so weights reach it.' },
        { text: 'L1 spreads and L2 selects', explanation: 'The reverse.' },
        { text: 'L1 cannot handle correlated features', explanation: 'It handles them by selecting, which is sometimes exactly what you want.' },
      ],
      correct: 1,
    },
    {
      question: 'Why does L2 regularisation not work as weight decay inside Adam?',
      options: [
        { text: 'Adam ignores the penalty term', explanation: 'It does include it — that is the problem.' },
        { text: 'The L2 gradient gets divided by the adaptive term along with everything else, so it stops behaving as decay', explanation: 'Correct. AdamW applies decay directly to the weights instead.' },
        { text: 'Adam has no gradient for the penalty', explanation: 'The penalty is differentiable.' },
        { text: 'Because of bias correction', explanation: 'Bias correction is unrelated to the decay interaction.' },
      ],
      correct: 1,
    },
    {
      question: 'Dropping half the activations gave a mean of 0.4990 against 0.9997. Why divide the survivors by (1 − p)?',
      options: [
        { text: 'To make the mask unbiased', explanation: 'The mask is already unbiased; the output scale is not.' },
        { text: 'To restore the expected output to 0.9980, so inference — where nothing is dropped — needs no adjustment', explanation: 'Correct. That is inverted dropout, and every framework does it this way.' },
        { text: 'To increase the regularisation strength', explanation: 'It corrects the scale; the strength is set by p.' },
        { text: 'To avoid dividing by zero', explanation: 'No division by zero arises.' },
      ],
      correct: 1,
    },
    {
      question: 'Which part of early stopping do people most often omit?',
      options: [
        { text: 'Setting a patience', explanation: 'Commonly set; without it the mechanism stops too eagerly.' },
        { text: 'Restoring the best checkpoint rather than keeping the last one', explanation: 'Correct — without it, stopping accomplishes nothing since you keep a worse model.' },
        { text: 'Monitoring training loss', explanation: 'It monitors validation loss by design.' },
        { text: 'Using a separate test set', explanation: 'Good practice, but separate from the mechanism.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Why does penalising weight size reduce overfitting?',
      answer:
        'Because overfitting shows up inside the model as large weights that nearly cancel. In a worked case with two nearly identical features, unpenalised regression put +6.143 on one and −4.163 on the other — the difference fits the training noise while the individual weights are wildly wrong, and a slightly different input sends the prediction anywhere. Adding λ‖w‖² makes the model justify every unit of weight with a real reduction in error, and at λ = 0.1 the same fit became an even 0.981 and 0.98 summing to the correct value, cutting the norm from 7.42 to 1.39 for three ten-thousandths of extra training error.',
      isCaseBased: false,
    },
    {
      question: 'L1 or L2?',
      answer:
        'L2 when you want all the features and merely want them well behaved — it shrinks smoothly toward zero without reaching it, and on correlated features it spreads the load across them rather than choosing. L1 when you want sparsity, because its gradient does not shrink as the weight approaches zero so weights land on exactly zero, which makes it a feature selector and gives you an interpretable model. On a correlated pair, L1 picks one and discards the other, which is a strength if you want to reduce feature count and a weakness if the choice is arbitrary. Elastic net combines them when you want sparsity but not arbitrary selection among correlated groups.',
      isCaseBased: false,
    },
    {
      question: 'How does dropout work at training versus inference?',
      answer:
        'At training, each activation is zeroed independently with probability p, resampled every step. At inference nothing is dropped, so the layer\'s expected output would suddenly double — measured, dropping half took the mean from 0.9997 to 0.4990. Inverted dropout fixes this at training time by dividing the surviving activations by (1 − p), restoring the mean to 0.9980, so inference needs no adjustment at all. That is what every framework implements, and it is what model.eval() switches off. Leaving dropout on at inference makes predictions random from call to call, which is a real production bug.',
      isCaseBased: true,
    },
    {
      question: 'Why has dropout fallen out of favour in convolutional networks?',
      answer:
        'Two reasons. BatchNorm already supplies regularising noise from its batch statistics, so the two together tend to over-regularise, and there is a known interaction where the variance shift between training and inference makes the combination worse than either alone. And dropping individual pixels is weak regularisation in a convolutional layer, because neighbouring pixels are strongly correlated — the information leaks through the neighbours. Spatial dropout, which drops whole channels, does work, and DropPath or stochastic depth, which drops entire residual branches, is what modern architectures actually use. Dropout remains standard in fully-connected layers and in transformers at a much lower rate.',
      isCaseBased: false,
    },
    {
      question: 'Your model overfits. Rank your interventions.',
      answer:
        'More data first if it is at all obtainable, because it addresses the cause rather than the symptom. Then data augmentation, which is the cheapest approximation to more data and usually the biggest win — as long as the transformation preserves the label, which is domain knowledge and not a hyperparameter. Then early stopping, which costs nothing but a validation set and should be running regardless. Then weight decay, tuned rather than left at a default. Then dropout in the fully-connected parts. Then a smaller model, which I would put last because it is a blunt instrument and a large model with good regularisation usually beats a small one without. Throughout, I would check the train/validation gap to confirm the diagnosis rather than assuming it.',
      isCaseBased: true,
    },
    {
      question: 'What is mixup and why does it work?',
      answer:
        'It trains on convex combinations of pairs of examples and their labels: a blend of 70% cat and 30% dog image, with a label of 0.7 cat and 0.3 dog. The effect is that the model is encouraged to behave linearly between training examples rather than making abrupt confident jumps, which smooths the decision boundary and measurably improves calibration and robustness to adversarial examples. It is oddly effective given how unnatural the images look. Cutmix is the variant that pastes a rectangular patch from one image into another with the labels mixed by area, which tends to work better for vision because the result looks more like a real image.',
      isCaseBased: false,
    },
    {
      question: 'Is early stopping really regularisation?',
      answer:
        'Yes, and there is a precise sense in which it is. It restricts the effective capacity of the model by limiting how far the weights can travel from initialisation, and for linear models with gradient descent it can be shown to be approximately equivalent to L2 regularisation with a strength determined by the stopping time. The practical framing is that it limits how much the model gets to fit noise. It is also the cheapest regulariser available — it costs nothing but a validation set — and the part people omit is restoring the best checkpoint rather than the last one, without which the whole mechanism accomplishes nothing.',
      isCaseBased: false,
    },
    {
      question: 'When is regularisation the wrong answer?',
      answer:
        'When the model is underfitting, which is a distinguishable state: high training error as well as high validation error, and a small gap between them. Adding regularisation there makes things strictly worse, and it is a common misdiagnosis because "the model performs badly" reads as overfitting by reflex. The λ = 10 case shows the shape of it — training MSE fifty times worse than λ = 0.1 with no benefit. The check is the gap, not the level: a large train/validation gap means overfitting, a small gap with bad numbers on both means the model, the features, or the optimisation is the problem.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'What overfitting looks like inside a model', back: 'Large weights that nearly cancel. Two near-identical features got +6.143 and −4.163 when the true signal was 2.0.' },
    { front: 'Ridge, measured', back: 'λ=0.1 cut ‖w‖ from 7.422 to 1.390 and split the load evenly (0.981, 0.98) — for a training MSE cost of 0.0082 → 0.0085.' },
    { front: 'Too much λ', back: 'λ=10 shrinks everything toward zero; training MSE 0.4418, fifty times worse. The trade is real.' },
    { front: 'L1 vs L2 on correlated features', back: 'L2 spreads the load across both. L1\'s gradient does not shrink near zero, so it picks one and sets the other to EXACTLY zero.' },
    { front: 'The AdamW point', back: 'L2-as-gradient gets divided by Adam\'s adaptive term and stops being decay. AdamW applies decay directly to the weights.' },
    { front: 'Inverted dropout', back: 'Dropping half took the mean 0.9997 → 0.4990. Dividing survivors by (1−p) restores 0.9980, so inference needs no change.' },
    { front: 'Dropout placement', back: 'Fully-connected layers at p≈0.5; transformers at ≈0.1. Largely out in CNNs — BatchNorm already adds noise, and neighbouring pixels leak the dropped information.' },
    { front: 'Early stopping', back: 'Watch validation, wait out the patience, then RESTORE THE BEST CHECKPOINT. Skipping the restore makes the whole mechanism pointless.' },
  ],
  mindmapMarkdown: `- Regularization
  - The symptom
    - overfitting = large weights that nearly cancel
    - unpenalised: +6.143 and -4.163, true signal 2.0
  - Weight decay (L2)
    - L = ||Xw - y||^2 + lambda ||w||^2
    - lambda 0.1: ||w|| 7.422 -> 1.390, MSE 0.0082 -> 0.0085
    - lambda 10: MSE 0.4418, too far
    - L1 sets weights to EXACTLY zero (selection)
    - inside Adam, L2 stops being decay -> AdamW
  - Dropout
    - zero a fraction p, resampled every step
    - breaks co-adaptation
    - drop only: mean 0.9997 -> 0.4990
    - inverted: divide survivors by (1-p) -> 0.9980
    - OFF at inference (model.eval)
    - out of favour in CNNs; 0.1 in transformers
    - MC dropout: keep it on for uncertainty
  - Early stopping
    - patience, then RESTORE THE BEST checkpoint
    - cheapest regulariser there is
  - Augmentation
    - attacks the real problem: too little data
    - flips/crops/jitter, mixup, cutmix, back-translation
    - the transform must PRESERVE THE LABEL`,
}

export default m
