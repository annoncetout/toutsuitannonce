import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Eye, EyeOff, BarChart3, Loader2 } from "lucide-react";
import { toast } from "sonner";
import AdFormDialog, { type AdRow } from "./AdFormDialog";

type FullAd = AdRow & { id: string; impressions: number; clicks: number };

const AdsAdminTab = () => {
  const [ads, setAds] = useState<FullAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FullAd | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("advertisements")
      .select("*")
      .order("position", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setAds((data as FullAd[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleActive = async (ad: FullAd) => {
    const { error } = await supabase
      .from("advertisements")
      .update({ is_active: !ad.is_active })
      .eq("id", ad.id);
    if (error) return toast.error(error.message);
    toast.success(ad.is_active ? "Publicité désactivée" : "Publicité activée");
    load();
  };

  const remove = async (ad: FullAd) => {
    if (!confirm(`Supprimer « ${ad.title} » ?`)) return;
    const { error } = await supabase.from("advertisements").delete().eq("id", ad.id);
    if (error) return toast.error(error.message);
    toast.success("Supprimée");
    load();
  };

  const totalImpr = ads.reduce((s, a) => s + (a.impressions || 0), 0);
  const totalClicks = ads.reduce((s, a) => s + (a.clicks || 0), 0);
  const globalCtr = totalImpr ? ((totalClicks / totalImpr) * 100).toFixed(2) : "0.00";

  return (
    <Card className="p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-bold font-display">Gestion des publicités</h2>
          <p className="text-sm text-muted-foreground">Bannières affichées sur la page d'accueil.</p>
        </div>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Nouvelle publicité
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="p-3"><div className="text-xs text-muted-foreground">Total</div><div className="text-2xl font-bold">{ads.length}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Actives</div><div className="text-2xl font-bold">{ads.filter(a => a.is_active).length}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Impressions</div><div className="text-2xl font-bold">{totalImpr}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Clics / CTR</div><div className="text-2xl font-bold">{totalClicks} <span className="text-sm text-primary">{globalCtr}%</span></div></Card>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : ads.length === 0 ? (
        <p className="text-center text-muted-foreground py-10">Aucune publicité. Créez-en une !</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titre</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Période</TableHead>
                <TableHead><BarChart3 className="w-4 h-4 inline" /> Vues</TableHead>
                <TableHead>Clics</TableHead>
                <TableHead>CTR</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ads.map((ad) => {
                const ctr = ad.impressions ? ((ad.clicks / ad.impressions) * 100).toFixed(1) : "0";
                const now = Date.now();
                const expired = new Date(ad.end_date).getTime() < now;
                const scheduled = new Date(ad.start_date).getTime() > now;
                return (
                  <TableRow key={ad.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {ad.image_url && <img src={ad.image_url} className="w-10 h-7 object-cover rounded" alt="" />}
                        <span className="line-clamp-1">{ad.title}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {ad.is_active ? (
                        expired ? <Badge variant="destructive">Expirée</Badge>
                        : scheduled ? <Badge variant="secondary">Planifiée</Badge>
                        : <Badge className="bg-primary text-primary-foreground">Active</Badge>
                      ) : <Badge variant="outline">Inactive</Badge>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(ad.start_date).toLocaleDateString()} →<br />
                      {new Date(ad.end_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{ad.impressions}</TableCell>
                    <TableCell>{ad.clicks}</TableCell>
                    <TableCell>{ctr}%</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => toggleActive(ad)} title={ad.is_active ? "Désactiver" : "Activer"}>
                          {ad.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => { setEditing(ad); setDialogOpen(true); }}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => remove(ad)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <AdFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        onSaved={load}
      />
    </Card>
  );
};

export default AdsAdminTab;
