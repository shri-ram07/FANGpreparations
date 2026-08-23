import type { Module } from '../types'

const m: Module = {
  id: 'dl-l2-cnns',
  subjectId: 'dl',
  level: 2,
  title: 'CNNs: Convolution, Pooling and Receptive Fields',
  whyItMatters:
    'A dense layer from a 224x224 image to 64 feature maps needs 483 billion parameters. The convolution that replaces it needs 1,792. Understanding why that is not a loss of capacity is understanding what a CNN is.',
  assumes: [
    'You have seen a 2D array and nested loops',
    'You know that a dense layer connects every input to every output',
  ],
  estMinutes: 22,
  sections: [
    {
      type: 'intuition',
      title: 'One small filter, slid everywhere',
      md: `A dense layer gives every input pixel its own weight to every output unit. On an image that is both enormous and wrong — it learns "a vertical edge at position (14, 27)" as something entirely separate from the same edge at (100, 3).

A **convolution** learns one small grid of weights — a **kernel**, usually 3x3 — and slides it across the whole image, computing a weighted sum at every position.

Two properties follow. **Parameter sharing**: the same nine weights serve every location, so an edge detector learned anywhere works everywhere. **Locality**: each output depends only on a small neighbourhood, which is a true statement about images and a false one about, say, tabular data.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'A 3x3 kernel finding a vertical edge',
      code: `import numpy as np
img = np.array([[10, 10, 10, 80, 80, 80]] * 6, dtype=float)   # dark left, bright right
k   = np.array([[-1, 0, 1],
                [-1, 0, 1],
                [-1, 0, 1]], dtype=float)

out = np.zeros((4, 4))
for i in range(4):
    for j in range(4):
        out[i, j] = (img[i:i+3, j:j+3] * k).sum()
print(out.tolist())

# ---- real output ----
# [[0.0, 210.0, 210.0, 0.0], [0.0, 210.0, 210.0, 0.0],
#  [0.0, 210.0, 210.0, 0.0], [0.0, 210.0, 210.0, 0.0]]`,
      annotations: {
        9: 'Elementwise multiply the 3x3 patch by the kernel and sum. That single line is the entire operation — everything else is bookkeeping about which patches to take.',
        13: '0 in flat regions, because −1 and +1 cancel when left and right are equal. 210 exactly where the 10-to-80 boundary sits: 3 × (80 − 10).',
        14: 'The same nine numbers detected the edge on every row without being told there were rows. That is parameter sharing doing its job — one filter, one concept, every position.',
      },
    },
    {
      type: 'math',
      intro:
        'The output size of a convolution, and the parameter count of a layer. n is the input side, k the kernel size, p the padding added to each side, s the stride. C_in and C_out are the input and output channel counts, and the +C_out is one bias per filter.',
      latex: [
        'n_{\\text{out}} = \\left\\lfloor \\frac{n + 2p - k}{s} \\right\\rfloor + 1',
        '\\text{params} = k \\times k \\times C_{\\text{in}} \\times C_{\\text{out}} + C_{\\text{out}}',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Output sizes, and the parameter count that makes the point',
      code: `def osize(n, k, p, s):
    return (n + 2*p - k) // s + 1

for n, k, p, s in [(6,3,0,1), (6,3,1,1), (6,3,0,2), (224,7,3,2), (28,5,2,1)]:
    print('n=%3d k=%d p=%d s=%d -> %d' % (n, k, p, s, osize(n, k, p, s)))

conv  = 3*3*3*64 + 64
dense = (224*224*3) * (224*224*64) + 224*224*64
print('conv 3x3, 3 -> 64 channels: %s params' % f'{conv:,}')
print('the dense layer it replaces: %.3e params  (%.3e times more)' % (dense, dense/conv))

# ---- real output ----
# n=  6 k=3 p=0 s=1 -> 4
# n=  6 k=3 p=1 s=1 -> 6
# n=  6 k=3 p=0 s=2 -> 2
# n=224 k=7 p=3 s=2 -> 112
# n= 28 k=5 p=2 s=1 -> 28
# conv 3x3, 3 -> 64 channels: 1,792 params
# the dense layer it replaces: 4.834e+11 params  (2.697e+08 times more)`,
      annotations: {
        9: 'Padding p = (k−1)/2 preserves the size exactly: 3x3 with p=1 and 5x5 with p=2 both leave n unchanged. That is why "same" padding is the default in most architectures.',
        12: 'Stride 2 halves the resolution — 224 to 112 — which is how modern networks downsample instead of pooling.',
        14: '1,792 parameters, and it does not depend on the image size at all. A 3x3x3 kernel is 27 weights, times 64 filters, plus 64 biases.',
        15: '483 billion against 1,792 — a factor of 270 million. And the dense version is not merely larger; it is worse, because it must learn each edge detector separately at every one of 50,176 positions.',
      },
    },
    {
      type: 'note',
      label: 'Channels are what convolutions actually learn',
      md: `A kernel is not 3x3. It is **3x3xC_in** — it spans every input channel at once, so a first-layer filter sees red, green and blue together.

A layer has **C_out** such kernels, each producing one output channel. So a channel is one learned feature detected everywhere, and the depth of the stack is how many different features that layer looks for.

This is why the parameter count multiplies both channel counts. Going from 256 to 256 channels with 3x3 kernels is 590K parameters in one layer, while the first layer from 3 channels is under 2K. **Almost all of a CNN's parameters live in the deep, narrow-resolution layers**, not the wide early ones — and almost all of its compute lives in the early ones.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Receptive field, and why 3x3 beat 5x5 and 7x7',
      code: `rf = 1
for L in range(1, 8):
    rf = rf + 2
    print('after %d stacked 3x3 layers: receptive field %dx%d' % (L, rf, rf))

for C in [64, 256]:
    print('C=%d:  two 3x3 = %s   one 5x5 = %s   three 3x3 = %s   one 7x7 = %s'
          % (C, f'{2*9*C*C:,}', f'{25*C*C:,}', f'{3*9*C*C:,}', f'{49*C*C:,}'))

# ---- real output ----
# after 1 stacked 3x3 layers: receptive field 3x3
# after 2 stacked 3x3 layers: receptive field 5x5
# after 3 stacked 3x3 layers: receptive field 7x7
# after 4 stacked 3x3 layers: receptive field 9x9
# after 5 stacked 3x3 layers: receptive field 11x11
# after 6 stacked 3x3 layers: receptive field 13x13
# after 7 stacked 3x3 layers: receptive field 15x15
# C=64:  two 3x3 = 73,728   one 5x5 = 102,400   three 3x3 = 110,592   one 7x7 = 200,704
# C=256:  two 3x3 = 1,179,648   one 5x5 = 1,638,400   three 3x3 = 1,769,472   one 7x7 = 3,211,264`,
      annotations: {
        3: 'The receptive field of a unit is how much of the original image can influence it. Each 3x3 layer at stride 1 adds 2 — slowly, which is why stride and pooling exist.',
        16: 'Two stacked 3x3 layers see the same 5x5 region as one 5x5 layer, for 73,728 parameters against 102,400 — 28% fewer.',
        17: 'Three 3x3 match one 7x7\'s 7x7 view for 1,769,472 against 3,211,264 — 45% fewer. And the stack has two extra non-linearities in it, so it is strictly more expressive as well as smaller. That single observation is what VGG established.',
      },
    },
    {
      type: 'note',
      label: 'Pooling, and why it is disappearing',
      md: `**Max pooling** takes the largest value in each 2x2 window, halving the resolution. It has no parameters, provides a little translation invariance — shifting the input by one pixel often does not change the maximum — and cuts the compute of every layer after it by four.

It is much less used now. **Strided convolutions** do the same downsampling with learnable weights, so the network decides what to keep rather than always taking the maximum. ResNet uses stride-2 convolutions for exactly this reason.

What survives is **global average pooling** at the end: average each channel over its whole spatial extent, turning a CxHxW volume into C numbers. It replaced the enormous flatten-then-dense head — in VGG that head is 102M of the model's 138M parameters — and it makes the network accept any input size.`,
    },
  ],
  quiz: [
    {
      question: 'The vertical-edge kernel gave 0 in flat regions and exactly 210 at the boundary. Where does 210 come from?',
      options: [
        { text: 'The kernel values summed', explanation: 'They sum to zero, which is why flat regions give 0.' },
        { text: '3 × (80 − 10) — three rows of the kernel each contributing the brightness difference', explanation: 'Correct, and the zeros in flat regions come from −1 and +1 cancelling.' },
        { text: 'The maximum pixel value', explanation: 'The maximum is 80.' },
        { text: 'An artefact of the loop bounds', explanation: 'The value is the exact weighted sum at those positions.' },
      ],
      correct: 1,
    },
    {
      question: 'A conv layer replacing a 224x224x3 to 224x224x64 dense layer uses 1,792 parameters against 4.8e11. Why is that not a loss of capacity?',
      options: [
        { text: 'It is a loss of capacity, accepted for efficiency', explanation: 'It is usually an improvement, not a compromise.' },
        { text: 'The dense version would have to learn each edge detector separately at all 50,176 positions; sharing one filter is the better assumption', explanation: 'Correct. Parameter sharing encodes a true fact about images.' },
        { text: 'The conv layer has more channels', explanation: 'Both produce 64 output channels.' },
        { text: 'Because of pooling', explanation: 'No pooling is involved in the comparison.' },
      ],
      correct: 1,
    },
    {
      question: 'How many parameters does a 3x3 convolution from 256 to 256 channels have, and why does that matter?',
      options: [
        { text: '9, because the kernel is 3x3', explanation: 'The kernel spans every input channel and there are many filters.' },
        { text: 'About 590K — the count multiplies both channel counts, so most of a CNN\'s parameters sit in the deep low-resolution layers', explanation: 'Correct, while most of the compute sits in the early high-resolution ones.' },
        { text: '2,304, one per kernel weight', explanation: 'That is 3×3×256 — one filter, not 256 of them.' },
        { text: 'It depends on the input image size', explanation: 'Convolution parameter counts are independent of spatial size.' },
      ],
      correct: 1,
    },
    {
      question: 'Why did VGG replace one 5x5 layer with two 3x3 layers?',
      options: [
        { text: 'To increase the receptive field', explanation: 'The receptive field is the same 5x5 — that is the premise.' },
        { text: 'Same 5x5 view for 28% fewer parameters, plus an extra non-linearity in the stack', explanation: 'Correct: 73,728 against 102,400 at C=64, and strictly more expressive.' },
        { text: 'To reduce memory during the forward pass', explanation: 'The stack stores more activations, not fewer.' },
        { text: '3x3 kernels are faster on any hardware', explanation: 'The parameter and expressiveness argument came first; hardware tuning followed.' },
      ],
      correct: 1,
    },
    {
      question: 'What padding keeps the output the same size as the input?',
      options: [
        { text: 'p = k', explanation: 'That would enlarge the output.' },
        { text: 'p = (k−1)/2 — so p=1 for 3x3 and p=2 for 5x5, at stride 1', explanation: 'Correct, which is why "same" padding is the architectural default.' },
        { text: 'p = 1 always', explanation: 'Only for 3x3.' },
        { text: 'No padding preserves size', explanation: 'Without padding a k×k kernel shrinks the output by k−1.' },
      ],
      correct: 1,
    },
    {
      question: 'Why has max pooling largely been replaced?',
      options: [
        { text: 'It is too slow', explanation: 'It is essentially free.' },
        { text: 'Strided convolutions downsample with learnable weights, so the network chooses what to keep instead of always taking the maximum', explanation: 'Correct — ResNet uses stride-2 convolutions for this reason.' },
        { text: 'It causes overfitting', explanation: 'It has no parameters and if anything regularises.' },
        { text: 'It only works on square inputs', explanation: 'It works on any shape.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Why convolutions instead of dense layers for images?',
      answer:
        'Two structural priors that happen to be true of images. Parameter sharing: one small kernel is slid over every position, so an edge detector learned in one place works everywhere — a dense layer would have to learn the same detector separately at each of 50,176 positions. And locality: each output depends only on a small neighbourhood, which matches how visual structure actually works. The efficiency follows from the priors rather than the other way round — a 3x3 conv from 3 to 64 channels is 1,792 parameters against 4.8e11 for the equivalent dense layer, and it also generalises better because it encodes a correct assumption.',
      isCaseBased: false,
    },
    {
      question: 'Count the parameters in a conv layer, and say where a CNN\'s parameters actually live.',
      answer:
        'k × k × C_in × C_out, plus one bias per output channel — independent of the image size entirely. The consequence people get wrong is where the mass sits: the first layer from 3 input channels is under 2K parameters, while a 3x3 layer from 256 to 256 channels is about 590K. So almost all of the parameters are in the deep, low-resolution layers where channels are numerous, while almost all of the compute is in the early high-resolution ones where the spatial extent is large. That is why pruning and quantisation target the deep layers and why the early layers dominate inference latency.',
      isCaseBased: true,
    },
    {
      question: 'What is a receptive field and why does it matter?',
      answer:
        'It is how much of the original image can influence one unit\'s value. Each stride-1 3x3 layer adds 2, so seven stacked layers see only 15x15 — it grows slowly, which is exactly why stride and pooling exist. It matters because a unit cannot represent anything larger than its receptive field: if you are detecting objects that span 100 pixels and your final feature map has a receptive field of 30, the architecture cannot see the object regardless of training. Downsampling, dilated convolutions and, in the modern answer, attention are the ways to grow it faster than depth alone allows.',
      isCaseBased: false,
    },
    {
      question: 'Explain the 3x3 stacking argument.',
      answer:
        'Two stacked 3x3 layers have the same 5x5 receptive field as one 5x5 layer, and three stacked have the same 7x7 as one 7x7. At 256 channels, three 3x3 layers are 1.77M parameters against 3.21M for one 7x7 — 45% fewer — and the stack additionally contains two extra non-linearities, so it is strictly more expressive as well as smaller. That was VGG\'s central observation and it is why essentially every architecture after it uses small kernels. The exception worth mentioning is the stem: many networks still open with a 7x7 stride-2 convolution, because at three input channels the parameter argument barely applies and the large early downsample saves substantial compute.',
      isCaseBased: false,
    },
    {
      question: 'How do you handle variable-sized input images?',
      answer:
        'The convolutional part already handles it — kernels do not care about spatial extent. The problem is the head: a flatten-then-dense layer fixes the input size rigidly. Global average pooling solves it by averaging each channel over its whole spatial extent, turning any CxHxW volume into C numbers, which is why it replaced the dense head in ResNet and after. It also removes an enormous parameter count: VGG\'s dense head is 102M of its 138M parameters. If a fixed size is required anyway, the alternatives are resizing, padding to a common size with a mask, or bucketing similar sizes into batches so padding waste stays low.',
      isCaseBased: true,
    },
    {
      question: 'What is a 1x1 convolution for?',
      answer:
        'It has no spatial extent, so it is a learned linear projection across channels applied identically at every position — a dense layer over the channel dimension. Three uses. Changing channel count cheaply, which is the bottleneck design in ResNet: project 256 channels down to 64, do the expensive 3x3 there, project back up, for a fraction of the cost of a 3x3 at full width. Mixing information across channels between spatially-mixing layers, which is what Network-in-Network introduced. And adding a non-linearity cheaply, since it is followed by an activation. It is also exactly the pointwise half of a depthwise-separable convolution.',
      isCaseBased: false,
    },
    {
      question: 'Are convolutions translation invariant?',
      answer:
        'Equivariant, not invariant, and the distinction matters. Shift the input and the feature map shifts identically — that is equivariance, and it is what parameter sharing gives you. Invariance, where the output does not change at all, comes from the pooling and the global average at the end, and even then only approximately: work on aliasing showed that ImageNet classifiers change their prediction under a one-pixel shift far more often than people assumed, because strided downsampling breaks the shift-equivariance the convolutions provide. Anti-aliased downsampling was proposed to fix it. So the honest answer is that convolutions are equivariant by construction and the invariance is a partial, somewhat fragile property of the architecture around them.',
      isCaseBased: false,
    },
    {
      question: 'Your CNN is too slow at inference. Where do you look?',
      answer:
        'At the early layers first, because compute and parameters live in different places: the early high-resolution layers dominate FLOPs while the deep layers dominate parameter count. So downsampling earlier and more aggressively is usually the biggest single win. Then depthwise-separable convolutions, which factor a k×k×C_in×C_out convolution into a per-channel spatial pass and a 1x1 channel mix, cutting the cost by roughly a factor of k² with a small accuracy loss — that is the MobileNet design. Then reduce input resolution, which is quadratic in cost. Then quantise to int8 and prune the deep layers. Throughout I would profile rather than assume, since memory bandwidth rather than FLOPs is frequently the actual bottleneck.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'The two priors', back: 'Parameter sharing (one kernel everywhere) and locality (each output sees a small neighbourhood). Both are TRUE of images, which is why they help.' },
    { front: 'Output size', back: 'floor((n + 2p − k)/s) + 1. p = (k−1)/2 preserves size at stride 1: p=1 for 3x3, p=2 for 5x5.' },
    { front: 'Parameter count', back: 'k × k × C_in × C_out + C_out. Independent of image size. Conv 3→64: 1,792 against 4.8e11 for the dense equivalent.' },
    { front: 'Where the mass is', back: 'PARAMETERS in the deep, low-resolution, many-channel layers (256→256 3x3 ≈ 590K). COMPUTE in the early high-resolution ones.' },
    { front: 'Receptive field', back: 'Each stride-1 3x3 layer adds 2. Seven layers see only 15x15 — which is why stride, pooling and dilation exist.' },
    { front: 'The VGG argument', back: 'Three 3x3 match one 7x7\'s view for 1.77M vs 3.21M params at C=256 — 45% fewer, plus two extra non-linearities.' },
    { front: 'Pooling today', back: 'Max pooling mostly replaced by strided convolutions, which learn what to keep. Global average pooling survives — it killed VGG\'s 102M-parameter dense head.' },
    { front: '1x1 convolution', back: 'A learned linear projection across CHANNELS at every position. Bottlenecks (ResNet), channel mixing, and the pointwise half of depthwise-separable.' },
  ],
  mindmapMarkdown: `- CNNs
  - The idea
    - one small kernel slid everywhere
    - parameter sharing + locality
    - both are true facts about images
  - Convolution
    - multiply the patch, sum. That is all.
    - edge kernel: 0 in flat regions, 3*(80-10) = 210 at the edge
    - kernel is 3x3xC_in, and there are C_out of them
  - Arithmetic
    - out = floor((n + 2p - k)/s) + 1
    - p = (k-1)/2 preserves size
    - params = k*k*C_in*C_out + C_out, size-independent
    - conv 1,792 vs dense 4.8e11
  - Where the mass is
    - PARAMS: deep, many-channel layers (256->256 = 590K)
    - COMPUTE: early, high-resolution layers
  - Receptive field
    - +2 per stride-1 3x3 layer; 7 layers = 15x15
    - three 3x3 = one 7x7 for 45% fewer params
    - plus two extra non-linearities (VGG)
  - Pooling
    - max pool -> mostly replaced by stride-2 convs
    - global average pooling survives
    - killed VGG's 102M-param dense head`,
}

export default m
