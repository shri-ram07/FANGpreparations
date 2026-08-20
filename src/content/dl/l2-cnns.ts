import type { Module } from '../types'

const m: Module = {
  id: 'dl-l2-cnns',
  subjectId: 'dl',
  level: 2,
  title: 'CNNs: Convolution, Pooling & Receptive Fields',
  whyItMatters:
    'Every vision interview runs the same two drills: "give me the output shape" and "count the parameters in this layer". Both are pure arithmetic — and both are free marks if you know the two formulas cold. This module gives you those formulas, plus the one idea underneath them (weight sharing) that turned a 150-million-weight dense layer into nine numbers.',
  estMinutes: 60,
  sections: [
    {
      type: 'intuition',
      title: 'Do the arithmetic on a dense layer first',
      md: `A standard ImageNet photo is 224×224 pixels, 3 colour channels. Flatten it and feed it to a dense layer with 1000 units.

- Inputs: 224 × 224 × 3 = **150,528 numbers**.
- Weights in that ONE layer: 150,528 × 1000 = **150,528,000**.
- That is more parameters in a single layer than GPT-2 small has in total. And you still have the rest of the network to build.
- Memory and compute are only the first problem. The other two are worse.`,
    },
    {
      type: 'math',
      intro: 'The number that kills the idea, written out.',
      latex: [
        '224 \\times 224 \\times 3 = 150{,}528 \\;\\text{inputs} \\;\\Longrightarrow\\; 150{,}528 \\times 1000 = 150{,}528{,}000 \\;\\text{weights}',
        '\\text{(plus 1000 biases — noise next to that)}',
      ],
    },
    {
      type: 'intuition',
      title: 'The two problems money cannot fix',
      md: `**Problem 1: flattening destroys spatial structure.** Pixel (5,5) and pixel (5,6) are neighbours — they are probably part of the same edge. After flatten they are just entries 1220 and 1223 in a long list. The dense layer has no idea they were adjacent; it must *learn* that fact from scratch, from data.

**Problem 2: no translation invariance.** Train the dense layer on cats in the centre. Move the cat 20 pixels right — every input lands on a different weight. The network has learned "cat in the middle", not "cat".

- A dense layer treats an image as an unordered bag of 150,528 numbers.
- An image is not that. It is a grid, and the *same* patterns (edges, corners, textures) appear anywhere in it.
- A convolution is what you get when you build those two facts into the architecture instead of hoping the network discovers them.`,
    },
    {
      type: 'intuition',
      title: 'Convolution: one small stamp, dragged everywhere',
      md: `Think of a 3×3 rubber stamp with nine numbers on it. You slide it over the image, one position at a time.

- At each stop: multiply each of the 9 stamp numbers by the 9 pixels underneath, add them all up. One number out.
- That number goes into an output grid at the matching position. The grid is called a **feature map**.
- The stamp is the **kernel** (or **filter**). Its nine numbers are the *learned parameters*.
- A kernel tuned one way lights up on vertical edges. Tuned another way it blurs. Same machinery, different nine numbers.
- The output is not a class or a score — it is *an image of where that pattern was found*.`,
    },
    { type: 'visual', component: 'ConvolutionPlayground', props: {} },
    {
      type: 'note',
      md: `Drive that, do not just watch it. **(1)** Step through with the *edge-detect* kernel on the *edge* image — output stays black across the flat regions and lights up only at the boundary, because the centre 4 cancels its four neighbours exactly when they are all equal. **(2)** Switch to *blur* (nine 0.1s) — the same slide now produces a soft grey smear. Nothing changed except nine numbers. **(3)** Now the point: watch the blue box slide across all 100 positions. **The kernel never changes.** Those same nine numbers are being reused at every single position — that is weight sharing, and you are looking at it.`,
    },
    {
      type: 'intuition',
      title: 'Weight sharing — the whole trick, in one comparison',
      md: `The playground maps a 12×12 input to a 10×10 output. Count both ways:

- **Dense:** every one of 144 inputs wired to every one of 100 outputs → 144 × 100 = **14,400 weights**.
- **Convolution:** one 3×3 kernel, reused at all 100 positions → **9 weights** (+1 bias).
- 1600× fewer parameters, for the *same* output size.
- Why it is legal: an edge detector that works at the top-left works at the bottom-right. The feature does not depend on location, so neither should the weights.
- Free bonus: shift the input, and the output shifts the same way. Translation *equivariance* comes built in — no data augmentation required to get it.`,
    },
    {
      type: 'intuition',
      title: 'Local connectivity — the second saving',
      md: `Weight sharing says *reuse* the weights. Local connectivity says there were few to begin with.

- Each output pixel looks at a 3×3 patch, not the whole image. That is **sparse interaction**: 9 connections per output, not 150,528.
- Justification: pixels far apart are rarely directly related. Long-range structure gets assembled later, by stacking layers.
- Together: sparse connections (few weights per output) + weight sharing (one set for all outputs) = the parameter count collapses.
- The prior you are baking in: *local patterns, position-independent*. It is exactly right for images and exactly wrong for, say, tabular data.`,
    },
    {
      type: 'intuition',
      title: 'The four knobs',
      md: `A conv layer has four hyperparameters that decide the output size:

- **Kernel size k** — how big the stamp is. 3×3 is the modern default; 1×1, 5×5, 7×7 all appear.
- **Stride s** — how far the stamp jumps between stops. s=1 visits every position; s=2 skips every other one and halves the output.
- **Padding p** — rings of zeros added around the border. Two named settings: **'valid'** = no padding (p=0, output shrinks), **'same'** = enough padding that output size equals input size (for s=1).
- **Dilation d** — spread the kernel's taps apart with gaps, so a 3×3 covers a 5×5 area with the same 9 weights: bigger reach, no extra parameters.
- Padding also exists to save the border: without it, corner pixels get looked at once while centre pixels get looked at nine times.`,
    },
    {
      type: 'math',
      intro: 'THE formula. Memorise this one — it is asked verbatim.',
      latex: [
        '\\text{out} = \\left\\lfloor \\frac{n + 2p - k}{s} \\right\\rfloor + 1',
        '\\text{with dilation } d: \\quad k_{\\text{eff}} = d(k-1)+1 \\;\\Longrightarrow\\; \\text{out} = \\left\\lfloor \\frac{n + 2p - d(k-1) - 1}{s} \\right\\rfloor + 1',
        '\\text{\'same\' padding for } s=1: \\quad p = \\frac{k-1}{2} \\quad (k=3 \\to p=1,\\; k=5 \\to p=2,\\; k=7 \\to p=3)',
      ],
    },
    {
      type: 'note',
      md: `Three by hand — say each one out loud until it is automatic. **(1)** n=32, k=3, p=1, s=1 → (32 + 2 − 3)/1 = 31, +1 = **32**. Size preserved: that is 'same'. **(2)** n=32, k=3, p=0, s=2 → (32 + 0 − 3)/2 = 29/2 = 14 after flooring, +1 = **15**. Note the floor: the last incomplete window is simply dropped. **(3)** n=224, k=7, p=3, s=2 → (224 + 6 − 7)/2 = 223/2 = 111 floored, +1 = **112**. That is the ResNet stem, and it is why a 224 input becomes 112 after one layer.`,
    },
    {
      type: 'intuition',
      title: 'Channels: the third dimension nobody draws',
      md: `Textbook pictures show a flat 3×3 square sliding over a flat image. Real inputs have depth.

- An RGB input is 224×224×**3**. A mid-network activation might be 28×28×**256**.
- A kernel always spans **all** input channels. A "3×3 kernel" on a 64-channel input is really 3×3×64 = **576 weights** — one little cube, not a square.
- That cube slides over height and width only. It does not slide over channels; it consumes them all at once.
- One cube produces one feature map, i.e. **one output channel**. Want 128 output channels? Use 128 separate cubes.
- So: **number of filters = number of output channels**. That is the layer's only channel knob.`,
    },
    {
      type: 'math',
      intro: 'Parameter counting. The second formula interviews demand — and the +1 is the bias, one per filter.',
      latex: [
        '\\text{params} = (k_h \\times k_w \\times C_{\\text{in}} + 1) \\times C_{\\text{out}}',
        '\\text{Example: } 3\\times3 \\text{ conv, } C_{\\text{in}}=64,\\; C_{\\text{out}}=128',
        '(3 \\times 3 \\times 64 + 1) \\times 128 = (576 + 1) \\times 128 = 577 \\times 128 = 73{,}856',
        '\\text{Note what is absent: } n. \\;\\text{Input height and width never enter the count.}',
      ],
    },
    {
      type: 'note',
      md: `That last line is the trap, and interviewers set it deliberately. Feed that same layer a 32×32 image or a 512×512 image — it still has 73,856 parameters. Image size changes the *activation* memory (how many numbers flow through) and the *FLOPs* (how many multiply-adds), never the weight count. If a candidate's parameter answer contains the input resolution, they have confused weights with activations.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Convolution from scratch — and checked against a hand computation',
      code: `import numpy as np

def conv2d_valid(img, kernel):
    kh, kw = kernel.shape
    H, W = img.shape
    out_h = H - kh + 1                       # out = (n + 2p - k)/s + 1, here p=0 s=1
    out_w = W - kw + 1
    out = np.zeros((out_h, out_w))
    for r in range(out_h):
        for c in range(out_w):
            patch = img[r:r + kh, c:c + kw]  # the receptive field of this output pixel
            out[r, c] = (patch * kernel).sum()   # multiply-accumulate: the whole operation
    return out

img = np.array([[1, 2, 3, 0],
                [4, 5, 6, 1],
                [7, 8, 9, 2],
                [0, 1, 2, 3]], dtype=float)

kernel = np.array([[ 0, -1,  0],
                   [-1,  4, -1],
                   [ 0, -1,  0]], dtype=float)

out = conv2d_valid(img, kernel)
print('input', img.shape, '-> output', out.shape)
print(out)

by_hand = np.array([[0., 6.], [10., 18.]])
assert np.allclose(out, by_hand), out
print('matches hand computation:', by_hand.tolist())

# input (4, 4) -> output (2, 2)
# [[ 0.  6.]
#  [10. 18.]]
# matches hand computation: [[0.0, 6.0], [10.0, 18.0]]`,
      annotations: {
        6: 'The output-size formula, in code. 4 − 3 + 1 = 2, so a 4×4 input gives a 2×2 output.',
        11: 'This slice IS the receptive field: the exact input pixels that output[r][c] can ever see.',
        12: 'Elementwise multiply, then sum. Every convolution ever computed is this line, tiled.',
        28: 'Hand-check on out[0][0]: centre 5 with neighbours 2, 4, 6, 8 → 4·5 − 2 − 4 − 6 − 8 = 0. Flat region, edge detector stays silent. out[1][1]: 4·9 − 6 − 8 − 2 − 2 = 18 — a real edge.',
        29: 'The assert is the test. Break the loop bounds or the slicing and this line fires.',
      },
    },
    {
      type: 'note',
      md: `Honest footnote: what that code computes — and what PyTorch's \`Conv2d\` computes — is technically **cross-correlation**. True mathematical convolution flips the kernel 180° first. Nobody bothers, because the kernel is *learned*: it simply learns the flipped version. The name stuck; the flip did not. Say this in an interview and you sound like you have read the source.`,
    },
    {
      type: 'intuition',
      title: 'Pooling: throw away detail on purpose',
      md: `A pooling layer slides a window (usually 2×2, stride 2) and reduces each window to one number. No weights at all.

- **Max pooling** keeps the largest value: "did this feature appear anywhere in this window?" Position within the window is discarded.
- **Average pooling** keeps the mean: smoother, keeps intensity information, less popular in the middle of a network.
- Why do it: it **downsamples** (2×2/s2 quarters the spatial size, cutting memory and compute), and it grants **small translation invariance** — shift the input one pixel and a max-pooled output often does not change at all.
- Note the difference from convolution: conv is *equivariant* (shift in → shift out), pooling adds *invariance* (shift in → no change out). You want both, in that order.
- The modern trend: **replace pooling with a stride-2 convolution**. It downsamples too, but *learns* how to summarise instead of hardcoding "take the max". ResNet and most modern nets do this; pooling survives mainly in the stem and as global pooling at the end.`,
    },
    {
      type: 'intuition',
      title: 'Receptive field: what one neuron can possibly see',
      md: `Pick one number in the final feature map. Trace backwards through every layer. The patch of *input pixels* that can influence it is its **receptive field**.

- One 3×3 conv: receptive field 3×3. A neuron there can never see a 5-pixel-wide object in full.
- Stack another 3×3 on top: each of its 9 inputs already saw 3×3, and they overlap — total reach **5×5**.
- Add a 2×2/s2 pool and the field starts growing *twice as fast*, because every later step now moves two input pixels at a time.
- This is the practical constraint nobody mentions until the model fails: **if the receptive field is smaller than the object, the network literally cannot see the whole thing.** Classifying a 200-pixel dog with a 40-pixel receptive field is guesswork.
- Depth, stride, and dilation are the three ways to grow it. Only depth also adds representational power.`,
    },
    {
      type: 'math',
      intro: 'The recurrence. r = receptive field, j = jump (how many input pixels one step at this layer covers). Start r=1, j=1.',
      latex: [
        'r_l = r_{l-1} + (k_l - 1)\\, j_{l-1} \\qquad j_l = j_{l-1} \\cdot s_l',
        '\\text{conv3}\\to r{=}3,\\,j{=}1 \\;\\to\\; \\text{conv3}\\to r{=}5,\\,j{=}1 \\;\\to\\; \\text{pool2s2}\\to r{=}6,\\,j{=}2',
        '\\;\\to\\; \\text{conv3}\\to r{=}10,\\,j{=}2 \\;\\to\\; \\text{conv3}\\to r{=}14,\\,j{=}2 \\;\\to\\; \\text{pool2s2}\\to r{=}16,\\,j{=}4',
      ],
    },
    {
      type: 'intuition',
      title: 'Two 3×3 beat one 5×5 — the VGG argument',
      md: `Both stacks reach the same 5×5 of input. VGG's whole contribution was noticing you should always take the pair.

- **Same receptive field.** 3 → then 3 again → 5. Verified by the recurrence above.
- **Fewer parameters.** With 64 channels in and out: one 5×5 costs (25·64+1)·64 = 102,464. Two 3×3 cost 2 × (9·64+1)·64 = 73,856. That is **28% cheaper**.
- **More non-linearity.** Two convs means two ReLUs instead of one — a strictly more expressive function for less money.
- Push it further: three 3×3 reach 7×7 for 27C² versus 49C² — **45% cheaper**, three ReLUs.
- This is why almost every architecture after 2014 is a tower of 3×3 convolutions. The only surviving large kernel is usually the 7×7 stem, which runs on 3 channels where it is cheap.`,
    },
    {
      type: 'math',
      intro: 'The comparison, with C_in = C_out = 64.',
      latex: [
        '\\underbrace{(5\\times5\\times64+1)\\times64}_{\\text{one }5\\times5} = 1601 \\times 64 = 102{,}464',
        '\\underbrace{2\\times\\left[(3\\times3\\times64+1)\\times64\\right]}_{\\text{two }3\\times3} = 2 \\times 36{,}928 = 73{,}856',
        '73{,}856 \\,/\\, 102{,}464 \\approx 0.72 \\quad \\Rightarrow \\quad 28\\% \\text{ fewer parameters, same reach, one extra ReLU}',
      ],
    },
    {
      type: 'note',
      md: `The standard block is **conv → norm → activation → (pool)**. Norm goes *before* the activation because that is the point of it: it centres and scales the pre-activation values so they land in the responsive part of the non-linearity instead of drifting into a saturated or all-negative region. A practical consequence to mention in interviews: **set \`bias=False\` on a conv that feeds a BatchNorm** — BN subtracts the batch mean, which erases any constant the bias added, so those parameters do literally nothing. (Post-activation norm exists and is used in some transformer variants; for CNNs, conv → BN → ReLU is the default you should quote.)`,
    },
    {
      type: 'intuition',
      title: '1×1 convolutions, honestly',
      md: `A 1×1 kernel looks pointless — it sees a single pixel. It is not pointless, because it still spans every channel.

- A 1×1 conv on a 256-channel input is a 256-length vector of weights per filter: it **mixes channels** at each position independently.
- Main use: **change the channel count cheaply**. 256 → 64 costs (256+1)·64 = 16,448 parameters and touches no spatial extent.
- That is the **bottleneck** trick: squeeze channels with 1×1, do the expensive 3×3 in the narrow space, expand back with 1×1.
- ResNet-50 numbers: a plain 3×3 at 256→256 costs 590,080. The 1×1/3×3/1×1 bottleneck costs 16,448 + 36,928 + 16,640 = 70,016 — **8.4× less** for a comparable job.
- It also adds a non-linearity per 1×1 (they are followed by norm+ReLU too), so it is not purely a resize.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'End-to-end shape trace — every layer, both formulas, real output',
      code: `def out_size(n, k, p, s):
    return (n + 2 * p - k) // s + 1        # floor division IS the floor()

def conv_params(k, c_in, c_out):
    return (k * k * c_in + 1) * c_out      # +1 = one bias per filter

h, w, c, total = 32, 32, 3, 0
print(f'input           {h}x{w}x{c}')

h = w = out_size(h, 3, 1, 1)               # 'same' padding: 32 -> 32
p = conv_params(3, c, 16); c = 16; total += p
print(f'conv3x3 p1 s1   {h}x{w}x{c}   params {p}')

h = w = out_size(h, 2, 0, 2)               # pooling halves it
print(f'maxpool2 s2     {h}x{w}x{c}   params 0')

h = w = out_size(h, 3, 1, 1)
p = conv_params(3, c, 32); c = 32; total += p
print(f'conv3x3 p1 s1   {h}x{w}x{c}   params {p}')

h = w = out_size(h, 2, 0, 2)
print(f'maxpool2 s2     {h}x{w}x{c}   params 0')

flat = h * w * c
p = flat * 10 + 10; total += p
print(f'flatten         {flat}  ->  dense 10   params {p}')
print(f'TOTAL {total}   dense share {p / total:.1%}')
print(f'global avg pool instead: {c * 10 + 10} params, total {total - p + c * 10 + 10}')

# input           32x32x3
# conv3x3 p1 s1   32x32x16   params 448
# maxpool2 s2     16x16x16   params 0
# conv3x3 p1 s1   16x16x32   params 4640
# maxpool2 s2     8x8x32   params 0
# flatten         2048  ->  dense 10   params 20490
# TOTAL 25578   dense share 80.1%
# global avg pool instead: 330 params, total 5418`,
      annotations: {
        2: 'Integer division in Python floors for positive numbers — exactly the floor in the formula.',
        5: 'One bias per filter, not per position. The bias is shared across the feature map just like the weights.',
        10: '\'same\' padding (p=1 for k=3) holds the size at 32: ⌊(32 + 2 − 3)/1⌋ + 1 = 32.',
        11: 'First conv: (3·3·3 + 1) · 16 = 28 · 16 = 448. Three input channels because the image is RGB.',
        18: 'Second conv: (3·3·16 + 1) · 32 = 145 · 32 = 4,640. C_in is 16 — the previous layer\'s filter count.',
        25: '8 · 8 · 32 = 2,048 flattened, times 10 classes, plus 10 biases = 20,490.',
        27: 'The punchline: two conv layers hold 5,088 parameters; the single dense layer holds 20,490 — 80% of the model.',
        28: 'Global average pooling collapses each 8×8 map to its mean, giving a 32-vector. Dense 32→10 = 330. The model shrinks 4.7× and stops being resolution-locked.',
      },
    },
    {
      type: 'intuition',
      title: 'Global average pooling: deleting the last dense layer',
      md: `That 80% figure is not a toy artifact. VGG-16's first fully connected layer alone (7×7×512 = 25,088 inputs → 4,096 units) is 25,088 × 4,096 + 4,096 ≈ **102.8 million** parameters, out of ~138M total.

- **Global average pooling (GAP)** replaces flatten+dense: average each C_out feature map down to a single number, giving a length-C_out vector.
- Cost: **zero parameters**. Then one small dense layer maps C_out → classes.
- Second win: the network stops caring about input resolution. Flatten hardcodes the spatial size into the dense layer's shape; GAP averages whatever it gets.
- Third win: fewer parameters in the classifier means far less overfitting — GAP acts as a structural regulariser.
- Every modern classifier (ResNet onward) ends conv → GAP → one dense layer. If you write flatten → 4096 → 4096 today, you are writing 2014.`,
    },
    {
      type: 'note',
      md: `Two formulas carry this entire module, and both get asked in the first ten minutes of a vision interview: **shape** = ⌊(n + 2p − k)/s⌋ + 1, applied per layer; **parameters** = (k_h × k_w × C_in + 1) × C_out, and the input size is nowhere in it. Everything else here — weight sharing, pooling, receptive fields, the VGG stack, the bottleneck — is an argument about *why* those numbers come out small.`,
    },
  ],
  quiz: [
    {
      question:
        'Input is 28×28×1. You apply a conv layer with 6 filters, kernel 5×5, stride 1, no padding. What is the output shape?',
      options: [
        {
          text: '24×24×6',
          explanation:
            'Correct. Spatial: (28 + 0 − 5)/1 + 1 = 24, both dimensions. Depth = number of filters = 6. This is literally LeNet-5 layer one.',
        },
        {
          text: '28×28×6',
          explanation:
            'That would need padding p=2 to hold the size. With no padding, a 5×5 kernel eats 4 pixels off each dimension.',
        },
        {
          text: '24×24×1',
          explanation:
            'The spatial part is right but the depth is wrong: each of the 6 filters produces its own feature map, so output depth is 6.',
        },
      ],
      correct: 0,
    },
    {
      question: 'A 3×3 conv layer takes a 64-channel input and produces 128 channels, with biases. How many parameters?',
      options: [
        {
          text: '1,152',
          explanation:
            'This is 3·3·128 — it forgot that the kernel spans ALL 64 input channels. Each filter is a 3×3×64 cube, not a 3×3 square.',
        },
        {
          text: '73,728',
          explanation:
            'Close: 3·3·64·128 = 73,728 is the weight count, but it drops the biases. One bias per filter adds 128 more.',
        },
        {
          text: '73,856',
          explanation:
            'Correct. (3 × 3 × 64 + 1) × 128 = 577 × 128 = 73,856. Kernel area × input channels + bias, all times output channels.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Input 64×64. Conv with kernel 3, stride 2, padding 1. Output spatial size?',
      options: [
        {
          text: '31',
          explanation:
            'This is what you get if you forget the +1 at the end: ⌊63/2⌋ = 31 is only the number of jumps, not the number of positions.',
        },
        {
          text: '32',
          explanation:
            'Correct. ⌊(64 + 2 − 3)/2⌋ + 1 = ⌊63/2⌋ + 1 = 31 + 1 = 32. Stride 2 with same-style padding halves the size — the standard downsampling conv.',
        },
        {
          text: '64',
          explanation: 'Stride 2 means the kernel visits every other position; the output cannot stay at input size.',
        },
      ],
      correct: 1,
    },
    {
      question: 'What does "weight sharing" actually mean in a conv layer?',
      options: [
        {
          text: 'The same kernel values are reused at every spatial position of the input',
          explanation:
            'Correct. One set of k×k×C_in weights is applied at every location — which is why the parameter count does not depend on image size, and why a detected feature transfers across positions.',
        },
        {
          text: 'All filters in the layer share one set of weights',
          explanation:
            'No — filters are independent and each learns a different pattern. Sharing happens across positions, not across filters.',
        },
        {
          text: 'Weights are shared between the training and inference passes',
          explanation:
            'True of every layer in any network, and not what the term means. Sharing here is spatial.',
        },
      ],
      correct: 0,
    },
    {
      question: 'Why do architectures stack two 3×3 convs instead of using one 5×5?',
      options: [
        {
          text: 'The 5×5 has a larger receptive field, but 3×3 is faster per layer',
          explanation:
            'The receptive fields are the SAME — two stacked 3×3 convs reach 5×5 of input. That equality is the whole basis of the argument.',
        },
        {
          text: 'Same 5×5 receptive field, ~28% fewer parameters, and two non-linearities instead of one',
          explanation:
            'Correct. With 64 channels: 73,856 vs 102,464 parameters, identical reach, plus an extra ReLU of expressiveness. The VGG argument.',
        },
        {
          text: '3×3 kernels can detect diagonal edges that 5×5 kernels cannot',
          explanation:
            'Kernel size does not restrict orientation — a 5×5 can represent anything a 3×3 can, and more. The argument is cost and depth, not capability.',
        },
      ],
      correct: 1,
    },
    {
      question: 'How many learnable parameters does a 2×2 max-pooling layer with stride 2 have?',
      options: [
        {
          text: '4 — one per window cell',
          explanation:
            'Pooling has no kernel to learn. Taking the max is a fixed operation with nothing to tune.',
        },
        {
          text: '0 — pooling is a fixed operation',
          explanation:
            'Correct. Zero parameters. That is also the argument for replacing it with a stride-2 conv, which pays parameters in exchange for learning HOW to downsample.',
        },
        {
          text: 'Depends on the number of input channels',
          explanation:
            'Pooling runs independently per channel but still learns nothing — the count is 0 regardless of depth.',
        },
      ],
      correct: 1,
    },
    {
      question: 'What is a 1×1 convolution good for?',
      options: [
        {
          text: 'Mixing information across channels and changing the channel count cheaply',
          explanation:
            'Correct. It has no spatial extent but spans all C_in channels, so it is a learned per-pixel channel projection — the basis of the bottleneck block (256→64→256).',
        },
        {
          text: 'Nothing — it just copies the input',
          explanation:
            'That would be true only for a single-channel input with weight 1. Across 256 channels it is a full linear mixing of the depth dimension.',
        },
        {
          text: 'Increasing the receptive field without adding parameters',
          explanation:
            'A 1×1 conv leaves the receptive field completely unchanged. Growing the field without parameters is what DILATION does.',
        },
      ],
      correct: 0,
    },
    {
      question:
        'A conv layer is fed 32×32 images, then later the same layer is fed 512×512 images. What changes?',
      options: [
        {
          text: 'The parameter count grows with the image size',
          explanation:
            'The classic trap. Look at the formula: (k_h × k_w × C_in + 1) × C_out contains no n. Weights are shared across positions, so image size is absent.',
        },
        {
          text: 'Nothing changes at all',
          explanation:
            'The weights are unchanged, but activation memory and FLOPs scale with the number of positions — a 512×512 input is 256× more positions to compute.',
        },
        {
          text: 'Parameters stay identical; activation memory and FLOPs scale with the number of positions',
          explanation:
            'Correct. Weights are fixed by (k, C_in, C_out); the cost of *running* the layer scales with spatial size. Separating weights from activations is the point of the question.',
        },
      ],
      correct: 2,
    },
  ],
  interviewQuestions: [
    {
      question:
        'Why not just flatten an image and use dense layers? Give me the numbers.',
      answer:
        'Three reasons, and lead with the arithmetic: a 224×224×3 image is 150,528 inputs, so one dense layer of 1000 units is 150,528,000 weights — more than GPT-2 small, for a single layer. Beyond cost: (1) flattening destroys spatial structure — adjacent pixels become arbitrary indices and the network must relearn adjacency from data; (2) no translation invariance — a cat shifted 20 pixels hits an entirely different set of weights, so the model learns "cat at position X". A convolution encodes locality and position-independence as an architectural prior instead of hoping the data teaches them. A dense layer is not wrong, it is just an enormously wasteful way to express a function we already know the shape of.',
      isCaseBased: false,
    },
    {
      question:
        'Count the parameters: input 224×224×3, then conv 7×7/64 filters, then conv 3×3/128, then conv 1×1/32. Walk me through it.',
      answer:
        'Formula: (k_h × k_w × C_in + 1) × C_out. Layer 1: (7·7·3 + 1) × 64 = (147+1) × 64 = 148 × 64 = 9,472. Layer 2: C_in is now 64, so (3·3·64 + 1) × 128 = 577 × 128 = 73,856. Layer 3: (1·1·128 + 1) × 32 = 129 × 32 = 4,128. Total 87,456. Two things to say unprompted: the input resolution 224 appears nowhere — weights are shared across positions, so parameters are independent of image size; and each layer\'s C_in is the previous layer\'s filter count, which is where most people slip. If the layer feeds a BatchNorm, drop the +1: the bias is redundant because BN subtracts the mean anyway.',
      isCaseBased: false,
    },
    {
      question: 'Give me the output-size formula and explain each term physically.',
      answer:
        'out = ⌊(n + 2p − k)/s⌋ + 1. n is the input side; 2p is padding added on both sides; subtracting k accounts for the kernel needing k pixels to sit anywhere at all; dividing by s counts how many strided jumps fit; the +1 counts the starting position itself. The floor drops the final incomplete window. Worked: n=32, k=3, p=1, s=1 → 32 (that is \'same\', which for stride 1 needs p=(k−1)/2). n=224, k=7, p=3, s=2 → ⌊223/2⌋+1 = 112, the ResNet stem. With dilation d the kernel effectively becomes d(k−1)+1 wide, so substitute that for k. Pooling uses the same formula with the pool window as k.',
      isCaseBased: false,
    },
    {
      question: 'What is a receptive field, how do you compute it, and why should anyone care?',
      answer:
        'It is the region of the *input image* that can influence one particular output unit. Compute it with r_l = r_{l−1} + (k_l − 1)·j_{l−1}, where j is the cumulative stride (j_l = j_{l−1}·s_l), starting at r=1, j=1. Two 3×3 convs give 5; add a 2×2/s2 pool and the jump doubles, so subsequent layers grow the field twice as fast. Why care: if the receptive field is smaller than the object you are trying to recognise, no amount of training fixes it — the unit physically cannot see the whole thing. It is the first thing to check when a segmentation model handles small objects well and large ones badly. Growth levers: depth (adds capacity too), stride/pooling (cheap but loses resolution), dilation (free reach, but can cause gridding artifacts).',
      isCaseBased: false,
    },
    {
      question: 'Max pooling vs average pooling vs strided convolution — pick one and defend it.',
      answer:
        'Max pooling asks "did this feature appear anywhere in the window" and discards where — it gives a small translation invariance and is the classic default. Average pooling preserves intensity and smooths, which is why it survives as *global* average pooling at the head but rarely mid-network: averaging a strong activation with three weak ones dilutes the signal. Strided convolution is the modern default mid-network: it downsamples like pooling but *learns* the summary instead of hardcoding max, at the cost of parameters and compute. My default: stride-2 convs for downsampling inside the network, global average pooling at the head, max pooling only in a stem where cheapness matters. The honest caveat: the empirical difference is modest — this is a defensible-preference question, not a right-answer question.',
      isCaseBased: false,
    },
    {
      question:
        'Explain why almost every architecture after 2014 is built from 3×3 convolutions.',
      answer:
        'Two stacked 3×3 convs have the same 5×5 receptive field as one 5×5 conv, but with 64 channels cost 73,856 parameters instead of 102,464 — 28% less — and give two ReLUs instead of one, so strictly more expressive for less money. Three 3×3 reach 7×7 for 27C² versus 49C², 45% cheaper. So any large kernel can be decomposed into a cheaper, deeper, more non-linear stack. The exception that proves it: the 7×7 stem, which runs on a 3-channel input where large kernels are cheap and you want a big early receptive field on the full-resolution image. (Large kernels have made a partial comeback in ConvNeXt-style depthwise designs, where the cost math is different — worth mentioning if you want to show you keep up.)',
      isCaseBased: false,
    },
    {
      question:
        'Case: your CNN hits 96% on the validation set but collapses in production. Investigation shows the training images always had the object centred; production images have it anywhere in frame. What went wrong and how do you fix it?',
      answer:
        'Convolutions give translation *equivariance*, not invariance — a shifted input produces a shifted feature map, which is only useful if the head ignores position. If the model ends in flatten → dense, that head is position-*dependent*: each spatial location has its own weights, so an off-centre object lands on weights that never learned it. Fixes, in order: (1) replace flatten+dense with **global average pooling** — averaging over positions makes the head genuinely translation-invariant and kills most of the failure; (2) **random-crop and translate augmentation** so the training distribution actually contains off-centre objects; (3) check whether pooling was stripped out — some invariance comes from there. Tradeoff to name: GAP throws away coarse position information, which is fine for classification and wrong for localisation — a detector needs that spatial head, and would fix this with augmentation and anchor design instead.',
      isCaseBased: true,
    },
    {
      question:
        'Case: your CNN has only 5 million parameters but training OOMs at batch size 32 on a 24GB GPU. A colleague says "just prune the model". Is that the right move?',
      answer:
        'Almost certainly not — the memory is in activations, not weights. 5M parameters in fp32 is ~20MB, ~60MB with Adam states; that is not what filled 24GB. Early conv layers operate at high resolution with many channels: a 224×224×64 activation is 3.2M floats per image, and backprop must retain activations for every layer to compute gradients, times batch size 32. Diagnosis: print per-layer output shapes and multiply out. Fixes ranked: (1) reduce batch size and use gradient accumulation — zero quality cost; (2) mixed precision (fp16/bf16) — roughly halves activation memory; (3) gradient checkpointing — recompute activations in the backward pass, trading ~30% compute for a large memory saving; (4) downsample earlier in the network (a stride-2 stem) which is a real architecture change; (5) only then touch parameter count. The interview point is the distinction: parameters scale with (k, C_in, C_out); activation memory scales with resolution × channels × batch.',
      isCaseBased: true,
    },
    {
      question:
        'Case: a semantic-segmentation model handles small objects well but produces mush on large ones. What is your hypothesis and what do you try?',
      answer:
        'First hypothesis: the receptive field is smaller than the large objects. Compute it with the recurrence — if the final layer sees, say, 60 pixels of a 500-pixel input, no unit can ever perceive a large object as a whole, and you get exactly this symptom: locally plausible, globally incoherent output. Options and their costs: (1) **dilated/atrous convolutions** — enlarge the field with no extra parameters and no resolution loss, the standard segmentation answer (DeepLab), but watch for gridding artifacts; (2) add depth or a downsampling stage — grows the field but loses spatial precision you then have to upsample back; (3) **pyramid pooling / ASPP** — parallel branches at several dilation rates so the model sees multiple scales at once; (4) encoder-decoder with skip connections (U-Net) — deep encoder for context, skips to restore fine detail. Second hypothesis, worth ruling out cheaply: class imbalance in the loss, where large objects are dominated by boundary pixels. Check the receptive field first because it is arithmetic and free.',
      isCaseBased: true,
    },
    {
      question:
        'Why is the standard block conv → norm → activation rather than conv → activation → norm? And what should the conv\'s bias be?',
      answer:
        'Norm before activation because normalising is meant to control the *pre-activation* distribution: it puts values in the responsive region of the non-linearity rather than letting them drift into saturation (sigmoid/tanh) or into a mostly-negative range that ReLU zeros out. BatchNorm\'s learned γ and β then let the layer rescale if the identity was better. On the bias: set it to zero/False on any conv immediately followed by BatchNorm — BN subtracts the batch mean, which cancels any constant offset the bias contributed, so those parameters are exactly useless (BN\'s β is the real bias). Caveat worth adding: post-norm and pre-norm orderings both exist and the debate is live in transformers; for CNNs, conv → BN → ReLU is the convention.',
      isCaseBased: false,
    },
    {
      question: 'What does global average pooling replace, and what do you gain and lose?',
      answer:
        'It replaces flatten → giant dense layer. VGG-16\'s first FC layer alone is 25,088 × 4,096 + 4,096 ≈ 102.8M parameters out of ~138M total — the classifier head is most of the model. GAP averages each of the C_out feature maps to a single number, giving a C_out-vector at zero parameter cost, and one small dense layer maps that to classes. Gains: massive parameter reduction (and hence less overfitting — it acts as a structural regulariser), and the network stops being locked to one input resolution, because flatten hardcodes the spatial size into the dense weights while GAP averages whatever it gets. Loses: all coarse spatial information — the head can no longer say *where*. Fine for classification, unacceptable for detection or segmentation, which keep spatial heads.',
      isCaseBased: false,
    },
    {
      question:
        'Explain the 1×1 convolution and the bottleneck block, with the parameter arithmetic.',
      answer:
        'A 1×1 conv has no spatial extent but spans every input channel, so it is a learned linear mixing across depth applied identically at each position — cheap channel projection. The bottleneck exploits that: instead of a plain 3×3 at 256→256, which costs (9·256+1)·256 = 590,080, ResNet-50 does 1×1 256→64 (16,448), then 3×3 64→64 (36,928), then 1×1 64→256 (16,640) — 70,016 total, about 8.4× cheaper, because the expensive 3×3 runs in a 64-channel space instead of 256. You also gain two extra norm+ReLU pairs. The cost: representational capacity is squeezed through the narrow middle, which is exactly why the residual connection matters — the identity path carries what the bottleneck would have lost.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    {
      front: 'Output-size formula',
      back: 'out = ⌊(n + 2p − k)/s⌋ + 1.  Dilation d: replace k with d(k−1)+1.  \'same\' for s=1 means p = (k−1)/2.',
    },
    {
      front: 'Conv parameter count',
      back: '(k_h × k_w × C_in + 1) × C_out.  The +1 is one bias per filter. Input height/width never appear.',
    },
    {
      front: 'Weight sharing',
      back: 'The same kernel is applied at every spatial position. Why 9 numbers replace 14,400, and why parameters are independent of image size.',
    },
    {
      front: 'Why dense layers fail on images',
      back: '224×224×3 → 1000 units = 150.5M weights for one layer; flattening destroys adjacency; no translation invariance.',
    },
    {
      front: 'Channels rule',
      back: 'A kernel spans ALL input channels (3×3 on 64 ch = 3×3×64 = 576 weights per filter). Number of filters = number of output channels.',
    },
    {
      front: 'Equivariance vs invariance',
      back: 'Convolution: shift in → shift out (equivariant). Pooling / global average pooling: shift in → same out (invariant).',
    },
    {
      front: 'Receptive field recurrence',
      back: 'r_l = r_{l−1} + (k_l − 1)·j_{l−1};  j_l = j_{l−1}·s_l.  If the field is smaller than the object, the unit cannot see it — full stop.',
    },
    {
      front: 'Two 3×3 vs one 5×5',
      back: 'Same 5×5 reach. 73,856 vs 102,464 params at 64 channels (28% less), and two ReLUs instead of one. The VGG argument.',
    },
    {
      front: 'Standard block order',
      back: 'conv → norm → activation → (pool). Norm first so pre-activations land in the responsive region. Use bias=False on a conv feeding BatchNorm.',
    },
    {
      front: 'Global average pooling',
      back: 'Averages each feature map to one number. Kills the giant FC head (VGG fc6 alone ≈ 102.8M params), zero parameters, resolution-agnostic — loses spatial location.',
    },
  ],
  mindmapMarkdown: `- CNNs: Convolution, Pooling & Receptive Fields
  - Why not dense
    - 224x224x3 -> 1000 = 150.5M weights
    - flatten destroys adjacency
    - no translation invariance
  - Convolution
    - kernel slides, dot product per stop
    - output = feature map
    - cross-correlation really (no flip)
  - The two savings
    - weight sharing: same 9 numbers everywhere
    - local connectivity: 9 inputs, not 150k
    - 12x12 -> 10x10: 9 params vs 14,400
  - Hyperparameters
    - kernel size k
    - stride s (s=2 halves)
    - padding: valid vs same
    - dilation d: reach without params
  - Output-size formula
    - out = floor((n + 2p - k)/s) + 1
    - 32,k3,p1,s1 -> 32
    - 32,k3,p0,s2 -> 15
    - 224,k7,p3,s2 -> 112
  - Channels
    - kernel spans ALL C_in
    - filters = output channels
    - params = (k*k*C_in + 1) * C_out
    - 3x3, 64 -> 128 = 73,856
    - n absent: weights vs activations
  - Pooling
    - max: did it appear anywhere
    - average: smoother, used globally
    - downsample + small invariance
    - modern: strided conv instead
  - Receptive field
    - what one neuron can see
    - r += (k-1)*j ; j *= s
    - too small -> cannot see object
    - grow: depth, stride, dilation
  - VGG argument
    - two 3x3 = one 5x5 reach
    - 73,856 vs 102,464 (28% less)
    - extra ReLU
  - Block pattern
    - conv -> norm -> activation -> pool
    - norm before activation
    - bias=False before BatchNorm
  - Heads and 1x1
    - 1x1 = channel mixing
    - bottleneck 256->64->256: 8.4x cheaper
    - GAP replaces flatten+dense
    - toy CNN: dense held 80% of params`,
}

export default m
