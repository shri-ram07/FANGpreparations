import type { Module } from '../types'

const m: Module = {
  id: 'dl-l1-pytorch-fundamentals',
  subjectId: 'dl',
  level: 1,
  title: 'PyTorch: Tensors, Autograd & the Training Loop',
  whyItMatters:
    'Every deep-learning job posting says PyTorch, and every deep-learning interview eventually says "write me a training loop". It is five lines in a fixed order — plus the three things that silently break it: gradients that accumulate, a model left in train mode, and a softmax where logits belonged. Learn them here and you stop losing days to bugs that never raise an exception.',
  estMinutes: 55,
  sections: [
    {
      type: 'intuition',
      title: 'A tensor is a NumPy array with two extra jobs',
      md: `You already know arrays: a grid of numbers with a shape. A PyTorch tensor is that, plus two abilities NumPy never had.

- It can **live on a GPU**. Same code you wrote for the CPU, now running on thousands of cores.
- It can **remember how it was made**. Every operation leaves a breadcrumb so PyTorch can later run the chain rule backwards through them.
- That memory is the whole trick. NumPy computes a number. A tensor computes a number *and a receipt for how it got there*.
- Everything else in this module is bookkeeping around those two abilities: which device, which dtype, which shape, and when to switch the recording off.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Shape, dtype, device — the three things you check first',
      code: `import torch

x = torch.tensor([[1.0, 2.0], [3.0, 4.0]])
print(x.shape, x.dtype, x.device)   # torch.Size([2, 2]) torch.float32 cpu

ids = torch.tensor([0, 1, 2])       # no decimal point anywhere -> int64
print(ids.dtype)                    # torch.int64

z = torch.zeros(4, 3)               # float32 by default
r = torch.randn(8, 16)              # standard normal
print(z.shape, r.shape)             # torch.Size([4, 3]) torch.Size([8, 16])

device = 'cuda' if torch.cuda.is_available() else 'cpu'
r = r.to(device)                    # returns a COPY on that device
print(r.shape)                      # torch.Size([8, 16]) -- shape never changes

f = ids.float()                     # int64 -> float32, a new tensor
print(f.dtype, ids.dtype)           # torch.float32 torch.int64`,
      annotations: {
        4: 'The three questions to ask about any tensor you did not personally create: what shape, what dtype, what device. A startling share of PyTorch bugs are one of these three being wrong.',
        6: 'Literal dtype inference: a decimal point anywhere gives float32, all-integers gives int64. Class labels and embedding indices MUST stay int64 — that is not a style preference, the loss functions demand it.',
        14: 'For a tensor, .to() is NOT in place — you must reassign. For a model, model.to(device) IS in place. That asymmetry burns everyone exactly once.',
        17: 'Casting is explicit where it matters: plain arithmetic promotes dtypes for you, but matmul, nn layers and loss functions refuse mixed dtypes outright. That is why the float/long error exists at all.',
      },
    },
    {
      type: 'note',
      md: 'Two errors will greet you in week one, and both are shallow. **Device mismatch** — "Expected all tensors to be on the same device, but found at least two devices, cuda:0 and cpu!" — you moved the model but not the batch, or the other way round. **Dtype mismatch** — labels arrive as float32 while nn.CrossEntropyLoss or nn.Embedding demands int64 ("expected scalar type Long but found Float"). Fixed recipe for both: print **tensor.dtype, tensor.device** on the exact tensor the traceback names, then **.long()** it or **.to(device)** it. Do not theorize first.',
    },
    {
      type: 'intuition',
      title: 'Shape discipline: the habit that turns two hours into two minutes',
      md: `Deep-learning bugs are shape bugs. The framework will not save you, because most *wrong* shapes are still *legal* shapes.

- **view** relabels the shape without copying — free, but it demands contiguous memory.
- **reshape** does a view when it can and copies when it cannot — the safe default.
- **permute** reorders axes (a view with new strides). It is usually what makes a tensor non-contiguous.
- **squeeze / unsqueeze** delete and insert size-1 axes — how one sample becomes a batch of one.
- **Broadcasting** stretches size-1 axes to match. Enormously useful, and the source of the worst bug class there is: no error, wrong math.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Every shape operation that matters, and the one that lies to you',
      code: `import torch

x = torch.arange(24).reshape(2, 3, 4)   # torch.Size([2, 3, 4]), int64
print(x.view(6, 4).shape)               # torch.Size([6, 4])   free: same memory
print(x.reshape(-1).shape)              # torch.Size([24])     -1 = "you do the math"

xt = x.permute(0, 2, 1)                 # reorder axes, no data moves
print(xt.shape, xt.is_contiguous())     # torch.Size([2, 4, 3]) False
# xt.view(2, 12)                        # RuntimeError: view size is not compatible
print(xt.reshape(2, 12).shape)          # torch.Size([2, 12])  reshape copies, so it works

t = torch.zeros(1, 5, 1)
print(t.squeeze().shape)                # torch.Size([5])      ALL size-1 axes gone
print(t.squeeze(0).shape)               # torch.Size([5, 1])   only axis 0 -- safer
print(torch.zeros(5).unsqueeze(0).shape)  # torch.Size([1, 5]) add a batch axis

a, b = torch.zeros(3, 1), torch.zeros(1, 4)
print((a + b).shape)                    # torch.Size([3, 4])   both axes stretched

pred, y = torch.zeros(32, 1), torch.zeros(32)
print((pred - y).shape)                 # torch.Size([32, 32]) THE silent bug`,
      annotations: {
        4: 'view() only relabels the shape — zero copy — but the requested shape must be expressible with the existing strides, which in practice means contiguous.',
        7: 'permute returns a VIEW with reordered strides. The bytes never move, which is exactly why the next view() call fails.',
        9: 'The contiguity caveat in one line. Fix it with .contiguous().view(...), which pays for the copy explicitly, or just use .reshape(...).',
        13: 'squeeze() with no argument is a landmine: on a batch that happens to have size 1, the batch axis vanishes and every downstream shape quietly changes. Always name the axis.',
        21: 'Broadcasting aligns from the RIGHT: (32,1) vs (32,) becomes (32,1) vs (1,32) -> (32,32). Your MSE is now the mean over 1024 wrong pairs, no exception is raised, and the model trains on nonsense. Fix: pred.squeeze(1) or y.unsqueeze(1).',
      },
    },
    {
      type: 'note',
      md: 'Shape discipline is a habit, not a talent. Three rules that remove most of the pain: (1) write the expected shape as a comment on every line that changes one — future-you reads comments faster than strides; (2) the moment a loss looks wrong, print shapes before you print values; (3) never let a size-1 axis meet a missing axis, because broadcasting will happily invent a matrix where you wanted a vector.',
    },
    {
      type: 'intuition',
      title: 'Autograd: PyTorch writes down what you did',
      md: `Think of a receipt roll at a till. Every operation on a tensor that requires gradients prints one line. When you call **.backward()**, PyTorch reads the roll bottom to top, applying the chain rule at each line.

- **requires_grad=True** on a tensor means "start printing receipts for anything I touch". Model parameters get it automatically; your data never should.
- The roll is built during the **forward pass**, fresh, every single iteration. That is what "dynamic graph" means — an if statement inside forward just works.
- **.backward()** on a scalar loss walks the roll backwards and writes the result into **.grad** on each leaf tensor.
- Then it throws the roll away. Calling backward twice on the same graph is an error unless you explicitly ask to retain it.
- Critically: it **adds** into .grad. It never overwrites. That one sentence is a whole interview question.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Autograd in twelve lines — every number here is checkable by hand',
      code: `import torch

x = torch.tensor(3.0, requires_grad=True)   # a leaf we want a gradient for

y = x ** 2                  # forward: one node recorded
y.backward()                # dy/dx = 2x
print(x.grad)               # tensor(6.)    <- 2 * 3

y2 = x ** 2                 # a brand new forward pass, a brand new graph
y2.backward()
print(x.grad)               # tensor(12.)   <- 6 + 6, ACCUMULATED, not replaced

x.grad = None               # exactly what optimizer.zero_grad() does for you
y3 = x ** 3
y3.backward()               # dy/dx = 3x^2
print(x.grad)               # tensor(27.)   <- 3 * 9

with torch.no_grad():
    w = x * 2               # runs fine, records nothing
print(w.requires_grad)      # False

d = (x * 2).detach()        # same number, cord to the graph cut
print(d.requires_grad)      # False`,
      annotations: {
        6: '.backward() walks the graph from this scalar back to every leaf, then frees the graph. Calling it twice on the SAME y raises "Trying to backward through the graph a second time" — which is why line 9 builds a fresh one.',
        7: 'Hand-check: y = x squared, so dy/dx = 2x, and at x = 3 that is 6. If you can derive this, you can read any .grad PyTorch ever hands you.',
        11: 'The interview answer lives on this line. .backward() ADDS into .grad. Two backward passes without a clear in between give you their sum: 6 + 6 = 12.',
        13: 'Modern zero_grad() sets .grad to None rather than filling it with zeros — cheaper, and it lets the optimizer skip parameters that received no gradient at all.',
        18: 'no_grad turns off graph recording for a whole block: less memory, faster. Its two uses are inference and hand-written weight updates.',
        22: 'detach() is surgical: one tensor, sharing the same storage, with no history. Use it when a value must leave the graph — logging, storing predictions, or a target that must not be back-propagated into.',
      },
    },
    {
      type: 'math',
      intro: 'Why .grad accumulates, and why that is a feature rather than an oversight.',
      latex: [
        '\\text{after } L_1.\\text{backward()}: \\; p.\\text{grad} = \\frac{\\partial L_1}{\\partial p} \\qquad \\text{after } L_2.\\text{backward()}: \\; p.\\text{grad} = \\frac{\\partial L_1}{\\partial p} + \\frac{\\partial L_2}{\\partial p}',
        '\\nabla_\\theta \\Big( \\tfrac{1}{K} \\textstyle\\sum_{b=1}^{K} L_b \\Big) = \\tfrac{1}{K} \\sum_{b=1}^{K} \\nabla_\\theta L_b \\;\\; \\Rightarrow \\;\\; K \\text{ micro-batches, one step} \\;\\equiv\\; \\text{one batch } K\\times \\text{ bigger}',
        '\\text{A feature when you mean it (gradient accumulation). A silent bug when you forget } \\texttt{zero\\_grad()}.',
      ],
    },
    {
      type: 'intuition',
      title: 'Two ways to stop the recording',
      md: `**torch.no_grad()** is a region: nothing inside it is recorded. **.detach()** is a scalpel: one tensor leaves the graph. You need both, for different reasons.

- no_grad use 1 — **inference and validation**. You are never calling backward, so the graph is pure waste. Wrapping evaluation in no_grad is often the difference between fitting on the GPU and not.
- no_grad use 2 — **manual updates**. Writing *p -= lr * p.grad* by hand must not be recorded into the next graph. Optimizers do exactly this internally.
- detach use — a value must cross *out* of the graph: logging a loss, storing predictions, or building a target you must not back-propagate into (target networks in RL, the generator's output feeding the discriminator in a GAN).
- Third relative: **requires_grad_(False)** on a parameter freezes that weight forever — how you freeze a pretrained backbone.
- Rule of thumb: **no_grad** for a region of code, **detach** for a single tensor, **requires_grad_(False)** for a weight.`,
    },
    {
      type: 'intuition',
      title: 'nn.Module: two methods and one rule',
      md: `A model is a class with **__init__** (what parts do I have) and **forward** (what do I do with them). That is the entire API.

- **__init__**: build the layers and assign them to **self**. That assignment *is* the registration.
- **forward**: the computation. You never call it directly — you call **model(x)**, which runs hooks and then forward.
- **parameters()** returns every tensor registered anywhere in the tree. That generator is what you hand the optimizer.
- The rule: registration happens by *attribute assignment*, not by existing. A layer sitting in a plain Python list is invisible — no parameters, no .to(device), no state_dict.
- Modules nest freely. A block containing blocks containing Linears: parameters() flattens all of it for you.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'A real nn.Module, with the parameter count checked by hand',
      code: `import torch
import torch.nn as nn

class MLP(nn.Module):
    def __init__(self, in_dim=784, hidden=128, n_classes=10):
        super().__init__()                    # ALWAYS first
        self.fc1 = nn.Linear(in_dim, hidden)  # attribute -> registered submodule
        self.act = nn.ReLU()
        self.drop = nn.Dropout(0.2)
        self.fc2 = nn.Linear(hidden, n_classes)

    def forward(self, x):
        x = x.flatten(1)                      # (B, 1, 28, 28) -> (B, 784)
        x = self.drop(self.act(self.fc1(x)))
        return self.fc2(x)                    # LOGITS. no softmax. ever.

model = MLP()
print(sum(p.numel() for p in model.parameters()))   # 101770
print(len(list(model.parameters())))                # 4  (2 weights + 2 biases)
print(model(torch.randn(64, 1, 28, 28)).shape)      # torch.Size([64, 10])`,
      annotations: {
        6: 'super().__init__() sets up the internal registries. Skip it and the very next line raises "cannot assign module before Module.__init__() call".',
        7: 'Assignment is registration. nn.Module overrides __setattr__: assigning a Module or a Parameter to self enrols it in parameters(), .to(device), state_dict() and train()/eval() all at once.',
        12: 'You define forward, but you CALL model(x). Calling model.forward(x) directly skips the hooks that things like profiling and quantization rely on.',
        13: 'flatten(1) keeps the batch axis and folds the rest: 1*28*28 = 784. flatten() with no argument would fuse the batch in too — a classic shape bug.',
        18: 'Count it yourself: fc1 is 128*784 + 128 = 100480, fc2 is 10*128 + 10 = 1290, total 101770. Do this by hand at least once; parameter counting is a standing interview question.',
        19: 'Four tensors, not eight: ReLU and Dropout hold no learnable parameters. They are pure functions wrapped as modules so they can sit in a Sequential and read the train/eval flag.',
      },
    },
    {
      type: 'note',
      md: 'The registration trap, worth a full paragraph because it costs people a day. **self.blocks = [nn.Linear(64, 64) for _ in range(3)]** looks fine and *runs* fine — gradients even flow through it. But a plain Python list is invisible to nn.Module: those three layers appear in no **parameters()** call, so the optimizer never updates them, **.to(device)** never moves them, and **state_dict()** never saves them. Your loss just... stalls. Fix: **nn.ModuleList([...])** when you index them yourself inside forward, or **nn.Sequential(...)** when they always run in order. Same trap with a dict — use **nn.ModuleDict**.',
    },
    {
      type: 'intuition',
      title: 'Dataset says what one sample is; DataLoader does everything else',
      md: `A split of labour that never changes across projects:

- **Dataset** answers two questions: **__len__** (how many samples exist) and **__getitem__(i)** (give me sample i). One sample. It knows nothing about batches.
- **DataLoader** wraps it and owns batching, shuffling, and parallel loading through **num_workers** background processes.
- **shuffle=True** for training — it breaks any ordering baked into your file. Never for a test set whose order you need to line up with ids.
- **num_workers > 0** overlaps data loading with GPU compute. It is the first thing to try when your GPU utilisation sits at 30%.
- **collate_fn** in one line: it decides how a *list of samples* becomes *one batch*. The default stacks them; you override it when samples differ in length and need padding.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Dataset and DataLoader — batch count verified by arithmetic',
      code: `import torch
from torch.utils.data import Dataset, DataLoader

class VectorData(Dataset):
    def __init__(self, X, y):
        self.X = torch.as_tensor(X, dtype=torch.float32)
        self.y = torch.as_tensor(y, dtype=torch.long)   # long: CrossEntropy demands it

    def __len__(self):
        return len(self.y)              # how many samples exist

    def __getitem__(self, i):
        return self.X[i], self.y[i]     # ONE sample. never a batch.

ds = VectorData(torch.randn(1000, 20), torch.randint(0, 10, (1000,)))
loader = DataLoader(ds, batch_size=64, shuffle=True, num_workers=0)

print(len(ds), len(loader))             # 1000 16     ceil(1000 / 64)
xb, yb = next(iter(loader))
print(xb.shape, yb.shape, yb.dtype)     # torch.Size([64, 20]) torch.Size([64]) torch.int64`,
      annotations: {
        7: 'Cast the labels to int64 once, here, at the boundary. Doing it in the training loop means doing it forever and forgetting it somewhere.',
        9: '__len__ tells the sampler how many indices exist. Get it wrong and you either silently drop data or index out of bounds mid-epoch.',
        12: '__getitem__ returns ONE sample; the DataLoader does the batching. That separation is the entire design — it is what lets shuffling, sharding and multiprocessing be someone else\'s problem.',
        16: 'num_workers=N loads batches in N background processes. On Windows and macOS the spawn semantics mean your training code must sit under if __name__ == "__main__" or the workers re-import and re-launch it.',
        18: '16 batches because ceil(1000/64) = 15.625 -> 16, and the last one carries 40 samples. Pass drop_last=True when a ragged final batch would upset BatchNorm.',
        20: 'The default collate_fn stacks samples on a new axis 0: sixty-four tensors of shape (20,) become one (64, 20). Write your own only when samples have different sizes — padding variable-length text is the usual reason.',
      },
    },
    {
      type: 'intuition',
      title: 'The training loop: five lines, in this order',
      md: `Every PyTorch training loop ever written is these five statements, in this order, inside a loop over batches.

1. **opt.zero_grad()** — empty the gradient slots left by the last batch.
2. **logits = model(xb)** — forward pass; the graph gets recorded.
3. **loss = loss_fn(logits, yb)** — collapse everything to one scalar.
4. **loss.backward()** — chain rule backwards; fills **.grad** on every parameter.
5. **opt.step()** — the optimizer reads .grad and moves the weights.

Reorder them and things break *quietly*, not loudly. step() before backward() updates using the previous iteration's gradients (or none at all on iteration one). zero_grad() placed between backward() and step() erases exactly the gradients you just computed, so the step does nothing and the loss is a perfectly flat line with no error anywhere.`,
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'One training step, frame by frame',
        notice: 'Left: the names in your loop. Right: the graph nodes and the .grad slot on each parameter. Step through — the last frame is the bug.',
        leftLabel: 'your loop',
        rightLabel: 'graph & .grad',
        frames: [
          {
            note: 'A batch arrives and is moved to the same device as the model. Nothing is recorded yet — the parameters are just sitting there.',
            stack: [
              { name: 'xb', value: '(64,784)' },
              { name: 'yb', value: '(64,) i64' },
            ],
            heap: [
              { id: 'w1', value: 'fc1.weight (128,784)', label: 'param' },
              { id: 'w2', value: 'fc2.weight (10,128)', label: 'param' },
            ],
          },
          {
            note: 'opt.zero_grad() — every parameter\'s .grad slot is emptied. This happens BEFORE the forward pass, once per batch.',
            stack: [
              { name: 'xb', value: '(64,784)' },
              { name: 'yb', value: '(64,) i64' },
            ],
            heap: [
              { id: 'w1', value: 'fc1.grad = None', label: 'cleared' },
              { id: 'w2', value: 'fc2.grad = None', label: 'cleared' },
            ],
          },
          {
            note: 'logits = model(xb) — the forward pass. Each operation appends a node to a graph that is built fresh, for this batch only.',
            stack: [
              { name: 'xb', value: '(64,784)' },
              { name: 'h', to: 'n1' },
              { name: 'logits', to: 'n2' },
            ],
            heap: [
              { id: 'n1', value: 'ReluBackward', label: '(64,128)' },
              { id: 'n2', value: 'AddmmBackward', label: '(64,10)' },
            ],
          },
          {
            note: 'loss = loss_fn(logits, yb) — one scalar. It is the root of the graph, and backward() has to start from a scalar.',
            stack: [
              { name: 'logits', to: 'n2' },
              { name: 'loss', to: 'n3' },
            ],
            heap: [
              { id: 'n2', value: 'AddmmBackward', label: '(64,10)' },
              { id: 'n3', value: 'NllLossBackward', label: 'scalar root' },
            ],
          },
          {
            note: 'loss.backward() — the chain rule runs back through the graph and ADDS into every parameter .grad. Then the graph is freed.',
            stack: [{ name: 'loss', to: 'n3' }],
            heap: [
              { id: 'n3', value: 'NllLossBackward', label: 'root' },
              { id: 'w1', value: 'fc1.grad = g1', label: 'filled' },
              { id: 'w2', value: 'fc2.grad = g2', label: 'filled' },
            ],
          },
          {
            note: 'opt.step() — the optimizer reads .grad and updates the weights in place. Notice the gradients are still sitting in their slots.',
            stack: [{ name: 'lr', value: '1e-3' }],
            heap: [
              { id: 'w1', value: 'fc1.weight updated', label: 'param' },
              { id: 'w2', value: 'fc2.weight updated', label: 'param' },
              { id: 'g1', value: 'grads still g1, g2', label: 'stale' },
            ],
          },
          {
            note: 'Batch 2 begins with opt.zero_grad() — the stale gradients are cleared and the cycle repeats cleanly. This is the healthy loop.',
            stack: [{ name: 'batch', value: '#2' }],
            heap: [
              { id: 'w1', value: 'fc1.grad = None', label: 'cleared' },
              { id: 'w2', value: 'fc2.grad = None', label: 'cleared' },
            ],
          },
          {
            note: 'DANGER — zero_grad() skipped. Batch 2 ADDS onto batch 1, so step() moves the weights using g1 + g2: an effective batch you never asked for, half of it computed at weights that no longer exist. Nothing raises.',
            stack: [{ name: 'batch #2 grads', to: 'gsum', danger: true }],
            heap: [{ id: 'gsum', value: 'fc1.grad = g1 + g2', label: 'bug' }],
          },
        ],
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The canonical loop, annotated line by line (uses the MLP and loaders above)',
      code: `import torch
import torch.nn as nn

device = 'cuda' if torch.cuda.is_available() else 'cpu'
model = MLP().to(device)                        # model onto the device (in place)
loss_fn = nn.CrossEntropyLoss()                 # takes LOGITS + int64 targets
opt = torch.optim.Adam(model.parameters(), lr=1e-3)

for epoch in range(10):
    model.train()                               # dropout ON, batchnorm updates stats
    running = 0.0
    for xb, yb in train_loader:
        xb, yb = xb.to(device), yb.to(device)   # data onto the SAME device (reassign!)

        opt.zero_grad()                         # 1. clear last batch's gradients
        logits = model(xb)                      # 2. forward -- the graph is built here
        loss = loss_fn(logits, yb)              # 3. one scalar, the root of that graph
        loss.backward()                         # 4. chain rule -> fills p.grad for each p
        opt.step()                              # 5. optimizer reads p.grad, updates p

        running += loss.item() * xb.size(0)     # .item() -> a float, no graph kept alive
    train_loss = running / len(train_loader.dataset)

    model.eval()                                # dropout OFF, batchnorm uses running stats
    correct, total_loss = 0, 0.0
    with torch.no_grad():                       # no graph: less memory, faster
        for xb, yb in val_loader:
            xb, yb = xb.to(device), yb.to(device)
            logits = model(xb)
            total_loss += loss_fn(logits, yb).item() * xb.size(0)
            correct += (logits.argmax(1) == yb).sum().item()
    n = len(val_loader.dataset)
    print(epoch, round(train_loss, 4), round(total_loss / n, 4), correct / n)

torch.save(model.state_dict(), 'mlp.pt')        # weights only, not the class

fresh = MLP().to(device)                        # you rebuild the architecture yourself
fresh.load_state_dict(torch.load('mlp.pt', map_location=device))
fresh.eval()                                    # eval mode BEFORE inference. always.`,
      annotations: {
        5: 'model.to(device) moves parameters in place and returns self. Tensors are the opposite: x.to(device) returns a copy you must reassign — see line 13.',
        6: 'Build the loss and the optimizer ONCE, outside the epoch loop. Recreating Adam every epoch throws away its momentum buffers and quietly hurts convergence.',
        7: 'model.parameters() is the generator nn.Module assembled from your attribute assignments. A layer that was never registered is not in here, and the optimizer will never touch it.',
        10: 'model.train() flips a boolean on every submodule. Dropout resumes zeroing units; BatchNorm goes back to batch statistics and keeps updating its running averages.',
        15: 'THE line people forget. Gradients accumulate, so without this the step uses this batch plus every batch before it. Deliberately skipping it for K batches and stepping once is gradient accumulation — a big effective batch on a small GPU.',
        16: 'The graph is rebuilt here on every single iteration. That is what dynamic means: an if or a loop inside forward is just Python, and it works.',
        17: 'Pass raw logits. CrossEntropyLoss applies log_softmax internally; a softmax of your own here is the single most common silent bug in PyTorch.',
        18: 'backward() must be called on a SCALAR. If yours is a vector, you forgot a reduction — the loss needs a .mean() or a .sum().',
        19: 'Order is load-bearing. step() before backward() uses stale or absent gradients; zero_grad() between backward() and step() erases what you just computed and the step becomes a no-op.',
        21: 'loss.item() pulls out a Python float and drops the reference to the graph. Writing running += loss instead keeps every batch graph alive — the classic slow memory leak that OOMs at epoch 3, not epoch 1.',
        24: 'Forgetting eval() makes validation look worse than it is: dropout is still deleting units at random, and BatchNorm is polluting its running statistics with validation data.',
        26: 'eval() and no_grad() are independent and you want BOTH. eval() changes layer behaviour; no_grad() stops graph recording. Neither implies the other.',
        31: 'argmax(1) over the class axis gives predicted labels of shape (B,). Comparing with yb gives booleans, .sum().item() gives a plain int you can add up safely.',
        35: 'state_dict is a plain dict of named tensors. Pickling the whole model instead hard-codes your class path — and torch.load now defaults to weights_only=True, which refuses arbitrary pickles outright.',
        38: 'map_location=device loads a GPU-saved checkpoint onto whatever machine you are on now. Without it, loading a cuda checkpoint on a CPU-only box raises.',
      },
    },
    {
      type: 'intuition',
      title: 'model.train() vs model.eval(): what actually changes',
      md: `They flip one boolean, **self.training**, on every module in the tree. Exactly two standard layers read it.

- **Dropout** — train: zeroes a random fraction p of activations and scales the survivors by 1/(1−p). Eval: the identity function. No dropping, no scaling.
- **BatchNorm** — train: normalizes using *this batch's* mean and variance, and updates its running averages. Eval: uses those frozen running statistics, so one prediction no longer depends on which other samples happened to share its batch.
- Everything else — Linear, Conv, ReLU, embeddings — ignores the flag completely.
- Forgetting **eval()** makes validation noisy and pessimistic, and leaks validation data into BatchNorm's statistics.
- Forgetting to switch **back to train()** after validating is the quieter bug: dropout stays off for the rest of training and you silently lose your regularization.

(The dropout module and the BatchNorm-vs-LayerNorm module in this level explain *why* each layer behaves differently. Here you only need the switch — and the discipline to flip it both ways.)`,
    },
    {
      type: 'intuition',
      title: 'The most expensive silent bug: softmax before CrossEntropyLoss',
      md: `**nn.CrossEntropyLoss** already applies log_softmax inside. It wants the raw, unnormalized scores your last Linear produced — logits. Hand it your own softmax output and it softmaxes an already-softmaxed vector.

- Nothing crashes. Shapes are right, dtypes are right, the loss is a plausible-looking number.
- The double softmax flattens the distribution toward uniform, so gradients shrink and the model learns slowly and badly — you blame the learning rate for a week.
- Why the loss fuses the two steps: computing log(softmax(z)) naively overflows for large z and underflows to log(0) = −inf for small probabilities. Fused log_softmax uses the log-sum-exp trick and stays finite.
- Rule: **your model returns logits.** Softmax belongs in inference code, or nowhere — argmax of logits equals argmax of softmax, so for prediction you never need it.
- Sanity check to memorize: an untrained C-class classifier should start near a loss of log(C). Ten classes is about 2.303. Start far above that and something upstream is already wrong.`,
    },
    {
      type: 'math',
      intro: 'Cross-entropy on logits, and the gradient that makes the fusion worth it.',
      latex: [
        'p_j = \\text{softmax}(z)_j = \\frac{e^{z_j}}{\\sum_{k=1}^{C} e^{z_k}} \\qquad \\text{CE}(z, y) = -\\log p_y = \\log\\Big( \\sum_k e^{z_k} \\Big) - z_y',
        '\\frac{\\partial \\, \\text{CE}}{\\partial z_j} = p_j - \\delta_{jy} \\qquad \\text{predicted probability minus truth — clean only w.r.t. LOGITS}',
        '\\text{Untrained: } z \\approx 0 \\Rightarrow p_j \\approx \\tfrac{1}{C} \\Rightarrow \\text{CE} \\approx \\log C, \\quad C = 10 \\Rightarrow \\log 10 \\approx 2.303',
      ],
    },
    {
      type: 'note',
      md: 'Moving to the GPU is two moves and **both are required**. **model.to(device)** moves the parameters in place, so the bare call is enough. **xb = xb.to(device)** moves data and is NOT in place, so it must be reassigned or nothing happens. Do the data move inside the batch loop — you want one batch resident on the GPU, not the whole dataset. Two more sources of the device error: creating a tensor inside forward with **torch.zeros(...)** and no *device=* argument (use *device=x.device*), and storing a constant as a plain attribute instead of **register_buffer**, so .to() skips it. Define **device** once at the top and route everything through that one variable; the same script then runs on your laptop and on the cluster.',
    },
    {
      type: 'note',
      md: 'Save the **state_dict** — a plain dict mapping parameter names to tensors — never the model object. Pickling the object stores a reference to your class, its module path, and your file layout: rename a file, move the class, or upgrade PyTorch, and the checkpoint stops loading. A state_dict is just numbers, so you rebuild the architecture in code (which you have anyway) and pour the weights in. Recent PyTorch made this the default position — **torch.load** now runs with **weights_only=True**, refusing arbitrary pickled objects. For *resuming* training rather than serving, save a dict holding the model state_dict, the optimizer state_dict (Adam carries momentum buffers you do not want to lose), and the epoch number.',
    },
    {
      type: 'note',
      md: 'The checklist to run before you theorize. **Loss flat from step 0**: learning rate (try 10× up and 10× down), a missing opt.step() or a zero_grad() sitting between backward() and step(), the wrong loss for the task (MSE on a classification problem), or labels misaligned with inputs. **Loss becomes NaN**: learning rate too high so weights explode, a log of zero from a hand-rolled softmax-then-log, or a divide by a zero standard deviation in your own normalization. **CUDA out of memory**: cut the batch size, wrap eval in torch.no_grad(), accumulate loss.item() instead of the loss tensor, then try mixed precision. And the one test that beats all of them: **overfit a single batch on purpose**. A correct setup drives one batch to near-zero loss in a few hundred steps. If it cannot, the bug is in your model, loss, or label alignment — stop looking at the data pipeline.',
    },
  ],
  quiz: [
    {
      question: 'Why must you call optimizer.zero_grad() every iteration?',
      options: [
        {
          text: 'It resets the optimizer state (Adam momentum) between batches',
          explanation: 'No. zero_grad only clears .grad on the parameters. Adam momentum lives in the optimizer state and is supposed to persist — resetting it every batch would destroy Adam.',
        },
        {
          text: 'Because .backward() ADDS into .grad, so without a clear this step uses the sum of every previous batch',
          explanation: 'Correct. Accumulation is the default. It is a feature when deliberate (gradient accumulation for a large effective batch) and a silent bug when forgotten.',
        },
        {
          text: 'It frees the computation graph so memory does not leak',
          explanation: 'The graph is freed by .backward() itself. zero_grad touches only the .grad tensors, not the graph.',
        },
      ],
      correct: 1,
    },
    {
      question: 'x = torch.arange(24).reshape(2,3,4); xt = x.permute(0,2,1). Then xt.view(2,12) raises a RuntimeError. Why?',
      options: [
        {
          text: 'permute returns a copy, and you cannot take a view of a copy',
          explanation: 'Backwards — permute returns a VIEW with reordered strides and copies nothing. That is precisely the problem.',
        },
        {
          text: 'The element counts do not match',
          explanation: '2*4*3 = 24 = 2*12. The count is fine; it is the memory layout that is not.',
        },
        {
          text: 'permute leaves the tensor non-contiguous and view() needs contiguous memory — use .reshape(2,12) or .contiguous().view(2,12)',
          explanation: 'Correct. view only relabels an existing contiguous block; reshape falls back to a copy when it has to.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Your model ends with self.fc(x) followed by torch.softmax(...), and you train with nn.CrossEntropyLoss. What happens?',
      options: [
        {
          text: 'Nothing crashes — the loss softmaxes an already-softmaxed vector, flattening the distribution and shrinking gradients, so the model trains badly and silently',
          explanation: 'Correct. This is the most common silent bug in PyTorch. CrossEntropyLoss applies log_softmax internally; feed it raw logits.',
        },
        {
          text: 'It raises a shape error',
          explanation: 'Softmax preserves the shape, so nothing raises. That is exactly what makes this bug expensive.',
        },
        {
          text: 'Nothing at all — softmax is idempotent',
          explanation: 'It is not. softmax(softmax(z)) is a different, flatter distribution than softmax(z).',
        },
      ],
      correct: 0,
    },
    {
      question: 'model.eval() changes the behaviour of which layers?',
      options: [
        {
          text: 'All of them — every module switches to inference math',
          explanation: 'Linear, Conv and ReLU behave identically in both modes. Only layers that read self.training change anything.',
        },
        {
          text: 'Dropout (stops dropping) and BatchNorm (uses frozen running statistics instead of batch statistics)',
          explanation: 'Correct — those two, plus any custom module of yours that reads self.training. Nothing else.',
        },
        {
          text: 'None — eval() only disables gradient tracking',
          explanation: 'That is torch.no_grad(), a separate mechanism. eval() does not touch autograd at all, which is why you need both.',
        },
      ],
      correct: 1,
    },
    {
      question: 'You write self.blocks = [nn.Linear(64,64) for _ in range(3)] in __init__, call them in forward, and train. The loss barely moves. Why?',
      options: [
        {
          text: 'The three blocks share weights, so the model has too little capacity',
          explanation: 'They are three independent Linear objects with separate weights. Weight sharing is not happening here.',
        },
        {
          text: 'A Python list breaks the computation graph, so gradients cannot flow through it',
          explanation: 'Gradients flow through them fine — autograd tracks operations on tensors and does not care where the module object is stored.',
        },
        {
          text: 'A plain list is not registered, so those parameters never appear in model.parameters() and the optimizer never updates them',
          explanation: 'Correct — and .to(device) skips them and state_dict() omits them too. Use nn.ModuleList when you index them yourself, nn.Sequential when they always run in order.',
        },
      ],
      correct: 2,
    },
    {
      question: 'During validation you call model.eval() but forget torch.no_grad(). What is the consequence?',
      options: [
        {
          text: 'Results are correct, but a graph is built for every batch — wasted memory and time, and a likely CUDA OOM on large batches',
          explanation: 'Correct. eval() and no_grad() are independent: eval fixes layer behaviour, no_grad stops graph recording. You want both.',
        },
        {
          text: 'Dropout stays active, so accuracy is understated',
          explanation: 'model.eval() already fixed dropout. no_grad has nothing to do with layer behaviour.',
        },
        {
          text: 'The model weights get updated during validation',
          explanation: 'Weights only change when you call opt.step(). Recording a graph updates nothing by itself.',
        },
      ],
      correct: 0,
    },
    {
      question: 'x = torch.tensor(3.0, requires_grad=True). You run y = x**2; y.backward(), then y2 = x**2; y2.backward(). What does x.grad hold?',
      options: [
        {
          text: 'tensor(6.) — the second backward overwrites the first',
          explanation: 'Overwriting is what everyone assumes, and it is wrong. .grad is accumulated into, never replaced.',
        },
        {
          text: 'tensor(12.) — dy/dx = 2x = 6 computed twice and summed',
          explanation: 'Correct. Each backward contributes 6, and the second one adds: 6 + 6 = 12. This is why zero_grad exists.',
        },
        {
          text: 'An error — you cannot call backward twice',
          explanation: 'You cannot call backward twice on the SAME graph, but y2 = x**2 is a fresh forward pass building a brand new graph, so this runs fine.',
        },
      ],
      correct: 1,
    },
    {
      question: 'Why is torch.save(model.state_dict(), path) preferred over torch.save(model, path)?',
      options: [
        {
          text: 'state_dict files are much smaller',
          explanation: 'They hold the same tensors; the size difference is negligible. Portability, not size, is the point.',
        },
        {
          text: 'Only a state_dict can be loaded onto a different device',
          explanation: 'map_location handles the device on both paths. Not the reason.',
        },
        {
          text: 'Pickling the model stores a reference to your class and module path, so a rename or a PyTorch upgrade can break the checkpoint; a state_dict is just named tensors',
          explanation: 'Correct. It is also a security position — torch.load now defaults to weights_only=True and refuses arbitrary pickles.',
        },
      ],
      correct: 2,
    },
  ],
  interviewQuestions: [
    {
      question: 'Why does PyTorch accumulate gradients instead of overwriting them?',
      answer:
        'Because a single optimizer step can legitimately be assembled from several backward passes, and PyTorch has no way to know whether your next .backward() starts a new batch or adds another piece to the current one. So it takes the composable choice: .grad += the new gradient. That makes gradient accumulation trivial — run K micro-batches, backward on each with the loss scaled by 1/K, then step once, and you get the gradient of a K-times-larger batch on a GPU that could never hold it. It also makes multi-loss and multi-task setups natural. The price is that forgetting opt.zero_grad() is a silent bug rather than an exception: the model still trains, just on a growing sum that includes gradients computed at weights which no longer exist. Named tradeoff: explicitness over convenience — PyTorch made clearing your job.',
      isCaseBased: false,
    },
    {
      question: 'Walk me through a training loop and tell me what breaks if I swap two of the lines.',
      answer:
        'zero_grad, forward, loss, backward, step. zero_grad first, because backward adds into .grad and the last batch numbers are still sitting there. Forward builds the graph fresh. The loss must be a scalar or backward has nothing to seed the chain rule with. backward fills p.grad for every parameter with requires_grad=True, then frees the graph. step reads those .grad tensors and applies the update rule. The swaps: step() before backward() updates with the previous iteration gradients — and on iteration one, with None, which Adam silently skips, so nothing happens at all. zero_grad() between backward() and step() erases exactly what you computed, so the step is a no-op and you get a perfectly flat loss curve with no error. backward() twice without a fresh forward raises "Trying to backward through the graph a second time". The interviewer is checking whether you know these fail quietly.',
      isCaseBased: false,
    },
    {
      question: 'Case: a teammate\'s model shows a loss that is exactly flat from step 0. Nothing errors. Give your debugging order.',
      answer:
        'Order by cost. (1) Is opt.step() actually called, and is zero_grad() sitting between backward() and step()? Both produce a perfect flat line. (2) Right after backward, print p.grad for a couple of parameters: all None means those parameters are not in the optimizer — the plain-Python-list registration trap, or an optimizer built from a different model object; all zeros means the signal died upstream (a dead ReLU block, or a detach left in forward). (3) Learning rate: 1e-8 is indistinguishable from broken, so try 10× up. (4) The loss itself: MSE on class indices, or a softmax before CrossEntropyLoss, both give a plausible near-constant number. (5) Label alignment: shuffle the labels and confirm the loss gets WORSE — if it does not, the model never saw them. Then the test that beats all of the above: overfit one single batch on purpose. A correct setup drives it to near-zero in a few hundred steps; if it cannot, the bug is in the model, the loss, or the labels — not the data pipeline.',
      isCaseBased: true,
    },
    {
      question: 'view versus reshape — when does the difference actually matter?',
      answer:
        'view() returns a tensor sharing the same storage with a different shape — O(1), no copy — but the requested shape must be expressible with the existing strides, which in practice means contiguous memory. reshape() tries view first and falls back to a copy. So: view when you want a guarantee of no copy and a loud error if the layout is wrong (performance-critical code, where a silent copy in an inner loop is the bug); reshape as the safe default everywhere else. The classic trip-up is that permute and transpose return non-contiguous views, so the next view() raises. Fix with .contiguous().view(...), which pays for the copy explicitly, or just .reshape(...). Worth adding: .contiguous() on an already-contiguous tensor is a no-op, so it is cheap as a defensive call.',
      isCaseBased: false,
    },
    {
      question: 'Case: a model scores 92% during training-time evaluation but 71% when reloaded from its checkpoint in the serving script. Same weights. What do you check?',
      answer:
        'Same weights, different answer, so something outside the weights differs. Ranked: (1) model.eval() not called in the serving path — dropout is still active and BatchNorm is normalizing by whatever happens to be in the request batch; at batch size 1 BatchNorm output is degenerate. (2) Preprocessing drift: training normalized with a mean/std, resized, or tokenized in a way serving does not replicate. (3) load_state_dict called with strict=False and the returned missing_keys ignored — half the model is still randomly initialized. (4) Output handling: training-time eval took argmax over logits while serving applies softmax and a threshold, or applies softmax twice. (5) Device/dtype: fp16 at serving, or a different device changing kernels — usually worth fractions of a point, not twenty. Test that splits the space in one shot: run the serving code end to end on the exact training validation set. If the number matches, the bug is in the input pipeline; if it does not, it is in load or eval mode.',
      isCaseBased: true,
    },
    {
      question: 'What exactly does model.to(device) do, and why do people still hit the device error?',
      answer:
        'It walks the module tree and moves every registered parameter and buffer to the device, in place, returning self. Tensors behave oppositely: x.to(device) returns a NEW tensor and leaves x alone, so a bare x.to(device) statement does nothing — that asymmetry causes most "Expected all tensors to be on the same device" errors. The other sources: creating a tensor inside forward with torch.zeros(...) and no device= argument (use device=x.device); storing a constant as a plain attribute instead of via register_buffer, so .to() never sees it; and reassigning model = model.to(device) after building the optimizer from a different object. Fix pattern: one device variable defined once, model.to(device) at setup, xb = xb.to(device) inside the batch loop, and device=x.device on anything you construct in forward.',
      isCaseBased: false,
    },
    {
      question: 'Explain torch.no_grad(), .detach(), and requires_grad_(False). When do you reach for each?',
      answer:
        'Three different scopes. torch.no_grad() is a context manager: nothing inside it records to the graph — use it for whole regions, namely validation, inference, and hand-written parameter updates. .detach() acts on one tensor: it returns a tensor sharing the same storage with no grad_fn, so the graph stops there — use it when a value must leave the graph, for logging, for storing predictions, or for a target that must not be back-propagated into (RL target networks, the generator output fed to a GAN discriminator). requires_grad_(False) acts on a parameter: never compute a gradient for this weight, which is how you freeze a pretrained backbone. Tradeoff worth naming: freezing this way still runs backward THROUGH those layers if anything downstream needs gradients — it only stops the accumulation. To skip the computation entirely the frozen part must be at the front, and you detach its output.',
      isCaseBased: false,
    },
    {
      question: 'Why does nn.CrossEntropyLoss want logits rather than probabilities? Give the numerical reason, not just the rule.',
      answer:
        'Two reasons. Numerically: computing log(softmax(z)) in two steps overflows for large z and underflows to log(0) = −inf for small probabilities. Fused log_softmax applies the log-sum-exp identity, subtracting max(z) first, and stays finite for any input. Gradient-wise: the derivative of cross-entropy with respect to the LOGITS is exactly softmax(z) − onehot(y) — bounded, cheap, and it does not vanish when the model is confidently wrong. Route it through your own softmax first and you insert an extra Jacobian that squashes the signal, so the model trains slowly with no error to explain why. Practical rule: the model returns logits, always; if you need probabilities at inference, softmax there. Sanity check to say out loud: an untrained C-class model should report a loss near log(C) — about 2.3 for ten classes.',
      isCaseBased: false,
    },
    {
      question: 'Case: training runs fine for two epochs, then dies with CUDA out of memory at epoch 3. What is going on?',
      answer:
        'OOM that arrives later means something grows. In order: (1) accumulating the loss TENSOR instead of loss.item() — each batch keeps its whole graph alive and memory rises monotonically; the same applies to appending model outputs to a list without .detach(). (2) Validation without torch.no_grad() — the peak lands during eval and only after a few epochs does fragmentation make it fatal. (3) Variable-length inputs where a rare long batch spikes the peak: bucket or cap by length. (4) Genuine allocator fragmentation from constantly varying shapes — expandable_segments in PYTORCH_CUDA_ALLOC_CONF helps. (5) Something genuinely per-epoch, like a growing list kept for logging. Diagnosis: print torch.cuda.memory_allocated() at the end of each epoch. Rising epoch over epoch is a reference leak; flat allocated with a fatal peak is a batch-size or eval-mode problem. Fix the leak, do not just lower the batch size.',
      isCaseBased: true,
    },
    {
      question: 'How would you implement gradient accumulation, and what do you have to be careful about?',
      answer:
        'Run K micro-batches, backward on each, step once every K. Two care points. Scale: divide each micro-batch loss by K so the accumulated gradient equals the MEAN over the big batch rather than the sum — skip this and your effective learning rate is K times larger than you think. Hygiene: zero_grad only right after step (not per micro-batch), and step your LR scheduler per optimizer step, not per micro-batch, or the schedule runs K times too fast. Caveats an interviewer wants: BatchNorm still normalizes over the SMALL per-device batch, so accumulation is not equivalent to a genuinely larger batch for BatchNorm models — that is one reason GroupNorm and LayerNorm are preferred at tiny per-device batch sizes. And under DistributedDataParallel you must wrap the non-stepping micro-batches in model.no_sync(), otherwise you pay a full gradient all-reduce K times for one step.',
      isCaseBased: false,
    },
    {
      question: 'What is a "dynamic computation graph" and what does it buy you over a static one?',
      answer:
        'Dynamic means the graph is constructed by running the forward pass, from scratch, every iteration. Consequences: Python control flow is just Python — an if on a tensor value, a while loop whose length depends on the input, a different path per sample, all with no special API. Debugging is normal debugging: print a tensor, set a breakpoint, read a stack trace that points at your line. The cost is that the framework cannot see the whole computation ahead of time, so it cannot fuse kernels or optimize globally — which is exactly what static graphs bought and what torch.compile now recovers by tracing and compiling the graph it observes. Interview framing: PyTorch traded ahead-of-time optimization for developer velocity, won the research community, then closed most of the performance gap with compilation.',
      isCaseBased: false,
    },
    {
      question: 'What does DataLoader\'s num_workers actually do, and when does raising it stop helping?',
      answer:
        'num_workers=N spawns N subprocesses that each build complete batches — reading files, decoding, running your __getitem__, then collating — while the main process keeps the GPU busy. It turns data loading from a serial blocker into an overlapping pipeline. It stops helping when the GPU is already the bottleneck (utilisation pinned near 100%), when you are disk-bound rather than CPU-bound, or when worker startup dominates because epochs are short — persistent_workers=True fixes that last case. Costs to name: each worker gets its own copy of the dataset object, so a big in-memory array is duplicated N times, and datasets holding open file handles or CUDA tensors break under forking. On Windows and macOS the spawn semantics require the entry point under if __name__ == "__main__". Companion flags: pin_memory=True for faster host-to-GPU transfers, prefetch_factor for how far ahead each worker runs.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'A tensor vs a NumPy array', back: 'Same grid of numbers, plus two things: it can live on a GPU, and it records how it was made so autograd can differentiate it.' },
    { front: 'The five steps of a training loop, in order', back: 'zero_grad → forward → loss → backward → step. Reorder them and it breaks silently, not loudly.' },
    { front: 'Why optimizer.zero_grad()', back: '.backward() ADDS into .grad, never overwrites. Skip the clear and you step on the sum of every batch so far.' },
    { front: 'view vs reshape', back: 'view: no copy, needs contiguous memory, raises after permute/transpose. reshape: view if it can, copy if it must. Safe default is reshape.' },
    { front: 'The broadcasting trap', back: 'Shapes align from the RIGHT. pred (32,1) minus target (32,) gives (32,32) with no error — the loss is silently wrong. Fix with squeeze(1) or unsqueeze(1).' },
    { front: 'model.train() vs model.eval()', back: 'Only Dropout (dropping on/off) and BatchNorm (batch stats vs frozen running stats) change. Linear, Conv and ReLU ignore the flag.' },
    { front: 'no_grad vs detach vs requires_grad_(False)', back: 'no_grad: a whole region records nothing. detach: one tensor leaves the graph. requires_grad_(False): freeze a weight permanently.' },
    { front: 'The layer registration rule', back: 'Assigning a module to self registers it. A plain Python list does not — use nn.ModuleList / nn.Sequential / nn.ModuleDict, or the optimizer never sees those weights.' },
    { front: 'What nn.CrossEntropyLoss expects', back: 'Raw LOGITS and int64 targets. It applies log_softmax internally, so your own softmax first is a silent double softmax. Untrained loss should sit near log(C).' },
    { front: 'Save the state_dict, not the model', back: 'A state_dict is just named tensors — portable. A pickled model hard-codes your class path and breaks on refactor or upgrade (and torch.load now defaults to weights_only=True).' },
  ],
  mindmapMarkdown: `- PyTorch: Tensors, Autograd & the Training Loop
  - Tensor
    - NumPy array + GPU + history
    - check shape / dtype / device (float32 data, int64 labels)
    - model.to() in place, x.to() returns a copy
  - Shapes
    - view: no copy, needs contiguous; reshape: copies if it must
    - permute reorders axes, breaks contiguity
    - squeeze / unsqueeze size-1 axes
    - broadcasting aligns right: (32,1) − (32,) = (32,32), silent
  - Autograd
    - requires_grad marks the leaves
    - graph rebuilt fresh each forward (dynamic)
    - backward() fills .grad, then frees the graph
    - .grad ACCUMULATES → zero_grad() (a feature when deliberate)
    - no_grad() a region, detach() one tensor
  - nn.Module
    - __init__ builds, forward computes; you call model(x)
    - assignment = registration
    - plain list is invisible → nn.ModuleList
    - parameters() feeds the optimizer
  - Data
    - Dataset: __len__ + __getitem__, one sample
    - DataLoader: batching, shuffle, num_workers
    - collate_fn turns a list into a batch
  - Training loop
    - zero_grad → forward → loss → backward → step
    - train() vs eval(): dropout + batchnorm only
    - validate inside eval() AND no_grad()
    - CrossEntropyLoss takes LOGITS (≈ log C at init)
    - save state_dict, not the pickled model
  - Debugging
    - flat loss: LR, zero_grad, wrong loss, labels
    - NaN: LR too high, or log(0)
    - OOM: batch size, no_grad, loss.item()
    - smoke test: overfit one batch`,
}

export default m
