import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BadgeCheck, Loader2, Truck } from "lucide-react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { uploadToStorage } from "@/lib/storageUpload";
import { SITE_URL, useSEO } from "@/lib/seo";
import { COUNTRIES, SENEGAL_CITIES, VEHICLE_TYPES } from "@/lib/toutcolis";

interface TransporterRow {
  id: string;
  display_name: string | null;
  photo: string | null;
  bio: string | null;
  phone: string | null;
  whatsapp: string | null;
  city: string | null;
  vehicle_type: string | null;
  vehicle_number: string | null;
  max_weight: number | null;
  verified: boolean;
}

const TransporterSpace = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [transporter, setTransporter] = useState<TransporterRow | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingRoute, setSavingRoute] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [profile, setProfile] = useState({
    display_name: "",
    bio: "",
    phone: "",
    whatsapp: "",
    city: "",
    vehicle_type: "",
    vehicle_number: "",
    max_weight: "",
  });

  const [route, setRoute] = useState({
    departure_country: "Sénégal",
    departure_city: "",
    arrival_country: "Sénégal",
    arrival_city: "",
    departure_date: "",
    departure_time: "",
    vehicle_type: "",
    price: "",
    available_weight: "",
    description: "",
    conditions: "",
  });

  useSEO({
    title: "Devenir transporteur — TOUT COLIS",
    description:
      "Publiez vos trajets, transportez des colis et rentabilisez vos déplacements au Sénégal et à l'international avec TOUT COLIS.",
    canonical: `${SITE_URL}/tout-colis/transporteur`,
  });

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/auth?redirect=/tout-colis/transporteur");
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("transporters")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        const t = data as unknown as TransporterRow;
        setTransporter(t);
        setProfile({
          display_name: t.display_name ?? "",
          bio: t.bio ?? "",
          phone: t.phone ?? "",
          whatsapp: t.whatsapp ?? "",
          city: t.city ?? "",
          vehicle_type: t.vehicle_type ?? "",
          vehicle_number: t.vehicle_number ?? "",
          max_weight: t.max_weight != null ? String(t.max_weight) : "",
        });
      }
    })();
  }, [user, loading, navigate]);

  const num = (v: string) => (v.trim() === "" ? null : Number(v));

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    try {
      let photo = transporter?.photo ?? null;
      if (photoFile) {
        const up = await uploadToStorage(photoFile, { folder: "avatars" });
        photo = up.url;
      }
      const payload = {
        user_id: user.id,
        display_name: profile.display_name || null,
        bio: profile.bio || null,
        phone: profile.phone || null,
        whatsapp: profile.whatsapp || null,
        city: profile.city || null,
        vehicle_type: profile.vehicle_type || null,
        vehicle_number: profile.vehicle_number || null,
        max_weight: num(profile.max_weight),
        photo,
      };
      const { data, error } = transporter
        ? await supabase.from("transporters").update(payload).eq("id", transporter.id).select("*").single()
        : await supabase.from("transporters").insert(payload).select("*").single();
      if (error) throw error;
      setTransporter(data as unknown as TransporterRow);
      setPhotoFile(null);
      toast.success("Profil transporteur enregistré ✅");
    } catch (err) {
      toast.error("Enregistrement impossible", {
        description: err instanceof Error ? err.message : "Réessayez",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const publishRoute = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !transporter) {
      toast.error("Créez d'abord votre profil transporteur");
      return;
    }
    if (!route.departure_city.trim() || !route.arrival_city.trim()) {
      toast.error("Indiquez le départ et l'arrivée");
      return;
    }
    setSavingRoute(true);
    try {
      const { error } = await supabase.from("transport_routes").insert({
        transporter_id: transporter.id,
        user_id: user.id,
        departure_country: route.departure_country,
        departure_city: route.departure_city.trim(),
        arrival_country: route.arrival_country,
        arrival_city: route.arrival_city.trim(),
        departure_date: route.departure_date || null,
        departure_time: route.departure_time || null,
        vehicle_type: route.vehicle_type || transporter.vehicle_type,
        price: num(route.price),
        available_weight: num(route.available_weight),
        description: route.description || null,
        conditions: route.conditions || null,
      });
      if (error) throw error;
      toast.success("Trajet publié ✅");
      setRoute((r) => ({ ...r, departure_city: "", arrival_city: "", departure_date: "", departure_time: "", price: "", available_weight: "", description: "", conditions: "" }));
      navigate("/tout-colis/mes-colis");
    } catch (err) {
      toast.error("Publication impossible", {
        description: err instanceof Error ? err.message : "Réessayez",
      });
    } finally {
      setSavingRoute(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-3xl px-4 py-10">
        <h1 className="flex items-center gap-2 text-3xl font-bold text-foreground">
          <Truck className="h-7 w-7 text-primary" /> Espace transporteur
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Créez votre profil, publiez vos trajets et recevez des demandes de transport.
        </p>
        {transporter?.verified && (
          <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-card/50 px-3 py-1 text-xs text-primary">
            <BadgeCheck className="h-4 w-4" /> Transporteur vérifié
          </p>
        )}

        <form onSubmit={saveProfile} className="mt-8 space-y-4">
          <Card className="border-primary/15 bg-card/60 p-5">
            <h2 className="font-semibold text-foreground">Mon profil transporteur</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="tname">Nom affiché</Label>
                <Input id="tname" className="mt-1" value={profile.display_name} onChange={(e) => setProfile({ ...profile, display_name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="tcity">Ville de base</Label>
                <Input id="tcity" list="sn-cities-t" className="mt-1" value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="tphone">Téléphone</Label>
                <Input id="tphone" className="mt-1" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="twa">WhatsApp</Label>
                <Input id="twa" className="mt-1" value={profile.whatsapp} onChange={(e) => setProfile({ ...profile, whatsapp: e.target.value })} />
              </div>
              <div>
                <Label>Type de véhicule</Label>
                <Select value={profile.vehicle_type} onValueChange={(v) => setProfile({ ...profile, vehicle_type: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Choisir" /></SelectTrigger>
                  <SelectContent>
                    {VEHICLE_TYPES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="tplate">Immatriculation</Label>
                <Input id="tplate" className="mt-1" value={profile.vehicle_number} onChange={(e) => setProfile({ ...profile, vehicle_number: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="tmax">Poids max transportable (kg)</Label>
                <Input id="tmax" type="number" min="0" className="mt-1" value={profile.max_weight} onChange={(e) => setProfile({ ...profile, max_weight: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="tphoto">Photo de profil</Label>
                <Input id="tphoto" type="file" accept="image/*" className="mt-1" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="tbio">Présentation</Label>
                <Textarea id="tbio" rows={3} className="mt-1" value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} placeholder="Expérience, zones desservies, fréquence des trajets…" />
              </div>
            </div>
            <Button type="submit" variant="outlineGold" className="mt-4 rounded-full" disabled={savingProfile}>
              {savingProfile && <Loader2 className="h-4 w-4 animate-spin" />}
              {transporter ? "Mettre à jour mon profil" : "Créer mon profil transporteur"}
            </Button>
          </Card>
        </form>

        <form onSubmit={publishRoute} className="mt-6 space-y-4">
          <Card className="border-primary/15 bg-card/60 p-5">
            <h2 className="font-semibold text-foreground">Publier un trajet</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <Label>Pays de départ</Label>
                <Select value={route.departure_country} onValueChange={(v) => setRoute({ ...route, departure_country: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="rdep">Ville de départ *</Label>
                <Input id="rdep" list="sn-cities-t" className="mt-1" value={route.departure_city} onChange={(e) => setRoute({ ...route, departure_city: e.target.value })} required />
              </div>
              <div>
                <Label>Pays d'arrivée</Label>
                <Select value={route.arrival_country} onValueChange={(v) => setRoute({ ...route, arrival_country: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="rarr">Ville d'arrivée *</Label>
                <Input id="rarr" list="sn-cities-t" className="mt-1" value={route.arrival_city} onChange={(e) => setRoute({ ...route, arrival_city: e.target.value })} required />
              </div>
              <div>
                <Label htmlFor="rdate">Date de départ</Label>
                <Input id="rdate" type="date" className="mt-1" value={route.departure_date} onChange={(e) => setRoute({ ...route, departure_date: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="rtime">Heure</Label>
                <Input id="rtime" type="time" className="mt-1" value={route.departure_time} onChange={(e) => setRoute({ ...route, departure_time: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="rprice">Prix par colis (FCFA)</Label>
                <Input id="rprice" type="number" min="0" className="mt-1" value={route.price} onChange={(e) => setRoute({ ...route, price: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="rweight">Poids disponible (kg)</Label>
                <Input id="rweight" type="number" min="0" className="mt-1" value={route.available_weight} onChange={(e) => setRoute({ ...route, available_weight: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="rdesc">Description</Label>
                <Textarea id="rdesc" rows={3} className="mt-1" value={route.description} onChange={(e) => setRoute({ ...route, description: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="rcond">Conditions (objets refusés, délais…)</Label>
                <Textarea id="rcond" rows={2} className="mt-1" value={route.conditions} onChange={(e) => setRoute({ ...route, conditions: e.target.value })} />
              </div>
            </div>
            <Button type="submit" variant="gold" className="mt-4 rounded-full" disabled={savingRoute || !transporter}>
              {savingRoute && <Loader2 className="h-4 w-4 animate-spin" />} Publier le trajet
            </Button>
            {!transporter && (
              <p className="mt-2 text-xs text-muted-foreground">Créez votre profil transporteur pour publier un trajet.</p>
            )}
          </Card>
        </form>

        <datalist id="sn-cities-t">
          {SENEGAL_CITIES.map((c) => <option key={c} value={c} />)}
        </datalist>
      </main>
      <Footer />
    </div>
  );
};

export default TransporterSpace;
