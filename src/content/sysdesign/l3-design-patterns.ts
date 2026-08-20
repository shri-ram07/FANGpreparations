import type { Module } from '../types'

const m: Module = {
  id: 'sysdesign-l3-design-patterns',
  subjectId: 'sysdesign',
  level: 3,
  title: 'Design Patterns: The Interview Seven, in Python and C++',
  whyItMatters:
    'Nobody asks you to "implement Singleton". They give you a parking lot or a payment flow and listen for whether you can say "that is a Strategy" instead of spending forty words describing one. Patterns are compression for design conversations. This module gives you the seven that actually come up, an implementation of each you can write from memory, and the honesty to say out loud which one (Singleton) you would argue against.',
  estMinutes: 60,
  sections: [
    {
      type: 'intuition',
      title: 'A pattern is a name, not a machine',
      md: `Every kitchen in the world independently invented "chop everything before you start cooking". Someone eventually wrote it down and called it *mise en place*. The technique did not change. The **name** did the work: now two cooks can plan a service in three words.

- A design pattern is exactly that — a **name for a solution people kept re-deriving**, plus the tradeoff that comes with it.
- The value in an interview is **vocabulary and recognition**: you see the shape, you name it, and the conversation jumps three levels in one sentence.
- The value is *not* the code. Every pattern here is 15 lines. Nobody is impressed by the lines.
- The failure mode is **pattern-stuffing**: forcing a Factory, an Abstract Factory and a Singleton into a problem that needed one function. That reads as inexperience, not seniority.
- Rule for this module: learn to *recognise* all seven, learn to *defend* using two of them, and learn to say "a plain function is enough here" without flinching.`,
    },
    {
      type: 'intuition',
      title: 'Three categories, seven patterns',
      md: `The Gang of Four split patterns by *what they are about*. Memorise the split — interviewers use it as a prompt ("give me a creational one").

- **Creational** — about *how objects get made*: **Singleton** (exactly one), **Factory** (who decides the concrete class), **Builder** (assembling a complicated object step by step).
- **Structural** — about *how objects are composed*: **Adapter** (make an incompatible interface fit), **Decorator** (wrap an object to add behaviour).
- **Behavioural** — about *how objects talk*: **Strategy** (swap an algorithm at runtime), **Observer** (tell everyone the state changed).
- One-line separator you will be asked for: **Adapter changes the interface and keeps the behaviour; Decorator keeps the interface and changes the behaviour.**
- Notice what is missing: Abstract Factory, Visitor, Flyweight, Memento. They exist. They almost never appear in a 45-minute LLD round.`,
    },

    {
      type: 'intuition',
      title: 'Singleton — one instance, global access',
      md: `The scenario: your service loads a config file and opens a database connection pool at startup.

- Parsing the config twice is waste; opening two pools is a **bug** — connection limits are per-process.
- Every module needs to reach the same object, and passing it through nine layers of function arguments is tedious.
- So you want: created once, reachable from anywhere, and impossible to accidentally duplicate.
- That is Singleton. It is also, as you will see below, the pattern most senior engineers push back on.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The Python answer first: a module IS a singleton',
      code: `# --- config.py -------------------------------------------------
class _Config:
    def __init__(self):
        self.dsn = 'postgres://localhost/app'
        self.timeout_s = 3.0

config = _Config()            # built once, at import time

# --- anywhere_else.py ------------------------------------------
# from config import config   # every importer gets the SAME object:
# Python caches the module in sys.modules and never re-runs its body.

a = config
b = config
print(a is b)
print(config.dsn, config.timeout_s)

# True
# postgres://localhost/app 3.0`,
      annotations: {
        7: 'This line runs exactly once per process. That is the entire Singleton — no metaclass, no __new__, no lock.',
        11: 'sys.modules is the cache. Import this module from ten files and the body still executed once, on the first import.',
        15: 'Same object identity from every importer. Say this in interviews: in Python the classic Singleton dance is usually unnecessary.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The interview version: thread-safe double-checked locking',
      code: `import threading

class Registry:
    _inst = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._inst is None:                    # check 1: no lock on the hot path
            with cls._lock:
                if cls._inst is None:            # check 2: another thread may have won
                    obj = super().__new__(cls)
                    obj.items = {}
                    cls._inst = obj
        return cls._inst

seen = set()
def grab():
    seen.add(id(Registry()))

ts = [threading.Thread(target=grab) for _ in range(50)]
for t in ts: t.start()
for t in ts: t.join()
print('distinct instances across 50 threads:', len(seen))

Registry().items['k'] = 1
print('shared state:', Registry().items)

# distinct instances across 50 threads: 1
# shared state: {'k': 1}`,
      annotations: {
        8: 'Fast path. Once the instance exists, no thread ever touches the lock again — that is the reason for the first check.',
        10: 'The second check is the whole point. Two threads can both pass check 1 and then queue on the lock; without this line the second one builds a second instance.',
        13: 'Publish LAST. Assigning cls._inst before obj.items exists would let another thread see a half-initialised singleton.',
        14: '__new__ returns the cached object, but __init__ still runs on EVERY call. Put no side effects in __init__ of a singleton.',
      },
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'C++: the Meyers singleton is the whole pattern',
      code: `#include <iostream>
#include <string>
#include <thread>
#include <vector>

class Config {
public:
    // The Meyers singleton: a function-local static. That is the whole pattern.
    static Config& instance() {
        static Config c;                 // built on first call, destroyed at exit
        return c;
    }
    const std::string& dsn() const { return dsn_; }

    Config(const Config&) = delete;              // no copies of the one instance
    Config& operator=(const Config&) = delete;

private:
    Config() : dsn_("postgres://localhost/app") {}
    std::string dsn_;
};

int main() {
    std::vector<const Config*> seen(8, nullptr);
    std::vector<std::thread> ts;
    for (int i = 0; i < 8; ++i)
        ts.emplace_back([&seen, i] { seen[i] = &Config::instance(); });
    for (auto& t : ts) t.join();

    bool same = true;
    for (const Config* p : seen) same = same && (p == seen[0]);
    std::cout << (same ? "one instance" : "RACE") << "\\n";
    std::cout << Config::instance().dsn() << "\\n";
}`,
      annotations: {
        10: 'Magic statics: since C++11 the standard guarantees a function-local static is initialised exactly once, and concurrent callers block until that finishes. The compiler emits the guard for you — which is why the double-checked-locking dance above is a historical artifact in C++ too.',
        15: 'Delete the copy operations. Without them someone writes Config c = Config::instance(); and quietly gets a second one.',
        19: 'Private constructor, so no outside code can build another. instance() is a member, so it still can.',
        27: 'Eight threads race to the first call. The C++11 rule means exactly one of them runs the constructor while the rest wait, so all eight pointers end up equal.',
        32: 'Note what is NOT in this file: no mutex, no atomic, no volatile, no null check. That is the entire argument for the idiom.',
      },
    },
    {
      type: 'note',
      md: `**The double-checked dance is a historical artifact.** Since C++11 a function-local \`static\` is initialised exactly once even under concurrent first calls — the *magic statics* rule — so the Meyers singleton above needs no mutex, no atomic and no \`volatile\`. Java fixed its own broken double-checked locking in 5.0 by giving \`volatile\` real semantics. Learn the double-checked version because interviewers still ask for it; write the one-liner, because the language already does the locking.`,
    },
    {
      type: 'note',
      md: `**Where you already use it:** \`logging.getLogger('billing')\` hands back the same logger object for the same name, every time, from anywhere in the process.`,
    },
    {
      type: 'note',
      md: `**Be honest about Singleton — this earns points.** It is widely considered the weakest of the seven, and for three concrete reasons. (1) It is **global mutable state** wearing a class costume: any code anywhere can reach in and change it, so you can never tell from a function\'s signature what it touches. (2) It **breaks tests**: state survives between test cases, tests start depending on order, and there is no seam to inject a fake — which is why test suites end up with ugly \`Registry._inst = None\` resets. (3) It **hides dependencies**: a class that reaches for the singleton internally lies about what it needs. The usual better answer is **dependency injection** — build the one instance at startup in \`main()\` and pass it in. You still have exactly one; you just made it visible and replaceable. Interview phrasing: *"I would use one object created at composition root and injected, rather than a Singleton class — same guarantee, testable."*`,
    },

    {
      type: 'intuition',
      title: 'Factory — decouple construction from use',
      md: `The scenario: your alerting service sends build failures by email, SMS or push, depending on user preference.

- The sending code should not contain \`if kind == 'email': Email(...) elif kind == 'sms': SMS(...)\` — that chain reappears in every caller and grows every time you add a channel.
- The caller knows *what* it wants ("a notifier for this user"). It should not know *which class* implements it, or what that class needs to be constructed.
- Adding a fourth channel should touch one place, not eleven.
- **Simple factory** = one function/dict that maps a key to a concrete class. **Factory method** = a method on a base class that subclasses override to decide the concrete type (\`Dialog.createButton()\` returning a \`WindowsButton\` or a \`MacButton\`).`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Simple factory, Python-style: a dict registry',
      code: `from dataclasses import dataclass

class Notifier:
    def send(self, msg): raise NotImplementedError

@dataclass
class Email(Notifier):
    addr: str
    def send(self, msg): return f'EMAIL -> {self.addr}: {msg}'

@dataclass
class SMS(Notifier):
    number: str
    def send(self, msg): return f'SMS   -> {self.number}: {msg}'

@dataclass
class Push(Notifier):
    token: str
    def send(self, msg): return f'PUSH  -> {self.token}: {msg}'

# Simple factory, Python flavour: a dict registry. No creator hierarchy.
CHANNELS = {'email': Email, 'sms': SMS, 'push': Push}

def make_notifier(kind, target):
    try:
        return CHANNELS[kind](target)
    except KeyError:
        raise ValueError(f'unknown channel {kind!r}') from None

for kind, target in [('email', 'asha@x.com'), ('sms', '+919900'), ('push', 'dev-42')]:
    print(make_notifier(kind, target).send('build failed'))

print('channels:', sorted(CHANNELS))
try:
    make_notifier('pigeon', 'coop-1')
except ValueError as e:
    print('rejected:', e)

# EMAIL -> asha@x.com: build failed
# SMS   -> +919900: build failed
# PUSH  -> dev-42: build failed
# channels: ['email', 'push', 'sms']
# rejected: unknown channel 'pigeon'`,
      annotations: {
        22: 'Classes are first-class objects in Python, so an entire creator hierarchy collapses into one dict. Adding a channel is one line and no caller changes.',
        26: 'The caller names WHAT it wants and never writes Email(...) itself. That decoupling is the pattern; the dict is just the cheapest carrier for it.',
        28: 'A factory is the right place to reject unknown types. Without this, a typo surfaces as a KeyError from somewhere deep in your plumbing.',
      },
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'The same registry in C++: makers instead of classes',
      code: `#include <functional>
#include <iostream>
#include <memory>
#include <stdexcept>
#include <string>
#include <unordered_map>

struct Notifier {                                  // the product interface
    virtual ~Notifier() = default;                 // virtual: deleted via a base pointer
    virtual std::string send(const std::string& m) const = 0;
};
struct Email : Notifier {
    explicit Email(const std::string& a) : addr(a) {}
    std::string send(const std::string& m) const override { return "EMAIL -> " + addr + ": " + m; }
    std::string addr;
};
struct SMS : Notifier {
    explicit SMS(const std::string& n) : num(n) {}
    std::string send(const std::string& m) const override { return "SMS   -> " + num + ": " + m; }
    std::string num;
};

// Python puts the CLASS itself in the dict. C++ classes are not values, so the
// registry stores one maker function per product instead.
using Maker = std::function<std::unique_ptr<Notifier>()>;
const std::unordered_map<std::string, Maker> kChannels = {
    {"email", [] { return std::make_unique<Email>("asha@x.com"); }},
    {"sms",   [] { return std::make_unique<SMS>("+919900"); }},
};

std::unique_ptr<Notifier> create(const std::string& kind) {
    auto it = kChannels.find(kind);
    if (it == kChannels.end()) throw std::invalid_argument("unknown channel " + kind);
    return it->second();                           // ownership moves to the caller
}

int main() {
    std::cout << create("email")->send("build failed") << "\\n";
    try { create("pigeon"); }
    catch (const std::invalid_argument& e) { std::cout << "rejected: " << e.what() << "\\n"; }
}`,
      annotations: {
        25: 'The contrast with Python in one line. There, CHANNELS[kind] IS the class and you call it. Here a class is not a value, so the map holds a callable that runs the constructor and hands back a base pointer.',
        27: 'One entry per product, exactly like the Python dict: adding a channel is one line and no caller changes. The lambda returns unique_ptr<Email>, which converts to unique_ptr<Notifier> on the way out.',
        33: 'Throwing is one valid choice; returning nullptr is the other. Pick throw when a bad key is a programming error, nullptr when it is expected input — but never return nullptr silently and hope every caller checks.',
        34: 'unique_ptr states the ownership contract in the type: the factory allocates, the caller owns, nobody deletes twice. The Python version gets this free from the garbage collector.',
      },
    },
    {
      type: 'note',
      md: `**Where you already use it:** \`open('f.bin', 'rb')\` and \`open('f.txt', 'r')\` return objects of *different classes* (\`BufferedReader\` vs \`TextIOWrapper\`) from one call — a factory function, in the standard library, that you have used a thousand times.`,
    },
    {
      type: 'note',
      md: `**When the dict beats the class hierarchy — and when it does not.** In Java you need a Factory *class* because classes are not values. In Python they are, so the dict registry wins whenever construction is uniform (same argument shape for every product) and the set of products is known in one place. Reach for a real **factory method** instead when: construction differs per product (each needs different collaborators), the choice depends on subclass identity rather than a string key, or the products are registered by plugins that load later — then a \`register(name, cls)\` decorator writing into the same dict is still usually enough. The smell to avoid is an \`AbstractNotifierFactoryProvider\`: if the factory is bigger than the things it makes, delete it.`,
    },

    {
      type: 'intuition',
      title: 'Strategy — swap the algorithm at runtime',
      md: `The scenario: checkout must apply a discount rule. Today: none. Next week: flat 10%. Next month: 25% capped at 150, but only for members.

- If the rule lives inside \`Checkout\` as an \`if/elif\` chain, every new rule edits a class that already works — and every edit risks the paths you did not touch.
- The rules all have the same *shape*: subtotal in, total out. Only the body differs.
- So make the rule a **value you pass in**, not code you branch on. \`Checkout\` calls it and never learns what it does.
- This is the **Open/Closed principle** from the SOLID module made concrete: \`Checkout\` is *closed for modification* (never edited again) but *open for extension* (any new rule plugs in). Strategy is how Open/Closed is usually achieved in practice.`,
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Strategy in C++: std::function is the interface',
      code: `#include <algorithm>
#include <functional>
#include <iostream>
#include <utility>

// The strategy IS the type: any rule mapping a subtotal to a total.
using Discount = std::function<double(double)>;

class Checkout {
public:
    explicit Checkout(Discount d) : discount_(std::move(d)) {}
    void setDiscount(Discount d) { discount_ = std::move(d); }   // swap at runtime
    double total(double subtotal) const { return discount_(subtotal); }
private:
    Discount discount_;
};

int main() {
    Checkout c{[](double s) { return s; }};              // no discount
    std::cout << c.total(1000.0) << "\\n";                // 1000.0

    c.setDiscount([](double s) { return s * 0.9; });     // flat 10% off
    std::cout << c.total(1000.0) << "\\n";                // 1000 * 0.9 = 900

    const double cap = 150.0;
    c.setDiscount([cap](double s) {                      // 25% off, capped at 150
        return s - std::min(s * 0.25, cap);
    });
    std::cout << c.total(1000.0) << "\\n";                // 1000 - min(250, 150) = 850
}`,
      annotations: {
        7: 'No abstract base class, no three-file inheritance tree. std::function is the interface: a lambda, a free function, a functor or a bound method all satisfy it.',
        12: 'The runtime swap. An inheritance-based Strategy needs exactly the same settable member — so the pluggable member, not the class hierarchy, is what makes it Strategy.',
        26: 'A new pricing rule is a new lambda at the call site. Checkout is never edited again: Open/Closed, in four lines.',
        29: 'The template alternative: make Discount a template parameter instead. Zero indirection cost and inlining, but the strategy is then fixed at compile time — no setDiscount. That is the tradeoff to name.',
      },
    },
    {
      type: 'note',
      md: `**Where you already use it:** \`sorted(rows, key=...)\` in Python and \`std::sort(v.begin(), v.end(), cmp)\` in C++ — one sorting machine, the comparison rule handed in as a value. You have been writing Strategy since your first week.`,
    },

    {
      type: 'intuition',
      title: 'Observer — publish/subscribe inside one process',
      md: `The scenario: a temperature reading changes. A logger must record it, a dashboard must redraw, and above 80° an alarm must fire.

- The sensor must not know about loggers, dashboards or alarms — otherwise every new feature edits the sensor.
- The list of interested parties changes at runtime: the dashboard exists only while a window is open.
- So the **subject** (the thing with the state) keeps a list of **subscribers** (callbacks), and on every change it walks the list and calls each one.
- One write, N reactions, and the subject stays ignorant of all of them. That is Observer — also called publish/subscribe, listeners, signals-and-slots, or events, depending on which library you grew up in.`,
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'Observer wiring: subscribe, notify, and the dangling subscriber',
        notice: 'Left column is the subject and its slot list. Right column is the subscriber objects. Watch what happens to slot 1 when its owner goes out of scope.',
        leftLabel: 'subject',
        rightLabel: 'subscribers',
        frames: [
          {
            note: 'A Subject owns two things: some state, and a list of callbacks. Nothing is registered yet, so set() would notify nobody. The subject is useful on its own — that is the point of the decoupling.',
            stack: [
              { name: 'value_', value: '0' },
              { name: 'slots_', value: '{} empty' },
            ],
            heap: [],
          },
          {
            note: 'Two observers register. Each subscribe() stores a callback under an id and hands back a Subscription token that the caller keeps. The subject now holds two arrows out; it still knows nothing about what they do.',
            stack: [
              { name: 'value_', value: '0' },
              { name: 'slots_[0]', to: 'log' },
              { name: 'slots_[1]', to: 'alarm' },
            ],
            heap: [
              { id: 'log', value: 'log(v)', label: 'main scope' },
              { id: 'alarm', value: 'alarm(v)', label: 'inner block' },
            ],
          },
          {
            note: 'sensor.set(95): the subject updates value_ and walks the list, calling every slot with 95. Both fire, synchronously, on this thread. N slow subscribers make set() N times slower — that is the notification-storm hazard.',
            stack: [
              { name: 'value_', value: '95 -> notify' },
              { name: 'slots_[0]', to: 'log' },
              { name: 'slots_[1]', to: 'alarm' },
            ],
            heap: [
              { id: 'log', value: 'log(95) ran', label: 'main scope' },
              { id: 'alarm', value: 'ALARM 95 fired', label: 'inner block' },
            ],
          },
          {
            note: 'The inner block ends. The Subscription token is destroyed and its destructor erases slot 1. The next set(99) reaches only the logger. Correct by construction: leaving the scope IS unsubscribing.',
            stack: [
              { name: 'value_', value: '99 -> notify' },
              { name: 'slots_[0]', to: 'log' },
            ],
            heap: [
              { id: 'log', value: 'log(99) ran', label: 'main scope' },
              { id: 'alarm', value: 'alarm(v)', freed: true },
            ],
          },
          {
            note: 'DANGER: the same design without the RAII token. The observer is destroyed but its entry stays in slots_. The next notify calls through a pointer into freed memory — the classic dangling-subscriber crash, and the number one Observer bug in C++.',
            stack: [
              { name: 'value_', value: '99 -> notify' },
              { name: 'slots_[0]', to: 'log' },
              { name: 'slots_[1]', to: 'alarm', danger: true },
            ],
            heap: [
              { id: 'log', value: 'log(99) ran', label: 'main scope' },
              { id: 'alarm', value: 'destroyed observer', freed: true },
            ],
          },
        ],
      },
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'Observer in C++ with an RAII subscription',
      code: `#include <functional>
#include <iostream>
#include <unordered_map>
#include <utility>

class Subject {                       // the publisher: state + subscriber list
public:
    using Slot = std::function<void(int)>;

    // RAII handle: unsubscribes in its destructor. Scope ends, callback gone.
    class Subscription {
    public:
        Subscription(Subject* s, int id) : s_(s), id_(id) {}
        ~Subscription() { if (s_) s_->slots_.erase(id_); }
        Subscription(Subscription&& o) noexcept : s_(o.s_), id_(o.id_) { o.s_ = nullptr; }
        Subscription(const Subscription&) = delete;
        Subscription& operator=(const Subscription&) = delete;
    private:
        Subject* s_;
        int id_;
    };

    [[nodiscard]] Subscription subscribe(Slot f) {
        int id = nextId_++;
        slots_.emplace(id, std::move(f));
        return Subscription(this, id);          // the caller must keep this alive
    }

    void set(int v) {                           // state change -> notify everyone
        value_ = v;
        auto snapshot = slots_;                 // a slot may (un)subscribe mid-notify
        for (auto& kv : snapshot) kv.second(value_);
    }

private:
    int value_ = 0;
    int nextId_ = 0;
    std::unordered_map<int, Slot> slots_;
};

int main() {
    Subject sensor;
    auto logSub = sensor.subscribe([](int v) { std::cout << "log " << v << "\\n"; });
    {
        auto alarmSub = sensor.subscribe(
            [](int v) { if (v > 80) std::cout << "ALARM " << v << "\\n"; });
        sensor.set(95);                         // both slots run
    }                                           // alarmSub dies -> auto-unsubscribed
    sensor.set(99);                             // only the logger is left
}`,
      annotations: {
        14: 'The destructor removes the callback. This is what makes the pattern safe here: you cannot forget to unsubscribe, because leaving the scope is unsubscribing.',
        23: 'nodiscard matters: ignoring the returned token destroys it immediately, which unsubscribes on the spot. The compiler warns you instead of leaving you confused.',
        31: 'Copy the map before iterating. A slot that subscribes or unsubscribes during notify would otherwise invalidate the iterator mid-loop — a real crash, not a theoretical one.',
        32: 'One state change fans out to N callbacks, synchronously, on the caller thread. This line is where notification storms happen.',
        43: 'The remaining hazard the RAII token does NOT fix: Subject must outlive every Subscription, because the destructor dereferences s_. In a longer-lived design, hold the subject by weak_ptr.',
      },
    },
    {
      type: 'note',
      md: `**Where you already use it:** \`element.addEventListener('click', fn)\` in the browser, Django signals, Qt signals/slots, and every "on_change" callback you have ever registered.`,
    },
    {
      type: 'note',
      md: `**The two classic hazards, named.** (1) **Lifetime / dangling subscribers** — a subscriber is destroyed but its entry survives in the subject, so the next notify calls into freed memory (C++) or keeps a dead object alive forever (a listener leak in a GC language: the subject\'s list is a strong reference, so nothing is ever collected). Fixes: RAII tokens as above, weak references, or a subscription id the owner must release. (2) **Notification storms** — notify is synchronous and re-entrant, so one write can fan out to hundreds of handlers, and a handler that writes back to the subject can trigger an infinite notify loop. Fixes: coalesce or debounce events, batch changes and notify once, and never do slow work (network, disk) inside a slot. **The cross-process version of all this is a message queue** — same publish/subscribe shape, but the subscribers live in other machines, delivery is asynchronous and buffered, and a slow subscriber grows a backlog instead of blocking the publisher. See \`sysdesign-l0-queues-messaging\`. Observer is pub/sub with the network removed — and therefore with none of the network\'s safety.`,
    },

    {
      type: 'intuition',
      title: 'Builder — many optional parameters, one immutable result',
      md: `The scenario: an HTTP request object with a URL, a method, headers, a timeout, retries, TLS options and a proxy — three of which matter and the rest have defaults.

- The constructor becomes \`HttpRequest(url, 'POST', {...}, 2.5, 3, True, None)\` — nobody can read it, and swapping two positional arguments compiles fine and pages you at 3am.
- Some rules span fields: "a retried POST needs an Idempotency-Key". A constructor can only check that at the very end, and a setter-based object can sit in an invalid state in between.
- You want the object **immutable once built**, but built over several statements.
- Builder: a mutable helper collecting the pieces, each step returning itself so calls chain, and one \`build()\` that validates and freezes.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Fluent builder — and the Python shortcut that usually replaces it',
      code: `from dataclasses import dataclass, field

@dataclass(frozen=True)               # the RESULT is immutable
class HttpRequest:
    url: str
    method: str = 'GET'
    headers: dict = field(default_factory=dict)
    timeout_s: float = 5.0
    retries: int = 0

class RequestBuilder:
    def __init__(self, url):
        self._url, self._method = url, 'GET'
        self._headers, self._timeout, self._retries = {}, 5.0, 0

    def post(self):                                  # every step returns self
        self._method = 'POST'; return self
    def header(self, k, v):
        self._headers[k] = v; return self
    def timeout(self, s):
        if s <= 0: raise ValueError('timeout must be > 0')     # validate per step
        self._timeout = s; return self
    def retry(self, n):
        self._retries = n; return self

    def build(self):                                 # cross-field check, then freeze
        if self._retries and self._method == 'POST' and 'Idempotency-Key' not in self._headers:
            raise ValueError('a retried POST needs an Idempotency-Key')
        return HttpRequest(self._url, self._method, dict(self._headers),
                           self._timeout, self._retries)

req = (RequestBuilder('https://api.pay/charge')
       .post().header('Idempotency-Key', 'chg_7f3').timeout(2.5).retry(3).build())
print(req)

try:
    RequestBuilder('https://api.pay/charge').post().retry(3).build()
except ValueError as e:
    print('rejected:', e)

# Most of the time Python needs no builder at all -- keyword args already do this:
print(HttpRequest('https://api.pay/charge', method='POST', timeout_s=2.5))

# HttpRequest(url='https://api.pay/charge', method='POST', headers={'Idempotency-Key': 'chg_7f3'}, timeout_s=2.5, retries=3)
# rejected: a retried POST needs an Idempotency-Key
# HttpRequest(url='https://api.pay/charge', method='POST', headers={}, timeout_s=2.5, retries=0)`,
      annotations: {
        3: 'frozen=True is the half of Builder people forget. The builder is mutable so that the product does not have to be.',
        17: 'return self is the entire fluent trick: each step hands the builder back so the next call can chain onto it.',
        27: 'The rule that earns Builder its keep: it depends on two fields at once, so it can only be checked when the object is complete. Keyword arguments cannot express this.',
        29: 'dict(self._headers) copies. Without it, mutating the builder afterwards would reach inside your supposedly frozen object.',
        41: 'The honest comparison. Python keyword arguments plus @dataclass already give readable, defaulted, order-independent construction — so reach for Builder only for stepwise or validated assembly.',
      },
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'C++: fluent builder, immutable product',
      code: `#include <iostream>
#include <stdexcept>
#include <string>

struct HttpRequest {                 // the product: all members const, so it cannot change
    const std::string url;
    const std::string method;
    const std::string idem_key;
    const double timeout_s;
    const int retries;
};

class RequestBuilder {
public:
    explicit RequestBuilder(const std::string& url) : url_(url) {}
    RequestBuilder& post() { method_ = "POST"; return *this; }        // *this BY REFERENCE
    RequestBuilder& key(const std::string& k) { idem_ = k; return *this; }
    RequestBuilder& retry(int n) { retries_ = n; return *this; }
    RequestBuilder& timeout(double s) {
        if (s <= 0) throw std::invalid_argument("timeout must be > 0");   // per-step check
        timeout_ = s;
        return *this;
    }
    HttpRequest build() const {                                          // cross-field check
        if (retries_ > 0 && method_ == "POST" && idem_.empty())
            throw std::invalid_argument("a retried POST needs an Idempotency-Key");
        return HttpRequest{url_, method_, idem_, timeout_, retries_};    // product BY VALUE
    }
private:
    std::string url_, method_ = "GET", idem_;
    double timeout_ = 5.0;
    int retries_ = 0;
};

int main() {
    HttpRequest r = RequestBuilder("https://api.pay/charge")
                        .post().key("chg_7f3").timeout(2.5).retry(3).build();
    std::cout << r.method << " " << r.url << " t=" << r.timeout_s << " r=" << r.retries << "\\n";
    try { RequestBuilder("https://api.pay/charge").post().retry(3).build(); }
    catch (const std::invalid_argument& e) { std::cout << "rejected: " << e.what() << "\\n"; }
}`,
      annotations: {
        5: 'const members make the product genuinely immutable: it cannot be assigned or mutated after build(). The builder is mutable so the product does not have to be.',
        16: 'Return *this by reference, not by value — a by-value return would copy the whole builder at every step of the chain. The reference is valid for the whole chain because the temporary lives until the end of the full expression.',
        25: 'The rule that earns Builder its keep: it reads two fields at once, so it can only be checked when assembly is finished. No constructor signature can express it.',
        27: 'build() hands back the product by value. The caller owns a complete, validated, frozen object and the builder can be dropped on the spot.',
        37: 'Why C++ needs Builder more than Python does: there are no keyword arguments, so the alternative is HttpRequest{url, "POST", "chg_7f3", 2.5, 3} — and swapping two same-typed arguments there compiles silently and pages you later.',
      },
    },
    {
      type: 'note',
      md: `**Where you already use it:** \`session.query(User).filter(...).order_by(...).limit(10).all()\` — every SQL query builder and every \`argparse.ArgumentParser().add_argument(...)\` chain is this pattern.`,
    },

    {
      type: 'intuition',
      title: 'Adapter — make an incompatible interface fit',
      md: `The scenario: your checkout code calls \`payments.charge(cents, token)\`. The payment vendor\'s SDK offers \`create_payment_intent(amount_minor=..., currency=..., source=...)\` and returns a dict.

- The vendor\'s shape is fine — for the vendor. It is wrong for you, and you cannot change it.
- If you call the SDK directly from ten places, the vendor has leaked into ten files, and switching vendors becomes a rewrite.
- Tests are the other half of the pain: you now need the SDK (and often the network) to test a checkout flow.
- Adapter: define the narrow interface you actually want (the **port**), then write one class that implements it by translating to the vendor call. One file knows the vendor exists.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Third-party SDK behind your own port',
      code: `# The port: the narrow interface YOUR code depends on.
class PaymentPort:
    def charge(self, cents, token): raise NotImplementedError

# The third-party SDK. You do not own it and cannot change its shape.
class VendorSDK:
    def create_payment_intent(self, *, amount_minor, currency, source):
        return {'id': 'pi_9x1', 'status': 'succeeded',
                'amount': amount_minor, 'cur': currency, 'src': source}

class VendorAdapter(PaymentPort):          # the wrapper IS the pattern
    def __init__(self, sdk, currency='usd'):
        self._sdk, self._currency = sdk, currency
    def charge(self, cents, token):
        r = self._sdk.create_payment_intent(amount_minor=cents,
                                            currency=self._currency, source=token)
        if r['status'] != 'succeeded':
            raise RuntimeError(f"charge failed: {r['status']}")
        return r['id']                     # their shape -> your contract

class FakePayments(PaymentPort):           # tests need no SDK and no network
    def charge(self, cents, token): return 'pi_test'

def checkout(payments):                    # depends on the port, never the vendor
    return payments.charge(1999, 'tok_visa')

print(checkout(VendorAdapter(VendorSDK())))
print(checkout(FakePayments()))

# pi_9x1
# pi_test`,
      annotations: {
        1: 'Write the interface YOU want first. Start from the SDK\'s shape and the SDK has already won — its vocabulary spreads through your codebase.',
        11: 'Adapter changes the interface and keeps the behaviour. Decorator keeps the interface and changes the behaviour. That one sentence separates the two forever.',
        18: 'Translate their errors too, not just their arguments. A leaked vendor exception type is the same leak as a leaked vendor class.',
        22: 'The payoff, and the reason to bother: swapping vendors or faking one in tests touches this file only.',
      },
    },
    {
      type: 'note',
      md: `**Where you already use it:** Python\'s DB-API 2.0 — \`sqlite3\`, \`psycopg2\` and \`mysqlclient\` expose the same \`connect / cursor / execute / fetchall\` interface over three completely different wire protocols. Every driver is an adapter.`,
    },

    {
      type: 'intuition',
      title: 'Decorator — add behaviour without touching the class',
      md: `The scenario: \`fetch_user()\` works. Now it needs retries on network errors, a cache, and a timing metric — and so do fourteen other functions.

- Editing every function to add try/retry/log triples the code and mixes three concerns into one body.
- Subclassing does not help: the extra behaviour is orthogonal, and you would need a subclass per combination (retrying + cached + timed = a class explosion).
- The behaviours must **compose**: retry around cache, or cache around retry, chosen per call site.
- Decorator: wrap the thing in something with the *same interface* that does a little extra before or after delegating. Stack the wrappers to compose.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Python decorators, and the GoF object form underneath',
      code: `import functools, time

def retry(times=3, delay=0.0):
    def deco(fn):
        @functools.wraps(fn)                    # keep __name__, __doc__, __wrapped__
        def wrapper(*a, **kw):
            for attempt in range(1, times + 1):
                try:
                    return fn(*a, **kw)
                except ConnectionError as e:
                    if attempt == times: raise
                    print(f'  {fn.__name__}: {e} -- retry {attempt}/{times - 1}')
                    time.sleep(delay)
        return wrapper
    return deco

calls = {'n': 0}

@retry(times=3)
@functools.lru_cache(maxsize=128)               # a caching decorator, from the stdlib
def fetch_user(uid):
    calls['n'] += 1
    if calls['n'] < 3: raise ConnectionError('flaky network')
    return {'id': uid, 'name': 'asha'}

print(fetch_user(7))
print(fetch_user(7))                            # cache hit: the body never runs again
print('body executions:', calls['n'], '| name preserved:', fetch_user.__name__)

# The GoF form: wrap an OBJECT, not a function. Same idea, one level up.
class FileStream:
    def write(self, s): return f'wrote {s!r}'
class Compressing:                              # same interface, adds behaviour
    def __init__(self, inner): self._inner = inner
    def write(self, s): return self._inner.write(s.replace(' ', ''))
print(Compressing(FileStream()).write('a b c'))

#   fetch_user: flaky network -- retry 1/2
#   fetch_user: flaky network -- retry 2/2
# {'id': 7, 'name': 'asha'}
# {'id': 7, 'name': 'asha'}
# body executions: 3 | name preserved: fetch_user
# wrote 'abc'`,
      annotations: {
        5: 'Without functools.wraps the decorated function reports itself as "wrapper" — breaking logs, tracebacks, docs, and every tool that reads __name__.',
        19: 'Decorators apply bottom-up: lru_cache wraps fetch_user, then retry wraps that. Order matters — here every retry attempt consults the cache; flip them and the cache would store the result of the whole retry loop.',
        27: 'The second call never reaches the body. Retry, caching and timing/metrics are the three real uses; everything else is a party trick.',
        33: 'The GoF object form: same interface as the thing it wraps, plus one behaviour, holding the wrapped object. gzip.GzipFile wrapping a file object is exactly this.',
      },
    },
    {
      type: 'code',
      lang: 'cpp',
      title: 'C++: Adapter and Decorator are the same move, different intent',
      code: `#include <exception>
#include <iostream>
#include <memory>
#include <string>
#include <utility>

struct PaymentPort {                    // the narrow interface YOUR code wants
    virtual ~PaymentPort() = default;
    virtual std::string charge(int cents, const std::string& token) = 0;
};

struct VendorSDK {                      // wrong shape for you, and you cannot change it
    std::string pay(int minor, const std::string& cur, const std::string& src) const {
        return "pi_9x1:" + cur + ":" + src + ":" + std::to_string(minor);
    }
};

// ADAPTER: the outside interface CHANGES, the behaviour does not.
class VendorAdapter : public PaymentPort {
public:
    std::string charge(int cents, const std::string& token) override {
        return sdk_.pay(cents, "usd", token);      // their vocabulary stops here
    }
private:
    VendorSDK sdk_;
};

// DECORATOR: the outside interface STAYS, behaviour is added. Same wrapping move.
class Retrying : public PaymentPort {
public:
    Retrying(std::unique_ptr<PaymentPort> inner, int tries)
        : inner_(std::move(inner)), tries_(tries) {}
    std::string charge(int cents, const std::string& token) override {
        for (int i = 1;; ++i) {
            try { return inner_->charge(cents, token); }
            catch (const std::exception&) { if (i == tries_) throw; }  // last one: let it out
        }
    }
private:
    std::unique_ptr<PaymentPort> inner_;
    int tries_;
};

int main() {
    std::unique_ptr<PaymentPort> payments =
        std::make_unique<Retrying>(std::make_unique<VendorAdapter>(), 3);
    std::cout << payments->charge(1999, "tok_visa") << "\\n";
}`,
      annotations: {
        9: 'Write the interface YOU want first, exactly as in the Python version. This abstract base is the port, and it is where the vendor stops.',
        19: 'Adapter: outside is PaymentPort, inside is VendorSDK. The shapes differ, so this class exists to translate — and no other file learns the vendor exists.',
        29: 'Decorator: outside is PaymentPort and inside is PaymentPort too. The shapes match, which is exactly why decorators nest and adapters do not.',
        31: 'Takes the inner object by unique_ptr and owns it. Single ownership is what makes the nesting in main leak-free: destroying the outer wrapper destroys the whole chain.',
        46: 'The teaching point. Both classes above are the same C++ technique — inherit the interface, hold the inner object, forward the call. Only the intent differs, and the outside interface is what tells you which intent it was. The call builds pi_9x1:usd:tok_visa:1999 and retries up to three times if the vendor throws.',
      },
    },
    {
      type: 'note',
      md: `**How the two forms relate.** GoF Decorator wraps an **object**: same interface, holds the inner one, adds behaviour, and you can nest wrappers (\`Buffered(Compressed(File()))\`). Python\'s \`@\` syntax is the same idea narrowed to a **callable**: a function is an object with one method, so "same interface" just means "same call signature", and stacking decorators is nesting wrappers. **Where you already use them:** \`@functools.lru_cache\`, \`@property\`, and — in object form — \`gzip.GzipFile(fileobj)\` and \`io.BufferedReader(raw)\`.`,
    },

    {
      type: 'intuition',
      title: 'How to use patterns in an interview',
      md: `Patterns are a shortcut for *talking*, so use them the way a senior does: as a label on something you were going to build anyway.

- **Name the shape, do not recite the definition.** "I'll make the matching rule a Strategy so a new rule is a new class, not an edit" — one sentence, then move on. Reciting "Strategy defines a family of algorithms, encapsulates each one…" signals memorisation, not judgement.
- **Derive, then label.** Design the solution first; attach the name at the end. If you start from the pattern, you bend the problem to fit it.
- **Say the cost.** Every pattern buys flexibility with indirection. "This adds a level of indirection; worth it because the rules change monthly" is the sentence that separates senior from student.
- **Refuse when it does not fit.** "You could Factory this, but there are two types and they never change — a plain if is clearer" is a *strong* answer. Pattern-stuffing (a Factory producing one product, a Strategy with one implementation, a Singleton wrapping a constant) is the anti-pattern, and interviewers watch for it.
- **The three you will actually reach for in an LLD round:** Strategy (pluggable rules — pricing, matching, parking-fee calculation), Observer (state changes that fan out — notifications, lift-button events), Factory (choosing a concrete type from input). Know the other four well enough to name them on sight.`,
    },
  ],
  quiz: [
    {
      question: 'Your code calls `sorted(rows, key=make_key(prefs))` — the same sorting machinery, with the comparison rule handed in at runtime. Which pattern is this?',
      options: [
        { text: 'Strategy', explanation: 'Correct. One algorithm slot, a pluggable rule passed in as a value. `key=` is Strategy in the standard library.' },
        { text: 'Factory', explanation: 'A factory decides which concrete class to construct. Nothing is being constructed here — a behaviour is being supplied.' },
        { text: 'Decorator', explanation: 'A decorator would wrap `sorted` to add behaviour around it while keeping its interface. Here the rule goes INSIDE, as a parameter.' },
        { text: 'Adapter', explanation: 'An adapter would translate `sorted` into a different interface. The interface is unchanged.' },
      ],
      correct: 0,
    },
    {
      question: 'In Python, the lowest-ceremony correct way to get "exactly one instance, reachable everywhere" is…',
      options: [
        { text: 'A metaclass that intercepts instantiation', explanation: 'It works, and it is the most over-engineered option: a metaclass to solve a problem the import system already solved.' },
        { text: 'A module-level object — the module body runs once and is cached in sys.modules', explanation: 'Correct. A module IS a singleton. Create the object at module scope and every importer gets the same one, with zero machinery.' },
        { text: '`__new__` with a class attribute and a lock', explanation: 'This is the interview-answer version and it is genuinely needed for thread-safe lazy creation — but it is not the lowest-ceremony option in Python.' },
        { text: 'A global dict keyed by class name', explanation: 'A hand-rolled registry that reimplements what sys.modules already does, plus a new place for typos.' },
      ],
      correct: 1,
    },
    {
      question: 'You must construct an object with 3 required and 9 optional fields, reject the combination "retries set but no idempotency key", and hand back something immutable. Which fits best?',
      options: [
        { text: 'Factory', explanation: 'Factory decides WHICH class to build. Here the class is already known; the difficulty is assembling and validating one instance.' },
        { text: 'Singleton', explanation: 'Nothing here says there should be exactly one request object — quite the opposite.' },
        { text: 'Builder', explanation: 'Correct. Named steps instead of twelve positional arguments, a cross-field rule checked in build(), and a frozen product at the end. That cross-field rule is precisely what keyword arguments cannot express.' },
        { text: 'Adapter', explanation: 'Adapter translates one interface into another. No incompatible interface is involved.' },
      ],
      correct: 2,
    },
    {
      question: 'One-line separator: Adapter vs Decorator.',
      options: [
        { text: 'Adapter is creational, Decorator is behavioural', explanation: 'Both are structural. Neither creates objects, and neither is about how objects communicate.' },
        { text: 'Adapter changes the interface and keeps the behaviour; Decorator keeps the interface and changes the behaviour', explanation: 'Correct. An adapter exists because two shapes do not fit; a decorator exists because you want extra behaviour and must remain drop-in compatible.' },
        { text: 'Adapter wraps a function, Decorator wraps a class', explanation: 'Both wrap. What differs is whether the outside shape changes, not what kind of thing is wrapped.' },
        { text: 'Decorator is Python-only syntax', explanation: 'The `@` syntax is Python, but the pattern is language-independent — gzip wrapping a file object is a decorator in any language.' },
      ],
      correct: 1,
    },
    {
      question: 'A C++ Observer crashes intermittently in production, always inside `notify`. What is the most likely cause?',
      options: [
        { text: 'Too many subscribers', explanation: 'That makes notify slow (a notification storm), not crashy. Slowness and use-after-free are different failures.' },
        { text: 'The subject was never initialised', explanation: 'That would fail on the very first notify, deterministically — not intermittently in production.' },
        { text: 'The callbacks are not thread-safe', explanation: 'Plausible in general, but the pattern-specific and far more common bug is about lifetimes, and it produces exactly this signature.' },
        { text: 'A subscriber was destroyed while its entry stayed in the subject — notify calls into freed memory', explanation: 'Correct. The dangling-subscriber bug: nothing removed the callback when its owner died. Fix with an RAII subscription token, a weak reference, or an explicit unsubscribe in the destructor.' },
      ],
      correct: 3,
    },
    {
      question: 'In Python, why does a dict registry `{"email": Email, "sms": SMS}` usually beat a hierarchy of factory classes?',
      options: [
        { text: 'It is faster at runtime', explanation: 'A dict lookup versus a virtual call is noise. Speed is not the argument.' },
        { text: 'Factory classes cannot be tested', explanation: 'They test fine. The objection is weight, not testability.' },
        { text: 'Classes are first-class objects in Python, so a whole creator hierarchy collapses into one dict entry per product', explanation: 'Correct. Java needs a factory class because classes are not values; Python can store the class itself. Adding a product becomes one line, with no caller changes.' },
        { text: 'A dict enforces the product interface', explanation: 'It enforces nothing — that is the real cost of the dict approach, and why an ABC base class is still worth having.' },
      ],
      correct: 2,
    },
    {
      question: 'In double-checked locking, what does the SECOND `if instance is None` check protect against?',
      options: [
        { text: 'The lock failing to acquire', explanation: 'Acquiring a lock either succeeds or blocks; it does not silently fail.' },
        { text: 'Two threads both passing the first check and queueing on the lock — without it, the second one builds a second instance', explanation: 'Correct. The first check is the fast path; the second is the correctness check, made after the winner has already published the instance.' },
        { text: 'The instance being garbage collected', explanation: 'A class attribute holds a strong reference; it is not collectable.' },
        { text: 'Nothing — it is redundant', explanation: 'It is exactly the line whose absence makes the pattern wrong. Delete it and the "double-checked" name stops meaning anything.' },
      ],
      correct: 1,
    },
    {
      question: 'An interviewer asks you to design a parking-lot fee calculator with two fee types that have not changed in five years. What is the strongest answer?',
      options: [
        { text: 'An AbstractFeeStrategyFactory producing Strategy objects, registered through a Singleton registry', explanation: 'Textbook pattern-stuffing: three patterns, one of which is the weakest, for two stable cases. This reads as inexperience.' },
        { text: 'A Singleton FeeCalculator so the whole system shares one', explanation: 'A calculator is stateless; making it global buys nothing and costs testability. Singleton is the pattern to reach for last.' },
        { text: 'Use Strategy anyway — patterns are always the safer default', explanation: 'Indirection is not free. A pattern with one or two fixed implementations adds a hop and a file for flexibility nobody will use.' },
        { text: 'A plain function with an if — and say out loud that you would extract a Strategy the moment fee rules become configurable', explanation: 'Correct. Naming the simplest thing that works AND the trigger that would change your mind is exactly the judgement the question tests.' },
      ],
      correct: 3,
    },
  ],
  interviewQuestions: [
    {
      question: 'What is a design pattern, and why should I care that you know them?',
      answer:
        'A pattern is a name for a solution people kept re-deriving, packaged with its tradeoff. The value is communication speed: "make the matching rule a Strategy" replaces a paragraph, and both of us immediately know the structure and the cost. The value is not the code — every one of these is fifteen lines. What you should care about is that I can recognise the shape in a problem and, just as importantly, refuse to use one when it does not fit. Three categories: creational (Singleton, Factory, Builder), structural (Adapter, Decorator), behavioural (Strategy, Observer).',
      isCaseBased: false,
    },
    {
      question: 'Talk me through Singleton. Would you use it?',
      answer:
        'Singleton guarantees one instance with a global access point — the classic use is a config object or a connection pool, where duplicating is wasteful or actively wrong. In Python I would first point out that a module is already a singleton: the body runs once, sys.modules caches it, and a module-level object gives you the guarantee with no machinery. For the interview-classic version you need thread-safe lazy creation: double-checked locking in __new__, with the second check inside the lock, and publishing the instance only after it is fully built. But asked whether I would use it — mostly no. It is global mutable state, so callers hide their dependencies, and tests leak state between cases with no seam to inject a fake. I would build exactly one instance at the composition root and inject it: same guarantee, visible dependency, replaceable in tests.',
      isCaseBased: false,
    },
    {
      question: 'Simple factory versus factory method — and when does neither earn its place?',
      answer:
        'Simple factory: one function or dict that maps an input to a concrete class — `make_notifier("sms", ...)`. Factory method: a method on a base class that subclasses override to choose the concrete type, so the decision rides on the subclass rather than on a key. Use simple factory when the choice comes from data (a config string, a request field) and construction is uniform. Use factory method when the choice belongs to a subclass that already exists for other reasons — a `MacDialog` that makes `MacButton`s. Neither earns its place when there are two types that never change: then it is an if, and adding a factory just adds a hop. In Python specifically, the class-hierarchy version usually collapses into a dict registry, because classes are values — and the smell to watch for is a factory bigger than the things it produces.',
      isCaseBased: false,
    },
    {
      question: 'Case: a ride-hailing service matches riders to drivers. Today it is nearest-driver. Next quarter: highest-rating, then a surge-aware rule, then a per-city experiment where two rules run side by side. Design it.',
      answer:
        'Strategy, and the last requirement is what proves it. The matcher takes a rule object (or in C++ a std::function) mapping (rider, candidate drivers) to a chosen driver; the dispatch service calls it and never learns which rule it holds. New rule = new class, no edit to dispatch — Open/Closed. The side-by-side experiment is the payoff: because the rule is a value, I can pick it per request from a config or an experiment bucket, and the A/B split is one lookup rather than a branch inside dispatch. Tradeoffs I would volunteer: the rules now need a common input contract, so if one needs data others do not (surge multipliers, city policy), either the contract widens for everyone or the rule fetches its own data and becomes harder to test; and per-request selection means a config error can route real traffic to an unfinished rule, so I want a default and a kill switch. If pushed on why not just an if/elif — with two permanent rules I would agree; here the requirement explicitly says rules keep arriving and must coexist, which is exactly the case an if chain handles worst.',
      isCaseBased: true,
    },
    {
      question: 'Implement Observer in C++. What goes wrong in production?',
      answer:
        'The subject keeps a container of callbacks — `unordered_map<int, std::function<void(int)>>` — subscribe inserts one and returns an id, and any state change walks the container calling each slot. Two things go wrong. First, lifetimes: a subscriber is destroyed but its entry survives, so the next notify calls through into freed memory. The fix I would write is an RAII Subscription token returned from subscribe, move-only and [[nodiscard]], whose destructor erases the slot — leaving the scope IS unsubscribing, so it cannot be forgotten. The residual hazard is that the subject must outlive the tokens, which for longer-lived graphs means holding it by weak_ptr. Second, notification storms: notify is synchronous and re-entrant, so one write fans out to N handlers on the caller thread, a slow handler slows every write, and a handler that writes back to the subject can loop forever. Mitigations: copy the container before iterating (a slot may subscribe or unsubscribe mid-notify and invalidate the iterator), coalesce or debounce events, and never do I/O inside a slot.',
      isCaseBased: false,
    },
    {
      question: 'How does Observer relate to a message queue like Kafka or RabbitMQ?',
      answer:
        'Same shape, different blast radius. Observer is publish/subscribe inside one process: the subject holds direct references to subscribers, delivery is a synchronous function call, and there is no buffer, no retry and no durability — if a handler throws, the publisher feels it. A message queue is the cross-process version: subscribers live on other machines, the broker buffers, delivery is asynchronous and at-least-once, and a slow consumer grows a backlog instead of blocking the producer. That buffer is why the failure modes differ — Observer fails with dangling subscribers and notification storms; a queue fails with lag, duplicate deliveries and poison messages. The design rule I would state: use Observer when the reactions are in-process, fast and non-critical (UI updates, cache invalidation within a service); reach for a queue the moment a reaction must survive a crash, cross a service boundary, or be allowed to run slower than the publisher. See the queues module for backpressure and consumer lag.',
      isCaseBased: false,
    },
    {
      question: 'When does Builder actually earn its keep, given Python has keyword arguments?',
      answer:
        'Honestly, less often than tutorials suggest. Keyword arguments plus @dataclass already give you readable, defaulted, order-independent construction, and frozen=True gives immutability — that covers most of what Builder is sold for. Builder earns its keep in three cases. One, cross-field validation: "a retried POST needs an Idempotency-Key" depends on two fields at once, so it can only be checked when the object is complete, in build(). Two, stepwise assembly, where the pieces arrive at different times or from different code paths and you do not want a half-valid object visible in between — the builder is mutable so the product does not have to be. Three, the same recipe producing different representations (the classic director/builder split: one parse, an HTML builder and a PDF builder). In Java it also earns its keep just from the telescoping-constructor problem, which Python does not have. The tell that it is not needed: a builder whose methods are one-to-one with fields and whose build() has no logic — that is a dataclass with extra typing.',
      isCaseBased: false,
    },
    {
      question: 'Case: your team is on payment vendor A. Leadership wants vendor B added for one region within a month, with a clean switch back if B is unreliable. Nobody wrote an abstraction. Plan it.',
      answer:
        'Adapter, introduced by strangling rather than by rewrite. Step one: define the port from the CALL SITES, not from either SDK — grep every place vendor A is touched and write down the narrow interface your code actually uses (charge, refund, get_status). That is usually three or four methods, not the SDK\'s forty. Step two: write AdapterA implementing that port by delegating to the existing SDK calls, and mechanically replace call sites with the port. This step changes no behaviour and is reviewable. Step three: AdapterB for the new vendor, and now the interesting work is visible — the leaks the port has to hide: error taxonomies that do not line up, currency and minor-unit conventions, idempotency-key semantics, and webhook shapes for async status. Step four: selection at the composition root by region, plus a kill switch to fall back to A. Tradeoffs to say out loud: the port is a lowest-common-denominator, so a vendor-specific feature either goes unused or leaks through an escape hatch that erodes the abstraction; and two vendors means two sets of webhooks and reconciliation, which is operational cost the abstraction does not remove. The test win is real and immediate — a FakePayments implementing the port makes checkout tests network-free.',
      isCaseBased: true,
    },
    {
      question: 'Adapter, Decorator, Proxy and Facade all wrap something. Untangle them.',
      answer:
        'All four hold an inner object; what differs is intent and the shape of the outside. Adapter: the outside interface is DIFFERENT from the inside — it exists because two shapes do not fit (a vendor SDK behind your port). Decorator: the outside interface is the SAME, with behaviour added — and because it is the same, decorators nest (gzip wrapping a file, retry wrapping a cache wrapping a function). Proxy: same interface too, but the intent is control of ACCESS rather than added behaviour — lazy loading, permission checks, a remote stub. Facade: a NEW, simpler interface over a whole subsystem of many objects, not one. The quick test in an interview: did the interface change (Adapter/Facade) or stay (Decorator/Proxy)? Then, is it about behaviour (Decorator) or access (Proxy), one object (Adapter) or many (Facade)?',
      isCaseBased: false,
    },
    {
      question: 'Explain Python decorators in terms of the GoF Decorator pattern. Where do they diverge?',
      answer:
        'GoF Decorator wraps an object: the wrapper implements the same interface, holds the inner object, and adds behaviour before or after delegating — so wrappers nest. A Python decorator is that idea narrowed to a callable: a function is an object with one method, "same interface" means "same call signature", and stacking @ decorators is nesting wrappers, applied bottom-up. The practical detail that matters is functools.wraps — without it the wrapper reports its own __name__ and __doc__, which breaks logging, tracebacks, docs and introspection tools; wraps also sets __wrapped__ so signature inspection can see through. Where they diverge: the @ form is applied once at definition time to a name, so it is a static composition, while GoF decorators are composed per object at runtime and can be applied conditionally to some instances and not others. Real uses in both forms: retry, timing and metrics, caching (lru_cache), auth checks, and — object form — gzip.GzipFile and io.BufferedReader.',
      isCaseBased: false,
    },
    {
      question: 'Case: you are reviewing a junior\'s parking-lot design. It has an AbstractVehicleFactory, a SpotAllocationStrategy with one implementation, a Singleton ParkingLotManager and an Observer for spot-freed events. What do you say?',
      answer:
        'I keep one, question two, and cut one. Keep Observer if display boards or an availability API really do react to spot-freed events — that is a genuine one-write-many-reactions shape, and I would ask whether the reactions are in-process (Observer is fine) or need to cross a service boundary (then a queue). Question SpotAllocationStrategy: a strategy with exactly one implementation is speculative flexibility — but allocation policy is the thing most likely to change in a parking lot (nearest-to-lift, EV-first, size-fit), so I would ask whether a second policy is actually coming; if yes, keep it, if no, inline it and extract later. Question AbstractVehicleFactory: vehicle types are a closed set — car, bike, truck — so a dict registry or a plain enum is clearer than an abstract factory hierarchy. Cut the Singleton manager outright: it is global mutable state, it makes the whole test suite share one lot, and the same guarantee comes free by constructing one manager in main() and passing it in. The framing I would give the junior: patterns are labels for decisions you already made, so if you cannot name the change each one absorbs, delete it.',
      isCaseBased: true,
    },
    {
      question: 'How should a candidate actually use pattern vocabulary in a design round?',
      answer:
        'Derive first, label second. Design the solution from the requirements, then attach the name in one sentence — "so that is a Strategy; a new pricing rule is a new class, not an edit to Checkout" — and move on. Never recite the GoF definition; that signals memorisation instead of judgement. Always price it: every pattern buys flexibility with indirection, so say "this adds a hop, worth it because the rules change monthly". And be willing to refuse: "you could Factory this, but there are two types and they never change — a plain if is clearer, and I would extract a factory when a third arrives from config". Naming your own trigger for changing the design is the senior move. In practice, three patterns cover most LLD rounds: Strategy for pluggable rules, Observer for state changes that fan out, Factory for choosing a concrete type from input.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'A design pattern is…', back: 'A NAME for a solution people kept re-deriving, plus its tradeoff. Interview value = vocabulary and recognising the shape. Failure mode = pattern-stuffing.' },
    { front: 'The three categories and the seven patterns', back: 'Creational: Singleton, Factory, Builder. Structural: Adapter, Decorator. Behavioural: Strategy, Observer.' },
    { front: 'Singleton in Python, without ceremony', back: 'A module IS a singleton — its body runs once and sys.modules caches it. Put the object at module scope. The __new__ + lock version is for thread-safe lazy creation in the interview.' },
    { front: 'Why Singleton is the weakest pattern', back: 'Global mutable state: hides dependencies, leaks state between tests, no seam for a fake. Better answer: build one instance at the composition root and inject it.' },
    { front: 'Double-checked locking — what the second check is for', back: 'Two threads can both pass the first check and queue on the lock. The second check, inside the lock, stops the loser from building a second instance. Publish only after the object is fully built.' },
    { front: 'Singleton in C++, without ceremony', back: 'The Meyers singleton: static Local& instance() { static Local s; return s; }. A function-local static is initialised exactly once, thread-safely, since C++11 (magic statics) — so no mutex, no atomic, no double-checked locking.' },
    { front: 'Simple factory vs factory method', back: 'Simple factory: one function/dict maps a key to a concrete class. Factory method: a base-class method subclasses override to pick the type. In Python a dict registry usually replaces the whole hierarchy — classes are values.' },
    { front: 'Strategy in one line (and its SOLID link)', back: 'Make the algorithm a value you pass in, not a branch you write. New rule = new object, no edit to the caller — that is Open/Closed made concrete. C++: a std::function member.' },
    { front: 'Observer: the two classic hazards', back: '(1) Lifetime — a destroyed subscriber left in the list = use-after-free (C++) or a listener leak (GC languages). Fix: RAII token / weak refs. (2) Notification storms — synchronous re-entrant fan-out; coalesce, batch, no I/O in a slot.' },
    { front: 'Adapter vs Decorator, one sentence', back: 'Adapter changes the interface and keeps the behaviour. Decorator keeps the interface and changes the behaviour (so decorators nest). Proxy = same interface, controls access. Facade = new simpler interface over many objects.' },
    { front: 'When Builder earns its keep in Python', back: 'Cross-field validation in build(), stepwise assembly with no half-valid object visible, or one recipe producing several representations. Otherwise keyword args + @dataclass(frozen=True) already do it.' },
  ],
  mindmapMarkdown: `- Design Patterns: The Interview Seven
  - What a pattern is
    - A NAME for a solution people keep re-deriving
    - Interview value: vocabulary + recognising the shape
    - Failure mode: pattern-stuffing
  - Creational
    - Singleton: one instance, global access
    - Factory: decouple construction from use
    - Builder: many optional params, immutable result
  - Structural
    - Adapter: change the interface, keep behaviour
    - Decorator: keep the interface, add behaviour
  - Behavioural
    - Strategy: swap the algorithm at runtime
    - Observer: publish/subscribe in one process
  - Sharp edges
    - Singleton = global state; a module already is one; prefer DI
    - Double-checked locking: second check inside the lock
    - Factory: a dict registry beats a creator hierarchy in Python
    - Strategy: std::function member = Open/Closed made concrete
    - Observer: RAII token kills dangling subscribers; storms = sync fan-out
    - Builder: kwargs + frozen dataclass cover most cases
    - Adapter: third-party SDK behind your own port
    - Decorator: functools.wraps vs the GoF object wrapper
  - Already in code you know: getLogger, open(), sorted(key=), lru_cache, GzipFile
  - Cross-process Observer = message queue
  - In the interview
    - Derive first, label second; name the shape
    - Say the cost: indirection buys flexibility
    - Refusing a pattern is a strong answer`,
}

export default m
