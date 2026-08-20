import type { Module } from '../types'

const m: Module = {
  id: 'metrics-l1-regression-losses',
  subjectId: 'metrics',
  level: 1,
  title: 'Regression Losses: MSE, MAE, Huber & Quantile',
  whyItMatters:
    'When a model has to predict a number - a delivery time, a price, tomorrow\'s demand - you must tell it how much each kind of mistake costs. That instruction is the loss function, and it quietly decides what the model predicts. Here you take five delivery times, add one broken-bike delivery of 90 minutes, and watch one loss move its answer from 12 minutes to 25 while another moves it by half a minute. Everything is computed with plain Python lists and a for loop, so you see the number move rather than take a claim on trust.',
  assumes: [
    'You know what an average is, and what the middle value of a sorted list (the median) is',
    'You have seen a Python list, a for loop, a function, and the abs() function',
    'You remember from school maths that squaring a number makes it positive, and that a square root undoes a square',
    'Read *Loss vs Metric* (Level 0) first: it explains what a loss is and why training needs one',
  ],
  estMinutes: 44,
  sections: [
    {
      type: 'intuition',
      title: 'Five delivery times, then one 90',
      md: `Five deliveries took 10, 11, 12, 13, 14 minutes. You must publish a single number as the promised time for all of them. Easy - 12.

Now a sixth delivery arrives at **90** minutes. The rider's bike broke on the way. Publish one number again.

- Say 25 and you are wrong about every single normal delivery.
- Say 12 and you are enormously wrong about one of them.
- There is no correct answer here. There is only **what you have decided to be wrong about**.
- The loss function is where you write that decision down. It is the rule that says how much each miss costs.
- Two common rules give two different answers on this exact data: one says 25, the other says 12. Neither is broken. They disagree about what "typical" means, and the rest of this module is about that disagreement.`,
    },
    {
      type: 'intuition',
      title: 'Two words used on every line from here on',
      md: `Before any formula, names for things you have already been doing.

- **Prediction** - the number the model outputs for a row. Written as y-hat when it appears in a formula. In the delivery example, the single number you publish is the prediction.
- **Actual** - the number that really happened, written y. For delivery three, y = 12.
- **Residual** - actual minus prediction. It is just "how far off were we, and in which direction". We write it as r, and the whole module uses one convention: **r = actual - prediction**.
- A positive residual means the real value came in **above** your prediction: you predicted too low. A negative residual means you predicted too high.
- With a prediction of 12, the five clean deliveries have residuals -2, -1, 0, 1, 2. The broken-bike delivery has residual 90 - 12 = **78**.

A loss function is a price list for residuals. Hand it a residual, it hands back a cost. Everything below is four different price lists.`,
    },
    {
      type: 'intuition',
      title: 'MSE: square the miss',
      md: `**MSE** stands for **Mean Squared Error**. The recipe is those three words read backwards: take the error (the residual), square it, then take the mean of all the squares.

- Squaring does two jobs at once. It throws away the sign, so being 2 too high and 2 too low cost the same. And it makes big misses cost far more than small ones.
- Miss by 2 and you pay 4. Miss by 10 and you pay 100. Miss by 78 and you pay 6,084.
- The cost does not grow at the same speed as the error - doubling the error multiplies the cost by four. That is what "squared penalty" means in practice.
- That is a good rule when a big miss really is far worse than several small ones: a bridge, a drug dosage, a battery temperature.
- It is a bad rule when the big miss is simply a bad row of data, because you have just told the model that the bad row is the most important thing in the dataset.

Compute it by hand on the five clean deliveries, predicting 12: residuals -2, -1, 0, 1, 2, so the squares are 4, 1, 0, 1, 4. They add to 10, and 10 divided by 5 is **2.0**. That is the MSE.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 1: MSE and MAE on the five clean deliveries, with one for loop',
      code: `y = [10, 11, 12, 13, 14]   # the five actual delivery times, in minutes
guess = 12                 # the one number we predict for all of them

sq_total = 0               # running total of squared residuals, starts empty
abs_total = 0              # running total of plain distances, starts empty
for actual in y:           # take the deliveries one at a time
    error = actual - guess           # the residual: actual minus prediction
    sq_total = sq_total + error * error   # square it, then add it on
    abs_total = abs_total + abs(error)    # abs() just removes any minus sign

print('MSE', sq_total / len(y))    # mean of the squares; len(y) is 5, the list length
print('MAE', abs_total / len(y))   # mean of the distances - the second price list

# ---- real output ----
# MSE 2.0
# MAE 1.2`,
      annotations: {
        1: 'A plain Python list of five numbers. No library, nothing imported - this is all the machinery the whole idea needs.',
        2: 'The prediction we are testing. One number stands in for all five rows, which is the simplest possible model.',
        4: 'A counter set to zero. Each loop pass will add one row\'s squared residual to it.',
        5: 'A second counter, for the un-squared version. Running both side by side is the entire point of this snippet.',
        6: 'A for loop over the list. On each pass the variable "actual" holds one delivery time: 10, then 11, then 12, and so on.',
        7: 'The residual, following the module convention: actual minus prediction. Across the five passes it is -2, -1, 0, 1, 2.',
        8: 'error * error is the square. Squaring a negative gives a positive, so -2 and +2 both cost 4. The total accumulates 4 + 1 + 0 + 1 + 4 = 10.',
        9: 'abs(error) is the built-in absolute value: it strips a minus sign and leaves everything else alone. This total is 2 + 1 + 0 + 1 + 2 = 6.',
        11: '10 divided by 5 gives 2.0 - the "mean" in mean squared error. Dividing by the count keeps the number comparable across datasets of different sizes.',
        12: '6 divided by 5 gives 1.2. Same five residuals, a different price list, a different number. Remember 2.0 and 1.2; step 2 breaks both of them.',
      },
    },
    {
      type: 'intuition',
      title: 'MAE: pay the distance, do not square it',
      md: `That second number has a name too. **MAE** is **Mean Absolute Error**: take each residual, make it positive with abs(), and average. No squaring anywhere.

- Miss by 2 and you pay 2. Miss by 78 and you pay 78. The cost grows exactly as fast as the error does.
- The consequence is the whole reason MAE exists: **one bad row cannot buy the model.** Under MSE that residual of 78 is worth 6,084 units of "please move towards me". Under MAE it is worth 78.
- The two are not just different scales of the same thing. They pick different answers, and each answer has a name.
- The single number that minimises MSE is the **mean** of the data. The single number that minimises MAE is the **median** - the middle value once the numbers are sorted.
- Check that against the delivery list. The mean of 10, 11, 12, 13, 14 is 12 and the median is also 12, so on clean data the two agree and the choice of loss looks like it does not matter.

That is the trap. The choice is invisible until the data gets dirty. Add the broken bike and watch.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 2: add the 90, then price three candidate predictions',
      code: `def mse(y, guess):                    # same arithmetic as step 1, now reusable
    total = 0
    for actual in y:
        total = total + (actual - guess) ** 2   # ** 2 is Python for "squared"
    return total / len(y)

def mae(y, guess):                    # the un-squared twin
    total = 0
    for actual in y:
        total = total + abs(actual - guess)
    return total / len(y)

dirty = [10, 11, 12, 13, 14, 90]      # the five good rows plus the broken bike
for guess in [12, 12.5, 25]:          # three candidate predictions to price
    print(guess, round(mse(dirty, guess), 2), round(mae(dirty, guess), 2))

# ---- real output ----
# 12 1015.67 14.0
# 12.5 1002.92 14.0
# 25 846.67 21.67`,
      annotations: {
        1: 'Wraps step 1\'s squared-error loop in a function, so we can call it with different data and different predictions instead of retyping it.',
        2: 'The running total again, reset to zero on every call.',
        3: 'The same walk through the list of actual values.',
        4: '(actual - guess) is the residual and ** 2 squares it. ** is Python\'s power operator, so x ** 2 means x times x.',
        5: 'Divide by the number of rows and hand the answer back to whoever called the function.',
        7: 'The MAE version. Identical structure, one changed line - which is the only real difference between the two losses.',
        8: 'Its own zeroed total.',
        9: 'The same loop over the actual values.',
        10: 'abs() instead of squaring. That single change is what the rest of this module is about.',
        11: 'Return the average distance.',
        13: 'The dirty dataset: exactly the clean list with one 90 added at the end. Nothing else changed, so anything that moves below is caused by that one row.',
        14: 'Three predictions worth pricing: 12 (the clean answer), 12.5, and 25 (the mean of the dirty data).',
        15: 'Print each candidate with its MSE and its MAE. round(x, 2) trims a long float to 2 decimal places so the columns line up.',
      },
    },
    {
      type: 'note',
      md: `Read the three output rows as a competition. **MSE** charges 1015.67 for predicting 12 and only 846.67 for predicting 25, so MSE prefers 25. **MAE** charges 14.0 for predicting 12 and 21.67 for predicting 25, so MAE prefers 12. Same six numbers, same three candidates, opposite winners. The reason is in the arithmetic you just ran: moving the prediction from 12 up to 25 costs each of the five good rows about 13 extra minutes of error, and in exchange it cuts the one bad row's error from 78 to 65. Under MAE that trade is a wash at best - about 65 saved against 65 spent. Under MSE the bad row's cost falls from 6,084 to 4,225, which swamps everything the five good rows just gave up.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Step 3: stop guessing candidates - scan for the best prediction of each loss',
      code: `def scan(y, loss):                  # try many predictions, keep the cheapest
    best_guess = None               # nothing tried yet
    best_value = None
    g = 0.0                         # start the sweep at 0 minutes
    while g <= 100.0:               # ... and walk it up to 100 minutes
        v = loss(y, g)              # what this loss charges for predicting g
        if best_value is None or v < best_value - 1e-12:   # strictly cheaper? keep it
            best_value, best_guess = v, g
        g = round(g + 0.5, 1)       # step half a minute; round() clears float drift
    return best_guess

clean = [10, 11, 12, 13, 14]
dirty = [10, 11, 12, 13, 14, 90]
print('clean: MSE fit', scan(clean, mse), ' MAE fit', scan(clean, mae))
print('dirty: MSE fit', scan(dirty, mse), ' MAE fit', scan(dirty, mae))

# ---- real output ----
# clean: MSE fit 12.0  MAE fit 12.0
# dirty: MSE fit 25.0  MAE fit 12.0`,
      annotations: {
        1: 'Takes the data and a loss FUNCTION. In Python a function can be passed around like any other value, so the same scanner works for mse and for mae.',
        2: 'The best prediction found so far. None means "nothing tried yet", so the first candidate always wins.',
        3: 'The cost of that best prediction, also empty at the start.',
        4: 'The candidate we are currently testing, starting at 0.0 minutes.',
        5: 'A while loop: keep going while g is still at or below 100. Brute force, slow and completely clear - the right trade when learning.',
        6: 'Call whichever loss was handed in, on the current candidate.',
        7: 'Keep this candidate only if it is strictly cheaper. The tiny 1e-12 (0.000000000001) means an exact tie does not count as an improvement, so a tie keeps the earlier candidate.',
        8: 'Python lets you assign two variables on one line: best_value gets v and best_guess gets g.',
        9: 'Advance half a minute. Adding 0.5 repeatedly to a float accumulates tiny errors, and round(x, 1) snaps it back to one decimal place.',
        10: 'Hand back the winning prediction.',
        12: 'The five clean deliveries.',
        13: 'The same list with the broken bike added.',
        14: 'On clean data both losses land on 12.0 - the mean and the median of this list are both 12, so they agree.',
        15: 'One bad row moves the MSE answer 13 minutes, from 12.0 to 25.0, which is the mean of the dirty list: (10+11+12+13+14+90)/6 = 25. The MAE answer does not move at all. That gap is the entire argument of this module.',
      },
    },
    {
      type: 'note',
      md: `One honest footnote on that MAE result. With an even number of rows, MAE is charged **exactly the same** by every prediction between the two middle values - here anything from 12 to 13 costs 14.0. The scanner keeps the first one it meets, so it reports 12.0; the usual convention reports the midpoint 12.5, which is the median of 10, 11, 12, 13, 14, 90. Either way the answer moved by at most half a minute while the MSE answer moved by thirteen. MSE never has this tie: its cost curve is a single smooth bowl with one lowest point.`,
    },
    {
      type: 'intuition',
      title: 'RMSE: putting MSE back into minutes',
      md: `MSE has an awkward feature you just met without noticing. Its units are squared. The deliveries are in minutes, so an MSE of 1015.67 is in **squared minutes**, which is not a thing anybody can picture.

- **RMSE** is **Root Mean Squared Error**: compute MSE, then take the square root. Nothing else.
- Here: MSE 1015.67, so RMSE is the square root of 1015.67, about **31.87 minutes**. That is back in units a person can read.
- RMSE is used for reporting and MSE for training, but they always rank predictions the same way, because taking a square root never changes which of two positive numbers is larger.
- People report RMSE and MAE side by side, and **RMSE is never smaller than MAE**. That is not a rule to memorise; here is why.
- Take two rows with errors of 2 and 2. MAE is 2, and RMSE is the square root of (4+4)/2, which is 2. They are equal.
- Now spread the same total error out: errors of 1 and 3. MAE is still (1+3)/2 = 2. RMSE is the square root of (1+9)/2 = 5, which is 2.236. Squaring rewarded the 3 more than it punished the 1, so RMSE rose while MAE stood still.

The two are equal only when every error is the same size, and RMSE pulls further ahead the more uneven the errors are. That makes the **ratio RMSE / MAE** a free diagnostic: near 1 means your errors are all much of a muchness; 3 or 4 means a handful of rows are doing nearly all the damage, and you should go and read those rows.`,
    },
    {
      type: 'intuition',
      title: 'The training-signal difference, in plain terms',
      md: `Training moves the prediction using the **slope** of the loss - how much the cost changes when you nudge the prediction by a tiny amount. That slope tells the model which way to move and how far. The two losses give very different instructions.

- MSE's slope at residual r is proportional to r itself. Far from the answer r is large, so the step is large. Close to the answer r is small, so the step is small.
- That automatic slowdown is a real convenience: the model takes big strides early and small careful ones at the end, with nobody tuning anything.
- MAE's slope is +1 or -1 and nothing else. It says "go up" or "go down" and never says how far.
- So MAE gives the same size of step when you are 50 minutes off as when you are 0.1 minutes off. Training bounces around the best answer instead of settling onto it, and you have to shrink the step size by hand as training goes on.
- There is also one exact point, r = 0, where MAE has a sharp corner and no single slope: just left of zero the slope is -1, just right of it +1. Libraries pick 0 there by convention and carry on, and it causes no trouble in practice.

The trade in one sentence each. MSE gives well-behaved training but lets one bad row dominate the answer. MAE ignores bad rows but gives a clumsy, never-slowing training signal.`,
    },
    {
      type: 'math',
      intro: 'The formulas you computed by hand, in symbols. n is the number of rows, y is the actual value, y-hat is the prediction, and r = y - y-hat.',
      latex: [
        '\\text{MSE} = \\frac{1}{n}\\sum_{i=1}^{n}\\left(y_i - \\hat{y}_i\\right)^2 \\qquad \\text{RMSE} = \\sqrt{\\text{MSE}} \\qquad \\text{MAE} = \\frac{1}{n}\\sum_{i=1}^{n}\\left|y_i - \\hat{y}_i\\right|',
        '\\text{slope of } (y-\\hat{y})^2 = -2r \\;\\; \\text{(shrinks near the answer)} \\qquad \\text{slope of } |y-\\hat{y}| = \\pm 1 \\;\\; \\text{(never shrinks)}',
        '\\text{the single number minimising MSE is } \\operatorname{mean}(y) \\qquad \\text{the single number minimising MAE is } \\operatorname{median}(y)',
      ],
    },
    {
      type: 'intuition',
      title: 'Huber: squared for small misses, straight for big ones',
      md: `You now have one loss with the training behaviour you want and another with the outlier behaviour you want. **Huber loss** takes the first part of one and the second part of the other.

- Pick a cut-off, called **delta**, that separates "a normal miss" from "an outlier". For the deliveries, delta = 2 minutes.
- If the residual is inside delta, Huber charges half the square, just like MSE. So near the right answer it slows down properly as training converges.
- If the residual is bigger than delta, Huber charges a straight line instead: the cost keeps rising, but at a fixed rate of delta per extra minute rather than accelerating.
- The two pieces are built so that at exactly the cut-off they meet with the same value and the same slope. There is no jump and no corner, so Huber has a proper slope everywhere - which MAE does not.
- The one fact worth carrying: **Huber's slope never exceeds delta.** No single row, however wrong, can push the model harder than delta. Compare with MSE, where a residual of 78 pushes 78 times harder than a residual of 1.
- Choosing delta is the price you pay. Set it at the residual size you would call suspicious in the actual units of the problem. A very large delta puts almost every row in the squared part, which is just MSE. A very small delta puts almost every row in the straight part, which is just MAE.

On the dirty delivery list with delta = 2, Huber picks the same prediction MAE does. It buys the robustness without giving up the clean training signal.`,
    },
    {
      type: 'visual',
      component: 'PythonPlayground',
      props: {
        code: `delta = 2.0            # Huber's cut-off between a normal miss and an outlier
tau = 0.9              # pinball: 0.9 of the cost sits on under-predicting
print('error   MSE     MAE    Huber  Pinball')
for e in [-2.0, -1.0, 0.0, 1.0, 2.0, 78.0]:
    size = abs(e)
    if size <= delta:
        hub = 0.5 * e * e
    else:
        hub = delta * (size - 0.5 * delta)
    if e >= 0:
        pin = tau * e
    else:
        pin = (tau - 1) * e
    print('%5.1f %8.2f %6.2f %7.2f %7.2f' % (e, e * e, size, hub, pin))`,
        precomputedOutput: `error   MSE     MAE    Huber  Pinball
 -2.0     4.00   2.00    2.00    0.20
 -1.0     1.00   1.00    0.50    0.10
  0.0     0.00   0.00    0.00    0.00
  1.0     1.00   1.00    0.50    0.90
  2.0     4.00   2.00    2.00    1.80
 78.0  6084.00  78.00  154.00   70.20`,
        caption: 'One column per price list. The residuals never change - only what each loss charges for them. Read the bottom row: the same 78-minute miss costs 6084, 78, 154 or 70.2 depending only on which rule you picked.',
        annotations: {
          1: 'The Huber cut-off, in minutes. Residuals up to 2 are treated as normal misses.',
          2: 'The pinball setting, explained in the next section. For now read it as "under-predicting is 9 times more expensive than over-predicting".',
          3: 'A header row so the printed columns have names.',
          4: 'Loop over the six residuals from the dirty delivery list when the prediction is 12: five small ones and the broken bike at 78.',
          5: 'abs() gives the size of the residual with the sign removed, which is what Huber compares against delta.',
          6: 'Inside the cut-off? Then use the squared branch.',
          7: 'Half the square. The half is a convention that makes the two branches join smoothly; it is why the Huber column reads as half the MSE column for small residuals.',
          8: 'Otherwise this residual counts as an outlier.',
          9: 'The straight-line branch: cost grows at a fixed delta per unit. For e = 78 that is 2 * (78 - 1) = 154, instead of MSE\'s 6084.',
          10: 'Pinball asks about the sign, not the size. A residual of zero or more means the actual came in above the prediction: we predicted too low.',
          11: 'Under-predicting is charged the full tau rate, 0.9 per minute.',
          12: 'Otherwise we predicted too high.',
          13: 'Over-predicting is charged (tau - 1), which is -0.1, times a negative residual - so a positive cost of 0.1 per minute. Nine times cheaper than the other direction.',
          14: 'Print one formatted row. %5.1f means "a decimal number with 1 digit after the point, padded out to 5 characters" - it is only there to keep the columns aligned.',
        },
      },
    },
    {
      type: 'intuition',
      title: 'Quantile loss: when being wrong upwards costs more than wrong downwards',
      md: `MSE, MAE and Huber are all **symmetric**: a miss of +5 costs exactly what a miss of -5 costs. In a business that is almost never true.

- You run a warehouse. Stock too little and you lose the sale and annoy the customer: say that costs 900 rupees per unit short. Stock too much and you carry the unit: say 100 rupees per unit spare.
- **Quantile loss**, also called **pinball loss**, charges the two directions at different rates. Under-predicting costs tau per unit; over-predicting costs (1 - tau) per unit. Tau is a number between 0 and 1 that you choose.
- Minimising it does not give you the middle of the data. It gives you the value with a tau fraction of the data below it - the **tau-th quantile**. Tau = 0.5 charges both sides equally, which is MAE halved, so it gives the median.
- Tau is not something to tune by trial. It comes out of the two costs, and you can derive it in three lines with the warehouse numbers.
- Start at some stock level and ask: should I stock one more unit? Call p the chance that demand comes in **above** your current level. That extra unit saves the 900 shortfall with probability p, and wastes 100 with probability 1 - p.
- Expected gain from stocking it = 900p - 100(1 - p). Keep adding units while that is positive and stop when it reaches zero. Solve 900p = 100(1 - p), so 1000p = 100, so **p = 0.1**.
- At the right stock level only 10% of demand is above you, which means 90% is below: you are stocking the **90th percentile**, and tau = 0.9. In general, tau = cost of being short / (cost of being short + cost of being over) = 900/1000.

Fit with tau = 0.9 and the model deliberately aims high, running short about one day in ten. That is not a bias to fix. It is the answer the two costs asked for.`,
    },
    {
      type: 'intuition',
      title: 'Two quantile fits give you a range instead of a number',
      md: `Fit the same model twice with two different values of tau and you can stop shipping a single number.

- Fit tau = 0.1 and you get a low line with roughly 10% of actual values beneath it. Fit tau = 0.9 and you get a high line with roughly 90% beneath it.
- The gap between them is an **80% prediction interval**: about 80% of real values should land inside it. A delivery app can then promise "12 to 19 minutes" instead of a bare "15 minutes".
- Because each line is learned from the data separately, the gap can be narrow where deliveries are predictable and wide where they are not. A single MSE number could never say that.
- One check is compulsory before you show anyone the range, and it has a name: is the model **calibrated**? Calibrated means the promise the number makes is actually true in fresh data. The tau = 0.9 line promises that 90 of every 100 actual values fall below it, so go and count them on data the model has not seen. If you count 65, the line is not calibrated and the range is decoration.
- The other check: the tau = 0.9 line must never dip below the tau = 0.1 line. Two separately fitted models can cross, which is nonsense. Sorting the two outputs for each row fixes it.`,
    },
    {
      type: 'intuition',
      title: 'The decision list',
      md: `Four losses, four situations. Learn the mapping, not the formulas.

- **Clean data, both directions of error equally bad, and you want an average** - MSE. It is the default for good reasons: well-behaved training, and everything downstream expects it.
- **Outliers you cannot remove** - MAE if you genuinely want the median, Huber if you are training with gradient steps and want them to behave. Huber is the safer of the two.
- **Being too low costs a different amount from being too high** - quantile loss, with tau computed from the two costs rather than tuned.
- **You want to publish a range, not a point** - two quantile fits, then check calibration.
- **Before any of that** - look at the actual rows driving the error. A residual of 78 minutes is usually a bug: a test order, minutes recorded as seconds, a missing value stored as 0. Deleting one wrong row beats any amount of clever loss engineering.`,
    },
    {
      type: 'intuition',
      title: 'Worked case: eight deliveries, computed by hand',
      md: `Eight deliveries, in minutes: **20, 22, 24, 26, 28, 30, 32, 178**. The last is a rider who took a wrong turn into another city. Predict one number.

- **The MSE answer** is the mean. The eight add to 360, and 360 / 8 = **45**.
- **The MAE answer** is the median. Sorted, the two middle values are 26 and 28, so the median is (26 + 28) / 2 = **27**.
- Score the prediction 27. Residuals: -7, -5, -3, -1, 1, 3, 5, 151. Absolute values add to 176, so MAE = 176 / 8 = **22.0**. Squares add to 22,920, so MSE = **2865** and RMSE = square root of 2865 = **53.5**.
- Score the prediction 45. Residuals: -25, -23, -21, -19, -17, -15, -13, 133. Absolute values add to 266, so MAE = **33.25**. Squares add to 20,328, so MSE = **2541** and RMSE = **50.4**.
- Read the two rows together. Prediction 27 wins on MAE (22.0 against 33.25). Prediction 45 wins on RMSE (50.4 against 53.5). Each answer wins on its own scoreboard, and neither is cheating.
- Now the useful part. At prediction 27 the RMSE is 53.5 and the MAE is 22.0, a ratio of 2.4. From the RMSE section, a ratio far above 1 means a few rows carry most of the squared error. Here that single 178 contributes 22,801 of the 22,920 total - **99.5% of it**.

The decision is no longer a maths question. If one 178-minute delivery is genuinely worse for the business than a lot of small misses, predict 45. If it was a data bug or a freak nobody will repeat, delete the row and predict around 26.`,
    },
    {
      type: 'intuition',
      title: 'The classic mistake, walked into on purpose',
      md: `A team trains a delivery-time model with MSE, the standard default. It has been fine for months. One Monday the dashboard shows predictions far too high across the whole city, and the reported RMSE has tripled. Someone opens a ticket: **"the model is broken, roll it back."**

- The roll-back happens. The old model returns. By Wednesday the new model, retrained on the same data, produces the same too-high predictions again, and now two people are convinced the training pipeline is corrupt.
- Here is what actually happened. Sunday's data contained 30 orders whose delivery times were logged in **seconds** instead of minutes, so a normal 25-minute delivery arrived in the table as 1500.
- Under MSE, one row with a residual of 1475 contributes about 2.2 million to the sum of squares. Thirty of them contribute 65 million. Ten thousand ordinary rows with residuals of about 5 contribute 250,000 in total.
- So those 30 rows out of 10,030 - **0.3% of the data** - own more than 99% of the loss. The model did exactly what it was told: it moved the predictions towards the 30 rows, because that is where nearly all the cost was.
- The model was not broken. The loss was doing its job on data that had a bug in it, and rolling back does nothing because the bug is in the input, not in the code.
- The diagnosis that would have taken two minutes: sort the rows by absolute residual and read the top 20. The unit error is visible immediately. A second clue was already on the dashboard - the RMSE tripled while the MAE barely moved, and that gap is precisely the signature of a few rows carrying the error.

The general lesson, and the reason this module exists: **MSE is not a neutral measurement, it is an instruction about what matters.** Feed it a handful of corrupt rows and it will faithfully rebuild your model around them. Before you change the loss and before you blame the model, go and look at the rows with the biggest residuals.`,
    },
    {
      type: 'intuition',
      title: 'Practice problems',
      md: `Pen and paper first. All the arithmetic is deliberately small.

1. Four actual values are **4, 6, 8, 10** and the prediction is **7**. Compute the MSE, the RMSE and the MAE.
2. For that same list of four values, which single prediction minimises MSE, and which minimises MAE? Now append a fifth value, **100**, and answer both again. How far did each answer move?
3. Two residuals are **3** and **20**, and Huber uses delta = **5**. Compute what MSE charges for each, and what Huber charges for each. Which residual does the choice of loss change most?
4. Delivering later than promised costs you 5 rupees per minute in refunds; delivering earlier costs 1 rupee per minute in an idle rider. What tau do you fit, and does the model then aim high or low?
5. A model reports MAE 22 and RMSE 53.5 on a test set. A colleague says "the model has an accuracy problem, let us try a bigger network." What do you say, and what do you do first?`,
    },
    {
      type: 'intuition',
      title: 'Worked solutions',
      md: `Check every step, not just the final number.

1. Residuals are 4-7 = -3, 6-7 = -1, 8-7 = 1, 10-7 = 3. Squares 9, 1, 1, 9 add to 20, so **MSE = 20/4 = 5** and **RMSE = square root of 5 = 2.236**. Absolute values 3, 1, 1, 3 add to 8, so **MAE = 8/4 = 2**. RMSE sits above MAE, as always, because the errors are not all the same size.
2. MSE is minimised by the mean, (4+6+8+10)/4 = **7**. MAE is minimised by the median, the middle of 6 and 8, which is also **7**. With 100 appended: the mean becomes 128/5 = **25.6**, and the median of 4, 6, 8, 10, 100 is the third value, **8**. So the MSE answer moved **18.6** and the MAE answer moved **1**. One row, an 18-fold difference in how far the two answers travelled.
3. MSE charges 3 squared = **9** and 20 squared = **400**. Huber with delta 5: the residual 3 is inside the cut-off, so it costs half of 9 = **4.5**; the residual 20 is outside, so it costs 5 * (20 - 2.5) = **87.5**. The small residual barely changes in relative terms, while the big one drops from 400 to 87.5. That is the point of Huber: it only changes its mind about the outliers.
4. Being late means the actual time came in above your promise, so late is the under-prediction direction and costs 5. Early costs 1. So tau = 5/(5+1) = **0.833**. The model aims **high**, promising a time that about 83% of deliveries beat, so it is late about one time in six.
5. The ratio RMSE/MAE is 53.5/22 = 2.4, far above 1, so the squared error is concentrated in a few rows. A typical prediction is off by about 22, not 53. A bigger network will fit those few extreme rows harder, which is the opposite of what you want if they are bad data. **Do first:** sort the test rows by absolute residual and read the worst 20, checking for unit errors, test records and missing values coded as zero. Only if they are genuine should you talk about the model - and then the honest options are Huber, a separate model for that segment, or a new feature that explains them.`,
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `Everything above stands on its own. None of this is needed to explain why one bad row moves an MSE fit.

- **Where the mean and the median come from.** These two facts have a common origin. If you assume the noise around the true value follows the bell-shaped **normal (Gaussian)** distribution, then the most likely setting of the model is exactly the one minimising the sum of squared errors - MSE is the maximum-likelihood answer under Gaussian noise. Swap the assumption to the **Laplace** distribution, which has heavier tails, and the same argument produces MAE. You will meet maximum likelihood properly in the Math subject. The practical takeaway: MSE quietly assumes big errors are rare, and if your errors have a fat tail that assumption is false.
- **log-cosh** is Huber without the knob. It is squared-ish for small residuals and straight-ish for big ones, with a fixed transition instead of a delta you choose. It is smooth everywhere and available as a drop-in loss in gradient-boosting libraries.
- **Log-transforming the target.** If the target is heavy-tailed - revenue, session length, city population - a common move is to fit MSE on log(y) instead of y. Two warnings. RMSE measured in log space always looks wonderful, because a prediction of 100 against an actual of 200 is a log error of about 0.69; you did not become accurate, you changed the units. And undoing the log gives roughly a median rather than a mean, so if anyone adds your predictions into a total, that total comes out too low.
- **Quantile crossing and guarantees.** Independently fitted quantile lines can cross; fitting them jointly or sorting the outputs fixes it. And the 80% coverage of a quantile range is approximate, not promised - when you need a real guarantee there is a family of methods called conformal prediction that provides one.
- **Capping influence is a general idea.** Huber limits how hard any one row can push. The same idea appears elsewhere in training under other names, so if you have seen a technique that clips how large an update may be, it is solving this problem from the other end.`,
    },
  ],
  quiz: [
    {
      question: 'You fit the same model twice, once with MSE and once with MAE, and the two sets of predictions differ noticeably. What does that tell you?',
      options: [
        { text: 'One of the two runs did not finish training', explanation: 'Possible, but not the first conclusion. The two losses have different best answers by design, so a gap between them is expected rather than a bug.' },
        {
          text: 'The target has outliers or is skewed, so its mean and its median genuinely differ',
          explanation: 'Correct. MSE lands on the mean and MAE on the median, and those two agree only on clean, symmetric data. A gap between the fits is a signal to go and look at the tail.',
        },
        { text: 'MAE is simply the less accurate loss', explanation: 'Accurate against which price list? MAE wins on MAE and MSE wins on MSE. Neither is more correct in the abstract.' },
      ],
      correct: 1,
    },
    {
      question: 'Adding one 90 to the list 10, 11, 12, 13, 14 moved the MSE answer from 12 to 25 but left the MAE answer near 12. Why?',
      options: [
        { text: 'MAE ignores the outlier completely', explanation: 'It does not ignore it. The 90 still contributes 78 to the MAE total, more than all five good rows combined. Its influence is limited, not zero.' },
        {
          text: 'Under MSE the bad row costs 78 squared = 6,084, which outweighs the five good rows; under MAE it costs 78, which does not',
          explanation: 'Correct. Squaring turns a distant row into an enormous cost, so moving the prediction towards it pays. Without the square, giving up 13 minutes on five rows to gain 13 on one row is a losing trade.',
        },
        { text: 'MSE found the wrong minimum', explanation: 'It found the exact minimum: 25 is the mean of the dirty list. The loss moved, not the search.' },
      ],
      correct: 1,
    },
    {
      question: 'A test set gives MAE 40 and RMSE 180. What is the first thing this tells you?',
      options: [
        { text: 'The model is uniformly bad, since both numbers are large', explanation: 'The two numbers disagree by a factor of 4.5, so they cannot both describe a typical row. That disagreement is the information.' },
        {
          text: 'A small number of rows carry most of the squared error, because RMSE only runs far above MAE when the errors are very uneven',
          explanation: 'Correct. Equal-sized errors make RMSE equal MAE; unevenness is the only thing that pushes RMSE up. Sort by absolute residual and read the worst rows.',
        },
        { text: 'RMSE must have been computed on a different test set', explanation: 'It need not be. The same rows produce this gap whenever the error distribution has a long tail.' },
      ],
      correct: 1,
    },
    {
      question: 'What does Huber loss with a very large delta behave like?',
      options: [
        { text: 'MAE, since it always becomes a straight line eventually', explanation: 'Backwards. A large delta means almost every residual stays inside the squared branch and never reaches the straight one.' },
        { text: 'Quantile loss with tau = 0.5', explanation: 'That is MAE halved, which is the small-delta end, not the large-delta end.' },
        {
          text: 'MSE, because almost every residual falls inside the squared region',
          explanation: 'Correct. A huge delta gives MSE and a tiny delta gives MAE, so delta is literally the dial between the two.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Being short one unit costs 900 and holding one spare costs 100. What tau do you fit, and what does the model then predict?',
      options: [
        { text: 'tau = 0.5, the median demand, since that minimises the average error', explanation: 'That is the symmetric answer, and it assumes the two costs are equal when one is nine times the other.' },
        {
          text: 'tau = 900/(900+100) = 0.9, so the model predicts the 90th percentile of demand',
          explanation: 'Correct. At the right stock level the chance of running short is 100/1000 = 0.1, which puts 90% of demand below your prediction. You run short about one day in ten, deliberately.',
        },
        { text: 'tau = 0.1, because you only want to be short 10% of the time', explanation: 'Right intent, wrong number. tau = 0.1 fits the 10th percentile, which stocks far less and runs short about 90% of the time.' },
      ],
      correct: 1,
    },
    {
      question: 'You fit tau = 0.1 and tau = 0.9 and want to publish the gap as an 80% range. What must you check first?',
      options: [
        { text: 'That the range is symmetric around the tau = 0.5 fit', explanation: 'It should not be symmetric on skewed data. Asymmetry is exactly what you paid for by fitting quantiles.' },
        {
          text: 'Calibration on held-out data - does about 80% of fresh actual values really land inside the range - and that the high line never dips below the low line',
          explanation: 'Correct. Calibrated means the promise the number makes is true in data the model has not seen. Separately fitted quantile lines can also cross, which is nonsense; sorting the two outputs per row fixes that.',
        },
        { text: 'That both fits used the same learning rate', explanation: 'Irrelevant to whether the published range is honest.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'When would you use MAE instead of MSE, and what do you give up?',
      answer:
        'Use MAE when the target has outliers you cannot remove, or when the business wants a typical value rather than an average - "half of deliveries arrive within X minutes" is a median statement. MAE is robust because a distant row is charged its distance and nothing more, so no single row can buy the model. Concretely: adding one 90 to 10, 11, 12, 13, 14 moves the MSE answer from 12 to 25 and the MAE answer by at most half a minute. What you give up is the training signal. MAE\'s slope is a constant plus or minus one, so steps never shrink as you approach the answer and training wobbles unless you decay the step size by hand. If robustness is the only motivation, Huber is usually the better trade.',
      isCaseBased: false,
    },
    {
      question: 'What is each loss actually estimating? Argue it, do not just assert it.',
      answer:
        'MSE lands on the mean and MAE on the median. For MSE: each row is charged in proportion to its distance, so a far-away row pulls proportionally harder, and the point that balances those pulls is exactly a mean. For MAE: every row pulls with the same force of one, in the direction of its own side, so the balance point is wherever there are as many rows above as below - the median. Quantile loss is the asymmetric version: it charges tau per unit for rows above the prediction and one minus tau for rows below, so the balance sits where the fraction of data below equals tau. That reframes "which loss?" as "which summary of the target does the business want?", which is a question a product owner can actually answer.',
      isCaseBased: false,
    },
    {
      question: 'Define RMSE and explain why it is never smaller than MAE.',
      answer:
        'RMSE is the square root of the mean squared error, which puts the number back into the units of the target so a person can read it. It is never smaller than MAE because squaring exaggerates large errors more than small ones. Take two rows with errors of 2 and 2: MAE is 2 and RMSE is 2 as well. Now spread the same total across errors of 1 and 3: MAE is still 2, but the mean square is 5 and RMSE is 2.236. Any unevenness pushes RMSE up while leaving MAE alone, and only perfectly equal errors make them meet. That makes the ratio a free diagnostic - near 1 means uniform errors, while 3 or 4 means a handful of rows own most of the squared error and should be read one by one.',
      isCaseBased: false,
    },
    {
      question: 'What is Huber loss, and how do you choose delta?',
      answer:
        'Huber charges half the square for residuals within delta and a straight line beyond it, with the two pieces joined so the value and the slope match at the boundary. That gives the squared loss\'s well-behaved, self-slowing training near the answer and the absolute loss\'s bounded cost far away. The fact to carry is that its slope never exceeds delta, so no single row can push the model harder than delta no matter how wrong it is. Choose delta as the residual size you would call suspicious in the units of the problem - for delivery times in minutes, perhaps two or three. A very large delta collapses Huber into MSE and a very small one into MAE, so delta is the dial between them. If you would rather not choose, log-cosh has the same shape with no knob.',
      isCaseBased: false,
    },
    {
      question: 'Case: you forecast daily warehouse demand. Running short costs about nine times more than holding a spare unit. Your MSE model runs short roughly half the time. What do you change?',
      answer:
        'Nothing is broken; the model is doing what MSE asks. MSE estimates the mean, and real demand lands above the mean about half the time, so you run short about half the time. Switch to quantile loss with tau derived from the costs, not tuned. The derivation: at the right stock level, one extra unit saves the shortfall cost with probability p and wastes the holding cost with probability one minus p. Setting 9p = 1(1 - p) gives p = 0.1, so only 10% of demand should sit above you and tau = 0.9 - the 90th percentile. Then verify on held-out data that about 10% of actual demand really does exceed the forecast, because a miscalibrated quantile quietly reintroduces the original problem. Two follow-ups worth naming: fit tau = 0.1 as well so planners get a range rather than a point, and recompute tau whenever the cost ratio changes, which a promotion or a perishable item does immediately.',
      isCaseBased: true,
    },
    {
      question: 'Case: your house-price model reports MAE 40 thousand and RMSE 180 thousand on the same test set. What does the gap mean and what do you do?',
      answer:
        'RMSE 4.5 times MAE means the squared error is concentrated in a few very wrong rows, since equal-sized errors would make the two numbers meet. So this is not a uniformly mediocre model, it is a decent model with a handful of disasters. In order: first, sort by absolute residual and read the worst twenty rows - in practice a large share turn out to be data bugs such as a listing in a different currency, a unit mix-up, or a missing field stored as zero, and fixing those beats any loss engineering. Second, if the extremes are genuine, ask whether they are a distinct segment - luxury or commercial properties - that deserves its own model or a feature that does not exist yet. Third, and only then, change the loss: Huber to cap their influence, or a log transform if the spread is multiplicative. Finally, decide which number to headline from the cost function: if being a million wrong is far worse than being forty thousand wrong, RMSE is the honest headline and MAE is the flattering one.',
      isCaseBased: true,
    },
    {
      question: 'How would you publish a range instead of a single predicted number?',
      answer:
        'Fit the same model twice with quantile loss, once at tau = 0.1 and once at tau = 0.9. The gap between the two predictions is roughly an 80% prediction range, and because each line is learned from the data the gap widens exactly where the target is noisy and narrows where it is predictable - something a single error number cannot express. Two checks before publishing. Calibration: on held-out data, count what fraction of actual values falls inside the range, and report that measured number rather than the nominal 80%. Crossing: two independently fitted models can put the high line below the low line for some rows, which is nonsense, so sort the pair per row or fit them jointly. If you need a genuine coverage guarantee rather than an approximate one, that is what conformal prediction is for.',
      isCaseBased: false,
    },
    {
      question: 'Case: a colleague swapped MSE for Huber and says the model got worse on the holdout. Diagnose it.',
      answer:
        'First ask what "worse" was measured on. If the holdout number is still RMSE, this is expected and not a regression: Huber deliberately refuses to chase large residuals, so it will lose on the number that rewards chasing them. The training objective changed and the evaluation objective did not, so the comparison is rigged. If the measurement was MAE or a business cost and it still got worse, look at delta. A delta far below the typical residual size turns Huber into MAE across the whole dataset, throwing away the smooth region for no robustness benefit; set delta from the actual spread of the residuals rather than copying a default. Third possibility: there were no meaningful outliers, in which case MSE was already the right answer and Huber can only lose. The principle to state is that the training loss and the reported number must be chosen together, and a loss swap is judged on what the business actually pays for.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'MSE, in words and in one number', back: 'Mean Squared Error: square each residual, average them. Penalises big misses far more than small ones. Its best single prediction is the MEAN. On 10, 11, 12, 13, 14 predicting 12: (4+1+0+1+4)/5 = 2.0.' },
    { front: 'MAE, in words and in one number', back: 'Mean Absolute Error: make each residual positive with abs(), average them. A big miss costs exactly as much as it is big. Its best single prediction is the MEDIAN. Same five rows predicting 12: (2+1+0+1+2)/5 = 1.2.' },
    { front: 'RMSE, and why it is never below MAE', back: 'RMSE = square root of MSE, which puts the error back into the target\'s units. Errors 2 and 2 give MAE 2 and RMSE 2. Errors 1 and 3 give MAE 2 and RMSE 2.236. Only equal-sized errors make them meet; unevenness raises RMSE alone.' },
    { front: 'The outlier demo, with numbers', back: '10, 11, 12, 13, 14 fits 12.0 under both losses. Append one 90 and the MSE fit jumps to 25.0 while the MAE fit stays between 12 and 12.5. One row out of six, a thirteen-minute difference.' },
    { front: 'The training-signal trade-off', back: 'MSE\'s slope shrinks as the residual shrinks, so training slows down and settles. MAE\'s slope is a flat plus or minus one, so steps never shrink and training wobbles at the optimum. Robustness and a good training signal pull in opposite directions.' },
    { front: 'Huber loss', back: 'Half the square inside delta, a straight line beyond it, joined so value and slope match. Smooth near zero AND bounded far out. Its slope never exceeds delta, so no row can push harder than delta. Large delta gives MSE, small delta gives MAE.' },
    { front: 'Quantile (pinball) loss', back: 'Charges tau per unit for under-predicting and 1 - tau for over-predicting. Its best prediction is the tau-th quantile. tau = 0.5 is MAE halved, so the median. tau = 0.9 aims deliberately high.' },
    { front: 'Choosing tau, and free ranges', back: 'tau = cost of being short / (cost short + cost over). Short 900, holding 100 gives tau = 0.9, so stock the 90th percentile. Fit tau = 0.1 and 0.9 for an 80% range, then check calibration: does about 80% of held-out data really land inside?' },
  ],
  mindmapMarkdown: `- Regression Losses: MSE, MAE, Huber & Quantile
  - The core idea
    - A loss is a price list for residuals
    - residual r = actual - prediction
    - Choosing a loss = choosing what to be wrong about
  - MSE
    - square each residual, then average
    - big misses cost far more than small ones
    - best single prediction = the MEAN
    - slope shrinks near the answer: training settles
    - one bad row can own the whole loss
  - RMSE
    - square root of MSE, back in the target's units
    - never smaller than MAE
    - equal errors: RMSE = MAE
    - uneven errors: RMSE climbs, MAE does not
    - ratio RMSE/MAE is a free diagnostic
  - MAE
    - average of abs(residual)
    - best single prediction = the MEDIAN
    - outliers cannot buy the model
    - slope is a flat +1 or -1, so training wobbles
    - sharp corner at r = 0, libraries use 0
  - The outlier demo
    - 10 11 12 13 14 fits 12.0 both ways
    - add one 90: MSE fit 25.0, MAE fit 12
  - Huber
    - half-square inside delta, straight line beyond
    - joined so value and slope match
    - slope never exceeds delta
    - big delta = MSE, small delta = MAE
  - Quantile (pinball)
    - tau per unit under, 1-tau per unit over
    - best prediction = the tau-th quantile
    - tau = C_short / (C_short + C_over)
    - short 900, hold 100 gives tau = 0.9
    - two fits give an 80% range
    - check calibration and crossing
  - First move on any outlier problem
    - sort by absolute residual, read the worst rows
    - units, test orders, zeros for missing values
    - delete the bug before changing the loss`,
}

export default m
