import type { Module } from '../types'

const m: Module = {
  id: 'dl-l3-practicals-and-debugging',
  subjectId: 'dl',
  level: 3,
  title: 'The Four Practicals + The Debugging Playbook',
  whyItMatters:
    'Four builds turn everything you have read into something you can defend: a NumPy net, a CNN, an LSTM, a GAN. But every one of them will break on your first run — and the difference between a candidate who ships and one who stalls is a fixed, ordered debugging routine. That routine is the real content of this module.',
  estMinutes: 60,
  sections: [
    {
      type: 'intuition',
      title: 'Four builds, one habit',
      md: `You do not learn deep learning by reading. You learn it the first time your loss goes NaN at 1am and you have to find out why.

- **P1 — NumPy net on MNIST.** No framework. Proves you understand backprop.
- **P2 — PyTorch CNN on CIFAR-10, then a fine-tuned ResNet-18.** Proves you understand why nobody trains from scratch any more.
- **P3 — character-level LSTM text generator.** Proves you understand sequences and sampling.
- **P4 — tiny GAN on MNIST.** Proves you understand adversarial training, including how badly it misbehaves.
- **The habit — the debugging playbook.** An ordered checklist. Every practical below will fail at least once; the playbook is what you run when it does.`,
    },
    {
      type: 'intuition',
      title: 'Practical 1 — the brief',
      md: `Build a 2-layer network on MNIST with nothing but NumPy. This is the single highest-leverage project on your resume.

- Architecture: **784 → 128 (ReLU) → 10 (softmax)**. 784 = 28×28 pixels flattened.
- Loss: cross-entropy. Optimizer: plain mini-batch SGD, batch 64.
- Parameters: 784·128 + 128 + 128·10 + 10 = **101,770**. Small enough to fit in your head.
- Expect **~97% test accuracy in a couple of minutes on a CPU**. Not 99% — that needs conv layers.
- Below 95% after 20 epochs? Something is wrong, and it is almost certainly one of the three bugs two sections down.`,
    },
    {
      type: 'math',
      intro:
        'The whole net, forward and backward, in four lines each. This is the backprop module applied to one concrete architecture — the derivation lives there, the shapes live here.',
      latex: [
        'Z_1 = X W_1 + b_1 \\quad A_1 = \\max(0, Z_1) \\quad Z_2 = A_1 W_2 + b_2 \\quad P = \\mathrm{softmax}(Z_2)',
        '\\mathcal{L} = -\\frac{1}{B} \\sum_{i=1}^{B} \\log P_{i,\\, y_i} \\qquad \\frac{\\partial \\mathcal{L}}{\\partial Z_2} = \\frac{P - Y}{B}',
        '\\frac{\\partial \\mathcal{L}}{\\partial W_2} = A_1^\\top \\frac{\\partial \\mathcal{L}}{\\partial Z_2} \\qquad \\frac{\\partial \\mathcal{L}}{\\partial Z_1} = \\left( \\frac{\\partial \\mathcal{L}}{\\partial Z_2} W_2^\\top \\right) \\odot \\mathbb{1}[Z_1 > 0] \\qquad \\frac{\\partial \\mathcal{L}}{\\partial W_1} = X^\\top \\frac{\\partial \\mathcal{L}}{\\partial Z_1}',
        '\\text{Shapes: } X_{(B \\times 784)} \\;\\; W_{1\\,(784 \\times 128)} \\;\\; A_{1\\,(B \\times 128)} \\;\\; W_{2\\,(128 \\times 10)} \\;\\; Z_{2\\,(B \\times 10)}',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'P1 — the entire net, forward and backward (run, real output pasted)',
      code: `import numpy as np

def softmax(z):                                  # z: (B, 10) logits
    z = z - z.max(axis=1, keepdims=True)         # the overflow fix
    e = np.exp(z)
    return e / e.sum(axis=1, keepdims=True)      # every row sums to 1

rng = np.random.default_rng(0)
W1 = rng.normal(0, np.sqrt(2 / 784), (784, 128)); b1 = np.zeros(128)   # He init
W2 = rng.normal(0, np.sqrt(2 / 128), (128, 10));  b2 = np.zeros(10)

def forward(X):              # X: (B, 784), pixels already scaled to [0, 1]
    Z1 = X @ W1 + b1         # (B, 128)
    A1 = np.maximum(0, Z1)   # ReLU               (B, 128)
    Z2 = A1 @ W2 + b2        # (B, 10) logits
    return Z1, A1, Z2

def backward(X, Y, Z1, A1, P):       # Y: (B, 10) one-hot,  P: (B, 10) probs
    B = X.shape[0]
    dZ2 = (P - Y) / B                # (B, 10)  softmax + CE collapse to one line
    dW2 = A1.T @ dZ2                 # (128, 10)
    db2 = dZ2.sum(0)                 # (10,)
    dA1 = dZ2 @ W2.T                 # (B, 128)
    dZ1 = dA1 * (Z1 > 0)             # ReLU gate: pass only where the unit was on
    dW1 = X.T @ dZ1                  # (784, 128)
    db1 = dZ1.sum(0)                 # (128,)
    return dW1, db1, dW2, db2

X = rng.random((64, 784))
Z1, A1, Z2 = forward(X)
print(X.shape, Z1.shape, A1.shape, Z2.shape)
print('params:', 784 * 128 + 128 + 128 * 10 + 10)

# (64, 784) (64, 128) (64, 128) (64, 10)
# params: 101770`,
      annotations: {
        4: 'Subtract the row max before exp. Softmax is unchanged by it (the constant cancels) but exp(1000) is not.',
        9: 'He init: std = sqrt(2/fan_in) for ReLU layers. Init at all-zeros and every hidden unit stays identical forever — no symmetry breaking, no learning.',
        13: 'Batch axis is axis 0, ALWAYS. X is (batch, features), never (features, batch). Half of all from-scratch bugs are this decision made inconsistently.',
        20: 'The one line worth memorising. Softmax and cross-entropy differentiate together into (P - Y)/B — no Jacobian, no division, nothing that can overflow.',
        24: 'ReLU backward is a mask, not a multiply by a derivative you computed. Gradient passes where the unit was positive, is deleted where it was not.',
        25: 'X is (B, 784) and dZ1 is (B, 128), so X.T @ dZ1 is (784, 128) — the batch axis contracts away. If your shapes do not contract, you transposed something.',
        32: '784*128 = 100352, +128 biases, +1280, +10 = 101770. Know your parameter count; interviewers ask.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'P1 — the two numbers you must verify before training anything (run, real output pasted)',
      code: `import numpy as np

def softmax(z):
    z = z - z.max(axis=1, keepdims=True)
    e = np.exp(z)
    return e / e.sum(axis=1, keepdims=True)

# 1. WHY the max-subtraction exists
big = np.array([[1000.0, 1001.0, 1002.0]])
print('naive :', np.exp(big) / np.exp(big).sum(axis=1, keepdims=True))
print('stable:', softmax(big))

# 2. loss at initialisation must be ~ ln(10)
rng = np.random.default_rng(0)
B, C = 4, 10
logits = rng.normal(0, 0.01, size=(B, C))          # near-zero logits
y = np.array([3, 1, 9, 0])
P = softmax(logits)
loss = -np.log(P[np.arange(B), y]).mean()
print('loss at init:', round(float(loss), 4), '| ln(10) =', round(float(np.log(10)), 4))

# 3. the gradient of softmax+cross-entropy really is (P - Y) / B
Y = np.zeros((B, C)); Y[np.arange(B), y] = 1
dlogits = (P - Y) / B

def ce(z):
    p = softmax(z)
    return -np.log(p[np.arange(B), y]).mean()

num, eps = np.zeros_like(logits), 1e-6            # central finite differences
for i in range(B):
    for j in range(C):
        a = logits.copy(); a[i, j] += eps
        b = logits.copy(); b[i, j] -= eps
        num[i, j] = (ce(a) - ce(b)) / (2 * eps)
print('max |analytic - numerical|:', float(np.abs(dlogits - num).max()))
print('each gradient row sums to :', round(float(dlogits[0].sum()), 12))

# naive : [[nan nan nan]]
# stable: [[0.09003057 0.24472847 0.66524096]]
# loss at init: 2.3036 | ln(10) = 2.3026
# max |analytic - numerical|: 1.835726570753593e-10
# each gradient row sums to : 0.0`,
      annotations: {
        10: 'exp(1000) overflows float64 to inf, and inf/inf is nan. Your loss is NaN from step 0 and no learning rate will save it.',
        20: 'A near-uniform softmax gives each class probability 1/10, so -log(0.1) = 2.303. Measuring 2.3036 means labels and logits are wired to each other correctly.',
        24: 'The claim being tested: the entire softmax + cross-entropy gradient is this one expression. Everything below is the proof.',
        35: 'Central differences, not forward: error is O(eps^2) instead of O(eps). Agreement to 1e-10 is a real gradient check; 1e-3 means you have a bug you have not found yet.',
        37: 'Every row of (P - Y) sums to exactly 0, because P sums to 1 and Y sums to 1. Free sanity check on any softmax gradient you write.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'P1 — the mini-batch SGD driver, proven on sklearn digits in 3 seconds (run, real output pasted)',
      code: `import numpy as np
from sklearn.datasets import load_digits          # 8x8 digits, ships with sklearn

d = load_digits()
X = d.data / 16.0                                  # SCALE FIRST. raw is 0..16
y = d.target
p = np.random.default_rng(7).permutation(len(X)); X, y = X[p], y[p]   # shuffle BEFORE splitting
Xtr, ytr, Xte, yte = X[:1500], y[:1500], X[1500:], y[1500:]

rng = np.random.default_rng(0)
nin, nh, nout = X.shape[1], 128, 10
W1 = rng.normal(0, np.sqrt(2 / nin), (nin, nh)); b1 = np.zeros(nh)
W2 = rng.normal(0, np.sqrt(2 / nh), (nh, nout)); b2 = np.zeros(nout)
Ytr = np.zeros((len(ytr), nout)); Ytr[np.arange(len(ytr)), ytr] = 1

def softmax(z):
    e = np.exp(z - z.max(axis=1, keepdims=True))
    return e / e.sum(axis=1, keepdims=True)

lr, bs = 0.5, 64
for epoch in range(20):
    order = rng.permutation(len(Xtr))               # reshuffle every epoch
    for s in range(0, len(order), bs):
        idx = order[s:s + bs]
        xb, Yb = Xtr[idx], Ytr[idx]
        Z1 = xb @ W1 + b1
        A1 = np.maximum(0, Z1)
        P = softmax(A1 @ W2 + b2)
        dZ2 = (P - Yb) / len(idx)
        dZ1 = (dZ2 @ W2.T) * (Z1 > 0)
        W2 -= lr * (A1.T @ dZ2); b2 -= lr * dZ2.sum(0)
        W1 -= lr * (xb.T @ dZ1); b1 -= lr * dZ1.sum(0)
    if epoch % 5 == 0 or epoch == 19:
        pred = (np.maximum(0, Xte @ W1 + b1) @ W2 + b2).argmax(1)
        print('epoch', epoch, 'test acc', round(float((pred == yte).mean()), 4))

# epoch 0 test acc 0.8721
# epoch 5 test acc 0.9394
# epoch 10 test acc 0.9461
# epoch 15 test acc 0.9529
# epoch 19 test acc 0.963`,
      annotations: {
        5: 'The scaling line. Delete it and the same code peaks around chance — this is bug #1, live.',
        7: 'load_digits is ordered by writer. Splitting without shuffling first gives a test set from writers the model never saw: the exact same run scored 0.9192 then DECAYED to 0.8822. That is a distribution shift masquerading as overfitting.',
        22: 'New permutation every epoch. A fixed order means the same gradient sequence forever — the model memorises the order, not the digits.',
        29: 'Divide by len(idx), not by bs. The last batch of an epoch is usually short, and dividing by the wrong number silently rescales its learning rate.',
      },
    },
    {
      type: 'note',
      md: `**The three bugs everyone hits in P1, in the order they bite.** (1) **Forgetting to scale pixels to [0,1]** — raw 0..255 inputs make the first pre-activation huge, ReLU saturates one way, gradients are enormous, loss diverges or flatlines. (2) **Softmax overflow** — writing exp(z)/exp(z).sum() without the max subtraction gives inf/inf = NaN the first time a logit passes ~710. (3) **Mixing up the batch axis** — storing X as (784, B) in one function and (B, 784) in another. The matmuls still run, the shapes still "work", and the gradient is quietly wrong. Print every shape once, at the start.`,
    },
    {
      type: 'intuition',
      title: 'Practical 2 — the brief',
      md: `CIFAR-10: 60,000 colour images, 32×32, ten classes. Two runs, and the gap between them is the lesson.

- **Run A — a small conv net from scratch.** ~620k parameters, ~30 epochs. Expect **70–75%** test accuracy.
- **Run B — ResNet-18 pretrained on ImageNet, fine-tuned.** Expect **93%+ in about 5 epochs**.
- Same dataset, same GPU, twenty times less of your time. That is the honest comparison.
- Why: ImageNet taught the backbone edges, textures, and object parts. Those features are not CIFAR-specific — they are *vision*-specific.
- **The default is transfer learning.** Training from scratch is what you do when your domain looks nothing like natural images (medical volumes, spectrograms, sensor traces).`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'P2 Run A — the small conv net (PyTorch)',
      code: `import torch
import torch.nn as nn

class SmallCNN(nn.Module):
    def __init__(self, n_classes=10):
        super().__init__()
        self.features = nn.Sequential(
            nn.Conv2d(3, 32, 3, padding=1), nn.ReLU(),    # 32x32 -> 32x32
            nn.MaxPool2d(2),                              # 32x32 -> 16x16
            nn.Conv2d(32, 64, 3, padding=1), nn.ReLU(),
            nn.MaxPool2d(2),                              # 16x16 -> 8x8
            nn.Conv2d(64, 128, 3, padding=1), nn.ReLU(),
            nn.MaxPool2d(2),                              # 8x8 -> 4x4
        )
        self.classifier = nn.Sequential(
            nn.Flatten(),                                 # (B,128,4,4) -> (B, 2048)
            nn.Dropout(0.3),
            nn.Linear(128 * 4 * 4, 256), nn.ReLU(),
            nn.Linear(256, n_classes),
        )

    def forward(self, x):                                 # x: (B, 3, 32, 32)
        return self.classifier(self.features(x))          # (B, 10) logits

net = SmallCNN()
print(sum(p.numel() for p in net.parameters()))
# 620362`,
      annotations: {
        8: 'padding=1 with a 3x3 kernel keeps height and width identical ("same" convolution). Params here: 3*32*3*3 + 32 = 896.',
        9: 'Pooling, not the convolutions, is what shrinks the image. Three pools halve 32 down to 4 — memorise the chain 32 -> 16 -> 8 -> 4.',
        16: 'The flatten is where shape errors surface. 128 channels of 4x4 = 2048. Get the pooling count wrong and this number is wrong and nothing runs.',
        18: '2048*256 + 256 = 524,544 parameters — 85% of the whole model in one layer. This is exactly why modern nets use global average pooling instead.',
        26: '896 + 18496 + 73856 + 524544 + 2570 = 620362. Every conv layer costs in_ch * out_ch * k * k + out_ch.',
      },
    },
    {
      type: 'note',
      md: `**Two gotchas that cost accuracy points and never print an error.**

- **Normalization statistics must match the weights.** A model trained from scratch on CIFAR uses **CIFAR's own** channel statistics. A **pretrained** model must be fed the statistics **it was trained with** — for any torchvision ImageNet model, mean (0.485, 0.456, 0.406) and std (0.229, 0.224, 0.225).
- Feed ImageNet weights CIFAR-normalized data and every activation sits in the wrong range. The network still trains, just worse, and nothing errors — the most expensive kind of bug.
- **Input resolution must match the stem.** ResNet-18 opens with a 7×7 stride-2 conv and a stride-2 maxpool, designed for 224×224.
- Hand it a 32×32 image and the final feature map is 1×1. You have thrown the picture away before the first residual block.
- Fix: resize to 224, or replace the stem with a 3×3 stride-1 conv and delete the maxpool (the standard "CIFAR ResNet" edit, and much faster).`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'P2 Run B — augmentation, the fc swap, and two learning rates',
      code: `from torchvision import transforms, models
import torch, torch.nn as nn

CIFAR = ((0.4914, 0.4822, 0.4465), (0.2470, 0.2435, 0.2616))   # CIFAR-10's own stats
IMNET = ((0.485, 0.456, 0.406), (0.229, 0.224, 0.225))         # what ResNet-18 was trained on

train_tf = transforms.Compose([
    transforms.RandomCrop(32, padding=4),      # pad then crop: shifts the object around
    transforms.RandomHorizontalFlip(),         # a mirrored cat is still a cat
    transforms.ToTensor(),                     # HWC uint8 -> CHW float in [0, 1]
    transforms.Normalize(*CIFAR),
])
test_tf = transforms.Compose([                 # NO augmentation at evaluation. ever.
    transforms.ToTensor(),
    transforms.Normalize(*CIFAR),
])

finetune_tf = transforms.Compose([             # the pretrained path needs BOTH changes
    transforms.Resize(224),                    # 32x32 dies in ResNet-18's stem
    transforms.RandomHorizontalFlip(),
    transforms.ToTensor(),
    transforms.Normalize(*IMNET),              # ImageNet stats, not CIFAR's
])

model = models.resnet18(weights=models.ResNet18_Weights.IMAGENET1K_V1)
model.fc = nn.Linear(model.fc.in_features, 10)      # 512 -> 10, freshly initialised

head = list(model.fc.parameters())
head_ids = {id(p) for p in head}
backbone = [p for p in model.parameters() if id(p) not in head_ids]

opt = torch.optim.SGD(
    [{'params': backbone, 'lr': 1e-3},              # gentle: these weights are already good
     {'params': head,     'lr': 1e-2}],             # aggressive: this one is random noise
    momentum=0.9, weight_decay=5e-4,
)

# The other option entirely: freeze the backbone (linear probing)
for prm in model.parameters():
    prm.requires_grad = False
model.fc = nn.Linear(512, 10)                       # a brand-new module: requires_grad=True
opt_probe = torch.optim.SGD(model.fc.parameters(), lr=1e-2, momentum=0.9)`,
      annotations: {
        8: 'RandomCrop(32, padding=4) pads to 40x40 then crops back to 32x32 — a random shift of up to 4 pixels. With horizontal flip this is worth 2-3 points on CIFAR for free.',
        13: 'Augmentation is a TRAINING-time regulariser. Applying it at eval makes your validation number noisy and pessimistic, and it is a classic silent bug.',
        19: 'ResNet-18 stem = 7x7 stride-2 conv then a stride-2 maxpool, built for 224x224. Feed it 32x32 and the final feature map is 1x1 — the picture is gone.',
        26: 'Python evaluates the right side first, so model.fc.in_features still reads the OLD layer (512) while the assignment installs the new one.',
        33: 'Parameter groups: a list of dicts, each with its own lr. momentum and weight_decay outside the list apply to every group.',
        34: 'A random head produces huge early gradients. Without a smaller backbone lr, those gradients wreck the pretrained features in the first few hundred steps — the single most common fine-tuning mistake.',
        41: 'Assigning a fresh nn.Linear AFTER the freeze loop is what makes this work: new modules default to requires_grad=True, so only the head trains.',
      },
    },
    {
      type: 'intuition',
      title: 'Freeze or fine-tune? A two-line decision',
      md: `Both start the same way — swap the final layer. They differ in what else is allowed to move.

- **Freeze the backbone** (linear probing) when your dataset is **small** (< ~5k images) or **very similar** to ImageNet. Fast, cheap, almost impossible to overfit, and often within a couple of points of full fine-tuning.
- **Fine-tune everything** when you have **enough data** (CIFAR's 50k is plenty) or your domain **differs** from ImageNet. Higher ceiling, needs a small backbone learning rate.
- The safe middle, and what most teams actually ship: **freeze first for one or two epochs** so the new head stops being random, **then unfreeze** with a small backbone learning rate.
- Rule of thumb: the more your data differs from ImageNet, the deeper you unfreeze.`,
    },
    {
      type: 'intuition',
      title: 'Practical 3 — the brief',
      md: `Feed an LSTM a text file one character at a time and ask it to predict the next character. Then let it write.

- **Character-level, not word-level** — deliberately. No tokenizer to build, no out-of-vocabulary handling, vocabulary is ~65 symbols instead of 50,000.
- That tiny vocabulary means the output layer is small and the whole model trains on a laptop.
- Corpus: anything with a strong voice — Shakespeare, a Linux kernel source tree, your own chat logs. ~1 MB is enough.
- Training shape: cut the text into (B, T) windows; the target is **the same window shifted one character right**.
- At sampling time you **sample** from the distribution, you do not take the argmax — and **temperature** is the dial that controls how boldly.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'P3 — the model and one training step',
      code: `import torch, torch.nn as nn

text = open('corpus.txt').read()                     # ~1 MB is plenty
chars = sorted(set(text))
stoi = {c: i for i, c in enumerate(chars)}           # no tokenizer. that is the point.
itos = {i: c for c, i in stoi.items()}
data = torch.tensor([stoi[c] for c in text])
V = len(chars)                                       # ~65 for plain English

class CharLSTM(nn.Module):
    def __init__(self, vocab, emb=64, hidden=256, layers=2):
        super().__init__()
        self.embed = nn.Embedding(vocab, emb)
        self.lstm = nn.LSTM(emb, hidden, layers, batch_first=True, dropout=0.2)
        self.head = nn.Linear(hidden, vocab)

    def forward(self, x, state=None):                # x: (B, T) of character ids
        e = self.embed(x)                            # (B, T, 64)
        out, state = self.lstm(e, state)             # (B, T, 256)
        return self.head(out), state                 # (B, T, V) logits

model = CharLSTM(V)

x = data[:64 * 128].view(64, 128)                    # (B=64, T=128)
y = data[1:64 * 128 + 1].view(64, 128)               # THE SAME WINDOW, SHIFTED BY ONE
logits, _ = model(x)
loss = nn.functional.cross_entropy(logits.reshape(-1, V), y.reshape(-1))`,
      annotations: {
        6: 'stoi.items() yields (char, index), so unpacking as (c, i) and building {i: c} inverts the map. Read it twice — inverted lookup tables are a classic silent bug.',
        14: 'batch_first=True makes tensors (B, T, F) instead of the PyTorch LSTM default (T, B, F) — pick one convention and never mix. Parameters per layer: 4 gates * (in*hidden + hidden*hidden + 2 bias vectors), so layer 1 = 4*(64*256 + 256*256 + 512) = 329,728 and layer 2 = 4*(256*256 + 256*256 + 512) = 526,336.',
        25: 'The entire supervision signal: target = input shifted one step. No labels to collect, no annotation budget. This is why language modelling scaled.',
        27: 'cross_entropy wants (N, C) and (N,), so both tensors collapse the batch and time axes together: (64*128, V) and (64*128,). Use reshape, not view — LSTM output is not guaranteed contiguous.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'P3 — sampling, with the temperature dial',
      code: `@torch.no_grad()
def sample(model, seed='The ', n=300, temperature=0.8):
    model.eval()
    idx = torch.tensor([[stoi[c] for c in seed]])      # (1, len(seed))
    logits, state = model(idx)                         # prime the hidden state
    out = seed
    for _ in range(n):
        probs = torch.softmax(logits[0, -1] / temperature, dim=-1)
        nxt = torch.multinomial(probs, 1)              # SAMPLE, do not argmax
        out += itos[nxt.item()]
        logits, state = model(nxt.view(1, 1), state)   # one char in, carry the state
    return out`,
      annotations: {
        1: 'no_grad plus eval(): no autograd graph is built, and dropout is switched off. Forgetting eval() makes your samples worse for no reason.',
        5: 'Priming: run the seed through once so the hidden state carries its context before the first sampled character.',
        8: 'Divide logits by temperature BEFORE softmax. T < 1 sharpens (safe, repetitive), T > 1 flattens (creative, then gibberish), T -> 0 becomes argmax.',
        9: 'multinomial, not argmax. Greedy decoding on a character model locks into "the the the the" within twenty characters.',
        11: 'Feed one character and the carried state, not the whole string again. This is the O(1)-per-token loop; recomputing the prefix each step is O(n^2).',
      },
    },
    { type: 'visual', component: 'NextTokenSampler', props: {} },
    {
      type: 'note',
      md: `**What P3 actually looks like, honestly.** Set your expectations here so you do not think it is broken.

- *Epoch 1:* random characters with roughly the right letter frequencies — "eht oa nrs ie". Loss around 2.5.
- *Epoch 5:* spaces land in plausible places and short real words appear — "the of and hise wor".
- *Epoch 20:* almost-English. Correct word shapes, matched quotes and brackets, speaker names in the right format, sentences that parse but mean nothing. Loss around 1.4.
- It will never become coherent, and that is the point: a ~900k-parameter character LSTM shows you exactly what next-character prediction can and cannot buy.
- Scale it 100,000× and swap the recurrence for attention and you get the GenAI subject. The temperature you just tuned is the same knob every LLM API exposes today.`,
    },
    {
      type: 'intuition',
      title: 'Practical 4 — the brief',
      md: `Two networks fighting. A **generator** turns noise into fake digits; a **discriminator** tries to spot them. Neither has a loss it can minimize alone.

- **G**: latent vector of dim 64 → MLP → 784 values → reshape to 28×28. Output activation **tanh**, so pixels land in [−1, 1].
- **D**: 784 → MLP → **one raw logit**. No sigmoid at the end — use BCEWithLogitsLoss.
- Because G outputs tanh, the real data must be normalized to [−1, 1] too. Mismatch here and D wins instantly by checking the pixel range.
- **Two optimizers, alternating.** One D step (real → 1, fake → 0), then one G step (fake → 1). They never share an update.
- Honest warning up front: **GAN training is fiddly**. There is no loss curve that tells you it is going well. You look at the samples.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'P4 — the alternating loop, both optimizers',
      code: `import torch, torch.nn as nn

LATENT = 64
G = nn.Sequential(
    nn.Linear(LATENT, 256), nn.LeakyReLU(0.2),
    nn.Linear(256, 512), nn.LeakyReLU(0.2),
    nn.Linear(512, 784), nn.Tanh(),                  # pixels in [-1, 1]
)
D = nn.Sequential(
    nn.Linear(784, 512), nn.LeakyReLU(0.2),
    nn.Linear(512, 256), nn.LeakyReLU(0.2),
    nn.Linear(256, 1),                               # raw logit, no sigmoid
)

opt_g = torch.optim.Adam(G.parameters(), lr=2e-4, betas=(0.5, 0.999))
opt_d = torch.optim.Adam(D.parameters(), lr=2e-4, betas=(0.5, 0.999))
bce = nn.BCEWithLogitsLoss()

for real, _ in loader:                               # Normalize((0.5,), (0.5,)) -> [-1, 1]
    B = real.size(0)
    real = real.view(B, -1)                          # (B, 1, 28, 28) -> (B, 784)
    ones, zeros = torch.ones(B, 1), torch.zeros(B, 1)
    z = torch.randn(B, LATENT)
    fake = G(z)

    # 1. discriminator: call real real, call fake fake
    loss_d = bce(D(real), ones * 0.9) + bce(D(fake.detach()), zeros)
    opt_d.zero_grad(); loss_d.backward(); opt_d.step()

    # 2. generator: make the just-updated D call the fake real
    loss_g = bce(D(fake), ones)
    opt_g.zero_grad(); loss_g.backward(); opt_g.step()`,
      annotations: {
        7: 'tanh bounds G output to [-1, 1], so the data pipeline must end there too: Normalize((0.5,), (0.5,)). Mismatch and D wins instantly by checking the pixel range.',
        11: 'LeakyReLU in D, not ReLU. A dead ReLU unit sends zero gradient back to G, and G is the only thing that learns from D gradients.',
        12: 'One raw logit, no sigmoid — BCEWithLogitsLoss applies it internally in a numerically stable way. Totals: G = 550,416 params, D = 533,505, deliberately matched, because a D that outclasses G is the number-one cause of a dead generator.',
        16: 'betas=(0.5, 0.999) is the DCGAN default. The lowered first beta shortens Adam gradient memory, which matters when the objective is moving under you every step.',
        27: 'detach() is the load-bearing call. Without it, the D update also backprops into G and trains G to help D — the exact opposite of the game. The 0.9 is one-sided label smoothing.',
        31: 'No detach here: this gradient MUST flow through D into G. D is only a differentiable critic; its own grads get zeroed at the next opt_d.zero_grad().',
      },
    },
    {
      type: 'note',
      md: `**Mode collapse — what it looks like and what to do.** Symptom: your 8×8 sample grid shows the same digit sixty-four times, or two digits alternating. G found one output that reliably fools D and stopped exploring. The loss curves look **fine** — which is exactly why you render a grid every epoch and judge with your eyes.

- **Lower D's learning rate**, or update D once per two G steps. The usual root cause is a discriminator that already won and now returns near-zero gradient.
- **One-sided label smoothing** — train D toward 0.9 for real instead of 1.0, so it never becomes fully confident.
- **Check D's loss.** If it has collapsed to ~0 while G's climbs, D has won and G is learning from nothing.
- **Then** add noise to D's inputs, or switch to a hinge or Wasserstein loss.
- What does *not* work: training longer. A collapsed generator stays collapsed.`,
    },
    {
      type: 'intuition',
      title: 'THE PLAYBOOK, step 1: overfit a single batch. Always. First.',
      md: `This is the single best habit in deep learning, and most people never learn it.

- Take **8 examples**. Turn off shuffling, augmentation, dropout, and weight decay. Train on those 8, forever.
- A model with 100k parameters memorizing 8 examples should drive the loss to **essentially zero** within a few hundred steps.
- **If it cannot, the bug is in your code — not in your data, not in your hyperparameters, not in your architecture.** Eight examples cannot be "too hard". There is nothing to generalize.
- Cost: thirty seconds. It catches wrong loss functions, detached graphs, a missing zero_grad, misaligned labels, frozen parameters, and a learning rate at the wrong end of the sweep.
- Do it before your first real training run. Do it again the moment anything looks off.`,
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'The overfit-one-batch protocol',
        notice:
          'Eight examples, all regularisation off. The only pass condition is loss falling to ~0. Numbers below are from a real run of the NumPy net in this module.',
        leftLabel: 'the run',
        rightLabel: 'what it means',
        frames: [
          {
            note: 'Setup. Eight examples, fixed. Shuffling off, augmentation off, dropout off, weight decay off. Nothing that adds noise or resists memorisation is allowed to run.',
            stack: [
              { name: 'batch', value: '8 examples' },
              { name: 'regularisation', value: 'ALL off' },
              { name: 'shuffle', value: 'off' },
              { name: 'pass condition', to: 'goal' },
            ],
            heap: [{ id: 'goal', value: 'loss -> ~0', label: 'the only thing that counts' }],
          },
          {
            note: 'Step 0, before anything is learned. Loss is 2.7394 against a theoretical 2.3026 for ten classes. Same ballpark, so labels and logits are wired to each other. A 0.03 or a 9.1 here means the wiring is wrong and nothing after this matters.',
            stack: [
              { name: 'loss @ step 0', value: '2.7394', to: 'init' },
              { name: 'classes', value: '10' },
            ],
            heap: [{ id: 'init', value: 'ln(10) = 2.3026', label: 'the theoretical value to check against' }],
          },
          {
            note: 'DANGER PATH, learning rate 0.5. Loss stalls near 1.92 and stays there. Every one of the eight predictions is the same class — the model has collapsed to a constant. This is a failure, not slow progress.',
            stack: [
              { name: 'loss @ 100', value: '1.94837', danger: true },
              { name: 'loss @ 300', value: '1.92039', danger: true },
              { name: 'predictions', to: 'collapse', danger: true },
            ],
            heap: [
              { id: 'collapse', value: '[1 1 1 1 1 1 1 1]', label: 'every example -> the same class', freed: true },
            ],
          },
          {
            note: 'A plateau on eight examples implicates exactly three things, and never the dataset. Check them in this order — the first two are code bugs, the third is one sweep.',
            stack: [
              { name: '1. gradient flow', value: 'not reaching the weights', danger: true },
              { name: '2. label alignment', value: 'x and y desynced', danger: true },
              { name: '3. learning rate', value: 'wrong end of the sweep', danger: true },
            ],
            heap: [
              { id: 'notdata', value: '"the data is too hard"', label: 'NOT a valid explanation for 8 examples', freed: true },
              { id: 'checks', value: 'zero_grad / detach / requires_grad', label: 'suspect 1, concretely' },
            ],
          },
          {
            note: 'SUCCESS PATH. Same code, same eight examples, same seed — only the learning rate changed, 0.5 to 0.05. Loss falls three orders of magnitude and every prediction matches its label. Suspect 3 was the culprit.',
            stack: [
              { name: 'loss @ 0', value: '2.7394' },
              { name: 'loss @ 100', value: '0.01403' },
              { name: 'loss @ 300', value: '0.00374' },
              { name: 'predictions', to: 'match' },
            ],
            heap: [{ id: 'match', value: '[3 1 4 1 5 9 2 6]', label: 'exactly the labels' }],
          },
          {
            note: 'Verdict: the implementation is correct. Only now do you train on the full dataset — and only after that do you add the regularisation back, one knob at a time.',
            stack: [
              { name: 'implementation', value: 'proven correct' },
              { name: 'bug found', value: 'learning rate' },
              { name: 'next', to: 'real' },
            ],
            heap: [
              { id: 'real', value: 'train on the full set', label: 'regularisation back on AFTER this' },
            ],
          },
        ],
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The protocol, run for real — same code, same seed, two learning rates',
      code: `import numpy as np

def softmax(z):
    z = z - z.max(axis=1, keepdims=True)
    e = np.exp(z)
    return e / e.sum(axis=1, keepdims=True)

def overfit_8(lr, steps):
    rng = np.random.default_rng(0)                     # SAME init every call
    W1 = rng.normal(0, np.sqrt(2 / 784), (784, 128)); b1 = np.zeros(128)
    W2 = rng.normal(0, np.sqrt(2 / 128), (128, 10));  b2 = np.zeros(10)
    X = np.random.default_rng(1).random((8, 784))      # 8 examples, that is all
    y = np.array([3, 1, 4, 1, 5, 9, 2, 6])
    Y = np.zeros((8, 10)); Y[np.arange(8), y] = 1
    for step in range(steps + 1):
        Z1 = X @ W1 + b1
        A1 = np.maximum(0, Z1)
        P = softmax(A1 @ W2 + b2)
        loss = -np.log(P[np.arange(8), y]).mean()
        if step % 100 == 0:
            print('  step', step, 'loss', round(float(loss), 5))
        dZ2 = (P - Y) / 8
        dZ1 = (dZ2 @ W2.T) * (Z1 > 0)
        W2 -= lr * (A1.T @ dZ2); b2 -= lr * dZ2.sum(0)
        W1 -= lr * (X.T @ dZ1);  b1 -= lr * dZ1.sum(0)
    print('  predicted', P.argmax(1), 'wanted', y)

print('lr = 0.5')
overfit_8(0.5, 300)
print('lr = 0.05')
overfit_8(0.05, 300)

# lr = 0.5
#   step 0 loss 2.7394
#   step 100 loss 1.94837
#   step 200 loss 1.9275
#   step 300 loss 1.92039
#   predicted [1 1 1 1 1 1 1 1] wanted [3 1 4 1 5 9 2 6]
# lr = 0.05
#   step 0 loss 2.7394
#   step 100 loss 0.01403
#   step 200 loss 0.00604
#   step 300 loss 0.00374
#   predicted [3 1 4 1 5 9 2 6] wanted [3 1 4 1 5 9 2 6]`,
      annotations: {
        9: 'Same seed inside the function, so both calls start from byte-identical weights. Change exactly one thing per experiment or you learn nothing.',
        12: 'Eight rows. That is the whole dataset for this test — and it is why "the data is too hard" is never a valid conclusion here.',
        26: 'Print the loss, but judge on this line. A loss of 1.92 with eight identical predictions is a much louder signal than the number alone.',
        31: 'The two calls differ in one character. That is what a learning-rate bug looks like: not an error, not a warning, just a model that quietly refuses to learn.',
      },
    },
    {
      type: 'math',
      intro:
        'Playbook step 2: check the loss at initialisation against the number it should be. A random classifier spreads probability evenly across C classes, so the loss is the negative log of 1/C. Do the arithmetic before you look at the screen.',
      latex: [
        '\\mathcal{L}_{\\text{init}} = -\\log\\!\\left(\\tfrac{1}{C}\\right) = \\log C',
        'C = 2 \\Rightarrow 0.6931 \\qquad C = 10 \\Rightarrow 2.3026 \\qquad C = 1000 \\Rightarrow 6.9078',
        '\\text{Measured in the snippet above: } 2.3036 \\;\\; \\text{(the } 0.001 \\text{ gap is the random init, not a bug)}',
        '\\text{Also: MSE on standardised targets starts near } 1.0, \\text{ since } \\mathbb{E}[(0 - y)^2] = \\mathrm{Var}(y) = 1',
      ],
    },
    {
      type: 'intuition',
      title: 'Playbook steps 3, 4, 5',
      md: `**Step 3 — verify shapes and one sample end to end.** Print one input tensor's shape and range, print its label, print the model's prediction for it, and *look at the image*. Half of all "the model does not learn" reports are a label column read from the wrong index, or images stored as (B, H, W, C) fed to a layer expecting (B, C, H, W).

**Step 4 — the learning-rate sweep.** Try 1e-1, 1e-2, 1e-3, 1e-4 for a few hundred steps each and plot the loss.

- Diverges or NaNs → too high. Barely moves → too low.
- Pick roughly **one order of magnitude below** the highest rate that stays stable.
- Do this before touching architecture. LR is the highest-leverage hyperparameter, by a wide margin.

**Step 5 — regularisation off, then back on.** Turn off dropout, weight decay, augmentation, and label smoothing. Confirm the model can **overfit the training set**. Only then add each one back, one at a time, watching validation. You cannot regularize a model that could never fit the data in the first place.`,
    },
    {
      type: 'note',
      md: `**The symptom table — memorise this.** Symptom on the left, causes to check in order on the right.

- **Loss is NaN:** learning rate too high; a log(0) somewhere (use the logits-based loss); exploding gradients (clip to norm 1.0); a bad value already in the input.
- **Loss flat at chance (2.303 for 10 classes):** learning rate too low; wrong loss function; labels shuffled independently of inputs; a missing optimizer.zero_grad().
- **Train loss falls, val loss rises:** classic overfitting. Early-stop at the val minimum, then see the regularisation module.
- **Val loss rises from step 1:** not overfitting. Data leakage, a train/eval preprocessing mismatch, or a forgotten model.eval() leaving dropout and BatchNorm in training mode.
- **GPU out of memory:** cut batch size; wrap evaluation in torch.no_grad(); gradient accumulation or checkpointing; stop accumulating loss tensors in a list.
- **Accuracy stuck exactly at the majority-class rate:** the model collapsed to one class. Check class weights, lower the learning rate, confirm the labels are not almost all one value.`,
    },
    {
      type: 'note',
      md: `**Playbook step 6 — reproducibility, and an honest caveat.** Seed everything: torch.manual_seed(0), np.random.seed(0), random.seed(0), and torch.cuda.manual_seed_all(0). For DataLoader with workers you also need a worker_init_fn and a seeded generator, or the augmentation stream differs every run. For strict determinism: torch.use_deterministic_algorithms(True) and torch.backends.cudnn.deterministic = True — expect a real speed cost, and some ops will raise instead of running non-deterministically. Now the honest part: **exact reproducibility across different GPUs, driver versions, or CUDA versions is not guaranteed and never was.** Floating-point addition is not associative, and parallel reduction order changes with hardware. Seed for reproducible *runs on one machine*; for cross-machine claims, report a mean and standard deviation over several seeds instead.`,
    },
  ],
  quiz: [
    {
      question:
        'Your 10-class classifier prints a loss of 0.04 at step 0, before any training. What is the most likely explanation?',
      options: [
        {
          text: 'The model is unusually well initialised',
          explanation:
            'No initialisation scheme produces a near-perfect classifier by chance. Random logits give -log(1/10) = 2.303, and getting 0.04 means the answer is already known.',
        },
        {
          text: 'Label leakage — the label is reachable from the input, or train and eval data overlap',
          explanation:
            'Correct. A loss far BELOW ln(C) at initialisation means the task is trivially solvable, which almost always means a leaked feature or a duplicated split.',
        },
        {
          text: 'The learning rate is too low',
          explanation: 'Learning rate has had no chance to act at step 0 — no update has happened yet.',
        },
        {
          text: 'The dataset is too small',
          explanation: 'Dataset size does not change the loss of a randomly initialised model on its first forward pass.',
        },
      ],
      correct: 1,
    },
    {
      question: 'You overfit a batch of 8 examples and the loss plateaus at 1.9 instead of falling to ~0. What does this tell you?',
      options: [
        {
          text: 'The data is too hard; collect more of it',
          explanation:
            'Eight examples cannot be too hard — there is nothing to generalise to, only to memorise. More data cannot fix a model that cannot memorise eight rows.',
        },
        {
          text: 'You need more regularisation',
          explanation: 'Backwards. Regularisation makes fitting HARDER. The protocol requires all of it switched off.',
        },
        {
          text: 'The bug is in your code or your learning rate — stop and find it before touching the dataset',
          explanation:
            'Correct. A plateau on 8 examples implicates gradient flow, label alignment, or a learning rate at the wrong end of the sweep. Nothing else.',
        },
        {
          text: 'The architecture needs more layers',
          explanation:
            'A 100k-parameter net has vastly more capacity than 8 examples require. Adding layers hides the bug rather than finding it.',
        },
      ],
      correct: 2,
    },
    {
      question:
        'Why do you subtract the row maximum inside softmax before exponentiating?',
      options: [
        {
          text: 'It makes the probabilities sum to 1',
          explanation: 'The division by the sum already guarantees that, at any offset. The subtraction is about overflow, not normalisation.',
        },
        {
          text: 'It speeds up the exponential',
          explanation: 'A subtraction adds work, it does not remove it. The reason is numerical.',
        },
        {
          text: 'It prevents negative probabilities',
          explanation: 'exp is positive for every real input, so negative probabilities were never possible.',
        },
        {
          text: 'exp of a large logit overflows to inf, and inf/inf is NaN — the subtraction leaves softmax unchanged but bounds the exponent',
          explanation:
            'Correct. Softmax is invariant to adding a constant to every logit (the constant cancels top and bottom), so subtracting the max is free and caps the largest exponent at exp(0) = 1.',
        },
      ],
      correct: 3,
    },
    {
      question:
        'You fine-tune a torchvision ResNet-18 on CIFAR-10 but normalize the images with CIFAR-10\'s own channel statistics instead of ImageNet\'s. What happens?',
      options: [
        {
          text: 'It crashes with a shape error',
          explanation: 'Normalisation statistics do not change tensor shapes. Nothing errors — which is exactly what makes this bug expensive.',
        },
        {
          text: 'Nothing at all — normalisation statistics are arbitrary',
          explanation:
            'They are arbitrary for a model trained from scratch. They are NOT arbitrary for pretrained weights, which learned filters tuned to a specific input distribution.',
        },
        {
          text: 'It trains, but converges slower and to a lower accuracy, with no error message anywhere',
          explanation:
            'Correct. The pretrained filters expect inputs in the range they were trained on. Shifting that range degrades every feature map silently — the classic silent accuracy leak.',
        },
        {
          text: 'The final fc layer will have the wrong number of outputs',
          explanation: 'That is a separate bug, fixed by replacing model.fc. It has nothing to do with normalisation statistics.',
        },
      ],
      correct: 2,
    },
    {
      question:
        'In the GAN loop, why is D(fake.detach()) used in the discriminator step but D(fake) in the generator step?',
      options: [
        {
          text: 'detach() saves memory in the D step, and the G step needs the memory anyway',
          explanation:
            'Memory is a side effect, not the reason. The reason is which parameters the gradient is allowed to reach.',
        },
        {
          text: 'The D step must not backpropagate into G, while the G step must backpropagate through D into G',
          explanation:
            'Correct. Without detach, the D update would also train G to help D — the exact opposite of the adversarial game. The G step deliberately routes gradient through D, using it as a differentiable critic.',
        },
        {
          text: 'detach() converts logits into probabilities',
          explanation: 'detach only cuts the autograd graph. It changes no values at all.',
        },
        {
          text: 'It is a style convention with no functional effect',
          explanation: 'Remove it and G receives gradients that actively push it toward being detectable. The effect is severe.',
        },
      ],
      correct: 1,
    },
    {
      question:
        'Training accuracy climbs to 99% while validation accuracy peaked at epoch 6 and has been falling since. What is the first thing you do?',
      options: [
        {
          text: 'Roll back to the epoch-6 checkpoint and add regularisation — this is textbook overfitting',
          explanation:
            'Correct. Train up and val down after a peak is the definition of overfitting. Early stopping at the peak is free; then add augmentation, dropout, or weight decay and retrain.',
        },
        {
          text: 'Lower the learning rate',
          explanation:
            'A lower learning rate helps a diverging or oscillating run. Here optimisation is working fine — generalisation is the problem.',
        },
        {
          text: 'Suspect data leakage',
          explanation:
            'Leakage shows up as validation getting WORSE FROM STEP 1, or as suspiciously perfect validation. A clean rise-then-fall curve is ordinary overfitting.',
        },
        {
          text: 'Train longer — it will recover',
          explanation: 'Validation loss that has turned upward does not turn back down. Longer training deepens the memorisation.',
        },
      ],
      correct: 0,
    },
    {
      question: 'Why is the character-level choice right for the LSTM text generator practical, specifically as a teaching project?',
      options: [
        {
          text: 'Character models produce better text than word models',
          explanation: 'They produce noticeably WORSE text. That is a cost the project accepts on purpose.',
        },
        {
          text: 'No tokenizer to build and a ~65-symbol vocabulary, so the model and output layer stay tiny and the whole pipeline is visible',
          explanation:
            'Correct. Zero preprocessing, no out-of-vocabulary handling, and a small softmax — everything that would distract from the actual sequence-modelling lesson is removed.',
        },
        {
          text: 'Character models need no training data',
          explanation: 'They need a corpus like any other model — roughly 1 MB for a usable demo.',
        },
        {
          text: 'Characters make the context window effectively infinite',
          explanation:
            'The opposite: a character consumes a whole timestep to convey a fraction of a word, so a character model sees LESS meaning per step of context.',
        },
      ],
      correct: 1,
    },
    {
      question:
        'Your GAN\'s sample grid shows the same digit in all 64 cells, but both loss curves look normal. What is happening and what do you try first?',
      options: [
        {
          text: 'The generator has converged; stop training',
          explanation:
            'A generator producing one output has not converged, it has failed. Convergence means covering the data distribution.',
        },
        {
          text: 'The loss curves prove nothing is wrong',
          explanation:
            'GAN loss curves genuinely cannot tell you this — which is exactly why the protocol is to render a sample grid every epoch and judge with your eyes.',
        },
        {
          text: 'The learning rate is too low for the generator',
          explanation:
            'Raising G\'s rate on a collapsed generator usually makes it oscillate between single modes rather than cover them. The imbalance with D is the real problem.',
        },
        {
          text: 'Mode collapse — lower the discriminator\'s learning rate or slow its updates, and add one-sided label smoothing',
          explanation:
            'Correct. G found one output that reliably fools D and stopped exploring, usually because D became over-confident and stopped supplying useful gradient. Weakening D is the standard first response.',
        },
      ],
      correct: 3,
    },
  ],
  interviewQuestions: [
    {
      question:
        'Case: training loss falls smoothly but validation loss rises. Walk me through your entire debugging tree, not just the headline answer.',
      answer:
        'First, separate two shapes of curve, because they have different causes. **Shape A — val falls, bottoms out, then rises.** That is overfitting. Confirm it: the gap between train and val widens monotonically after the turn. Fix in this order: (1) early stopping — checkpoint at the val minimum, free and immediate; (2) more data or stronger augmentation, the only fixes that raise the ceiling rather than lower the variance; (3) weight decay and dropout, tuned one at a time so you know which knob did what; (4) reduce capacity — fewer layers or narrower ones — last, because it also lowers the achievable best. **Shape B — val rises from step 1, never dips.** That is NOT overfitting and regularisation will not touch it. Causes: data leakage in reverse (val contaminated or drawn from a different distribution), a train/eval preprocessing mismatch (augmentation left on at eval, different normalisation constants, forgotten model.eval() leaving dropout active and BatchNorm updating its running statistics), or an unshuffled split so val is a different subpopulation entirely. **Then the questions that separate seniors:** is val loss rising while val *accuracy* still improves? That is a well-known and often benign effect — the model is growing more confident, so its wrong answers cost more under cross-entropy while its argmax keeps improving. If accuracy is still climbing, do not panic and do not early-stop on loss; early-stop on the metric you actually ship. Finally: how big is the val set? A 200-sample val set produces curves that look like this from noise alone.',
      isCaseBased: true,
    },
    {
      question: 'Case: your loss becomes NaN at step 400 of an otherwise healthy run. Diagnose it.',
      answer:
        'NaN is always a finite number becoming inf or a 0/0, so localise it before theorising. Step 1: reproduce with the seed, then insert torch.autograd.set_detect_anomaly(True) or print the loss and the gradient norm every step to find the exact step it appears — and whether the gradient norm exploded *before* the loss did. That single observation splits the causes in two. **Gradient norm spikes first → exploding gradients.** Common in RNNs and in deep nets without normalisation. Fix: clip_grad_norm_ to 1.0, lower the learning rate, add warmup, check for a missing normalisation layer. **Loss goes NaN with a calm gradient norm → a numerical hole in the forward pass.** Suspects: log(0) from a hand-written cross-entropy (use the logits-based loss, which is written to be stable), division by a variance that hit zero, sqrt of a negative from floating-point error, or exp of a large logit without the max-subtraction. **Neither → check the data.** One NaN or inf in the input propagates instantly; assert torch.isfinite(x).all() on every batch, which is cheap and catches a corrupt row in a 400-batch dataset that no amount of theorising will find. Two more that catch people: mixed-precision fp16 overflows where fp32 would not — check the GradScaler is present and working; and a learning rate schedule with a warmup bug that spikes the rate at a specific step. If your run dies at the same step number every time, it is the data or the schedule, not randomness.',
      isCaseBased: true,
    },
    {
      question: 'Case: a colleague says their model "does not learn" — loss sits at 2.30 for ten epochs on a 10-class problem. What do you ask, in order?',
      answer:
        '2.303 is exactly ln(10), so the model is outputting a uniform distribution: it has learned nothing, and it is not diverging either. That narrows things sharply. (1) "Are the weights changing at all?" Print the norm of one weight tensor before and after a step. If it is identical, the gradient never arrived: a missing loss.backward(), a missing optimizer.step(), requires_grad=False left on from a freezing experiment, or an optimizer constructed over the wrong parameters. (2) "Are the gradients non-zero?" If they arrive but are ~1e-12, the learning rate is far too low or an activation has saturated. (3) "Did you overfit 8 examples?" If that also plateaus, it is definitively a code bug and we stop guessing. (4) "Are x and y still aligned?" Shuffling features and labels with two separate calls destroys the correspondence and produces exactly this curve — the model correctly learns that the label is unpredictable. (5) "Is zero_grad being called?" Accumulated gradients over many steps blow up the effective step size and can pin the model in a degenerate state. The order matters: each question is cheaper than the one after it, and the first affirmative answer ends the investigation.',
      isCaseBased: true,
    },
    {
      question: 'Case: your CIFAR fine-tune reaches 93% but your teammate\'s identical script reaches 89%. Same data, same model, same epochs. Where do you look?',
      answer:
        'Diff the things that do not appear in the model definition, because that is where accuracy leaks hide. (1) **Normalisation constants** — ImageNet statistics versus CIFAR statistics on a pretrained backbone is worth several points on its own. (2) **Augmentation** — RandomCrop with padding=4 plus horizontal flip is worth 2-3 points; missing or accidentally applied at eval too. (3) **Learning-rate structure** — one learning rate for the whole network versus parameter groups with a gentler backbone rate; a random head with a large shared rate wrecks pretrained features in the first few hundred steps. (4) **Input resolution** — 32x32 fed straight into ResNet-18 leaves a 1x1 final feature map; resizing to 224 or replacing the stem changes everything. (5) **eval() and no_grad()** at validation, and whether BatchNorm running statistics were still updating during evaluation. (6) **The split itself** — an unshuffled or differently-seeded split can move the number a point either way. Then the honest closer: run both scripts over three seeds before concluding anything. A 4-point gap is probably real, but a 1-point gap on a single seed usually is not.',
      isCaseBased: true,
    },
    {
      question: 'Why is "overfit a single batch" the first thing you do, and what specific bugs does it catch that a normal training run does not?',
      answer:
        'Because it converts an ambiguous question ("is this learning slowly, or is it broken?") into a binary one with a known correct answer. A model with far more parameters than 8 examples MUST reach near-zero loss on them; if it does not, no dataset property, hyperparameter, or architecture choice explains it. Bugs it catches that a normal run hides: a loss function applied to the wrong tensor or the wrong axis; a detached graph or a missing backward call; parameters left frozen from an earlier experiment; an optimizer constructed over a different set of parameters than the ones being updated; labels misaligned with inputs after an independent shuffle; a missing zero_grad; a learning rate one or two orders of magnitude off. On the full dataset every one of these looks the same — "loss goes down slowly" — and you burn a day tuning hyperparameters against a broken implementation. The cost is thirty seconds and it is the highest-return habit in the field.',
      isCaseBased: false,
    },
    {
      question: 'Walk me through the backward pass of the NumPy MNIST net, shapes included.',
      answer:
        'Forward: Z1 = X W1 + b1, A1 = ReLU(Z1), Z2 = A1 W2 + b2, P = softmax(Z2). Backward, starting at the loss: dZ2 = (P - Y)/B, shape (B, 10) — softmax and cross-entropy differentiate together into that one expression, which is why you should never implement them separately. Then dW2 = A1.T @ dZ2, contracting the batch axis to give (128, 10); db2 = dZ2.sum(0) giving (10,). Push back through the layer: dA1 = dZ2 @ W2.T, shape (B, 128). Through ReLU: dZ1 = dA1 * (Z1 > 0) — a mask, gradient passes only where the unit was active. Then dW1 = X.T @ dZ1, shape (784, 128), and db1 = dZ1.sum(0). The pattern to state out loud: **weight gradients are input-transpose times output-gradient, and the batch axis always contracts away**. Two checks I would mention unprompted: every row of (P - Y) sums to exactly zero, and a central-difference gradient check should agree to ~1e-10.',
      isCaseBased: false,
    },
    {
      question: 'Freeze the backbone or fine-tune everything? Give me the decision rule and the tradeoffs.',
      answer:
        'Two axes: how much data you have, and how far your domain is from ImageNet. **Small data, similar domain** → freeze and train only the new head (linear probing). Fast, cheap, nearly impossible to overfit, and typically within a couple of points of full fine-tuning. **Plenty of data, similar domain** (CIFAR at 50k images) → fine-tune everything with a small backbone learning rate; higher ceiling. **Small data, distant domain** (medical scans, spectrograms) → the awkward quadrant: freeze the early layers, which learned generic edges and textures, and fine-tune the later ones, which learned ImageNet-specific object parts. **Plenty of data, distant domain** → fine-tune everything, and consider whether pretraining is buying you anything at all. What most teams ship is the middle path: freeze for one or two epochs so the random head stabilises, then unfreeze with a lower backbone rate. Tradeoffs to name: freezing means one set of activations can be cached, so it is dramatically cheaper per epoch; fine-tuning risks catastrophic forgetting of the pretrained features if the head\'s early gradients are large.',
      isCaseBased: false,
    },
    {
      question: 'Explain temperature in sampling, and why you would not simply take the argmax.',
      answer:
        'Temperature divides the logits before softmax: p = softmax(z / T). T < 1 sharpens the distribution toward the top candidate — safer, more repetitive. T > 1 flattens it — more surprising, then incoherent. T approaching 0 is argmax; T approaching infinity is uniform random. Why not argmax: greedy decoding makes the model deterministic and it locks into loops, because the highest-probability continuation of a repeated phrase is usually more of the same phrase. In a character-level model you see "the the the the" within twenty characters. Sampling keeps the output on the distribution the model actually learned. Practical range is 0.7-1.0 for creative text, near 0 for extraction or code where you want the single best answer. Worth naming: temperature is usually combined with top-k or nucleus (top-p) sampling, which truncate the tail first so a high temperature cannot promote genuinely absurd tokens — the same knobs every LLM API exposes today.',
      isCaseBased: false,
    },
    {
      question: 'Why is GAN training unstable in a way that ordinary supervised training is not?',
      answer:
        'Ordinary training minimises a fixed objective — the loss landscape sits still while you descend it. A GAN is a two-player minimax game, so each network\'s loss surface is being reshaped by the other\'s updates every step. There is no scalar you can monitor that means "going well": a falling D loss means D is winning, a falling G loss means G is winning, and neither implies good samples. The concrete failure modes: **D wins** — it separates real from fake perfectly, its output saturates, gradient to G goes to zero, and G stops learning entirely; **mode collapse** — G finds one output that reliably fools D and abandons the rest of the distribution; **oscillation** — the pair cycles between modes without settling. Standard stabilisers, and what each buys: matched G/D capacity, Adam with beta1 = 0.5 for shorter gradient memory, one-sided label smoothing so D never becomes fully confident, and non-saturating or Wasserstein losses that keep gradient flowing to G even when D is winning. The operational answer that matters most: render a sample grid every epoch, because your eyes are a better metric than the loss.',
      isCaseBased: false,
    },
    {
      question: 'What does gradient clipping actually do, and when is it the right tool versus a band-aid?',
      answer:
        'clip_grad_norm_ computes the global L2 norm across all parameter gradients and, if it exceeds a threshold, rescales every gradient by threshold/norm — so the direction is preserved and only the magnitude is capped. Clipping by value instead caps each element independently and does distort the direction; norm clipping is the default for a reason. It is the **right tool** when occasional large gradients are inherent to the problem: RNNs and LSTMs, where backprop through time genuinely produces spikes, and large transformer pretraining, where it is standard practice at 1.0. It is a **band-aid** when it is hiding a different bug: unnormalised inputs, a learning rate an order of magnitude too high, a missing normalisation layer, or a numerically unstable loss. The tell is simple — if you have to clip aggressively (say below 0.1) for the run to survive at all, you are suppressing a symptom, not managing a known-spiky objective.',
      isCaseBased: false,
    },
    {
      question: 'You inherit a training script that hits GPU out-of-memory on the validation pass but trains fine. Explain.',
      answer:
        'Training runs under a memory budget you already tuned; validation frequently runs without torch.no_grad(), so every forward pass builds an autograd graph that is never freed, and activation memory grows across the whole validation set. That is the first thing to check, and the usual answer. Second: validation batch size is often set larger than training batch size on the theory that "no backward pass means more room" — true only if no_grad is present. Third: accumulating loss tensors into a Python list keeps their entire graphs alive; call .item() or .detach() first. Fourth: model.eval() does not free anything, it only changes dropout and BatchNorm behaviour — people conflate the two. Beyond fixing the bug, the standard levers for a genuine memory ceiling are: smaller batch with gradient accumulation to preserve the effective batch size, mixed precision, and gradient checkpointing, which recomputes activations in the backward pass to trade roughly 30% extra compute for a large memory saving.',
      isCaseBased: false,
    },
    {
      question: 'How reproducible can you actually make a deep learning run, and what would you promise a reviewer?',
      answer:
        'On one machine, with one software stack: essentially exact. Seed torch, numpy, and random; seed CUDA with manual_seed_all; give DataLoader a seeded generator and a worker_init_fn, or workers will produce a different augmentation stream each run; set torch.use_deterministic_algorithms(True) and cudnn.deterministic = True, accepting a real speed cost and the fact that some ops will raise rather than run non-deterministically. Across machines: no. Floating-point addition is not associative, so a parallel reduction over a different number of streaming multiprocessors gives a bit-different sum; different GPU architectures, cuDNN versions, and CUDA versions select different kernels; tf32 and mixed precision add more variation. Small differences compound over thousands of steps. What I would promise a reviewer: a pinned environment, a seeded script that reproduces bit-exactly on the same hardware, and — the part that actually matters — results reported as a mean and standard deviation over at least three seeds. A single-seed number with no spread is not a result, it is an anecdote.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    {
      front: 'The first debugging step, always',
      back: 'Overfit a single batch of ~8 examples with all regularisation off. If loss does not reach ~0, the bug is in the code or the learning rate — never in the data.',
    },
    {
      front: 'Loss at initialisation, C classes',
      back: '-log(1/C) = log C.  C=2 -> 0.693,  C=10 -> 2.303,  C=1000 -> 6.908. Far above = wiring bug. Far below = leakage.',
    },
    {
      front: 'The three P1 bugs everyone hits',
      back: '(1) pixels not scaled to [0,1]  (2) softmax without the max-subtraction -> NaN  (3) batch axis flipped between functions.',
    },
    {
      front: 'Softmax + cross-entropy gradient',
      back: 'dL/dlogits = (P - Y) / B. One line, no Jacobian. Every row sums to exactly 0 — use that as a free check.',
    },
    {
      front: 'NumPy MNIST net, by the numbers',
      back: '784 -> 128 (ReLU) -> 10 (softmax). 101,770 parameters. ~97% test accuracy, a couple of minutes on CPU.',
    },
    {
      front: 'CIFAR-10: scratch CNN vs fine-tuned ResNet-18',
      back: '~620k-param conv net, 30 epochs -> 70-75%. Pretrained ResNet-18, 5 epochs -> 93%+. This gap is why transfer learning is the default.',
    },
    {
      front: 'The pretrained-model normalisation gotcha',
      back: 'Use the stats the weights were TRAINED with — ImageNet mean (0.485,0.456,0.406) std (0.229,0.224,0.225). Wrong stats degrade accuracy silently, no error.',
    },
    {
      front: 'Freeze vs fine-tune',
      back: 'Small data or ImageNet-like domain -> freeze the backbone. Lots of data or a distant domain -> fine-tune all, backbone lr ~10x smaller than the head.',
    },
    {
      front: 'Temperature in sampling',
      back: 'softmax(z / T). T<1 sharpens (safe, repetitive), T>1 flattens (creative, then gibberish), T->0 is argmax. Never use argmax: it loops.',
    },
    {
      front: 'Mode collapse: symptom and first fix',
      back: 'Every generated sample is the same digit while loss curves look fine. Lower D\'s learning rate or slow its updates, add one-sided label smoothing (real target 0.9), check D has not already won.',
    },
  ],
  mindmapMarkdown: `- The Four Practicals + The Debugging Playbook
  - P1 NumPy NN on MNIST
    - 784 -> 128 ReLU -> 10 softmax
    - 101,770 params, ~97% in minutes
    - dL/dZ2 = (P - Y) / B
    - Bug 1: pixels not scaled to [0,1]
    - Bug 2: softmax overflow, no max-subtraction
    - Bug 3: batch axis flipped
  - P2 PyTorch CNN on CIFAR-10
    - Scratch conv net -> 70-75%
    - ResNet-18 fine-tuned -> 93%+
    - Normalisation stats must match the weights
    - 32x32 dies in ResNet-18's stem -> resize 224
    - RandomCrop(32, padding=4) + horizontal flip
    - Freeze (small data) vs fine-tune (lots of data)
    - Param groups: backbone lr 1e-3, head lr 1e-2
  - P3 LSTM text generator
    - Character-level: no tokenizer, ~65 vocab
    - Target = input shifted one character
    - Epoch 1 gibberish -> 5 wordlike -> 20 almost-English
    - Sample with temperature, never argmax
  - P4 Tiny GAN on MNIST
    - MLP G and D, latent dim 64
    - Two optimizers, alternating updates
    - detach() in the D step, not the G step
    - Mode collapse: one digit everywhere
    - Fix: weaken D, label smoothing, check D has won
  - THE DEBUGGING PLAYBOOK
    - 1. Overfit 8 examples first
    - 2. Check loss at init vs log C
    - 3. Verify shapes and one sample end to end
    - 4. Learning-rate sweep
    - 5. Regularisation off, then back one at a time
    - 6. Reproducibility: seeds, deterministic flags
  - Symptom table
    - NaN: lr too high, log(0), exploding -> clip
    - Flat at chance: lr too low, wrong loss, labels shuffled, no zero_grad
    - Train down val up: overfitting -> early stop
    - Val up from step 1: leakage or eval mismatch
    - OOM: batch size, no_grad, checkpointing
    - Stuck at majority rate: collapsed to one class
  - Honest limits
    - Exact reproducibility across hardware: no
    - Report mean and std over seeds`,
}

export default m
