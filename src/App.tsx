import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArrowDownRight,
  ArrowUpRight,
  Coins,
  CreditCard,
  Gem,
  Home,
  Landmark,
  LineChart,
  LogOut,
  PiggyBank,
  Plus,
  RefreshCw,
  Shirt,
  Undo2,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { addSnapshot, archivePot, createPot, restorePot, seedExampleData, softDeleteSnapshot, subscribeToFlowfolio, updatePot, updateSnapshot } from "./data";
import { auth, db, hasFirebaseConfig } from "./firebase";
import { centsToInput, formatDate, formatMoney, parseMoneyToCents, timestampToDate } from "./money";
import { colorOptions, iconOptions } from "./icons";
import type { PotKind, PotWithSnapshots, Snapshot } from "./types";

const iconMap: Record<string, LucideIcon> = {
  Wallet,
  PiggyBank,
  Landmark,
  Home,
  Shirt,
  Coins,
  Gem,
  CreditCard,
};

type DialogMode =
  | { type: "new" }
  | { type: "editPot"; pot: PotWithSnapshots }
  | { type: "snapshot"; pot: PotWithSnapshots }
  | { type: "history"; pot: PotWithSnapshots }
  | null;

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setAuthLoading(false);
      return;
    }

    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthLoading(false);
    });
  }, []);

  if (!hasFirebaseConfig) return <MissingConfig />;
  if (authLoading) return <Splash />;
  if (!user) return <AuthScreen />;

  return <Dashboard user={user} />;
}

function MissingConfig() {
  return (
    <main className="auth-page">
      <section className="auth-panel">
        <p className="eyebrow">Flowfolio</p>
        <h1>Firebase moet nog gekoppeld worden</h1>
        <p>
          Maak een <code>.env</code> bestand op basis van <code>.env.example</code> en vul je Firebase web-app config in.
        </p>
      </section>
    </main>
  );
}

function Splash() {
  return (
    <main className="splash">
      <div className="brand-mark">
        <Wallet size={28} />
      </div>
      <p>Flowfolio laden...</p>
    </main>
  );
}

function AuthScreen() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!auth) return;
    setError("");
    setBusy(true);

    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Inloggen lukte niet.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="brand-row">
          <div className="brand-mark">
            <Wallet size={28} />
          </div>
          <span>Flowfolio</span>
        </div>
        <h1>Rustig zicht op al je potjes.</h1>
        <p>Geen bankkoppelingen, geen budgetregels, geen drukte. Gewoon zelf invullen wat er nu waar staat.</p>
        <form onSubmit={submit} className="auth-form">
          <label>
            E-mail
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label>
            Wachtwoord
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              required
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button" type="submit" disabled={busy}>
            {busy ? "Even wachten..." : isRegistering ? "Account maken" : "Inloggen"}
          </button>
        </form>
        <button className="text-button" type="button" onClick={() => setIsRegistering((value) => !value)}>
          {isRegistering ? "Ik heb al een account" : "Nieuw? Maak een account"}
        </button>
      </section>
    </main>
  );
}

