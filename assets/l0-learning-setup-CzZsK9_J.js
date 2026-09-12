var e={id:`ml-l0-learning-setup`,subjectId:`ml`,level:0,title:`What a Model Is, and Why Data Is Split Three Ways`,whyItMatters:`The first module of machine learning. It fixes the vocabulary every later module uses, and it explains the one procedural rule that separates a real result from a self-deception: which pile of data you are allowed to look at, and when.`,assumes:[`You know what an average and a percentage are`,`You have seen a Python list, a dictionary and a for loop`,`You remember that y = w × x draws a straight line and w sets its steepness`],estMinutes:22,sections:[{type:`intuition`,title:`What a model is`,md:`A **model** is a rule with adjustable numbers in it. **Training** is choosing those numbers so the rule fits data you already have.

Here the rule is *rent = w × area*, and the one adjustable number is w.

- **Feature**: the input you know (area). **Label**: the answer you want (rent).
- **Parameter**: a number the model adjusts (w). You do not choose it — training does.
- **Loss**: one number saying how wrong the current rule is, so that "better" is decided by arithmetic rather than opinion.

Training is then just: try values, keep the one with the smallest loss.`},{type:`math`,intro:`The loss used below, written out. n is the number of rows, y-hat is the prediction and y the true label. The bars are absolute value: they drop the sign so that being 2 too high and 2 too low cost the same, instead of cancelling out. This one is the mean absolute error.`,latex:[`\\hat{y}^{(i)} = w \\cdot x^{(i)}`,`\\text{MAE}(w) = \\frac{1}{n} \\sum_{i=1}^{n} \\left| \\hat{y}^{(i)} - y^{(i)} \\right|`]},{type:`code`,lang:`python`,title:`Training, done by hand: try five values of w`,code:`size = [500, 750, 1000, 1200, 1500, 1800]
rent = [12, 17, 21, 26, 31, 37]

def average_error(w):
    total = 0.0
    for i in range(len(size)):
        predicted = w * size[i]
        total = total + abs(predicted - rent[i])
    return total / len(size)

for w in [0.018, 0.020, 0.021, 0.022, 0.024]:
    print(w, round(average_error(w), 3))

# ---- real output ----
# 0.018 3.75
# 0.02 1.5
# 0.021 0.808
# 0.022 1.25
# 0.024 3.0`,annotations:{8:`abs() drops the sign, so being 2 too high and 2 too low cost the same. Without it, errors in opposite directions would cancel and a terrible rule could score zero.`,12:`The error falls to 0.808 at w = 0.021 and rises on both sides. That U-shape is what "there is a best value" looks like, and searching for the bottom of it is all training ever does.`}},{type:`note`,label:`What the data never chose`,md:`Two things in that snippet came from me, not from the data: the **shape** of the rule (a straight line through zero) and the **list of values to try**. Those are **hyperparameters** — settings you pick, as opposed to parameters the training picks.

Because our rows carry labels, this is **supervised** learning. A numeric label makes it **regression**; a category label would make it **classification**.`},{type:`intuition`,title:`Why scoring on the training rows proves nothing`,md:`Our model scores 0.808 on the six rows it learned from. Is that good? Here is a model that beats it outright: store all six rows in a lookup table and return the stored answer.

That model scores a perfect **0.0** on those six rows. It has learned nothing at all — it cannot answer a single question it has not already been told. Watch it meet three flats it has never seen.`},{type:`code`,lang:`python`,title:`The memoriser: perfect on what it stored, useless otherwise`,code:`table = {}
for i in range(len(size)):
    table[size[i]] = rent[i]

def predict(x):
    return table.get(x, 24.0)

def average_error(xs, ys):
    total = 0.0
    for i in range(len(xs)):
        total = total + abs(predict(xs[i]) - ys[i])
    return total / len(xs)

print("memoriser on the 6 rows it stored:", average_error(size, rent))
new_size = [600, 900, 1400]
new_rent = [14, 19, 29]
print("memoriser on 3 flats it never saw:", round(average_error(new_size, new_rent), 3))

# ---- real output ----
# memoriser on the 6 rows it stored: 0.0
# memoriser on 3 flats it never saw: 6.667`,annotations:{6:`table.get(x, 24.0) looks x up and falls back to 24.0 when it is missing. That fallback is the only thing this model can say about a flat it has not memorised.`,14:`0.0 against 6.667. A perfect training score and a worse-than-useless real one, from the same model in the same run. This is why a number computed on training data is not evidence.`}},{type:`intuition`,title:`Three piles, three different jobs`,md:`So the dataset is cut at random into three parts, before anything else happens. A common split is 70 / 15 / 15.

- **Training set** — the rows the model fits its parameters on.
- **Validation set** — the rows you score candidates on while choosing between them. Every comparison, every hyperparameter, every "let me try one more thing" is judged here.
- **Test set** — touched **once**, at the very end, to report a number.

The reason the third pile exists is not obvious, so the next snippet demonstrates it on pure noise.`},{type:`code`,lang:`python`,title:`Part 1: a single model against pure coin flips`,code:`import random

random.seed(3)
truth = [random.randint(0, 1) for _ in range(100)]
fresh = [random.randint(0, 1) for _ in range(100)]

def score(guesses, answers):
    hits = 0
    for i in range(100):
        if guesses[i] == answers[i]:
            hits = hits + 1
    return hits / 100

one_model = [random.randint(0, 1) for _ in range(100)]
print("one random model, scored on truth:", score(one_model, truth))

# ---- real output ----
# one random model, scored on truth: 0.5`,annotations:{3:`random.seed(3) fixes the random sequence so this prints the same numbers on your machine as it did on mine.`,4:`[random.randint(0, 1) for _ in range(100)] is a list comprehension: it builds a list by running the expression 100 times. These labels are coin flips, so there is genuinely nothing to learn.`,15:`0.5, exactly as it should be. One random guesser against random labels scores chance.`}},{type:`code`,lang:`python`,title:`Part 2: keep the best of 200, then check it on fresh data`,code:`best_score, best_model = 0.0, []
for trial in range(200):
    model = [random.randint(0, 1) for _ in range(100)]
    if score(model, truth) > best_score:
        best_score, best_model = score(model, truth), model

print("best of 200, on the set we chose with:", best_score)
print("that same model on a fresh sample:    ", score(best_model, fresh))

# ---- real output ----
# best of 200, on the set we chose with: 0.61
# that same model on a fresh sample:     0.49`,annotations:{4:"Keep whichever of the 200 happens to score highest on `truth`. No model here learned anything — they are all random.",8:`0.61 on the set used to pick it, 0.49 on fresh data. The 11-point edge was manufactured entirely by the act of choosing, out of data with no signal in it whatsoever.`}},{type:`note`,label:`The rule that falls out`,md:`Selecting a winner on a set contaminates that set's score, even when there is nothing to learn. So:

**Choose on validation. Report on test. Touch test once.**

If you tune against the test set — even informally, even by re-running after seeing the number — you have converted your final number into a validation number, and you no longer have an estimate of how the model behaves on data it has never influenced.`}],quiz:[{question:`The memoriser scored 0.0 on its six rows and 6.667 on three new flats. What does that show?`,options:[{text:`The new flats were unusually hard`,explanation:`They were ordinary. The model simply had no rule to apply to them.`},{text:`Training error can be made perfect without the model learning anything generalisable`,explanation:`Correct. That is exactly why a training score is not evidence.`},{text:`The lookup table was implemented incorrectly`,explanation:`It worked perfectly — it returned exactly what it was told to store.`},{text:`Six rows is too few to train on`,explanation:`True in general, but the memoriser would fail the same way with six million rows.`}],correct:1},{question:`Best-of-200 random models scored 0.61 on the selection set and 0.49 on fresh data. Why?`,options:[{text:`The best model genuinely learned a weak pattern`,explanation:`It cannot have — the labels were coin flips, so there was no pattern to learn.`},{text:`Selecting a maximum over many candidates captures the luck in that particular set`,explanation:`Correct. The 11-point edge is entirely selection, which is why the set you choose on cannot also be the set you report on.`},{text:`200 trials is too few`,explanation:`More trials would inflate the selected score further, not less.`},{text:`The fresh sample was drawn incorrectly`,explanation:`It was drawn the same way; 0.49 is simply chance, which is the honest number.`}],correct:1},{question:`Which is a hyperparameter rather than a parameter?`,options:[{text:`w in rent = w × area`,explanation:`Training chooses w, which makes it a parameter.`},{text:`The decision to use a straight line through zero`,explanation:`Correct. The shape of the model is chosen by you, not by the data.`},{text:`The average error on the training rows`,explanation:`That is a measurement, not a setting.`},{text:`The rent of the third flat`,explanation:`That is data.`}],correct:1},{question:`You have already reported a test-set number, then tweak the model and re-score on test. What is the consequence?`,options:[{text:`Nothing, provided the change was small`,explanation:`Size is irrelevant — the moment a decision depends on the test score, contamination has happened.`},{text:`The test set has become a validation set and no longer estimates unseen performance`,explanation:`Correct. You would need genuinely untouched data to recover an honest estimate.`},{text:`The result is fine if you report both numbers`,explanation:`Reporting both is more honest, but neither is now an uncontaminated estimate.`},{text:`It only matters for classification, not regression`,explanation:`The mechanism is selection, and it applies to any task.`}],correct:1},{question:`Why does the error function use abs() rather than the raw difference?`,options:[{text:`So that errors in opposite directions cannot cancel out`,explanation:`Correct. Without it, a rule that is 5 too high on one flat and 5 too low on another would score zero.`},{text:`To make the arithmetic faster`,explanation:`It makes no measurable difference to speed.`},{text:`Because rents cannot be negative`,explanation:`The rents are positive, but the *errors* can be either sign, which is the issue.`},{text:`To match the formula for variance`,explanation:`Variance squares rather than taking absolute values.`}],correct:0},{question:`What makes this problem "supervised regression"?`,options:[{text:`The rows carry labels, and the label is a number`,explanation:`Correct. Labels present makes it supervised; a numeric label makes it regression.`},{text:`There is a single feature`,explanation:`The number of features does not determine the category.`},{text:`The model is a straight line`,explanation:`A straight line can also be used for classification; the model shape is not what defines the task.`},{text:`The data was split three ways`,explanation:`That is good practice for any supervised task, not a definition.`}],correct:0}],interviewQuestions:[{question:`What is the difference between a parameter and a hyperparameter?`,answer:`A parameter is a number the training procedure chooses from the data — the weights of a linear model, the split thresholds in a tree. A hyperparameter is a setting you choose before training that shapes the search itself: the learning rate, the polynomial degree, the tree depth, the model family. The practical distinction is which set you tune on: parameters are fit on the training set, hyperparameters are chosen on the validation set.`,isCaseBased:!1},{question:`Why do you need a validation set as well as a test set?`,answer:`Because choosing a winner on a set contaminates that set. The demonstration is stark: 200 random models against 100 coin-flip labels, and the best scored 0.61 on the selection set against 0.49 on fresh data — an 11-point edge conjured out of data with no signal at all. If you select on the test set you get that same inflation and no way to measure it, so validation absorbs the selection and test stays clean for one final number.`,isCaseBased:!0},{question:`A colleague reports 99% training accuracy. What do you ask?`,answer:`What it scores on data it has never seen. Training accuracy is bounded above only by the model's capacity to memorise: a lookup table gets 100% and knows nothing, as the memoriser here does with 0.0 error on its six rows and 6.667 on three new ones. I would also ask about the class balance, since 99% is unimpressive if 99% of rows are one class.`,isCaseBased:!0},{question:`How would you split data that has a time dimension?`,answer:`Not at random. Split by time: train on the earliest period, validate on the next, test on the most recent. A random split lets the model see future rows while predicting past ones, which is leakage and produces an optimistic number that collapses in production. The same applies to any grouping structure — split by user or by patient rather than by row, so no group appears in two piles.`,isCaseBased:!1},{question:`What is data leakage and how does it show up?`,answer:`Leakage is when information unavailable at prediction time reaches the model during training. Classic forms: a feature computed after the label was known, standardising using statistics from the whole dataset before splitting, or duplicate rows spread across train and test. It shows up as validation scores that look too good and then do not survive deployment. The check is to ask of every feature: would I actually have this value at the moment I need the prediction?`,isCaseBased:!1},{question:`Your validation set has 200 rows and two models differ by 1%. Is one better?`,answer:`Almost certainly not distinguishable. A 1% difference on 200 rows is two rows, and the confidence interval on a proportion near 50% with n = 200 is roughly ±7 points. I would use cross-validation to get several estimates and look at the spread, or enlarge the validation set. Picking a winner on a difference smaller than the noise is exactly the selection effect the coin-flip demonstration shows.`,isCaseBased:!0},{question:`When is a 70/15/15 split the wrong choice?`,answer:`When data is scarce, where holding back 30% costs more than it buys, and k-fold cross-validation uses every row for both training and validation. When data is enormous, 1% may be plenty for validation and the rest is better spent training. When classes are very imbalanced, splits must be stratified or a rare class may be absent from a fold entirely. And with time-ordered or grouped data, proportion is not the issue — the split has to respect the structure.`,isCaseBased:!1},{question:`How do you know whether the split itself was fair?`,answer:`Compare the piles before trusting any result. Check that the label distribution matches across them, that key feature distributions match, and that no identifier appears in more than one pile. A validation score wildly better or worse than training for no clear reason is often a split problem rather than a model problem — an unlucky random split, or a group that leaked across the boundary.`,isCaseBased:!1}],flashcards:[{front:`Model / training`,back:`A model is a rule with adjustable numbers. Training is choosing those numbers so the rule fits data you have.`},{front:`Parameter vs hyperparameter`,back:`A parameter is chosen by training from data (w). A hyperparameter is chosen by you before training (model shape, learning rate, degree).`},{front:`Feature / label / loss`,back:`Feature = the input you know. Label = the answer you want. Loss = one number saying how wrong the rule currently is.`},{front:`Why is training error not evidence?`,back:`A lookup table scores a perfect 0.0 on the rows it stored and 6.667 on three new flats. Perfect training error is achievable with zero learning.`},{front:`The three piles`,back:`Train: fit parameters. Validation: choose between candidates. Test: touched once, at the end, to report.`},{front:`Why validation AND test?`,back:`Best of 200 random models on coin-flip labels scored 0.61 on the selection set and 0.49 on fresh data. Selection alone manufactures an edge, so the set you choose on cannot be the set you report on.`},{front:`Supervised / regression / classification`,back:`Supervised = rows carry labels. Numeric label = regression. Category label = classification.`},{front:`When NOT to split at random`,back:`Time-ordered data (split by time), grouped data (split by group). A random split lets the model see the future or the same user twice.`}],mindmapMarkdown:`- What a model is
  - Vocabulary
    - model = rule with adjustable numbers
    - training = choosing those numbers
    - feature / label / parameter / loss
    - hyperparameter = you choose it
    - supervised, regression vs classification
  - Six flats
    - rent = w x area
    - w = 0.021 -> error 0.808, a U shape
  - Training error is not evidence
    - memoriser: 0.0 stored, 6.667 unseen
  - Three piles
    - train: fit parameters
    - validation: choose between candidates
    - test: once, at the end
  - Why three, not two
    - 200 random models, coin-flip labels
    - best scores 0.61 on selection set
    - same model 0.49 on fresh data
    - selection alone manufactures the edge
  - Splitting traps
    - time data: split by time
    - grouped data: split by group
    - leakage: could I have this value at prediction time?`};export{e as default};