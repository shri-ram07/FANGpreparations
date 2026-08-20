import type { Module } from '../types'

const m: Module = {
  id: 'metrics-l3-genai-cv-metrics',
  subjectId: 'metrics',
  level: 3,
  title: 'GenAI & Vision Metrics: Perplexity, BLEU, ROUGE, IoU & mAP',
  whyItMatters:
    'Generative models broke evaluation. There is no confusion matrix for a paragraph, and "is this summary good?" has no ground-truth cell to count. This module gives you the four numbers everyone quotes — perplexity, BLEU/ROUGE, IoU, mAP — plus the honest account of what each one cannot see, and KL divergence, the single quantity that connects cross-entropy, VAEs, distillation and RLHF into one idea.',
  estMinutes: 55,
  sections: [
    {
      type: 'intuition',
      title: 'The problem: no cell to count',
      md: `Classification metrics all rest on one move — put each prediction in a box, count the boxes. Generative output has no boxes.

- A model writes *"The meeting was postponed to Friday."* The reference says *"They moved the meeting to Friday."*
- Same meaning. Zero word overlap on 4 of 6 words. Is that a hit or a miss?
- A detector draws a box around a dog, 8 pixels off. Correct? Half correct?
- So the field split into two strategies: **score the model's own probabilities** (perplexity, KL) or **score the output text against a reference** (BLEU, ROUGE, judges).
- Vision took a third route: define "close enough" geometrically (IoU) and then reuse the precision-recall machinery you already know.
- Everything in this module is one of those three moves. Know which one a metric is making and you know what it can't see.`,
    },
    {
      type: 'intuition',
      title: 'KL divergence: the cost of using the wrong map',
      md: `You navigate a city with a map. The map is slightly wrong — a street here, a one-way there.

- You still arrive, but you pay for it: extra turns, extra surprises.
- **KL divergence** measures exactly that surcharge, for probability distributions instead of maps.
- Truth is **P**. Your model is **Q**. KL(P || Q) = the *extra* bits of surprise you pay per event by encoding reality with Q instead of P.
- Read it as: *how much worse is my model's story than the true story?*
- Units are bits (log base 2) or nats (natural log). Pick one and stay there.
- Two properties do all the work: KL is never negative, and it is **zero only when P and Q are identical**.`,
    },
    {
      type: 'math',
      intro: 'The definition, and the two facts you must be able to state.',
      latex: [
        'D_{KL}(P \\parallel Q) = \\sum_{x} P(x)\\,\\log \\frac{P(x)}{Q(x)} \\;=\\; \\mathbb{E}_{x \\sim P}\\!\\left[ \\log \\frac{P(x)}{Q(x)} \\right]',
        'D_{KL}(P \\parallel Q) \\;\\ge\\; 0, \\qquad D_{KL}(P \\parallel Q) = 0 \\iff P = Q \\quad \\text{(Gibbs / Jensen)}',
        'D_{KL}(P \\parallel Q) \\;\\ne\\; D_{KL}(Q \\parallel P) \\quad \\text{— asymmetric, no triangle inequality: NOT a distance.}',
      ],
    },
    {
      type: 'hinglish',
      md: `KL divergence ek hi sawaal poochta hai: *sachai P hai, par mere paas sirf model ka naqsha Q hai — is naqshe pe chalne se mujhe kitni EXTRA hairaani sehni padegi?* Jawab bits me aata hai. **Zero matlab dono naqshe bilkul same.** Aur ek baat pakki yaad rakho: yeh symmetric **nahi** hai. P ki nazar se Q dekhna aur Q ki nazar se P dekhna do alag numbers dete hain — neeche ka code yehi prove karta hai. Isiliye interview me kabhi "KL distance" mat bolna; woh ek galti hai jo interviewer turant pakad leta hai. Bolo "divergence".`,
    },
    {
      type: 'note',
      md: `Why the asymmetry actually matters, honestly. In KL(P || Q) the expectation is taken over P: wherever P has mass and Q has none, the ratio blows up, so Q is forced to **cover** all of P — it spreads out and blurs across modes. That is the direction maximum likelihood minimises, which is one reason plain likelihood-trained generative models produce safe, averaged, slightly mushy samples. Flip it: KL(Q || P) is an expectation over Q, so Q is only punished where *it* puts mass — it can safely ignore parts of P and collapse onto a single mode. That is the direction variational methods and reverse-KL fine-tuning minimise: sharper, less diverse. Neither is "right". "Forward KL is mass-covering, reverse KL is mode-seeking" is the sentence to have ready.`,
    },
    {
      type: 'intuition',
      title: 'The link that ties this whole subject together',
      md: `Cross-entropy is not a separate idea from KL. It is KL plus a constant.

- Entropy H(P) = the surprise that is *irreducible* — the noise in the data itself. You cannot train it away.
- Cross-entropy H(P, Q) = H(P) + KL(P || Q). Total surprise = unavoidable surprise + your model's surcharge.
- The data distribution P is **fixed** during training. So H(P) is a constant.
- Therefore **minimising cross-entropy IS minimising KL(P || Q)**. Same optimisation, different offset.
- That is the answer to "why cross-entropy?": it is the differentiable, computable form of "make my distribution match the data's".
- It also explains why the loss floor is not zero. A well-trained model bottoms out at roughly H(P) — the data's own entropy.`,
    },
    {
      type: 'note',
      md: `Where KL shows up once you leave this subject, one line each. **VAE (ELBO):** the objective is reconstruction quality minus KL(q(z|x) || p(z)) — the KL term drags the encoder's per-example latent distribution toward the N(0, I) prior so the latent space stays samplable. **Knowledge distillation:** the student is trained on KL(teacher || student) over temperature-softened probabilities, so it copies the teacher's whole distribution ("cat 0.7, dog 0.2, fox 0.1") instead of just the hard label. **RLHF:** the PPO objective is reward minus β·KL(policy || reference model) — a leash that stops the tuned model drifting into degenerate text that games the reward model. Same quantity, three jobs: regularise, imitate, restrain. Full treatment in the GenAI subject.`,
    },
    {
      type: 'intuition',
      title: 'Perplexity: cross-entropy wearing a friendlier number',
      md: `A language model predicts the next token. Score it by how surprised it was by the token that actually came.

- Average the negative log-likelihood over every token. That is exactly cross-entropy per token.
- Then exponentiate it. That is **perplexity**.
- Why exponentiate? To get back into units of *choices*. Perplexity 30 means: **as confused as if it were picking uniformly among 30 equally likely tokens** at every step.
- Lower is better, floor is 1.0 (perfect certainty, always right). A uniform model over a 50,000-token vocabulary has perplexity 50,000.
- One shocked token wrecks the average — log of a tiny probability is a huge negative number. Perplexity is dominated by the model's worst moments, not its typical ones.
- It measures only one thing: probability assigned to real text. It says nothing about truth, helpfulness, or safety.`,
    },
    {
      type: 'math',
      intro: 'Perplexity is exp(average cross-entropy). That is the whole definition.',
      latex: [
        '\\text{PPL} = \\exp\\!\\left( -\\frac{1}{N} \\sum_{i=1}^{N} \\log p(t_i \\mid t_{<i}) \\right) = \\exp\\big( H(P_{\\text{data}}, P_{\\text{model}}) \\big)',
        '\\text{Uniform over } V \\text{ tokens} \\Rightarrow p = \\tfrac{1}{V} \\Rightarrow \\text{PPL} = V \\quad \\text{— the "N equally likely options" reading.}',
        '\\text{Base matters only for the exponent base: } 2^{H_{\\text{bits}}} = e^{H_{\\text{nats}}}. \\text{ Same number, be consistent.}',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Perplexity by hand, and KL in both directions to prove it is not a distance',
      code: `import numpy as np

logp2 = np.array([-0.15, -2.00, -0.30, -5.00, -1.00, -0.55])   # log2 p(true token)
nll = -logp2.mean()                        # average surprise, bits per token
print('avg NLL = %.3f bits  ->  perplexity = %.3f' % (nll, 2 ** nll))
worse = logp2.copy(); worse[3] = -12.0     # one token the model found shocking
print('one shocked token   ->  perplexity = %.3f' % 2 ** (-worse.mean()))

P = np.array([0.60, 0.30, 0.08, 0.02])     # truth: peaked
Q = np.array([0.25, 0.25, 0.25, 0.25])     # model: uniform
kl = lambda a, b: float((a * np.log2(a / b)).sum())
print('KL(P||Q) = %.4f   KL(Q||P) = %.4f   same? %s'
      % (kl(P, Q), kl(Q, P), np.isclose(kl(P, Q), kl(Q, P))))
print('KL(P||P) = %.4f' % kl(P, P))

H = float(-(P * np.log2(P)).sum())         # entropy of the truth
CE = float(-(P * np.log2(Q)).sum())        # cross-entropy of Q under P
print('H(P)=%.4f + KL(P||Q)=%.4f = %.4f   CE(P,Q)=%.4f' % (H, kl(P, Q), H + kl(P, Q), CE))

# ---- real output ----
# avg NLL = 1.500 bits  ->  perplexity = 2.828
# one shocked token   ->  perplexity = 6.350
# KL(P||Q) = 0.6323   KL(Q||P) = 0.9404   same? False
# KL(P||P) = 0.0000
# H(P)=1.3677 + KL(P||Q)=0.6323 = 2.0000   CE(P,Q)=2.0000`,
      annotations: {
        3: 'These are the log-probabilities the model gave to the tokens that actually appeared — the only inputs perplexity needs.',
        5: '1.5 bits per token -> 2^1.5 = 2.83. The model is as unsure as picking between ~3 equally likely tokens each step.',
        11: 'One lambda, both directions. Note the asymmetry costs nothing to demonstrate — which is why "KL distance" is inexcusable.',
        13: '0.6323 vs 0.9404 on the SAME pair of distributions. Swapping the arguments changes the answer by 49%.',
        18: 'The identity, checked numerically: cross-entropy 2.0000 = entropy 1.3677 + KL 0.6323. Training drives the KL term only.',
        22: 'One token going from -5 to -12 bits more than doubles perplexity, 2.83 -> 6.35. Tail sensitivity, in one line.',
      },
    },
    {
      type: 'note',
      md: `**The comparability trap — the part papers quietly rely on you forgetting.** Perplexity is per *token*, and tokens are whatever the tokenizer decided they are. A model with a big vocabulary spends fewer tokens on the same sentence, so its per-token surprise is spread over fewer, fatter predictions — a different number for identical text. Change the tokenizer and perplexity moves with no change in model quality whatsoever. It also depends on the evaluation corpus (WikiText-103 perplexity and code-corpus perplexity are unrelated quantities) and on how you handle context windows and end-of-document tokens. So: perplexity is valid for comparing checkpoints of *your* model on *your* held-out set. The "PPL 6.2" in a paper is not portable, and quoting it against your own 9.1 is a mistake an interviewer will catch. Bits-per-character sidesteps the tokenizer issue, which is why some papers report it instead.`,
    },
    { type: 'visual', component: 'NextTokenSampler', props: {} },
    {
      type: 'note',
      md: `Look at those bars — perplexity is nothing but a summary of them, taken over thousands of steps. When the bar over the token that actually comes next is tall and the rest are flat on the floor, the negative log-likelihood for that step is near zero and perplexity heads toward 1. When the bars are a low, even hedge across the whole vocabulary, every step contributes a big surprise and perplexity climbs toward the vocabulary size. Now drag **temperature**: raising it flattens the bars, lowering it sharpens them. You are literally reshaping the model's confusion. Careful though — temperature is applied at *sampling* time and perplexity is computed on the raw distribution at temperature 1, so this shows you what the number means, not a way to fake a better one. Top-k and top-p are a third thing again: they truncate the tail rather than reweight it, which changes what the model can say without changing what it believes.`,
    },
    {
      type: 'intuition',
      title: 'Reconstruction loss: rebuild the input after the squeeze',
      md: `An autoencoder has exactly one job — push the input through a narrow bottleneck and get the input back out the other side.

- Encoder squeezes x into a small code z. Decoder expands z back into an approximation x-hat. The objective is simply *how far is x-hat from x*.
- **Continuous data** (raw intensities, audio, tabular rows): mean squared error per element, averaged over the batch.
- **Data already living in [0, 1]** (normalised pixels): binary cross-entropy computed *per pixel*, treating each pixel value as a probability. Same formula as classification cross-entropy, applied one pixel at a time and summed.
- The bottleneck is the entire trick. Widen it to the input size and the network learns the identity function, drives the loss to zero, and has learnt nothing.
- This is a training objective, not a number you report. Reconstruction loss forces the code to keep the information that matters and drop the rest.
- Architectures for all of this live in the DL subject's generative-models module. Here we care only about the objectives and what they do to your outputs.`,
    },
    {
      type: 'math',
      intro: 'Two reconstruction losses, picked by the range of your data.',
      latex: [
        '\\mathcal{L}_{\\text{recon}}^{\\text{MSE}} = \\frac{1}{N}\\sum_{i=1}^{N} \\lVert x_i - \\hat{x}_i \\rVert_2^2 \\qquad \\text{— continuous-valued data}',
        '\\mathcal{L}_{\\text{recon}}^{\\text{BCE}} = -\\sum_{j=1}^{D} \\Big[ x_j \\log \\hat{x}_j + (1 - x_j)\\log(1 - \\hat{x}_j) \\Big] \\qquad x_j \\in [0, 1] \\text{, summed over pixels}',
        '\\hat{x} = f_\\theta\\big( g_\\phi(x) \\big), \\qquad \\dim(z) \\ll \\dim(x) \\quad \\text{— the bottleneck is the only thing preventing } \\hat{x} = x \\text{ trivially.}',
      ],
    },
    {
      type: 'note',
      md: `**Why plain autoencoder and VAE outputs look blurry — and it is the loss, not the architecture.** Under squared error the prediction that minimises expected loss is the *conditional mean* of everything that could plausibly have produced this input. For an image, many sharp reconstructions are individually plausible: the edge one pixel left, the edge one pixel right, the texture phase shifted. MSE does not let the model pick one and commit — hedging by outputting the average scores better than gambling on any single sharp guess, because a sharp guess that lands slightly wrong is penalised quadratically twice over (wrong where it put detail, wrong where it left detail out). And the average of many sharp images is a blurry image. So the blur is the *optimal* answer to the question you asked. This is the same mass-covering behaviour as forward KL from earlier in this module, seen in pixel space. It is also why the field moved on: adversarial losses replace "be close on average" with "be indistinguishable", and diffusion models predict noise instead of pixels — both sidestep the averaging.`,
    },
    {
      type: 'intuition',
      title: 'ELBO: reconstruct, then regularise the latent',
      md: `A VAE keeps the reconstruction term and bolts a KL term onto it. That second term is the whole difference, and it is the KL you already know.

- **ELBO = E_q[log p(x|z)] − KL(q(z|x) || p(z))**. Two halves. Read them separately and it stops being intimidating.
- **First half — the reconstruction term.** Draw a code z from the encoder's distribution q(z|x), decode it, and ask how much probability the decoder assigns back to the real x. Maximising this is the reconstruction loss above with the sign flipped.
- **Second half — the KL regulariser.** KL(q(z|x) || p(z)) with the prior p(z) = N(0, I). It drags every example's latent cloud toward one standard normal, so the space stays continuous and *samplable*: draw z from N(0, I), decode, get something plausible. A plain autoencoder cannot do that — its codes sit on unmapped islands and the space between them decodes to garbage.
- **The tradeoff has a knob.** β-VAE scales the KL term by β. Raise β and you get a cleaner, more disentangled, more samplable latent space and *worse* reconstructions. Lower it and you get sharp reconstructions in a latent space you cannot sample from. No setting gives you both.
- **Why "lower bound".** What you actually want is log p(x), the likelihood of the data, and it is intractable — it needs an integral over every possible z. ELBO ≤ log p(x) always, and the gap is itself a KL: between the encoder q(z|x) and the true posterior. So pushing the ELBO up pushes the quantity you cannot compute up with it. That is the whole justification.
- **The classic failure — posterior collapse:** the KL term wins, q(z|x) becomes the prior for every input, and the decoder learns to ignore z entirely.`,
    },
    {
      type: 'math',
      intro: 'The ELBO, the gap that makes it a bound, and the β knob.',
      latex: [
        '\\log p(x) \\;\\ge\\; \\mathcal{L}_{\\text{ELBO}}(x) = \\underbrace{\\mathbb{E}_{q_\\phi(z \\mid x)}\\big[\\log p_\\theta(x \\mid z)\\big]}_{\\text{reconstruction}} \\;-\\; \\underbrace{D_{KL}\\big(q_\\phi(z \\mid x)\\,\\|\\,p(z)\\big)}_{\\text{latent regulariser}}',
        '\\log p(x) - \\mathcal{L}_{\\text{ELBO}}(x) = D_{KL}\\big(q_\\phi(z \\mid x)\\,\\|\\,p_\\theta(z \\mid x)\\big) \\;\\ge\\; 0 \\quad \\text{— the gap IS a KL, so the bound is tight when } q \\text{ matches the true posterior.}',
        'D_{KL}\\big(\\mathcal{N}(\\mu, \\sigma^2)\\,\\|\\,\\mathcal{N}(0, 1)\\big) = -\\tfrac{1}{2}\\sum_{j}\\big(1 + \\log \\sigma_j^2 - \\mu_j^2 - \\sigma_j^2\\big) \\quad \\text{— closed form, which is why the prior is a standard normal.}',
        '\\mathcal{L}_{\\beta\\text{-VAE}} = \\mathbb{E}_{q}\\big[\\log p_\\theta(x \\mid z)\\big] - \\beta\\, D_{KL}\\big(q_\\phi(z \\mid x)\\,\\|\\,p(z)\\big), \\qquad \\beta > 1 \\Rightarrow \\text{cleaner latent, blurrier } \\hat{x}',
      ],
    },
    {
      type: 'intuition',
      title: 'GAN: a min-max game with no likelihood anywhere',
      md: `Autoencoders and VAEs score the output against the input. A GAN scores nothing against anything — it runs two networks against each other and lets the scoreboard be the loss.

- **Discriminator D** takes an image and outputs the probability it is real. It **maximises** the objective: push D(x) toward 1 on real data and D(G(z)) toward 0 on fakes.
- **Generator G** takes noise z and outputs an image. It **minimises** the same objective: make D(G(z)) large, which means fooling the discriminator.
- One line, both players: **min over G of max over D of E[log D(x)] + E[log(1 − D(G(z)))]**. Hence "min-max", hence "adversarial".
- No reconstruction term, no likelihood, no prior to match. Nothing in the objective ever compares a generated image to a specific real one — which is exactly why GAN samples are sharp: nothing is being averaged.
- At the theoretical optimum G's distribution equals the data distribution and D is pinned at 0.5 everywhere, unable to tell them apart. Nothing guarantees you ever arrive.
- Because both players move, neither loss falls monotonically. This is a *game*, not an optimisation, and it does not converge the way a loss does.`,
    },
    {
      type: 'note',
      md: `**The non-saturating trick — the part interviewers actually probe.** The original generator loss has a bug, and it bites exactly when you can least afford it. Early in training G is terrible, D catches every fake, so D(G(z)) sits near 0. Look at log(1 − D(G(z))) there: it is nearly flat. The gradient reaching G through D's logit is proportional to D(G(z)) itself — near zero. So the generator gets almost no learning signal precisely when it is worst and needs the most. The fix, from the same 2014 paper: have G **maximise log D(G(z))** instead of minimising log(1 − D(G(z))). Same fixed point, same direction of improvement, but now the gradient is proportional to 1 − D(G(z)), which is *large* when G is bad and shrinks as G gets good. This is the **non-saturating** loss and it is what every real implementation uses. The numbers below make the gap concrete.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The vanishing gradient: original generator loss versus the non-saturating form',
      code: `import numpy as np

# D(G(z)) = sigmoid(s), so the gradient reaching G flows back through the logit s.
# saturating     G minimises log(1 - D)  ->  d/ds = -D      -> magnitude D
# non-saturating G maximises log D       ->  d/ds = 1 - D   -> magnitude 1 - D
d = np.array([0.01, 0.05, 0.10, 0.20, 0.35, 0.50])
print('D(G(z))   |grad| of log(1-D)   |grad| of log D    ratio')
for p in d:
    print('  %.2f            %8.4f           %8.4f    %6.1fx' % (p, p, 1 - p, (1 - p) / p))

s = np.log(d / (1 - d))                      # back to logits
h = 1e-6
sig = lambda t: 1.0 / (1.0 + np.exp(-t))
fd = lambda fn: (fn(s + h) - fn(s - h)) / (2 * h)
print()
print('finite-difference check, same logits:')
print('  d/ds log(1-D) =', np.round(fd(lambda t: np.log(1 - sig(t))), 4))
print('  d/ds log D    =', np.round(fd(lambda t: np.log(sig(t))), 4))

# ---- real output ----
# D(G(z))   |grad| of log(1-D)   |grad| of log D    ratio
#   0.01              0.0100             0.9900      99.0x
#   0.05              0.0500             0.9500      19.0x
#   0.10              0.1000             0.9000       9.0x
#   0.20              0.2000             0.8000       4.0x
#   0.35              0.3500             0.6500       1.9x
#   0.50              0.5000             0.5000       1.0x
#
# finite-difference check, same logits:
#   d/ds log(1-D) = [-0.01 -0.05 -0.1  -0.2  -0.35 -0.5 ]
#   d/ds log D    = [0.99 0.95 0.9  0.8  0.65 0.5 ]`,
      annotations: {
        6: 'Six discriminator verdicts on the generator\'s fakes. 0.01 = "obvious fake, G is bad"; 0.50 = "cannot tell, G has won".',
        9: 'Both gradient magnitudes at the same operating point, side by side, with their ratio. This one line is the entire argument.',
        11: 'Back to logits so the numeric check hits exactly the same six points.',
        14: 'Central difference. If the analytic magnitudes D and 1 - D are right, autodiff-free arithmetic must reproduce them.',
        22: 'G is at its worst here and the ORIGINAL loss hands it a gradient of 0.01 — a 99x smaller push than the non-saturating form. That is the vanishing gradient, in one row.',
        27: 'At D = 0.5 the two forms are identical. The trick costs nothing once training is healthy and rescues you when it is not.',
      },
    },
    {
      type: 'note',
      md: `**Mode collapse, and why no loss curve saves you.** *Mode collapse:* G discovers one output (or a handful) that reliably fools the current D and emits only that — a face model that draws one face, a digit model that only writes 3s. It is the mode-seeking failure from the KL discussion above, made concrete: the objective never punishes G for the modes it *ignores*, only for the ones it gets wrong. Every mitigation is a heuristic — minibatch discrimination, feature matching, unrolled discriminators, or moving to WGAN-GP whose critic value at least correlates with sample quality. *And there is no loss curve to read:* D's loss falling could mean D is winning or that G collapsed; G's loss falling could mean genuine progress or that D got lazy. Neither number tracks sample quality, and the "healthy" equilibrium is both losses sitting flat. That vacuum is precisely why FID and Inception Score exist — you need an **external metric** computed on generated samples against real ones, because the objective itself tells you nothing. FID/IS and the diffusion comparison are covered in the DL subject's generative-models module; the point here is *why* a separate metric was ever necessary.`,
    },
    {
      type: 'note',
      md: `**The three objectives in one place.** *Autoencoder* — minimise reconstruction error, nothing else. One network, one loss, trains like any supervised model. Gives you compression and denoising, not generation, because the latent space has holes between the training codes. *VAE* — reconstruction minus a KL regulariser on the latent. Still one stable gradient descent, still easy to train, and now samplable; you pay in blur, and β sets the exchange rate. *GAN* — no likelihood, no reconstruction, no reference image in the loss at all: two networks in a min-max game. Sharpest samples of the three and by a distance the hardest to train, with no convergence guarantee, mode collapse, and no trustworthy loss curve. The honest one-liner: **VAE trains easily and blurs; GAN trains badly and sharpens.** Diffusion later ate both by returning to a stable, likelihood-flavoured objective.`,
    },
    {
      type: 'intuition',
      title: 'BLEU: did you use the same words as the human?',
      md: `Machine translation needed an automatic score in 2002. BLEU was the compromise, and it never left.

- Take the candidate translation. Count how many of its n-grams appear in the reference(s). That is **n-gram precision**, computed for n = 1, 2, 3, 4 and geometrically averaged.
- Precision is *clipped*: if "the" appears 7 times in the candidate and twice in the reference, it counts twice. Otherwise "the the the the the" scores 1.0.
- Precision alone rewards being short — output one word you are sure of and precision is perfect. So BLEU multiplies by a **brevity penalty** that punishes candidates shorter than the reference.
- Range 0–1 (usually reported ×100). It is a *corpus-level* metric; per-sentence BLEU is noisy and often 0 because 4-grams rarely match.
- What it captures: surface overlap with a human-written answer. Genuinely useful when there is a narrow set of correct outputs.
- What it misses: meaning. A perfect paraphrase with different words scores near 0. A fluent sentence with the negation flipped scores nearly as well as the correct one. Word order beyond a 4-gram window is invisible.`,
    },
    {
      type: 'math',
      intro: 'BLEU written out — the brevity penalty is the half people forget.',
      latex: [
        '\\text{BLEU} = \\text{BP} \\cdot \\exp\\!\\left( \\sum_{n=1}^{4} w_n \\log p_n \\right), \\qquad w_n = \\tfrac{1}{4}',
        'p_n = \\frac{\\text{clipped matching } n\\text{-grams in candidate}}{\\text{total } n\\text{-grams in candidate}} \\qquad \\text{(precision)}',
        '\\text{BP} = \\begin{cases} 1 & c > r \\\\ e^{\\,1 - r/c} & c \\le r \\end{cases} \\quad c = \\text{candidate length},\\; r = \\text{reference length}',
      ],
    },
    {
      type: 'intuition',
      title: 'ROUGE: did you keep what mattered?',
      md: `Summarisation flips the question. A summary must not invent — but above all it must not *omit*.

- So ROUGE swaps the denominator: **matching n-grams divided by the n-grams in the reference**. That is recall, not precision.
- **ROUGE-1** — unigram overlap. Did the right words survive?
- **ROUGE-2** — bigram overlap. Did short phrases survive? This one correlates best with humans of the three.
- **ROUGE-L** — longest common subsequence between candidate and reference, as an F-measure. The subsequence need not be contiguous, so it rewards keeping content *in order* without committing to a fixed n.
- BLEU is precision-flavoured because a translation must not add. ROUGE is recall-flavoured because a summary must not drop. That one sentence is the whole difference.
- Same blind spot as BLEU, in the same place: it counts words, so a summary that is factually wrong but lexically similar scores well, and a correct abstractive summary in fresh words scores badly.`,
    },
    {
      type: 'math',
      intro: 'ROUGE-N and ROUGE-L. Note where the reference sits in each denominator.',
      latex: [
        '\\text{ROUGE-N} = \\frac{\\sum_{\\text{ref}} \\text{matching } n\\text{-grams}}{\\sum_{\\text{ref}} \\text{total } n\\text{-grams}} \\quad \\text{— denominator is the REFERENCE: recall}',
        'R_{lcs} = \\frac{\\mathrm{LCS}(X, Y)}{|Y|}, \\quad P_{lcs} = \\frac{\\mathrm{LCS}(X, Y)}{|X|}, \\quad \\text{ROUGE-L} = F_\\beta(P_{lcs}, R_{lcs})',
        '\\text{LCS = longest common subsequence: order-aware, gap-tolerant, no fixed } n.',
      ],
    },
    {
      type: 'note',
      md: `So why are two demonstrably weak metrics still in every paper and every CI pipeline? Because they are **cheap** (milliseconds, no GPU), **deterministic** (same input, same number, forever), and **comparable** (a 2016 result and a 2025 result on the same test set can be placed side by side). No neural metric has all three. The professional position is not "BLEU is bad, ignore it" — it is: use BLEU/ROUGE as a *regression alarm* that tells you something broke between builds, never as evidence that one system is better than another when the gap is small. A 0.4 BLEU improvement is noise dressed as progress. And never optimise them directly: a model tuned to maximise ROUGE learns to copy sentences verbatim from the source, which maximises overlap and destroys the summary.`,
    },
    {
      type: 'intuition',
      title: 'Modern eval: embeddings, judges, and humans',
      md: `Three layers sit above n-gram counting, each buying more validity at more cost.

- **Embedding-based metrics (BERTScore)**: instead of matching tokens exactly, match them by embedding similarity — "postponed" and "moved" now count as a partial hit. Fixes paraphrase blindness, still cannot check facts, and adds a model dependency to your metric.
- **LLM-as-judge**: hand a strong model the input, the output, and a rubric, and ask it to score or to pick a winner between two candidates. This is what actually correlates with human preference on open-ended tasks — the reason it took over so fast.
- **Human evaluation**: still the ground truth. Every other metric on this page is an attempt to approximate a human judgement cheaply. Slow, expensive, needs annotation guidelines and inter-annotator agreement — and it is the only thing that settles a real disagreement.
- The working hierarchy: automatic metrics gate every commit, judges gate every release candidate, humans gate the decisions that matter.`,
    },
    {
      type: 'note',
      md: `LLM-as-judge, honestly. **The wins:** it handles open-ended output, applies a rubric consistently, and costs cents instead of hours. **The failure modes, all measured and all real:** *position bias* — the same pair swapped can flip the verdict, the first option often wins; *verbosity bias* — longer, more confident answers score higher regardless of correctness; *self-preference* — a judge rates text from its own model family above equally good text from another; *cost and latency* at scale; and *non-determinism*, so your metric moves when nothing else did. **The mitigations, which are all cheap:** prefer **pairwise comparison** over absolute 1–10 scores (models are far better at "which is better" than at calibrated numbers); **randomise the order** and average both orderings, or discard the pair if the verdict flips; give an explicit **rubric** with concrete criteria instead of "rate the quality"; **pin the judge model version** and temperature and treat a judge upgrade as a metric change that invalidates historical numbers; and validate the judge against a few hundred human labels before trusting it. A judge you have never checked against humans is a vibe, not a metric.`,
    },
    {
      type: 'intuition',
      title: 'The evals that are actually about your product',
      md: `Generic quality scores rarely map to what breaks in production. Task-specific evals do.

- **Faithfulness / groundedness (RAG)**: is every claim in the answer supported by the retrieved context? Usually scored by decomposing the answer into claims and checking each against the sources. This — not fluency — is what makes a RAG system trustworthy.
- **Hallucination rate**: fraction of responses containing at least one unsupported or fabricated factual claim, measured on a fixed probe set.
- **Refusal rate**: how often the model declines. Watch it in both directions — over-refusal on benign requests is a product bug, under-refusal on harmful ones is a safety bug. A single number here hides both.
- Add retrieval metrics upstream (recall@k, MRR — the ranking family) because a generation eval cannot distinguish "the model lied" from "the retriever never found it".
- Each of these gets a full treatment in the GenAI subject. Here, just know they exist and that they beat BLEU for anything user-facing.`,
    },
    {
      type: 'intuition',
      title: 'Vision: IoU is how you define "correct" for a box',
      md: `A detector predicts a box. The truth is another box. They never match pixel-perfectly, so you need a rule.

- **IoU (Intersection over Union)** = area of overlap ÷ area of union. Perfect overlap = 1, no overlap = 0.
- Work one: prediction spans x 0→10, y 0→10 (area 100). Truth spans x 5→15, y 0→10 (area 100). Overlap is 5×10 = 50. Union = 100 + 100 − 50 = 150. **IoU = 50/150 = 0.33.**
- The union denominator is what makes it fair. Plain overlap area would reward drawing one enormous box over the whole image; union punishes exactly that.
- Now the important bit: **IoU is not the score, it is the threshold.** You pick a cutoff — conventionally **0.5** — and a prediction with IoU ≥ 0.5 against an unmatched ground-truth box becomes a TP; below it, a FP. Each ground-truth box unmatched at the end is a FN.
- That box counts as a false positive at 0.5 despite being a genuinely reasonable-looking detection. The threshold is a convention, not a law of nature — which is exactly why the field stopped trusting a single one.
- Once boxes are TP/FP/FN, you are back in confusion-matrix land and every metric you already know applies.`,
    },
    {
      type: 'math',
      intro: 'IoU, AP, mAP — and the notation everyone quotes without unpacking.',
      latex: [
        '\\mathrm{IoU}(A, B) = \\frac{|A \\cap B|}{|A \\cup B|} = \\frac{|A \\cap B|}{|A| + |B| - |A \\cap B|}',
        '\\mathrm{AP}_c = \\int_0^1 p(r)\\,dr \\;\\approx\\; \\text{area under the precision-recall curve for class } c',
        '\\mathrm{mAP} = \\frac{1}{C}\\sum_{c=1}^{C} \\mathrm{AP}_c, \\qquad \\mathrm{mAP@[.5{:}.95]} = \\frac{1}{10}\\sum_{\\tau \\in \\{.5,\\, .55,\\, \\dots,\\, .95\\}} \\mathrm{mAP}@\\tau',
        '\\mathrm{Dice} = \\frac{2|A \\cap B|}{|A| + |B|} = \\frac{2\\,\\mathrm{IoU}}{1 + \\mathrm{IoU}} \\quad \\text{— monotone in IoU, so they never disagree on ranking.}',
      ],
    },
    {
      type: 'intuition',
      title: 'mAP, and what mAP@[.5:.95] actually means',
      md: `Build it in three steps and the acronym stops being scary.

- Step 1 — **AP for one class**: sort that class's predictions by confidence, walk down the list marking each TP or FP by the IoU rule, and compute the area under the resulting precision-recall curve. One number, one class, all thresholds of confidence.
- Step 2 — **mAP**: average AP over all classes. The "m" is mean-over-classes. Every class counts equally, so 3 rare classes can sink a model that nails the 77 common ones — a deliberate choice, and one worth naming out loud.
- Step 3 — the COCO convention: do all of the above at **ten IoU thresholds**, 0.50, 0.55, 0.60, … 0.95, and average those ten numbers. That is **mAP@[.5:.95]**, sometimes just written "mAP" or "AP" in COCO tables.
- Say it plainly: *"the model's mean average precision, averaged over ten localisation strictness levels from lenient to near-pixel-perfect."*
- Consequence: mAP@[.5:.95] is always much lower than mAP@0.5 — 0.35 versus 0.60 is a normal pair, not a bug. Comparing a paper's 0.35 against your 0.58 without checking which convention each used is the classic embarrassment.
- The gap between the two is itself diagnostic: a big gap means you are finding the objects but drawing sloppy boxes.`,
    },
    {
      type: 'note',
      md: `Two loose ends. **NMS (non-maximum suppression):** a detector fires many overlapping boxes on the same object; NMS keeps the highest-confidence box and deletes every other box overlapping it above an IoU cutoff (typically 0.5–0.7). Without it, nine of ten correct detections would be counted as false positives and precision would collapse — matching is one-to-one, so duplicates are punished. **Segmentation:** the same idea moves from boxes to pixels. Pixel IoU (also called the Jaccard index, and mIoU when averaged over classes) and the **Dice coefficient** are the standard pair; Dice is a monotone transform of IoU, so they rank models identically, but Dice is gentler on small objects and is what medical-imaging papers report — and its soft version is differentiable, so unlike everything else in this module, Dice is also used as a *loss*.`,
    },
    {
      type: 'intuition',
      title: 'The sentence that makes you sound senior',
      md: `Every metric here is a proxy. State what yours proxies and where it breaks, and you are already ahead of the room.

- Perplexity proxies "assigns probability to real text" — and is not comparable across tokenizers.
- BLEU and ROUGE proxy "overlaps with one human's wording" — and cannot see meaning.
- LLM-judge scores proxy "a human would prefer this" — and inherit the judge's biases.
- IoU-based metrics proxy "found and localised the object" — under a threshold someone chose.
- So report the proxy *with* its failure mode, pair one cheap automatic metric with one expensive validated one, and hold a small human-labelled set as the anchor everything else is calibrated against.
- The senior line: *"No single number is trustworthy here, so I run a cheap deterministic metric per commit, a pinned LLM judge per release, and a human-labelled gold set that validates the judge."*`,
    },
  ],
  quiz: [
    {
      question: 'Cross-entropy H(P, Q) = H(P) + KL(P || Q). What follows for training?',
      options: [
        {
          text: 'Cross-entropy and KL are unrelated objectives that happen to share a formula',
          explanation: 'They differ by exactly H(P), the data entropy — that is a very close relationship, not an unrelated one.',
        },
        {
          text: 'Since the data distribution P is fixed, H(P) is a constant, so minimising cross-entropy is exactly minimising KL(P || Q)',
          explanation: 'Correct. That identity is why cross-entropy is THE default loss: it is the computable form of "make my distribution match the data".',
        },
        {
          text: 'Minimising cross-entropy also drives H(P) to zero',
          explanation: 'H(P) is a property of the data, not of the model. No amount of training changes it — which is why loss bottoms out near H(P), not at 0.',
        },
      ],
      correct: 1,
    },
    {
      question: 'Which statement about KL divergence is true?',
      options: [
        { text: 'It is a distance metric, so KL(P||Q) = KL(Q||P)', explanation: 'Both halves are wrong. It is asymmetric and violates the triangle inequality — never call it a distance.' },
        { text: 'It can be negative when Q is much broader than P', explanation: 'KL is non-negative for any valid P and Q (Gibbs inequality). Breadth changes the magnitude, never the sign.' },
        {
          text: 'It is non-negative, zero only when P = Q, and asymmetric',
          explanation: 'Correct — the three facts to state. The code showed 0.6323 vs 0.9404 on the same pair, and 0.0000 for KL(P||P).',
        },
      ],
      correct: 2,
    },
    {
      question: 'Model A reports perplexity 12 with a 32k BPE vocabulary; Model B reports 15 with a character-level tokenizer. Which is better?',
      options: [
        {
          text: 'Undetermined — perplexity is per token, so different tokenizations produce numbers that are not comparable',
          explanation: 'Correct. Character models spread the same text over far more, far easier predictions. Re-evaluate both under identical tokenization, or compare bits-per-character.',
        },
        { text: 'Model A, 12 < 15', explanation: 'That comparison assumes both numbers count the same units. They do not — the tokenizer defines the unit.' },
        { text: 'Model B, because character-level modelling is harder', explanation: 'Difficulty of the task is not the issue; the incomparability of per-token averages is. You cannot rank them from these numbers at all.' },
      ],
      correct: 0,
    },
    {
      question: 'You raise β well above 1 in a β-VAE. Samples get blurrier, but interpolating between two latent codes now produces smooth, plausible images. Why?',
      options: [
        {
          text: 'β scales the KL term, so each example\'s latent posterior is pushed harder toward N(0, I) — a cleaner, more continuous, more samplable latent space bought with reconstruction quality',
          explanation: 'Correct. ELBO = reconstruction − β·KL. Raising β raises the price of straying from the prior, so the encoder gives up detail to comply. Push it too far and you get posterior collapse: the decoder stops using z at all.',
        },
        {
          text: 'β scales the reconstruction term, so the decoder is trained harder and overfits to sharp detail',
          explanation: 'Backwards on both counts. β multiplies the KL regulariser, not the reconstruction term, and the observed effect is blurrier output — the opposite of a decoder trained harder on detail.',
        },
        {
          text: 'β is the encoder\'s learning rate, so a larger value simply trains the encoder faster',
          explanation: 'β is a weight inside the objective, not an optimiser setting. It changes what the optimum IS, not how quickly you reach it — which is why it trades one property for another rather than improving both.',
        },
      ],
      correct: 0,
    },
    {
      question: 'Early in GAN training the discriminator rejects every fake, so D(G(z)) ≈ 0.01. Under the ORIGINAL min-max generator loss, what happens, and what is the standard fix?',
      options: [
        {
          text: 'The gradient is enormous, so the generator overshoots — lower its learning rate',
          explanation: 'The sign of the problem is backwards. The gradient reaching G through the discriminator\'s logit is proportional to D(G(z)) itself, which is 0.01 here — vanishingly small, not enormous.',
        },
        {
          text: 'The gradient reaching G is proportional to D(G(z)) ≈ 0.01, so it nearly vanishes; the fix is the non-saturating form where G maximises log D(G(z)), giving a gradient proportional to 1 − D(G(z)) ≈ 0.99',
          explanation: 'Correct, and it is the cruellest possible timing: the generator gets no signal exactly when it is worst. Same fixed point, 99x the gradient — which is why every real implementation uses the non-saturating form.',
        },
        {
          text: 'Nothing — the two generator losses are equivalent, so the gradient magnitude is identical either way',
          explanation: 'They share a fixed point, not a gradient. The two magnitudes coincide only at D = 0.5; at D = 0.01 the run above measured 0.01 versus 0.99, a 99x gap.',
        },
      ],
      correct: 1,
    },
    {
      question: 'What is the core structural difference between BLEU and ROUGE?',
      options: [
        { text: 'BLEU uses n-grams, ROUGE uses embeddings', explanation: 'Both are n-gram overlap metrics. Embedding-based scoring is BERTScore, a different family entirely.' },
        { text: 'BLEU is for summarisation, ROUGE for translation', explanation: 'Exactly backwards — BLEU came from machine translation, ROUGE from summarisation.' },
        {
          text: 'BLEU divides matches by n-grams in the candidate (precision); ROUGE divides by n-grams in the reference (recall)',
          explanation: 'Correct, and the reason is task shape: a translation must not add, a summary must not omit. BLEU adds a brevity penalty precisely because precision alone rewards being short.',
        },
      ],
      correct: 2,
    },
    {
      question: 'A predicted box covers x 0→10, y 0→10; the true box covers x 5→15, y 0→10. At the standard threshold, how is this prediction counted?',
      options: [
        { text: 'True positive — the boxes clearly overlap', explanation: 'Overlap is not the rule. IoU = 50/150 = 0.33, which is below 0.5, so it does not qualify.' },
        {
          text: 'False positive — IoU = 50/150 = 0.33, below the 0.5 threshold',
          explanation: 'Correct. Overlap 50, union 100 + 100 − 50 = 150. And the ground-truth box, left unmatched, also counts as a false negative.',
        },
        { text: 'Partial credit of 0.33 toward precision', explanation: 'There is no partial credit. IoU is a threshold that produces a hard TP/FP decision, not a score that gets averaged in.' },
      ],
      correct: 1,
    },
    {
      question: 'A COCO table reports mAP@[.5:.95] = 0.42. What exactly is that number?',
      options: [
        {
          text: 'Average precision per class, averaged over classes, then averaged again over the ten IoU thresholds 0.50, 0.55, … 0.95',
          explanation: 'Correct. Two averages over classes and localisation strictness. It is always well below the same model’s mAP@0.5.',
        },
        { text: 'The fraction of objects detected with confidence between 0.5 and 0.95', explanation: 'The range refers to IoU thresholds (localisation strictness), not to confidence scores.' },
        { text: 'mAP measured on the 50th to 95th percentile of the hardest images', explanation: 'Nothing here is about image difficulty percentiles — .5:.95 is the IoU sweep.' },
      ],
      correct: 0,
    },
    {
      question: 'Your LLM judge consistently prefers whichever answer is longer, even when the shorter one is correct. What is this, and what is the cheapest fix?',
      options: [
        { text: 'Position bias — randomise the order of the two candidates', explanation: 'Order randomisation fixes position bias, which is a real and separate problem. Length preference survives it untouched.' },
        { text: 'Self-preference — switch to a judge from a different model family', explanation: 'Self-preference is favouring your own family’s outputs. Changing families does not stop verbosity bias; most judges have it.' },
        {
          text: 'Verbosity bias — put explicit length and conciseness criteria in the rubric and compare pairs rather than scoring absolutely',
          explanation: 'Correct. It is a known, measured bias. A concrete rubric plus pairwise comparison is the cheap mitigation; validating the judge against human labels is the check that proves it worked.',
        },
      ],
      correct: 2,
    },
    {
      question: 'A language model scores perplexity 1.0 on your held-out set. Most likely explanation?',
      options: [
        { text: 'A genuinely perfect model — celebrate', explanation: 'Perplexity 1.0 means probability 1.0 for every single token. Natural language has irreducible entropy; this is not achievable honestly.' },
        {
          text: 'Data leakage — the model has memorised the evaluation text',
          explanation: 'Correct. Perplexity 1.0 = zero surprise = the model already knows the text. Check the eval set against the training corpus before checking anything else.',
        },
        { text: 'The vocabulary is too small', explanation: 'A small vocabulary lowers perplexity somewhat, but never to the floor of 1.0 — that requires certainty on every token.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Explain KL divergence and why calling it a "distance" is wrong.',
      answer:
        'KL(P || Q) = Σ P(x) log(P(x)/Q(x)) — the expected number of extra bits you pay per event by encoding data that really comes from P using a code built for Q. It is non-negative (Gibbs) and zero only when P = Q. It is not a distance for two reasons: it is asymmetric, KL(P||Q) ≠ KL(Q||P) — on a peaked P versus a uniform Q over 4 outcomes the two directions come out 0.63 and 0.94 bits — and it violates the triangle inequality. That asymmetry is not a defect to apologise for, it is a design choice you exploit: forward KL, the expectation over P, punishes Q for putting no mass where P has some, so Q is mass-covering and blurs across modes (this is what maximum likelihood does); reverse KL, the expectation over Q, only punishes Q where Q itself has mass, so Q is mode-seeking and collapses onto one peak (this is what variational objectives do). If you need a symmetric quantity, use Jensen-Shannon divergence, whose square root is a genuine metric.',
      isCaseBased: false,
    },
    {
      question: 'Why do we train classifiers and language models with cross-entropy rather than directly with KL divergence?',
      answer:
        'Because they are the same optimisation. H(P, Q) = H(P) + KL(P || Q), and during training P is the fixed empirical data distribution, so H(P) is a constant with zero gradient — minimising cross-entropy IS minimising KL(P || Q). Cross-entropy is just the form you can actually compute: it needs only log Q evaluated at the observed labels, whereas writing KL explicitly requires P(x) terms that cancel out anyway. Two things worth adding: the loss floor is not zero but roughly H(P), the data\'s own entropy, which is why a well-trained model plateaus at a positive loss and why you should not chase zero; and the same identity is why perplexity, exp of the average cross-entropy, is a KL-based quality measure in disguise.',
      isCaseBased: false,
    },
    {
      question: 'Case: a teammate reports "our new LM hits perplexity 8.2 versus the 11.5 baseline — a 29% improvement, ship it." What do you check before agreeing?',
      answer:
        'Four checks, in order. (1) Tokenizer: if the new model changed vocabulary or tokenization at all, the numbers count different units and the comparison is void — force a re-evaluation under identical tokenization, or compare bits-per-character. (2) Evaluation corpus and protocol: same held-out set, same context-window handling, same treatment of document boundaries and special tokens? Any of these moves perplexity by more than the claimed gain. (3) Contamination: was the eval text in the new model\'s training data? Suspiciously low perplexity is a leakage signal before it is a quality signal. (4) Relevance: perplexity measures probability assigned to reference text — it says nothing about instruction-following, factuality, or safety. Plenty of models with better perplexity produce worse assistant behaviour. The business point: perplexity is a valid internal tracking signal across checkpoints of one model on one corpus, and nearly useless as a cross-model claim. I would gate the ship decision on a task eval and an LLM-judge run against the baseline, with perplexity as supporting evidence only.',
      isCaseBased: true,
    },
    {
      question: 'What does BLEU capture, what does it miss, and why is it still everywhere?',
      answer:
        'It captures clipped n-gram precision (n = 1–4, geometric mean) against one or more references, multiplied by a brevity penalty that stops a model from gaming precision by emitting three confident words. So it measures surface overlap with a human answer. It misses meaning entirely: a perfect paraphrase using different words scores near zero, a sentence with the negation flipped scores nearly as high as the correct one, and word order beyond a 4-gram window is invisible. It is corpus-level — sentence BLEU is very noisy since 4-grams rarely match. It survives because it is cheap, deterministic and comparable across a decade of papers on the same test set, which no neural metric offers. Professional usage: a regression alarm between builds, never proof that system A beats system B on a small gap, and never a training objective — optimising BLEU or ROUGE directly teaches models to copy source text verbatim.',
      isCaseBased: false,
    },
    {
      question: 'BLEU versus ROUGE — why did the field need both, and what are ROUGE-1, ROUGE-2 and ROUGE-L?',
      answer:
        'The split is precision versus recall, driven by task shape. A translation must not add content, so BLEU divides matches by n-grams in the candidate (precision) and bolts on a brevity penalty to stop short outputs from cheating. A summary must not drop content, so ROUGE divides matches by n-grams in the reference (recall). ROUGE-1 is unigram overlap — did the right words survive; ROUGE-2 is bigram overlap and correlates best with human judgement of the three; ROUGE-L uses the longest common subsequence as an F-measure, so it rewards preserving content in the right order without committing to a fixed n and tolerates gaps. Both share the fatal limitation: they count strings, so a factually wrong summary made of the right words scores well and a correct abstractive summary in fresh words scores badly. That is why summarisation evaluation has largely moved to faithfulness checks and LLM judges, with ROUGE kept as the cheap regression tripwire.',
      isCaseBased: false,
    },
    {
      question: 'Case: you own a customer-support summarisation feature. Design its evaluation, end to end, and say what each layer costs.',
      answer:
        'Start from the failure that costs money: a summary that invents a refund promise or drops the customer\'s actual issue. So the primary metric is faithfulness — decompose each summary into atomic claims and check each against the source transcript, reporting the unsupported-claim rate — plus a coverage check on the handful of fields agents actually need (issue, action taken, next step). Layer it by cost: per-commit, ROUGE-2/ROUGE-L against a small frozen reference set purely as a regression tripwire, milliseconds and free, and I would never report those numbers as quality; per-release-candidate, a pinned-version LLM judge running pairwise comparisons against the current production model with a written rubric, randomised order, both orderings averaged — cents per example, hours to run; per-quarter or on any judge upgrade, 300–500 human-labelled examples with an annotation guideline and inter-annotator agreement, used to validate that the judge still tracks human preference. In production, add operational signals no offline metric captures: agent edit rate on the generated summary, and thumbs-down rate. The tradeoff to name: the judge is the only layer that is both affordable and correlated with what users want, and it is the layer most likely to silently drift — hence pinning the version and treating a judge upgrade as invalidating historical numbers.',
      isCaseBased: true,
    },
    {
      question: 'Sell me on LLM-as-judge, then attack it.',
      answer:
        'The case for: on open-ended generation there is no reference answer to overlap with, and a strong model given a rubric correlates with human preference far better than any n-gram metric, at cents per example instead of hours of annotator time — that is why it went from a hack to standard practice in about a year. The case against, all measured: position bias (swap the two candidates and verdicts flip a meaningful fraction of the time, with the first slot favoured); verbosity bias (longer, more confident answers win regardless of correctness); self-preference (a judge scores its own family\'s outputs higher); non-determinism, so your metric moves when nothing else did; plus cost and latency at scale. Mitigations, all cheap: pairwise comparison rather than absolute 1–10 scores, since models are much better at ranking than at calibrated scoring; randomise order and evaluate both directions, discarding or flagging pairs where the verdict flips; a concrete rubric instead of "rate the quality"; pin the judge model version and temperature and treat any upgrade as a metric change that invalidates history; and above all validate against a few hundred human labels and report the agreement rate. A judge never checked against humans is a vibe, not a metric.',
      isCaseBased: false,
    },
    {
      question: 'Explain IoU and mAP@[.5:.95] to a product manager who asked why detection accuracy is "only 42%".',
      answer:
        'IoU is how we decide whether a predicted box counts as correct: the overlap area between the predicted and true box divided by their combined area. Perfect match is 1.0, no overlap is 0. We pick a cutoff — historically 0.5 — and anything above it counts as a hit. mAP is then ordinary precision/recall machinery on top: for each object class we sweep the confidence threshold and take the area under its precision-recall curve (average precision), then average across classes. The 42% is mAP@[.5:.95], which does all of that at ten different IoU cutoffs from 0.50 up to 0.95 and averages the ten. So it is not "42% of objects found" — it is an average that includes near-pixel-perfect strictness levels almost nothing passes. The same model is probably around 60–65% at the lenient 0.5 cutoff. The point for the PM: which convention a number uses matters more than the number, so we always state it, and if the business only needs "roughly where is the object", mAP@0.5 is the honest metric to track.',
      isCaseBased: false,
    },
    {
      question: 'Case: your detector scores mAP@0.5 = 0.62 but mAP@[.5:.95] = 0.31. What does the gap tell you, and what do you do about it?',
      answer:
        'The gap is a localisation diagnosis: the model finds the objects (good performance at the lenient threshold) but draws sloppy boxes that fall apart as strictness rises. Classification and recall are fine; box regression is not. Concrete moves, roughly in order of cost: check the annotations first, because loose or inconsistent human boxes cap achievable IoU no matter what the model does — re-measure agreement on a sample before touching the model; then switch the localisation loss from smooth-L1 to an IoU-family loss (GIoU/DIoU/CIoU) that optimises the thing you are measuring; raise input resolution or add higher-resolution feature levels, since small objects dominate the strict-threshold losses; and re-tune the NMS IoU cutoff, since aggressive suppression can delete a well-localised box in favour of a higher-confidence sloppy one. Also break mAP down per class and per object size before doing any of this — the gap is usually concentrated in small objects or one or two classes, and fixing the aggregate blindly wastes a cycle. Business framing: if the product only needs to know an object is present (counting, alerting), the strict metric may be the wrong thing to optimise at all; if a robot has to grasp the object, it is the only metric that matters.',
      isCaseBased: true,
    },
    {
      question: 'Where does KL divergence show up in modern GenAI training, and what job does it do in each place?',
      answer:
        'Four places, same quantity, different jobs. (1) Ordinary training: minimising cross-entropy is minimising KL between the data distribution and the model — the base case everything else generalises. (2) VAEs: the ELBO is reconstruction quality minus KL(q(z|x) || p(z)), which pulls each example\'s latent posterior toward the N(0, I) prior so the latent space is continuous and samplable; weight that term too heavily and you get posterior collapse, where the decoder ignores z entirely. (3) Knowledge distillation: the student minimises KL between the teacher\'s temperature-softened output distribution and its own, so it learns the teacher\'s relative beliefs over wrong answers ("cat 0.7, dog 0.2, fox 0.1"), which carries far more information per example than a hard label — that is why distillation works with less data. (4) RLHF: the PPO objective is reward minus β·KL(policy || reference model), a leash keeping the tuned policy near the SFT model; without it the policy finds degenerate text that maximises the reward model and is useless to humans, and β is the knob trading alignment strength against capability drift. Naming all four shows the concept is one thing, not four coincidences.',
      isCaseBased: false,
    },
    {
      question: 'What is NMS, and what would happen to your detection metrics without it?',
      answer:
        'Non-maximum suppression: a detector fires many overlapping boxes for the same object, so per class you sort by confidence, keep the top box, delete every remaining box whose IoU with it exceeds a cutoff (typically 0.5–0.7), and repeat. Without it, matching is one-to-one — the first box to match a ground-truth object claims it, and every duplicate becomes a false positive — so precision would collapse and mAP with it, on a model whose actual detections were correct. It matters as a tuning knob too: too aggressive a cutoff deletes genuinely separate objects in crowded scenes (hurting recall), too lenient leaves duplicates (hurting precision), and in a strict mAP@[.5:.95] regime it can keep a high-confidence sloppy box over a better-localised lower-confidence one. Worth naming the alternatives: Soft-NMS decays neighbouring scores instead of deleting, and DETR-style set-prediction models drop NMS entirely by learning one-to-one matching in the loss.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'KL divergence in one line', back: 'KL(P||Q) = Σ P log(P/Q) — the EXTRA bits you pay encoding data from P with a code built for Q. ≥ 0, zero iff P = Q.' },
    { front: 'KL asymmetry: why it is not a distance, and why that is useful', back: 'KL(P||Q) ≠ KL(Q||P), no triangle inequality (need symmetry → Jensen-Shannon). Forward KL = mass-covering, blurs across modes (MLE). Reverse KL = mode-seeking, collapses to one peak (variational).' },
    { front: 'Cross-entropy = ?', back: 'H(P, Q) = H(P) + KL(P||Q). P is fixed in training, so minimising cross-entropy IS minimising KL. Loss floor ≈ H(P), not 0.' },
    { front: 'KL in the wild (3 places)', back: 'VAE ELBO: pull posterior to the prior. Distillation: match the teacher’s softened distribution. RLHF: β·KL leash against the reference model.' },
    { front: 'ELBO — the two terms', back: 'ELBO = E_q[log p(x|z)] − KL(q(z|x) || p(z)). Term 1: decode z back to x (reconstruction). Term 2: keep the encoder\'s latent near N(0, I) so the space is continuous and samplable. It is a LOWER BOUND on the intractable log p(x); the gap equals KL(q || true posterior). β-VAE scales term 2: higher β = cleaner latent, blurrier output. Failure: posterior collapse — KL wins, decoder ignores z.' },
    { front: 'GAN non-saturating trick — why', back: 'Original: G minimises log(1 − D(G(z))); gradient through D\'s logit is proportional to D(G(z)), so it VANISHES exactly when G is bad (D(G(z))≈0.01 → grad 0.01). Fix: G maximises log D(G(z)); gradient is proportional to 1 − D(G(z)) ≈ 0.99. Same fixed point, 99x the signal when you need it. Identical at D = 0.5.' },
    { front: 'Why MSE reconstruction gives blurry images', back: 'Under squared error the optimal output is the CONDITIONAL MEAN of all plausible reconstructions — hedging beats committing, because a sharp guess landing slightly wrong is penalised quadratically twice. The average of many sharp images is a blurry image. Same mass-covering behaviour as forward KL, in pixel space. GANs and diffusion sidestep it by not averaging.' },
    { front: 'Perplexity', back: 'exp(average negative log-likelihood per token) = exp(cross-entropy). PPL = N means "as confused as picking uniformly among N tokens". Lower better, floor 1.0.' },
    { front: 'The perplexity comparability trap', back: 'It is per TOKEN and per corpus — different tokenizer or eval set = incomparable number. Valid across your own checkpoints only. Bits-per-character avoids it.' },
    { front: 'BLEU vs ROUGE — and why weak metrics survive', back: 'BLEU: clipped n-gram PRECISION (candidate denominator) × brevity penalty — translation must not add. ROUGE: n-gram RECALL (reference denominator) — summary must not omit; ROUGE-L uses LCS. Both survive because they are cheap, deterministic and comparable across years: regression alarms, never proof of superiority, never a training objective.' },
    { front: 'LLM-as-judge: risks and fixes', back: 'Position bias, verbosity bias, self-preference, cost, non-determinism → pairwise comparison, randomised order, explicit rubric, pinned judge version, validated against human labels.' },
    { front: 'IoU', back: 'overlap area ÷ union area. A THRESHOLD (conventionally 0.5) that turns a box into TP/FP, not a score. 10×10 box vs one shifted 5 right → 50/150 = 0.33 → false positive.' },
    { front: 'mAP@[.5:.95]', back: 'AP per class (area under its PR curve), averaged over classes, then averaged over IoU thresholds 0.50→0.95 in steps of 0.05. Always far below mAP@0.5; a big gap means sloppy localisation.' },
  ],
  mindmapMarkdown: `- GenAI & Vision Metrics
  - The problem
    - no confusion-matrix cell for a paragraph
    - three moves: score probabilities / score vs reference / define "close enough"
  - KL divergence
    - extra bits for using Q when truth is P
    - Σ P log(P/Q)
    - ≥ 0, zero iff P = Q
    - asymmetric → NOT a distance
    - forward = mass-covering (MLE, blurry)
    - reverse = mode-seeking (variational, sharp)
    - cross-entropy = H(P) + KL
    - so minimising CE = minimising KL
    - loss floor ≈ H(P)
    - shows up: VAE ELBO, distillation, RLHF β·KL leash
  - Perplexity
    - exp(avg negative log-likelihood per token)
    - "as confused as choosing among N"
    - lower better, floor 1.0 (1.0 = leakage)
    - tail-sensitive: one shocked token doubles it
    - trap: depends on TOKENIZER and corpus
    - cross-model quotes are not portable
    - bits-per-character sidesteps it
  - Generative-model objectives
    - autoencoder: reconstruction loss only
    - MSE for continuous data, per-pixel BCE for [0,1]
    - bottleneck is what stops the identity function
    - pixel MSE = conditional mean of plausible outputs -> BLUR
    - VAE: ELBO = E_q[log p(x|z)] - KL(q(z|x) || p(z))
    - term 1 reconstruct, term 2 keep latent near N(0, I)
    - lower bound on intractable log p(x); gap = KL to true posterior
    - beta-VAE knob: higher beta = cleaner latent, worse reconstruction
    - posterior collapse: KL wins, decoder ignores z
    - GAN: min_G max_D E[log D(x)] + E[log(1 - D(G(z)))]
    - D maximises (real vs fake), G minimises (fool D)
    - non-saturating trick: G maximises log D(G(z))
    - gradient D vs 1-D: 0.01 vs 0.99 at D=0.01, 99x
    - mode collapse; no readable loss curve
    - hence FID / IS as EXTERNAL metrics
    - easy to train: AE, VAE (blurry). hard: GAN (sharp)
  - Text vs reference
    - BLEU: clipped n-gram precision + brevity penalty
    - misses meaning, paraphrase, long-range order
    - ROUGE: recall-oriented overlap
    - ROUGE-1 / ROUGE-2 / ROUGE-L (LCS)
    - both survive: cheap, deterministic, comparable
    - use as regression alarm, never as objective
  - Modern eval
    - BERTScore: embedding similarity, fixes paraphrase
    - LLM-as-judge: best human correlation on open-ended
    - risks: position, verbosity, self-preference, cost, non-determinism
    - fixes: pairwise, randomised order, rubric, pinned version
    - human eval = the ground truth everything approximates
  - Task-specific GenAI evals
    - faithfulness / groundedness (RAG)
    - hallucination rate
    - refusal rate (both directions)
  - Computer vision
    - IoU = intersection / union
    - threshold (0.5), not a score
    - 50/150 = 0.33 → false positive
    - AP = area under PR curve per class
    - mAP = mean AP over classes
    - mAP@[.5:.95] = averaged over 10 IoU thresholds
    - gap vs mAP@0.5 = sloppy localisation
    - NMS kills duplicate boxes → saves precision
    - segmentation: pixel IoU / mIoU, Dice
  - Senior framing
    - every metric is a proxy — name its failure mode
    - cheap metric per commit, judge per release, humans as anchor`,
}

export default m
