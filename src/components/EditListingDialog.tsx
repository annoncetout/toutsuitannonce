import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, Trash2, ImagePlus, Check } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { deleteFromStorageMany, MAX_LISTING_IMAGES, uploadToStorage } from "@/lib/storageUpload";

interface ListingLite {
  id: string;
  title: string;
  description?: string | null;
  price: number | null;
  currency: string;
  images: string[];
  category_id?: string | null;
}

interface Category {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  listing: ListingLite | null;
  onSaved?: (updated: ListingLite) => void;
}

const MAX_FILE = 5 * 1024 * 1024;

const schema = z.object({
  title: z.string().trim().min(3, "Titre trop court").max(120, "Titre trop long"),
  description: z.string().trim().min(10, "Description trop courte").max(2000, "Description trop longue"),
  price: z.string().trim().max(15).optional(),
  category_id: z.string().uuid("Catégorie requise"),
});

interface UploadingItem {
  id: string;
  name: string;
  progress: number;
}

const EditListingDialog = ({ open, onOpenChange, listing, onSaved }: Props) => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [images, setImages] = useState<string[]>([]);
  const [originalImages, setOriginalImages] = useState<string[]>([]);
  const [uploads, setUploads] = useState<UploadingItem[]>([]);
  const [saving, setSaving] = useState(false);

  const uploading = uploads.length > 0;
  const removedImages = useMemo(
    () => originalImages.filter((u) => !images.includes(u)),
    [originalImages, images],
  );

  useEffect(() => {
    if (!open) return;
    supabase.from("categories").select("id,name").order("name").then(({ data }) => {
      if (data) setCategories(data as Category[]);
    });
  }, [open]);

  useEffect(() => {
    if (!listing) return;
    setTitle(listing.title ?? "");
    setDescription(listing.description ?? "");
    setPrice(listing.price != null ? String(listing.price) : "");
    setCategoryId(listing.category_id ?? "");
    setImages(listing.images ?? []);
    setOriginalImages(listing.images ?? []);
    setUploads([]);
  }, [listing]);

  const handleAddImages = async (files: FileList | null) => {
    if (!files || !user) return;
    const remaining = MAX_LISTING_IMAGES - images.length - uploads.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${MAX_LISTING_IMAGES} photos par annonce.`);
      return;
    }
    const list = Array.from(files).slice(0, Math.max(0, remaining));
    const valid = list.filter((f) => f.size <= MAX_FILE && f.type.startsWith("image/"));
    if (valid.length < list.length) toast.error("Certaines images ignorées (max 5 Mo, images uniquement)");
    if (valid.length === 0) return;

    await Promise.all(valid.map(async (f) => {
      const uid = crypto.randomUUID();
      setUploads((prev) => [...prev, { id: uid, name: f.name, progress: 0 }]);
      try {
        const { url } = await uploadToStorage(f, {
          folder: "annonces",
          onProgress: (p) =>
            setUploads((prev) => prev.map((u) => (u.id === uid ? { ...u, progress: p } : u))),
        });
        setImages((prev) => [...prev, url]);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Upload échoué");
      } finally {
        setUploads((prev) => prev.filter((u) => u.id !== uid));
      }
    }));
  };

  const removeImage = (url: string) => {
    setImages((prev) => prev.filter((u) => u !== url));
  };

  const handleSave = async () => {
    if (!listing) return;
    const parsed = schema.safeParse({ title, description, price, category_id: categoryId });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (images.length === 0) {
      toast.error("Ajoutez au moins une photo");
      return;
    }
    if (images.length > MAX_LISTING_IMAGES) {
      toast.error(`Maximum ${MAX_LISTING_IMAGES} photos.`);
      return;
    }
    setSaving(true);
    const priceNum = price.trim() === "" ? null : Number(price);
    if (price.trim() !== "" && (Number.isNaN(priceNum) || (priceNum as number) < 0)) {
      setSaving(false);
      toast.error("Prix invalide");
      return;
    }
    const payload = {
      title: title.trim(),
      description: description.trim(),
      price: priceNum,
      category_id: categoryId,
      images,
    };
    const { data, error } = await supabase
      .from("listings")
      .update(payload)
      .eq("id", listing.id)
      .select("*")
      .maybeSingle();
    setSaving(false);
    if (error) {
      toast.error("Échec de la mise à jour : " + error.message);
      return;
    }
    // Best-effort cleanup of orphan images that were removed from the listing.
    if (removedImages.length > 0) {
      deleteFromStorageMany(removedImages).catch(() => {});
    }
    toast.success("Annonce mise à jour");
    onSaved?.((data ?? { ...listing, ...payload }) as ListingLite);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier l'annonce</DialogTitle>
          <DialogDescription>Mettez à jour les informations puis enregistrez.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Titre *</Label>
            <Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-price">Prix ({listing?.currency ?? "FCFA"})</Label>
              <Input id="edit-price" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))} placeholder="Laissez vide pour « À discuter »" />
            </div>
            <div className="space-y-2">
              <Label>Catégorie *</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="Choisir une catégorie" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-desc">Description *</Label>
            <Textarea id="edit-desc" rows={6} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Photos ({images.length}/{MAX_LISTING_IMAGES})</Label>
              {uploading && (
                <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> {uploads.length} en cours
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {images.map((url, i) => (
                <div key={url} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
                  <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                  {i === 0 && <span className="absolute bottom-1 left-1 text-[10px] font-semibold uppercase bg-primary text-primary-foreground rounded px-1.5 py-0.5">Couverture</span>}
                  <button type="button" onClick={() => removeImage(url)} aria-label="Supprimer" className="absolute top-1 right-1 w-7 h-7 rounded-full bg-background/95 border border-border flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {uploads.map((u) => (
                <div key={u.id} className="relative aspect-square rounded-lg overflow-hidden border border-dashed border-primary/40 bg-primary/5 flex flex-col items-center justify-center gap-2 p-3">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="text-[11px] font-medium tabular-nums">{u.progress}%</span>
                  <Progress value={u.progress} className="h-1.5 w-full" />
                </div>
              ))}
              {images.length + uploads.length < MAX_LISTING_IMAGES && (
                <label className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors text-muted-foreground hover:text-primary">
                  <ImagePlus className="w-6 h-6 mb-1" />
                  <span className="text-[11px] font-medium">Ajouter</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { handleAddImages(e.target.files); e.target.value = ""; }} />
                </label>
              )}
            </div>
            {removedImages.length > 0 && (
              <p className="text-[11px] text-muted-foreground">
                {removedImages.length} photo{removedImages.length > 1 ? "s" : ""} sera{removedImages.length > 1 ? "ont" : ""} supprimée{removedImages.length > 1 ? "s" : ""} du stockage après enregistrement.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Annuler</Button>
          <Button variant="gold" onClick={handleSave} disabled={saving || uploading}>
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement…</> : <><Check className="w-4 h-4" /> Enregistrer les modifications</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditListingDialog;
