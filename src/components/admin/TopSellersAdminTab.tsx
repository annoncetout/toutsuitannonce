import { useEffect, useState } from "react";
import { Loader2, RefreshCw, ShieldOff, ShieldCheck, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import SellerBadge, { SellerBadgeKind } from "@/components/SellerBadge";

type Row = {
  user_id: string;
  top_score: number;
  badge: SellerBadgeKind;
  rank_global: number | null;
  active_listings_count: number;
  sales_count: number;
  total_views: number;
  avg_rating: number;
  reviews_count: number;
  response_rate: number;
  is_suspended: boolean;
  fraud_flags: string[] | unknown;
  profiles: { display_name: string | null; city: string | null } | null;
};

export default function TopSellersAdminTab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("seller_stats")
      .select(
        "user_id, top_score, badge, rank_global, active_listings_count, sales_count, total_views, avg_rating, reviews_count, response_rate, is_suspended, fraud_flags, profiles:user_id(display_name, city)"
      )
      .order("top_score", { ascending: false })
      .limit(200);
    if (error) toast.error(error.message);
    setRows((data ?? []) as unknown as Row[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const recompute = async () => {
    setRecomputing(true);
    const { error } = await supabase.functions.invoke("recompute-top-sellers");
    setRecomputing(false);
    if (error) return toast.error(error.message);
    toast.success("Scores recalculés et badges attribués");
    load();
  };

  const toggleSuspend = async (r: Row) => {
    const next = !r.is_suspended;
    const { error } = await supabase
      .from("seller_stats")
      .update({ is_suspended: next, suspension_reason: next ? "Suspendu par admin" : null })
      .eq("user_id", r.user_id);
    if (error) return toast.error(error.message);
    toast.success(next ? "Vendeur suspendu du classement" : "Vendeur réactivé");
    load();
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><Trophy className="w-5 h-5 text-primary" /> Top Vendeurs IA</h2>
          <p className="text-sm text-muted-foreground">Classement automatique mis à jour quotidiennement.</p>
        </div>
        <Button onClick={recompute} disabled={recomputing} variant="gold">
          {recomputing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Recalculer maintenant
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Vendeur</TableHead>
                <TableHead>Badge</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead className="text-right">Ventes</TableHead>
                <TableHead className="text-right">Vues</TableHead>
                <TableHead className="text-right">Note</TableHead>
                <TableHead className="text-right">Réponse</TableHead>
                <TableHead>Fraude</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const flags = Array.isArray(r.fraud_flags) ? (r.fraud_flags as string[]) : [];
                return (
                  <TableRow key={r.user_id}>
                    <TableCell className="font-semibold">{r.rank_global ?? "—"}</TableCell>
                    <TableCell>
                      <div className="font-medium">{r.display_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{r.city ?? ""}</div>
                    </TableCell>
                    <TableCell><SellerBadge badge={r.badge} size="xs" /></TableCell>
                    <TableCell className="text-right font-bold text-primary">{Number(r.top_score).toFixed(1)}</TableCell>
                    <TableCell className="text-right">{r.sales_count}</TableCell>
                    <TableCell className="text-right">{r.total_views}</TableCell>
                    <TableCell className="text-right">{Number(r.avg_rating).toFixed(1)} ({r.reviews_count})</TableCell>
                    <TableCell className="text-right">{Math.round(Number(r.response_rate) * 100)}%</TableCell>
                    <TableCell>
                      {flags.length === 0 ? <span className="text-xs text-muted-foreground">—</span> : (
                        <div className="flex flex-wrap gap-1">
                          {flags.map((f) => <Badge key={f} variant="destructive" className="text-[10px]">{f}</Badge>)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {r.is_suspended ? <Badge variant="destructive">Suspendu</Badge> : <Badge variant="secondary">Actif</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant={r.is_suspended ? "outline" : "destructive"} onClick={() => toggleSuspend(r)}>
                        {r.is_suspended ? <ShieldCheck className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
                        {r.is_suspended ? "Réactiver" : "Suspendre"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">Aucun vendeur classé. Lancez un recalcul.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
