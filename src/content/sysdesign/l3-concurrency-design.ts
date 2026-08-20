import type { Module } from '../types'

const m: Module = {
  id: 'sysdesign-l3-concurrency-design',
  subjectId: 'sysdesign',
  level: 3,
  title: 'Concurrency in Design: Producer-Consumer, Readers-Writers & Thread-Safe Classes',
  whyItMatters:
    'Nobody asks you to implement a mutex. They hand you a class and ask "is this safe to call from ten threads, and what breaks?" That question has three answers — races, deadlock, starvation — and a small set of standard shapes (producer-consumer, readers-writers, a locked class) that cover almost every real answer. This module runs the failures for real, shows the wrong output, then fixes it. It is also the module that stops you from writing the lock-everything class that turns a 16-core box into a 1-core box.',
  estMinutes: 60,
  sections: [
    {
      type: 'intuition',
      title: 'The question is never "implement a mutex"',
      md: `Interview concurrency is not an operating-systems exam. It is one question in two shapes:

- *"Make this class safe to call from many threads."*
- *"This works in test and corrupts data in production once a week. Why?"*

Both are asking the same thing: **where is the shared mutable state, and who can touch it at the same time?** Everything else — locks, queues, atomics — is just the answer.

Three enemies, and you should name all three out loud:

- **Race condition** — two threads touch the same state and the result depends on who won. Symptom: numbers that are slightly wrong, rarely, under load.
- **Deadlock** — thread A waits for a lock B holds, B waits for a lock A holds. Nobody moves, forever. Symptom: the system freezes, CPU at zero.
- **Starvation / livelock** — the work is legal but someone never gets a turn. Starvation: a writer waits behind an endless stream of readers. Livelock: threads keep politely backing off for each other and nothing progresses — busy, but zero throughput.

The senior move is to fix the *design* so fewer of these can exist, not to sprinkle locks until the symptom stops.`,
    },
    {
      type: 'intuition',
      title: 'Shared mutable state is the whole problem',
      md: `Two chefs, one order pad. Chef A reads "table 4: 2 soups", starts writing "3 soups", and while the pen is moving Chef B also reads "2 soups" and writes "3 soups". Two customers ordered, one soup got lost. Nothing was broken — the *read* and the *write* were just not one step.

- A **race condition** needs three ingredients: shared state, at least one writer, and no coordination. Remove any one and the race is gone.
- Read-modify-write (\`x = x + 1\`, \`list.append(compute())\`, \`cache[k] = cache.get(k) + 1\`) is the classic: it looks atomic in source, it is not atomic in execution.
- **Check-then-act** is the same bug wearing a suit: \`if seat not in booked: booked[seat] = user\`. The check is true for two threads at once.
- The dangerous property is that races are **timing-dependent**. They pass every test on your laptop and fail at 3am under production load. You cannot test them away; you design them away.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The same increment, two window sizes — run it',
      code: `import threading, time

LOOPS = 5000

def run(worker):
    global balance
    balance = 0
    ts = [threading.Thread(target=worker) for _ in range(4)]
    for t in ts: t.start()
    for t in ts: t.join()
    print(f'{worker.__name__:12s} expected {4 * LOOPS}  actual {balance}')

def tight():                 # READ and WRITE sit 2 bytecodes apart
    global balance
    for _ in range(LOOPS):
        tmp = balance        # READ
        balance = tmp + 1    # WRITE

def realistic():             # any log line, I/O or sleep widens that window
    global balance
    for _ in range(LOOPS):
        tmp = balance
        time.sleep(0)        # yields the GIL - exactly what real work does
        balance = tmp + 1

run(tight)
run(realistic)

# tight        expected 20000  actual 20000    <- looks correct. It is not correct.
# realistic    expected 20000  actual 5126     <- 74% of the deposits vanished`,
      annotations: {
        16: 'Four threads run this loop with no lock at all. The bug is that "increment" is really three steps: load, add, store.',
        23: 'sleep(0) is not cheating. It is a stand-in for the log call, the metric increment, the DB round trip that lives between your read and your write in every real function.',
        29: 'The tight loop passed. That is the trap: a race that does not fire is still a race — you just have not hit the interleaving yet.',
        30: 'Real number from a real run. It varies every run (5126, 5448, 5283...) — which is itself the diagnostic signature of a race.',
      },
    },
    {
      type: 'note',
      md: `**Be honest about the GIL.** CPython's Global Interpreter Lock means only one thread runs Python bytecode at a time — so *individual bytecodes* are atomic. It does NOT make *statements* atomic. \`balance += 1\` compiles to load, add, store; the interpreter can switch threads between them. And it does nothing at all for **check-then-act**, where the gap spans two whole statements. Two more consequences worth saying in an interview: (1) threads in CPython buy **concurrency for I/O-bound work** (a waiting thread releases the GIL) but **not parallelism for CPU-bound work** — that needs processes; (2) on a JVM, Go, or C++ runtime there is no GIL, so the tight loop above corrupts immediately and much worse. The Python subject's \`py-l3-concurrency-memory\` module covers the GIL mechanics; here we only care that **the GIL is not a substitute for a lock**.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Check-then-act: the GIL does not save you',
      code: `import threading, time

seats = {}
winners = []
gate = threading.Barrier(8)              # make all 8 threads race from the same instant

def book(worker_id):
    gate.wait()
    if 'A1' not in seats:                # CHECK  - true for more than one thread
        time.sleep(0)                    # any switch point at all
        seats['A1'] = worker_id          # ACT    - the last writer silently wins
        winners.append(worker_id)

ts = [threading.Thread(target=book, args=(i,)) for i in range(8)]
for t in ts: t.start()
for t in ts: t.join()
print('seat A1 finally sold to:', seats['A1'])
print('threads that believed they won:', winners)

# seat A1 finally sold to: 7
# threads that believed they won: [0, 7]      <- the seat was sold TWICE`,
      annotations: {
        5: 'A Barrier releases all threads at once, so the race is reproducible instead of a once-a-month lottery. Same bug, visible on demand.',
        9: 'This is the whole class of bug: exists(), then create(). get_or_404(), then update(). Every "if not present, insert" you have ever written.',
        12: 'Two threads each ran their own booking side effects - charge card, email confirmation - for one seat. Money moved. This is why check-then-act is the interview favourite.',
        21: 'Which ids appear varies per run. That two of them appear is the point, and it reproduces every time.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The fix, and the cost of the fix',
      code: `import threading, time

balance = 0
lock = threading.Lock()
LOOPS = 5000

def deposit():
    global balance
    for _ in range(LOOPS):
        with lock:            # only one thread may be between these lines
            tmp = balance
            time.sleep(0)     # the same nasty window as before
            balance = tmp + 1

ts = [threading.Thread(target=deposit) for _ in range(4)]
for t in ts: t.start()
for t in ts: t.join()
print('expected', 4 * LOOPS, 'actual', balance)

# expected 20000 actual 20000     <- every run, not just this one`,
      annotations: {
        10: 'with lock: acquires on entry and releases on exit even if the body raises. Never write lock.acquire() without try/finally - an exception inside a critical section leaves the lock held forever, which is a deadlock you will not diagnose at 3am.',
        12: 'The window is still wide. It no longer matters: mutual exclusion means nobody else is inside it.',
        13: 'The price: this critical section is now serialized. Four threads, one at a time - the sleep(0) is inside the lock, so this version is SLOWER than single-threaded. Keep critical sections small; that rule is not style, it is throughput.',
      },
    },
    {
      type: 'intuition',
      title: 'The primitives — and when each is the right answer',
      md: `Seven tools in \`threading\`/\`queue\`. Pick by the *question you are answering*, not by familiarity.

- **Lock** — "only one thread at a time, here." The default. If you are not sure, this is the answer.
- **RLock** — a Lock the *same thread* may re-acquire. Needed when a locked public method calls another locked public method. Real, but usually a **smell**: it says your public API is calling itself. The clean fix is a private unlocked \`_do_work()\` that both public methods call while holding the lock once.
- **Semaphore(n)** — "at most N at a time." Bounded resources: a connection pool, 5 concurrent uploads, an API's rate cap. A Lock is a Semaphore(1).
- **Condition** — "wait until a predicate is true, and wake me when it might be." Producer-consumer, bounded buffers, anything with a *state* to wait on. It bundles a Lock with wait/notify.
- **Event** — "one flag, many waiters." Shutdown signals, "config is loaded, everyone may start." No data, just a boolean that latches.
- **Barrier(n)** — "nobody proceeds until all N arrive." Phased computation, and (as above) making races reproducible in tests.
- **\`queue.Queue\`** — a thread-safe bounded buffer with all the wait/notify already written. This is the one you should reach for; it *is* producer-consumer.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'RLock in one breath — and why needing it is a hint',
      code: `import threading

lock = threading.Lock()
lock.acquire()
print('Lock,  same thread acquires again:', lock.acquire(timeout=0.5))
lock.release()

rlock = threading.RLock()
rlock.acquire()
print('RLock, same thread acquires again:', rlock.acquire(timeout=0.5))
rlock.release(); rlock.release()          # re-entrant means release() as many times

# Lock,  same thread acquires again: False
# RLock, same thread acquires again: True`,
      annotations: {
        5: 'False = the thread just deadlocked against itself and only the timeout saved it. Without timeout=0.5 this line never returns. A class whose transfer() calls its own deposit(), both taking self._lock, hangs on the first call.',
        10: 'RLock counts owner re-entries, so this returns True. It fixes the hang - it does not fix the design that caused it.',
        11: 'Every acquire needs its release. Miscounting is a fresh deadlock, which is why "just use RLock" is a patch, not an answer.',
      },
    },
    {
      type: 'note',
      md: `**The Condition rule you will be asked about: always \`while\`, never \`if\`.** A waiting thread must re-check its predicate in a loop:

- **Wake-then-lose.** \`notify()\` moves a waiter to "runnable", but it still has to re-acquire the lock. Another thread can slip in first and consume the item. You wake up to a condition that *was* true and no longer is.
- **notify_all** wakes every waiter for a state only one of them can consume — the rest must go back to sleep, not charge ahead.
- **Spurious wakeups** are allowed by the underlying pthreads semantics; portable code never assumes a wakeup means "your turn".

So the shape is always \`while not predicate(): cv.wait()\`. Writing \`if\` produces a bug that appears under load, once, in production. And prefer \`notify_all()\` unless you can prove every waiter is waiting for the identical condition — a wrong \`notify()\` wakes the one thread that cannot proceed and the system stalls with work available.`,
    },
    {
      type: 'intuition',
      title: 'Producer-consumer: the pattern behind every queue you have designed',
      md: `Producers make work faster than consumers finish it, or slower, and neither should know about the other. Put a **bounded buffer** between them.

- **Decoupling**: producers only \`put\`, consumers only \`get\`. You can change the count of either without touching the other's code.
- **Smoothing**: a burst fills the buffer instead of overwhelming the consumers.
- **Backpressure — the reason it is BOUNDED**: when the buffer is full the producer *blocks*. That block is a signal travelling backwards up the pipeline: "slow down." An unbounded queue has no backpressure — it converts overload into unbounded memory growth and then an out-of-memory kill, which is a worse failure than being slow. This is exactly the queue-depth argument from \`sysdesign-l0-queues-messaging\`, at thread scale instead of service scale.
- The pattern has two waiting conditions, and both must exist: consumers wait for **not empty**, producers wait for **not full**.
- Shutdown is part of the design, not an afterthought: a **poison pill** (a sentinel value) per consumer, so each one sees exactly one and exits after draining everything before it.`,
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'Producer-consumer over a bounded buffer (capacity 3)',
        notice: 'Two producers, two slower consumers, one buffer of 3. Watch the buffer fill, watch a producer get blocked — that block IS backpressure — then watch shutdown and, in the last frame, what deadlock looks like.',
        leftLabel: 'threads',
        rightLabel: 'shared state',
        frames: [
          {
            note: 'Steady state. Producers put jobs in, consumers take them out, the buffer absorbs the mismatch. Nobody waits, and neither side knows how many of the other exist.',
            stack: [
              { name: 'P0', value: 'put(job-0.2)', to: 'buf' },
              { name: 'P1', value: 'put(job-1.2)', to: 'buf' },
              { name: 'C0', value: 'get() -> job-1.1', to: 'buf' },
              { name: 'C1', value: 'busy 50 ms on job-0.1' },
            ],
            heap: [
              { id: 'buf', value: '[job-0.2, job-1.2] · 2 of 3', label: 'bounded buffer — room left' },
              { id: 'cv', value: 'no waiters', label: 'Condition (lock + wait queue)' },
            ],
          },
          {
            note: 'Producers are faster than consumers, so the buffer hits capacity. P0 and P1 call wait() and are parked INSIDE the condition. This is backpressure: the producers are throttled to the consumers\' real rate, and memory stops growing. An unbounded queue would have kept accepting until the process died.',
            stack: [
              { name: 'P0', value: 'BLOCKED in cv.wait() — buffer full', to: 'cv', danger: true },
              { name: 'P1', value: 'BLOCKED in cv.wait() — buffer full', to: 'cv', danger: true },
              { name: 'C0', value: 'busy 50 ms on job-0.2' },
              { name: 'C1', value: 'busy 50 ms on job-1.2' },
            ],
            heap: [
              { id: 'buf', value: '[job-0.3, job-1.3, job-0.4] · 3 of 3 FULL', label: 'buffer FULL — no producer may append', danger: true },
              { id: 'cv', value: 'waiters: P0, P1', label: 'Condition — two producers parked' },
            ],
          },
          {
            note: 'C0 finishes, pops one item, and calls notify_all(). P0 wakes, re-acquires the lock, and RE-CHECKS len(buf) == CAP in its while loop — because between the notify and the wakeup, P1 could have taken the free slot. That re-check is why the wait is inside `while`, never `if`.',
            stack: [
              { name: 'P0', value: 'woke — re-checking predicate', to: 'buf' },
              { name: 'P1', value: 'still waiting', to: 'cv' },
              { name: 'C0', value: 'popleft() -> job-0.3, notify_all()', to: 'buf' },
              { name: 'C1', value: 'busy on job-1.3' },
            ],
            heap: [
              { id: 'buf', value: '[job-1.3, job-0.4] · 2 of 3', label: 'one slot freed — draining' },
              { id: 'cv', value: 'waiters: P1', label: 'Condition — P0 released' },
            ],
          },
          {
            note: 'Shutdown. Producers are done; the coordinator pushes ONE poison pill per consumer. Each consumer drains the real work ahead of the pill first, then sees its pill and returns. No flag polling, no killing threads mid-job, no lost items.',
            stack: [
              { name: 'main', value: 'put(DONE) x 2', to: 'buf' },
              { name: 'C0', value: 'got DONE — exiting', to: 'buf' },
              { name: 'C1', value: 'got DONE — exiting', to: 'buf' },
            ],
            heap: [
              { id: 'buf', value: '[] · 0 of 3', label: 'drained, then emptied', freed: true },
              { id: 'cv', value: 'no waiters', label: 'Condition — everyone left' },
            ],
          },
          {
            note: 'The other failure mode, same picture. Two transfers grab their locks in caller order: T1 takes A then wants B, T2 takes B then wants A. Each holds what the other needs and neither will let go. CPU is 0%, nothing is logged, the process looks alive. The fix is not a smarter lock — it is a global ORDER: always take the lower account id first.',
            stack: [
              { name: 'T1 transfer(A -> B)', value: 'holds A, blocked wanting B', to: 'lockB', danger: true },
              { name: 'T2 transfer(B -> A)', value: 'holds B, blocked wanting A', to: 'lockA', danger: true },
            ],
            heap: [
              { id: 'lockA', value: 'held by T1 · T2 queued behind it', label: 'Account A lock', danger: true },
              { id: 'lockB', value: 'held by T2 · T1 queued behind it', label: 'Account B lock', danger: true },
            ],
          },
        ],
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Producer-consumer by hand: Condition + bounded buffer',
      code: `import threading, time
from collections import deque

CAP = 3
buf = deque()
cv = threading.Condition()          # a Lock plus a wait/notify queue on top of it
DONE = object()                     # poison pill: identity, so no real job can equal it

def producer(pid, n):
    for i in range(n):
        with cv:
            while len(buf) == CAP:  # WHILE, never IF
                print(f'  P{pid} blocked: buffer FULL (backpressure)')
                cv.wait()           # releases the lock, sleeps, re-acquires on wake
            buf.append(f'job-{pid}.{i}')
            cv.notify_all()         # a consumer may be waiting on "not empty"
        time.sleep(0.01)

def consumer(cid):
    while True:
        with cv:
            while not buf:
                cv.wait()
            item = buf.popleft()
            cv.notify_all()         # a producer may be waiting on "not full"
        if item is DONE:
            print(f'  C{cid} got the pill, exiting')
            return
        print(f'  C{cid} handled {item}')
        time.sleep(0.05)            # consumers are 5x slower than producers

cons = [threading.Thread(target=consumer, args=(c,)) for c in range(2)]
prods = [threading.Thread(target=producer, args=(p, 5)) for p in range(2)]
for t in cons + prods: t.start()
for t in prods: t.join()
with cv:
    buf.extend([DONE, DONE])        # exactly one pill per consumer
    cv.notify_all()
for t in cons: t.join()
print('drained, buffer size:', len(buf))`,
      annotations: {
        6: 'One Condition guards BOTH predicates (not-full and not-empty). Two conditions on one lock is also valid and wakes fewer threads; one condition plus notify_all is simpler and is what most interviews want.',
        12: 'The bounded-buffer heart. Delete the bound and you delete backpressure: the deque grows until the process is OOM-killed.',
        14: 'wait() atomically releases the lock and sleeps. That atomicity is the whole reason Condition exists - checking a predicate and going to sleep must not have a gap, or you sleep through the notify.',
        16: 'Notify while still holding the lock is fine and simplest: the woken thread cannot run until this with-block exits anyway.',
        25: 'The consumer notifies after removing an item because it just made the buffer not-full. Forget this line and every producer sleeps forever once the buffer first fills - a deadlock with no lock cycle in it.',
        37: 'Poison pills, not a shutdown flag. A flag can be missed by a thread already parked in wait(); a pill travels through the same buffer, so each consumer finishes the real work queued ahead of it first.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The same thing with queue.Queue — this is what you ship',
      code: `import threading, queue, time

q = queue.Queue(maxsize=3)          # maxsize IS the backpressure knob
DONE = object()

def consumer(cid):
    while True:
        item = q.get()              # blocks while empty
        if item is DONE:
            q.task_done()
            print(f'  C{cid} got the pill, exiting')
            return
        print(f'  C{cid} handled {item}')
        time.sleep(0.05)
        q.task_done()

cons = [threading.Thread(target=consumer, args=(c,), daemon=True) for c in range(2)]
for t in cons: t.start()

for i in range(6):
    q.put(f'job-{i}')               # blocks when full: the producer is throttled
for _ in cons:
    q.put(DONE)
for t in cons: t.join()
print('queue empty:', q.empty())

#   C1 handled job-0        C0 handled job-1        C0 handled job-2
#   C1 handled job-3        C1 handled job-4        C0 handled job-5
#   C0 got the pill, exiting        C1 got the pill, exiting
# queue empty: True`,
      annotations: {
        3: 'maxsize=0 means unbounded - the default, and the wrong default for a pipeline that can be overloaded. Set it, and set it low enough that blocking happens before memory does.',
        8: 'get() and put() already do the lock, the while-predicate loop, and the notify. Thirty lines of the previous block, deleted.',
        21: 'This put() blocks when the queue is full. Same backpressure, zero code. If you need "drop instead of block", that is put_nowait() plus a queue.Full handler - and that choice, block vs drop, is the real design decision.',
        23: 'Still your job: shutdown. queue.Queue has no "close". Poison pills or an Event; task_done()/join() only tells you when the work is finished, not when the workers should leave.',
      },
    },
    {
      type: 'note',
      md: `**The lazy-senior verdict.** In production you use \`queue.Queue\` (or \`concurrent.futures.ThreadPoolExecutor\`, which is a queue plus threads). Hand-rolling a bounded buffer with a Condition buys you nothing except new bugs — a forgotten \`notify_all\`, an \`if\` instead of a \`while\`, a lock leaked on an exception path. Hand-roll it in exactly one situation: an interviewer asks you to, because they want to see that you know what \`Queue\` is hiding. Then say both sentences: *"here is the Condition version, and in real code I would use \`queue.Queue\` because it is this code, tested by everyone."*`,
    },
    {
      type: 'intuition',
      title: 'Readers-writers: when a plain Lock wastes your machine',
      md: `A shared config, a route table, an in-memory index: read thousands of times a second, written once a minute. A plain Lock forces those thousands of readers to queue behind each other for no reason — readers do not conflict with readers.

- The rule: **many readers concurrently, OR one writer alone.** Never both.
- The gain shows up only when reads are **frequent AND long**. If a read is a dict lookup — nanoseconds — the RW lock's own bookkeeping costs more than the contention it removes.
- The instant you have two policies (who wins when a reader and a writer both want in), you have a **fairness** decision, and that decision is the actual interview content.
- Python has **no RW lock in the standard library**. That absence is a hint: the stdlib authors think you probably want a plain \`Lock\` — or better, an immutable snapshot you swap atomically.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'A reader-preference RW lock — and the writer it starves',
      code: `import threading, time

class RWLock:
    """Reader-preference. Readers never wait for each other. Writers can starve."""
    def __init__(self):
        self._readers = 0
        self._lock = threading.Lock()       # guards the counter only
        self._resource = threading.Lock()   # held by a writer, or by the FIRST reader

    def acquire_read(self):
        with self._lock:
            self._readers += 1
            if self._readers == 1:
                self._resource.acquire()    # first reader in locks writers out

    def release_read(self):
        with self._lock:
            self._readers -= 1
            if self._readers == 0:
                self._resource.release()    # last reader out lets a writer in

    def acquire_write(self): self._resource.acquire()
    def release_write(self): self._resource.release()

rw = RWLock()

def reader(i):
    time.sleep(i * 0.012)                   # staggered arrivals -> reads always overlap
    for _ in range(12):
        rw.acquire_read()
        time.sleep(0.05)                    # a long read
        rw.release_read()
        time.sleep(0.001)

def writer():
    t0 = time.time()
    rw.acquire_write()
    print(f'  writer waited {time.time() - t0:.2f}s for a gap with zero readers')
    rw.release_write()

ts = [threading.Thread(target=reader, args=(i,)) for i in range(4)]
for t in ts: t.start()
w = threading.Thread(target=writer); time.sleep(0.05); w.start()
for t in ts + [w]: t.join()

#   writer waited 0.61s for a gap with zero readers
#   0.61s = the ENTIRE read stream. The writer got in only after the last reader quit.`,
      annotations: {
        14: 'The first reader takes the resource lock on behalf of all readers; the last one out releases it. Reader 2..N pay only the cheap counter lock.',
        19: 'This is the starvation mechanism, in one line: if a new reader arrives before the count reaches zero, the count never reaches zero, and the writer never runs.',
        28: 'The stagger is what makes it deterministic. In production the same thing happens by accident under steady read traffic - which is why the bug shows up as "config updates sometimes take minutes to apply".',
        46: 'Real output, and it reproduces. The writer was queued at 0.05s and served at 0.61s - the moment the readers finished everything they had.',
      },
    },
    {
      type: 'intuition',
      title: 'The three fairness policies — pick one and say why',
      md: `- **Reader-preference** (the code above): a waiting writer is blocked while any reader holds it, and new readers walk straight in. Maximum read throughput; **writers starve** under sustained read traffic. Only safe when writes are rare *and* reads come in gaps.
- **Writer-preference**: once a writer is waiting, new readers queue behind it. Writers get bounded waits; **readers starve** if writers arrive back-to-back. Right when staleness is expensive — a route table that must reflect a failover now.
- **Fair / queued (FIFO)**: everyone joins one queue; a run of readers that arrived together still goes in parallel, but nobody overtakes a waiting writer. Nobody starves, peak read throughput is slightly lower. This is the sane default, and it is what Java's \`ReentrantReadWriteLock(fair=true)\` and Go's \`sync.RWMutex\` (writer-preferring, non-starving) approximate.
- The answer that scores: *"reader-preference maximises read throughput and starves writers; writer-preference does the reverse; I would default to the fair queued variant unless I can prove one side is rare."*
- And the honest follow-up: **do not build this until you measure.** Start with a plain Lock. If the profile shows readers queueing, first try the cheaper fix below — then reach for an RW lock.`,
    },
    {
      type: 'note',
      md: `**The fix that beats an RW lock most of the time: copy-on-write.** Keep the shared data in ONE immutable object referenced by a single attribute. Readers just read the reference — **no lock at all**, because the object they got can never change under them. A writer builds a whole new object and rebinds the attribute in one assignment (attribute rebinding is atomic under the GIL; elsewhere use an atomic reference). Readers mid-flight keep using the old snapshot and finish cleanly. Cost: one full copy per write, and readers may be one generation stale. That trade is excellent for config, route tables, feature flags, and any read-mostly structure that fits in memory — and it deletes the entire fairness argument. Reach for an RW lock only when the data is too big to copy or writes are too frequent for it.`,
    },
    {
      type: 'intuition',
      title: 'Deadlock: the four conditions, and which one you break',
      md: `Deadlock needs all four **Coffman conditions** at once. Break any single one and deadlock becomes impossible — which is what every fix below actually is.

1. **Mutual exclusion** — the resource can be held by only one thread. (Rarely removable; that is the point of a lock.)
2. **Hold and wait** — a thread holds one lock while requesting another. (Removable: take all locks at once, or none.)
3. **No preemption** — a lock cannot be yanked from its holder. (Removable: \`acquire(timeout=...)\`, then back off and retry.)
4. **Circular wait** — a cycle in the "who waits for whom" graph. (Easiest to remove: impose a **global lock order** and the cycle cannot form.)

The practical hierarchy of fixes, in the order a senior applies them:

- **Reduce lock scope / count** — one lock instead of two is a deadlock you cannot have. Frequently the whole answer.
- **Consistent ordering** — if every thread takes locks in the same global order (by id, by address, by name), a cycle is impossible. This is the standard bank-transfer answer.
- **Timeouts + retry with jitter** — \`if not lock.acquire(timeout=1): release everything, back off, retry\`. Turns a permanent hang into a recoverable slowdown, but be careful: naive retry with no jitter gives you **livelock**, where everyone backs off and collides again in lockstep.
- **Never call unknown code while holding a lock** — a callback, a plugin, an event handler can take locks you have never heard of, in an order you cannot control.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The bank transfer deadlock — run it, watch it hang',
      code: `import threading, time

class Account:
    def __init__(self, id, balance):
        self.id, self.balance = id, balance
        self.lock = threading.Lock()

def transfer(src, dst, amt):                 # BROKEN: locks in CALLER order
    with src.lock:
        time.sleep(0.1)                      # makes the bad interleaving certain
        with dst.lock:
            src.balance -= amt
            dst.balance += amt

a, b = Account('A', 1000), Account('B', 1000)
t1 = threading.Thread(target=transfer, args=(a, b, 100), daemon=True)
t2 = threading.Thread(target=transfer, args=(b, a, 200), daemon=True)
t1.start(); t2.start()
t1.join(timeout=2); t2.join(timeout=2)
print('t1 still alive:', t1.is_alive(), '| t2 still alive:', t2.is_alive())
print('balances:', a.balance, b.balance, '(nothing moved - both threads are stuck)')

# t1 still alive: True | t2 still alive: True
# balances: 1000 1000 (nothing moved - both threads are stuck)`,
      annotations: {
        8: 'The function is correct in isolation and correct for any single call. The bug only exists between two calls with swapped arguments - which is why code review misses it and production finds it.',
        10: 'The sleep only sets the timing. Remove it and the deadlock still happens, just rarely: the "once a week at peak traffic" incident.',
        19: 'daemon=True plus join(timeout=2) is how you demo a hang without hanging the demo. Both threads are permanently parked in lock.acquire().',
        23: 'No exception, no log line, no CPU. That silence is the signature: a hung deadlock looks exactly like a healthy idle process from the outside.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The fix: one global lock order — 8 threads, 400 transfers',
      code: `import threading, time, random

class Account:
    def __init__(self, id, balance):
        self.id, self.balance = id, balance
        self.lock = threading.Lock()

def transfer(src, dst, amt):
    first, second = sorted((src, dst), key=lambda acc: acc.id)   # GLOBAL ORDER
    with first.lock:
        time.sleep(0.001)
        with second.lock:
            src.balance -= amt
            dst.balance += amt

accounts = [Account(chr(65 + i), 1000) for i in range(5)]

def churn():
    for _ in range(50):
        src, dst = random.sample(accounts, 2)
        transfer(src, dst, 10)

ts = [threading.Thread(target=churn) for _ in range(8)]
t0 = time.time()
for t in ts: t.start()
for t in ts: t.join(timeout=30)
print('any thread stuck:', any(t.is_alive() for t in ts))
print('total money:', sum(x.balance for x in accounts), '(started 5000)')
print(f'400 transfers in {time.time() - t0:.2f}s')

# any thread stuck: False
# total money: 5000 (started 5000)
# 400 transfers in 0.32s`,
      annotations: {
        9: 'The entire fix. Lock by account id, not by argument position - so A-then-B for everyone, and a wait cycle cannot form. Any total order works (id, uuid, memory address via id()) as long as EVERY code path uses the same one.',
        13: 'Note the balances still use src and dst, not first and second. Ordering decides lock acquisition only; it must not change the semantics of the operation.',
        20: 'random.sample picks pairs in both directions - exactly the interleaving that hung the previous version. 400 transfers, zero hangs.',
        32: 'The invariant that proves correctness, not just liveness: money is conserved. A concurrency test needs an invariant like this, because "it did not crash" proves nothing.',
      },
    },
    {
      type: 'note',
      md: `**Two more deadlock notes worth having ready.** *Equal keys*: if two accounts can share an id (or you order by a non-unique field), sorted order is ambiguous and the cycle comes back — order by something unique, and for the same-object case (\`transfer(a, a)\`) short-circuit before locking or you self-deadlock on a plain Lock. *Detection in production*: a deadlocked process is silent, so you find it by dumping stacks — \`faulthandler.dump_traceback_later(30)\`, \`py-spy dump --pid\`, or \`jstack\` on the JVM — and looking for two threads parked in \`acquire\`. Then read the two lock orders. That is the whole debugging technique, and "I would dump thread stacks and compare lock acquisition order" is the answer to *"how would you find it?"*.`,
    },
    {
      type: 'intuition',
      title: 'Designing a thread-safe class — the five rules',
      md: `This is the actual interview topic. In order of value:

1. **Decide the threading contract, and write it in the docstring.** Every class is one of: *thread-safe* (any method, any thread, any time), *thread-confined* (one owner thread — the caller must ensure it), *immutable* (safe by construction), or *conditionally thread-safe* (individual methods are safe; call sequences need external locking). Undocumented is the fifth kind, and it is the one that causes incidents.
2. **Prefer immutability.** An object that never changes after construction needs no lock, ever — no contention, no deadlock, no forgotten critical section. "Change" becomes "build a new one". This is the cheapest thread-safety in existence.
3. **Prefer confinement.** One owner thread plus a queue beats shared state plus locks: the state is touched by exactly one thread, so there is nothing to protect. This is what the actor model and the single-writer principle formalise, and it is why \`queue.Queue\` shows up in every good design.
4. **If you must lock: keep the lock private, keep the critical section small, never call out.** \`self._lock = threading.Lock()\` — private, so no caller can hold it, and no caller can be part of a deadlock cycle you cannot see. Locking on \`self\` (or a public attribute) means anyone can lock your object and hang it. And never invoke a callback, a listener, or any code you did not write while holding the lock.
5. **Compound operations must be atomic as a unit.** A class assembled from thread-safe parts is NOT thread-safe. Each call is atomic; the *sequence* is not. If a caller needs check-then-act, the class must expose it as ONE method.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Rule 5 in action: thread-safe parts, unsafe whole',
      code: `import threading, time

class SafeDict:
    """Conditionally thread-safe: each METHOD is atomic, call SEQUENCES are not."""
    def __init__(self):
        self._d, self._lock = {}, threading.Lock()
    def __contains__(self, k):
        with self._lock: return k in self._d
    def __setitem__(self, k, v):
        with self._lock: self._d[k] = v
    def put_if_absent(self, k, v):          # the compound op, atomic INSIDE the class
        with self._lock:
            return self._d.setdefault(k, v)

seats, gate, winners = SafeDict(), threading.Barrier(8), []
def book_broken(i):
    gate.wait()
    if 'A1' not in seats:                   # atomic call... then the lock is RELEASED
        time.sleep(0)
        seats['A1'] = i                     # another atomic call. Two locks, one race.
        winners.append(i)

ts = [threading.Thread(target=book_broken, args=(i,)) for i in range(8)]
for t in ts: t.start()
for t in ts: t.join()
print('broken  -> winners:', winners)

seats2, gate2, winners2 = SafeDict(), threading.Barrier(8), []
def book_fixed(i):
    gate2.wait()
    if seats2.put_if_absent('A1', i) == i:  # ONE lock covers check AND act
        winners2.append(i)

ts = [threading.Thread(target=book_fixed, args=(i,)) for i in range(8)]
for t in ts: t.start()
for t in ts: t.join()
print('fixed   -> winners:', winners2)

# broken  -> winners: [0, 7]      <- two threads sold the same seat (8 runs out of 10)
# fixed   -> winners: [7]         <- exactly one winner, every single run`,
      annotations: {
        4: 'Say this out loud in the interview: "conditionally thread-safe" is a real, respectable contract - it just has to be documented, because it puts the locking burden on the caller.',
        13: 'The fix is an API change, not a locking change. If callers need check-then-act, the class owes them one atomic method. setdefault returns the existing value if present, the new one if it inserted - so "== i" means "I inserted it".',
        18: 'Every individual line here is thread-safe. The bug lives in the GAP between them, which no amount of internal locking can close.',
        39: 'Ran it ten times: eight double-booked, two happened to produce one winner. That is the whole horror of races in one line - "it worked when I tested it" is a coin flip, not evidence.',
        40: 'Which id wins varies per run; that exactly one wins does not.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'A thread-safe bounded cache, done properly',
      code: `import threading
from collections import OrderedDict

_MISS = object()

class LruCache:
    """Thread-safe: every public method may be called from any thread, any time."""

    def __init__(self, capacity):
        self._cap = capacity
        self._data = OrderedDict()
        self._lock = threading.Lock()      # PRIVATE - no caller can ever hold it
        self.hits = self.misses = self.evictions = 0

    def get(self, key, default=None):
        with self._lock:                   # counters live inside the SAME lock
            if key not in self._data:
                self.misses += 1
                return default
            self.hits += 1
            self._data.move_to_end(key)
            return self._data[key]

    def put(self, key, value):
        with self._lock:
            self._data[key] = value
            self._data.move_to_end(key)
            if len(self._data) > self._cap:
                self._data.popitem(last=False)
                self.evictions += 1

    def get_or_compute(self, key, factory):
        hit = self.get(key, _MISS)
        if hit is not _MISS:
            return hit
        value = factory(key)               # OUTSIDE the lock: unknown, slow code
        with self._lock:
            return self._data.setdefault(key, value)   # first writer wins

    def __len__(self):
        with self._lock:
            return len(self._data)

def selfcheck():                           # the invariant test, not a smoke test
    c = LruCache(50)
    def hammer(t):
        for i in range(2000):
            c.put(f'k{(i * 7 + t) % 200}', i)
            c.get(f'k{i % 200}')
    ts = [threading.Thread(target=hammer, args=(t,)) for t in range(8)]
    for t in ts: t.start()
    for t in ts: t.join()
    assert len(c) <= 50 and c.hits + c.misses == 16000
    print('size', len(c), '| hits+misses', c.hits + c.misses, '| evictions', c.evictions)

selfcheck()

# size 50 | hits+misses 16000 | evictions 15914`,
      annotations: {
        12: 'Private lock, one per instance. Public would let a caller do "with cache._lock:" and become half of a deadlock cycle you can never find by reading your own file.',
        13: 'Counters are shared mutable state too. Put them under the same lock as the data they describe, or your hit rate quietly drifts wrong - the same lost-update race as the counter at the top of this module.',
        36: 'The rule that matters most: factory() is code you did not write. It may block on I/O for a second, or call back into this cache, or take another lock. Holding the lock across it turns a cache into a global stall or a deadlock.',
        38: 'The price of releasing the lock: two threads can both compute. setdefault makes sure only one VALUE is stored and both callers get the same object. If double-compute is unacceptable (an expensive model load), store a per-key Future under the lock instead.',
        53: 'This is the check the module owes you: bound respected and no lost counter updates under 8 threads. "It did not crash" is not a concurrency test - an invariant is.',
      },
    },
    {
      type: 'note',
      md: `**What to check in a code review, in 30 seconds.** (1) Which fields are mutable and shared? (2) Is every access to them under the same lock — including reads, including counters? (3) Is any lock held across I/O, a callback, or a \`sleep\`? (4) Does any method take two locks, and if so is the order fixed everywhere? (5) Do callers ever do check-then-act across two of your methods? (6) Is the contract in the docstring? Six questions catch most real concurrency bugs — and reciting them is a strong answer to "how would you review this class?".`,
    },
    {
      type: 'intuition',
      title: 'The alternatives — and the one-line reason for each',
      md: `Locks are one answer. Interviewers like hearing that you know the others and when they win.

- **async/await** — one thread, cooperative switching. Between two \`await\`s your code runs to completion, so there are **no data races on plain variables**. But the *logical* races survive: any \`await\` inside a check-then-act is exactly the gap we saw all module (\`if not await exists(k): await put(k)\` double-writes just fine). Use \`asyncio.Lock\` for those. Great for tens of thousands of I/O-bound connections; useless for CPU-bound work, and one blocking call freezes the whole loop.
- **multiprocessing** — separate processes, separate GILs, real CPU parallelism. Cost: no shared memory by default, so data crosses by pickling, and startup is heavy. Use for CPU-bound work; measure the serialization cost before assuming a win.
- **Actors / message passing** — no shared state at all. Each actor owns its data and communicates by messages; concurrency bugs become protocol bugs, which are easier to reason about and to test. This is Erlang/Elixir, Akka, and Go's *"do not communicate by sharing memory; share memory by communicating."* Note it is the same idea as rules 3 and 5 above: confinement plus a queue.
- The decision line: **I/O-bound and huge → async · CPU-bound → processes · shared mutable state you cannot avoid → locks, kept small and ordered · everything else → give the state one owner and a queue.**`,
    },
    {
      type: 'note',
      md: `**The closing script for the interview.** "First I would find the shared mutable state — that is the only place bugs can be. Then I would try to remove it: make it immutable, or give it a single owner thread and a queue. If it must stay shared, one private lock per object, critical sections as small as possible, no I/O or callbacks inside them, and a fixed global order if a path ever takes two. Compound operations get exposed as single atomic methods so callers cannot check-then-act. Then I would document the contract, and test it with an invariant under load rather than hoping." Every sentence there is a design decision, not a primitive — which is exactly the signal the question is looking for.`,
    },
  ],
  quiz: [
    {
      question: 'A Python counter incremented by 4 threads without a lock prints the exactly correct total in your test. What have you proved?',
      options: [
        { text: 'That the GIL makes += atomic, so no lock is needed', explanation: 'The GIL makes individual bytecodes atomic, not statements. `x += 1` is load, add, store — a thread switch can land between them.' },
        { text: 'Nothing — the race exists and you simply have not hit the losing interleaving yet', explanation: 'Correct. A tight loop has a two-bytecode window, so losses are rare; add any I/O, log line, or sleep between the read and the write and the same code loses 70%+ of its increments.' },
        { text: 'That 4 threads is too few to race', explanation: 'Two threads are enough. Thread count changes the odds, never the correctness.' },
        { text: 'That the code is correct on this Python version', explanation: 'Correctness that depends on timing is not correctness. The same source on a JVM or on free-threaded Python corrupts immediately.' },
      ],
      correct: 1,
    },
    {
      question: 'A "thread-safe" dict class locks inside every method. A caller writes `if k not in d: d[k] = v`. Is that safe?',
      options: [
        { text: 'Yes — every method call is atomic, so the sequence is atomic', explanation: 'Atomic methods do not compose. The lock is released between the two calls, and that gap is where two threads both pass the check.' },
        { text: 'Yes, provided the dict uses an RLock', explanation: 'Re-entrancy is about one thread re-acquiring its own lock. It does nothing about a second thread entering during the gap.' },
        { text: 'No — the lock is released between the check and the act; the class must expose one atomic put_if_absent', explanation: 'Correct. This is the compound-operation rule: a class built from thread-safe parts is not thread-safe. If callers need check-then-act, that belongs inside the class as a single method.' },
        { text: 'No, and the fix is for the caller to take the dict\'s internal lock', explanation: 'That fixes this call site and breaks the design: a public lock lets any caller stall your object or join a deadlock cycle you cannot see. The lock stays private; the API grows a method.' },
      ],
      correct: 2,
    },
    {
      question: 'Why must a Condition wait be written `while not predicate(): cv.wait()` rather than `if not predicate(): cv.wait()`?',
      options: [
        { text: 'Because a woken thread must re-acquire the lock, and another thread can consume the state first — plus spurious wakeups are permitted', explanation: 'Correct. notify() only makes a waiter runnable; it still queues for the lock. Between the notify and the wakeup the predicate can become false again, so it must be re-checked, forever, in a loop.' },
        { text: 'Because `if` does not release the lock', explanation: 'wait() releases the lock either way. The difference is only whether you re-check after waking.' },
        { text: 'Because notify_all() requires a loop syntactically', explanation: 'It does not — the code compiles fine with `if`, which is exactly why this bug ships.' },
        { text: 'Because `while` is faster', explanation: 'It is marginally more work, not less. Correctness, not speed, is the reason.' },
      ],
      correct: 0,
    },
    {
      question: 'What does making the producer-consumer buffer BOUNDED actually buy you?',
      options: [
        { text: 'Lower memory usage, nothing more', explanation: 'Memory is the symptom. The mechanism is what matters: bounding makes producers block.' },
        { text: 'Faster consumers', explanation: 'Consumers run at the same speed. The bound changes producer behaviour, not consumer throughput.' },
        { text: 'Guaranteed ordering of items', explanation: 'Ordering comes from the FIFO structure, which an unbounded queue also has.' },
        { text: 'Backpressure — a full buffer blocks producers, pushing the slowdown back up the pipeline instead of growing memory until OOM', explanation: 'Correct. An unbounded queue converts overload into unbounded memory and then a process kill; a bounded one converts it into a visible slowdown you can measure and alert on.' },
      ],
      correct: 3,
    },
    {
      question: 'A reader-preference RW lock protects a config object read constantly by 4 threads. Config updates take minutes to appear. Diagnosis?',
      options: [
        { text: 'Writer starvation — new readers keep the reader count above zero, so the writer never sees the gap it needs', explanation: 'Correct. In reader-preference the writer waits for zero readers; under steady overlapping read traffic that moment never arrives. Fix: a fair queued lock, or copy-on-write snapshots.' },
        { text: 'A deadlock between readers and the writer', explanation: 'Deadlock means a wait cycle and zero progress. Here the readers are making progress happily — that is what starvation looks like from the outside.' },
        { text: 'The GIL is serializing the readers', explanation: 'The GIL would slow reads uniformly. It cannot explain a writer specifically waiting minutes while reads fly.' },
        { text: 'The writer forgot to release the lock', explanation: 'Then reads would hang too. Only the writer is stuck, and only while readers are active.' },
      ],
      correct: 0,
    },
    {
      question: '`transfer(src, dst)` locks `src.lock` then `dst.lock`. It hangs about once a week. The most robust fix is:',
      options: [
        { text: 'Add `acquire(timeout=1)` and retry on failure', explanation: 'A real mitigation — it breaks the no-preemption condition and turns a hang into a slowdown. But the deadlock still occurs, and naive retry without jitter can livelock. Prevention beats recovery.' },
        { text: 'Acquire both locks in a fixed global order (e.g. sorted by account id) so a wait cycle cannot form', explanation: 'Correct. Circular wait is the easiest Coffman condition to remove: if every path takes the lower id first, T1 and T2 can never each hold what the other needs. The transfer semantics still use src and dst.' },
        { text: 'Switch both locks to RLock', explanation: 'RLock only helps a thread re-acquire a lock it already owns. Two different threads holding two different locks is untouched.' },
        { text: 'Use one global lock for all accounts', explanation: 'It does prevent the deadlock, and for a small system it is a legitimately lazy answer — but it serializes every transfer in the process. Ordering keeps the concurrency.' },
      ],
      correct: 1,
    },
    {
      question: 'Which is the strongest reason to make a shared object immutable?',
      options: [
        { text: 'Immutable objects use less memory', explanation: 'Often the opposite — every "change" allocates a fresh copy.' },
        { text: 'It needs no lock at all, so contention, forgotten critical sections, and deadlock all become impossible', explanation: 'Correct. Thread-safety by construction: if nothing can change, no coordination is required. It is the cheapest and most reliable rung of the whole ladder.' },
        { text: 'It makes writes faster', explanation: 'Writes get slower (copy the object). The win is entirely on the reader side and in the absence of locking.' },
        { text: 'The GIL only protects immutable objects', explanation: 'The GIL does not distinguish. It protects bytecode execution, not object semantics.' },
      ],
      correct: 1,
    },
    {
      question: 'You rewrite a locked, threaded service in asyncio. Which class of bug survives the rewrite?',
      options: [
        { text: 'Torn reads of a shared integer', explanation: 'Gone. A coroutine runs uninterrupted between awaits, so no other coroutine can observe a half-finished plain assignment.' },
        { text: 'Two coroutines both passing `if not await exists(k)` before either writes', explanation: 'Correct. Every `await` is a yield point, so check-then-act spanning an await races exactly like the threaded version. You need an asyncio.Lock — cooperative scheduling removes data races, not logical ones.' },
        { text: 'All race conditions — async is single-threaded', explanation: 'Single-threaded removes simultaneous memory access, not interleaving. Anything spanning an await can be interleaved.' },
        { text: 'CPU-bound slowness', explanation: 'That gets worse, not better: one long CPU-bound coroutine blocks the entire event loop, including every other connection.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'What is a race condition, and why can you not just test for one?',
      answer:
        'A race condition is when two threads access shared mutable state with at least one writer and no coordination, so the result depends on the scheduler. The classic is read-modify-write: `balance = balance + 1` is load, add, store, and a switch between load and store loses an update. Its cousin is check-then-act: `if k not in d: d[k] = v` — the check passes for two threads at once. You cannot test it away because the failure is timing-dependent: the losing interleaving may need a specific window that your laptop under a unit test never produces, while production under load produces it hourly. I proved this to myself: the same unlocked counter in a tight loop printed the exactly correct total, and with a single `time.sleep(0)` between the read and the write — standing in for a log line or an I/O call — it lost 74% of its increments. So the discipline is design, not testing: eliminate the shared mutable state where you can, and where you cannot, make the whole compound operation atomic — then test with an invariant (money conserved, hits+misses == calls) under load, which at least catches the coarse mistakes.',
      isCaseBased: false,
    },
    {
      question: 'Does the GIL make Python threads safe? Give me the precise answer.',
      answer:
        'No. The GIL guarantees only that one thread executes Python bytecode at a time, which makes individual bytecodes atomic. It does not make statements atomic: `x += 1` is three bytecodes and the interpreter can switch between them, and it does absolutely nothing for check-then-act, where the gap spans two whole statements plus whatever is between them. What the GIL does buy is that certain single operations on built-in types are effectively atomic — `list.append`, `dict[k] = v` — so you rarely get a corrupted internal structure, only wrong logic. Two consequences worth volunteering: threads in CPython give you concurrency for I/O-bound work, because a waiting thread releases the GIL, but not parallelism for CPU-bound work — that needs multiprocessing; and the moment you move the same design to a JVM, Go, C++, or free-threaded Python, the races that the GIL was merely making rare become constant. So: the GIL is a scheduling detail, never a substitute for a lock.',
      isCaseBased: false,
    },
    {
      question: 'Implement producer-consumer. Then tell me why you would not ship that implementation.',
      answer:
        'Hand-rolled: a bounded deque, one `threading.Condition`, and two predicates. The producer takes the condition, loops `while len(buf) == CAP: cv.wait()`, appends, then `notify_all()`. The consumer loops `while not buf: cv.wait()`, pops, then `notify_all()` because it just made the buffer not-full. Two details are the interview: the wait is in a `while`, never an `if` — a woken thread has to re-acquire the lock, so another thread can consume the state first, and spurious wakeups are permitted — and the consumer must notify too, or every producer sleeps forever once the buffer first fills, which is a deadlock with no lock cycle in it. Shutdown is a poison pill per consumer, pushed through the same buffer so each worker drains the real work ahead of it before exiting; a shutdown flag can be missed by a thread already parked in wait(). Why I would not ship it: `queue.Queue(maxsize=n)` is this code, tested by everyone, in three lines — the get/put already do the lock, the predicate loop, and the notify. I hand-roll it only when asked, because the point of asking is to see whether I know what Queue is hiding.',
      isCaseBased: false,
    },
    {
      question: 'Why does the buffer have to be bounded? What does that give you at system level?',
      answer:
        'Backpressure. When the buffer is full the producer blocks, and that block is a signal travelling backwards up the pipeline: "consumers cannot keep up, slow down." An unbounded queue never sends that signal — it silently converts overload into unbounded memory growth, and the failure mode is an OOM kill, which loses everything in flight, instead of a slowdown you can see and alert on. It is the same argument as queue depth in the messaging module, just at thread scale rather than service scale: the queue absorbs bursts, and the bound is what stops it absorbing a permanent mismatch. The design decision that follows is block-versus-drop: `put()` blocks and preserves everything at the cost of throttling the producer; `put_nowait()` plus a `queue.Full` handler drops or sheds load and keeps the producer free. For a payment pipeline you block; for telemetry you drop and count the drops. Choosing that deliberately, and exporting queue depth as a metric, is what separates a designed pipeline from one that happens to work.',
      isCaseBased: false,
    },
    {
      question: 'Design a readers-writers lock. Then tell me which fairness policy you would ship and why.',
      answer:
        'The invariant is many readers concurrently or one writer alone. A minimal reader-preference version: a counter of active readers guarded by a small lock, plus a resource lock that the FIRST reader acquires and the LAST reader releases; a writer just takes the resource lock. Readers after the first pay only the cheap counter lock. The problem is in that description: if a new reader arrives before the count reaches zero, it never reaches zero and the writer never runs. I measured it — a writer queued at 50 ms got in only after the entire read stream finished, 0.61 seconds later. Writer-preference inverts it: once a writer is waiting, new readers queue behind it, so writers get bounded waits and readers starve under back-to-back writes. I would ship the fair, queued variant — one FIFO queue, readers that arrived together still run in parallel, nobody overtakes a waiting writer — because it bounds both sides at a small cost in peak read throughput. And the honest prefix: Python has no stdlib RWLock, which is a hint. I start with a plain Lock, and only if profiling shows readers actually queueing do I consider this — and even then copy-on-write snapshots (readers take a reference to an immutable object, writers rebind it) usually beat an RW lock outright, with no fairness question at all.',
      isCaseBased: false,
    },
    {
      question: 'Case: this code deadlocks in production about once a week — `def transfer(src, dst, amt): with src.lock: with dst.lock: ...`. Find it, fix it, and tell me how you would have caught it.',
      answer:
        'The function is correct for any single call, which is why review passed it. The bug lives between two concurrent calls with swapped arguments: `transfer(A, B)` takes A then wants B, while `transfer(B, A)` takes B then wants A. Each holds what the other needs — circular wait — and neither will ever release. Once a week is exactly right: the window is a few microseconds wide, so it needs peak traffic plus bad luck. The fix is a global lock order: `first, second = sorted((src, dst), key=lambda a: a.id)`, lock in that order, and keep the debits and credits on src and dst — ordering governs acquisition only, never semantics. I ran the fixed version with 8 threads doing 400 random transfers in both directions: no hangs, and total money conserved at 5000, which is the invariant that proves it. Edge cases to name: `transfer(a, a)` self-deadlocks on a plain Lock, so short-circuit it; and if ids are not unique the order is ambiguous and the cycle returns. How I would catch it: a deadlocked process is silent — zero CPU, no logs, looks idle — so detection is stack dumps (`faulthandler.dump_traceback_later`, `py-spy dump --pid`) plus an alert on request latency, then read the two lock acquisition orders in the two stacks. Belt and braces for the interim: `acquire(timeout=...)` with jittered retry, which converts a permanent hang into a recoverable slowdown.',
      isCaseBased: true,
    },
    {
      question: 'Give me the four Coffman conditions and which one you actually attack.',
      answer:
        'Mutual exclusion (the resource admits one holder), hold-and-wait (a thread holds one lock while requesting another), no preemption (you cannot take a lock away from its holder), and circular wait (a cycle in the waits-for graph). All four must hold simultaneously, so removing any one makes deadlock impossible — and every real fix is exactly that. In practice I attack them in this order: first reduce the lock count or scope, because one lock instead of two is a deadlock that cannot exist; then break circular wait with a global lock ordering, which is the standard answer and costs nothing at runtime; then break no-preemption with `acquire(timeout=...)` and a jittered back-off retry, which is recovery rather than prevention and can livelock if the jitter is missing; and hold-and-wait can be broken by acquiring all locks at once or none, which is clean but often impractical because you do not know the full set upfront. Mutual exclusion is the one you almost never remove — unless you can, by making the data immutable or single-owner, which is the real senior answer.',
      isCaseBased: false,
    },
    {
      question: 'Case: here is a class — a dict of user sessions, a hit counter, and an expiry sweep, all touched by a request thread pool. Make it thread-safe. Walk me through your decisions.',
      answer:
        'First the contract: I decide this class is fully thread-safe — any method, any thread — and I write that in the docstring, because "conditionally thread-safe" would push locking onto every call site. Then I look for a way out of locking entirely: sessions are mutable and hot, so immutability does not fit, but if the sweep is the only writer of a large structure I would consider confinement — one owner thread plus a queue — or copy-on-write. Assuming shared state stays: one private `self._lock = threading.Lock()`, never a lock on `self`, so no caller can hold it or join a deadlock cycle I cannot see. Every access to both the dict AND the counter goes under that same lock — counters are shared mutable state too, and an unlocked counter is the lost-update race in disguise. Critical sections stay tiny: no I/O, no logging call that might block, and crucially no callback or user-supplied function invoked while holding it. Compound operations become single methods: `get_or_create(session_id)` instead of letting callers write `if sid not in s: s[sid] = ...`, because that gap races. The expiry sweep takes the lock briefly to collect expired keys into a list, releases it, and only then does any expensive cleanup — a sweep that holds the lock for the whole scan is a global stall. Finally I test it with an invariant under 8 threads: hits + misses equals total calls, and size never exceeds the bound. Follow-up I would pre-empt: if profiling shows lock contention, the next step is sharding the dict into N striped locks by `hash(key) % N`, not a cleverer single lock.',
      isCaseBased: true,
    },
    {
      question: 'Why must a lock be private? What actually goes wrong with `synchronized(this)` or locking on a public attribute?',
      answer:
        'Because a public lock makes your class\'s liveness the property of code you have never read. If any caller can do `with obj.lock:`, then any caller can hold it across a slow operation and stall every other user of that object, or acquire it in an order that combines with your internal order to form a deadlock cycle — and you will never find it by reading your own file, because the other half of the cycle is in someone else\'s module. It also freezes an implementation detail into your public API: the day you want to split into two locks or move to a lock-free structure, you cannot, because callers depend on the old one. Java\'s `synchronized(this)` and Python\'s "lock on a public attribute" are the same mistake. The rule is `self._lock = threading.Lock()`, private, and if callers genuinely need to compose operations atomically, you expose that composition as a method — or, if it truly must be general, an explicit context manager that you control and document. Same reasoning underlies the sibling rule: never call unknown code (a callback, a listener, a plugin) while holding your lock, because that code can take locks you cannot see.',
      isCaseBased: false,
    },
    {
      question: 'Threads, processes, asyncio, or actors — how do you choose, and what breaks in each?',
      answer:
        'The question is what the work is waiting on. I/O-bound with a moderate number of tasks: threads — a waiting thread releases the GIL, memory is shared so coordination is cheap, and the cost is that you own the race conditions. I/O-bound with tens of thousands of concurrent connections: asyncio — one thread, cooperative switching, no data races on plain variables because code runs uninterrupted between awaits; the traps are that any blocking call freezes the whole loop, and logical check-then-act races survive any `await` inside them, so you still need `asyncio.Lock`. CPU-bound: multiprocessing — separate interpreters, real parallelism; the cost is pickling data across the boundary and heavy startup, so measure before assuming a win. And the design-level answer: actors and message passing — no shared state at all, each actor owns its data and communicates by messages, which turns concurrency bugs into protocol bugs that you can test. That is Erlang, Akka, and Go\'s "share memory by communicating", and it is the same principle as thread confinement plus a queue, which is why the single-owner-plus-queue design keeps winning inside a single process too.',
      isCaseBased: false,
    },
    {
      question: 'Case: an image-processing service has a thread pool of 32 workers pulling from an unbounded in-memory queue. Under a traffic spike, memory climbs until the pod is OOM-killed and every in-flight job is lost. Redesign it.',
      answer:
        'The unbounded queue is the bug: with no bound there is no backpressure, so overload becomes memory growth and then total loss. Fix in layers. First, bound the queue — `queue.Queue(maxsize=...)` sized so blocking starts well before memory pressure; now the HTTP handler either blocks (throttling the client) or, better for a request path, uses `put_nowait` and returns 429 or 503 with Retry-After. That converts a fatal OOM into visible, measurable load shedding. Second, durability: the pod dying should not lose accepted work, so the queue should be external — Redis/SQS/Kafka — with the in-memory queue only as a small prefetch buffer, and jobs acknowledged only after completion so a crash redelivers rather than drops. That also means workers must be idempotent, since redelivery implies at-least-once. Third, the pool size: 32 threads for image work is CPU-bound, and threads in CPython will not parallelise it — this should be a process pool sized to cores, or a separate worker deployment. Fourth, observability: export queue depth, oldest-item age, and rejection count; queue depth rising steadily is the single best early warning, and it is the metric an unbounded queue silently denies you. Tradeoff to state plainly: external queue plus acks adds latency and operational surface, and I would skip it if losing a job is genuinely acceptable — but the bound and the shedding I would add regardless, today.',
      isCaseBased: true,
    },
    {
      question: 'A junior wraps every method of a shared class in a single lock and reports the service got slower on a 16-core box. Explain, and give them the ladder.',
      answer:
        'A single coarse lock makes the class a serialization point: 16 cores can execute at most one of its methods at a time, so you pay all the coordination cost of threads and get single-threaded throughput — plus lock convoying, where threads queue and each hand-off costs a context switch. It is worse than slower, it is negative-scaling. The ladder I would give them, cheapest first. One: does this state need to be shared at all? Confine it to one owner thread with a queue and the lock disappears. Two: can it be immutable, with writers publishing a new snapshot by rebinding one reference? Readers then need no lock at all. Three: shrink the critical section — anything not touching the shared state, especially I/O, logging, serialization, and callbacks, moves outside the lock; often the lock ends up covering three lines. Four: if reads dominate and are genuinely long, measure, then consider an RW lock or copy-on-write. Five: if writes are the contention, shard the state into stripes with a lock per stripe (`hash(key) % 16`), which is how concurrent hash maps scale. Six: only then reach for lock-free structures, which are hard to get right and rarely justified. And the meta-point: every one of those steps should be triggered by a profile showing contention, not by a hunch — the coarse lock was the correct FIRST version, just not the last one.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'The three enemies of concurrent code', back: 'Race condition (result depends on who won — wrong data, rarely). Deadlock (mutual waiting — total freeze, 0% CPU). Starvation/livelock (legal work but someone never gets a turn / everyone backs off and nothing progresses).' },
    { front: 'Three ingredients of a race condition', back: 'Shared state + at least one writer + no coordination. Remove any ONE and the race is gone — which is why immutability and confinement beat locking.' },
    { front: 'What the GIL protects (and what it does not)', back: 'Protects: one thread runs bytecode at a time, so single bytecodes are atomic. Does NOT protect: statements (`x += 1` = load/add/store) or check-then-act. Threads = concurrency for I/O, never parallelism for CPU.' },
    { front: 'The Condition rule', back: 'Always `while not predicate(): cv.wait()`, never `if`. A woken thread must re-acquire the lock, so another thread can consume the state first (wake-then-lose), and spurious wakeups are permitted. Prefer notify_all unless all waiters await the identical condition.' },
    { front: 'Why the producer-consumer buffer is BOUNDED', back: 'Backpressure. A full buffer blocks producers, pushing the slowdown back up the pipeline. Unbounded = overload silently becomes memory growth, then OOM. Design choice: block (put) vs drop (put_nowait + Full).' },
    { front: 'Poison pill', back: 'A sentinel object pushed once per consumer through the same queue. Each worker drains the real work queued ahead of it, then sees its pill and exits. Beats a shutdown flag, which a thread already parked in wait() can miss.' },
    { front: 'Readers-writers fairness, three policies', back: 'Reader-preference: max read throughput, writers STARVE. Writer-preference: bounded writer waits, readers starve. Fair/queued FIFO: nobody starves, slightly lower peak reads — the default. Python has no stdlib RWLock; try a plain Lock or copy-on-write first.' },
    { front: 'The four Coffman conditions', back: 'Mutual exclusion, hold-and-wait, no preemption, circular wait — all four required. Break circular wait with a GLOBAL lock order (sort by id); break no-preemption with acquire(timeout) + jittered retry; best of all, reduce the lock count.' },
    { front: 'Designing a thread-safe class — the five rules', back: '1) Document the contract (safe / confined / immutable / conditionally safe). 2) Prefer immutability — no lock needed. 3) Prefer confinement — one owner + a queue. 4) Private lock, small critical section, never call unknown code inside it. 5) Compound ops must be ONE atomic method.' },
    { front: 'Why "built from thread-safe parts" is not thread-safe', back: 'Each method is atomic; the SEQUENCE is not. `if k not in d: d[k] = v` releases the lock in the gap, so two threads both pass the check. Fix is an API change — expose put_if_absent / get_or_create — not more internal locking.' },
  ],
  mindmapMarkdown: `- Concurrency in Design
  - Three enemies
    - Race: wrong data, timing-dependent
    - Deadlock: frozen, 0% CPU, silent
    - Starvation / livelock: no turn / no progress
  - Races
    - Read-modify-write and check-then-act
    - GIL: bytecodes atomic, statements NOT
  - Primitives
    - Lock · RLock (a smell) · Semaphore(n)
    - Condition: wait on a predicate — always while
    - Event · Barrier · queue.Queue
  - Producer-consumer
    - Bounded buffer = backpressure
    - Condition by hand vs queue.Queue(maxsize)
    - Poison pill per consumer for shutdown
  - Readers-writers
    - Many readers OR one writer
    - Reader-preference starves writers, and the reverse
    - Fair queued default; copy-on-write often wins
  - Deadlock
    - Coffman: mutex, hold-and-wait, no preempt, cycle
    - Fix: fewer locks, then a global lock ORDER
    - Detect: dump thread stacks, compare orders
  - Thread-safe class
    - Immutable > confined > locked
    - Private lock, small critical section, no callbacks
    - Compound ops atomic; document the contract
  - Alternatives
    - async (races survive await) · processes for CPU · actors`,
}

export default m
