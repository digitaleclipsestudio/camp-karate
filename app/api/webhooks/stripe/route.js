// app/api/webhooks/stripe/route.js
//
// Sécurité :
// - Vérifie la signature HMAC Stripe avant tout traitement
// - Idempotent : UPDATE ... WHERE status = 'pending_payment'
//   → si le webhook arrive deux fois, le second UPDATE ne trouve rien et est ignoré
// - Aucune donnée sensible dans les metadata Stripe (seulement reservation_id)

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  const body      = await request.text(); // body brut — obligatoire pour la vérif HMAC
  const signature = request.headers.get("stripe-signature");

  // ── 1. Vérifier la signature Stripe (HMAC SHA-256) ──────────────────────────
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Signature webhook invalide:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // ── 2. Paiement réussi ───────────────────────────────────────────────────────
  if (event.type === "payment_intent.succeeded") {
    const pi            = event.data.object;
    const reservationId = pi.metadata?.reservation_id;

    if (!reservationId) {
      // PaymentIntent sans reservation_id → pas créé par ce formulaire, ignorer
      console.warn("PI sans reservation_id ignoré:", pi.id);
      return new Response("OK", { status: 200 });
    }

    // ── 3. Confirmer la réservation — IDEMPOTENT ────────────────────────────
    // L'UPDATE ne s'applique que si status = 'pending_payment'.
    // Si le webhook arrive deux fois, le second UPDATE affecte 0 lignes → no-op.
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("reservations")
      .update({
        status:                   "confirmed",
        stripe_payment_intent_id: pi.id,
        expires_at:               null, // annuler l'expiration
        updated_at:               new Date().toISOString(),
      })
      .eq("id", reservationId)
      .eq("status", "pending_payment") // garde idempotente
      .select("id, reservation_number")
      .maybeSingle();

    if (updateError) {
      console.error("Erreur UPDATE réservation:", updateError);
      return new Response("DB Error", { status: 500 }); // Stripe réessaiera
    }

    if (!updated) {
      // Déjà confirmée (webhook dupliqué) ou réservation introuvable
      console.log(`PI ${pi.id} : réservation déjà traitée ou introuvable — ignoré`);
      return new Response("OK", { status: 200 });
    }

    console.log(`✅ Réservation confirmée : ${updated.reservation_number} (PI: ${pi.id})`);
  }

  // ── 4. Paiement échoué / annulé ─────────────────────────────────────────────
  if (
    event.type === "payment_intent.payment_failed" ||
    event.type === "payment_intent.canceled"
  ) {
    const pi            = event.data.object;
    const reservationId = pi.metadata?.reservation_id;

    if (reservationId) {
      await supabaseAdmin
        .from("reservations")
        .update({
          status:     "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", reservationId)
        .eq("status", "pending_payment"); // idempotent
    }
  }

  return new Response("OK", { status: 200 });
}