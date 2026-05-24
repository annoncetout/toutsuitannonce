import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { uploadToR2 } from "@/lib/r2Upload";
import { Loader2, Upload, X } from "lucide-react";

export type AdRow = {
  id?: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  image_url: string | null;
  discount: number | null;
  button_text: string | null;
  redirect_url: string | null;
  theme_color: string | null;
  animation_type: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  position: number;
};

const emptyAd = (): AdRow => ({
  title: "",
  subtitle: "",
  description: "",
  image_url: "",
  discount: null,
  button_text: "Découvrir",
  redirect_url: "",
  theme_color: "#d4af37",
  animation_type: "fade",
  start_date: new Date().toISOString().slice(0, 16),
  end_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 16),
  is_active: true,
  position: 0,
});

const schema = z.object({
  title: z.string().trim().min(2, "Titre trop court").max(120),
  subtitle: z.string().max(120).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  image_url: z.string().max(1000).nullable().optional(),
  discount: z.number().int().min(0).max(99).nullable().optional(),
  button_text: z.string().max(40).nullable().optional(),
  redirect_url: z.string().max(500).nullable().optional(),
  theme_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur hex requise"),
  animation_type: z.enum(["fade", "slide", "zoom", "glow"]),
  is_active: z.boolean(),
  position: z.number().int().min(0).max(999),
});

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: AdRow | null;
  onSaved: () => void;
};

const AdFormDialog = ({ open, onOpenChange, initial, onSaved }: Props) => {
  const [ad, setAd] = useState<AdRow>(emptyAd());
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (open) {
      setAd(initial ? {
        ...initial,
        start_date: initial.start_date.slice(0, 16),
        end_date: initial.end_date.slice(0, 16),
      } : emptyAd());
      setProgress(0);
    }
  }, [open, initial]);

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setProgress(0);
    try {
      const { url } = await uploadToR2(file, { folder: "ads", onProgress: setProgress });
      setAd((a) => ({ ...a, image_url: url }));
      toast.success("Image téléversée");
    } catch (err: any) {
      toast.error(err.message || "Échec du téléversement");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    const parsed = schema.safeParse(ad);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (new Date(ad.end_date) <= new Date(ad.start_date)) {
      toast.error("La date de fin doit être après la date de début");
      return;
    }
    setSaving(true);
    const payload = {
      title: ad.title.trim(),
      subtitle: ad.subtitle?.trim() || null,
      description: ad.description?.trim() || null,
      image_url: ad.image_url?.trim() || null,
      discount: ad.discount ?? null,
      button_text: ad.button_text?.trim() || null,
      redirect_url: ad.redirect_url?.trim() || null,
      theme_color: ad.theme_color,
      animation_type: ad.animation_type,
      start_date: new Date(ad.start_date).toISOString(),
      end_date: new Date(ad.end_date).toISOString(),
      is_active: ad.is_active,
      position: ad.position,
    };
    const { error } = initial?.id
      ? await supabase.from("advertisements").update(payload).eq("id", initial.id)
      : await supabase.from("advertisements").insert(payload);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(initial?.id ? "Publicité mise à jour" : "Publicité créée");
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Modifier la publicité" : "Nouvelle publicité"}</DialogTitle>
          <DialogDescription>Définissez le contenu et la planification de la bannière.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div>
            <Label>Titre *</Label>
            <Input value={ad.title} onChange={(e) => setAd({ ...ad, title: e.target.value })} placeholder="🔥 Promotion immobilier" />
          </div>
          <div>
            <Label>Sous-titre</Label>
            <Input value={ad.subtitle ?? ""} onChange={(e) => setAd({ ...ad, subtitle: e.target.value })} placeholder="Offre limitée" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea rows={3} value={ad.description ?? ""} onChange={(e) => setAd({ ...ad, description: e.target.value })} />
          </div>

          <div>
            <Label>Image / bannière</Label>
            <div className="flex items-center gap-3 mt-1">
              {ad.image_url && (
                <div className="relative w-24 h-16 rounded-lg overflow-hidden border border-border">
                  <img src={ad.image_url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setAd({ ...ad, image_url: "" })}
                    className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              <label className="flex-1">
                <input type="file" accept="image/*" onChange={handleImage} disabled={uploading} className="hidden" />
                <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border hover:border-primary cursor-pointer text-sm">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploading ? `Envoi… ${progress}%` : "Choisir un fichier"}
                </div>
              </label>
            </div>
            {uploading && <Progress value={progress} className="mt-2 h-1" />}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Réduction (%)</Label>
              <Input
                type="number"
                min={0}
                max={99}
                value={ad.discount ?? ""}
                onChange={(e) => setAd({ ...ad, discount: e.target.value === "" ? null : Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Texte bouton CTA</Label>
              <Input value={ad.button_text ?? ""} onChange={(e) => setAd({ ...ad, button_text: e.target.value })} />
            </div>
          </div>

          <div>
            <Label>Lien de redirection</Label>
            <Input value={ad.redirect_url ?? ""} onChange={(e) => setAd({ ...ad, redirect_url: e.target.value })} placeholder="/annonces?cat=immobilier ou https://…" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Couleur thème</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  className="w-14 h-10 p-1"
                  value={ad.theme_color || "#d4af37"}
                  onChange={(e) => setAd({ ...ad, theme_color: e.target.value })}
                />
                <Input
                  value={ad.theme_color || ""}
                  onChange={(e) => setAd({ ...ad, theme_color: e.target.value })}
                  placeholder="#d4af37"
                />
              </div>
            </div>
            <div>
              <Label>Animation</Label>
              <Select value={ad.animation_type} onValueChange={(v) => setAd({ ...ad, animation_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fade">Fondu</SelectItem>
                  <SelectItem value="slide">Glissement</SelectItem>
                  <SelectItem value="zoom">Zoom</SelectItem>
                  <SelectItem value="glow">Éclat</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date début</Label>
              <Input type="datetime-local" value={ad.start_date} onChange={(e) => setAd({ ...ad, start_date: e.target.value })} />
            </div>
            <div>
              <Label>Date fin</Label>
              <Input type="datetime-local" value={ad.end_date} onChange={(e) => setAd({ ...ad, end_date: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <Label>Position (ordre)</Label>
              <Input
                type="number"
                min={0}
                value={ad.position}
                onChange={(e) => setAd({ ...ad, position: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="flex items-center gap-3 pb-2">
              <Switch checked={ad.is_active} onCheckedChange={(v) => setAd({ ...ad, is_active: v })} />
              <Label>Active</Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={saving || uploading}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {initial?.id ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdFormDialog;
