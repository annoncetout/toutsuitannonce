import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const mcpUrl = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/mcp`;

const Connect = () => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(mcpUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-10 max-w-3xl">
        <h1 className="text-3xl font-bold text-foreground">Connecter un assistant IA</h1>
        <p className="mt-3 text-muted-foreground">
          Connectez ChatGPT ou Claude à Tout Suite Annonces pour rechercher et consulter les
          annonces directement depuis votre assistant.
        </p>

        <Card className="mt-8 p-5">
          <div className="text-sm font-medium text-foreground mb-2">URL du serveur MCP</div>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-md border border-border bg-muted px-3 py-2 text-sm break-all">
              {mcpUrl}
            </code>
            <Button onClick={copy} variant="secondary" size="sm">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span className="ml-2">{copied ? "Copié" : "Copier"}</span>
            </Button>
          </div>
        </Card>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-foreground">ChatGPT</h2>
          <ol className="mt-3 space-y-2 list-decimal list-inside text-sm text-muted-foreground">
            <li>
              Ouvrez{" "}
              <a
                className="text-primary underline"
                href="https://chatgpt.com/#settings/Connectors/Advanced"
                target="_blank"
                rel="noreferrer"
              >
                Paramètres → Connecteurs → Avancé
              </a>{" "}
              et activez le mode Développeur (tenez compte de l'avertissement affiché).
            </li>
            <li>Dans le menu « + » du composeur de chat, activez le mode Développeur.</li>
            <li>Cliquez sur « Add sources », puis « Connect more ».</li>
            <li>Nommez le connecteur et collez l'URL ci-dessus.</li>
            <li>Demandez à ChatGPT d'utiliser Tout Suite Annonces.</li>
          </ol>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-foreground">Claude</h2>
          <ol className="mt-3 space-y-2 list-decimal list-inside text-sm text-muted-foreground">
            <li>
              Ouvrez{" "}
              <a
                className="text-primary underline"
                href="https://claude.ai/customize/connectors?modal=add-custom-connector"
                target="_blank"
                rel="noreferrer"
              >
                Claude → Connecteurs → Ajouter un connecteur personnalisé
              </a>
              .
            </li>
            <li>Nommez le connecteur et collez l'URL ci-dessus.</li>
            <li>
              Activez le connecteur depuis le composeur de chat, puis demandez à Claude d'utiliser
              Tout Suite Annonces.
            </li>
          </ol>
        </section>

        <p className="mt-10 text-sm text-muted-foreground">
          Une fois connecté, l'assistant peut rechercher des annonces, consulter leurs détails et
          lister les catégories.
        </p>
      </main>
      <Footer />
    </div>
  );
};

export default Connect;
