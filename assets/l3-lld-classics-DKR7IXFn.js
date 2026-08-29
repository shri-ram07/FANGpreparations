var e={id:`sysdesign-l3-lld-classics`,subjectId:`sysdesign`,level:3,title:`LLD Classics: Parking Lot, Elevator, Splitwise, BookMyShow & Chess`,whyItMatters:`The LLD round is a different exam from HLD with the same clock. Nobody asks for QPS; they ask where a responsibility lives, and then they change the requirements to see if your design survives. Five problems cover almost every LLD asked at FAANG and the Indian product companies — and each one has exactly one genuinely hard decision hiding under a pile of bookkeeping. This module teaches the method, then finds that decision in all five.`,estMinutes:75,sections:[{type:`intuition`,title:`HLD asks how many machines. LLD asks how many classes.`,md:`A city planner decides where the roads go. An architect decides where the rooms go inside one building. Same city — completely different questions.

- **HLD** (the Level 2 case studies): services, databases, queues, QPS. *"How does this survive a million users?"*
- **LLD**: the classes inside ONE service. *"How is this coded so the next feature is not a rewrite?"*
- The scoring changes with the zoom. In HLD you defend a topology. In LLD you defend where a **responsibility** lives.
- Same 45 minutes, same real test: can you hold a design in your head and change it under pressure when the interviewer says "now add electric-vehicle charging"?
- The five problems below are most of what actually gets asked. Learn the method first — the problems are just its practice range.`},{type:`intuition`,title:`The six-step LLD method — this is the part that transfers`,md:`Do these in order, out loud, every time. The parking lot is disposable; the method is not.

1. **Clarify, then write down the nouns and verbs.** Ask three scoping questions, then literally list them: *vehicle, spot, ticket, floor* / *park, unpark, price, find a free spot*. The interviewer's own sentences are your requirements document.
2. **Nouns become candidate classes — and some get cut.** \`plate\` is a string field on a ticket, not a \`Plate\` class. Cutting a noun out loud scores better than modelling it.
3. **Verbs become methods, on the class that owns the data.** \`lot.park(vehicle)\`, not \`parkingService.park(lot, vehicle)\`. Behaviour goes where the state is; classes that only hold data with a separate class that only acts on it is the anemic-model smell.
4. **Decide relationships: has-a or is-a.** A lot *has* spots; a spot *has* a type. Prefer **composition** — inheritance is only for genuine "is a kind of, and is substitutable", and every extra layer of it is a future rewrite.
5. **Find the ONE hard decision.** Every classic has exactly one thing that is actually difficult; everything else is bookkeeping. Name it: *"the interesting part of this problem is X."* That single sentence separates candidates.
6. **Write the skeleton with types, then say what you deliberately left out.** Class names, key fields, method *signatures*. Then: "I skipped payments and reservations — here is where they hook in."`},{type:`note`,md:'**Interviewers score the discussion of tradeoffs, not the volume of code.** Nobody has ever passed a round by typing `get_plate()`. Enumerating every getter, setter, and constructor burns the 45 minutes you needed for the one hard decision, and it signals that you cannot tell the interesting part of a problem from the boring part. Write the fields, write the method signatures, put `# ...` where the obvious body goes — then spend the time you saved arguing with yourself out loud: *"I could keep pairwise balances for O(1) reads, but a corrected expense means recomputing them anyway, so the log is the truth and balances are a cache."* That sentence **is** the interview. And finish the whole skeleton before polishing any part of it: a complete rough design beats a beautiful third of one, every time.'},{type:`intuition`,title:`Design 1 — Parking Lot. Your turn first`,md:`**Try it first:** list the nouns and verbs for a multi-floor parking lot, and name the one part you expect to be genuinely hard. Then read on.

Functional:

- Vehicles of different sizes (motorcycle, car, truck) enter, get a **ticket**, and are told where to park.
- Spots come in types (motorcycle, compact, large). A vehicle fits some types and not others — a truck needs large, a motorcycle fits anything.
- On exit the ticket is priced by duration, and the spot returns to the pool immediately.
- Multiple floors. The lot can report whether it is full, per type.

Non-functional — these are what actually shape the code:

- **Allocation must be near-O(1).** An airport lot has 10,000 spots and a car arrives every few seconds.
- **No two cars ever get the same spot.** Several entry gates run this code at the same moment.
- **The allocation policy will change** — nearest to the lift, cheapest floor, EV-first. It must be swappable without opening \`ParkingLot\`.`},{type:`intuition`,title:`Parking Lot — the object graph (UML-lite)`,md:'Read the indentation as "has-a". Nothing here inherits from anything except the one interface.\n\n- **ParkingLot** — the aggregate root; the only object the outside world talks to\n  - has-many **Spot**: `id`, `floor: int`, `type: SpotType` (a separate `Floor` class would add nothing but a number)\n  - has-one **AllocationStrategy** (interface) → `SmallestFit`, `NearestToLift`, `CheapestFloor`\n  - has-one **Pricing**: `amount(ticket) -> money` — its own object, because rates change and parking does not\n  - has-many open **Ticket**: `id`, `plate`, `spot`, `in_at`, `out_at`\n  - exposes exactly two verbs: `park(plate, vehicle_type, now) -> Ticket | None` and `leave(ticket_id, now) -> fee`\n- **SpotType** and **VehicleType** are enums; the fitting rule is a **map** (`vehicle -> [fitting spot types]`), never an if-else ladder\n- **AllocationStrategy** is the Strategy pattern from the design-patterns module in its most natural habitat: one axis of policy that genuinely varies, hidden behind one method\n- `plate` stays a string. Say "I am not making Vehicle a class — it would carry one field" and move on.'},{type:`code`,lang:`python`,title:`Parking Lot — the skeleton (runnable)`,code:`from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from threading import Lock
import math

class SpotType(Enum):
    MOTO, COMPACT, LARGE = 1, 2, 3

class VehicleType(Enum):
    MOTO, CAR, TRUCK = 1, 2, 3

FITS: dict[VehicleType, list[SpotType]] = {          # smallest fitting type first
    VehicleType.MOTO: [SpotType.MOTO, SpotType.COMPACT, SpotType.LARGE],
    VehicleType.CAR: [SpotType.COMPACT, SpotType.LARGE],
    VehicleType.TRUCK: [SpotType.LARGE],
}

@dataclass(frozen=True)
class Spot:
    id: str
    floor: int
    type: SpotType

@dataclass
class Ticket:
    id: str
    plate: str
    spot: Spot
    in_at: float
    out_at: float | None = None

class AllocationStrategy(ABC):                        # swappable: Strategy pattern
    @abstractmethod
    def pick(self, free: dict[SpotType, list[Spot]], v: VehicleType) -> Spot | None: ...

class SmallestFit(AllocationStrategy):
    """Stop trucks from eating compact spots. O(1): pop from a per-type free list."""
    def pick(self, free, v):
        for st in FITS[v]:
            if free[st]:
                return free[st][-1]
        return None

class Pricing:                                        # its own object: rates change, parking does not
    def __init__(self, first_hour: float = 30, per_hour: float = 20):
        self.first_hour, self.per_hour = first_hour, per_hour
    def amount(self, t: Ticket) -> float:
        hrs = max(1, math.ceil((t.out_at - t.in_at) / 3600))
        return self.first_hour + (hrs - 1) * self.per_hour

class ParkingLot:
    def __init__(self, spots: list[Spot], strategy: AllocationStrategy, pricing: Pricing):
        self.free = {st: [s for s in spots if s.type is st] for st in SpotType}   # per-type lists
        self.strategy, self.pricing, self.open, self.lock, self.n = strategy, pricing, {}, Lock(), 0

    def park(self, plate: str, v: VehicleType, now: float) -> Ticket | None:
        with self.lock:                               # find + claim must be ONE atomic step
            spot = self.strategy.pick(self.free, v)
            if spot is None:
                return None
            self.free[spot.type].remove(spot)
            self.n += 1
            t = Ticket(f'T{self.n}', plate, spot, now)
            self.open[t.id] = t
            return t

    def leave(self, ticket_id: str, now: float) -> float:
        with self.lock:
            t = self.open.pop(ticket_id)
            t.out_at = now
            self.free[t.spot.type].append(t.spot)     # spot is reusable the instant it frees
            return self.pricing.amount(t)

if __name__ == '__main__':
    lot = ParkingLot([Spot('F1-C1', 1, SpotType.COMPACT), Spot('F1-L1', 1, SpotType.LARGE)],
                     SmallestFit(), Pricing())
    car = lot.park('KA01AB1234', VehicleType.CAR, 0)
    print('car ->', car.spot.id, '| truck ->', lot.park('T9', VehicleType.TRUCK, 0).spot.id)
    print('a second truck ->', lot.park('T8', VehicleType.TRUCK, 0), '(no LARGE spot left)')
    print('fee for 2h05m ->', lot.leave(car.id, 7500), '(hourly billing rounds up to 3h)')`,annotations:{13:`The fitting rule as DATA, not branches. Adding an EV spot type is one row here — not a new if in three methods.`,33:`One interface, three plausible implementations, injected in the constructor. That is the honest test for "does this deserve an abstraction?"`,45:`Pricing is separate because it is what actually changes: weekend rates, EV surcharge, first-30-minutes-free. None of that should reopen ParkingLot.`,54:`The hard decision made concrete: a free list per spot type turns allocation into a pop. Scanning all 10,000 spots would be O(n) per arrival.`,58:`Find-then-claim is a read-modify-write. Two gates, two threads, one spot: without this, both are told spot 412 is free.`,72:`Freeing is just as racy as claiming — same lock. Also note the ticket keeps its spot after leaving, so the receipt still prints.`}},{type:`note`,md:'**The one hard decision: finding a free spot fast, and claiming it exactly once.**\n\n*Finding it.* Scanning every spot per arrival is O(n) — and the cost peaks exactly when the lot is fullest, which is also when cars arrive fastest. Per-type **free lists** make it a `pop`. If the strategy needs "nearest to the lift", swap each list for a **min-heap keyed by walking distance**: O(log n), still fine. A third option worth naming: a **per-floor free counter plus a bitmap of spots**, which is what real garage hardware uses because a 10,000-bit map is 1.25 KB and fits in L1 cache.\n\n*Claiming it.* `find` then `mark taken` is a read-modify-write, and the gap between them is where two gates hand out the same spot. The lock in `park()` closes that gap, and its ceiling is honest: **one lot-wide lock serialises every entry**. The upgrade path, in order — a lock **per spot type** (four locks, roughly four times the throughput), then per floor, then push the claim into the database as `UPDATE spot SET taken=true WHERE id=? AND taken=false` and trust the row count. That last form is the same trick BookMyShow uses below, and it is the only one that survives *multiple app servers*, which no in-process lock does. Say that limitation before the interviewer asks.'},{type:`intuition`,title:`Design 2 — Elevator. Your turn first`,md:`**Try it first:** there are two kinds of request in this system. Name them, and say why the difference changes the design. Then read on.

Functional:

- A **hall call**: someone on floor 6 presses UP. It carries a floor **and a direction**, and *any* car may answer it.
- A **car request**: a rider inside presses 9. It carries a floor only, and belongs to *that one car*.
- Cars move floor by floor: open doors, dwell, close, continue.
- A bank of N cars with one dispatcher deciding who answers each hall call.

Non-functional:

- **Average wait time** is the headline metric. **Worst-case wait** is the one that generates complaints.
- No starvation: a call on floor 2 must not wait forever because the lobby is busy.
- Cars are physical objects. Direction reversals cost time and electricity, so a good algorithm minimises them.`},{type:`note`,md:`**Why FCFS is wrong, and what SCAN/LOOK is.** Serve requests in arrival order, and a car sitting on floor 5 with a pending call for floor 6 will first drive all the way down to floor 1 — because that button was pressed thirty seconds earlier — then climb back past 5 to reach 6. Riders experience that as the elevator ignoring them. **SCAN** fixes it: keep travelling in one direction, stop at every requested floor on the way, and only reverse at the end of the shaft. **LOOK** is SCAN with the obvious improvement — reverse as soon as nothing further remains in the current direction, instead of driving to the top floor out of principle. Every real elevator runs LOOK. This is literally **disk-head scheduling with doors**, and saying so is exactly the kind of transfer interviewers listen for. The cost to admit: pure LOOK can starve a request if same-direction calls keep arriving ahead of it, which is why production dispatchers add an age term to the score.`},{type:`intuition`,title:`Elevator — the object graph (UML-lite)`,md:'- **Dispatcher** — owns the bank of cars and routes every hall call\n  - has-many **Car**: `id`, `floor: int`, `dir: Dir`, `state: State`, `stops: set[int]`\n  - `hall_call(floor, direction) -> Car`, decided by `cost(car, floor, direction) -> int`\n- **Car** — one state machine plus one stop set; `request(floor)` and `step()` (one tick of the physical world)\n  - **State**: `IDLE → MOVING_UP / MOVING_DOWN → DOORS_OPEN → IDLE`. Four states, and the *transitions* are the design.\n  - **Dir**: `UP = +1`, `IDLE = 0`, `DOWN = -1`. Making direction a signed int turns "is that floor ahead of me?" into one multiplication — a small trick that deletes a lot of branching.\n- **Request** is deliberately **not** a class: both kinds collapse into "add a floor to some car\'s stop set". The direction on a hall call only ever matters to `cost()`, so it never needs to be stored.\n- **Button**, **Door**, and **Display** are nouns you should mention and then cut — they are I/O, not design.'},{type:`code`,lang:`python`,title:`Elevator — LOOK scheduling plus a multi-car dispatcher (runnable)`,code:`from enum import Enum

class Dir(Enum):
    UP, IDLE, DOWN = 1, 0, -1

class State(Enum):
    IDLE, MOVING_UP, MOVING_DOWN, DOORS_OPEN = 'idle', 'up', 'down', 'doors'

class Car:
    """One car running LOOK: keep going while stops remain ahead, then reverse."""

    def __init__(self, cid: str, floor: int = 0):
        self.id, self.floor = cid, floor
        self.dir, self.state = Dir.IDLE, State.IDLE
        self.stops: set[int] = set()

    def request(self, floor: int) -> None:            # hall call AND car button land here
        self.stops.add(floor)

    def step(self) -> None:
        if self.state is State.DOORS_OPEN:            # doors take one tick, then move on
            self.state = State.IDLE
        if self.floor in self.stops:
            self.stops.discard(self.floor)
            self.state = State.DOORS_OPEN
            return
        if not self.stops:
            self.dir, self.state = Dir.IDLE, State.IDLE
            return
        ahead = [f for f in self.stops if (f - self.floor) * self.dir.value > 0]
        if not ahead:                                 # nothing this way: reverse (the LOOK turn)
            self.dir = Dir.UP if max(self.stops) > self.floor else Dir.DOWN
        self.floor += self.dir.value
        self.state = State.MOVING_UP if self.dir is Dir.UP else State.MOVING_DOWN

class Dispatcher:
    """Multi-car: every hall call is an auction. cost() IS the product decision."""

    def __init__(self, cars: list[Car]):
        self.cars = cars

    def hall_call(self, floor: int, want: Dir) -> Car:
        best = min(self.cars, key=lambda c: self.cost(c, floor, want))
        best.request(floor)
        return best

    @staticmethod
    def cost(c: Car, floor: int, want: Dir) -> int:
        d = abs(c.floor - floor)
        if c.dir is Dir.IDLE:
            return d
        toward = (floor - c.floor) * c.dir.value > 0
        if toward and c.dir is want:
            return d                                  # free pickup on the way
        return d + 2 * len(c.stops) + 10              # must finish its sweep, then come back

if __name__ == '__main__':
    a, b = Car('A', 1), Car('B', 7)
    a.dir, a.stops = Dir.UP, {9}                      # A: at 1, climbing to 9
    b.dir, b.stops = Dir.DOWN, {0}                    # B: at 7, descending to 0
    d = Dispatcher([a, b])
    print('hall call: floor 6, going UP  ->', d.hall_call(6, Dir.UP).id, '(B is nearer but wrong-way)')
    trace = []
    while a.stops:
        a.step()
        trace.append(f'{a.floor}{"*" if a.state is State.DOORS_OPEN else ""}')
    print('A floors (* = doors open):', ' '.join(trace))`,annotations:{6:`The four states. IDLE to MOVING on a request, MOVING to DOORS_OPEN on arrival, DOORS_OPEN back to IDLE after the dwell tick — that is the entire machine.`,17:`Both request kinds collapse to one line. The difference between them lives in the dispatcher, not the car.`,30:`LOOK in one expression: which pending stops are ahead of me, given my signed direction. FCFS would sort by arrival time here and yo-yo the car.`,31:`The LOOK turn: reverse the moment nothing remains this way. SCAN would keep going to the end of the shaft first.`,43:`Multi-car dispatch in one line — score every car, give the call to the cheapest. Everything genuinely hard is inside cost().`,55:`The wrong-direction penalty. Tuning these three constants IS tuning the product; add an age term here to stop starvation.`}},{type:`note`,md:`Run output: the call on floor 6 goes to car **A** — six floors away and climbing — not to car **B**, which is one floor away but descending. B would have to finish its trip to the lobby and come back. A's trace is \`2 3 4 5 6 6* 7 8 9 9*\`: it picks up floor 6 for free on the way to 9, which is the entire point of LOOK.

**The one hard decision: which car answers a hall call — and what "best" even means.**

A single car's movement is a solved algorithm. The whole design lives inside \`Dispatcher.cost()\`, because that function encodes what the building owner is optimising, and the three plausible objectives genuinely disagree:

- **Minimise average wait** — score by distance with a heavy penalty for wrong-direction cars. Best headline numbers; the unlucky rider on floor 2 waits four minutes and emails facilities.
- **Minimise worst-case wait** — add an age term so an old call outranks a nearer car. Average gets slightly worse, complaints stop. Most real buildings ship this.
- **Minimise energy** — prefer the car already moving and keep the rest parked. Sixteen-car office towers genuinely do this overnight.

Two alternatives to the greedy score, worth naming as "what I would reach for next": **zoning** (cars 1–2 own floors 1–10, cars 3–4 own 11–20 — trivial to implement, terrible when one zone empties) and **full assignment optimisation** (re-solve all pending calls whenever one arrives — better results, far more code, and the reason destination-dispatch lobbies make you enter your floor *before* boarding).`},{type:`intuition`,title:`Design 3 — Splitwise. Your turn first`,md:`**Try it first:** three friends, four expenses, some split unevenly. What is the *smallest* thing you must store, and what can you always recompute from it? Then read on.

Functional:

- **Users**, **groups** of users, and an **expense** paid by one user and shared among several.
- Split types: **equal**, **exact amounts**, **percentages** — and more will be added (shares, adjustments). This is the axis that varies.
- Show any user their balance with any other user, and the group totals.
- **Settle up**: record a payment that clears a debt.
- **Simplify debts**: turn a tangle of pairwise IOUs into the fewest transfers.

Non-functional:

- **Money must be exact.** Store integer paise or cents, never floats — and decide out loud where the leftover 1 paise of a three-way ₹100 split goes.
- An expense can be **edited or deleted months later**, and every balance it touched must correct itself.`},{type:`intuition`,title:`Splitwise — the object graph (UML-lite)`,md:'- **Ledger** (one per group) — the aggregate root; owns an **append-only expense log**\n  - has-many **Expense**: `id`, `payer`, `amount: int` (paise), `people: list[user]`, `split: Split`\n  - has-one **Split** per expense — an interface with exactly one method, `shares(amount, people) -> dict[user, int]`\n  - implementations: `Equal`, `Exact(amounts)`, `Percent(pct)` — the hierarchy that keeps growing, so it is the one that earns an interface\n  - `net() -> dict[user, int]` — the derived balance sheet, where **positive means "is owed"** and negative means "owes"\n- **simplify(net) -> list[(from, to, amount)]** — a free function, not a method: it needs no object state, only the net map\n- **User** and **Group** are thin (id, name, member list). Mention them, do not spend interview minutes there.\n- The pairwise "A owes B ₹300" table everyone reaches for first is deliberately **not stored** — it is a projection of the log, and the note below is the argument for why.'},{type:`code`,lang:`python`,title:`Splitwise — split strategies, the balance sheet, and real debt simplification (runnable)`,code:`from abc import ABC, abstractmethod
from collections import defaultdict
from dataclasses import dataclass

class Split(ABC):                                     # Strategy: one per split rule
    @abstractmethod
    def shares(self, amount: int, people: list[str]) -> dict[str, int]: ...

class Equal(Split):
    def shares(self, amount, people):                 # amounts are PAISE (ints) - never float money
        base, rem = divmod(amount, len(people))
        return {p: base + (1 if i < rem else 0) for i, p in enumerate(people)}

class Exact(Split):
    def __init__(self, amounts: dict[str, int]):
        self.amounts = amounts

    def shares(self, amount, people):
        assert sum(self.amounts.values()) == amount, 'exact shares must sum to the total'
        return dict(self.amounts)

class Percent(Split):
    def __init__(self, pct: dict[str, float]):
        self.pct = pct

    def shares(self, amount, people):
        assert abs(sum(self.pct.values()) - 100) < 1e-9, 'percentages must sum to 100'
        out = {p: int(amount * self.pct[p] / 100) for p in people}
        out[people[0]] += amount - sum(out.values())  # rounding crumbs go to one payer
        return out

@dataclass
class Expense:
    id: str
    payer: str
    amount: int
    people: list[str]
    split: Split

class Ledger:
    """The expense LOG is the source of truth. Balances are a derived projection."""

    def __init__(self):
        self.log: list[Expense] = []

    def add(self, e: Expense) -> None:
        self.log.append(e)

    def net(self) -> dict[str, int]:                  # + = is owed, - = owes
        bal: dict[str, int] = defaultdict(int)
        for e in self.log:
            for who, owed in e.split.shares(e.amount, e.people).items():
                bal[who] -= owed
            bal[e.payer] += e.amount
        return {u: v for u, v in bal.items() if v}

def simplify(net: dict[str, int]) -> list[tuple[str, str, int]]:
    """Min-cash-flow, greedy: biggest debtor pays biggest creditor until someone is settled."""
    debt = sorted(([v, u] for u, v in net.items() if v < 0))               # most negative first
    cred = sorted(([v, u] for u, v in net.items() if v > 0), reverse=True)  # most positive first
    out, i, j = [], 0, 0
    while i < len(debt) and j < len(cred):
        pay = min(-debt[i][0], cred[j][0])
        out.append((debt[i][1], cred[j][1], pay))
        debt[i][0] += pay
        cred[j][0] -= pay
        i += debt[i][0] == 0
        j += cred[j][0] == 0
    return out

if __name__ == '__main__':
    led = Ledger()
    led.add(Expense('e1', 'Asha', 30000, ['Asha', 'Bilal', 'Chen'], Equal()))
    led.add(Expense('e2', 'Bilal', 9000, ['Asha', 'Bilal', 'Chen'], Equal()))
    print('net paise:', led.net())
    print('transfers:', simplify(led.net()), '-> 2 payments instead of 4')`,annotations:{10:`Integers, always. 0.1 + 0.2 != 0.3 in floats, and a money bug that drifts one paise per expense is a support ticket you cannot reproduce.`,11:`The remainder problem, solved in one line: 10000 paise across 3 people is 3334/3333/3333. Interviewers ask who gets the extra paise — have an answer.`,29:`Percent has the same crumb problem, one layer deeper. Assign the leftover deterministically or the group total silently stops matching.`,49:`The entire balance sheet is this loop: everyone owes their share, the payer is credited the full amount. Sum of all values is always exactly zero.`,57:`A free function, not a Ledger method — it depends only on the net map. Resisting the urge to make everything a method is a real design signal.`,67:`Each iteration zeroes at least one person, so it terminates in at most n-1 transfers. Not guaranteed minimal - say so out loud.`}},{type:`note`,md:`Run output: after a ₹300 dinner paid by Asha and a ₹90 taxi paid by Bilal, the net is \`Asha +17000, Bilal -4000, Chen -13000\` paise, and \`simplify\` turns four pairwise IOUs into **two** transfers.

**The one hard decision: store pairwise balances, or recompute them from the log?**

*Store them.* A \`balance(a, b)\` table updated on every expense. Reads are O(1) and the group screen is instant. The bill arrives the first time someone **edits or deletes a three-month-old expense**: you must apply the inverse delta to every pair it touched, in order, without ever failing halfway. Ship one bug in that path and you now hold balances that correspond to *no* set of expenses — with no way to tell which number is wrong.

*Recompute from the log.* The expense list is append-only and self-evidently correct: it is what people actually typed. Balances become a pure function of it, so an edit is "change the row, recompute", and a bug is fixed by replaying. The cost is real: O(expenses) per read, and a five-year-old flat group has thousands.

**The answer is both, in the right order — the log is the source of truth, balances are a cache.** Keep the pairwise table for fast reads, but treat it as derived: rebuild on edit, recompute nightly, reconcile and alert on drift. That is event sourcing in miniature, and the sentence to say is *"I would never let a balance be the only place a number lives."*

**On simplification.** This is a genuine algorithm question wearing a product costume. Net every user to one number, then greedily match the biggest debtor to the biggest creditor. It finishes in at most **n − 1** transfers for n people with non-zero balances, because each step zeroes at least one of them. It is **not guaranteed minimal** — the true minimum requires finding subsets that sum to zero, which is NP-hard — and volunteering that, instead of claiming optimality, is what separates a real answer from a memorised one. Product wrinkle worth adding: simplification can leave you owing money to someone you never transacted with, which users find alarming, so real apps make it opt-in per group.`},{type:`intuition`,title:`Design 4 — BookMyShow. Your turn first`,md:`**Try it first:** two people tap the same seat 40 ms apart. Write down exactly what your code does between "read the seat" and "write the seat" — and what happens if the other request lands inside that gap. Then read on.

Functional:

- Browse **movies** → **shows** (a movie, on a screen, at a time) → the seat map for that show.
- Select seats, **hold** them while the user pays, confirm on payment success.
- Cancel and refund. Release seats whose hold expired.

Non-functional — one of these dominates everything:

- **A seat is sold at most once.** This is not a quality attribute, it is the product.
- Traffic is spiky and adversarial: a 10,000-seat show opens at 10:00:00 and 200,000 people tap simultaneously.
- Payment is **slow and external** (10–120 seconds) and can fail, time out, or succeed twice.
- Reads (browsing seat maps) outnumber writes enormously, and a slightly stale seat map is survivable — a double booking is not.`},{type:`visual`,component:`PointerBoxDiagram`,props:{title:`One seat, two users: the double-booking race and the one-line fix`,notice:`Watch the gap between reading the seat and writing it. Every seat-locking design is an argument about that gap.`,leftLabel:`requests`,rightLabel:`seat row in the DB`,frames:[{note:`Show 7, seat A5 is free. Two phones tap it 40 ms apart. Both app servers run the same code: read the seat, see "free", then write. Right now both reads have returned free — and neither request has any idea the other exists.`,stack:[{name:`asha: SELECT A5`,to:`a5`},{name:`bilal: SELECT A5`,to:`a5`}],heap:[{id:`a5`,value:`state=free, holder=null`,label:`both reads see the same truth`}]},{note:`Asha's server writes first: UPDATE seat SET state=booked, holder=asha WHERE seat_id=A5. It succeeds. Nothing is wrong yet — the row WAS free when she read it, and no one has told her otherwise.`,stack:[{name:`asha: UPDATE -> booked`,to:`a5`},{name:`bilal: still holds a stale read`,value:`saw free`}],heap:[{id:`a5`,value:`state=booked, holder=asha`,label:`Asha has the seat`}]},{note:`Bilal's write lands 4 ms later. His UPDATE names the seat but says nothing about its current state, so the database does exactly as asked and overwrites Asha. One row, one holder — and two people with confirmation emails and two charged cards.`,stack:[{name:`bilal: UPDATE -> booked`,to:`a5`,danger:!0}],heap:[{id:`a5`,value:`state=booked, holder=bilal`,label:`DOUBLE BOOKED - Asha paid too`,danger:!0}]},{note:`The fix is not a bigger lock or a faster read. It is moving the check INSIDE the write: UPDATE ... SET state=held, holder=asha, expires=now+10min WHERE seat_id=A5 AND state=free. The condition and the write are one atomic statement, so no gap exists to lose. Asha matches one row: rowcount 1.`,stack:[{name:`asha: UPDATE ... WHERE state=free`,to:`a5`}],heap:[{id:`a5`,value:`state=held, holder=asha, expires=T+10m`,label:`rowcount 1 -> hold granted`}]},{note:`Bilal runs the identical statement. The WHERE clause no longer matches anything: rowcount 0. His app reads that as "seat gone", greys it out, and suggests A6. Nobody was locked, polled, or queued. Payment then flips held to booked; if payment never arrives, expires does the cleanup with no background job needed on the hot path.`,stack:[{name:`bilal: UPDATE ... WHERE state=free`,to:`a5`,danger:!0}],heap:[{id:`a5`,value:`state=held, holder=asha`,label:`rowcount 0 -> Bilal rejected, cleanly`}]}]}},{type:`intuition`,title:`BookMyShow — the object graph (UML-lite)`,md:"- **Movie → Show → Screen** — the static catalogue, and the boring 10% of this problem\n  - **Screen**: `id`, `seats: list[seat_id]` — the physical layout, shared by every show playing on it\n  - **Show**: `id`, `movie`, `screen`, `starts_at` — one screening\n- **ShowInventory** — one **SeatRow** per **(show, seat)**. This is where the entire problem lives.\n  - **SeatRow**: `state` in {free, held, booked}, `holder: user | None`, `expires: timestamp`\n  - `hold(seats, user, now) -> Order | None` — the conditional write, all-or-nothing across the requested seats\n  - `confirm(order, now) -> bool` — runs after payment; **idempotent**, because payment webhooks retry\n- **Order**: `id`, `show_id`, `seats`, `user`, `expires` — a hold with an identity, so the payment can refer to it\n- Seats are **not** objects with a `book()` method. Availability is per-show, so the state belongs on the (show, seat) row — a classic noun that is really a *relationship*. Getting this wrong is the most common failure in this problem."},{type:`code`,lang:`python`,title:`BookMyShow — hold, pay, confirm (runnable)`,code:`from dataclasses import dataclass
from enum import Enum
from threading import Lock

HOLD_TTL = 600.0                                       # seconds a seat stays reserved unpaid

class SeatState(Enum):
    FREE, HELD, BOOKED = 'free', 'held', 'booked'

@dataclass
class Screen:
    id: str
    seats: list[str]                                   # 'A1', 'A2', ... the physical layout

@dataclass
class Show:
    id: str
    movie: str
    screen: Screen
    starts_at: str

@dataclass
class SeatRow:                                         # one DB row per (show, seat)
    state: SeatState = SeatState.FREE
    holder: str | None = None
    expires: float = 0.0

@dataclass
class Order:
    id: str
    show_id: str
    seats: list[str]
    user: str
    expires: float

class ShowInventory:
    """The conditional update inside hold() IS the design. The rest is bookkeeping."""
    def __init__(self, show: Show):
        self.show, self.lock = show, Lock()            # lock stands in for the DB row lock
        self.rows = {s: SeatRow() for s in show.screen.seats}
    @staticmethod
    def _claimable(r: SeatRow, now: float) -> bool:
        return r.state is SeatState.FREE or (r.state is SeatState.HELD and r.expires <= now)
    def hold(self, seats: list[str], user: str, now: float) -> Order | None:
        # SQL equivalent - ONE statement, so there is no read-then-write gap to race in:
        #   UPDATE seat SET state='held', holder=:u, expires=:t
        #    WHERE show_id=:s AND seat_id = ANY(:seats)
        #      AND (state='free' OR (state='held' AND expires <= now()))
        #   then require rowcount == len(seats), else ROLLBACK
        with self.lock:
            if not all(self._claimable(self.rows[s], now) for s in seats):
                return None                            # all-or-nothing: never half a booking
            for s in seats:
                self.rows[s] = SeatRow(SeatState.HELD, user, now + HOLD_TTL)
            return Order(f'O-{user}-{int(now)}', self.show.id, list(seats), user, now + HOLD_TTL)
    def confirm(self, o: Order, now: float) -> bool:
        """Runs after payment succeeds. Idempotent: a repeated webhook must not double-book."""
        with self.lock:
            rows = [self.rows[s] for s in o.seats]
            if all(r.state is SeatState.BOOKED and r.holder == o.user for r in rows):
                return True                            # already done - webhook fired twice
            if any(r.holder != o.user or r.expires <= now for r in rows):
                return False                           # hold lapsed and was re-sold -> refund
            for s in o.seats:
                self.rows[s] = SeatRow(SeatState.BOOKED, o.user, 0.0)
            return True

if __name__ == '__main__':
    inv = ShowInventory(Show('sh1', 'Dune', Screen('scr1', ['A1', 'A2', 'A3']), '19:30'))
    a = inv.hold(['A1', 'A2'], 'asha', 0)
    print('asha holds        ->', a.seats)
    print('bilal wants A2    ->', inv.hold(['A2'], 'bilal', 0))
    print('bilal after 700s  ->', inv.hold(['A2'], 'bilal', 700).seats)
    print('asha pays at 700s ->', inv.confirm(a, 700), '- hold lapsed, refund path')`,annotations:{23:`The schema decision that makes everything else easy: state lives on (show, seat), not on a Seat object. Two shows on one screen share the layout, never the availability.`,43:`An expired hold is as good as free. Encoding that here means no background sweeper is needed on the booking path - expiry is lazy, and correct.`,45:`The line to write on the whiteboard. Condition and write in one statement, then trust rowcount. This is what actually stops the double booking.`,51:`All-or-nothing across the seat set: a group booking that half-succeeds is worse than one that fails. In SQL this is the rowcount check plus ROLLBACK.`,60:`Idempotency, from the Level 1 resilience module: gateways retry webhooks, so confirm() must be safe to call twice and return the same answer.`,62:`The genuinely nasty case: payment succeeded, hold expired, seat re-sold. There is no clever fix - there is only a refund and an honest message.`}},{type:`note`,md:`**The one hard decision: how long is a hold, and what happens when payment lands after it expires?**

*Duration.* Two minutes and honest users lose seats mid-OTP; thirty minutes and one script holds an empty stadium. Ten minutes is the industry answer, and the real answer is *"long enough for the slowest payment method I accept"* — UPI clears in seconds, net banking with a bank OTP page takes minutes. Two refinements worth volunteering: a **per-user seat cap** so one account cannot hold 500 seats, and **extend-on-activity** (the user is demonstrably on the payment page) instead of one global constant.

*The late payment.* Gateways are asynchronous — money can move at T+11 minutes on a hold that died at T+10. Three honest options:

- **Refund automatically** and tell the user. Simplest, and defensible: the seat may genuinely belong to someone else now.
- **Re-acquire if still free** — run the same conditional update; if it wins, confirm; if not, refund. Better experience, one extra branch, no new failure mode.
- **Never expire while a payment is in flight** — mark the hold \`pending_payment\` on redirect, and only expire it once the gateway gives a terminal answer. Correct, and expensive: it needs a reconciliation job for gateways that never answer at all.

Whichever you choose, \`confirm()\` must be **idempotent** — that is the idempotency-key pattern from \`sysdesign-l1-resilience-patterns\`, applied to a single row. A retried webhook must return the existing booking, not charge again and not grab another seat.

**Deliberately left out:** the seat *map* read path (cache it hard — a slightly stale map is fine because the conditional update is the real gate), dynamic pricing, and the waiting-room queue that a 200,000-tap on-sale actually needs. Name them as the next things you would build.`},{type:`intuition`,title:`Design 5 — Chess. Your turn first`,md:`**Try it first:** where does the knowledge *"this move is illegal because it leaves my own king in check"* live — on the Knight, on the Board, or somewhere else? Commit to an answer before reading on.

Functional:

- 8×8 board, six piece types, two players alternating.
- Generate the legal moves for a piece; apply a move; **undo** it.
- Detect check, checkmate, and stalemate.
- Support castling, en passant, and promotion.
- Keep the move history — for undo, for replay, and for the draw rules (threefold repetition, fifty-move).

Non-functional:

- \`legal_moves\` is called constantly — every UI hover, and thousands of times per second if an engine is ever attached. It must be cheap, and it must **not copy the board per candidate move**.
- Adding a variant rule must not mean editing six piece classes.`},{type:`intuition`,title:`Chess — the object graph (UML-lite)`,md:'- **Board** — owns the squares and the history; every rule that needs the **whole position** lives here\n  - `sq: dict[(row, col) -> Piece]` and `history: list[Move]`\n  - `apply(frm, to) -> Move` and `undo()` — the pair that makes everything else cheap\n  - `in_check(color)`, `legal(frm)`, and later `is_mate(color)`, `can_castle(...)`\n- **Piece** (abstract) → `Rook`, `Bishop`, `Knight`, `Queen`, `King`, `Pawn`\n  - exactly one abstract method: `pseudo(board, at) -> list[Pos]` — squares this piece\'s **shape** can reach\n  - fields: `color`, and `moved: bool` (castling and the pawn double-step both need "has this ever moved?")\n- **Move** — the undo record: `frm`, `to`, `piece`, `captured`, `was_first`. History is a stack; undo pops it.\n- **Game** stays thin: two players, whose turn it is, the board, the result. It holds no rules at all.\n- Notice the split before you see the code: **shape** is per-piece and local; **legality** is positional and global. That one boundary is the answer to the question above.'},{type:`code`,lang:`python`,title:`Chess — pseudo-moves on pieces, legality on the board (runnable)`,code:`from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum

Pos = tuple[int, int]
ORTHO = [(1, 0), (-1, 0), (0, 1), (0, -1)]
DIAG = [(1, 1), (1, -1), (-1, 1), (-1, -1)]

class Color(Enum):
    WHITE, BLACK = 'w', 'b'

class Piece(ABC):
    def __init__(self, color: Color):
        self.color, self.moved = color, False
    @abstractmethod
    def pseudo(self, b: 'Board', at: Pos) -> list[Pos]:
        """Squares this piece's SHAPE can reach. Check is not a piece's business."""

def ray(b, at, dirs, color, limit=8):
    out = []
    for dr, dc in dirs:
        r, c = at
        for _ in range(limit):
            r, c = r + dr, c + dc
            if not b.inside((r, c)):
                break
            t = b.at((r, c))
            if t is None:
                out.append((r, c))
                continue
            if t.color is not color:
                out.append((r, c))                     # capture, then the ray stops
            break
    return out

class Rook(Piece):
    def pseudo(self, b, at): return ray(b, at, ORTHO, self.color)
class Bishop(Piece):
    def pseudo(self, b, at): return ray(b, at, DIAG, self.color)
class Queen(Piece):
    def pseudo(self, b, at): return ray(b, at, ORTHO + DIAG, self.color)
class King(Piece):
    def pseudo(self, b, at): return ray(b, at, ORTHO + DIAG, self.color, limit=1)

@dataclass
class Move:                                            # the undo record; history is a stack
    frm: Pos
    to: Pos
    piece: Piece
    captured: Piece | None
    was_first: bool

class Board:
    """Rules needing the WHOLE position - check, mate, castling - live here, not on pieces."""
    def __init__(self, placed: dict[Pos, Piece]):
        self.sq, self.history = dict(placed), []
    def inside(self, p): return 0 <= p[0] < 8 and 0 <= p[1] < 8
    def at(self, p): return self.sq.get(p)
    def apply(self, frm: Pos, to: Pos) -> Move:
        p = self.sq.pop(frm)
        mv = Move(frm, to, p, self.sq.get(to), not p.moved)
        self.sq[to], p.moved = p, True
        self.history.append(mv)
        return mv
    def undo(self) -> None:
        mv = self.history.pop()
        del self.sq[mv.to]
        self.sq[mv.frm], mv.piece.moved = mv.piece, not mv.was_first
        if mv.captured:
            self.sq[mv.to] = mv.captured
    def in_check(self, c: Color) -> bool:
        king = next(s for s, p in self.sq.items() if isinstance(p, King) and p.color is c)
        foe = Color.BLACK if c is Color.WHITE else Color.WHITE
        return any(p.color is foe and king in p.pseudo(self, s) for s, p in list(self.sq.items()))
    def legal(self, frm: Pos) -> list[Pos]:
        """The line the whole design exists for: legal = pseudo MINUS anything self-checking."""
        p, out = self.sq[frm], []
        for to in p.pseudo(self, frm):
            self.apply(frm, to)
            if not self.in_check(p.color):
                out.append(to)
            self.undo()
        return out

if __name__ == '__main__':
    b = Board({(0, 4): King(Color.WHITE), (1, 4): Bishop(Color.WHITE),
               (7, 4): Rook(Color.BLACK), (7, 0): King(Color.BLACK)})
    print('bishop pseudo-moves:', len(b.at((1, 4)).pseudo(b, (1, 4))), ' legal:', len(b.legal((1, 4))))
    print('white in check?', b.in_check(Color.WHITE), '- no, but the bishop is pinned to its king')`,annotations:{16:`The abstract method is deliberately narrow: geometry only. The moment it needs history or the king, the abstraction has leaked and the design is wrong.`,19:`One sliding helper covers rook, bishop, queen and (with limit=1) king and knight. Six piece classes do not need six algorithms.`,46:`Move is the undo record, not a command object. was_first restores the moved flag - forget it and castling silently becomes legal after an undo.`,59:`Make/unmake instead of copy. Copying the 64-square board per candidate move is correct and roughly 20x slower; engines and interviews both use this.`,74:`in_check asks the opponent pieces where they can go. It reuses pseudo(), which is exactly why pseudo must NOT already filter for check - that would recurse forever.`,79:`The whole design in three lines: apply, ask, undo. A pinned piece has pseudo-moves and zero legal ones, and this loop is where that difference appears.`}},{type:`note`,md:"Run output: the bishop has **9 pseudo-moves and 0 legal moves** — it is pinned to its own king by the black rook — while white is not in check at all. No piece can compute that from its own geometry. That is the proof.\n\n**The one hard decision: where does rules knowledge live?**\n\nThe naive design — `piece.is_valid_move(board, frm, to)` returning a bool — reads beautifully and collapses the moment you write check. Three placements, and interviewers want you to reach the third:\n\n- **All rules on the piece.** Every piece already needs the board, so it grows a `board` parameter, then a `history` parameter (en passant), then it must inspect a *different* piece's `moved` flag (castling needs the rook's). The abstraction has leaked; every piece class now knows everything.\n- **All rules on the board.** One giant `is_legal(frm, to)` switching on piece type. Honest and testable — and exactly the if-else pile that polymorphism was introduced to delete.\n- **Split by scope — the answer.** The piece owns its **shape** (`pseudo`: squares this geometry reaches, check ignored). The board owns everything **positional**: filtering pseudo-moves by simulate-and-reject-self-check, castling (both pieces' `moved` flags plus three squares not attacked), en passant (needs the last move), promotion (needs the rank).\n\nThat split is exactly what `apply`/`undo` exists for: legality checking is *make the move, ask whether my king is attacked, take it back*. And when the positional rules outgrow a few board methods, extract a `RulesEngine` / `MoveValidator` the board delegates to — naming that as the next step, rather than building it upfront, is a strong finish.\n\n**Deliberately left out: the Pawn.** It is the special-case pile — one step, two steps from home, diagonal-only capture, en passant, promotion to four different pieces — and it is precisely where every naive design finally breaks. Say that out loud instead of pretending it is one more `ray()` call. Also left out: checkmate (`in_check(c) and no legal moves anywhere for c`), stalemate (the same with `not in_check`), and the draw rules that need the history you already have."},{type:`intuition`,title:`Snake & Ladder — the easy one, in five bullets`,md:"It turns up as a warm-up or a 20-minute screen. The only way to fail it is to over-model it.\n\n- **The board is one map**, `{from: to}`. A snake is an entry whose value is lower; a ladder is one whose value is higher. Writing separate `Snake` and `Ladder` classes with identical fields is the classic over-modelling trap — they are the same thing wearing two names.\n- **The dice is an interface**, not a call to `random`. Inject it, and your tests become deterministic scripts instead of flaky coin flips. Same dependency-injection move as the parking lot's allocation strategy.\n- **Players are a queue** — a `deque` plus `rotate(-1)`. Turn order is a rotation, not an index you keep forgetting to wrap.\n- **Ask, do not assume:** must you land exactly on 100? Does rolling a 6 grant another turn? Can two players share a square? Three questions, ten seconds, and it shows you know where the ambiguity is.\n- **The hard decision, such as it is:** where does a jump get applied — inside `play()` or on `Board.resolve(pos)`? Put it on the board, so a variant with *chained* jumps changes exactly one method."},{type:`code`,lang:`python`,title:`Snake & Ladder — injectable dice makes it testable (runnable)`,code:`from collections import deque
from typing import Protocol
import random

class Dice(Protocol):
    def roll(self) -> int: ...

class RealDice:
    def roll(self) -> int: return random.randint(1, 6)

class ScriptedDice:                                    # injected in tests -> deterministic games
    def __init__(self, rolls): self.q = deque(rolls)
    def roll(self) -> int: return self.q.popleft()

def play(jumps: dict[int, int], players: list[str], dice: Dice, end: int = 100) -> str:
    """Snakes and ladders are ONE map: {from: to}. Down is a snake, up is a ladder."""
    pos = dict.fromkeys(players, 0)
    turn = deque(players)
    while True:
        p = turn[0]
        turn.rotate(-1)
        n = pos[p] + dice.roll()
        if n > end:
            continue                                   # must land exactly on 100
        pos[p] = jumps.get(n, n)
        if pos[p] == end:
            return p

if __name__ == '__main__':
    board = {4: 25, 21: 9, 28: 84, 51: 67, 87: 24, 93: 68}
    d = ScriptedDice([4, 1, 3, 1, 6, 1, 6, 1, 6, 1, 4])   # 102 would overshoot -> turn skipped
    print('winner:', play(board, ['Asha', 'Bilal'], d))`,annotations:{5:`A Protocol, not an ABC: structural typing means RealDice and ScriptedDice need no base class, and a lambda-ish stub works in tests too.`,11:`The entire testability argument. With this class the game is a pure function of a roll list, so "does a snake at 87 work?" becomes a one-line assertion.`,16:`One dict for both snakes and ladders. Two classes here would be identical fields with different names - the most common over-modelling in this problem.`,24:`The exact-landing rule, in one branch. Whether it should exist at all is a clarifying question, not an assumption.`}}],quiz:[{question:`Ten minutes left in an LLD round. Your ParkingLot has no pricing logic yet, and your Ticket class has no getters. What do you do?`,options:[{text:`Write the getters and setters — a complete class is expected`,explanation:`Nobody has ever scored a point on get_plate(). You would spend the last ten minutes on the least informative code in the design.`},{text:`Sketch the Pricing skeleton, then say out loud what you deliberately left out`,explanation:`Correct. A complete rough design beats a beautifully finished third of one, and naming the gaps proves the gaps were choices.`},{text:`Refactor Spot into an interface so future spot types are easy`,explanation:`A speculative abstraction with one implementation — precisely the instinct this round is testing you to suppress.`},{text:`Add input validation to every method`,explanation:`Real in production, near-zero signal in a 45-minute design round. Mention it in one sentence and move on.`}],correct:1},{question:`A car is at floor 5 heading up. Pending: floor 6 (pressed just now) and floor 1 (pressed 30 seconds ago). What does FCFS do, and why is it wrong?`,options:[{text:`Serves 6 then 1 — FCFS is fine here`,explanation:`FCFS means arrival order. Floor 1 was pressed first, so FCFS serves it first — that is the whole problem.`},{text:`Serves 1 then 6, which is optimal because it clears the oldest request`,explanation:`It does serve 1 first, but calling that optimal misses the cost: the car drives past floor 6 twice while a rider stands there.`},{text:`Serves 1 first — driving down past floor 6 and back up. LOOK fixes it by finishing the current direction first`,explanation:`Correct. The wasted double traversal is what riders read as "the elevator is ignoring me". LOOK serves 6 on the way, then reverses for 1.`},{text:`Refuses the floor-6 request until the car is idle`,explanation:`No scheduler drops requests. The question is ordering, not admission.`}],correct:2},{question:`Your Splitwise clone stores a pairwise balance table updated on every expense. A user edits an expense from three months ago. What is the real risk?`,options:[{text:`The balance table can drift from the expense log with no way to tell which is right — because the balance is the only place that number lives`,explanation:`Correct. One bug in the inverse-delta path leaves balances that correspond to no set of expenses, and nothing to reconcile against.`},{text:`The edit will be slow`,explanation:`It is a handful of row updates. Speed is not what breaks here.`},{text:`Nothing — the update path handles it`,explanation:`It handles the happy path. The risk is what a bug in that path leaves behind permanently, with no source of truth to recover from.`},{text:`Currency rounding errors`,explanation:`A real concern, but it exists in both designs. It is not what editing an old expense specifically breaks.`}],correct:0},{question:`Two requests read seat A5 as free, then both run UPDATE seat SET state='booked' WHERE seat_id='A5'. What actually prevents the double booking?`,options:[{text:`Making the read and the write faster`,explanation:`That narrows the window without closing it. A race you can still lose in 2 ms is still a race — and at on-sale traffic you will lose it.`},{text:`A mutex in the application server`,explanation:`Fine for one process. You run twelve app servers behind a load balancer and they share no memory, so each one lets its own winner through.`},{text:`Retrying the second request`,explanation:`The second request already succeeded — that is the bug. There is nothing to retry.`},{text:`Putting the condition inside the write: ... WHERE seat_id='A5' AND state='free', then checking rowcount`,explanation:`Correct. Condition and write become one atomic statement, so no gap exists to lose. The loser gets rowcount 0 and shows the seat as gone.`}],correct:3},{question:`knight.is_valid_move(board, frm, to) returns True for a jump that would leave its own king in check. Where does the fix belong?`,options:[{text:`Pass the king's position into every piece's is_valid_move`,explanation:`Now every piece knows about kings. Next you pass the history for en passant, then another piece's moved flag for castling — the abstraction is gone.`},{text:`The piece returns pseudo-moves (shape only); the Board filters them by simulating each and rejecting self-check`,explanation:`Correct. Shape is local to the piece, legality is a property of the whole position — so it belongs to the object that owns the whole position.`},{text:`One Board.is_legal() with a switch on piece type`,explanation:`It produces correct results, but it deletes the polymorphism the piece hierarchy existed for and turns every variant into an edit of one giant method.`},{text:`Have Knight detect pins before moving`,explanation:`A pin is a property of the entire position. The knight cannot compute it from its own geometry without effectively becoming the board.`}],correct:1},{question:`A 10,000-spot airport lot allocates by scanning all spots for the first free one that fits. Why is this the design failing, not merely slow?`,options:[{text:`It is O(n), and n is only 10,000`,explanation:`10,000 is indeed small, so the raw number is not the issue — but the shape of the cost is.`},{text:`It cannot support multiple floors`,explanation:`A scan works across floors perfectly well. That is not what breaks.`},{text:`The cost grows exactly when the lot is fullest — peak arrival time is also when the scan walks the most taken spots before finding a free one`,explanation:`Correct. Load and cost peak together, which is the signature of a structure that will fall over precisely when it matters. Per-type free lists make it a pop.`},{text:`It uses too much memory`,explanation:`A scan uses essentially none. Free lists and bitmaps are the options that add memory, and they are the fix.`}],correct:2},{question:`The parking lot needs three allocation policies (nearest lift, cheapest floor, EV-first). Which design?`,options:[{text:`One AllocationStrategy interface with three implementations, injected into ParkingLot`,explanation:`Correct. One axis genuinely varies, three real implementations exist today, and the lot never learns any of them. That is when an interface is earned.`},{text:`Three subclasses of ParkingLot`,explanation:`is-a abuse: an EV-first lot is not a kind of lot, it is a lot with a policy. You also lose the ability to change policy at runtime.`},{text:`An if policy == ... chain inside park()`,explanation:`Every new policy edits the one method everything depends on, and ParkingLot ends up knowing all three policies — the coupling Strategy exists to remove.`},{text:`A config flag read from a file inside the allocation loop`,explanation:`Configuration is not the question. Where the behaviour lives is — and this still leaves all three behaviours inside the lot.`}],correct:0},{question:`Greedy debt simplification (biggest debtor pays biggest creditor) on 5 people with non-zero balances. What can you honestly claim?`,options:[{text:`It always produces the provably minimum number of transfers`,explanation:`The trap. The true minimum requires finding subsets that sum to zero, which is NP-hard. Claiming optimality here is the answer interviewers are fishing for.`},{text:`At most 4 (n − 1) transfers, because each step zeroes at least one person — good, but not guaranteed minimal`,explanation:`Correct, and it is the honest sentence: a real bound, plus an explicit admission that greedy is a heuristic, not an optimum.`},{text:`Exactly 4 transfers`,explanation:`Often fewer. Any subgroup whose balances net to zero collapses early, so n − 1 is an upper bound, not a count.`},{text:`It can loop forever when balances do not divide evenly`,explanation:`Each iteration removes at least one person from consideration, so it terminates in at most n steps regardless of the amounts.`}],correct:1}],interviewQuestions:[{question:`Design a parking lot. Take me through it the way you would on a whiteboard.`,answer:`Nouns first, out loud: lot, floor, spot, spot type, vehicle type, ticket, pricing, allocation policy. Verbs: park, unpark, price, find a free spot. Classes: ParkingLot as the aggregate root holding Spots (id, floor, type), an injected AllocationStrategy, a Pricing object, and open Tickets. Two public verbs — park(plate, vehicle_type, now) -> Ticket | None and leave(ticket_id, now) -> fee. Two deliberate cuts I would state: Vehicle is not a class (a plate is a string), and Floor is not a class (it is an int on Spot) — I can add both when a requirement needs them. The vehicle-to-spot fitting rule is a map, not an if-else ladder, so a new EV spot type is one row of data. Then I name the hard part before being asked: finding a free spot must be O(1)-ish, so per-type free lists (or a min-heap keyed by walking distance if the policy is "nearest lift"), never a scan of 10,000 spots; and find-then-claim is a read-modify-write, so several entry gates can hand out the same spot unless the claim is atomic. Extensions I would flag as one-line hooks: EV charging spots (a new SpotType plus a new strategy), reserved spots (a flag on Spot the strategy skips), and per-floor full/empty display (a counter per type).`,isCaseBased:!0},{question:`How would you make the parking-lot allocation thread-safe? Walk from the naive version to what you would actually ship.`,answer:`The bug first: pick_free_spot() then mark_taken() is a read-modify-write, and two gate threads can both read spot 412 as free. Level 1 — put both steps inside one lock in park(). Correct, and I would say its ceiling out loud: one lot-wide lock serialises every entry, so throughput is one car at a time regardless of gates. Level 2 — shard the lock: one per SpotType (four locks, roughly four times the concurrency), or per floor, since a truck arriving never contends with a motorcycle. Level 3, and the one that actually matters — none of that survives multiple app servers, because an in-process lock is invisible to the other machine. So push the claim into the shared store: UPDATE spot SET taken=true, ticket_id=? WHERE id=? AND taken=false, and treat rowcount 0 as "someone beat me, pick another". That is a compare-and-set at the database, needs no distributed lock service, and degrades gracefully — the loser just retries with the next free spot. If I need a lock across services for something bigger, the honest option is Redis SETNX with a TTL plus a fencing token, and I would say why the TTL matters (a holder that dies must not freeze the lot) and that it is still not a perfect mutual exclusion. Last piece: the free list itself is shared mutable state, so under the DB-CAS design the in-memory list becomes a hint that can be stale, and the CAS is the authority.`,isCaseBased:!0},{question:`Design an elevator system for a 20-floor building with four cars.`,answer:`Two request types, and the distinction drives the design: a hall call carries a floor AND a direction and any car may answer it; a car request carries a floor only and belongs to one car. Inside a car both collapse into "add a floor to my stop set", so Request never needs to be a class — the direction only matters to the dispatcher. Car is a state machine — IDLE, MOVING_UP, MOVING_DOWN, DOORS_OPEN — plus a stop set, with step() as one tick of the world. Scheduling per car is LOOK, not FCFS: keep going in the current direction, stop at everything on the way, reverse when nothing remains ahead. I would name the transfer: this is disk-head scheduling with doors. The multi-car part is a Dispatcher that scores every car for a hall call and gives it to the cheapest: distance if idle, distance if it is already moving toward the floor in the same direction (a free pickup), distance plus a penalty proportional to its remaining stops otherwise. Under follow-up on starvation I would add an age term to the score, because pure LOOK can strand a request while same-direction calls keep arriving. Alternatives I would name rather than build: zoning (simple, bad when a zone empties) and full assignment re-optimisation on every new call (better, much more code, and the reason destination-dispatch lobbies ask for your floor before you board).`,isCaseBased:!0},{question:`Why is FCFS wrong for an elevator, and what exactly is the difference between SCAN and LOOK?`,answer:`FCFS serves requests in the order the buttons were pressed. A car at floor 5 heading up, with floor 6 just pressed and floor 1 pressed thirty seconds ago, will drive down to 1 and then climb back past 5 to reach 6 — the car passes the waiting rider twice. It maximises direction reversals, which are the expensive thing in a physical system, and riders experience it as being ignored. SCAN (from disk head scheduling) sweeps in one direction serving every request on the way, then reverses at the end of the shaft. LOOK is SCAN with the obvious improvement: reverse as soon as nothing remains in the current direction, instead of travelling to the top floor on principle. Real elevators run LOOK. The cost worth admitting is starvation: if same-direction calls keep arriving, a request behind the car can wait indefinitely, so production schedulers blend distance with request age. And there is a second-order effect interviewers like — LOOK naturally batches nearby requests, which is also why it is good for energy, not just for wait time.`,isCaseBased:!1},{question:`Design Splitwise, including the debt-simplification feature.`,answer:`Core objects: User, Group, and Expense (id, payer, amount as integer paise, participants, split). Split is the one real hierarchy — an interface with a single method shares(amount, people) -> dict[user, paise], implemented by Equal, Exact, and Percent, because "more split types will be added" is the stated requirement and that is the axis that varies. Money is integer paise, never float, and I would name the rounding rule explicitly: ₹100 three ways is 3334/3333/3333, and someone has to get the extra paise deterministically. The balance sheet is a net map per user — everyone is debited their share, the payer credited the full amount, and the values always sum to zero. Simplification: net everyone to one number, then greedily match the largest debtor to the largest creditor, zeroing at least one person per step, so at most n − 1 transfers. I would explicitly not claim it is minimal — the true minimum needs zero-sum subsets and is NP-hard — and I would mention the product wrinkle that simplification can leave you owing a stranger, so it is usually opt-in. The tradeoff I would raise unprompted: whether to store pairwise balances or recompute from the expense log, and why the log has to be the source of truth once expenses can be edited.`,isCaseBased:!0},{question:`Splitwise: would you store pairwise balances or recompute them from the expense log? Defend it.`,answer:`The log is the source of truth; balances are a cache. Storing pairwise balances alone gives O(1) reads and an instant group screen, and it is fine until the first edit or delete of an old expense — then you must apply the inverse delta to every pair it touched, in order, without failing halfway. Ship one bug in that path and you hold balances corresponding to no set of expenses, with nothing to reconcile against, and the only fix is a manual correction that itself is a lie. Recomputing from the log is trivially correct — balances are a pure function of an append-only list of what people actually typed — but it is O(expenses) per read, and a five-year-old flat group has thousands. So: keep the pairwise table for reads, mark it derived, rebuild it on edit, recompute it on a schedule, and alert on drift between the two. That is event sourcing in miniature. Under pressure to pick just one, I take recompute-from-log with a cache layered on later, because I can always add a cache to a correct system and I cannot add correctness to a drifted one. The sentence I would leave the interviewer with: I never let a balance be the only place a number lives.`,isCaseBased:!1},{question:`Design BookMyShow's seat booking. Two users tap the same seat at the same instant — show me exactly what stops the double booking.`,answer:`Catalogue is the easy part: Movie, Screen (id plus the seat layout), Show (movie on a screen at a time). The design lives in ShowInventory: one row per (show, seat) with state in {free, held, booked}, holder, and expires. Availability is per-show, so it belongs on the (show, seat) relationship, not on a Seat object with a book() method — getting that wrong is the most common failure in this problem. The flow is hold -> pay -> confirm. The race: both requests SELECT the seat, both see free, both UPDATE, and the second overwrites the first — two confirmation emails, two charged cards. The fix is not a faster read or a bigger lock; it is moving the condition inside the write: UPDATE seat SET state='held', holder=:u, expires=now()+10min WHERE seat_id=:s AND (state='free' OR expires<=now()), then require rowcount == the number of seats requested, else ROLLBACK. The loser gets rowcount 0 and shows the seat as gone. Equivalent formulations worth naming: a unique constraint on (show_id, seat_id) in a bookings table, letting the DB reject the second insert; or optimistic concurrency with a version column. What I would reject: an application-level mutex, because twelve app servers share no memory; and SELECT FOR UPDATE held across the payment call, because that pins a DB transaction for two minutes of external latency. Expiry is lazy — an expired hold is treated as free by the same WHERE clause — so no sweeper job sits on the hot path.`,isCaseBased:!0},{question:`The payment succeeds 60 seconds after the seat hold expired and someone else took the seat. What does your system do?`,answer:`First, this is not an edge case to hand-wave — gateways are asynchronous and this happens daily at scale. My default is: confirm() re-validates the hold, sees it lapsed and re-sold, returns failure, and the system issues an automatic refund with a clear message. That is defensible because the seat genuinely belongs to someone else now. A better variant, one extra branch: attempt to re-acquire with the same conditional update — if it wins, confirm the booking; if not, refund. Strictly better user experience, no new failure mode. The expensive-but-correct option is to never expire a hold while a payment is genuinely in flight: mark it pending_payment when the user is redirected to the gateway, and only expire after the gateway returns a terminal status. That needs a reconciliation job for gateways that never answer, plus a hard cap so a dead payment cannot hold a seat forever. Two things must be true whichever I pick. confirm() has to be idempotent — webhooks retry, and the second call must return the same booking rather than charging again or grabbing another seat, which is the idempotency-key pattern applied to one row. And the refund path needs its own idempotency, or a retried failure notification refunds twice. On tuning: the hold duration is not a constant I would guess at, it is "the p99 of the slowest payment method I accept" — seconds for UPI, minutes for net banking with a bank OTP page — plus a per-user seat cap so one script cannot hold a stadium.`,isCaseBased:!1},{question:`Design chess. Where do the rules live — and what breaks in the obvious answer?`,answer:`The obvious answer is piece.is_valid_move(board, frm, to), and it collapses at check. A bishop cannot know whether moving exposes its own king, because that depends on the whole position. So I split by scope: the piece owns its shape via pseudo(board, at) -> list[Pos] — squares its geometry can reach, ignoring check entirely — and the Board owns everything positional: legal(frm) filters pseudo-moves by applying each, asking in_check(color), and undoing. Board also owns castling (it needs two pieces' moved flags plus three squares not being attacked), en passant (it needs the last move), and promotion (it needs the rank). The Move object is the undo record — from, to, piece, captured, and whether it was that piece's first move — and history is a stack, which gives undo, replay, and the repetition draw rules for free. Critically, legality checking is make/unmake, not copy: copying the board per candidate move is correct and roughly twenty times slower, and legal_moves is called on every UI hover. Under follow-up about growth, the next step I would name rather than build upfront is extracting a RulesEngine the board delegates to, once the positional rules outgrow a handful of methods. And I would flag the Pawn explicitly as the special-case pile — one step, two from home, diagonal-only capture, en passant, promotion to four pieces — because that is where a naive design finally breaks, and noticing it is worth more than implementing it.`,isCaseBased:!0},{question:`Design a rate limiter — as an LLD question, not the distributed one.`,answer:`Scope it first: this is one process, an object with allow(key) -> bool, not a cluster-wide limiter. Nouns: rule, bucket, clock, store. Verbs: allow, refill, reset. The design is a RateLimiter holding a Rule (capacity, refill_rate, window) and a store of per-key state, plus an injected Clock — that last one is the design decision, because a limiter that calls time.time() directly cannot be tested without sleeping, exactly like the dice in Snake & Ladder. Algorithm as a Strategy, because there really are several and they differ in behaviour: TokenBucket (capacity plus refill rate; allows bursts up to capacity — the usual default), LeakyBucket (smooths output to a constant rate; no bursts), FixedWindow (a counter per window; trivial, but permits 2x the limit across a boundary), and SlidingWindowLog or SlidingWindowCounter (accurate, more memory). Token bucket state is two numbers per key — tokens and last_refill — and refill is lazy, computed on access, so there is no background timer. The hard decision at LLD scale: per-key state is unbounded memory, so it needs eviction — an LRU with a TTL, since a key idle longer than the refill time is indistinguishable from a fresh one. Thread safety: one lock per key, or a striped lock array, not one global lock, because the whole point is high throughput on the hot path. Then I would name the boundary: the moment this runs on more than one machine, the counter must move to Redis with an atomic INCR-and-expire or a Lua script, and that is the HLD version of the question.`,isCaseBased:!0},{question:`Design Snake & Ladder. How do you make it testable?`,answer:`It is a small problem and the failure mode is over-modelling it. The board is one dict {from: to} — a snake is an entry whose value is lower, a ladder one whose value is higher; separate Snake and Ladder classes with identical fields is the trap. Players are a deque rotated each turn. The state is one map of player to position. Testability is the whole point of the question: the dice must be an interface (a Protocol with roll() -> int), with RealDice wrapping random and ScriptedDice replaying a fixed list. That turns the game into a pure function of a roll sequence, so "does the snake at 87 send you to 24?" is a one-line assertion instead of a flaky loop. It is the same dependency-injection move as the parking lot's allocation strategy and the rate limiter's clock — anything nondeterministic gets injected. Clarifying questions I would ask rather than assume: must you land exactly on 100, does a 6 grant another turn, can two players share a square. And the one placement decision: jump resolution belongs on Board.resolve(pos), not inline in the game loop, so a variant with chained jumps changes exactly one method.`,isCaseBased:!1},{question:`You have 45 minutes for an LLD round. How do you spend them, and what do you refuse to do?`,answer:`Roughly: 5 minutes clarifying and writing the nouns and verbs from the interviewer's own words, plus stating what is out of scope for v1. 5 minutes on the class list and the relationships, saying has-a versus is-a out loud and cutting at least one noun on purpose. 5 minutes naming the ONE hard decision — allocation and its race for parking, dispatch policy for elevators, log-versus-balances for Splitwise, the seat-hold race for booking, rules placement for chess — because that sentence reframes the rest of the round. 20 minutes writing the skeleton with real signatures and types, breadth first, leaving obvious bodies as comments. The last 10 for tradeoffs, concurrency, and the extension the interviewer will throw at me. What I refuse: enumerating getters and setters, drawing perfect UML, adding an interface with one implementation because it feels professional, and polishing one class while three are still missing. Two habits that carry the round: narrate every decision as a choice with a rejected alternative, and when the interviewer adds a requirement, say which class it touches before writing anything. If they ask for something my design cannot absorb cleanly, saying "that does not fit — here is what I would change, and here is what it costs" scores far higher than pretending it fits.`,isCaseBased:!1}],flashcards:[{front:`The six-step LLD method`,back:`1. Clarify, write nouns and verbs. 2. Nouns become candidate classes (and some get cut). 3. Verbs become methods on the class that owns the data. 4. Relationships: has-a over is-a. 5. Name the ONE hard decision. 6. Skeleton with types, then say what you left out.`},{front:`What LLD interviewers actually score`,back:`The discussion of tradeoffs, not the volume of code. Getters and setters score zero. A complete rough skeleton beats a polished third of one.`},{front:`Parking lot — the one hard decision`,back:`Finding a free spot fast (per-type free lists or a min-heap, never a 10,000-spot scan) and claiming it exactly once (find + claim is a read-modify-write; the durable fix is UPDATE ... WHERE taken=false plus rowcount, because in-process locks do not cross app servers).`},{front:`Elevator: FCFS vs SCAN vs LOOK`,back:`FCFS serves by arrival time and yo-yos the car past waiting riders. SCAN sweeps one direction to the end of the shaft. LOOK reverses as soon as nothing remains ahead — what real elevators run. It is disk-head scheduling with doors.`},{front:`Elevator — the one hard decision`,back:`Which car answers a hall call, i.e. Dispatcher.cost(). The three objectives disagree: minimise average wait (default), minimise worst-case wait (add an age term — stops starvation, ships in real buildings), minimise energy. Alternatives: zoning, full assignment re-optimisation.`},{front:`Splitwise — log vs balances`,back:`The append-only expense log is the source of truth; pairwise balances are a cache. Stored-only balances drift the first time an old expense is edited, with nothing to reconcile against. Rebuild on edit, recompute nightly, alert on drift.`},{front:`Debt simplification — the honest claim`,back:`Net everyone to one number, then greedily match biggest debtor to biggest creditor. At most n − 1 transfers (each step zeroes someone). NOT guaranteed minimal — the true minimum needs zero-sum subsets and is NP-hard. Say that.`},{front:`Seat booking — what stops the double booking`,back:`Not a faster read, not an app-server mutex. Put the condition inside the write: UPDATE seat SET state='held', holder=:u, expires=:t WHERE seat_id=:s AND (state='free' OR expires<=now()), then check rowcount. Loser gets 0. Flow: hold (TTL) -> pay -> confirm, and confirm must be idempotent.`},{front:`Chess — where the rules live`,back:`Piece owns its SHAPE (pseudo-moves, check ignored). Board owns everything positional: legal = pseudo minus self-check, plus castling, en passant, promotion. Legality is make/unmake (apply, ask in_check, undo) — never copy the board per candidate.`},{front:`The injectable-nondeterminism move`,back:`Dice, clock, and random anything become injected interfaces (Protocol/ABC), so tests replay a fixed script instead of sleeping or flipping coins. Same move as an allocation Strategy. Snake & Ladder exists in interviews mainly to test this.`}],mindmapMarkdown:`- LLD Classics
  - The method (this transfers; the problems do not)
    - Nouns to classes, verbs to methods where the state is
    - has-a over is-a (composition), cut nouns out loud
    - Name the ONE hard decision
    - Skeleton with types + what you left out
  - Scoring
    - Tradeoffs discussed, not code volume
    - Breadth first; getters waste the 45 minutes
  - Parking Lot
    - FITS map + injected AllocationStrategy, Pricing its own object
    - O(1) per-type free lists vs scanning 10,000 spots
    - Hard: find+claim race -> DB conditional update, not a local lock
  - Elevator
    - Hall call (carries direction) vs car request
    - State machine + FCFS wrong -> SCAN -> LOOK
    - Hard: which car answers (avg wait vs worst case vs energy)
  - Splitwise
    - Split strategies equal / exact / percent, integer paise
    - Hard: log is the truth, balances are a cache
    - simplify(): greedy, n-1 bound, true minimum is NP-hard
  - BookMyShow
    - State on (show, seat); hold with TTL -> pay -> confirm
    - Race fix: condition inside the write, then check rowcount
    - Hard: hold length, late payment, idempotent confirm
  - Chess
    - Piece owns shape (pseudo); Board owns position (check, castling)
    - make/unmake + Move history stack, never copy the board
    - Hard: rules placement -> RulesEngine as the next step
  - Snake & Ladder
    - Board is one jump map, not Snake and Ladder classes
    - Dice as injected interface -> deterministic tests
    - Player queue via deque rotate`};export{e as default};