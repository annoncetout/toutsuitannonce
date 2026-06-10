import { useEffect, useState } from "react";
import { Loader2, Save, Sliders, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Weights = {
  sales: number; rating: number; response: number; views: number; age: number; quality: number;
  sales_target: number; views_target: number; age_target_days: number;
};

type FraudNotify = {
  enabled: boolean;
  slack_webhook: string;
  notify_emails: string[];
};

const DEFAULT_W: Weights = {
  sales: 30, rating: 20, response: 15, views: 15, age: 10, quality: 10,
  sales_target: 30, views_target: 5000, age_target_days: 365,
};

export default function TopScoreWeightsConfig() {
  const [w, setW] = useState<Weights>(DEFAULT_W);
  const [fn, setFn] = useState<FraudNotify>({ enabled: true, slack_webhook: "", notify_emails: [] });
  const [emailsText, setEmailsText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recomputing, setRecomputing] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", ["top_score_weights", "fraud_notify"]);
    for (const r of data ?? []) {
      if (r.key === "top_score_weights" && r.value) setW({ ...DEFAULT_W, ...(r.value as Weights) });
      if (r.key === "fraud_notify" && r.value) {
        const v = r.value as FraudNotify;
        setFn({ enabled: v.enabled ?? true, slack_webhook: v.slack_webhook ?? "", notify_emails: v.notify_emails ?? [] });
        setEmailsText((v.notify_emails ?? []).join(", "));
      }
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const totalWeight = w.sales + w.rating + w.response + w.views + w.age + w.quality;

  const save = async (recompute = false) => {
    if (Math.abs(totalWeight - 100) > 0.01) {
      toast.error(`La somme des pondérations doit faire 100 (actuellement ${totalWeight}).`);
      return;
    }
    setSaving(true);
    const emails = emailsText.split(/[,;\s]+/).map((e) => e.trim()).filter(Boolean);
    const { error: e1 } = await supabase.from("site_settings").upsert(
      [{ key: "top_score_weights", value: w as never }],
      { onConflict: "key" }
    );
    const { error: e2 } = await supabase.from("site_settings").upsert(
      [{ key: "fraud_notify", value: { ...fn, notify_emails: emails } as never }],
      { onConflict: "key" }
    );
    setSaving(false);
    if (e1 || e2) return toast.error((e1 ?? e2)!.message);
    toast.success("Configuration enregistrée");
    if (recompute) {
      setRecomputing(true);
      const { error } = await supabase.functions.invoke("recompute-top-sellers");
      setRecomputing(false);
      if (error) return toast.error(error.message);
      toast.success("Recalcul terminé avec les nouvelles pondérations");
    }
  };

  const fields: { key: keyof Weights; label: string }[] = [
    { key: "sales", label: "Ventes (%)" },
    { key: "rating", label: "Avis (%)" },
    { key: "response", label: "Réponse (%)" },
    { key: "views", label: "Vues (%)" },
    { key: "age", label: "Ancienneté (%)" },
    { key: "quality", label: "Qualité (%)" },
  ];

  return (
    <Card className="p-6 mb-6">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><Sliders className="w-5 h-5 text-primary" /> Formule TopScore & alertes fraude</h2>
          <p className="text-sm text-muted-foreground">Ajustez les pondérations puis recalculez immédiatement.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-6">
          <div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {fields.map((f) => (
                <div key={f.key}>
                  <Label htmlFor={f.key}>{f.label}</Label>
                  <Input
                    id={f.key}
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={w[f.key]}
                    onChange={(e) => setW({ ...w, [f.key]: Number(e.target.value) })}
                  />
                </div>
              ))}
            </div>
            <p className={`text-sm mt-2 ${Math.abs(totalWeight - 100) > 0.01 ? "text-red-600" : "text-muted-foreground"}`}>
              Somme : <strong>{totalWeight}</strong> / 100
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
            <div>
              <Label htmlFor="sales_target">Cible ventes (100%)</Label>
              <Input id="sales_target" type="number" min={1} value={w.sales_target}
                     onChange={(e) => setW({ ...w, sales_target: Number(e.target.value) })} />
            </div>
            <div>
              <Label htmlFor="views_target">Cible vues (100%)</Label>
              <Input id="views_target" type="number" min={1} value={w.views_target}
                     onChange={(e) => setW({ ...w, views_target: Number(e.target.value) })} />
            </div>
            <div>
              <Label htmlFor="age_target_days">Cible ancienneté (jours)</Label>
              <Input id="age_target_days" type="number" min={1} value={w.age_target_days}
                     onChange={(e) => setW({ ...w, age_target_days: Number(e.target.value) })} />
            </div>
          </div>

          <div className="pt-4 border-t space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold flex items-center gap-2"><Bell className="w-4 h-4" /> Alertes anti-fraude</h3>
                <p className="text-xs text-muted-foreground">Notifier les admins quand de nouveaux vendeurs sont signalés.</p>
              </div>
              <Switch checked={fn.enabled} onCheckedChange={(v) => setFn({ ...fn, enabled: v })} />
            </div>
            <div>
              <Label htmlFor="slack">Webhook Slack (optionnel)</Label>
              <Input id="slack" placeholder="https://hooks.slack.com/services/..."
                     value={fn.slack_webhook}
                     onChange={(e) => setFn({ ...fn, slack_webhook: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="emails">E-mails à notifier (séparés par virgule)</Label>
              <Textarea id="emails" rows={2} placeholder="admin@exemple.com, moderation@exemple.com"
                        value={emailsText}
                        onChange={(e) => setEmailsText(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-4 border-t">
            <Button onClick={() => save(false)} disabled={saving} variant="outline">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Enregistrer
            </Button>
            <Button onClick={() => save(true)} disabled={saving || recomputing} variant="gold">
              {(saving || recomputing) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Enregistrer & recalculer
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
