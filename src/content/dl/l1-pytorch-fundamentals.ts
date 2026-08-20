import type { Module } from '../types'

const m: Module = {
  id: 'dl-l1-pytorch-fundamentals',
  subjectId: 'dl',
  level: 1,
  title: 'PyTorch: Tensors, Autograd & the Training Loop',
  whyItMatters:
    'You have already written a forward pass and a backward pass by hand, in plain Python, with your own loops and your own derivatives. It worked, and it was slow to write. PyTorch is the library that does exactly those two jobs for you: it stores your numbers, and it computes your derivatives. This module shows you which part of your hand-written code each PyTorch feature replaces, then builds the standard training loop one line at a time, so that when you meet a 200-line training script you can point at every line and say what it is for.',
  assumes: [
    'You have read the DL module *Backpropagation: The Chain Rule on a Graph*, and you have written a forward pass and a backward pass by hand in plain Python',
    'You know what a derivative is in the school sense: if y = x squared then dy/dx = 2x',
    'You know basic Python: variables, lists, for loops, functions, and classes with __init__ and self',
    'You do NOT need to have installed PyTorch to read this module. Every PyTorch output shown here is marked as illustrative, and the arithmetic behind it is shown so you can check it yourself.',
  ],
  estMinutes: 46,
  sections: [
    {
      type: 'intuition',
      title: 'What you wrote by hand, and what PyTorch replaces',
      md: `In the backpropagation module you built a tiny network by hand. Your code had three parts, and PyTorch replaces two of them completely.

- **The numbers.** You stored weights in Python lists or floats, and multiplied them with loops. PyTorch replaces that with a **tensor**: one object holding a whole grid of numbers, with the multiplication already written in fast compiled code.
- **The derivatives.** You worked out, on paper, that the derivative of the loss with respect to each weight was some specific expression, then typed that expression in. PyTorch replaces that with **autograd**: it watches every operation you do and works out the derivatives itself.
- **The update rule.** You wrote *w = w - 0.1 * grad* by hand. PyTorch gives you an **optimizer** object that does this line for you, and can do smarter versions of it.

Nothing new is happening mathematically. The chain rule is still the chain rule, and it is still the one you derived by hand. PyTorch is bookkeeping, done for you, at speed.`,
    },
    {
      type: 'intuition',
      title: 'A tensor is a grid of numbers, and it is not a Python list',
      md: `A **tensor** is PyTorch's container for numbers. Concretely, the four numbers 1, 2, 3, 4 arranged as two rows of two.

- Its **shape** is the list of sizes along each direction. Two rows and two columns is shape (2, 2). A plain list of 8 numbers has shape (8,). The trailing comma is there because it is a list of one size, not a single number.
- Its **dtype** is the kind of number every element holds. Every element has the same one. **float32** means a decimal number stored in 32 bits; **int64** means a whole number stored in 64 bits. A Python list can mix a float, a string and a dict; a tensor cannot, and that restriction is what makes it fast.
- A Python list of lists stores each number as a separate Python object, scattered in memory. A tensor stores all of them in one solid block, so adding two tensors is one compiled operation instead of thousands of Python steps.
- One more difference that matters later: a tensor can remember how it was produced. A list cannot. That memory is what makes autograd possible.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Making a tensor and asking it the two questions that matter',
      code: `import torch                                   # the library itself

x = torch.tensor([[1.0, 2.0], [3.0, 4.0]])     # two rows, two columns
print(x.shape)                                 # torch.Size([2, 2])
print(x.dtype)                                 # torch.float32

ids = torch.tensor([0, 1, 2])                  # no decimal points anywhere
print(ids.shape)                               # torch.Size([3])
print(ids.dtype)                               # torch.int64

f = ids.float()                                # make a float32 copy
print(f.dtype, ids.dtype)                      # torch.float32 torch.int64`,
      annotations: {
        3: 'torch.tensor() copies a Python list (or a list of lists) into a tensor. The nesting decides the shape: two inner lists of two numbers each gives shape (2, 2).',
        4: 'The outputs shown in this snippet are illustrative, not executed on this machine. You can check this one by counting: two inner lists, each holding two numbers, so (2, 2).',
        5: 'PyTorch picks the dtype from what it sees. A decimal point anywhere means float32. That is the default type for anything a network learns.',
        7: 'All whole numbers, so PyTorch picks int64. This matters: class labels and word indices must stay int64, because the loss functions that take labels refuse anything else.',
        11: '.float() returns a NEW tensor. It does not change ids, which is why the last line still prints int64 for it. Almost every tensor method works this way.',
      },
    },
    {
      type: 'intuition',
      title: 'Device: which chip is holding the numbers',
      md: `A tensor's **device** is the piece of hardware its block of memory sits on. There are two you will meet.

- **cpu** — normal computer memory. This is the default, and everything works here.
- **cuda** — the memory on an NVIDIA graphics card. A GPU does thousands of small multiplications at once, which is exactly the shape of neural network work, so training there is often ten to a hundred times faster.
- Two tensors can only be combined if they are on the **same** device. Mixing them raises: *Expected all tensors to be on the same device, but found at least two devices, cuda:0 and cpu*. That message means one of the two tensors was never moved.
- Moving is done with **.to(device)**. For a tensor it returns a copy on that device and leaves the original alone, so you must write **x = x.to(device)**. For a model, **model.to(device)** moves the parts in place, and the bare call is enough. That asymmetry catches everyone once.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Pick the device once, route everything through it',
      code: `import torch                                          # as before

device = 'cuda' if torch.cuda.is_available() else 'cpu'  # ask, then choose
print(device)                                         # 'cpu' with no GPU present

r = torch.zeros(2, 3)                                 # built on the CPU by default
print(r.device)                                       # cpu

r = r.to(device)                                      # REASSIGN -- .to gives a copy
print(r.device)                                       # cpu here; cuda:0 on a GPU box`,
      annotations: {
        3: 'torch.cuda.is_available() returns True or False. The bit before it is a Python conditional expression: the whole line becomes the string on the left when the test is true, otherwise the one on the right. Writing this once at the top means the same script runs on your laptop and on a GPU server.',
        6: 'torch.zeros(2, 3) builds a tensor of shape (2, 3) filled with zeros. The arguments are the sizes, not the contents.',
        9: 'The reassignment is the whole point. Writing r.to(device) alone computes a copy and throws it away, and r never moves. This one is the most common beginner device bug.',
      },
    },
    {
      type: 'intuition',
      title: 'Autograd: PyTorch writes down what you did',
      md: `When you did backpropagation by hand, you drew the chain of operations on paper first, then walked back along it applying the chain rule. PyTorch does the same two steps, and it builds the drawing automatically.

- **requires_grad** is a flag you set on a tensor. Setting it to True means: *I want a derivative with respect to this number, so start recording*. Weights inside a model get it automatically. Your input data should never have it.
- The **computation graph** is the recording. Every operation on a tensor that requires a gradient adds one node, storing what operation it was and which tensors went in. It is your paper drawing, built as the code runs.
- **.backward()** is called on the final single number, the loss. It walks the graph backwards from that number, applying the chain rule at each node, exactly as you did by hand.
- The results land in **.grad** on each tensor you asked for. After backward, **x.grad** holds the derivative of the loss with respect to x.
- The graph is built fresh on every forward pass and thrown away by backward. This is why an if statement inside your model just works: the recording is made by actually running your Python.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'One derivative, checkable on paper',
      code: `import torch                                    # as before

x = torch.tensor(3.0, requires_grad=True)        # record anything I touch
print(x.grad)                                    # None -- nothing computed yet

y = x ** 2                                       # forward: one node recorded
print(y)                                         # tensor(9., grad_fn=<PowBackward0>)

y.backward()                                     # walk the graph backwards
print(x.grad)                                    # tensor(6.)`,
      annotations: {
        3: 'requires_grad=True is what turns recording on. Without it, y would be a plain number with no history and .backward() would raise.',
        4: '.grad starts as None, not as zero. It only gets a value after a backward pass. Printing it is a fast way to check whether backward has run.',
        6: 'The output shown is illustrative, not executed here, but the arithmetic is yours to check: 3 squared is 9. The grad_fn part is the recording — it says the last thing that made this number was a power operation, and that is the node backward will walk through.',
        9: 'Check it by hand exactly as you did in the backpropagation module: y = x squared, so dy/dx = 2x, and at x = 3 that is 6. PyTorch computed the same derivative you would have derived.',
      },
    },
    {
      type: 'intuition',
      title: 'Gradients add up, and that is the bug you must know about',
      md: `Here is the single most surprising rule in PyTorch, and the one that produces a bug with no error message.

- **.backward() adds into .grad. It never overwrites it.** If .grad already held 6, and a new backward pass computes 6 again, .grad becomes 12.
- Why add? Because PyTorch cannot know whether your next backward pass is a new batch or another piece of the same batch. Adding is the choice that lets you build one update out of several backward passes on purpose.
- The consequence: unless you empty .grad yourself before each batch, batch 5 steps on the sum of batches 1 through 5.
- Emptying is what **zero_grad()** does. It sets every .grad back to None, so the next backward pass starts from nothing.
- Nothing raises if you forget. The code runs, the loss prints, the numbers just drift somewhere they should not. That is why this rule is worth ten minutes.

The next two snippets are plain Python, no PyTorch, and they were actually run. They show the pile-up with numbers small enough to add in your head.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The pile-up, in plain Python: what forgetting zero_grad does',
      code: `grad = 0.0                              # stands for one weight's .grad slot

def gradient_for(err):                  # stands in for one backward() pass
    return 2 * err                      # derivative of err squared is 2*err

for err in [1.0, 2.0, 3.0]:             # three batches, three error values
    grad = grad + gradient_for(err)     # ADD, exactly like backward() does
    print(err, grad)                    # watch the slot pile up

# ---- real output ----
# 1.0 2.0
# 2.0 6.0
# 3.0 12.0`,
      annotations: {
        1: 'One float standing in for the .grad slot on one weight. Starting at 0.0 rather than None keeps the arithmetic visible.',
        3: 'A stand-in for a backward pass: given this batch’s error, return the gradient for it. The real chain rule is more work but plays the same role.',
        6: 'Three batches in a row, with errors 1, 2 and 3. Their true gradients are 2, 4 and 6.',
        7: 'The plus sign is the whole lesson. PyTorch does exactly this to .grad, and never replaces the old value.',
        8: 'The printed slot goes 2, then 6, then 12. Batch two stepped on 2 + 4, and batch three on 2 + 4 + 6. Only the first batch used its own gradient.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The same three batches with the slot cleared first',
      code: `def gradient_for(err):                  # same stand-in as before
    return 2 * err                      # same derivative

for err in [1.0, 2.0, 3.0]:             # same three batches
    grad = 0.0                          # THIS is what zero_grad() does
    grad = grad + gradient_for(err)     # backward() adds into an empty slot
    step = 0.1 * grad                   # optimizer: move by 0.1 times the gradient
    print(err, grad, round(step, 4))    # each batch now uses only its own gradient

# ---- real output ----
# 1.0 2.0 0.2
# 2.0 4.0 0.4
# 3.0 6.0 0.6`,
      annotations: {
        5: 'One line moved to the top of the loop body, and the whole behaviour changes. In PyTorch that line is opt.zero_grad().',
        7: 'A stand-in for the optimizer step: multiply the gradient by a small number called the learning rate, and that is how far the weight moves.',
        8: 'Compare with the previous snippet: the gradients are now 2, 4, 6 instead of 2, 6, 12. Batch three moved the weight by 0.6 instead of 1.2 — twice too far, in the version with the bug.',
      },
    },
    {
      type: 'note',
      md: 'What you would actually observe if you forgot zero_grad, since nothing raises. The gradient slot grows roughly linearly with the batch number, so the steps get bigger and bigger as an epoch runs. Early on training looks fine, even fast. Then the loss starts jumping around, or shoots up to a huge number, or becomes **nan** — the value a float takes when the arithmetic has gone out of range. Restarting looks like it fixes it for a while, because the slot is empty again. The tell: the trouble starts partway through an epoch, not at step 0, and lowering the learning rate delays it instead of curing it.',
    },
    {
      type: 'intuition',
      title: 'nn.Module: your model as a class with two methods',
      md: `In your hand-written network the weights were loose variables and the forward pass was a function. **nn.Module** is PyTorch's box that keeps those two together.

- You write **__init__**: build the layers you need and assign them to **self**. That assignment is what registers them. A layer stored in a plain Python list is invisible to everything below.
- You write **forward**: the computation, using the layers you built. You never call it directly. You call **model(x)**, and PyTorch calls forward for you.
- **nn.Linear(in, out)** is one layer of the network you built by hand: it multiplies the input by a weight grid of shape (out, in) and adds a bias of length out.
- **model.parameters()** hands back every registered weight and bias in the whole tree of layers. That is the list you give the optimizer, so it knows which numbers it is allowed to move.
- **super().__init__()** must be the first line of your __init__, because it sets up the registry that the next lines write into.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'A two-layer network, with the parameter count checked by hand',
      code: `import torch                                  # as before
import torch.nn as nn                          # nn holds the layer types

class TinyNet(nn.Module):                      # inherit from nn.Module
    def __init__(self):                        # what parts do I have
        super().__init__()                     # ALWAYS the first line
        self.fc1 = nn.Linear(4, 3)             # 4 numbers in, 3 out
        self.act = nn.ReLU()                   # keeps positives, zeroes negatives
        self.fc2 = nn.Linear(3, 1)             # 3 numbers in, 1 out

    def forward(self, x):                      # what do I do with them
        h = self.act(self.fc1(x))              # layer 1, then the activation
        return self.fc2(h)                     # layer 2 gives the final number

net = TinyNet()                                # build one
print(sum(p.numel() for p in net.parameters()))  # 19 -- illustrative, checked below`,
      annotations: {
        4: 'Inheriting from nn.Module is what gives your class parameters(), .to(device), train() and eval() for free.',
        6: 'Skip this line and the very next one raises: cannot assign module before Module.__init__() call. The registry does not exist yet.',
        7: 'Assignment to self is registration. nn.Module intercepts it and enrols the layer, so it appears in parameters() and moves with .to(device).',
        11: 'You define forward, but you call net(x). Going through the object rather than the method is what lets PyTorch run its own bookkeeping around your code.',
        16: 'p.numel() is the count of numbers in one tensor. The part inside sum() is a generator expression: it walks parameters() one at a time and yields each count, and sum adds them up. Check it by hand: fc1 has a weight grid of 3 by 4 = 12 plus 3 biases = 15; fc2 has 1 by 3 = 3 plus 1 bias = 4; total 19.',
      },
    },
    {
      type: 'note',
      md: 'The registration trap, because it costs people a day. Writing **self.blocks = [nn.Linear(64, 64) for _ in range(3)]** looks right and runs without complaint. But a plain Python list is not a registered attribute, so those three layers never appear in **parameters()**. The optimizer therefore never updates them, **.to(device)** never moves them, and saving the model never saves them. The symptom is a loss that falls a little and then stalls, with no error anywhere. The fix is **nn.ModuleList([...])** when you index the layers yourself, or **nn.Sequential(...)** when they always run in order.',
    },
    {
      type: 'intuition',
      title: 'The optimizer: the update line you used to write yourself',
      md: `Your hand-written code ended with something like *w = w - 0.1 * grad*, once per weight. An **optimizer** is an object that does that line for every parameter at once.

- You build it once, handing it two things: **model.parameters()**, so it knows which numbers it may change, and **lr**, the **learning rate** — how big a step to take per unit of gradient.
- **opt.step()** is the update. It reads .grad on every parameter it was given and moves that parameter. It does not compute anything; backward already did.
- **opt.zero_grad()** empties those same .grad slots. Same set of parameters, opposite job.
- **torch.optim.SGD** does exactly your line. **torch.optim.Adam** does a smarter version that adapts the step size per weight; the *Optimizers: SGD, Momentum, RMSProp and Adam* module explains how. For now the interface is identical.
- Build the optimizer once, outside the training loop. Rebuilding it every epoch throws away the memory that Adam keeps between steps.`,
    },
    {
      type: 'intuition',
      title: 'Building the training loop, one line at a time',
      md: `The next four snippets add one statement each. By the end you will have the loop that every PyTorch project on earth contains, and you will have watched each line arrive with a reason.

1. **forward** — run the data through the model and get predictions.
2. **loss** — collapse the predictions and the true answers into one number.
3. **backward** — fill every .grad, after first clearing them with zero_grad.
4. **step** — let the optimizer move the weights.

Read the four snippets in order. The variables carry over from one to the next, exactly as they would in one script.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Stage 1 of 4: the forward pass',
      code: `import torch                            # as before
import torch.nn as nn                    # as before

model = nn.Linear(4, 1)                  # one layer: 4 in, 1 out
xb = torch.randn(8, 4)                   # a batch: 8 samples, 4 features each
yb = torch.randn(8, 1)                   # the 8 true answers, shape (8, 1)

pred = model(xb)                         # THE FORWARD PASS
print(pred.shape)                        # torch.Size([8, 1]) -- illustrative`,
      annotations: {
        4: 'nn.Linear(4, 1) holds a weight grid of shape (1, 4) and one bias. It is the smallest thing that can still be trained.',
        5: 'torch.randn(8, 4) makes a tensor of that shape filled with random numbers. The 8 is the batch size: how many samples go through together. Standing in for real data here.',
        6: 'The true answers are given shape (8, 1), matching what the model outputs. Making these two shapes agree is the subject of a later section, and it is not optional.',
        8: 'Calling the model runs forward and, because the model parameters require gradients, records the graph as it goes. Prediction and recording happen in the same call.',
        9: 'Shape (8, 1) because each of the 8 samples produced 1 output number. No output is executed here, but the arithmetic is direct: 8 rows in, 8 rows out.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Stage 2 of 4: collapse it to one number, the loss',
      code: `loss_fn = nn.MSELoss()                   # mean squared error, built once

pred = model(xb)                         # stage 1, unchanged
loss = loss_fn(pred, yb)                 # prediction first, truth second
print(loss.shape)                        # torch.Size([]) -- empty means one number
print(loss.item())                       # e.g. 1.83 -- illustrative, random init`,
      annotations: {
        1: 'MSELoss takes the difference between each prediction and its truth, squares it, and averages over all of them. It is the same loss you would write with a for loop, one call instead.',
        4: 'The argument order is prediction then target, always. Swapping them happens to give the same number for MSE, but not for the classification losses, so build the habit now.',
        5: 'An empty shape, written torch.Size([]), means a scalar: a single number with no rows or columns. backward() can only start from a scalar, which is why the loss must reduce everything to one value.',
        6: '.item() pulls the number out of the tensor as an ordinary Python float. Use it for printing and for adding up running totals, because the plain tensor would keep its whole graph alive in memory.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Stage 3 of 4: clear the slots, then run backward',
      code: `opt = torch.optim.SGD(model.parameters(), lr=0.01)  # built once, outside any loop

opt.zero_grad()                          # empty every .grad slot first
print(model.weight.grad)                 # None -- illustrative, nothing computed yet

loss = loss_fn(model(xb), yb)            # forward and loss, in one line
loss.backward()                          # chain rule backwards through the graph
print(model.weight.grad.shape)           # torch.Size([1, 4]) -- one number per weight`,
      annotations: {
        1: 'The optimizer is handed the parameters it may move and the learning rate. Nothing has moved yet; this line only sets up the relationship.',
        3: 'zero_grad comes BEFORE the forward pass of this batch, not after the step. It is the line whose absence produced the pile-up two snippets ago.',
        4: 'After zero_grad the slot holds None rather than a tensor of zeros. That is deliberate: it is cheaper, and it lets the optimizer skip parameters that got no gradient at all.',
        6: 'Nesting the model call inside the loss call is the same two steps as stage 2, written on one line. This is how you will see it in real code.',
        7: 'This is the hand-derived backward pass from the backpropagation module, run for you. It fills .grad on every parameter and then frees the graph.',
        8: 'The gradient has the SAME shape as the weight it belongs to: one derivative per number you could turn. That is true of every parameter in every model.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Stage 4 of 4: the optimizer step, and the finished loop',
      code: `for batch_number in range(3):            # in real code: for xb, yb in loader
    opt.zero_grad()                      # 1. empty last batch's gradients
    pred = model(xb)                     # 2. forward -- the graph is built here
    loss = loss_fn(pred, yb)             # 3. one scalar, the root of that graph
    loss.backward()                      # 4. chain rule fills every .grad
    opt.step()                           # 5. optimizer reads .grad, moves the weights
    print(batch_number, loss.item())     # the loss should fall over the three steps`,
      annotations: {
        1: 'In a real script this loop walks over batches from a DataLoader, which hands you xb and yb one batch at a time. Reusing one fixed batch here keeps the five lines in focus.',
        2: 'Line 1 of 5. Without it, backward on line 4 would add onto whatever the previous iteration left behind.',
        3: 'Line 2 of 5. A fresh graph is recorded on every single iteration, which is why an if or a loop inside forward simply works.',
        4: 'Line 3 of 5. One scalar. If yours is not a scalar, backward will refuse, and the reason is almost always a missing average or sum.',
        5: 'Line 4 of 5. Nothing has moved yet: backward only writes gradients. The weights are still exactly where they were.',
        6: 'Line 5 of 5. This is the only line that changes a weight. Note that .grad is still full afterwards, which is precisely why the next iteration starts by clearing it.',
        7: 'The order is load-bearing. step() before backward() moves the weights using the previous iteration gradients, or on the first iteration using none at all. zero_grad() placed between backward() and step() erases what you just computed, so the step does nothing and the loss curve is a flat line with no error printed anywhere.',
      },
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'One training step, frame by frame',
        notice: 'Left: the names in your loop. Right: the .grad slot on each parameter. Step through - the last frame is the bug.',
        leftLabel: 'your loop',
        rightLabel: 'the .grad slots',
        frames: [
          {
            note: 'A batch arrives. The parameters are sitting there with whatever gradients the last batch left behind.',
            stack: [
              { name: 'xb', value: '(8,4)' },
              { name: 'yb', value: '(8,1)' },
            ],
            heap: [
              { id: 'w1', value: 'weight.grad = old', label: 'stale' },
              { id: 'b1', value: 'bias.grad = old', label: 'stale' },
            ],
          },
          {
            note: 'opt.zero_grad() - every .grad slot is emptied. This happens BEFORE the forward pass, once per batch.',
            stack: [{ name: 'xb', value: '(8,4)' }],
            heap: [
              { id: 'w1', value: 'weight.grad = None', label: 'cleared' },
              { id: 'b1', value: 'bias.grad = None', label: 'cleared' },
            ],
          },
          {
            note: 'pred = model(xb), then loss = loss_fn(pred, yb). Each operation adds a node to a graph built fresh for this batch. The loss is one number: the root.',
            stack: [
              { name: 'pred', to: 'n1' },
              { name: 'loss', to: 'n2' },
            ],
            heap: [
              { id: 'n1', value: 'AddmmBackward', label: '(8,1)' },
              { id: 'n2', value: 'MseLossBackward', label: 'scalar root' },
            ],
          },
          {
            note: 'loss.backward() - the chain rule runs back through the graph and ADDS into every .grad. The graph is then freed.',
            stack: [{ name: 'loss', to: 'n2' }],
            heap: [
              { id: 'w1', value: 'weight.grad = g', label: 'filled' },
              { id: 'b1', value: 'bias.grad = h', label: 'filled' },
            ],
          },
          {
            note: 'opt.step() - the optimizer reads .grad and moves the weights. Notice the gradients are still sitting in their slots afterwards.',
            stack: [{ name: 'lr', value: '0.01' }],
            heap: [
              { id: 'w1', value: 'weight moved', label: 'updated' },
              { id: 'g1', value: 'weight.grad = g still', label: 'stale' },
            ],
          },
          {
            note: 'DANGER - zero_grad skipped. Batch 2 ADDS onto batch 1, so step() moves the weights using g + g2. Nothing raises, and the steps keep growing.',
            stack: [{ name: 'batch #2', to: 'gsum', danger: true }],
            heap: [{ id: 'gsum', value: 'weight.grad = g + g2', label: 'bug' }],
          },
        ],
      },
    },
    {
      type: 'intuition',
      title: 'The shape error every beginner hits: (N,) against (N,1)',
      md: `Two shapes that look the same to a human are different to PyTorch, and combining them produces no error and the wrong answer.

- **(8,)** is a flat run of 8 numbers. That is what you get from a plain list of labels.
- **(8, 1)** is 8 rows of 1 number each. That is what **nn.Linear(4, 1)** hands back for a batch of 8.
- When shapes differ, PyTorch tries **broadcasting**: it lines the shapes up from the RIGHT and stretches any size-1 direction to match. Here (8, 1) against (8,) is read as (8, 1) against (1, 8), and both size-1 directions stretch, giving **(8, 8)**.
- So *pred - y* becomes 64 numbers instead of 8: every prediction minus every label, including 56 pairs that have nothing to do with each other. Your loss is the average of that. No exception is raised. The model trains on nonsense.
- The fix is to make one match the other: **pred.squeeze(1)** removes the size-1 direction to give (8,), or **y.unsqueeze(1)** inserts one to give (8, 1). Either is fine, as long as you pick one.

The related confusion is the **batch dimension**. Direction 0 of every tensor flowing through a model is the batch: how many samples travelled together. A single sample of 4 features has shape (4,), and a model expects (batch, 4), so you pass one sample as **x.unsqueeze(0)** to get shape (1, 4). Forgetting this gives a genuine, loud error, usually *mat1 and mat2 shapes cannot be multiplied*, which simply means the two grids in a matrix multiplication did not line up.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The silent shape bug, and the two one-line fixes',
      code: `import torch                              # as before

pred = torch.zeros(8, 1)                   # what a Linear(4, 1) hands back
y = torch.zeros(8)                         # what a plain label list becomes
print((pred - y).shape)                    # torch.Size([8, 8]) -- 64 numbers!

print((pred.squeeze(1) - y).shape)         # torch.Size([8]) -- fix A
print((pred - y.unsqueeze(1)).shape)       # torch.Size([8, 1]) -- fix B

one = torch.zeros(4)                       # a single sample, 4 features
print(one.unsqueeze(0).shape)              # torch.Size([1, 4]) -- a batch of one`,
      annotations: {
        5: 'The outputs here are illustrative, but this one you can derive: line the shapes up from the right, (8,1) against (1,8), stretch both size-1 directions, and you get 8 by 8 = 64 numbers. That is the whole broadcasting rule.',
        7: 'squeeze(1) removes direction 1 because it has size 1. Always name the direction. Bare squeeze() removes EVERY size-1 direction, so on a batch that happens to hold one sample it silently deletes the batch direction too.',
        8: 'unsqueeze(1) inserts a new direction of size 1 at position 1, turning (8,) into (8, 1). It is the exact opposite of squeeze.',
        11: 'unsqueeze(0) at the front is how one sample becomes a batch of one. Every model expects a batch, even when the batch holds a single item.',
      },
    },
    {
      type: 'intuition',
      title: 'Two switches for evaluation: eval() and no_grad()',
      md: `When you stop training and start measuring, you flip two independent switches. They do different things and you want both.

- **model.eval()** sets a flag called *training* to False on every layer. Exactly two common layers read that flag: **Dropout**, which stops deleting random parts of the signal, and **BatchNorm**, which stops using the current batch and uses the averages it saved during training. Linear, ReLU and the rest ignore it entirely. Why each layer behaves that way is the subject of the *Regularization* and *Weight Init, BatchNorm vs LayerNorm* modules; here you only need the switch.
- **model.train()** flips it back. Forgetting to flip back after validating is the quieter bug: dropout stays off for the rest of training.
- **torch.no_grad()** is a block. Inside it, no computation graph is recorded at all. You are not going to call backward on a validation batch, so the recording is pure waste of memory and time.
- Neither implies the other. eval() changes what layers compute; no_grad() changes whether the operations are written down. Calling eval() without no_grad() gives correct numbers while quietly building a graph for every batch, which is a common cause of running out of GPU memory during validation.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'A validation pass with both switches',
      code: `model.eval()                             # dropout off, batchnorm frozen

with torch.no_grad():                    # nothing inside is recorded
    val_pred = model(xb)                 # forward only, no graph built
    val_loss = loss_fn(val_pred, yb)     # a plain number, no history

print(val_pred.requires_grad)            # False -- illustrative but guaranteed
print(round(val_loss.item(), 4))         # e.g. 1.7211 -- illustrative

model.train()                            # switch BACK before training resumes`,
      annotations: {
        3: 'The with-block is Python syntax for do something on the way in and undo it on the way out. Here it turns recording off at the top and back on at the bottom, even if an error happens inside.',
        4: 'Same forward call as during training, but no graph is stored, so this uses far less memory. That is often the difference between a validation pass fitting on the GPU and not.',
        7: 'Guaranteed False, not a guess: no_grad turns recording off, so nothing produced inside the block can carry a gradient requirement.',
        10: 'The line people forget. Without it, dropout stays off for the rest of training and you silently lose the regularization you asked for.',
      },
    },
    {
      type: 'intuition',
      title: 'Worked case: one training step, computed entirely by hand',
      md: `A model with exactly one weight, so you can do every number yourself. Model: **pred = w * x**, with **w = 2.0**. One sample: **x = 3.0**, true answer **y = 5.0**. Loss: squared error. Learning rate: **0.1**.

1. **Forward.** pred = 2.0 * 3.0 = **6.0**.
2. **Loss.** (pred - y) squared = (6.0 - 5.0) squared = 1.0 squared = **1.0**.
3. **Backward.** The chain rule, the same one you did by hand: d(loss)/d(pred) = 2 * (pred - y) = 2 * 1.0 = 2.0, and d(pred)/dw = x = 3.0. Multiply: d(loss)/dw = 2.0 * 3.0 = **6.0**. This is the number PyTorch would put in **w.grad**.
4. **Step.** w = w - lr * w.grad = 2.0 - 0.1 * 6.0 = 2.0 - 0.6 = **1.4**.
5. **Check it worked.** New pred = 1.4 * 3.0 = 4.2. New loss = (4.2 - 5.0) squared = 0.64. Down from 1.0, so the step went the right way.

Every one of those five numbers has a line of PyTorch behind it: model(x), loss_fn(pred, y), loss.backward(), opt.step(). The library did not do anything you could not do on paper — it did it for a million weights instead of one.`,
    },
    {
      type: 'intuition',
      title: 'The classic mistake, diagnosed: the missing zero_grad()',
      md: `Take the same one-weight model through three identical steps, but leave zero_grad() out. To keep the arithmetic clean, assume the gradient computed on each batch is 2.0, then 4.0, then 6.0 — the same three numbers from the plain-Python snippets above, and the learning rate is 0.1.

- **Correct loop.** Slot cleared each time, so it holds 2.0, then 4.0, then 6.0. The weight moves by 0.2, then 0.4, then 0.6. Total movement: **1.2**.
- **Missing zero_grad.** The slot holds 2.0, then 2.0 + 4.0 = 6.0, then 2.0 + 4.0 + 6.0 = 12.0. The weight moves by 0.2, then 0.6, then 1.2. Total movement: **2.0**.
- Look at step three: 1.2 instead of 0.6, exactly double. And two thirds of that step came from gradients measured at weight values that no longer exist, because the weight has moved twice since.
- **Why it is wrong, precisely.** A gradient is the slope of the loss *at one particular setting of the weights*. Reusing batch one's gradient after two updates is using a slope measured somewhere the model is not standing any more. The further the weight travels, the more wrong the stale part becomes.
- **What you see.** No error. A loss that improves at first, then oscillates or explodes to nan partway through the first epoch. Halving the learning rate makes it survive twice as long, which is the false clue that sends people optimizing hyperparameters for a day.
- **The fix.** One line, first in the loop body: **opt.zero_grad()**.`,
    },
    {
      type: 'intuition',
      title: 'Practice problems',
      md: `Work each one on paper before reading the solution below it.

1. You have **pred** of shape (5, 1) and **y** of shape (5,). What shape does **pred - y** have, how many numbers is that, and what are the two one-line fixes?
2. A model is **nn.Linear(784, 128)** followed by **nn.Linear(128, 10)**. How many learnable numbers does it have in total?
3. Start with x = torch.tensor(2.0, requires_grad=True). Set y to x cubed and call y.backward(). What does x.grad hold? You then set y2 to x cubed as well and call y2.backward(), without clearing anything. Now what does it hold?
4. A teammate's loss curve is a perfectly flat line from step 0, with no error message. Their loop body reads: forward, loss, backward, zero_grad, step. What is wrong, and what would you predict about the gradients if they printed them just before step?`,
    },
    {
      type: 'intuition',
      title: 'Practice solutions',
      md: `1. Line the shapes up from the right: (5, 1) against (1, 5). Both size-1 directions stretch, so the result is **(5, 5)**, which is 25 numbers instead of 5. Your loss would be the mean over 25 pairs, 20 of which pair a prediction with someone else's label. Fixes: **pred.squeeze(1)** to give (5,), or **y.unsqueeze(1)** to give (5, 1).
2. First layer: a weight grid of 128 by 784 = 100352, plus 128 biases = **100480**. Second layer: 10 by 128 = 1280, plus 10 biases = **1290**. Total **101770**. The pattern for any Linear(a, b) is a * b + b.
3. dy/dx for x cubed is 3 * x squared, and at x = 2 that is 3 * 4 = **12**. The second backward computes 12 again and ADDS it, so x.grad becomes **24**. Note that the second call runs fine even though the first graph was freed, because setting y2 to x cubed built a brand new graph.
4. **zero_grad() is sitting between backward() and step().** It erases exactly the gradients backward just computed, so step() has nothing to act on and no weight ever moves — hence a perfectly flat loss and no error. Printing the gradients just before step would show **None** for every parameter, which is the giveaway. Move zero_grad() to the top of the loop body.`,
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `Four things you will meet once the basic loop is solid.

- **Gradient accumulation.** The accumulation you have been carefully avoiding is also a tool. Run K small batches, divide each loss by K, call backward on each, and step once at the end. The result is the gradient of one batch K times larger, on a GPU that could never hold it. The divide by K matters: without it you get the sum instead of the mean, so your effective learning rate is K times what you think.
- **.detach().** Where no_grad() switches recording off for a whole block, .detach() takes one tensor out of the graph and leaves everything else recording. Use it when a value has to leave the graph but the surrounding code must keep training.
- **Saving.** Save **model.state_dict()**, a plain dictionary of layer name to tensor, not the model object. Saving the object stores a reference to your class and its file path, so renaming a file can break the file. To reload you rebuild the same class in code and pour the numbers in with **load_state_dict**, then call **eval()** before predicting.
- **DataLoader.** Rather than one fixed batch, real code wraps a **Dataset** — an object answering only how many samples there are and give me sample i — in a **DataLoader**, which handles batching, shuffling, and loading batches in background processes while the GPU works.`,
    },
    {
      type: 'note',
      md: 'The debugging checklist, in the order that costs least. **Loss perfectly flat from step 0**: check whether opt.step() is called at all, then whether zero_grad() has drifted between backward() and step(), then print .grad on a parameter right after backward — None means those parameters are not in the optimizer, all zeros means the signal died upstream. **Loss climbs or becomes nan partway through an epoch**: missing zero_grad, or a learning rate too high. **Runs out of memory during validation**: you forgot torch.no_grad(), or you added the loss tensor to a running total instead of loss.item(). And the one test that beats all of them: take a single batch and train on it alone for a few hundred steps. A correct setup drives that one batch to nearly zero loss. If it cannot, the bug is in your model, your loss, or the way your labels line up with your inputs, and looking at the data pipeline is wasted time.',
    },
  ],
  quiz: [
    {
      question: 'Why must you call optimizer.zero_grad() every iteration?',
      options: [
        {
          text: 'It resets the optimizer memory (such as Adam momentum) between batches',
          explanation: 'No. zero_grad only clears .grad on the parameters. The optimizer memory is supposed to persist across steps.',
        },
        {
          text: 'Because .backward() ADDS into .grad, so without a clear this step uses the sum of every batch so far',
          explanation: 'Correct. Adding is the default. It is a tool when you mean it, and a silent bug when you forget it.',
        },
        {
          text: 'It frees the computation graph so memory does not leak',
          explanation: 'The graph is freed by .backward() itself. zero_grad touches only the .grad slots.',
        },
      ],
      correct: 1,
    },
    {
      question: 'pred has shape (32, 1) and y has shape (32,). What is the shape of pred - y?',
      options: [
        {
          text: '(32,) - PyTorch flattens the extra size-1 direction automatically',
          explanation: 'It does not flatten. Broadcasting stretches size-1 directions instead of removing them.',
        },
        {
          text: 'A RuntimeError, because the shapes do not match',
          explanation: 'No error is raised, and that is what makes this bug expensive. Broadcasting finds a legal way to combine them.',
        },
        {
          text: '(32, 32) - the shapes line up from the right as (32,1) against (1,32) and both size-1 directions stretch',
          explanation: 'Correct. 1024 numbers instead of 32, so the loss is an average over pairs that do not belong together. Fix with pred.squeeze(1) or y.unsqueeze(1).',
        },
      ],
      correct: 2,
    },
    {
      question: 'x = torch.tensor(3.0, requires_grad=True). You run y = x**2; y.backward(), then y2 = x**2; y2.backward(). What does x.grad hold?',
      options: [
        {
          text: 'tensor(6.) - the second backward replaces the first',
          explanation: 'Replacing is what everyone assumes, and it is wrong. .grad is added into, never overwritten.',
        },
        {
          text: 'tensor(12.) - dy/dx = 2x = 6 computed twice and summed',
          explanation: 'Correct. Each backward contributes 6, and the second adds: 6 + 6 = 12. This is exactly why zero_grad exists.',
        },
        {
          text: 'An error, because you cannot call backward twice',
          explanation: 'You cannot call backward twice on the SAME graph, but y2 = x**2 is a fresh forward pass that builds a brand new one.',
        },
      ],
      correct: 1,
    },
    {
      question: 'Your loop body reads: forward, loss, backward, zero_grad, step. What do you observe?',
      options: [
        {
          text: 'A RuntimeError about calling backward twice',
          explanation: 'Nothing here calls backward twice on one graph. This loop runs cleanly.',
        },
        {
          text: 'A perfectly flat loss and no error, because zero_grad erased the gradients that step was about to use',
          explanation: 'Correct. The weights never move. Printing .grad just before step would show None for every parameter.',
        },
        {
          text: 'Training that is roughly twice as fast, since the step happens later',
          explanation: 'The step happens, but with nothing to act on. No weight changes, so nothing is learned at any speed.',
        },
      ],
      correct: 1,
    },
    {
      question: 'You write self.blocks = [nn.Linear(64, 64) for _ in range(3)] in __init__, use them in forward, and train. The loss barely moves. Why?',
      options: [
        {
          text: 'A Python list breaks the computation graph, so gradients cannot flow through it',
          explanation: 'Gradients flow fine. Autograd records operations on tensors and does not care where the layer object is stored.',
        },
        {
          text: 'A plain list is not a registered attribute, so those parameters never appear in model.parameters() and the optimizer never moves them',
          explanation: 'Correct. .to(device) skips them and saving skips them too. Use nn.ModuleList, or nn.Sequential when they always run in order.',
        },
        {
          text: 'The three layers share one set of weights, so the model has too little capacity',
          explanation: 'They are three independent layers with separate weights. No sharing is happening.',
        },
      ],
      correct: 1,
    },
    {
      question: 'During validation you call model.eval() but forget torch.no_grad(). What is the consequence?',
      options: [
        {
          text: 'The numbers are correct, but a graph is built for every batch, wasting memory and time and often causing an out-of-memory error',
          explanation: 'Correct. The two switches are independent: eval() fixes layer behaviour, no_grad() stops the recording. You want both.',
        },
        {
          text: 'Dropout stays active, so the score is understated',
          explanation: 'model.eval() already turned dropout off. no_grad has nothing to do with layer behaviour.',
        },
        {
          text: 'The weights get updated during validation',
          explanation: 'Weights only change when opt.step() is called. Recording a graph updates nothing by itself.',
        },
      ],
      correct: 0,
    },
  ],
  interviewQuestions: [
    {
      question: 'Why does PyTorch accumulate gradients instead of overwriting them?',
      answer:
        'Because PyTorch cannot know whether your next backward() starts a new batch or adds another piece to the current one, so it takes the composable choice: .grad += the new gradient. That makes gradient accumulation trivial — run K micro-batches, backward on each with the loss divided by K, then step once, and you get the gradient of a K-times-larger batch on a GPU that could never hold it. It also makes multi-loss setups natural. The price is that forgetting zero_grad() is a silent bug rather than an exception: the model keeps training, but on a growing sum that includes gradients measured at weights which no longer exist, so the steps get larger through the epoch and the loss eventually oscillates or goes to nan. The tradeoff is explicitness over convenience: clearing is your job.',
      isCaseBased: false,
    },
    {
      question: 'Walk me through a training loop and tell me what breaks if I swap two of the lines.',
      answer:
        'zero_grad, forward, loss, backward, step. zero_grad first because backward adds into .grad and last batch numbers are still there. Forward builds the graph fresh for this batch. The loss must reduce to a scalar or backward has nothing to start the chain rule from. backward fills .grad on every parameter that requires a gradient, then frees the graph. step reads those gradients and applies the update rule; it computes nothing itself. The swaps: step() before backward() moves the weights using the previous iteration gradients, and on iteration one using none at all. zero_grad() between backward() and step() erases exactly what you just computed, so no weight moves and the loss curve is perfectly flat with no error. backward() twice without a fresh forward raises about backing through the graph a second time. The point of the question is that two of those three fail silently.',
      isCaseBased: false,
    },
    {
      question: 'Case: a teammate’s model shows a loss that is exactly flat from step 0. Nothing errors. Give your debugging order.',
      answer:
        'Order by cost. First, is opt.step() actually called, and has zero_grad() drifted between backward() and step()? Both give a perfectly flat line. Second, print .grad on a couple of parameters right after backward: all None means those parameters are not in the optimizer — the plain-Python-list registration trap, or an optimizer built from a different model object; all zeros means the signal died upstream, for example a detach left in forward. Third, the learning rate: 1e-8 is indistinguishable from broken, so try ten times larger. Fourth, the loss itself: the wrong loss for the task, or a softmax applied before a loss that already applies one, both give a plausible near-constant number. Fifth, label alignment: shuffle the labels and confirm the loss gets worse — if it does not, the model never really saw them. Then the test that beats all of it: overfit one single batch on purpose. A correct setup drives it to nearly zero in a few hundred steps; if it cannot, the bug is in the model, the loss, or the labels, not the data pipeline.',
      isCaseBased: true,
    },
    {
      question: 'What exactly does model.to(device) do, and why do people still hit the device error?',
      answer:
        'It walks the module tree and moves every registered parameter and buffer onto the device, in place, returning self. Tensors behave the opposite way: x.to(device) returns a new tensor and leaves x alone, so a bare x.to(device) statement does nothing — that asymmetry causes most of the expected-all-tensors-on-the-same-device errors. Other sources: creating a tensor inside forward with torch.zeros(...) and no device argument, so it lands on the CPU while everything else is on the GPU — pass device=x.device; storing a constant as a plain attribute instead of registering it as a buffer, so .to() never sees it; and building the optimizer from one model object and then reassigning model to a moved copy. Fix pattern: one device variable defined once, model.to(device) at setup, xb = xb.to(device) inside the batch loop.',
      isCaseBased: false,
    },
    {
      question: 'Case: a model scores 92% during training-time evaluation but 71% when reloaded from its checkpoint in a serving script. Same weights. What do you check?',
      answer:
        'Same weights, different answer, so something outside the weights differs. Ranked: first, model.eval() not called in the serving path — dropout is still deleting parts of the signal and BatchNorm is normalizing by whatever is in the request batch, which at batch size one is degenerate. Second, preprocessing drift: training normalized, resized or tokenized in a way serving does not reproduce. Third, load_state_dict called with strict=False and the returned missing keys ignored, so part of the model is still randomly initialized. Fourth, output handling: training-time evaluation took the argmax of raw scores while serving applies an extra softmax and a threshold. Fifth, device or precision differences, which are usually worth fractions of a point rather than twenty. The one test that splits the space: run the serving code end to end on the exact validation set used in training. If the number matches, the bug is in the input pipeline; if it does not, it is in loading or in eval mode.',
      isCaseBased: true,
    },
    {
      question: 'Explain torch.no_grad(), .detach(), and requires_grad_(False). When do you reach for each?',
      answer:
        'Three different scopes. torch.no_grad() is a block: nothing inside it is recorded to the graph — use it for whole regions, namely validation, inference, and hand-written parameter updates. .detach() acts on a single tensor: it returns a tensor sharing the same numbers with no history, so the graph stops there — use it when one value must leave the graph while the surrounding code keeps training, for example logging, storing predictions, or a target you must not back-propagate into. requires_grad_(False) acts on a parameter: never compute a gradient for this weight, which is how you freeze a pretrained part of a model. One tradeoff worth naming: freezing this way still runs backward through those layers if anything after them needs gradients — it only stops the accumulation. To skip the computation entirely the frozen part must be at the front, and you detach its output.',
      isCaseBased: false,
    },
    {
      question: 'What is a dynamic computation graph, and what does it buy you?',
      answer:
        'Dynamic means the graph is built by actually running the forward pass, from scratch, on every iteration. Consequences: Python control flow is just Python — an if on a tensor value, a while loop whose length depends on the input, a different path per sample, all with no special API. Debugging is normal debugging: print a tensor, set a breakpoint, read a stack trace that points at your line. The cost is that the framework cannot see the whole computation ahead of time, so it cannot fuse operations or optimize globally, which is what static-graph frameworks bought and what torch.compile now recovers by tracing the graph it observes and compiling that. The framing: PyTorch traded ahead-of-time optimization for developer speed, won the research community, then closed most of the performance gap later with compilation.',
      isCaseBased: false,
    },
    {
      question: 'Case: training runs fine for two epochs, then dies with an out-of-memory error at epoch 3. What is going on?',
      answer:
        'An out-of-memory error that arrives late means something grows. In order: first, adding the loss TENSOR to a running total instead of loss.item() — each batch then keeps its whole graph alive and memory rises steadily; the same applies to appending model outputs to a list without .detach(). Second, validation without torch.no_grad(), so the peak lands during evaluation and only after a few epochs does memory fragmentation make it fatal. Third, variable-length inputs where a rare long batch spikes the peak — bucket or cap by length. Fourth, genuine allocator fragmentation from constantly changing shapes. Fifth, something honestly per-epoch, like a list kept for logging that is never cleared. Diagnosis: print the allocated memory at the end of each epoch. Rising epoch over epoch is a reference being held; flat allocated memory with a fatal peak is a batch-size or evaluation-mode problem. Fix the leak rather than just lowering the batch size.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'A tensor vs a Python list', back: 'A tensor holds one dtype in one solid block of memory, on a chosen device, and records how it was made so autograd can differentiate it. A list holds anything, scattered, with no history.' },
    { front: 'shape, dtype, device', back: 'shape: the sizes along each direction, e.g. (8, 4). dtype: the kind of number every element holds, float32 for data, int64 for labels. device: cpu or cuda, and both operands must match.' },
    { front: 'The five lines of a training loop, in order', back: 'zero_grad, forward, loss, backward, step. Reorder them and it breaks silently, not loudly.' },
    { front: 'Why optimizer.zero_grad()', back: '.backward() ADDS into .grad, never overwrites. Skip the clear and batch 5 steps on the sum of batches 1 to 5, with no error printed.' },
    { front: 'What .backward() actually does', back: 'Starts from a single scalar, walks the recorded graph backwards applying the chain rule, writes the result into .grad on each leaf, then frees the graph.' },
    { front: 'The (N,) versus (N,1) trap', back: 'Shapes line up from the RIGHT, so (32,1) minus (32,) broadcasts to (32,32): 1024 numbers, no error, wrong loss. Fix with pred.squeeze(1) or y.unsqueeze(1).' },
    { front: 'model.train() vs model.eval()', back: 'Flips one flag. Only Dropout (dropping on or off) and BatchNorm (batch statistics vs frozen ones) read it. Linear and ReLU ignore it. Remember to flip back to train().' },
    { front: 'eval() vs no_grad()', back: 'eval() changes what layers compute. no_grad() stops the graph being recorded at all. Independent, and you want both during validation.' },
  ],
  mindmapMarkdown: `- PyTorch: Tensors, Autograd & the Training Loop
  - What it replaces
    - your lists of weights -> tensors
    - your hand-derived derivatives -> autograd
    - your w = w - lr*grad line -> optimizer
  - Tensor
    - shape: sizes per direction
    - dtype: float32 data, int64 labels
    - device: cpu or cuda, must match
    - x = x.to(device) reassign; model.to(device) in place
  - Autograd
    - requires_grad turns recording on
    - graph rebuilt fresh each forward
    - backward() fills .grad, then frees the graph
    - .grad ADDS -> zero_grad() every batch
  - nn.Module
    - __init__ builds, forward computes
    - you call model(x), never forward(x)
    - assignment to self = registration
    - plain list is invisible -> nn.ModuleList
    - parameters() feeds the optimizer
  - Training loop
    - zero_grad -> forward -> loss -> backward -> step
    - loss must be one scalar
    - loss.item() for printing and totals
  - Shapes
    - (N,) vs (N,1) broadcasts to (N,N), silently
    - squeeze(1) / unsqueeze(1) to fix
    - direction 0 is the batch; unsqueeze(0) for one sample
  - Evaluation
    - eval() : dropout + batchnorm only
    - no_grad() : no graph recorded
    - train() again afterwards
  - Debugging
    - flat loss: step missing, or zero_grad misplaced
    - nan mid-epoch: missing zero_grad, or LR too high
    - OOM in val: no_grad, loss.item()
    - smoke test: overfit one batch`,
}

export default m
