import type { Module } from '../types'

const m: Module = {
  id: 'genai-l1-build-gpt-capstone',
  subjectId: 'genai',
  level: 1,
  title: 'CAPSTONE: Code a GPT from Scratch',
  whyItMatters:
    'You have already built every part of a transformer in the five modules before this one. Nothing new is invented here. This module screws the parts together into one file that trains and then writes text, and it teaches the one part you have not met yet: how the finished model chooses each next character. By the end you will have a single Python file of about 120 lines that you can run, watch learn, and explain line by line.',
  assumes: [
    'You have read *Tokenization: How Text Becomes Numbers*, so you know that text becomes a list of integers',
    'You have read *Self-Attention from zero* and *Multi-Head Attention & Causal Masking*, so you know what Q, K, V, the scale and the causal mask do',
    'You have read *Positional Encoding: Teaching Attention About Order* and *The Transformer Block: Attention, Feed-Forward, Residual, Norm*, so the class named Block below is already familiar',
    'You know basic Python: lists, dicts, for loops, functions, and calling a method on an object',
    'You know that ln means natural logarithm, the one with base e = 2.718',
  ],
  estMinutes: 70,
  sections: [
    {
      type: 'intuition',
      title: 'What exists at the end, exactly',
      md: `One Python file. About 120 lines of code, not counting comments. When you run it, three things happen in order: it reads a 1.1 MB text file, it prints a falling loss number for a few minutes, and then it prints 500 characters of new text that it wrote itself.

- The model inside is a **character-level GPT**: 6 transformer blocks, 6 attention heads each, a residual stream 192 numbers wide, and a context window of 128 characters.
- It holds exactly **2,715,713 numbers** that get adjusted during training. We will count them by hand later so you can check yours matches.
- On disk that is about **11 MB** as a saved checkpoint, because each number is a 4-byte float: 2,715,713 x 4 = 10,862,852 bytes.
- The text it writes is **Shakespeare-shaped nonsense**: real English words, character names in capitals followed by a colon, line breaks in sensible places, sentences that go nowhere.
- That is the honest ceiling for this size. It is not a chatbot and it cannot answer a question. What it is, is the real architecture, at a size you can watch.

This module has one job: assembly. Every piece below was taught somewhere else, and this page says so each time.`,
    },
    {
      type: 'note',
      md: `Two honesty notes before anything else.

- **PyTorch is not installed on the machine this page was written on.** So every output shown for a PyTorch snippet is labelled *illustrative* - it is what the line produces, not something that was captured from a run. Anything that can be justified by arithmetic is justified here in full: shapes, parameter counts, and the starting loss.
- **The plain-Python snippets were actually run**, and their output is pasted under a "real output" comment. Those are the ones doing the numeric teaching, so the numbers you see there are true.`,
    },
    {
      type: 'intuition',
      title: 'The six stages, and where each part came from',
      md: `Build in this order. Stages 2 and 3 are pure re-use, so they are short.

1. **Data and batching** - turn a text file into batches of (input, target) pairs. Uses the tokenizer idea from *Tokenization: How Text Becomes Numbers*.
2. **The block** - one transformer block. Built and explained in *The Transformer Block: Attention, Feed-Forward, Residual, Norm*, which itself uses the heads from *Multi-Head Attention & Causal Masking*.
3. **The stack** - embeddings from *Positional Encoding: Teaching Attention About Order*, then blocks, then a final normalisation and a projection to one score per character.
4. **The loss** - one number saying how wrong all the predictions were.
5. **The training loop** - repeat: get a batch, compute the loss, nudge every number.
6. **Sampling** - the loop that turns the trained model into text. This is the new material, and it gets the most space.`,
    },
    {
      type: 'intuition',
      title: 'Stage 1: the labels are the text itself, shifted by one',
      md: `Nobody labelled this dataset. The shift does it.

- Take any 4 characters from the text: \`"to b"\`. That is the **input**. The **target** is the same window moved one step to the right: \`"o be"\`.
- Line the two up. Position 0 says: after \`t\` comes \`o\`. Position 1: after \`to\` comes a space. Position 2: after \`to \` comes \`b\`. Position 3: after \`to b\` comes \`e\`.
- So a window of 4 characters is **4 training examples**, not one. A window of 128 is 128 examples, and a batch of 64 such windows is 64 x 128 = **8,192 predictions in one step**.
- The reason every position is a usable example is the causal mask from *Multi-Head Attention & Causal Masking*: position 2 physically cannot see position 3, so asking it to predict position 3 is a fair question.
- The tokenizer is the simplest one that exists: one integer per distinct character. Shakespeare has 65 distinct characters, so **vocab_size = 65**.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Stage 1a: the tokenizer, on a tiny text so you can see every number',
      code: `text = 'to be or not to be'

chars = sorted(set(text))
vocab_size = len(chars)
stoi = {}
itos = {}
for i in range(vocab_size):
    stoi[chars[i]] = i
    itos[i] = chars[i]

data = [stoi[c] for c in text]

print('chars     ', chars)
print('vocab_size', vocab_size)
print('data      ', data)
print('decoded   ', ''.join(itos[i] for i in data))

# ---- real output ----
# chars       [' ', 'b', 'e', 'n', 'o', 'r', 't']
# vocab_size 7
# data       [6, 4, 0, 1, 2, 0, 4, 5, 0, 3, 4, 6, 0, 6, 4, 0, 1, 2]
# decoded    to be or not to be`,
      annotations: {
        1: 'A tiny stand-in for the real corpus. Everything below works the same on 1.1 MB of Shakespeare; this version just fits on the page.',
        3: 'set(text) throws away duplicates, leaving each distinct character once. sorted() puts them in a fixed order, which matters: the order decides which character gets which number, and a model trained today must decode the same way tomorrow.',
        4: 'The size of the vocabulary. Here 7 characters, including the space. For Shakespeare this is 65.',
        5: 'stoi means "string to integer": an empty dictionary that will map a character to its number.',
        6: 'itos means "integer to string": the same table read backwards, used to turn the model\'s output back into readable text.',
        7: 'range(vocab_size) gives 0, 1, 2, ... up to vocab_size - 1. These are the numbers we hand out.',
        8: 'Character chars[i] gets number i. Because chars was sorted, the space is 0, b is 1, e is 2, and so on.',
        9: 'The same pair stored the other way round, so we can look up either direction.',
        11: 'A list comprehension: for every character c in the text, look up stoi[c] and collect the results. This is the whole corpus, now as integers.',
        13: 'Printing the vocabulary is the first thing to check. If it contains something unexpected, your text file has an encoding problem.',
        14: 'vocab_size is the single most important number on this page. It fixes the width of the model\'s output and, as you will see, the starting loss.',
        15: 'The encoded text. Notice 6, 4 at the start: t then o.',
        16: '\'\'.join(...) glues a sequence of one-character strings into one string. Decoding must reproduce the input exactly, or the tables are wrong.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Stage 1b: the shift by one, unrolled into training examples',
      code: `data = [6, 4, 0, 1, 2, 0, 4, 5, 0, 3, 4, 6, 0, 6, 4, 0, 1, 2]
block_size = 4

x = data[0:block_size]
y = data[1:block_size + 1]
print('x =', x)
print('y =', y)

for t in range(block_size):
    print('context', x[:t + 1], '-> target', y[t])

# ---- real output ----
# x = [6, 4, 0, 1]
# y = [4, 0, 1, 2]
# context [6] -> target 4
# context [6, 4] -> target 0
# context [6, 4, 0] -> target 1
# context [6, 4, 0, 1] -> target 2`,
      annotations: {
        1: 'The encoded "to be or not to be" from the previous snippet, pasted in so this snippet runs on its own.',
        2: 'block_size is the context length: how many characters the model may look back at. Four here, 128 in the real build.',
        4: 'data[0:4] takes positions 0, 1, 2, 3 - the input window.',
        5: 'data[1:5] takes positions 1, 2, 3, 4 - the same window slid one step right. This single line is the entire supervision signal of a GPT.',
        6: 'x is [6, 4, 0, 1], which decodes to "to b".',
        7: 'y is [4, 0, 1, 2], which decodes to "o be". Every entry of y is the character that follows the matching entry of x.',
        9: 't walks over the four positions in the window.',
        10: 'x[:t + 1] is everything up to and including position t - the context the model is allowed to see there. Print this once. Watching four separate lessons fall out of one four-character window is the moment next-token prediction stops being a slogan.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Stage 1c: the same thing in PyTorch, at real size',
      code: `import torch

data = torch.tensor(encode(text), dtype=torch.long)
n = int(0.9 * len(data))
train_data, val_data = data[:n], data[n:]

block_size = 128
batch_size = 64
device = 'cuda' if torch.cuda.is_available() else 'cpu'

def get_batch(split):
    d = train_data if split == 'train' else val_data
    ix = torch.randint(len(d) - block_size, (batch_size,))
    x = torch.stack([d[i:i + block_size] for i in ix])
    y = torch.stack([d[i + 1:i + block_size + 1] for i in ix])
    return x.to(device), y.to(device)`,
      annotations: {
        1: 'PyTorch. A tensor is a list of numbers with a shape attached, and every operation on it can be run on a GPU.',
        3: 'The whole 1.1 million character corpus becomes one long tensor of integers. dtype=torch.long means 64-bit integers, which is what the embedding lookup requires. At 8 bytes each that is about 9 MB - the entire data pipeline is one variable.',
        4: 'n is 90% of the length. int() cuts off the decimal part.',
        5: 'Split by position, not by shuffling. If you shuffled character windows first, nearly identical windows would land in both halves and the validation number would be a lie.',
        7: 'The context window: 128 characters. This number appears again in the position table, and the two must match.',
        8: 'How many independent windows are processed together. 64 windows x 128 positions = 8,192 predictions per step.',
        9: 'Use the GPU if there is one, otherwise the CPU. Every tensor must be on the same device or PyTorch raises an error.',
        11: 'One function returns one batch. split is the string \'train\' or \'val\'.',
        12: 'A conditional expression: d becomes train_data when split is \'train\', otherwise val_data.',
        13: 'randint picks 64 random starting positions. The upper limit is len(d) - block_size so that the target slice, which needs one extra character, never runs off the end.',
        14: 'A list of 64 windows, each 128 long, stacked into one tensor of shape (64, 128).',
        15: 'The same 64 windows shifted right by one. Same shape (64, 128). This is the line from Stage 1b, done 64 times at once.',
        16: '.to(device) moves both tensors to the GPU. Forgetting it on one of them is the most common first error message you will see.',
      },
    },
    {
      type: 'intuition',
      title: 'Stage 2: the block, taken as-is',
      md: `Nothing here is new. The class below is exactly the one derived in *The Transformer Block: Attention, Feed-Forward, Residual, Norm*, and the two classes it calls, \`MultiHeadAttention\` and \`FeedForward\`, are the ones built in *Multi-Head Attention & Causal Masking*.

- The block does two things in a row: **mix information across tokens** (attention), then **think about each token on its own** (the feed-forward network).
- Each of those two is wrapped the same way: normalise a copy, run the sublayer on the copy, and **add** the result back onto the running total. The running total is never overwritten.
- The shape going in and the shape coming out are identical: (batch, positions, 192). That single fact is what lets you stack six of these with one line of code.

If any of that is fuzzy, go back to that module. Do not learn it here.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Stage 2a: the config, all in one place',
      code: `import torch.nn as nn
from torch.nn import functional as F

vocab_size = 65
block_size = 128
n_embd = 192
n_head = 6
n_layer = 6
dropout = 0.1`,
      annotations: {
        1: 'nn holds the building blocks: Linear, Embedding, LayerNorm. The alias nn is universal in PyTorch code.',
        2: 'F holds the same operations as plain functions rather than objects - we need F.softmax and F.cross_entropy.',
        4: '65 distinct characters in the Shakespeare file. Every output score vector has this length.',
        5: 'The context window. Also the number of rows in the position table, so these two uses must stay equal.',
        6: 'The width of the residual stream: every token is carried as 192 numbers from start to finish.',
        7: 'Six attention heads per block, so each head works in 192 / 6 = 32 dimensions. More heads means narrower heads, not more work.',
        8: 'Six blocks stacked. Depth is a single integer only because the block preserves shape.',
        9: 'Dropout probability: during training, 10% of the values in certain places are randomly set to zero, which stops the model leaning on any single pathway.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Stage 2b: the block itself (from the transformer-block module)',
      code: `class Block(nn.Module):
    def __init__(self, n_embd, n_head):
        super().__init__()
        self.sa = MultiHeadAttention(n_head, n_embd // n_head)
        self.ffwd = FeedForward(n_embd)
        self.ln1 = nn.LayerNorm(n_embd)
        self.ln2 = nn.LayerNorm(n_embd)

    def forward(self, x):
        x = x + self.sa(self.ln1(x))
        x = x + self.ffwd(self.ln2(x))
        return x`,
      annotations: {
        1: 'Every model piece in PyTorch subclasses nn.Module. That is what makes its numbers findable by the optimizer later.',
        2: '__init__ creates the parts once. It runs when you write Block(192, 6), not on every batch.',
        3: 'super().__init__() runs nn.Module\'s own setup. Skip it and PyTorch cannot track anything inside this class.',
        4: 'The attention sublayer: 6 heads of size 192 // 6 = 32. // is integer division.',
        5: 'The feed-forward sublayer: 192 -> 768 -> 192, applied to each position separately.',
        6: 'A LayerNorm rescales the 192 numbers of one token to a tidy spread, which keeps the numbers going into attention in a comfortable range.',
        7: 'A second, separate LayerNorm. Two objects, not one reused twice - each learns its own gain and offset.',
        9: 'forward runs on every batch. x arrives with shape (batch, positions, 192).',
        10: 'Read it as: x stays, and attention adds a correction on top. ln1 normalises only the copy handed to attention; the running total x is untouched.',
        11: 'Same pattern for the feed-forward part. The block is literally "x = x + something", twice.',
        12: 'Out comes the same shape that went in, which is what makes stacking possible.',
      },
    },
    {
      type: 'intuition',
      title: 'Stage 3: the stack, the final norm, and the output projection',
      md: `Three things wrap around the six blocks.

- **Two lookup tables at the bottom.** One turns a character id into 192 numbers (its meaning). One turns a position 0-127 into 192 numbers (where it sits). They are **added together**, which is the choice explained in *Positional Encoding: Teaching Attention About Order*.
- **A final LayerNorm at the top.** Because every block adds to the running total and none of them shrink it, the numbers grow steadily with depth. One last normalisation puts them back in range before the final step. Leaving it out does not crash anything - it just trains worse, silently.
- **The output projection**, called \`lm_head\`: one Linear layer from 192 numbers to 65 numbers. Those 65 numbers are called **logits**: raw scores, one per possible next character, not yet probabilities.

The model produces logits at **every** position, not just the last one. During training that is a gift - 128 predictions per window. During sampling it is a trap, and we will come back to it.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Stage 3a: the model\'s parts',
      code: `class GPT(nn.Module):
    def __init__(self):
        super().__init__()
        self.token_embedding = nn.Embedding(vocab_size, n_embd)
        self.position_embedding = nn.Embedding(block_size, n_embd)
        self.blocks = nn.Sequential(*[Block(n_embd, n_head) for _ in range(n_layer)])
        self.ln_f = nn.LayerNorm(n_embd)
        self.lm_head = nn.Linear(n_embd, vocab_size)`,
      annotations: {
        1: 'The whole model is one class holding the pieces below.',
        2: 'No arguments: every setting comes from the config constants, which keeps the example short.',
        3: 'Required first line, as in Block.',
        4: 'nn.Embedding is a lookup table, not a multiplication: 65 rows of 192 numbers. Row i is the learned meaning of character i.',
        5: 'A second table with 128 rows, one per slot in the window. This is why the model cannot read more than 128 characters at once - row 128 does not exist.',
        6: 'A list comprehension builds six Block objects; the * spreads that list into six separate arguments; nn.Sequential runs them one after another. _ is the conventional name for a loop variable you never use.',
        7: 'The final LayerNorm. Easy to forget, and forgetting it produces no error at all.',
        8: 'nn.Linear(192, 65) turns each token\'s 192 numbers into 65 scores. This is the only place vocab_size appears after the embedding.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Stage 3b and Stage 4: forward, and the loss at the end of it',
      code: `    def forward(self, idx, targets=None):
        B, T = idx.shape
        tok = self.token_embedding(idx)
        pos = self.position_embedding(torch.arange(T, device=idx.device))
        x = tok + pos
        x = self.blocks(x)
        x = self.ln_f(x)
        logits = self.lm_head(x)

        if targets is None:
            return logits, None
        B, T, C = logits.shape
        loss = F.cross_entropy(logits.view(B * T, C), targets.view(B * T))
        return logits, loss`,
      annotations: {
        1: 'idx is a tensor of character ids with shape (batch, positions). targets defaults to None so the same function serves both training and generation.',
        2: 'Tuple unpacking: B is the batch size, T is how many positions this call actually has. T can be smaller than 128 while generating.',
        3: 'Look up each id in the token table. Shape (B, T) becomes (B, T, 192).',
        4: 'torch.arange(T) is [0, 1, 2, ..., T-1] - the slot numbers. Looking those up gives shape (T, 192).',
        5: 'Adding (T, 192) to (B, T, 192) copies the same position vectors across every window in the batch. Meaning and position now share one 192-number vector.',
        6: 'All six blocks, in order. Shape unchanged: (B, T, 192).',
        7: 'The final LayerNorm described above.',
        8: 'Now (B, T, 65): for every window, at every position, one score per possible next character.',
        10: 'When no targets were passed we are generating, not training, so there is nothing to score.',
        11: 'Returning a pair keeps one function signature for both uses. None stands in for the missing loss.',
        12: 'Re-unpack, now with three parts. C is 65, the number of classes.',
        13: 'F.cross_entropy wants a 2-D table of scores and a 1-D list of correct answers. .view(...) re-labels the same numbers with a new shape without copying: (64, 128, 65) becomes (8192, 65), and (64, 128) becomes (8192,). Getting this wrong raises a loud shape error, which is the good kind of bug.',
        14: 'One scalar loss for all 8,192 predictions, averaged. That single number is what training shrinks.',
      },
    },
    {
      type: 'intuition',
      title: 'What cross-entropy actually computes',
      md: `The loss is simpler than its name.

- Softmax turns the 65 raw scores into 65 probabilities that add to 1.
- Look up the probability the model gave to the **correct** next character. Call it p.
- The loss for that one prediction is **-ln(p)**. If p = 1 the loss is 0. If p = 0.5 the loss is 0.693. As p falls toward 0 the loss climbs without limit.
- The reported loss is the average of that over all 8,192 predictions in the batch.
- Because it uses the natural log, this loss is measured in units called **nats**. That is the only reason ln, and not log base 10, shows up in every number below.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The loss, computed with nothing but the math module',
      code: `import math

vocab_size = 65
uniform = 1.0 / vocab_size
print('uniform probability', round(uniform, 6))
print('loss of one prediction', round(-math.log(uniform), 4))
print('ln(vocab_size)       ', round(math.log(vocab_size), 4))

guessed = [0.02, 0.60, 0.05, 0.33]
correct_index = 1
print('trained-ish loss     ', round(-math.log(guessed[correct_index]), 4))
print('ln(4) for vocab of 4 ', round(math.log(4), 4))

# ---- real output ----
# uniform probability 0.015385
# loss of one prediction 4.1744
# ln(vocab_size)        4.1744
# trained-ish loss      0.5108
# ln(4) for vocab of 4  1.3863`,
      annotations: {
        1: 'math.log is the natural logarithm - base e, not base 10. That is what cross-entropy uses.',
        3: 'The Shakespeare vocabulary.',
        4: 'A model that has learned nothing spreads its guess evenly: 1/65 on every character.',
        5: '1/65 = 0.015385. Rounding to 6 decimal places keeps the print readable.',
        6: 'Minus the natural log of that probability: 4.1744.',
        7: 'And ln(65) is the same 4.1744. Not a coincidence - it is the same expression, since -ln(1/V) = ln(V).',
        9: 'Now a model that has learned something. Four probabilities over a four-character vocabulary.',
        10: 'The correct next character happens to be number 1, which the model gave 0.60.',
        11: '-ln(0.60) = 0.5108. Compare to the untrained value on the next line.',
        12: 'ln(4) = 1.3863 is where that four-character model would have started. Falling from 1.3863 to 0.5108 is what learning looks like as a number.',
      },
    },
    {
      type: 'math',
      intro:
        'The starting loss, derived rather than asserted. V is the vocabulary size. The last line does ln(65) by hand, using only ln(2) = 0.693147, so you can check it without a calculator.',
      latex: [
        '\\mathcal{L} = -\\ln p(\\text{correct token}), \\qquad \\text{untrained} \\Rightarrow p = \\tfrac{1}{V} \\Rightarrow \\mathcal{L}_0 = -\\ln \\tfrac{1}{V} = \\ln V',
        '\\ln 65 = \\ln 64 + \\ln\\tfrac{65}{64} = 6\\ln 2 + \\ln 1.015625 = 4.158883 + 0.015504 = 4.174387',
        '\\text{perplexity} = e^{\\mathcal{L}}: \\quad e^{4.1744} = 65 \\;(\\text{a fair 65-sided die}), \\qquad \\mathcal{L} = 1.5 \\Rightarrow e^{1.5} \\approx 4.48',
      ],
    },
    {
      type: 'intuition',
      title: 'The two checks to run before you train anything',
      md: `Both cost under a minute and both catch bugs that would otherwise waste an hour.

- **Check 1: the first loss must be about 4.17.** An untrained model spreads its guess evenly over 65 characters, so its loss is ln(65) = 4.174. If you print 4.1-4.4, everything is wired correctly. If you print 8, or 0.9, or nan, stop and fix it - training will not rescue you.
- Why the small slack: at start-up the weights are small random numbers rather than exactly zero, so the 65 scores are not perfectly equal. That nudges the loss slightly above ln(V), never far.
- **Check 2: the model must be able to overfit one single batch.** Fetch one batch, then train on that same batch a few hundred times. The loss should fall almost to zero.
- Why that works: 8,192 predictions are easy to memorise for 2.7 million adjustable numbers. If the loss will not go near zero on data the model has seen hundreds of times, the problem is not your data or your learning rate - some part of the model is not connected to the optimizer at all.
- Check 1 tests the loss and the output width. Check 2 tests that gradients actually reach every parameter. Together they cover almost every silent wiring bug.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Both checks, in one script (illustrative output - PyTorch was not run here)',
      code: `model = GPT().to(device)
print(sum(p.numel() for p in model.parameters()), 'parameters')

xb, yb = get_batch('train')
optimizer = torch.optim.AdamW(model.parameters(), lr=3e-4)

_, loss = model(xb, yb)
print('step 0 loss', loss.item())

for step in range(300):
    _, loss = model(xb, yb)
    optimizer.zero_grad(set_to_none=True)
    loss.backward()
    optimizer.step()
print('after 300 steps on ONE batch', loss.item())

# ---- illustrative, not a captured run ----
# 2715713 parameters        <- this one is arithmetic; see the count below
# step 0 loss 4.1809        <- must be near ln(65) = 4.1744
# after 300 steps on ONE batch 0.0431   <- must approach 0`,
      annotations: {
        1: 'Build the model and move all its numbers to the GPU or CPU.',
        2: 'p.numel() is the count of numbers in one parameter tensor; summing over model.parameters() counts the whole model. Print it before anything else - if it is not 2,715,713 you have mis-wired something, and finding that now costs seconds instead of an hour.',
        4: 'One batch, fetched once and reused deliberately.',
        5: 'AdamW is the optimizer: the thing that reads the gradients and actually changes the numbers. lr is the step size, 3e-4 meaning 0.0003.',
        7: 'One forward pass with targets, so we get a loss. The underscore discards the logits, which we do not need here.',
        8: '.item() pulls the single number out of the tensor so print shows 4.1809 rather than tensor(4.1809).',
        10: 'Now the overfit check: 300 steps on the same batch.',
        11: 'Same batch every time - that is the entire point.',
        12: 'Gradients add up by default, so they must be cleared before each backward pass. Skipping this line silently sums the gradient of every step you have ever taken.',
        13: 'backward() computes, for every one of the 2.7 million numbers, which direction would reduce the loss.',
        14: 'step() applies those changes. These four lines are the whole of training.',
        15: 'A loss near zero means the model can memorise, which means gradients reach everything. It says nothing about generalisation, and that is fine - this is a wiring test.',
      },
    },
    {
      type: 'math',
      intro:
        'The parameter count, done by hand. d = 192 (the stream width), V = 65 (vocabulary), T = 128 (context), L = 6 (blocks). Each Linear layer of shape a -> b holds a*b numbers, plus b more if it has a bias.',
      latex: [
        '\\text{attention: } \\underbrace{3d^2}_{Q,K,V \\text{, no bias}} + \\underbrace{d^2 + d}_{\\text{output proj}} \\quad\\text{feed-forward: } \\underbrace{4d^2 + 4d}_{192 \\to 768} + \\underbrace{4d^2 + d}_{768 \\to 192}',
        '\\text{so per block } 12d^2 + 9d + 4d_{\\text{(two LayerNorms)}} = 12(36{,}864) + 1{,}920 = 442{,}368 + 1{,}920 = 444{,}288',
        '444{,}288 \\times 6 = 2{,}665{,}728 \\qquad \\text{embeddings: } Vd + Td = 12{,}480 + 24{,}576 = 37{,}056',
        '\\text{final LayerNorm } 2d = 384, \\quad \\text{lm\\_head } dV + V = 12{,}480 + 65 = 12{,}545',
        '\\textbf{total} = 2{,}665{,}728 + 37{,}056 + 384 + 12{,}545 = \\textbf{2{,}715{,}713}',
      ],
    },
    {
      type: 'note',
      md: `Two things worth taking from that count.

- **The feed-forward network is two-thirds of every block.** Attention is 4d² = 147,456 numbers; the feed-forward network is 8d² = 294,912. "Transformers are mostly attention" is false by parameter count.
- **The attention score matrix is not in the count at all.** It is computed fresh every step and thrown away. At batch 64, 128 positions, 6 heads that is 64 x 6 x 128 x 128 = 6,291,456 numbers per block - about 25 MB in 4-byte floats, per block, per step. Parameters decide the file size; these temporary values decide the biggest batch you can fit.`,
    },
    {
      type: 'intuition',
      title: 'Stage 5: the training loop, and the one helper worth writing',
      md: `The loop itself is five lines. The care goes into how you measure.

- A single batch's loss bounces around. Judging a change by one batch is how people convince themselves a bad idea helped. So average the loss over a couple of hundred batches before printing it.
- Wrap that measuring function in \`@torch.no_grad()\`. Normally PyTorch records every operation so it can compute gradients later; during measurement you never call backward, so recording is pure wasted memory.
- Bracket it with \`model.eval()\` and \`model.train()\`. Those switch dropout off and back on. Measuring with dropout on measures a randomly damaged model.
- Forgetting the \`model.train()\` at the end is a real and quiet bug: dropout stays off for the rest of training, the training loss looks suspiciously good, and the gap to validation widens.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Stage 5a: the measuring helper',
      code: `@torch.no_grad()
def estimate_loss(eval_iters=200):
    out = {}
    model.eval()
    for split in ('train', 'val'):
        losses = torch.zeros(eval_iters)
        for k in range(eval_iters):
            x, y = get_batch(split)
            _, loss = model(x, y)
            losses[k] = loss.item()
        out[split] = losses.mean().item()
    model.train()
    return out`,
      annotations: {
        1: 'A decorator: the @ line wraps the function below it so that everything inside runs with gradient recording switched off. Putting it on the function means you cannot forget it at a call site.',
        2: 'eval_iters=200 is a default argument: call estimate_loss() and you get 200 batches; call estimate_loss(50) for a quicker, noisier reading.',
        3: 'An empty dictionary that will hold two numbers, one per split.',
        4: 'Switch dropout off. From here the model is deterministic apart from which batches we draw.',
        5: 'A tuple of two strings, looped over - once for training data, once for held-out data.',
        6: 'A tensor of 200 zeros, ready to be filled with 200 loss readings.',
        7: 'k counts from 0 to 199.',
        8: 'A fresh random batch each time. Different batches are exactly what averages out the noise.',
        9: 'Forward pass with targets, so we get a loss. Logits discarded.',
        10: 'Store this batch\'s loss as a plain number.',
        11: 'The mean of 200 readings. This is the number worth printing.',
        12: 'Dropout back on. The function looked read-only but it changed the model, so it must change it back.',
        13: 'Returns something like {\'train\': 1.83, \'val\': 1.91}.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Stage 5b: the loop (illustrative output - PyTorch was not run here)',
      code: `model = GPT().to(device)
optimizer = torch.optim.AdamW(model.parameters(), lr=3e-4)

for step in range(5000):
    if step % 500 == 0:
        L = estimate_loss()
        print(step, round(L['train'], 4), round(L['val'], 4))

    xb, yb = get_batch('train')
    _, loss = model(xb, yb)
    optimizer.zero_grad(set_to_none=True)
    loss.backward()
    optimizer.step()

# ---- illustrative shape of a run, not a captured one ----
# 0     4.1809 4.1806     <- ln(65) = 4.1744, as predicted
# 500   2.4xxx 2.4xxx     <- the steep early fall
# 5000  1.6xxx 1.7xxx     <- grinding; val drifting above train`,
      annotations: {
        1: 'A fresh model, since the overfit check above deliberately ruined the previous one.',
        2: 'AdamW again. The W means it applies weight decay separately from the adaptive step, which is the version everyone uses for transformers.',
        4: '5,000 steps. Each step is 8,192 predictions, so this is about 41 million predictions in total.',
        5: '% is the remainder operator, so this is true at step 0, 500, 1000, and so on.',
        6: 'Measure properly, using the helper above.',
        7: 'Print both numbers. Watching them apart matters more than watching either alone.',
        9: 'A fresh random batch for this step.',
        10: 'Forward pass: prediction and loss.',
        11: 'Clear last step\'s gradients.',
        12: 'Compute this step\'s gradients.',
        13: 'Take one small step downhill for every parameter. The loop is done; everything hard happened in the classes above.',
      },
    },
    {
      type: 'note',
      md: `How to read your own curve, honestly. The **only** number here that is a prediction rather than a guess is the first one: step 0 must land near 4.174, and that is arithmetic, not experience. After that, expect a steep drop for a few hundred steps and then a long grind. Where it settles depends on your model size, your corpus and how long you train, so any specific final number quoted on a page you did not run yourself is decoration. What you should actually watch is the **shape**: a steep fall then a flattening, and the gap between train and validation. If validation stops falling while training keeps going, the model is memorising the file - which at 2.7M parameters on 1 MB of text happens quickly and is expected.`,
    },
    {
      type: 'intuition',
      title: 'Stage 6: sampling, the part that visibly changes the output',
      md: `The trained model answers exactly one question: given these characters, what is the probability of each possible next character? Turning that into text means choosing one, over and over.

- Say the model has read \`"the "\` and produces this distribution over six candidates: **e 0.40, a 0.25, o 0.15, i 0.10, u 0.06, z 0.04**. They add to 1.00.
- **Greedy** takes the highest every time: always \`e\`. Deterministic, and it gets stuck: the same context always gives the same character, so the model falls into repeating loops like "the the the".
- **Plain sampling** draws at random in proportion: \`e\` 40 times in 100, \`z\` 4 times in 100. Never loops - but it will draw \`z\` sometimes, and one bad character poisons all the text that follows it.
- **Temperature** reshapes the distribution before drawing, without banning anything.
- **top-k** keeps only the k highest and bans the rest.
- **top-p** keeps the fewest candidates whose probabilities reach p, and bans the rest.

The next three snippets compute all of them on those exact six numbers.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Sampling 1: what temperature does to the six numbers',
      code: `import math

chars = ['e', 'a', 'o', 'i', 'u', 'z']
probs = [0.40, 0.25, 0.15, 0.10, 0.06, 0.04]
logits = [math.log(p) for p in probs]

def softmax_with_temperature(logits, temp):
    scaled = [z / temp for z in logits]
    biggest = max(scaled)
    exps = [math.exp(z - biggest) for z in scaled]
    total = sum(exps)
    return [round(e / total, 3) for e in exps]

print('chars      ', chars)
for temp in [0.5, 1.0, 1.5]:
    print('T =', temp, softmax_with_temperature(logits, temp))

# ---- real output ----
# chars       ['e', 'a', 'o', 'i', 'u', 'z']
# T = 0.5 [0.615, 0.24, 0.086, 0.038, 0.014, 0.006]
# T = 1.0 [0.4, 0.25, 0.15, 0.1, 0.06, 0.04]
# T = 1.5 [0.318, 0.232, 0.165, 0.126, 0.09, 0.068]`,
      annotations: {
        1: 'Only the math module - no PyTorch, so this output is real.',
        3: 'The six candidate characters.',
        4: 'The distribution from the section above. They sum to 1.00.',
        5: 'Working backwards: taking the log of each probability gives a set of raw scores that softmax turns back into exactly these probabilities at temperature 1. That is how we can start from probabilities the reader can see.',
        7: 'temp is the temperature. The model is not involved - this all happens to its output.',
        8: 'Divide every score by the temperature. That is the whole of temperature; everything below is just softmax.',
        9: 'The largest scaled score. Subtracting it before exp keeps the numbers small and prevents overflow, and cancels out in the division, so the result is unchanged.',
        10: 'exp() of each score. exp turns any score into a positive number, and bigger gaps between scores become bigger ratios here.',
        11: 'The sum, used to make everything add to 1.',
        12: 'Divide each by the total, so the six values are probabilities again.',
        14: 'Print the characters so the columns below line up with them.',
        15: 'Three temperatures: below 1, exactly 1, above 1.',
        16: 'Read the output rows against each other. At T = 0.5 the top character goes from 0.40 to 0.615 and z nearly vanishes at 0.006. At T = 1.5 the top drops to 0.318 while z rises to 0.068 - almost double its original chance. Low temperature sharpens, high temperature flattens. You can hand-check T = 0.5: dividing log-probabilities by 0.5 is the same as squaring the probabilities, and 0.40 squared is 0.16, while the six squares sum to 0.2602, giving 0.16 / 0.2602 = 0.615.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Sampling 2: top-p, the rule (part 1)',
      code: `probs = [0.40, 0.25, 0.15, 0.10, 0.06, 0.04]
chars = ['e', 'a', 'o', 'i', 'u', 'z']

def keep_top_p(p):
    kept = []
    running = 0.0
    for i in range(len(probs)):
        kept.append(i)
        running = running + probs[i]
        if running >= p:
            break
    return kept`,
      annotations: {
        1: 'The same six probabilities, already sorted from largest to smallest. Real code has to sort first; this list is sorted by construction so the loop can be read plainly.',
        2: 'The matching characters.',
        4: 'p is the probability budget, for example 0.9.',
        5: 'The positions we decide to keep.',
        6: 'A running total of probability kept so far.',
        7: 'Walk the candidates from most likely to least likely.',
        8: 'Keep this one. Note it is kept before the check, which guarantees the top candidate always survives even if its own probability already exceeds p.',
        9: 'Add its probability to the running total: 0.40, then 0.65, then 0.80, then 0.90.',
        10: 'Stop as soon as the budget is reached or passed.',
        11: 'break leaves the for loop immediately.',
        12: 'Returns the list of surviving positions - four of them for p = 0.9, two for p = 0.5.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Sampling 3: top-k and top-p, side by side (part 2)',
      code: `def show(kept):
    total = sum(probs[i] for i in kept)
    return [(chars[i], round(probs[i] / total, 3)) for i in kept]

print('top-k = 3  ', show([0, 1, 2]))
print('top-p = 0.9', show(keep_top_p(0.9)))
print('top-p = 0.5', show(keep_top_p(0.5)))

# ---- real output ----
# top-k = 3   [('e', 0.5), ('a', 0.312), ('o', 0.187)]
# top-p = 0.9 [('e', 0.444), ('a', 0.278), ('o', 0.167), ('i', 0.111)]
# top-p = 0.5 [('e', 0.615), ('a', 0.385)]`,
      annotations: {
        1: 'Takes a list of surviving positions and reports what the model would actually draw from.',
        2: 'The kept probabilities no longer add to 1, because some were thrown away. This is their true sum: 0.80 for top-k = 3, 0.90 for top-p = 0.9.',
        3: 'Divide each survivor by that sum so the survivors add to 1 again. This step is called renormalising, and without it you are not sampling from a probability distribution at all.',
        5: 'top-k = 3 means positions 0, 1, 2 - the three largest, always exactly three, whatever the numbers look like. 0.40 / 0.80 = 0.5, and the banned characters now have probability exactly 0.',
        6: 'top-p = 0.9 keeps four here, because it took four to reach 0.90 of probability. 0.40 / 0.90 = 0.444.',
        7: 'The same rule with a tighter budget keeps only two. That is the point of top-p: the number of survivors is decided by the numbers, not fixed in advance. When the model is confident it keeps almost nothing else; when the model is unsure it keeps a wide field. top-k cannot do that.',
      },
    },
    { type: 'visual', component: 'NextTokenSampler', props: {} },
    {
      type: 'note',
      md: `Use the sampler above against the numbers you just computed. Three things to do, and what to watch each time.

- **Drag temperature from 1.0 down to 0.2.** Watch the top bar swell and the tail bars collapse toward nothing. Below about 0.3 the choice is effectively fixed, which is what you want for code or extraction, and what makes prose repeat.
- **Drag temperature from 1.0 up to 1.5.** Watch the bars level out. The rare candidates - the equivalent of \`z\` at 0.068 - are now drawn often enough that a long passage will certainly hit one.
- **Set top-k to 3, then switch to top-p = 0.9.** On a confident distribution they overlap; on a flat one top-p keeps far more candidates than top-k does. That adaptivity is why top-p is the common default today, usually with temperature between 0.7 and 1.0.
- The order matters and is fixed: temperature first, then truncation, then renormalise, then draw.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Sampling 4: the generation loop in PyTorch (illustrative)',
      code: `@torch.no_grad()
def generate(model, idx, max_new_tokens, temperature=1.0):
    model.eval()
    for _ in range(max_new_tokens):
        idx_cond = idx[:, -block_size:]
        logits, _ = model(idx_cond)
        logits = logits[:, -1, :] / temperature
        probs = F.softmax(logits, dim=-1)
        idx_next = torch.multinomial(probs, num_samples=1)
        idx = torch.cat((idx, idx_next), dim=1)
    model.train()
    return idx

start = torch.zeros((1, 1), dtype=torch.long, device=device)
print(decode(generate(model, start, 500, temperature=0.8)[0].tolist()))`,
      annotations: {
        1: 'No gradients during generation - nothing is being learned, and recording would waste a lot of memory over 500 steps.',
        2: 'idx is the context so far, shape (1, current_length). max_new_tokens is how many characters to write.',
        3: 'Dropout off. Generating with dropout on adds random noise to every single character.',
        4: 'One iteration produces exactly one character. _ because the counter is never used.',
        5: 'Keep only the last 128 characters. Miss this and the moment the text passes 128 characters the position table has no row to look up, and PyTorch raises an index error.',
        6: 'Forward pass with no targets, so it returns logits and None.',
        7: 'Two things on one line. logits[:, -1, :] keeps only the LAST position, throwing away perfectly good predictions for characters we already have - sampling from all positions instead of the last is the classic bug here. Then the division by temperature, exactly as computed in the plain-Python snippet above.',
        8: 'Softmax over the last axis turns 65 scores into 65 probabilities summing to 1. dim=-1 means the last axis, the vocabulary one.',
        9: 'multinomial draws one index at random, in proportion to the probabilities. This is the draw, and using argmax here instead is what makes text loop.',
        10: 'Append the new character id to the context, which grows by one. The next pass re-reads everything from scratch - the waste that a KV-cache removes, in a later module.',
        11: 'Dropout back on for whatever training follows.',
        12: 'Returns the prompt plus everything generated.',
        14: 'A starting context of one character, id 0, which in the sorted Shakespeare vocabulary is a newline. The model has no ability to follow instructions; it only continues text.',
        15: '[0] takes the first (only) row, .tolist() turns the tensor into a plain Python list, and decode turns the ids back into characters using itos.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Sampling 5: adding top-k and top-p to that loop',
      code: `        if top_k is not None:
            v, _ = torch.topk(logits, min(top_k, logits.size(-1)))
            logits[logits < v[:, [-1]]] = -float('inf')

        if top_p is not None:
            sorted_logits, sorted_idx = torch.sort(logits, descending=True)
            cum = torch.cumsum(F.softmax(sorted_logits, dim=-1), dim=-1)
            remove = cum > top_p
            remove[..., 1:] = remove[..., :-1].clone()
            remove[..., 0] = False
            logits[remove.scatter(1, sorted_idx, remove)] = -float('inf')`,
      annotations: {
        1: 'These lines go between the temperature line and the softmax line in the previous snippet. Both knobs are optional, so both default to None.',
        2: 'torch.topk returns the k largest values, sorted largest first. min() guards against asking for more candidates than the vocabulary has.',
        3: 'Everything below the k-th largest is set to minus infinity. Not zero: minus infinity goes through exp() to exactly 0, so those characters get probability 0 and the survivors renormalise on their own. That is the same renormalising the show() helper did by hand.',
        5: 'The top-p branch, independent of the one above.',
        6: 'Sort the scores largest first, and keep a record of where each one came from, because the mask has to be sent back to the original order later.',
        7: 'cumsum is the running total - exactly the running variable in the plain-Python version, done for all positions at once.',
        8: 'A true/false mask marking every candidate whose running total has already passed p.',
        9: 'Shift the mask one place right. This is the same trick as keeping a candidate before checking the budget: the candidate that carries the total past p is kept, not banned.',
        10: 'And force the top candidate to survive no matter what, in case its own probability already exceeds p.',
        11: 'scatter maps the flags from sorted order back to vocabulary order, then the banned scores go to minus infinity as before.',
      },
    },
    {
      type: 'intuition',
      title: 'Worked case: one prediction, computed entirely by hand',
      md: `A four-character vocabulary: a, b, c, d. The context is \`"ab"\` and the true next character is \`c\`, which is index 2.

- **Untrained.** All four scores are 0, so all four probabilities are 1/4 = 0.25. Loss = -ln(0.25) = **1.3863**, and ln(4) = 1.3863. The check holds at vocab 4 exactly as it does at vocab 65.
- **After some training** the model outputs scores **[1.0, 0.0, 2.0, -1.0]**.
- exp of each: e¹ = 2.7183, e⁰ = 1.0000, e² = 7.3891, e⁻¹ = 0.3679. Their sum is **11.4752**.
- Divide each by that sum: **[0.2369, 0.0871, 0.6439, 0.0321]**. They add to 1.
- The correct character is index 2, with probability 0.6439. Loss = -ln(0.6439) = **0.4402**. Down from 1.3863 - that is the model having learned something.
- The gradient of this loss with respect to the four scores is simply *probability minus 1 for the correct one, probability itself for the others*: **[0.2369, 0.0871, -0.3561, 0.0321]**. The one negative entry is the correct character, and negative means "push this score up". The other three get pushed down, each in proportion to how much probability it wrongly took.

That last line is the whole of learning in a language model. Everything else on this page is machinery for computing it 8,192 times per step.`,
    },
    {
      type: 'intuition',
      title: 'The classic mistake: the loss sits at exactly 4.174 and never moves',
      md: `Here is the failure, shown before it is explained. You start training and the print-out reads:

- step 0: train 4.1744, val 4.1744
- step 500: train 4.1744, val 4.1744
- step 5000: train 4.1744, val 4.1744

Not a wobble. Not a slow decline. **Exactly** ln(65), forever, to four decimal places.

The tempting reading is "the learning rate is too low" or "it needs more steps". Both are wrong, and here is how you know: a learning rate that is merely too small still moves the number a little, and noise alone would make it wobble in the third decimal. A loss frozen at exactly ln(65) means the model's output distribution is still perfectly uniform - **nothing has been updated at all.**

That narrows it to one of four causes, and you can separate them in under a minute.

- **The parameters never reached the optimizer.** Print \`sum(p.numel() for p in model.parameters())\`. If it is far below 2,715,713, some submodule is invisible. The usual cause is holding submodules in a plain Python list instead of \`nn.ModuleList\` - a plain list is not searched, so those layers get no gradients and are never updated.
- **backward() or step() is missing, or in the wrong order.** \`zero_grad\` then \`backward\` then \`step\`, exactly. If \`zero_grad\` comes after \`backward\`, you erase the gradients you just computed and \`step\` applies nothing.
- **The learning rate is literally 0**, or the whole loop is inside a \`torch.no_grad()\` block - in which case no gradients exist to apply.
- **The optimizer was built from a different model** than the one you are training, for instance because you re-ran the cell that creates \`model\` but not the one that creates \`optimizer\`.

The fastest test is Check 2 from earlier: train on one batch 300 times. If it will not overfit a single batch, stop looking at your data and look at your wiring.`,
    },
    {
      type: 'intuition',
      title: 'What this toy shares with a real model, and what it does not',
      md: `Worth being straight about, because it is what an interviewer probes.

**The same:** the architecture, exactly. Causal self-attention, multiple heads, the pre-norm residual block, the 4x feed-forward, learned position embeddings, next-token cross-entropy, AdamW, and the sampling loop. Every equation is the one a 100-billion-parameter model uses. The parameter accounting is the same formula. The starting-loss check is the same check.

**Not the same, and it matters:**

- **Scale.** 2.7M parameters against 100B-plus, and 1 MB of text against trillions of characters. Behaviour that only appears at scale - following an instruction, using a fact from earlier in the prompt - is simply absent here, and no amount of training will produce it.
- **Tokenizer.** Characters, not sub-words. A real model's token carries roughly four characters, so the same 128-slot window would cover about four times as much text.
- **Training regime.** This model sees the same 1 MB many times and memorises it. A real pretraining run sees most of its data once, which is why dropout is usually set to 0 there and overfitting is not the failure mode.
- **Everything after pretraining.** A model you talk to has been through instruction tuning and preference alignment on top. Those are separate stages, taught later - this file stops at the base model.
- **Systems.** Mixed precision, multi-GPU sharding, gradient accumulation, KV-caching at inference. None of it changes the maths; all of it is what makes the maths finish this year.

The fair summary is that the gap from here to GPT-2 is a compute budget, a tokenizer and a bigger corpus - not a different architecture.`,
    },
    {
      type: 'intuition',
      title: 'Practice problems',
      md: `Do these on paper. Solutions in the next section.

1. A model uses a sub-word tokenizer with a vocabulary of 50,257. What loss should its very first training step print, and why?
2. Keep 6 layers, 6 heads, vocab 65 and context 128, but widen the stream from d = 192 to d = 384. How many parameters does the model have now, and did it roughly double or roughly quadruple?
3. Using the distribution e 0.40, a 0.25, o 0.15, i 0.10, u 0.06, z 0.04: which candidates survive top-p = 0.8, and what are their probabilities after renormalising?
4. Two candidates have scores that differ by 2.0. What probability does the top one get at temperature 1.0, at 0.5, and at 2.0?
5. You change the batch size from 64 to 32 and the context from 128 to 256. How many predictions does one training step now contain, and does the printed loss get bigger or smaller as a result?`,
    },
    {
      type: 'intuition',
      title: 'Worked solutions',
      md: `1. **10.82.** An untrained model is uniform, so the loss is ln(V) = ln(50,257). By hand: ln(50,257) = ln(5.0257) + ln(10,000) = 1.6146 + 9.2103 = 10.8249. Note how much higher this starts than 4.17 - a bigger vocabulary is a harder guess, and the two numbers are not comparable across tokenizers.

2. **10,739,777.** Per block: 12d² = 12 x 147,456 = 1,769,472, plus 3,840 of biases and LayerNorm = 1,773,312. Times 6 = 10,639,872. Embeddings 65 x 384 + 128 x 384 = 24,960 + 49,152 = 74,112. Final LayerNorm 768. lm_head 384 x 65 + 65 = 25,025. Total 10,739,777. That is close to **four times** 2,715,713, not two - the blocks dominate and they scale with d², not d.

3. **e, a, o.** Running total: 0.40, then 0.65, then 0.80, which reaches the 0.8 budget, so it stops. Renormalise by 0.80: 0.40/0.80 = **0.5**, 0.25/0.80 = **0.3125**, 0.15/0.80 = **0.1875**. Same survivors as top-k = 3 here - on this particular distribution the two rules agree, which is exactly why you should never test a sampling change on one distribution.

4. **0.8808, 0.9820, 0.7311.** With two candidates the top probability is 1 / (1 + e^(-difference/T)). At T = 1: 1/(1 + e⁻²) = 0.8808. At T = 0.5 the difference becomes 4: 1/(1 + e⁻⁴) = 0.9820. At T = 2 it becomes 1: 1/(1 + e⁻¹) = 0.7311. Halving the temperature doubles every gap; doubling it halves them.

5. **8,192 predictions - exactly the same**, since 32 x 256 = 8,192 just as 64 x 128 did. The printed loss is an **average** over the predictions in the batch, so changing how they are grouped does not shift it up or down. What does change is that each prediction now has up to 256 characters of context instead of 128, so given enough training the loss should end up slightly lower - not because of the batch shape, but because the model can see further back.`,
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `Four upgrades that cost a few lines each and are the standard next steps.

- **Weight tying.** Make the output projection re-use the token embedding table instead of holding its own copy: \`self.lm_head.weight = self.token_embedding.weight\`. Here it saves 12,480 parameters, which is nothing; with a 50,257-word vocabulary and d = 768 it saves about 38.6 million, which is a third of GPT-2 small. The argument for it is that both tables map between characters and meanings, just in opposite directions.
- **Warmup then cosine decay.** Instead of a fixed learning rate, ramp it up linearly over the first few hundred steps and then let it fall along a cosine curve to near zero. Big-batch transformer training genuinely needs the ramp; without it the first few steps can wreck the initialisation.
- **Gradient clipping.** \`torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)\` between backward and step. It rescales the whole gradient if it grows too large, which is cheap insurance against the one strange batch that turns a week-long run into nan.
- **KV-caching at generation time.** As written, generating character 500 re-processes all 128 context characters from scratch. Because of the causal mask, the internal values for the earlier characters cannot have changed, so they can be stored and reused. That turns each new character from a full pass into a small one. It changes no maths and no output - only speed - and it has its own module later.`,
    },
  ],
  quiz: [
    {
      question: 'get_batch returns x = d[i : i+128] and y = d[i+1 : i+129], for 64 windows at once. How many supervised predictions does one training step contain?',
      options: [
        {
          text: '64 - one prediction per window',
          explanation: 'That would throw away 127 of the 128 predictions each window offers. The model outputs a score vector at every position and the loss uses all of them.',
        },
        {
          text: '8,192 - at every position t of every window, predict the character that follows the first t+1 characters',
          explanation:
            'Correct. 64 x 128 = 8,192. The causal mask is what makes each position a fair question: position t cannot see position t+1.',
        },
        { text: '128 - one per position, shared across the batch', explanation: 'Each of the 64 windows has its own 128 positions; they are independent examples, not shared.' },
      ],
      correct: 1,
    },
    {
      question: 'Inside forward(), why is logits.view(B * T, C) needed before F.cross_entropy?',
      options: [
        { text: 'To copy the tensor so the original is not modified', explanation: '.view() does not copy anything - it re-labels the same numbers with a different shape.' },
        {
          text: 'cross_entropy expects a 2-D table of scores and a 1-D list of correct answers, so (64, 128, 65) must become (8192, 65) and (64, 128) must become (8192,)',
          explanation: 'Correct. Every one of the 8,192 predictions becomes one row of 65 scores with one correct index. Getting it wrong raises a loud shape error.',
        },
        { text: 'To move the class dimension to the front, giving (65, 8192)', explanation: 'That is the wrong way round - cross_entropy wants examples first and classes second.' },
      ],
      correct: 1,
    },
    {
      question: 'Your untrained 65-character model prints its very first loss. What should it be, and what would 0.9 mean?',
      options: [
        {
          text: 'About 4.17, because an untrained model is a uniform guesser and -ln(1/65) = ln(65) = 4.174. A value of 0.9 means something is leaking the answer into the input',
          explanation: 'Correct. It is the cheapest check in the project, and it is arithmetic rather than experience, so it holds on any machine.',
        },
        { text: 'About 0.69, the standard starting loss for any classifier', explanation: 'ln(2) = 0.693 is the two-class case. With 65 classes the uniform loss is ln(65).' },
        { text: 'Close to 0, since the model has not learned to be wrong yet', explanation: 'Backwards: an untrained model is as wrong as it can be. Near-zero loss at step 0 means a bug, usually the targets reaching the input.' },
      ],
      correct: 0,
    },
    {
      question: 'Your loss prints 4.1744 at step 0, 4.1744 at step 500, and 4.1744 at step 5000. What is the most likely cause?',
      options: [
        { text: 'The learning rate is slightly too low', explanation: 'A too-low learning rate still moves the number, and batch noise alone would wobble the last decimals. Frozen to four decimals means no update at all.' },
        {
          text: 'No parameter is being updated - most often submodules held in a plain Python list instead of nn.ModuleList, so the optimizer never saw them',
          explanation:
            'Correct. Exactly ln(65) forever means the output is still uniform. Print the parameter count, and run the one-batch overfit check: if it will not overfit, it is wiring.',
        },
        { text: 'The dataset is too small to learn from', explanation: 'Even a tiny dataset drives the loss down fast, by memorisation. A frozen loss is a plumbing failure, not a data one.' },
      ],
      correct: 1,
    },
    {
      question: 'Given e 0.40, a 0.25, o 0.15, i 0.10, u 0.06, z 0.04 - what does top-p = 0.9 keep, and how does it differ from top-k = 3?',
      options: [
        {
          text: 'It keeps e, a, o and i, because their running total first reaches 0.90 at the fourth candidate; top-k = 3 always keeps exactly three whatever the numbers are',
          explanation:
            'Correct. After renormalising by 0.90 the four become 0.444, 0.278, 0.167, 0.111. top-p adapts to the model\'s confidence; top-k cannot.',
        },
        { text: 'It keeps every candidate with probability above 0.9', explanation: 'That is a per-candidate threshold, which would usually keep nothing at all. top-p is a cumulative budget over the sorted list.' },
        { text: 'It keeps 90% of the candidates, so five of the six', explanation: 'The budget is over probability mass, not over how many candidates there are.' },
      ],
      correct: 0,
    },
    {
      question: 'Your loss falls from 4.17 to 1.6, but the generated text is complete gibberish. Which explanation fits best?',
      options: [
        {
          text: 'The sampling code uses the logits at all T positions instead of only logits[:, -1, :]',
          explanation:
            'Correct. The loss only exercises the forward pass, so a healthy loss with broken output points at the separate sampling code. Earlier positions predict characters you already have, so the text ignores its own context.',
        },
        { text: 'The learning rate was too high', explanation: 'A too-high learning rate shows up in the loss itself - spiky or nan - not as a healthy loss with broken samples.' },
        { text: 'The residual connections are missing', explanation: 'That would damage the loss badly. The symptom described is a good loss with bad output.' },
      ],
      correct: 0,
    },
  ],
  interviewQuestions: [
    {
      question: 'Walk me through the GPT you built, top to bottom, in three minutes.',
      answer:
        'Data first: a text file, one integer per distinct character, 65 of them for Shakespeare, the whole corpus as one long tensor, and a get_batch that returns x and y where y is x shifted right by one - that shift is the entire supervision signal, and a 64 by 128 batch is 8,192 predictions rather than 64. Model: a token table of 65 by 192 plus a learned position table of 128 by 192, added together; then six transformer blocks, each doing x = x + attention(LayerNorm(x)) then x = x + feedforward(LayerNorm(x)); then a final LayerNorm and a linear layer down to 65 scores. Training: AdamW at 3e-4, cross-entropy on the scores reshaped to 8,192 by 65, and a measuring helper that averages 200 batches under no_grad with eval and train bracketing. Generation: crop the context to 128, forward, take the last position only, divide by temperature, optionally truncate with top-k or top-p, softmax, draw one, append, repeat. 2,715,713 parameters. Then I would state the scope myself: it writes Shakespeare-shaped nonsense, and the distance to a real model is scale and tokenizer, not architecture.',
      isCaseBased: false,
    },
    {
      question: 'What sanity checks do you run before letting a language model train overnight?',
      answer:
        'Two, and they take a minute together. First, the initial loss must be about ln(vocab_size). An untrained model spreads its probability evenly, so the loss on the correct token is minus the log of one over V, which is ln V - 4.174 for a 65-character vocabulary, about 10.82 for a 50k sub-word one. If it prints that, the output width, the loss function and the target alignment are all correct at once. A slightly higher number is fine because the initial weights are not exactly zero; a wildly different number, or nan, means stop. Second, overfit a single batch: fetch one batch and train on that same batch a few hundred times. The loss must fall close to zero, because 2.7 million parameters can trivially memorise 8,192 predictions. If it will not, gradients are not reaching some part of the model - usually submodules kept in a plain Python list instead of an nn.ModuleList, or a missing backward or step call. The first check tests the output path, the second tests the gradient path, and between them they catch nearly every silent wiring bug.',
      isCaseBased: false,
    },
    {
      question: 'How many parameters does your model have, and where do they live? Derive it.',
      answer:
        'With d = 192, V = 65, context 128, 6 layers: per block, attention is 3d squared for Q, K and V plus d squared for the output projection, so 4d squared; the feed-forward is d by 4d then 4d by d, so 8d squared; that is 12d squared = 12 x 36,864 = 442,368, plus 1,920 in biases and the two LayerNorms, giving 444,288 per block. Six blocks is 2,665,728. Embeddings: 65 x 192 = 12,480 for tokens and 128 x 192 = 24,576 for positions, so 37,056. Final LayerNorm 384, output projection 192 x 65 + 65 = 12,545. Total 2,715,713. Two points worth making unprompted: the feed-forward holds two-thirds of every block, so "transformers are mostly attention" is false by parameter count; and the attention score matrix is not a parameter at all - at 64 windows, 128 positions and 6 heads it is 6.3 million temporary numbers per block per step, which is why memory limits your batch size long before it limits your parameter count.',
      isCaseBased: false,
    },
    {
      question: 'Explain temperature, top-k and top-p, with numbers, and say when you would use each.',
      answer:
        'All three act on the output distribution at generation time; none of them touches a weight. Take a concrete distribution: e 0.40, a 0.25, o 0.15, i 0.10, u 0.06, z 0.04. Temperature divides the scores before softmax. At 0.5 that distribution becomes 0.615, 0.240, 0.086, 0.038, 0.014, 0.006 - sharper. At 1.5 it becomes 0.318, 0.232, 0.165, 0.126, 0.090, 0.068 - flatter, and the worst candidate has nearly doubled its chances. Temperature reshapes but never bans, so over a thousand steps the tail still gets drawn. top-k bans everything outside the k best: k = 3 keeps e, a and o, renormalised to 0.5, 0.3125, 0.1875. It is fixed regardless of whether the model is certain or not. top-p keeps the fewest candidates whose probabilities reach p: at 0.9 that is four candidates here, at 0.5 it is two. That adaptivity is the reason top-p is the usual default, typically with temperature between 0.7 and 1.0. For code, extraction, or anything with one right answer, use a low temperature or greedy. They compose in a fixed order: temperature, then truncation, then renormalise, then draw.',
      isCaseBased: false,
    },
    {
      question: 'Why draw randomly from the distribution instead of always taking the most likely next character?',
      answer:
        'Because the locally most likely character, chosen again and again, does not give the most likely sentence. Greedy decoding is deterministic, so the same context always produces the same continuation, and it reliably finds a high-probability cycle and never escapes - the repeated-phrase failure everyone has seen. Sampling feeds the model\'s own uncertainty back into the text, which breaks those loops and produces the variety that reads as language. The cost is that a random draw sometimes lands in the tail, where the nonsense lives, and one bad character corrupts everything generated after it since it becomes part of the context. That is exactly the problem top-k and top-p solve: delete the tail, keep the randomness among the plausible candidates. Where greedy is genuinely right: code completion, extraction, classification - tasks with a single correct answer, where variety is a defect rather than a feature.',
      isCaseBased: false,
    },
    {
      question: 'Case: you train the model, the loss falls from 4.17 to 1.6, but the generated text is complete gibberish. Debug it.',
      answer:
        'A healthy loss with broken samples localises the bug immediately: the loss only exercises the forward pass, and generation is separate code, so suspect the sampling path first. In order of likelihood. One, are you taking logits[:, -1, :]? Sampling from all positions is the single most common cause and produces exactly this symptom, because the earlier positions are predicting characters you already have. Two, is the decoder the exact inverse of the encoder - same sorted vocabulary, same tables? A vocabulary rebuilt in a different order after reloading turns valid ids into noise. Three, is model.eval() set, so dropout is not injecting noise into every character? Four, is the context cropped to the last block_size characters, and do positions still start at zero after the crop? Five, is temperature sane - a temperature of 10 makes any model look untrained. Only then suspect the model itself, and the test for that is to generate with temperature 0.1 and top_k = 1, which is effectively greedy: if that produces repetitive but legible English, the model is fine and it was a sampling knob all along. The order matters because the cheap checks eliminate most cases before you touch the architecture.',
      isCaseBased: true,
    },
    {
      question: 'Case: your training loss keeps falling but validation loss bottoms out at step 1,500 and then rises. What do you do, and what do you not do?',
      answer:
        'That is overfitting, and at this scale it is expected rather than surprising: 2.7 million parameters against 1 MB of text is roughly one parameter per 0.4 characters, so the model has more than enough room to memorise a real fraction of the corpus. What I do, in order of value: get more data, which is the only fix that raises the ceiling rather than lowering the model; raise dropout from 0.1 to 0.2 and re-run; add weight decay through AdamW, 0.1 being the usual transformer setting; keep the checkpoint at the validation minimum and stop there, which is free and should be automatic; and only if the data really is fixed, shrink the model. What I do not do: train longer hoping it recovers, or judge the run by how good the samples look, because memorised Shakespeare reads better than generalised Shakespeare and will fool you completely. Worth saying explicitly that this failure mode is a property of the dataset size, not a bug in the code - at real pretraining scale, where the model sees most tokens roughly once, it largely disappears and dropout is often set to zero.',
      isCaseBased: true,
    },
    {
      question: 'Case: an interviewer says "everyone has cloned a from-scratch GPT. Convince me you understand what you built."',
      answer:
        'Do not defend, demonstrate - with things only someone who wrote it would say. Three mechanisms and one scar. Mechanism one: the first loss must be ln(V), 4.174 for 65 characters, because an untrained model is a uniform guesser - which also tells you the loss is in nats and that perplexity is e to the loss. Mechanism two: parameter accounting, 12d squared per block of which two-thirds is the feed-forward, and the attention score matrix is temporary memory rather than weights, which is why batch size hits a wall before parameter count does. Mechanism three: the residual stream is a running total that every sublayer adds to and none replaces, which is what lets the gradient reach the first layer undamaged and what lets you stack six blocks with one line of code. Scar: the loss frozen at exactly 4.1744 for 5,000 steps because the attention heads sat in a plain Python list, so the optimizer never saw them - the parameter count was the thing that found it, and now I print that count before every run. Then volunteer the boundary yourself: 2.7 million parameters on 1 MB of text writes Shakespeare-shaped nonsense, and the gap to a real model is compute and tokenizer, not architecture. Naming the limit is what makes the rest believable.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    {
      front: 'The entire supervision signal in a GPT',
      back: 'y = x shifted right by one character. A 64 x 128 batch is 64 x 128 = 8,192 supervised next-character predictions, not 64.',
    },
    {
      front: 'Sanity check 1: the first loss',
      back: 'It must be about ln(vocab_size), because an untrained model guesses uniformly. 65 characters gives ln 65 = 4.1744. Perplexity is e^loss, so 4.1744 means "a fair 65-sided die".',
    },
    {
      front: 'Sanity check 2: overfit one batch',
      back: 'Train on one single batch a few hundred times; the loss must approach 0. If it will not, gradients are not reaching every parameter - usually submodules in a plain list instead of nn.ModuleList.',
    },
    {
      front: 'Loss frozen at exactly ln(vocab) forever',
      back: 'Nothing is being updated. Check the parameter count, check zero_grad then backward then step in that order, check the learning rate is not 0, check the optimizer was built from this model.',
    },
    {
      front: 'The cross-entropy reshape',
      back: 'logits (B, T, C) -> view(B*T, C); targets (B, T) -> view(B*T). Examples first, classes second. For 64 x 128 that is 8,192 rows of 65.',
    },
    {
      front: 'Parameters per block, and the 2.7M total',
      back: '12d²: attention 4d² (3d² for Q/K/V plus d² projection) and feed-forward 8d². The feed-forward is two-thirds. d=192, 6 layers, V=65, T=128 gives 2,715,713 in total.',
    },
    {
      front: 'The generation loop, in order',
      back: 'Crop to block_size -> forward -> keep logits[:, -1, :] only -> divide by temperature -> optional top-k or top-p -> softmax -> draw one at random -> append -> repeat.',
    },
    {
      front: 'Temperature vs top-k vs top-p, on e .40 a .25 o .15 i .10 u .06 z .04',
      back: 'T=0.5 sharpens to .615/.240/.086/...; T=1.5 flattens to .318/.232/.165/... top-k=3 keeps e,a,o (.5/.312/.187). top-p=0.9 keeps e,a,o,i (.444/.278/.167/.111) - the count adapts to confidence.',
    },
  ],
  mindmapMarkdown: `- CAPSTONE: Code a GPT from Scratch
  - What exists at the end
    - one file, ~120 lines of code
    - 6 layers, 6 heads, d=192, context 128
    - 2,715,713 parameters, ~11 MB checkpoint
    - output: Shakespeare-shaped nonsense
  - Stage 1: data and batching
    - one integer per distinct character, vocab 65
    - corpus as one long tensor, 90/10 split by position
    - y = x shifted by ONE
    - 64 x 128 = 8,192 predictions per step
  - Stage 2: the block (re-used, not re-taught)
    - MultiHeadAttention + FeedForward
    - x = x + sa(ln1(x)); x = x + ffwd(ln2(x))
    - shape in = shape out, so depth is one integer
  - Stage 3: the stack
    - token table 65 x 192 + position table 128 x 192, ADDED
    - six blocks
    - final LayerNorm
    - lm_head 192 -> 65 logits
  - Stage 4: the loss
    - softmax, then -ln(probability of the correct char)
    - averaged over all 8,192 predictions
    - reshape to (B*T, C) and (B*T,)
  - The two checks before training
    - first loss = ln(vocab) = 4.1744
    - overfit ONE batch to near 0
  - Stage 5: the training loop
    - AdamW lr 3e-4
    - estimate_loss under no_grad, eval/train bracket
    - zero_grad -> backward -> step
  - Stage 6: sampling
    - greedy: always the top, loops forever
    - temperature: divide scores, sharpen or flatten
    - top-k: keep k best, fixed
    - top-p: keep smallest set reaching p, adaptive
    - take logits[:, -1, :] ONLY
  - Classic failure
    - loss stuck at exactly ln(vocab) = nothing updates
    - plain list instead of nn.ModuleList
    - missing backward/step or wrong order
  - Toy vs real
    - same: architecture, loss, sampling, arithmetic
    - different: scale, tokenizer, one-pass data, alignment, systems`,
}

export default m
