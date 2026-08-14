/** Brouillons d'estimation « Tout Colis » stockés localement, par utilisateur. */

export interface ParcelDraft {
  id: string;
  createdAt: string;
  updatedAt: string;
  step: number;
  /** Brouillon rangé dans les archives (masqué de la liste active). */
  archived?: boolean;
  /** Copie des champs du formulaire d'envoi. */
  form: Record<string, string>;
  /** Résumé de l'estimation au moment de la sauvegarde. */
  summary: {
    route: string;
    parcelType: string;
    weight: string;
    priceLabel: string;
    delayLabel: string;
  };
}


const key = (userId?: string | null) => `toutcolis:drafts:${userId ?? "anon"}`;

export const listDrafts = (userId?: string | null): ParcelDraft[] => {
  try {
    const raw = localStorage.getItem(key(userId));
    const parsed = raw ? (JSON.parse(raw) as ParcelDraft[]) : [];
    return Array.isArray(parsed)
      ? parsed.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      : [];
  } catch {
    return [];
  }
};

const persist = (userId: string | null | undefined, drafts: ParcelDraft[]) => {
  try {
    localStorage.setItem(key(userId), JSON.stringify(drafts.slice(0, 20)));
  } catch {
    /* quota dépassé : on ignore */
  }
};

export const getDraft = (userId: string | null | undefined, id: string) =>
  listDrafts(userId).find((d) => d.id === id) ?? null;

export const saveDraft = (
  userId: string | null | undefined,
  draft: Omit<ParcelDraft, "id" | "createdAt" | "updatedAt"> & { id?: string },
): ParcelDraft => {
  const now = new Date().toISOString();
  const drafts = listDrafts(userId);
  const existing = draft.id ? drafts.find((d) => d.id === draft.id) : undefined;
  const next: ParcelDraft = {
    id: existing?.id ?? draft.id ?? crypto.randomUUID(),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    step: draft.step,
    form: draft.form,
    summary: draft.summary,
  };
  persist(userId, [next, ...drafts.filter((d) => d.id !== next.id)]);
  return next;
};

export const deleteDraft = (userId: string | null | undefined, id: string) => {
  persist(userId, listDrafts(userId).filter((d) => d.id !== id));
};
