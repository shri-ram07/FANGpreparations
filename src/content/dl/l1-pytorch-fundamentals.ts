import type { Module } from '../types'

const m: Module = {
  id: 'dl-l1-pytorch-fundamentals',
  subjectId: 'dl',
  level: 1,
  title: 'PyTorch: Tensors, Autograd and the Training Loop',
  whyItMatters:
    'The PyTorch training loop is five lines that never change, and every one of them exists because of something that goes wrong without it. Learning the five lines is learning what the framework is actually doing.',
  assumes: [
    'You have read *Backpropagation*, so you know what a computation graph is',
    'You have seen NumPy arrays',
  ],
  estMinutes: 20,
  sections: [
    {
      type: 'intuition',
      title: 'A tensor is an array that remembers',
      md: `A **tensor** is a NumPy array with two additions: it can live on a GPU, and it can record what was done to it.

That second part is the whole framework. Setting \`requires_grad=True\` tells PyTorch to build a graph as operations run — each result carries a \`grad_fn\` pointing back at the operation that produced it — and \`.backward()\` walks that graph in reverse.

So autograd does not read your source code. It records the operations that actually executed, which is why control flow can differ between iterations, and why anything that leaves tensor-land is invisible to it.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The training loop, written out by hand',
      code: `import numpy as np
np.random.seed(0)
X = np.random.randn(200, 3)
y = X @ np.array([2.0, -1.0, 0.5]) + 0.3 + 0.1 * np.random.randn(200)

w, b, lr = np.zeros(3), 0.0, 0.1
for epoch in range(1, 41):
    pred = X @ w + b                       # forward
    loss = ((pred - y) ** 2).mean()        # loss
    gw = 2 * X.T @ (pred - y) / len(y)     # backward, by hand
    gb = 2 * (pred - y).mean()
    w -= lr * gw;  b -= lr * gb            # step
    if epoch in (1, 10, 20, 40):
        print('epoch %2d  loss %.4f  w %s  b %.3f' % (epoch, loss, np.round(w, 3).tolist(), b))

# ---- real output ----
# epoch  1  loss 5.9130  w [0.435, -0.229, 0.123]  b 0.059
# epoch 10  loss 0.0768  w [1.828, -0.936, 0.469]  b 0.260
# epoch 20  loss 0.0097  w [1.987, -1.008, 0.492]  b 0.284
# epoch 40  loss 0.0092  w [2.002, -1.014, 0.492]  b 0.285`,
      annotations: {
        9: 'The gradient of the mean squared error, derived once and written out. This is the line PyTorch replaces with loss.backward() — everything else in the loop stays exactly as it is.',
        19: 'The loss stops falling after epoch 20 (0.0097 to 0.0092) and the weights land on [2.002, −1.014, 0.492] against a truth of [2.0, −1.0, 0.5]. The remaining error is the 0.1 noise added to y, not an optimisation failure.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The same loop in PyTorch',
      code: `import torch

X = torch.randn(200, 3)
y = X @ torch.tensor([2.0, -1.0, 0.5]) + 0.3 + 0.1 * torch.randn(200)

model = torch.nn.Linear(3, 1)
opt = torch.optim.SGD(model.parameters(), lr=0.1)
lossfn = torch.nn.MSELoss()

for epoch in range(40):
    opt.zero_grad()                      # 1. clear last step's gradients
    pred = model(X).squeeze()            # 2. forward
    loss = lossfn(pred, y)               # 3. loss
    loss.backward()                      # 4. backward
    opt.step()                           # 5. update`,
      annotations: {
        6: 'nn.Linear(3, 1) creates the weight and bias for you, initialised with the fan-in rule, and registers them so model.parameters() can find them. Anything assigned to self in an nn.Module is registered the same way.',
        11: 'zero_grad FIRST. PyTorch ACCUMULATES gradients into .grad rather than overwriting them, so without this every step uses the sum of all gradients so far.',
        13: 'loss.backward() replaces the two hand-derived gradient lines above. It walks the recorded graph and deposits a gradient into every leaf tensor with requires_grad.',
        14: 'opt.step() applies the update using whatever is in .grad. It does not compute anything — backward and step are separate on purpose, which is what makes gradient accumulation and clipping possible between them.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'What forgetting zero_grad actually does',
      code: `w, acc = np.zeros(3), np.zeros(3)
for epoch in range(1, 6):
    pred = X @ w
    acc = acc + 2 * X.T @ (pred - y) / len(y)     # never cleared
    w -= 0.1 * acc
    print('epoch %d  accumulated grad norm %.4f  w %s'
          % (epoch, np.linalg.norm(acc), np.round(w, 3).tolist()))

# ---- real output ----
# epoch 1  accumulated grad norm 5.0682  w [0.435, -0.229, 0.123]
# epoch 2  accumulated grad norm 9.0164  w [1.212, -0.634, 0.336]
# epoch 3  accumulated grad norm 10.9736  w [2.16, -1.127, 0.584]
# epoch 4  accumulated grad norm 10.5120  w [3.075, -1.597, 0.802]
# epoch 5  accumulated grad norm 7.7449  w [3.759, -1.938, 0.93]`,
      annotations: {
        4: 'acc = acc + ... rather than acc = ... — exactly what PyTorch does to .grad when zero_grad is not called.',
        13: 'By epoch 3 the weights have already overshot the true [2.0, −1.0, 0.5] and keep going to [3.759, −1.938, 0.93]. The effective step size grows with every epoch.',
        14: 'Note it does not crash and the loss may even fall at first. That is what makes it dangerous: it looks like a badly tuned learning rate rather than a bug.',
      },
    },
    {
      type: 'note',
      label: 'Why accumulation is the default, since it looks like a trap',
      md: `Because it is deliberately useful. Calling \`backward()\` several times before \`step()\` sums the gradients, which lets you simulate a large batch on a GPU that cannot hold one — run four batches of 8, step once, and you have the gradient of a batch of 32.

It is also what makes multi-task losses and multiple backward paths compose without special handling.

The cost is that the common case needs an explicit \`zero_grad()\`, and forgetting it is the single most common PyTorch bug. Put it first in the loop rather than last, so that an early \`continue\` or \`break\` cannot skip it.`,
    },
    {
      type: 'note',
      label: 'The two switches that are not the same thing',
      md: `\`model.eval()\` and \`torch.no_grad()\` are unrelated and you almost always want both at evaluation.

\`model.eval()\` changes **layer behaviour**: dropout stops dropping, BatchNorm switches from batch statistics to its frozen running averages. Forgetting it gives silently worse validation numbers and predictions that change with batch composition.

\`torch.no_grad()\` stops **recording the graph**. It changes no results at all — it saves the memory and time of building a graph you are not going to differentiate. Forgetting it is a memory leak, not a correctness bug.

And \`model.train()\` to switch back. Leaving \`eval()\` on during training is the quieter, worse version: BatchNorm's running statistics never update for the entire run.`,
    },
    {
      type: 'note',
      label: 'Shapes, devices, and the loss that lies',
      md: `**Broadcasting silently.** A prediction of shape (32, 1) against a target of shape (32) broadcasts to (32, 32) and produces a perfectly plausible loss computed over 1,024 wrong pairs. This is the reason for \`.squeeze()\` in the loop above, and it is worth asserting shapes match before the loss rather than discovering it three days later.

**Everything on one device.** Model and data must both be on the GPU; a mismatch raises, which is the good case. \`.to(device)\` is in-place for modules and returns a new tensor for tensors — \`x.to(device)\` without assigning does nothing at all.

**\`.item()\` when logging.** Accumulating \`total += loss\` keeps the whole graph for every batch alive in memory. \`total += loss.item()\` extracts a plain float and lets the graph be freed.`,
    },
  ],
  quiz: [
    {
      question: 'What makes a tensor different from a NumPy array?',
      options: [
        { text: 'It is faster', explanation: 'On CPU the speed is comparable.' },
        { text: 'It can live on a GPU and it records the operations applied to it, building a graph for autograd', explanation: 'Correct — the recording is what the whole framework is built on.' },
        { text: 'It supports more dtypes', explanation: 'NumPy supports more, if anything.' },
        { text: 'It is immutable', explanation: 'Tensors are mutable, and in-place operations are a known autograd hazard.' },
      ],
      correct: 1,
    },
    {
      question: 'Why does PyTorch accumulate gradients rather than overwrite them?',
      options: [
        { text: 'It is a performance optimisation', explanation: 'It is a semantic choice, not a speed one.' },
        { text: 'It lets several backward calls sum into one step — gradient accumulation for large effective batches, and multi-task losses', explanation: 'Correct. The cost is that the common case needs an explicit zero_grad().' },
        { text: 'To avoid allocating memory each step', explanation: 'The buffer is reused either way.' },
        { text: 'Because backward cannot know if it is the last call', explanation: 'That is a consequence of the design, not the reason for it.' },
      ],
      correct: 1,
    },
    {
      question: 'Without zero_grad, the weights ran to [3.759, −1.938, 0.93] against a truth of [2.0, −1.0, 0.5]. Why is this bug hard to spot?',
      options: [
        { text: 'It raises an obscure error', explanation: 'It raises nothing at all.' },
        { text: 'Nothing crashes and the loss may fall at first — it looks like a badly tuned learning rate rather than a bug', explanation: 'Correct, because the effective step size simply grows every epoch.' },
        { text: 'It only appears on a GPU', explanation: 'It is device-independent.' },
        { text: 'It only affects the bias', explanation: 'It affects every parameter.' },
      ],
      correct: 1,
    },
    {
      question: 'What is the difference between model.eval() and torch.no_grad()?',
      options: [
        { text: 'They are aliases', explanation: 'They do entirely unrelated things.' },
        { text: 'eval() changes layer behaviour (dropout, BatchNorm); no_grad() stops recording the graph and changes no results', explanation: 'Correct. Forgetting eval() is a correctness bug; forgetting no_grad() is a memory one.' },
        { text: 'eval() saves memory and no_grad() changes layers', explanation: 'The reverse.' },
        { text: 'no_grad() implies eval()', explanation: 'Neither implies the other, which is why you need both.' },
      ],
      correct: 1,
    },
    {
      question: 'Your predictions are shape (32, 1) and your targets are shape (32). What happens?',
      options: [
        { text: 'A shape error is raised', explanation: 'It would be far better if one were.' },
        { text: 'They broadcast to (32, 32) and the loss is computed over 1,024 wrong pairs, producing a plausible-looking number', explanation: 'Correct — hence .squeeze() and asserting shapes before the loss.' },
        { text: 'The extra dimension is ignored', explanation: 'Broadcasting expands it rather than ignoring it.' },
        { text: 'Training is unaffected', explanation: 'The gradient is computed from a meaningless loss.' },
      ],
      correct: 1,
    },
    {
      question: 'Why use total += loss.item() rather than total += loss when logging?',
      options: [
        { text: 'It is faster', explanation: 'The saving is memory, not speed, though memory pressure can cost speed.' },
        { text: '.item() extracts a plain float; accumulating the tensor keeps every batch\'s whole graph alive in memory', explanation: 'Correct, and it is a classic slow memory leak over an epoch.' },
        { text: 'loss is not a number', explanation: 'It is a scalar tensor, which prints and adds fine — that is why the bug is easy to miss.' },
        { text: 'It avoids a device transfer', explanation: '.item() causes a device-to-host transfer rather than avoiding one.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Walk me through a PyTorch training loop.',
      answer:
        'Five lines, in order. zero_grad first, because PyTorch accumulates gradients into .grad rather than overwriting them, so without it every step uses the running sum. Then the forward pass, which builds the graph as it runs. Then the loss, a scalar. Then loss.backward(), which walks that graph in reverse and deposits a gradient into every leaf tensor with requires_grad. Then optimizer.step(), which applies the update from whatever is in .grad. The important structural point is that backward and step are separate operations — that separation is exactly what makes gradient accumulation and gradient clipping possible in between them.',
      isCaseBased: false,
    },
    {
      question: 'Why does PyTorch accumulate gradients?',
      answer:
        'Because the accumulation is deliberately useful and the framework chose not to special-case the common path. Calling backward several times before stepping sums the gradients, which lets you simulate a batch larger than the GPU can hold — four batches of 8 and one step gives you the gradient of a batch of 32. It also makes multiple loss terms and multiple backward paths compose with no special handling. The price is that forgetting zero_grad is the most common PyTorch bug, and it is quiet: nothing crashes, the effective step size just grows every epoch, so it presents as a badly tuned learning rate.',
      isCaseBased: false,
    },
    {
      question: 'model.eval() versus torch.no_grad() — explain both.',
      answer:
        'They are unrelated and you want both at evaluation. model.eval() changes layer behaviour: dropout stops dropping, BatchNorm switches from batch statistics to its frozen running averages. Forgetting it is a correctness bug that gives silently worse validation numbers and predictions that vary with batch composition. torch.no_grad() stops recording the computation graph — it changes no results whatsoever, it just avoids building a graph you will not differentiate, so forgetting it is a memory problem rather than a wrong answer. And model.train() to switch back; leaving eval() on during training is the quieter failure, because BatchNorm\'s running statistics then never update at all.',
      isCaseBased: true,
    },
    {
      question: 'How would you debug a model whose loss is not decreasing?',
      answer:
        'In order of how cheap the check is. First overfit a single batch deliberately — if the model cannot drive the loss to near zero on ten examples, the problem is a bug, not the data or the hyperparameters, and that one test eliminates most of the search space. Then confirm gradients actually exist: print the gradient norm per layer, since a None or zero gradient means the graph is broken somewhere, usually a detach, a .item(), or a NumPy conversion. Then check the loss is wired to the right thing — shapes broadcasting silently, a softmax applied before a loss that expects logits. Then learning rate, by an order of magnitude in each direction. Then the data pipeline: labels aligned with inputs, normalisation applied, augmentation not destroying the signal.',
      isCaseBased: true,
    },
    {
      question: 'What is the difference between a tensor and an nn.Parameter?',
      answer:
        'An nn.Parameter is a tensor subclass that, when assigned to an attribute of an nn.Module, is automatically registered so that model.parameters() finds it — which is what the optimizer iterates over. A plain tensor assigned to self is not registered, so it silently never gets optimised and never appears in the state dict, which is a genuinely confusing bug because the forward pass works fine. Parameters also default to requires_grad=True. For tensors you want saved and moved with the model but not trained — a running mean, a positional lookup — the answer is register_buffer, which gives you the state-dict and device handling without the optimiser.',
      isCaseBased: false,
    },
    {
      question: 'What are DataLoader workers doing and how do you tune them?',
      answer:
        'num_workers spawns separate processes that load and preprocess batches in parallel with GPU compute, so the GPU is not idle waiting for data. Zero means loading happens in the main process and the GPU stalls on every batch. The tuning is empirical — start around the number of CPU cores and watch GPU utilisation, since too many workers cause memory pressure and contention. pin_memory=True speeds the host-to-device transfer by using page-locked memory. The signature of getting this wrong is GPU utilisation oscillating rather than sitting high, and on Windows the worker processes re-import the main module, which is why the training entry point must be guarded.',
      isCaseBased: false,
    },
    {
      question: 'A gradient is None after backward. Where do you look?',
      answer:
        'It means the parameter was never reached by the backward walk, so I would trace where the chain breaks. Common causes: an operation outside the graph — .numpy(), .item(), .detach(), indexing through .data — or a torch.no_grad() block wrapping something it should not. The parameter genuinely not participating in this forward pass, which happens with unused heads or conditional branches. requires_grad being False, often because the parameter was created after the optimizer or reset by a load. Or a plain tensor assigned to self instead of an nn.Parameter, so it was never registered. The diagnostic is printing grad_fn along the forward path to find where it becomes None.',
      isCaseBased: true,
    },
    {
      question: 'How does mixed-precision training work and what breaks?',
      answer:
        'Forward and backward run in float16 or bfloat16 while a master copy of the weights stays in float32, roughly halving memory and using the GPU\'s tensor cores for a substantial speedup. The thing that breaks is float16\'s narrow range: small gradients underflow to zero and vanish. Loss scaling fixes it — multiply the loss by a large factor before backward so the gradients land in representable range, then unscale before the optimizer step, with the scale adjusted dynamically when an overflow is detected. bfloat16 has the same exponent range as float32 and so needs no loss scaling, which is why it is preferred where the hardware supports it. torch.amp handles all of this; the residual risks are reductions and losses that need to stay in float32.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'What a tensor adds to an array', back: 'GPU residency, and it RECORDS the operations applied to it — each result carries a grad_fn pointing back at what produced it.' },
    { front: 'The five lines', back: 'zero_grad → forward → loss → backward → step. backward and step are separate on purpose: that gap is where accumulation and clipping live.' },
    { front: 'Why zero_grad exists', back: 'PyTorch ACCUMULATES into .grad. Deliberate — it enables large effective batches and multi-task losses — but the common case must clear it.' },
    { front: 'Forgetting zero_grad, measured', back: 'Weights ran to [3.759, −1.938, 0.93] against a truth of [2.0, −1.0, 0.5]. Nothing crashes; it looks like a bad learning rate.' },
    { front: 'eval() vs no_grad()', back: 'eval() changes LAYER BEHAVIOUR (dropout, BatchNorm) — a correctness bug. no_grad() stops RECORDING — a memory bug. Neither implies the other.' },
    { front: 'The silent shape bug', back: 'Predictions (32,1) against targets (32) broadcast to (32,32) — a plausible loss over 1,024 wrong pairs. Hence .squeeze() and asserting shapes.' },
    { front: 'The logging leak', back: 'total += loss keeps every batch\'s whole graph alive. total += loss.item() extracts a float and frees it.' },
    { front: 'nn.Parameter vs a plain tensor', back: 'Only nn.Parameter assigned to self is registered, so only it appears in model.parameters() and the state dict. A plain tensor silently never trains.' },
  ],
  mindmapMarkdown: `- PyTorch fundamentals
  - Tensor
    - array + GPU + operation recording
    - requires_grad builds the graph as ops run
    - grad_fn points back at the producing op
  - The five lines
    - zero_grad (FIRST, so an early continue cannot skip it)
    - forward
    - loss
    - backward
    - step
    - backward and step separate -> accumulation, clipping
  - Gradient accumulation
    - .grad is SUMMED, not overwritten
    - deliberate: big effective batch, multi-task losses
    - forgetting it: w -> [3.759, -1.938, 0.93] vs [2.0, -1.0, 0.5]
    - never crashes; looks like a bad learning rate
  - eval() vs no_grad()
    - eval: dropout off, BatchNorm frozen stats -> CORRECTNESS
    - no_grad: stops recording -> MEMORY
    - neither implies the other
  - Quiet bugs
    - (32,1) vs (32) broadcasts to (32,32)
    - x.to(device) without assigning does nothing
    - total += loss keeps every graph alive
    - plain tensor on self is never registered`,
}

export default m
