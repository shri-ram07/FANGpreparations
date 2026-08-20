import type { Module } from '../types'

const m: Module = {
  id: 'dl-l3-generative-models',
  subjectId: 'dl',
  level: 3,
  title: 'Generative Models: Autoencoders, VAEs, GANs & Diffusion',
  whyItMatters:
    'Everything that makes something new — Midjourney, Sora, Stable Diffusion — is one of the four models in this module, and the modern ones are two of them stacked. Interviewers ask for the reparameterization trick by name, they ask why GANs collapse, and they ask why diffusion won. Four ideas, one sitting, and the entire generative stack stops being magic.',
  estMinutes: 60,
  sections: [
    {
      type: 'intuition',
      title: 'Two ways to look at data',
      md: `A bouncer checks IDs at a club door. A forger makes IDs in a basement. Both know exactly what a real ID looks like — only one of them can produce a new one.

- **Discriminative** models learn **p(y | x)**: given this input, which label? That is every classifier you have built so far.
- They only need the **boundary** between classes. Enough to judge, useless for making.
- **Generative** models learn **p(x)** — the shape of the data itself: what a plausible face, sentence or molecule looks like.
- Once you have p(x) you can **sample** from it. That one verb is the whole subject.
- The test for which one you are holding: *can it produce a brand-new example that was never in the training set?*
- Four routes to that, oldest to newest: autoencoder → VAE → GAN → diffusion.`,
    },
    {
      type: 'intuition',
      title: 'Autoencoder: squeeze, then rebuild',
      md: `Describe a photo to a friend over the phone in ten words, then have them redraw it. Whatever survives those ten words is what actually mattered.

- An **autoencoder** is two networks glued back to back. The **encoder** squeezes input x into a small vector z; the **decoder** expands z back into a reconstruction x̂.
- z is the **bottleneck** (the "latent code"), deliberately much smaller than x. 784 pixels in → 32 numbers → 784 pixels out.
- Loss = **reconstruction error**, usually MSE between x and x̂. That is the entire objective.
- The label IS the input. Nobody annotated anything — this is **self-supervised** learning, and it is why autoencoders can train on unlimited unlabeled data.
- The narrowness does the teaching: you cannot store 784 numbers in 32, so the network is forced to find structure instead of copying.`,
    },
    {
      type: 'note',
      md: `Three jobs autoencoders are genuinely good at, none of them "generate images". **Dimensionality reduction:** an autoencoder with linear layers and MSE learns essentially the same subspace as PCA — so think of it as *nonlinear PCA*, able to unroll curved manifolds that PCA's straight axes cannot (see the ML L3 module, *PCA, t-SNE & Anomaly Detection*, for the linear original). **Denoising autoencoder:** corrupt the input, ask for the clean version back. The bottleneck can no longer copy, so it must learn what the data really looks like — and this idea comes back at the end of this module wearing a different hat. **Anomaly detection:** train only on normal data, then score new inputs by reconstruction error. Normal things rebuild well; a fraudulent transaction or a cracked part rebuilds badly, because the decoder never learned that shape. Same ML L3 cross-reference for the thresholding discipline that decides *how* bad is bad.`,
    },
    {
      type: 'intuition',
      title: 'Why a plain autoencoder is a terrible generator',
      md: `You now own a decoder that turns 32 numbers into an image. So type in 32 random numbers and get a free image? No. You get garbage.

- The decoder was only ever shown the exact z values the encoder produced. Nothing else was ever asked of it.
- Those z values sit in scattered clumps with **holes** between them — vast regions of latent space no training example ever landed in.
- A random draw almost certainly lands in a hole. The decoder has no idea what lives there and emits noise.
- Walk in a straight line from the z of a "3" to the z of an "8" and the midpoints are usually not digits at all.
- None of this is a bug. The loss asked for good reconstruction of each point, and got exactly that.
- What generation actually needs: a latent space that is **continuous** (nearby z decode to similar things) and **complete** (every z decodes to something plausible).`,
    },
    {
      type: 'intuition',
      title: 'VAE: encode a cloud, not a point',
      md: `Instead of pinning each photo to one dot on a map, give it a fuzzy circle. Circles overlap, and a map made of overlapping circles has no gaps.

- The encoder now outputs **two** vectors: a mean **μ** and a standard deviation **σ**. Together they define a small Gaussian — that input's cloud.
- Each training step draws a random z from that cloud. So the decoder must make *every* point in the cloud decode sensibly → **continuity**.
- Second ingredient: a **KL term** that pulls every cloud toward the standard normal N(0, I). Clouds get centred and packed, no far-flung islands → **completeness**.
- Now sampling works: draw z ~ N(0, I), run the decoder, get a new image. That is the entire reason VAEs exist.
- One sentence: *the autoencoder learns where each input goes; the VAE learns where everything goes, and leaves no gaps.*`,
    },
    {
      type: 'math',
      intro:
        'One line of theory, then the two terms you actually code. q(z|x) is the encoder\'s cloud, p(z) is the N(0, I) prior, and β is the knob weighting the second term. The ELBO (evidence lower bound) is what a VAE really maximizes — see the Metrics L3 module for KL divergence itself.',
      latex: [
        '\\log p(x) \\;\\ge\\; \\underbrace{\\mathbb{E}_{q(z|x)}\\big[\\log p(x|z)\\big]}_{\\text{reconstruction}} \\;-\\; \\underbrace{D_{KL}\\big(q(z|x)\\,\\|\\,p(z)\\big)}_{\\text{keep the space packed}} \\;=\\; \\text{ELBO}',
        '\\mathcal{L}_{\\text{VAE}} = \\underbrace{\\|x - \\hat{x}\\|^2}_{\\text{reconstruction}} \\;+\\; \\beta \\underbrace{\\left(-\\tfrac{1}{2}\\sum_{j=1}^{d}\\left(1 + \\log \\sigma_j^2 - \\mu_j^2 - \\sigma_j^2\\right)\\right)}_{\\text{KL to } \\mathcal{N}(0,\\,I),\\ \\text{closed form}}',
        '\\text{Maximize the ELBO} \\iff \\text{minimize } \\mathcal{L}_{\\text{VAE}}. \\quad \\text{The KL term is } 0 \\text{ exactly when } \\mu = 0 \\text{ and } \\sigma = 1.',
      ],
    },
    {
      type: 'intuition',
      title: 'The two losses, and their tug-of-war',
      md: `- **Reconstruction loss** wants each cloud tiny and far from every other cloud — that is how you rebuild an input perfectly. Let it win alone and you have rebuilt the plain autoencoder, holes included.
- **KL loss** wants every cloud to be exactly N(0, I) — same centre, unit width. Let it win alone and every input encodes identically; z carries no information and the decoder ignores it.
- Training is that fight. A good latent space sits at the truce: clouds overlapping just enough to fill the space, separated just enough to stay distinguishable.
- Turn β up (that is **β-VAE**) → more disentangled, more blurry. Turn it down → sharper, holier.
- Set β to exactly 0 and you get the plain autoencoder back. That is the cleanest way to remember what KL buys.
- The named failure when KL wins: **posterior collapse** — KL ≈ 0, the latent is pure noise, and the decoder generates the dataset average regardless of z.`,
    },
    {
      type: 'intuition',
      title: 'The reparameterization trick',
      md: `Sampling is a wall for backprop. "How would the dice roll have changed if μ were slightly larger?" has no answer — a random draw has no derivative.

- **Broken version:** draw z ~ N(μ, σ²) directly. μ and σ walk into a random number generator and vanish. No expression links z back to them, so no gradient ever reaches the encoder.
- **The trick:** move the randomness outside. Draw **ε ~ N(0, 1)** first — a fixed input for this step — then compute **z = μ + σ ⊙ ε**.
- Identical distribution. Completely different graph: z is now plain arithmetic on μ and σ, and arithmetic differentiates.
- ∂z/∂μ = 1 and ∂z/∂σ = ε. Gradients flow straight into the encoder; ε is a constant leaf that never needs one.
- Interview sentence: *"you cannot differentiate a sample, so you rewrite the sample as a deterministic function of the parameters plus parameter-free noise."*
- This is asked by name constantly. Say the words "the randomness is moved into an input that carries no gradient" and you are done.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The reparameterization trick, numerically — right distribution AND real gradients',
      code: `import numpy as np

rng = np.random.default_rng(0)
mu, sigma = 2.0, 0.5          # what the encoder predicted for one latent dim
N = 200_000                   # many draws, so Monte-Carlo error stays small

eps = rng.standard_normal(N)  # the ONLY random node. Nobody wants a gradient here.
z = mu + sigma * eps          # the reparameterization trick, one line

print('asked for   mean/std :', mu, sigma)
print('sampled z   mean/std :', round(float(z.mean()), 4), round(float(z.std()), 4))

# Pretend everything downstream collapses to L = mean(z^2). Backprop it by hand.
L = float((z ** 2).mean())
dL_dz = 2 * z / N                       # dL/dz_i
dL_dmu = float(dL_dz.sum())             # dz_i/dmu    = 1
dL_dsigma = float((dL_dz * eps).sum())  # dz_i/dsigma = eps_i

print('loss E[z^2]  got/exact:', round(L, 4), mu ** 2 + sigma ** 2)
print('dL/dmu       got/exact:', round(dL_dmu, 4), 2 * mu)
print('dL/dsigma    got/exact:', round(dL_dsigma, 4), 2 * sigma)

z_bad = rng.normal(mu, sigma, N)   # same distribution, drawn the naive way...
print('z_bad        mean/std :', round(float(z_bad.mean()), 4), round(float(z_bad.std()), 4))

# ---- real output ----
# asked for   mean/std : 2.0 0.5
# sampled z   mean/std : 2.0001 0.5006
# loss E[z^2]  got/exact: 4.2509 4.25
# dL/dmu       got/exact: 4.0001 4.0
# dL/dsigma    got/exact: 1.0029 1.0
# z_bad        mean/std : 2.0001 0.5008`,
      annotations: {
        7: 'Drawn once, from a fixed standard normal, with no learnable parameter anywhere in the call. It is data for this step, not a node to differentiate.',
        8: 'The whole trick. z now depends on mu and sigma through multiplication and addition, so an autograd graph exists all the way back to the encoder.',
        11: 'Sanity check on the distribution: 2.0001 and 0.5006. Shifting and scaling unit noise really does give N(mu, sigma^2).',
        17: 'dz/dsigma = eps, so sigma\'s gradient is a noise-weighted average of the downstream gradient. That factor is exactly what the naive sampler destroys.',
        21: 'Got 1.0029 against the exact 2*sigma = 1.0. Not an approximation of the gradient — an unbiased Monte-Carlo estimate of it, tightening as N grows.',
        23: 'The trap. Identical distribution, but mu and sigma went in as ARGUMENTS to the RNG. No expression, no graph, no gradient — the encoder would never learn a thing.',
      },
    },
    {
      type: 'note',
      md: `Read the gradients, not just the samples. Because E[z²] = μ² + σ², the true derivatives of the expected loss are 2μ = 4.0 and 2σ = 1.0 — and hand-backpropping through the reparameterized sample recovered 4.0001 and 1.0029 from noise alone. That is the point people miss: the trick does not approximate the gradient, it gives an **unbiased estimate of the exact one**, which is why a single ε draw per input is enough in practice. The final line is the version that silently kills training: same numbers out, but μ and σ were consumed by the sampler, so the encoder sits downstream of a dead end and never receives a gradient.`,
    },
    {
      type: 'intuition',
      title: 'Why VAE samples look blurry',
      md: `Ask ten people to draw "a dog" and average the drawings. You get a brown smudge — the average of many valid answers is usually not a valid answer.

- The decoder is trained with MSE (or per-pixel likelihood), and MSE is minimized by predicting the **mean** of every plausible output for that z.
- The whiskers could be here or there. Drawing them faintly in both places beats committing to one and being wrong.
- Hedging in pixel space *is* blur. It is not a capacity problem; it is the loss doing exactly its job.
- GANs never average — their judge specifically punishes average-looking output, which is why GAN images are sharp.
- The VAE's latent space is still excellent, though. That is why VAEs are alive today as the **compressor inside latent diffusion**, not as generators.`,
    },
    {
      type: 'intuition',
      title: 'GANs: the forger versus the police',
      md: `A forger paints fake notes. A detective grades each note real or fake and explains nothing. Both get better for years. Eventually the forger is very good.

- **Generator G:** noise z in, image out. It never sees a real image — only the discriminator's verdict on its own work.
- **Discriminator D:** image in, one number out — the probability it is real. Trained on real data plus G's fakes.
- G's objective is the negative of D's. One's gain is the other's loss: this is a **min-max game**, not a minimization.
- There is no reconstruction term anywhere, because there is no "correct output" for a given z. Only a judge.
- Where G's training signal comes from: backprop *through* D into G — "which pixel change would have fooled the judge more?"
- Consequence to remember: the loss numbers are meaningless as progress. G's loss falling can mean G improved or D got worse.`,
    },
    {
      type: 'math',
      intro: 'The original objective, and the one-line change that made it trainable in practice.',
      latex: [
        '\\min_G \\max_D \\; V(D, G) = \\mathbb{E}_{x \\sim p_{\\text{data}}}\\big[\\log D(x)\\big] + \\mathbb{E}_{z \\sim p_z}\\big[\\log\\big(1 - D(G(z))\\big)\\big]',
        '\\text{Plain English: } D \\text{ maximizes it (call real real, call fakes fake); } G \\text{ minimizes the second term, i.e. pushes } D(G(z)) \\text{ up.}',
        '\\text{Non-saturating fix: replace } \\min_G \\log\\big(1 - D(G(z))\\big) \\text{ with } \\max_G \\log D(G(z)) \\text{ — same fixed point, steep gradient where } G \\text{ is losing.}',
      ],
    },
    {
      type: 'intuition',
      title: 'Why GAN training is a nightmare',
      md: `- **Mode collapse.** G finds ONE output that reliably fools D and emits it for every z. The losses look healthy; the sample grid is 64 copies of the same face. G was asked to fool, never to *cover*.
- **Non-convergence / oscillation.** Two players chasing each other. D learns the current fake, G moves, D re-learns — the pair can cycle forever with no equilibrium reached and no loss curve you can trust.
- **Vanishing generator gradient.** When D gets too good, D(G(z)) ≈ 0, and log(1 − D(G(z))) is flat there. A perfect judge gives zero feedback — G stops learning exactly when it needs help most.
- **Non-saturating loss:** flip G's objective to maximize log D(G(z)), which is steep precisely where D is confident. Everyone does this by default.
- **WGAN (+ gradient penalty):** swap the log-loss judge for a Wasserstein critic that still gives useful gradients when real and fake distributions barely overlap.
- **Spectral normalization:** divide each of D's weight matrices by its largest singular value, capping D's Lipschitz constant so it cannot get sharp enough to strangle G.`,
    },
    {
      type: 'note',
      md: `What GANs won and where they lost. From 2014 to roughly 2021 GANs owned image generation — StyleGAN faces were the first synthetic images people could not tell apart from photos, and sampling costs exactly **one forward pass**, which is still unbeaten. What they lost on: no likelihood (you cannot even score how probable a sample is), mode coverage never really solved, brittle to hyperparameters and architecture choices, and awkward to condition on rich inputs like a paragraph of text. Diffusion overtook them on image quality *and* diversity while being far less temperamental to train. GANs remain the right tool where latency dominates — super-resolution, real-time avatars, audio vocoders — and, neatly, as the adversarial ingredient used to distill slow diffusion samplers down to one or two steps.`,
    },
    {
      type: 'intuition',
      title: 'Diffusion: destroy the image, then learn to undo one step',
      md: `Drop ink into a glass of water and film it. Diffusion trains a model to play that film backwards, one frame at a time.

- **Forward process** — no learning at all. Take a real image, add a little Gaussian noise, repeat T times (T ≈ 1000). By the end it is indistinguishable from pure noise.
- The noise schedule is fixed and known, so you can jump straight to any step t in one formula instead of looping.
- **What the model learns:** given a noisy image x_t and the timestep t, predict *the noise inside it*. That is a regression problem with a perfect label — you added the noise, so you know it exactly.
- **Sampling:** start from pure noise. Predict the noise, subtract a slice of it, add a pinch of fresh noise, decrement t. Repeat. An image appears.
- Why a *slice* and not all of it: removing all the predicted noise at once lands you on the blurry average again. Many small corrections beat one confident leap.
- Nothing here is adversarial. There is one network, one MSE, and a label you generated yourself.`,
    },
    {
      type: 'math',
      intro:
        'The forward jump in closed form and the loss that made diffusion boring in the best possible way. alpha-bar_t is the fixed schedule: near 1 at t = 0, near 0 at t = T.',
      latex: [
        'x_t = \\sqrt{\\bar{\\alpha}_t}\\, x_0 + \\sqrt{1 - \\bar{\\alpha}_t}\\, \\epsilon, \\qquad \\epsilon \\sim \\mathcal{N}(0, I)',
        '\\mathcal{L}_{\\text{simple}} = \\mathbb{E}_{t,\\, x_0,\\, \\epsilon} \\Big[ \\big\\| \\epsilon - \\epsilon_\\theta(x_t, t) \\big\\|^2 \\Big]',
        '\\text{An MSE between a noise vector you drew and the one the network guessed. No opponent, no equilibrium to balance.}',
      ],
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'Diffusion: noise it to death, then walk back one step at a time',
        notice:
          'Frames 1-5 are the forward process (no learning). Frames 6-10 are sampling. The last frame is the GAN alternative for contrast — one step, but with a judge and a trap.',
        leftLabel: 'what runs',
        rightLabel: 'the image',
        frames: [
          {
            note: 'Forward process, step 0. Start from a real training image. Nothing has happened yet.',
            stack: [
              { name: 't = 0', value: 'noise level: 0%' },
              { name: 'q(x_t | x_0)', to: 'img' },
            ],
            heap: [{ id: 'img', value: 'sharp cat photo', label: 'x_0 — real data' }],
          },
          {
            note: 'Add a little Gaussian noise. Still obviously a cat — a model could denoise this in its sleep. These easy steps teach fine detail.',
            stack: [
              { name: 't = 200', value: 'noise level: ~20%' },
              { name: 'q(x_t | x_0)', to: 'img' },
            ],
            heap: [{ id: 'img', value: 'cat + faint grain', label: 'x_200' }],
          },
          {
            note: 'Halfway. Colour and pose survive, whiskers do not. Steps around here are where the model learns overall composition.',
            stack: [
              { name: 't = 500', value: 'noise level: ~55%' },
              { name: 'q(x_t | x_0)', to: 'img' },
            ],
            heap: [{ id: 'img', value: 'cat under heavy static', label: 'x_500 — shapes only' }],
          },
          {
            note: 'Almost gone. A vague warm blob in a snowstorm. You could not name the animal, let alone the breed.',
            stack: [
              { name: 't = 800', value: 'noise level: ~85%' },
              { name: 'q(x_t | x_0)', to: 'img' },
            ],
            heap: [{ id: 'img', value: 'warm blob in noise', label: 'x_800' }],
          },
          {
            note: 'End of the forward process. Every trace of the cat is gone — and that is the goal, because it means sampling can START here without needing any image.',
            stack: [
              { name: 't = 1000 (T)', value: 'noise level: 100%' },
              { name: 'q(x_T | x_0)', to: 'img' },
            ],
            heap: [{ id: 'img', value: 'pure static', label: 'x_T ~ N(0, I)', moved: true }],
          },
          {
            note: 'Sampling begins. Forget the cat entirely: draw FRESH noise from N(0, I). This is the only input the generator ever gets.',
            stack: [
              { name: 't = 1000', value: 'draw x_T ~ N(0, I)' },
              { name: 'model input', to: 'img' },
            ],
            heap: [{ id: 'img', value: 'pure static', label: 'x_T — random draw' }],
          },
          {
            note: 'One reverse step — the entire trick. The network reads x_t and t and PREDICTS the noise inside. Subtract a slice of that prediction, add a pinch of fresh noise, and you have x_(t-1).',
            stack: [
              { name: 'eps_theta(x_t, t)', value: 'predicts the noise', to: 'now' },
              { name: 'x_t minus a slice', to: 'next' },
            ],
            heap: [
              { id: 'now', value: 'pure static', label: 'x_1000' },
              { id: 'next', value: 'static, faintest structure', label: 'x_999' },
            ],
          },
          {
            note: 'Four hundred steps later. Blobs and edges have condensed out of the noise. No single step did anything clever; each one removed a sliver.',
            stack: [
              { name: 't = 600', value: 'step 400 of 1000' },
              { name: 'eps_theta(x_t, t)', to: 'img' },
            ],
            heap: [{ id: 'img', value: 'blobs, edges, a horizon', label: 'x_600' }],
          },
          {
            note: 'Now it is clearly an animal. The late steps do detail work: fur texture, whiskers, eye highlights.',
            stack: [
              { name: 't = 200', value: 'step 800 of 1000' },
              { name: 'eps_theta(x_t, t)', to: 'img' },
            ],
            heap: [{ id: 'img', value: 'a cat-shaped thing', label: 'x_200' }],
          },
          {
            note: 'Done. A sharp cat that was never in the training set. Cost: 1000 sequential network passes. Every one of them was an easy, well-posed regression — that is the trade.',
            stack: [
              { name: 't = 0', value: 'sampling complete' },
              { name: 'output', to: 'img' },
            ],
            heap: [{ id: 'img', value: 'sharp NEW cat', label: 'x_0 — generated sample' }],
          },
          {
            note: 'Contrast: the GAN does it in ONE generator pass, graded by a discriminator that is itself still learning. Milliseconds instead of minutes — but the two players can chase each other forever, and G can win by finding a single output that always fools D.',
            stack: [
              { name: 'G(z): one forward pass', to: 'img' },
              { name: 'D(image): real or fake?', to: 'img' },
              { name: 'MODE COLLAPSE: same cat for every z', to: 'img', danger: true },
            ],
            heap: [{ id: 'img', value: 'sharp cat, 1 pass', label: 'G(z) — instant, but fragile' }],
          },
        ],
      },
    },
    {
      type: 'note',
      md: `The bill and the receipts. Diffusion's one real weakness is **sequential sampling**: T network passes per image against a GAN's one, which is seconds-to-minutes versus milliseconds. Two families of fix. **DDIM** re-derives sampling as a deterministic path you are allowed to skip along — 20 to 50 steps instead of 1000, for a small quality cost, and it is the default in every image tool you have used. **Distillation** (progressive, consistency models, adversarial distillation) trains a student network to jump several teacher steps at once, pushing generation down to 1–4 steps. Separately, **conditioning**: text enters through **cross-attention** — the denoiser attends to the prompt's token embeddings at every step, so "a red bicycle" steers each individual denoising decision rather than being consulted once at the start. That is literally the attention mechanism from the GenAI track, reused; GenAI L0 covers it from zero.`,
    },
    {
      type: 'intuition',
      title: 'The comparison you will be asked to recite',
      md: `Five axes. Memorize the shape, not the wording.

- **Sample quality:** AE — not a generator at all. VAE — blurry. GAN — sharp. Diffusion — sharpest, current state of the art.
- **Diversity / mode coverage:** VAE good (it optimizes a likelihood bound, so it must cover the data). GAN poor — collapse is the default failure. Diffusion excellent.
- **Training stability:** AE and VAE easy, a single loss goes down. GAN fragile, a permanent balancing act. Diffusion easy, because it is regression.
- **Sampling speed:** AE / VAE / GAN — one forward pass, milliseconds. Diffusion — 20 to 1000 sequential passes. The one axis it loses.
- **Latent space usefulness:** AE compressed but holey. VAE smooth and interpolatable — the reason latent diffusion embeds one. GAN has no encoder at all by default. Diffusion's "latent" is image-sized, so it compresses nothing.
- The modern system is a hybrid: a **VAE compresses** the image, a **diffusion model generates inside that latent space**, and text conditions it by **cross-attention**. That sentence is Stable Diffusion.`,
    },
  ],
  quiz: [
    {
      question: 'Why does a plain autoencoder fail if you sample a random z and decode it?',
      options: [
        {
          text: 'The decoder is too small to produce a full image',
          explanation: 'Capacity is not the issue — the same decoder reconstructs training images perfectly. The problem is WHERE you sampled.',
        },
        {
          text: 'The latent space has holes: random z lands where no training example ever went, and the decoder has no idea what belongs there',
          explanation:
            'Correct. Reconstruction loss only constrained the decoder at the exact z values the encoder produced. Everywhere else is undefined behaviour.',
        },
        {
          text: 'Reconstruction loss is not differentiable, so the decoder never trained properly',
          explanation: 'MSE is perfectly differentiable, and the decoder did train — it just never learned anything about unvisited regions.',
        },
      ],
      correct: 1,
    },
    {
      question: 'What does the encoder of a VAE output?',
      options: [
        { text: 'A single latent vector z', explanation: 'That is the plain autoencoder — and exactly the design that produces a holey latent space.' },
        { text: 'A reconstructed image', explanation: 'That is the decoder\'s output, at the other end of the network.' },
        {
          text: 'A mean vector and a variance (usually log-variance) vector, which together define a Gaussian',
          explanation: 'Correct. Encoding a distribution instead of a point is the single structural change that turns an autoencoder into a generator.',
        },
      ],
      correct: 2,
    },
    {
      question: 'In z = μ + σ ⊙ ε, what is ε and why is it there?',
      options: [
        {
          text: 'Parameter-free noise drawn from N(0, 1) — it holds the randomness so that z stays a differentiable function of μ and σ',
          explanation: 'Correct. The sampling still happens, but upstream of everything learnable, so ∂z/∂μ = 1 and ∂z/∂σ = ε both exist.',
        },
        { text: 'A learned parameter the encoder predicts alongside μ and σ', explanation: 'If ε were learned there would be no randomness at all — the model would collapse to a deterministic autoencoder.' },
        { text: 'The reconstruction error, fed back into the latent', explanation: 'The reconstruction error lives in the loss, not in the sampling step. ε is pure noise, unrelated to the input.' },
      ],
      correct: 0,
    },
    {
      question: 'You set the KL weight in a VAE to exactly zero. What do you get?',
      options: [
        { text: 'Sharper samples when you decode random z', explanation: 'The opposite — with no KL pull the latent space fragments and random z decodes to garbage.' },
        {
          text: 'A plain autoencoder: excellent reconstructions, a holey latent space, and useless sampling',
          explanation: 'Correct — and this is the cleanest way to remember what the KL term actually buys: not reconstruction quality, but a samplable space.',
        },
        { text: 'Posterior collapse', explanation: 'Backwards. Posterior collapse is what happens when KL is too STRONG and the latent stops carrying information.' },
      ],
      correct: 1,
    },
    {
      question: 'A trained GAN produces a 64-image sample grid of nearly identical faces. Both losses look healthy. Diagnosis?',
      options: [
        { text: 'Learning rate too high — the model diverged', explanation: 'Divergence produces noise or NaNs, not one clean repeated output. And the losses would not look healthy.' },
        {
          text: 'The discriminator is too weak to tell real from fake',
          explanation: 'A weak D degrades overall quality, but it does not explain why one specific output repeats. The generator here is being rewarded, not unchecked.',
        },
        {
          text: 'Mode collapse — G found one output that reliably fools D and stopped exploring',
          explanation: 'Correct. The objective only ever asked G to fool D, never to cover the data distribution, so a single winning output is a valid optimum of what was asked.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Why does a discriminator that gets TOO good hurt GAN training?',
      options: [
        {
          text: 'D(G(z)) goes to 0, where log(1 − D(G(z))) is flat, so the generator receives almost no gradient',
          explanation: 'Correct — the vanishing generator gradient. The non-saturating loss (maximize log D(G(z))) fixes exactly this by being steep in that region.',
        },
        { text: 'D overfits the training set and memorizes real images', explanation: 'D can overfit, and it is a real concern, but it is not the mechanism that starves G of gradient.' },
        { text: 'D starts generating images itself and competes with G', explanation: 'D only outputs a single probability. It has no generative capacity at all.' },
      ],
      correct: 0,
    },
    {
      question: 'At each reverse step, what does a standard diffusion model actually predict?',
      options: [
        { text: 'Which timestep t the image is currently at', explanation: 't is given to the model as an input, not predicted from it.' },
        {
          text: 'The noise that was added to produce x_t, so that a slice of it can be subtracted',
          explanation: 'Correct. Predicting ε is a regression with a perfect label, because the training procedure generated that noise itself.',
        },
        { text: 'The probability that the image is real rather than generated', explanation: 'That is a GAN discriminator. Diffusion has no judge anywhere in the loop.' },
      ],
      correct: 1,
    },
    {
      question: 'Why is diffusion training much more stable than GAN training?',
      options: [
        {
          text: 'The objective is a plain MSE regression against a label the trainer generated itself — one network, no opponent, no equilibrium to maintain',
          explanation: 'Correct. Replacing an adversarial game with a well-posed supervised problem is the whole reason diffusion took over.',
        },
        { text: 'Diffusion models are much smaller, so they optimize more easily', explanation: 'They are typically LARGER than comparable GANs. Size is not the reason.' },
        { text: 'Diffusion does not use gradient descent', explanation: 'It absolutely does — the same optimizers, the same schedules. Only the objective changed.' },
      ],
      correct: 0,
    },
  ],
  interviewQuestions: [
    {
      question: 'Explain the reparameterization trick and why a VAE cannot be trained without it.',
      answer:
        'The encoder outputs μ and σ, and we need a sample z from N(μ, σ²) to feed the decoder. Sampling is not differentiable — there is no derivative of "a draw" with respect to the parameters that shaped it — so backprop stops dead and the encoder receives no gradient. The trick rewrites the sample as z = μ + σ ⊙ ε with ε ~ N(0, I) drawn independently. The distribution is unchanged, but z is now a deterministic, differentiable function of μ and σ, with ∂z/∂μ = 1 and ∂z/∂σ = ε; the randomness sits in ε, an input that carries no gradient. The estimator this gives is unbiased, which is why one ε draw per input per step is enough in practice. The alternative (score-function / REINFORCE estimators) works but has far higher variance — worth naming to show you know why this specific trick won.',
      isCaseBased: false,
    },
    {
      question:
        'Case: your VAE trains, total loss drops nicely, but every sample from N(0, I) is the same blurry average-looking blob, and the KL term is nearly zero. What happened and how do you fix it?',
      answer:
        'Near-zero KL is the diagnostic: q(z|x) has collapsed onto the prior for every x, so z carries no information about the input — **posterior collapse**. The decoder learned to ignore z and just emit the dataset mean, which is why every sample looks identical. Usual causes: KL weight (β) too high, or a decoder powerful enough to reconstruct well without needing z (very common with autoregressive/PixelCNN-style decoders). Fixes, in order of laziness: KL annealing / warmup — start β at 0 and ramp it up so reconstruction establishes a useful latent first; free bits — floor the KL per latent dimension so each one must carry some information; lower β outright; weaken the decoder or add a skip from z to deeper decoder layers. Tradeoff to say out loud: everything that fights collapse pushes the latent away from N(0, I), which degrades sampling quality — you are choosing a point on the reconstruction/prior-match curve, not eliminating the tension.',
      isCaseBased: true,
    },
    {
      question: 'Why are VAE samples blurry and GAN samples sharp? Answer at the level of the loss function.',
      answer:
        'A VAE decoder is trained with a per-pixel reconstruction loss, typically MSE (Gaussian likelihood). For a given z there are many plausible images; the loss-minimizing prediction is their pixelwise MEAN, and the mean of several sharp alternatives is a blur. The model hedges because hedging is optimal under that loss. A GAN has no per-pixel target at all — the only signal is a discriminator, and a blurry image is the easiest thing in the world for a discriminator to reject, so blur is actively punished. The tradeoff is symmetric: the VAE covers the data because it optimizes a likelihood bound and pays for it in sharpness; the GAN sharpens because it only needs to be convincing, and pays for it in mode coverage. Diffusion gets both by keeping an MSE objective but making each prediction easy enough that the averaging is negligible — predicting the noise over one small step has a nearly unique answer.',
      isCaseBased: false,
    },
    {
      question:
        'Case: you are training a GAN on a face dataset. After 30 epochs the sample grid shows four or five distinct faces repeated over and over. Losses are flat and unremarkable. Walk me through your debugging.',
      answer:
        'Name it first: mode collapse, and note that flat unremarkable losses are expected — GAN losses are relative scores, not progress meters, so the sample grid and a coverage metric are the real instruments. Debug order: (1) Measure, do not eyeball — compute FID and, better, precision/recall for generative models, which separates "sharp" from "diverse". (2) Check the D/G balance — if D is winning easily, G is optimizing against a saturated judge; try one G step per D step, lower D\'s learning rate, or use the two-timescale rule (TTUR). (3) Switch the objective — non-saturating loss if you are still on the original min-max, then WGAN-GP or hinge loss with spectral normalization on D, which are the standard stability package. (4) Add explicit diversity pressure — minibatch discrimination or minibatch standard deviation lets D see a whole batch, so identical outputs become detectable and punishable. (5) Check for a data pipeline bug — a broken shuffle or a tiny effective dataset produces the same symptom for a much dumber reason. Tradeoff: every diversity mechanism costs some sharpness, and if the deadline is real, the honest recommendation is to move to a diffusion model, where this failure mode does not exist.',
      isCaseBased: true,
    },
    {
      question: 'Describe the forward and reverse processes of a diffusion model, and say what the network is actually trained to do.',
      answer:
        'Forward: a fixed, learning-free Markov chain that adds a small amount of Gaussian noise to a real image at each of T steps until it is indistinguishable from N(0, I). Because the schedule is fixed, there is a closed form for jumping straight to any t: x_t = sqrt(alphabar_t)·x_0 + sqrt(1 − alphabar_t)·ε, so training samples a random t rather than looping. Reverse: the network is given x_t and t and predicts ε — the noise inside — and training minimizes the MSE between the true ε and the prediction. That label is free and exact, because the trainer drew the noise. Sampling starts from pure noise, and at each step subtracts a scaled portion of the predicted noise and adds a smaller fresh noise term, walking t down to 0. The key framing for an interviewer: it is a stack of tiny denoising problems, each nearly deterministic, which is what makes an MSE objective produce sharp results where a VAE\'s MSE produces blur.',
      isCaseBased: false,
    },
    {
      question: 'Name the two terms of the VAE loss, say what each one buys, and describe what happens as you reweight them.',
      answer:
        'Reconstruction (expected log-likelihood of x given z) buys fidelity — it wants each input\'s latent cloud tiny and well-separated so the decoder can rebuild precisely. KL(q(z|x) || N(0, I)) buys a samplable space — it pulls every cloud toward the prior so the clouds overlap and cover, leaving no holes. Together they are the negative ELBO, so minimizing the loss maximizes a lower bound on log p(x). Reweighting: β → 0 recovers a plain autoencoder — great reconstructions, unsamplable latent. β large gives β-VAE behaviour — more disentangled, more prior-like latents and blurrier reconstructions, and past a point, posterior collapse. The interview point is that these are not two goals that happen to coexist; they are in direct tension, and choosing β is choosing where on that tradeoff you want to sit.',
      isCaseBased: false,
    },
    {
      question: 'How does an autoencoder relate to PCA, and when would you actually prefer the autoencoder?',
      answer:
        'A single-hidden-layer autoencoder with linear activations and MSE loss spans the same subspace as PCA — same reconstruction error, though the learned axes are not forced to be orthogonal or ordered by variance. So an autoencoder is honestly described as nonlinear PCA. Prefer PCA when the data really is roughly linear, when you need deterministic, fast, explainable components with variance explained per axis, when the dataset is small (PCA has no hyperparameters and cannot overfit the way a deep net can), or when you must justify the method to a regulator. Prefer an autoencoder when the manifold is curved — images, audio, sensor traces — where linear axes waste dimensions, when you want the encoder to become part of a bigger differentiable model, or when the input is not naturally a flat vector and you want convolutional or sequential structure in the encoder. Practical note: PCA first, always. It is five minutes and it tells you whether the extra machinery has anything to find.',
      isCaseBased: false,
    },
    {
      question:
        'Case: you deployed an autoencoder for anomaly detection on server telemetry. It flags 40% of ordinary traffic as anomalous. What do you check?',
      answer:
        'Reconstruction-error anomaly detection has a small number of well-known failure points, so go in order. (1) The threshold — it is a hyperparameter, and if it was set on training data it is far too tight; recalibrate on a held-out normal-only window (e.g. the 99th percentile of its errors) and check the error distribution shape, which is usually long-tailed rather than Gaussian. (2) Distribution drift — telemetry changes with releases, traffic seasonality and new features; the "normal" the model learned is stale, and the fix is periodic retraining plus drift monitoring on the error distribution itself, not a bigger threshold. (3) Scaling — if features were standardized with training-set statistics, any shift in scale inflates the error for everything; verify the exact same transform runs in production. (4) Bottleneck too tight — if the model cannot reconstruct even normal data, every point looks anomalous; check training reconstruction error before blaming the data. (5) Contaminated training data — if anomalies were present during training, the model learned to reconstruct them and the score loses meaning in both directions. Tradeoff to name: the threshold is a precision/recall dial, and the right setting comes from the cost of a missed incident versus the cost of alert fatigue, not from the model.',
      isCaseBased: true,
    },
    {
      question:
        'Case: your text-to-image diffusion service takes 9 seconds per image and product wants under 1 second. What are your options and what does each cost?',
      answer:
        'The bill is T sequential network passes, so every option either reduces T or shrinks the network. (1) Better sampler — DDIM or a higher-order solver (DPM-Solver++) cuts 1000 steps to 20–50 with small quality loss and zero retraining. Do this first; it is a config change. (2) Latent diffusion — if you are denoising at full image resolution, move to a VAE-compressed latent space (e.g. 8× smaller per side, ~64× fewer pixels per step). Large win, requires a VAE and retraining. (3) Step distillation — progressive distillation, consistency models, or adversarial distillation train a student to jump many teacher steps, reaching 1–4 steps. Biggest win, costs a training run and some fidelity and diversity. (4) Engineering — fp16/bf16, compiled kernels, batching concurrent requests, caching the text encoder output. Free quality-wise, and often 2–3× on its own. (5) Smaller UNet or a distilled backbone — direct quality tradeoff. Sequence I would actually ship: precision + batching + a 30-step DPM-Solver, measure, then distill only if still short. Say explicitly that quality is measured (FID plus human preference on a fixed prompt set) before and after, or "faster" quietly means "worse".',
      isCaseBased: true,
    },
    {
      question: 'Why did diffusion displace GANs? Give two independent reasons and say which mattered more.',
      answer:
        'Reason one: the objective. Diffusion is supervised regression against a label the trainer generated, so it has a stable loss, no equilibrium to maintain, and scales predictably with model size and data — you can train a bigger one and expect it to be better, which is emphatically not true of GANs. Reason two: mode coverage. Diffusion is likelihood-based in spirit and must explain the whole data distribution, so it does not have a mode-collapse failure mode; GANs never solved coverage, only mitigated it. Which mattered more: stability and scalability. Sample quality between a well-tuned StyleGAN and early diffusion was arguably close, but "you can reliably train a bigger one" is what let diffusion absorb billions of images and text conditioning, and that is what GANs could not follow. The honest caveat: GANs still win decisively on sampling latency, which is why they came back as distillation targets for one-step diffusion.',
      isCaseBased: false,
    },
    {
      question: 'How does a text prompt actually steer a diffusion model? Explain the mechanism, not the API.',
      answer:
        'The prompt is tokenized and run through a frozen text encoder (CLIP or T5) into a sequence of token embeddings. The denoising network is a UNet or transformer with **cross-attention** layers: at every resolution and at every timestep, the image features form the queries and the text embeddings form the keys and values, so each spatial location asks "which words are relevant to me?" and mixes in their content. This happens at every one of the sampling steps, which is why the prompt shapes the entire trajectory rather than just the starting point. On top of that, classifier-free guidance runs the model twice per step — once conditioned, once unconditioned — and extrapolates away from the unconditioned prediction; the guidance scale trades prompt adherence against diversity and, at high values, against realism. Note the doubled compute cost, since that is the follow-up question. The attention mechanism itself is the same one from the GenAI track.',
      isCaseBased: false,
    },
    {
      question: 'Non-saturating loss, WGAN with gradient penalty, and spectral normalization — what specific problem does each solve?',
      answer:
        'Non-saturating loss: fixes the vanishing generator gradient. In the original min-max, G minimizes log(1 − D(G(z))), which is flat when D confidently rejects G — exactly early in training. Flipping to maximize log D(G(z)) keeps the same optimum but gives a steep gradient precisely where G is losing. One line, no cost, always on. WGAN + gradient penalty: fixes the case where real and generated distributions barely overlap, where Jensen-Shannon (what the original loss optimizes) is constant and therefore gradient-free. The Wasserstein distance still varies with how far apart they are, so the critic gives useful signal; the gradient penalty enforces the 1-Lipschitz constraint the theory requires. Cost: slower, extra hyperparameters, and the critic needs multiple steps per generator step. Spectral normalization: a cheaper way to bound the discriminator\'s Lipschitz constant — divide each weight matrix by its largest singular value, estimated with one power iteration per step. Nearly free, drop-in, and it is what most modern GAN code actually uses instead of gradient penalty.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    {
      front: 'Discriminative vs generative',
      back: 'Discriminative learns p(y|x) — the boundary, enough to judge. Generative learns p(x) — the data itself, so it can SAMPLE something new.',
    },
    {
      front: 'Autoencoder in one line',
      back: 'Encoder squeezes x into a small bottleneck z, decoder rebuilds x̂. Loss = reconstruction error. The label is the input — self-supervised.',
    },
    {
      front: 'What autoencoders are actually good for',
      back: 'Nonlinear PCA (dimensionality reduction), denoising, and anomaly detection via reconstruction error. NOT generation.',
    },
    {
      front: 'Why a plain autoencoder cannot generate',
      back: 'The latent space has holes — nothing forced it to be continuous or complete, so a random z lands where the decoder was never trained and outputs garbage.',
    },
    {
      front: 'The VAE\'s one structural change',
      back: 'Encode to a DISTRIBUTION (μ, σ) instead of a point, sample z from it, and add a KL term pulling every cloud toward N(0, I). Result: no holes, so sampling works.',
    },
    {
      front: 'The two VAE loss terms',
      back: 'Reconstruction (fidelity — wants tiny separated clouds) + KL to N(0, I) (samplability — wants every cloud on the prior). They pull against each other; β sets the truce.',
    },
    {
      front: 'Reparameterization trick',
      back: 'z = μ + σ ⊙ ε with ε ~ N(0, I). You cannot backprop through a sample, so move the randomness into an input carrying no gradient. ∂z/∂μ = 1, ∂z/∂σ = ε.',
    },
    {
      front: 'Why VAE samples are blurry',
      back: 'MSE reconstruction is minimized by the MEAN of all plausible outputs for a z, and the average of several sharp images is a blur. The loss is hedging, not failing.',
    },
    {
      front: 'GAN objective + mode collapse',
      back: 'min_G max_D E[log D(x)] + E[log(1 − D(G(z)))] — forger vs police. Mode collapse: G finds one output that fools D and emits it for every z; it was asked to fool, never to cover.',
    },
    {
      front: 'Diffusion in one line (and its cost)',
      back: 'Forward: add Gaussian noise over T steps until pure noise. Model: predict that noise, subtract a slice, repeat from noise. Stable regression, sharp and diverse — but T sequential passes (DDIM/distillation cut it).',
    },
  ],
  mindmapMarkdown: `- Generative Models
  - Framing
    - Discriminative p(y|x) — boundary, judges
    - Generative p(x) — can SAMPLE new data
  - Autoencoder
    - Encoder → bottleneck z → decoder
    - Loss = reconstruction (MSE), self-supervised
    - Good at: nonlinear PCA, denoising, anomaly detection
    - Bad generator: latent has HOLES
  - VAE
    - Encode a distribution (μ, σ), not a point
    - KL pulls clouds to N(0, I) → continuous + complete
    - Loss = reconstruction + β·KL (ELBO)
    - Tension: β→0 = autoencoder, β large = posterior collapse
    - Reparameterization: z = μ + σ⊙ε, ε~N(0,I)
      - Cannot backprop through a sample
      - ∂z/∂μ = 1, ∂z/∂σ = ε
    - Samples blurry: MSE predicts the mean of plausible outputs
  - GAN
    - Forger (G) vs police (D), min-max game
    - No reconstruction target — only a judge
    - Mode collapse: one output fools D forever
    - Non-convergence / oscillation
    - Vanishing G gradient when D is too good
    - Fixes: non-saturating loss, WGAN-GP, spectral norm
    - Won: sharp images, 1-pass sampling
    - Lost: diversity, stability, text conditioning
  - Diffusion
    - Forward: add Gaussian noise t=0 → T (no learning)
    - Model predicts the NOISE, subtract a slice, repeat
    - Sampling: pure noise → image
    - Stable (regression, no adversary) + diverse
    - Cost: T sequential steps → DDIM, distillation
    - Conditioning: text via cross-attention
  - Comparison axes
    - Quality: diffusion > GAN > VAE
    - Diversity: diffusion > VAE > GAN
    - Stability: diffusion ≈ VAE > GAN
    - Speed: GAN/VAE > diffusion
    - Latent use: VAE best, diffusion none
  - Modern hybrid
    - VAE compresses → diffusion generates in latent → cross-attention conditions`,
}

export default m
