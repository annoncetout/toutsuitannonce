import { useMemo, useState } from "react";
import { CheckCircle2, XCircle, Clock, Crown, Flame, Sparkles, Copy, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

type Tx = {
  id: string;
  user_id: string;
  listing_id: string | null;
  amount: number;
  currency: string;
  type: string;
  method?: string | null;
  status: string;
  created_at: string;
  external_reference?: string | null;
  metadata: Record<string, unknown> | null;
};

type Profile = { id: string; display_name?: string | null; phone?: string | null; whatsapp?: string | null };
type Listing = { id: string; title: string };

interface Props {
  transactions: Tx[];
  profiles: Profile[];
  listings: Listing[];
  emails: Record<string, string | null>;
  onUpdate: (id: string, status: "completed" | "failed") => Promise<void>;
}

export default function PaymentsAdminTab({ transactions, profiles, listings, emails, onUpdate }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const profileById = useMemo(() => Object.fromEntries(profiles.map((p) => [p.id, p])), [profiles]);
  const listingById = useMemo(() => Object.fromEntries(listings.map((l) => [l.id, l])), [listings]);

  const enriched = useMemo(() => {
    const term = q.trim().toLowerCase();
    return transactions
      .map((t) => {
        const p = profileById[t.user_id];
        const meta = (t.metadata ?? {}) as Record<string, string>;
        return {
          ...t,
          _profile: p,
          _email: emails[t.user_id] ?? null,
          _phone: p?.phone || p?.whatsapp || (meta.payer_phone ?? ""),
          _offer: String(meta.offer_label ?? (t.type === "subscription" ? "Abonnement" : t.type === "listing_boost" ? `Boost ${meta.boost_type ?? "premium"}` : t.type)),
        };
      })
      .filter((t) => {
        if (!term) return true;
        return (
          (t._email ?? "").toLowerCase().includes(term) ||
          (t._profile?.display_name ?? "").toLowerCase().includes(term) ||
          (t._phone ?? "").toLowerCase().includes(term) ||
          (t.external_reference ?? "").toLowerCase().includes(term) ||
          t._offer.toLowerCase().includes(term)
        );
      });
  }, [transactions, profileById, emails, q]);

  const pending = enriched.filter((t) => t.status === "pending");
  const approved = enriched.filter((t) => t.status === "completed");
  const rejected = enriched.filter((t) => t.status === "failed");

  const total = enriched.length;
  const revenue = approved.reduce((s, t) => s + Number(t.amount || 0), 0);

  const handle = async (id: string, status: "completed" | "failed") => {
    setBusy(id);
    try { await onUpdate(id, status); } finally { setBusy(null); }
  };

  const copy = (val: string, key: string) => {
    navigator.clipboard.writeText(val).then(() => {
      setCopied(key);
      toast.success("Copié");
      setTimeout(() => setCopied(null), 1200);
    });
  };

  const typeIcon = (t: typeof enriched[number]) => {
    if (t.type === "subscription") return <Crown className="w-3 h-3 text-primary" />;
    const bt = String((t.metadata as Record<string, string> | null)?.boost_type ?? "premium");
    return bt === "urgent" ? <Flame className="w-3 h-3 text-red-500" /> : <Sparkles className="w-3 h-3 text-primary" />;
  };

  const renderRows = (rows: typeof enriched, showActions: boolean) =>
    rows.length === 0 ? (
      <TableRow>
        <TableCell colSpan={showActions ? 8 : 7} className="text-center py-8 text-muted-foreground">
          Aucun paiement
        </TableCell>
      </TableRow>
    ) : (
      rows.map((t) => (
        <TableRow key={t.id}>
          <TableCell className="text-xs whitespace-nowrap">{new Date(t.created_at).toLocaleString("fr-FR")}</TableCell>
          <TableCell className="text-xs">
            <div className="font-medium">{t._profile?.display_name ?? "—"}</div>
            <div className="text-muted-foreground">{t._email ?? t.user_id.slice(0, 8)}</div>
          </TableCell>
          <TableCell className="text-xs font-mono">{t._phone || "—"}</TableCell>
          <TableCell>
            <Badge variant="outline" className="gap-1">
              {typeIcon(t)}
              {t._offer}
            </Badge>
            {t.listing_id && listingById[t.listing_id] && (
              <div className="text-[10px] text-muted-foreground mt-1 truncate max-w-[180px]">
                Annonce : {listingById[t.listing_id].title}
              </div>
            )}
          </TableCell>
          <TableCell>
            {t.external_reference ? (
              <button
                onClick={() => copy(t.external_reference!, t.id)}
                className="flex items-center gap-1 text-[10px] font-mono hover:text-primary"
              >
                {t.external_reference}
                {copied === t.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </button>
            ) : "—"}
            {t.method && <div className="text-[10px] uppercase opacity-70">{t.method.replace("_", " ")}</div>}
          </TableCell>
          <TableCell className="font-semibold whitespace-nowrap">
            {Number(t.amount).toLocaleString("fr-FR")} {t.currency}
          </TableCell>
          <TableCell>
            <Badge variant={t.status === "completed" ? "default" : t.status === "failed" ? "destructive" : "secondary"}>
              {t.status === "completed" ? "Validé" : t.status === "failed" ? "Refusé" : "En attente"}
            </Badge>
          </TableCell>
          {showActions && (
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="gold" disabled={busy === t.id} onClick={() => handle(t.id, "completed")}>
                  <CheckCircle2 className="w-4 h-4" /> Valider
                </Button>
                <Button size="sm" variant="ghost" disabled={busy === t.id}
                  onClick={() => handle(t.id, "failed")}
                  className="text-destructive hover:text-destructive">
                  <XCircle className="w-4 h-4" /> Refuser
                </Button>
              </div>
            </TableCell>
          )}
        </TableRow>
      ))
    );

  const table = (rows: typeof enriched, showActions: boolean) => (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Utilisateur</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Offre</TableHead>
              <TableHead>Référence / Méthode</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>Statut</TableHead>
              {showActions && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>{renderRows(rows, showActions)}</TableBody>
        </Table>
      </div>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4"><div className="text-xs text-muted-foreground">Total paiements</div><div className="text-2xl font-bold">{total}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">En attente</div><div className="text-2xl font-bold text-amber-500">{pending.length}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Validés</div><div className="text-2xl font-bold text-primary">{approved.length}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Revenus validés</div><div className="text-2xl font-bold">{revenue.toLocaleString("fr-FR")} FCFA</div></Card>
      </div>

      <Input
        placeholder="Rechercher (email, nom, téléphone, référence, offre)"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="max-w-md"
      />

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending"><Clock className="w-4 h-4 mr-1" /> En attente ({pending.length})</TabsTrigger>
          <TabsTrigger value="approved"><CheckCircle2 className="w-4 h-4 mr-1" /> Validés ({approved.length})</TabsTrigger>
          <TabsTrigger value="rejected"><XCircle className="w-4 h-4 mr-1" /> Refusés ({rejected.length})</TabsTrigger>
          <TabsTrigger value="all">Tous ({total})</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4">{table(pending, true)}</TabsContent>
        <TabsContent value="approved" className="mt-4">{table(approved, false)}</TabsContent>
        <TabsContent value="rejected" className="mt-4">{table(rejected, false)}</TabsContent>
        <TabsContent value="all" className="mt-4">{table(enriched, false)}</TabsContent>
      </Tabs>
    </div>
  );
}
