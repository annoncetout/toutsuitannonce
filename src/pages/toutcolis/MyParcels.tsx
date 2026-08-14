import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Clock, FileText, Loader2, Package, Trash2, Truck } from "lucide-react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import ParcelCard, { ParcelItem } from "@/components/toutcolis/ParcelCard";
import RouteCard, { RouteItem } from "@/components/toutcolis/RouteCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SITE_URL, useSEO } from "@/lib/seo";
import { deleteDraft, listDrafts, type ParcelDraft } from "@/lib/parcelDrafts";

interface RequestRow {
  id: string;
  user_id: string;
  transporter_id: string | null;
  status: string;
  message: string | null;
  created_at: string;
  route_id: string | null;
  parcel_listing_id: string | null;
}

const MyParcels = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(true);
  const [parcels, setParcels] = useState<ParcelItem[]>([]);
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [sent, setSent] = useState<RequestRow[]>([]);
  const [received, setReceived] = useState<RequestRow[]>([]);
  const [drafts, setDrafts] = useState<ParcelDraft[]>([]);

  useSEO({
    title: "Mes colis et trajets — TOUT COLIS",
    description: "Gérez vos colis publiés, vos trajets de transport et vos demandes de mise en relation.",
    canonical: `${SITE_URL}/tout-colis/mes-colis`,
  });

  const load = useCallback(async () => {
    if (!user) return;
    setBusy(true);
    const [p, r, s, t] = await Promise.all([
      supabase.from("parcel_listings").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase
        .from("transport_routes")
        .select("*, transporter:transporters(display_name, photo, verified, rating, total_trips)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase.from("parcel_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("transporters").select("id").eq("user_id", user.id).maybeSingle(),
    ]);
    setParcels((p.data as ParcelItem[]) ?? []);
    setRoutes((r.data as unknown as RouteItem[]) ?? []);
    setSent((s.data as RequestRow[]) ?? []);
    if (t.data?.id) {
      const { data } = await supabase
        .from("parcel_requests")
        .select("*")
        .eq("transporter_id", t.data.id)
        .order("created_at", { ascending: false });
      setReceived((data as RequestRow[]) ?? []);
    }
    setDrafts(listDrafts(user.id));
    setBusy(false);
  }, [user]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/auth?redirect=/tout-colis/mes-colis");
      return;
    }
    load();
  }, [user, loading, navigate, load]);

  const setRequestStatus = async (id: string, status: "accepted" | "rejected") => {
    const { error } = await supabase.from("parcel_requests").update({ status }).eq("id", id);
    if (error) {
      toast.error("Mise à jour impossible", { description: error.message });
      return;
    }
    toast.success(status === "accepted" ? "Demande acceptée ✅" : "Demande refusée");
    load();
  };

  const cancelParcel = async (id: string) => {
    const { error } = await supabase.from("parcel_listings").update({ status: "cancelled" }).eq("id", id);
    if (error) {
      toast.error("Action impossible", { description: error.message });
      return;
    }
    load();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold text-foreground">Mes colis & trajets</h1>
          <div className="flex gap-2">
            <Button variant="gold" className="rounded-full" asChild>
              <Link to="/tout-colis/envoyer"><Package className="h-4 w-4" /> Envoyer un colis</Link>
            </Button>
            <Button variant="outlineGold" className="rounded-full" asChild>
              <Link to="/tout-colis/transporteur"><Truck className="h-4 w-4" /> Espace transporteur</Link>
            </Button>
          </div>
        </div>

        {busy ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <Tabs defaultValue="colis" className="mt-8">
            <TabsList>
              <TabsTrigger value="colis">Mes colis ({parcels.length})</TabsTrigger>
              <TabsTrigger value="trajets">Mes trajets ({routes.length})</TabsTrigger>
              <TabsTrigger value="recues">Demandes reçues ({received.length})</TabsTrigger>
              <TabsTrigger value="envoyees">Demandes envoyées ({sent.length})</TabsTrigger>
              <TabsTrigger value="brouillons">Brouillons ({drafts.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="colis" className="mt-6">
              {parcels.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun colis publié.</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {parcels.map((p) => (
                    <div key={p.id} className="space-y-2">
                      <ParcelCard parcel={p} />
                      {p.status === "active" && (
                        <Button variant="ghost" size="sm" onClick={() => cancelParcel(p.id)}>
                          Annuler cette annonce
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="trajets" className="mt-6">
              {routes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun trajet publié.</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {routes.map((r) => <RouteCard key={r.id} route={r} />)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="recues" className="mt-6 space-y-3">
              {received.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune demande reçue.</p>
              ) : (
                received.map((req) => (
                  <Card key={req.id} className="border-primary/15 bg-card/60 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <Badge variant="secondary">{req.status}</Badge>
                        <p className="mt-2 text-sm text-muted-foreground">{req.message ?? "(sans message)"}</p>
                      </div>
                      {req.status === "pending" && (
                        <div className="flex gap-2">
                          <Button variant="gold" size="sm" onClick={() => setRequestStatus(req.id, "accepted")}>Accepter</Button>
                          <Button variant="ghost" size="sm" onClick={() => setRequestStatus(req.id, "rejected")}>Refuser</Button>
                        </div>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="envoyees" className="mt-6 space-y-3">
              {sent.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune demande envoyée.</p>
              ) : (
                sent.map((req) => (
                  <Card key={req.id} className="border-primary/15 bg-card/60 p-4">
                    <Badge variant="secondary">{req.status}</Badge>
                    <p className="mt-2 text-sm text-muted-foreground">{req.message ?? "(sans message)"}</p>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="brouillons" className="mt-6">
              {drafts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun brouillon. Depuis le formulaire d'envoi, cliquez sur « Enregistrer en brouillon » pour
                  retrouver votre estimation ici.
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {drafts.map((d) => (
                    <Card key={d.id} className="border-primary/20 bg-card/60 p-4 animate-fade-in">
                      <div className="flex items-start justify-between gap-2">
                        <Badge variant="secondary" className="text-[10px]">
                          <FileText className="mr-1 h-3 w-3" /> Brouillon
                        </Badge>
                        <button
                          type="button"
                          aria-label="Supprimer le brouillon"
                          className="text-muted-foreground transition-colors hover:text-destructive"
                          onClick={() => {
                            deleteDraft(user?.id, d.id);
                            setDrafts(listDrafts(user?.id));
                            toast.success("Brouillon supprimé");
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="mt-3 font-medium text-foreground">{d.summary.route}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {d.summary.parcelType} · {d.summary.weight}
                      </p>
                      <div className="mt-3 space-y-1 text-sm">
                        <p className="font-semibold text-primary">{d.summary.priceLabel}</p>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" /> {d.summary.delayLabel}
                        </p>
                      </div>
                      <p className="mt-3 text-[11px] text-muted-foreground">
                        Modifié le {new Date(d.updatedAt).toLocaleDateString("fr-FR")}
                      </p>
                      <Button variant="gold" size="sm" className="mt-3 w-full rounded-full" asChild>
                        <Link to={`/tout-colis/envoyer?draft=${d.id}`}>Reprendre et finaliser</Link>
                      </Button>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default MyParcels;
