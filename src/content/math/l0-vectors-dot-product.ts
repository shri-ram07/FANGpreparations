import type { Module } from '../types'

const m: Module = {
  id: 'math-l0-vectors-dot-product',
  subjectId: 'math',
  level: 0,
  title: 'Vectors & the Dot Product (= Similarity)',
  whyItMatters:
    'A vector is a list of numbers, and the dot product is one line of arithmetic you do on two of them. That one line is how a search engine decides which document matches your query, how a recommender decides which film you will like, and how every layer of every large language model decides which words to pay attention to. This module builds it from zero: two small lists of numbers, multiplied and added by hand, then the same answer produced a second way out of two lengths and an angle. Nothing here needs any machine learning background.',
  assumes: [
    'You know what a square root is, and what squaring a number means',
    'You have seen a graph with an x-axis and a y-axis, and can plot the point (3, 4) on it',
    'You remember Pythagoras: in a right-angled triangle, the long side squared equals the sum of the squares of the other two sides',
    'You have seen a Python list, a for loop, and a function definition',
    'No machine learning, no calculus, no numpy. Every term used here is defined here.',
  ],
  estMinutes: 40,
  sections: [
    {
      type: 'intuition',
      title: 'A vector is a list of numbers',
      md: `Write down three steps right and four steps up: **[3, 4]**. That is a vector. There is nothing else to it — a vector is an ordered list of numbers.

- Because there are two numbers, you can draw it. Put your pencil at the origin, the point (0, 0). Go 3 steps right along the x-axis, then 4 steps up. Draw an arrow from the origin to where you landed. That arrow *is* [3, 4].
- The order matters. [3, 4] and [4, 3] are different arrows pointing in different directions.
- Each number in the list is called a **component**. [3, 4] has two components: its first component is 3, its second is 4.
- A vector does not have to have two components. A flat can be described as **[2, 850, 4]** — 2 bedrooms, 850 square feet, 4 km from the office. Three numbers, three components, one vector.
- You cannot easily draw [2, 850, 4], and that is fine. Every rule in this module is arithmetic on the components, so it works for a list of 3 numbers, or 768 of them, exactly as it works for 2.

The habit to build: **think in 2 components because you can see them, compute with any number of components because the arithmetic never changes.**`,
    },
    {
      type: 'intuition',
      title: 'How long is a vector? Pythagoras, and nothing else',
      md: `The arrow [3, 4] starts at the origin and ends at the point (3, 4). How long is it?

- Draw the right-angled triangle: 3 across, then 4 up, and the arrow itself is the slanted long side.
- Pythagoras: the long side squared equals 3² + 4² = 9 + 16 = 25. So the long side is the square root of 25, which is **5**.
- That number, 5, is the **magnitude** of the vector, also called its **length** or its **norm**. All three words mean the same thing. It is written with double bars: ‖a‖ = 5.
- The recipe in words: **square every component, add them all up, take the square root**. For [3, 4] that is sqrt(9 + 16) = 5.
- The recipe does not care how many components there are. For [1, 2, 2] it is sqrt(1 + 4 + 4) = sqrt(9) = **3**.
- A length is never negative. Squaring removes the minus signs, so ‖[−3, −4]‖ is also 5. That arrow points the opposite way, but it is just as long.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 1: the length of a vector, with a for loop',
      code: `a = [3, 4]

total = 0
for x in a:
    total = total + x * x

length_a = total ** 0.5
print(total)
print(length_a)

# ---- real output ----
# 25
# 5.0`,
      annotations: {
        1: 'A plain Python list holding the two components. This is literally the vector — no special type, no library.',
        3: 'A running total, starting at zero. It will collect the squares.',
        4: 'Walk through the list one component at a time. On the first pass x is 3, on the second x is 4.',
        5: 'x * x is that component squared, and we add it to the running total. After both passes total is 9 + 16 = 25.',
        7: '** is Python\'s power operator, and raising to the power 0.5 is exactly the same as taking a square root. So this line is sqrt(25).',
        8: 'Prints the sum of squares, 25 — the number sitting under the square root sign.',
        9: 'Prints the length, 5.0. Python shows 5.0 rather than 5 because the power operation produced a decimal number.',
      },
    },
    {
      type: 'intuition',
      title: 'The dot product: multiply matching slots, add the results',
      md: `Take two vectors with the same number of components, a = **[2, 1]** and b = **[3, 2]**. The **dot product** of a and b, written a · b, is computed like this, by hand, right now:

- Line them up. The first component of a is 2, the first component of b is 3. Multiply: 2 × 3 = **6**.
- The second component of a is 1, the second of b is 2. Multiply: 1 × 2 = **2**.
- Add the results: 6 + 2 = **8**. So a · b = 8.
- That is the whole operation. Multiply matching slots, add everything up. Two vectors go in and **one single number comes out** — not a vector, a plain number.
- It works at any size, as long as both lists are the same size: [2, 1, 0, 1] · [3, 2, 0, 1] = 6 + 2 + 0 + 1 = **9**.
- If the two lists have different sizes there is nothing to multiply the leftover slots by, so the dot product is simply undefined. That is a bug in your code, not a small number.`,
    },
    {
      type: 'intuition',
      title: 'What the answer means: the sign already tells you something',
      md: `The dot product is not just arithmetic. Its value says how the two arrows point relative to each other. Here are three pairs, each computed by hand, each easy to picture.

- **Pointing the same way.** a = [2, 1], b = [3, 2]. Both arrows go right and up. a · b = 6 + 2 = **8**, comfortably positive.
- **At a right angle.** a = [3, 4] goes up and right. b = [4, −3] goes right and down. a · b = 3×4 + 4×(−3) = 12 − 12 = **0**. Exactly zero.
- **Pointing opposite.** a = [2, 1] and b = [−2, −1], which is a turned around. a · b = −4 − 1 = **−5**, negative.

Read those three results as one rule:

- **Large and positive** = the arrows point roughly the same way. They agree.
- **Zero** = the arrows sit at a right angle. They neither agree nor disagree. The word for this is **orthogonal**, which is the mathematician\'s word for perpendicular.
- **Negative** = the arrows point roughly opposite ways. They disagree.

So one number, produced by multiplying and adding, answers the question "do these two things point the same way?"`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 2: the dot product, and the three cases above',
      code: `def dot(u, v):
    total = 0
    for i in range(len(u)):
        total = total + u[i] * v[i]
    return total

print(dot([2, 1], [3, 2]))
print(dot([3, 4], [4, -3]))
print(dot([2, 1], [-2, -1]))

# ---- real output ----
# 8
# 0
# -5`,
      annotations: {
        1: 'Defines a function taking two lists, u and v, which must be the same length. Every later snippet reuses this function.',
        2: 'A running total starting at zero, exactly as in step 1.',
        3: 'len(u) is how many components there are — 2 here — so range(len(u)) gives i = 0, then 1. i is the slot number, and Python counts slots from 0.',
        4: 'u[i] and v[i] are the two components sitting in the same slot. Multiply them and add to the total. This single line is the whole definition of the dot product.',
        5: 'Hand back the accumulated number. One number out, never a list.',
        7: 'The same-direction pair. Prints 8, matching the hand calculation 6 + 2.',
        8: 'The right-angle pair. Prints 0 — not a rounded 0, an exactly-zero 12 − 12.',
        9: 'The opposite pair. Prints -5, and the minus sign is the whole message: these two arrows disagree.',
      },
    },
    {
      type: 'intuition',
      title: 'The same number, computed a completely different way',
      md: `Here is the fact that makes the dot product useful rather than merely convenient. A **second** formula produces the exact same number out of completely different ingredients: the two lengths, and the angle between the arrows.

The **angle between two vectors** is what you would measure with a protractor at the origin, between the two arrows. Call it θ (theta). The second formula is **a · b = ‖a‖ × ‖b‖ × cos θ**.

Check it by hand on one pair, both ways, and get the same number twice. Take **a = [4, 0]** and **b = [3, 4]**.

- **Way 1, multiply matching slots.** 4 × 3 = 12, and 0 × 4 = 0. Add them: **a · b = 12**.
- **Way 2, lengths and angle.** ‖a‖ = sqrt(16 + 0) = **4**. ‖b‖ = sqrt(9 + 16) = **5**.
- Now the angle, with no dot product involved. a lies flat along the x-axis, so θ is simply how far b is tilted above the x-axis. Drop b onto its right triangle: 3 across, 4 up, slanted side 5. From school trigonometry the cosine of an angle is the side next to it divided by the long side, so **cos θ = 3/5 = 0.6**.
- Put them together: ‖a‖ × ‖b‖ × cos θ = 4 × 5 × 0.6 = **12**.

Twelve both times. The two recipes never disagree, on any pair, at any size. That equivalence is the heart of this module, because it lets you read a plain multiply-and-add as a statement about geometry: **‖a‖ and ‖b‖ say how big the two things are, and cos θ says how much they agree on direction.**

- cos θ = 1 when θ = 0°, the arrows lie on top of each other. Maximum agreement.
- cos θ = 0 when θ = 90°, a right angle. That is the orthogonal case, and it is why the dot product came out 0 earlier.
- cos θ = −1 when θ = 180°, the arrows point exactly opposite. Maximum disagreement.
- cos θ never leaves the range −1 to 1, so all the direction information is squeezed into that one factor.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 3: both formulas, same pair, same answer',
      code: `import math

def length(v):
    return math.sqrt(dot(v, v))

a = [4, 0]
b = [3, 4]
cos_theta = dot(a, b) / (length(a) * length(b))
angle = math.degrees(math.acos(cos_theta))
print(dot(a, b))
print(length(a), length(b))
print(round(cos_theta, 4), round(angle, 2))
print(length(a) * length(b) * cos_theta)

# ---- real output ----
# 12
# 4.0 5.0
# 0.6 53.13
# 12.0`,
      annotations: {
        1: 'math ships with Python — nothing to install. It gives us sqrt, acos and degrees.',
        3: 'A function for the length of one vector, reusing dot from step 2.',
        4: 'dot(v, v) multiplies every component by itself and adds the results, which is exactly the sum of squares. The square root of that is the length — the step 1 recipe in one line.',
        6: 'a lies flat along the x-axis: 4 across, 0 up.',
        7: 'b is the 3-across, 4-up arrow whose length is 5.',
        8: 'Rearranged from a · b = ‖a‖‖b‖cos θ: divide the dot product by both lengths and what is left is cos θ. Here 12 / (4 × 5) = 0.6, the same 3/5 the triangle gave.',
        9: 'acos is the reverse of cos: hand it a cosine, get the angle back, measured in radians. math.degrees converts radians into the degrees you are used to.',
        10: 'Prints 12 — way 1, multiply matching slots and add.',
        11: 'Prints the two lengths, 4.0 and 5.0.',
        12: 'Prints cos θ = 0.6 and the angle it corresponds to, 53.13 degrees. round(x, 4) trims decimals so the output stays readable.',
        13: 'Prints ‖a‖ × ‖b‖ × cos θ = 12.0 — way 2, and the same number as line 10. The two formulas agree.',
      },
    },
    {
      type: 'math',
      intro: 'The same three facts in symbols. The subscript i means "the component in slot i", and n is how many components the vectors have.',
      latex: [
        'a \\cdot b = a_1 b_1 + a_2 b_2 + \\cdots + a_n b_n',
        'a \\cdot b = \\|a\\| \\, \\|b\\| \\cos\\theta \\qquad \\text{where } \\|a\\| = \\sqrt{a_1^2 + \\cdots + a_n^2}',
        '\\cos\\theta = \\frac{a \\cdot b}{\\|a\\| \\, \\|b\\|} \\qquad \\text{(this is called cosine similarity)}',
      ],
    },
    { type: 'visual', component: 'VectorPlayground', props: {} },
    {
      type: 'note',
      md: `Use that panel deliberately, not idly. There are two arrowheads, one for a and one for b; drag either one and the readout under the picture updates. Three things to do, in order. **One:** drag b until it lies almost on top of a. Watch the dot product grow large and positive while the angle shrinks toward 0°. **Two:** now swing b around until the dot product reads **0** — stop there and look at the picture. The two arrows sit at a right angle and the angle readout says 90. That is orthogonality, seen rather than asserted. **Three:** keep swinging past that point. The dot product turns negative the instant the angle passes 90°, and the shadow of b — the dashed line the checkbox turns on — flips to the wrong side of the origin. That shadow is the projection, explained two sections below.`,
    },
    {
      type: 'intuition',
      title: 'Unit vectors: keeping the direction, throwing away the length',
      md: `Divide every component of a vector by that vector\'s own length and you get a **unit vector**: an arrow pointing in exactly the same direction, but with length exactly 1.

- [3, 4] has length 5. Divide both components by 5: **[0.6, 0.8]**.
- Check it really is length 1: sqrt(0.6² + 0.8²) = sqrt(0.36 + 0.64) = sqrt(1) = **1**. It worked.
- Dividing every component by the same positive number cannot rotate the arrow — it only makes it shorter or longer. So the direction is untouched and only the length changed.
- This operation is called **normalizing** the vector. That is the entire meaning of the word: divide by your own length.
- Why do it: it separates *which way* a vector points from *how big* it is. Very often only "which way" carries the meaning you care about.
- A unit vector is often written with a small hat: â, said "a-hat".`,
    },
    {
      type: 'intuition',
      title: 'Cosine similarity, and why embeddings use it instead of raw distance',
      md: `First, one word you will need. An **embedding** is a list of numbers a model produces to stand for a piece of text. Similar sentences get similar lists. That is all you need here — embeddings are vectors, so everything above applies to them unchanged.

Now the problem. Suppose you compare a query to two documents using the raw dot product. A long document has more words, so its embedding tends to hold bigger numbers, so it has a bigger length. And a · b = ‖a‖ ‖b‖ cos θ says the score is *multiplied* by that length. So the long document scores high against **everything**, including queries it has nothing to do with. Its size is masquerading as relevance.

The fix is to divide both lengths back out:

- **Cosine similarity** = a · b divided by (‖a‖ × ‖b‖). Look at the second formula: dividing by both lengths leaves exactly **cos θ**. Nothing but the angle survives.
- So cosine similarity always sits between −1 and 1, whatever the vectors\' sizes. 1 means same direction, 0 means orthogonal, −1 means opposite.
- That is why it beats raw distance for comparing embeddings: **a document\'s length is mostly an accident of how much text it contained, while its direction is what the text is about.** Cosine drops the accident and keeps the meaning.
- Raw distance — "how far apart are the two arrow tips?" — has the same flaw for the same reason: a long arrow lands far from everything, including things it points straight at.
- The equivalent shortcut that production systems actually use: normalize every vector once, when you store it. Both lengths are then 1, so the plain dot product **is** the cosine, with no division at query time.

One honest exception. If length is real information rather than an accident, do not throw it away. In a recommender a popular item genuinely deserves to score higher for more people, and its vector length is often where that popularity ended up stored.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 4: three toy documents, where the raw dot product gets it wrong',
      code: `def cosine(u, v):
    return dot(u, v) / (length(u) * length(v))

d1 = [2, 1, 0, 1]
d2 = [3, 2, 0, 1]
d3 = [4, 0, 6, 2]

print(dot(d1, d2), dot(d1, d3), dot(d2, d3))
print(round(cosine(d1, d2), 3), round(cosine(d1, d3), 3), round(cosine(d2, d3), 3))

# ---- real output ----
# 9 10 14
# 0.982 0.546 0.5`,
      annotations: {
        1: 'Cosine similarity, written straight from the formula: the dot product with both lengths divided out.',
        2: 'Reuses dot and length from the earlier steps. Nothing new happens here — it is one division.',
        4: 'A four-number toy embedding standing for "a cat sits on the mat".',
        5: 'A toy embedding for "a kitten rests on a rug" — different words, same meaning as d1, so this is the pair we want judged most similar.',
        6: 'A toy embedding for a long finance report. Unrelated topic, but notice the numbers are bigger: its length is sqrt(16 + 0 + 36 + 4) = sqrt(56) = 7.48, three times d1\'s 2.45.',
        8: 'Raw dot products. The output 9 10 14 says the d2-d3 pair (14) beats the d1-d2 pair (9), so the finance report is ranked the best match for both sentences. Wrong answer, caused entirely by its size.',
        9: 'The same three pairs by cosine. Now d1-d2 scores 0.982 and everything involving d3 drops to about 0.5. Divide the lengths out and the meaning comes back.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 5: normalize once, and the plain dot product becomes the cosine',
      code: `def unit(v):
    n = length(v)
    out = []
    for x in v:
        out.append(x / n)
    return out

u1 = unit(d1)
u2 = unit(d2)
print(round(length(u1), 6))
print(round(dot(u1, u2), 3))
print(round(cosine(d1, d2), 3))

# ---- real output ----
# 1.0
# 0.982
# 0.982`,
      annotations: {
        1: 'Turns any vector into a unit vector — same direction, length 1.',
        2: 'Measure the vector\'s own length first and remember it in n.',
        3: 'An empty list that will collect the divided components.',
        4: 'Walk through the components one at a time.',
        5: 'append adds one item to the end of a list. Here we add the component divided by the length. Every component is divided by the same n, so the direction cannot change.',
        6: 'Hand back the new list — the normalized vector.',
        8: 'Normalize d1. Its components 2, 1, 0, 1 each get divided by its length 2.449.',
        9: 'Normalize d2 the same way.',
        10: 'Prints 1.0: re-measuring the normalized vector confirms its length really is exactly 1.',
        11: 'The plain dot product of the two unit vectors: 0.982. No division happens in this step at all.',
        12: 'The cosine of the two ORIGINAL vectors: also 0.982. Identical, which is the point — normalize once when storing, and every later comparison is a bare multiply-and-add.',
      },
    },
    {
      type: 'intuition',
      title: 'Projection: the shadow one vector casts on another',
      md: `You met the dashed shadow in the interactive panel. Here is what it is.

Shine a light straight down onto the line b lies along. The shadow a casts on that line has a length, and that length is **a · b divided by ‖b‖**.

- In words: **how much of a points along b**. If a is aimed straight down b\'s line, the shadow is the whole of a. If a is at a right angle to b, the shadow has length 0 — none of a points along b.
- Check it on numbers. a = [3, 4], b = [4, 0]. a · b = 12, ‖b‖ = 4, so the shadow is 12/4 = **3**. Picture it: b lies flat along the x-axis, and the part of a lying along the x-axis is its first component, 3. Correct.
- The name for this shadow is the **projection** of a onto b.
- If b happens to be a unit vector then ‖b‖ = 1, and the formula collapses to plain **a · b**. One more reason unit vectors are worth the trouble.
- So the dot product and the projection are one idea wearing two hats: the dot product is the shadow length, scaled up by how long b is.`,
    },
    {
      type: 'math',
      intro: 'The shadow, first as a plain length and then as an arrow lying along b.',
      latex: [
        '\\text{shadow length} = \\frac{a \\cdot b}{\\|b\\|} \\qquad \\text{shadow as a vector} = \\frac{a \\cdot b}{\\|b\\|^2}\\, b',
      ],
    },
    {
      type: 'intuition',
      title: 'Worked case: ranking three help-desk articles by hand',
      md: `A user searches for **"reset my password"**. Three articles sit in the index. Every vector below has four slots, and to keep the arithmetic small, read the slots as how much each text is about [login, password, billing, shipping].

- Query q = **[1, 2, 0, 0]**.
- Article A, a short password-reset guide: **[1, 3, 0, 0]**.
- Article B, a short billing FAQ: **[0, 0, 3, 1]**.
- Article C, a long combined handbook covering everything: **[4, 4, 5, 5]**.

**Raw dot products, by hand.**

- q · A = 1×1 + 2×3 + 0 + 0 = 1 + 6 = **7**.
- q · B = 0 + 0 + 0 + 0 = **0**.
- q · C = 1×4 + 2×4 + 0×5 + 0×5 = 4 + 8 = **12**.
- Ranking by raw dot product: **C (12), then A (7), then B (0)**. The handbook wins. It should not — the user wanted the password guide.

**Now the lengths.**

- ‖q‖ = sqrt(1 + 4) = sqrt(5) = 2.236.
- ‖A‖ = sqrt(1 + 9) = sqrt(10) = 3.162.
- ‖C‖ = sqrt(16 + 16 + 25 + 25) = sqrt(82) = 9.055. C is nearly three times as long as A, purely because it is a longer document.

**Cosine similarity, by hand.**

- cos(q, A) = 7 / (2.236 × 3.162) = 7 / 7.071 = **0.990**.
- cos(q, C) = 12 / (2.236 × 9.055) = 12 / 20.248 = **0.593**.
- cos(q, B) = 0 divided by anything = **0**. Zero means orthogonal: the billing FAQ and this query share no direction at all, which is exactly right.
- Ranking by cosine: **A (0.990), then C (0.593), then B (0)**. The password guide wins, and it wins by a wide margin.

Same three articles, same arithmetic, two different winners. The difference is entirely C\'s length, 9.055 against A\'s 3.162. Multiply by it and C climbs; divide it out and C falls back to where it belongs.`,
    },
    {
      type: 'intuition',
      title: 'The classic mistake, walked into on purpose',
      md: `A team ships search over their documentation. They embed every page, they embed the query, and they rank by the raw dot product because it is the fastest thing their database offers. Testing looked fine. In production, users complain that the same three enormous pages come back for every single query.

- The diagnosis in one line: **a · b = ‖a‖ ‖b‖ cos θ, and they left ‖b‖ in.** A 40-page document has a long vector. Length multiplies the score. So it outranks a short, perfect answer.
- Watch it happen on the numbers from the worked case. Article C had cos θ = 0.593 against the query — genuinely a mediocre match. But its length 9.055 multiplied that mediocre agreement up to 12, beating article A\'s excellent 0.990 agreement, because A is short and its length only multiplied it up to 7.
- Notice what is **not** wrong. The embeddings are fine. The dot product computed the correct number. The model is fine. The only wrong thing is that the score being ranked on contains a factor — document size — that has nothing to do with relevance.
- The mistake is easy to make because raw dot product and cosine agree on toy tests. If all your test documents are roughly the same size, the length factor is roughly constant across them and cancels out of the comparison. It only breaks when real, uneven documents arrive.
- The fix is one line: normalize every vector when you store it, and normalize the query too. Then every length is 1, the raw dot product **is** the cosine, and you keep the speed while losing the bias.

The general form of the mistake, worth carrying beyond this module: **before you rank on a number, ask what that number is a product of.** If one of the factors is something you do not care about, it will quietly dominate the ranking as soon as it starts to vary.`,
    },
    {
      type: 'intuition',
      title: 'Practice problems',
      md: `Do these on paper first. The arithmetic is small on purpose and every square root is a friendly one.

1. For a = **[6, 8]**: compute ‖a‖, write down the unit vector â, then verify by hand that ‖â‖ = 1.
2. For a = **[1, 2, 2]** and b = **[3, 0, 4]**: compute a · b, ‖a‖, ‖b‖, and the cosine similarity. Are they pointing more the same way, or more differently?
3. Find a number k that makes **[2, k]** orthogonal to **[6, 3]**. Show the dot product really is zero.
4. Take a = **[1, 0]** and b = **[10, 0]**. Compute a · b and the cosine similarity. Explain in one sentence why the two numbers are so far apart, and which one you would rank documents by.
5. Take c = **[1, 1]** and d = **[−1, 1]**. Compute c · d, both lengths, and the angle between them in degrees. Then say what the sign of c · d told you before you computed the angle.`,
    },
    {
      type: 'intuition',
      title: 'Worked solutions',
      md: `Check every step against your own working, not just the last number.

1. ‖a‖ = sqrt(36 + 64) = sqrt(100) = **10**. Divide both components by 10: â = **[0.6, 0.8]**. Check: sqrt(0.36 + 0.64) = sqrt(1) = **1**. Notice this is the same unit vector [3, 4] gave — because [6, 8] is just [3, 4] made twice as long, and normalizing deletes exactly that difference.
2. a · b = 1×3 + 2×0 + 2×4 = 3 + 0 + 8 = **11**. ‖a‖ = sqrt(1 + 4 + 4) = sqrt(9) = **3**. ‖b‖ = sqrt(9 + 0 + 16) = sqrt(25) = **5**. Cosine = 11 / (3 × 5) = 11/15 = **0.733**. Well above 0 and well below 1, so they point broadly the same way but are far from identical — about 43 degrees apart.
3. The dot product is 2×6 + k×3 = 12 + 3k. Set it to zero: 3k = −12, so **k = −4**. Check: [2, −4] · [6, 3] = 12 − 12 = **0**. Sketch it if you like: [6, 3] leans right and slightly up, [2, −4] leans right and steeply down, and they meet at a right angle.
4. a · b = 1×10 + 0×0 = **10**. ‖a‖ = 1 and ‖b‖ = 10, so cosine = 10 / (1 × 10) = **1**. They differ because b is ten times as long as a while pointing in precisely the same direction: the raw dot product is reporting that length, the cosine is reporting the perfect agreement. For ranking documents you want the cosine — a document is not a better answer for being ten times longer.
5. c · d = 1×(−1) + 1×1 = −1 + 1 = **0**. ‖c‖ = sqrt(2) = 1.414 and ‖d‖ = sqrt(2) = 1.414. Cosine = 0 / 2 = 0, and the angle whose cosine is 0 is **90 degrees**. The sign gave you the answer in advance: a dot product of exactly zero means orthogonal, so you knew it was a right angle before touching a square root.`,
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `Everything above stands on its own. This section only names ideas you will meet later, so the words are not new when you get there.

- **Attention inside a language model.** Each word is turned into two vectors, and the score saying how much word 5 should listen to word 2 is one dot product between them. A whole attention layer is that same multiply-and-add run for every pair of words at once. You will meet the machinery in the GenAI modules; the arithmetic is what you did in step 2.
- **Why orthogonality is prized.** Two orthogonal directions carry information that does not overlap — knowing where something sits along one tells you nothing about the other. That is the requirement behind PCA, a method that finds a few mutually orthogonal directions to summarise data with.
- **A second way to measure size.** Instead of squaring, add the absolute values: [3, 4] measured this way is 3 + 4 = 7, the distance a taxi drives along a grid rather than the 5 a bird flies. It comes back later as the difference between two ways of penalising large model weights.
- **Very high dimensions are strange.** Pick two random 768-component vectors and their dot product is almost always close to zero — nearly every random pair is nearly orthogonal. This is one face of what people call the curse of dimensionality, and it is why "nearest" means less as the number of components grows.
- **Distance and cosine are relatives.** The squared straight-line distance between two arrow tips works out to ‖a‖² − 2(a · b) + ‖b‖². When both are unit vectors that is just 2 − 2(a · b), so smallest distance and largest dot product produce the same ranking, in opposite order.`,
    },
  ],
  quiz: [
    {
      question: 'a = [3, 4] and b = [4, -3]. What is a · b, and what does it tell you?',
      options: [
        {
          text: '0 — the two arrows sit at a right angle, so they are orthogonal',
          explanation: 'Correct. 3×4 + 4×(−3) = 12 − 12 = 0. An exactly-zero dot product means a 90 degree angle, which means the two directions share nothing.',
        },
        { text: '24, because both vectors have length 5', explanation: 'Both lengths are 5, but the dot product multiplies matching slots and adds them; it is not built from the lengths alone. The arithmetic gives 12 − 12 = 0.' },
        { text: 'It is undefined because one component is negative', explanation: 'Negative components are perfectly normal — they only mean the arrow goes left or down. The arithmetic is unchanged.' },
      ],
      correct: 0,
    },
    {
      question: 'What is the length (the magnitude) of the vector [1, 2, 2]?',
      options: [
        { text: '5, because 1 + 2 + 2 = 5', explanation: 'That adds the components, which is not the recipe. Length squares each component first, then adds, then takes the square root.' },
        {
          text: '3, because sqrt(1 + 4 + 4) = sqrt(9)',
          explanation: 'Correct. Square every component: 1, 4, 4. Add: 9. Square root: 3. The same recipe works for any number of components.',
        },
        { text: '9, because 1² + 2² + 2² = 9', explanation: 'That is the sum of squares, the number under the square root sign. You still have to take the root, which gives 3.' },
      ],
      correct: 1,
    },
    {
      question: 'a and b are both unit vectors. What does a · b equal?',
      options: [
        {
          text: 'Exactly cos θ, the cosine of the angle between them',
          explanation: 'Correct. a · b = ‖a‖‖b‖cos θ and both lengths are 1, so only cos θ survives. That is why systems normalize on storage: the cheap dot product then already is the cosine similarity.',
        },
        { text: 'Always 1, because both have length 1', explanation: 'Only if they also point the same way. Unit length fixes how long they are, not which way they face — two unit vectors can be opposite, giving −1.' },
        { text: 'The angle θ itself, in degrees', explanation: 'It is the cosine of the angle, not the angle. You would have to apply acos to recover θ, exactly as step 3 did.' },
      ],
      correct: 0,
    },
    {
      question: 'Normalizing a vector (dividing every component by that vector\'s own length) changes what?',
      options: [
        { text: 'The direction, while the length stays the same', explanation: 'Backwards. Dividing every component by the same positive number cannot rotate an arrow.' },
        {
          text: 'The length, which becomes exactly 1, while the direction is unchanged',
          explanation: 'Correct. That is the whole point: keep "which way", discard "how much". Verify it by re-measuring — the length must come back exactly 1.0.',
        },
        { text: 'Both the length and the direction', explanation: 'Only the length. Every component shrinks by the same factor, so the shape of the arrow, and therefore its direction, is untouched.' },
      ],
      correct: 1,
    },
    {
      question: 'Your document search returns the same few very long pages for almost every query. Most likely cause?',
      options: [
        {
          text: 'You are ranking on the raw dot product with unnormalized vectors, so a long page\'s large length multiplies its score up against everything',
          explanation: 'Correct. a · b = ‖a‖‖b‖cos θ, so length is a factor in the score. Normalize on storage and at query time, and the same dot product then measures direction only.',
        },
        { text: 'The vectors have too few components', explanation: 'Too few components makes every result vague, but it does not create a systematic bias toward long pages specifically.' },
        { text: 'There are not enough documents in the index', explanation: 'Adding documents does not stop the long ones dominating. What is broken is the scoring rule, not the size of the collection.' },
      ],
      correct: 0,
    },
    {
      question: 'Why is cosine similarity usually preferred over raw distance when comparing text embeddings?',
      options: [
        { text: 'Because it is faster to compute than distance', explanation: 'It is not — cosine needs two lengths and a division, while raw distance is a subtract-and-square. Speed is not the reason.' },
        {
          text: 'Because a vector\'s length mostly reflects how much text there was, while its direction reflects what the text is about — cosine drops the length and keeps the direction',
          explanation: 'Correct. Length is an accident of the input, direction is the meaning. Raw distance is sensitive to length, so a long document sits far from everything, including what it actually matches.',
        },
        { text: 'Because cosine can be negative and distance cannot', explanation: 'True as a fact, but not the reason. For embeddings the useful property is that dividing both lengths out leaves only the angle.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Explain the dot product to someone non-technical in thirty seconds.',
      answer:
        'It is one number saying how much two things agree. We describe each thing as a list of numbers — a search query, a document, a song. Then we multiply the matching entries and add them up. A big number means the two lists point the same way, so they are about the same thing; zero means unrelated; a negative number means opposed. If they want the mechanism, add the second formula: the score is the size of the first thing, times the size of the second, times how well their directions agree. That third factor carries the meaning, and dividing the two sizes out isolates it.',
      isCaseBased: false,
    },
    {
      question: 'Why is a · b = ‖a‖ ‖b‖ cos θ? Give the intuition, not a proof.',
      answer:
        'Start with b as a unit vector, length 1. Then a · b is the length of a\'s shadow on b\'s line — how far along b you land if you drop a straight down onto it. School trigonometry says that shadow is ‖a‖ cos θ, because cosine is the adjacent side over the hypotenuse in the right triangle you just drew. Now let b have a real length instead of 1: scaling b scales the score in proportion, so the shadow gets multiplied by ‖b‖, giving ‖a‖ ‖b‖ cos θ. So the dot product is shadow length times the other vector\'s length. Only cos θ depends on alignment, which is why dividing both lengths out leaves pure direction agreement.',
      isCaseBased: false,
    },
    {
      question: 'Case: your vector search works in testing but in production long documents come back for almost every query. Diagnose it and fix it.',
      answer:
        'The symptom is length bias, so suspect the scoring rule first. (1) Check whether ranking uses the raw dot product on unnormalized vectors. Since a · b = ‖a‖ ‖b‖ cos θ, a long document\'s large length multiplies its score against every query, so it beats short but genuinely relevant chunks. Fix: normalize every vector to length 1 on insert and normalize the query too; the plain dot product then equals the cosine, which measures direction only. That is a one-line change and it costs nothing at query time. (2) Check chunking. If a long document was embedded whole, one vector is being asked to represent ten topics, so it becomes a vague average sitting mildly near everything. Fix: split into chunks of a few hundred words with a little overlap, and embed each. (3) Confirm the database\'s configured similarity matches your intent — most let you choose inner product, cosine, or Euclidean, and storing vectors one way while scoring them another reproduces this exactly. Order the work by cost: normalization first, re-chunking second, since that means re-indexing everything.',
      isCaseBased: true,
    },
    {
      question: 'When would you keep the raw dot product instead of switching to cosine similarity?',
      answer:
        'When length is real signal rather than an accident. The clearest case is a recommender trained on user interactions: an item vector\'s length often ends up encoding popularity, so a widely liked item legitimately scores higher for many users. Normalize that away and niche items surge to the top while engagement falls. The same argument applies inside a trained model, where attention scores use the raw dot product because the model learned its own useful scale. The test is simple: ask what the length is a measurement of. If it is document size or encoder confidence, it is an artifact and cosine is right. If it is something you deliberately trained the model to represent, deleting it throws away information you paid for.',
      isCaseBased: false,
    },
    {
      question: 'Case: a colleague wants to switch your recommender from raw dot product to cosine "because it is more principled". What do you say?',
      answer:
        'I would ask what magnitude currently encodes in this specific model. In a recommender trained on interaction counts, item vector length typically absorbs popularity, and that is doing useful work: a blockbuster ends up with a long vector and correctly ranks high for many users. Normalizing removes it, so expect niche items to surge and engagement to drop. So my default is to keep the dot product as the relevance score. Then I would check what the real complaint is. If it is that a handful of hits dominate every list, that is a diversity problem, and the right tools are re-ranking, popularity dampening, or an explicit exploration slot — not deleting a signal the model learned. Cosine is correct when magnitude is an artifact, like document length in text search, and wrong when magnitude is the signal. Either way the decision is settled by an experiment: run both arms, and agree in advance on the metric that decides and the guardrail metric that would veto a win.',
      isCaseBased: true,
    },
    {
      question: 'What does orthogonality mean, and why does anyone care?',
      answer:
        'Two vectors are orthogonal when their dot product is exactly zero, which by the second formula means the angle between them is 90 degrees. In plain terms they share no direction: knowing where something sits along one tells you nothing about where it sits along the other. That is why orthogonality is prized rather than merely tidy — orthogonal directions carry non-overlapping information. PCA requires its directions to be mutually orthogonal for exactly this reason, so each new direction explains something the earlier ones could not and the reported percentages do not double-count. In feature design, strongly correlated columns are the opposite case: they duplicate information, which makes individual fitted coefficients unstable.',
      isCaseBased: false,
    },
    {
      question: 'Case: the same nearest-neighbour code scores well on one dataset and badly on another, where one feature is annual salary and another is a 0/1 flag. What is going on?',
      answer:
        'Dot products and distances are sums over the components, so a component measured in hundreds of thousands dominates the sum while a component living between 0 and 1 contributes almost nothing. Effectively the model is doing nearest-neighbour on salary alone and the flag is invisible. The geometry is not wrong, the units are. Fix: rescale every feature to a comparable range before computing anything — subtract the mean and divide by the standard deviation, or map each column into 0 to 1. Two extra points worth making. First, switching to cosine does not rescue this, because the giant component still dominates the direction, not only the length. Second, if there are also very many features, add the high-dimension problem: almost all pairs become nearly orthogonal and all distances converge, so "nearest" carries less and less information. Then the answer is to reduce the number of components first, or to learn a distance rather than assume one.',
      isCaseBased: true,
    },
    {
      question: 'What is a projection, and where does it show up?',
      answer:
        'The projection of a onto b is a\'s shadow on the line through b: as a plain length it is a · b divided by ‖b‖, and as an arrow it is that length pointed along b. Read it as "how much of a points along b". If b is already a unit vector the formula collapses to plain a · b, which is one more argument for normalizing. It shows up in PCA, where reducing dimensions is literally projecting each point onto a few chosen directions; in least squares fitting, where the fitted values are the projection of the target onto what the features can reach, which is why the leftover error comes out orthogonal to every feature; and in embedding editing, where an unwanted attribute is removed by projecting its direction out of every vector.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    {
      front: 'Vector, and component',
      back: 'A vector is an ordered list of numbers, drawable as an arrow from the origin when there are two of them. Each number in the list is a component.',
    },
    {
      front: 'Magnitude / length / norm',
      back: 'Square every component, add them, take the square root. ‖[3, 4]‖ = sqrt(9 + 16) = 5. Same recipe at any size. Never negative.',
    },
    {
      front: 'Dot product (the arithmetic)',
      back: 'Multiply matching slots and add the results. [2, 1] · [3, 2] = 6 + 2 = 8. Two vectors in, one plain number out.',
    },
    {
      front: 'Dot product (the meaning)',
      back: 'a · b = ‖a‖ ‖b‖ cos θ. Size of a, times size of b, times how much their directions agree. Both formulas always give the same number.',
    },
    {
      front: 'Reading the sign of a · b',
      back: 'Large positive = pointing the same way. Exactly zero = right angle, orthogonal, no shared direction. Negative = pointing opposite ways.',
    },
    {
      front: 'Unit vector / normalizing',
      back: 'Divide every component by the vector\'s own length. Direction unchanged, length becomes exactly 1. [3, 4] / 5 = [0.6, 0.8].',
    },
    {
      front: 'Cosine similarity, and why embeddings use it',
      back: 'a · b divided by both lengths, which leaves cos θ, always between −1 and 1. Length mostly reflects how much text there was; direction reflects what it is about.',
    },
    {
      front: 'Projection (the shadow)',
      back: 'How much of a points along b: a · b / ‖b‖. Collapses to plain a · b when b is a unit vector.',
    },
  ],
  mindmapMarkdown: `- Vectors & the Dot Product (= Similarity)
  - Vector = ordered list of numbers
    - Two numbers = an arrow you can draw
    - Each number is a component
  - Length (magnitude, norm)
    - Square, add, square root
    - Pythagoras: ‖[3, 4]‖ = 5
  - Dot product, way 1
    - Multiply matching slots, add
    - [2, 1] · [3, 2] = 8
  - Dot product, way 2
    - ‖a‖ ‖b‖ cos θ
    - Same number, every time
  - Reading the sign
    - Positive = same direction
    - Zero = orthogonal (right angle)
    - Negative = opposite
  - Unit vectors
    - Divide by your own length
    - Length 1, direction unchanged
  - Cosine similarity
    - Dot product with both lengths divided out
    - Length is an accident, direction is the meaning
    - Normalize on insert, then dot IS cosine
  - Projection
    - Shadow of a on b = a · b / ‖b‖
    - Plain a · b when b is a unit vector`,
}

export default m
