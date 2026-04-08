// app/api/create-payment-intent/route.js
//
// Flux sécurisé + idempotent :
// 1. Reçoit un checkoutToken unique par tentative de paiement (généré côté front)
// 2. Tente d'insérer la réservation avec ON CONFLICT (checkout_token) DO NOTHING
//    → si le token existe déjà, récupère la réservation existante
// 3. Cherche un Customer Stripe existant par email, le crée seulement si absent
// 4. Crée ou récupère le PaymentIntent Stripe lié à cette réservation
// 5. Retourne clientSecret + paymentIntentId au front
//
// Garanti : un retry réseau ou un clic "Réessayer" ne crée jamais deux réservations
// pour le même checkout_token. Un même parent ne crée jamais deux Customer Stripe.

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { amount, customerEmail, description, reservationPayload, checkoutToken } =
      await request.json();

    if (!amount || typeof amount !== "number" || amount <= 0)
      return Response.json({ error: "Montant invalide" }, { status: 400 });
    if (!reservationPayload)
      return Response.json({ error: "Payload manquant" }, { status: 400 });
    if (!checkoutToken || typeof checkoutToken !== "string" || checkoutToken.length < 8)
      return Response.json({ error: "checkoutToken manquant ou invalide" }, { status: 400 });

    // ── 1. Chercher une réservation existante pour ce checkoutToken ───────────
    const { data: existing, error: lookupError } = await supabaseAdmin
      .from("reservations")
      .select("id, reservation_number, stripe_payment_intent_id")
      .eq("checkout_token", checkoutToken)
      .maybeSingle();

    if (lookupError) throw lookupError;

    let reservationId, reservationNumber, existingPiId;

    if (existing) {
      reservationId     = existing.id;
      reservationNumber = existing.reservation_number;
      existingPiId      = existing.stripe_payment_intent_id;
    } else {
      const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc(
        "create_reservation",
        {
          payload: {
            ...reservationPayload,
            status:         "pending_payment",
            checkout_token: checkoutToken,
          },
        }
      );

      if (rpcError) throw rpcError;

      const rpcResult = Array.isArray(rpcData) ? rpcData[0] : rpcData;

      if (!rpcResult?.ok && rpcResult?.code === "23505") {
        const { data: race, error: raceError } = await supabaseAdmin
          .from("reservations")
          .select("id, reservation_number, stripe_payment_intent_id")
          .eq("checkout_token", checkoutToken)
          .maybeSingle();

        if (raceError) throw raceError;
        if (!race) throw new Error("Conflit checkout_token mais réservation introuvable");

        reservationId     = race.id;
        reservationNumber = race.reservation_number;
        existingPiId      = race.stripe_payment_intent_id;
      } else {
        if (!rpcResult?.ok) throw new Error(rpcResult?.error || "Erreur Supabase");

        reservationId     = rpcResult.reservation_id;
        reservationNumber = rpcResult.reservation_number;
        existingPiId      = null;
      }
    }

    // ── 2. Réutiliser ou créer le PaymentIntent Stripe ────────────────────────
    let paymentIntent;

    if (existingPiId) {
      paymentIntent = await stripe.paymentIntents.retrieve(existingPiId);

      if (["succeeded", "canceled"].includes(paymentIntent.status)) {
        existingPiId = null;
      }
    }

    if (!existingPiId) {
      // ── Chercher un Customer Stripe existant par email ──────────────────────
      // Évite de créer un doublon si le même parent s'inscrit plusieurs fois.
      let customerId;

      if (customerEmail) {
        const existingCustomers = await stripe.customers.list({
          email: customerEmail,
          limit: 1,
        });

        if (existingCustomers.data.length > 0) {
          // Client déjà connu → réutiliser
          customerId = existingCustomers.data[0].id;
        } else {
          // Nouveau client → créer
          const newCustomer = await stripe.customers.create({
            email: customerEmail,
            name:  reservationPayload.tutor?.nom1 || undefined,
            metadata: {
              checkout_token: checkoutToken,
            },
          });
          customerId = newCustomer.id;
        }
      }

      paymentIntent = await stripe.paymentIntents.create({
        amount:               Math.round(amount * 100),
        currency:             "cad",
        payment_method_types: ["card"],
        customer:             customerId || undefined,
        receipt_email:        customerEmail || undefined,
        description:          description || "Camp de Jour Karaté — Été 2026",
        metadata: {
          reservation_id:     reservationId,
          reservation_number: reservationNumber,
          checkout_token:     checkoutToken,
          source:             "camp-karate-2026",
        },
      });

      // Lier le PI à la réservation pour le polling
      const { error: linkError } = await supabaseAdmin
        .from("reservations")
        .update({ stripe_payment_intent_id: paymentIntent.id })
        .eq("id", reservationId);

      if (linkError) {
        console.error(
          `Impossible de lier PI ${paymentIntent.id} à la résa ${reservationId}:`,
          linkError.message
        );
      }
    }

    return Response.json({
      clientSecret:    paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      reservationId,
    });
  } catch (err) {
    console.error("create-payment-intent error:", err);
    return Response.json(
      { error: err.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}