import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  writeBatch,
  type Firestore,
  type Unsubscribe,
} from "firebase/firestore";
import type { Pot, PotKind, PotWithSnapshots, Snapshot } from "./types";

const now = () => serverTimestamp();

export function subscribeToFlowfolio(
  db: Firestore,
  uid: string,
  onData: (pots: PotWithSnapshots[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const potsRef = collection(db, "users", uid, "pots");

  return onSnapshot(
    query(potsRef, orderBy("createdAt", "asc")),
    async (potSnapshot) => {
      const pots = potSnapshot.docs.map((potDoc) => ({ id: potDoc.id, ...potDoc.data() }) as Pot);
      const withSnapshots = await Promise.all(
        pots.map(async (pot) => {
          const snapshotsRef = collection(db, "users", uid, "pots", pot.id, "snapshots");
          const snapshotDocs = await getDocs(query(snapshotsRef, orderBy("measuredAt", "asc")));
          const snapshots = snapshotDocs.docs
            .map((snapshotDoc) => ({ id: snapshotDoc.id, ...snapshotDoc.data() }) as Snapshot)
            .filter((snapshot) => !snapshot.deletedAt);
          const current = snapshots.at(-1);
          const previous = snapshots.at(-2);

          return { ...pot, snapshots, current, previous };
        }),
      );

      onData(withSnapshots);
    },
    (error) => onError(error),
  );
}

export async function createPot(
  db: Firestore,
  uid: string,
  input: {
    name: string;
    amountCents: number;
    currency: string;
    icon: string;
    color: string;
    note: string;
    kind: PotKind;
  },
) {
  const potRef = await addDoc(collection(db, "users", uid, "pots"), {
    name: input.name,
    currency: input.currency,
    icon: input.icon,
    color: input.color,
    note: input.note,
    kind: input.kind,
    archivedAt: null,
    createdAt: now(),
    updatedAt: now(),
  });

  await addDoc(collection(db, "users", uid, "pots", potRef.id, "snapshots"), {
    amountCents: input.amountCents,
    measuredAt: Timestamp.now(),
    note: "Startbedrag",
    createdAt: now(),
    updatedAt: now(),
    deletedAt: null,
  });
}

export async function updatePot(
  db: Firestore,
  uid: string,
  potId: string,
  input: Partial<Pick<Pot, "name" | "currency" | "icon" | "color" | "note" | "kind">>,
) {
  await updateDoc(doc(db, "users", uid, "pots", potId), {
    ...input,
    updatedAt: now(),
  });
}

export async function archivePot(db: Firestore, uid: string, potId: string) {
  await updateDoc(doc(db, "users", uid, "pots", potId), {
    archivedAt: Timestamp.now(),
    updatedAt: now(),
  });
}

export async function restorePot(db: Firestore, uid: string, potId: string) {
  await updateDoc(doc(db, "users", uid, "pots", potId), {
    archivedAt: null,
    updatedAt: now(),
  });
}

export async function addSnapshot(
  db: Firestore,
  uid: string,
  potId: string,
  amountCents: number,
  note: string,
  measuredAt = new Date(),
) {
  await addDoc(collection(db, "users", uid, "pots", potId, "snapshots"), {
    amountCents,
    measuredAt: Timestamp.fromDate(measuredAt),
    note,
    createdAt: now(),
    updatedAt: now(),
    deletedAt: null,
  });
}

export async function updateSnapshot(
  db: Firestore,
  uid: string,
  potId: string,
  snapshotId: string,
  amountCents: number,
  note: string,
  measuredAt: Date,
) {
  await updateDoc(doc(db, "users", uid, "pots", potId, "snapshots", snapshotId), {
    amountCents,
    note,
    measuredAt: Timestamp.fromDate(measuredAt),
    updatedAt: now(),
  });
}

export async function softDeleteSnapshot(db: Firestore, uid: string, potId: string, snapshotId: string) {
  await updateDoc(doc(db, "users", uid, "pots", potId, "snapshots", snapshotId), {
    deletedAt: Timestamp.now(),
    updatedAt: now(),
  });
}

export async function seedExampleData(db: Firestore, uid: string) {
  const batch = writeBatch(db);
  const examples = [
    { name: "Betaalrekening", icon: "Landmark", color: "#2f7d6d", kind: "digital" as const, amount: 184250 },
    { name: "Spaarrekening", icon: "PiggyBank", color: "#315f9c", kind: "digital" as const, amount: 920000 },
    { name: "Contant thuis", icon: "Wallet", color: "#b98500", kind: "cash" as const, amount: 8500 },
    { name: "Vinted", icon: "Shirt", color: "#e06b4f", kind: "digital" as const, amount: 4375 },
  ];

  examples.forEach((example, index) => {
    const potRef = doc(collection(db, "users", uid, "pots"));
    batch.set(potRef, {
      name: example.name,
      currency: "EUR",
      icon: example.icon,
      color: example.color,
      note: "",
      kind: example.kind,
      archivedAt: null,
      createdAt: Timestamp.fromMillis(Date.now() + index),
      updatedAt: now(),
    });
    batch.set(doc(collection(db, "users", uid, "pots", potRef.id, "snapshots")), {
      amountCents: Math.round(example.amount * 0.94),
      measuredAt: Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 60 * 24 * 21)),
      note: "Voorbeeld",
      createdAt: now(),
      updatedAt: now(),
      deletedAt: null,
    });
    batch.set(doc(collection(db, "users", uid, "pots", potRef.id, "snapshots")), {
      amountCents: example.amount,
      measuredAt: Timestamp.now(),
      note: "Voorbeeld",
      createdAt: now(),
      updatedAt: now(),
      deletedAt: null,
    });
  });

  await batch.commit();
}
