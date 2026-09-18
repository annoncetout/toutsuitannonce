import { Lock } from "lucide-react";
import { Link } from "react-router-dom";
import Logo from "./Logo";

const Footer = () => {
  const cols: { title: string; links: { label: string; to: string }[] }[] = [
    {
      title: "Catégories",
      links: [
        { label: "Immobilier", to: "/annonces?categorie=immobilier" },
        { label: "Véhicules", to: "/annonces?categorie=vehicules" },
        { label: "Électronique", to: "/annonces?categorie=electronique" },
        { label: "emploi", to: "/annonces?categorie=emploi" },
        { label: "Mode & Beauté", to: "/annonces?categorie=mode" },
      ],
    },
    {
      title: "À propos",
      links: [
        { label: "Qui sommes-nous", to: "/qui-sommes-nous" },
        { label: "Blog", to: "/annonces" },
        { label: "Carrières", to: "/qui-sommes-nous#carrieres" },
        { label: "Presse", to: "/qui-sommes-nous#presse" },
      ],
    },
    {
      title: "Aide",
      links: [
        { label: "Centre d'aide", to: "/qui-sommes-nous#aide" },
        { label: "Conditions d'utilisation", to: "/conditions" },
        { label: "Confidentialité", to: "/confidentialite" },
        { label: "Connecter un assistant IA", to: "/connect" },
        { label: "Contact", to: "mailto:contact@toutsuiteannonces.com" },
      ],
    },
  ];

  return (
    <footer className="border-t border-border bg-card/40">
      <div className="container mx-auto px-4 py-9 sm:py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-8">
          <div className="col-span-2 md:col-span-1">
            <Logo />
            <p className="mt-4 text-sm text-muted-foreground max-w-xs">
              La plateforme numéro 1 pour toutes vos annonces — simples, rapides et efficaces.
            </p>
          </div>
          {cols.map((c) => (
            <div key={c.title} className={c.title === "Aide" ? "col-span-2 sm:col-span-1" : ""}>
              <h3 className="font-semibold text-foreground mb-4">{c.title}</h3>
              <ul className="space-y-2">
                {c.links.map((l) => (
                  <li key={l.label}>
                    {l.to.startsWith("mailto:") ? (
                      <a href={l.to} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                        {l.label}
                      </a>
                    ) : (
                      <Link to={l.to} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-9 sm:mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left text-xs text-muted-foreground safe-bottom">
          <span>© {new Date().getFullYear()} TOUT DE SUITE Annonces.<br className="sm:hidden" /> Tous droits réservés.</span>
          <Link
            to="/admin/login"
            aria-label="Administration"
            title="Administration"
            className="inline-flex items-center justify-center text-muted-foreground/60 hover:text-primary transition-colors"
          >
            <Lock className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
