import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, PackagePlus, Upload, X } from "lucide-react";
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
import {
  COUNTRIES,
  DELIVERY_MODES,
  PARCEL_TYPES,
  SENEGAL_CITIES,
} from "@/lib/toutcolis";

const MAX_PHOTOS = 4;

const SendParcel = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [form, setForm] = useState({
    sender_name: "",
    sender_phone: "",
    sender_whatsapp: "",
    recipient_name: "",
    recipient_phone: "",
    departure_country: "Sénégal",
    departure_city: "",
    departure_address: "",
    arrival_country: "Sénégal",
    arrival_city: "",
    arrival_address: "",
    departure_date: "",
    parcel_type: "",
    description: "",
    weight: "",
    length: "",
    width: "",
    height: "",
    declared_value: "",
    delivery_mode: "",
    price: "",
  });

  useSEO({
    title: "Envoyer un colis — TOUT COLIS",
    description:
      "Publiez votre colis en quelques minutes : trajet, poids, dimensions et budget. Recevez les offres de transporteurs vérifiés au Sénégal.",
    canonical: `${SITE_URL}/tout-colis/envoyer`,
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const num = (v: string) => (v.trim() === "" ? null : Number(v));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate("/auth?redirect=/tout-colis/envoyer");
      return;
    }
    if (!form.departure_city.trim() || !form.arrival_city.trim()) {
      toast.error("Indiquez la ville de départ et la ville d'arrivée");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("parcel_listings")
        .insert({
          user_id: user.id,
          type: "send",
          sender_name: form.sender_name || null,
          sender_phone: form.sender_phone || null,
          sender_whatsapp: form.sender_whatsapp || null,
          recipient_name: form.recipient_name || null,
          recipient_phone: form.recipient_phone || null,
          departure_country: form.departure_country,
          departure_city: form.departure_city.trim(),
          departure_address: form.departure_address || null,
          arrival_country: form.arrival_country,
          arrival_city: form.arrival_city.trim(),
          arrival_address: form.arrival_address || null,
          departure_date: form.departure_date || null,
          parcel_type: form.parcel_type || null,
          description: form.description || null,
          weight: num(form.weight),
          length: num(form.length),
          width: num(form.width),
          height: num(form.height),
          declared_value: num(form.declared_value),
          delivery_mode: form.delivery_mode || null,
          price: num(form.price),
        })
        .select("id")
        .single();
      if (error) throw error;

      if (files.length) {
        const uploaded = await Promise.all(
          files.map((f) => uploadToStorage(f, { folder: "annonces" }).catch(() => null)),
        );
        const rows = uploaded
          .filter(Boolean)
          .map((u) => ({ parcel_id: data.id, user_id: user.id, storage_path: u!.url }));
        if (rows.length) await supabase.from("parcel_photos").insert(rows);
      }

      toast.success("Colis publié ✅", { description: "Les transporteurs peuvent maintenant vous contacter." });
      navigate("/tout-colis/mes-colis");
    } catch (err) {
      toast.error("Publication impossible", {
        description: err instanceof Error ? err.message : "Réessayez dans un instant",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-3xl px-4 py-10">
        <h1 className="flex items-center gap-2 text-3xl font-bold text-foreground">
          <PackagePlus className="h-7 w-7 text-primary" /> Envoyer un colis
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Décrivez votre colis et votre trajet. La publication est gratuite.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-6">
          <Card className="border-primary/15 bg-card/60 p-5">
            <h2 className="font-semibold text-foreground">Trajet</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <Label>Pays de départ</Label>
                <Select value={form.departure_country} onValueChange={(v) => set("departure_country", v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="dep-city">Ville de départ *</Label>
                <Input
                  id="dep-city"
                  list="sn-cities"
                  className="mt-1"
                  value={form.departure_city}
                  onChange={(e) => set("departure_city", e.target.value)}
                  placeholder="Dakar"
                  required
                />
              </div>
              <div>
                <Label>Pays d'arrivée</Label>
                <Select value={form.arrival_country} onValueChange={(v) => set("arrival_country", v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="arr-city">Ville d'arrivée *</Label>
                <Input
                  id="arr-city"
                  list="sn-cities"
                  className="mt-1"
                  value={form.arrival_city}
                  onChange={(e) => set("arrival_city", e.target.value)}
                  placeholder="Thiès"
                  required
                />
              </div>
              <div>
                <Label htmlFor="dep-addr">Adresse de retrait</Label>
                <Input id="dep-addr" className="mt-1" value={form.departure_address} onChange={(e) => set("departure_address", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="arr-addr">Adresse de livraison</Label>
                <Input id="arr-addr" className="mt-1" value={form.arrival_address} onChange={(e) => set("arrival_address", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="dep-date">Date souhaitée</Label>
                <Input id="dep-date" type="date" className="mt-1" value={form.departure_date} onChange={(e) => set("departure_date", e.target.value)} />
              </div>
              <div>
                <Label>Mode de livraison</Label>
                <Select value={form.delivery_mode} onValueChange={(v) => set("delivery_mode", v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Choisir" /></SelectTrigger>
                  <SelectContent>
                    {DELIVERY_MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <datalist id="sn-cities">
              {SENEGAL_CITIES.map((c) => <option key={c} value={c} />)}
            </datalist>
          </Card>

          <Card className="border-primary/15 bg-card/60 p-5">
            <h2 className="font-semibold text-foreground">Le colis</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <Label>Type de colis</Label>
                <Select value={form.parcel_type} onValueChange={(v) => set("parcel_type", v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Choisir" /></SelectTrigger>
                  <SelectContent>
                    {PARCEL_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="weight">Poids (kg)</Label>
                <Input id="weight" type="number" min="0" step="0.1" className="mt-1" value={form.weight} onChange={(e) => set("weight", e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="desc">Description</Label>
                <Textarea id="desc" rows={4} className="mt-1" value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Contenu, fragilité, précautions…" />
              </div>
              <div className="grid grid-cols-3 gap-2 md:col-span-2">
                <div>
                  <Label htmlFor="len">Longueur (cm)</Label>
                  <Input id="len" type="number" min="0" className="mt-1" value={form.length} onChange={(e) => set("length", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="wid">Largeur (cm)</Label>
                  <Input id="wid" type="number" min="0" className="mt-1" value={form.width} onChange={(e) => set("width", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="hei">Hauteur (cm)</Label>
                  <Input id="hei" type="number" min="0" className="mt-1" value={form.height} onChange={(e) => set("height", e.target.value)} />
                </div>
              </div>
              <div>
                <Label htmlFor="val">Valeur déclarée (FCFA)</Label>
                <Input id="val" type="number" min="0" className="mt-1" value={form.declared_value} onChange={(e) => set("declared_value", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="price">Budget proposé (FCFA)</Label>
                <Input id="price" type="number" min="0" className="mt-1" value={form.price} onChange={(e) => set("price", e.target.value)} />
              </div>
            </div>

            <div className="mt-4">
              <Label>Photos du colis ({files.length}/{MAX_PHOTOS})</Label>
              <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-primary/30 bg-card/40 px-4 py-6 text-sm text-muted-foreground hover:border-primary/60">
                <Upload className="h-4 w-4 text-primary" /> Ajouter des photos
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const picked = Array.from(e.target.files ?? []);
                    setFiles((prev) => [...prev, ...picked].slice(0, MAX_PHOTOS));
                    e.target.value = "";
                  }}
                />
              </label>
              {files.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {files.map((f, i) => (
                    <span key={`${f.name}-${i}`} className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-card/60 px-3 py-1 text-xs">
                      {f.name.slice(0, 22)}
                      <button type="button" aria-label="Retirer la photo" onClick={() => setFiles((p) => p.filter((_, idx) => idx !== i))}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Card>

          <Card className="border-primary/15 bg-card/60 p-5">
            <h2 className="font-semibold text-foreground">Contacts</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="sname">Votre nom</Label>
                <Input id="sname" className="mt-1" value={form.sender_name} onChange={(e) => set("sender_name", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="sphone">Votre téléphone</Label>
                <Input id="sphone" className="mt-1" value={form.sender_phone} onChange={(e) => set("sender_phone", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="swa">WhatsApp</Label>
                <Input id="swa" className="mt-1" value={form.sender_whatsapp} onChange={(e) => set("sender_whatsapp", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="rname">Destinataire</Label>
                <Input id="rname" className="mt-1" value={form.recipient_name} onChange={(e) => set("recipient_name", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="rphone">Téléphone du destinataire</Label>
                <Input id="rphone" className="mt-1" value={form.recipient_phone} onChange={(e) => set("recipient_phone", e.target.value)} />
              </div>
            </div>
          </Card>

          <Button type="submit" variant="gold" size="lg" className="w-full rounded-full" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackagePlus className="h-4 w-4" />}
            Publier mon colis
          </Button>
        </form>
      </main>
      <Footer />
    </div>
  );
};

export default SendParcel;
