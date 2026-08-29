var e={id:`metrics-l0-loss-vs-metric`,subjectId:`metrics`,level:0,title:`Loss vs Metric`,whyItMatters:`Every model carries two numbers: the one it uses to improve itself, and the one you use to judge it. They are almost never the same number, and confusing them is the most common misunderstanding in the whole subject.`,assumes:[`You can compute a fraction and square a number`,`You have seen a Python list and a for loop`],estMinutes:20,sections:[{type:`intuition`,title:`What a loss is, and what a metric is`,md:`A **loss** is the number the model uses to improve itself. It is computed during training, on every batch, and the training loop moves each knob in whichever direction makes it smaller.

A **metric** is the number *you* use to judge the model. It is computed after the fact and reported to a person.

They are usually different numbers, and the reason is one property: **the loss must have a usable slope.** A metric does not.

Six emails, a spam model, and one prediction we are going to nudge.`},{type:`code`,lang:`python`,title:`Accuracy on six emails`,code:`p = [0.9, 0.8, 0.6, 0.4, 0.3, 0.2]
y = [1, 1, 0, 1, 0, 0]

correct = 0
for i in range(6):
    guess = 1 if p[i] > 0.5 else 0
    if guess == y[i]:
        correct = correct + 1

print(correct)
print(correct / 6)

# ---- real output ----
# 4
# 0.6666666666666666`,annotations:{1:`p is what the model outputs: how sure it is that each email is spam. y is the truth, 1 for spam.`,6:`The cut-off turns a number into a decision. 0.6 becomes 1, 0.4 becomes 0 — and that hard boundary is the entire source of the trouble below.`,12:`4 of 6, so accuracy is 0.6667. Email 4 is one of the two it got wrong: the model said 0.4 and the truth is spam.`}},{type:`code`,lang:`python`,title:`Nudge that prediction, and watch accuracy refuse to move`,code:`def accuracy(p, y):
    correct = 0
    for i in range(len(p)):
        guess = 1 if p[i] > 0.5 else 0
        if guess == y[i]:
            correct = correct + 1
    return correct / len(p)

y = [1, 1, 0, 1, 0, 0]
for nudge in [0.0, 0.01, 0.02, 0.05, 0.09]:
    p = [0.9, 0.8, 0.6, 0.4 + nudge, 0.3, 0.2]
    print(round(0.4 + nudge, 2), round(accuracy(p, y), 4))

# ---- real output ----
# 0.4 0.6667
# 0.41 0.6667
# 0.42 0.6667
# 0.45 0.6667
# 0.49 0.6667`,annotations:{11:`Email 4 moves from 0.40 to 0.49. The truth is 1, so every one of these is a genuine improvement — the model is getting less wrong each time.`,14:`0.6667 five times. Accuracy cannot see any of it, because the decision is still 0 until the value crosses 0.5. To a training loop, this looks exactly like "nothing you do here matters".`}},{type:`code`,lang:`python`,title:`The same five nudges, against a loss`,code:`def squared_loss(p, y):
    total = 0.0
    for i in range(len(p)):
        total = total + (p[i] - y[i]) ** 2
    return total / len(p)

for nudge in [0.0, 0.01, 0.02, 0.05, 0.09]:
    p = [0.9, 0.8, 0.6, 0.4 + nudge, 0.3, 0.2]
    print(round(0.4 + nudge, 2), round(squared_loss(p, y), 5))

# ---- real output ----
# 0.4 0.15
# 0.41 0.14802
# 0.42 0.14607
# 0.45 0.14042
# 0.49 0.13335`,annotations:{4:`The loss asks how far each prediction is from the truth, rather than whether the decision was right. Squaring makes every gap positive and punishes big gaps harder.`,12:`0.15 → 0.13335, falling at every single step. The loss registers exactly the improvement accuracy was blind to, and it does so smoothly.`}},{type:`code`,lang:`python`,title:`Measure both slopes directly`,code:`def make(v):
    return [0.9, 0.8, 0.6, v, 0.3, 0.2]

step = 0.01
acc_slope = (accuracy(make(0.41), y) - accuracy(make(0.40), y)) / step
loss_slope = (squared_loss(make(0.41), y) - squared_loss(make(0.40), y)) / step
print(f'accuracy slope = {acc_slope:.4f}')
print(f'loss slope     = {loss_slope:.4f}')

# ---- real output ----
# accuracy slope = 0.0000
# loss slope     = -0.1983`,annotations:{5:`A slope is just "how much did the output change, divided by how much I changed the input". Nothing more sophisticated is happening here.`,9:`Accuracy slope 0.0000. To gradient descent that means "take a step of size zero" — there is no direction to move in, so training cannot start.`,10:`Loss slope −0.1983. Negative, so raising this prediction lowers the loss, and the size says by how much. That is a usable instruction.`}},{type:`math`,intro:`Why one has a slope and the other does not. The loss is built from the raw numbers, so nudging any prediction changes it a little — and the derivative exists everywhere. Accuracy is built from a comparison, so it is flat between cut-off crossings and jumps at them: slope 0 almost everywhere, and no slope at all at the jump.`,latex:[`\\text{Loss} \\;=\\; \\frac{1}{N}\\sum_{i=1}^{N}\\,(p_i - y_i)^2 \\qquad \\frac{\\partial\\,\\text{Loss}}{\\partial p_i} \\;=\\; \\frac{2\\,(p_i - y_i)}{N}`,`\\text{Accuracy} \\;=\\; \\frac{\\#\\{\\,\\mathbb{1}[p_i > 0.5] = y_i\\,\\}}{N} \\qquad \\text{slope } 0 \\text{ everywhere except the jumps}`]},{type:`note`,label:`The other half of the problem`,md:`Accuracy is not permanently frozen. Push that fourth prediction past 0.5 and the decision flips, the email becomes correct, and accuracy jumps from 0.6667 to 0.8333 in one step.

So accuracy is not merely flat — it is **flat, then a cliff**. A quantity that is flat almost everywhere and vertical at a few points has no usable slope anywhere: zero tells you nothing, and the cliff is not a derivative at all.

That is precisely the shape gradient descent cannot work with, and it is why nobody trains on accuracy.`},{type:`note`,label:`The classic mistake`,md:`A team is asked to catch fraud, where 1 transaction in 1,000 is fraudulent. They judge models by accuracy.

The winning model predicts "not fraud" for everything and scores **99.9%**. It catches nothing.

Notice what the loss was doing meanwhile: squared error averaged over a million rows is also dominated by the 999,000 easy ones, so it was not objecting either. **Both numbers can be wrong for the same reason** — a rare class drowned by a common one. Choosing a loss well and choosing a metric well are two separate decisions, and this module is only about why they are separate.`}],quiz:[{question:`What is the defining difference between a loss and a metric?`,options:[{text:`The loss is computed on training data and the metric on test data`,explanation:`Both can be computed on either; the split is not what distinguishes them.`},{text:`The loss is what the model optimises and must have a usable slope; the metric is what you judge by and need not`,explanation:`Correct. That slope requirement is the whole reason they differ.`},{text:`The metric is always more accurate`,explanation:`They measure different things; neither is a more accurate version of the other.`},{text:`The loss is always smaller`,explanation:`They are on unrelated scales.`}],correct:1},{question:`Nudging a prediction from 0.40 to 0.49 left accuracy at 0.6667 five times. Why?`,options:[{text:`The model did not actually improve`,explanation:`The truth is 1, so every nudge moved the prediction closer to it.`},{text:`The decision is still 0 until the value crosses the 0.5 cut-off, and accuracy only sees decisions`,explanation:`Correct. Accuracy is computed from a comparison, which discards the size of the gap.`},{text:`Six examples is too few to register a change`,explanation:`One example changing would move accuracy by 1/6 — the issue is that none crossed.`},{text:`Rounding hid the change`,explanation:`The value is exactly 4/6 at every step, not a rounded approximation.`}],correct:1},{question:`Accuracy slope 0.0000, loss slope −0.1983. What does the loss slope tell a training loop?`,options:[{text:`Nothing useful — a negative slope means the model is getting worse`,explanation:`Negative means the loss falls as the prediction rises, which is the improvement direction.`},{text:`Raise this prediction to lower the loss, and by roughly this much per unit`,explanation:`Correct. Direction and magnitude — which is exactly what a gradient step needs.`},{text:`That the learning rate is too high`,explanation:`The slope says nothing about the step size you choose.`},{text:`That the model has converged`,explanation:`A slope of −0.198 means there is plenty left to gain.`}],correct:1},{question:`Why does the loss have a derivative everywhere but accuracy does not?`,options:[{text:`The loss is built from the raw numbers; accuracy is built from a comparison, so it is flat between crossings and jumps at them`,explanation:`Correct — flat almost everywhere and vertical at a few points is exactly the shape with no usable slope.`},{text:`Accuracy is a percentage`,explanation:`Being a percentage does not prevent differentiation.`},{text:`The loss uses squares`,explanation:`Absolute error also has a usable slope; squaring is not what makes it differentiable.`},{text:`Accuracy needs more data`,explanation:`It has the same shape at any dataset size.`}],correct:0},{question:`Pushing the prediction past 0.5 makes accuracy jump 0.6667 → 0.8333. Why does that make things worse rather than better for training?`,options:[{text:`It does not — a jump is a large gradient`,explanation:`A vertical jump is not a derivative at all; it is undefined there.`},{text:`Accuracy is flat almost everywhere and vertical at a few points, so there is no usable slope anywhere`,explanation:`Correct. Zero tells you nothing, and the cliff cannot be differentiated.`},{text:`The jump size is too small to matter`,explanation:`1/6 is a large jump; the problem is its shape, not its size.`},{text:`It shows accuracy is actually trainable`,explanation:`It is the opposite — a step function is the canonical untrainable objective.`}],correct:1},{question:`A fraud model scores 99.9% accuracy by predicting "not fraud" always. What does the module say about the loss in that situation?`,options:[{text:`The loss would have caught it`,explanation:`Squared error over a million rows is dominated by the same 999,000 easy rows.`},{text:`The loss was not objecting either — both can fail for the same reason, a rare class drowned by a common one`,explanation:`Correct, and it is why choosing a loss well and choosing a metric well are separate decisions.`},{text:`Losses cannot be computed on imbalanced data`,explanation:`They compute fine; the issue is what dominates the average.`},{text:`This is only a metric problem`,explanation:`The module is explicit that the loss was equally dominated.`}],correct:1}],interviewQuestions:[{question:`Why do we not just train on accuracy?`,answer:`Because accuracy has no usable slope. It is computed from thresholded decisions, so nudging a prediction from 0.40 to 0.49 leaves it completely unchanged — I measured a slope of exactly 0.0000 over that range while the squared-error loss gave −0.1983. And when the prediction finally crosses the cut-off, accuracy jumps discontinuously, which is not a derivative either. Flat almost everywhere and vertical at a few points is precisely the shape gradient descent cannot use.`,isCaseBased:!0},{question:`Give an example where the loss improves and the metric does not.`,answer:`Exactly the case above: over five nudges the loss fell from 0.15 to 0.13335 while accuracy sat at 0.6667 throughout. It happens constantly in real training — the model becomes more confident about answers it already had right, or less wrong about ones it still gets wrong, and neither crosses a decision boundary. It is why a flat accuracy curve early in training is not evidence that nothing is happening, and why you watch the loss for progress and the metric for whether the progress matters.`,isCaseBased:!1},{question:`Can the loss and the metric ever be the same thing?`,answer:`Sometimes, in regression. If you report MAE and train on MAE, they coincide, and that is a genuinely comfortable position because the thing being optimised is the thing being judged. It happens far less in classification, where almost every metric you care about — accuracy, precision, F1, AUC — is built on thresholded decisions or on ranks and therefore has no gradient. The standard resolution is to train on a differentiable surrogate like cross-entropy and monitor the real metric alongside it.`,isCaseBased:!1},{question:`How do you handle a business metric that is not differentiable?`,answer:`Train on a differentiable surrogate that correlates with it, then use the real metric to choose between candidates and to set the operating point. Cross-entropy is the usual surrogate for classification. Where the business metric is asymmetric — a missed fraud costs far more than a false alarm — you push that asymmetry into the loss via class weights, and you choose the threshold from the cost ratio rather than leaving it at 0.5. The threshold is where most of the business logic actually lives.`,isCaseBased:!0},{question:`Your training loss falls steadily and validation accuracy is flat. What do you conclude?`,answer:`Not much on its own, and that is the point. Early in training it usually means the model is getting more confident without changing any decisions, which is normal and will resolve. If it persists, I would check whether validation *loss* is also falling — if loss falls and accuracy does not, it is confidence; if training loss falls while validation loss rises, it is overfitting and accuracy is simply the slower signal. I would also check the class balance, since accuracy on skewed data can be pinned by the majority class regardless of what the model learns.`,isCaseBased:!0},{question:`What makes a good loss function, beyond being differentiable?`,answer:`Three things. It should be differentiable with a gradient that does not vanish where you most need it — the classic failure is squared error with a sigmoid, where a confidently wrong prediction produces almost no gradient. It should be a proper scoring rule if you want calibrated probabilities, which cross-entropy is. And its minimum should be somewhere you actually want to be: if the business cost is asymmetric and the loss is symmetric, you are optimising toward the wrong point however well it trains.`,isCaseBased:!1},{question:`Is there a way to optimise a non-differentiable metric directly?`,answer:`There are options, though they are rarely worth it. You can use a smooth surrogate that approaches the metric — soft-F1 replaces the counts with expected counts. You can use policy-gradient methods, which need only a score and not a derivative, at the cost of much higher variance. Or you can search directly over thresholds and hyperparameters using the real metric, which is what tuning already does. In practice, training on cross-entropy and choosing the threshold on the real metric captures most of the benefit for a fraction of the complexity.`,isCaseBased:!1},{question:`A stakeholder asks why you report two different numbers. What do you say?`,answer:`That one is machinery and one is the answer. The loss exists so the model can improve itself — it is an internal quantity with no units anyone cares about, and a loss of 0.13 means nothing to a business. The metric is the answer to their question, in their terms: how many frauds caught, at how many alerts. I would report only the metric to them and keep the loss in the engineering discussion, while being clear that a falling loss with a flat metric means work is happening that has not yet paid off.`,isCaseBased:!0}],flashcards:[{front:`Loss vs metric`,back:`The loss is what the model optimises and must have a usable slope. The metric is what you judge by and need not.`},{front:`The demonstration`,back:`Nudging a prediction 0.40 → 0.49: accuracy stays at 0.6667 five times while the loss falls 0.15 → 0.13335.`},{front:`The two slopes`,back:`accuracy slope 0.0000, loss slope −0.1983. Zero means "take a step of size zero" — training cannot start.`},{front:`Why accuracy has no slope`,back:`It is computed from thresholded decisions: flat between crossings, vertical at them. Neither shape is a usable derivative.`},{front:`The jump`,back:`Crossing 0.5 takes accuracy 0.6667 → 0.8333 in one step. Flat-then-cliff is exactly what gradient descent cannot use.`},{front:`Can they be the same?`,back:`Sometimes in regression — train on MAE, report MAE. Almost never in classification, where the metrics are threshold- or rank-based.`},{front:`The standard resolution`,back:`Train on a differentiable surrogate (cross-entropy), monitor the real metric, and choose the threshold on the metric.`},{front:`The fraud trap`,back:`1-in-1000 fraud: predicting "never" scores 99.9%. And squared-error loss over a million rows is dominated by the same easy rows — both numbers fail for the same reason.`}],mindmapMarkdown:`- Loss vs metric
  - Definitions
    - loss: what the MODEL uses, needs a slope
    - metric: what YOU judge by, needs none
  - The experiment
    - six emails, nudge prediction 4 from 0.40 to 0.49
    - accuracy: 0.6667 every time
    - loss: 0.15 -> 0.13335 every time
    - slopes: 0.0000 vs -0.1983
  - Why
    - loss built from raw numbers -> derivative everywhere
    - accuracy built from decisions -> flat, then a cliff
    - crossing 0.5 jumps 0.6667 -> 0.8333
  - In practice
    - train on a surrogate (cross-entropy)
    - judge on the real metric
    - choose the threshold on the metric
  - The trap
    - 1-in-1000 fraud: "never" scores 99.9%
    - the LOSS was equally dominated
    - choosing a loss and choosing a metric are separate decisions`};export{e as default};