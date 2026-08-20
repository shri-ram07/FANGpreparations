import type { Module } from '../types'

const m: Module = {
  id: 'dl-l2-cnn-architectures',
  subjectId: 'dl',
  level: 2,
  title: 'LeNet to ResNet: The Architectures That Mattered',
  whyItMatters:
    'Nobody hires you for reciting architecture names. They hire you for knowing WHICH problem each one fixed — because that is the reasoning you will need on their unnamed problem. "Why does ResNet work?" is on almost every deep-learning interview loop, and the honest answer (gradients get a highway, identity becomes free) is a five-line story. This module is that story, plus the one skill you will actually use at work: fine-tuning a pretrained backbone instead of training from scratch.',
  estMinutes: 55,
  sections: [
    {
      type: 'intuition',
      title: 'Read this as a chain of fixes, not a list of names',
      md: `Every architecture here exists because the previous one hit a wall. Learn the walls; the names come free.

- **LeNet (1998)** — proof that convolution works at all.
- **AlexNet (2012)** — proof it works at *scale*, once you have data and GPUs.
- **VGG (2014)** — proof that boring uniformity beats clever hand-tuning. Cost: 138M parameters.
- **Inception (2014)** — proof you can be deep AND cheap, with 1×1 bottlenecks.
- **ResNet (2015)** — proof that depth itself was never the problem. *Optimization* was.
- Interviewers do not ask "what year was VGG". They ask "what broke, and what fixed it".`,
    },
    {
      type: 'intuition',
      title: 'LeNet-5, 1998: convolution works',
      md: `Yann LeCun, reading handwritten digits off cheques. Input: a 32×32 grayscale image. Output: one of ten digits.

- The shape everyone still copies: **conv → pool → conv → pool → flatten → dense → dense**.
- About **60 thousand** parameters. That is smaller than one row of a modern dense layer.
- The idea it proved: a filter that detects an edge is useful *wherever* the edge appears, so **share the weights across positions**. That is the whole reason conv beats dense on images.
- It ran in production on real cheque-reading machines. Then the field went quiet for fourteen years.
- Why quiet? Not because the idea was wrong. There was no ImageNet and no GPU. The idea was ahead of its fuel.`,
    },
    {
      type: 'intuition',
      title: 'AlexNet, 2012: the moment the field flipped',
      md: `ImageNet 2012. Top-5 error: AlexNet **15.3%**, runner-up **26.2%**. Not an improvement — a demolition. Every serious CV lab changed direction inside a year.

- 8 layers: 5 convolutional, 3 dense. About **60 million** parameters, and roughly 95% of them sit in those three dense layers.
- Four ingredients on the poster: **depth**, **ReLU** instead of sigmoid/tanh, **dropout** in the dense head, and **two GPUs** (3GB each — the model was literally split across them because it did not fit on one).
- ReLU mattered most technically: sigmoid saturates and kills gradients in deep stacks; \`max(0, x)\` does not, so training got several times faster.
- Also: heavy data augmentation (random crops, flips) and local response normalization (since abandoned — do not defend it).`,
    },
    {
      type: 'note',
      md: `The honest version, and the one that scores points: **almost nothing in AlexNet was new**. Convolution was 1998. ReLU, dropout, and augmentation were floating around. What changed was **1.2 million labeled images and a GPU that could chew through them**. AlexNet is the proof that in deep learning, data and compute are first-class architectural decisions — not implementation details you delegate. Say that in an interview and you sound like someone who has shipped models, not read about them.`,
    },
    {
      type: 'intuition',
      title: 'VGG, 2014: boring, on purpose',
      md: `AlexNet used 11×11, then 5×5, then 3×3 filters — hand-tuned per layer. VGG threw that away and used **3×3 everywhere, stride 1, pad 1**, with a 2×2 max-pool whenever it halved the resolution. That is the entire design rule.

- Why it works: two stacked 3×3 convs see the same 5×5 region as one 5×5 conv, three stacked see 7×7. You buy the same receptive field with fewer parameters **and** two extra non-linearities in between.
- The result was a network you could describe in one sentence and scale by copy-paste. That reproducibility is why VGG features are still used as perceptual losses today.
- The bill: **VGG-16 has ~138 million parameters** — and that number is a scandal, because of where they live.`,
    },
    {
      type: 'math',
      intro: 'Two arithmetic facts about VGG. The first is why 3×3 stacking is smart; the second is why VGG is nevertheless a bad deal.',
      latex: [
        '\\text{Two } 3\\times3 \\text{ convs: } 2 \\cdot (3^2 C^2) = 18C^2 \\qquad \\text{one } 5\\times5: \\; 25C^2 \\qquad (28\\% \\text{ fewer, same } 5\\times5 \\text{ receptive field})',
        '\\text{Three } 3\\times3: \\; 27C^2 \\qquad \\text{one } 7\\times7: \\; 49C^2 \\qquad (45\\% \\text{ fewer})',
        '\\text{VGG-16 dense head: } \\underbrace{25088 \\times 4096}_{102{,}760{,}448} + \\underbrace{4096 \\times 4096}_{16{,}777{,}216} + \\underbrace{4096 \\times 1000}_{4{,}096{,}000} \\approx 123.6\\text{M}',
        '\\frac{123.6\\text{M}}{138.4\\text{M}} \\approx 89\\% \\;\\; \\text{of VGG-16 is three fully-connected layers, not convolution.}',
      ],
    },
    {
      type: 'note',
      md: `**Inception / GoogLeNet (2014), honestly, in one note.** It won the same competition VGG entered. Instead of picking one filter size per layer, an Inception module runs **1×1, 3×3, 5×5 and pooling branches in parallel** and concatenates the results — let the network choose the scale instead of you. The expensive branches are preceded by a **1×1 convolution that shrinks the channel count first** (a "bottleneck"), because conv cost is proportional to *in-channels × out-channels*, so squeezing channels is nearly free savings. Result: roughly **5M parameters** — about 12× fewer than AlexNet and 27× fewer than VGG-16 — at better accuracy. Remember the 1×1 bottleneck trick specifically. ResNet-50 is about to reuse it.`,
    },
    {
      type: 'intuition',
      title: 'The degradation problem — and why it is NOT overfitting',
      md: `By 2015 everyone believed deeper meant better. Then someone ran the control experiment: take a plain conv net, make it 56 layers instead of 20, train both on the same data.

- The 56-layer network was worse. Fine — sounds like overfitting.
- Except it was worse on **training error** too. It could not even memorize the data the shallow one memorized.
- That kills the overfitting explanation dead. Overfitting means *low* train error and high test error. This was high train error.
- It is not a capacity problem either. A 56-layer net *contains* the 20-layer net: set the extra 36 layers to the identity function and you have it exactly.
- So the solution exists in the parameter space, and **SGD cannot find it**. This is an **optimization failure**, not a generalization failure.
- That distinction is the whole interview question. Train error up = optimization. Train down, val up = generalization. Never mix them.`,
    },
    {
      type: 'intuition',
      title: 'The fix: stop asking layers to learn the whole answer',
      md: `The diagnosis said: making extra layers behave like the identity is apparently *hard* for SGD. So change the parameterization until identity is *easy*.

- Instead of a block computing the output H(x) directly, have it compute a **residual** F(x) — the *correction* — and add the input back: **y = F(x) + x**.
- The \`+ x\` is a **skip connection** (or shortcut, or identity path). No parameters. Just an addition.
- Now "do nothing" means F(x) = 0. Driving weights to zero is the easiest thing a regularized optimizer does. Identity became free.
- Analogy: editing a document. Rewriting a paragraph from scratch to say the same thing is hard. Writing "no change" in the margin is trivial. Residual blocks let a layer write "no change".
- ResNet-152 won ImageNet 2015 with 3.57% top-5 error. The same year, plain nets could not get past ~30 layers.`,
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'The gradient highway: same depth, with and without skips',
        notice:
          'Left column: the blocks of one network, output on top, input at the bottom. Right column: the gradient that actually arrives at that block during backprop. Watch the bottom row.',
        leftLabel: 'block (backward order)',
        rightLabel: 'gradient arriving',
        frames: [
          {
            note: 'Plain 5-block stack. Forward pass done, loss computed. Now walk the gradient backward.',
            stack: [
              { name: 'block 5 (near loss)', to: 'g5' },
              { name: 'block 4', to: 'g4' },
              { name: 'block 3', to: 'g3' },
              { name: 'block 2', to: 'g2' },
              { name: 'block 1 (near input)', to: 'g1' },
            ],
            heap: [
              { id: 'g5', value: 'not computed' },
              { id: 'g4', value: 'not computed' },
              { id: 'g3', value: 'not computed' },
              { id: 'g2', value: 'not computed' },
              { id: 'g1', value: 'not computed' },
            ],
          },
          {
            note: 'The loss end gets the gradient at full strength: 1.00. Nothing has multiplied it yet.',
            stack: [
              { name: 'block 5 (near loss)', to: 'g5' },
              { name: 'block 4', to: 'g4' },
              { name: 'block 3', to: 'g3' },
              { name: 'block 2', to: 'g2' },
              { name: 'block 1 (near input)', to: 'g1' },
            ],
            heap: [
              { id: 'g5', value: 'dL/dy = 1.00', label: 'full' },
              { id: 'g4', value: 'waiting' },
              { id: 'g3', value: 'waiting' },
              { id: 'g2', value: 'waiting' },
              { id: 'g1', value: 'waiting' },
            ],
          },
          {
            note: 'Each block multiplies the gradient by its own local factor dF/dx. Say it is 0.3 here. Two blocks down, 1.00 is already 0.09.',
            stack: [
              { name: 'block 5 (near loss)', to: 'g5' },
              { name: 'block 4', to: 'g4' },
              { name: 'block 3', to: 'g3' },
              { name: 'block 2', to: 'g2' },
              { name: 'block 1 (near input)', to: 'g1' },
            ],
            heap: [
              { id: 'g5', value: 'dL/dy = 1.00' },
              { id: 'g4', value: '1.00 x 0.3 = 0.30', label: 'x0.3' },
              { id: 'g3', value: '0.30 x 0.3 = 0.09', label: 'x0.3' },
              { id: 'g2', value: 'waiting' },
              { id: 'g1', value: 'waiting' },
            ],
          },
          {
            note: 'Bottom block sees 0.008 — over 100x weaker a learning signal than the top. It barely trains. Now imagine 56 blocks: this is the degradation problem, and it shows up as TRAINING error.',
            stack: [
              { name: 'block 5 (near loss)', to: 'g5' },
              { name: 'block 4', to: 'g4' },
              { name: 'block 3', to: 'g3' },
              { name: 'block 2', to: 'g2' },
              { name: 'block 1 (near input)', to: 'g1', danger: true },
            ],
            heap: [
              { id: 'g5', value: 'dL/dy = 1.00' },
              { id: 'g4', value: '1.00 x 0.3 = 0.30' },
              { id: 'g3', value: '0.30 x 0.3 = 0.09' },
              { id: 'g2', value: '0.09 x 0.3 = 0.027' },
              { id: 'g1', value: '0.027 x 0.3 = 0.008', label: 'dead' },
            ],
          },
          {
            note: 'Same depth, same blocks — but now every block computes y = F(x) + x. The + x is a parameter-free identity path straight through.',
            stack: [
              { name: 'block 5 + skip', to: 'g5' },
              { name: 'block 4 + skip', to: 'g4' },
              { name: 'block 3 + skip', to: 'g3' },
              { name: 'block 2 + skip', to: 'g2' },
              { name: 'block 1 + skip', to: 'g1' },
            ],
            heap: [
              { id: 'g5', value: 'dL/dy = 1.00', label: 'full' },
              { id: 'g4', value: 'waiting' },
              { id: 'g3', value: 'waiting' },
              { id: 'g2', value: 'waiting' },
              { id: 'g1', value: 'waiting' },
            ],
          },
          {
            note: 'The factor is now (1 + 0.3), not (0.3). The +1 comes from the identity path. Nothing shrinks — the bottom block gets a gradient at least as strong as the top.',
            stack: [
              { name: 'block 5 + skip', to: 'g5' },
              { name: 'block 4 + skip', to: 'g4' },
              { name: 'block 3 + skip', to: 'g3' },
              { name: 'block 2 + skip', to: 'g2' },
              { name: 'block 1 + skip', to: 'g1' },
            ],
            heap: [
              { id: 'g5', value: 'dL/dy = 1.00' },
              { id: 'g4', value: '1.00 x 1.3 = 1.30', label: 'intact' },
              { id: 'g3', value: '1.30 x 1.3 = 1.69', label: 'intact' },
              { id: 'g2', value: '1.69 x 1.3 = 2.20', label: 'intact' },
              { id: 'g1', value: '2.20 x 1.3 = 2.86', label: 'intact' },
            ],
          },
        ],
      },
    },
    {
      type: 'math',
      intro: 'One derivative explains the whole picture above. Everything hinges on a single "+1".',
      latex: [
        'y = \\mathcal{F}(x, \\{W_i\\}) + x \\qquad \\Rightarrow \\qquad \\frac{\\partial y}{\\partial x} = \\frac{\\partial \\mathcal{F}}{\\partial x} + 1',
        '\\text{Plain stack of } L \\text{ blocks:} \\quad \\frac{\\partial \\mathcal{L}}{\\partial x_0} = \\frac{\\partial \\mathcal{L}}{\\partial x_L} \\prod_{i=1}^{L} \\frac{\\partial \\mathcal{F}_i}{\\partial x_{i-1}}',
        '\\text{Residual stack:} \\quad \\frac{\\partial \\mathcal{L}}{\\partial x_0} = \\frac{\\partial \\mathcal{L}}{\\partial x_L} \\prod_{i=1}^{L} \\left( 1 + \\frac{\\partial \\mathcal{F}_i}{\\partial x_{i-1}} \\right)',
        '\\text{A product of numbers} < 1 \\to 0 \\text{ exponentially. A product of } (1 + \\varepsilon) \\text{ terms cannot vanish.}',
      ],
    },
    {
      type: 'intuition',
      title: 'Why ResNet works — the two-part answer interviewers want',
      md: `Give both halves. Candidates who give only one sound like they memorized a blog post.

1. **Gradients get a highway.** ∂y/∂x = ∂F/∂x + 1. That +1 means the backward path through the skip is multiplication by one — the gradient reaches early layers undiluted no matter how many blocks sit in between. Vanishing gradients need a long product of small numbers; the identity path breaks the product.
2. **Identity became trivially learnable.** A block that should do nothing just needs F(x) ≈ 0 — weights near zero, which is where initialization starts and where weight decay pulls. So adding depth can never hurt *in principle*: the extra blocks can zero themselves out.
- Honest caveat worth adding: ResNets do not literally behave like one 152-layer net. They behave more like an **ensemble of many shorter paths** (each block is a fork: through F, or around it), and most of the gradient flows along the short paths. Saying this signals you read past the abstract.
- One-liner to keep: *"The skip makes the identity free, which makes depth safe, and gives the gradient a route that never shrinks."*`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'A residual block, and the bottleneck arithmetic that makes ResNet-50 affordable',
      code: `import torch
import torch.nn as nn


class BasicBlock(nn.Module):
    """ResNet-18/34 block: 3x3 -> 3x3, then add the input back."""

    def __init__(self, c_in, c_out, stride=1):
        super().__init__()
        self.conv1 = nn.Conv2d(c_in, c_out, 3, stride, padding=1, bias=False)
        self.bn1 = nn.BatchNorm2d(c_out)
        self.conv2 = nn.Conv2d(c_out, c_out, 3, 1, padding=1, bias=False)
        self.bn2 = nn.BatchNorm2d(c_out)
        self.relu = nn.ReLU(inplace=True)
        self.skip = nn.Identity()
        if stride != 1 or c_in != c_out:
            self.skip = nn.Sequential(
                nn.Conv2d(c_in, c_out, 1, stride, bias=False), nn.BatchNorm2d(c_out))

    def forward(self, x):
        out = self.relu(self.bn1(self.conv1(x)))
        out = self.bn2(self.conv2(out))
        return self.relu(out + self.skip(x))


class Bottleneck(nn.Module):
    """ResNet-50 block: 1x1 squeeze -> 3x3 -> 1x1 expand."""

    def __init__(self, c_in, mid, c_out, stride=1):
        super().__init__()
        self.body = nn.Sequential(
            nn.Conv2d(c_in, mid, 1, bias=False), nn.BatchNorm2d(mid), nn.ReLU(True),
            nn.Conv2d(mid, mid, 3, stride, padding=1, bias=False), nn.BatchNorm2d(mid), nn.ReLU(True),
            nn.Conv2d(mid, c_out, 1, bias=False), nn.BatchNorm2d(c_out))
        same = stride == 1 and c_in == c_out
        self.skip = nn.Identity() if same else nn.Sequential(
            nn.Conv2d(c_in, c_out, 1, stride, bias=False), nn.BatchNorm2d(c_out))
        self.relu = nn.ReLU(inplace=True)

    def forward(self, x):
        return self.relu(self.body(x) + self.skip(x))


def count(mod):
    return sum(p.numel() for p in mod.parameters())


print(count(BasicBlock(256, 256)))        # 1180672
print(count(Bottleneck(256, 64, 256)))    # 70400
x = torch.randn(1, 256, 56, 56)
print(Bottleneck(256, 64, 256)(x).shape)  # torch.Size([1, 256, 56, 56])`,
      annotations: {
        15: 'nn.Identity() is zero parameters and zero FLOPs. The cheapest thing in deep learning, and the reason ResNet works.',
        16: 'The only time the shortcut costs anything: when the block changes spatial size (stride) or channel count, the identity cannot be added shape-wise, so a 1x1 conv projects it. In ResNet-50 that happens 4 times out of 16 blocks.',
        23: 'THE line. out + skip(x), and note the ReLU comes AFTER the add — clamping before the add would let the identity path lose its negative half.',
        31: 'Squeeze 256 -> 64, do the expensive 3x3 at 64 channels, expand 64 -> 256. Conv cost scales with c_in * c_out, so that 3x3 costs 36,864 instead of 589,824 — a clean 16x on the one layer that matters.',
        48: 'Basic block at 256 channels: 2 * (3*3*256*256) + 2*512 BN params = 1,179,648 + 1,024 = 1,180,672.',
        49: 'Bottleneck, same in/out width: 16,384 + 36,864 + 16,384 convs, plus 128 + 128 + 512 BN = 70,400. About 17x cheaper for the same 256-channel interface.',
      },
    },
    {
      type: 'note',
      md: `That 17× is how **ResNet-50 buys depth cheaply**: it is 16 bottleneck blocks (3 convs each) plus a stem and a classifier, and it lands at roughly **25.6M parameters** — under a fifth of VGG-16, at about a quarter of the compute, while being three times deeper. The other half of the saving is that ResNet **replaced VGG's dense head with global average pooling**: one 2048→1000 layer, about 2M parameters, versus VGG's 123M. Two structural decisions, ~112M parameters deleted, accuracy up. That is what a good architecture paper looks like.`,
    },
    {
      type: 'intuition',
      title: 'What came after, one line each',
      md: `You need recognition-level knowledge of these, not depth. Say the one distinguishing idea and stop.

- **DenseNet (2016)** — instead of *adding* the input back, **concatenate** every earlier feature map into every later layer. Maximum feature reuse, very parameter-efficient; pays for it in memory, since nothing is ever discarded.
- **EfficientNet (2019)** — people scaled depth OR width OR input resolution ad hoc; EfficientNet showed you should scale all three together by one **compound coefficient** φ, with depth α^φ, width β^φ, resolution γ^φ constrained so α·β²·γ² ≈ 2 (each φ step roughly doubles FLOPs). B0 is ~5.3M parameters; the same recipe scales it to B7.
- **MobileNet (2017)** — replace every standard conv with a **depthwise separable** one: filter each channel independently (depthwise), then mix channels with a 1×1 (pointwise). Same job, ~8–9× fewer parameters. This is what runs on your phone.
- **Vision Transformers (2020)** — cut the image into 16×16 patches, treat each patch as a token, run a plain transformer. No convolution, no built-in locality bias — which is why ViT needs far more data (or aggressive augmentation and distillation) to beat a CNN. Above that data threshold it wins. *(Full treatment in the GenAI subject — the attention math there is exactly this.)*`,
    },
    {
      type: 'math',
      intro: 'MobileNet in arithmetic, because the saving is worth being able to derive on a whiteboard.',
      latex: [
        '\\text{Standard } k\\times k \\text{ conv: } k^2 \\, C_{in} \\, C_{out} \\qquad \\text{Depthwise separable: } \\underbrace{k^2 C_{in}}_{\\text{depthwise}} + \\underbrace{C_{in} C_{out}}_{1\\times1 \\text{ pointwise}}',
        '\\frac{\\text{separable}}{\\text{standard}} = \\frac{1}{C_{out}} + \\frac{1}{k^2}',
        'k=3,\\; C_{in}=C_{out}=256: \\quad \\frac{1}{256} + \\frac{1}{9} = 0.115 \\quad \\Rightarrow \\quad 67{,}840 \\text{ params instead of } 589{,}824 \\;\\; (8.7\\times \\text{ fewer})',
      ],
    },
    {
      type: 'intuition',
      title: 'Transfer learning: the practical payoff of all of the above',
      md: `Here is the part you will actually use. You have 800 photos of manufacturing defects. Training a ResNet from scratch on 800 images produces garbage. Downloading an ImageNet-pretrained ResNet and adapting it produces a working model in an afternoon.

- **Why it transfers:** early conv layers learn edges, colour blobs, and textures. Those are not "ImageNet features" — they are *image* features. A vertical edge is a vertical edge in a cat photo and in an X-ray.
- Layer depth maps to specificity: layer 1 = edges → mid layers = textures and parts → last layers = "this is a golden retriever". Only the last part is ImageNet-specific.
- So you keep the generic bottom, and replace the ImageNet-specific top with your own classification head.
- Bonus you get for free: pretrained weights are a **better initialization**, so training converges faster even when you do end up updating everything.`,
    },
    {
      type: 'intuition',
      title: 'The fine-tuning decision list',
      md: `Pick by dataset size and how far your images are from ImageNet. Memorize this list; it is a common "walk me through your approach" answer.

1. **Tiny (hundreds of images), similar domain** — freeze the entire backbone, train a new head only. Almost no overfitting risk; you can even precompute the frozen features once and train a logistic regression on them in seconds.
2. **Small (a few thousand)** — unfreeze the last block or two, train those plus the head at a low LR (~1e-4). Enough capacity to adapt high-level features, not enough freedom to destroy the low-level ones.
3. **Medium to large (tens of thousands+), or a real domain shift** — fine-tune everything at a low LR (1e-4 to 1e-5). Warm up the fresh head for an epoch with the backbone frozen first, otherwise the random head's large gradients wreck good pretrained weights on step one.
4. **Huge dataset, alien domain** — from-scratch finally becomes competitive. This is rare; check it, do not assume it.
- **Discriminative learning rates**: give earlier layers a smaller LR than later ones (e.g. 10× less per block group) — the generic features need less change than the specific ones.`,
    },
    {
      type: 'note',
      md: `**The silent bug that eats a week.** A pretrained model was trained on inputs normalized with specific statistics — for torchvision ImageNet models, mean \`[0.485, 0.456, 0.406]\` and std \`[0.229, 0.224, 0.225]\` per RGB channel, on 224×224 crops. Feed it raw 0–255 pixels, or 0–1 pixels without normalizing, or BGR instead of RGB, and nothing crashes: it trains, the loss goes down, and accuracy just sits mysteriously low. **Always copy the preprocessing transform from the model's own docs.** Second gotcha in the same family: when fine-tuning with small batches, BatchNorm's running statistics get updated from noisy mini-batches and drift away from the pretrained ones — freezing BN layers in eval mode often buys you a point or two for free.`,
    },
    {
      type: 'note',
      md: `The default first move, stated plainly: **on almost any small image dataset, a fine-tuned pretrained ResNet beats anything you train from scratch** — and beats most cleverer architectures you would have reached for. It is the strong baseline. Build it first, measure it, and only then argue for something fancier. "I started with a fine-tuned ResNet-50 baseline" is the sentence that tells an interviewer you have done this for real.`,
    },
  ],
  quiz: [
    {
      question: 'A 56-layer plain CNN has HIGHER training error than a 20-layer one on the same data. What does this show?',
      options: [
        {
          text: 'Overfitting — the deeper model memorized noise',
          explanation: 'Overfitting means LOW training error with high test error. Training error went UP, so this is the opposite of overfitting.',
        },
        {
          text: 'An optimization failure — the solution exists but SGD cannot reach it',
          explanation:
            'Correct. The 56-layer net contains the 20-layer net (set the extra layers to identity), so capacity is not the issue. The optimizer simply cannot find that solution. This is the degradation problem ResNet was built to fix.',
        },
        {
          text: 'Insufficient capacity in the deeper model',
          explanation: 'A deeper network strictly contains the shallower one as a special case. Capacity only goes up with depth.',
        },
      ],
      correct: 1,
    },
    {
      question: 'In y = F(x) + x, what is the mathematical reason the gradient survives many blocks?',
      options: [
        {
          text: '∂y/∂x = ∂F/∂x + 1 — the +1 from the identity path means the backward product never collapses to zero',
          explanation:
            'Correct. Plain stacks multiply many factors that are typically < 1, which decays exponentially. Residual stacks multiply (1 + something), which cannot vanish.',
        },
        { text: 'The skip connection normalizes the gradient to unit norm', explanation: 'Nothing normalizes anything here — a skip connection is just an addition. Normalization is BatchNorm, a separate mechanism.' },
        { text: 'Skip connections remove the need for the chain rule', explanation: 'The chain rule still applies everywhere. The skip changes the FACTORS in the chain, not the rule.' },
      ],
      correct: 0,
    },
    {
      question: 'Roughly what fraction of VGG-16 parameters live in its three fully-connected layers?',
      options: [
        { text: 'About 10%', explanation: 'Backwards. The convolutional stack is the cheap part of VGG.' },
        { text: 'About half', explanation: 'Too low. The first FC layer alone (25088 x 4096) is over 100M parameters.' },
        {
          text: 'About 90%',
          explanation: 'Correct: roughly 123.6M of 138M. This is exactly why ResNet dropped the dense head for global average pooling.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Why does a bottleneck block (1x1 -> 3x3 -> 1x1) cost so much less than two 3x3 convs at the same width?',
      options: [
        { text: '1x1 convolutions are free', explanation: 'They are not free — a 1x1 conv at 256 to 64 channels is still 16,384 parameters. They are just much cheaper than 3x3 ones.' },
        {
          text: 'Conv cost scales with in-channels x out-channels, so squeezing to 64 channels before the 3x3 makes that layer 16x cheaper',
          explanation:
            'Correct. 3x3 at 256->256 is 589,824 parameters; at 64->64 it is 36,864. The two cheap 1x1s pay for themselves many times over.',
        },
        { text: 'The bottleneck block has fewer layers', explanation: 'It has MORE layers (three convs vs two) and still costs about 17x less.' },
      ],
      correct: 1,
    },
    {
      question: 'You have 600 labeled X-ray images. What is the first thing you try?',
      options: [
        {
          text: 'Fine-tune an ImageNet-pretrained ResNet — freeze the backbone, train a new head',
          explanation:
            'Correct. 600 images cannot train a CNN from scratch. Early ImageNet features (edges, textures) transfer to X-rays fine; you only need to relearn the top.',
        },
        { text: 'Train a ResNet-50 from scratch with heavy augmentation', explanation: 'Augmentation does not manufacture 600 images into a million. From scratch on hundreds of images overfits immediately.' },
        { text: 'Use a Vision Transformer for better accuracy', explanation: 'ViTs are the MOST data-hungry option — they lack the locality bias that lets CNNs learn from little data. Worst choice at this scale.' },
      ],
      correct: 0,
    },
    {
      question: 'You load a pretrained ResNet, feed it raw 0-255 pixel tensors, fine-tune, and get 61% accuracy where a colleague got 89% with the same code. Most likely cause?',
      options: [
        { text: 'The learning rate is wrong', explanation: 'Possible in general, but the symptom here — training works, accuracy just sits low, no crash — is the classic preprocessing-mismatch signature.' },
        { text: 'The pretrained weights failed to download', explanation: 'That fails loudly, and random weights would perform far worse than 61%.' },
        {
          text: 'Preprocessing mismatch — the model expects ImageNet normalization (mean [0.485,0.456,0.406], std [0.229,0.224,0.225])',
          explanation:
            'Correct. Every pretrained model assumes the exact input distribution it was trained on. Skip the normalization and nothing errors; it just quietly underperforms. Always copy the transform from the model docs.',
        },
      ],
      correct: 2,
    },
    {
      question: 'What was genuinely new about AlexNet in 2012?',
      options: [
        { text: 'Convolution applied to images', explanation: 'LeCun did that in 1998 with LeNet-5, in production on cheque readers.' },
        {
          text: 'Mostly the scale — 1.2M labeled images and GPUs — packaged with ReLU, dropout, and augmentation that already existed',
          explanation:
            'Correct, and this is the answer that impresses. Nearly every component predated AlexNet. What changed was that data and compute finally made depth pay off.',
        },
        { text: 'The residual connection', explanation: 'That is ResNet, three years later. AlexNet was a plain feed-forward stack.' },
      ],
      correct: 1,
    },
    {
      question: 'Depthwise separable convolution (MobileNet) replaces a 3x3 conv with 256 in and 256 out channels. Parameter count goes from 589,824 to what, and why?',
      options: [
        {
          text: '67,840 — a 3x3 depthwise filter per channel (9 x 256) plus a 1x1 pointwise mixer (256 x 256)',
          explanation:
            'Correct: 2,304 + 65,536 = 67,840, about 8.7x fewer. The ratio formula is 1/C_out + 1/k², here 1/256 + 1/9 ≈ 0.115.',
        },
        { text: '294,912 — it halves the cost by splitting the kernel', explanation: 'The saving is far larger than 2x, and it comes from decoupling spatial filtering from channel mixing, not from splitting a kernel in half.' },
        { text: '2,304 — only the depthwise part remains', explanation: 'Dropping the pointwise 1x1 would mean channels never mix at all, which destroys the layer. Both halves are required.' },
      ],
      correct: 0,
    },
  ],
  interviewQuestions: [
    {
      question: 'Why does ResNet work? Give the complete answer.',
      answer:
        'Two mechanisms, and you should name both. (1) **Gradient highway**: with y = F(x) + x, ∂y/∂x = ∂F/∂x + 1. Backprop through L plain blocks multiplies L Jacobians, and if each is < 1 the product decays exponentially; with skips each factor is (1 + ∂F/∂x), so the product cannot vanish and early layers get a real learning signal. (2) **Identity becomes free**: a block that should do nothing only needs F(x) ≈ 0 — trivially reachable, since init starts near zero and weight decay pulls there. So extra depth can never hurt in principle, which is precisely what the degradation experiment showed plain nets could not manage. Add the caveat that shows depth of reading: ResNets behave less like one very deep net and more like an ensemble of many short paths, with most gradient flowing along the shorter ones.',
      isCaseBased: false,
    },
    {
      question: 'What is the degradation problem, and why is it not overfitting?',
      answer:
        'Take a plain conv net at 20 layers and at 56 layers, same data. The 56-layer version has higher error — including higher TRAINING error. Overfitting means low training error and high validation error, so the diagnosis fails immediately. It is also not a capacity problem: the deep net contains the shallow one as a special case (extra layers = identity), so the good solution provably exists in its parameter space. What is broken is the optimizer\'s ability to find it — an optimization failure. That framing is the whole point of the question: interviewers want to see you separate "cannot fit" from "fits too well".',
      isCaseBased: false,
    },
    {
      question: 'Case: your team fine-tunes a pretrained ResNet-50 on 5,000 product photos. Validation accuracy is 71%; a colleague using the same data and a frozen-backbone linear probe gets 84%. What went wrong and how do you fix it?',
      answer:
        'A full fine-tune underperforming a linear probe on 5k images means the pretrained features got damaged. Ranked causes: (1) **learning rate too high** — 1e-3 on a pretrained backbone destroys features in the first epochs; drop to 1e-4/1e-5. (2) **No head warmup** — the randomly initialized head emits huge gradients on step one that flow straight back into good weights; freeze the backbone for one epoch first. (3) **Overfitting from too much unfrozen capacity** — unfreeze only the last block or two at this data size. (4) **BatchNorm drift** — small batches update running stats with noisy estimates; freeze BN in eval mode. (5) **Preprocessing mismatch** — verify against the model docs. Tradeoff to state: full fine-tuning has a higher ceiling but needs data and careful LR; a linear probe is nearly unlosable but caps out lower.',
      isCaseBased: true,
    },
    {
      question: 'Why did VGG standardize on 3x3 filters, and what did that design choice cost?',
      answer:
        'Two stacked 3x3 convs cover the same 5x5 receptive field as one 5x5 conv using 18C² parameters instead of 25C² (28% fewer), and three stacked cover 7x7 with 27C² instead of 49C² (45% fewer) — plus you gain two extra ReLU non-linearities, so the same receptive field becomes more expressive. The cost was not in the convolutions at all: VGG-16 has ~138M parameters and roughly 123.6M of them sit in three fully-connected layers, dominated by the 25088x4096 first one. So the conv design was excellent and the head was profligate. ResNet fixed exactly that by replacing the dense head with global average pooling.',
      isCaseBased: false,
    },
    {
      question: 'Walk me through a bottleneck block and do the parameter arithmetic out loud.',
      answer:
        '1x1 reduce -> 3x3 -> 1x1 expand. At a 256-channel interface with a 64-channel waist: 1x1 256->64 is 16,384; 3x3 64->64 is 9x64x64 = 36,864; 1x1 64->256 is 16,384. Total ~69,632 conv parameters. The plain alternative — two 3x3 convs at 256 channels — is 2 x 9 x 256 x 256 = 1,179,648. That is ~17x more for the same interface. The mechanism to state: conv cost is k² x C_in x C_out, so it is quadratic in channel width; shrinking the width before the expensive spatial convolution is where all the saving lives. This is the same 1x1-bottleneck trick Inception introduced a year earlier, and it is how ResNet-50 reaches 50 layers at ~25.6M parameters — under a fifth of VGG-16.',
      isCaseBased: false,
    },
    {
      question: 'In a residual block, why is the ReLU applied after the addition rather than before it?',
      answer:
        'Because ReLU before the add would clamp the identity branch. The point of the skip is that x passes through unmodified — an exact identity, gradient factor exactly 1. Put a ReLU on that path and half the signal (everything negative) is zeroed on the way through, and the backward path is gated too; the highway develops potholes. So the canonical block is out = ReLU(BN(conv2(...)) + x): the last operation before the add is BatchNorm, not an activation. Worth mentioning: the ResNet-v2 "pre-activation" variant moves BN and ReLU to the *start* of F entirely, leaving the shortcut a completely clean identity, and it trains 1000-layer networks better than v1 for exactly this reason.',
      isCaseBased: false,
    },
    {
      question: 'Case: a junior engineer reports that their fine-tuned model gets 94% on validation but collapses to 68% in production. Same architecture, same weights. Where do you look first?',
      answer:
        'Same weights, different result, means the INPUT pipeline diverged. Check in this order: (1) **Preprocessing parity** — is production applying the same resize, crop, channel order (RGB vs BGR), and normalization statistics as the training transform? This is the single most common cause and it fails silently. (2) **model.eval()** — if it is left in train mode, dropout is active and BatchNorm uses batch statistics instead of running averages, which wrecks single-image inference. (3) **Batch-size-1 BatchNorm** in train mode is catastrophic specifically because batch statistics from one sample are meaningless. (4) Only then genuine distribution shift: are production images from a different camera, lighting, or resolution than the validation split? The tell that separates causes 1-3 from 4 is that a pipeline bug degrades ALL classes uniformly, while true distribution shift hits some classes much harder.',
      isCaseBased: true,
    },
    {
      question: 'How do you decide between freezing the backbone, fine-tuning the last block, and fine-tuning everything?',
      answer:
        'Two axes: dataset size and domain distance from ImageNet. Hundreds of images, similar domain -> freeze everything, train a head (you can precompute features once and fit a linear classifier in seconds; near-zero overfitting risk). A few thousand -> unfreeze the last block or two at ~1e-4, since high-level features are the ImageNet-specific ones. Tens of thousands, or a real domain shift like medical or satellite imagery -> fine-tune everything at 1e-4 to 1e-5, after an epoch of head-only warmup. Huge dataset in an alien domain -> from scratch finally competes, but verify rather than assume. Layer on discriminative learning rates (earlier layers ~10x lower LR per group) since generic edge detectors need less adjustment than the classifier-adjacent layers. The tradeoff being tested: more unfrozen parameters means a higher ceiling and a higher chance of destroying good features.',
      isCaseBased: false,
    },
    {
      question: 'What is a 1x1 convolution actually doing, and why does it appear in Inception, ResNet, and MobileNet alike?',
      answer:
        'A 1x1 conv does no spatial mixing at all — it is a learned linear projection applied independently at every pixel, mapping C_in channels to C_out channels (followed by a non-linearity). Three uses, one per architecture: in Inception it is the **bottleneck** that reduces channels before an expensive 3x3/5x5 branch, because conv cost is proportional to C_in x C_out. In ResNet-50 it does the same job inside the bottleneck block, and separately serves as the **projection shortcut** when the skip needs its shape changed. In MobileNet it is the **pointwise** half of a depthwise separable conv — after depthwise filtering treats each channel in isolation, the 1x1 is the only thing that mixes channels at all. The unifying idea: decouple the cheap operation (channel mixing) from the expensive one (spatial filtering across many channels).',
      isCaseBased: false,
    },
    {
      question: 'Case: you are asked to ship an image classifier to run on-device on a mid-range phone, under 20ms per frame. Walk through your architecture decisions.',
      answer:
        'Start from the constraint, not the leaderboard. (1) **Baseline first** — fine-tune a pretrained MobileNetV3 or EfficientNet-Lite; both are designed for this envelope and both have ImageNet weights, so you get transfer learning for free. Rejecting ResNet-50 here is not about accuracy, it is about ~4 GFLOPs on a phone budget. (2) **Depthwise separable convs** are why these are cheap: 1/C_out + 1/k² of a standard conv, roughly 8-9x fewer parameters at 3x3. (3) **Resolution is the cheapest knob** — compute scales quadratically with input size; try 192x192 or 160x160 before touching the architecture, and measure the accuracy cost. (4) **Quantize to int8** post-training; typically ~4x smaller and ~2-3x faster with a small accuracy hit — do this before redesigning anything. (5) If still over budget, **distill** the big model into a small one. Tradeoffs to name: quantization risks accuracy on rare classes, lower resolution hurts small-object recognition, and any custom architecture loses you pretrained weights, which is usually a worse trade than it looks.',
      isCaseBased: true,
    },
    {
      question: 'Why do ImageNet features transfer to domains ImageNet never contained, like satellite or medical images?',
      answer:
        'Because the early layers do not learn "cat" — they learn oriented edges, colour opponency, and texture, which are properties of natural images generally, not of the label set. Specificity increases with depth: edges, then textures and motifs, then object parts, then class-specific detectors in the last block. Only that top slice is ImageNet-bound, and it is the part you replace. Two honest qualifications: transfer weakens as the domain moves further from natural photographs (grayscale X-rays and multispectral satellite imagery both transfer less well than product photos), and even where features transfer poorly, pretrained weights still act as a better initialization than random, so training converges faster. That second point is why fine-tuning remains the default first move even in odd domains.',
      isCaseBased: false,
    },
    {
      question: 'Vision Transformers beat CNNs on large benchmarks. Should you use one for a new project?',
      answer:
        'Usually not first. A ViT cuts the image into patches (16x16 typically) and runs a plain transformer over them, with no built-in locality or translation-equivariance bias. That missing inductive bias is exactly why ViTs need enormous data — the original results required JFT-300M-scale pretraining to beat ResNets, and later work recovered much of the gap with heavy augmentation and distillation instead. So: at small-to-medium data, a fine-tuned CNN wins and wins cheaply. Above the data threshold, or when you can start from a strong pretrained ViT checkpoint (which changes the calculation completely, since someone else already paid the data cost), it is worth benchmarking. The interview-safe position: "architecture choice follows data scale and available checkpoints, not the leaderboard".',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'LeNet-5 (1998) in one line', back: 'conv → pool → conv → pool → dense, ~60k params on 32×32 digits. Proved weight sharing across positions beats dense layers on images.' },
    { front: 'What actually made AlexNet win', back: 'Not new ideas — 1.2M labeled images + GPUs. Packaging: depth, ReLU, dropout, augmentation. 15.3% vs 26.2% top-5 error.' },
    { front: 'VGG design rule and its bill', back: '3×3 convs everywhere, stride 1, pad 1. Two 3×3 = one 5×5 receptive field at 18C² vs 25C². Cost: 138M params, ~90% in the dense head.' },
    { front: 'Inception / GoogLeNet idea', back: 'Parallel 1×1 / 3×3 / 5×5 / pool branches, concatenated; 1×1 bottlenecks shrink channels first. ~5M params, 27× fewer than VGG-16.' },
    { front: 'The degradation problem', back: '56-layer plain net has HIGHER TRAINING error than 20-layer. Not overfitting (train error up), not capacity (deep contains shallow). An optimization failure.' },
    { front: 'Residual block', back: 'y = F(x) + x. F is the correction, +x is a parameter-free skip. "Do nothing" = drive F to 0, which is easy.' },
    { front: 'Why ResNet works (2 parts)', back: '(1) ∂y/∂x = ∂F/∂x + 1 → gradient product cannot vanish. (2) Identity is trivially learnable (F=0), so depth is safe.' },
    { front: 'Bottleneck block arithmetic', back: '1×1 256→64 (16,384) + 3×3 64→64 (36,864) + 1×1 64→256 (16,384) = 69,632, vs 1,179,648 for two 3×3 at 256. ~17× cheaper.' },
    { front: 'Depthwise separable saving', back: 'k²C_in (depthwise) + C_in·C_out (pointwise) vs k²·C_in·C_out. Ratio = 1/C_out + 1/k². At 3×3, 256ch: 8.7× fewer.' },
    { front: 'Fine-tuning decision list', back: 'Hundreds → freeze backbone, new head. Thousands → unfreeze last block, 1e-4. Tens of thousands / domain shift → all layers, 1e-5 after head warmup. Always match the pretrained normalization stats.' },
  ],
  mindmapMarkdown: `- LeNet to ResNet
  - LeNet-5 (1998)
    - conv/pool/dense skeleton
    - ~60k params, 32×32 digits
    - weight sharing across positions
  - AlexNet (2012)
    - 15.3% vs 26.2% top-5
    - ReLU, dropout, 2 GPUs
    - real change: data + compute
  - VGG (2014)
    - 3×3 everywhere, uniform
    - two 3×3 = one 5×5, 28% cheaper
    - 138M params, ~90% in dense head
  - Inception (2014)
    - parallel multi-scale branches
    - 1×1 bottleneck reduces channels
    - ~5M params, 27× under VGG
  - ResNet (2015)
    - Degradation problem
      - 56 layers worse on TRAINING error
      - not overfitting, not capacity
      - optimization failure
    - Fix: y = F(x) + x
      - learn the correction, add input back
      - skip = zero parameters
    - Why it works
      - ∂y/∂x = ∂F/∂x + 1 → gradient highway
      - identity free (F=0) → depth safe
      - ensemble of short paths (caveat)
    - Bottleneck block
      - 1×1 reduce → 3×3 → 1×1 expand
      - 69,632 vs 1,179,648 (~17×)
      - ResNet-50 ≈ 25.6M params
      - global avg pool kills the dense head
  - After ResNet
    - DenseNet: concatenate, not add
    - EfficientNet: compound scaling d/w/r
    - MobileNet: depthwise separable, 8.7×
    - ViT: patches as tokens, data-hungry
  - Transfer learning
    - early layers = generic edges/textures
    - freeze backbone (tiny data)
    - unfreeze last block (small)
    - full fine-tune, low LR (medium+)
    - discriminative LRs per block group
    - MATCH the normalization stats
    - freeze BN with small batches
    - fine-tuned ResNet = default baseline`,
}

export default m
