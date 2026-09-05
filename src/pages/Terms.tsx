import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useSEO } from "@/lib/seo";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-2">
    <h2 className="text-xl font-semibold text-foreground">{title}</h2>
    <div className="text-sm text-muted-foreground leading-relaxed space-y-2">{children}</div>
  </section>
);

const Terms = () => {
  useSEO({
    title: "Conditions d'utilisation — ToutSuiteAnnonces",
    description:
      "Conditions générales d'utilisation de ToutSuiteAnnonces : règles de publication, responsabilités, contenus interdits, comptes, commandes et colis.",
    canonical: "https://www.toutsuiteannonces.com/conditions",
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-10 max-w-3xl space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Conditions d'utilisation</h1>
          <p className="text-sm text-muted-foreground">
            Dernière mise à jour : septembre 2026. En utilisant ToutSuiteAnnonces, vous acceptez les
            présentes conditions.
          </p>
        </header>

        <Section title="1. Objet de la plateforme">
          <p>
            ToutSuiteAnnonces est une plateforme de petites annonces permettant aux utilisateurs de
            découvrir, publier et consulter des produits et services, ainsi qu'un service d'envoi de
            colis entre particuliers et transporteurs (« Tout Colis »).
          </p>
        </Section>

        <Section title="2. Règles de publication des annonces">
          <ul className="list-disc pl-5 space-y-1">
            <li>Les annonces doivent décrire fidèlement le produit ou le service proposé ;</li>
            <li>Les photos publiées doivent correspondre au bien réel ;</li>
            <li>Le prix indiqué doit être le prix réel demandé ;</li>
            <li>Une même annonce ne doit pas être publiée en double ;</li>
            <li>ToutSuiteAnnonces se réserve le droit de modérer ou retirer toute annonce non conforme.</li>
          </ul>
        </Section>

        <Section title="3. Responsabilités des utilisateurs">
          <p>
            Les utilisateurs sont seuls responsables du contenu qu'ils publient et des transactions
            qu'ils concluent. ToutSuiteAnnonces est un intermédiaire de mise en relation et n'est pas
            partie aux ventes réalisées entre utilisateurs.
          </p>
        </Section>

        <Section title="4. Contenus interdits">
          <ul className="list-disc pl-5 space-y-1">
            <li>Produits illégaux, contrefaits ou dangereux ;</li>
            <li>Contenus haineux, discriminatoires ou à caractère sexuel impliquant des mineurs ;</li>
            <li>Annonces frauduleuses, trompeuses ou visant à escroquer ;</li>
            <li>Usurpation d'identité ou fausses coordonnées ;</li>
            <li>Armes, stupéfiants et tout bien dont la vente est interdite par la loi.</li>
          </ul>
        </Section>

        <Section title="5. Fonctionnement des comptes">
          <p>
            La création d'un compte est gratuite. Vous êtes responsable de la confidentialité de vos
            identifiants. Un compte peut être suspendu en cas de manquement aux présentes conditions.
            Vous pouvez demander la suppression de votre compte à tout moment.
          </p>
        </Section>

        <Section title="6. Commandes, paiements et colis">
          <p>
            Les commandes et paiements effectués sur la plateforme sont traités par des prestataires
            de paiement sécurisés. Pour le service « Tout Colis », l'expéditeur déclare le contenu du
            colis sous sa responsabilité ; les objets illégaux ou dangereux sont interdits. Les
            transporteurs et expéditeurs conviennent entre eux des modalités de prise en charge et de
            livraison.
          </p>
        </Section>

        <Section title="7. Propriété intellectuelle">
          <p>
            Le nom, le logo et le contenu éditorial de ToutSuiteAnnonces sont protégés. Vous conservez
            les droits sur les contenus que vous publiez, tout en accordant à la plateforme le droit
            de les afficher dans le cadre du service.
          </p>
        </Section>

        <Section title="8. Contact">
          <p>
            Pour toute question concernant ces conditions, contactez l'administrateur à l'adresse :{" "}
            <a href="mailto:contact@toutsuiteannonces.com" className="text-primary underline">
              contact@toutsuiteannonces.com
            </a>
            .
          </p>
        </Section>
      </main>
      <Footer />
    </div>
  );
};

export default Terms;
