import { useEffect, useState } from "react";
import { z } from "zod";
import { Loader2, Mail, CheckCircle2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const emailSchema = z.string().trim().email("Email invalide").max(255);

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultEmail?: string;
};

const ForgotPasswordDialog = ({ open, onOpenChange, defaultEmail = "" }: Props) => {
  const [email, setEmail] = useState(defaultEmail);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (open) {
      setEmail(defaultEmail);
      setError(null);
      setSent(false);
      setBusy(false);
    }
  }, [open, defaultEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const target = email.trim().toLowerCase();
    const parsed = emailSchema.safeParse(target);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    const redirectUrl = typeof window !== "undefined"
      ? `${window.location.origin}/reset-password`
      : "https://www.toutsuiteannonces.com/reset-password";
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(target, { redirectTo: redirectUrl });
    setBusy(false);
    if (resetError) {
      setError(resetError.message);
      toast.error(resetError.message);
      return;
    }
    setSent(true);
    toast.success("Email envoyé", { description: "Vérifiez votre boîte de réception." });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {!sent ? (
          <>
            <DialogHeader>
              <DialogTitle>Réinitialiser votre mot de passe</DialogTitle>
              <DialogDescription>
                Entrez votre adresse email pour recevoir un lien de réinitialisation.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label htmlFor="forgot-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vous@exemple.com"
                    className="pl-10"
                    required
                    autoFocus
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
              <DialogFooter className="gap-2 sm:gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  disabled={busy}
                >
                  Annuler
                </Button>
                <Button type="submit" variant="gold" disabled={busy}>
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  Envoyer le lien de réinitialisation
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full border border-primary/40 bg-primary/10">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <DialogTitle className="text-center">Email envoyé ✅</DialogTitle>
              <DialogDescription className="text-center">
                Un email de réinitialisation a été envoyé à votre adresse{" "}
                <span className="text-foreground font-medium">{email}</span>.
                <br />
                Pensez à vérifier vos courriers indésirables.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outlineGold"
                className="w-full"
                onClick={() => onOpenChange(false)}
              >
                <ArrowLeft className="w-4 h-4" />
                Retour à la connexion
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ForgotPasswordDialog;
