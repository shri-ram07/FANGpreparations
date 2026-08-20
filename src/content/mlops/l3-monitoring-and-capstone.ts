import type { Module } from '../types'

const m: Module = {
  id: 'mlops-l3-monitoring-and-capstone',
  subjectId: 'mlops',
  level: 3,
  title: 'Monitoring, Drift Alerts & the Grand MLOps Capstone',
  whyItMatters:
    'A model can be catastrophically wrong while every dashboard stays green — that gap is the whole reason ML monitoring exists, and "how do you detect drift" plus "design a retraining trigger" are two of the most-asked MLOps interview questions. This module also builds the plan\'s grand practical: one end-to-end pipeline (Airflow → DVC → MLflow → Docker → GitHub Actions → k8s → Evidently + Grafana → retraining) that lets you answer fifteen interview questions with "here is how I did it" instead of "I read about it".',
  estMinutes: 70,
  sections: [
    {
      type: 'intuition',
      title: 'Two layers, and only one of them has a dashboard',
      md: `A restaurant kitchen. The stopwatch says every plate leaves in 8 minutes, zero plates dropped, oven at temperature. Nobody tasted the food.

- **Layer 1 — the ordinary service layer.** Latency (p50/p95/p99), error rate, throughput, saturation. This is exactly what you would monitor for a CRUD API. Nothing ML about it.
- **Layer 2 — the ML layer.** Input drift (the features moved), prediction drift (the output mix moved), and eventually accuracy — but only when labels arrive, which can be days, weeks, or never.
- The sentence that makes ML monitoring click: **a model returning confident nonsense at 40 ms with a 200 status code looks perfect to every infrastructure dashboard you own.**
- No exception, no timeout, no 5xx. The service is healthy. The predictions are garbage. Silence is the failure mode.
- That is why layer 2 exists as a separate discipline: layer 1 cannot see a model that got dumber, and layer 1 is the only layer most teams build.`,
    },
    {
      type: 'note',
      md: 'Two framings worth naming out loud, because interviewers use the words. **RED** is per-request and describes a *service*: Rate (requests/sec), Errors (failed fraction), Duration (latency distribution). **USE** is per-resource and describes a *machine*: Utilization, Saturation, Errors — the queue-is-growing view, applied to CPU, memory, disk, GPU. Google\'s **four golden signals** are the same idea: latency, traffic, errors, saturation. All three cover layer 1 completely and layer 2 not at all.',
    },
    {
      type: 'intuition',
      title: 'Prometheus pulls. That single design choice explains everything.',
      md: `Most tools push metrics somewhere. Prometheus does the opposite: your service exposes a plain HTTP page at \`/metrics\` and Prometheus **comes and reads it** every 15 seconds.

- The page is text: one metric name, optional labels, one number per line. You can \`curl\` it. Debugging is reading a web page.
- Because Prometheus scrapes, *it* holds the target list — so "is the service up?" is free (\`up == 0\` if a scrape failed) and a service that never gets scraped costs nothing.
- The catch that surprises people: **your process only has to hold current values, not history.** A counter that resets to 0 on restart is fine; Prometheus detects the reset.
- The other catch: pull needs reachability. Short-lived batch jobs (an Airflow task that runs for 90 seconds) are never up when the scrape comes — those push to a **Pushgateway** instead.
- Grafana never touches your service. It queries Prometheus and draws. Dashboards and alerts live there; the numbers live in Prometheus.`,
    },
    {
      type: 'intuition',
      title: 'The four metric types, and which one to reach for',
      md: `Pick wrong here and your dashboard lies to you for a year.

- **Counter** — only ever goes up (or resets to zero on restart). Requests served, predictions made, errors, tokens billed. You almost never read a counter directly; you read \`rate()\` of it.
- **Gauge** — goes up *and* down. Queue depth, in-flight requests, GPU memory, model version currently live, and **rolling feature statistics** (mean transaction amount right now).
- **Histogram** — pre-defined buckets, counted server-side. Latency, payload size, prediction confidence. You choose the buckets at code-write time and compute any quantile later in PromQL.
- **Summary** — quantiles computed *inside your process*. Cheaper to query, but **you cannot average quantiles across replicas** — the p95 of ten pods is not the mean of ten p95s. In a fleet, choose histogram.
- Rule of thumb: **counter for "how many", gauge for "how much right now", histogram for "how long / how big".** Summary only for a single-instance job where you truly cannot pick buckets in advance.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Custom ML metrics on a FastAPI service',
      code: `from prometheus_client import Counter, Gauge, Histogram, make_asgi_app
from fastapi import FastAPI

app = FastAPI()
app.mount('/metrics', make_asgi_app())   # Prometheus PULLS from this path
VERSION = 'churn-v7'

PREDICTIONS = Counter(                   # counter: only ever goes up
    'model_predictions_total', 'Predictions served',
    ['model_version', 'predicted_class'],   # low-cardinality labels ONLY
)
LATENCY = Histogram(                     # histogram: pre-bucketed durations
    'model_inference_seconds', 'Inference latency',
    buckets=(.005, .01, .025, .05, .1, .25, .5, 1, 2.5),
)
FEATURE_MEAN = Gauge(                    # gauge: goes up AND down
    'model_feature_mean', 'Rolling mean of one input feature', ['feature'],
)
IN_FLIGHT = Gauge('model_requests_in_flight', 'Concurrent predictions')

@app.post('/v1/predict')
def predict(body: PredictIn):
    IN_FLIGHT.inc()
    try:
        with LATENCY.time():             # observes elapsed seconds into a bucket
            pred = model.predict([body.features])[0]
    finally:
        IN_FLIGHT.dec()                  # decrement even if inference raised
    PREDICTIONS.labels(VERSION, str(pred)).inc()
    FEATURE_MEAN.labels('amount').set(ewma('amount', body.amount))
    log.info('prediction', extra={'req_id': body.req_id, 'v': VERSION,
                                  'features': body.features, 'pred': pred})
    return {'pred': pred, 'model_version': VERSION}`,
      annotations: {
        5: 'make_asgi_app() mounts the standard text exposition page. Nothing is pushed anywhere — Prometheus comes to this URL on its own schedule.',
        9: 'The name ends in _total by convention for counters. Prometheus tooling and dashboards assume that suffix.',
        10: 'Every distinct label combination is a separate time series. model_version × 3 classes = 3 series: fine. Adding user_id would make millions and take Prometheus down — this is THE Prometheus outage.',
        12: 'Histogram, not Summary, because there will be many replicas and quantiles must be aggregated across them.',
        14: 'Buckets are frozen at code-write time. Pick them around your SLO — if the SLO is 250 ms you need boundaries near 0.25, or your p95 is a guess between two far-apart buckets.',
        17: 'The ML-specific metric. Ship a handful of rolling feature stats as gauges and you can SEE input drift on a Grafana panel in real time, hours before the nightly drift job runs.',
        19: 'Saturation, the fourth golden signal. In-flight climbing while latency is flat means the queue is growing — the earliest honest overload signal.',
        25: 'LATENCY.time() is a context manager; it records the elapsed seconds when the block exits, including on an exception.',
        29: 'Prediction-class counts are your prediction-drift signal, and they need no labels at all. The share of "churn" predictions moving from 11% to 34% is visible tonight; accuracy is not.',
        31: 'One structured log line per prediction is what makes drift detection possible later. Metrics are aggregates and cannot be re-analysed; these rows can.',
      },
    },
    {
      type: 'note',
      md: 'Two traps this snippet hides. **(1) Multiple workers.** `gunicorn -w 4` means four processes with four separate metric registries, and Prometheus scrapes whichever one answers — so counters look like they jump around. Fix: run `prometheus_client` in multiprocess mode (`PROMETHEUS_MULTIPROC_DIR` plus a `CollectorRegistry` with `MultiProcessCollector`), or scrape each pod individually in Kubernetes where one pod is one process. **(2) Cardinality.** A label whose values are unbounded — user id, request id, raw input text, a full URL with ids in it — creates one time series per value. Keep labels to things you would put in a dropdown: version, class, route template, status code.',
    },
    {
      type: 'code',
      lang: 'yaml',
      title: 'prometheus.yml — the scrape config',
      code: `# the PULL model, written down: who to visit, how often, where to complain
global:
  scrape_interval: 15s        # every target, every 15 seconds
  evaluation_interval: 15s    # how often alert rules are re-checked

rule_files:
  - /etc/prometheus/alerts.yml

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

scrape_configs:
  - job_name: churn-api
    metrics_path: /metrics
    static_configs:
      - targets: ['churn-api:8000']   # service DNS name inside the network
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance

  - job_name: kubernetes-pods         # in k8s you DISCOVER targets, not list them
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: 'true'`,
      annotations: {
        3: 'Your resolution floor. A 15 s interval means a 10-second spike may be invisible; a 5 s interval quadruples storage. 15 s is the sane default.',
        4: 'Alert rules are evaluated on a timer against stored data, not on the request path. An alert can fire minutes after the bad minute — that is normal and why "for:" durations matter.',
        7: 'Alert rules live in their own file, in git, reviewed like code. Alerting configured by clicking in a UI is alerting nobody can review or roll back.',
        16: 'The path your app exposes. Change it here, not in the app, if it clashes with a real route.',
        18: 'Docker-compose service name or a k8s Service — Prometheus resolves it every scrape, so replacing the container behind it just works.',
        23: 'Service discovery: Prometheus asks the Kubernetes API for pods instead of you maintaining a list. A new replica is scraped seconds after it starts.',
        27: 'The keep/regex pair means "only scrape pods annotated prometheus.io/scrape: true". Without it you scrape every pod in the cluster, including ones with no /metrics.',
      },
    },
    {
      type: 'intuition',
      title: 'Two PromQL expressions carry 90% of the work',
      md: `PromQL looks alien for about ten minutes. Then it is two patterns.

- **Per-second rate of a counter.** \`rate(model_predictions_total[5m])\` — "average predictions per second, computed over the last 5 minutes". Never graph a raw counter; it is a staircase to infinity.
- The \`[5m]\` is a **range**, and it must be several scrape intervals wide or the rate is noise. \`rate\` also handles process restarts (counter resets) for you.
- **A quantile from a histogram.** \`histogram_quantile(0.95, sum by (le) (rate(model_inference_seconds_bucket[5m])))\` — p95 latency across every replica.
- Read it inside out: rate the buckets, sum them across pods keeping only the bucket boundary label \`le\`, then interpolate the 95th percentile. **The \`sum by (le)\` is the step everyone forgets** — leave it out and you get a p95 per pod, not for the service.
- Ratios are just division: \`sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))\` is your error rate as a fraction.
- Grafana is a thin layer on top of this. A panel is a PromQL query plus a chart type; a dashboard is a JSON file you export and commit.`,
    },
    {
      type: 'note',
      md: 'Logs, metrics and traces are three tools for three different questions, and reaching for the wrong one wastes hours. **Metrics** answer "how bad, and since when?" — cheap, aggregated, keep them for a year, alert on them. **Logs** answer "what exactly happened to *this* request?" — expensive per byte, high detail, keep them for days, and for ML they are also your drift dataset. **Traces** answer "where did the 900 ms go?" — one request\'s path across services with per-hop timing, usually sampled at 1%. A drift investigation typically starts on a metric (prediction mix moved), moves to logs (which inputs), and only touches traces if latency is the symptom.',
    },
    {
      type: 'intuition',
      title: 'Drift detection in production: two windows and a verdict',
      md: `Drift detection in production is not a new statistical idea. It is a **scheduled comparison of two dataframes**.

- **Reference window** — a fixed sample of what the model was trained on. Freeze it *with* the model, store it next to the artifact, and never let it slide. A reference that drifts along with production can never detect drift.
- **Current window** — recent live traffic, reconstructed from those per-prediction log lines. Yesterday, or the last 24 hours.
- **Evidently** takes both and produces two things: a **Report** (an HTML page a human reads — per-column distributions, side by side) and a **TestSuite** (pass/fail assertions a machine reads).
- The report is for the incident. The test suite is for the pipeline: it returns a boolean, which is what an Airflow task needs to go red.
- What to test: **feature drift per column**, **prediction drift** (works with zero labels — this is the one that fires first), and **data quality** (nulls, new categories, out-of-range values, schema changes). Add **target drift** only when labels have actually arrived.
- The statistics underneath — PSI, KS, chi-square, and the covariate / label / concept drift taxonomy — are covered in the why-MLOps module of this subject. Here you are wiring them into a job.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The nightly drift job (Evidently 0.4.x API)',
      code: `# dags/drift_check.py — yesterday's traffic vs the frozen reference
import pandas as pd
from evidently.report import Report
from evidently.metric_preset import DataDriftPreset, DataQualityPreset
from evidently.test_suite import TestSuite
from evidently.tests import TestShareOfDriftedColumns, TestColumnDrift

REFERENCE = 's3://ml/reference/churn-v7-train-sample.parquet'

def check(ds: str) -> bool:
    ref = pd.read_parquet(REFERENCE)                  # frozen WITH the model
    cur = pd.read_parquet(f's3://ml/predictions/date={ds}/')

    report = Report(metrics=[DataDriftPreset(), DataQualityPreset()])
    report.run(reference_data=ref, current_data=cur)
    report.save_html(f'/reports/drift-{ds}.html')     # the artifact humans read

    suite = TestSuite(tests=[
        TestShareOfDriftedColumns(lt=0.3),            # under 30% of columns
        TestColumnDrift(column_name='prediction'),    # label-free, fires early
    ])
    suite.run(reference_data=ref, current_data=cur)
    return suite.as_dict()['summary']['all_passed']

def drift_task(ds: str) -> None:
    if not check(ds):
        raise AirflowException('drift detected — read the report')`,
      annotations: {
        1: 'Nightly, not per request. Drift is a property of a distribution, and a distribution needs a window: one request cannot be drifted.',
        8: 'The reference is an ARTIFACT of the model, versioned with DVC and referenced from the MLflow run. Re-sampling it from recent data every night silently disables the whole system.',
        11: 'A sample is enough — 10k to 50k rows. You are comparing distributions, not auditing every row.',
        12: 'Yesterday, partitioned by date. This is the log lines from the serving snippet, landed in object storage.',
        14: 'A preset is a bundle of sensible metrics. DataQualityPreset catches the boring killers: a column that turned 90% null, a category nobody has seen before.',
        16: 'Save the HTML somewhere permanent. During an incident this page is the evidence — it shows WHICH columns moved and by how much, which is the difference between a fix and a guess.',
        19: 'A per-column threshold plus a share threshold. One drifted column out of eighteen is Tuesday; six of eighteen is an event.',
        20: 'Prediction drift needs no ground truth, so it is available today rather than in six weeks. It is the earliest honest alarm you can build.',
        23: 'One boolean. That is the entire contract between the statistics and the orchestrator.',
        27: 'Failing the task IS the alert — Airflow already knows how to notify on failure, and the DAG run is the audit trail. Do not build a second notification system.',
      },
    },
    {
      type: 'note',
      md: 'The scheduling question, answered honestly: **a nightly job comparing yesterday to a fixed reference is the sane default.** It is cheap, it needs no streaming infrastructure, and drift that matters does not appear and vanish inside an hour. Go faster (hourly) only for high-volume services where a bad upstream deploy can poison a day of traffic before you notice; go slower (weekly) for low-traffic models where a day of data is too small a sample to be significant. Two rules regardless of cadence: the window must hold **enough rows to be statistically meaningful** (a few thousand at minimum), and drift alerts should compare against **the same weekday** when your traffic has a weekly shape — otherwise every Monday morning is an "incident".',
    },
    {
      type: 'intuition',
      title: 'Alerts people ignore are worse than no alerts',
      md: `An alarm that goes off every day gets taped over. This is not a metaphor — it is how pagers actually die.

- **Alert on symptoms users feel**, not on causes. Error rate up, latency past the SLO, prediction mix shifted hard, queue not draining. Not "CPU is 85%" — CPU at 85% with everyone happy is a well-utilized machine.
- **Thresholds come from business impact, not from statistics.** A KS test finds a "significant" difference in 100k rows that means nothing; the question is "does this change a decision anyone acts on?".
- **Every alert has a \`for:\` duration.** Firing on one bad scrape is how you get paged for a garbage-collection pause. \`for: 10m\` says "still bad ten minutes later".
- **Every alert links a runbook.** Three lines is enough: what this means, the first thing to check, who owns it. An alert without one is a 3am riddle.
- **Alert fatigue is a real failure mode with a real fix**: delete alerts nobody acted on. If the last five firings ended in "acknowledged, no action", it is not an alert, it is a dashboard panel.
- And the question nobody has an answer to: **who gets paged when the model gets dumber?** The platform team sees green infrastructure. The data scientist is not on call. So nobody is paged — which is exactly why silent model decay runs for months.`,
    },
    {
      type: 'code',
      lang: 'yaml',
      title: 'alerts.yml — three alerts worth waking up for',
      code: `groups:
  - name: churn-api
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{job="churn-api",status=~"5.."}[5m]))
          / sum(rate(http_requests_total{job="churn-api"}[5m])) > 0.02
        for: 10m
        labels:
          severity: page
        annotations:
          summary: "5xx above 2% for 10 minutes on churn-api"
          runbook: "https://wiki.internal/runbooks/churn-api-5xx"

      - alert: SlowP95
        expr: |
          histogram_quantile(0.95,
          sum by (le) (rate(model_inference_seconds_bucket[5m]))) > 0.30
        for: 15m
        labels:
          severity: page
        annotations:
          summary: "p95 inference {{ $value }}s — the SLO is 250 ms"
          runbook: "https://wiki.internal/runbooks/churn-api-latency"

      - alert: PredictionMixShift
        expr: |
          abs(
          sum(rate(model_predictions_total{predicted_class="churn"}[1h]))
          / sum(rate(model_predictions_total[1h])) - 0.11) > 0.05
        for: 30m
        labels:
          severity: ticket
        annotations:
          summary: "Predicted churn share {{ $value }} vs 0.11 baseline"
          runbook: "https://wiki.internal/runbooks/prediction-drift"`,
      annotations: {
        6: 'http_requests_total comes from a standard middleware (prometheus-fastapi-instrumentator or equivalent), not from hand-written code. Do not instrument what a library already gives you.',
        7: 'A symptom users feel, expressed as a RATIO rather than a count — 40 errors is a catastrophe at 100 req/s and a rounding error at 10 000 req/s.',
        8: 'The for: duration. The condition must hold continuously for 10 minutes before anyone is notified — this single line removes most false pages.',
        10: 'severity is just a label; Alertmanager routes on it. page wakes a human, ticket files work for tomorrow. Every alert must be honestly classified as one or the other.',
        13: 'The runbook link is not optional. Three lines — what it means, first thing to check, who owns it — is the difference between a fix and a 3am riddle.',
        18: 'sum by (le) BEFORE histogram_quantile: aggregate the buckets across pods, then interpolate. Reversing these gives you a meaningless average of per-pod p95s.',
        23: '{{ $value }} interpolates the firing number into the message, so the notification says how bad rather than just that something is bad.',
        26: 'The ML-layer alert. No labels required: it watches only the SHAPE of the output distribution.',
        30: '0.11 is the historical baseline share, and 0.05 is a business threshold — a 5-point swing in predicted churn changes what the retention team does.',
        31: 'for: 30m and severity: ticket, deliberately. Drift is rarely a wake-someone emergency, and paging on it is the fastest route to alert fatigue.',
      },
    },
    {
      type: 'intuition',
      title: 'The retraining loop — and the guardrail that stops it eating itself',
      md: `Four things can legitimately trigger a retrain. Say all four; most candidates say one.

1. **Schedule** — weekly or monthly, unconditionally. Boring, predictable, and the right default for most models.
2. **Drift threshold** — the nightly test suite failed. Cheap to detect, but it says the *inputs* changed, not that the model got worse.
3. **Performance drop** — a real metric on real labels fell below a floor. The strongest signal and usually the slowest, because labels arrive late.
4. **Data volume** — enough genuinely new data has landed that retraining is likely to help (a new market, a new product line, 30% more rows).

- The guardrail is non-negotiable: **a retrained model must beat the incumbent on a frozen evaluation set before it can be promoted.** Same data, same metric, a margin agreed in advance — a tie promotes nothing. This is the conditional-promotion step from the orchestration module, and it is the entire reason automated retraining is safe.
- Then roll it out the way the serving-patterns module describes: **shadow first** (the new model scores real traffic, nobody sees the output, you compare offline), then **canary** at 5%, then everything. Rollback is a config flip to the previous version, not a rebuild.
- And the honest warning: **automated retraining on drifting labels can train you into a feedback loop.** A fraud model that blocks a transaction never learns whether it was fraud; a recommender trained on its own clicks narrows forever. Each retrain looks fine on its own evaluation set while the whole system walks off a cliff.
- Which is why **a human in the promotion step is a legitimate design choice**, not a failure of automation. Automate everything up to "candidate ready, here are the numbers, approve?" and let a person click. The pipeline is still fully reproducible; you just kept a brain in the loop.`,
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'The closed loop: traffic → metrics → drift → alert → retrain → promote',
        notice: 'Seven steps of one real incident. Watch frame 2 especially — that is the frame where every infrastructure dashboard is still green.',
        leftLabel: 'what is happening',
        rightLabel: 'what the system holds',
        frames: [
          {
            note: 'Normal day. Traffic arrives, the service records latency and prediction counts, Prometheus scrapes every 15 s, and last night the drift job found yesterday looking like the reference. Everything green — and green is the correct answer right now.',
            stack: [
              { name: 'live traffic 400 req/s', to: 'cur' },
              { name: 'scrape /metrics', to: 'met' },
            ],
            heap: [
              { id: 'ref', value: 'reference window', label: 'mean amount 240 · churn share 0.11' },
              { id: 'cur', value: 'current window', label: 'mean amount 238 · churn share 0.11' },
              { id: 'met', value: 'p95 82 ms · 5xx 0.1%', label: 'all green' },
            ],
          },
          {
            note: 'The gap ML monitoring exists for. An upstream partner started sending amounts in a different currency, so the inputs moved by two orders of magnitude — but latency, error rate and throughput are untouched. Every infrastructure dashboard is still green while the model is being fed nonsense.',
            stack: [{ name: 'live traffic 400 req/s', to: 'cur' }],
            heap: [
              { id: 'ref', value: 'reference window', label: 'mean amount 240' },
              { id: 'cur', value: 'current window', label: 'mean amount 19 900', danger: true },
              { id: 'met', value: 'p95 84 ms · 5xx 0.1%', label: 'STILL GREEN' },
            ],
          },
          {
            note: 'The nightly Evidently job compares the two windows column by column. Six of eighteen features drifted and the predicted-churn share jumped from 11% to 34%. No ground-truth labels were needed — the inputs and the outputs alone say something broke.',
            stack: [{ name: 'drift_check DAG', to: 'rep', danger: true }],
            heap: [
              { id: 'rep', value: '6 / 18 columns drifted', label: 'churn share 0.11 -> 0.34', danger: true },
              { id: 'ref', value: 'reference window', label: 'frozen with churn-v7' },
            ],
          },
          {
            note: 'The alert fires on the symptom — prediction mix moved 23 points and stayed moved for 30 minutes — not on a p-value. It carries a runbook link and a named owner, and it is a ticket, not a page. This step is the one most teams never build, which is why a model that got dumber goes unnoticed for months.',
            stack: [{ name: 'PredictionMixShift firing', to: 'alert', danger: true }],
            heap: [
              { id: 'alert', value: 'severity: ticket', label: 'runbook + owner attached', danger: true },
              { id: 'rep', value: 'drift report HTML', label: 'the evidence' },
            ],
          },
          {
            note: 'The alert triggers the retraining DAG: pull the last 90 days, re-run the data tests, retrain, log params, metrics and the artifact to MLflow as a new run. Nothing is deployed yet. A retrained model is a candidate, not a release.',
            stack: [{ name: 'retrain_churn DAG', to: 'cand' }],
            heap: [
              { id: 'inc', value: 'churn-v7 (incumbent)', label: 'AUC 0.842 · stage Production' },
              { id: 'cand', value: 'churn-v8 (candidate)', label: 'MLflow run 3f9a…' },
            ],
          },
          {
            note: 'The guardrail. Both models are scored on the SAME frozen evaluation set, with the margin agreed in advance. A tie promotes nothing. If the challenger loses, the pipeline stops here and a human reads the drift report instead of shipping a worse model automatically.',
            stack: [{ name: 'evaluate.py: v8 vs v7', to: 'cand' }],
            heap: [
              { id: 'inc', value: 'churn-v7', label: 'AUC 0.842 on frozen set' },
              { id: 'cand', value: 'churn-v8', label: 'AUC 0.871 — clears the +0.01 gate' },
            ],
          },
          {
            note: 'Promotion, carefully: shadow first (v8 scores real traffic, nobody sees the output), then a 5% canary, then all of it. The reference window is re-frozen to match what v8 was trained on, and the loop closes — current and reference agree again, and the next divergence starts the cycle over.',
            stack: [{ name: 'live traffic 400 req/s', to: 'cur' }],
            heap: [
              { id: 'inc', value: 'churn-v8 (Production)', label: 'shadow -> canary 5% -> 100%' },
              { id: 'ref', value: 'reference RE-FROZEN', label: 'mean amount 19 850' },
              { id: 'cur', value: 'current window', label: 'mean amount 19 900 · aligned' },
            ],
          },
        ],
      },
    },
    {
      type: 'intuition',
      title: 'THE GRAND CAPSTONE — the architecture in one paragraph you can say out loud',
      md: `This is the plan's resume project. One repository, one system, and the thing you point at for the rest of your career.

- **Airflow** runs a DAG that ingests raw data on a schedule and validates it before anything downstream touches it.
- **DVC** versions the data: git holds a tiny \`.dvc\` pointer file, the actual bytes live in S3. \`git checkout\` a commit plus \`dvc pull\` reproduces the exact dataset that produced the exact model.
- **MLflow** tracks every training run — parameters, metrics, the artifact, and the git SHA — and its registry holds the stages (None → Staging → Production).
- The winning model is **containerized**: a Dockerfile that builds a FastAPI service exposing \`/v1/predict\`, \`/healthz\` and \`/metrics\`.
- **GitHub Actions** is the deploy path: on a tag, build the image, push it to a registry, and roll the Kubernetes deployment to the new tag.
- **Prometheus + Grafana** watch the service layer; **Evidently** runs nightly against the frozen reference and watches the ML layer.
- **A drift alert triggers the retraining DAG**, which retrains, evaluates against the incumbent, and promotes only if it wins. The loop closes.
- Pick a boring dataset on purpose. Churn, credit default, taxi trip duration, energy demand. **The dataset is not the project — the pipeline is the project**, and a boring dataset means nobody argues about your feature engineering instead of your infrastructure.`,
    },
    {
      type: 'code',
      lang: 'bash',
      title: 'The repo layout — every file has a job',
      code: `churn-mlops/
├── .github/workflows/
│   ├── ci.yml              # every PR: lint, unit tests, data tests, build
│   └── deploy.yml          # on tag: push image, kubectl set image, verify
├── dags/
│   ├── ingest_train.py     # ingest -> validate -> train -> evaluate -> register
│   └── drift_check.py      # nightly; a failing task IS the alert
├── data/                   # NOT in git — only .dvc pointers live here
│   └── raw.csv.dvc         # ~100 bytes: md5 + size + remote path
├── src/
│   ├── features.py         # ONE function that training and serving both import
│   ├── train.py            # mlflow.start_run(): params, metrics, model, git SHA
│   ├── evaluate.py         # candidate vs incumbent on a FROZEN test set
│   └── serve/main.py       # FastAPI: /v1/predict, /healthz, /metrics
├── monitoring/
│   ├── prometheus.yml
│   ├── alerts.yml
│   └── grafana/churn.json  # dashboard as CODE — exported and committed
├── k8s/
│   ├── deployment.yaml     # replicas, probes, resource limits, image tag
│   └── hpa.yaml            # autoscale on CPU or a custom queue-depth metric
├── terraform/
│   └── main.tf             # bucket, box and IAM role as code — plan, apply, destroy
├── tests/
│   ├── test_features.py    # unit: does the transform do what it claims
│   └── test_data.py        # schema, null rate, ranges — data tests
├── Dockerfile
├── docker-compose.yml      # local everything: api, prometheus, grafana, mlflow
├── dvc.yaml                # pipeline stages with deps and outs
├── params.yaml             # hyperparameters, versioned in git
└── README.md               # architecture diagram + one-command local run`,
      annotations: {
        3: 'CI runs on every PR and must be fast. Data tests belong here too — a schema change caught in CI costs minutes, caught in production it costs a weekend.',
        8: 'The data directory is gitignored except for the pointer files. Committing a 2 GB CSV to git is the mistake DVC exists to prevent.',
        9: 'This tiny file is what makes reproducibility real: the commit pins the pointer, the pointer pins the bytes.',
        11: 'The single most valuable file in the repo. Training and serving importing the SAME transform is how you eliminate training/serving skew — the bug class where the model is fine and the pipeline lies to it.',
        12: 'Log the git SHA as an MLflow tag. Without it, "which code produced this model?" is unanswerable six weeks later.',
        13: 'Conditional promotion lives here. This file returning False is what stops a worse model from shipping itself.',
        18: 'Export the Grafana dashboard to JSON and commit it. A dashboard that exists only in one person\'s browser is lost the day the volume is wiped.',
        23: 'The cloud resources this project rents, declared instead of clicked. It is also the cheapest safety rail you own: one `terraform destroy` returns the bill to zero when you stop working for the week.',
        26: 'Data tests, not model tests. Schema, null rate, value ranges, category set. Most production ML failures are data failures.',
        29: 'dvc.yaml turns the stages into a DAG with checksums, so `dvc repro` skips any stage whose inputs did not change.',
        31: 'The README is graded harder than the code by anyone reviewing your resume. See the checklist below.',
      },
    },
    {
      type: 'intuition',
      title: 'Build order — and why this order specifically',
      md: `Most people build the stages in isolation, polish each one, and never integrate. Then they have seven half-projects and no pipeline. **Do the opposite.**

1. **End-to-end skeleton first, with a deliberately dumb model.** \`LogisticRegression\` on three columns, or literally "predict the majority class". Get CSV → train → save → FastAPI \`/v1/predict\` → Dockerfile → \`docker run\` → curl returns a number. One day. It will be ugly.
2. **Docker-compose the supporting cast.** Add MLflow, Prometheus and Grafana as services. Now \`docker compose up\` gives you the whole system on your laptop, and every later step has somewhere to plug in.
3. **MLflow in \`train.py\`.** Log params, metrics, the model, and the git SHA. Run it three times with different hyperparameters and compare in the UI. Register the best one.
4. **DVC on the data.** \`dvc init\`, \`dvc add data/raw.csv\`, point the remote at S3 or even a local folder. Then \`dvc.yaml\` for the stages. Prove it: checkout an older commit, \`dvc pull\`, get the old data back.
5. **Airflow.** Wrap the existing scripts in a DAG. Do not rewrite them — a \`BashOperator\` or \`PythonOperator\` calling code you already have is the correct amount of work here.
6. **GitHub Actions.** \`ci.yml\` first (lint + tests on PR), then \`deploy.yml\` (build, push, deploy on tag). Watch it fail six times. That is the learning.
7. **Kubernetes.** \`kind\` or \`minikube\` locally. Deployment + Service + probes + an HPA. Cloud only after it works locally.
8. **Monitoring.** Add \`/metrics\`, build the Grafana dashboard, write the three alert rules.
9. **Evidently + the loop.** Nightly drift DAG, frozen reference, and the trigger that starts the retraining DAG with the conditional-promotion gate.
10. **Only now, improve the model.** Better features, better algorithm, tuning. Every improvement flows through infrastructure that already works.

- The reason this order wins: **at the end of day one you have a working system, and every subsequent step is an upgrade to something running.** The alternative — perfect the model, then discover the deploy path does not exist — is how these projects die at 80%.`,
    },
    {
      type: 'note',
      md: 'The five things that WILL break, and the symptom to recognise. **(1) Training/serving skew** — training uses pandas, serving uses a hand-written dict transform, and they disagree on one encoding. Symptom: offline accuracy 0.87, online predictions obviously wrong on inputs you can eyeball. Fix: one shared `features.py`, plus a test that asserts both paths give identical output on ten fixed rows. **(2) The DVC remote is not configured in CI** — `dvc pull` fails with a credentials error inside the Action while working perfectly on your laptop. Fix: repository secrets, and pull with a read-only key. **(3) Airflow eats memory or its scheduler quietly stops** — DAGs show as not running with no error anywhere. Symptom: no DAG run since Tuesday. Fix: watch the scheduler heartbeat, set task-level timeouts, and never do heavy compute inside the Airflow container. **(4) The image tag is `latest`** — Kubernetes sees no change, does not restart pods, and you "deployed" nothing. Symptom: a successful pipeline and old behaviour in production. Fix: tag with the git SHA, always. **(5) `/metrics` shows nothing under multiple workers or scrapes look erratic** — each Gunicorn worker has its own registry. Symptom: counters that jump backwards in Grafana. Fix: multiprocess mode, or one process per pod.',
    },
    {
      type: 'note',
      md: 'What goes in the README, because this is what a reviewer actually reads. **(1) One architecture diagram** — boxes and arrows, data left to right. **(2) The one-command local run**: `docker compose up`, then the exact curl that returns a prediction. If a reviewer cannot run it in five minutes they will not run it. **(3) A results table**: model, metric, date — not a screenshot. **(4) The reproducibility recipe in three lines**: `git checkout <sha>`, `dvc pull`, `dvc repro`. **(5) A short "design decisions and tradeoffs" section** — why Airflow and not Prefect, why the reference window is frozen, why promotion is gated. That paragraph is what makes a reviewer think "engineer" rather than "tutorial follower". **(6) Screenshots of the Grafana dashboard and one Evidently drift report** — they prove the monitoring is real rather than aspirational.',
    },
    {
      type: 'intuition',
      title: 'The payoff: fifteen interview questions this one project answers',
      md: `The plan calls this "the resume project" for a reason. Every one of these becomes "here is how I did it" instead of "I have read about it".

1. *How do you make an ML result reproducible?* — git SHA + DVC pointer + MLflow run + pinned image digest.
2. *How do you version data?* — DVC pointers in git, bytes in S3, and the checkout-plus-pull demo.
3. *How do you track experiments?* — MLflow params/metrics/artifacts, compared across runs in the UI.
4. *What is in your CI pipeline?* — lint, unit tests, data tests, image build, on every PR.
5. *How do you deploy?* — tag triggers Actions, image tagged with the SHA, rolling update with readiness probes.
6. *Blue-green or canary — which and why?* — shadow, then 5% canary, with the rollback being a config flip.
7. *How do you detect drift?* — frozen reference vs nightly current window, Evidently test suite, prediction drift first because it needs no labels.
8. *Design a retraining trigger.* — the four triggers, the frozen-eval gate, the human approval step.
9. *How do you roll back?* — redeploy the previous image tag; the model artifact is immutable in the registry.
10. *What do you monitor?* — RED on the service, feature and prediction distributions on the model, plus saturation.
11. *What do you alert on?* — error ratio, p95 against the SLO, prediction mix shift, each with a \`for:\` and a runbook.
12. *Docker image vs container?* — you wrote the Dockerfile and can point at the layer cache behaviour.
13. *Pod vs deployment in Kubernetes?* — you wrote the manifests and watched a rolling update.
14. *How do you test ML code?* — unit tests on transforms, data tests on schema and ranges, a skew test across both paths.
15. *What did it cost, and how would you cut it?* — replica count, node size, storage growth, scrape interval, and the retraining frequency you chose.

- Rehearse the answer shape once: **name the tool, name what it stores, name the failure it prevents.** "DVC — it stores an md5 pointer in git while the bytes sit in S3 — it prevents the case where you cannot rebuild last month's model because someone overwrote the CSV."`,
    },
    {
      type: 'intuition',
      title: 'LLMOps: what actually changes when the model is an LLM',
      md: `Most of this module still applies. Five things genuinely change.

- **Prompts are code.** They belong in git with a version string, a changelog, and an eval suite — not pasted into a Slack thread. Log the prompt version on every request, exactly like \`model_version\`. A prompt edit is a deploy, and it deserves the same canary.
- **Evaluation is a pipeline, not a number.** A golden set of inputs, expected properties rather than exact strings, and an LLM-as-judge scorer with a rubric — the metrics subject covers judge design, bias and calibration. Run it in CI on every prompt change and block the merge on a regression.
- **Cost and latency are per-request metrics.** Tokens are money: count input and output tokens separately (output is priced several times higher), attribute them by model and prompt version, and put spend on the same dashboard as latency. Also track **time to first token** separately from total latency — for a streaming UI they are different products.
- **Semantic caching**, not exact-match caching. Embed the query, look for a stored answer above a similarity threshold (0.95+), return it for zero tokens and a few milliseconds. The caveats are real: a cached answer can be **stale**, and two questions that embed similarly can mean opposite things ("can I cancel?" vs "can I not cancel?"), so keep the threshold high, key the cache on prompt version, and set a TTL.
- **Guardrails run on both sides.** Input: prompt-injection and PII detection, length caps. Output: schema validation, refusal and toxicity checks, and a check that cited sources actually exist. Every guardrail trip is a metric — a spike in refusals is an incident signal.
- **Observability means logging prompt/response pairs**, which is new: those are free text, often containing user data. So you need a **sampling** rate (1–5% is plenty for quality review), redaction before storage, a retention window, and a documented policy — plus you keep 100% of the *metadata* (tokens, latency, version, cache hit) because that part is cheap and not sensitive.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'LLM cost, latency and a semantic cache — instrumented',
      code: `from prometheus_client import Counter, Histogram

TOKENS = Counter('llm_tokens_total', 'Tokens billed',
                 ['model', 'prompt_version', 'kind'])   # kind = in | out
COST = Counter('llm_cost_usd_total', 'Spend', ['model', 'prompt_version'])
LATENCY = Histogram('llm_latency_seconds', 'End-to-end call time',
                    buckets=(.25, .5, 1, 2, 4, 8, 16))
CACHE = Counter('llm_cache_total', 'Semantic cache outcome', ['result'])

PRICES = {'model-a': (3.0 / 1e6, 15.0 / 1e6)}   # (input, output) USD per token

def answer(question: str, prompt_version: str = 'v7') -> str:
    v = embed(question)
    hit, score = cache.nearest(v)                   # cosine similarity, not ==
    if hit and score > 0.97 and hit.prompt_version == prompt_version:
        CACHE.labels('hit').inc()
        return hit.answer                           # 0 tokens, ~5 ms
    CACHE.labels('miss').inc()

    with LATENCY.time():
        resp = llm(PROMPTS[prompt_version], question)
    p_in, p_out = PRICES[resp.model]
    TOKENS.labels(resp.model, prompt_version, 'in').inc(resp.usage.input_tokens)
    TOKENS.labels(resp.model, prompt_version, 'out').inc(resp.usage.output_tokens)
    COST.labels(resp.model, prompt_version).inc(
        resp.usage.input_tokens * p_in + resp.usage.output_tokens * p_out)
    log_sample(question, resp.text, prompt_version, rate=0.01)  # 1%, redacted
    cache.put(v, resp.text, prompt_version, ttl=3600)
    return resp.text`,
      annotations: {
        4: 'Input and output tokens are separate series because they are priced differently — usually output costs several times more. One combined counter hides where the money goes.',
        5: 'Spend as a first-class metric. sum(rate(llm_cost_usd_total[1h])) * 24 * 30 is your monthly burn on a Grafana panel, live.',
        6: 'For a streaming endpoint, also record time to FIRST token separately. Total latency and perceived latency are different products.',
        8: 'Cache hit rate is a business metric here, not an engineering curiosity: every hit is a request that cost nothing.',
        10: 'Read prices from config, never hardcode them in three files. They change, and a stale constant silently makes your cost dashboard fiction.',
        14: 'The semantic part: nearest neighbour in embedding space, so "how do I cancel" hits the entry stored for "cancel my subscription". Exact-string caching would miss both.',
        15: 'A HIGH threshold on purpose. Near-identical embeddings can carry opposite meaning ("can I cancel?" vs "can I not cancel?"), and a confidently wrong cached answer is worse than a slow correct one.',
        27: 'Sample the prompt/response pairs, redact before storage, set a retention window. 1% is plenty for quality review, and 100% of free-text user data is a privacy liability you did not need.',
        28: 'The TTL is the staleness answer — cached knowledge about prices, policies or availability must expire even if the question never changes. The prompt version is part of the key, or a prompt change quietly keeps serving answers the old prompt generated.',
      },
    },
    {
      type: 'note',
      md: 'Where this sits in the plan. This is the last module of the DevOps + MLOps track, and the capstone is the thing that ties the whole study plan together: the FastAPI service comes from the backend subject, the model and its metrics from the ML and metrics subjects, the drift statistics from the why-MLOps module, the DAG and conditional promotion from the orchestration module, and the rollout strategy from the serving-patterns module. Build it once, keep the repo public, and put the architecture diagram at the top of the README. **One integrated project beats five polished notebooks in every interview loop that exists.**',
    },
  ],
  quiz: [
    {
      question: 'Your model API shows p95 of 40 ms, a 0.05% error rate, and steady throughput. The business says predictions have been wrong for three weeks. What was missing?',
      options: [
        { text: 'Better latency monitoring — 40 ms is too slow for this workload', explanation: 'Latency is not the problem; the service is fast and healthy. Speed says nothing about correctness.' },
        {
          text: 'The ML monitoring layer — input drift, prediction drift, and accuracy when labels arrive',
          explanation: 'Correct. Layer 1 (RED/USE) cannot see a model that returns confident nonsense with a 200 status. That blind spot is the entire reason ML monitoring is a separate discipline.',
        },
        { text: 'Nothing — a green dashboard means the system is working correctly', explanation: 'Green means the SERVICE is working. The model can be catastrophically wrong while every infrastructure metric stays perfect.' },
      ],
      correct: 1,
    },
    {
      question: 'You want p95 inference latency across all 6 replicas of your service. Which PromQL is right?',
      options: [
        { text: 'avg(model_inference_seconds_p95)', explanation: 'Averaging per-pod p95s is mathematically meaningless — the p95 of a fleet is not the mean of its members\' p95s. This is exactly why Summary is the wrong metric type here.' },
        { text: 'histogram_quantile(0.95, rate(model_inference_seconds_bucket[5m]))', explanation: 'Close, but without aggregation you get one p95 series per pod, not one for the service.' },
        {
          text: 'histogram_quantile(0.95, sum by (le) (rate(model_inference_seconds_bucket[5m])))',
          explanation: 'Correct. Rate the buckets, sum them across pods keeping only the le (bucket boundary) label, then interpolate. The sum by (le) is the step everyone forgets.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Which metric type for "number of predictions served, broken down by predicted class"?',
      options: [
        {
          text: 'Counter with a predicted_class label',
          explanation: 'Correct. It only ever goes up, you read it via rate(), and the class shares over time are your label-free prediction-drift signal.',
        },
        { text: 'Gauge, set to the running total', explanation: 'A gauge can go down, so tooling will not handle restarts correctly, and rate() on a gauge is meaningless. Use a gauge for values that genuinely fluctuate, like in-flight requests.' },
        { text: 'Histogram with one bucket per class', explanation: 'Histograms bucket a numeric magnitude (how long, how big). A class is a category, and categories belong in labels.' },
      ],
      correct: 0,
    },
    {
      question: 'Your nightly drift job re-computes the reference window from the last 30 days of traffic each night. What breaks?',
      options: [
        { text: 'Nothing — a recent reference is more representative', explanation: 'It is more recent, but that is not what the comparison needs. The question is "has traffic moved away from what the model was trained on?".' },
        {
          text: 'Slow drift becomes undetectable, because the reference slides along with production',
          explanation: 'Correct. If both windows move together, they always look similar. The reference must be frozen with the model and only re-frozen when a new model is promoted.',
        },
        { text: 'The job becomes too slow to finish overnight', explanation: 'Runtime is not the issue — you sample tens of thousands of rows either way. The flaw is statistical, not computational.' },
      ],
      correct: 1,
    },
    {
      question: 'Your team acknowledges the same drift alert every morning and takes no action. The best response is:',
      options: [
        { text: 'Add a second alert so it is harder to miss', explanation: 'That accelerates alert fatigue. More noise on a signal nobody acts on makes every other alert less likely to be read.' },
        { text: 'Route it to a bigger group so someone eventually acts', explanation: 'Diffusing responsibility across more people reliably means nobody owns it. Alerts need one owner, not an audience.' },
        {
          text: 'Retune or delete it — an alert nobody acts on is a dashboard panel, not an alert',
          explanation: 'Correct. Either the threshold is tied to business impact and the for: duration filters the noise, or it should not page anyone. Deleting useless alerts is what protects the useful ones.',
        },
      ],
      correct: 2,
    },
    {
      question: 'A drift alert fires and your pipeline retrains automatically. What must happen before the new model serves traffic?',
      options: [
        {
          text: 'It must beat the incumbent on a frozen evaluation set by a pre-agreed margin',
          explanation: 'Correct. Same data, same metric, margin decided in advance, and a tie promotes nothing. Without this gate, automated retraining is automated risk.',
        },
        { text: 'It must have trained on more rows than the previous model', explanation: 'More data is not more accuracy — drifted or corrupted data makes a bigger, worse model. Only a held-out comparison settles it.' },
        { text: 'Its training loss must be lower than the previous run\'s', explanation: 'Training loss across different datasets is not comparable at all, and low training loss is as likely to mean overfitting as improvement.' },
      ],
      correct: 0,
    },
    {
      question: 'Why does a semantic cache use embedding similarity instead of exact string matching, and what is the main risk?',
      options: [
        { text: 'It is faster to compare vectors than strings; the risk is memory usage', explanation: 'String equality is actually faster than a nearest-neighbour search. Speed is not the motivation, and memory is not the main hazard.' },
        {
          text: 'Paraphrases of the same question should hit the same answer; the risk is that similar embeddings can carry opposite meaning, plus staleness',
          explanation: 'Correct. "How do I cancel" and "cancel my subscription" should share an answer, but "can I cancel?" and "can I not cancel?" embed close together and mean the opposite. Hence a high threshold, a prompt-version key, and a TTL.',
        },
        { text: 'Exact matching does not work for long prompts', explanation: 'Exact matching works fine at any length — it just almost never hits, because users rarely phrase anything identically twice.' },
      ],
      correct: 1,
    },
    {
      question: 'A fraud model blocks flagged transactions. You retrain it monthly on production data. What is the specific danger?',
      options: [
        { text: 'Monthly is too infrequent for fraud patterns', explanation: 'Cadence is a tuning question and a reasonable concern, but it is not the structural flaw here.' },
        { text: 'Training data volume will grow too large to handle', explanation: 'An engineering cost, easily fixed by sampling. It has nothing to do with model correctness.' },
        {
          text: 'A feedback loop — blocked transactions never get a true label, so the model trains on data its own decisions filtered',
          explanation: 'Correct. Each retrain looks fine on its own evaluation set while the system walks off a cliff. Mitigations: hold out a small unblocked control group, keep a human in the promotion step, and monitor the shape of the decision boundary over time.',
        },
      ],
      correct: 2,
    },
  ],
  interviewQuestions: [
    {
      question: 'How do you monitor a model in production?',
      answer:
        'Two layers, and I say both. Layer one is ordinary service monitoring, the same as any API: latency at p50/p95/p99 from a histogram, error rate as a ratio not a count, throughput, and saturation (in-flight requests, queue depth, GPU memory). RED for the service, USE for the resources, or the four golden signals — same content, different packaging. Layer two is the ML layer, which no infrastructure tool gives you: input drift per feature, prediction drift (the distribution of outputs, which needs no labels and therefore fires first), data quality (nulls, unseen categories, out-of-range values), and true performance once labels land — which can be days, weeks or never. The sentence that matters: a model returning confident nonsense in 40 ms with a 200 status code looks perfect on every layer-one dashboard, so layer one alone cannot detect the failure mode that costs the most money. Concretely: Prometheus scrapes /metrics for layer one, plus custom counters for prediction class and gauges for rolling feature statistics; Evidently runs nightly for layer two; Grafana draws both and holds the alerts.',
      isCaseBased: false,
    },
    {
      question: 'How do you detect drift?',
      answer:
        'Operationally it is a scheduled comparison of two windows. A reference window — a frozen sample of the training distribution, versioned with the model and never re-sampled from recent traffic — and a current window, built from the per-prediction log lines for, typically, yesterday. Per numeric column I compare distributions with a KS test or PSI, per categorical column with chi-square or a population-stability measure, and I always include the prediction column, because prediction drift needs zero ground truth and is therefore the earliest signal available. Data quality checks run alongside: null rate, new categories, values outside the trained range, schema changes — most "drift" incidents are actually a broken upstream job. Tooling: Evidently produces both a Report, which is the HTML a human reads during an incident, and a TestSuite, which returns a boolean an Airflow task can fail on. The thresholds are the interesting part: I set them on the share of drifted columns and on the prediction distribution, tuned so a normal week does not trip them, and I compare like-for-like periods when traffic has a weekly shape. Three honest caveats: statistical significance is not business significance — with 100k rows everything is significant; input drift does not prove the model got worse, only that the world changed; and drift on an unimportant feature matters far less than drift on a top-5 feature, so I weight by feature importance when I can.',
      isCaseBased: false,
    },
    {
      question: 'Design a retraining trigger for a model in production.',
      answer:
        'I name four triggers and then the guardrail. Triggers: (1) schedule — weekly or monthly unconditionally, boring and the correct default for most models; (2) drift threshold — the nightly test suite failed, cheap and early but it only proves the inputs changed; (3) performance drop — a real metric on real labels fell below a floor, the strongest signal and usually the slowest because labels lag; (4) data volume — enough genuinely new data has arrived that retraining is likely to help. In practice I run the schedule as the baseline and let drift or a performance drop trigger an early run. The guardrail is the part that makes it safe: the retrained model is a candidate, not a release. It is evaluated against the incumbent on the same frozen evaluation set, with a margin agreed in advance, and a tie promotes nothing — that is the conditional promotion step in the orchestration DAG. Then rollout is shadow (the candidate scores real traffic, nobody sees the output, I compare offline), then a 5% canary, then full, with rollback being a config flip to the previous immutable artifact. Two things I would say unprompted. First, automated retraining on drifting labels can create a feedback loop — a fraud model that blocks a transaction never learns the truth about it, so each retrain scores well on data its own decisions filtered. Mitigations are a small unblocked control group and monitoring the decision boundary over time. Second, a human approval step before promotion is a legitimate design choice, not a failure of automation: automate everything up to "candidate ready, here are the numbers", and let a person click.',
      isCaseBased: false,
    },
    {
      question: 'Counter, gauge, histogram, summary — when do you use each, and why do people get histogram vs summary wrong?',
      answer:
        'Counter for "how many, cumulatively" — requests, predictions, errors, tokens — and you always read it through rate(), never raw. Gauge for "how much right now" — in-flight requests, queue depth, GPU memory, a rolling feature mean — because it goes up and down. Histogram for "how long or how big": you fix the buckets at code-write time, the server counts observations per bucket, and any quantile is computed later in PromQL. Summary computes quantiles inside your process. The mistake is choosing Summary because it looks simpler: quantiles cannot be aggregated. The p95 of ten pods is not the average of ten per-pod p95s, so with any replica count above one, a Summary gives you a number that is not the number you think. Histogram plus histogram_quantile(0.95, sum by (le) (rate(..._bucket[5m]))) gives a correct fleet-wide answer. The histogram cost is that buckets are frozen at write time, so choose boundaries around your SLO — if the SLO is 250 ms you need a boundary near 0.25 or your p95 is an interpolation between two far-apart edges. And whatever the type, keep labels low-cardinality: one time series per label combination means a user_id label is an outage.',
      isCaseBased: false,
    },
    {
      question: 'Case: the product team says recommendations have felt wrong for about two weeks. Every dashboard is green. Walk me through the investigation.',
      answer:
        'I take the report seriously precisely because the dashboards are green — that pattern is the signature of an ML-layer failure. Step one, establish when: plot the prediction class distribution or score histogram over 60 days and look for the elbow. A sharp step points at a deploy or an upstream change; a slow slide points at genuine drift. Step two, correlate with the timeline: model deploys, prompt or feature-pipeline changes, upstream schema changes, a new client integration. A step that lands exactly on a deploy is usually a code or feature bug, not drift. Step three, run the drift report for the suspect window against the frozen reference and read it column by column — I am looking for a feature that changed units, a categorical that gained a value, or a null rate that jumped, all of which are broken-pipeline signatures rather than a changing world. Step four, check training/serving skew directly: take ten real production inputs, run them through the training transform and through the serving transform, and diff. This finds an astonishing share of "the model got worse" reports. Step five, if inputs are clean, get labels for a recent sample — even a few hundred manually labelled rows — and measure actual performance rather than arguing about proxies. Then the fix depends on the cause: a pipeline bug gets fixed and backfilled, genuine drift triggers retraining with the promotion gate, and a concept change may need new features rather than more data. Afterwards I would add the alert that would have caught it, because the real defect here is that a human noticed before the system did.',
      isCaseBased: true,
    },
    {
      question: 'Case: your drift alert has fired every weekday at 09:00 for two weeks. Nobody acts on it any more. What do you do?',
      answer:
        'First I confirm it is a false positive rather than a real daily event: I open the drift report for a firing window and look at which columns moved and by how much. Very often the cause is a comparison artefact — the current window includes the morning batch or a scheduled bulk job whose traffic mix genuinely differs from the reference, or the window is small enough at 09:00 that the sample is noisy. The fixes in order of preference: compare like-for-like periods (a full 24 hours, or the same weekday last week, rather than a rolling hour that straddles a traffic-shape change); require a minimum sample size before the test runs at all; add or lengthen the for: duration so a transient does not fire; segment the traffic and evaluate batch and interactive separately, since they are effectively different populations; and raise the threshold from statistical significance to business significance — with 100k rows a KS test finds a difference that changes no decision. If after all that it still fires daily and the answer is still "no action", I delete it, or demote it to a Grafana panel and a weekly report. An alert nobody acts on is not monitoring, it is noise that makes every real alert less likely to be read. Finally I would look at what SHOULD have been alerting instead — usually a symptom users feel, like the prediction mix moving past a business threshold and staying there for 30 minutes.',
      isCaseBased: true,
    },
    {
      question: 'Case: you shipped fully automated retraining six months ago. It has promoted a new model every week and every promotion passed the evaluation gate — but business metrics have declined steadily. Explain.',
      answer:
        'The gate is passing because it is being graded on the wrong exam. Three explanations, and I would check them in this order. (1) The evaluation set is no longer frozen — if it is re-sampled from recent production data each run, the candidate is being tested on the same shifted distribution it was trained on, so it always wins while both drift away from reality together. Check the eval-set hash across runs; it must be identical. (2) Feedback loop: the model shapes the data it later trains on. A recommender trained on its own clicks narrows to what it already shows; a fraud model that blocks transactions never learns the truth about them. Each weekly model is optimal on its own filtered slice while the whole system degrades. Diagnosis: hold out a small randomised control slice that bypasses the model, and compare business outcomes there. (3) Metric mismatch: the gate measures AUC or accuracy, the business measures revenue per session or approval rate, and small offline gains are coming from a segment the business does not care about — or the decision threshold was tuned once and never revisited as the score distribution moved. The fix set: freeze and version the evaluation set, add a business-proxy metric to the gate, insert a human approval step before promotion, keep a randomised holdout that never sees the model, and add a "compare current production model to the model from 90 days ago on today\'s data" check — a slow decline is invisible week to week and obvious across a quarter.',
      isCaseBased: true,
    },
    {
      question: 'How do you roll out a retrained model safely, and how do you roll back?',
      answer:
        'Shadow first: the new model receives a copy of real traffic and scores it, but nobody sees the output. I compare predictions against the incumbent offline — agreement rate, score distribution, latency, error rate — and this stage has zero user risk, which makes it the right place to catch a broken feature transform. Then canary: 5% of live traffic to the new version, with the comparison now including whatever real-time signal I have. I hold it long enough to accumulate a meaningful sample, not a fixed clock time, and the promotion criteria are written down beforehand so nobody negotiates them under pressure. Then ramp. Mechanically it is an ordinary Kubernetes rolling update with a readiness probe gated on model-loaded-plus-warmed, so no traffic reaches a cold pod, and the image is tagged with the git SHA rather than latest — latest is the reason a "successful" deploy sometimes changes nothing. Rollback is redeploying the previous image tag, which works because the artifact is immutable in the registry and the previous MLflow model version still exists; it is a config flip, not a rebuild, and it should be a single command someone can run at 3am. Two details worth mentioning: every response carries model_version so logged predictions are attributable to specific weights, and I re-freeze the drift reference window when a new model is promoted, otherwise the drift detector is still comparing against the previous model\'s training distribution.',
      isCaseBased: false,
    },
    {
      question: 'Walk me through an end-to-end ML pipeline you have built.',
      answer:
        'One repo, seven stages, and the loop closes. Airflow runs a DAG that ingests raw data on a schedule and validates it — schema, null rates, ranges — before anything downstream touches it. DVC versions the data: git holds a hundred-byte pointer, the bytes live in S3, so a git checkout plus dvc pull reproduces the exact dataset. Training logs to MLflow — parameters, metrics, the artifact, and the git SHA as a tag — and the winner is registered. Evaluation compares the candidate to the current Production model on a frozen test set, and the DAG branches: promote only if it wins by the agreed margin. The promoted model is containerized as a FastAPI service exposing /v1/predict, /healthz and /metrics, and GitHub Actions builds and pushes the image on a tag, then rolls the Kubernetes deployment. Prometheus scrapes latency, error and prediction-class metrics; Grafana holds the dashboard (exported to JSON and committed) and three alert rules. A nightly Evidently job compares yesterday to the frozen reference and fails the task on drift, and that failure triggers the retraining DAG — which lands back at the evaluation gate. The two design decisions I would defend: one shared features.py imported by both training and serving, because training/serving skew is the bug class that wastes the most time; and a human approval before promotion, because fully automatic promotion on a drifting distribution is how you train yourself into a feedback loop. If I were starting again I would build it in the same order: an end-to-end skeleton with a deliberately dumb model on day one, then upgrade each stage. Building stages in isolation and integrating at the end is how these projects die at 80%.',
      isCaseBased: false,
    },
    {
      question: 'Logs, metrics and traces — when do you reach for each?',
      answer:
        'Three tools, three questions. Metrics answer "how bad, and since when?" — they are numeric aggregates, cheap enough to keep for a year at high resolution, and they are the only one of the three you should alert on, because they are bounded and comparable over time. Logs answer "what exactly happened to this specific request?" — high detail, expensive per byte, retained for days, and for ML they double as the dataset the drift job reconstructs its current window from, which is why I log one structured line per prediction with request id, model version, features and output. Traces answer "where did the 900 ms go?" — one request\'s path across services with per-hop timing, almost always sampled at 1% because full tracing is prohibitive. The practical workflow: an alert fires on a metric, I narrow the window on a dashboard, then drop to logs filtered to that window and that version to see the actual inputs, and I only pull traces if latency rather than correctness is the symptom. The failure mode to avoid is using logs as metrics — counting log lines to compute an error rate is slow, expensive and usually lossy. Emit a counter.',
      isCaseBased: false,
    },
    {
      question: 'What changes when the model in production is an LLM?',
      answer:
        'Most of the module still applies — you still need latency, error rate, saturation, versioning, canaries and rollback. Five things genuinely change. Prompts become code: they live in git with a version string and an eval suite, the prompt version is logged on every request exactly like model_version, and a prompt edit gets a canary because it is a deploy. Evaluation becomes a pipeline rather than a number: a golden set of inputs, assertions on properties rather than exact strings, and an LLM-as-judge scorer with a rubric — with the judge\'s own biases and calibration accounted for, which the metrics subject covers — run in CI on every prompt change and blocking on regression. Cost becomes a first-class metric: input and output tokens counted separately because output is priced several times higher, attributed by model and prompt version, on the same dashboard as latency; and for a streaming UI, time-to-first-token tracked separately from total latency because they are different products. Caching becomes semantic: embed the query and return a stored answer above a high similarity threshold, which is a large cost win, with the caveats that near-identical embeddings can carry opposite meaning, that answers go stale, and that the cache must be keyed on prompt version and given a TTL. And observability gets a privacy problem: the useful signal is prompt/response pairs, which are free text containing user data, so you sample a small percentage, redact before storage, set a retention window, and keep 100% of the cheap non-sensitive metadata — tokens, latency, version, cache hit, guardrail trips.',
      isCaseBased: false,
    },
    {
      question: 'Case: after a prompt change shipped on Friday, your LLM feature\'s cost per request tripled while user-visible behaviour looks fine. Find it.',
      answer:
        'The metric that answers this fastest is tokens split by kind and labelled with prompt version — that is exactly why I instrument it that way. First, split input from output: if input tokens tripled, the new prompt is longer or it pulls more retrieved context per call; if output tokens tripled, the prompt removed a length constraint or changed the format instruction and the model is now writing essays. Second, check cache hit rate. A prompt version bump invalidates a semantic cache keyed on prompt version, so the cost jump may simply be the cache re-warming — that recovers on its own, and the graph shows hit rate climbing back. If it does not recover, the new prompt may produce answers that never repeat, or the threshold is now wrong. Third, check requests per user action: a change that made the model less decisive can cause retries, tool-call loops or a fallback path firing more often, which triples cost with unchanged per-call token counts. Fourth, check whether routing changed — a heavier model selected by default is a cost tripling with no token change at all, visible immediately because cost is labelled by model. Fixes follow the cause: cap max output tokens, trim or compress retrieved context, restore a length instruction, fix the cache key or threshold, cap retries. Then I add what was missing: a cost-per-request panel next to latency, an alert on hourly spend above a budget, and the prompt-eval suite in CI reporting token counts alongside quality, so the next prompt change shows its cost before it merges rather than on Monday.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'The two layers of ML monitoring', back: 'Service layer (latency, errors, throughput, saturation — RED/USE) and ML layer (input drift, prediction drift, accuracy when labels arrive). Layer 1 stays green while the model is catastrophically wrong.' },
    { front: 'RED vs USE', back: 'RED = per request, per service: Rate, Errors, Duration. USE = per resource: Utilization, Saturation, Errors. Golden signals = latency, traffic, errors, saturation.' },
    { front: 'Prometheus in one line', back: 'Pull model: it scrapes your /metrics text page every ~15 s. Your process holds current values only; Prometheus holds history. Short-lived jobs push to a Pushgateway instead.' },
    { front: 'The four metric types', back: 'Counter (only up — read via rate). Gauge (up and down). Histogram (fixed buckets, quantiles computed in PromQL). Summary (in-process quantiles — cannot be aggregated across replicas, so avoid in a fleet).' },
    { front: 'p95 latency in PromQL', back: 'histogram_quantile(0.95, sum by (le) (rate(model_inference_seconds_bucket[5m]))). The sum by (le) is what makes it fleet-wide instead of per-pod.' },
    { front: 'Drift detection, operationally', back: 'Frozen reference window (sampled at training, versioned with the model) vs current window (yesterday\'s logged predictions). Evidently Report for humans, TestSuite for the pipeline. Prediction drift fires first because it needs no labels.' },
    { front: 'Why the reference window must be frozen', back: 'If it slides with production, both windows move together and slow drift is undetectable forever. Re-freeze it only when a new model is promoted.' },
    { front: 'Alerts people do not ignore', back: 'On symptoms users feel, thresholds from business impact not p-values, a for: duration so transients do not fire, a runbook link and one named owner. Delete any alert that ends in "acknowledged, no action".' },
    { front: 'The four retraining triggers + the guardrail', back: 'Schedule, drift threshold, performance drop, data volume. Guardrail: the candidate must beat the incumbent on a FROZEN eval set by a pre-agreed margin; a tie promotes nothing. Then shadow -> canary -> full.' },
    { front: 'LLMOps — what actually changes', back: 'Prompts are versioned code with a CI eval suite; token cost tracked as a metric (input and output priced separately); time-to-first-token separate from latency; semantic caching by embedding similarity with a high threshold, prompt-version key and TTL; guardrails on both sides; sampled + redacted prompt/response logging.' },
  ],
  mindmapMarkdown: `- Monitoring, Drift Alerts & the Grand Capstone
  - Two layers
    - Service: latency, errors, throughput, saturation (RED / USE / golden signals)
    - ML: input drift, prediction drift, accuracy when labels land
    - The gap: green dashboards, catastrophically wrong model
  - Prometheus + Grafana
    - Pull model: scrapes /metrics every 15 s; label cardinality kills it
    - Counter / Gauge / Histogram (aggregatable) / Summary (not)
    - Custom: prediction count by class, latency histogram, feature-mean gauge
    - rate(x[5m]) · histogram_quantile(0.95, sum by (le) (...)) · logs vs traces
  - Drift in production (Evidently)
    - Frozen reference vs current window
    - Report for humans, TestSuite for the pipeline
    - Feature drift, prediction drift (label-free), data quality, nightly
  - Alerting
    - Symptoms users feel; thresholds from impact; for: duration + runbook + owner
    - Alert fatigue; and nobody is paged when the model gets dumber
  - Retraining loop
    - Triggers: schedule, drift, performance drop, data volume
    - Gate: must beat incumbent on a FROZEN eval set
    - Shadow -> canary 5% -> full; feedback loops need a human
  - GRAND CAPSTONE
    - Airflow -> DVC -> MLflow -> Docker -> Actions -> k8s -> Evidently/Grafana -> retrain
    - Build order: dumb end-to-end skeleton FIRST, then upgrade stages
    - Breaks: train/serve skew, DVC creds in CI, :latest tag, multi-worker metrics
    - README + the 15 interview questions it answers
  - LLMOps
    - Prompts are code: git, versions, CI eval pipelines
    - Cost per request: input vs output tokens, time to first token
    - Semantic caching (high threshold, TTL); guardrails; sampled prompt logs`,
}

export default m
