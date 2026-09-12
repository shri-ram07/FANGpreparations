var e={id:`ml-l2-boosting`,subjectId:`ml`,level:2,title:`Boosting: Gradient Boosting and AdaBoost`,whyItMatters:`Boosting still wins most tabular problems. It also inverts almost every intuition from bagging — including the belief that more models is always safer — so the contrast is worth holding clearly.`,assumes:[`You have read Bagging and Random Forest`,`You have read Decision Trees — a stump is a tree with one split`],estMinutes:24,sections:[{type:`intuition`,title:`What boosting is`,md:`**Boosting** trains models **one after another**, each one fixing what the previous ones got wrong. Bagging trains its models in parallel on different samples; boosting trains them in sequence on the same data, re-aimed each round.

The two differ on everything that follows from that:

- Bagging reduces **variance** and leaves bias alone. Boosting reduces **bias**, starting from deliberately weak models.
- Bagging can be parallelised. Boosting cannot — round k needs round k−1.
- More models is always safe for bagging. For boosting it is **not**: too many rounds overfit.

**Gradient boosting** is the version that fits each new model to the previous model's leftovers.`},{type:`math`,intro:`The gradient boosting update. F is the running prediction, h the new small model fitted to the residuals, and ν the learning rate — the fraction of the correction actually applied. For squared error the residual y − F is exactly the negative gradient of the loss, which is where the name comes from.`,latex:[`r_i^{(k)} \\;=\\; y_i - F_{k-1}(x_i) \\qquad \\text{(the leftover after } k-1 \\text{ rounds)}`,`F_k(x) \\;=\\; F_{k-1}(x) \\;+\\; \\nu \\, h_k(x), \\qquad h_k \\text{ fitted to } r^{(k)}, \\quad 0 < \\nu \\le 1`]},{type:`code`,lang:`python`,title:`Round 1, part 1: the dumbest possible start`,code:`x = [1, 2, 3, 4, 5]
y = [2, 4, 6, 9, 14]

start = sum(y) / 5
F = [start, start, start, start, start]
residual = []
for i in range(5):
    residual.append(y[i] - F[i])

def mean(values):
    return sum(values) / len(values)

def mse(values):
    return sum(v * v for v in values) / len(values)

print('start guess', start)
print('residuals  ', residual)
print('mse        ', round(mse(residual), 3))

# ---- real output ----
# start guess 7.0
# residuals   [-5.0, -3.0, -1.0, 2.0, 7.0]
# mse         17.6`,annotations:{4:`The starting model predicts the mean for every row — the best possible constant, and a deliberately terrible model.`,8:`The **residual** is what is left over: truth minus current prediction. These are what the next model will be fitted to, not the original y.`,18:`Residuals [-5, -3, -1, 2, 7] and MSE 17.6. Notice they rise left to right, which is structure the next model can exploit.`}},{type:`code`,lang:`python`,title:`Round 1, part 2: fit a stump to the leftovers`,code:`best = None
for cut in [1, 2, 3, 4]:
    left = [residual[i] for i in range(5) if x[i] <= cut]
    right = [residual[i] for i in range(5) if x[i] > cut]
    err = sum((v - mean(left)) ** 2 for v in left) + sum((v - mean(right)) ** 2 for v in right)
    print('cut x <=', cut, '| left mean', round(mean(left), 3), '| right mean', round(mean(right), 3), '| err', round(err, 3))
    if best is None or err < best[0]:
        best = (err, cut, mean(left), mean(right))

print('best cut', best[1], 'predicts', round(best[2], 3), 'and', round(best[3], 3))

# ---- real output ----
# cut x <= 1 | left mean -5.0 | right mean 1.25 | err 56.75
# cut x <= 2 | left mean -4.0 | right mean 2.667 | err 34.667
# cut x <= 3 | left mean -3.0 | right mean 4.5 | err 20.5
# cut x <= 4 | left mean -1.75 | right mean 7.0 | err 26.75
# best cut 3 predicts -3.0 and 4.5`,annotations:{3:"The stump is fitted to `residual`, not to y. That single substitution is the whole idea of gradient boosting.",5:`Within-group squared error — the same variance-reduction criterion a regression tree uses, applied to leftovers.`,16:`Cut at x ≤ 3 wins with err 20.5. It predicts −3.0 for the left group and +4.5 for the right, which is a crude but correct description of the leftovers.`}},{type:`code`,lang:`python`,title:`Round 1, part 3: apply half the correction`,code:`lr = 0.5
err, cut, left_pred, right_pred = best

new_F = []
for i in range(5):
    step = left_pred if x[i] <= cut else right_pred
    new_F.append(F[i] + lr * step)

new_residual = []
for i in range(5):
    new_residual.append(y[i] - new_F[i])

print('new prediction', [round(v, 3) for v in new_F])
print('new residual  ', [round(v, 3) for v in new_residual])
print('mse before', round(mse(residual), 3), '-> after', round(mse(new_residual), 3))

# ---- real output ----
# new prediction [5.5, 5.5, 5.5, 9.25, 9.25]
# new residual   [-3.5, -1.5, 0.5, -0.25, 4.75]
# mse before 17.6 -> after 7.475`,annotations:{1:`The learning rate — apply only half of what the stump asked for.`,6:`A ternary picks which side of the cut this row falls on, and therefore which correction it receives.`,16:`MSE 17.6 → 7.475 in one round, from a model that can only say two numbers. Repeat a few hundred times and the leftovers get very small indeed.`}},{type:`note`,label:`Why apply only half?`,md:`Because the stump was fitted to **these five rows**, and part of what it found is real pattern while part is the accident of this particular sample. Taking the full correction commits to both.

Taking half, many times, lets the real pattern accumulate while the accidents partly cancel. This is why a small learning rate with many rounds beats a large one with few — and why the two must be tuned together: halving ν roughly doubles the rounds you need.`},{type:`intuition`,title:`AdaBoost: reweight the rows instead`,md:`**AdaBoost** is the older method, and it works on classification. Rather than fitting the leftovers, it keeps a **weight** on every training row: get a row wrong and its weight goes up, so the next model is pushed to attend to it.

Each model also earns a **vote weight** α from how well it did. A model barely better than chance gets a near-zero vote; a strong one gets a loud vote.

One round, computed exactly.`},{type:`code`,lang:`python`,title:`AdaBoost: error rate and vote weight`,code:`import math

weight = [0.2, 0.2, 0.2, 0.2, 0.2]
wrong = [False, True, False, True, False]

epsilon = 0.0
for i in range(5):
    if wrong[i]:
        epsilon = epsilon + weight[i]

alpha = 0.5 * math.log((1 - epsilon) / epsilon)
print('epsilon', round(epsilon, 4), 'alpha', round(alpha, 4))
print('e ** alpha', round(math.exp(alpha), 4), 'e ** -alpha', round(math.exp(-alpha), 4))

# ---- real output ----
# epsilon 0.4 alpha 0.2027
# e ** alpha 1.2247 e ** -alpha 0.8165`,annotations:{3:`Five rows, equal weight, summing to 1. Weights are a probability distribution over the training rows.`,9:`epsilon is the WEIGHTED error rate — the total weight sitting on misclassified rows, here 0.4.`,11:`The vote weight. At epsilon 0.5 the log is log(1) = 0, so a coin-flip model gets no vote at all. Below 0.5 alpha is positive and grows as the model improves.`,13:`These two multipliers are the reweighting: 1.2247 for a row got wrong, 0.8165 for one got right.`}},{type:`code`,lang:`python`,title:`AdaBoost: reweight and renormalise`,code:`updated = []
for i in range(5):
    if wrong[i]:
        updated.append(weight[i] * math.exp(alpha))
    else:
        updated.append(weight[i] * math.exp(-alpha))

total = sum(updated)
final = []
for value in updated:
    final.append(value / total)

print('before normalising', [round(v, 5) for v in updated])
print('total             ', round(total, 5))
print('after normalising ', [round(v, 4) for v in final])

# ---- real output ----
# before normalising [0.1633, 0.24495, 0.1633, 0.24495, 0.1633]
# total              0.9798
# after normalising  [0.1667, 0.25, 0.1667, 0.25, 0.1667]`,annotations:{8:`The updated weights sum to 0.9798, not 1, so they are divided through. Weights must stay a distribution or epsilon stops being a rate.`,16:`The two wrong rows go 0.20 → 0.25 and the three right rows 0.20 → 0.1667. The next model is trained on data where the mistakes now matter half again as much.`}},{type:`note`,label:`The classic mistake`,md:`"More trees is always safer" is true for bagging and false for boosting, and the sentence gets carried across without anyone noticing.

Each boosting round fits the **residuals of the previous rounds**, so once the real pattern is exhausted the rounds start fitting noise, and validation error turns back up while training error keeps falling. The number of rounds is a hyperparameter that must be tuned — in practice with early stopping on a validation set.

A boosted model with 5,000 unvalidated rounds is not a safer version of one with 500.`},{type:`note`,label:`Stacking, in one box`,md:`A third way to combine models, and the only one that does not need them to be the same kind.

**Stacking** trains several different models — a forest, a boosted model, a logistic regression — then trains a small **meta-model** on their predictions to learn how to weigh them. The meta-model must be trained on out-of-fold predictions, or it learns from predictions the base models made on rows they had already memorised.

It usually squeezes out a little more accuracy for considerably more complexity, which is why it wins competitions more often than it ships.`}],quiz:[{question:`What does each new model in gradient boosting get fitted to?`,options:[{text:`The original labels y`,explanation:`Only the very first model relates to y directly; after that the target changes.`},{text:`The residuals — what the previous models have not yet explained`,explanation:`Correct. Here the stump was fitted to [-5, -3, -1, 2, 7], not to [2, 4, 6, 9, 14].`},{text:`A bootstrap sample of the rows`,explanation:`That is bagging. Boosting uses the same rows each round.`},{text:`A random subset of features`,explanation:`That is Random Forest's trick, though boosting implementations do offer it as extra regularisation.`}],correct:1},{question:`One boosting round took MSE from 17.6 to 7.475 using a model that outputs only two numbers. How?`,options:[{text:`The stump was unusually powerful`,explanation:`It predicts −3.0 or +4.5 and nothing else — it is about as weak as a model can be.`},{text:`It only had to describe the leftovers, and even a crude description of those removes a lot of error`,explanation:`Correct. Fitting residuals is a much easier job than fitting y, which is why weak learners suffice.`},{text:`The learning rate was too high`,explanation:`It was 0.5 — only half the correction was applied, and it still more than halved the MSE.`},{text:`The data had only five rows`,explanation:`Small data makes the numbers checkable but is not what produced the drop.`}],correct:1},{question:`Why apply only half the stump's correction?`,options:[{text:`To make training faster`,explanation:`It makes training slower — you need more rounds.`},{text:`Part of what the stump found is real pattern and part is this sample's accident; small steps let the pattern accumulate while accidents partly cancel`,explanation:`Correct. This is why a small learning rate with many rounds beats a large one with few, and why the two are tuned together.`},{text:`Because the stump is only half-trained`,explanation:`It is fully fitted to the residuals; the shrinkage is applied afterwards.`},{text:`To keep predictions positive`,explanation:`Sign is not what shrinkage controls.`}],correct:1},{question:`In AdaBoost, a model with weighted error exactly 0.5 gets what vote weight?`,options:[{text:`Zero — log(1) = 0, so a coin-flip model contributes nothing`,explanation:`Correct. α = ½ln((1−ε)/ε), and at ε = 0.5 the ratio is 1.`},{text:`One half`,explanation:`α is a log-odds quantity, not the error rate.`},{text:`The maximum`,explanation:`The maximum vote goes to the lowest error, not the middling one.`},{text:`Negative`,explanation:`α goes negative only below chance, i.e. ε above 0.5.`}],correct:0},{question:`After one AdaBoost round the two wrong rows went 0.20 → 0.25 and the three right rows 0.20 → 0.1667. Why renormalise?`,options:[{text:`To keep the weights summing to 1, so ε remains a rate`,explanation:`Correct. The raw updated weights summed to 0.9798, so each was divided by that total.`},{text:`To prevent numerical overflow`,explanation:`These magnitudes are nowhere near overflow.`},{text:`Because AdaBoost requires equal weights`,explanation:`The whole mechanism is that weights become unequal.`},{text:`To make the next model unbiased`,explanation:`The reweighting deliberately biases the next model toward the hard rows.`}],correct:0},{question:`Which statement is true?`,options:[{text:`Bagging reduces variance and can be parallelised; boosting reduces bias and cannot`,explanation:`Correct. Round k of boosting needs round k−1, which is also why boosting is slower to train.`},{text:`Both reduce variance`,explanation:`Boosting starts from high-bias weak learners and attacks bias.`},{text:`Both can be parallelised across models`,explanation:`Boosting is inherently sequential; only the split-finding within a round parallelises.`},{text:`More rounds is safe for both`,explanation:`It is safe for bagging and a genuine overfitting risk for boosting.`}],correct:0}],interviewQuestions:[{question:`Explain gradient boosting.`,answer:`Start with a trivial model — the mean. Compute the residuals, fit a small model to those residuals rather than to y, add a fraction ν of its prediction to the running total, recompute residuals, repeat. On five houses the mean gave residuals [-5, -3, -1, 2, 7] with MSE 17.6; one stump fitted to those, applied at half strength, brought MSE to 7.475. It is called gradient boosting because for squared error the residual is exactly the negative gradient of the loss, so each round is a step of gradient descent in function space.`,isCaseBased:!0},{question:`How do bagging and boosting differ?`,answer:`Bagging trains models independently on bootstrap samples and averages, reducing variance while leaving bias alone; it parallelises, and more models is always safe. Boosting trains sequentially, each model fitting what the previous ones got wrong, reducing bias from deliberately weak learners; it cannot parallelise across rounds, and more rounds eventually overfits. The practical consequence is the failure mode: a badly tuned forest is mediocre, a badly tuned boosted model overfits hard.`,isCaseBased:!1},{question:`How do learning rate and number of trees interact in boosting?`,answer:`They trade off almost directly — halving the learning rate roughly doubles the rounds needed for the same fit. Small ν with many rounds generalises better, because each round commits to less of what may be sample-specific noise, so the real pattern accumulates while accidents partly cancel. The standard practice is to fix a small ν, something like 0.05 or 0.1, and let early stopping on a validation set choose the round count. Tuning them independently is a mistake.`,isCaseBased:!1},{question:`AdaBoost or gradient boosting?`,answer:`Gradient boosting, in practice, almost always. AdaBoost is essentially gradient boosting with exponential loss, and that loss is very sensitive to mislabelled rows — a persistently wrong row gets its weight driven up round after round until it dominates. Gradient boosting lets you choose the loss, so you can use something robust like Huber for regression, and modern implementations add regularisation, column subsampling and proper handling of missing values. AdaBoost is worth understanding historically and for the reweighting intuition.`,isCaseBased:!1},{question:`Your boosted model has training error near zero and validation error rising. What do you change?`,answer:`Fewer rounds first — this is the classic boosting overfit, and early stopping on validation is the direct fix. Then lower the learning rate and allow more rounds, which usually helps generalisation. Then constrain the base learners: shallower trees, higher min_child_weight, since boosting wants weak learners and a deep tree per round defeats the point. Then add regularisation — subsample rows and columns per round, and L1/L2 on leaf weights. I would not add more data as the first move, though it would help.`,isCaseBased:!0},{question:`Why do boosted models use shallow trees?`,answer:`Because each round only has to describe the leftovers, and the leftovers get simpler as rounds accumulate. A depth-3 tree can capture a three-way interaction, and stacking hundreds of those builds arbitrary complexity gradually and controllably. A deep tree per round would fit the residuals almost exactly in one go, leaving nothing for later rounds and overfitting immediately — it converts a slow, regularised procedure into a single unregularised one.`,isCaseBased:!1},{question:`What is stacking, and what is the trap?`,answer:`Train several different models, then train a meta-model on their predictions to learn how to weigh them. The trap is training the meta-model on predictions the base models made on their own training rows — those predictions are optimistically good, so the meta-model learns the wrong weights and the whole thing collapses on new data. The fix is out-of-fold predictions: cross-validate the base models and feed the meta-model only predictions made on held-out folds.`,isCaseBased:!1},{question:`When would you not reach for boosting?`,answer:`When the model must be explainable to a regulator, since hundreds of sequential trees offer no readable path. When training time is tight and cannot be parallelised across rounds. When the data is very noisy, where boosting will chase that noise and a forest degrades more gracefully. When labels are unreliable, since AdaBoost in particular will fixate on mislabelled rows. And on images, text or audio, where a neural network beats any tree method by a wide margin.`,isCaseBased:!1}],flashcards:[{front:`Boosting, in one sentence`,back:`Train models sequentially, each fixing what the previous ones got wrong. Reduces bias; cannot be parallelised across rounds.`},{front:`Gradient boosting update`,back:`r = y − F, fit h to r, then F ← F + ν·h. For squared error the residual is the negative gradient of the loss.`},{front:`The five houses, round 1`,back:`Start at the mean 7.0 → residuals [-5, -3, -1, 2, 7], MSE 17.6. One stump at ν = 0.5 → MSE 7.475.`},{front:`Why shrink by ν?`,back:`Part of what the model found is real pattern, part is this sample's accident. Small steps let the pattern accumulate and the accidents partly cancel.`},{front:`AdaBoost vote weight`,back:`α = ½ln((1−ε)/ε) on the WEIGHTED error. At ε = 0.5, α = 0 — a coin-flip model gets no vote. At ε = 0.4, α = 0.2027.`},{front:`AdaBoost reweighting`,back:`Wrong rows × e^α (1.2247), right rows × e^(−α) (0.8165), then renormalise. 0.20 → 0.25 and 0.20 → 0.1667.`},{front:`Bagging vs boosting`,back:`Bagging: parallel, variance, more is always safe. Boosting: sequential, bias, more rounds eventually overfits.`},{front:`Stacking, and its trap`,back:`A meta-model learns to weigh several base models. It must be trained on OUT-OF-FOLD predictions, or it learns from predictions made on memorised rows.`}],mindmapMarkdown:`- Boosting
  - The idea
    - sequential: each model fixes the last
    - reduces BIAS (bagging reduces variance)
    - cannot parallelise across rounds
    - more rounds can OVERFIT
  - Gradient boosting
    - r = y - F, fit h to r, F += nu * h
    - residual = negative gradient (squared error)
    - five houses: mean 7.0
      - residuals [-5,-3,-1,2,7], mse 17.6
      - best cut x<=3 -> -3.0 and 4.5, err 20.5
      - after half a step: mse 7.475
    - shrinkage: small nu + many rounds wins
  - AdaBoost
    - reweight ROWS instead of fitting leftovers
    - epsilon = weighted error (0.4)
    - alpha = 0.5 ln((1-e)/e) = 0.2027
    - wrong x1.2247, right x0.8165, renormalise
    - 0.20 -> 0.25 and 0.20 -> 0.1667
    - exponential loss: fixates on mislabelled rows
  - Stacking
    - meta-model over several base models
    - MUST use out-of-fold predictions`};export{e as default};