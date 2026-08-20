import type { Module } from '../types'

const m: Module = {
  id: 'mlops-l0-git',
  subjectId: 'mlops',
  level: 0,
  title: 'Git Properly: Branching, Merge vs Rebase & Conflicts',
  whyItMatters:
    '"What happens on git rebase" is a named interview theme in this track, and it is the question that separates people who memorized commands from people who understand the model. Everything after this module — CI pipelines, DVC, model versioning, GitOps deploys — is triggered by a git push. If your mental model of git is "type the magic words and hope", every one of those systems stays scary.',
  estMinutes: 50,
  sections: [
    {
      type: 'intuition',
      title: 'Three nouns, and git stops being scary',
      md: `Git looks impossible until you learn what three words actually mean. Then most commands become obvious.

- A **commit** is a *snapshot* of your whole tracked project, plus a pointer to its parent commit. Not a diff — a full picture, with a "what came before me" arrow.
- Those arrows make a **DAG**: a graph of snapshots pointing backwards in time. Your project history *is* that graph.
- A **branch** is a movable *label* stuck on one commit. \`main\` is not a place, a copy, or a folder. It is a sticky note with a hash on it.
- **HEAD** is a label pointing at *your current branch*. It answers "where does my next commit attach?"
- Commit: create a new snapshot, then slide the current branch label forward onto it. That is the entire operation.`,
    },
    {
      type: 'note',
      md: 'Why "snapshot, not diff" matters: git can show you a diff between any two commits, but it *stores* whole trees, deduplicated by content hash. Ten commits that each change one line do not store ten copies of the repo — identical files share one object. This is why `git checkout` of a 5-year-old commit is instant, and why every commit id (`4f2a1c9…`) is a SHA-1 of its content **and its parent** — change any byte of history and every hash after it changes too. Hold on to that sentence; it is the whole reason rebase is dangerous on shared branches.',
    },
    {
      type: 'intuition',
      title: 'The three areas: your desk, the outbox, the archive',
      md: `You are writing a report. Papers are scattered on your **desk**. You put the finished pages in an **outbox**. At the end of the day the outbox contents are filed in the **archive** with a date on it.

- **Working directory** — the actual files on disk. Messy, half-finished, full of debug prints.
- **Staging area** (the *index*) — the outbox. What you have chosen to include in the next commit.
- **Repository** (\`.git/\`) — the archive of permanent snapshots.
- \`git add\` moves work desk → outbox. \`git commit\` moves outbox → archive.
- \`git restore\` wipes the desk back to the outbox. \`git restore --staged\` empties the outbox back to the desk.
- \`git status\` is just a report on which of the three areas your files are sitting in. Run it constantly.`,
    },
    {
      type: 'code',
      lang: 'bash',
      title: 'The three areas, one command at a time',
      code: `git status                     # what is in each of the three areas, right now
git add train.py               # working directory -> staging area (a.k.a. the index)
git add -p train.py            # stage SOME hunks of a file and leave the rest dirty
git commit -m "feat: cache embeddings"   # staging area -> repository (a new snapshot)

git diff                       # working dir vs staging: what you have NOT staged
git diff --staged              # staging vs last commit: what you are ABOUT to commit

git restore train.py           # discard working-dir edits          (unrecoverable)
git restore --staged train.py  # unstage but keep the edits         (safe)

git log --oneline --graph --decorate --all   # the commit DAG, in the terminal`,
      annotations: {
        1: 'The single most useful command in git. It literally prints the three areas as three lists.',
        2: 'add does NOT mean "add a new file". It means "copy this file\'s current content into the outbox".',
        3: '-p walks you through the file hunk by hunk: y/n each. This is how you leave the debug print behind.',
        4: 'A commit snapshots the STAGING AREA, not your disk. Edits you never staged are simply not in it.',
        7: 'The pre-commit review that catches 90% of accidents: a stray print, a hardcoded key, a commented-out block.',
        9: 'The one truly destructive command here. Those edits were never in git, so git cannot bring them back.',
        12: '--graph draws the branch structure in ASCII. If you learn one log invocation, learn this one.',
      },
    },
    {
      type: 'note',
      md: 'The staging area exists so a **messy working tree can produce a clean commit**. Real work is never one tidy change: while fixing the data loader you also renamed a variable, added a print, and started a second feature. Staging lets you ship *only* the loader fix as one reviewable commit and keep the rest on your desk. `git add -p` is the tool for that — it stages individual hunks, not whole files. A commit that does one thing is easier to review, easier to revert, and easier to bisect when something breaks in three weeks.',
    },
    {
      type: 'intuition',
      title: 'Branches are labels, which is why they are free',
      md: `In SVN, branching copied the whole tree. In git, a branch is a file containing 41 bytes: a 40-character hash and a newline.

- \`git switch -c feat/drift-alert\` writes that file and points HEAD at it. Nothing is copied. It is instant on a 4 GB repo.
- Because branches are free, use them freely: **one branch per unit of work**, not one per person and not one per month.
- Switching branches rewrites your working directory to match that branch's snapshot. Commit or stash first, or git will refuse.
- \`git branch\` only *creates* a label. \`git switch\` moves HEAD. \`git switch -c\` does both — that is why it is the one you type.
- **Detached HEAD** is just HEAD pointing straight at a commit instead of at a branch. Not broken; commits made there belong to no label and get garbage-collected. Escape with \`git switch -c rescue\`.`,
    },
    {
      type: 'code',
      lang: 'bash',
      title: 'Branching, and the files underneath it',
      code: `git switch -c feat/drift-alert    # create the branch AND move HEAD onto it
git switch main                   # HEAD -> main; the working tree swaps to main's snapshot
git branch -vv                    # local branches, their tips, and their upstreams

cat .git/HEAD                     # ref: refs/heads/main   <- HEAD points at a BRANCH
cat .git/refs/heads/main          # 9f2c1ab...  <- 40 hex chars + newline = 41 bytes

git checkout -b feat/drift-alert  # the old spelling of "switch -c" (still works everywhere)
git checkout main -- train.py     # ...and checkout ALSO restores files: one verb, two jobs
git switch --detach 9f2c1ab       # HEAD points straight at a commit = "detached HEAD"`,
      annotations: {
        1: 'Naming convention worth adopting: type/short-description. feat/, fix/, chore/ — greppable and self-documenting.',
        2: 'This is why git refuses to switch with uncommitted changes that would be overwritten: it is about to rewrite your files.',
        5: 'Proof that HEAD is a pointer TO A BRANCH, not to a commit. Detached HEAD is when this line holds a raw hash instead.',
        6: 'The whole branch. If this file is missing, the ref was packed into .git/packed-refs — same 41 bytes of information.',
        8: 'checkout was overloaded: it switched branches AND restored files. That ambiguity is exactly why git split it into switch + restore in 2.23.',
        9: 'Same command, completely different job: overwrite train.py from main. Type this by accident and your edits are gone.',
        10: 'Useful for "let me look at last week\'s model code". Any commit you make here has no branch pointing at it.',
      },
    },
    {
      type: 'note',
      md: 'A branching model in one paragraph. **Trunk-based** is what almost every fast team runs and what you should default to: `main` is always deployable, feature branches live *hours to two days*, they merge back small, and unfinished work hides behind a feature flag. **git-flow** adds `develop`, `release/*` and `hotfix/*` branches on top; it was designed for versioned software with scheduled releases, and on a continuously deployed service it mostly buys you long-lived branches that drift apart and conflict horribly. Pick git-flow only if you genuinely ship versioned releases. The real variable is not the diagram — it is **how long a branch lives**. Short branches make every other problem in this module smaller.',
    },
    {
      type: 'intuition',
      title: 'Merge vs rebase: the question they always ask',
      md: `You branched off \`main\` and wrote 3 commits. Meanwhile main got 5 new commits. The histories have diverged. Two ways to reunite them.

- **Merge** ties the two lines together with a **merge commit — a commit with TWO parents**. Nothing is rewritten. History is true: it shows that the work really happened in parallel, mess included.
- **Rebase** takes your 3 commits, sets them aside, moves your branch to the tip of main, and **replays** them one at a time. The result is a straight line, as if you had started your work this morning.
- The catch nobody says out loud: replayed commits are **new commits with new hashes**. The originals still exist, orphaned. Rebase does not move your work — it *copies* it and abandons the originals.
- Merge preserves truth and clutters the graph. Rebase gives a clean readable line and lies slightly about when the work happened.
- **The golden rule: never rebase commits that other people have already pulled.** Their clone has the originals, yours has the copies, and git cannot tell they are "the same" work.`,
    },
    { type: 'visual', component: 'GitBranchPlayground', props: {} },
    {
      type: 'note',
      md: 'Drive it in this exact order and the whole module lands. **Commit** twice — notice only the label slides forward. **Branch**, and notice HEAD is *still* on main: creating a label is not moving to it. **Switch**, then **commit** on feature while committing on main too — that is divergence. Now **merge**: a new node appears with two arrows going back — the knot. Reset and try the other path: **rebase**. Your feature commits are redrawn on top of main and the old ones stay behind as **ghosts**. Those ghosts are the golden rule made visible: if a teammate had pulled the originals, they are now holding commits that your branch no longer contains, and their next `git pull` will try to merge the ghosts back in — the same change appearing twice, conflicting with itself.',
    },
    {
      type: 'code',
      lang: 'bash',
      title: 'The three ways to integrate a branch',
      code: `# ---- merge: preserve what really happened ----
git switch main
git merge feat/drift-alert            # fast-forwards if main never moved
git merge --no-ff feat/drift-alert    # force a merge commit even when FF was possible
git merge --squash feat/drift-alert   # stage the whole diff as ONE change...
git commit -m "feat: drift alerting"  # ...then you write the single commit yourself

# ---- rebase: replay my commits onto a new base ----
git switch feat/drift-alert
git fetch origin                      # update origin/main WITHOUT touching my branch
git rebase origin/main                # my commits are re-created: new parents, NEW hashes
git push --force-with-lease           # required after rewriting; never plain --force

git log --oneline --graph --all       # look at the shape you just created`,
      annotations: {
        3: 'FAST-FORWARD: if main has not moved since you branched, there is nothing to tie together — git just slides the main label onto your tip. No merge commit exists.',
        4: '--no-ff forces the knot anyway, so the branch is visible in history as a unit and revertable with one command. Many teams set this as the default for main.',
        5: 'SQUASH: takes the branch\'s net effect and stages it. Your 11 "wip", "fix typo", "actually fix" commits collapse into one. The branch itself is NOT recorded as merged.',
        10: 'fetch downloads; it never changes your files. pull = fetch + merge (or + rebase with --rebase). Fetching first lets you look before you leap.',
        11: 'The interview sentence: rebase does not move commits, it re-creates them. New parent means new hash means a different commit object.',
        12: '--force-with-lease refuses if someone else pushed since your last fetch. Plain --force silently deletes their work. Learn the long one.',
      },
    },
    {
      type: 'note',
      md: 'Which of the three does a team pick? **Merge commit (`--no-ff`)** keeps the true shape and makes a whole feature revertable in one go — the safest default, at the cost of a busy graph. **Squash** gives `main` one clean commit per feature and is popular because it lets people commit sloppily on their own branch; you lose the intermediate steps, which hurts `git bisect` on large features. **Rebase-and-merge** gives a perfectly linear main with every individual commit preserved — beautiful history, but it demands that each commit actually builds, and it rewrites hashes. There is no universal right answer; the answer an interviewer wants is *"linear-and-readable versus true-and-safe, and here is which one my team optimized for."*',
    },
    {
      type: 'intuition',
      title: 'Conflicts: git refusing to guess',
      md: `A conflict is not an error. It is git saying "two branches changed the same lines and I will not pick for you."

- Git merges by lines. Different files, or different regions of one file — automatic, silently. The **same lines**, changed on both sides — conflict.
- It marks the file with three markers and stops. Nothing is lost; both versions are sitting right there in the file.
- The resolution is always the same three steps: **edit the file, \`git add\` it, continue.** \`add\` is how you say "I resolved this."
- The confusing part during a *rebase*: \`HEAD\` is the branch you are landing **on** (main), and the bottom half is **your** commit being replayed. That is the reverse of a merge, where HEAD is your branch and the bottom half is theirs.
- \`git rebase --abort\` / \`git merge --abort\` puts everything back exactly as it was. There is no point at which you are trapped.`,
    },
    {
      type: 'code',
      lang: 'bash',
      title: 'A real conflict, start to finish',
      code: `$ git rebase origin/main
Auto-merging train.py
CONFLICT (content): Merge conflict in train.py
error: could not apply 4f2a1c9... bump learning rate
hint: Resolve all conflicts manually, mark them resolved with
hint: "git add/rm <conflicted_files>", then run "git rebase --continue".

$ git status --short
UU train.py

$ cat train.py
LR = 3e-4
<<<<<<< HEAD
BATCH = 64        # the side you are landing ON (origin/main)
=======
BATCH = 128       # YOUR commit, being replayed
>>>>>>> 4f2a1c9 (bump learning rate)
MAX_STEPS = 5000

# now: edit the file, delete all THREE marker lines, keep the code you actually want
$ git add train.py
$ git rebase --continue
$ git rebase --abort`,
      annotations: {
        3: 'Auto-merging happened for every other region of the file. Only the overlapping lines stopped it.',
        4: '"could not apply" names the specific commit of yours that collided. In a long rebase you will see this once per conflicting commit.',
        9: 'UU = unmerged on both sides. --short shows a two-letter status per file; U on either side means "needs a human".',
        13: 'Everything between this marker and ======= is the version already on the base you are replaying onto.',
        15: 'The dividing line. Nothing else about it is special — it is just the fence between the two versions.',
        17: 'The closing marker carries the label of the incoming commit. During a REBASE that is yours; during a MERGE it is theirs. Read the label, do not assume.',
        20: 'Resolution can be either side, or a mix, or entirely new code. Nobody checks that you kept one of the two — you own the merged result.',
        21: 'add = "resolved". This is the step everyone forgets, then wonders why --continue complains.',
        22: 'Replays the next commit, which may conflict too. Repeat. In a merge the command is git merge --continue.',
        23: 'The escape hatch, available at every step: everything goes back exactly as it was before the rebase started.',
      },
    },
    {
      type: 'note',
      md: 'Two habits kill most conflict pain. **One: rebase often.** On a branch that lives more than a day, run `git fetch origin && git rebase origin/main` every morning — you resolve one day of drift instead of three weeks of it, and conflicts scale worse than linearly with time. **Two: keep branches short.** A branch merged the same day it was created barely has time to conflict. When a conflict is genuinely large, that is information: two people were rebuilding the same thing, and the fix is a conversation, not a text editor. Also turn on `git config --global rerere.enabled true` — git then remembers how you resolved a given conflict and replays your resolution automatically the next time the same one appears, which is exactly what happens on a repeated rebase.',
    },
    {
      type: 'intuition',
      title: 'The PR flow: how work actually reaches main',
      md: `Nobody pushes to \`main\`. Work arrives through a pull request, and the flow is the same everywhere.

1. **Branch** (or fork, on an open-source repo you cannot write to) — \`git switch -c fix/loader-nan\`.
2. **Commit** small, meaningful steps. Push the branch: \`git push -u origin fix/loader-nan\`.
3. **Open a PR** — it is a request to merge your branch, plus a place to discuss it.
4. **CI runs** on every push: lint, tests, build the image. A red pipeline is not a suggestion.
5. **Review** — a human reads it. You address comments with new commits so reviewers can see what changed.
6. **Merge** with whichever strategy the repo uses, then delete the branch. \`main\` is protected: no direct pushes, CI must be green, N approvals required.`,
    },
    {
      type: 'note',
      md: 'What makes a PR that gets reviewed in ten minutes instead of sitting for three days: **it is small** (under ~400 changed lines — review quality falls off a cliff past that), **it does one thing** (a refactor and a bugfix in one PR forces the reviewer to untangle them), and **the description says WHY**. The diff already shows *what* changed; only you know what was broken, what you tried first, and how you verified it. Add the reproduction, the before/after number, or the screenshot. And if a PR *must* be big — a rename across 200 files — say so in the title and keep it mechanical, with no logic changes hiding inside.',
    },
    {
      type: 'intuition',
      title: 'Undoing things: one question decides the command',
      md: `Ask **"has anyone else seen this commit?"** The answer picks your tool. Everything else is detail.

- **Not committed yet** → \`git restore\` (throw away edits) or \`git restore --staged\` (just unstage). \`git stash\` if you want it back later.
- **Committed, not pushed** → \`git reset\`. It *moves the branch label backwards*; the three flags differ only in what happens to your files.
- \`--soft\`: changes stay **staged**. \`--mixed\` (default): changes stay in the **working directory**. \`--hard\`: changes are **deleted**.
- **Already pushed / shared** → \`git revert\`. It makes a **new commit that undoes an old one**. History is untouched, so nobody's clone breaks. This is the correct answer on any shared branch, always.
- **Panicking** → \`git reflog\`. It lists every position HEAD has held for ~90 days, including the ones you "destroyed". Almost nothing is truly lost.`,
    },
    {
      type: 'code',
      lang: 'bash',
      title: 'The undo cheat-sheet',
      code: `# ---- nothing committed yet ----
git restore train.py            # discard working-dir edits to this file   (gone)
git restore --staged train.py   # unstage, keep the edits
git stash                       # park every dirty change; "git stash pop" brings it back

# ---- committed, not pushed: move the branch label ----
git commit --amend              # rewrite the LAST commit (message and/or content)
git reset --soft  HEAD~1        # drop the commit, changes stay STAGED
git reset --mixed HEAD~1        # drop the commit, changes stay in the working dir (default)
git reset --hard  HEAD~1        # drop the commit AND the changes            (DANGER)

# ---- already pushed / anyone else has it ----
git revert 4f2a1c9              # a NEW commit that undoes an old one. Nothing rewritten.
git revert -m 1 <merge-sha>     # undo a merge: -m 1 keeps the first parent's line

# ---- the safety net ----
git reflog                      # every position HEAD has held, ~90 days
git switch -c rescue 4f2a1c9    # resurrect a "lost" commit onto a fresh branch`,
      annotations: {
        2: 'This is the one that actually loses data: uncommitted edits were never in git, so reflog cannot help you.',
        4: 'stash in one line: a temporary shelf for dirty work when you must switch branches right now. "git stash list" shows the shelf.',
        7: '--soft is the "I want to redo that commit message and split it differently" flag. The work is back in the outbox, untouched.',
        10: 'The famous foot-gun. But the COMMIT is still findable in reflog — only uncommitted work is truly destroyed.',
        13: 'The safe choice on a shared branch: it adds history instead of rewriting it, so nobody has to re-clone or force-pull.',
        14: 'Reverting a merge needs -m to say which parent line is "mainline". -m 1 = the branch you merged into. Without it git refuses.',
        17: 'Read this before you panic-google. Every reset, rebase, amend and checkout is listed with the hash it moved away from.',
        18: 'Take a hash out of the reflog, put a branch label on it, and the "lost" commits are alive again.',
      },
    },
    {
      type: 'note',
      md: 'The distinction interviewers push on: **`reset` moves the label, `revert` adds a commit.** Reset makes commits *disappear from this branch* — perfect while the work is only yours, catastrophic on `main`, because everyone else still has those commits and their next push puts them straight back. Revert leaves the mistake in history and appends its inverse — noisier, and completely safe. `restore` is a third thing entirely: it never touches commits at all, only files. And `git commit --amend` is a mini-rewrite with the same rule attached: amend freely before you push, never after.',
    },
    {
      type: 'code',
      lang: 'bash',
      title: 'What never belongs in git — and tags',
      code: `cat .gitignore
__pycache__/
.venv/
.env                      # secrets: API keys, DB passwords. NEVER in git.
data/raw/                 # 4 GB of parquet. NEVER in git.
models/*.pt               # 500 MB of weights. NEVER in git.
mlruns/

git rm --cached .env      # stop tracking it; the file stays on disk
git commit -m "chore: stop tracking .env"
# ...but the key is STILL in every old commit and every clone. Rotate it. Today.

git tag -a v1.4.0 -m "drift alerting"   # annotated tag: a permanent, named pointer
git push origin v1.4.0                  # tags are NOT sent by a plain git push`,
      annotations: {
        4: 'A leaked key in git history is a leaked key, forever. .gitignore only prevents the NEXT mistake, never the last one.',
        5: 'Git stores a full snapshot per version. A 4 GB dataset changed 10 times can mean tens of GB in .git — and every clone downloads all of it.',
        6: 'Same problem with weights. This is exactly the gap DVC fills in the next modules: git tracks a small pointer file, the blob lives in S3.',
        9: '--cached is the important part: untrack, do not delete. Without it you also wipe the file off your disk.',
        11: 'The honest advice. Rewriting history with filter-repo or BFG is possible, but every existing clone and fork still has the secret. Rotation is the real fix.',
        13: 'A tag labels a commit permanently (a release), unlike a branch label which keeps moving. -a makes it an annotated object with author and date.',
        14: 'The classic surprise: you tagged the release, pushed, and CI never saw the tag. Tags need their own push.',
      },
    },
    {
      type: 'note',
      md: 'Where this points next. Git is superb at versioning **text that changes by lines** and terrible at versioning **large binaries that change wholesale** — which is exactly what datasets and model weights are. That is not a flaw to work around with a bigger repo; it is the reason **DVC** exists two modules from now: DVC keeps the giant file in object storage and commits a tiny `.dvc` pointer containing its hash, so `git checkout` of an old commit brings back the *right data* alongside the right code. Same idea for MLflow artifacts. Everything you just learned about commits, branches and PRs is the substrate all of that sits on: a CI pipeline is a program that runs on `git push`, and a GitOps deploy is a merge to `main`.',
    },
  ],
  quiz: [
    {
      question: 'What does a git commit actually store?',
      options: [
        {
          text: 'A diff (patch) against the previous commit',
          explanation: 'That is how some other VCSs work, and how git DISPLAYS things. Internally git stores whole trees, deduplicated by content hash.',
        },
        {
          text: 'A full snapshot of the tracked tree, plus a pointer to its parent commit',
          explanation: 'Correct. Snapshot + parent pointer(s) is the whole data model — and the parent being part of the hash is why rewriting history changes every later hash.',
        },
        { text: 'Only the files you changed, with the rest left out', explanation: 'The snapshot covers the whole tracked tree; unchanged files simply reuse the existing objects, so there is no duplication cost.' },
        { text: 'A copy of your working directory including ignored files', explanation: 'It snapshots the STAGING AREA, and ignored/untracked files are never included.' },
      ],
      correct: 1,
    },
    {
      question: 'A git branch is…',
      options: [
        {
          text: 'A movable label: a small file holding one commit hash',
          explanation: 'Correct — 40 hex characters plus a newline. That is why creating a branch is instant even on a huge repository.',
        },
        { text: 'A full copy of the repository at a point in time', explanation: 'That is SVN-style branching. Copying nothing is precisely why git branches are considered cheap.' },
        { text: 'A chain of commits owned exclusively by that branch', explanation: 'Commits are not owned by branches. Many branches can point into the same commits; the label just marks a tip.' },
      ],
      correct: 0,
    },
    {
      question: 'You rebase your feature branch onto main. What happens to your original commits?',
      options: [
        { text: 'They are moved onto the new base', explanation: 'Nothing is moved — a commit is immutable, and its parent is part of its hash. Changing the parent necessarily creates a different commit.' },
        { text: 'They are deleted immediately', explanation: 'They stay in the object database, reachable via reflog, until garbage collection eventually removes unreferenced objects.' },
        {
          text: 'They are copied as NEW commits with new hashes; the originals become orphaned',
          explanation: 'Correct, and this is the whole answer to "what happens on git rebase" — plus the reason rebasing shared commits breaks other people.',
        },
        { text: 'Nothing — rebase only moves the branch label', explanation: 'That would be reset. Rebase replays the commit contents on top of a new base, producing new objects.' },
      ],
      correct: 2,
    },
    {
      question: 'What structurally distinguishes a merge commit from an ordinary commit?',
      options: [
        { text: 'Its commit message starts with "Merge"', explanation: 'That is only the default message text; you can change it, and it carries no structural meaning.' },
        {
          text: 'It has two parent commits instead of one',
          explanation: 'Correct. Two parents is the knot that ties both histories together — and it is why reverting a merge needs -m to pick a mainline.',
        },
        { text: 'It contains no file changes', explanation: 'A merge commit usually contains the conflict resolutions, and it always records the combined tree.' },
        { text: 'It cannot be reverted', explanation: 'It can — with git revert -m 1 <sha>, which specifies which parent line counts as the mainline.' },
      ],
      correct: 1,
    },
    {
      question: 'You merge a feature branch and git says "Fast-forward" — no merge commit was created. Why?',
      options: [
        { text: 'Because there were no conflicts', explanation: 'Conflict-free merges still create a merge commit whenever the two branches genuinely diverged.' },
        { text: 'Because the branch had only one commit', explanation: 'The number of commits is irrelevant; ten commits fast-forward just as happily.' },
        {
          text: 'Because main never moved after you branched, so its label could just slide forward',
          explanation: 'Correct. With no divergence there is nothing to tie together — git only advances the label. Use --no-ff if you want the branch recorded as a unit anyway.',
        },
      ],
      correct: 2,
    },
    {
      question: 'A bad commit is already pushed to main and three teammates have pulled it. What do you run?',
      options: [
        { text: 'git reset --hard HEAD~1 then git push --force', explanation: 'This rewrites shared history: teammates still hold the commit, their next push restores it, and force-push can delete work pushed since your last fetch.' },
        {
          text: 'git revert <sha>, which adds a new commit undoing the old one',
          explanation: 'Correct. History stays intact, everyone\'s clone stays valid, and the undo is itself reviewable in the log.',
        },
        { text: 'git rebase -i and drop the commit', explanation: 'Interactive rebase rewrites hashes — the same shared-history problem as reset, just with more steps.' },
        { text: 'git restore the affected files', explanation: 'restore only touches files in the working directory. It never changes what is committed or pushed.' },
      ],
      correct: 1,
    },
    {
      question: 'During a REBASE you hit a conflict. Which side of the markers is the "HEAD" half?',
      options: [
        { text: 'Your commit being replayed', explanation: 'That is the bottom half, labelled with your commit\'s hash. This is the inversion that trips everyone up.' },
        {
          text: 'The base you are replaying onto (e.g. origin/main)',
          explanation: 'Correct. Rebase checks out the base and applies your commits on top, so HEAD is the base — the opposite of a merge, where HEAD is your branch.',
        },
        { text: 'Whichever branch has more commits', explanation: 'Commit counts have nothing to do with which side is labelled HEAD.' },
        { text: 'Always your own branch, in both merge and rebase', explanation: 'True for merge, false for rebase. Read the marker labels instead of assuming.' },
      ],
      correct: 1,
    },
    {
      question: 'You ran git reset --hard and lost two commits of work. Recovery?',
      options: [
        {
          text: 'git reflog to find the old HEAD hash, then branch off it',
          explanation: 'Correct. Reflog records every position HEAD held for about 90 days; git switch -c rescue <hash> brings the commits back.',
        },
        { text: 'Nothing — --hard is permanent', explanation: 'Committed work is recoverable via reflog. Only work that was never committed is genuinely destroyed.' },
        { text: 'git revert the reset', explanation: 'A reset is not a commit, so there is nothing to revert; the branch label simply points somewhere else now.' },
        { text: 'Re-clone from origin', explanation: 'That only works if the commits were pushed. Reflog works locally either way and is the first thing to try.' },
      ],
      correct: 0,
    },
  ],
  interviewQuestions: [
    {
      question: 'What happens on git rebase?',
      answer:
        'Git finds the commits that are on my branch but not on the target base, sets them aside, moves my branch to the tip of that base, and replays each one on top in order. The crucial detail: a commit\'s hash is computed over its content AND its parent, so changing the parent cannot preserve the hash — the replayed commits are brand new objects. The originals are not moved or deleted; they stay in the object database, unreferenced, until garbage collection, and they are visible in the reflog. The result is a linear history that reads as if I had started my work from the current tip, which is why teams like it. The costs: my branch now needs a force-push (--force-with-lease, so it refuses if someone pushed in the meantime); conflicts can occur once per replayed commit rather than once overall; and anyone who already pulled my old commits is now holding history that no longer exists on my branch. That last point is the golden rule — never rebase commits others have pulled.',
      isCaseBased: false,
    },
    {
      question: 'Merge or rebase? Give me your actual rule.',
      answer:
        'Rebase for private, unpushed work — updating my feature branch onto main before opening a PR, or cleaning up my own commits. Merge for anything shared. The reasoning behind the rule is one property: rebase rewrites, merge only appends. A merge commit has two parents and records that parallel work really happened, so nothing anybody has already pulled is invalidated; rebase produces new hashes, so if a teammate has those commits their history and mine have permanently diverged and their next pull tries to merge the same change back in. Beyond safety it is a taste call: linear history is far easier to read and bisect, while merge history is truer and makes an entire feature revertable with one command via --no-ff. What an interviewer wants to hear is that I know which one rewrites and can name the failure mode, not that I prefer one aesthetic.',
      isCaseBased: false,
    },
    {
      question: 'Explain the staging area. Why does git have a step that most other VCSs skip?',
      answer:
        'The staging area (index) is the composed contents of your next commit, sitting between the working directory and the repository. It exists so a messy working tree can still produce a clean commit. Real work is never one tidy change: while fixing a bug I renamed a variable, left a debug print, and started an unrelated tweak. With staging I use git add -p to select individual hunks, commit only the bug fix, and keep the rest uncommitted. The payoff is downstream: one-concern commits are reviewable, revertable in isolation, and usable with git bisect, which is only as precise as your commits are atomic. The cost is a concept everybody has to learn, which is why simpler tools skip it — and why git status exists to constantly show you which of the three areas a file is in.',
      isCaseBased: false,
    },
    {
      question: 'Case: you pull, and your last three days of commits are gone. A teammate says they "cleaned up main" this morning. Diagnose and recover.',
      answer:
        'Diagnosis: they rewrote shared history — a rebase or reset on main followed by a force-push — so the commits my work was based on no longer exist upstream, and my pull either fast-forwarded onto the rewritten line or produced a mess. First, do not panic and do not re-clone: nothing local is lost. git reflog shows every position my HEAD has held; I find the hash from before the pull and run git switch -c rescue <hash> to put a label back on my work. Then I reconcile: git fetch origin, and rebase my rescued commits onto the new main (they are my own commits, so rebasing them is legitimate), resolving conflicts once. If the rewrite also destroyed other people\'s commits, the reflog on origin (or any teammate\'s clone) still holds the old tip and it can be restored. The prevention half of the answer is the real point: protect main so it rejects force-pushes, require PRs, and use --force-with-lease everywhere so a push that would overwrite unseen work fails instead of succeeding.',
      isCaseBased: true,
    },
    {
      question: 'Case: an AWS key was committed 30 commits ago and pushed to a repo the whole company can read. What do you do, in order?',
      answer:
        'Rotate the key first. That is the actual fix — everything else is cleanup. Deleting the file in a new commit does nothing: the secret is in an old commit, in every clone, in every fork, in CI caches, and quite possibly in a search index. Assume it is compromised, revoke it, issue a new one, and check CloudTrail for use you did not make. Then reduce exposure: git rm --cached .env, add it to .gitignore, commit. If policy demands it, purge history with git-filter-repo or BFG and force-push, but be explicit that this rewrites every hash, breaks every clone, and still cannot reach forks — it is hygiene, not remediation. Prevention is the part that impresses: secrets come from environment variables or a secret manager, never from a tracked file; a pre-commit hook or gitleaks/trufflehog scan in CI blocks the commit; and .env.example holds the key NAMES with dummy values so nobody is tempted to commit the real one.',
      isCaseBased: true,
    },
    {
      question: 'reset --soft, reset --mixed, reset --hard, revert, restore. When does each one apply?',
      answer:
        'reset moves the current branch label to another commit; the flag decides what happens to your files. --soft leaves the changes staged, which is how you redo the last commit or split it. --mixed (the default) leaves them in the working directory, unstaged. --hard also overwrites the working directory, discarding the changes — the destructive one, though the commits themselves remain findable in reflog; only never-committed work is truly gone. All three rewrite what this branch contains, so they are only safe on commits nobody else has. revert is the shared-branch answer: it creates a NEW commit whose content is the inverse of an old one, so history is appended to rather than rewritten and no clone breaks. restore is a different axis entirely — it only touches files (from the index, or from a commit) and never moves any branch. The decision question is always the same: has anyone else seen this commit? If yes, revert.',
      isCaseBased: false,
    },
    {
      question: 'Case: you rebase a two-week-old branch of 11 commits onto main and hit conflicts on the 3rd commit, and again on the 5th, 6th and 7th. How do you get out of this?',
      answer:
        'First: git rebase --abort is always available, and it restores the exact pre-rebase state. So the honest first move is to stop and choose deliberately rather than grind through. Options. (1) Abort and merge instead: one conflict resolution against the final state of both sides, rather than one per replayed commit — for a long-lived branch this is often the right call. (2) Abort, squash my 11 commits into one (git reset --soft merge-base, recommit), then rebase that single commit: one conflict, once. (3) Push through the rebase but turn on rerere.enabled first, so repeated resolutions of the same conflict are replayed automatically — that is exactly the situation here, where the same lines fight on several commits. During any of these, git checkout --ours/--theirs speeds up files where one side wins wholesale, and git rebase --skip drops a commit that has become a no-op because main already contains that change. The lesson I would state out loud is the preventive one: this pain is proportional to branch age, so the fix is fetching and rebasing daily and keeping branches under two days old.',
      isCaseBased: true,
    },
    {
      question: 'Your team argues about squash-merge versus merge commit versus rebase-merge for the main branch. Argue all three.',
      answer:
        'Merge commit with --no-ff: history is true, each feature appears as a unit, and reverting an entire feature is one command because the merge commit bounds it. Cost is a noisy graph, and git log on main mixes in every "fix typo" commit. Squash: main gets exactly one clean commit per PR, contributors can commit as sloppily as they like on their branch, and the log reads like a changelog. Cost is losing the intermediate steps, which makes bisect coarse on big features and makes a later partial revert harder; the branch is also not recorded as merged, so git can be confused if the branch is reused. Rebase-merge: perfectly linear main with every individual commit preserved — the best of both on paper — but it requires every commit to build and pass tests on its own, otherwise bisect lands on broken commits, and it rewrites hashes so the merged commits differ from what was reviewed. My default recommendation is squash for teams whose PRs are one logical change each, and --no-ff merge for teams that write disciplined commit series. The underlying variable is commit discipline, not the button.',
      isCaseBased: false,
    },
    {
      question: 'What is HEAD, and what does "detached HEAD" mean?',
      answer:
        'HEAD is a pointer that answers "where does my next commit attach?". Normally it holds a symbolic ref to a branch — .git/HEAD literally contains "ref: refs/heads/main" — and committing advances that branch label. Detached HEAD is when HEAD holds a raw commit hash instead of a branch name, which happens when you check out a tag, a specific commit, or a remote-tracking ref. Nothing is broken: you can look around, build, even commit. The danger is that commits made there have no branch pointing at them, so switching away leaves them unreachable and eventually garbage-collected — git warns you about exactly this. The escape is git switch -c <name> to attach a label, or git switch main to abandon them. It shows up in CI a lot, since many runners check out a detached commit by SHA, which is why a naive "git push" from a CI job fails.',
      isCaseBased: false,
    },
    {
      question: 'What makes a pull request easy to review, and how do you keep a branch mergeable?',
      answer:
        'Small, single-concern, and explained. Small means roughly under 400 changed lines — review quality measurably collapses beyond that, and reviewers start rubber-stamping. Single-concern means a refactor and a behavior change do not share a PR, because the reviewer cannot tell which diff hunk is which. Explained means the description states WHY: what was broken, what alternative was rejected, how it was verified. The diff already shows what changed; only the author knows the rest. Mechanically: branch off latest main, rebase onto origin/main daily so the PR never rots, respond to review comments with new commits (not force-pushes) so reviewers can see just the delta, and let CI be the gate for the mechanical checks so humans review design. Draft PRs early are underrated — they catch a wrong direction on day one instead of day five.',
      isCaseBased: false,
    },
    {
      question: 'How does git resolve merges automatically, and what exactly is a conflict?',
      answer:
        'Git compares both branch tips against their merge base — the most recent common ancestor — and applies changes from both sides. If a region of a file was changed on only one side, that change is taken silently; different files, or different hunks of the same file, merge cleanly with no human involvement. A conflict is the case where the SAME lines changed on both sides relative to the base: git has no rule for choosing, so it writes both versions into the file between markers and stops. Two things worth adding. First, git merges by lines and has no idea about your language, so it will happily produce a "clean" merge that does not compile — one branch renamed a function, the other added a call to the old name. That is why CI runs on the merge result, not just on the branch. Second, resolution is not limited to picking a side: you own the merged result and can write something new. git add is how you signal resolution, and rerere can memorize the resolution for repeated rebases.',
      isCaseBased: false,
    },
    {
      question: 'Why should datasets and model weights not live in git, and what do you use instead?',
      answer:
        'Git stores whole snapshots of every version of every file, deduplicated by content hash. That works beautifully for text, where a changed line is a small new blob, and terribly for large binaries, where any change means a whole new multi-hundred-megabyte object. Ten versions of a 4 GB parquet file can mean tens of GB in .git, and because git history is not shallow by default, every clone and every CI run downloads all of it, forever — you cannot make it small again without rewriting history. So .gitignore excludes data/, models/, mlruns/, .venv/ and .env. The replacement is a pointer pattern: DVC (or git-lfs for simpler cases) keeps the real blob in object storage like S3 and commits a tiny .dvc file containing its hash, so git checkout of an old commit plus dvc pull reconstructs the exact code AND the exact data for that commit. That is the reproducibility guarantee interviewers are looking for: code version, data version and model version all pinned by one commit hash, with MLflow recording which run produced which artifact.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'Commit, branch, HEAD — one line each', back: 'Commit = snapshot of the tracked tree + parent pointer. Branch = a movable label holding one commit hash (41 bytes). HEAD = a pointer to your current branch.' },
    { front: 'The three areas and the commands between them', back: 'Working directory --git add--> staging area (index) --git commit--> repository. git restore comes back one step; git restore --staged comes back from the index.' },
    { front: 'Why the staging area exists', back: 'To compose a clean, one-concern commit out of a messy working tree. git add -p stages individual hunks and leaves the debug print behind.' },
    { front: 'What happens on git rebase', back: 'Your commits are REPLAYED on a new base: new parents, therefore new hashes, therefore new commit objects. The originals stay orphaned in the object DB. Result: linear history.' },
    { front: 'Merge vs rebase in one sentence', back: 'Merge appends a commit with TWO parents and preserves true history; rebase rewrites your commits into a straight line. Merge is safe on shared branches, rebase is not.' },
    { front: 'The golden rule of rebase', back: 'Never rebase commits that others have already pulled — their clone holds the originals and yours holds copies, so histories diverge permanently. Push rewrites with --force-with-lease, never --force.' },
    { front: 'Fast-forward vs --no-ff vs --squash', back: 'FF: main never moved, so the label just slides — no merge commit. --no-ff: force the merge commit so the feature is a revertable unit. --squash: collapse the branch into one new commit on main.' },
    { front: 'Conflict markers, and the rebase inversion', back: '<<<<<<< HEAD / ======= / >>>>>>> label. In a MERGE, HEAD is your branch. In a REBASE, HEAD is the base you are landing on and the bottom half is your replayed commit.' },
    { front: 'Conflict resolution workflow', back: 'Edit the file and delete all three markers, git add the file (= "resolved"), then git rebase --continue or git merge --continue. git ...--abort restores everything.' },
    { front: 'Undo: which command?', back: 'Ask "has anyone else seen it?" No + uncommitted: restore/stash. No + committed: reset --soft/--mixed/--hard (label moves). Yes: revert (new inverse commit). Lost something: reflog.' },
  ],
  mindmapMarkdown: `- Git Properly
  - Mental model
    - Commit = snapshot + parent pointer (a DAG)
    - Branch = movable label, 41 bytes
    - HEAD = pointer to the current branch
  - Three areas
    - Working dir -> add -> staging (index) -> commit -> repository
    - add -p composes a clean commit from a messy tree
  - Branching
    - switch -c creates + moves HEAD; detached HEAD = a raw commit
    - Trunk-based short branches vs git-flow ceremony
  - Merge vs rebase
    - Merge commit has TWO parents, history stays true
    - Fast-forward when main never moved; --no-ff forces the knot; --squash collapses
    - Rebase REPLAYS: new hashes, orphaned ghost commits, linear history
    - Golden rule: never rebase shared commits; --force-with-lease
  - Conflicts
    - Same lines changed on both sides
    - <<<<<<< HEAD / ======= / >>>>>>> (HEAD = the base during a rebase)
    - Edit, git add, --continue — or --abort; rebase daily
  - PR flow
    - branch -> commit -> push -> PR -> review -> CI -> merge
    - Small, one concern, description says WHY
  - Undo
    - restore: files only; stash: temporary shelf
    - reset --soft / --mixed / --hard moves the branch label
    - revert: new inverse commit — the safe shared-branch choice
    - reflog: ~90 days of every HEAD position
  - Hygiene
    - .gitignore: secrets, data, weights, venv
    - Leaked key -> rotate, not just delete; tags for releases
    - Big data belongs in DVC, not git`,
}

export default m