function Dashboard({ user }: { user: User }) {
  const [pots, setPots] = useState<PotWithSnapshots[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState<DialogMode>(null);
  const activePots = useMemo(() => pots.filter((pot) => !pot.archivedAt), [pots]);
  const archivedPots = useMemo(() => pots.filter((pot) => pot.archivedAt), [pots]);
  const total = useMemo(() => activePots.reduce((sum, pot) => sum + (pot.current?.amountCents ?? 0), 0), [activePots]);
  const previousTotal = useMemo(
    () => activePots.reduce((sum, pot) => sum + (pot.previous?.amountCents ?? pot.current?.amountCents ?? 0), 0),
    [activePots],
  );

  useEffect(() => {
    if (!db) return;
    setLoading(true);
    return subscribeToFlowfolio(
      db,
      user.uid,
      (nextPots) => {
        setPots(nextPots);
        setLoading(false);
      },
      (caught) => {
        setError(caught.message);
        setLoading(false);
      },
    );
  }, [user.uid]);

  async function logOut() {
    if (auth) await signOut(auth);
  }

  async function addExamples() {
    if (!db) return;
    await seedExampleData(db, user.uid);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-row">
          <div className="brand-mark">
            <Wallet size={24} />
          </div>
          <span>Flowfolio</span>
        </div>
        <button className="icon-button" type="button" onClick={logOut} aria-label="Uitloggen" title="Uitloggen">
          <LogOut size={18} />
        </button>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">Huidige som</p>
          <h1>{formatMoney(total)}</h1>
          <DeltaBadge delta={total - previousTotal} currency="EUR" />
        </div>
        <div className="hero-actions">
          {pots.length === 0 && (
            <button className="ghost-button" type="button" onClick={addExamples}>
              Voorbeelden
            </button>
          )}
          <button className="primary-button" type="button" onClick={() => setDialog({ type: "new" })}>
            <Plus size={18} />
            Potje
          </button>
        </div>
      </section>

      {error && <p className="form-error">{error}</p>}
      {loading ? <p className="muted">Potjes laden...</p> : null}

      <section className="pot-grid">
        {activePots.map((pot) => (
          <PotCard key={pot.id} pot={pot} onDialog={setDialog} />
        ))}
      </section>

      {!loading && activePots.length === 0 && (
        <section className="empty-state">
          <PiggyBank size={36} />
          <h2>Nog geen potjes</h2>
          <p>Maak je eerste potje aan of laad voorbeelddata om de app even te voelen.</p>
        </section>
      )}

      {archivedPots.length > 0 && (
        <section className="archive-section">
          <h2>Archief</h2>
          <div className="archive-list">
            {archivedPots.map((pot) => (
              <button key={pot.id} type="button" onClick={() => db && restorePot(db, user.uid, pot.id)}>
                <Archive size={16} />
                {pot.name}
                <Undo2 size={16} />
              </button>
            ))}
          </div>
        </section>
      )}

      {dialog?.type === "new" && <PotForm user={user} onClose={() => setDialog(null)} />}
      {dialog?.type === "editPot" && <PotForm user={user} pot={dialog.pot} onClose={() => setDialog(null)} />}
      {dialog?.type === "snapshot" && <SnapshotDialog user={user} pot={dialog.pot} onClose={() => setDialog(null)} />}
      {dialog?.type === "history" && <HistoryDialog user={user} pot={dialog.pot} onClose={() => setDialog(null)} />}
    </main>
  );
}

function PotCard({ pot, onDialog }: { pot: PotWithSnapshots; onDialog: (dialog: DialogMode) => void }) {
  const Icon = iconMap[pot.icon] ?? Wallet;
  const current = pot.current?.amountCents ?? 0;
  const previous = pot.previous?.amountCents ?? current;

  return (
    <article className="pot-card" style={{ "--pot-color": pot.color } as React.CSSProperties}>
      <div className="pot-card-top">
        <div className="pot-icon">
          <Icon size={22} />
        </div>
        <div>
          <h2>{pot.name}</h2>
          <p>{pot.kind === "cash" ? "Contant" : "Digitaal"}</p>
        </div>
      </div>
      <strong>{formatMoney(current, pot.currency)}</strong>
      <DeltaBadge delta={current - previous} currency={pot.currency} />
      {pot.note && <p className="note">{pot.note}</p>}
      <div className="card-actions">
        <button type="button" onClick={() => onDialog({ type: "snapshot", pot })}>
          <RefreshCw size={16} />
          Bijwerken
        </button>
        <button type="button" onClick={() => onDialog({ type: "history", pot })}>
          <LineChart size={16} />
          Grafiek
        </button>
        <button type="button" onClick={() => onDialog({ type: "editPot", pot })}>
          Bewerken
        </button>
      </div>
    </article>
  );
}

function DeltaBadge({ delta, currency }: { delta: number; currency: string }) {
  const isPositive = delta >= 0;
  return (
    <span className={isPositive ? "delta positive" : "delta negative"}>
      {isPositive ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
      {formatMoney(Math.abs(delta), currency)}
    </span>
  );
}

function PotForm({ user, pot, onClose }: { user: User; pot?: PotWithSnapshots; onClose: () => void }) {
  const [name, setName] = useState(pot?.name ?? "");
  const [amount, setAmount] = useState(pot?.current ? centsToInput(pot.current.amountCents) : "");
  const [currency, setCurrency] = useState(pot?.currency ?? "EUR");
  const [icon, setIcon] = useState(pot?.icon ?? "Wallet");
  const [color, setColor] = useState(pot?.color ?? colorOptions[0]);
  const [note, setNote] = useState(pot?.note ?? "");
  const [kind, setKind] = useState<PotKind>(pot?.kind ?? "digital");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!db) return;
    const amountCents = parseMoneyToCents(amount);
    if (!name.trim()) {
      setError("Geef het potje een naam.");
      return;
    }
    if (!pot && amountCents === null) {
      setError("Vul een geldig startbedrag in.");
      return;
    }

    setBusy(true);
    try {
      if (pot) {
        await updatePot(db, user.uid, pot.id, { name: name.trim(), currency, icon, color, note: note.trim(), kind });
      } else {
        await createPot(db, user.uid, {
          name: name.trim(),
          amountCents: amountCents ?? 0,
          currency,
          icon,
          color,
          note: note.trim(),
          kind,
        });
      }
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Opslaan lukte niet.");
    } finally {
      setBusy(false);
    }
  }

  async function archive() {
    if (!db || !pot) return;
    await archivePot(db, user.uid, pot.id);
    onClose();
  }

  return (
    <Dialog title={pot ? "Potje bewerken" : "Nieuw potje"} onClose={onClose}>
      <form className="stack-form" onSubmit={submit}>
        <label>
          Naam
          <input value={name} onChange={(event) => setName(event.target.value)} autoFocus required />
        </label>
        {!pot && (
          <label>
            Startbedrag
            <input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} required />
          </label>
        )}
        <div className="split">
          <label>
            Valuta
            <input value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} maxLength={3} />
          </label>
          <label>
            Type
            <select value={kind} onChange={(event) => setKind(event.target.value as PotKind)}>
              <option value="digital">Digitaal</option>
              <option value="cash">Contant</option>
            </select>
          </label>
        </div>
        <label>
          Icoon
          <div className="choice-row">
            {iconOptions.map((option) => {
              const OptionIcon = iconMap[option] ?? Wallet;
              return (
                <button
                  className={icon === option ? "choice active" : "choice"}
                  key={option}
                  type="button"
                  onClick={() => setIcon(option)}
                  title={option}
                >
                  <OptionIcon size={18} />
                </button>
              );
            })}
          </div>
        </label>
        <label>
          Kleur
          <div className="choice-row">
            {colorOptions.map((option) => (
              <button
                className={color === option ? "swatch active" : "swatch"}
                key={option}
                type="button"
                onClick={() => setColor(option)}
                style={{ backgroundColor: option }}
                aria-label={`Kleur ${option}`}
              />
            ))}
          </div>
        </label>
        <label>
          Notitie
          <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} />
        </label>
        {error && <p className="form-error">{error}</p>}
        <div className="dialog-actions">
          {pot && (
            <button className="danger-button" type="button" onClick={archive}>
              <Archive size={16} />
              Archiveren
            </button>
          )}
          <button className="primary-button" type="submit" disabled={busy}>
            Opslaan
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function SnapshotDialog({ user, pot, onClose }: { user: User; pot: PotWithSnapshots; onClose: () => void }) {
  const [amount, setAmount] = useState(pot.current ? centsToInput(pot.current.amountCents) : "");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!db) return;
    const amountCents = parseMoneyToCents(amount);
    if (amountCents === null) {
      setError("Vul een geldig bedrag in.");
      return;
    }
    setBusy(true);
    try {
      await addSnapshot(db, user.uid, pot.id, amountCents, note.trim());
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Opslaan lukte niet.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog title={`${pot.name} bijwerken`} onClose={onClose}>
      <form className="stack-form" onSubmit={submit}>
        <label>
          Actueel bedrag
          <input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} autoFocus />
        </label>
        <label>
          Notitie
          <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button className="primary-button" type="submit" disabled={busy}>
          Opslaan
        </button>
      </form>
    </Dialog>
  );
}

