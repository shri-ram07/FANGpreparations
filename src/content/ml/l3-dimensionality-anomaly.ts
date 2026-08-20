import type { Module } from '../types'

const m: Module = {
  id: 'ml-l3-dimensionality-anomaly',
  subjectId: 'ml',
  level: 3,
  title: 'PCA, t-SNE & Anomaly Detection',
  whyItMatters:
    'Two everyday jobs, built from scratch here. The first is squashing wide data down to a few numbers per row without losing much, which is what PCA does. The second is finding the rows that do not look like the others, which is what anomaly detection does. Everything below is done with real numbers you can check by hand first, and only then with a library.',
  assumes: [
    'You know what an average is, and how to square a number',
    'You have seen a Python list, a for loop, and a function definition',
    'You have read the Math module *Vectors & the Dot Product (= Similarity)* — we use the dot product here, and nothing else from it',
    'No linear algebra beyond that, and no ML background. Every other term is defined on this page.',
  ],
  estMinutes: 57,
  sections: [
    {
      type: 'intuition',
      title: 'Six points that lean',
      md: `Six students. For each one we wrote down two numbers: hours slept last night, and hours studied last week (divided by ten so both numbers are small).

- Student 1: **(1.6, 2.3)**. Student 2: **(3.6, 3.3)**. Student 3: **(4.0, 5.5)**. Student 4: **(6.0, 6.5)**. Student 5: **(6.4, 8.7)**. Student 6: **(8.4, 9.7)**.
- Draw them on graph paper, first number across, second number up. They do not sit in a round blob. They march up and to the right in an almost-straight line, with a small wobble either side of it.
- Each student needs **two** numbers to be written down. Two numbers per row is what we mean by **two dimensions**. A dimension is just one column of your table.
- But look at the picture again. If someone tells you a student is far up the line, you already know both of their numbers, roughly. The second number is nearly free.
- So here is the question this whole module answers: can we describe each student with **one** number instead of two, and how much do we lose?

That is dimensionality reduction. Not deleting a column, as you will see, but re-describing every row using fewer numbers.`,
    },
    {
      type: 'intuition',
      title: 'The one move: how far along a direction does this point sit',
      md: `Put a ruler down on the graph paper, lying along the line the points lean along. Now for each point, walk from the point straight to the ruler by the shortest path, and read off the mark you land on.

- A **direction** is an arrow: two numbers saying how far across and how far up. We always use arrows of length 1, so that the arrow says *which way* and nothing about *how far*. The arrow **(0.6, 0.8)** has length 1, because 0.6 squared plus 0.8 squared is 0.36 + 0.64 = 1.
- A **projection** is that shortest walk onto the ruler, and the number you read off is how far along the ruler you landed. That single number is the point\'s new, one-dimensional description.
- The bit you walked, from the point to the ruler, is the part you did not keep. It is what gets lost.

Now do exactly that, for one point, with real arithmetic.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Project one point onto one direction, by hand',
      code: `point = [4.0, 3.0]
direction = [0.6, 0.8]
along = point[0] * direction[0] + point[1] * direction[1]
print('how far along:', round(along, 2))
shadow = [along * direction[0], along * direction[1]]
print('shadow point :', [round(shadow[0], 2), round(shadow[1], 2)])
left = [point[0] - shadow[0], point[1] - shadow[1]]
print('left over    :', [round(left[0], 2), round(left[1], 2)])
print('its length   :', round((left[0] ** 2 + left[1] ** 2) ** 0.5, 2))

# ---- real output ----
# how far along: 4.8
# shadow point : [2.88, 3.84]
# left over    : [1.12, -0.84]
# its length   : 1.4`,
      annotations: {
        1: 'One data point: 4.0 across, 3.0 up. A plain list of two floats, nothing more.',
        2: 'The direction of our ruler, as an arrow of length 1. We chose this one by hand for now; later the computer will choose it.',
        3: 'Multiply the across-parts together, multiply the up-parts together, add. 4.0 * 0.6 = 2.4, and 3.0 * 0.8 = 2.4, so the total is 4.8. This is the whole projection: the answer 4.8 is how far along the ruler the point landed.',
        4: 'round(x, 2) trims the float to 2 decimal places so the output is readable. Printed: 4.8.',
        5: 'Where on the ruler is that, back in the original two numbers? Walk 4.8 units along the arrow: 4.8 * 0.6 across and 4.8 * 0.8 up. That gives (2.88, 3.84), the point\'s shadow on the ruler.',
        6: 'Print the shadow, each of its two numbers rounded. This is what the point becomes if we keep only the ruler.',
        7: 'The original point minus its shadow: (4.0 - 2.88, 3.0 - 3.84) = (1.12, -0.84). This is the walk from the point to the ruler, and it is exactly the information the projection throws away.',
        8: 'Print that leftover, rounded.',
        9: 'How long is the leftover walk? Square both parts, add, take the square root: 1.12 squared is 1.2544, 0.84 squared is 0.7056, and they add to 1.96, whose square root is 1.4. So this point sits 1.4 units off the ruler. The ** operator is Python\'s power: ** 2 squares, ** 0.5 takes the square root.',
      },
    },
    {
      type: 'note',
      md: `Line 3 has a name you have already met. Multiply matching parts and add them up: that is the **dot product**, taught in the Math module *Vectors & the Dot Product (= Similarity)*. So a projection onto a length-1 direction is nothing more than a dot product with that direction, and you know how to do it already. The other Math module you will hear echoed here is *Matrices as Transformations* — projecting many points onto many directions at once is exactly a matrix doing its job, and a library will do it that way for speed. Neither is needed to follow this page; every projection below is the same dot product, done one point at a time.`,
    },
    {
      type: 'intuition',
      title: 'Centring, and why PCA cannot skip it',
      md: `Before choosing a direction we move the whole cloud so its middle sits at the origin, the point (0, 0). That is **centring**: subtract the average of a column from every value in that column.

- Why it is required: we are about to score a direction by how *spread out* the projections are along it. Spread has to be measured around some agreed centre, and the only honest centre is the middle of the data.
- Skip centring and the arithmetic instead measures spread around (0, 0), which for our students is far below and to the left of the actual cloud. Then every point projects to a large positive number, they are all large together, and the "spread" you measure is mostly the distance from the origin to the cloud, not the shape of the cloud.
- The practical effect: the first direction comes out pointing at the cloud from the origin, which tells you where your cloud sits, not how it varies. That is not what you asked for.
- Centring never distorts the shape. It slides the whole cloud without rotating or stretching it, and the ruler you find can always be slid back afterwards.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Centre the six students',
      code: `pts = [[1.6, 2.3], [3.6, 3.3], [4.0, 5.5], [6.0, 6.5], [6.4, 8.7], [8.4, 9.7]]
mean_x = 0.0
mean_y = 0.0
for p in pts:
    mean_x = mean_x + p[0] / 6
    mean_y = mean_y + p[1] / 6
print('centre:', round(mean_x, 2), round(mean_y, 2))
centred = []
for p in pts:
    centred.append([round(p[0] - mean_x, 2), round(p[1] - mean_y, 2)])
for c in centred:
    print(c)

# ---- real output ----
# centre: 5.0 6.0
# [-3.4, -3.7]
# [-1.4, -2.7]
# [-1.0, -0.5]
# [1.0, 0.5]
# [1.4, 2.7]
# [3.4, 3.7]`,
      annotations: {
        1: 'The six students, each a list of two numbers, all inside one outer list.',
        2: 'A running total for the average of the first column. Starting at 0.0 rather than 0 to make clear it holds decimals.',
        3: 'The same for the second column.',
        4: 'Walk the six points. p is one student, a two-item list.',
        5: 'Add one sixth of this student\'s first number. Adding p[0]/6 six times is the same as adding all six and dividing at the end, and it keeps the loop to one line.',
        6: 'The same for the second number.',
        7: 'The centre of the cloud comes out at exactly (5.0, 6.0). That is the middle student who does not exist, the average of all six.',
        8: 'An empty list that will hold the shifted points.',
        9: 'Walk the six points again.',
        10: 'Subtract the centre from both numbers and append the result. append adds one item to the end of a list. Student 1 at (1.6, 2.3) becomes (-3.4, -3.7): 3.4 left of centre and 3.7 below it.',
        11: 'Walk the shifted points to print them.',
        12: 'Print one shifted point per line. Notice the six now sit around zero, three negative and three positive, which is what centring means.',
      },
    },
    {
      type: 'intuition',
      title: 'Scoring a direction: variance',
      md: `Now we can ask which ruler is best. We need one number per candidate direction saying how spread out the projections are along it.

- **Variance** is the standard way to measure spread. Take the centred values, square each one, and average the squares. Squaring makes left-of-centre and right-of-centre count the same, and it makes far-out points count much more than near ones.
- For a direction, we project every centred point onto it, then take the variance of those projected numbers. Call that the spread along the direction.
- Useful fact we will check with numbers: the spread along the across-axis plus the spread along the up-axis equals the **total spread** of the cloud, and that total does not change no matter which pair of perpendicular rulers you use. The cloud has a fixed amount of spread in it; a direction can only claim a share of it.
- The **explained variance ratio** of a direction is exactly that share: spread along the direction divided by total spread. It is a number between 0 and 1, and it is how you report what a projection kept.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Measure the spread along three different rulers',
      code: `centred = [[-3.4, -3.7], [-1.4, -2.7], [-1.0, -0.5], [1.0, 0.5], [1.4, 2.7], [3.4, 3.7]]

def spread_along(points, d):
    total = 0.0
    for p in points:
        t = p[0] * d[0] + p[1] * d[1]
        total = total + t * t / 6
    return total

flat = spread_along(centred, [1.0, 0.0])
tall = spread_along(centred, [0.0, 1.0])
tilt = spread_along(centred, [0.634, 0.773])
print('spread along the x-axis  :', round(flat, 3))
print('spread along the y-axis  :', round(tall, 3))
print('spread along the tilt    :', round(tilt, 3))
print('total spread             :', round(flat + tall, 3))
print('fraction kept by the tilt:', round(tilt / (flat + tall), 4))

# ---- real output ----
# spread along the x-axis  : 4.84
# spread along the y-axis  : 7.077
# spread along the tilt    : 11.683
# total spread             : 11.917
# fraction kept by the tilt: 0.9803`,
      annotations: {
        1: 'The six centred points from the previous snippet, typed in directly so this snippet runs on its own.',
        3: 'A function taking the points and one direction d, and returning the spread along d.',
        4: 'A running total for the variance, starting at zero.',
        5: 'Walk the points, one at a time.',
        6: 'The projection of this point onto d: the same dot product as before. t is how far along the ruler this point landed.',
        7: 'Square t and add one sixth of it. Six of these sixths make the average of the squares, which is the variance, because the points are already centred so their projections average to zero.',
        8: 'Hand back the total.',
        10: 'Score the plain across-axis, the arrow (1, 0). Projecting onto it just keeps the first number of each point.',
        11: 'Score the plain up-axis, the arrow (0, 1). It keeps the second number.',
        12: 'Score a tilted ruler pointing up and to the right at roughly 50 degrees. This is the direction the cloud leans along, guessed by eye for now.',
        13: 'The across-axis holds 4.84 of the spread.',
        14: 'The up-axis holds 7.077. Neither axis alone is impressive.',
        15: 'The tilted ruler holds 11.683, far more than either axis. One well-chosen direction beats both of the original columns.',
        16: '4.84 + 7.077 = 11.917 is the total spread of the cloud.',
        17: '11.683 / 11.917 = 0.9803. Describing each student by one number along the tilted ruler keeps 98.03% of the spread and throws away 1.97%.',
      },
    },
    {
      type: 'intuition',
      title: 'That is PCA',
      md: `We guessed the tilted direction by eye. The only thing left to do is stop guessing.

- The **first principal component**, written PC1, is the direction with the largest spread of all possible directions. There is no magic in it: it is the winner of a search.
- **PC2** is the best of the directions perpendicular to PC1, PC3 the best perpendicular to both, and so on. With two columns you get two components; with 400 columns you get 400.
- **PCA** is the whole procedure: centre the data, find the components in that order, keep the first few, and describe each row by how far along each kept component it sits.
- Real libraries do not search angle by angle, because that does not work beyond two dimensions. They compute the answer directly with linear algebra, which is what the *Beyond the basics* section at the end sketches. The answer they get is the same one the search below finds.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Find PC1 by trying every angle',
      code: `import math

best_spread = -1.0
best_dir = None
for degrees in range(180):
    angle = math.radians(degrees)
    d = [math.cos(angle), math.sin(angle)]
    s = spread_along(centred, d)
    if s > best_spread:
        best_spread = s
        best_dir = [round(d[0], 3), round(d[1], 3)]
print('best direction :', best_dir)
print('spread along it:', round(best_spread, 3))
print('fraction kept  :', round(best_spread / 11.917, 4))

# ---- real output ----
# best direction : [0.629, 0.777]
# spread along it: 11.688
# fraction kept  : 0.9808`,
      annotations: {
        1: 'math is Python\'s built-in maths library. We need it for angles.',
        3: 'The best spread found so far. Starting at -1.0 guarantees the first real candidate beats it, since a variance is never negative.',
        4: 'The direction that achieved it. None is Python\'s placeholder for "nothing yet".',
        5: 'Try every whole angle from 0 to 179 degrees. Beyond 180 the arrows just point backwards along rulers we already tried.',
        6: 'Convert degrees to radians, which is the unit the maths library uses.',
        7: 'cos and sin turn an angle into an arrow of length exactly 1. At 0 degrees this is (1, 0); at 90 degrees it is (0, 1); at 50 degrees it is roughly (0.64, 0.77).',
        8: 'Score this candidate with the same function from the previous snippet, which must still be defined.',
        9: 'Is this the best so far?',
        10: 'If so, remember the score.',
        11: 'And remember the arrow that got it, rounded for printing.',
        12: 'The winner is (0.629, 0.777), an angle of 51 degrees. That is PC1 for these six students, and it is close to the direction we guessed by eye.',
        13: 'Its spread is 11.688, slightly more than our guess scored.',
        14: '11.688 / 11.917 = 0.9808. PC1 keeps 98.08% of the spread. The remaining 1.92% is PC2, the perpendicular wobble.',
      },
    },
    {
      type: 'intuition',
      title: 'Reconstruction: seeing what you dropped',
      md: `Each student is now one number: how far along PC1 they sit. **Reconstruction** is going back the other way — from that one number, rebuild a guess at the two original numbers, and compare.

- To rebuild: walk that far along the PC1 arrow, then add the centre back on, because we subtracted it earlier.
- Student 1 sits at t = -5.01 along PC1. Walking -5.01 along (0.629, 0.777) gives (-3.15, -3.90), and adding the centre (5.0, 6.0) gives **(1.85, 2.10)**.
- The real student 1 was **(1.6, 2.3)**. So we miss by 0.25 in the first number and 0.20 in the second.
- That miss is the wobble off the ruler, the same leftover we computed by hand for a single point earlier. It is the price of using one number instead of two.
- Whether that price is acceptable is not a mathematical question. If the wobble is measurement noise, you lost nothing. If the wobble is the one thing that separates the students you care about, you just destroyed your data.`,
    },
    {
      type: 'visual',
      component: 'PythonPlayground',
      props: {
        code: `centred = [[-3.4, -3.7], [-1.4, -2.7], [-1.0, -0.5], [1.0, 0.5], [1.4, 2.7], [3.4, 3.7]]
d = [0.629, 0.777]
for c in centred:
    t = c[0] * d[0] + c[1] * d[1]
    rebuilt_x = 5.0 + t * d[0]
    rebuilt_y = 6.0 + t * d[1]
    gap_x = (c[0] + 5.0) - rebuilt_x
    gap_y = (c[1] + 6.0) - rebuilt_y
    print('t =', round(t, 2), 'rebuilt', round(rebuilt_x, 2), round(rebuilt_y, 2), 'miss by', round(gap_x, 2), round(gap_y, 2))`,
        precomputedOutput: `t = -5.01 rebuilt 1.85 2.1 miss by -0.25 0.2
t = -2.98 rebuilt 3.13 3.69 miss by 0.47 -0.39
t = -1.02 rebuilt 4.36 5.21 miss by -0.36 0.29
t = 1.02 rebuilt 5.64 6.79 miss by 0.36 -0.29
t = 2.98 rebuilt 6.87 8.31 miss by -0.47 0.39
t = 5.01 rebuilt 8.15 9.9 miss by 0.25 -0.2`,
        caption: 'One number per student goes in; two numbers come back out, wrong by about a quarter of a unit each. That error is the 1.92% of spread PC1 did not keep.',
        annotations: {
          1: 'The six centred students again.',
          2: 'PC1, the winning direction from the angle search.',
          3: 'Walk the six centred points.',
          4: 'Project: the dot product with PC1 gives t, the single number we keep for this student.',
          5: 'Rebuild the first number from t alone: walk t along the arrow, then add back the centre we subtracted.',
          6: 'Rebuild the second number the same way.',
          7: 'The rebuilding error in the first number: original (centred plus centre) minus rebuilt.',
          8: 'The same error in the second number.',
          9: 'Print the kept number, the rebuilt pair, and how far off it is. Every miss is between 0.2 and 0.5, and no miss is zero, because no student sat exactly on the ruler.',
        },
      },
    },
    {
      type: 'intuition',
      title: 'What PCA is not',
      md: `Two things get assumed about PCA that are false, and both are worth saying plainly.

- **PCA is not feature selection.** Feature selection keeps some of your original columns and drops the rest, so you can stop collecting the dropped ones. PCA keeps *all* of them, mixed together: PC1 for the students was 0.629 of the first column plus 0.777 of the second. Every original column is still needed to compute it. If your goal is to stop paying for a data feed, PCA does not help.
- **The components are usually not interpretable.** With two columns you can squint at (0.629, 0.777) and say "mostly both, roughly equally". With 200 columns, PC1 is 200 weights and it is a mixture with no name. You cannot tell a customer "your loan was refused because of PC3", and you often cannot tell yourself what PC3 is.
- One more that matters later: **PCA never looks at what you are trying to predict.** It ranks directions by spread only. A direction can have tiny spread and still be the only one that separates the two groups you care about, and PCA will drop it without hesitating.`,
    },
    {
      type: 'intuition',
      title: 'Scaling: the second thing PCA needs',
      md: `Centring fixed *where* the cloud sits. **Scaling** fixes how big each column is.

- To scale a column you divide every value in it by that column\'s spread, so afterwards each column has variance 1. Combined with centring, this is called standardising.
- Why PCA needs it: variance is measured in the units of the column. A salary column in rupees has a variance in the hundreds of millions. An age column in years has a variance around a hundred. Nothing about that comparison is meaningful — it is a contest between a rupee and a year.
- PCA picks the direction with the most variance. So without scaling, it will hand you the column with the biggest measuring unit, and call it a discovery.
- The exception is when every column is already in the same unit and their relative sizes are real, for example pixel brightnesses in an image. Then scaling would blow up dead pixels into equal citizens, and you skip it deliberately.`,
    },
    {
      type: 'intuition',
      title: 'Why squashing a table can help a model at all',
      md: `One more reason to reduce dimensions, and this one comes from a measurement rather than from an argument.

- Many models decide by distance: to classify a new row they find the nearest rows in the training data. That only works if "nearest" means something — if the closest row is genuinely much closer than the farthest one.
- With many columns, it stops meaning something. The snippet below drops 500 random points into a box with 2, 10, 100 and 1000 columns, and measures the closest and farthest distance from one point to the rest.
- Read the last column of its output: the farthest point is 67 times farther than the nearest when there are 2 columns, and only 1.11 times farther when there are 1000. Everything ends up the same distance away.
- That is the honest version of the phrase you will hear, "the curse of dimensionality". It is not a mystery, it is the ratio in that last column collapsing toward 1.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Measure how distances behave as columns are added',
      code: `import numpy as np

rng = np.random.default_rng(0)
for d in [2, 10, 100, 1000]:
    pts = rng.random((500, d))
    first = pts[0]
    gaps = np.sqrt(((pts[1:] - first) ** 2).sum(axis=1))
    print(d, round(gaps.min(), 3), round(gaps.max(), 3), round(gaps.max() / gaps.min(), 2))

# ---- real output ----
# 2 0.014 0.937 67.13
# 10 0.578 1.918 3.32
# 100 3.634 4.953 1.36
# 1000 12.295 13.618 1.11`,
      annotations: {
        1: 'numpy is the library for arrays of numbers. An array is a grid of numbers that arithmetic can be applied to all at once.',
        3: 'A random number generator with a fixed starting seed of 0, so this experiment gives the same numbers every time anyone runs it.',
        4: 'Run the same experiment four times, with 2 columns, then 10, then 100, then 1000.',
        5: 'rng.random((500, d)) makes a grid of 500 rows and d columns, every entry a random number between 0 and 1. So: 500 points scattered evenly in a box.',
        6: 'pts[0] is the first row, our reference point.',
        7: 'Read it inside out. pts[1:] is all rows except the first. Subtracting first from that grid subtracts it from every row at once, which is numpy broadcasting: a smaller shape is repeated to match a bigger one. ** 2 squares every entry. .sum(axis=1) adds along each row, giving one number per row. np.sqrt takes the square root of each. The result, gaps, is the distance from the first point to each of the other 499.',
        8: 'Print the number of columns, the closest distance, the farthest distance, and the ratio between them. With 2 columns the farthest is 67 times the nearest, so near and far are very different. With 1000 columns the ratio is 1.11: the nearest neighbour is barely nearer than the farthest stranger, and any model that decides by distance is choosing between rows that are all equally far away.',
      },
    },
    {
      type: 'intuition',
      title: 't-SNE and UMAP: for looking, not for feeding',
      md: `PCA finds straight rulers. **t-SNE** and **UMAP** are two other methods with a different aim: place every row somewhere on a page so that rows which were close together in the original data end up close together on the page. They are allowed to bend, and they do.

- They are for **looking at data**, and that is the whole use. You run one, you get a picture with blobs, and you eyeball whether your groups look separable at all.
- Do not feed their output to a model. The two numbers per row they produce were chosen to make a nice picture, not to mean anything, and there is no honest way to place a new row into the same picture afterwards.
- **Distances between blobs in the picture do not mean what they look like.** Two blobs on opposite sides of the page may be more similar than two touching blobs. Only "these points ended up neighbours" is meaningful, and even that shifts when you change the settings or the random starting point.
- Blob *sizes* mean nothing either. The methods stretch sparse regions and squeeze dense ones as a matter of course.
- UMAP is the faster of the two and keeps a little more of the large-scale layout. Both carry the warnings above.`,
    },
    {
      type: 'intuition',
      title: 'Anomaly detection: the other half of this module',
      md: `New problem. An **anomaly**, also called an **outlier**, is a row that does not look like the rest of the data. Card fraud, a machine about to fail, a sensor that started lying, a typo in a data feed.

- It is not ordinary classification, because usually nobody has labelled the anomalies. You cannot train on labels you do not have.
- It is not a category either. Next month\'s fraud will not look like last month\'s. You are detecting *difference from usual*, not membership of a known group.
- Anomalies are rare, often under 1% of rows, so counting how often you are right is useless: answering "normal" to everything scores over 99%.
- The output you actually want is a **ranking**: score every row by how odd it looks, hand the oddest few to a human, and let the number you hand over be set by how many the human can check.

The simplest method comes first, and it needs no library at all.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The simplest detector: how many spreads from average is this row',
      code: `amounts = [48, 52, 47, 55, 50, 49, 53, 51, 45, 300]
mean = sum(amounts) / len(amounts)
spread = 0.0
for a in amounts:
    spread = spread + (a - mean) ** 2 / len(amounts)
sd = spread ** 0.5
print('mean:', round(mean, 2), 'typical distance:', round(sd, 2))
for a in amounts:
    z = (a - mean) / sd
    if abs(z) > 2:
        print('flagged', a, 'with z =', round(z, 2))
clean = amounts[:9]
clean_mean = sum(clean) / 9
clean_sd = (sum((a - clean_mean) ** 2 for a in clean) / 9) ** 0.5
print('without the 300:', clean_mean, round(clean_sd, 2), 'so z of 300 is', round((300 - clean_mean) / clean_sd, 1))

# ---- real output ----
# mean: 75.0 typical distance: 75.05
# flagged 300 with z = 3.0
# without the 300: 50.0 2.94 so z of 300 is 84.9`,
      annotations: {
        1: 'Ten payment amounts in rupees. Nine ordinary ones near 50, and one of 300 that we would like the code to notice.',
        2: 'The average: sum divided by count. len gives the number of items, here 10.',
        3: 'A running total for the variance.',
        4: 'Walk the ten amounts.',
        5: 'Add one tenth of the squared distance from the mean. This is the same variance calculation as in the PCA snippets.',
        6: 'The square root of the variance is called the standard deviation. It is the variance brought back to the original units, so it reads as "a typical distance from the mean, in rupees".',
        7: 'Printed: mean 75.0, typical distance 75.05. Both numbers are already damaged, because the 300 is inside the calculation that is supposed to describe normal.',
        8: 'Walk the amounts again, now to score them.',
        9: 'The **z-score**: how many typical distances this value sits from the mean. Positive means above, negative below.',
        10: 'abs() drops the minus sign, so this flags both unusually large and unusually small values. Two is the usual cut-off.',
        11: 'Only the 300 is flagged, at z = 3.0, which sounds like a mild oddity rather than a six-fold payment.',
        12: 'amounts[:9] is slicing: take items 0 up to but not including 9, so the nine ordinary amounts without the 300.',
        13: 'Their average is exactly 50.0.',
        14: 'Their standard deviation, computed in one line. The bracketed expression inside sum() is a generator expression: it produces (a - clean_mean) ** 2 for each a, and sum adds them as they arrive.',
        15: 'Against the clean nine, the typical distance is 2.94 rupees and the 300 sits 84.9 of them away. The single outlier inflated the mean from 50 to 75 and the spread from 2.94 to 75.05, and so hid its own size. That effect is called masking, and it is the main weakness of this method.',
      },
    },
    {
      type: 'intuition',
      title: 'Isolation Forest: how few random cuts does it take to fence this row off',
      md: `The z-score looks at one column and assumes the normal values pile up around an average. Isolation Forest assumes neither.

- Picture the rows as dots on paper. Pick one column at random, pick a random value in that column\'s range, and cut the paper there. Cut again, and again, always at random, always inside the piece the dot you are following sits in. Stop when that dot is alone in its own piece.
- Count the cuts that took. A dot in the middle of a crowd needs many cuts, because every cut still leaves neighbours with it. A dot out on its own gets fenced off in one or two.
- Now do the whole thing about a hundred times, with different random cuts, and average the count for each row. **Few cuts on average means anomalous.** That is the entire algorithm.
- Notice what it never does: it never measures a distance, never estimates a density, never assumes a shape for normal, and never sees a label. The oddness of a row is measured by how easy it was to separate.
- The library reports this as a score rather than as a count of cuts. Lower score means fewer cuts means more anomalous, and the useful thing is the *order* of the scores, not any particular value.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Isolation Forest on payments, with no labels at all',
      code: `import numpy as np
from sklearn.ensemble import IsolationForest

rng = np.random.default_rng(0)
normal = rng.normal(loc=[50, 13], scale=[8, 2], size=(300, 2))
odd = np.array([[300.0, 13.0], [50.0, 3.0], [290.0, 3.5]])
X = np.vstack([normal, odd])
iso = IsolationForest(random_state=0).fit(X)
scores = iso.score_samples(X)
print('median score of the 300 ordinary rows:', round(float(np.median(scores[:300])), 3))
print('scores of the three odd rows         :', scores[-3:].round(3))
order = np.argsort(scores)
print('the three lowest scores are rows     :', order[:3])

# ---- real output ----
# median score of the 300 ordinary rows: -0.411
# scores of the three odd rows         : [-0.804 -0.714 -0.844]
# the three lowest scores are rows     : [302 300 301]`,
      annotations: {
        1: 'numpy, for the arrays.',
        2: 'IsolationForest comes from scikit-learn, the standard Python machine learning library.',
        4: 'The same fixed-seed random generator as before, so these numbers are reproducible.',
        5: 'rng.normal draws random numbers that pile up around a centre. loc is the centre of each column, scale is its typical distance from that centre, and size asks for 300 rows of 2 columns. So: 300 ordinary payments of about 50 rupees made at about 1 pm.',
        6: 'Three payments we planted by hand: a huge one at a normal hour, a normal one at 3 am, and a huge one at 3 am. np.array turns the list of lists into a numpy grid.',
        7: 'np.vstack stacks the two grids on top of each other, giving 303 rows. The planted three are the last three rows.',
        8: 'Build the forest and fit it to X. random_state=0 fixes its random cuts so the output is reproducible. Note what is not passed: no labels. Nothing here knows which rows are odd.',
        9: 'score_samples gives one score per row. More negative means fewer cuts were needed, which means more anomalous.',
        10: 'np.median is the middle value when sorted. The middle ordinary row scores -0.411. scores[:300] is the first 300 scores, the ordinary ones. float() converts the numpy value to a plain Python number so round() prints it cleanly.',
        11: 'scores[-3:] is the last three scores, our planted rows. They come out at -0.804, -0.714 and -0.844, clearly below the ordinary middle of -0.411. .round(3) rounds every value in the array.',
        12: 'np.argsort returns the row numbers that would sort the scores from lowest to highest, rather than the sorted scores themselves.',
        13: 'The three most anomalous rows are 302, 300 and 301: exactly the three we planted, in the top three of 303. The forest found them without ever being told they existed, and it caught the 3 am payment of a perfectly normal amount, which a single-column z-score on amount alone would have missed.',
      },
    },
    {
      type: 'intuition',
      title: 'Worked case: five sensor readings, reduced by hand',
      md: `A machine reports two numbers each hour. Five readings: **(0, 0), (2, 1), (4, 2), (6, 3), (8, 5)**. Do the whole of PCA on paper.

1. **Centre.** First column adds to 20, so its average is 4. Second adds to 11, so its average is 2.2. Subtract: **(-4, -2.2), (-2, -1.2), (0, -0.2), (2, 0.8), (4, 2.8)**.
2. **Total spread.** First column: squares are 16, 4, 0, 4, 16, adding to 40, divided by 5 gives **8.0**. Second column: 4.84, 1.44, 0.04, 0.64, 7.84 add to 14.8, divided by 5 gives **2.96**. Total = **10.96**.
3. **Try a ruler.** The readings roughly double, so try the direction (2, 1) made length 1, which is **(0.894, 0.447)**. Project each centred point with the dot product: -4(0.894) - 2.2(0.447) = **-4.559**, then **-2.324**, **-0.089**, **+2.146**, **+4.828**.
4. **Score it.** Square those and average: (20.78 + 5.40 + 0.01 + 4.61 + 23.31) / 5 = **10.82**. Explained variance ratio = 10.82 / 10.96 = **0.9874**. Our guessed ruler keeps 98.74%.
5. **The real PC1.** Searching all angles gives **(0.856, 0.517)** with ratio **0.9946** — better than the guess, as it must be, since PC1 is the winner of that search.
6. **Reconstruct reading five.** It sits at t = 4.828 along our guessed ruler. Walking that far gives (4.32, 2.16), plus the centre (4, 2.2) gives **(8.32, 4.36)**. The truth was (8, 5): out by 0.32 and 0.64.

Read step 6 with step 4 in mind. Keeping 98.74% of the spread still left the last reading wrong by 0.64 in its second number. A high explained variance ratio is a statement about the cloud as a whole, never a promise about any single row.`,
    },
    {
      type: 'intuition',
      title: 'The classic mistake: PCA on unscaled columns',
      md: `The wine dataset ships with scikit-learn: 178 wines, 13 chemical measurements each. Someone loads it and runs PCA straight away, without scaling.

- The result looks wonderful. PC1 explains **99.81%** of the variance. One number replaces thirteen. It goes in the report.
- Run the next snippet before reading on. It prints the spread of each of the 13 columns first, and then what PC1 turned out to be.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The mistake, run',
      code: `import numpy as np
from sklearn.datasets import load_wine
from sklearn.decomposition import PCA

data = load_wine()
X = data.data
print('column spreads:', X.std(axis=0).round(1))
raw = PCA().fit(X)
print('PC1 keeps     :', round(float(raw.explained_variance_ratio_[0]), 4))
print('PC1 weights on:', data.feature_names[int(np.argmax(abs(raw.components_[0])))])

# ---- real output ----
# column spreads: [8.00e-01 1.10e+00 3.00e-01 3.30e+00 1.42e+01 6.00e-01 1.00e+00
#                  1.00e-01 6.00e-01 2.30e+00 2.00e-01 7.00e-01 3.14e+02]
# PC1 keeps     : 0.9981
# PC1 weights on: proline`,
      annotations: {
        1: 'numpy, for argmax below.',
        2: 'load_wine fetches the built-in dataset. No download, it ships with the library.',
        3: 'PCA, the library version of everything we did by hand.',
        5: 'Load it. data holds the numbers and the column names together.',
        6: 'data.data is the grid: 178 rows, 13 columns.',
        7: 'X.std(axis=0) is the standard deviation of each column, computed down the rows. Printed in scientific notation: 8.00e-01 means 0.8, and 3.14e+02 means 314. Twelve columns sit between 0.1 and 14. The thirteenth is 314.',
        8: 'Fit PCA to the raw, unscaled grid. PCA() with no arguments keeps all 13 components.',
        9: 'explained_variance_ratio_[0] is PC1\'s share of the total spread, exactly the fraction we computed by hand. It reports 0.9981.',
        10: 'Read this inside out. raw.components_[0] is PC1, a list of 13 weights, one per column. abs() drops the minus signs. np.argmax gives the position of the largest, and feature_names turns that position into a column name. The answer is proline: the column whose spread was 314.',
      },
    },
    {
      type: 'note',
      md: `The diagnosis. Proline is measured in the hundreds and everything else in single digits, so proline\'s variance is thousands of times larger than any other column\'s before a single calculation has been done. PCA picks the direction of largest variance, so PC1 came out as very nearly a copy of the proline column, and the impressive 99.81% is really the sentence "proline has the biggest numbers". Nothing was discovered. The fix is scaling, as promised earlier: divide each column by its own spread first, so the 13 columns arrive at the contest the same size. Run it that way and the honest picture appears.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The same data, scaled first',
      code: `import numpy as np
from sklearn.datasets import load_wine
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler

X = load_wine().data
Xs = StandardScaler().fit_transform(X)
fit = PCA().fit(Xs)
print('top five shares:', fit.explained_variance_ratio_[:5].round(3))
print('running total  :', np.cumsum(fit.explained_variance_ratio_)[:5].round(3))
print('needed for 95% :', PCA(n_components=0.95).fit(Xs).n_components_)

# ---- real output ----
# top five shares: [0.362 0.192 0.111 0.071 0.066]
# running total  : [0.362 0.554 0.665 0.736 0.802]
# needed for 95% : 10`,
      annotations: {
        1: 'numpy, for the running total below.',
        2: 'The same dataset.',
        3: 'The same PCA.',
        4: 'StandardScaler is the library tool that centres each column and divides it by its spread.',
        6: 'The same 13 columns, unscaled for now.',
        7: 'fit_transform learns each column\'s average and spread, then returns the standardised grid. Every column of Xs now has average 0 and variance 1.',
        8: 'Run PCA on the standardised grid.',
        9: 'The first five shares: 36.2%, 19.2%, 11.1%, 7.1%, 6.6%. No single direction dominates, which is the truth this dataset was hiding behind proline.',
        10: 'np.cumsum is the running total: each entry is that share plus all the ones before it. After five components we have 80.2% of the spread.',
        11: 'Passing a number between 0 and 1 as n_components asks scikit-learn for however many components reach that share. The answer is 10 of 13, so this data barely compresses at all. Reporting that honestly is the right outcome; the flattering 99.81% was the wrong one.',
      },
    },
    {
      type: 'intuition',
      title: 'Practice problems',
      md: `Pen and paper. The arithmetic is small on purpose.

1. Project the point (3, 4) onto the direction (0.8, 0.6). How far along does it land, where is its shadow, and how long is the leftover walk?
2. Four points: (1, 1), (3, 3), (5, 5), (7, 7). Centre them, then compute the spread along (0.707, 0.707) and along (-0.707, 0.707). What is the explained variance ratio of the first direction, and why is the answer exactly what it is?
3. A table has two columns: height in centimetres, spread about 10, and shoe size, spread about 1.5. PCA is run without scaling. Predict what PC1 will be, and give the one line of code that fixes it.
4. Six delivery times in minutes: 30, 32, 31, 29, 33, 95. Compute the mean, the standard deviation, and the z-score of 95 with all six included. Then recompute mean and standard deviation from the first five only, and give the z-score of 95 against those. Which is the more useful number, and what is the effect called?
5. A colleague clusters customers using the two coordinates a t-SNE plot produced, and reports that segment A is far from segment B so they are very different. Give the two things wrong with that sentence.`,
    },
    {
      type: 'intuition',
      title: 'Worked solutions',
      md: `Check each step, not only the final number.

1. Dot product: 3(0.8) + 4(0.6) = 2.4 + 2.4 = **5.0** along. Shadow: 5.0 times (0.8, 0.6) = **(4.0, 3.0)**. Leftover: (3 - 4, 4 - 3) = (-1, 1), whose length is the square root of 2 = **1.414**.
2. The average is (4, 4), so centred the points are (-3, -3), (-1, -1), (1, 1), (3, 3). Projections onto (0.707, 0.707): -4.243, -1.414, 1.414, 4.243. Squares average to (18 + 2 + 2 + 18)/4 = **10.0**. Onto the perpendicular direction every projection is 0, so its spread is **0**. Ratio = 10 / (10 + 0) = **1.0**. It is exactly 1 because the four points sit perfectly on one straight line, so one number describes each point with no loss at all.
3. Height\'s variance is about 100 and shoe size\'s about 2.25, so height wins by a factor of 44 before anything is computed: **PC1 will be almost exactly the height column**, and its explained variance ratio will look impressive and mean nothing. Fix: **Xs = StandardScaler().fit_transform(X)** before fitting PCA.
4. All six: sum is 250, mean **41.67**. Squared distances: 136.1, 93.4, 113.4, 160.4, 75.1, 2844.4, adding to 3422.8; divided by 6 gives 570.5, whose square root is **23.88**. z of 95 = (95 - 41.67) / 23.88 = **2.23**. First five only: mean **31.0**, squared distances 1, 1, 0, 4, 4 add to 10, divided by 5 gives 2.0, square root **1.41**. z of 95 = (95 - 31) / 1.41 = **45.3**. The second is far more useful: 45 standard deviations is an unmistakable alarm while 2.23 is borderline. The outlier inflated both the mean and the spread that were supposed to describe normal, which is **masking**.
5. First, you must not cluster on t-SNE coordinates at all: those two numbers were produced to make a readable picture, and any method that measures distance between them is measuring an artefact. Cluster in the original columns, then use the picture only to colour what you found. Second, distance between blobs in a t-SNE picture carries no meaning, so "far apart, therefore very different" is not supported by anything — and rerunning with a different random start or a different neighbourhood setting can rearrange the blobs entirely.`,
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `Everything above stands on its own. This names what is under the hood, so the words are familiar later.

- **How libraries really find PC1.** Not by searching angles. Build the covariance matrix: entry (i, j) is the average of centred column i times centred column j, so the diagonal holds each column\'s variance and the off-diagonal holds how columns move together. The principal components are its **eigenvectors** — the directions this matrix does not rotate, from the Math module *Matrices as Transformations* — and each one\'s **eigenvalue** is the variance along it. Explained variance ratio is one eigenvalue divided by their sum. In practice even that is skipped in favour of the **singular value decomposition** of the centred data, which produces the same directions with better numerical behaviour.
- **LDA.** When you do have labels, Linear Discriminant Analysis finds directions that separate the labelled groups rather than directions with the most spread. It is the supervised answer to the complaint that PCA can drop a quiet but decisive direction.
- **Kernel PCA.** PCA can only use straight rulers. If the structure of your data is a curve or a spiral, no straight ruler recovers it. Kernel PCA reaches the curved case by measuring similarity between points instead of coordinates.
- **Two other anomaly detectors.** Local Outlier Factor compares a row\'s local crowding against that of its neighbours, so it catches a row that is odd only relative to its own neighbourhood, which Isolation Forest can miss. One-Class SVM draws a boundary around the normal region and flags whatever falls outside; it wants clean training data, scaled columns, and not too many rows.
- **Evaluating with no labels.** Plant anomalies you designed and check they rank near the top. Have a human label a sample of the highest-ranked alerts and report what fraction were real, which is the number the team actually feels. Rerun with different random seeds and check the same rows keep surfacing. When a few hundred real labels do exist, judge with precision and recall rather than accuracy, because at 1% anomalies accuracy is meaningless.`,
    },
  ],
  quiz: [
    {
      question: 'Projecting a point onto a direction of length 1 means doing what arithmetic?',
      options: [
        {
          text: 'Multiply matching parts of the point and the direction and add them up, which is the dot product',
          explanation: 'Correct. For (4.0, 3.0) onto (0.6, 0.8): 4.0(0.6) + 3.0(0.8) = 4.8. That single number is how far along the direction the point landed.',
        },
        { text: 'Divide the point by the direction, one part at a time', explanation: 'There is no division here, and dividing by a zero part of the direction would not even be defined.' },
        { text: 'Take the distance from the point to the origin', explanation: 'That ignores the direction entirely, so every direction would give the same answer.' },
      ],
      correct: 0,
    },
    {
      question: 'Why must the data be centred before PCA chooses a direction?',
      options: [
        { text: 'To make the numbers smaller so the arithmetic is faster', explanation: 'Speed is not the reason, and centring does not reliably shrink anything.' },
        {
          text: 'Because spread is measured around a centre, and without centring the arithmetic measures spread around (0, 0), so the first direction points at where the cloud sits rather than describing its shape',
          explanation: 'Correct. Centring slides the cloud without rotating or stretching it, so the shape being measured is the real one.',
        },
        { text: 'Because PCA cannot handle negative numbers', explanation: 'Centring creates negative numbers rather than removing them: half the centred values are below zero.' },
      ],
      correct: 1,
    },
    {
      question: 'PCA on the raw wine data reports PC1 explaining 99.81% of the variance. What actually happened?',
      options: [
        { text: 'The dataset genuinely compresses to one number', explanation: 'Scaled first, the same data needs 10 of its 13 components to reach 95%. It barely compresses at all.' },
        {
          text: 'One column, proline, is measured in the hundreds while the rest are single digits, so it had the largest variance before any calculation and PC1 came out as a copy of it',
          explanation: 'Correct. Variance carries the units of the column, so unscaled PCA rewards whichever column was measured with the biggest ruler.',
        },
        { text: 'PCA overfitted to the 178 rows', explanation: 'PCA never looks at a target and there is no fitting to labels here. The result is a units problem, not an overfitting one.' },
      ],
      correct: 1,
    },
    {
      question: 'Your data has 30 columns and you keep 3 components. Can you now stop collecting some of the original 30?',
      options: [
        { text: 'Yes, the 27 dropped components correspond to 27 dropped columns', explanation: 'Components are not columns. Every component mixes all 30 columns together.' },
        {
          text: 'No. Each kept component is a weighted mix of all 30 columns, so all 30 are still needed to compute it',
          explanation: 'Correct. PCA is not feature selection. If the goal is to stop paying for a data feed, you need a method that keeps actual columns.',
        },
        { text: 'Yes, provided the dropped components explain less than 5% of the variance', explanation: 'The variance share says how much of the cloud shape you kept. It says nothing about which columns you still have to collect.' },
      ],
      correct: 1,
    },
    {
      question: 'Two clusters sit on opposite sides of a t-SNE picture. What follows?',
      options: [
        { text: 'They are the two most different groups in the data', explanation: 'Distance between blobs in these pictures is not meaningful. Two touching blobs can be less similar than two far-apart ones.' },
        {
          text: 'Almost nothing. Distances between blobs carry no meaning, and a different random start or neighbourhood setting can rearrange the layout',
          explanation: 'Correct. The one thing the picture supports is that points inside a blob were neighbours in the original data, and even that is worth checking across several runs.',
        },
        { text: 'One cluster is a subset of the other', explanation: 'Nothing about a layout supports a containment claim.' },
      ],
      correct: 1,
    },
    {
      question: 'Why does Isolation Forest need fewer random cuts to fence off an anomaly?',
      options: [
        { text: 'Because it cuts on the most informative column first', explanation: 'It does the opposite: both the column and the cut value are chosen at random, with no criterion and no labels.' },
        {
          text: 'Because an anomalous row sits away from the crowd, so an early random cut is likely to separate it from everything else',
          explanation: 'Correct. A row inside a crowd keeps company after every cut and needs many of them; a lone row falls out in one or two. Few cuts on average means anomalous.',
        },
        { text: 'Because anomalies are removed from the data before the trees are built', explanation: 'That would require already knowing the answer, which is exactly what is missing here.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Explain PCA to someone who has not seen it, without using the word eigenvector.',
      answer:
        'Plot the rows as a cloud of points. The cloud is usually stretched in some direction rather than being a round ball. PCA slides the cloud so its middle sits at the origin, then finds the direction along which the points are most spread out, and describes each point by how far along that direction it sits. That is one number instead of however many columns you had. The direction with the most spread is the first principal component; the next one is the best direction perpendicular to it, and so on. You keep as many as you need and drop the rest. The share of the total spread a component captures is its explained variance ratio, and it is how you report what the compression cost. Concretely, on six two-column rows I can show one direction keeping 98% of the spread, so one number per row loses almost nothing.',
      isCaseBased: false,
    },
    {
      question: 'Why must you standardise before PCA, and when should you not?',
      answer:
        'PCA picks the direction of largest variance, and variance carries the units of the column. A salary in rupees has a variance in the hundreds of millions; an age in years has a variance near a hundred. That comparison is a contest between measuring units, not between informativeness, so the first component degenerates into a copy of the largest-unit column. On the raw wine dataset this is measurable: PC1 reports 99.81% of the variance and its largest weight is proline, the one column measured in the hundreds. Standardising, meaning centre each column and divide by its spread, brings all columns to the contest at the same size. The exception is when all columns are already the same physical unit and their relative sizes are real, such as pixel brightnesses or spectra, where scaling would inflate near-dead channels into equals. And fit the scaler on the training split only.',
      isCaseBased: false,
    },
    {
      question: 'Is PCA a form of feature selection? If not, what would you use instead?',
      answer:
        'No, and the difference has practical consequences. Feature selection keeps a subset of your original columns and discards the others, so you can stop collecting them and you can still explain a decision in terms of a real quantity. PCA keeps all columns and replaces them with weighted mixtures, so every original column is still required at prediction time and no component has a name a person can use. It is a compressor that also removes correlation between columns, not a selector. If the goal is fewer data sources or an explainable model, use methods that keep real columns: L1 regularisation drives coefficients to exactly zero, univariate ranking by mutual information gives a cheap ordering, and permutation importance on a tree model ranks columns while accounting for interactions. If the goal is supervised dimensionality reduction with labels available, LDA finds directions that separate the classes rather than directions with the most spread.',
      isCaseBased: false,
    },
    {
      question: 'Case: a colleague reports that adding PCA lifted cross-validated accuracy from 0.81 to 0.94, but the deployed model scores 0.79. Debug it.',
      answer:
        'The first hypothesis, and usually the right one, is leakage through the preprocessing step. If the scaler and PCA were fitted on the whole dataset before splitting, then every validation fold contributed to the column averages, the column spreads, and the component directions, so the validation rows were never unseen and the 0.94 is contaminated. Production genuinely sees new rows, hence 0.79. The fix is to put the scaler, PCA and the model into a single pipeline and pass that to cross-validation, so all three are refitted inside each fold. Second hypothesis: the number of components was chosen by looking at the same cross-validation that reported the score, which makes 0.94 an optimistic pick rather than an estimate; that needs a held-out set or nested cross-validation. Third: the input distribution shifted, so the directions learned in training no longer describe production data. The tell that separates them is timing. Leakage shows a gap immediately at deployment; drift shows a gap that grows over weeks.',
      isCaseBased: true,
    },
    {
      question: 'How do you decide how many components to keep, and what do you tell a stakeholder?',
      answer:
        'Three tools. First, the running total of explained variance ratio: pick the smallest number of components reaching a stated share, commonly 95%, and scikit-learn accepts that share directly as n_components. Second, plot the shares in order and look for the point where the curve flattens out, and keep the components before it. Third, and most honest, treat the count as an ordinary hyperparameter and tune it inside cross-validation against the metric you actually care about, because 95% of variance has no guaranteed relationship with downstream performance. What I tell a stakeholder is the cost, not the flattery: on the wine dataset, 13 columns become 10 for 95% of the variance, which is a legitimate finding that PCA is not buying much here. Reporting a poor compression ratio is better than forcing two components because they plot nicely.',
      isCaseBased: false,
    },
    {
      question: 'Case: a colleague ran t-SNE on customer data, saw six blobs, clustered on the t-SNE coordinates, and is presenting six customer segments tomorrow. What do you say?',
      answer:
        'Three problems, worst first. One: do not cluster on t-SNE coordinates. Those two numbers were produced to make a readable picture, the method distorts distances deliberately, and any clustering method that measures distance is therefore optimising against an artefact. Cluster in the original columns, or in a PCA-reduced space, then use the picture only to colour and display what you found. Two: the number of blobs is not stable. The method starts from a random layout and its neighbourhood setting strongly controls apparent granularity, so a different seed or setting can turn one blob into four. Rerun across several and present only structure that survives. Three: blob sizes and the gaps between them carry no meaning, so a claim such as "segment three is our biggest and most distinct" is unsupported by the plot. What I would ship instead: cluster in the real feature space, check the resulting groups differ on columns a human can name, and keep the t-SNE picture purely as the illustration on the slide.',
      isCaseBased: true,
    },
    {
      question: 'Explain Isolation Forest, and say why the idea is unusual.',
      answer:
        'Picture the rows as dots. Pick a column at random, pick a random value in its range, and cut. Keep cutting inside whichever piece your dot is in, until that dot is alone. A dot in the middle of a crowd needs many cuts to be separated from its neighbours; a dot out on its own is fenced off after one or two. Repeat with about a hundred different random cutting sequences and average the count per row. Few cuts means anomalous. What is unusual is the inversion: almost every other method first builds a description of normal, a density or a boundary or a set of cluster centres, and then measures distance from it, which is expensive and requires assuming a shape. Isolation Forest goes at the anomalies directly and needs no distance measure, no density estimate, and no assumption about what normal looks like. It also runs in roughly n log n time and works on a small random subsample per tree, because a lone point is even easier to isolate in a small sample.',
      isCaseBased: false,
    },
    {
      question: 'Case: your fraud detector sends 500 alerts a day, analysts say nine in ten are useless, but it did catch last month\'s big incident. What do you change?',
      answer:
        'The diagnosis is that the model is thresholding rather than ranking, and the threshold assumes a much higher anomaly rate than is real, so it is obliged to label a fixed fraction of rows as anomalies whether or not that many are odd. Actions in order. First, stop thresholding and start ranking: take the raw scores, sort them, and send the top N where N is what the team can actually review in a day. Alert volume becomes a capacity decision rather than a modelling accident. Second, measure the fraction of those top N that turn out real, and track it weekly, because that is the number the analysts feel. Third, keep the analyst verdicts as labels; after a few weeks you have enough to evaluate properly and possibly to train a supervised model for the fraud types you now know, while the unsupervised detector stays on to catch new ones. Fourth, look for a mundane explanation of the false alarms, such as a new product line or a nightly batch job, and either add it as context or exclude that segment. The trade-off to say out loud: cutting alert volume raises precision and lowers recall, so somebody has to state what a missed fraud costs against an hour of analyst time.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'PCA in one sentence', back: 'Centre the cloud, find the direction the points are most spread along, and describe each row by how far along that direction it sits. Repeat perpendicular to it for the next component.' },
    { front: 'Projection = which arithmetic', back: 'The dot product with a length-1 direction: multiply matching parts, add. (4.0, 3.0) onto (0.6, 0.8) gives 4.8. The leftover walk to the ruler, here length 1.4, is what you throw away.' },
    { front: 'Why centre before PCA', back: 'Spread must be measured around the middle of the data. Without centring you measure spread around (0, 0), so the first direction points at where the cloud sits instead of describing its shape.' },
    { front: 'Why scale before PCA', back: 'Variance carries the column\'s units, so the biggest-unit column wins by default. Raw wine data: PC1 keeps 99.81% of the variance and is essentially the proline column, measured in the hundreds. Scaled, the same data needs 10 of 13 components for 95%.' },
    { front: 'Explained variance ratio', back: 'Spread along a component divided by the total spread of the cloud. Between 0 and 1, always decreasing across components, and it describes the cloud as a whole, never any single row.' },
    { front: 'What PCA is NOT', back: 'Not feature selection: every component mixes all original columns, so you still have to collect them all. Not interpretable: with many columns a component is a nameless mixture. And it never sees your target.' },
    { front: 't-SNE and UMAP, honestly', back: 'For looking at data, not for feeding a model. Distances between blobs mean nothing, blob sizes mean nothing, and a different seed or setting redraws the picture.' },
    { front: 'Isolation Forest', back: 'Cut at random columns and random values until a row is alone; count the cuts; average over about 100 tries. Few cuts means anomalous. No distance, no density, no labels. Measured: three planted odd rows ranked as the three most anomalous of 303.' },
  ],
  mindmapMarkdown: `- PCA, t-SNE & Anomaly Detection
  - The six-student cloud
    - two numbers per row = two dimensions
    - points lean along one direction
    - goal: one number per row, small loss
  - The one move: projection
    - direction = arrow of length 1
    - projection = dot product with it
    - (4.0, 3.0) onto (0.6, 0.8) = 4.8
    - leftover walk of length 1.4 is what is lost
  - Two things PCA needs
    - centring: spread must be measured around the middle
    - scaling: variance carries the column's units
  - Scoring a direction
    - variance = average of squared centred values
    - total spread is fixed: 4.84 + 7.077 = 11.917
    - explained variance ratio = share of that total
  - PC1 = winner of the search
    - angle search finds (0.629, 0.777)
    - keeps 98.08% of the spread
    - PC2 is the best perpendicular direction
    - reconstruction misses each point by 0.2 to 0.5
  - What PCA is not
    - not feature selection: all columns still needed
    - components are not interpretable
    - never looks at the target
  - The classic mistake
    - unscaled wine: PC1 = 99.81% = proline
    - scaled: 10 of 13 components for 95%
  - t-SNE and UMAP
    - for looking, not for feeding a model
    - distances between blobs mean nothing
    - blob sizes mean nothing
    - seed and settings change the picture
  - Anomaly detection
    - anomaly = row unlike the rest, rare and unlabelled
    - z-score: simple, one column, and outliers mask themselves
    - measured: z of 3.0 with the outlier in, 84.9 with it out
    - Isolation Forest: few random cuts = anomalous
    - rank and send the top N a human can review
  - Beyond the basics
    - eigenvectors of the covariance matrix, SVD in practice
    - LDA when labels exist, kernel PCA when structure curves
    - LOF for locally odd rows, One-Class SVM for clean data
    - evaluate by planted anomalies, precision on top N, stability`,
}

export default m
