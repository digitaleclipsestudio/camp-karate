// app/api/reservation-status/route.js
//
// Polling endpoint : le front appelle cette route toutes les 2.5s
// après confirmPayment() pour savoir si le webhook a confirmé la réservation.
//
// GET /api/reservation-status?pi=pi_xxxxx
//
// Retourne :
//   { status: "pending" }                              → pas encore traité
//   { status: "confirmed", reservation_number: "..." } → confirmé
//   { status: "failed" }                               → paiement échoué

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const pi = searchParams.get("pi");

  if (!pi || !pi.startsWith("pi_")) {
    return Response.json({ error: "Paramètre pi invalide" }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("reservations")
      .select("status, reservation_number")
      .eq("stripe_payment_intent_id", pi)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      // La réservation existe forcément (créée par create-payment-intent)
      // mais stripe_payment_intent_id peut ne pas encore être indexé → pending
      return Response.json({ status: "pending" });
    }

    // Retourner le statut tel quel — le front interprète "confirmed" / "failed"
    return Response.json({
      status:             data.status,
      reservation_number: data.reservation_number,
    });
  } catch (err) {
    console.error("reservation-status error:", err);
    return Response.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
