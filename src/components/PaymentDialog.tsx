import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Copy, Check, Smartphone } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAuthPrompt } from "@/components/AuthPromptDialog";
import { toast } from "sonner";

export const MERCHANT_PHONE = "78 471 60 55";
const MERCHANT_PHONE_RAW = MERCHANT_PHONE.replace(/\s/g, "");

export type PaymentOffer = {
  id: string;
  label: string;
  amount: number;
  // transaction type
  kind: "listing_boost" | "subscription";
  // for boosts
  boostType?: "premium" | "urgent";
  durationDays?: number;
  // for subscriptions
  plan?: "starter_pro" | "business_pro" | "elite_pro";
  // optional listing for boost (else admin attaches later)
  listingId?: string | null;
};

const makeRef = (offerId: string) => {
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TSA-${offerId.toUpperCase()}-${t}-${r}`;
};

const PaymentDialog = ({
  open,
  onOpenChange,
  offer,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  offer: PaymentOffer | null;
}) => {
  const { user } = useAuth();
  const { requireAuth } = useAuthPrompt();
  const navigate = useNavigate();
  const [method, setMethod] = useState<"wave" | "orange_money">("wave");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState<"phone" | "amount" | "ref" | null>(null);
  const reference = useMemo(() => (offer ? makeRef(offer.id) : ""), [offer?.id, open]);

  useEffect(() => {
    if (!open) {
      setMethod("wave");
      setSubmitting(false);
      setCopied(null);
    }
  }, [open]);

  if (!offer) return null;

  const copy = (value: string, key: "phone" | "amount" | "ref") => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(key);
      toast.success("Copié");
      setTimeout(() => setCopied(null), 1500);
    });
  };

  const confirmPaid = async () => {
    if (!user) {
      onOpenChange(false);
      requireAuth({ title: "Connectez-vous pour payer", message: "Créez un compte ou connectez-vous pour finaliser votre paiement." });
      return;
    }
    setSubmitting(true);
    const meta: Record<string, string | number | null | undefined> = {
      offer_id: offer.id,
      offer_label: offer.label,
      payment_method: method,
      reference,
    };
    if (offer.kind === "listing_boost") {
      meta.boost_type = offer.boostType ?? null;
      meta.duration_days = offer.durationDays ?? null;
      meta.plan_id = offer.id;
    } else {
      meta.plan = offer.plan ?? null;
    }
    const payload = {
      user_id: user.id,
      listing_id: offer.listingId ?? null,
      type: offer.kind,
      status: "pending" as const,
      amount: offer.amount,
      currency: "FCFA",
      method,
      external_reference: reference,
      metadata: meta as unknown as Record<string, string | number | null>,
    };
    const { error } = await supabase.from("transactions").insert(payload);
    setSubmitting(false);
    if (error) {
      toast.error("Impossible d'enregistrer le paiement. Réessayez.");
      return;
    }
    toast.success("Paiement enregistré. Activation après validation par notre équipe.");
    onOpenChange(false);
    if (offer.kind === "listing_boost" && !offer.listingId) {
      navigate("/dashboard");
    } else if (offer.kind === "subscription") {
      navigate("/dashboard");
    }
  };

  const amountLabel = `${offer.amount.toLocaleString("fr-FR")} FCFA`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Paiement — {offer.label}</DialogTitle>
          <DialogDescription>
            Effectuez le paiement via Wave ou Orange Money, puis confirmez ci-dessous. Activation après validation.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 pt-2">
          {(["wave", "orange_money"] as const).map((m) => {
            const active = method === m;
            const label = m === "wave" ? "Wave" : "Orange Money";
            return (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={`rounded-xl border-2 p-3 text-left transition hover:scale-[1.02] ${
                  active ? "border-primary bg-primary/10" : "border-border bg-card"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Smartphone className={`w-4 h-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="font-semibold">{label}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {m === "wave" ? "Paiement instantané sans frais" : "Mobile Money Sénégal"}
                </p>
              </button>
            );
          })}
        </div>

        <div className="mt-4 space-y-2 rounded-xl border border-primary/30 bg-card p-4">
          <Row label="Numéro à payer" value={MERCHANT_PHONE} copied={copied === "phone"} onCopy={() => copy(MERCHANT_PHONE_RAW, "phone")} mono />
          <Row label="Montant" value={amountLabel} copied={copied === "amount"} onCopy={() => copy(String(offer.amount), "amount")} highlight />
          <Row label="Référence" value={reference} copied={copied === "ref"} onCopy={() => copy(reference, "ref")} mono />
        </div>

        <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside pt-2">
          <li>Ouvrez {method === "wave" ? "Wave" : "Orange Money"} et envoyez {amountLabel} au {MERCHANT_PHONE}.</li>
          <li>Indiquez la référence dans le motif/message si possible.</li>
          <li>Cliquez sur « J'ai effectué le paiement ». Notre équipe valide sous 24h.</li>
        </ol>

        <div className="flex gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="flex-1">Annuler</Button>
          <Button variant="gold" onClick={confirmPaid} disabled={submitting} className="flex-1">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            J'ai effectué le paiement
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Row = ({
  label, value, onCopy, copied, mono, highlight,
}: { label: string; value: string; onCopy: () => void; copied: boolean; mono?: boolean; highlight?: boolean }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
    <div className="flex items-center gap-2">
      <span className={`${mono ? "font-mono" : ""} ${highlight ? "text-primary font-bold text-lg" : "font-semibold"}`}>{value}</span>
      <button
        onClick={onCopy}
        className="p-1.5 rounded-md border border-border hover:border-primary hover:text-primary transition"
        aria-label={`Copier ${label}`}
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  </div>
);

export default PaymentDialog;
