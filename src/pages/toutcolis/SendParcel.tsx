import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Info,
  Loader2,
  MapPin,
  Package,
  PackagePlus,
  Phone,
  Save,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import QuoteEstimator from "@/components/toutcolis/QuoteEstimator";
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
import { cn } from "@/lib/utils";
import { deleteDraft, getDraft, saveDraft } from "@/lib/parcelDrafts";
import {
  COUNTRIES,
  DELIVERY_MODES,
  estimateQuote,
  formatFcfa,
  PARCEL_TYPES,
  SENEGAL_CITIES,
} from "@/lib/toutcolis";


const MAX_PHOTOS = 4;

const STEPS = [
  { id: 0, label: "Trajet", icon: MapPin },
  { id: 1, label: "Colis", icon: Package },
  { id: 2, label: "Contacts", icon: Phone },
  { id: 3, label: "Récapitulatif", icon: Check },
] as const;

type FormState = {
  sender_name: string;
  sender_phone: string;
  sender_whatsapp: string;
  recipient_name: string;
  recipient_phone: string;
  departure_country: string;
  departure_city: string;
  departure_address: string;
  arrival_country: string;
  arrival_city: string;
  arrival_address: string;
  departure_date: string;
  parcel_type: string;
  description: string;
  weight: string;
  length: string;
  width: string;
  height: string;
  declared_value: string;
  delivery_mode: string;
  price: string;
};

const phoneOk = (v: string) => v.replace(/[^\d]/g, "").length >= 9;

const FieldError = ({ message }: { message?: string }) =>
  message ? (
    <p className="mt-1 text-xs text-destructive animate-fade-in" role="alert">
      {message}
    </p>
  ) : null;

