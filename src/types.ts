import type { Timestamp } from "firebase/firestore";

export type PotKind = "digital" | "cash";

export type Pot = {
  id: string;
  name: string;
  currency: string;
  icon: string;
  color: string;
  note: string;
  kind: PotKind;
  archivedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type Snapshot = {
  id: string;
  amountCents: number;
  measuredAt: Timestamp;
  note: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt: Timestamp | null;
};

export type PotWithSnapshots = Pot & {
  snapshots: Snapshot[];
  current?: Snapshot;
  previous?: Snapshot;
};
