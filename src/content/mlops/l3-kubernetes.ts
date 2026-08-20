import type { Module } from '../types'

const m: Module = {
  id: 'mlops-l3-kubernetes',
  subjectId: 'mlops',
  level: 3,
  title: 'Kubernetes Essentials: Pods, Deployments & Autoscaling',
  whyItMatters:
    '"Pod vs deployment" is a literal item on the interview theme list, and every ML platform job description says Kubernetes. But the real reason is narrower and more useful: your container from the Docker module runs on one machine that will eventually reboot. This module is how three copies of it survive that, roll out safely, find each other by name, and scale — plus the debugging loop you will be asked to perform out loud.',
  estMinutes: 60,
  sections: [
    {
      type: 'intuition',
      title: 'What Kubernetes is actually for',
      md: `A restaurant manager who never cooks. He walks the floor with one rule in his head: *three waiters must be serving at all times*. One quits mid-shift — he hires. One is on a break — he covers. You never tell him "hire a waiter". You tell him the number, forever.

- The Docker module gave you an image that runs identically anywhere. It still runs on **one machine**, and that machine reboots.
- Four things containers do not solve: surviving a dead node, scaling with load, replacing a version without dropping requests, and finding each other when IPs keep changing.
- Kubernetes is a **control loop**. You write the **desired state** to the API server. Controllers compare it against the **actual state** and act to close the gap. Then they do it again. Forever.
- So the declarative model is not a style choice — it is the whole product. You never say "start a container". You say *"three of these should exist"* and k8s makes that true after a crash, a node loss, or a bad deploy.
- Everything below is the same idea wearing different hats: an object that records desired state, and a controller that watches it.`,
    },
    {
      type: 'note',
      md: 'Concretely: `kubectl apply -f deploy.yaml` does **not** start anything. It writes an object into etcd (the cluster database) through the API server, and returns. A controller notices the new object, creates pods; the scheduler picks nodes for them; each node\'s kubelet pulls the image and starts the container. If you `kubectl delete pod X` on a pod owned by a Deployment, a replacement appears in about a second — you deleted actual state while desired state was untouched. That single experiment teaches the whole model.',
    },
    {
      type: 'intuition',
      title: 'The objects, in dependency order',
      md: `Read these bottom-up. Each one exists because the one below it was not enough.

- **Pod** — one *or more* containers that share a network namespace (same localhost, same port space) and can share volumes. The smallest thing k8s schedules. A pod is **mortal**: it gets an IP, it dies, that IP is gone. You almost never write one directly in production.
- **ReplicaSet** — a controller with one job: *keep exactly N pods matching this template alive*. Kill one, it makes another. You almost never write one directly either.
- **Deployment** — manages ReplicaSets so you get **rolling updates and rollbacks**. Change the image tag and it creates a *new* ReplicaSet, shifts pods across, and keeps the old one around so \`kubectl rollout undo\` is instant. **This is the object you actually write.**
- The interview question answers itself from that chain: **a pod is a single mortal instance; a Deployment is the declared intent that keeps replacing them.** You debug pods; you deploy Deployments.
- Sidecar note, since pods hold more than one container: a log shipper or a proxy runs *next to* your API in the same pod precisely because they share localhost.`,
    },
    {
      type: 'intuition',
      title: 'Service and Ingress: a phone number, then a receptionist',
      md: `Pod IPs change every restart. Hard-coding one is like writing a colleague's desk position on a sticky note.

- **Service** — a stable virtual IP plus a DNS name (\`sentiment-api.ml-prod.svc.cluster.local\`) that load-balances across whichever pods currently match its **label selector**. Pods churn underneath; the name does not move.
- The selector is the join key, and it matches **pod labels directly** — not the Deployment. Get it wrong and the Service exists, resolves, and routes to nothing.
- **ClusterIP** (default): reachable only inside the cluster. This is what service-to-service calls use, and what your ML API should be.
- **NodePort**: opens the same high port (30000–32767) on every node. Crude, mostly for local clusters and demos.
- **LoadBalancer**: asks the cloud provider for a real external load balancer. One per Service, and each one costs money — which is exactly why Ingress exists.
- **Ingress** — one HTTP entry point that routes by host and path (\`/predict\` → this Service, \`/mlflow\` → that one) and terminates TLS. One cloud load balancer for the whole cluster instead of one per service.`,
    },
    {
      type: 'code',
      lang: 'yaml',
      title: 'The whole thing: a Deployment + Service for an ML API',
      code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: sentiment-api
  namespace: ml-prod
spec:
  replicas: 3
  selector:
    matchLabels:
      app: sentiment-api
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: sentiment-api
    spec:
      containers:
        - name: api
          image: registry.example.com/sentiment:v3.2.1
          ports:
            - containerPort: 8000
          env:
            - name: MODEL_NAME
              valueFrom:
                configMapKeyRef:
                  name: sentiment-config
                  key: model_name
            - name: S3_SECRET_KEY
              valueFrom:
                secretKeyRef:
                  name: sentiment-secrets
                  key: s3_secret_key
          resources:
            requests:
              cpu: "500m"
              memory: "2Gi"
            limits:
              cpu: "2"
              memory: "4Gi"
          startupProbe:
            httpGet:
              path: /healthz
              port: 8000
            periodSeconds: 5
            failureThreshold: 60
          readinessProbe:
            httpGet:
              path: /healthz
              port: 8000
            periodSeconds: 5
            timeoutSeconds: 2
          livenessProbe:
            httpGet:
              path: /livez
              port: 8000
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3
---
apiVersion: v1
kind: Service
metadata:
  name: sentiment-api
  namespace: ml-prod
spec:
  type: ClusterIP
  selector:
    app: sentiment-api
  ports:
    - port: 80
      targetPort: 8000`,
      annotations: {
        7: 'The desired state, in one number. Nothing here says "start a container" — it says three should exist.',
        9: 'How the Deployment finds ITS pods. This must match the labels on line 19 or the API server rejects the object.',
        14: 'maxSurge: allowed to run 1 pod ABOVE replicas during a rollout. It is the spare capacity that pays for zero downtime.',
        15: 'maxUnavailable: 0 means never drop below 3 ready pods. Surge-then-drain. Set it to 1 instead if the cluster has no spare room.',
        23: 'Pin an immutable tag or a digest. ":latest" makes rollouts non-reproducible and rollback meaningless — you cannot roll back to a tag that moved.',
        29: 'Non-secret config injected as an env var. Change the ConfigMap and pods do NOT restart automatically — you must trigger a rollout.',
        34: 'Credentials come from a Secret, never from the image. Same injection mechanism, different object and different RBAC.',
        39: 'REQUEST = what the scheduler reserves on a node. It is the number bin-packing uses. Omit it and the scheduler assumes ~0 and overpacks the node.',
        40: 'Memory request 2Gi. Size it from real RSS, not hope — model weights, tokenizer, CUDA context and the request batch all live here.',
        42: 'LIMIT = the hard cap. Exceeding the CPU limit throttles you (slow). Exceeding the memory limit gets you OOMKilled (dead).',
        43: 'An ML container with NO memory limit is a node-killer: one runaway batch takes the whole node down with it, including everyone else\'s pods.',
        44: 'Startup probe: the "I am slow to boot" probe. While it runs, liveness and readiness are suspended entirely.',
        49: '60 failures × 5 s = a 5-minute boot budget for loading multi-GB weights. Without this, the liveness probe kills the pod at 30 s, forever.',
        50: 'Readiness: am I fit to receive traffic? Failing it removes this pod from the Service endpoints — no restart, just no traffic.',
        56: 'Liveness: am I wedged? Failing it RESTARTS the container. Point it at a different, dumber endpoint than readiness.',
        58: '/livez must not touch the model or any dependency. If it checks the database, a database blip turns into a cluster-wide restart storm.',
        63: 'YAML document separator — two objects in one file. kubectl apply -f handles the whole file.',
        70: 'ClusterIP: internal only. Your inference API almost always wants this, with an Ingress in front for anything external.',
        72: 'The Service selector matches POD labels (line 19), not the Deployment. This is the single most common "it resolves but 503s" bug.',
        75: 'port is what callers dial (:80); targetPort is the container port (:8000). Two different numbers on purpose.',
      },
    },
    {
      type: 'note',
      md: '**ConfigMap** holds non-secret configuration; **Secret** holds credentials. Both inject as env vars (above) or as mounted files, and files are better for anything large or rotatable. The honest part interviewers want to hear: **a Secret is base64-encoded, not encrypted.** `kubectl get secret x -o yaml | base64 -d` reads it back in one line. Base64 only stops shoulder-surfing and binary-unsafe YAML. To make it real you need encryption-at-rest enabled on etcd, RBAC so only the right service accounts can read it, and — for anything that matters — an external manager (AWS Secrets Manager, Vault, External Secrets Operator) with rotation. Also: `kubectl` never prints a Secret in `describe`, but it happily prints it in `get -o yaml`. **Namespace** is the isolation unit above all of this: `ml-prod` and `ml-staging` get separate names, separate RBAC and separate resource quotas, and DNS inside a namespace is just the short name.',
    },
    {
      type: 'intuition',
      title: 'Requests vs limits: the reservation and the ceiling',
      md: `Booking a table for four (request) is not the same as the restaurant's fire limit (limit). The booking is what the host uses to plan the room; the fire limit is what gets you thrown out.

- **request** = what the scheduler *reserves*. It never looks at your actual usage — only at the sum of requests already promised on each node.
- **limit** = the hard cap the kernel enforces at runtime through cgroups. Nothing to do with scheduling.
- Exceed the **CPU** limit → **throttled**. Your process is simply given less time slice. It gets slow, p99 grows, nothing crashes, and it is genuinely hard to spot without the throttling metric.
- Exceed the **memory** limit → **OOMKilled**. Memory is not compressible, so the kernel kills the container and the kubelet restarts it. Exit code 137.
- **Missing requests wreck bin-packing.** With no request the scheduler assumes roughly nothing, packs eight of your pods onto one node, and then they fight over real RAM until the node starts evicting things that had nothing to do with you.
- Rule of thumb: set request to steady-state usage, limit to the largest spike you are willing to survive. Requests too high = wasted money; requests too low = noisy-neighbour outages.`,
    },
    {
      type: 'note',
      md: 'Two ML-specific traps. First: **an ML container with no memory limit is a node-killer.** One oversized batch, one memory leak in a preprocessing loop, and the node runs out of RAM — at which point the kubelet evicts pods by QoS class and other teams\' services die alongside yours. Second: **`nproc` and `os.cpu_count()` inside the container report the NODE\'s cores, not your CPU limit.** A worker pool or a thread count sized off that number oversubscribes a 500m slice by 30×, and every request gets throttled. Read the cgroup (`/sys/fs/cgroup/cpu.max`) or set the count from an env var you control. Same trap as the Gunicorn worker sizing from the serving module.',
    },
    {
      type: 'intuition',
      title: 'Three probes, three different questions',
      md: `They are not levels of the same check. They ask genuinely different things, and mixing them up causes the classic outage below.

- **liveness** — "am I stuck? restart me." Failing it kills and restarts the container. This is the dangerous one: it is the only probe that destroys things.
- **readiness** — "should I get traffic yet?" Failing it removes the pod from the Service's endpoint list. No restart. Traffic comes back automatically when it passes again.
- **startup** — "I am slow to boot; do not judge me yet." While it is running, the other two are disabled. Its \`failureThreshold × periodSeconds\` is your boot budget.
- For an ML API this ordering is not optional: weights take 30 s to 5 minutes to load. **Startup probe with a generous budget, readiness gated on model-loaded-and-warm, liveness on a dumb endpoint that only proves the process is answering.**
- Keep readiness honest: it must return 200 only *after* the model is loaded and warmed up. A readiness probe that answers before the model is ready is a readiness probe that lies, and the Service believes it.`,
    },
    {
      type: 'note',
      md: 'The classic outage, in full: a model takes 90 seconds to load. The liveness probe is `initialDelaySeconds: 10`, `periodSeconds: 10`, `failureThreshold: 3`. At t=40 s the probe has failed three times, so the kubelet restarts the container — which starts loading the model again from zero. It never once gets to 90 s. The pod restarts forever, `RESTARTS` climbs, and the logs show a perfectly healthy service starting up over and over with no error at all. **The pod is not broken; the probe is impatient.** Fix: a `startupProbe` with `failureThreshold: 60, periodSeconds: 5` (a 5-minute budget), and a liveness `timeoutSeconds` large enough that a busy GPU worker does not miss its reply. The second version of this outage: liveness pointed at an endpoint that queries the database, so one slow database restarts every pod in the cluster simultaneously and turns a blip into an outage.',
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'A rolling update, one pod at a time — and the way it goes wrong',
        notice: 'Left = traffic the Service is currently sending. Right = pods. Watch WHEN the new pod starts receiving traffic: readiness is the gate, and the last frame shows what happens when that gate is fake.',
        leftLabel: 'Service endpoints',
        rightLabel: 'pods',
        frames: [
          {
            note: 'Steady state. Three v3 pods, all passing readiness, all listed in the Service endpoints. The Service load-balances across them by label selector; it has no idea what version they are.',
            stack: [
              { name: 'traffic slice 1', to: 'a1' },
              { name: 'traffic slice 2', to: 'a2' },
              { name: 'traffic slice 3', to: 'a3' },
            ],
            heap: [
              { id: 'a1', value: 'pod v3 #1', label: 'Ready 1/1' },
              { id: 'a2', value: 'pod v3 #2', label: 'Ready 1/1' },
              { id: 'a3', value: 'pod v3 #3', label: 'Ready 1/1' },
            ],
          },
          {
            note: 'You change the image tag to v4 and apply. A new ReplicaSet is created and — because maxSurge is 1 — exactly one extra pod starts. It is pulling a 6 GB image and loading weights. Readiness is failing, so it is NOT in the endpoint list. All traffic is still on v3.',
            stack: [
              { name: 'traffic slice 1', to: 'a1' },
              { name: 'traffic slice 2', to: 'a2' },
              { name: 'traffic slice 3', to: 'a3' },
            ],
            heap: [
              { id: 'a1', value: 'pod v3 #1', label: 'Ready 1/1' },
              { id: 'a2', value: 'pod v3 #2', label: 'Ready 1/1' },
              { id: 'a3', value: 'pod v3 #3', label: 'Ready 1/1' },
              { id: 'b1', value: 'pod v4 #1', label: '0/1 loading' },
            ],
          },
          {
            note: 'Ninety seconds later the model is loaded and warm, /healthz returns 200, readiness passes. Only NOW is the new pod added to the endpoints. The Deployment can safely start draining an old one: it is sent SIGTERM, removed from endpoints, and given terminationGracePeriodSeconds to finish in-flight requests.',
            stack: [
              { name: 'traffic slice 1', to: 'a1' },
              { name: 'traffic slice 2', to: 'a2' },
              { name: 'traffic slice 3', to: 'b1' },
            ],
            heap: [
              { id: 'a1', value: 'pod v3 #1', label: 'Ready 1/1' },
              { id: 'a2', value: 'pod v3 #2', label: 'Ready 1/1' },
              { id: 'b1', value: 'pod v4 #1', label: 'Ready 1/1' },
              { id: 'a3', value: 'pod v3 #3', label: 'Terminating', moved: true },
            ],
          },
          {
            note: 'Repeat twice more: surge one, wait for readiness, drain one. Capacity never drops below 3 because maxUnavailable is 0. The old ReplicaSet is kept at zero replicas — that is what makes "kubectl rollout undo" a scale-up rather than a rebuild.',
            stack: [
              { name: 'traffic slice 1', to: 'b1' },
              { name: 'traffic slice 2', to: 'b2' },
              { name: 'traffic slice 3', to: 'b3' },
            ],
            heap: [
              { id: 'b1', value: 'pod v4 #1', label: 'Ready 1/1' },
              { id: 'b2', value: 'pod v4 #2', label: 'Ready 1/1' },
              { id: 'b3', value: 'pod v4 #3', label: 'Ready 1/1' },
              { id: 'rs', value: 'old ReplicaSet', label: 'scaled to 0' },
            ],
          },
          {
            note: 'The danger frame. The readiness probe hits a path that returns 200 as soon as the web server binds — before the model is loaded. The pod is marked Ready instantly, the Service adds it, and one third of production traffic hits a pod whose model is still on disk: 500s. Same failure if readiness is omitted entirely, because a pod with no readiness probe is considered Ready the moment its container starts.',
            stack: [
              { name: 'traffic slice 1', to: 'a1' },
              { name: 'traffic slice 2', to: 'a2' },
              { name: 'traffic slice 3', to: 'bad', danger: true },
            ],
            heap: [
              { id: 'a1', value: 'pod v3 #1', label: 'Ready 1/1' },
              { id: 'a2', value: 'pod v3 #2', label: 'Ready 1/1' },
              { id: 'bad', value: 'pod v4: 500 no model', label: 'Ready (lying)', danger: true },
            ],
          },
        ],
      },
    },
    {
      type: 'intuition',
      title: 'Rolling updates and the undo button',
      md: `Two knobs decide the shape of every rollout, and they trade capacity against speed.

- **maxSurge** — how many pods above \`replicas\` may exist during the rollout. Surge costs spare cluster capacity, which for a GPU pod means a whole spare GPU.
- **maxUnavailable** — how far below \`replicas\` you may drop. Set it to 0 for zero-downtime, but then you *must* have room to surge.
- \`maxSurge: 1, maxUnavailable: 0\` = safest and slowest. \`maxSurge: 0, maxUnavailable: 1\` = no extra hardware, but you serve on 2 pods for a while. Pick based on which resource you are short of.
- The rollout only advances when a new pod passes readiness — so **readiness is your rollout's safety brake**. A pod that never becomes ready stalls the rollout instead of breaking production, which is the behaviour you want.
- \`kubectl rollout status\` watches it; \`kubectl rollout undo deploy/x\` scales the previous ReplicaSet back up. That is why rollback is seconds, not a rebuild.
- Honest limit: this is a **rolling** update, not a canary. During the rollout both versions serve real traffic with no ability to route by user or percentage. Real canary and blue-green need a service mesh, two Deployments behind one Service, or an ingress that can split weights.`,
    },
    {
      type: 'code',
      lang: 'yaml',
      title: 'HPA: scale on CPU, and on the metric that actually matters',
      code: `apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: sentiment-api
  namespace: ml-prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: sentiment-api
  minReplicas: 2
  maxReplicas: 12
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Pods
      pods:
        metric:
          name: inference_queue_depth
        target:
          type: AverageValue
          averageValue: "8"
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300`,
      annotations: {
        7: 'The HPA does not create pods. It edits the Deployment\'s replicas field — desired state again, all the way down.',
        11: 'minReplicas: 2, not 0 or 1. Two keeps a warm replica alive so a spike is not served by a cold start, and survives one node dying.',
        12: 'The ceiling that stops a traffic bug or a retry storm from autoscaling your cloud bill into orbit. Always set it.',
        19: 'Percentage of the pod\'s CPU REQUEST, not its limit and not the node. If you never set a request, this metric is meaningless and the HPA will not work.',
        20: 'A custom per-pod metric, served by Prometheus through prometheus-adapter. This needs the custom metrics API installed; CPU works out of the box.',
        23: 'Queue depth is the honest ML signal. CPU is already pinned by the time users are actually suffering — the queue grows minutes earlier.',
        26: 'Scale out when the average queued request per pod passes 8. Note the quotes: k8s quantities are strings.',
        29: 'Wait 5 minutes of sustained calm before scaling DOWN. Without it a pod that took 3 minutes to load its model gets killed during a lull and rebuilt 60 seconds later.',
      },
    },
    {
      type: 'intuition',
      title: 'Autoscaling, and why it is slow for ML',
      md: `Two autoscalers, stacked, doing different jobs — say both names in the interview.

- **HPA (Horizontal Pod Autoscaler)** adds *pods*. It reads a metric (CPU utilization against the request, or a custom metric like queue depth or GPU utilization) and writes a new \`replicas\` number.
- **Cluster autoscaler** adds *nodes*. It watches for pods stuck **Pending** because nothing can fit them, and asks the cloud for another machine. Then it removes underused nodes later.
- So a spike walks through both: HPA creates a pod → no node has room → pod is Pending → cluster autoscaler boots a VM (1–3 minutes) → pod schedules.
- Now add the ML tax: pull a 6 GB image (1–4 minutes on a cold node), then load multi-GB weights and warm the CUDA context (30 s – 3 min). **Total time to first served request: often 5–10 minutes.** Your spike is over by then.
- Mitigations, in order of payoff: shrink the image (slim base, no build toolchain, weights fetched from a shared cache rather than baked in); pre-pull images onto nodes or keep the layer cache warm; **keep warm replicas** via \`minReplicas\` and scale on a leading indicator like queue depth; and use over-provisioning — low-priority placeholder pods that hold node capacity and get evicted instantly when a real pod needs it.
- Also mention **VPA** (Vertical Pod Autoscaler) in one line: it right-sizes requests/limits instead of counting pods, and it conflicts with HPA on CPU — do not run both on the same metric.`,
    },
    {
      type: 'note',
      md: 'GPUs on k8s, honestly. You install NVIDIA\'s **device plugin** (a DaemonSet), and it advertises `nvidia.com/gpu` as a schedulable resource; you then ask for it under `resources.limits` — and for extended resources like this, **request and limit must be equal**, so there is no burst and no overcommit. **By default one GPU goes to exactly one container: no fractional sharing.** MPS and time-slicing exist, and MIG partitions an A100/H100 into fixed slices, but none of that is on by default and each has real caveats. The consequence is a cost discipline, not a technical one: a GPU pod sitting idle bills the same as a busy one, so use node selectors and taints to keep CPU workloads off GPU nodes, scale GPU deployments on a real utilization or queue signal, and never leave a notebook pod holding a GPU overnight. Interviewers ask this because the wrong answer — "we just let everyone request GPUs" — is how a team burns six figures.',
    },
    {
      type: 'intuition',
      title: 'The debugging loop you will be asked to perform',
      md: `Nobody asks you to write YAML on a whiteboard. They say "the pod is not coming up — what do you type?" There is exactly one right sequence, and it starts by reading the STATUS column.

- **Pending** — never scheduled. Nothing is wrong *inside* your container because there is no container yet. Almost always resources (no node has room for your requests), sometimes a taint, a node selector, or an unbound PersistentVolumeClaim. The answer is in \`describe\`, in Events.
- **ImagePullBackOff / ErrImagePull** — k8s cannot fetch the image. Wrong tag, wrong registry path, or a missing \`imagePullSecrets\` for a private registry. Also in Events, verbatim.
- **CrashLoopBackOff** — the container *started* and your process died, repeatedly, and the kubelet is now backing off exponentially before retrying. This one is in the **logs**, not the events — and specifically in \`logs --previous\`, because the current attempt may have barely begun.
- **Running but 0/1 READY** — the process is up but readiness is failing. The pod is alive and receiving no traffic. Check the probe path, port and timeout before you touch anything else.
- **OOMKilled / exit 137** — you hit \`limits.memory\`. Visible in \`describe\` under Last State, or via the \`lastState.terminated.reason\` field.
- Then the order never changes: \`get pods\` → \`describe pod\` (Events) → \`logs\` and \`logs --previous\` → \`exec -it\` to look inside a *running* pod → \`port-forward\` to test the Service directly and cut the ingress out of the picture.`,
    },
    {
      type: 'code',
      lang: 'bash',
      title: 'The sequence, top to bottom',
      code: `# 1. What is broken? The STATUS column IS the first diagnosis.
kubectl get pods -n ml-prod
# NAME                            READY   STATUS             RESTARTS   AGE
# sentiment-api-7d4b8c9f5-2xk9p   1/1     Running            0          4h
# sentiment-api-7d4b8c9f5-h8qzt   0/1     CrashLoopBackOff   6          9m
# sentiment-api-7d4b8c9f5-m4v2n   0/1     Pending            0          9m

# 2. Pending = never scheduled. The reason is in Events, never in logs.
kubectl describe pod sentiment-api-7d4b8c9f5-m4v2n -n ml-prod
# Events:
#   Warning  FailedScheduling  0/4 nodes are available: 4 Insufficient memory.

# 3. CrashLoopBackOff = the container started and your process died.
kubectl logs sentiment-api-7d4b8c9f5-h8qzt -n ml-prod
#   (this is the CURRENT attempt, which may have barely started)
kubectl logs sentiment-api-7d4b8c9f5-h8qzt -n ml-prod --previous
#   ...the real stack trace from the run that actually crashed

# 4. Killed by the kernel, or did it exit on its own?
kubectl get pod sentiment-api-7d4b8c9f5-h8qzt -n ml-prod \\
  -o jsonpath='{.status.containerStatuses[0].lastState.terminated.reason}'
# OOMKilled     -> you hit limits.memory. Not a code bug: a sizing bug.

# 5. Look inside a pod that IS running.
kubectl exec -it sentiment-api-7d4b8c9f5-2xk9p -n ml-prod -- sh
#   ls -la /models && env | grep MODEL && wget -qO- localhost:8000/healthz

# 6. Is the Service wired to real pods? Test it with the ingress cut out.
kubectl get endpoints sentiment-api -n ml-prod
#   empty ENDPOINTS = the selector matches no READY pod. Check labels first.
kubectl port-forward svc/sentiment-api 8080:80 -n ml-prod
#   then, in another shell:  curl -s localhost:8080/healthz

# 7. Bad rollout: watch it, then take it back.
kubectl rollout status deploy/sentiment-api -n ml-prod
kubectl rollout undo deploy/sentiment-api -n ml-prod
# deployment.apps/sentiment-api rolled back`,
      annotations: {
        2: 'Always pass -n. The single most wasted minute in k8s debugging is looking at the default namespace.',
        5: 'READY 0/1 with RESTARTS climbing is a crash loop, not a slow start. The row below it is a completely different failure.',
        9: 'describe is where Events live, and Events are where the SCHEDULER speaks. A Pending pod has no logs because it has no container.',
        11: 'Verbatim from the scheduler: no node can fit your memory REQUEST. Lower the request, or let the cluster autoscaler add a node.',
        14: 'Logs of the live attempt. In a fast crash loop this is often empty or truncated, which is why people wrongly conclude "there are no logs".',
        16: 'The flag that solves the crash loop. --previous reads the log of the container instance that already died.',
        21: 'jsonpath straight into the pod status. describe shows the same thing under "Last State: Terminated".',
        22: 'Exit code 137 = 128 + 9 (SIGKILL). Raise limits.memory, shrink the batch, or use a smaller model — in that order of honesty.',
        25: 'exec only works on a RUNNING container. For a crash-looping pod there is nothing to exec into — that is what --previous is for.',
        26: 'Use sh, not bash: a slim or distroless image often has neither, which is itself a useful signal about what you shipped.',
        29: 'The fastest Service check there is. It answers "does this Service point at anything" in one line.',
        30: 'Endpoints are populated from READY pods only. A failing readiness probe empties the list and produces exactly this symptom.',
        31: 'port-forward tunnels straight to the Service, bypassing ingress, DNS and TLS. It splits "my app is broken" from "my routing is broken".',
        35: 'Blocks until the rollout finishes or stalls. In CI this is what turns a deploy step into a real gate.',
        36: 'Rollback = scale the previous ReplicaSet back up. Seconds, and no rebuild — as long as your image tag was immutable.',
      },
    },
    {
      type: 'code',
      lang: 'bash',
      title: 'Do it for real: a local cluster on your laptop with kind',
      code: `# 1. A real control plane on your laptop. kind runs the node as a Docker
#    container; minikube runs it in a VM. Either one is a real cluster.
kind create cluster --name mlops

# 2. Build the image from the Docker module. It exists ONLY in your local daemon.
docker build -t sentiment:v3.2.1 .

# 3. The step everyone skips, and the number one beginner ImagePullBackOff.
kind load docker-image sentiment:v3.2.1 --name mlops
# minikube equivalent:  minikube image load sentiment:v3.2.1

# 4. Apply the Deployment + Service from earlier in this module.
kubectl create namespace ml-prod
kubectl apply -f deploy.yaml
kubectl rollout status deploy/sentiment-api -n ml-prod

# 5. There is no cloud load balancer on a laptop. port-forward is the way in.
kubectl port-forward svc/sentiment-api 8080:80 -n ml-prod
#   in another shell:  curl -s localhost:8080/healthz

# 6. Break it on purpose — that is the entire point of a throwaway cluster.
kubectl delete pod sentiment-api-7d4b8c9f5-2xk9p -n ml-prod
kubectl get pods -n ml-prod -w

# 7. The whole cluster is one container. Deleting it is instant and free.
kind delete cluster --name mlops`,
      annotations: {
        3: 'Downloads a node image the first time, then writes a new kubectl context called kind-mlops and switches to it. Check with kubectl config current-context before you apply anything.',
        6: 'Same image, same tag discipline as production. An immutable tag here means the next step and the manifest cannot silently disagree.',
        9: 'A kind node has its OWN image store. It cannot see your laptop\'s Docker daemon, so without this line the kubelet goes to Docker Hub, finds no "sentiment:v3.2.1", and parks the pod in ImagePullBackOff forever.',
        10: 'minikube has the identical trap and the identical fix. Either way the tag must match the manifest exactly, and keeping it off :latest matters here too: :latest defaults to imagePullPolicy: Always, which sends the kubelet to the registry even though the image is already on the node.',
        13: 'apply fails with "namespaces ml-prod not found" if you skip this. A namespace is an object like any other; nothing creates it implicitly.',
        15: 'Blocks until every pod is Ready or the rollout stalls. On a laptop this is where an over-tight probe or an oversized memory request shows up immediately.',
        18: 'The same command from the debugging sequence. It bypasses ingress and DNS entirely, which is exactly what you want when nothing else exists yet.',
        22: 'Delete actual state, leave desired state alone, watch a replacement appear in about a second. This is the control loop demonstrating itself in one command.',
        26: 'Tear it down when you stop. A kind cluster costs nothing but RAM, and rebuilding it from scratch takes under a minute — which is the whole argument for practising here instead of on a cloud cluster.',
      },
    },
    {
      type: 'note',
      md: '**Helm**, in one line: templated YAML plus a `values.yaml`, so one chart serves dev/staging/prod without three copies of the same manifest — and `helm rollback` versions the whole release, not just one Deployment. Kustomize is the no-templating alternative (a base plus overlay patches); both are fine, pick one and move on.',
    },
    {
      type: 'intuition',
      title: 'Infrastructure as Code: the console is not a source of truth',
      md: `Clicking through a cloud console is cooking without writing the recipe down. It worked once. Nobody can repeat it, nobody could review it, and six months later *"what is actually running in prod?"* has no answer anyone trusts.

- Three things a console cannot give you: **reproducibility** (build staging identical to prod), **review** (a diff a colleague approves *before* it happens), and **an audit trail** (who opened that security group, and when).
- **Infrastructure as Code** puts the environment in git as text. The repo becomes the answer to "what is running", and every change arrives as a pull request.
- **Declarative, not imperative.** A shell script says *create a bucket* and fails the second time you run it. Terraform says *this bucket should exist* — run it ten times, you get one bucket. Same control-loop idea as Kubernetes, one layer down.
- The cycle is \`plan\` then \`apply\`. **plan is a dry run that prints the diff**: "3 to add, 1 to change, 0 to destroy". Reading that diff before approving is the entire safety mechanism — and a *destroy* appearing in a plan you expected to be additive is the moment to stop.
- **State is the scary part.** Terraform keeps a file mapping *your resource names* to *real cloud IDs*. Without it, it cannot tell "create a bucket" from "this bucket is already mine". Lose the state and it forgets it owns anything; commit the state to git and you have published whatever secrets it recorded and invited two people to write it at once.
- **Drift** is what happens when someone fixes something in the console at 2am. Reality stops matching the code, and the next \`plan\` politely offers to undo their fix. The rule that follows: once a resource is managed by code, it changes *only* through code.
- Worth noticing: **you have been writing infrastructure as code all module.** \`deploy.yaml\` is desired state, in text, reviewable in git, applied by a tool that reconciles reality to it. Terraform is the same idea for the layer underneath — the cluster, the bucket, the role.`,
    },
    {
      type: 'code',
      lang: 'yaml',
      title: 'main.tf — the machine, the bucket and the permission you made by hand, now as code',
      code: `terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "ap-south-1"
}

# THE BUCKET. By hand this was: aws s3 mb s3://faang-prep-artifacts-8412
resource "aws_s3_bucket" "artifacts" {
  bucket = "faang-prep-artifacts-8412"
}

# THE PERMISSION. By hand: aws iam create-policy + attach-role-policy.
resource "aws_iam_role" "trainer" {
  name = "trainer-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

resource "aws_iam_policy" "artifacts_rw" {
  name = "artifacts-rw"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject"]
        Resource = "\${aws_s3_bucket.artifacts.arn}/models/*"
      },
      {
        Effect   = "Allow"
        Action   = "s3:ListBucket"
        Resource = aws_s3_bucket.artifacts.arn
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "trainer_artifacts" {
  role       = aws_iam_role.trainer.name
  policy_arn = aws_iam_policy.artifacts_rw.arn
}

resource "aws_iam_instance_profile" "trainer" {
  name = "trainer-role"
  role = aws_iam_role.trainer.name
}

# THE MACHINE. By hand: aws ec2 run-instances --instance-type t3.micro
resource "aws_instance" "trainer" {
  ami                  = "ami-0abcdef1234567890"
  instance_type        = "t3.micro"
  iam_instance_profile = aws_iam_instance_profile.trainer.name

  tags = {
    owner   = "raunak"
    project = "study"
    ttl     = "8h"
  }
}

output "trainer_public_ip" {
  value = aws_instance.trainer.public_ip
}`,
      annotations: {
        1: 'Pin the provider version. terraform init writes a lockfile next to this, so a colleague running it next month gets the same provider and the same behaviour — the same argument as pinning an image tag.',
        10: 'The provider is the plugin that talks to AWS. Note what is NOT here: no keys. It uses the same credential chain from the cloud module — env vars, config file, or the role attached to whatever runs it.',
        15: 'Read it as: resource TYPE "aws_s3_bucket", LOCAL NAME "artifacts". Together they form the address aws_s3_bucket.artifacts, which is how everything else refers to it and how the state file keys it.',
        16: 'The bucket name is still globally unique across every AWS account — Terraform does not soften that, it just records the name in one reviewable place.',
        20: 'The trust policy answers WHO may assume this role (the EC2 service), which is a completely separate question from WHAT the role may do. Beginners merge the two and get an unassumable role.',
        22: 'jsonencode lets you write an HCL object and emit valid JSON. Much safer than pasting a JSON blob into a string and fighting the quoting.',
        40: 'The line that builds the dependency graph. Referencing the bucket ARN tells Terraform to create the bucket first — you never write an ordering, you write references and it derives the order.',
        51: 'The attachment is its OWN resource, not a field on the role. That is why one policy can be attached to several roles and detached without deleting either.',
        56: 'An instance profile is the wrapper EC2 actually consumes — exactly the thing --iam-instance-profile named on the CLI. A role alone cannot be attached to an instance.',
        62: 'One instance, no key pair, no keys in the code. Everything the training script needs comes from the role above it.',
        63: 'The hardcoded AMI id is the honest weak point: it is region-specific and it goes stale. Real code looks it up with a data source instead.',
        67: 'Tags at launch, enforced by the file. This is the concrete payoff of IaC on cost: nobody can forget the tag, because the tag is in the reviewed diff.',
        74: 'Outputs are the module\'s return values — printed after apply and readable by other tooling with terraform output -json. Use them for the IP, the bucket name, the endpoint URL.',
      },
    },
    {
      type: 'note',
      md: 'The workflow is four commands. `terraform init` downloads the provider and writes a lockfile — once per repo, and again whenever a provider version changes. `terraform plan` prints the diff and changes nothing. `terraform apply` shows the plan again, waits for you to type `yes`, then executes it. `terraform destroy` deletes everything in the state file — which is why **destroy is the free-tier student\'s best friend**: build the whole stack, poke it, tear it down in one command, and go to bed knowing the meter stopped. Two things change the moment a second person is involved. **Remote state**: put the state file in S3 or Terraform Cloud, never in git — it holds resource IDs and sometimes plaintext secrets, and a merge conflict in it is unrecoverable. **Locking**: a DynamoDB table or the backend\'s native lock, so two engineers cannot `apply` simultaneously and corrupt it. Terraform is not the only option: CloudFormation (AWS-only), Pulumi and AWS CDK (a real programming language instead of HCL), and Ansible for *configuring* machines rather than provisioning them — but Terraform is the one the job descriptions name.',
    },
    {
      type: 'note',
      md: 'The honest closing note. **Most ML teams do not need raw Kubernetes.** If you are serving one or two models, a managed product — SageMaker endpoints, Vertex AI, Cloud Run, Modal, Replicate — gives you autoscaling, rollouts and health checks without hiring anyone to run a cluster, and that is usually the right call. Kubernetes earns its keep when you have many services, real multi-tenancy, hard cost pressure on GPU fleets, or a platform team that already exists. But you must still be able to **read the YAML**: those managed products generate it, your infra team writes it, the interviewer will show you a broken one, and "pod vs deployment" plus a CrashLoopBackOff triage are asked in essentially every ML platform loop. Learn it on `kind` or `minikube` locally — deploy the container you built in the Docker module, break it on purpose, and run the debugging sequence above until it is muscle memory.',
    },
  ],
  quiz: [
    {
      question: 'What does "Kubernetes is declarative" actually mean in practice?',
      options: [
        {
          text: 'You write YAML instead of shell scripts, which is tidier but otherwise the same',
          explanation: 'The file format is not the point. You could POST JSON and it would still be declarative — what matters is that you submit a target, not an action.',
        },
        {
          text: 'You submit desired state, and controllers continuously compare it against actual state and act to close the gap',
          explanation: 'Correct. That control loop is why a deleted pod comes back and a dead node\'s pods reappear elsewhere — nobody re-ran a command.',
        },
        {
          text: 'Kubernetes runs your containers in a predetermined order defined by the file',
          explanation: 'There is no ordering guarantee in a manifest. Objects are reconciled independently and concurrently — which is why services must tolerate their dependencies not being up yet.',
        },
      ],
      correct: 1,
    },
    {
      question: 'Pod vs Deployment — the interview one-liner.',
      options: [
        { text: 'They are the same object; Deployment is just the newer API name', explanation: 'They are different kinds with different controllers. A Deployment creates ReplicaSets, which create Pods.' },
        { text: 'A Deployment is a Pod with restartPolicy: Always set on it', explanation: 'restartPolicy restarts a CONTAINER inside a pod on the same node. It cannot replace a pod whose node vanished — that needs a controller above the pod.' },
        {
          text: 'A Pod is one mortal instance with its own IP; a Deployment is the declared intent that keeps N of them alive via ReplicaSets, giving rolling updates and rollback',
          explanation: 'Correct. Follow-up worth volunteering: you debug pods, but you never write them directly in production — delete one and the Deployment replaces it in a second.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Your container tries to use more CPU than its `limits.cpu`. What happens?',
      options: [
        {
          text: 'It is throttled — given less CPU time, so it runs slower, but nothing is killed',
          explanation: 'Correct. CPU is compressible, so the kernel just squeezes the time slice. It is silent: p99 grows and no event is logged, which is why you need the throttling metric on a dashboard.',
        },
        { text: 'It is OOMKilled and restarted', explanation: 'That is the MEMORY limit. Memory cannot be compressed, so exceeding it kills the container with exit code 137.' },
        { text: 'The pod is evicted and rescheduled onto a bigger node', explanation: 'Eviction happens under NODE pressure, not because one container hit its own CPU cap. The scheduler will not go shopping for a bigger node either.' },
      ],
      correct: 0,
    },
    {
      question: 'A pod has been `Pending` for ten minutes. Where do you look first?',
      options: [
        { text: '`kubectl logs` — the container is telling you why it will not start', explanation: 'There is no container. Pending means the scheduler never placed the pod on a node, so there is nothing to have produced a log line.' },
        {
          text: '`kubectl describe pod` and read the Events — Pending is almost always "no node satisfies the resource requests" (or a taint / affinity / unbound PVC)',
          explanation: 'Correct. The scheduler writes its reason verbatim into Events, e.g. "0/4 nodes are available: 4 Insufficient memory."',
        },
        { text: 'The registry — Pending means the image pull is still in progress', explanation: 'An image pull happens after scheduling and shows as ContainerCreating, or ImagePullBackOff when it fails. Different phase, different status.' },
      ],
      correct: 1,
    },
    {
      question: 'Your model takes 90 s to load. Liveness probe: initialDelay 10 s, period 10 s, failureThreshold 3. No startup probe. What happens?',
      options: [
        { text: 'Nothing bad — liveness only starts checking once readiness has passed', explanation: 'Liveness and readiness are independent. Only a startupProbe suspends liveness; readiness has no such power.' },
        { text: 'The pod serves 500s until the model finishes loading', explanation: 'A failing readiness probe would keep traffic away. The actual failure here is more violent than serving errors.' },
        {
          text: 'The kubelet restarts the container at about 40 s — forever. The pod never survives long enough to finish loading',
          explanation: 'Correct, and the tell is that the logs show a healthy startup on repeat with no error. Fix with a startupProbe (e.g. failureThreshold 60 × period 5 s = a 5-minute boot budget).',
        },
      ],
      correct: 2,
    },
    {
      question: '`kubectl get endpoints my-svc` shows an empty ENDPOINTS column. Most likely cause?',
      options: [
        {
          text: 'The Service selector matches no READY pod — either the labels differ, or the pods exist but are failing readiness',
          explanation: 'Correct. Endpoints are built from ready pods matching the selector, so both a label typo and a failing readiness probe produce this exact symptom. Compare the Service selector against the POD labels, not the Deployment\'s.',
        },
        { text: 'The Service type must be LoadBalancer for endpoints to populate', explanation: 'Endpoints are populated identically for ClusterIP, NodePort and LoadBalancer. The type only changes how traffic reaches the Service from outside.' },
        { text: 'The pods need a ServiceAccount before they can be routed to', explanation: 'ServiceAccounts are API identity for calling the Kubernetes API. They have nothing to do with Service routing.' },
      ],
      correct: 0,
    },
    {
      question: 'Traffic spikes. Your HPA scales from 2 to 8 pods immediately, but users still see errors for six minutes. Why?',
      options: [
        { text: 'The HPA only re-evaluates once per hour', explanation: 'The HPA loop runs about every 15 seconds by default. It reacted quickly — the delay is downstream of the decision.' },
        {
          text: 'A new pod is not capacity until it is Ready: node provisioning, a multi-GB image pull, then loading and warming the model all happen first',
          explanation: 'Correct. Mitigations: shrink the image, pre-pull or cache layers, raise minReplicas so warm replicas absorb the spike, and scale on queue depth so the decision fires earlier.',
        },
        { text: 'The HPA cannot scale past 4 replicas without a cluster autoscaler', explanation: 'The cluster autoscaler adds nodes when pods are Pending, and it does add real minutes — but there is no 4-replica rule anywhere.' },
      ],
      correct: 1,
    },
    {
      question: 'How safe is a Kubernetes Secret?',
      options: [
        { text: 'Encrypted at rest by default in every cluster', explanation: 'Encryption at rest for etcd is opt-in configuration on most clusters. Assuming it is on is exactly the mistake this question is testing.' },
        { text: 'Encrypted with a per-node hardware key, so only the scheduled node can read it', explanation: 'No such mechanism exists in core Kubernetes. Secrets are handed to the kubelet and mounted as tmpfs, but the stored value itself is not hardware-bound.' },
        {
          text: 'The value is only base64-encoded — anyone with read RBAC can decode it in one command, so you need etcd encryption, tight RBAC, and ideally an external secret manager',
          explanation: 'Correct. `kubectl get secret x -o yaml | base64 -d` is the whole attack. Base64 exists for binary safety in YAML, not for secrecy.',
        },
      ],
      correct: 2,
    },
    {
      question: 'You only renamed a Terraform resource block — `aws_s3_bucket.artifacts` became `aws_s3_bucket.model_store`. `terraform plan` says "1 to add, 1 to destroy". Why?',
      options: [
        {
          text: 'A cosmetic bug in the plan output; apply will see the resources are identical and do nothing',
          explanation: 'A plan is not cosmetic — it is the exact set of API calls apply will make. If it says destroy, apply destroys.',
        },
        {
          text: 'The state file keys every resource by its ADDRESS, so the new name looks like a brand-new bucket and the old address looks abandoned — apply would really delete the bucket and create another',
          explanation: 'Correct, and it is the cleanest demonstration of why state is the scary part. The fix is to tell state about the rename rather than let it infer one: a `moved` block in the config, or `terraform state mv` for the old address.',
        },
        {
          text: 'Renaming forces a replacement because bucket names are immutable in AWS',
          explanation: 'The bucket NAME argument did not change here — only the local block label did. Immutable arguments do force replacement, but that is a different plan line ("must be replaced"), and it is not what happened.',
        },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'What is the difference between a pod and a deployment?',
      answer:
        'A Pod is the smallest schedulable unit: one or more containers sharing a network namespace (same localhost and port space) and optionally volumes. It is mortal — it gets an IP, it can die with its node, and nothing brings it back. A Deployment is declared intent: it says "N pods matching this template should exist", and it owns ReplicaSets to make that true. The ReplicaSet in between is what actually keeps the count; the Deployment exists so that changing the pod template creates a NEW ReplicaSet and shifts pods across gradually, which is what gives you rolling updates and instant rollback (the old ReplicaSet is kept at zero replicas, so undo is a scale-up, not a rebuild). Practically: you debug pods, you deploy Deployments, and you never write a bare pod in production — delete a Deployment-owned pod and a replacement appears in about a second, which is the control loop demonstrating itself. The exceptions worth naming: a StatefulSet when each replica needs a stable identity and its own storage, a DaemonSet when you want exactly one pod per node (log shippers, the NVIDIA device plugin), and a Job or CronJob for work that finishes.',
      isCaseBased: false,
    },
    {
      question: 'Case: you deploy a new model image and the pod goes into CrashLoopBackOff. Walk me through your triage.',
      answer:
        'First, read the status precisely: CrashLoopBackOff means the container STARTED and the process exited, repeatedly, and the kubelet is now backing off exponentially before retrying. That already rules out scheduling and image-pull problems. Step 1: `kubectl describe pod` for Events and, more importantly, Last State — I want the exit code and reason. Exit 137 with reason OOMKilled means I hit limits.memory, which is a sizing bug, not a code bug: the fix is raising the limit, shrinking the batch, or using a smaller model. Exit 1 with reason Error means my process threw. Step 2: `kubectl logs POD --previous`. The `--previous` flag is the whole trick — plain `kubectl logs` reads the current attempt, which in a fast crash loop has barely started and often looks empty, and that is why people wrongly report "there are no logs". Step 3: read the actual trace. The common ones for ML: a missing model file or S3 credential (a ConfigMap/Secret key that does not exist, or a volume not mounted), a CUDA/driver mismatch between the image and the node, an import error from a dependency present locally but not in the image, or a config key the new version requires and the ConfigMap does not have. Step 4: if the logs are not enough, reproduce outside the loop — run the same image locally with `docker run`, or exec into a healthy pod and compare `env` and the filesystem, since `exec` will not work on a crash-looping pod. Step 5: stop the bleeding first if this is production — `kubectl rollout undo deploy/x` puts the previous ReplicaSet back in seconds — and then debug at leisure. Two things I would say unprompted: check whether the OLD pods are still serving (with maxUnavailable: 0 and a readiness gate, a bad rollout stalls instead of taking the service down, which is the whole point of that config), and confirm the image tag is immutable, because you cannot roll back to a tag that moved.',
      isCaseBased: true,
    },
    {
      question: 'Explain requests versus limits, and what happens when a container exceeds each.',
      answer:
        'A request is what the SCHEDULER reserves. It is purely a placement number: the scheduler sums the requests already promised on each node and finds one with room. It never looks at actual usage. A limit is the runtime cap that the kernel enforces through cgroups, and it has nothing to do with placement. Exceeding the CPU limit means throttling — CPU is compressible, so the process just gets a smaller time slice, runs slower, and nothing crashes. It is silent and genuinely hard to spot without the container_cpu_cfs_throttled metric on a dashboard. Exceeding the memory limit means OOMKilled — memory is not compressible, so the kernel kills the container and the kubelet restarts it, exit code 137, and if it happens on every startup you get a crash loop. The failure people underrate is omitting requests entirely: the scheduler then assumes roughly zero, bin-packs many pods onto one node, and they fight over real RAM until the node hits pressure and starts evicting pods, including other teams\' services that did nothing wrong. For ML specifically I always set a memory limit, because a container with no memory limit is a node-killer — one runaway batch takes the node down with everything on it. And a container-awareness trap worth mentioning: os.cpu_count() and nproc inside the container report the NODE\'s cores, not your CPU limit, so a thread pool sized off that number oversubscribes a 500m slice by an order of magnitude.',
      isCaseBased: false,
    },
    {
      question: 'Liveness, readiness and startup probes — what does each one do, and how do you set them for a model server?',
      answer:
        'They ask different questions. Liveness asks "am I wedged?" and failing it RESTARTS the container — it is the only destructive probe. Readiness asks "should I receive traffic?" and failing it removes the pod from the Service endpoints with no restart; traffic returns automatically when it passes again. Startup asks "am I still booting?" and while it runs, the other two are suspended entirely, so its failureThreshold × periodSeconds is your boot budget. For a model server: a startup probe with a generous budget, because loading multi-GB weights and warming the CUDA context takes anywhere from 30 seconds to several minutes; readiness gated on model-loaded-AND-warmed, so no traffic arrives before the first inference would succeed; and liveness pointed at a deliberately dumb endpoint that only proves the process is answering. The two mistakes I watch for: a liveness probe that checks a dependency (the database, the feature store, the model registry) turns one slow dependency into a cluster-wide restart storm; and a readiness probe that returns 200 as soon as the web server binds is a probe that lies — the Service believes it, adds the pod, and a third of production hits a pod with no model loaded. Also set timeoutSeconds high enough that a GPU worker busy on a batch does not simply miss its reply and get restarted for being popular.',
      isCaseBased: false,
    },
    {
      question: 'Case: after a routine deploy, roughly a third of requests return 500 for the first two minutes, then everything is fine. The pods never restarted. What happened?',
      answer:
        'The pattern is diagnostic: a fixed FRACTION failing points at a subset of endpoints being bad, and it clearing on its own without restarts says the pods eventually became genuinely healthy. That is a readiness problem, not a crash. The new pods were added to the Service endpoints before they could actually serve — either the readiness probe hits a path that returns 200 as soon as the HTTP server binds (before the model is loaded), or there is no readiness probe at all, in which case a pod is considered Ready the instant its container starts. Two minutes is exactly the shape of a model load. Fix: point readiness at an endpoint that checks the model object is loaded and warmed, and add a startupProbe so the boot period is explicitly excluded. Second contributor to check: shutdown, not just startup. If the old pods were sent SIGTERM and exited immediately while still holding in-flight requests, you lose those too — you want the app to catch SIGTERM, fail readiness, drain, then exit, with terminationGracePeriodSeconds long enough to cover it, plus a preStop sleep of a few seconds to cover the gap between endpoint removal propagating and the process stopping. I would confirm with `kubectl describe` on the new pods (readiness transition times), the endpoint list during the rollout, and per-pod error rates rather than a service-wide number — the service-wide graph is what hides this.',
      isCaseBased: true,
    },
    {
      question: 'How does a rolling update work, what do maxSurge and maxUnavailable control, and how do you roll back?',
      answer:
        'Changing the pod template on a Deployment creates a new ReplicaSet and scales it up while scaling the old one down. maxSurge is how many pods above the replica count may exist during the transition; maxUnavailable is how far below the count you may drop. maxSurge 1 / maxUnavailable 0 is the safe pairing — capacity never dips, but you need spare room in the cluster, which for a GPU pod means a spare GPU. maxSurge 0 / maxUnavailable 1 needs no extra hardware but serves on fewer pods for a while. The rollout only advances when a new pod passes its readiness probe, so readiness is the safety brake: a genuinely broken version stalls the rollout instead of replacing the healthy pods, and old pods keep serving. Rollback is `kubectl rollout undo deploy/x`, which scales the previous ReplicaSet back up — seconds, no rebuild, provided your image tag was immutable (this is the concrete reason :latest is banned: you cannot roll back to a tag that moved under you). `kubectl rollout status` blocks until the rollout completes or stalls, which is what makes it a real gate in CI. The honest limitation: this is a rolling update, not a canary — during the transition both versions take real traffic and you cannot route by percentage or by user. Actual canary or blue-green needs two Deployments behind weighted routing, an ingress that supports traffic splitting, or a service mesh.',
      isCaseBased: false,
    },
    {
      question: 'Walk me through Kubernetes autoscaling, and tell me why it behaves badly for ML workloads.',
      answer:
        'Three autoscalers, different axes. The HPA adds pods: it reads a metric — CPU utilization as a percentage of the pod\'s REQUEST, or a custom metric like queue depth or GPU utilization via prometheus-adapter — and writes a new replicas value onto the Deployment. The cluster autoscaler adds nodes: it watches for pods stuck Pending because nothing can fit them and asks the cloud provider for another machine, then removes underused nodes later. The VPA right-sizes requests and limits instead of counting pods, and it conflicts with the HPA on the same metric so you do not run both on CPU. Why ML is bad at this: a pod is not capacity until it is Ready, and for a model server the path to Ready is node provisioning (1–3 minutes if a new node is needed), pulling a multi-GB image onto a cold node (1–4 minutes), then loading weights and warming the CUDA context (30 seconds to 3 minutes). Five to ten minutes to first served request, by which time the spike is over. Mitigations in order of payoff: shrink the image (slim base, no build toolchain, fetch weights from a shared cache rather than baking them into a layer); pre-pull or keep the layer cache warm on nodes; keep warm replicas with minReplicas of at least two and scale on a leading indicator like queue depth rather than CPU, which is already pinned by the time users suffer; over-provision with low-priority placeholder pods that hold node capacity and get evicted instantly; and set a scale-down stabilization window so a pod that took three minutes to load is not killed during a lull and rebuilt a minute later. And always set maxReplicas — it is what stops a retry storm from autoscaling your bill.',
      isCaseBased: false,
    },
    {
      question: 'How do GPUs work on Kubernetes, and what should you watch out for?',
      answer:
        'The NVIDIA device plugin runs as a DaemonSet and advertises nvidia.com/gpu as an extended resource on GPU nodes; your pod requests it under resources.limits, and for extended resources request and limit must be equal — so no overcommit and no bursting. The key operational fact: by default one GPU is assigned to exactly one container, with no fractional sharing. Time-slicing and MPS can share a GPU across containers, and MIG partitions an A100 or H100 into fixed hardware slices with isolated memory, but none of that is on by default and each carries caveats — time-slicing gives no memory isolation, so one pod\'s OOM can take out its neighbour. The rest is cost discipline, because an idle GPU pod bills exactly like a busy one: taint GPU nodes so CPU workloads cannot land on them and use nodeSelectors or affinity to place GPU work; scale GPU deployments on real utilization or queue depth, not CPU; enforce a maxReplicas ceiling; and put a hard time limit on interactive notebook pods so nobody holds an H100 overnight. Also worth naming: the container image must match the node driver family, which is a very common CrashLoopBackOff cause on GPU nodes, and the NVIDIA GPU Operator exists to manage drivers, the device plugin and DCGM metrics together rather than by hand.',
      isCaseBased: false,
    },
    {
      question: 'ClusterIP, NodePort, LoadBalancer, Ingress — when do you use each?',
      answer:
        'ClusterIP is the default and the right answer for almost everything: a stable virtual IP plus a cluster DNS name that load-balances across pods matching the Service\'s label selector, reachable only from inside the cluster. Every service-to-service call, including your inference API being called by another internal service, should be this. NodePort opens the same high port (30000–32767) on every node and forwards it in; it is crude and mostly appears in local clusters like kind or minikube, or underneath a cloud LoadBalancer. LoadBalancer asks the cloud provider to provision a real external load balancer pointing at the Service — it works, but it is one external LB per Service and each costs money, which is the reason Ingress exists. Ingress is a single HTTP entry point, backed by a controller (nginx, Traefik, a cloud ALB), that routes by host and path to different Services and terminates TLS — one external load balancer for the whole cluster. So the production shape is: pods behind ClusterIP Services, one Ingress in front doing TLS and path routing. Two details worth adding: the Service selector matches POD labels, not the Deployment, and a mismatch produces a Service that resolves but has zero endpoints; and endpoints only contain READY pods, so a failing readiness probe empties the list and looks identical to a label typo — `kubectl get endpoints` distinguishes them in one command.',
      isCaseBased: false,
    },
    {
      question: 'How do you handle configuration and secrets, and are Kubernetes Secrets actually secret?',
      answer:
        'ConfigMap for non-secret configuration, Secret for credentials; both inject either as environment variables or as mounted files, and files are better for anything large, anything rotatable, or anything you do not want leaking into a crash dump or a child process\'s environment. Namespaces separate environments — ml-prod and ml-staging get their own objects, their own RBAC and their own resource quotas — and DNS inside a namespace resolves by short name. Now the honest part: a Kubernetes Secret is base64-encoded, not encrypted. Anyone with get-secret RBAC decodes it with `kubectl get secret x -o yaml | base64 -d`, and by default the value sits in etcd in the clear. Base64 is there for binary safety in YAML, not for secrecy. To make it real you need encryption at rest configured for etcd, RBAC scoped so only the intended ServiceAccount can read that Secret, and for anything that genuinely matters an external manager — AWS Secrets Manager, GCP Secret Manager or Vault, usually via the External Secrets Operator or CSI driver — which also gives you rotation and an audit trail, neither of which core Secrets provide. Last operational detail: changing a ConfigMap or Secret does not restart pods. Env vars are captured at start, so you must trigger a rollout; mounted files do eventually update in place, but your process has to notice.',
      isCaseBased: false,
    },
    {
      question: 'A pod is stuck in Pending and another is in ImagePullBackOff. Diagnose each without running anything yet.',
      answer:
        'Pending means the scheduler never placed the pod on a node, so nothing inside the container has run and there are no logs to read — the answer is always in `kubectl describe pod` under Events, where the scheduler writes its reason verbatim, e.g. "0/4 nodes are available: 4 Insufficient memory." The usual causes in order: resource requests no node can satisfy (fix by lowering the request, or by letting the cluster autoscaler add a node — and note the autoscaler is triggered BY pods being Pending, so a few minutes of Pending is sometimes the system working); a taint on the nodes with no matching toleration; a nodeSelector or affinity rule that matches nothing, which is common when you ask for nvidia.com/gpu in a cluster with no GPU nodes; an unbound PersistentVolumeClaim; or a pod anti-affinity rule that cannot be satisfied at the current node count. ImagePullBackOff is the opposite half of the lifecycle: the pod IS scheduled and the kubelet cannot fetch the image. Causes: a tag that does not exist (a typo, or a CI build that never pushed), a wrong registry path, missing imagePullSecrets for a private registry, rate limiting from the registry, or an architecture mismatch such as an arm64 image on amd64 nodes. Same tool: describe, read the Events, and the registry\'s own error text is quoted there. The one-line summary I would give: Pending is a scheduling problem, ImagePullBackOff is a registry problem, CrashLoopBackOff is your code — three statuses, three completely different places to look.',
      isCaseBased: true,
    },
    {
      question: 'Do you actually need Kubernetes to serve a model?',
      answer:
        'Usually not, and I would say so directly. If you are serving one or two models, a managed product — SageMaker endpoints, Vertex AI, Cloud Run, or something like Modal or Replicate — gives you autoscaling, rolling deploys, health checks and TLS without anyone having to run a control plane, and the total cost of ownership is far lower than a cluster nobody has time to maintain. Kubernetes starts to earn its keep when you have many services that need to share infrastructure, real multi-tenancy across teams, a GPU fleet big enough that packing efficiency is a line item, unusual networking or compliance requirements, or a platform team that already runs a cluster for everything else — at that point the marginal cost of putting your model on it is small and the consistency is worth a lot. What is not optional is being able to READ the YAML: managed products generate manifests, your platform team writes them, and an interviewer will hand you a broken one and ask what is wrong. So my honest position is that the deployment target is a business decision, but requests versus limits, the three probes, what a rolling update does, and the get-pods → describe → logs --previous → exec → port-forward debugging loop are engineering knowledge I need regardless of where the container ends up running.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'Kubernetes in one sentence', back: 'A control loop: you declare DESIRED state, controllers continuously drive ACTUAL state toward it. You never say "start a container" — you say "three should exist".' },
    { front: 'Pod vs Deployment', back: 'Pod = one mortal instance with its own IP (containers sharing localhost and volumes). Deployment = declared intent that keeps N alive via ReplicaSets, giving rolling updates and rollback.' },
    { front: 'What a Service is for', back: 'Stable virtual IP + DNS name load-balancing across pods matching its LABEL SELECTOR (pod labels, not the Deployment). ClusterIP internal, NodePort crude, LoadBalancer one cloud LB per Service, Ingress one entry point with TLS + path routing.' },
    { front: 'requests vs limits', back: 'request = what the SCHEDULER reserves (bin-packing). limit = the kernel\'s hard cap. Missing requests → overpacked nodes and evictions.' },
    { front: 'Exceeding CPU limit vs memory limit', back: 'CPU: throttled — slower, silent, no crash. Memory: OOMKilled, exit 137, container restarted. An ML container with no memory limit is a node-killer.' },
    { front: 'The three probes', back: 'liveness = restart me if wedged (the destructive one). readiness = do not send traffic yet (removes from endpoints). startup = I am slow to boot; suspends the other two for failureThreshold × periodSeconds.' },
    { front: 'The classic probe outage', back: 'Model loads in 90 s; liveness kills it at 40 s; it restarts forever with clean logs. Fix: a startupProbe with a real boot budget, and never point liveness at a dependency.' },
    { front: 'maxSurge / maxUnavailable / undo', back: 'maxSurge = pods allowed ABOVE replicas; maxUnavailable = how far below. 1/0 = zero downtime but needs spare capacity. `kubectl rollout undo` scales the previous ReplicaSet back up — seconds, if your tag was immutable.' },
    { front: 'Why autoscaling is slow for ML', back: 'HPA adds pods, cluster autoscaler adds nodes — then a huge image pull plus model load. 5–10 min to first served request. Mitigate: smaller images, pre-pulled caches, warm minReplicas, scale on queue depth.' },
    { front: 'The debugging loop, in order', back: 'get pods (Pending = unschedulable, ImagePullBackOff = registry, CrashLoopBackOff = your process) → describe pod (Events) → logs --previous → exec -it → port-forward svc/x to test the Service directly.' },
    { front: 'Infrastructure as Code: plan, apply, state', back: 'Declarative desired state for cloud resources, in git. `init` → `plan` (dry-run diff — read it) → `apply` → `destroy`. The state file maps your resource addresses to real cloud IDs: remote and locked for teams, never in git. Console edits cause drift, which the next plan offers to undo.' },
  ],
  mindmapMarkdown: `- Kubernetes Essentials
  - Control loop: desired state vs actual state, forever
    - Declarative: "three should exist" — apply writes to etcd, controllers reconcile
  - Objects, in dependency order
    - Pod: shared localhost + volumes, mortal, never write one
    - ReplicaSet: keeps N pods alive
    - Deployment: manages ReplicaSets → rolling update + undo
    - Service: stable IP + DNS, matches POD labels
    - ClusterIP / NodePort / LoadBalancer / Ingress (TLS + path routing)
    - ConfigMap + Secret (base64 is NOT encryption)
    - Namespace: RBAC + quota isolation
  - Resources and scheduling
    - request = scheduler reserves it; limit = kernel hard cap
    - CPU over limit → throttled and silent
    - Memory over limit → OOMKilled, exit 137 (no limit = node-killer)
    - Missing requests wreck bin-packing
  - Probes
    - liveness restarts the container; readiness gates traffic
    - startup = slow-boot budget, suspends the other two
    - Outage: impatient liveness restarts a loading model forever
  - Rollouts
    - maxSurge above / maxUnavailable below; readiness is the safety brake
    - rollout status, rollout undo — and it is NOT a canary
  - Autoscaling
    - HPA adds pods (CPU % of request, or queue depth); cluster autoscaler adds nodes
    - ML is slow: image pull + weight load = 5–10 min → warm minReplicas, smaller images
  - GPUs: nvidia.com/gpu, request = limit, no fractional sharing, idle still bills
  - Debugging: Pending / ImagePullBackOff / CrashLoopBackOff
    - describe → Events; logs --previous; exec -it; port-forward svc
  - Local practice on kind
    - create cluster → build → kind load docker-image → apply → port-forward → delete cluster
    - kind load is mandatory: the node has its own image store
  - Infrastructure as Code (Terraform)
    - Console is unreproducible, unreviewable, undiffable
    - Declarative desired state in git: init → plan → apply → destroy
    - plan is the diff you read before approving
    - State maps addresses to real cloud IDs: remote + locked, never in git
    - Drift: fix it in code, never in the console
    - k8s manifests are already IaC, one layer up
  - Helm = templated YAML + values; managed serving is often right — but READ the YAML`,
}

export default m
