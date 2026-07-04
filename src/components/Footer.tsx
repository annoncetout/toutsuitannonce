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
        { label: "Emploi", to: "/annonces?categorie=emploi" },
        { label: "Mode & Beauté", to: "/annonces?categorie=mode" },
      ],
    },
    {
      title: "À propos",
      links: [
        { label: "Qui sommes-nous", to: "/qui-sommes-nous" },
        { label: "Blog", to: "#" },
        { label: "Carrières", to: "#" },
        { label: "Presse", to: "#" },
      ],
    },
    {
      title: "Aide",
      links: [
        { label: "Centre d'aide", to: "#" },
        { label: "Conditions", to: "#" },
        { label: "Confidentialité", to: "#" },
        { label: "Connecter un assistant IA", to: "/connect" },
        { label: "Contact", to: "#" },
      ],
    },
  ];

  return (
    <footer className="border-t border-border bg-card/40">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <Logo />
            <p className="mt-4 text-sm text-muted-foreground max-w-xs">
              La plateforme numéro 1 pour tous vos annonces simples, rapides et efficaces.
            </p>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <h3 className="font-semibold text-foreground mb-4">{c.title}</h3>
              <ul className="space-y-2">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <Link to={l.to} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} TOUT DE SUITE Annonces. Tous droits réservés.</span>
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
