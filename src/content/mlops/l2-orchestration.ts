import type { Module } from '../types'

const m: Module = {
  id: 'mlops-l2-orchestration',
  subjectId: 'mlops',
  level: 2,
  title: 'Orchestration with Airflow: DAGs That Train Models',
  whyItMatters:
    'A model that retrains because you remembered to run a notebook is not a system. The grand practical of this track — ingest, version, train, register, deploy, monitor, retrain — is a DAG, and "walk me through your training pipeline" is the question that separates someone who trained a model from someone who ships one. This module is also where three interview traps live: idempotency, the scheduler-vs-data-time confusion, and how you decide when to retrain at all.',
  estMinutes: 55,
  sections: [
    {
      type: 'intuition',
      title: 'Cron rings a bell. That is the entire feature.',
      md: `A cron line is an alarm clock. It goes off at 3 a.m. Whether anyone woke up is not its problem.

- Cron fires a command at a time. It has no idea that \`train.py\` must not start until \`ingest.py\` finished **cleanly**.
- No retries. The warehouse was down for 40 seconds at 03:00, so today's run is simply gone until tomorrow.
- No memory. "Did last Tuesday succeed?" — cron cannot answer. There is no run history, only a log file if you remembered to redirect one.
- No backfill. New feature, need the last 90 days rebuilt? You are writing a bash loop over dates by hand, in tmux, hoping your laptop stays awake.
- No visibility. Which step failed, on which date, with what traceback, and what did it block? SSH in and go read.
- An **orchestrator** is cron plus exactly those five things: dependencies, retries, run history, backfills, and a UI that shows you which box is red.`,
    },
    {
      type: 'note',
      md: 'The honest counterpoint, so you do not over-build: **one script, one machine, one step, no dependencies, nobody cares if it misses a night** — that is a cron line or a systemd timer, and installing Airflow for it is the mistake. You need an orchestrator when tasks depend on each other, when a failure must be retried and seen, or when you will one day have to re-run history.',
    },
    {
      type: 'intuition',
      title: 'The DAG model: nodes, edges, no cycles',
      md: `A pipeline is a recipe with a fixed order. Chop before you fry. Fry before you plate.

- **Nodes are tasks** (ingest, train, register). **Edges are dependencies** — an arrow from A to B means "B may not start until A succeeded".
- **No cycles.** If A waits on B and B waits on A, nothing can ever start. The graph must be *acyclic*, hence **DAG** — directed acyclic graph.
- Here is the part worth saying in an interview: an orchestrator is **literally executing a topological order** of your DAG. That is the same topological sort from the DSA module *Graphs I: BFS, DFS, Components, Cycles & Topo Sort* — the algorithm, running as a service.
- Which also explains the error you get when you accidentally write a cycle: Airflow refuses to load the DAG, because a topological order does not exist.
- A DAG has no branches in the git sense and no loops. Need "repeat until converged"? That is inside one task, not across tasks.`,
    },
    {
      type: 'note',
      md: 'Read the traversal below as **the scheduler\'s view of your pipeline**. A task becomes runnable only when every upstream task it depends on has finished, so the frontier expands outward from the roots exactly like this. Step it and watch which nodes light up together — in a real DAG those are the tasks Airflow launches in parallel.',
    },
    { type: 'visual', component: 'GraphTraversal', props: { algorithm: 'bfs' } },
    {
      type: 'note',
      md: 'Where the analogy stops. BFS visits each node once and finishes; a scheduler runs this traversal in a **loop**, and every node carries **state and time**. A task can be `running`, `up_for_retry`, `skipped` or `failed`, and a failure does not just get skipped — it freezes everything downstream of it. Add the second axis too: the scheduler walks this graph again for **every data interval**, so during a backfill there are 90 copies of the traversal in flight at once. That is exactly why `max_active_runs` and pools exist.',
    },
    {
      type: 'intuition',
      title: 'The run for the 1st starts on the 2nd',
      md: `Your electricity meter reading for March is taken on 1 April. You cannot total March while March is still happening.

- Airflow schedules on **data intervals**, not clock alarms. A run is named after the *interval it covers*, not the moment it starts.
- So a daily DAG whose interval is **1 March 00:00 → 2 March 00:00** starts executing at **2 March 00:00**. The data for the 1st only exists once the 1st is over.
- The run's \`logical_date\` (older name: \`execution_date\`) is the **start** of that interval — 1 March. That is why \`ds\` always looks "one day behind" the wall clock. It is not a bug and it is not a timezone problem.
- The two variables you actually use: \`data_interval_start\` and \`data_interval_end\`. Write your SQL against those.
- The bug this causes weekly: someone calls \`datetime.now()\` inside a task. Re-run the 1 March run six weeks later and it pulls *today's* data into March's partition. Silent, and it corrupts history.`,
    },
    {
      type: 'note',
      md: '**Catchup and backfill are the same machine, one automatic and one deliberate.** `catchup=True` (the historical default) means: on deploy, Airflow creates every missed run from `start_date` until now, one per interval. Set `start_date` to January, deploy in August, and you have just launched ~240 training runs against a production warehouse — the classic first-day-at-a-new-job outage. Ship with **`catchup=False`**, then replay history on purpose with `airflow dags backfill -s ... -e ...`, and pair it with **`max_active_runs=1`** so the runs go in single file instead of all at once.',
    },
    {
      type: 'intuition',
      title: 'Idempotency is the non-negotiable one',
      md: `Every task in your pipeline **will** run twice. Not "might" — will. A retry, a manual clear, a backfill, an operator who pressed the button again.

- **Idempotent** means: running it again lands you in the same end state, not with a second copy of the work.
- The rule that gets you there: **write to a location keyed by the interval, and overwrite it.** \`s3://lake/raw/dt=2026-03-01/\` belongs to the 1 March run and to nothing else.
- Never append blindly. Use \`DELETE WHERE dt = :ds\` then insert, or an \`UPSERT\`/\`MERGE\` on a natural key, or build a whole partition and swap it in atomically.
- Never read \`now()\`. Read \`data_interval_start\`. The output must depend only on the interval, never on when you happened to run.
- Test it in one line: **run the task twice and diff the output.** If the row count doubled, it is not idempotent, and your first retry will quietly corrupt production.`,
    },
    {
      type: 'intuition',
      title: 'The Airflow pieces, in the order you meet them',
      md: `- **The DAG file is Python**, living in \`dags/\`. It does not *run* your pipeline — it *declares* it. The scheduler imports this file again and again just to see what tasks exist.
- **Operators** are task types: \`PythonOperator\` / \`@task\` (run a function), \`BashOperator\`, \`DockerOperator\`, \`KubernetesPodOperator\` (run a container as a pod — the usual choice for a heavy ML step, because it gets its own image and its own GPU request).
- **Sensors** wait for something to exist: a file lands, a partition appears, an upstream DAG finishes. Always run them with \`mode='reschedule'\`, which frees the worker slot between checks instead of holding one hostage for four hours.
- **XComs** ("cross-communication") pass small values between tasks through the metadata database. In the TaskFlow API, \`return\` pushes one and a function argument pulls it.
- **Pools** cap concurrency by resource: put every GPU task in a \`gpu\` pool with 2 slots and only two ever run, no matter how many DAG runs are alive.
- **Retries**: \`retries=3\`, \`retry_delay=timedelta(minutes=5)\`, plus \`retry_exponential_backoff=True\` so a struggling database gets 5, 10, 20 minutes instead of three quick punches.
- **SLA vs timeout** — people mix these up. \`sla=timedelta(hours=3)\` means "if this has not finished 3 hours into the run, *tell someone*". \`execution_timeout\` is the one that actually **kills** the task.`,
    },
    {
      type: 'note',
      md: 'The loudest rule in this module: **XComs are for pointers, not payloads.** Every XCom value is serialized into a row in the metadata database — the same database the scheduler hammers thousands of times a minute. `return df` on a DataFrame either fails outright (MySQL caps a single value at 64 KB) or, on Postgres, succeeds and quietly poisons the DB a little more every run. Return `s3://lake/features/dt=2026-03-01/train.parquet` and let the next task read it. Rule of thumb: **an XCom should be small enough to read out loud.**',
    },
    {
      type: 'note',
      md: 'The architecture in one breath. The **scheduler** parses DAG files, works out which task instances are runnable now, and queues them. The **executor** decides *where* they run: **LocalExecutor** = subprocesses on the scheduler box (one machine, genuinely fine well past hobby scale), **CeleryExecutor** = a pool of long-lived worker machines pulling from Redis or RabbitMQ (elastic, but you now operate a broker), **KubernetesExecutor** = one fresh pod per task (best isolation and per-task CPU/GPU requests, worst per-task startup latency). The **metadata database** (Postgres) holds every run, task state, XCom and connection — single source of truth and single point of failure, so back it up. The **webserver** is the UI: grid, graph, logs, and the button that clears a task so it reruns.',
    },
    {
      type: 'code',
      lang: 'python',
      title: 'dags/churn_training.py — ingest → validate → featurize → train → evaluate → register',
      code: `from datetime import timedelta

import pendulum
from airflow.decorators import dag, task
from airflow.operators.empty import EmptyOperator
from airflow.providers.amazon.aws.sensors.s3 import S3KeySensor

DEFAULTS = {
    'retries': 3,
    'retry_delay': timedelta(minutes=5),
    'retry_exponential_backoff': True,       # 5m, 10m, 20m - not three quick punches
    'execution_timeout': timedelta(hours=2),
}

@dag(
    dag_id='churn_training',
    schedule='0 3 * * *',                    # 03:00 UTC, daily
    start_date=pendulum.datetime(2026, 1, 1, tz='UTC'),
    catchup=False,                           # do NOT replay 8 months on first deploy
    max_active_runs=1,                       # never two trainings racing each other
    default_args=DEFAULTS,
    tags=['ml', 'training'],
)
def churn_training():

    wait = S3KeySensor(
        task_id='wait_for_raw_drop',
        bucket_key='s3://lake/dropbox/dt={{ ds }}/_SUCCESS',
        poke_interval=300,
        timeout=4 * 60 * 60,                 # give up after 4h and alert
        mode='reschedule',                   # hand the worker slot back between pokes
    )

    @task
    def ingest(ds=None) -> str:
        import pandas as pd                  # heavy import INSIDE the task body
        from lib.warehouse import conn
        df = pd.read_sql('SELECT * FROM events WHERE dt = %(dt)s',
                         conn(), params={'dt': ds})
        uri = f's3://lake/raw/dt={ds}/events.parquet'
        df.to_parquet(uri)                   # OVERWRITE one partition -> rerun-safe
        return uri                           # XCom carries a pointer, not the frame

    @task
    def validate(raw_uri: str) -> str:
        import pandas as pd
        df = pd.read_parquet(raw_uri)
        assert len(df) > 10_000, f'only {len(df)} rows - the drop looks partial'
        assert df['user_id'].notna().all(), 'null user_id in a join key'
        assert 0.01 < df['churned'].mean() < 0.40, 'label rate moved - schema change?'
        return raw_uri

    @task
    def featurize(raw_uri: str, ds=None) -> str:
        from lib.features import build
        out = f's3://lake/features/dt={ds}/train.parquet'
        build(raw_uri).to_parquet(out)
        return out

    @task(pool='gpu', retries=1, execution_timeout=timedelta(hours=6),
          sla=timedelta(hours=3))
    def train(feat_uri: str, ds=None) -> dict:
        import mlflow.sklearn
        from lib.model import fit
        mlflow.set_experiment('churn')
        with mlflow.start_run(run_name=f'churn-{ds}') as run:
            mlflow.log_param('data_uri', feat_uri)
            model = fit(feat_uri)
            mlflow.sklearn.log_model(model, artifact_path='model')
        return {'run_id': run.info.run_id,
                'model_uri': f'runs:/{run.info.run_id}/model'}

    @task
    def evaluate(trained: dict) -> dict:
        import mlflow.sklearn
        from mlflow.tracking import MlflowClient
        from lib.eval import holdout_auc
        auc = holdout_auc(mlflow.sklearn.load_model(trained['model_uri']))
        MlflowClient().log_metric(trained['run_id'], 'holdout_auc', auc)
        return {**trained, 'auc': auc}

    @task.branch
    def promote_or_skip(scored: dict) -> str:
        from mlflow.tracking import MlflowClient
        client = MlflowClient()
        try:
            champ = client.get_model_version_by_alias('churn', 'champion')
            best = client.get_run(champ.run_id).data.metrics['holdout_auc']
        except Exception:
            best = 0.0                       # first ever run: anything beats nothing
        return 'register' if scored['auc'] > best + 0.002 else 'keep_champion'

    @task
    def register(scored: dict) -> None:
        import mlflow
        from mlflow.tracking import MlflowClient
        mv = mlflow.register_model(scored['model_uri'], 'churn')
        MlflowClient().set_registered_model_alias('churn', 'champion', mv.version)

    raw = ingest()
    wait >> raw                              # the sensor gates the whole run
    scored = evaluate(train(featurize(validate(raw))))
    promote_or_skip(scored) >> [
        register(scored),
        EmptyOperator(task_id='keep_champion'),   # the honest no-op branch
    ]

churn_training()                             # calling it is what registers the DAG`,
      annotations: {
        11: 'Exponential backoff on retries. A database that is already struggling does not want three requests 5 minutes apart.',
        17: 'A cron string, but read it as a data INTERVAL: the run covering yesterday 00:00-today 00:00 executes today at 03:00.',
        19: 'The line that prevents the classic first-deploy outage: without it, a January start_date fires ~240 runs the moment you ship.',
        20: 'One run at a time. Two concurrent trainings would race on the same registry alias and the same output partitions.',
        28: 'Jinja templating: Airflow renders {{ ds }} to the run\'s logical date. The sensor for 1 March waits on 1 March\'s file, always.',
        31: 'reschedule, not poke. The task releases its worker slot between checks — otherwise one sensor squats on a slot for four hours.',
        35: 'ds is injected by Airflow: declare a parameter named after a context key and you get it. This is the ONLY clock the task is allowed to read.',
        36: 'Imports live inside the task, never at module level — the scheduler re-parses this file constantly and would pay for pandas every time.',
        41: 'Idempotency, in one line. The path is keyed by the interval and the write overwrites it, so a retry produces the same partition, not a second one.',
        42: 'A string, not a DataFrame. XComs go into the metadata database; pass the pointer and let the next task open it.',
        48: 'The gate that stops garbage from becoming a model. A failed assert fails the task loudly, before you waste six GPU hours.',
        60: 'The GPU pool caps how many of these run across ALL dag runs. Fewer retries too — a 6-hour job retried 3 times is a day of GPU burned.',
        61: 'SLA = "tell someone if this is late". It does NOT kill the task; execution_timeout on the same line is the one that does.',
        66: 'The MLflow run is named after the interval, so a re-run of 1 March is traceable to 1 March, not to the day you clicked the button.',
        82: '@task.branch returns the task_id to run. Everything on the other branch is marked skipped, not failed - that distinction matters downstream.',
        91: 'The conditional promotion. A margin (+0.002), not >, so noise in the holdout split cannot promote a model that is really just the same.',
        98: 'Promotion is one atomic alias move. Rollback is the same call pointing at the previous version — no rebuild, no redeploy.',
        108: 'The @dag decorator only builds a factory; calling it is what puts the DAG object in the module namespace for the scheduler to find.',
      },
    },
    {
      type: 'code',
      lang: 'bash',
      title: 'The Airflow 2 CLI you actually use',
      code: `# 1. Does the scheduler even SEE my DAG? Import errors are silent otherwise.
airflow dags list
airflow dags list-import-errors

# 2. How long does the file take to PARSE? The scheduler pays this over and over.
time python dags/churn_training.py     # want well under 1s; 30s here = late DAGs

# 3. Run ONE task for one logical date. No scheduler, no DB state, no upstreams.
#    This is the inner loop while writing a task.
airflow tasks test churn_training featurize 2026-08-19

# 4. Run the WHOLE dag once, locally, for one date.
airflow dags test churn_training 2026-08-19

# 5. Backfill: create real runs for a past window, deliberately.
airflow dags backfill \\
  --start-date 2026-08-01 \\
  --end-date   2026-08-10 \\
  --reset-dagruns \\
  churn_training

# 6. What actually happened
airflow dags list-runs -d churn_training
airflow tasks states-for-dag-run churn_training 2026-08-19T03:00:00+00:00

# 7. Fix a bad day: clear two tasks so they re-run for that interval
airflow tasks clear -t 'train|evaluate' -s 2026-08-19 -e 2026-08-19 -y churn_training

# 8. Stop the bleeding
airflow dags pause churn_training`,
      annotations: {
        3: 'A DAG file with a syntax error just does not appear in the UI. This command is where the traceback is hiding.',
        6: 'Parse time is a first-class metric. Every second here is paid by the scheduler for every file, every few seconds, forever.',
        10: 'tasks test ignores dependencies and writes no run state. Fast, safe, and the one command you will run a hundred times a day.',
        13: 'dags test runs the full graph in one process without a scheduler — the closest thing to "just run my pipeline".',
        16: 'Backfill is catchup under manual control. Combine with max_active_runs so 10 days do not hit the warehouse simultaneously.',
        19: '--reset-dagruns re-runs intervals that already have runs. Without it, existing runs are left alone.',
        27: 'Clearing a task resets it to "none" and the scheduler picks it up again. This is only safe because the tasks are idempotent.',
      },
    },
    {
      type: 'intuition',
      title: 'The five failures an interviewer will probe',
      md: `- **The non-idempotent task.** It appends rows; it gets retried; the day now has 2× the rows and every downstream metric is quietly wrong. Nobody notices for a month. Fix: partition-keyed overwrite, or UPSERT on a natural key.
- **Scheduler time vs data time.** Someone calls \`datetime.now()\` inside a task, or files a bug that "the 1st ran on the 2nd". Fix: use \`data_interval_start\`, and understand that an interval must *end* before it can be processed.
- **Work at parse time.** A DAG file that does \`import torch\`, reads a CSV, or calls an API at module level pays that cost on **every parse** — every few seconds, for every file. Symptom: DAGs start minutes late and scheduler CPU is pinned. Fix: imports and I/O go **inside** task functions; measure with \`time python dags/yours.py\`.
- **Unbounded parallelism.** A 90-day backfill with 16 parallel tasks, each opening a warehouse connection, takes the warehouse down for the entire company. Fix: \`max_active_runs\`, \`max_active_tasks\`, and a pool sized to what the **downstream** can survive — not to what your cluster can launch.
- **A moving \`start_date\`.** \`start_date=datetime.now()\` shifts every time the file is parsed, so the interval never closes and the DAG never runs at all. Use a fixed date. Same family: task ids built from a timestamp, which make history unreadable and clears impossible.`,
    },
    {
      type: 'intuition',
      title: 'The tool landscape, honestly',
      md: `- **Airflow** — mature, everywhere, and the thing interviewers mean when they say "orchestrator". Heavy: a scheduler, a metadata DB, a webserver, and dependency conflicts between your pipeline code and Airflow itself. Pick it because everyone already knows it.
- **Prefect** — lighter and more Pythonic. Your function *is* the task, dynamic control flow is natural, far less ceremony to start. Smaller ecosystem, and more of your ops story ends up being Prefect Cloud.
- **Dagster** — asset-centric. You declare *the table or model that should exist* rather than the task that makes it, and lineage plus freshness are first-class. Best fit when data quality and "where did this column come from" are the real problem.
- **Kubeflow Pipelines / Vertex AI Pipelines / SageMaker Pipelines** — ML-native: containers, artifact lineage and experiment tracking built in. Welded to their cloud, which is fine if you already live there.
- **GitHub Actions on a schedule** — genuinely correct for a small nightly job with no fan-out. Free, already in your repo, zero infrastructure to operate. Do not apologise for it.
- The line to say out loud: **pick by team maturity and existing infrastructure, not by novelty.** Two people on GitHub Actions ship a product; the same two running Airflow spend the quarter operating Airflow.`,
    },
    {
      type: 'intuition',
      title: 'When should the pipeline fire? Four triggers.',
      md: `"Design a retraining trigger" is a listed interview theme for this track. It is a design question, and the answer is a *combination*.

- **Fixed schedule** — retrain nightly or weekly. Simplest, predictable cost, and the honest default when data shifts steadily. Wasteful when nothing moved; too slow when something broke on Tuesday.
- **Performance-triggered** — labels come back, you measure live AUC or precision on a rolling window, and retrain when it crosses a floor. The best signal, available only when labels arrive fast: clicks in minutes, fraud chargebacks in weeks, delivery ETAs in hours.
- **Drift-triggered** — no labels yet, so you watch the *inputs* and the *prediction distribution* instead (PSI, KS test, an Evidently report — see the monitoring module). It is a **proxy**: drift does not always mean damage, so let it open an investigation, not auto-ship a model.
- **Data-volume-triggered** — retrain once N new labelled rows exist. Natural for a cold-start product where the dataset is still doubling.
- Real systems stack them: **a weekly floor, plus a drift or performance alert that can fire early**, plus a hard rate limit (never more than once a day) so one flapping metric cannot start ten trainings.
- The part people forget: the trigger fires the *pipeline*, and the pipeline still decides. Automatic **retraining** is fine. Automatic **promotion** requires the evaluation gate — the new model ships only if it beats the current champion on held-out data.`,
    },
    {
      type: 'note',
      md: 'Where this sits in the plan: the DAG above **is** the spine of the grand practical. Ingest and validate feed the DVC-versioned dataset, train and evaluate write to MLflow, the branch drives the model registry, and the drift alarm from the monitoring module becomes a fifth way this DAG gets triggered. Build it with fake data and three tasks first — get the schedule, the retries and the idempotency right on something boring, then swap in the real training step.',
    },
  ],
  quiz: [
    {
      question: 'A daily DAG covers the interval for 1 March. When does that run actually start executing?',
      options: [
        { text: 'At 00:00 on 1 March, when the day it is named after begins', explanation: 'The interval has not happened yet at that moment — there is no data for 1 March at 1 March 00:00.' },
        {
          text: 'At 00:00 on 2 March, once the interval it covers has closed',
          explanation: 'Correct. Airflow is interval-based: a run is named after the period it covers and starts after that period ends. This is why ds always looks a day behind the wall clock.',
        },
        { text: 'Whenever the scheduler next re-parses the DAG file', explanation: 'Parsing discovers tasks; it does not decide when runs happen. Scheduling is driven by the data interval, not the parse loop.' },
      ],
      correct: 1,
    },
    {
      question: 'You inherit a cron line that runs train.py nightly. What does moving it to an orchestrator actually buy you?',
      options: [
        {
          text: 'Dependencies between tasks, retries with backoff, run history, backfills and a UI showing what failed',
          explanation: 'Correct — those five gaps are the entire reason orchestrators exist. Cron gives you a time trigger and nothing else.',
        },
        { text: 'Faster training', explanation: 'The training code is unchanged. An orchestrator schedules and supervises; it does not make your model fit faster.' },
        { text: 'Cheaper compute', explanation: 'Usually the opposite at first — you are now also running a scheduler, a metadata database and a webserver.' },
      ],
      correct: 0,
    },
    {
      question: "A task ends with df.to_sql('features', conn, if_exists='append'). It is retried after a network blip. What is the damage?",
      options: [
        { text: 'Nothing — the retry replaces the previous write', explanation: 'Nothing replaces anything: append means append. The first attempt already committed its rows before the blip.' },
        { text: 'The DAG deadlocks waiting on a lock', explanation: 'A lock is a plausible-sounding failure but not this one. The write succeeds — twice.' },
        {
          text: "That interval's rows are now in the table twice — the task is not idempotent",
          explanation: 'Correct, and this is the number one pipeline bug. Fix with a partition-keyed overwrite, a DELETE WHERE dt = :ds before insert, or an UPSERT on a natural key.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Which of these is an appropriate XCom value?',
      options: [
        { text: 'The trained model object, so the next task does not have to reload it', explanation: 'XComs are serialized into the metadata database. A model there would break the write or bloat the DB that the scheduler depends on.' },
        { text: 'The training DataFrame', explanation: 'Same problem, larger. MySQL caps a single XCom at 64 KB; Postgres will store it and slowly poison the database instead.' },
        {
          text: "An S3 URI plus an MLflow run id",
          explanation: 'Correct. XComs are pointers, not payloads — small enough to read out loud. The next task opens the URI itself.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Your DAG file does `import torch` and reads a lookup CSV at module level. What is the symptom?',
      options: [
        {
          text: 'The scheduler falls behind and every DAG starts late, because the file is re-parsed constantly',
          explanation: 'Correct. Parse cost is paid every few seconds for every DAG file. Move imports and I/O inside the task functions and check with `time python dags/yours.py`.',
        },
        { text: 'The tasks themselves run slower', explanation: 'The task still imports torch once when it runs. The damage is in the scheduler loop, not the task.' },
        { text: 'XComs start overflowing', explanation: 'Unrelated — XCom size depends on what you return from a task, not on what the module imports.' },
      ],
      correct: 0,
    },
    {
      question: 'You deploy a DAG with start_date eight months in the past and otherwise default settings. What happens?',
      options: [
        { text: 'Nothing until tomorrow, when the first scheduled run fires', explanation: 'That is what catchup=False would give you. It is not the default behaviour.' },
        { text: 'Airflow refuses to load the DAG because start_date is in the past', explanation: 'A past start_date is completely normal and required — a future one is what stops runs.' },
        {
          text: 'catchup creates roughly 240 backdated runs and they start piling on immediately',
          explanation: 'Correct, and it is a classic self-inflicted outage against a production warehouse. Ship with catchup=False and max_active_runs=1, then backfill deliberately.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Two engineers, one 10-minute nightly script, no fan-out, repo already on GitHub. Which orchestrator?',
      options: [
        { text: 'Airflow on Kubernetes, to be future-proof', explanation: 'You would spend more time operating the scheduler, metadata DB and webserver than on the pipeline. Novelty and future-proofing are not the criteria.' },
        {
          text: 'GitHub Actions on a cron schedule',
          explanation: 'Correct. One step, no dependencies, zero infrastructure to run, and it is already where the code lives. Pick by team maturity and existing infrastructure.',
        },
        { text: 'Kubeflow Pipelines', explanation: 'ML-native and powerful, but it presumes a Kubernetes cluster and a cloud commitment that a two-person team with one script does not have.' },
      ],
      correct: 1,
    },
    {
      question: 'Labels for your churn model only arrive 60 days after the prediction. Which retraining trigger fits?',
      options: [
        {
          text: 'Drift on inputs and prediction distribution, with a scheduled retrain as the floor',
          explanation: 'Correct. With a 60-day label lag, performance metrics tell you about damage two months old, so you watch the inputs as a proxy and keep a schedule underneath so you never go stale.',
        },
        { text: 'Performance-triggered on live AUC', explanation: 'The best signal when you can get it — but here the label lag means the alarm rings two months after the fire started.' },
        { text: 'Do not retrain until enough labels exist to measure properly', explanation: 'That leaves the model unmaintained for two months at a time. Waiting for perfect measurement is how models decay silently.' },
      ],
      correct: 0,
    },
  ],
  interviewQuestions: [
    {
      question: 'Why do teams run an orchestrator instead of cron? And when is cron still the right answer?',
      answer:
        'Cron gives you a time trigger and nothing else. An orchestrator adds five things you need the moment a pipeline has more than one step: dependencies (B does not start until A succeeded), retries with backoff, run history and state you can query, backfills for replaying past intervals, and visibility — a UI plus alerting that tells you which task failed on which date and what it blocked. It also gives you concurrency control (pools, max_active_runs) so a burst of work cannot take down a shared database. The honest counterpoint, which interviewers like hearing: for one script, on one machine, with no dependencies and no consequence if it misses a night, cron or a systemd timer is correct and Airflow is over-engineering. The threshold is dependencies plus the need to re-run history.',
      isCaseBased: false,
    },
    {
      question: "Explain Airflow's scheduling semantics. Why did the run for the 1st appear on the 2nd?",
      answer:
        'Airflow schedules on data intervals, not clock alarms. A DAG run is named after the interval of data it covers, and it can only start once that interval has closed — you cannot aggregate March while March is still happening. So a daily DAG for 1 March covers 1 March 00:00 to 2 March 00:00 and executes at 2 March 00:00. The run\'s logical_date (formerly execution_date) is the start of the interval, which is why ds reads one day behind the wall clock; it is not a timezone bug. In tasks I use data_interval_start and data_interval_end rather than now(), so the output depends only on the interval. The follow-up they usually ask: what if I want the run to fire at 03:00 on the 2nd instead of midnight? Then schedule = "0 3 * * *" — the cron string defines the interval boundaries, and the run still carries the previous period\'s logical date.',
      isCaseBased: false,
    },
    {
      question: 'What does idempotency mean for a pipeline task, and how do you actually achieve it?',
      answer:
        'Idempotent means running the task again leaves the system in the same end state rather than doubling the work. It is non-negotiable because re-runs are routine, not exceptional: retries, manual clears, backfills, and operator error all replay tasks. Three mechanics get you there. First, key every output by the interval and overwrite it — s3://lake/raw/dt=2026-03-01/ belongs to that run and nothing else, so writing it twice is a no-op. Second, never append blindly to a table: DELETE WHERE dt = :ds then insert inside one transaction, or UPSERT/MERGE on a natural key, or build a partition and swap it atomically. Third, never read now() — read data_interval_start, so the output is a pure function of the interval. The verification is one line: run the task twice and diff the output. If the row count doubled, it is not idempotent, and the first retry will corrupt history in a way nobody notices for a month.',
      isCaseBased: false,
    },
    {
      question: 'Case: a daily aggregate table has been showing inflated numbers on scattered days for weeks. The Airflow task looks correct. Find it.',
      answer:
        'Pattern first: scattered days, not all days, means something happened only on those days — and the thing that happens on scattered days is a retry. I would check the task instance history in the UI for the bad dates and expect try_number > 1 on exactly those runs. The cause is then almost certainly a non-idempotent write: the task inserts or appends rows, the first attempt committed some or all of them before failing on something later (a network blip, an OOM, an execution_timeout), and the retry inserted them again. Confirmation: compare row counts per dt against the source, and look for exact duplicates on the natural key. The fix is structural, not a one-off delete — make the write partition-keyed and overwriting, or DELETE WHERE dt = :ds before the insert inside a single transaction, or UPSERT. Then repair history with a backfill over the affected window now that the task is safe to replay. Two things I would add afterwards: a row-count assertion in a validate task so this fails loudly next time, and a note that the same class of bug hides anywhere a task has side effects before its final commit — so I would order the task to do all its work then commit once, rather than committing incrementally.',
      isCaseBased: true,
    },
    {
      question: 'Case: DAGs are starting 10-15 minutes late, the scheduler box has pinned CPU, and nobody changed the schedules. Diagnose.',
      answer:
        'The scheduler is spending its time parsing rather than scheduling. Airflow re-imports every file in dags/ on a loop, so anything a DAG file does at module level is paid over and over. I would measure directly: time python dags/<file>.py for each file, and check the DAG parse-time metrics or the "Last Duration" column in the UI. The usual culprits are heavy top-level imports (import torch, import pandas in a file that then does not need them until runtime), an API call or database query at module level to build the task list dynamically, or reading a CSV/config from S3 during parse. Fix: move every heavy import and all I/O inside the task functions, cache anything genuinely needed at parse time, and reduce the number of files the parser walks (a .airflowignore for non-DAG modules). Secondary causes worth naming if parse time is clean: too many DAGs for one scheduler process, a metadata database that has grown huge and is now slow on the task-instance queries (fix with a retention/cleanup job), or the executor being saturated so tasks queue rather than start — that last one shows as tasks in "queued", which is a different symptom from DAGs starting late.',
      isCaseBased: true,
    },
    {
      question: 'What are XComs for, and what should never go into one?',
      answer:
        'XComs pass small values between tasks. In the TaskFlow API a return value pushes an XCom and a function parameter pulls it, which is how the ingest task hands a URI to the featurize task. The critical detail is where they live: serialized into a row in the Airflow metadata database, the same Postgres the scheduler queries thousands of times a minute. So XComs are for pointers, not payloads — an S3 URI, an MLflow run id, a row count, a partition name. Never a DataFrame, never model weights, never a big JSON blob: on MySQL a single XCom is capped at 64 KB and the task simply fails, and on Postgres it succeeds and degrades the database that everything else depends on. The rule I use is that an XCom should be small enough to read out loud. If a task genuinely needs to hand over data, it writes the data to object storage and passes the location — which has the pleasant side effect of making the handoff inspectable and the task re-runnable. A custom XCom backend that transparently spills to S3 exists if you want the ergonomics, but the mental model stays the same.',
      isCaseBased: false,
    },
    {
      question: 'Case: design the retraining trigger for a fraud-detection model. Chargebacks confirm labels 2 to 6 weeks after the transaction.',
      answer:
        'I would layer four triggers, because no single one is sufficient. (1) A scheduled floor: retrain weekly regardless. It bounds staleness, makes cost predictable, and keeps the pipeline exercised so it does not rot. (2) Performance-triggered, on the labels I do have: fraud has partial fast feedback — manual review decisions and customer reports arrive in hours or days even though chargebacks take weeks — so I compute precision/recall on that fast-label subset on a rolling window and alert when it crosses a floor, while acknowledging the subset is biased toward what the model already flagged. (3) Drift-triggered, as the early-warning proxy: PSI or a KS test on key input features and on the score distribution, computed daily against the training reference. A drift alert does not auto-ship a model; it opens an investigation and can pull the scheduled retrain forward, because drift means the world changed, not necessarily that the model is worse. (4) Volume/event-triggered: a new merchant category or payment method going live is a known distribution change, so I would trigger explicitly on that deploy rather than waiting to detect it. On top: a rate limit (at most one retrain per day) so a flapping metric cannot start ten runs, and a cooldown after any promotion. Then the part that makes it safe — the trigger only starts the pipeline; the pipeline decides. The DAG branches on evaluation: register and promote the new model only if it beats the current champion on a held-out set by a margin, with fraud-specific care that the holdout is time-based (train on the past, test on the future) rather than random, because a random split leaks. Failing that check, the run ends at a no-op branch and alerts a human. Finally, in fraud specifically, drift may be adversarial — attackers probe and adapt — so I would monitor for step changes as well as gradual drift, and keep a fast manual retrain path for incident response.',
      isCaseBased: true,
    },
    {
      question: 'LocalExecutor, CeleryExecutor, KubernetesExecutor — how do you choose?',
      answer:
        'LocalExecutor runs tasks as subprocesses on the scheduler machine. One box, no broker, trivial to operate, and it scales further than people assume — it is the right default until you outgrow one machine. CeleryExecutor adds a pool of long-lived worker machines pulling from Redis or RabbitMQ: you get horizontal scale and queue routing (send GPU work to GPU workers), at the cost of operating a broker and workers whose environments must all match your DAG dependencies. KubernetesExecutor launches one fresh pod per task: perfect isolation, per-task CPU/memory/GPU requests, and each task can run its own image — which solves the dependency-conflict problem that makes Airflow painful for ML. The cost is pod startup latency of tens of seconds, which is nothing for a 40-minute training task and terrible for a thousand two-second tasks. So: one machine and simple deps, Local. Heterogeneous long-running work with per-task resources and images, Kubernetes. Lots of small tasks with stable deps and a team already running Celery, Celery. A common hybrid is CeleryExecutor for the light work with a KubernetesPodOperator for the heavy ML steps, which gets isolation where it matters without paying pod startup everywhere.',
      isCaseBased: false,
    },
    {
      question: 'Airflow, Prefect, Dagster, Kubeflow, or GitHub Actions? How do you pick?',
      answer:
        'By team maturity and existing infrastructure, not by novelty. Airflow is mature and ubiquitous — the biggest hiring pool, the most operators, and the thing the interviewer probably means by "orchestrator" — at the cost of real weight: scheduler, metadata DB, webserver, and dependency conflicts between your code and Airflow itself. Prefect is lighter and more Pythonic, with dynamic control flow that Airflow makes awkward, but a smaller ecosystem and a story that leans on its cloud. Dagster is asset-centric: you declare the table or model that should exist rather than the task that produces it, and lineage plus data freshness are first-class — the best fit when "which upstream change broke this column" is your actual daily pain. Kubeflow, Vertex and SageMaker Pipelines are ML-native with container steps, artifact lineage and tracking built in, and are the obvious choice if you are already committed to that cloud, less so if you value portability. GitHub Actions on a schedule is genuinely correct for a small nightly job with no fan-out: free, already in the repo, nothing to operate. The way I would answer in an interview is to invert it — name the requirement that forces the upgrade. Multi-step dependencies force you off cron; backfills and retries force you off GitHub Actions; per-task images and GPU requests push you toward Kubernetes; lineage as a first-class concern points at Dagster.',
      isCaseBased: false,
    },
    {
      question: 'Walk me through your ML training DAG. Where exactly does the decision to ship a model happen?',
      answer:
        'Six tasks: ingest, validate, featurize, train, evaluate, register, with a sensor in front that waits for the upstream data drop so the run does not start on a half-written file. Ingest reads the interval\'s rows and writes s3://lake/raw/dt={{ ds }}/ — partition-keyed and overwriting, so a retry is a no-op. Validate is the cheap gate: row-count floor, null checks on join keys, and a sanity range on the label rate, so a schema change fails in seconds rather than after six GPU hours. Featurize writes a features partition for the same interval. Train logs params, metrics and the model artifact to MLflow under a run named after the interval, runs in a gpu pool with a small retry count and a long execution_timeout, and returns only the run id and model URI as XComs. Evaluate scores the candidate on a fixed held-out set and logs the metric. Then the decision: a branch task fetches the current champion via the registry alias, reads its holdout metric, and returns register only if the candidate beats it by a margin — a margin, not a bare greater-than, so noise in the split cannot promote a model that is really the same. If it loses, the branch goes to a no-op task and the run is green but nothing ships. Register does two things: register the version in MLflow and move the champion alias, which makes promotion one atomic pointer move and rollback the same call aimed at the previous version. The property this buys is that a bad training day is boring — the pipeline runs, the model loses, nothing changes, and nobody gets paged.',
      isCaseBased: false,
    },
    {
      question: 'Case: you kicked off a 90-day backfill of the training DAG at 09:00 and the data warehouse fell over. What went wrong and what do you change?',
      answer:
        'The backfill launched many intervals at once, each opening warehouse connections and running full-table scans, and the aggregate load exceeded what the warehouse could serve alongside normal traffic. Three specific mistakes. First, no concurrency limit: max_active_runs was unset or high, so dozens of runs were live simultaneously, each with parallel tasks. Second, no pool sized to the downstream: the pool should reflect what the warehouse can absorb, not what my cluster can launch — a pool of 4 for warehouse-touching tasks would have serialised it. Third, timing: I ran it during business hours against the same warehouse serving dashboards. Immediate response: pause the DAG, mark the running backfill runs failed to stop new task launches, and let in-flight queries drain rather than killing them mid-transaction. Then re-run with max_active_runs=1 (or 2), a dedicated pool, off-peak, and ideally against a read replica or a lower-priority warehouse queue. Two design changes make the next backfill boring: give the ingest task a query that reads exactly one partition rather than scanning the whole table, and keep the tasks idempotent so a partially completed backfill can be resumed by clearing instead of restarted from scratch. The transferable lesson is that backfill is the same machinery as catchup — which is also why catchup=False on deploy matters: the first ship of a DAG with an old start_date does this to you automatically, without anyone typing a command.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'Orchestrator vs cron, in one line', back: 'Cron is a time trigger. An orchestrator adds dependencies, retries with backoff, run history, backfills and visibility — that gap IS the product.' },
    { front: 'Why "DAG"?', back: 'Tasks are nodes, dependencies are edges, and cycles are forbidden — because the scheduler runs a topological order of the graph, and a cycle has none.' },
    { front: 'When does the run for 1 March start?', back: 'At 2 March 00:00. Airflow is interval-based: a run is named after the interval it covers and can only start once that interval has closed. logical_date = interval START.' },
    { front: 'catchup vs backfill', back: 'Same machinery. catchup=True auto-creates every missed run from start_date on deploy (the classic outage). Backfill is the same thing under manual control. Ship catchup=False + max_active_runs=1.' },
    { front: 'The idempotency rule', back: 'Write to a location keyed by the interval and overwrite it. Never append blindly, never read now(). Test: run it twice and diff — if rows doubled, it is broken.' },
    { front: 'XComs: the one-sentence rule', back: 'Pointers, not payloads. They are rows in the metadata database — pass an S3 URI or a run id, never a DataFrame. Small enough to read out loud.' },
    { front: 'SLA vs execution_timeout', back: 'sla = "tell someone this is late" (an alarm). execution_timeout = "kill it" (an axe). Retries and retry_exponential_backoff handle the transient failures underneath.' },
    { front: 'Airflow architecture in four nouns', back: 'Scheduler (parses + queues), executor (Local / Celery / Kubernetes — where tasks run), metadata database (all state, single point of failure), webserver (UI, logs, clear-and-rerun).' },
    { front: 'Why DAG files must be cheap to parse', back: 'The scheduler re-imports every file constantly. Top-level imports or I/O are paid every parse — symptom is DAGs starting minutes late. Keep imports and I/O inside tasks; check with `time python dags/x.py`.' },
    { front: 'The four retraining triggers', back: 'Schedule (floor), performance (best signal, needs fast labels), drift (proxy when labels are slow — investigate, do not auto-ship), data volume. Combine them, rate-limit them, and gate promotion on beating the champion.' },
  ],
  mindmapMarkdown: `- Orchestration with Airflow
  - Why not cron
    - Cron = time trigger, nothing else
    - Adds deps, retries, history, backfill, visibility
    - Cron still fine: 1 script, 0 deps
  - The DAG model
    - Tasks = nodes, deps = edges, no cycles
    - Scheduler runs a topological order, plus state and time
  - Scheduling semantics
    - Interval-based: run starts AFTER interval ends
    - logical_date = interval start (ds looks a day back)
    - data_interval_start, never now()
    - catchup=False, backfill on purpose, max_active_runs=1
  - Idempotency
    - A task WILL run twice
    - Partition keyed by interval, overwrite
    - UPSERT / DELETE-then-insert, never append; test by running twice
  - Airflow pieces
    - DAG file declares, does not run
    - Operators: Python / Bash / Docker / KubernetesPod
    - Sensors: wait, mode=reschedule
    - XComs: pointers not payloads
    - Pools, retries + backoff, SLA vs execution_timeout
    - Scheduler / executor / metadata DB / webserver
    - Executor: Local vs Celery vs Kubernetes
  - The training DAG
    - ingest -> validate -> featurize -> train -> evaluate
    - Branch: register only if it beats the champion
    - Promotion = one alias move; rollback too
  - Failure modes
    - Not idempotent -> duplicate rows on retry
    - Scheduler time vs data time
    - Heavy work at parse time -> late DAGs
    - Unbounded parallelism kills the warehouse
  - Tool landscape
    - Airflow mature/heavy, Prefect light, Dagster asset-centric
    - Kubeflow / Vertex / SageMaker: ML-native, cloud-coupled
    - GitHub Actions cron for genuinely small jobs
    - Pick by team maturity, not novelty
  - Retraining triggers
    - Schedule floor / performance / drift / data volume
    - Rate-limit the trigger
    - Evaluation gate before promotion`,
}

export default m
