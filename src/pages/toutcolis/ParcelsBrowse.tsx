import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, PackageSearch, Search } from "lucide-react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import ParcelCard, { ParcelItem } from "@/components/toutcolis/ParcelCard";
import RouteCard, { RouteItem } from "@/components/toutcolis/RouteCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SITE_URL, useSEO } from "@/lib/seo";

type Tab = "colis" | "trajets";

const ParcelsBrowse = () => {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const tab = (params.get("tab") as Tab) || "colis";
  const [from, setFrom] = useState(params.get("from") ?? "");
  const [to, setTo] = useState(params.get("to") ?? "");
  const [date, setDate] = useState(params.get("date") ?? "");
  const [loading, setLoading] = useState(true);
  const [parcels, setParcels] = useState<ParcelItem[]>([]);
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [target, setTarget] = useState<{ kind: Tab; parcel?: ParcelItem; route?: RouteItem } | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useSEO({
    title: tab === "colis" ? "Colis à transporter — TOUT COLIS" : "Trajets disponibles — TOUT COLIS",
    description:
      "Trouvez un colis à transporter ou un transporteur pour votre envoi : filtrez par ville de départ, ville d'arrivée et date.",
    canonical: `${SITE_URL}/tout-colis/annonces`,
  });

  const load = useCallback(async () => {
    setLoading(true);
    const f = params.get("from") ?? "";
    const t = params.get("to") ?? "";
    const d = params.get("date") ?? "";

    if (tab === "colis") {
      let q = supabase
        .from("parcel_listings_public")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(60);
      if (f) q = q.ilike("departure_city", `%${f}%`);
      if (t) q = q.ilike("arrival_city", `%${t}%`);
      if (d) q = q.gte("departure_date", d);
      const { data } = await q;
      setParcels((data as ParcelItem[]) ?? []);
    } else {
      let q = supabase
        .from("transport_routes")
        .select("*, transporter:transporters(display_name, photo, verified, rating, total_trips)")
        .eq("status", "active")
        .order("departure_date", { ascending: true })
        .limit(60);
      if (f) q = q.ilike("departure_city", `%${f}%`);
      if (t) q = q.ilike("arrival_city", `%${t}%`);
      if (d) q = q.gte("departure_date", d);
      const { data } = await q;
      setRoutes((data as unknown as RouteItem[]) ?? []);
    }
    setLoading(false);
  }, [params, tab]);

  useEffect(() => {
    load();
  }, [load]);

  const applyFilters = () => {
    const next = new URLSearchParams();
    next.set("tab", tab);
    if (from) next.set("from", from);
    if (to) next.set("to", to);
    if (date) next.set("date", date);
    setParams(next);
  };

  const switchTab = (value: string) => {
    const next = new URLSearchParams(params);
    next.set("tab", value);
    setParams(next);
  };

  const submitRequest = async () => {
    if (!user) {
      navigate("/auth?redirect=/tout-colis/annonces");
      return;
    }
    if (!target) return;
    setSending(true);
    try {
      const { error } = await supabase.from("parcel_requests").insert({
        user_id: user.id,
        transporter_id: target.route?.transporter_id ?? null,
        parcel_listing_id: target.parcel?.id ?? null,
        route_id: target.route?.id ?? null,
        message: message || null,
      });
      if (error) throw error;
      toast.success("Demande envoyée ✅", { description: "Vous serez notifié dès la réponse." });
      setTarget(null);
      setMessage("");
    } catch (err) {
      toast.error("Envoi impossible", { description: err instanceof Error ? err.message : "Réessayez" });
    } finally {
      setSending(false);
    }
  };

  const results = useMemo(() => (tab === "colis" ? parcels.length : routes.length), [tab, parcels, routes]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-10">
        <h1 className="flex items-center gap-2 text-3xl font-bold text-foreground">
          <PackageSearch className="h-7 w-7 text-primary" /> Annonces TOUT COLIS
        </h1>

        <Card className="mt-6 border-primary/15 bg-card/60 p-4">
          <div className="grid gap-3 md:grid-cols-4">
            <Input aria-label="Ville de départ" placeholder="Départ" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input aria-label="Ville d'arrivée" placeholder="Arrivée" value={to} onChange={(e) => setTo(e.target.value)} />
            <Input aria-label="À partir du" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <Button variant="gold" onClick={applyFilters}>
              <Search className="h-4 w-4" /> Filtrer
            </Button>
          </div>
        </Card>

        <Tabs value={tab} onValueChange={switchTab} className="mt-6">
          <TabsList>
            <TabsTrigger value="colis">Colis à transporter</TabsTrigger>
            <TabsTrigger value="trajets">Trajets disponibles</TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : results === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            Aucun résultat pour cette recherche.
          </p>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tab === "colis"
              ? parcels.map((p) => (
                  <ParcelCard key={p.id} parcel={p} onContact={(parcel) => setTarget({ kind: "colis", parcel })} />
                ))
              : routes.map((r) => (
                  <RouteCard key={r.id} route={r} onContact={(route) => setTarget({ kind: "trajets", route })} />
                ))}
          </div>
        )}
      </main>

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent className="border-primary/25">
          <DialogHeader>
            <DialogTitle>
              {target?.kind === "colis" ? "Proposer votre transport" : "Réserver ce trajet"}
            </DialogTitle>
            <DialogDescription>
              Votre demande est envoyée directement à l'annonceur, qui pourra accepter et vous contacter.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={4}
            placeholder="Présentez-vous, indiquez votre tarif ou vos disponibilités…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <Button variant="gold" onClick={submitRequest} disabled={sending}>
            {sending && <Loader2 className="h-4 w-4 animate-spin" />} Envoyer la demande
          </Button>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default ParcelsBrowse;
