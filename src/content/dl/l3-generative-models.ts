import type { Module } from '../types'

const m: Module = {
  id: 'dl-l3-generative-models',
  subjectId: 'dl',
  level: 3,
  title: 'Diffusion, and the Four Generative Families',
  whyItMatters:
    'Diffusion replaced GANs for image generation in about two years. The reason is not that it produces better pictures in principle — it is that its training objective is a plain regression, so it never has to win a fight.',
  assumes: [
    'You have read *Generative Objectives*, so you have met reconstruction, the ELBO and the GAN game',
    'You know that adding Gaussian noise to a number is x + sigma*epsilon',
  ],
  estMinutes: 22,
  sections: [
    {
      type: 'intuition',
      title: 'Destroy the data on purpose',
      md: `A GAN learns to make an image in one jump, judged by an adversary. A **diffusion model** does something stranger and far easier to train.

Take a real image and add a little Gaussian noise. Repeat a thousand times and it is pure noise. That direction — the **forward process** — needs no learning at all; it is a fixed recipe.

Then train a network to do one step of the reverse: given a noisy image and how noisy it is, **predict the noise that was added**. That is ordinary regression against a target you generated yourself, so there is no adversary and no min-max game.

To generate, start from pure noise and take a thousand small reverse steps.`,
    },
    {
      type: 'math',
      intro:
        'The forward process, and the useful fact about it. β_t is the tiny amount of noise added at step t; ᾱ_t is the running product of (1 − β). The second line is why this is practical — you can jump straight to any timestep in one operation rather than simulating t steps.',
      latex: [
        '\\bar{\\alpha}_t = \\prod_{s=1}^{t}(1 - \\beta_s)',
        'x_t = \\sqrt{\\bar{\\alpha}_t}\\,x_0 + \\sqrt{1 - \\bar{\\alpha}_t}\\,\\epsilon, \\qquad \\epsilon \\sim \\mathcal{N}(0, 1)',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'How much signal survives at each timestep',
      code: `import numpy as np, math
T = 1000
ab = np.cumprod(1 - np.linspace(1e-4, 0.02, T))     # the standard linear schedule

print(' t     alpha_bar  signal coeff  noise coeff')
for t in [0, 99, 299, 499, 699, 999]:
    print(' %4d %11.6f %13.4f %12.4f'
          % (t+1, ab[t], math.sqrt(ab[t]), math.sqrt(1 - ab[t])))

# ---- real output ----
#  t     alpha_bar  signal coeff  noise coeff
#     1    0.999900        0.9999       0.0100
#   100    0.897018        0.9471       0.3209
#   300    0.396420        0.6296       0.7769
#   500    0.078587        0.2803       0.9599
#   700    0.006966        0.0835       0.9965
#  1000    0.000040        0.0064       1.0000`,
      annotations: {
        3: 'The cumulative product of (1 − β). Because it is precomputed, training samples a random t and jumps straight there — no step-by-step simulation is ever needed during training.',
        13: 'At t = 300 the image is still 63% signal. The model at this end of the schedule is learning fine detail.',
        16: 'At t = 1000 the signal coefficient is 0.0064 and the noise coefficient is 1.0000 — x_t is essentially pure noise, which is exactly what sampling needs to start from.',
        14: 'The transition is not linear in t. Half the signal is gone by about t = 300 and 97% by t = 700, so the schedule spends most of its steps on the very noisy end. That imbalance is why the cosine schedule was proposed as a replacement.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'One number, noised to four different timesteps',
      code: `np.random.seed(0)
x0 = 2.0
for t in [10, 200, 600, 999]:
    eps = np.random.randn()
    xt = math.sqrt(ab[t]) * x0 + math.sqrt(1 - ab[t]) * eps
    print('x0=%.1f  t=%4d  eps=%+.4f -> x_t=%+.4f' % (x0, t+1, eps, xt))

# ---- real output ----
# x0=2.0  t=  11  eps=+1.7641 -> x_t=+2.0804
# x0=2.0  t= 201  eps=+0.4002 -> x_t=+1.8549
# x0=2.0  t= 601  eps=+0.9787 -> x_t=+1.2859
# x0=2.0  t=1000  eps=+2.2409 -> x_t=+2.2536`,
      annotations: {
        5: 'One line, no loop. The training target is eps itself — the network is shown x_t and t, and asked to output the eps that produced it.',
        10: 'At t = 11 the value is still recognisably 2.0 despite a large eps, because the noise coefficient is only 0.0100.',
        13: 'At t = 1000, x_t = 2.2536 while eps = 2.2409 — the original 2.0 contributes 0.0128 of it. The data is gone, which is the point: generation can start from noise that carries no information about any particular image.',
      },
    },
    {
      type: 'note',
      label: 'Why the training objective is the whole story',
      md: `The loss is \`||eps - eps_predicted||²\`. A plain squared error, against a target you generated yourself, at a randomly sampled timestep.

Everything that makes GANs painful is absent. There is **no adversary**, so no min-max game and no oscillation. There is **no mode collapse**, because the objective covers the whole data distribution by construction rather than rewarding the model for fooling a critic. And **the loss is meaningful** — it goes down when the model improves, which a GAN's does not.

The architecture is a **U-Net**: the task is image-to-image at full resolution, so it needs the skip connections for exactly the reason segmentation does. The timestep t is fed in as an embedding, because the same network must handle every noise level.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'What it costs: network evaluations per image',
      code: `for steps, name in [(1000, 'DDPM, full chain'), (50, 'DDIM, 50 steps'),
                    (20, 'DDIM, 20 steps'), (1, 'distilled one-step'),
                    (1, 'GAN or VAE')]:
    print('%-20s %4d network evaluation(s) per image' % (name, steps))

# ---- real output ----
# DDPM, full chain     1000 network evaluation(s) per image
# DDIM, 50 steps         50 network evaluation(s) per image
# DDIM, 20 steps         20 network evaluation(s) per image
# distilled one-step      1 network evaluation(s) per image
# GAN or VAE              1 network evaluation(s) per image`,
      annotations: {
        6: 'A GAN samples in one forward pass. The original DDPM needed a thousand, which is a three-order-of-magnitude gap and the entire practical objection to diffusion.',
        7: 'DDIM reformulated the reverse process as deterministic, which let it skip steps — 50 gives near-identical quality. That single change is most of what made diffusion deployable.',
        9: 'Consistency models and distillation push it to 1–4 steps by training a student to match the teacher\'s whole trajectory. The gap that defined the trade-off has largely closed.',
      },
    },
    {
      type: 'note',
      label: 'Two things every practical system adds',
      md: `**Latent diffusion.** Running the whole process at 512x512 pixel resolution is enormously expensive. Stable Diffusion instead trains an autoencoder to compress images roughly 8x per side, runs diffusion in that latent space, and decodes at the end — about 64x less work per step, which is what made it runnable on consumer hardware.

**Classifier-free guidance.** Train the model both with and without a text prompt, then at sampling time extrapolate away from the unconditional prediction: \`eps = eps_uncond + w·(eps_cond − eps_uncond)\`. Larger w means stronger prompt adherence and less diversity, and w around 7 is a common default. It is the single knob most responsible for how well image generators follow prompts.`,
    },
    {
      type: 'note',
      label: 'The four families, and what each is actually for',
      md: `**Autoencoder** — no sampling at all. Right for compression, denoising and anomaly detection, where the reconstruction error *is* the product.

**VAE** — one forward pass, a smooth samplable latent space, blurry output. Now most visible as the compression stage inside latent diffusion rather than as a generator.

**GAN** — one forward pass, sharp output, unstable training and mode collapse. Still used where inference must be a single pass and the domain is narrow, such as super-resolution and face editing.

**Diffusion** — stable training, excellent coverage, many steps to sample. The default for image, video and audio generation.

Missing from the list and worth naming: **autoregressive** models generate one token at a time and give an exact likelihood, which is what every language model is, and what image models like Parti use. **Normalizing flows** give exact likelihoods with invertible transforms and lost out because the invertibility constraint costs too much expressiveness.`,
    },
  ],
  quiz: [
    {
      question: 'What makes the diffusion training objective easy compared to a GAN\'s?',
      options: [
        { text: 'It uses a smaller network', explanation: 'Diffusion U-Nets are typically larger.' },
        { text: 'It is a plain squared error against a target you generated yourself — no adversary, so no min-max game', explanation: 'Correct, and that stability is the actual reason diffusion won.' },
        { text: 'It needs no gradients', explanation: 'It trains by ordinary backprop.' },
        { text: 'It trains on less data', explanation: 'It typically trains on more.' },
      ],
      correct: 1,
    },
    {
      question: 'Why can diffusion training sample a random timestep instead of simulating the forward chain?',
      options: [
        { text: 'Because the noise is small at every step', explanation: 'Size is not what allows the shortcut.' },
        { text: 'ᾱ_t is a precomputed cumulative product, so x_t = √ᾱ_t·x₀ + √(1−ᾱ_t)·ε reaches any t in one operation', explanation: 'Correct — the composition of Gaussians has a closed form.' },
        { text: 'The model memorises intermediate steps', explanation: 'Nothing is memorised.' },
        { text: 'Because the schedule is linear', explanation: 'The shortcut holds for any schedule, including cosine.' },
      ],
      correct: 1,
    },
    {
      question: 'At t = 1000, x_t = 2.2536 while ε = 2.2409 and x₀ = 2.0. What does that show?',
      options: [
        { text: 'The noise was unusually large', explanation: 'It is an ordinary draw from a standard normal.' },
        { text: 'The signal coefficient is 0.0064, so the original value contributes 0.0128 — the data is gone, which is what lets sampling start from pure noise', explanation: 'Correct. If any information survived, generation could not begin from noise.' },
        { text: 'The schedule is broken', explanation: 'It is the standard linear schedule behaving exactly as intended.' },
        { text: 'x_t should equal x₀', explanation: 'The whole point is that it should not.' },
      ],
      correct: 1,
    },
    {
      question: 'Half the signal is gone by t ≈ 300 and 97% by t = 700. What did that observation motivate?',
      options: [
        { text: 'More timesteps', explanation: 'The distribution across steps is the issue, not their number.' },
        { text: 'The cosine schedule, because the linear one spends most of its steps at the very noisy end where little is left to learn', explanation: 'Correct — the transition is not linear in t.' },
        { text: 'Larger networks', explanation: 'Capacity is a separate question.' },
        { text: 'Latent diffusion', explanation: 'That addresses resolution cost, not schedule shape.' },
      ],
      correct: 1,
    },
    {
      question: 'DDPM needed 1,000 network evaluations per image and a GAN needs 1. How was that closed?',
      options: [
        { text: 'Faster hardware', explanation: 'A thousandfold gap is not a hardware problem.' },
        { text: 'DDIM made the reverse process deterministic so steps could be skipped (50 is near-identical), and distillation pushes it to 1–4', explanation: 'Correct. The gap that defined the trade-off has largely closed.' },
        { text: 'Smaller images', explanation: 'Resolution is what latent diffusion addresses, separately.' },
        { text: 'By dropping the U-Net', explanation: 'The U-Net remains standard.' },
      ],
      correct: 1,
    },
    {
      question: 'What does classifier-free guidance control?',
      options: [
        { text: 'The number of sampling steps', explanation: 'That is the sampler\'s schedule.' },
        { text: 'How strongly the output adheres to the prompt, by extrapolating away from the unconditional prediction — at the cost of diversity', explanation: 'Correct, and w ≈ 7 is a common default.' },
        { text: 'The latent space dimension', explanation: 'That is fixed by the autoencoder.' },
        { text: 'The noise schedule', explanation: 'Guidance operates on the predicted noise, not the schedule.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Explain how diffusion models work.',
      answer:
        'Two processes. The forward one is fixed and requires no learning: add a little Gaussian noise repeatedly until the image is pure noise. Because Gaussians compose, there is a closed form — x_t = √ᾱ_t·x₀ + √(1−ᾱ_t)·ε — so training can jump straight to any timestep in one operation. The reverse process is what is learned: a U-Net is shown a noisy image and the timestep, and trained to predict the noise that was added, under plain squared error. To generate, start from pure noise and take many small reverse steps. The whole advantage is that the objective is ordinary regression against a self-generated target, so there is no adversary to fight.',
      isCaseBased: false,
    },
    {
      question: 'Why did diffusion beat GANs?',
      answer:
        'Training stability, not picture quality in principle. A GAN\'s loss is another network\'s current opinion, so the pair can oscillate, the discriminator can win and flatten the generator\'s gradient, and mode collapse is a standing risk. Diffusion has none of that: the target is generated by a fixed forward process, the loss is squared error, and it goes down when the model improves — so you can read it. Coverage follows too, because the objective spans the whole distribution by construction rather than rewarding whatever fools a critic. The cost was sampling steps, a thousandfold gap against a GAN\'s single pass, and DDIM plus distillation have largely closed that.',
      isCaseBased: false,
    },
    {
      question: 'What is latent diffusion and why does it matter?',
      answer:
        'Running diffusion directly at 512×512 pixels is enormously expensive, because every one of the sampling steps is a full U-Net pass at that resolution. Latent diffusion first trains an autoencoder that compresses images by roughly a factor of 8 per side, runs the entire diffusion process in that latent space, and decodes once at the end. That is about 64 times less work per step. It is what made Stable Diffusion runnable on consumer hardware and therefore what made image generation widely available, and it is a good example of the pattern where the win comes from changing the space you operate in rather than the algorithm.',
      isCaseBased: true,
    },
    {
      question: 'Explain classifier-free guidance.',
      answer:
        'The model is trained both conditionally on a text prompt and unconditionally, by dropping the prompt some fraction of the time. At sampling, both predictions are computed and the result is extrapolated away from the unconditional one: ε = ε_uncond + w·(ε_cond − ε_uncond). Larger w pushes harder toward whatever the prompt distinguishes, which increases adherence and reduces diversity, with w around 7 a common default and very high values producing oversaturated artefacts. It replaced classifier guidance, which needed a separate noise-aware classifier, and it is the single knob most responsible for how well modern image generators follow prompts. The cost is two forward passes per step.',
      isCaseBased: false,
    },
    {
      question: 'When would you still choose a GAN?',
      answer:
        'When inference must be a single forward pass and the domain is narrow. Super-resolution and face editing are the standing examples — the output distribution is tightly constrained by the input, which is exactly the setting where mode collapse matters least and a GAN\'s adversarial loss produces sharper detail than a reconstruction loss would. Real-time applications with a strict latency budget are the other case, though few-step distilled diffusion is eroding that. For open-ended generation I would not start with a GAN now: the training instability is a real engineering cost and diffusion gives comparable or better quality without it.',
      isCaseBased: true,
    },
    {
      question: 'Why does a diffusion model use a U-Net?',
      answer:
        'Because the task is image-to-image at full resolution: given a noisy image, output a noise prediction of exactly the same shape. That needs both a large receptive field, to know what is being denoised, and fine spatial precision, to know where — the same conflict segmentation has, and the skip connections are the same answer. The additions specific to diffusion are a timestep embedding injected into every block, because one network must handle every noise level, and attention layers at the lower resolutions for global coherence. Recent work replaces it with a transformer entirely — the DiT architecture behind Sora and Stable Diffusion 3 — which scales better at large sizes.',
      isCaseBased: false,
    },
    {
      question: 'How do you evaluate a generative image model?',
      answer:
        'Not by its loss, which for a diffusion model measures noise prediction and for a GAN means almost nothing. FID is the standard: pass real and generated images through an Inception network, fit a Gaussian to each feature set, and measure the distance, so it captures quality and diversity together with lower being better. Precision and recall for generative models split those two concerns, which is more diagnostic when a model is realistic but narrow. For text-to-image, CLIP score measures prompt adherence, which FID cannot see at all. And human preference remains the reference, because FID is known to disagree with perceived quality in specific regimes.',
      isCaseBased: false,
    },
    {
      question: 'Compare the four generative families by what you would use them for.',
      answer:
        'Autoencoders do not generate at all — they are for compression, denoising and anomaly detection, where the reconstruction error is the product. VAEs give one-pass sampling and a smooth latent space at the cost of blur, and their main role now is as the compression stage inside latent diffusion rather than as generators. GANs give one-pass sharp output with unstable training and mode collapse, and survive in narrow single-pass domains like super-resolution. Diffusion gives stable training and the best coverage at the cost of sampling steps, and is the default for image, video and audio. I would add autoregressive models to the list — every language model is one, and they give exact likelihoods, which none of the others do cheaply.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'The diffusion idea', back: 'Forward: add noise repeatedly, no learning needed. Reverse: train a net to PREDICT THE NOISE at a given timestep. Squared error, no adversary.' },
    { front: 'The closed form', back: 'x_t = √ᾱ_t·x₀ + √(1−ᾱ_t)·ε with ᾱ_t = ∏(1−β). Jump to any t in one operation — no chain simulation during training.' },
    { front: 'Signal remaining', back: 'Linear schedule, T=1000: t=100 → 0.9471 signal; t=300 → 0.6296; t=700 → 0.0835; t=1000 → 0.0064.' },
    { front: 'Why the cosine schedule exists', back: 'Half the signal is gone by t≈300 and 97% by t=700, so the linear schedule spends most steps where little is left to learn.' },
    { front: 'The sampling cost', back: 'DDPM 1,000 evaluations per image; DDIM 50 is near-identical; distillation reaches 1–4. A GAN needs 1.' },
    { front: 'Latent diffusion', back: 'Compress ~8x per side with an autoencoder, diffuse in the latent, decode once. About 64x less work per step.' },
    { front: 'Classifier-free guidance', back: 'ε = ε_uncond + w·(ε_cond − ε_uncond). Higher w: more prompt adherence, less diversity. w ≈ 7 typical. Two passes per step.' },
    { front: 'The four families', back: 'AE: no sampling, error IS the product. VAE: one pass, smooth latent, blurry. GAN: one pass, sharp, unstable. Diffusion: stable, best coverage, many steps.' },
  ],
  mindmapMarkdown: `- Diffusion and the generative families
  - The idea
    - forward: add noise, FIXED, no learning
    - reverse: predict the noise, squared error
    - no adversary, no min-max, loss is readable
  - The closed form
    - x_t = sqrt(ab_t) x0 + sqrt(1-ab_t) eps
    - jump to any t in one operation
    - t=300 -> 0.6296 signal; t=1000 -> 0.0064
    - non-linear in t -> cosine schedule
  - Architecture
    - U-Net: image-to-image at full resolution
    - timestep embedding into every block
    - DiT replaces it with a transformer
  - The cost
    - DDPM 1000 evaluations vs GAN's 1
    - DDIM 50 near-identical; distillation 1-4
  - Practical additions
    - latent diffusion: ~64x less work per step
    - classifier-free guidance, w ~ 7
  - The four families
    - AE: compression, denoising, anomaly
    - VAE: smooth latent, blurry, now a compressor
    - GAN: one pass, sharp, narrow domains
    - diffusion: default for image/video/audio
    - (plus autoregressive: exact likelihood, every LLM)`,
}

export default m
