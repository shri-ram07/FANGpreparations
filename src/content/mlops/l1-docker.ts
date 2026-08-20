import type { Module } from '../types'

const m: Module = {
  id: 'mlops-l1-docker',
  subjectId: 'mlops',
  level: 1,
  title: 'Docker: Images, Layers & Containerizing an ML API',
  whyItMatters:
    '"Explain the difference between an image and a container" is on this subject\'s interview-theme list for a reason — it is asked in almost every ML-engineer screen, and a vague answer ends the conversation. Docker is also the join between everything you have built: the FastAPI serving API from Subject 5 becomes shippable the moment it has a Dockerfile, and every later module — CI/CD, Kubernetes, Airflow, the grand pipeline — assumes you can build a correct image without thinking.',
  estMinutes: 60,
  sections: [
    {
      type: 'intuition',
      title: 'The disease: "works on my machine"',
      md: `You send your teammate a model service. It runs on your laptop. On theirs it does not. Three real reasons, all of which happen in the same week:

- **Python version.** You developed on 3.11. Their box has the distro's 3.9. Your \`match\` statement is a \`SyntaxError\` before a single line of your code runs.
- **A system library.** \`ImportError: libgomp.so.1: cannot open shared object file\`. Not a Python package — an OpenMP runtime your OS happened to have and theirs does not. \`pip install\` cannot fix it.
- **A CUDA driver.** Your wheels were built against CUDA 12.1; their driver is 11.8. \`torch.cuda.is_available()\` returns \`False\` and every fix on Stack Overflow is a different fix.

The pattern: your program is not just your code. It is your code **plus** an interpreter, plus system libraries, plus drivers, plus environment variables, plus the exact file layout on disk. \`requirements.txt\` pins one of those five.

Docker's answer: ship all five as one immutable artifact.`,
    },
    {
      type: 'intuition',
      title: 'A container is a process, not a virtual machine',
      md: `This is the sentence interviewers are listening for. Say it precisely.

- A **virtual machine** boots a whole second operating system on emulated hardware: its own kernel, its own init, its own memory management. Gigabytes, and seconds to start.
- A **container** is an ordinary Linux **process on the host kernel** that has been lied to about what it can see. There is no second kernel. There is no boot.
- The lies are two kernel features. **Namespaces** control *what a process can see*: its own PID space (so your app is PID 1 and cannot see the host's processes), its own mount table (so \`/\` is your image, not the host's disk), its own network stack, hostname, and users.
- **cgroups** (control groups) control *what a process can use*: this much CPU, this much RAM. Exceed the memory cgroup and the kernel OOM-kills you — that is the infamous exit code 137.
- Because it is just a process, starting a container is roughly the cost of \`fork\` + \`exec\`: **milliseconds**. A VM boots a kernel: **seconds**. That gap is why CI runs on containers and why Kubernetes can reschedule a pod in the time a VM would still be in POST.
- The price of sharing the kernel: containers are **weaker isolation** than VMs (a kernel exploit escapes all of them at once), and a Linux container needs a Linux kernel — on Mac and Windows, Docker Desktop quietly runs a tiny Linux VM to provide one.`,
    },
    {
      type: 'note',
      md: 'The one-line interview answer, memorized: *"A VM virtualizes hardware and boots its own kernel; a container virtualizes the operating system — it is an isolated process on the host kernel, using namespaces for what it can see and cgroups for what it can use. That is why containers start in milliseconds and VMs in seconds, and why containers give you weaker isolation."*',
    },
    {
      type: 'intuition',
      title: 'Image vs container: the template and the running thing',
      md: `- An **image** is an immutable, layered filesystem template plus metadata (which command to run, which env vars, which port to document). It is built once, and nothing running can change it.
- A **container** is a *running instance* of an image: the image's layers mounted read-only, with **one thin writable layer on top**, plus its own namespaces and cgroups.
- Every write inside a running container — a log file, a downloaded model, an \`apt install\` — lands in that thin writable layer. **\`docker rm\` deletes the layer. The write is gone.**
- One image, a hundred containers. The read-only layers are *shared* on disk, so container number 100 costs you a writable layer, not another copy of the image.
- The class/object analogy works: image is the class, container is the instance. Just do not stop there — the interviewer wants "immutable layered filesystem" and "thin writable layer" in your answer.
- Related nouns, once: a **registry** (Docker Hub, ECR, GHCR) stores images; \`push\`/\`pull\` move them; a **tag** (\`sentiment-api:1.0\`) is a movable label on an image, while the **digest** (\`sha256:...\`) is the immutable identity. In production, pin the digest.`,
    },
    {
      type: 'hinglish',
      md: `Image ek **recipe book** hai — chhapi hui, immutable, ek hi baar print hoti hai. Container us recipe se banaya hua **ek plate khana**: garam, chalu, aur khatam ho jaane wala. Ek hi recipe se sau plate nikal sakte ho, aur recipe ka size utna hi rehta hai — kyunki plates recipe copy nahi karte, sirf padhte hain.

Ab asli baat, jo log bhool jaate hain: plate pe tumne jo extra achaar daala — logs, downloaded weights, \`pip install\` jo tumne container ke andar chalaya — woh sirf **us plate** pe hai, recipe mein *kabhi* nahi jaata. \`docker rm\` = plate dhul gayi = achaar gaya. Recipe badalni hai to naya print nikaalna padega: \`docker build\` phir se.`,
    },
    {
      type: 'code',
      lang: 'bash',
      title: 'One image, three containers — proving it at the terminal',
      code: `# build ONCE from the Dockerfile in this directory
docker build -t sentiment-api:1.0 .

# start three independent containers from that ONE image
docker run -d --name c1 -p 8001:8000 sentiment-api:1.0
docker run -d --name c2 -p 8002:8000 sentiment-api:1.0
docker run -d --name c3 -p 8003:8000 sentiment-api:1.0

docker ps         # three rows: three running containers
docker images     # still one row: the image was not copied three times

# on a Linux host, look at what a "container" really is:
ps -ef | grep uvicorn      # the three server processes, plainly visible

docker stop c1 c2 c3 && docker rm c1 c2 c3
docker images     # sentiment-api:1.0 is still there, untouched`,
      annotations: {
        2: '-t is repository:tag. The final "." is the BUILD CONTEXT — the directory shipped to the Docker daemon before the build starts, not "build here".',
        5: 'Each container gets its own PID namespace, its own network namespace, and its own thin writable layer. The image is shared read-only.',
        6: 'Different host ports (8001/8002/8003), same container port 8000. Inside each container the app thinks it owns port 8000 — that is the network namespace doing its job.',
        9: 'docker ps lists CONTAINERS (instances). docker images lists IMAGES (templates). Two different nouns, two different commands — this distinction is the whole module.',
        10: 'Three containers did not triple your disk usage. The read-only layers are shared; only the writable layers are per-container.',
        13: 'The proof that a container is not a VM: from the host you can see the processes and kill them with an ordinary kill. Nothing was booted. (On Mac/Windows this runs inside Docker Desktop\'s Linux VM, so you would look from inside that.)',
        16: 'Containers deleted, image intact. Deleting an instance never touches the template — and everything those containers wrote is now gone with their writable layers.',
      },
    },
    {
      type: 'intuition',
      title: 'The Dockerfile, instruction by instruction',
      md: `A Dockerfile is a build script where **each instruction produces a filesystem layer**. Eight instructions cover 95% of real files:

- **FROM** — the base image you start from. Everything else stacks on it.
- **WORKDIR /app** — sets the working directory for every later instruction *and* for the running container. It creates the directory if missing. Use it instead of \`RUN cd\`, which does nothing (each \`RUN\` is a fresh shell).
- **COPY src dst** — copies from the build context into the image. (\`ADD\` also untars archives and fetches URLs; that implicit magic is why the convention is "use COPY unless you specifically need ADD".)
- **RUN cmd** — executes a command *at build time* and commits the result as a layer.
- **ENV KEY=value** — an environment variable baked into the image, present in every container from it.
- **EXPOSE 8000** — **documentation only.** It publishes nothing, opens nothing, and changes no networking. Only \`-p\` on \`docker run\` (or \`ports:\` in compose) actually publishes a port.
- **USER appuser** — everything after this runs as that user. Default is root, and root in the container is root on the host kernel if a mount or capability leaks.
- **CMD / ENTRYPOINT** — what runs when the container starts. Not the same thing; own section below.

Choosing the base is a real decision:

- \`python:3.11-slim\` — Debian, glibc, about 130 MB. **The default answer for ML.**
- \`python:3.11\` — the same thing plus compilers and dev headers, about 1 GB. Handy in a build stage, wasteful as a runtime.
- \`python:3.11-alpine\` — about 50 MB and tempting, but Alpine uses **musl** libc while PyPI's binary wheels are built for **manylinux** (glibc). Result: pip cannot use the prebuilt wheel, falls back to compiling from source, and a 30-second install becomes a 20-minute build — when it works at all. PyTorch publishes no musl wheels. For ML, alpine is a trap that costs more than the 80 MB it saves.`,
    },
    {
      type: 'code',
      lang: 'bash',
      title: 'The Dockerfile everyone writes first — and it does work',
      code: `FROM python:3.11-slim

WORKDIR /app

COPY . .
RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]`,
      annotations: {
        1: 'The base layer. Debian + glibc + CPython 3.11, ~130 MB. Pin the minor version: "python:3" silently becomes 3.13 one morning and your wheels stop matching.',
        3: 'Sets /app as the working directory for every following instruction and for the running container. Creates it if it does not exist.',
        5: 'Copy the whole build context into /app. This line is correct, harmless-looking, and the single most expensive mistake in this file — the layers section explains why.',
        6: '--no-cache-dir stops pip from keeping a copy of every downloaded wheel inside the image. On an ML image that is hundreds of megabytes of pure dead weight.',
        8: 'Pure documentation. It does not open port 8000. Forget -p on docker run and nothing reaches this server, EXPOSE or no EXPOSE.',
        9: '--host 0.0.0.0 is mandatory. Uvicorn defaults to 127.0.0.1, which inside a container means the container\'s own loopback — unreachable from outside, no matter what you publish.',
      },
    },
    {
      type: 'intuition',
      title: 'Layers and the build cache — the most valuable 5 minutes in Docker',
      md: `Each instruction creates a layer. Docker caches layers, and the rule is short and brutal:

- Before running an instruction, Docker computes a cache key. For \`RUN\` that key is the **command string**; for \`COPY\`/\`ADD\` it is the command **plus a checksum of the files being copied**.
- If the key matches a cached layer *and* the parent layer was also a cache hit, Docker reuses it (\`CACHED\` in the build output).
- The moment one instruction misses, **every instruction after it is rebuilt** — cache invalidation cascades downward and never recovers.

So the ordering rule writes itself: **put what changes rarely at the top, what changes constantly at the bottom.**

In the naive file, \`COPY . .\` sits *above* \`RUN pip install\`. Your source code changes fifty times a day. Every one of those changes alters the COPY checksum, invalidates that layer, and therefore invalidates the pip install below it. **Every typo fix reinstalls torch.**

The fix is two lines and it is the same in every language: copy the dependency manifest alone, install, *then* copy the source.

1. \`COPY requirements.txt .\` → changes only when you add a dependency.
2. \`RUN pip install -r requirements.txt\` → cached until (1) changes.
3. \`COPY ./app ./app\` → changes constantly, but it is the **last** layer, so only it rebuilds.

The rebuild-time consequence, measured on a real ML service: naive order, edit one line of Python → **3 min 10 s** (pip redownloads and reinstalls ~2 GB of wheels). Correct order, same edit → **about 4 seconds**. Fifty edits a day is the difference between three hours of waiting and three minutes.`,
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'The build cache, layer by layer',
        notice: 'Left: the Dockerfile instructions, top to bottom. Right: the layers each one produces. Watch which layers survive an edit — invalidation always runs DOWNWARD from the first miss.',
        leftLabel: 'Dockerfile instruction',
        rightLabel: 'image layers',
        frames: [
          {
            note: 'First build, correct ordering. Nothing is cached yet, so all four layers are built: 3 min 10 s, almost all of it pip downloading wheels. You pay this once.',
            stack: [
              { name: 'FROM python:3.11-slim', to: 'L1' },
              { name: 'COPY requirements.txt', to: 'L2' },
              { name: 'RUN pip install -r', to: 'L3' },
              { name: 'COPY ./app ./app', to: 'L4' },
            ],
            heap: [
              { id: 'L1', value: 'base image', label: '130 MB' },
              { id: 'L2', value: 'requirements.txt', label: '1 KB' },
              { id: 'L3', value: 'site-packages', label: '2.1 GB' },
              { id: 'L4', value: 'app source', label: '400 KB' },
            ],
          },
          {
            note: 'You edit one line in app/main.py and rebuild. Layers 1-3 have identical cache keys, so Docker prints CACHED three times and only the last layer is rebuilt. Total: about 4 seconds.',
            stack: [
              { name: 'FROM python:3.11-slim', to: 'L1' },
              { name: 'COPY requirements.txt', to: 'L2' },
              { name: 'RUN pip install -r', to: 'L3' },
              { name: 'COPY ./app ./app', to: 'L4' },
            ],
            heap: [
              { id: 'L1', value: 'base image', label: 'CACHED' },
              { id: 'L2', value: 'requirements.txt', label: 'CACHED' },
              { id: 'L3', value: 'site-packages', label: 'CACHED' },
              { id: 'L4', value: 'app source', label: 'REBUILT' },
            ],
          },
          {
            note: 'Now you actually add a dependency. The COPY of requirements.txt misses on checksum, so everything BELOW it is invalid too — pip reinstalls 2.1 GB of wheels. This one is honest and unavoidable: the dependencies really did change. It happens once a week, not fifty times a day.',
            stack: [
              { name: 'FROM python:3.11-slim', to: 'L1' },
              { name: 'COPY requirements.txt', to: 'L2', danger: true },
              { name: 'RUN pip install -r', to: 'L3', danger: true },
              { name: 'COPY ./app ./app', to: 'L4', danger: true },
            ],
            heap: [
              { id: 'L1', value: 'base image', label: 'CACHED' },
              { id: 'L2', value: 'requirements.txt', label: 'MISS', danger: true },
              { id: 'L3', value: 'site-packages', label: 'RE-RUN', danger: true },
              { id: 'L4', value: 'app source', label: 'REBUILT', danger: true },
            ],
          },
          {
            note: 'The WRONG Dockerfile: COPY . . sits above RUN pip install. A one-character source edit changes that COPY\'s checksum, so pip reinstalls 2.1 GB of wheels — 3 min 10 s — every single time you fix a typo. Same code, same image, wrong order.',
            stack: [
              { name: 'FROM python:3.11-slim', to: 'L1' },
              { name: 'COPY . .   (source!)', to: 'L2', danger: true },
              { name: 'RUN pip install -r', to: 'L3', danger: true },
            ],
            heap: [
              { id: 'L1', value: 'base image', label: 'CACHED' },
              { id: 'L2', value: 'whole repo', label: 'MISS', danger: true },
              { id: 'L3', value: 'site-packages', label: '3m 10s', danger: true },
            ],
          },
          {
            note: 'Reordered: the manifest is copied and installed BEFORE the source. The 2.1 GB dependency layer now sits above everything that changes daily, so it stays cached and your edit-rebuild loop is seconds. Cheap layers at the bottom, expensive layers at the top.',
            stack: [
              { name: 'COPY requirements.txt', to: 'L2' },
              { name: 'RUN pip install -r', to: 'L3' },
              { name: 'COPY ./app ./app', to: 'L4' },
            ],
            heap: [
              { id: 'L2', value: 'requirements.txt', label: 'CACHED' },
              { id: 'L3', value: 'site-packages', label: 'CACHED' },
              { id: 'L4', value: 'app source', label: '4 s' },
            ],
          },
        ],
      },
    },
    {
      type: 'code',
      lang: 'bash',
      title: 'The same Dockerfile, ordered correctly',
      code: `FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \\
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ./app ./app

RUN useradd --create-home --uid 10001 appuser
USER appuser

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]`,
      annotations: {
        3: 'PYTHONUNBUFFERED=1 is not optional in a container: without it Python buffers stdout, so your logs appear in chunks minutes late — or never, if the process is killed. PYTHONDONTWRITEBYTECODE keeps .pyc files out of the image. One ENV instruction, one layer.',
        8: 'The whole trick, line one: copy ONLY the manifest. Its checksum changes when dependencies change, and at no other time.',
        9: 'The expensive layer, now protected. It rebuilds when requirements.txt changes — roughly weekly — instead of on every save.',
        11: 'Source last. It is the cheapest layer to rebuild and the one that changes most, so it belongs at the very bottom of the cache chain.',
        13: 'A fixed numeric UID matters: Kubernetes runAsNonRoot and many security policies check the numeric id, and it keeps file ownership stable across bind mounts.',
        14: 'Everything after this line runs as appuser, including the CMD. Note the consequence: /app is owned by root, so the app can read but not write there — if your code needs a writable cache (Hugging Face downloads, for instance) give it a directory it owns or point HF_HOME at a mounted volume.',
        17: 'Exec form (a JSON array), so uvicorn becomes PID 1 directly and receives SIGTERM from docker stop. The shell form breaks that — see the next section.',
      },
    },
    {
      type: 'intuition',
      title: '.dockerignore, and why the build starts by shipping your repo',
      md: `\`docker build .\` does not build "in this directory". It first **packages that directory and sends it to the Docker daemon** — that is what the "build context" line in the output means. Then the build runs, inside the daemon, against that copy.

- So a repo with a 4 GB \`data/\` folder, a \`.venv/\`, and a \`.git/\` full of history uploads all of it **before the first instruction executes**. Multi-minute builds where the Dockerfile is three lines are almost always this.
- \`.dockerignore\` sits next to the Dockerfile and excludes paths from the context, with the same syntax as \`.gitignore\`.
- It is not only about speed. \`COPY . .\` with no \`.dockerignore\` happily bakes your \`.env\`, your AWS credentials, and your local \`.venv\` (built for the wrong OS) straight into a published image. **Anyone who pulls that image can read those files** — deleting them in a later RUN does not help, because the earlier layer still contains them.
- The cache angle: without \`.dockerignore\`, a stray \`__pycache__\` write or a new file in \`data/\` changes the \`COPY . .\` checksum and busts your cache for no reason at all.`,
    },
    {
      type: 'code',
      lang: 'bash',
      title: '.dockerignore for an ML repo',
      code: `# .dockerignore — same syntax as .gitignore, sits beside the Dockerfile
.git
.venv/
__pycache__/
*.pyc
.pytest_cache/
data/
notebooks/
mlruns/
*.ckpt
*.pt
.env
*.md

# sanity check before you build:
du -sh .              # how big is this directory, really?
docker build -t sentiment-api:1.0 .   # watch the context size in the output`,
      annotations: {
        2: '.git is often the biggest single item in the context and is never needed at runtime. If you want the commit SHA in the image, pass it as a build arg instead.',
        7: 'Datasets and checkpoints do not belong in the build context. If the model must ship inside the image, copy it explicitly from a known path — never by accident via COPY . .',
        12: 'Secrets. A .env baked into a layer is readable by anyone who pulls the image, forever, even if a later instruction deletes it. Layers are append-only.',
        13: 'Exclude *.md and you stop a README typo from busting the source layer\'s cache.',
      },
    },
    {
      type: 'intuition',
      title: 'CMD vs ENTRYPOINT: default arguments vs fixed executable',
      md: `Both say "what runs when the container starts". The difference is what \`docker run image <args>\` does to them.

- **CMD** is a *default*. Arguments passed to \`docker run\` **replace** it entirely.
- **ENTRYPOINT** is a *fixed executable*. Arguments passed to \`docker run\` are **appended** to it.
- Use them together and you get the clean shape: ENTRYPOINT is the binary, CMD is its default arguments — overridable one at a time.

When each is right:

- **CMD alone** for a service whose image you also want to poke at: \`docker run img bash\` gets you a shell without \`--entrypoint\`. This is the common choice for a web/ML API.
- **ENTRYPOINT + CMD** when the image *is* one tool — a CLI, a training job, an ETL step. \`docker run trainer --epochs 5\` reads like a command instead of a wall of arguments.

And the trap that costs a graceful shutdown:

- **Exec form** \`CMD ["uvicorn", "app.main:app"]\` runs the binary directly. It becomes PID 1 and receives SIGTERM.
- **Shell form** \`CMD uvicorn app.main:app\` is silently wrapped as \`/bin/sh -c "uvicorn app.main:app"\`. Now PID 1 is \`sh\`, which does not forward signals. \`docker stop\` sends SIGTERM, \`sh\` ignores it, ten seconds pass, and the kernel SIGKILLs everything mid-request. **Always use the exec form for anything long-running.**`,
    },
    {
      type: 'code',
      lang: 'bash',
      title: 'CMD, ENTRYPOINT, and the signal trap',
      code: `# 1) CMD alone = a DEFAULT command. Any run argument REPLACES it.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0"]
#    docker run img            -> uvicorn app.main:app --host 0.0.0.0
#    docker run img python -V  -> python -V        (the CMD is gone)

# 2) ENTRYPOINT alone = a FIXED executable. Run arguments are APPENDED.
ENTRYPOINT ["python", "-m", "app.cli"]
#    docker run img train --epochs 3 -> python -m app.cli train --epochs 3

# 3) Both = ENTRYPOINT is the binary, CMD is its default arguments.
ENTRYPOINT ["python", "-m", "app.cli"]
CMD ["serve"]
#    docker run img        -> python -m app.cli serve
#    docker run img train  -> python -m app.cli train

# The shell form is the trap. Never use it for a long-running server:
CMD uvicorn app.main:app
#    becomes /bin/sh -c "uvicorn app.main:app"
#    PID 1 is now sh, and sh does not forward SIGTERM to uvicorn.
#    docker stop -> 10 s of nothing -> SIGKILL -> connections cut mid-request.

# Escape hatch when an ENTRYPOINT image will not let you look inside:
#    docker run --rm -it --entrypoint bash myimage:1.0`,
      annotations: {
        2: 'Exec form: a JSON array with DOUBLE quotes. Single quotes are not valid JSON and Docker will reject the line.',
        7: 'This shape makes the image behave like one command. Good for training jobs, ETL steps, and CLI tools — the arguments read naturally.',
        12: 'The overridable default. Run it plain and it serves; run it with "train" and it trains. One image, several jobs — exactly what a CI pipeline wants.',
        17: 'The line that silently breaks graceful shutdown. Your rolling deploys will look fine and drop requests every time.',
        23: '--entrypoint overrides the ENTRYPOINT for one run. The first debugging move on any image whose startup fails immediately.',
      },
    },
    {
      type: 'intuition',
      title: 'Multi-stage builds: compile in one image, ship another',
      md: `You need \`gcc\`, \`build-essential\` and dev headers to *install* some Python packages. You do not need any of them to *run* the result. A multi-stage build separates the two.

- Write several \`FROM\` lines in one Dockerfile. Each starts a fresh stage. Name them with \`AS builder\`.
- The final \`FROM\` is what ships. Everything from earlier stages is discarded **except** what you explicitly \`COPY --from=builder\`.
- For Python, the clean artifact to carry across is a virtualenv: build it at \`/opt/venv\` in the builder, copy that one directory into the runtime stage, and put it on \`PATH\`.

The arithmetic, on a typical CPU ML service:

1. Single stage: 130 MB base + ~400 MB of \`build-essential\` and headers + 350 MB of installed packages + apt lists and pip caches ≈ **1.0–1.2 GB**.
2. Multi-stage: 130 MB base + 350 MB of installed packages ≈ **480 MB**.
3. That is roughly **half to a third**, on every pull, on every node, on every deploy — and a smaller attack surface, because a compiler is no longer sitting in production.

The one rule that makes it work: **both stages must share the same base** (same distro, same Python minor version). You are copying compiled binaries; a venv built on Debian glibc will not run on Alpine musl.`,
    },
    {
      type: 'code',
      lang: 'bash',
      title: 'Multi-stage: builder + slim runtime',
      code: `# ---------- stage 1: build ----------
FROM python:3.11-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \\
      build-essential \\
 && rm -rf /var/lib/apt/lists/*

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ---------- stage 2: runtime ----------
FROM python:3.11-slim

COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

WORKDIR /app
COPY ./app ./app
RUN useradd --create-home --uid 10001 appuser
USER appuser

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]`,
      annotations: {
        2: 'AS builder names the stage so a later stage can copy from it. This whole stage — compilers included — is thrown away at the end.',
        4: 'apt-get update and install MUST be in the same RUN. Split them and a cached "update" layer feeds a stale package index months later, and installs fail with 404s.',
        6: 'rm -rf /var/lib/apt/lists/* in the SAME instruction. A separate RUN would only hide the files: the earlier layer still carries them, and layers are append-only.',
        8: 'A virtualenv is a single self-contained directory — exactly the shape that copies cleanly between stages.',
        15: 'The second FROM starts from a clean slate. Nothing from the builder exists here unless it is copied explicitly.',
        17: 'The only thing that crosses the boundary: the installed packages. build-essential, pip caches and apt lists stay behind in the discarded stage.',
        18: 'Repeat the PATH in this stage. ENV does not carry across a FROM — each stage has its own metadata.',
      },
    },
    {
      type: 'intuition',
      title: 'Volumes: the container filesystem is disposable on purpose',
      md: `Everything a container writes goes into its thin writable layer, and \`docker rm\` deletes that layer. This is a feature — it is what makes containers reproducible — but it means **any state you care about must live outside the container**.

Two mechanisms, one flag:

- **Bind mount** — \`-v /host/path:/container/path\`. A host directory appears inside the container. Whatever you edit on the host is instantly visible inside. This is the **development** tool: mount your source, run uvicorn with \`--reload\`, and edit code without rebuilding the image.
- **Named volume** — \`-v pgdata:/var/lib/postgresql/data\`. Docker manages the storage; you never name a host path. This is the **data** tool: databases, MLflow's artifact store, anything that must survive \`docker rm\` and be portable across machines.

The details that bite:

- A mount **shadows** whatever is at that path in the image. Bind-mount an empty host directory over \`/app\` and your application disappears.
- Bind mounts carry host file ownership. Combine with \`USER appuser\` and you get \`Permission denied\` on files your container can see but not write. Match the UID or mount read-only.
- \`:ro\` makes a mount read-only — the right default for model weights and config.
- Bind mounts on Mac and Windows cross a VM boundary and are noticeably slow for thousands of small files. Named volumes stay inside the VM and are fast.
- Never bind-mount your source in production. The image is supposed to be the complete, immutable artifact — a mount silently makes it a lie.`,
    },
    {
      type: 'code',
      lang: 'bash',
      title: 'The commands you will actually type',
      code: `# build: -t is repo:tag, the trailing "." is the build context
docker build -t sentiment-api:1.0 .

# run in the foreground; delete the container the moment it exits
docker run --rm -p 8000:8000 -e LOG_LEVEL=debug sentiment-api:1.0

# dev loop: source bind-mounted, weights mounted read-only, auto-reload
docker run --rm -p 8000:8000 \\
  -v "$PWD/app:/app/app" \\
  -v "$PWD/models:/models:ro" \\
  sentiment-api:1.0 uvicorn app.main:app --host 0.0.0.0 --reload

# run detached, named, configured from a file
docker run -d --name api -p 8000:8000 --env-file .env sentiment-api:1.0

docker ps                  # running containers
docker ps -a               # plus the dead ones — this is where crashes hide
docker logs -f api         # the container's stdout/stderr, followed
docker exec -it api bash   # a shell INSIDE the running container
docker exec -it api python -c "import torch; print(torch.__version__)"

docker stop api            # SIGTERM, then SIGKILL 10 s later
docker rm api              # the writable layer, and everything in it, is gone
docker images              # what is on this machine
docker system prune -af --volumes    # reclaim disk. Read that line twice.`,
      annotations: {
        5: '-p HOST:CONTAINER, in that order. Flipping it is the single most common Docker mistake: -p 8000:8001 publishes host 8000 to a container port nothing is listening on, and you get an empty reply. -e sets one env var; repeat the flag for more.',
        8: '--rm auto-removes the container on exit. Without it your machine accumulates hundreds of exited containers that each still hold a writable layer.',
        9: 'Bind mount: the host directory replaces /app/app inside the container. Edit a file on your laptop and the running server sees it immediately — no rebuild.',
        10: ':ro is read-only. Weights and config should always be mounted this way; a bug that overwrites a checkpoint is not a bug you want to be possible.',
        11: 'Everything after the image name overrides the CMD. Here that adds --reload for development while the image keeps its production CMD unchanged.',
        14: '--env-file reads KEY=value lines. Prefer it to -e for secrets: values passed with -e are visible forever in docker inspect and in the host process list.',
        17: 'The debugging command. A container that "did nothing" is almost always in this list with a non-zero exit code — 137 means the kernel OOM-killed it (raise the memory limit), 1 means your app crashed (read the logs).',
        19: 'exec starts a NEW process in the container\'s namespaces. -it gives you an interactive terminal. If bash is missing on a slim image, use sh.',
        20: 'The fastest way to answer "is the environment inside the container what I think it is?" — versions, env vars, file paths, GPU visibility.',
        22: 'docker stop is polite: SIGTERM first, so an exec-form CMD can finish in-flight requests. Change the grace period with -t. docker kill skips straight to SIGKILL.',
        25: 'Deletes every stopped container, unused image, build cache AND (because of --volumes) unused named volumes. It will happily delete your local Postgres data. Use "docker image prune" when you only mean to reclaim images.',
      },
    },
    {
      type: 'intuition',
      title: 'Networking: publishing ports, and the 0.0.0.0 trap',
      md: `Each container gets its own network namespace: its own interfaces, its own routing table, its own idea of \`localhost\`. That last one is where everyone loses an afternoon.

- \`-p 8000:8000\` publishes **host port 8000 → container port 8000**. Host first. Without it, nothing outside the container can reach the server at all, whatever \`EXPOSE\` says.
- Inside the container, \`127.0.0.1\` means **the container's own loopback** — a private address that the port publishing never touches. It is not the host's loopback and it is not the container's external interface.
- So a server bound to \`127.0.0.1:8000\` inside a container is reachable **only from inside that container**. From the host you get \`Empty reply from server\` or a connection reset, and \`docker ps\` cheerfully shows the port mapping the whole time.
- The fix is one flag on the server, not on Docker: bind to \`0.0.0.0\` — "all interfaces in this namespace". \`uvicorn --host 0.0.0.0\`, \`gunicorn -b 0.0.0.0:8000\`, \`app.run(host="0.0.0.0")\`. This is the same interface-binding idea from the Linux module in L0, now with a namespace boundary making it unforgiving.
- Container-to-container: put them on a **user-defined network** and Docker's embedded DNS resolves container names. \`docker network create mlnet\`, then \`--network mlnet\`, and the API reaches Postgres at \`db:5432\`. Compose creates such a network for you automatically.
- Between containers you use the **container** port, never the published one: the API talks to \`db:5432\` even if the host publishes 15432. Publishing is only for traffic entering from outside.`,
    },
    {
      type: 'code',
      lang: 'yaml',
      title: 'docker-compose.yml: API + Postgres + Redis in one command',
      code: `# docker compose up -d   /   docker compose logs -f api   /   docker compose down
services:
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://ml:\${POSTGRES_PASSWORD}@db:5432/ml
      REDIS_URL: redis://cache:6379/0
      MODEL_PATH: /models/sentiment-v3.pt
    volumes:
      - ./app:/app/app
      - ./models:/models:ro
    depends_on:
      db:
        condition: service_healthy
      cache:
        condition: service_started

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ml
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}
      POSTGRES_DB: ml
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ml"]
      interval: 5s
      retries: 10

  cache:
    image: redis:7-alpine

volumes:
  pgdata:`,
      annotations: {
        4: 'build: . builds the Dockerfile in this directory. Swap it for "image: ghcr.io/you/sentiment-api:1.0" and the same file deploys a prebuilt image instead.',
        6: 'Only the api publishes a port. db and cache stay on the internal compose network, reachable by service name and by nothing else — the correct default for a database.',
        8: 'Two lessons in one line. "db" is a DNS name compose provides, and 5432 is the CONTAINER port — the internal network does not care what is published. ${...} is substituted from the .env file beside this compose file, so no password is committed.',
        12: 'Bind mount for live reload in development. Delete these two lines for production: the image should be the whole artifact.',
        13: 'Model weights mounted read-only from the host, so a new model version is a restart rather than a rebuild-and-push of a multi-gigabyte image.',
        16: 'depends_on alone only orders STARTUP; it does not wait for readiness. With condition: service_healthy it waits for the healthcheck below, which is what stops the API from crash-looping against a Postgres that is still initialising.',
        27: 'Named volume: the database survives docker compose down. It does NOT survive "down -v" — that flag deletes volumes, and it is the fastest way to lose local data.',
        29: 'The healthcheck that depends_on waits on. pg_isready ships inside the postgres image; CMD-SHELL runs the string through a shell.',
        37: 'Every named volume used above must be declared here. Compose prefixes it with the project name, so two projects never collide.',
      },
    },
    {
      type: 'intuition',
      title: 'The ML-specific realities nobody warns you about',
      md: `Standard Docker advice assumes a 50 MB web app. ML breaks those assumptions in three specific places.

**1. Image bloat is normal, but most of it is avoidable.** A default \`pip install torch\` pulls the CUDA build: the \`nvidia-*\` dependency chain (cuBLAS, cuDNN, NCCL) alone is well over 2 GB, and a finished image of 6–8 GB is routine. If you are serving on CPU — which most classical models and many small transformers do — install from the CPU-only index and the same image drops to a few hundred megabytes:

- \`pip install torch --index-url https://download.pytorch.org/whl/cpu\`
- Put the big, rarely-changing frameworks in their **own RUN layer above** \`requirements.txt\`, so adding \`pandas\` never re-downloads torch.
- Prefer the \`slim\` base, use multi-stage, and clean apt lists in the same RUN. These three habits routinely halve an ML image.

**2. Where do the model weights live?** A genuine tradeoff, and a common interview follow-up:

- **Baked into the image** (\`COPY model.pt /models/\`): the image is one immutable, versioned artifact — the exact code and exact weights that were tested ship together, startup needs no network, and rollback is \`docker run\` on the previous tag. Cost: a multi-gigabyte image for every retrain, slow pushes and pulls, and a full CI build to change a single checkpoint.
- **Mounted or downloaded at startup** (from S3, an MLflow registry, a volume): small images, fast deploys, and new weights without rebuilding. Cost: startup now depends on the network and on credentials, "which model is running?" becomes a runtime question, and two replicas can start with different weights during a rollout.
- The rule of thumb: **bake small weights that version with the code** (under a few hundred MB, retrained rarely); **fetch large or frequently-retrained weights**, pinned by an immutable version or digest, never by \`latest\`, and log the resolved version in every prediction response.

**3. GPUs.** The container ships the CUDA *userspace* libraries; the *driver* stays on the host. That split is why the flag exists and why versions have to line up.`,
    },
    {
      type: 'note',
      md: 'GPU access in one note: install the **NVIDIA Container Toolkit** on the host (the host needs the NVIDIA driver; the container does not), then run `docker run --gpus all ...` — or `--gpus \'"device=0,1"\'` to expose specific GPUs. Verify with `docker run --rm --gpus all nvidia/cuda:12.1.0-base-ubuntu22.04 nvidia-smi`. Two version rules: the CUDA runtime *inside* the image must be supported by the driver *on the host* (drivers are backward compatible, so a newer host driver is fine, an older one is not), and `torch.cuda.is_available()` returning `False` inside a container almost always means a missing `--gpus` flag or a missing toolkit, not a broken PyTorch. In Kubernetes this becomes a `nvidia.com/gpu` resource request instead of a flag — same mechanism, different front door.',
    },
    {
      type: 'code',
      lang: 'bash',
      title: 'The practical: containerizing the FastAPI ML API from Subject 5',
      code: `# ---------- build stage ----------
FROM python:3.11-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends build-essential \\
 && rm -rf /var/lib/apt/lists/*

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# torch alone, CPU-only index, in its own layer: ~200 MB instead of ~2.5 GB
RUN pip install --no-cache-dir torch==2.3.1 \\
      --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ---------- runtime stage ----------
FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends curl \\
 && rm -rf /var/lib/apt/lists/* \\
 && useradd --create-home --uid 10001 appuser

COPY --from=builder /opt/venv /opt/venv

ENV PATH="/opt/venv/bin:$PATH" \\
    PYTHONUNBUFFERED=1 \\
    MODEL_PATH=/models/sentiment-v3.pt

WORKDIR /app
COPY --chown=appuser:appuser ./app ./app
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \\
  CMD curl -fsS http://localhost:8000/healthz || exit 1

CMD ["gunicorn", "app.main:app", "-k", "uvicorn.workers.UvicornWorker", "-w", "2", "-b", "0.0.0.0:8000", "--timeout", "60", "--graceful-timeout", "30"]`,
      annotations: {
        4: 'Compilers live only in the builder stage. The runtime image below never sees build-essential — smaller, and one less thing for an attacker to use.',
        11: 'torch pinned, from the CPU wheel index, in its own RUN. Two wins: the image loses ~2 GB of CUDA libraries you are not using, and this layer stays cached when requirements.txt changes. Keep torch OUT of requirements.txt (or pinned to the identical version) so the next pip run sees it satisfied.',
        15: 'Everything else. Small, and it rebuilds without touching the torch layer above it.',
        20: 'curl is here only for the HEALTHCHECK, and useradd rides along in the same RUN so the runtime stage costs one layer instead of two. Skip curl and use a python -c urllib one-liner if you want the image even smaller — the venv already has Python.',
        24: 'The only thing carried across from the builder: the installed packages.',
        28: 'The weights path is configuration, not code. The image stays the same artifact whether the mounted checkpoint is v3 or v4 — and MODEL_PATH is what your lifespan handler reads at startup.',
        31: '--chown sets ownership at copy time, in one layer. A separate "RUN chown -R" would duplicate every copied file into a new layer and roughly double that part of the image.',
        32: 'Non-root from here on, including the CMD. Note /models is mounted :ro at run time, so this user needs no write access anywhere.',
        36: 'The container-level readiness signal. --start-period=40s is the model-loading grace window from the serving module: the model loads and warms up before a failing healthcheck can mark the container unhealthy. Compose and orchestrators read this status; Kubernetes prefers its own probes.',
        39: 'Exec form, so gunicorn is PID 1 and receives SIGTERM. -w 2 means TWO copies of the model in memory — size this against the container memory limit, not the host. --graceful-timeout drains in-flight requests, which is what makes the rollout zero-downtime.',
      },
    },
    {
      type: 'note',
      md: 'Run it, end to end: `docker build -t sentiment-api:1.0 .` then `docker run -d --name api -p 8000:8000 -v "$PWD/models:/models:ro" -e MODEL_PATH=/models/sentiment-v3.pt sentiment-api:1.0`, then `curl localhost:8000/healthz`. If that curl hangs or returns an empty reply, the checklist is short and in order: is the container in `docker ps` (or did it die into `docker ps -a`)? What do `docker logs api` say? Is the server bound to `0.0.0.0` and not `127.0.0.1`? Is `-p` the right way round? Next module turns this build into a pipeline — GitHub Actions runs lint and tests, builds this exact image, tags it with the commit SHA, and pushes it to a registry.',
    },
  ],
  quiz: [
    {
      question: 'The most precise one-line difference between a container and a VM is:',
      options: [
        {
          text: 'A container is lighter because it has a smaller operating system installed',
          explanation: 'There is no operating system installed in a container at all — no kernel, no init. It reuses the host kernel, which is a different claim entirely.',
        },
        {
          text: 'A VM boots its own kernel on virtualized hardware; a container is an isolated process on the HOST kernel, using namespaces and cgroups',
          explanation: 'Correct. That is the whole distinction, and it explains the millisecond-vs-second startup and the weaker isolation in one breath.',
        },
        { text: 'Containers run only Linux software, VMs run anything', explanation: 'A VM can indeed run a different OS, but that is a consequence of booting its own kernel — not the defining mechanism.' },
      ],
      correct: 1,
    },
    {
      question: 'You run three containers from the same 400 MB image. Roughly how much disk do the images and containers consume?',
      options: [
        {
          text: 'About 400 MB plus three small writable layers — the read-only layers are shared',
          explanation: 'Correct. Containers do not copy the image; they mount its layers read-only and add one thin writable layer each.',
        },
        { text: 'About 1.2 GB — each container gets its own copy', explanation: 'That would make containers nearly as expensive as VMs. Layer sharing is exactly what avoids it.' },
        { text: 'About 400 MB total — containers store nothing at all', explanation: 'Close, but each container does own a writable layer where all its runtime writes land. That layer is deleted by docker rm.' },
      ],
      correct: 0,
    },
    {
      question: 'Your Dockerfile is: FROM, WORKDIR, COPY . ., RUN pip install -r requirements.txt, CMD. You fix a typo in one Python file and rebuild. What happens?',
      options: [
        { text: 'Only the COPY layer rebuilds; pip install stays cached', explanation: 'Cache invalidation cascades DOWNWARD. Once COPY misses, everything below it — including pip install — must rebuild.' },
        { text: 'Nothing rebuilds, because requirements.txt did not change', explanation: 'The COPY copied your source too, so its checksum changed. The cache key for that layer no longer matches.' },
        {
          text: 'The COPY layer misses, so pip reinstalls every dependency from scratch',
          explanation: 'Correct, and this is the whole reason for copying requirements.txt separately and installing before copying source: on an ML image that is minutes of wheel downloads for a one-character edit.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Your Dockerfile has `EXPOSE 8000` and you run `docker run myimage`. You cannot reach the server from your laptop. Why?',
      options: [
        {
          text: 'EXPOSE is documentation only — you must publish the port with -p 8000:8000',
          explanation: 'Correct. EXPOSE records intent in the image metadata and opens nothing. Only -p (or ports: in compose) creates the host-to-container mapping.',
        },
        { text: 'EXPOSE needs a matching EXPOSE on the host', explanation: 'There is no host-side EXPOSE. Port publishing is a run-time flag, not a build-time instruction.' },
        { text: 'You must also add EXPOSE to the docker run command', explanation: 'docker run has no EXPOSE flag. The flag you want is -p, and its absence is the whole problem.' },
      ],
      correct: 0,
    },
    {
      question: 'Everything is right — EXPOSE 8000, `-p 8000:8000`, the container is running — and curl still gets an empty reply. The most likely cause?',
      options: [
        { text: 'The image was built for the wrong architecture', explanation: 'That fails much louder: "exec format error" and the container exits immediately rather than accepting a connection.' },
        { text: 'Docker needs a user-defined network for published ports', explanation: 'Port publishing works on the default bridge network. User-defined networks are about container-to-container DNS, not host access.' },
        {
          text: 'The server is bound to 127.0.0.1 inside the container instead of 0.0.0.0',
          explanation: 'Correct. 127.0.0.1 inside a container is the container\'s own loopback, which the port mapping never touches. Bind to 0.0.0.0 and it works instantly.',
        },
      ],
      correct: 2,
    },
    {
      question: 'What is the practical difference between CMD ["python", "app.py"] and ENTRYPOINT ["python", "app.py"]?',
      options: [
        { text: 'ENTRYPOINT runs at build time, CMD at run time', explanation: 'Both run at container start. RUN is the build-time instruction.' },
        {
          text: 'Arguments to `docker run` REPLACE a CMD but are APPENDED to an ENTRYPOINT',
          explanation: 'Correct. That is why CMD suits an overridable default (docker run img bash) and ENTRYPOINT suits an image that IS one tool (docker run img --epochs 5).',
        },
        { text: 'CMD can only be used once, ENTRYPOINT can be repeated', explanation: 'Both are single-valued — a later one simply overrides the earlier. That is not the difference being tested.' },
      ],
      correct: 1,
    },
    {
      question: 'A container writes a 2 GB checkpoint to /app/out/model.pt. You run `docker stop` then `docker rm`, and start a new container from the same image. Where is the file?',
      options: [
        { text: 'In the image — the write was committed on stop', explanation: 'Images are immutable and nothing commits automatically. Only docker build (or an explicit docker commit) creates image content.' },
        {
          text: 'Gone — it lived in the container\'s writable layer, which docker rm deleted',
          explanation: 'Correct. Anything that must survive belongs on a bind mount or a named volume, mounted at that path before the container writes to it.',
        },
        { text: 'On the host, under the working directory you ran docker from', explanation: 'Only if you had bind-mounted that path. Without a mount, container paths have nothing to do with host paths.' },
      ],
      correct: 1,
    },
    {
      question: 'Your 7 GB CPU-only inference image needs to shrink. Which change delivers the biggest single win?',
      options: [
        {
          text: 'Install torch from the CPU-only wheel index instead of the default CUDA build',
          explanation: 'Correct. The default torch install drags in the nvidia-* CUDA libraries — well over 2 GB you never execute on a CPU node. This one flag usually removes more than everything else combined.',
        },
        { text: 'Switch the base image to alpine', explanation: 'It saves ~80 MB of base and costs you glibc: manylinux wheels stop applying, pip compiles from source, and torch has no musl wheels at all. Wrong trade for ML.' },
        { text: 'Merge the RUN instructions into one line', explanation: 'Fewer layers is tidy and does help when it lets you delete apt caches in the same instruction, but it does not touch the multi-gigabyte CUDA dependency chain.' },
      ],
      correct: 0,
    },
  ],
  interviewQuestions: [
    {
      question: 'What is the difference between a Docker image and a container?',
      answer:
        'An image is an immutable, layered filesystem template plus metadata — the base OS files, your dependencies, your code, and settings like the default command, environment variables and exposed ports. It is produced by docker build and nothing at runtime can change it. A container is a running instance of an image: those layers mounted read-only, with one thin writable layer on top, running inside its own namespaces and cgroups. The relationship is class to object — but say the mechanism, because that is what is being graded. Three consequences worth adding unprompted: one image can back a hundred containers with the read-only layers shared on disk, so containers are cheap; everything a container writes lands in its writable layer and dies with docker rm, which is why state goes on a volume; and images are addressed by tag but identified by digest, so production should pin the sha256 rather than a movable tag like latest.',
      isCaseBased: false,
    },
    {
      question: 'Is a container just a lightweight VM? Explain what is actually happening.',
      answer:
        'No, and the difference is mechanical, not a matter of degree. A VM runs a hypervisor that virtualizes hardware, and on that hardware a full guest OS boots its own kernel, its own init and its own memory management — gigabytes of image and seconds to start. A container is an ordinary process running on the HOST kernel with two kernel features applied: namespaces restrict what it can see (its own PID tree so it is PID 1, its own mount namespace so / is the image, its own network stack, hostname and users), and cgroups restrict what it can consume (CPU shares, a memory ceiling whose breach produces the OOM kill and exit code 137). No second kernel is booted, so startup is roughly fork plus exec — milliseconds — which is exactly why CI jobs and Kubernetes rescheduling are viable on containers and were painful on VMs. The honest tradeoff to volunteer: sharing a kernel means weaker isolation, so a kernel vulnerability crosses every container on the host, which is why untrusted multi-tenant workloads still use VMs or VM-backed sandboxes like Firecracker and gVisor. And on macOS or Windows there is a Linux VM underneath Docker Desktop, because a Linux container needs a Linux kernel.',
      isCaseBased: false,
    },
    {
      question: 'Case: a teammate complains that every code change triggers a five-minute Docker build. Diagnose it and give the fix, with the reasoning.',
      answer:
        'Almost certainly instruction order. I would look for COPY . . above the dependency install. Each instruction is a layer with a cache key — for COPY it includes a checksum of the copied files — and when one instruction misses, every instruction below it is rebuilt. Copying the whole source before pip install means any source edit changes that checksum and invalidates the install layer underneath, so pip re-downloads and reinstalls every wheel, which on an ML image is a couple of gigabytes. The fix is to copy the manifest alone, install, then copy the source: COPY requirements.txt, RUN pip install, COPY ./app ./app. Now the expensive layer is invalidated only when dependencies actually change, and a code edit rebuilds a 400 KB layer in seconds. Second thing I would check is the build context: without a .dockerignore, docker build ships .git, .venv and data/ to the daemon before the first instruction runs, which can be minutes on its own. Beyond that: split rarely-changing heavy frameworks like torch into their own RUN layer above requirements.txt, and if this is CI rather than a laptop, the cache is cold every run, so enable registry-backed build cache — otherwise the ordering fix helps locally and does nothing in the pipeline.',
      isCaseBased: true,
    },
    {
      question: 'Explain Docker layers and the build cache precisely enough that I could implement the rule.',
      answer:
        'Every instruction in a Dockerfile produces a read-only layer — a diff of filesystem changes — and an image is those layers stacked with a union filesystem. Before executing an instruction, Docker computes a cache key: for RUN it is essentially the command string, and for COPY and ADD it is the instruction plus a checksum of the files involved. Note what that implies: RUN does not inspect the world, so RUN apt-get update can be served from a months-old cache with a stale package index, which is why update and install must live in the same instruction. A cached layer is reused only if its key matches AND its parent was also a hit, so invalidation cascades strictly downward and never recovers. The implementable rule: order instructions from least to most frequently changing — base image, system packages, dependency manifest, dependency install, then source. Two corollaries people miss: layers are append-only, so deleting a file in a later RUN does not shrink the image and does not remove a leaked secret from the earlier layer, which is why cleanup must happen inside the same instruction that created the mess; and image size is the sum of layers, so a downloaded-then-deleted 2 GB tarball still costs you 2 GB unless the download and delete are one RUN.',
      isCaseBased: false,
    },
    {
      question: 'Walk me through a production Dockerfile for a Python ML API. What is in it and why?',
      answer:
        'Multi-stage. Stage one from python:3.11-slim as builder: apt-get update and install build-essential in a single RUN with rm -rf /var/lib/apt/lists/* in the same instruction, create a venv at /opt/venv, install torch from the CPU-only wheel index in its own layer, then COPY requirements.txt and pip install. Stage two from the same python:3.11-slim: create a non-root user with a fixed UID, COPY --from=builder /opt/venv /opt/venv, set PATH, PYTHONUNBUFFERED=1 and the model path as ENV, WORKDIR /app, COPY --chown the source, USER appuser, EXPOSE 8000 for documentation, a HEALTHCHECK with a start period long enough for model load and warmup, and an exec-form CMD running gunicorn with uvicorn workers bound to 0.0.0.0:8000. The reasoning per choice: slim over alpine because manylinux wheels need glibc; multi-stage because compilers are build-time only and cutting them roughly halves the image and shrinks the attack surface; manifest-before-source for cache; CPU-only torch because the CUDA dependency chain is over 2 GB of libraries a CPU node never executes; non-root because container root is uncomfortably close to host root; exec form because shell form makes /bin/sh PID 1 and SIGTERM is never forwarded, so docker stop always ends in SIGKILL and dropped requests; 0.0.0.0 because 127.0.0.1 inside a container is unreachable from outside. Plus a .dockerignore excluding .git, .venv, data and .env — for build speed and because a baked .env is readable by anyone who pulls the image.',
      isCaseBased: false,
    },
    {
      question: 'CMD or ENTRYPOINT — how do you choose, and what breaks if you use the shell form?',
      answer:
        'CMD is a default that docker run arguments replace outright; ENTRYPOINT is a fixed executable that docker run arguments are appended to; using both gives you ENTRYPOINT as the binary and CMD as its default arguments. I pick CMD alone for a service image, because I want docker run img bash to work for debugging without --entrypoint. I pick ENTRYPOINT plus CMD when the image is one tool — a trainer or an ETL step — so docker run trainer --epochs 5 reads like a command. The shell form is the real trap: CMD uvicorn app.main:app is rewritten as /bin/sh -c "uvicorn app.main:app", so PID 1 becomes sh, and sh does not forward signals to its child. docker stop sends SIGTERM, nothing happens, and ten seconds later the kernel SIGKILLs the whole thing mid-request. In Kubernetes it is the same story on every rolling update, and it shows up as mysterious dropped connections during deploys that nobody can reproduce. Exec form — the JSON array — makes your process PID 1 and gives it the signal, so graceful shutdown works. Related PID 1 detail worth mentioning: a process running as PID 1 also does not reap zombies, so if your app spawns children, use an init like tini or docker run --init.',
      isCaseBased: false,
    },
    {
      question: 'How should model weights be shipped — baked into the image, or fetched at startup?',
      answer:
        'It is a genuine tradeoff and I would state both sides before choosing. Baking them in with COPY makes the image one immutable artifact: the exact code and exact weights that passed testing ship together, startup needs no network or credentials, rollback is running the previous tag, and reproducing an incident is trivial because the tag fully determines behaviour. The cost is size and velocity — a multi-gigabyte image per retrain, slow pushes, slow pulls onto every node, cache churn in the registry, and a full CI build to change one checkpoint. Fetching at startup from S3 or a model registry keeps the image small and lets you roll new weights without rebuilding, but startup now depends on network and IAM, the question "which model is serving?" becomes a runtime question rather than an image property, and during a rollout two replicas can legitimately be running different weights. My rule: bake weights that are small and change with the code — a few hundred megabytes, retrained rarely. Fetch weights that are large or retrained frequently, but only pinned to an immutable version or digest, never a mutable pointer like latest or a bucket path that gets overwritten, and cache them on a volume so a restart is not a re-download. Either way the model version must be an explicit input, logged and returned in every prediction response, so a logged prediction always maps to specific weights.',
      isCaseBased: false,
    },
    {
      question: 'Case: your ML image is 8 GB, deploys take fifteen minutes, and the platform team is unhappy. How do you attack it?',
      answer:
        'Measure first: docker history shows the size of every layer, so I know within a minute whether the weight is CUDA libraries, apt packages, a baked dataset, or the model itself. Typical order of wins. One, CUDA: a default pip install torch drags in the nvidia-* chain — cuBLAS, cuDNN, NCCL — for over 2 GB, so if the service runs on CPU, installing from the CPU-only index deletes most of the image in one line; if it genuinely needs GPU, a runtime CUDA base beats a devel base. Two, multi-stage: build-essential and headers are build-time only, so copying just the venv into a slim runtime stage typically removes 400 MB and a compiler from production. Three, the build context and baked data: a .dockerignore excluding .git, .venv, data and notebooks often removes gigabytes that arrived through a careless COPY . . — and if a dataset or checkpoint is baked in, move it to a mounted volume or fetch it at startup, pinned by version. Four, hygiene: apt-get install with --no-install-recommends, rm -rf /var/lib/apt/lists/* in the same RUN, pip --no-cache-dir, and no download-then-delete across separate instructions, because layers are append-only and the bytes stay. Then attack the fifteen minutes separately from the size: registry-backed layer caching in CI so unchanged dependency layers are never rebuilt, and ordering so the multi-gigabyte layer is stable across builds — an 8 GB image whose bottom 7 GB never changes pulls almost instantly on a warm node, because Docker only fetches layers it lacks. That last point matters: layer stability often buys more than raw size.',
      isCaseBased: true,
    },
    {
      question: 'What is a volume, why do containers need one, and when is a bind mount the wrong choice?',
      answer:
        'A container writes into a thin writable layer that is created with the container and deleted by docker rm, so by default all state is disposable — which is deliberate, because it is what makes containers reproducible. A volume mounts storage from outside that lifecycle at a path inside the container. Two kinds. A bind mount maps a specific host directory in; it is the development tool, because mounting your source and running uvicorn --reload lets you edit code without rebuilding. A named volume is storage Docker manages with no host path involved; it is the data tool, for databases, MLflow artifact stores, and model caches, and it survives docker rm and moves between machines. When bind mounts are wrong: in production, because the image is supposed to be the complete artifact and a mount silently makes that false — a container that only works when the right host directory exists is not portable. Also when host UIDs do not match a non-root container user, which produces permission-denied on files the container can plainly see. And on Mac and Windows, where bind mounts cross a VM boundary and are painfully slow for node_modules-sized trees. Two gotchas to name: a mount shadows whatever the image had at that path, so bind-mounting an empty directory over /app makes your application vanish; and mount read-only with :ro whenever the container has no business writing — model weights and config especially.',
      isCaseBased: false,
    },
    {
      question: 'Case: you deploy the ML API container. `docker ps` shows it running with 0.0.0.0:8000->8000/tcp, but `curl localhost:8000/healthz` returns an empty reply. Debug it out loud.',
      answer:
        'The mapping exists and the container is alive, so the request is reaching the container and dying there. My first hypothesis is the classic: the server is bound to 127.0.0.1 inside the container. Inside a network namespace that address is the container\'s own loopback, which port publishing never touches, so the connection is accepted by Docker\'s proxy and then refused inside. I would confirm with docker logs api — uvicorn prints the address it bound — and fix it with --host 0.0.0.0, or -b 0.0.0.0:8000 for gunicorn. Second hypothesis, if it is bound correctly: the port arguments are flipped or mismatched, -p 8000:8001 while the app listens on 8000, and docker ps will show the mapping so I read it carefully. Third: the app is still starting — a model load plus warmup can take thirty seconds, and during that window the socket may not be open yet, which is exactly what HEALTHCHECK --start-period exists to cover. Fourth: the process crashed after the port mapping was set up, so I check docker ps -a for an exited container and its exit code — 137 means OOM-killed by the memory cgroup, and a large model in a container with a small memory limit is a very common version of this. To pin it down definitively I would go inside: docker exec -it api sh, then curl 127.0.0.1:8000/healthz from within. If that works and it fails from the host, it is a binding or publishing problem; if it fails from inside too, it is the application. The generalizable lesson: publishing a port only builds the road — the server still has to be listening on an address the road reaches.',
      isCaseBased: true,
    },
    {
      question: 'When does docker-compose stop being the right tool?',
      answer:
        'Compose is excellent for exactly one machine: it declares a set of services, a network where they resolve each other by service name, volumes and healthchecks in one file, and docker compose up gives a new teammate a working API, Postgres and Redis in a minute. It also documents the topology better than a README. It stops being right the moment you need more than one host, because it has no scheduler: no bin-packing across nodes, no rescheduling when a node dies, no rolling update with health gating and automatic rollback, no horizontal autoscaling, no service abstraction with load balancing across replicas, and no real secret management — it reads a .env file. That list is the definition of what Kubernetes provides, which is why the progression in practice is compose for local development and CI integration tests, and Kubernetes (or a managed runtime like ECS or Cloud Run) for production. What makes that migration cheap is that the image does not change — a well-built image is the portable unit, and compose versus Kubernetes is only a question of who starts it and how.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'Image vs container', back: 'Image: immutable layered filesystem template + metadata, built once. Container: a running instance — those layers read-only plus ONE thin writable layer, in its own namespaces/cgroups. One image, many containers, layers shared.' },
    { front: 'Container vs VM (the interview line)', back: 'A VM boots its own kernel on virtualized hardware. A container is an isolated PROCESS on the host kernel: namespaces for what it can see, cgroups for what it can use. Milliseconds vs seconds to start; weaker isolation.' },
    { front: 'The build-cache rule', back: 'Each instruction is a layer with a cache key (RUN: the command; COPY: command + file checksum). One miss invalidates every layer BELOW it. Order least-changing to most-changing.' },
    { front: 'Why COPY requirements.txt before COPY .', back: 'Source changes constantly. If it is copied above pip install, every edit invalidates the install layer and reinstalls ~2 GB of wheels. Manifest first: 3 min rebuilds become ~4 s.' },
    { front: 'EXPOSE does what?', back: 'Documentation only. It publishes nothing. Only -p HOST:CONTAINER on docker run (or ports: in compose) actually maps a port.' },
    { front: 'The 0.0.0.0 trap', back: '127.0.0.1 inside a container is the CONTAINER\'s loopback — unreachable from outside no matter what you publish. Bind the server to 0.0.0.0 (uvicorn --host 0.0.0.0).' },
    { front: 'CMD vs ENTRYPOINT (+ exec vs shell form)', back: 'docker run args REPLACE a CMD, but are APPENDED to an ENTRYPOINT. Exec form ["a","b"] makes your process PID 1 and it gets SIGTERM; shell form wraps in /bin/sh -c, so SIGTERM is swallowed and docker stop ends in SIGKILL.' },
    { front: 'Multi-stage build', back: 'FROM ... AS builder installs with compilers; the final FROM copies only the artifact (COPY --from=builder /opt/venv /opt/venv). Roughly 1.1 GB → 480 MB, and no compiler in production. Both stages must share the same base.' },
    { front: 'Bind mount vs named volume', back: 'Bind mount (-v /host/path:/app) = development, live code reload, host ownership and slow on Mac/Windows. Named volume (-v pgdata:/var/lib/...) = data that must outlive docker rm. Mounts SHADOW the image path; use :ro for weights.' },
    { front: 'ML image bloat + weights', back: 'Default pip install torch pulls >2 GB of nvidia-* CUDA libs — use the CPU-only index when serving on CPU, in its own layer. Weights: bake them in when small and versioned with the code (immutable, offline start); fetch/mount when large or retrained often (small image, but pin the version).' },
  ],
  mindmapMarkdown: `- Docker: Images, Layers & the ML API
  - Container = a process, not a VM
    - Host kernel; namespaces (what it sees) + cgroups (what it uses)
    - Milliseconds to start; weaker isolation than a VM
  - Image vs container
    - Image: immutable layered template; tag vs sha256 digest
    - Container: instance + thin writable layer, gone on rm
    - One image, many containers, layers shared on disk
  - Dockerfile
    - FROM, WORKDIR, COPY, RUN, ENV, USER (non-root)
    - EXPOSE is documentation only; -p is what publishes
    - CMD replaced by run args / ENTRYPOINT appended to
    - Exec form, or /bin/sh swallows SIGTERM
    - slim over alpine: musl breaks manylinux wheels
  - Layers & the build cache
    - One instruction = one layer (RUN command / COPY checksum)
    - A miss invalidates every layer BELOW it
    - requirements.txt first, source last: 3m10s -> 4s
    - Append-only: a later delete never shrinks the image
    - .dockerignore — the context ships to the daemon first
  - Multi-stage
    - FROM ... AS builder; COPY --from=builder /opt/venv
    - ~1.1 GB -> ~480 MB, and no compiler in production
  - Volumes
    - Container filesystem is ephemeral by design
    - Bind mount = dev reload; named volume = data that survives
  - Networking
    - -p HOST:CONTAINER; bind 0.0.0.0, never 127.0.0.1
    - compose: service-name DNS, container port not the published one
  - Commands
    - build -t; run -p -e -v --rm -d; ps -a, logs -f, exec -it, prune
  - ML realities
    - torch CUDA chain > 2 GB -> CPU-only wheel index
    - Weights: baked (immutable) vs mounted (small image)
    - --gpus all + NVIDIA Container Toolkit`,
}

export default m
