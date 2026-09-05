import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useSEO } from "@/lib/seo";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-2">
    <h2 className="text-xl font-semibold text-foreground">{title}</h2>
    <div className="text-sm text-muted-foreground leading-relaxed space-y-2">{children}</div>
  </section>
);

const PrivacyPolicy = () => {
  useSEO({
    title: "Politique de confidentialité — ToutSuiteAnnonces",
    description:
      "Politique de confidentialité de ToutSuiteAnnonces : données collectées, Google OAuth, cookies, stockage, droits des utilisateurs et suppression de compte.",
    canonical: "https://www.toutsuiteannonces.com/confidentialite",
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-10 max-w-3xl space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Politique de confidentialité</h1>
          <p className="text-sm text-muted-foreground">
            Dernière mise à jour : septembre 2026. ToutSuiteAnnonces est une plateforme de petites
            annonces permettant aux utilisateurs de découvrir, publier et consulter des produits et
            services.
          </p>
        </header>

        <Section title="1. Données collectées lors de l'inscription">
          <p>
            Lors de la création d'un compte, nous collectons votre adresse e-mail et un mot de passe
            (chiffré, jamais stocké en clair). Si vous choisissez la connexion avec Google, nous
            recevons de Google votre nom, votre adresse e-mail et votre photo de profil si elle est
            disponible. Ces informations servent uniquement à créer et identifier votre compte.
          </p>
        </Section>

        <Section title="2. Données utilisées pour publier des annonces">
          <p>
            Pour publier une annonce, nous enregistrons le titre, la description, le prix, la
            catégorie, la localisation, les photos que vous téléversez et, si vous l'indiquez, un
            numéro de téléphone de contact affiché sur l'annonce.
          </p>
        </Section>

        <Section title="3. Favoris, messages, commandes et colis">
          <p>
            Nous conservons vos annonces favorites, vos conversations avec les autres utilisateurs,
            vos commandes et vos demandes d'envoi de colis (origine, destination, type et poids du
            colis) afin d'assurer le fonctionnement du service et le suivi de vos échanges.
          </p>
        </Section>

        <Section title="4. Cookies et technologies nécessaires">
          <p>
            Nous utilisons des cookies strictement nécessaires au fonctionnement du site : cookie de
            session (pour vous garder connecté) et préférences locales (par exemple votre choix
            concernant la bannière de cookies). Avec votre consentement, des cookies de mesure
            d'audience (Google Analytics) nous aident à comprendre l'utilisation du site. Vous
            pouvez refuser ces cookies facultatifs via la bannière de consentement.
          </p>
        </Section>

        <Section title="5. Connexion avec Google (OAuth)">
          <p>
            La connexion via Google est proposée pour simplifier votre inscription. Google nous
            transmet, avec votre autorisation : votre nom, votre adresse e-mail et votre photo de
            profil si disponible. Nous n'avons jamais accès à votre mot de passe Google. Vous pouvez
            révoquer cet accès à tout moment depuis les paramètres de votre compte Google.
          </p>
        </Section>

        <Section title="6. Finalité de l'utilisation des données">
          <ul className="list-disc pl-5 space-y-1">
            <li>Créer et gérer votre compte ;</li>
            <li>Publier et afficher vos annonces ;</li>
            <li>Permettre la mise en relation entre utilisateurs ;</li>
            <li>Gérer les commandes, paiements et envois de colis ;</li>
            <li>Vous envoyer des notifications liées à votre activité (messages, statut d'annonce) ;</li>
            <li>Assurer la sécurité et la modération de la plateforme.</li>
          </ul>
        </Section>

        <Section title="7. Stockage et protection des données">
          <p>
            Vos données sont stockées sur des serveurs sécurisés (infrastructure cloud chiffrée en
            transit via HTTPS). Les mots de passe sont hachés et les sessions sont gérées par des
            cookies sécurisés. L'accès aux données est limité aux opérations nécessaires au service.
          </p>
        </Section>

        <Section title="8. Vos droits">
          <p>
            Vous pouvez à tout moment consulter et modifier vos informations depuis votre espace « Mon
            compte », demander la rectification de vos données, ou demander la suppression de votre
            compte et de vos données en nous contactant à l'adresse ci-dessous.
          </p>
        </Section>

        <Section title="9. Suppression du compte et des données">
          <p>
            La suppression de votre compte entraîne la suppression de vos annonces, favoris, messages
            et données personnelles associées. Certaines informations peuvent être conservées
            temporairement lorsque la loi ou la résolution d'un litige l'exige.
          </p>
        </Section>

        <Section title="10. Contact">
          <p>
            Pour toute question relative à vos données personnelles, contactez l'administrateur de
            ToutSuiteAnnonces à l'adresse :{" "}
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

export default PrivacyPolicy;
