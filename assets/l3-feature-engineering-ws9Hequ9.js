var e={id:`ml-l3-feature-engineering`,subjectId:`ml`,level:3,title:`Feature Engineering and Data Leakage`,whyItMatters:`One computed column took the same model from 0.855 to 0.986 here. The same skill, applied one line too early, produced a model reporting 0.742 that is actually worse than guessing — so both halves belong on one page.`,assumes:[`You know what a train/test split is and why it exists`,`You have seen scikit-learn fit and score a model`],estMinutes:24,sections:[{type:`intuition`,title:`What feature engineering is`,md:`A **feature** is one column the model gets to see. **Feature engineering** is creating or rewriting columns so the model can use what is already in your data.

It matters because most models can only combine columns in restricted ways. A linear model adds them up; it cannot *divide* one by another however long you train it.

400 houses, with area and rooms, where price genuinely depends on area **per room**. The model has both numbers and still cannot get there.`},{type:`code`,lang:`python`,title:`Two columns, then the same two plus one we compute`,code:`import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split

rng = np.random.default_rng(0)
area = rng.uniform(500, 3000, 400)
rooms = rng.integers(2, 7, 400)
price = 4000 * (area / rooms) + rng.normal(0, 150000, 400)

X = np.column_stack([area, rooms])
Xtr, Xte, ytr, yte = train_test_split(X, price, test_size=0.3, random_state=0)
print('area + rooms      :', round(LinearRegression().fit(Xtr, ytr).score(Xte, yte), 3))

X2 = np.column_stack([area, rooms, area / rooms])
X2tr, X2te, ytr, yte = train_test_split(X2, price, test_size=0.3, random_state=0)
print('+ area per room   :', round(LinearRegression().fit(X2tr, ytr).score(X2te, yte), 3))

# ---- real output ----
# area + rooms      : 0.855
# + area per room   : 0.986`,annotations:{8:`The truth is 4000 × (area / rooms) plus noise. The information is entirely present in the two columns — nothing is hidden.`,12:`0.855 with both raw columns. A linear model can only compute w1·area + w2·rooms, and no choice of those two weights is a division.`,16:`0.986 once the ratio is handed over. Same rows, same model, same split. The extra column contained no new information — it just put the existing information in a form the model could use.`}},{type:`visual`,component:`Plot`,props:{title:`What one engineered column bought`,notice:`Both bars are the same 400 houses, the same linear model and the same split. The only difference is whether area/rooms was supplied as a column. No information was added — the ratio was always computable from what the model already had. A linear model simply cannot compute a division, and that is the gap.`,kind:`bar`,yLabel:`test R²`,bars:[{label:`area + rooms`,value:.855,color:1},{label:`+ area/rooms`,value:.986,color:2}]}},{type:`math`,intro:`The two standard rescalings. Min-max forces the column into [0, 1] and is sensitive to a single extreme value, since one outlier sets the max. Standardisation centres on the mean and divides by the standard deviation, leaving the column unbounded but far more robust.`,latex:[`x^{\\text{minmax}} = \\frac{x - \\min}{\\max - \\min} \\qquad\\qquad x^{\\text{standard}} = \\frac{x - \\mu}{\\sigma}`]},{type:`code`,lang:`python`,title:`Both scalings on four salaries, by hand`,code:`salary = [20000, 35000, 50000, 90000]
lo, hi = min(salary), max(salary)
for s in salary:
    print(s, round((s - lo) / (hi - lo), 3))

mean = sum(salary) / len(salary)
sd = (sum((s - mean) ** 2 for s in salary) / len(salary)) ** 0.5
print('mean', round(mean, 1), 'sd', round(sd, 1))
for s in salary:
    print(s, round((s - mean) / sd, 3))

# ---- real output ----
# 20000 0.0
# 35000 0.214
# 50000 0.429
# 90000 1.0
# mean 48750.0 sd 26070.8
# 20000 -1.103
# 35000 -0.527
# 50000 0.048
# 90000 1.582`,annotations:{13:`Min-max puts the smallest at exactly 0 and the largest at exactly 1. Note how bunched the first three are — the single 90000 sets the top of the range and squashes everything else.`,18:`Standardised, the values are centred near zero and 90000 sits 1.582 standard deviations up. Nothing is pinned to a boundary, so one extreme value distorts the others far less.`}},{type:`code`,lang:`python`,title:`Which models care about scale — watched, not memorised`,code:`from sklearn.datasets import make_classification
from sklearn.neighbors import KNeighborsClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.preprocessing import StandardScaler

X, y = make_classification(n_samples=600, n_features=2, n_redundant=0, n_informative=2, random_state=7)
X[:, 0] = X[:, 0] * 5000 + 60000
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.3, random_state=0)
sc = StandardScaler().fit(Xtr)

print('knn  raw   ', round(KNeighborsClassifier().fit(Xtr, ytr).score(Xte, yte), 3))
print('knn  scaled', round(KNeighborsClassifier().fit(sc.transform(Xtr), ytr).score(sc.transform(Xte), yte), 3))
print('tree raw   ', round(DecisionTreeClassifier(random_state=0).fit(Xtr, ytr).score(Xte, yte), 3))
print('tree scaled', round(DecisionTreeClassifier(random_state=0).fit(sc.transform(Xtr), ytr).score(sc.transform(Xte), yte), 3))

# ---- real output ----
# knn  raw    0.811
# knn  scaled 0.917
# tree raw    0.878
# tree scaled 0.878`,annotations:{7:`Column 0 is blown up to salary-like magnitudes while column 1 stays near zero. Both columns are equally informative.`,9:`The scaler is fitted on TRAINING rows only, then applied to both. Fitting it on everything would let test rows shape the transform.`,18:`k-NN goes 0.811 → 0.917. It compares magnitudes across columns, so the inflated column was drowning the other one.`,20:`The tree gives 0.878 both times, identical to three decimals. It only ever asks "is this column above that threshold", which no monotonic rescaling can change.`}},{type:`note`,label:`The rule, now that you have seen it`,md:`Ask one question about the model: **does it compare magnitudes across different columns?**

- **Yes → scale.** k-NN, K-Means, SVM, PCA, and anything regularised (the penalty adds weights across columns).
- **No → do not bother.** Decision trees and every ensemble of them, because a split threshold is per-column.

Neural networks are a "yes" for a different reason: unscaled inputs produce huge gradients for their weights and destabilise training.`},{type:`code`,lang:`python`,title:`Encoding: what ordinal costs on an unordered column`,code:`rng = np.random.default_rng(1)
code = rng.integers(0, 3, 300)
true_price = np.array([100.0, 300.0, 150.0])
y = true_price[code] + rng.normal(0, 10, 300)

ordinal = code.reshape(-1, 1)
print('ordinal R2:', round(LinearRegression().fit(ordinal, y).score(ordinal, y), 3))
onehot = np.column_stack([code == 0, code == 1, code == 2]).astype(float)
print('one-hot R2:', round(LinearRegression().fit(onehot, y).score(onehot, y), 3))
print('ordinal says:', np.round(LinearRegression().fit(ordinal, y).predict(np.array([[0], [1], [2]])), 1))

# ---- real output ----
# ordinal R2: 0.05
# one-hot R2: 0.988
# ordinal says: [156.4 179.3 202.1]`,annotations:{3:`Three unordered categories — colours, say — whose true prices are 100, 300 and 150. Category 1 is the expensive one, sitting between the other two numerically.`,7:`Ordinal encoding writes them as 0, 1, 2 in one column, which tells the model they are evenly spaced and ordered. R² 0.05: it explains essentially nothing.`,9:`One-hot gives each category its own column, so the model can assign three independent values. R² 0.988.`,10:`The ordinal model predicts 156.4, 179.3, 202.1 — a straight line, because that is all one column allows. It cannot say "the middle one is highest", which is exactly what the data does say.`}},{type:`intuition`,title:`Leakage: the same skill, applied one line too early`,md:`**Data leakage** is information reaching the model during training that will not be available when a prediction is actually needed.

**Target encoding** is a legitimate, widely used technique: replace a category with the average target value for that category. It is also the easiest way to leak, because the target is right there in the formula.

The difference between the correct version and the broken one is which side of the split the averaging happens on. Here it is, on 400 rows where the city and the label are **independent random numbers** — so the honest answer is that there is nothing to learn.`},{type:`code`,lang:`python`,title:`Encode first, split second — the broken order`,code:`from sklearn.linear_model import LogisticRegression

rng = np.random.default_rng(3)
city = rng.integers(0, 200, 400)
y = rng.integers(0, 2, 400)

def encode(cities, labels, rows):
    means = {c: labels[cities == c].mean() for c in np.unique(cities)}
    return np.array([[means.get(c, labels.mean())] for c in rows])

Xleak = encode(city, y, city)
Xa, Xb, ya, yb = train_test_split(Xleak, y, test_size=0.3, random_state=0)
print('leaky  :', round(LogisticRegression().fit(Xa, ya).score(Xb, yb), 3))

# ---- real output ----
# leaky  : 0.742`,annotations:{5:`city and y are drawn independently. There is no relationship between them at all, so no model should beat chance.`,8:`A dict comprehension: for each distinct city, the mean label of its rows. That mean is the encoded value.`,11:`Encoding uses ALL the labels, including rows that are about to become the test set. With 200 cities across 400 rows, most cities have one or two rows — so a city's "average label" is close to being its label.`,14:`0.742 on data with nothing to learn. The feature is a lightly disguised copy of the answer.`}},{type:`code`,lang:`python`,title:`Split first, encode second — the honest order`,code:`ctr, cte, ytr, yte = train_test_split(city, y, test_size=0.3, random_state=0)
Xtr = encode(ctr, ytr, ctr)
Xte = encode(ctr, ytr, cte)
print('honest :', round(LogisticRegression().fit(Xtr, ytr).score(Xte, yte), 3))
print('base   :', round(max(yte.mean(), 1 - yte.mean()), 3))

# ---- real output ----
# honest : 0.45
# base   : 0.525`,annotations:{2:`The encoding is now computed from TRAINING labels only, and the same mapping is applied to the test rows. Test labels never enter the formula.`,7:`0.45 — worse than the 0.525 you get by always guessing the majority class. That is the correct answer, because there was genuinely nothing to learn.`}},{type:`note`,label:`Read those two numbers again`,md:`**0.742 and 0.45.** Same rows, same model, same feature idea. The only difference is which side of the split the averaging happened on.

Nothing in the leaky code looks wrong. It has no bug, raises no warning, and produces a plausible number that beats the baseline. It would have shipped.

The general rule covers scaling, imputation, feature selection and resampling as well: **anything that learns from data is fitted on the training portion only.** The reliable way to enforce it is a \`Pipeline\`, so the framework refits per fold instead of relying on you to remember.`}],quiz:[{question:`Adding area/rooms took R² from 0.855 to 0.986. Where did the extra information come from?`,options:[{text:`Nowhere — the ratio was always computable from the two existing columns`,explanation:`Correct. Feature engineering adds no information; it puts existing information in a form the model can use.`},{text:`From the extra column of data collected`,explanation:`No new data was collected; the column was computed from what was there.`},{text:`From the larger training set`,explanation:`The same 400 rows and the same split were used.`},{text:`From the noise term`,explanation:`The noise is unchanged and is what caps R² below 1.`}],correct:0},{question:`Why could the linear model not find that relationship itself?`,options:[{text:`It was not trained for long enough`,explanation:`Linear regression is solved in closed form; training length is not a factor.`},{text:`A linear model computes w1·area + w2·rooms, and no choice of weights performs a division`,explanation:`Correct. The functional form simply cannot express a ratio.`},{text:`The learning rate was too low`,explanation:`There is no learning rate in ordinary least squares.`},{text:`The columns were not scaled`,explanation:`Scaling does not let a linear model divide one column by another.`}],correct:1},{question:`k-NN went 0.811 → 0.917 when scaled; the tree gave 0.878 both times. Why the difference?`,options:[{text:`The tree is a better model`,explanation:`Scaled k-NN beats it, at 0.917.`},{text:`k-NN compares magnitudes across columns; a tree only asks whether one column is above a threshold`,explanation:`Correct. A monotonic rescaling cannot change which side of a split a row falls on.`},{text:`The tree was already scaled internally`,explanation:`It does no rescaling; it simply does not care.`},{text:`Random variation between runs`,explanation:`Both tree runs give 0.878 to three decimals — that is exact invariance, not luck.`}],correct:1},{question:`Ordinal encoding on three unordered categories gave R² 0.05 against one-hot's 0.988. What went wrong?`,options:[{text:`One column forces the model to say the categories are ordered and evenly spaced`,explanation:`Correct. The true prices are 100, 300, 150 — the middle category is the highest, which a single line cannot express, so it predicts 156.4, 179.3, 202.1.`},{text:`Ordinal encoding loses data`,explanation:`The category is fully recoverable from the code; the problem is the geometry it imposes.`},{text:`The model needed more rows`,explanation:`300 rows is ample for three categories.`},{text:`One-hot is always better`,explanation:`For genuinely ordered categories — S, M, L, XL — ordinal is preferable and uses fewer columns.`}],correct:0},{question:`Target encoding scored 0.742 leaky and 0.45 honest, on data where city and label are independent. Which is correct?`,options:[{text:`0.742 — the model found a real pattern`,explanation:`There is no pattern; the two columns were drawn independently.`},{text:`0.45 — and it should be near chance, because there is genuinely nothing to learn`,explanation:`Correct. The baseline is 0.525, so the honest model is unremarkable, which is the right answer here.`},{text:`Neither; the model is broken`,explanation:`The model is fine — the feature was built at the wrong time in one case.`},{text:`The average of the two`,explanation:`One of them measures a leak, so averaging is meaningless.`}],correct:1},{question:`What made the leaky version leak?`,options:[{text:`The encoding was computed from all labels, including rows that became the test set`,explanation:`Correct. With 200 cities across 400 rows, most cities have one or two rows, so their "average label" is very close to being their label.`},{text:`Target encoding is inherently invalid`,explanation:`It is a legitimate and widely used technique — when fitted on training data only.`},{text:`The random seed was badly chosen`,explanation:`The effect appears for any seed; it is structural.`},{text:`Logistic regression cannot handle encoded categories`,explanation:`It handles them fine; the honest version uses the same model.`}],correct:0}],interviewQuestions:[{question:`What is feature engineering, and why does it still matter?`,answer:`Creating or rewriting columns so a model can use information that is already present. It matters because most models can only combine columns in restricted ways — a linear model adds them and cannot divide. On 400 houses where price genuinely depends on area per room, the model with both raw columns scored R² 0.855, and adding the ratio took it to 0.986 with no new data at all. On tabular problems it is routinely worth more than swapping model families.`,isCaseBased:!0},{question:`Which models need feature scaling, and why?`,answer:`Ask whether the model compares magnitudes across columns. Distance-based methods do — k-NN, K-Means, SVM with an RBF kernel, PCA — and so does anything regularised, because the penalty adds weights from different columns together. Neural networks need it for a different reason: unscaled inputs produce large gradients and destabilise training. Trees and their ensembles do not care at all, because a split is a threshold within one column. Measured on the same data: k-NN went 0.811 to 0.917 with scaling, and the tree gave 0.878 either way.`,isCaseBased:!1},{question:`When would you use ordinal encoding rather than one-hot?`,answer:`When the categories genuinely have an order with roughly even steps — S, M, L, XL, or low/medium/high. Then one column carries real information and you avoid the extra dimensions. For unordered categories it imposes a false ordering and a false spacing: on three categories whose true values were 100, 300 and 150, ordinal gave R² 0.05 while one-hot gave 0.988, because a single line cannot say the middle category is the highest. For high-cardinality columns I would consider target encoding or hashing rather than one-hot, since one-hot on thousands of levels produces very sparse weak splits.`,isCaseBased:!1},{question:`Explain data leakage with a concrete example.`,answer:`Leakage is information reaching training that will not be there at prediction time. The cleanest demonstration is target encoding computed before the split: on 400 rows where city and label were drawn independently — so there is nothing to learn — encoding first and splitting second reported 0.742, while splitting first and encoding on training labels only gave 0.45 against a 0.525 baseline. The leaky code has no bug and raises no warning; it just produces a plausible number that beats the baseline, which is why it ships.`,isCaseBased:!0},{question:`How do you prevent leakage systematically rather than by vigilance?`,answer:`Wrap every fitted step in a Pipeline and pass the pipeline to cross-validation, so scaling, imputation, encoding and feature selection are refitted inside each fold automatically. Beyond that, audit features by asking of each one whether the value would genuinely be known at the moment the prediction is needed — that catches the subtler class, like a field populated only after the outcome. And split by time or by group when the data has that structure, since a random split leaks the future or the same entity.`,isCaseBased:!1},{question:`How would you handle missing values?`,answer:`First find out why they are missing, because that determines what is legitimate. Missing at random can be imputed — median for numeric, most frequent for categorical, or a model-based imputation if the column matters a lot. But missingness is often informative: an income field left blank may itself predict the outcome, so I would add a boolean "was_missing" column alongside the imputed value rather than silently filling it. For trees, LightGBM and XGBoost learn a default direction for missing rows and often need no imputation at all. Whatever I choose, the imputer is fitted on training data only.`,isCaseBased:!1},{question:`When is a log transform the right move?`,answer:`When a column spans orders of magnitude and is right-skewed — income, population, page views, prices. Logging compresses the long tail so a handful of extreme values stop dominating, turns multiplicative relationships into additive ones that a linear model can express, and often makes residuals better behaved. Caveats: it needs strictly positive values, so log1p is the usual choice, and it changes what the coefficients mean, since a unit change in log-space is a percentage change in the original.`,isCaseBased:!1},{question:`Your model scores 0.98 in validation and everyone is delighted. What do you do?`,answer:`Assume leakage until proven otherwise, particularly if the task is one where 0.98 is implausible. I would go feature by feature asking whether each value is genuinely available at prediction time, look for anything derived from the target however indirectly, check whether any preprocessing was fitted before the split, and check for duplicate or near-duplicate rows spanning the split. Then check whether the split respects time and entity structure. A suspiciously good number is far more often a pipeline mistake than a breakthrough.`,isCaseBased:!0}],flashcards:[{front:`Feature engineering, in one sentence`,back:`Create or rewrite columns so the model can use information already present. area/rooms took R² from 0.855 to 0.986 with no new data.`},{front:`Why could the model not find the ratio itself?`,back:`A linear model computes w1·x1 + w2·x2. No choice of weights is a division — the functional form cannot express it.`},{front:`Min-max vs standardisation`,back:`Min-max → [0,1], one outlier sets the range. Standardise → (x−μ)/σ, unbounded but far more robust. Salaries: 90000 becomes 1.0 or 1.582.`},{front:`Which models need scaling?`,back:`Those comparing magnitudes across columns: k-NN, K-Means, SVM, PCA, anything regularised, and NNs for gradient stability. Trees do not: 0.878 scaled and unscaled.`},{front:`Ordinal vs one-hot`,back:`Ordinal implies order AND even spacing. On unordered categories with true values 100/300/150 it scored R² 0.05 against one-hot's 0.988.`},{front:`Data leakage`,back:`Information reaching training that will not exist at prediction time. Target encoding before the split: 0.742 on data with nothing to learn; honest version 0.45 against a 0.525 baseline.`},{front:`The general rule`,back:`Anything that learns from data — scaler, imputer, encoder, selector, resampler — is fitted on the training portion only. Enforce it with a Pipeline.`},{front:`Missingness is a feature`,back:`Add a was_missing boolean alongside the imputed value. A blank income field may itself predict the outcome.`}],mindmapMarkdown:`- Feature engineering & leakage
  - Engineering
    - a feature = one column the model sees
    - adds no information, changes the FORM
    - 400 houses: 0.855 -> 0.986 from area/rooms
    - linear models cannot divide
  - Scaling
    - min-max: (x-min)/(max-min), outlier sets range
    - standard: (x-mu)/sigma, robust
    - scale if the model compares magnitudes ACROSS columns
      - knn 0.811 -> 0.917
      - tree 0.878 -> 0.878 (unchanged)
  - Encoding
    - ordinal implies order + even spacing
    - unordered 100/300/150: ordinal R2 0.05, one-hot 0.988
    - ordinal predicts a straight line 156.4/179.3/202.1
  - Leakage
    - info that will not exist at prediction time
    - target encoding before split: 0.742 on random data
    - after split: 0.45 vs baseline 0.525
    - no bug, no warning, plausible number
  - The rule
    - fit every learned step on TRAIN only
    - use a Pipeline so it is enforced`};export{e as default};