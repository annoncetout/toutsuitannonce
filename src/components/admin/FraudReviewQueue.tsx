import { useEffect, useState } from "react";
import { Loader2, ShieldAlert, ShieldOff, ShieldCheck, EyeOff, Eye, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type FlaggedSeller = {
  user_id: string;
  display_name: string | null;
  city: string | null;
  top_score: number;
  total_views: number;
  total_phone_clicks: number;
  reviews_count: number;
  avg_rating: number;
  account_age_days: number;
  fraud_flags: string[] | unknown;
  is_suspended: boolean;
};

type FlaggedReview = {
  id: string;
  seller_id: string;
  reviewer_id: string | null;
  rating: number;
  comment: string | null;
  is_verified: boolean | null;
  is_hidden: boolean;
  created_at: string;
};

const FLAG_LABEL: Record<string, string> = {
  phone_click_anomaly: "Ratio vues / clics suspect",
  suspicious_reviews_burst: "Avis 5★ massifs sur compte récent",
  no_phone_clicks_with_reviews: "Beaucoup d'avis mais aucun clic téléphone",
};

export default function FraudReviewQueue() {
  const [sellers, setSellers] = useState<FlaggedSeller[]>([]);
  const [reviews, setReviews] = useState<FlaggedReview[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: s }, { data: r }] = await Promise.all([
      supabase
        .from("seller_stats")
        .select(
          "user_id, display_name, city, top_score, total_views, total_phone_clicks, reviews_count, avg_rating, account_age_days, fraud_flags, is_suspended",
        )
        .not("fraud_flags", "is", null)
        .order("top_score", { ascending: false })
        .limit(100),
      supabase
        .from("seller_reviews")
        .select("id, seller_id, reviewer_id, rating, comment, is_verified, is_hidden, created_at")
        .eq("is_verified", false)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    const flagged = (s ?? []).filter((row) => Array.isArray(row.fraud_flags) && (row.fraud_flags as string[]).length > 0);
    setSellers(flagged as unknown as FlaggedSeller[]);
    setReviews((r ?? []) as unknown as FlaggedReview[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const clearFlags = async (id: string) => {
    const { error } = await supabase.from("seller_stats").update({ fraud_flags: [] }).eq("user_id", id);
    if (error) return toast.error(error.message);
    toast.success("Alertes effacées (décision admin)");
    load();
  };

  const toggleSuspend = async (s: FlaggedSeller) => {
    const next = !s.is_suspended;
    const { error } = await supabase
      .from("seller_stats")
      .update({ is_suspended: next, suspension_reason: next ? "Fraude présumée — exclu après revue admin" : null })
      .eq("user_id", s.user_id);
    if (error) return toast.error(error.message);
    toast.success(next ? "Vendeur exclu du classement" : "Vendeur réactivé");
    load();
  };

  const toggleHide = async (rev: FlaggedReview) => {
    const next = !rev.is_hidden;
    const { error } = await supabase.from("seller_reviews").update({ is_hidden: next }).eq("id", rev.id);
    if (error) return toast.error(error.message);
    toast.success(next ? "Avis masqué" : "Avis ré-affiché");
    load();
  };

  const approveReview = async (rev: FlaggedReview) => {
    const { error } = await supabase.from("seller_reviews").update({ is_verified: true, is_hidden: false }).eq("id", rev.id);
    if (error) return toast.error(error.message);
    toast.success("Avis approuvé et marqué vérifié");
    load();
  };

  return (
    <Card className="p-6 mb-6 border-destructive/40">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-destructive" /> File d'attente anti-fraude
          </h3>
          <p className="text-sm text-muted-foreground">
            Inspectez les signaux suspects détectés par l'IA avant d'exclure un vendeur ou de masquer un avis.
          </p>
        </div>
        <Button onClick={load} variant="outline" size="sm" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Rafraîchir
        </Button>
      </div>

      <div className="space-y-6">
        <section>
          <h4 className="font-semibold mb-2 text-sm uppercase tracking-wider text-muted-foreground">
            Vendeurs signalés ({sellers.length})
          </h4>
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : sellers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">
              Aucun vendeur en attente de revue. 🎉
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendeur</TableHead>
                    <TableHead>Signaux</TableHead>
                    <TableHead className="text-right">Vues</TableHead>
                    <TableHead className="text-right">Clics tél.</TableHead>
                    <TableHead className="text-right">Avis</TableHead>
                    <TableHead className="text-right">Note</TableHead>
                    <TableHead className="text-right">Ancien.</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sellers.map((s) => {
                    const flags = (s.fraud_flags as string[]) || [];
                    return (
                      <TableRow key={s.user_id}>
                        <TableCell>
                          <div className="font-medium">{s.display_name ?? "—"}</div>
                          <div className="text-xs text-muted-foreground">{s.city ?? ""}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[260px]">
                            {flags.map((f) => (
                              <Badge key={f} variant="destructive" className="text-[10px]" title={FLAG_LABEL[f] ?? f}>
                                {FLAG_LABEL[f] ?? f}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{s.total_views}</TableCell>
                        <TableCell className="text-right">{s.total_phone_clicks}</TableCell>
                        <TableCell className="text-right">{s.reviews_count}</TableCell>
                        <TableCell className="text-right">{Number(s.avg_rating).toFixed(1)}</TableCell>
                        <TableCell className="text-right">{s.account_age_days} j</TableCell>
                        <TableCell className="text-right space-x-1 whitespace-nowrap">
                          <Button size="sm" variant="outline" onClick={() => clearFlags(s.user_id)} title="Considérer comme non frauduleux">
                            <ShieldCheck className="w-4 h-4" /> Approuver
                          </Button>
                          <Button
                            size="sm"
                            variant={s.is_suspended ? "outline" : "destructive"}
                            onClick={() => toggleSuspend(s)}
                          >
                            <ShieldOff className="w-4 h-4" />
                            {s.is_suspended ? "Réactiver" : "Exclure"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        <section>
          <h4 className="font-semibold mb-2 text-sm uppercase tracking-wider text-muted-foreground">
            Avis à vérifier ({reviews.length})
          </h4>
          {reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">
              Aucun avis non vérifié récent.
            </p>
          ) : (
            <div className="space-y-2">
              {reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border/60 bg-card/40"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-[10px]">{rev.rating}★</Badge>
                      {rev.is_hidden && <Badge variant="destructive" className="text-[10px]">Masqué</Badge>}
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(rev.created_at).toLocaleString("fr-FR")}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/90 line-clamp-2">{rev.comment ?? <em className="text-muted-foreground">Aucun commentaire</em>}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => approveReview(rev)}>
                      <ShieldCheck className="w-4 h-4" /> Vérifier
                    </Button>
                    <Button size="sm" variant={rev.is_hidden ? "outline" : "destructive"} onClick={() => toggleHide(rev)}>
                      {rev.is_hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      {rev.is_hidden ? "Afficher" : "Masquer"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </Card>
  );
}