const SendParcel = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [step, setStep] = useState(0);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState<FormState>(() => {
    const prefillType = searchParams.get("type") ?? "";
    return {
      sender_name: "",
      sender_phone: "",
      sender_whatsapp: "",
      recipient_name: "",
      recipient_phone: "",
      departure_country: "Sénégal",
      departure_city: searchParams.get("from") ?? "",
      departure_address: "",
      arrival_country: "Sénégal",
      arrival_city: searchParams.get("to") ?? "",
      arrival_address: "",
      departure_date: searchParams.get("date") ?? "",
      parcel_type: PARCEL_TYPES.includes(prefillType) ? prefillType : "",
      description: "",
      weight: searchParams.get("weight") ?? "",
      length: "",
      width: "",
      height: "",
      declared_value: "",
      delivery_mode: "",
      price: "",
    };
  });
  const [draftId, setDraftId] = useState<string | null>(searchParams.get("draft"));
  const [draftLoaded, setDraftLoaded] = useState(false);

  useSEO({
    title: "Envoyer un colis — TOUT COLIS",
    description:
      "Publiez votre colis en quelques minutes : trajet, poids, dimensions et budget. Recevez les offres de transporteurs vérifiés au Sénégal.",
    canonical: `${SITE_URL}/tout-colis/envoyer`,
  });

  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const blur = (k: string) => setTouched((t) => ({ ...t, [k]: true }));
  const num = (v: string) => (v.trim() === "" ? null : Number(v));

  // Reprise d'un brouillon enregistré
  useEffect(() => {
    if (draftLoaded || !draftId || !user) return;
    const d = getDraft(user.id, draftId);
    if (d) {
      setForm((f) => ({ ...f, ...(d.form as Partial<FormState>) }));
      setStep(Math.min(d.step, STEPS.length - 1));
      toast.success("Brouillon repris", { description: "Complétez et publiez votre colis." });
    }
    setDraftLoaded(true);
  }, [draftId, user, draftLoaded]);


  const errors = useMemo(() => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.departure_city.trim()) e.departure_city = "Indiquez la ville de départ.";
    if (!form.arrival_city.trim()) e.arrival_city = "Indiquez la ville d'arrivée.";
    if (
      form.departure_city.trim() &&
      form.departure_city.trim().toLowerCase() === form.arrival_city.trim().toLowerCase() &&
      form.departure_country === form.arrival_country
    ) {
      e.arrival_city = "Le départ et l'arrivée doivent être différents.";
    }
    if (form.departure_date && new Date(form.departure_date) < new Date(new Date().toDateString())) {
      e.departure_date = "Choisissez une date à venir.";
    }
    if (!form.parcel_type) e.parcel_type = "Sélectionnez le type de colis.";
    if (!form.weight.trim()) e.weight = "Indiquez un poids approximatif.";
    else if (Number(form.weight) <= 0) e.weight = "Le poids doit être supérieur à 0.";
    if (form.description.trim().length > 0 && form.description.trim().length < 10)
      e.description = "Décrivez le contenu en 10 caractères minimum.";
    if (!form.sender_name.trim()) e.sender_name = "Votre nom est requis.";
    if (!form.sender_phone.trim()) e.sender_phone = "Votre téléphone est requis.";
    else if (!phoneOk(form.sender_phone)) e.sender_phone = "Numéro invalide (9 chiffres minimum).";
    if (form.sender_whatsapp.trim() && !phoneOk(form.sender_whatsapp))
      e.sender_whatsapp = "Numéro WhatsApp invalide.";
    if (form.recipient_phone.trim() && !phoneOk(form.recipient_phone))
      e.recipient_phone = "Numéro du destinataire invalide.";
    return e;
  }, [form]);

  const stepFields: (keyof FormState)[][] = [
    ["departure_city", "arrival_city", "departure_date"],
    ["parcel_type", "weight", "description"],
    ["sender_name", "sender_phone", "sender_whatsapp", "recipient_phone"],
    [],
  ];

  const stepValid = (i: number) => stepFields[i].every((f) => !errors[f]);
  const err = (k: keyof FormState) => (touched[k] ? errors[k] : undefined);

  const progress = useMemo(() => {
    const done = STEPS.filter((s) => s.id < step || (s.id === step && stepValid(s.id))).length;
    return Math.round((done / STEPS.length) * 100);
  }, [step, errors]);

  const goNext = () => {
    stepFields[step].forEach(blur);
    if (!stepValid(step)) {
      toast.error("Vérifiez les champs signalés avant de continuer");
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    setStep((s) => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const quoteInput = useMemo(
    () => ({
      departure_country: form.departure_country,
      departure_city: form.departure_city,
      arrival_country: form.arrival_country,
      arrival_city: form.arrival_city,
      parcel_type: form.parcel_type,
      weight: num(form.weight),
      length: num(form.length),
      width: num(form.width),
      height: num(form.height),
      declared_value: num(form.declared_value),
      delivery_mode: form.delivery_mode,
    }),
    [form],
  );

  const quote = useMemo(() => estimateQuote(quoteInput), [quoteInput]);

  const delayLabel = quote.ready
    ? quote.daysMin === quote.daysMax
      ? `${quote.daysMin} jour${quote.daysMin > 1 ? "s" : ""}`
      : `${quote.daysMin} à ${quote.daysMax} jours`
    : "À estimer";
  const priceLabel = quote.ready
    ? `${formatFcfa(quote.priceMin)} – ${formatFcfa(quote.priceMax)}`
    : "À estimer";

  const onSaveDraft = () => {
    if (!user) {
      navigate("/auth?redirect=/tout-colis/envoyer");
      return;
    }
    const saved = saveDraft(user.id, {
      id: draftId ?? undefined,
      step,
      form: { ...form },
      summary: {
        route: `${form.departure_city || "?"} (${form.departure_country}) → ${form.arrival_city || "?"} (${form.arrival_country})`,
        parcelType: form.parcel_type || "Non précisé",
        weight: form.weight ? `${form.weight} kg` : "—",
        priceLabel,
        delayLabel,
      },
    });
    setDraftId(saved.id);
    toast.success("Estimation sauvegardée en brouillon", {
      description: "Retrouvez-la dans « Mes colis » pour finaliser plus tard.",
    });
  };


  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate("/auth?redirect=/tout-colis/envoyer");
      return;
    }
    if (Object.keys(errors).length) {
      setTouched(Object.fromEntries(Object.keys(errors).map((k) => [k, true])));
      toast.error("Formulaire incomplet", { description: "Corrigez les champs signalés." });
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
    } catch (error) {
      toast.error("Publication impossible", {
        description: error instanceof Error ? error.message : "Réessayez dans un instant",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-3xl px-4 py-10">
        <header className="reveal-up">
          <h1 className="flex items-center gap-2 text-3xl font-bold text-foreground">
            <PackagePlus className="h-7 w-7 text-primary" /> Envoyer un colis
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Quatre étapes suffisent : le trajet, le colis, vos contacts, puis la vérification. La publication est gratuite.
          </p>
        </header>

        {/* Indicateur de progression */}
        <section className="mt-8 rounded-2xl border border-primary/15 bg-card/60 p-5 backdrop-blur-sm reveal-up">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Étape {step + 1} sur {STEPS.length} · {STEPS[step].label}
            </span>
            <span className="font-semibold text-primary">{progress}%</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-gradient-gold shadow-gold transition-all duration-700 ease-out"
              style={{ width: `${Math.max(progress, 4)}%` }}
            />
          </div>
          <ol className="mt-5 grid grid-cols-4 gap-2">
            {STEPS.map((s) => {
              const Icon = s.icon;
              const done = s.id < step;
              const active = s.id === step;
              return (
                <li key={s.id} className="flex flex-col items-center gap-2 text-center">
                  <button
                    type="button"
                    onClick={() => s.id < step && setStep(s.id)}
                    aria-current={active ? "step" : undefined}
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-300",
                      done && "border-primary/60 bg-primary/15 text-primary",
                      active && "border-primary bg-gradient-gold text-primary-foreground shadow-gold scale-110",
                      !done && !active && "border-border bg-card text-muted-foreground",
                    )}
                  >
                    {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </button>
                  <span className={cn("text-[11px]", active ? "font-semibold text-foreground" : "text-muted-foreground")}>
                    {s.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>

        <QuoteEstimator className="mt-6 reveal-up" input={quoteInput} />


        {/* Statut de validation de l'étape courante */}
        {stepFields[step].length > 0 && (
          <p
            className={cn(
              "mt-4 flex items-center gap-2 rounded-xl border px-3 py-2 text-xs transition-colors",
              stepValid(step)
                ? "border-primary/30 bg-primary/5 text-primary"
                : "border-border/60 bg-card/40 text-muted-foreground",
            )}
            aria-live="polite"
          >
            {stepValid(step) ? (
              <>
                <Check className="h-3.5 w-3.5" /> Étape « {STEPS[step].label} » complète.
              </>
            ) : (
              <>
                <Info className="h-3.5 w-3.5" /> Champs à compléter :{" "}
                {stepFields[step].filter((f) => errors[f]).length} restant(s).
              </>
            )}
          </p>
        )}

        <form onSubmit={onSubmit} className="mt-6 space-y-6">

          {step === 0 && (
            <Card key="step-0" className="border-primary/15 bg-card/60 p-5 animate-fade-in">
              <h2 className="font-semibold text-foreground">Votre trajet</h2>
              <p className="mt-1 text-xs text-muted-foreground">D'où part le colis et où doit-il arriver ?</p>
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
                    className={cn("mt-1", err("departure_city") && "border-destructive")}
                    value={form.departure_city}
                    onChange={(e) => set("departure_city", e.target.value)}
                    onBlur={() => blur("departure_city")}
                    placeholder="Dakar"
                  />
                  <FieldError message={err("departure_city")} />
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
                    className={cn("mt-1", err("arrival_city") && "border-destructive")}
                    value={form.arrival_city}
                    onChange={(e) => set("arrival_city", e.target.value)}
                    onBlur={() => blur("arrival_city")}
                    placeholder="Thiès"
                  />
                  <FieldError message={err("arrival_city")} />
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
                  <Input
                    id="dep-date"
                    type="date"
                    className={cn("mt-1", err("departure_date") && "border-destructive")}
                    value={form.departure_date}
                    onChange={(e) => set("departure_date", e.target.value)}
                    onBlur={() => blur("departure_date")}
                  />
                  <FieldError message={err("departure_date")} />
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
          )}

          {step === 1 && (
            <Card key="step-1" className="border-primary/15 bg-card/60 p-5 animate-fade-in">
              <h2 className="font-semibold text-foreground">Le colis</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Plus votre description est précise, plus les offres reçues seront justes.
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Type de colis *</Label>
                  <Select
                    value={form.parcel_type}
                    onValueChange={(v) => { set("parcel_type", v); blur("parcel_type"); }}
                  >
                    <SelectTrigger className={cn("mt-1", err("parcel_type") && "border-destructive")}>
                      <SelectValue placeholder="Choisir" />
                    </SelectTrigger>
                    <SelectContent>
                      {PARCEL_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FieldError message={err("parcel_type")} />
                </div>
                <div>
                  <Label htmlFor="weight">Poids (kg) *</Label>
                  <Input
                    id="weight"
                    type="number"
                    min="0"
                    step="0.1"
                    className={cn("mt-1", err("weight") && "border-destructive")}
                    value={form.weight}
                    onChange={(e) => set("weight", e.target.value)}
                    onBlur={() => blur("weight")}
                  />
                  <FieldError message={err("weight")} />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="desc">Description</Label>
                  <Textarea
                    id="desc"
                    rows={4}
                    className={cn("mt-1", err("description") && "border-destructive")}
                    value={form.description}
                    onChange={(e) => set("description", e.target.value)}
                    onBlur={() => blur("description")}
                    placeholder="Contenu, fragilité, précautions…"
                  />
                  <FieldError message={err("description")} />
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
                <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-primary/30 bg-card/40 px-4 py-6 text-sm text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground">
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
                      <span key={`${f.name}-${i}`} className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-card/60 px-3 py-1 text-xs animate-fade-in">
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
          )}

          {step === 2 && (
            <Card key="step-2" className="border-primary/15 bg-card/60 p-5 animate-fade-in">
              <h2 className="font-semibold text-foreground">Vos contacts</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Ces informations permettent aux transporteurs de vous joindre rapidement.
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="sname">Votre nom *</Label>
                  <Input
                    id="sname"
                    className={cn("mt-1", err("sender_name") && "border-destructive")}
                    value={form.sender_name}
                    onChange={(e) => set("sender_name", e.target.value)}
                    onBlur={() => blur("sender_name")}
                  />
                  <FieldError message={err("sender_name")} />
                </div>
                <div>
                  <Label htmlFor="sphone">Votre téléphone *</Label>
                  <Input
                    id="sphone"
                    className={cn("mt-1", err("sender_phone") && "border-destructive")}
                    value={form.sender_phone}
                    onChange={(e) => set("sender_phone", e.target.value)}
                    onBlur={() => blur("sender_phone")}
                    placeholder="77 000 00 00"
                  />
                  <FieldError message={err("sender_phone")} />
                </div>
                <div>
                  <Label htmlFor="swa">WhatsApp</Label>
                  <Input
                    id="swa"
                    className={cn("mt-1", err("sender_whatsapp") && "border-destructive")}
                    value={form.sender_whatsapp}
                    onChange={(e) => set("sender_whatsapp", e.target.value)}
                    onBlur={() => blur("sender_whatsapp")}
                  />
                  <FieldError message={err("sender_whatsapp")} />
                </div>
                <div>
                  <Label htmlFor="rname">Destinataire</Label>
                  <Input id="rname" className="mt-1" value={form.recipient_name} onChange={(e) => set("recipient_name", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="rphone">Téléphone du destinataire</Label>
                  <Input
                    id="rphone"
                    className={cn("mt-1", err("recipient_phone") && "border-destructive")}
                    value={form.recipient_phone}
                    onChange={(e) => set("recipient_phone", e.target.value)}
                    onBlur={() => blur("recipient_phone")}
                  />
                  <FieldError message={err("recipient_phone")} />
                </div>
              </div>
            </Card>
          )}

          {step === 3 && (
            <Card key="step-3" className="border-primary/15 bg-card/60 p-5 animate-fade-in">
              <h2 className="font-semibold text-foreground">Vérifiez avant publication</h2>
              <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                <div className="rounded-xl border border-border/60 bg-card/50 p-3">
                  <dt className="text-xs text-muted-foreground">Trajet</dt>
                  <dd className="font-medium text-foreground">
                    {form.departure_city} ({form.departure_country}) → {form.arrival_city} ({form.arrival_country})
                  </dd>
                </div>
                <div className="rounded-xl border border-border/60 bg-card/50 p-3">
                  <dt className="text-xs text-muted-foreground">Date souhaitée</dt>
                  <dd className="font-medium text-foreground">{form.departure_date || "Flexible"}</dd>
                </div>
                <div className="rounded-xl border border-border/60 bg-card/50 p-3">
                  <dt className="text-xs text-muted-foreground">Colis</dt>
                  <dd className="font-medium text-foreground">
                    {form.parcel_type} · {form.weight} kg
                  </dd>
                </div>
                <div className="rounded-xl border border-border/60 bg-card/50 p-3">
                  <dt className="text-xs text-muted-foreground">Budget proposé</dt>
                  <dd className="font-medium text-primary">{formatFcfa(form.price ? Number(form.price) : null)}</dd>
                </div>
                <div className="rounded-xl border border-border/60 bg-card/50 p-3">
                  <dt className="text-xs text-muted-foreground">Contact</dt>
                  <dd className="font-medium text-foreground">
                    {form.sender_name} · {form.sender_phone}
                  </dd>
                </div>
                <div className="rounded-xl border border-border/60 bg-card/50 p-3">
                  <dt className="text-xs text-muted-foreground">Photos</dt>
                  <dd className="font-medium text-foreground">{files.length} photo(s)</dd>
                </div>
              </dl>
              {form.description && (
                <p className="mt-3 rounded-xl border border-border/60 bg-card/50 p-3 text-sm text-muted-foreground">
                  {form.description}
                </p>
              )}

              {/* Récapitulatif de l'estimation */}
              <div className="mt-5 rounded-2xl border border-primary/25 bg-primary/5 p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Sparkles className="h-4 w-4 text-primary" /> Récapitulatif de l'estimation
                </h3>
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-muted-foreground">Origine</dt>
                    <dd className="font-medium text-foreground">
                      {form.departure_city || "—"} ({form.departure_country})
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Destination</dt>
                    <dd className="font-medium text-foreground">
                      {form.arrival_city || "—"} ({form.arrival_country})
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Type de colis</dt>
                    <dd className="font-medium text-foreground">{form.parcel_type || "Non précisé"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Poids</dt>
                    <dd className="font-medium text-foreground">
                      {form.weight ? `${form.weight} kg` : "—"}
                      {quote.ready && quote.billableWeight > Number(form.weight || 0)
                        ? ` (facturable ${quote.billableWeight} kg)`
                        : ""}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Prix estimé</dt>
                    <dd className="font-bold text-primary">{priceLabel}</dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" /> Délai estimé
                    </dt>
                    <dd className="font-bold text-foreground">{delayLabel}</dd>
                  </div>
                </dl>
                <p className="mt-3 text-[11px] text-muted-foreground">
                  Estimation indicative : le prix final est convenu avec le transporteur.
                </p>
              </div>
            </Card>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" className="rounded-full" onClick={goBack} disabled={step === 0}>
                <ArrowLeft className="h-4 w-4" /> Retour
              </Button>
              <Button type="button" variant="outlineGold" className="rounded-full" onClick={onSaveDraft}>
                <Save className="h-4 w-4" /> Enregistrer en brouillon
              </Button>
            </div>

            {step < STEPS.length - 1 ? (
              <Button type="button" variant="gold" className="rounded-full" onClick={goNext}>
                Continuer <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" variant="gold" size="lg" className="rounded-full" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackagePlus className="h-4 w-4" />}
                Publier mon colis
              </Button>
            )}
          </div>
        </form>
      </main>
      <Footer />
    </div>
  );
};

export default SendParcel;