function HistoryDialog({ user, pot, onClose }: { user: User; pot: PotWithSnapshots; onClose: () => void }) {
  const chartData = pot.snapshots.map((snapshot) => ({
    date: formatDate(timestampToDate(snapshot.measuredAt)),
    value: snapshot.amountCents / 100,
  }));

  return (
    <Dialog title={`${pot.name} verloop`} onClose={onClose} wide>
      <div className="chart-wrap">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="flow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={pot.color} stopOpacity={0.45} />
                  <stop offset="95%" stopColor={pot.color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#d9ded7" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} width={72} />
              <Tooltip formatter={(value) => formatMoney(Math.round(Number(value) * 100), pot.currency)} />
              <Area type="monotone" dataKey="value" stroke={pot.color} fill="url(#flow)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="muted">Nog geen metingen.</p>
        )}
      </div>
      <div className="snapshot-list">
        {pot.snapshots
          .slice()
          .reverse()
          .map((snapshot) => (
            <SnapshotRow key={snapshot.id} user={user} pot={pot} snapshot={snapshot} />
          ))}
      </div>
    </Dialog>
  );
}

function SnapshotRow({ user, pot, snapshot }: { user: User; pot: PotWithSnapshots; snapshot: Snapshot }) {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(centsToInput(snapshot.amountCents));
  const [note, setNote] = useState(snapshot.note ?? "");
  const [date, setDate] = useState(timestampToDate(snapshot.measuredAt).toISOString().slice(0, 10));

  async function save() {
    if (!db) return;
    const amountCents = parseMoneyToCents(amount);
    if (amountCents === null) return;
    await updateSnapshot(db, user.uid, pot.id, snapshot.id, amountCents, note.trim(), new Date(`${date}T12:00:00`));
    setEditing(false);
  }

  async function remove() {
    if (!db) return;
    await softDeleteSnapshot(db, user.uid, pot.id, snapshot.id);
  }

  if (editing) {
    return (
      <div className="snapshot-row editing">
        <input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} />
        <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Notitie" />
        <button type="button" onClick={save}>
          Opslaan
        </button>
      </div>
    );
  }

  return (
    <div className="snapshot-row">
      <div>
        <strong>{formatMoney(snapshot.amountCents, pot.currency)}</strong>
        <span>{formatDate(timestampToDate(snapshot.measuredAt))}</span>
        {snapshot.note && <em>{snapshot.note}</em>}
      </div>
      <div className="row-actions">
        <button type="button" onClick={() => setEditing(true)}>
          Bewerken
        </button>
        <button type="button" onClick={remove}>
          Verwijderen
        </button>
      </div>
    </div>
  );
}

function Dialog({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section className={wide ? "dialog wide" : "dialog"} role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <header className="dialog-header">
          <h2>{title}</h2>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Sluiten" title="Sluiten">
            <X size={18} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

export default App;
