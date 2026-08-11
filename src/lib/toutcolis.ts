// Shared constants & helpers for the TOUT COLIS module.

export const SENEGAL_CITIES = [
  "Dakar",
  "Thiès",
  "Touba",
  "Saint-Louis",
  "Kaolack",
  "Ziguinchor",
  "Mbour",
  "Diourbel",
  "Louga",
  "Tambacounda",
  "Kolda",
  "Matam",
  "Fatick",
  "Kaffrine",
  "Sédhiou",
  "Kédougou",
  "Rufisque",
  "Richard-Toll",
];

export const COUNTRIES = [
  "Sénégal",
  "France",
  "Mali",
  "Mauritanie",
  "Gambie",
  "Guinée",
  "Côte d'Ivoire",
  "Maroc",
  "Espagne",
  "Italie",
  "États-Unis",
  "Canada",
  "Autre",
];

export const PARCEL_TYPES = [
  "Document",
  "Colis standard",
  "Vêtements",
  "Électronique",
  "Nourriture",
  "Médicaments",
  "Meuble / volumineux",
  "Autre",
];

export const VEHICLE_TYPES = [
  "Voiture",
  "Camionnette",
  "Camion",
  "Bus",
  "Moto",
  "Avion (bagage)",
  "Bateau",
];

export const DELIVERY_MODES = [
  "Point à point",
  "À domicile",
  "Retrait en agence",
];

export const formatFcfa = (value?: number | null, currency = "FCFA") =>
  value === null || value === undefined || Number.isNaN(value)
    ? "À négocier"
    : `${new Intl.NumberFormat("fr-FR").format(Number(value))} ${currency}`;

export const formatDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }) : "Flexible";

export const buildWhatsAppLink = (phone?: string | null, message?: string) => {
  if (!phone) return null;
  const digits = phone.replace(/[^\d]/g, "");
  if (!digits) return null;
  const normalized = digits.startsWith("221") || digits.length > 9 ? digits : `221${digits}`;
  return `https://wa.me/${normalized}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
};
