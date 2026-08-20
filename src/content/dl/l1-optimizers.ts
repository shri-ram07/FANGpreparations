import type { Module } from '../types'

const m: Module = {
  id: 'dl-l1-optimizers',
  subjectId: 'dl',
  level: 1,
  title: 'Optimizers: SGD, Momentum, RMSProp & Adam',
  whyItMatters:
    'Every deep-learning job posting assumes you can answer "why Adam?" without saying "it is the default". Optimizers are where the loss surface stops being theory and starts costing you GPU hours: the same model, same data, same code trains in a day or never converges, depending on four lines of update rule. This module builds SGD to AdamW in order, each one fixing the previous one\'s exact failure — and settles the Adam-vs-SGD generalization argument honestly.',
  estMinutes: 55,
  sections: [
    {
      type: 'intuition',
      title: 'The landscape you are actually walking on',
      md: `You met the loss surface in the Math subject (*Derivatives, the Chain Rule & Gradients* — the "loss surface" section). Deep nets live on the ugly version of it.

- **Ravine (ill-conditioning)** — a long narrow canyon: steep walls one way, near-flat floor the other. Different parameters have wildly different curvature.
- **Plateau** — a huge flat shelf. Gradient ≈ 0, but you are nowhere near a minimum. Steps starve.
- **Saddle point** — up in some directions, down in others. Flat at the centre, like a Pringle.
- One number describes the ravine: **condition number κ = λ_max / λ_min**, the ratio of steepest to shallowest curvature. κ = 1 is a perfect bowl. Real nets hit κ in the thousands.`,
    },
    {
      type: 'intuition',
      title: 'The honest modern view: saddles, not local minima',
      md: `Textbooks used to warn about getting "stuck in a local minimum". In high dimensions that fear is mostly wrong.

- To be a local minimum, the surface must curve **up in every one of your d directions** — all d Hessian eigenvalues positive.
- With d in the millions, that is a coin flipped millions of times and landing heads every time. Vanishingly rare.
- To be a saddle you need just **one** direction curving down. Overwhelmingly more likely.
- So the real enemy is not a trap you cannot escape — it is a **flat region you escape too slowly**, because the gradient there is tiny.
- Bonus, well-supported empirically: the local minima deep nets do reach have similar loss. Which minimum you find matters less than folklore claims.`,
    },
    {
      type: 'math',
      intro: 'Why the ravine, not the trap, is the thing to engineer around.',
      latex: [
        '\\kappa = \\frac{\\lambda_{\\max}}{\\lambda_{\\min}} \\qquad \\text{(steepest curvature ÷ shallowest curvature)}',
        '\\text{Plain GD is stable only if } \\alpha < \\frac{2}{\\lambda_{\\max}} \\;\\Rightarrow\\; \\text{progress along } \\lambda_{\\min} \\text{ crawls at rate } \\propto \\frac{1}{\\kappa}',
        '\\text{Critical point is a min} \\iff \\text{all } d \\text{ eigenvalues} > 0; \\quad \\text{saddle} \\iff \\text{any one} < 0',
      ],
    },
    {
      type: 'intuition',
      title: 'Where plain SGD breaks: the zigzag',
      md: `Put one learning rate on a ravine and watch the contradiction.

- The steep wall direction has a huge gradient. Your step overshoots and lands on the **opposite wall**.
- Next step overshoots back. You bounce across the canyon, wasting almost every step.
- The floor direction has a tiny gradient. Along the direction you actually want to travel, you crawl.
- You cannot fix it with α: raise it and the walls diverge, lower it and the floor freezes. **One α cannot serve two curvatures.**
- That is the whole motivation for every optimizer below. Two different fixes exist — smooth the bounce (momentum), or give each parameter its own α (adaptive methods). Adam does both.`,
    },
    { type: 'visual', component: 'OptimizerRace', props: {} },
    {
      type: 'note',
      md: 'Watch three specific things. **SGD** (first trace) hugs the ravine wall and saws back and forth — every zigzag is wasted work. **Momentum** lets the sideways bounces cancel and the forward drift add up, so it plows down the floor. **Adam** rescales each axis, so the steep direction stops dominating and it walks in almost straight. Then drag the learning-rate slider up: SGD hits "diverged" first (past roughly 0.022 on this surface), momentum follows later, and Adam is still walking. That order — SGD breaks first, Adam last — is the single most practical fact in this module.',
    },
    {
      type: 'intuition',
      title: 'Momentum: give the walker mass',
      md: `A ball rolling down the canyon does not zigzag — it has **inertia**. Momentum gives gradient descent the same thing.

- Keep a running **velocity** vector instead of stepping on the raw gradient: **v = βv + g**, then **w -= αv**.
- The oscillating component flips sign every step, so consecutive contributions **cancel** inside v.
- The consistent component (down the floor) points the same way every step, so it **accumulates** — speed builds.
- **β = 0.9** is the default. It means "average roughly the last 10 gradients" (1/(1−β) = 10).
- Push β to 0.99 and you average ~100 gradients: smoother, but slow to change direction. Above that it overshoots the minimum like a heavy ball on ice.`,
    },
    {
      type: 'math',
      intro: 'Momentum, and where the "last 10 gradients" claim comes from.',
      latex: [
        'v_t = \\beta v_{t-1} + g_t \\qquad w_t = w_{t-1} - \\alpha v_t',
        'v_t = g_t + \\beta g_{t-1} + \\beta^2 g_{t-2} + \\cdots \\;\\Rightarrow\\; \\sum_{k \\ge 0} \\beta^k = \\frac{1}{1-\\beta}',
        '\\beta = 0.9 \\Rightarrow \\tfrac{1}{1-0.9} = 10 \\text{ gradients of effective memory}; \\quad \\beta = 0.99 \\Rightarrow 100',
      ],
    },
    {
      type: 'note',
      md: '**Nesterov momentum**, in one honest note: instead of measuring the gradient where you stand, first take the momentum step, *then* measure — g = ∇J(w − αβv). You look where you are about to land, so if the slope has already turned upward you brake early instead of overshooting. It is a small, real improvement (better constants, provably faster on convex problems), not a different algorithm. Free in every framework: `nesterov=True`. Take it; do not write an essay about it in an interview.',
    },
    {
      type: 'intuition',
      title: 'AdaGrad: a personal learning rate per parameter',
      md: `Momentum smooths the path but still uses **one** α for every weight. Adaptive methods attack that directly.

- Idea: track how much each parameter has been pushed so far, then **divide its step by that history**.
- Parameters with consistently huge gradients get damped. Parameters that rarely move get relatively bigger steps.
- This is genuinely great for **sparse features** — a word that appears in 1 of 10,000 documents still gets a meaningful update when it finally shows up.
- The bug: the accumulator **G is a sum of squares — it only grows**, never shrinks.
- So the effective learning rate α/√G decays monotonically toward zero. Long runs stall, not because they converged, but because the optimizer ran out of step size.`,
    },
    {
      type: 'intuition',
      title: 'RMSProp: same idea, with forgetting',
      md: `The fix is one character: replace the **sum** with a **moving average**.

- **s = β₂·s + (1−β₂)·g²** — an exponential moving average (EMA) of squared gradients.
- Old history decays away instead of piling up forever, so the effective rate stays alive indefinitely.
- Interpretation: √s is a per-parameter estimate of "how big are gradients here *recently*". Dividing by it puts every parameter on a comparable scale.
- That rescaling is exactly what flattens the ravine: the steep axis has big √s and gets damped, the flat axis has small √s and gets amplified.
- Trivia worth knowing: RMSProp was never published as a paper — it appeared on a Coursera slide by Hinton. It still runs production models.`,
    },
    {
      type: 'math',
      intro: 'AdaGrad versus RMSProp — the only difference is sum vs EMA.',
      latex: [
        '\\text{AdaGrad:}\\quad G_t = G_{t-1} + g_t^2 \\qquad w_t = w_{t-1} - \\frac{\\alpha}{\\sqrt{G_t} + \\epsilon}\\, g_t',
        '\\text{RMSProp:}\\quad s_t = \\beta_2 s_{t-1} + (1-\\beta_2) g_t^2 \\qquad w_t = w_{t-1} - \\frac{\\alpha}{\\sqrt{s_t} + \\epsilon}\\, g_t',
        '\\text{Note } g_t^2 \\text{ is elementwise — one scalar of history per parameter, not a matrix.}',
      ],
    },
    {
      type: 'intuition',
      title: 'Adam: both fixes in one optimizer',
      md: `Adam ("adaptive moment estimation") is the obvious combination, and the obvious combination worked.

- **First moment m** — an EMA of the gradient. That is momentum: *which direction*.
- **Second moment s** — an EMA of the squared gradient. That is RMSProp: *how big are steps here*.
- Update: step in direction m, scaled down by √s. Direction from momentum, magnitude from adaptivity.
- **β₁ = 0.9** (direction memory ≈ 10 steps), **β₂ = 0.999** (magnitude memory ≈ 1000 steps — deliberately much longer, because a scale estimate should be stable).
- **ε = 1e-8** exists only to stop division by zero when a parameter's gradients are all ~0. It is not a tuning knob (though on some workloads 1e-6 helps numerics in fp16).
- Consequence worth stating out loud: **each step is at most about α in size**, whatever the gradient magnitude. That is why Adam tolerates learning rates that detonate SGD.`,
    },
    {
      type: 'intuition',
      title: 'Why bias correction exists',
      md: `Both moving averages start at **zero**. That is not neutral — it is a lie that takes many steps to wear off.

- Step 1 with β₂ = 0.999: s₁ = 0.999·0 + 0.001·g² = 0.001·g². The estimate is **1000× too small**.
- √s is therefore tiny early, so m/√s is enormous — the first steps would be wild.
- Fix: divide by how much of the average has actually "filled up". After t steps the weights sum to (1 − βᵗ), so **m̂ = m/(1−β₁ᵗ)** and **ŝ = s/(1−β₂ᵗ)**.
- Check it: at t = 1, ŝ = 0.001g²/0.001 = g². Exactly right. As t grows, (1−βᵗ) → 1 and the correction quietly switches itself off.
- This is why an Adam run without bias correction blows up in the first ~100 steps and why warmup helps even *with* it — the estimates are correct in expectation but still noisy early.`,
    },
    {
      type: 'math',
      intro: 'The full Adam update. Four lines, and every deep-learning framework implements exactly these.',
      latex: [
        'm_t = \\beta_1 m_{t-1} + (1-\\beta_1) g_t \\qquad s_t = \\beta_2 s_{t-1} + (1-\\beta_2) g_t^2',
        '\\hat{m}_t = \\frac{m_t}{1 - \\beta_1^{\\,t}} \\qquad \\hat{s}_t = \\frac{s_t}{1 - \\beta_2^{\\,t}}',
        'w_t = w_{t-1} - \\alpha \\, \\frac{\\hat{m}_t}{\\sqrt{\\hat{s}_t} + \\epsilon}',
        '\\text{Defaults: } \\beta_1 = 0.9,\\quad \\beta_2 = 0.999,\\quad \\epsilon = 10^{-8},\\quad \\alpha \\approx 10^{-3} \\text{ (or } 10^{-4} \\text{ for finetuning)}',
      ],
    },
    {
      type: 'intuition',
      title: 'AdamW: weight decay that actually decays',
      md: `Classic regularization adds λ‖w‖² to the loss ("L2"). Its gradient is λw, so it gets added to g — and then Adam divides everything by √ŝ.

- Result: a parameter with **large** recent gradients gets its decay divided by a **large** √ŝ — so it is barely regularized.
- A parameter with tiny gradients gets decayed hard. That is backwards from what you wanted: L2 was supposed to shrink every weight equally.
- **AdamW decouples them**: run the adaptive step, then subtract α·λ·w separately, untouched by √ŝ.
- Now "weight decay" means what its name says — every weight shrinks by the same fraction each step.
- This is why **AdamW is the default for transformers** (typical λ ≈ 0.01–0.1). With plain Adam, the "weight decay" hyperparameter you tuned was never doing what you thought.`,
    },
    {
      type: 'math',
      intro: 'The one-line difference that renamed the optimizer.',
      latex: [
        '\\text{Adam + L2: } \\; g_t \\leftarrow g_t + \\lambda w_{t-1} \\;\\Rightarrow\\; w_t = w_{t-1} - \\alpha \\frac{\\hat{m}_t(g + \\lambda w)}{\\sqrt{\\hat{s}_t} + \\epsilon} \\quad \\text{(decay scaled by } 1/\\sqrt{\\hat{s}_t})',
        '\\text{AdamW: } \\; w_t = w_{t-1} - \\alpha \\frac{\\hat{m}_t}{\\sqrt{\\hat{s}_t} + \\epsilon} \\; - \\; \\alpha \\lambda w_{t-1} \\quad \\text{(decay untouched)}',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'SGD vs Momentum vs Adam, by hand, on an ill-conditioned bowl',
      code: `import numpy as np
np.seterr(all='ignore')                # the diverging runs below overflow on purpose

CURV = np.array([1.0, 500.0])          # curvature per axis -> condition number 500
loss = lambda w: 0.5 * np.sum(CURV * w ** 2)

def train(rule, lr, steps=400, checks=(50, 100, 400)):
    w = np.array([1.0, 1.0])           # same start for all three
    v = np.zeros(2)                    # velocity / Adam first moment
    s = np.zeros(2)                    # Adam second moment
    out = {}
    for t in range(1, steps + 1):
        g = CURV * w                   # exact gradient of the bowl
        if rule == 'sgd':
            w = w - lr * g
        elif rule == 'momentum':
            v = 0.9 * v + g
            w = w - lr * v
        else:
            v = 0.9 * v + 0.1 * g                  # beta1 = 0.9
            s = 0.999 * s + 0.001 * g * g          # beta2 = 0.999
            w = w - lr * (v / (1 - 0.9 ** t)) / (np.sqrt(s / (1 - 0.999 ** t)) + 1e-8)
        if t in checks:
            out[t] = loss(w) if np.all(np.isfinite(w)) else np.inf
    return out

print('optimizer      lr      loss@50     loss@100    loss@400')
for rule, lr in [('sgd', 0.003), ('momentum', 0.002), ('adam', 0.2)]:
    r = train(rule, lr)
    print(f'{rule:10s} {lr:<7} {r[50]:.3e}   {r[100]:.3e}   {r[400]:.3e}')

print()
print('same lr for everyone (0.2):')
for rule in ['sgd', 'momentum', 'adam']:
    print(f'  {rule:10s} loss@400 = {train(rule, 0.2)[400]:.3e}')

# ------------------------- real output -------------------------
# optimizer      lr      loss@50     loss@100    loss@400
# sgd        0.003   3.702e-01   2.742e-01   4.520e-02
# momentum   0.002   6.893e-01   5.676e-03   5.309e-10
# adam       0.2     7.477e-01   5.056e-03   1.662e-17
#
# same lr for everyone (0.2):
#   sgd        loss@400 = inf
#   momentum   loss@400 = inf
#   adam       loss@400 = 1.662e-17`,
      annotations: {
        4: 'The whole experiment: axis 1 is 500x steeper than axis 0. One shared learning rate must serve both — that is a ravine.',
        13: 'Gradient of 0.5*(w0^2 + 500*w1^2). No sampling noise on purpose: the gap you see is pure geometry, not luck.',
        17: 'Momentum, verbatim: v = beta*v + g, then w -= lr*v. Sideways bounces cancel inside v; the downhill drift accumulates.',
        20: 'First moment = EMA of the gradient (direction). 0.1 is (1 - beta1).',
        21: 'Second moment = EMA of the SQUARED gradient (scale). Elementwise, so each parameter gets its own.',
        22: 'The whole of Adam on one line: bias-correct both moments, step in direction m, divide by sqrt(s). Step size is ~lr no matter how big g is.',
        28: 'Each optimizer gets its own tuned lr — that is how you would actually run them. SGD is capped near 0.004 by the steep axis (alpha < 2/lambda_max); Adam is not capped at all, which is why it can use 0.2.',
        35: 'The honest control: hand everyone the SAME lr that Adam liked. SGD and momentum both explode to inf; Adam finishes at 1.7e-17. Adaptivity is what buys the big step.',
      },
    },
    {
      type: 'note',
      md: 'Read the numbers, not the vibes. Tuned SGD is still at loss 4.5e-2 after 400 steps — it is crawling along the shallow axis exactly as predicted. Momentum, at a *smaller* learning rate, reaches 5.3e-10 because velocity accumulates the consistent direction. Adam reaches 1.7e-17 while using a learning rate **66× larger** than SGD could survive. Caveat to keep you honest: this is a clean convex quadratic with no gradient noise. On real data with mini-batch noise the gaps shrink — which is exactly what the next section is about.',
    },
    {
      type: 'intuition',
      title: 'The Adam-vs-SGD generalization debate, honestly',
      md: `This is the interview question. There is a real finding underneath, and a lot of folklore on top.

- **Adam converges faster and needs far less tuning.** One α, sane defaults, works on almost anything. That is a huge engineering fact.
- **Well-tuned SGD + momentum has often generalized slightly better on vision benchmarks** — a fraction of a percent on ImageNet/CIFAR, at the cost of tuning α, its schedule, and momentum.
- Proposed reason: SGD's uniform noise is thought to favour flatter minima, while Adam's rescaling can drive it into sharper ones. Treat this as a plausible story, not settled science — the flat/sharp measures involved are reparameterization-sensitive.
- **Honest state of the art:** AdamW dominates NLP, transformers, and everything at scale — SGD simply does not train them well. In vision, SGD's edge has shrunk as AdamW recipes improved.
- Much of the historical gap was **weight decay done wrong** (Adam + L2), which AdamW fixed. The gap is smaller than folklore claims.
- Interview line: *"AdamW by default; well-tuned SGD+momentum if I am chasing the last half-percent on a vision benchmark and have the tuning budget."*`,
    },
    {
      type: 'intuition',
      title: 'Schedules: α should not be a constant',
      md: `A fixed learning rate is a compromise between "move fast early" and "settle precisely late". Schedules refuse the compromise.

- **Step decay** — cut α by 10× at fixed epochs. Classic ResNet recipe. Simple, and you can see the loss drop at each cut.
- **Cosine decay** — glide smoothly from α_max to ~0 over the run. The modern default: no cliff, no extra hyperparameters beyond total steps.
- **Warmup** — start at ~0 and ramp *up* over the first few hundred to few thousand steps, then decay.
- Why warmup is mandatory for large-batch and transformer training: Adam's second moment ŝ is estimated from a handful of noisy early gradients, so the per-parameter scaling is unreliable exactly when the weights are most fragile. Bias correction fixes the *bias*, not the *variance*.
- Second reason: at the very start, large steps in a random-init network destroy the signal the later layers depend on. Warmup lets the scale estimates stabilize before you commit.`,
    },
    {
      type: 'math',
      intro: 'The two schedules you will actually type.',
      latex: [
        '\\text{Warmup: } \\; \\alpha_t = \\alpha_{\\max} \\cdot \\frac{t}{T_{\\text{warm}}} \\quad \\text{for } t < T_{\\text{warm}}',
        '\\text{Cosine: } \\; \\alpha_t = \\alpha_{\\min} + \\tfrac{1}{2}\\left(\\alpha_{\\max} - \\alpha_{\\min}\\right)\\left(1 + \\cos\\left(\\pi \\frac{t - T_{\\text{warm}}}{T - T_{\\text{warm}}}\\right)\\right)',
        '\\text{Rule of thumb: } T_{\\text{warm}} \\approx 1\\%\\text{–}5\\% \\text{ of total steps.}',
      ],
    },
    {
      type: 'note',
      md: '**LR range test / one-cycle**, in one line: train for a few hundred steps while increasing α exponentially, plot loss vs α, and pick roughly one order of magnitude below where the loss starts climbing — one-cycle then ramps up to that peak and back down. **How to pick a starting α in practice:** begin with the defaults (AdamW 3e-4 for transformers from scratch, 1e-5–5e-5 for finetuning a pretrained model, SGD+momentum 0.1 for a vision net with batch 256), then sweep by factors of 3 over ~10 runs of a few hundred steps each. Sweeping α beats sweeping anything else — β₁, β₂ and ε almost never repay the compute.',
    },
  ],
  quiz: [
    {
      question: 'A loss surface has curvature 1 along w₀ and 500 along w₁. Why does plain SGD with one α perform badly here?',
      options: [
        {
          text: 'The gradient is zero, so no learning happens',
          explanation: 'The gradient is far from zero — it is large along w₁ and small along w₀. The problem is the mismatch, not the absence.',
        },
        {
          text: 'α must stay below 2/500 for stability, so progress along the curvature-1 axis crawls at ~1/500 the speed',
          explanation: 'Correct. The steepest direction caps α; the shallowest direction then gets a step 500× smaller than it needs. That is the ravine, expressed as a number.',
        },
        {
          text: 'SGD cannot handle two parameters at once',
          explanation: 'Dimension count is irrelevant — SGD trains billion-parameter models fine. It is the ratio of curvatures that hurts.',
        },
      ],
      correct: 1,
    },
    {
      question: 'Momentum uses β = 0.9. What does that number mean concretely?',
      options: [
        {
          text: '90% of the gradient is discarded each step',
          explanation: 'Backwards — β is the fraction of past velocity RETAINED, not the fraction of gradient thrown away.',
        },
        {
          text: 'The velocity is effectively an average of roughly the last 10 gradients, since 1/(1−0.9) = 10',
          explanation: 'Correct. Contributions decay as βᵏ, and the geometric series sums to 1/(1−β). β=0.99 would mean ~100 gradients of memory.',
        },
        {
          text: 'The learning rate is multiplied by 0.9 every step',
          explanation: 'That would be an exponential LR schedule, a completely different mechanism. β never touches α.',
        },
      ],
      correct: 1,
    },
    {
      question: 'AdaGrad trains well for a while and then stops improving, long before the loss is low. Why?',
      options: [
        {
          text: 'Its accumulator is a running SUM of squared gradients, so it only grows — the effective rate α/√G decays monotonically to zero',
          explanation: 'Correct. Nothing is wrong with the model; the optimizer has simply shrunk its own step size to nothing. RMSProp fixes it with an EMA.',
        },
        {
          text: 'It has reached a local minimum',
          explanation: 'Possible in principle, but the signature of AdaGrad stalling is that it happens on any long run regardless of the surface — the cause is mechanical.',
        },
        {
          text: 'Its momentum term saturates',
          explanation: 'AdaGrad has no momentum term at all. It is purely a per-parameter rate scaler.',
        },
      ],
      correct: 0,
    },
    {
      question: 'Why does Adam divide m and s by (1 − βᵗ)?',
      options: [
        {
          text: 'To keep the update inside the range [−1, 1]',
          explanation: 'No such guarantee is intended or produced; the ratio m̂/√ŝ is roughly bounded by construction, not by the correction.',
        },
        {
          text: 'To decay the learning rate over time',
          explanation: 'The opposite of what happens: (1 − βᵗ) → 1 as t grows, so the correction fades out. It affects only the first steps.',
        },
        {
          text: 'Both averages start at zero, so early estimates are biased toward zero; dividing by the fraction of weight actually accumulated undoes that',
          explanation: 'Correct. At t=1 with β₂=0.999, s = 0.001g² — a thousand times too small. Dividing by (1−0.999) recovers exactly g².',
        },
      ],
      correct: 2,
    },
    {
      question: 'What is genuinely different about AdamW compared to Adam with L2 regularization added to the loss?',
      options: [
        {
          text: 'AdamW uses a different value of β₂',
          explanation: 'The moment estimates are identical. Only where the decay term is applied changes.',
        },
        {
          text: 'AdamW subtracts α·λ·w separately, so decay is not divided by √ŝ and every weight shrinks by the same fraction',
          explanation: 'Correct. Inside Adam, L2 gets rescaled per-parameter — weights with large recent gradients barely get regularized, which is the reverse of the intent.',
        },
        {
          text: 'AdamW applies decay only to the bias parameters',
          explanation: 'Backwards in practice — biases and normalization parameters are usually EXCLUDED from weight decay.',
        },
      ],
      correct: 1,
    },
    {
      question: 'Why does transformer training almost always use learning-rate warmup?',
      options: [
        {
          text: 'Adam\'s second-moment estimate is built from a few noisy early gradients, so the per-parameter scaling is unreliable exactly when the network is most fragile',
          explanation: 'Correct. Bias correction removes the systematic bias but not the variance — early ŝ is simply a bad estimate, and big steps taken on it wreck a random-init network.',
        },
        {
          text: 'It speeds up the first epoch',
          explanation: 'Warmup deliberately makes the first steps SMALLER. The payoff is stability later, not speed early.',
        },
        {
          text: 'It compensates for missing bias correction',
          explanation: 'Frameworks apply bias correction anyway, and warmup still helps — so it is solving a different problem.',
        },
      ],
      correct: 0,
    },
    {
      question: 'A colleague says "Adam always generalizes worse than SGD". What is the honest response?',
      options: [
        {
          text: 'Agree — Adam is only for prototyping',
          explanation: 'Indefensible: AdamW trains essentially every large language model in production. SGD does not train transformers well at all.',
        },
        {
          text: 'Disagree fully — the effect was never real',
          explanation: 'Overcorrection. Well-tuned SGD+momentum did show a small, reproducible edge on vision benchmarks.',
        },
        {
          text: 'Partly true historically on vision benchmarks with a well-tuned SGD, but the gap is small, much of it was Adam\'s broken weight decay (fixed by AdamW), and AdamW dominates NLP and large-scale training',
          explanation: 'Correct — this is the answer that shows you know the literature rather than the folklore. Name the domain, the size of the gap, and the AdamW correction.',
        },
      ],
      correct: 2,
    },
    {
      question: 'In high-dimensional deep networks, which obstacle is the bigger practical problem?',
      options: [
        {
          text: 'Saddle points and plateaus — a local minimum requires ALL d curvatures to be positive, which is vanishingly unlikely as d grows',
          explanation: 'Correct. Nearly every critical point in high dimensions has at least one descending direction. The pain is slowness in near-flat regions, not being trapped.',
        },
        {
          text: 'Local minima — deep nets are full of bad traps you cannot escape',
          explanation: 'The classic textbook fear, and largely wrong in high dimensions. The minima that are reached also tend to have similar loss.',
        },
        {
          text: 'Discontinuities in the loss',
          explanation: 'Standard architectures use piecewise-differentiable operations; the surface is smooth enough for gradients almost everywhere.',
        },
      ],
      correct: 0,
    },
  ],
  interviewQuestions: [
    {
      question: 'Write the momentum update on the whiteboard and explain why it helps in a ravine.',
      answer:
        'v = βv + g, then w := w − αv (β = 0.9 typical). Unrolled, v = g_t + βg_{t−1} + β²g_{t−2} + …, so it is an exponentially weighted average of roughly the last 1/(1−β) ≈ 10 gradients. In a ravine the steep-wall component of g flips sign every step, so consecutive terms cancel inside that average; the shallow-floor component points the same way every step, so it adds up. Net effect: oscillation is damped, consistent progress is accelerated. Physical framing that lands well: you gave the walker mass, and a heavy ball does not zigzag.',
      isCaseBased: false,
    },
    {
      question: 'Write Adam\'s full update and explain each hyperparameter and why bias correction exists.',
      answer:
        'm_t = β₁m_{t−1} + (1−β₁)g_t; s_t = β₂s_{t−1} + (1−β₂)g_t²; m̂ = m/(1−β₁ᵗ); ŝ = s/(1−β₂ᵗ); w := w − α·m̂/(√ŝ+ε). β₁=0.9 is direction memory (~10 steps of momentum). β₂=0.999 is magnitude memory (~1000 steps — deliberately longer, because a scale estimate should be stable). ε=1e-8 only prevents division by zero for parameters with near-zero gradients. Bias correction: both averages initialize at zero, so at t=1 with β₂=0.999 you get s = 0.001g² — a thousand times too small, which makes m̂/√ŝ explode. Dividing by (1−βᵗ), the fraction of weight actually accumulated, fixes it exactly, and the correction fades to a no-op as t grows.',
      isCaseBased: false,
    },
    {
      question: 'The Adam-vs-SGD generalization debate: what is your position?',
      answer:
        'Three parts. (1) Adam/AdamW converges faster and needs far less tuning — one α with sane defaults works across architectures. (2) On vision benchmarks (CIFAR, ImageNet), a well-tuned SGD+momentum with a good schedule has often ended a fraction of a percent ahead in test accuracy; the usual explanation is that SGD\'s uniform noise favours flatter minima, which I would present as a plausible story rather than settled science since flat/sharp measures are reparameterization-sensitive. (3) The honest current state: AdamW dominates NLP, transformers, and anything at scale — SGD simply does not train them well — and a large part of the historical gap was Adam\'s broken weight decay, which AdamW fixed. My default is AdamW; I reach for tuned SGD+momentum only when chasing the last half-percent on a vision benchmark with tuning budget to spare.',
      isCaseBased: false,
    },
    {
      question: 'Explain the difference between Adam+L2 and AdamW, and why anyone cared enough to rename the optimizer.',
      answer:
        'L2 adds λ‖w‖² to the loss, so λw enters the gradient — and then Adam divides the whole gradient by √ŝ. That makes the decay per-parameter: a weight with large recent gradients has a large √ŝ and so is barely decayed, while a quiet weight is decayed hard. That is the reverse of what "shrink every weight uniformly" means. AdamW decouples it: do the adaptive step, then subtract α·λ·w separately. The consequence is practical, not cosmetic — before AdamW, the weight-decay hyperparameter people tuned in Adam was interacting with gradient magnitudes, which is why decoupling improved results and why AdamW is the transformer default with λ ≈ 0.01–0.1. Bonus point: biases and LayerNorm parameters are normally excluded from decay.',
      isCaseBased: false,
    },
    {
      question: 'Case: a transformer trains fine for 200 steps, then the loss spikes to NaN. Adam, lr = 1e-3, no warmup. Walk through your diagnosis.',
      answer:
        'Order of suspicion. (1) No warmup with Adam — early ŝ is estimated from a handful of noisy gradients, so the per-parameter scaling is unreliable and a step can be catastrophically large; add 1–5% of total steps as linear warmup first, it is the cheapest fix. (2) lr too high for the model size — 1e-3 is aggressive for a transformer; 1e-4 to 3e-4 with warmup and cosine decay is the standard recipe. (3) Add gradient clipping at global norm 1.0 — standard in every LLM recipe, and it converts a spike into a survivable step. (4) Mixed precision: fp16 overflows on large activations; check the loss scaler, or move to bf16. (5) Data: one pathological batch (huge sequence, corrupt label) — log the batch index at the spike and inspect it. Tradeoff to name: clipping is a safety net that hides the cause; warmup plus a sane lr is the actual fix.',
      isCaseBased: true,
    },
    {
      question: 'Case: your Adam run at lr = 1e-3 trains well. A teammate copies the config into SGD with lr = 1e-3 and the model barely moves; at 1e-1 it diverges immediately. Explain what is going on.',
      answer:
        'Learning rates are not transferable across optimizers because they scale different things. Adam\'s step is α·m̂/√ŝ, and since m̂ and √ŝ have the same units the step magnitude is roughly α regardless of gradient size — α is a step size in parameter space. SGD\'s step is α·g, so its α is a step size per unit of gradient, and its usable value is bounded by α < 2/λ_max, the steepest curvature. So SGD at 1e-3 crawls (gradients are small) while at 1e-1 it exceeds the stability bound on the sharpest direction and blows up. Practical answer: re-tune from scratch for SGD (0.1 with batch 256 for a vision net is the usual starting point), add momentum 0.9, and use a schedule. Bonus: this is the same reason batch-size changes need lr rescaling — linear scaling for SGD, roughly square-root for Adam.',
      isCaseBased: true,
    },
    {
      question: 'When is AdaGrad still the right choice, and what exactly breaks when it is not?',
      answer:
        'AdaGrad shines with sparse, high-dimensional features — think bag-of-words, click features, large embedding tables where a given feature fires in a tiny fraction of examples. Because its accumulator only grows for parameters that are actually being pushed, rare features keep a relatively large effective rate and get meaningful updates when they finally appear. What breaks elsewhere: G is a running SUM of squared gradients, so it grows monotonically and the effective rate α/√G decays to zero. On a long dense-training run the optimizer stalls out of step size, not out of loss to reduce. RMSProp\'s EMA is the fix — it forgets, so the rate stays alive — at the cost of no longer having AdaGrad\'s clean convex regret guarantee.',
      isCaseBased: false,
    },
    {
      question: 'Explain, mechanically, how RMSProp flattens a ravine.',
      answer:
        'It keeps s = β₂s + (1−β₂)g², elementwise, so each parameter has its own estimate of recent gradient magnitude, and steps with α/√s. Along the steep axis, gradients are large, so √s is large and the step is damped. Along the shallow axis, gradients are small, so √s is small and the step is amplified. The two axes end up taking comparable steps — the optimizer sees an approximately isotropic bowl even though the true surface has a condition number in the hundreds. What it gives up versus a true second-order method: this is a diagonal rescaling only. It cannot fix a ravine that is diagonal in parameter space (rotated relative to the axes) — that needs curvature information a diagonal preconditioner does not have, which is why K-FAC/Shampoo exist.',
      isCaseBased: false,
    },
    {
      question: 'Why do saddle points matter more than local minima in deep learning, and what actually gets you past one?',
      answer:
        'For a critical point to be a local minimum, all d Hessian eigenvalues must be positive. With d in the millions that is astronomically unlikely; needing just one negative eigenvalue to be a saddle is not. So most flat places you hit have a descending direction — you are not trapped, you are slow, because the gradient magnitude near a saddle or plateau is tiny. What gets you out: momentum, which builds velocity across many small-gradient steps instead of taking one small step at a time; adaptive scaling, which amplifies steps along directions with historically small gradients; and mini-batch gradient noise, which perturbs you off the saddle\'s ridge. The framing that scores points: the engineering problem is escape speed, not escape possibility.',
      isCaseBased: false,
    },
    {
      question: 'Case: you inherit a training script with lr hardcoded to 1e-3, no schedule, and a comment saying "worked last time". New model, new dataset. How do you pick the learning rate?',
      answer:
        'Do not trust an inherited constant — it was tuned for a different optimizer, model size, and batch size. Start from the known-good default for the optimizer and setting: AdamW 3e-4 for a transformer from scratch, 1e-5 to 5e-5 for finetuning a pretrained model, SGD+momentum 0.1 for a vision net at batch 256. Then either sweep by factors of 3 over short runs of a few hundred steps and take the largest α whose loss curve is still smooth, or run an LR range test — increase α exponentially for a few hundred steps, plot loss vs α, and pick about one order of magnitude below where the loss turns up. Always pair it with warmup and cosine decay. The judgment being tested is priority: α is worth a real sweep, while β₁, β₂ and ε almost never repay the compute.',
      isCaseBased: true,
    },
    {
      question: 'What does β₂ = 0.999 actually control, and when would you change it?',
      answer:
        'β₂ sets the memory of the second-moment (squared-gradient) estimate: ~1/(1−β₂) = 1000 steps. It is deliberately much longer than β₁\'s ~10 because a scale estimate should be stable — you do not want the per-parameter step size jittering with every batch. Lower it (0.95–0.98) when gradient statistics are genuinely non-stationary or very noisy: RL, small batches, or short runs where 1000 steps is a large fraction of training — GPT-3 famously used β₂ = 0.95. Raising it toward 0.9999 buys smoothness at the cost of adapting slowly to a real change in gradient scale. In practice, it is a knob you touch only after α, schedule, and warmup are settled.',
      isCaseBased: false,
    },
    {
      question: 'Is Nesterov momentum worth using, and what does it actually change?',
      answer:
        'Yes, and it is free — one flag. Classical momentum measures the gradient where you currently stand, then adds the momentum step. Nesterov takes the momentum step first and measures the gradient at that lookahead point: g = ∇J(w − αβv). If the slope has already turned upward at the place you are about to land, you brake before overshooting instead of after. It gives better constants (a provably faster rate on smooth convex problems) and slightly less overshoot in practice. Honest framing for an interview: a real but small improvement to the same algorithm, not a different one — worth the flag, not worth a paragraph.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'Condition number κ, and why SGD zigzags', back: 'κ = λ_max/λ_min, steepest ÷ shallowest curvature. Stability caps α at 2/λ_max, so the steep axis bounces wall-to-wall while the shallow axis crawls at ~1/κ the speed.' },
    { front: 'Momentum update', back: 'v = βv + g, w := w − αv. Oscillating components cancel inside v; consistent ones accumulate. β=0.9 ≈ average of the last 10 gradients (1/(1−β)).' },
    { front: 'Nesterov in one line', back: 'Take the momentum step first, THEN measure the gradient there. Look before you land — small, real improvement.' },
    { front: 'AdaGrad and its bug', back: 'Per-parameter α/√G with G a running SUM of g². Great for sparse features; G only grows, so the effective rate decays to zero and training stalls.' },
    { front: 'RMSProp fix', back: 's = β₂s + (1−β₂)g² — an EMA instead of a sum. Old history is forgotten, so the effective learning rate stays alive.' },
    { front: 'Adam = ?', back: 'Momentum (first moment m) + RMSProp (second moment s) + bias correction. Direction from m, magnitude from √s. β₁=0.9, β₂=0.999, ε=1e-8.' },
    { front: 'Why bias correction', back: 'm and s start at 0, so early estimates are biased small (s₁ = 0.001g² with β₂=0.999). Divide by (1−βᵗ) — the weight actually accumulated. Fades to a no-op as t grows.' },
    { front: 'AdamW vs Adam+L2', back: 'L2 inside Adam gets divided by √ŝ, so decay becomes per-parameter and uneven. AdamW subtracts α·λ·w separately — uniform shrinkage. Transformer default, λ≈0.01–0.1.' },
    { front: 'Adam vs SGD, honest', back: 'Adam: faster, less tuning, dominates NLP/large models. Tuned SGD+momentum: small edge on vision benchmarks. Much of the old gap was Adam\'s broken weight decay — AdamW closed most of it.' },
    { front: 'Why warmup', back: 'Adam\'s ŝ comes from a few noisy early gradients, so per-parameter scaling is unreliable when weights are most fragile. Ramp α up over ~1–5% of steps, then decay (cosine).' },
  ],
  mindmapMarkdown: `- Optimizers: SGD → Adam
  - Loss landscape
    - Ravine / ill-conditioning (κ = λmax/λmin)
    - Plateaus: gradient ≈ 0, not a minimum
    - Saddles, not local minima: a min needs ALL d curvatures > 0
  - SGD failure
    - α capped by 2/λmax
    - Steep axis bounces, shallow axis crawls — the zigzag
  - Momentum
    - v = βv + g, w −= αv
    - Heavy ball: oscillations cancel, drift accumulates
    - β = 0.9 ≈ last 10 gradients
    - Nesterov: look ahead, then measure
  - AdaGrad
    - Per-parameter α / √G — great for sparse features
    - G only grows → rate decays to 0 → stalls
  - RMSProp
    - EMA of g² instead of a sum — forgetting keeps the rate alive
    - Diagonal rescaling flattens the ravine
  - Adam
    - m = EMA of g (direction), s = EMA of g² (scale)
    - Bias correction: divide by (1 − βᵗ)
    - β1=0.9, β2=0.999, ε=1e-8
    - Step size ≈ α regardless of |g|
  - AdamW
    - L2 inside Adam gets rescaled by √ŝ
    - Decoupled: subtract α·λ·w separately
    - Default for transformers
  - Adam vs SGD debate
    - Adam: faster, less tuning, wins NLP/scale
    - Tuned SGD+momentum: small vision edge
    - Gap smaller than folklore; AdamW closed much of it
  - Schedules
    - Step decay, cosine decay
    - Warmup: early ŝ is noisy, weights fragile
    - LR range test / one-cycle; pick α by 3× sweep from defaults`,
}

export default m
