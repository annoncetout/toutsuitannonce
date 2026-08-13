import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { buildWhatsAppLink } from "@/lib/toutcolis";

/**
 * Les coordonnées des transporteurs ne sont plus publiques : elles sont servies
 * par une fonction sécurisée réservée aux utilisateurs connectés.
 */
export const contactTransporter = async (transporterId: string, message: string) => {
  const { data, error } = await supabase.rpc("get_transporter_contact", {
    _transporter_id: transporterId,
  });
  const contact = Array.isArray(data) ? data[0] : null;
  if (error || !contact) {
    toast.error("Coordonnées indisponibles", {
      description: "Connectez-vous pour contacter ce transporteur.",
    });
    return;
  }
  const link = buildWhatsAppLink(contact.whatsapp ?? contact.phone, message);
  if (!link) {
    toast.error("Ce transporteur n'a pas renseigné de numéro de contact.");
    return;
  }
  window.open(link, "_blank", "noopener,noreferrer");
};
