import type { Module } from '../types'

const m: Module = {
  id: 'mlops-l2-why-mlops',
  subjectId: 'mlops',
  level: 2,
  title: 'Why ML Needs Special Ops: Drift, Decay & Reproducibility',
  whyItMatters:
    'This is the module that answers the interview question "why is MLOps a separate thing — is it not just DevOps?". Get the three-part answer right (code + data + model, statistical instead of deterministic tests, silent decay) and every later module — MLflow, DVC, Airflow, monitoring — stops looking like tool trivia and starts looking like the obvious fix to a named problem. It also contains "how do you detect drift", which the plan lists as a core interview theme.',
  estMinutes: 50,
  sections: [
    {
      type: 'intuition',
      title: 'Three things break that never break in normal software',
      md: `A bridge is built once and inspected forever. Ordinary software is a bridge. An ML model is a bridge over a river that keeps changing course.

- **A normal system's behaviour is defined by CODE. An ML system's is defined by code + data + model.** The same script on a different dataset is a different product. So you must version all three, not one.
- **A normal system's tests are deterministic. An ML system's outputs are statistical.** \`assert total == 42\` becomes "AUC must be above 0.81 on the holdout" — a threshold, on a distribution, that can pass on Monday and fail on Tuesday with no code change.
- **A normal system does not silently get worse while sitting still.** A model does, because the world moves under it. Nothing crashes. No exception is thrown. The 500-error rate stays flat while the model quietly becomes wrong.
- That third one is why monitoring in MLOps is not optional decoration. In backend ops, silence means health. In ML ops, **silence means nothing at all** — you have to go and measure.
- One more asymmetry worth saying in an interview: a bug in normal software is usually reproducible on demand. A model failure is often a *distribution*, and you cannot step through a distribution in a debugger.`,
    },
    {
      type: 'code',
      lang: 'bash',
      title: 'Version all three — the DVC shape',
      code: `# 1 - CODE. The one everybody already versions.
git rev-parse --short HEAD          # 9f2c1ab

# 2 - DATA. Git stores a tiny pointer; the bytes live in S3/GCS.
dvc add data/transactions.parquet   # writes data/transactions.parquet.dvc
cat data/transactions.parquet.dvc
# outs:
# - md5: 7c9d3f1e4ab2c05d9e17f3a884b21c66
#   size: 412839221
#   hash: md5
#   path: transactions.parquet
git add data/transactions.parquet.dvc data/.gitignore
git commit -m "data: transactions v3 (Aug snapshot)"

# 3 - MODEL. The weights are an artifact with their own identity.
sha256sum artifacts/model.pkl       # 3b1f9c...  goes into the run manifest

# Reproducing a result = restoring all three to the same point in time.
git checkout 9f2c1ab
dvc checkout                        # pulls the exact bytes that commit points at`,
      annotations: {
        2: 'The code version. Necessary, and on its own useless — this commit trained on data you can no longer name.',
        5: 'dvc add hashes the file, moves it to a local cache, and leaves a small .dvc pointer file behind.',
        8: 'The content hash IS the data version. Change one row and this string changes — that is the whole trick.',
        12: 'You commit the POINTER (a few hundred bytes), never the 400 MB parquet. Git stays fast; the bytes go to S3 on dvc push.',
        16: 'Weights deserve an identity too. Two files named model.pkl are not the same model, and one of them is in production.',
        20: 'The line that makes reproducibility real: git restores the code, dvc restores the data that commit was pinned to.',
      },
    },
    {
      type: 'intuition',
      title: '"But it works in my notebook"',
      md: `Six failures hide behind that sentence. Name them and you already sound senior.

- **Cells run out of order.** You defined \`df\` in cell 12, edited cell 4, re-ran only cell 12. The result exists; the path that produced it does not.
- **Hidden state.** A variable from an experiment you deleted an hour ago is still alive in the kernel. Restart the kernel and the notebook fails.
- **Unpinned dependencies.** \`pip install scikit-learn\` gave 1.7.2 in July and 1.8.0 in September. Tree ensembles change; your numbers move; nobody touched the code.
- **A path to a CSV on someone's desktop.** \`C:/Users/priya/Downloads/final_v2_REAL.csv\` — a file that exists on exactly one laptop and has no version.
- **No seed.** The train/test split, the weight init and the feature subsampling are all random. Every run gives a slightly different number, and you cannot tell an improvement from noise.
- **Manual steps in a human's head.** "Drop the outliers first, then run cell 8." That instruction is not anywhere a machine can read it.
- The fixes are the whole rest of this subject: **scripts + config** instead of cells, **pinned lockfiles**, **seeds everywhere**, **data versioned by hash**, and **an environment in a container**.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Notebook to pipeline: config, seeds, and a run manifest',
      code: `# config.py - every number that changes behaviour lives here, not in a cell.
from dataclasses import dataclass, asdict

@dataclass(frozen=True)
class Config:
    data: str = 'data/transactions.parquet'   # repo-relative, never a desktop
    n_estimators: int = 400
    max_depth: int = 8
    seed: int = 42

# train.py - a SCRIPT: top to bottom, once, in order. No hidden state.
import hashlib, json, os, random
import numpy as np

def seed_everything(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    os.environ['PYTHONHASHSEED'] = str(seed)
    # torch.manual_seed(seed); torch.cuda.manual_seed_all(seed)

def sha256(path: str) -> str:
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()[:12]

def main() -> None:
    cfg = Config()
    seed_everything(cfg.seed)
    model, metrics = train(cfg)
    manifest = {
        'git_commit': os.popen('git rev-parse HEAD').read().strip(),
        'data_sha256': sha256(cfg.data),
        'config': asdict(cfg),
        'env_lock': sha256('requirements.lock'),
        'metrics': metrics,
    }
    json.dump(manifest, open('run_manifest.json', 'w'), indent=2)

if __name__ == '__main__':
    main()`,
      annotations: {
        4: 'frozen=True makes the config immutable, so nothing mutates a hyperparameter halfway through and lies to your log.',
        6: 'A repo-relative path. The moment a path names a person, the run is reproducible on exactly one machine.',
        9: 'The seed is CONFIG, not a magic number buried in a function. It gets logged with everything else.',
        11: 'A script cannot be run out of order and has no leftover kernel state. That single change kills two of the six notebook failures.',
        18: 'Honest caveat: PYTHONHASHSEED must be set BEFORE the interpreter starts to fully take effect. Set it in the Dockerfile or the entrypoint too.',
        24: 'Streams the file in 1 MB chunks, so hashing a 4 GB parquet does not load 4 GB into RAM.',
        33: 'If the working tree is dirty this hash is a lie. Real pipelines refuse to run when git status is not clean.',
        39: 'This manifest is the reproducibility contract: code, data, config, environment, metrics — one JSON you can diff against last month.',
      },
    },
    {
      type: 'code',
      lang: 'bash',
      title: 'Pin the environment, then prove it',
      code: `# The lottery ticket: resolved fresh on every machine, on every day.
pip install scikit-learn pandas

# The fix: resolve once, commit the exact set (direct AND transitive deps).
pip freeze > requirements.lock      # scikit-learn==1.7.2, numpy==2.4.6, ...
pip install -r requirements.lock

# A container pins the layer BELOW pip: OS, glibc, CUDA, the python build.
docker build -t fraud-train:9f2c1ab .
docker run --rm -v "$PWD/data:/app/data" fraud-train:9f2c1ab python train.py

# Proof: same inputs must produce the same config block and the same metrics.
diff <(jq -S .config run_manifest.json) <(jq -S .config baseline.json)`,
      annotations: {
        2: 'Unpinned. A minor scikit-learn release changes a default or a tie-break rule, your AUC moves, and git blame shows nothing.',
        5: 'pip freeze pins transitive dependencies too. That matters more than the direct ones — numpy is what actually changed under you.',
        9: 'Tag the image with the commit. Now "which code is in prod" and "which image is in prod" are the same question.',
        10: 'Data is MOUNTED, not baked in. The image is code + environment; DVC owns the data. Baking a dataset into a layer is how images become 30 GB.',
        13: 'A cheap regression test for the pipeline itself: if the config diff is empty and the metrics moved, something outside your control changed.',
      },
    },
    {
      type: 'note',
      md: 'The reproducibility checklist, memorized: **code commit, data version, hyperparameters, environment (lockfile + image digest), random seeds** — and **hardware** when it matters (a GPU model, a driver version, the number of workers, because data-loader order can change results). Now the honest caveat interviewers respect: **exact bitwise reproducibility on a GPU is not guaranteed.** Floating-point addition is not associative, and cuDNN picks non-deterministic kernels and different reduction orders per run; `torch.use_deterministic_algorithms(True)` gets you closer at a real speed cost, and some ops have no deterministic version at all. So state the goal correctly: **you are reproducing conclusions, not floats.** "The same pipeline gives AUC 0.842 ± 0.003 and picks the same model" is the achievable bar.',
    },
    {
      type: 'intuition',
      title: 'Model decay: four ways the world moves under you',
      md: `Your model learned a photograph. Production is a live video. Decay is the gap between them widening.

- **Data drift (covariate shift)** — \`P(X)\` changes. Your inputs look different: a marketing campaign brings younger users, a new country goes live, a sensor is replaced. The model is *still correct about what it learned* — it is just being asked about regions it barely saw in training.
- **Concept drift** — \`P(y|X)\` changes. The relationship itself moved. The same inputs now deserve a different answer: fraudsters adapt to your rules, fashion turns, a pandemic rewrites what "normal spending" means. This is the dangerous one, because inputs can look completely unchanged.
- **Label drift (prior shift)** — \`P(y)\` changes. The base rate moved: fraud goes from 0.3% to 1.1% of transactions. Your thresholds and any class-imbalance handling were tuned for the old rate and are now wrong.
- Speed matters as much as type: drift can be **sudden** (a pandemic, an upstream schema change), **gradual** (tastes shifting over a year), or **seasonal** (December is not November — do not retrain in a panic every Christmas).
- The one-line test for an interview: *did my inputs change, or did the answer to the same input change?* First is data drift, second is concept drift.`,
    },
    {
      type: 'note',
      md: 'The fifth failure is not drift at all, and it is the one that actually bites: **training-serving skew** — a preprocessing difference between the training pipeline and the serving path. Training used pandas and filled missing age with the column *median*; the serving code is Java and fills with *0*. Or training log-transformed a price and serving forgot. Or a categorical encoder was refitted at serve time so category ids shifted by one. Nothing drifts, nothing errors, and **offline metrics stay perfect** because the offline evaluation runs the training code path. Accuracy in production is quietly halved. The structural fix is a **feature store** or one shared transformation library called by both paths, plus a canary that scores the same rows through both and diffs the feature vectors, not just the predictions.',
    },
    {
      type: 'note',
      md: 'The sixth: **feedback loops** — your model\'s own outputs become tomorrow\'s training data. A recommender only logs clicks on items it chose to show, so it retrains on evidence it manufactured, gets more confident about a shrinking set of items, and the catalogue collapses (see *Recommendation Systems & Time-Series Basics* in the ML subject — this is the exposure-bias problem that motivates exploration). A fraud model blocks transactions it suspects, so those never get a fraud label, so the next model never learns they were fine. A credit model denies a group and never sees whether they would have repaid. The mitigations are all the same shape: **hold out a small random-serving slice** (epsilon exploration) so you keep unbiased data, **log the propensity** of each recommendation for inverse-propensity correction, and always log what the model *saw and chose not to show*, not only what the user clicked.',
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'Drift, one week at a time',
        notice: 'Left: the training reference, frozen at model build time. Right: this week\'s live traffic and the two monitors watching it. Step through and watch PSI rise before anyone files a ticket.',
        leftLabel: 'training reference (frozen)',
        rightLabel: 'live traffic + monitors',
        frames: [
          {
            note: 'Week 1. The reference is the feature distribution the model was trained on, with decile bin edges frozen at train time. Live traffic sits on top of it. PSI 0.0007 is noise; accuracy is at its offline baseline. This is what healthy looks like — and you only know it because you measured, not because nothing crashed.',
            stack: [
              { name: 'ref mean = 0.00', to: 'live' },
              { name: 'bins = frozen deciles' },
            ],
            heap: [
              { id: 'live', value: 'live mean 0.00', label: 'match' },
              { id: 'psi', value: 'PSI 0.0007', label: 'stable' },
              { id: 'acc', value: 'accuracy 0.91', label: 'baseline' },
            ],
          },
          {
            note: 'Week 3. A campaign brings a younger cohort. The input mean has moved 0.15 and PSI is 0.0207 — still far under the 0.1 line. Accuracy has not visibly moved. Nothing to do yet, but note the direction: the input signal moved first, and it moved while labels were still unavailable.',
            stack: [
              { name: 'ref mean = 0.00', to: 'live' },
              { name: 'bins = frozen deciles' },
            ],
            heap: [
              { id: 'live', value: 'live mean 0.15', label: 'drifting' },
              { id: 'psi', value: 'PSI 0.0207', label: 'stable' },
              { id: 'acc', value: 'accuracy 0.90', label: '-0.01' },
            ],
          },
          {
            note: 'Week 4. Mean 0.30, PSI 0.0889 — one hundredth under the threshold, so no alert fires. Accuracy is 0.88 and falling. This frame is the honest part: thresholds are business decisions, not statistics. If a point of accuracy costs real money, your PSI line belongs at 0.05, not 0.1.',
            stack: [
              { name: 'ref mean = 0.00', to: 'live' },
              { name: 'bins = frozen deciles' },
            ],
            heap: [
              { id: 'live', value: 'live mean 0.30', label: 'drifting' },
              { id: 'psi', value: 'PSI 0.0889', label: 'under line' },
              { id: 'acc', value: 'accuracy 0.88', label: '-0.03' },
            ],
          },
          {
            note: 'Week 5. PSI 0.2339 crosses 0.1 and the drift monitor pages. Accuracy is 0.84. The alert came from the INPUTS — no new labels were needed to raise it, which is the entire reason input monitoring exists. First response is investigation, not retraining: is this a real population shift or did an upstream job start sending nulls?',
            stack: [
              { name: 'ref mean = 0.00', to: 'live', danger: true },
              { name: 'bins = frozen deciles' },
            ],
            heap: [
              { id: 'live', value: 'live mean 0.50', label: 'shifted', danger: true },
              { id: 'psi', value: 'PSI 0.2339', label: 'ALERT', danger: true },
              { id: 'acc', value: 'accuracy 0.84', label: '-0.07' },
            ],
          },
          {
            note: 'Week 6, ignored. PSI 0.5984 — the live distribution barely overlaps the training one, and accuracy is 0.76. The model never errored once. There is no stack trace anywhere in this incident, and support tickets are the first thing anyone outside the team noticed.',
            stack: [
              { name: 'ref mean = 0.00', to: 'live', danger: true },
              { name: 'bins = frozen deciles' },
            ],
            heap: [
              { id: 'live', value: 'live mean 0.80', label: 'far off', danger: true },
              { id: 'psi', value: 'PSI 0.5984', label: 'CRITICAL', danger: true },
              { id: 'acc', value: 'accuracy 0.76', label: '-0.15', danger: true },
            ],
          },
          {
            note: 'The loop closes. Retrain on the last 90 days, validate the challenger against the champion on a recent holdout, promote it, and then RE-FIT the reference: new distribution, new bin edges, new baseline. Both cells realign at PSI 0.0009 and accuracy 0.90. Note what made this automatic — a threshold, a trigger, a pipeline that can run without a human opening a notebook.',
            stack: [
              { name: 'ref v2 = last 90 days', to: 'live' },
              { name: 'bins = re-fitted' },
            ],
            heap: [
              { id: 'live', value: 'live mean 0.80', label: 'match' },
              { id: 'psi', value: 'PSI 0.0009', label: 'stable' },
              { id: 'acc', value: 'accuracy 0.90', label: 'recovered' },
            ],
          },
        ],
      },
    },
    {
      type: 'intuition',
      title: 'Detection: watch the inputs, because labels arrive late or never',
      md: `The tempting metric is accuracy. The problem is that accuracy needs ground truth, and ground truth is the slowest thing in the building.

- **You get feature distributions immediately.** Every request carries its inputs. That signal is free and real-time, which is why input monitoring is the backbone of drift detection.
- **You get labels late, or never.** Fraud is confirmed by a chargeback up to 60–90 days later. A loan default takes years. A recommendation you never showed has no label at all.
- So build two layers: **input monitors** (per-feature distributions, null rate, cardinality, range violations, schema) that fire in hours, and **outcome monitors** (accuracy, AUC, precision at k) that confirm weeks later.
- Also monitor the **prediction distribution** — the model's own output histogram. If your fraud score suddenly averages 0.31 instead of 0.04, something changed even before you know whether it was right.
- And monitor the boring things that cause most real incidents: **null rate spiked**, **a category you have never seen appeared**, **a feature is now always exactly zero** because an upstream job silently failed. That last one is far more common than genuine concept drift.
- Proxy metrics fill the label gap: click-through rate, manual-review queue size, the rate of user overrides, downstream conversion. They are noisy, they arrive tomorrow instead of in 90 days, and that trade is worth it.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'PSI in NumPy — watch it cross the threshold',
      code: `import numpy as np

rng = np.random.default_rng(0)

# Reference = the feature distribution the model was TRAINED on.
train = rng.normal(loc=0.0, scale=1.0, size=50_000)

# Bin edges come from TRAINING data only, and are frozen at train time.
edges = np.quantile(train, np.linspace(0, 1, 11))    # deciles
edges[0], edges[-1] = -np.inf, np.inf                # catch unseen extremes

def psi(expected, actual, edges, eps=1e-6):
    e = np.histogram(expected, bins=edges)[0] / len(expected)
    a = np.histogram(actual, bins=edges)[0] / len(actual)
    e, a = np.clip(e, eps, None), np.clip(a, eps, None)
    return float(np.sum((a - e) * np.log(a / e)))

print('week  mean shift   PSI     verdict')
for week, shift in enumerate([0.0, 0.05, 0.15, 0.30, 0.50, 0.80], start=1):
    live = rng.normal(loc=shift, scale=1.0, size=20_000)
    v = psi(train, live, edges)
    verdict = 'stable' if v < 0.1 else ('WATCH' if v < 0.25 else 'RETRAIN')
    print(f'{week:>4}  {shift:>10.2f}  {v:>6.4f}  {verdict}')

# week  mean shift   PSI     verdict
#    1        0.00  0.0007  stable
#    2        0.05  0.0025  stable
#    3        0.15  0.0207  stable
#    4        0.30  0.0889  stable
#    5        0.50  0.2339  WATCH
#    6        0.80  0.5984  RETRAIN`,
      annotations: {
        6: 'The reference sample. In production this is a saved snapshot of the training features, stored beside the model in the registry.',
        9: 'Deciles from the TRAINING data. Recomputing bins on live data every week is the classic bug — moving bins hide the very shift you are hunting.',
        10: 'Open the outer bins to infinity, or values beyond the training range fall outside every bin and vanish from the count.',
        12: 'PSI is a symmetrised KL divergence: sum over bins of (actual - expected) x log(actual / expected). Always non-negative, zero when identical.',
        15: 'The epsilon that stops the whole thing being inf. An empty bin means log(0) — clip it and move on.',
        22: 'The conventional bands: under 0.1 stable, 0.1-0.25 investigate, above 0.25 significant shift. Conventions, not laws — tune them to what a point of accuracy costs you.',
        25: 'Real output. Note week 4: PSI 0.0889 sits just under the line while the input mean has already moved a third of a standard deviation.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Why a p-value is a bad alert: same shift, three sample sizes',
      code: `import numpy as np
from scipy.stats import ks_2samp

rng = np.random.default_rng(1)
base = rng.normal(0.0, 1.0, 200_000)

print('n        shift   KS stat   p-value')
for n in (1_000, 20_000, 200_000):
    live = rng.normal(0.02, 1.0, n)     # a 0.02-sigma shift: commercially nothing
    r = ks_2samp(base[:n], live)
    print(f'{n:>7}   0.02   {r.statistic:.4f}   {r.pvalue:.2e}')

# n        shift   KS stat   p-value
#    1000   0.02   0.0400   4.01e-01
#   20000   0.02   0.0171   5.51e-03
#  200000   0.02   0.0084   1.29e-06`,
      annotations: {
        2: 'KS (Kolmogorov-Smirnov) compares two continuous distributions. Chi-square is its categorical cousin; PSI is the binned one everybody logs.',
        9: 'The SAME meaningless shift every time. Only the sample size changes.',
        13: 'Real output. Read the two columns together: the KS statistic - the actual effect size - shrinks toward the truth (~0.008) as n grows, while the p-value collapses.',
        16: 'At 200k rows a shift nobody could act on is "significant" at p = 1.29e-06. Alert on p-values and you page someone every night. Alert on effect size, calibrated to money.',
      },
    },
    {
      type: 'note',
      md: 'Three practical rules that follow. **One:** alert on *effect size* (PSI, KS statistic, mean shift in units the business understands), never on a p-value, because at production data volumes everything is significant. **Two:** you are testing dozens of features every hour — that is thousands of tests a week, so at p < 0.05 you get a false alarm every few minutes; either correct for multiple comparisons or, better, rank features by drift magnitude and look at the top few. **Three:** compare against a *rolling* recent window as well as the frozen training reference, so you can tell "the world changed slowly since training" (expected, plan a retrain) from "something broke last Tuesday" (an incident, go look at the upstream job).',
    },
    {
      type: 'intuition',
      title: 'The model is a small box in a large diagram',
      md: `The most quoted figure in this field (Sculley et al., *Hidden Technical Debt in Machine Learning Systems*, 2015) is a diagram where the box labelled "ML code" is tiny and every other box is bigger.

1. **Data ingestion** — pull from the warehouse, the event stream, the vendor API. Validate the schema at the door. Most outages start here.
2. **Feature engineering** — transformations that must be *identical* in training and serving. Its own store, its own tests, its own version.
3. **Training** — the small box. Fit, tune, and log every run's params, metrics and artifacts.
4. **Evaluation** — offline metrics, slice metrics (does it work for new users? for one country?), and a comparison against the current champion, not against zero.
5. **Registry and packaging** — the winning weights get a version, a stage (staging, production, archived) and the manifest that says how they were made.
6. **Serving** — batch, online or streaming, plus canary or shadow so a new model meets real traffic before it owns it.
7. **Monitoring** — latency and errors (ordinary ops) *plus* input drift, prediction drift and delayed outcome metrics (the ML part).
8. **The retraining loop** — monitoring's output becomes ingestion's trigger. That arrow is what makes it a *system* rather than a pipeline that ran once.
- Say the consequence out loud: **most MLOps work is plumbing and contracts, not modelling** — and interviewers are listening for exactly that admission.`,
    },
    {
      type: 'intuition',
      title: 'The maturity ladder: place any team in one question',
      md: `Ask "what happens when the model needs new weights?" The answer puts a team on a rung.

1. **Manual.** A person opens a notebook, runs cells, exports a pickle and emails it or copies it to a server. No versioning, no tests, retraining happens when someone remembers. Deployment is a human with a good memory.
2. **Scripted and tracked.** Notebooks became scripts with a config file. Every run is logged to MLflow with params, metrics and artifacts. Data is under DVC. You can now answer "which data and code produced the model in prod?" — the single biggest jump on this ladder.
3. **Automated pipeline.** One command, or a merge to main, runs ingest → validate → train → evaluate → register. CI runs data tests and model tests. Deployment is a versioned artifact promoted through registry stages, not a file someone copied.
4. **Continuous training.** Monitoring triggers the pipeline automatically — on a schedule, on a drift threshold, or on a volume of new labels. The new model must beat the champion on a recent holdout to be promoted, and rollback is a stage flip.
- Being honest about the ladder is a strong interview move: **most good teams live at level 2 or 3**, and level 4 only pays for itself when data changes fast (ads, fraud, recommendations). Automating retraining for a model that drifts once a year is expense, not maturity.
- The rung you are on also decides your incident response. At level 1, "roll back the model" is an archaeology project. At level 3, it is one command.`,
    },
    {
      type: 'note',
      md: 'Close on the framing that holds the whole subject together: **a model in a notebook has zero value, and a model in production has a decay curve.** Everything you build next is one of those two sentences made operational — MLflow and DVC exist so a result can be rebuilt, Docker and CI/CD exist so it can leave the laptop, Airflow exists so it can rebuild itself on a schedule, and monitoring plus Evidently exist because the curve is always pointing down. When an interviewer asks "why is MLOps not just DevOps", that is the answer: DevOps ships code that stays correct; MLOps ships a system that goes stale, so it has to be able to rebuild itself.',
    },
  ],
  quiz: [
    {
      question: 'What is the sharpest single difference between an ML system and ordinary software?',
      options: [
        { text: 'ML systems are written in Python, so they are harder to deploy', explanation: 'Language is incidental. Plenty of ordinary services are Python, and they do not have any of these problems.' },
        {
          text: 'Its behaviour is defined by code AND data AND model weights, so all three must be versioned',
          explanation: 'Correct. The same script on a different dataset is a different product — which is exactly why git alone cannot reproduce an ML result.',
        },
        { text: 'ML systems need more CPU', explanation: 'Sometimes true and completely orthogonal. A batch video encoder needs more CPU and still has none of these failure modes.' },
        { text: 'ML systems cannot be unit tested', explanation: 'They can — data tests, shape tests, invariance tests. What changes is that the model-quality tests are statistical thresholds rather than exact equality.' },
      ],
      correct: 1,
    },
    {
      question: 'Offline evaluation shows AUC 0.89. In production the model performs near random. Feature distributions match the training reference almost exactly. Most likely cause?',
      options: [
        { text: 'Concept drift', explanation: 'Possible in general, but concept drift would not usually appear the instant you deploy, and offline evaluation on recent data would have shown it.' },
        { text: 'Data drift', explanation: 'Ruled out by the question: the feature distributions match. Data drift is precisely a change in P(X).' },
        {
          text: 'Training-serving skew — the serving path preprocesses features differently from the training path',
          explanation: 'Correct. The offline evaluation runs the TRAINING code path, so it cannot see the bug. Distributions can look fine at a coarse level while an imputation default or a missing log-transform silently corrupts the vector.',
        },
        { text: 'The model is overfit', explanation: 'Overfitting shows up as a train/holdout gap during offline evaluation. Here offline results are good, so the gap is between offline and online, not train and test.' },
      ],
      correct: 2,
    },
    {
      question: 'Fraudsters change tactics. The same transaction features now mean something different. This is…',
      options: [
        {
          text: 'Concept drift — P(y|X) has changed',
          explanation: 'Correct. The inputs may look identical; the mapping from inputs to the correct label moved. This is the type that input monitoring can miss entirely.',
        },
        { text: 'Data drift — P(X) has changed', explanation: 'Data drift is when the inputs themselves shift. Here the question says the same features now deserve a different answer.' },
        { text: 'Label drift — P(y) has changed', explanation: 'Label drift is a change in the base rate of the target. The fraud rate might also move, but the described change is in the relationship.' },
        { text: 'Training-serving skew', explanation: 'That is a pipeline bug, not a change in the world. It exists on day one of deployment, not after fraudsters adapt.' },
      ],
      correct: 0,
    },
    {
      question: 'Why is monitoring input feature distributions the backbone of drift detection, rather than just monitoring accuracy?',
      options: [
        { text: 'Because accuracy is a bad metric', explanation: 'Accuracy has real weaknesses on imbalanced data, but that is a different argument — the issue here is timing.' },
        {
          text: 'Inputs are available immediately; labels arrive weeks later or never',
          explanation: 'Correct. A chargeback may take 60–90 days and a blocked transaction never gets a label at all, so input monitors are the only signal that fires in hours.',
        },
        { text: 'Feature distributions are cheaper to compute', explanation: 'They are cheap, but that is not why. Even if accuracy were free to compute, you still would not have the ground truth yet.' },
        { text: 'Accuracy cannot detect concept drift', explanation: 'Backwards — accuracy is the most direct evidence of concept drift. The problem is only that it arrives far too late.' },
      ],
      correct: 1,
    },
    {
      question: 'You compute PSI weekly. Which mistake silently hides the drift you are hunting?',
      options: [
        { text: 'Using deciles instead of twenty bins', explanation: 'Bin count changes sensitivity somewhat, but ten quantile bins is the standard choice and does not hide a shift.' },
        { text: 'Clipping empty bins with a small epsilon', explanation: 'That is the fix for log(0), not a bug. Without it a single empty bin turns your PSI into infinity.' },
        {
          text: 'Recomputing the bin edges from this week\'s live data each time',
          explanation: 'Correct. Quantile bins refitted on the new data always contain roughly 10% each, so PSI stays near zero no matter how far the distribution moved. Freeze the edges at training time.',
        },
        { text: 'Comparing against the training set rather than last week', explanation: 'You want both, actually — the training reference shows total drift since the model was built, a rolling window separates a slow shift from a sudden incident.' },
      ],
      correct: 2,
    },
    {
      question: 'A KS test on 2 million production rows returns p = 3e-09 for a feature. What should you do?',
      options: [
        {
          text: 'Look at the effect size, not the p-value — at that sample size a commercially meaningless shift is still "significant"',
          explanation: 'Correct. Power grows with n, so p-values collapse toward zero for any non-zero difference. Alert on the KS statistic or PSI, thresholded by business impact.',
        },
        { text: 'Retrain immediately — p < 0.001 is conclusive', explanation: 'Conclusive that the distributions differ, yes. It says nothing about whether the difference is large enough to affect a single prediction.' },
        { text: 'Ignore all statistical tests; they do not work on production data', explanation: 'Overcorrection. The statistics are fine — it is the p-value-as-alarm-bell habit that breaks at scale.' },
        { text: 'Increase the sample size for more confidence', explanation: 'That makes it worse: bigger n means an even smaller p for the same trivial shift.' },
      ],
      correct: 0,
    },
    {
      question: 'Can you promise an ML training result is exactly reproducible?',
      options: [
        { text: 'Yes, if you set a random seed', explanation: 'Seeds fix the pseudo-random streams and are necessary, but they do not control GPU kernel selection or floating-point reduction order.' },
        { text: 'Yes, if you use a Docker container', explanation: 'The container pins the environment, which is one of five ingredients — and it still runs on non-deterministic GPU kernels.' },
        { text: 'No, reproducibility is impossible in ML', explanation: 'Too fatalistic. Pipelines reproduce their conclusions routinely; it is bitwise equality that is not guaranteed.' },
        {
          text: 'You can reproduce the conclusions, not necessarily the exact floats — GPU kernel non-determinism and float non-associativity make bitwise equality unguaranteed',
          explanation: 'Correct, and this is the answer interviewers want. Capture code, data, config, environment and seeds; then promise "the same model wins with AUC within noise", not "identical weights".',
        },
      ],
      correct: 3,
    },
    {
      question: 'A recommender is retrained monthly on click logs. Over six months the catalogue it recommends steadily shrinks. Why?',
      options: [
        { text: 'Concept drift — user taste narrowed', explanation: 'Tastes may shift, but they do not narrow in lockstep with your retraining schedule. The timing points at the pipeline, not the world.' },
        {
          text: 'A feedback loop — clicks only exist for items the model chose to show, so it retrains on evidence it created',
          explanation: 'Correct. Unshown items never accumulate positive evidence, so each retrain reinforces the previous model\'s beliefs. Fix with an exploration slice and propensity logging.',
        },
        { text: 'Label drift — the click rate changed', explanation: 'The base rate may move, but that would not systematically shrink the set of items recommended.' },
        { text: 'The model is underfitting', explanation: 'An underfit model recommends bland popular items from the start; it does not progressively collapse over retraining generations.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Why is MLOps a separate discipline? Is it not just DevOps applied to Python?',
      answer:
        'Three differences, and I would name all three. (1) An ordinary system\'s behaviour is defined by code; an ML system\'s is defined by code plus data plus model weights, so reproducibility needs all three versioned together — git alone cannot rebuild a result. (2) An ordinary system\'s tests are deterministic — assert x == 42 — while an ML system\'s quality tests are statistical thresholds on distributions, so a test can go red without anyone changing a line. (3) An ordinary system does not silently get worse while sitting still; a model does, because the world moves under it, and nothing crashes while it happens. That third point is the one that reframes everything: in backend ops silence means health, in ML ops silence means nothing, so monitoring is a required component rather than an add-on. Everything MLOps adds on top of DevOps — experiment tracking, data versioning, drift monitoring, retraining pipelines, model registries — exists to handle one of those three.',
      isCaseBased: false,
    },
    {
      question: 'How do you detect drift in production?',
      answer:
        'I build it in two layers, because the two signals arrive at very different speeds. Layer one is input monitoring, which is available immediately: for every feature I log a distribution summary per window and compare it against a reference snapshot saved with the model. Numeric features get PSI or a KS statistic, categorical features get chi-square or PSI over categories, plus the boring checks that catch most real incidents — null rate, unseen categories, cardinality, range violations and schema changes. I also monitor the prediction distribution itself, since a shift in the model\'s output histogram is an early signal that needs no labels. Layer two is outcome monitoring — accuracy, AUC, precision at k — which confirms things weeks later once ground truth exists, plus proxy metrics that arrive sooner: manual-review queue size, override rate, click-through, downstream conversion. Three details that show experience. First, freeze the reference bin edges at training time; if you refit quantile bins on live data every week, PSI stays near zero by construction and you detect nothing. Second, alert on effect size, not p-values — at a million rows a meaningless 0.02-sigma shift comes back at p < 1e-06, so thresholds should be calibrated to business impact, with the conventional PSI bands (0.1 investigate, 0.25 act) as a starting point only. Third, compare against both the frozen training reference and a rolling recent window, because that pair distinguishes slow expected drift from a broken upstream job last Tuesday. Tooling: Evidently or a similar library computing the tests, metrics into Prometheus, dashboards in Grafana, alert wired to the retraining trigger.',
      isCaseBased: false,
    },
    {
      question: 'Distinguish data drift, concept drift, label drift and training-serving skew. Which is most dangerous?',
      answer:
        'Data drift, or covariate shift, is P(X) changing: the inputs look different — a new country, a younger cohort, a replaced sensor. The model is still correct about what it learned; it is just being asked about regions it barely saw. Concept drift is P(y|X) changing: the relationship itself moved, so the same inputs now deserve a different answer — fraud tactics adapt, fashion turns, a pandemic rewrites normal. Label drift, or prior shift, is P(y) changing: the base rate moves, which invalidates thresholds and imbalance handling. Training-serving skew is not drift at all — it is a bug, a preprocessing difference between the training pipeline and the serving path, like training imputing missing age with the median while the serving code fills zero. Most dangerous depends on what you mean. Concept drift is the hardest to detect, because inputs can look completely unchanged and only delayed labels reveal it. But training-serving skew is the one I have seen destroy the most value, because it is invisible in offline metrics — the offline evaluation runs the training code path, so it reports a healthy AUC while production is halved. The structural fix for skew is one shared transformation library, or a feature store, called by both paths, plus a canary that scores identical rows through both and diffs the feature vectors rather than just the predictions.',
      isCaseBased: false,
    },
    {
      question: 'Case: a data scientist hands you a notebook with 0.94 AUC and says "just deploy this". Walk me through what you do first.',
      answer:
        'I do not deploy it, and I would explain why in terms of specific failure modes rather than process. First I try to reproduce it: restart the kernel and run all cells top to bottom. That alone usually fails, because cells ran out of order and the result depended on kernel state that no longer exists. Then I go looking for the six usual problems: hidden state, out-of-order execution, unpinned dependencies, a data path pointing at somebody\'s desktop, no random seed, and manual steps that live only in the author\'s head. Next I question the 0.94 itself. How was the split made — random on a temporal problem is leakage, and so is any feature computed over the full dataset before splitting, or an aggregate that includes the future. What is the baseline? 0.94 AUC on a 0.3% positive rate can be worse than useless in precision terms, so I want precision at the operating threshold and slice metrics, not one global number. Then the conversion: notebook to scripts with a config dataclass, seeds set everywhere, data pinned by hash under DVC, dependencies frozen into a lockfile, environment into a container, and a run manifest capturing git commit, data hash, config, environment lock and metrics. Only when I can reproduce the number from a clean checkout is there anything worth deploying — and then the deployment itself starts as a shadow or a canary, so the first real evidence is a comparison against the current champion on live traffic.',
      isCaseBased: true,
    },
    {
      question: 'What exactly must you capture to reproduce a training result, and what can you honestly promise?',
      answer:
        'Six things: the code commit, the data version (a content hash, not a filename), the full hyperparameter set including the split strategy, the environment (a lockfile plus a container image digest, because pip pins libraries and the image pins glibc and CUDA), all random seeds, and hardware details when they matter — GPU model, driver version, and the number of data-loader workers, since worker count can change batch composition. I store those as a run manifest committed alongside the artifact, or logged to MLflow, so any prediction in production traces back to a specific set. What I can promise honestly: the same conclusions, not the same floats. Floating-point addition is not associative and cuDNN selects kernels and reduction orders non-deterministically, so bitwise-identical weights are not guaranteed on GPU. You can force determinism — torch.use_deterministic_algorithms(True), a fixed cuBLAS workspace config, deterministic data-loader ordering — at a real throughput cost, and some operations have no deterministic implementation at all. So the bar I commit to is "rerunning this pipeline gives AUC 0.842 plus or minus 0.003 and selects the same model", and I make that variance visible by running the baseline a few times so nobody mistakes noise for a regression.',
      isCaseBased: false,
    },
    {
      question: 'Case: accuracy dropped from 0.91 to 0.76 over six weeks. No deployments, no errors, no alerts. Debug it.',
      answer:
        'I would work from cheapest and most likely to most expensive. Step one, rule out measurement: is accuracy really down, or did the label pipeline change, or did the traffic mix shift so I am now averaging over different segments? Slice the metric by segment, region and client version before believing the global number. Step two, look for a pipeline break rather than a model problem, because that is the most common cause: a feature that is now always null or always zero because an upstream job silently failed, a new category the encoder maps to unknown, a schema change, a unit change from cents to rupees, a timezone shift. Compare current feature statistics against the training reference — nulls, ranges, cardinality, PSI per feature — and rank by drift magnitude. Step three, separate data drift from concept drift. If input distributions moved a lot, it is covariate shift and retraining on recent data will probably fix it. If inputs look unchanged but accuracy fell, it is concept drift — the relationship moved, and I check whether the labelling process or the business rules also changed around that date. A gradual six-week slide with no step change points at drift rather than an incident; a cliff on one day points at a deployment somewhere in the upstream stack even if my service did not deploy. Step four, check for feedback effects: is the model\'s own output shaping the data it is now scored on, and is my evaluation set biased toward what the model chose to act on? Fix path: retrain on a recent window, validate the challenger against the champion on a recent holdout, ship behind a canary. Prevention is the real deliverable — input drift monitors and a null-rate alert would have paged in week two instead of a person noticing in week six.',
      isCaseBased: true,
    },
    {
      question: 'Would you retrain automatically on a drift alert? Design the trigger.',
      answer:
        'Not directly, no — a drift alert is a reason to investigate, not a reason to retrain, because the most common cause of a drift alert is a broken upstream job, and retraining on corrupted data bakes the bug into the model. My trigger has gates. Fire on one of three conditions: a schedule that matches the natural drift rate of the domain, a drift metric crossing a business-calibrated threshold, or the arrival of enough newly labelled data to be worth learning from. Then gate it: data validation must pass first (schema, null rates, ranges, row counts) so a broken feed fails loudly instead of quietly; there must be enough fresh labels for the new window to be statistically meaningful; and a cool-down prevents retraining flapping every few hours. After training, the challenger only gets promoted if it beats the current champion on a recent holdout by a margin bigger than run-to-run noise, and passes slice checks so it does not gain overall while collapsing on a subgroup. Promotion is a registry stage change, deployment is a canary at small traffic share with automatic rollback on error rate or latency, and rollback is a stage flip rather than a rebuild. The honest caveat: continuous training only pays for itself where data changes fast — ads, fraud, recommendations. For a model that drifts once a year, that machinery is cost, not maturity, and a scheduled human-in-the-loop retrain is the right answer.',
      isCaseBased: false,
    },
    {
      question: 'Explain PSI: how it is computed, what the thresholds mean, and where it misleads you.',
      answer:
        'PSI, population stability index, bins a feature — usually into deciles taken from the training distribution — computes the proportion of the reference and the current sample in each bin, and sums (actual minus expected) times log(actual over expected) across bins. It is a symmetrised KL divergence: always non-negative, zero when identical, and growing as the distributions separate. Conventional bands are under 0.1 stable, 0.1 to 0.25 investigate, above 0.25 significant shift — conventions from credit scoring, not laws, and worth recalibrating to what a point of accuracy actually costs. Where it misleads. First, if you refit the quantile bins on the live data every period, each bin contains roughly 10% by construction and PSI stays near zero however far things moved — freeze the edges at training time. Second, empty bins produce log(0), so you need an epsilon or a merge rule, and the epsilon you pick visibly changes the number when a category disappears. Third, PSI is univariate: two features can each look perfectly stable while their joint relationship inverts completely, so for real coverage you also want a multivariate check, such as training a classifier to distinguish training rows from live rows and reading its AUC. Fourth, high PSI on an unimportant feature does not matter, so weight drift by feature importance before you page anyone. And finally, PSI says the inputs moved — it says nothing about whether the model got worse, which is why it is an investigation trigger and not a verdict.',
      isCaseBased: false,
    },
    {
      question: 'Case: your fraud model blocks suspicious transactions. Six months later the team wants to retrain on production data. What is wrong with that plan?',
      answer:
        'The training data is now a feedback loop, and it is censored by the model\'s own decisions. Every transaction the model blocked never completed, so it never generated a chargeback or a clean outcome — those rows have no label, or worse, get labelled by the model\'s own belief. Retraining on what survived teaches the next model that the patterns the current model already catches barely exist, so it un-learns them and reopens the exact fraud it was blocking. Meanwhile any legitimate customers wrongly blocked never got the chance to prove otherwise, so the false-positive bias is permanent and invisible. There is also a label-lag problem stacked on top: a chargeback can take 60 to 90 days, so the last quarter of data is effectively unlabelled and will look artificially clean if you treat "no chargeback yet" as "not fraud". Fixes. Hold out a small random slice where the model does not act — an exploration or control group — so you keep an unbiased sample of what happens when you do not block. Log the model\'s score and decision on every transaction so you can reweight by propensity. Use the manual-review queue as a labelling channel for blocked cases, so blocks still generate ground truth. Exclude the unripe label window from training rather than treating it as negatives. And measure the model against that control slice, not against the traffic it already shaped.',
      isCaseBased: true,
    },
    {
      question: 'Sketch the full ML system stack, and say where teams usually break.',
      answer:
        'Data ingestion, feature engineering, training, evaluation, registry and packaging, serving, monitoring, and a retraining loop that feeds monitoring\'s output back to ingestion. The famous point from the Sculley 2015 technical-debt paper is that the box labelled "ML code" is the smallest one in the diagram — most of the system is plumbing and contracts. Where teams break, in the order I have seen it: ingestion and validation, because an upstream schema change or a silently failed job produces nulls and nobody notices; the training-serving boundary, because two implementations of the same transformation always diverge eventually — this is what feature stores exist to fix; evaluation, because the offline metric is a single global number instead of slices against the current champion; and monitoring, which is either absent or is only ordinary latency-and-errors monitoring with nothing watching input distributions or outcomes. The retraining arrow is what makes it a system rather than a pipeline that ran once, and it is also the last thing most teams build.',
      isCaseBased: false,
    },
    {
      question: 'Describe the MLOps maturity ladder and place a team on it from one question.',
      answer:
        'The question I ask is "what happens when the model needs new weights?". Level 1, manual: a person opens a notebook, runs cells, exports a pickle and copies it somewhere. No versioning, retraining when someone remembers, and rolling back is archaeology. Level 2, scripted and tracked: notebooks are scripts driven by a config file, every run is logged to MLflow with params, metrics and artifacts, and data is pinned under DVC — this is the biggest single jump, because you can finally answer "which code and which data produced the model in production?". Level 3, automated pipeline: one trigger runs ingest, validate, train, evaluate and register; CI runs data tests and model tests; deployment promotes a versioned artifact through registry stages instead of copying a file. Level 4, continuous training: monitoring itself triggers the pipeline on a schedule, a drift threshold or a volume of new labels, the challenger must beat the champion on a recent holdout to be promoted, and rollback is a stage flip. The honest framing that lands well: most good teams live at level 2 or 3, and level 4 only earns its keep where data moves fast. I would also say what I would build first for a team at level 1 — the run manifest and experiment tracking, because until a result is reproducible, automating it just reproduces the confusion faster.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'Why is MLOps not just DevOps? (three points)', back: '1) Behaviour = code + data + model, so version all three. 2) Tests are statistical thresholds, not deterministic asserts. 3) It decays while sitting still — nothing crashes, so silence means nothing.' },
    { front: 'The six notebook diseases', back: 'Cells run out of order, hidden kernel state, unpinned deps, a CSV path on someone\'s desktop, no seed, manual steps in a human\'s head. Fix: scripts + config, lockfiles, seeds, data hashed under DVC, container.' },
    { front: 'What must you capture to reproduce a run — and what can you promise?', back: 'Capture: code commit, data version (content hash), hyperparameters, environment (lockfile + image digest), seeds, and hardware when it matters. Promise: same CONCLUSIONS, not same floats — bitwise GPU reproducibility is not guaranteed (float addition is non-associative, cuDNN kernels are non-deterministic).' },
    { front: 'Data drift vs concept drift vs label drift', back: 'Data drift: P(X) changed (new inputs). Concept drift: P(y|X) changed (the relationship moved). Label drift: P(y) changed (base rate moved). Test: did my inputs change, or did the answer to the same input change?' },
    { front: 'Training-serving skew', back: 'A preprocessing difference between the training pipeline and the serving path (median imputation vs zero, a missing log-transform). Invisible offline because offline runs the training path. Fix: one shared transform library or a feature store.' },
    { front: 'Feedback loop', back: 'The model\'s outputs become tomorrow\'s training data — a recommender only logs clicks on what it showed, a fraud model never sees labels for what it blocked. Fix: random exploration slice, propensity logging, log what was shown and not clicked.' },
    { front: 'Why monitor inputs, not just accuracy?', back: 'Feature distributions arrive immediately; labels arrive in 60–90 days (chargebacks) or never (blocked transactions). Inputs + prediction distribution page in hours; accuracy confirms weeks later. Proxy metrics bridge the gap.' },
    { front: 'PSI: formula, bands, and the classic bug', back: 'Sum over bins of (actual − expected) × log(actual / expected), bins = training deciles. <0.1 stable, 0.1–0.25 investigate, >0.25 act. Bug: refitting the bin edges on live data — PSI then stays ~0 forever.' },
    { front: 'Why not alert on p-values?', back: 'Power grows with n: at 200k rows a meaningless 0.02σ shift gives p ≈ 1e-06 while the KS statistic is 0.008. Alert on effect size calibrated to business impact, and account for testing dozens of features hourly.' },
    { front: 'The MLOps maturity ladder', back: '1 manual notebooks → 2 scripted + tracked (MLflow/DVC) → 3 automated pipeline (one trigger, CI tests, registry stages) → 4 continuous training (drift/schedule triggers, champion-challenger gate). Most good teams are at 2–3.' },
  ],
  mindmapMarkdown: `- Why ML Needs Special Ops
  - ML vs ordinary software
    - Behaviour = code + DATA + MODEL
    - Tests are statistical, not deterministic
    - Decays silently while sitting still
    - Silence means nothing — go measure
  - "Works in my notebook"
    - Cells out of order, hidden kernel state
    - Unpinned deps, CSV on a desktop
    - No seed, manual steps in someone's head
    - Fix: scripts + config, lockfile, container
    - Data pinned by content hash (DVC)
  - Reproducibility
    - Code commit + data version + params
    - Environment (lockfile + image digest)
    - Seeds everywhere, hardware sometimes
    - Run manifest = the contract
    - GPU bitwise NOT guaranteed → same conclusions
  - Model decay
    - Data drift: P(X) moved
    - Concept drift: P(y|X) moved
    - Label drift: P(y) moved
    - Sudden vs gradual vs seasonal
    - Training-serving skew (a bug, invisible offline)
    - Feedback loops (model shapes its own data)
  - Detection
    - Monitor INPUTS — labels are late or never
    - Prediction distribution too
    - Nulls, unseen categories, schema
    - PSI / KS / chi-square
    - Freeze bin edges at training time
    - Alert on effect size, never p-values
    - Label lag → proxy metrics
  - The ML system stack
    - Ingest → features → train → evaluate
    - Registry → serving → monitoring
    - Retraining loop closes it
    - Model is the smallest box
  - Maturity ladder
    - 1 manual notebooks
    - 2 scripted + tracked
    - 3 automated pipeline
    - 4 continuous training
  - Closing framing
    - Notebook model = zero value
    - Production model = a decay curve`,
}

export default m
