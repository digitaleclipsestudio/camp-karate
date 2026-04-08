"use client";

import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { supabase } from "./lib/supabaseClient";

// ─── Stripe ──────────────────────────────────────────────────────────────────
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

// ─── Tarifs & taxes ──────────────────────────────────────────────────────────
const PRICE_BY_RANK  = [165, 150, 140];
const TSHIRT_PRICE   = 17.40;
const TPS_RATE       = 0.05;
const TVQ_RATE       = 0.09975;
const TSHIRT_TPS     = TSHIRT_PRICE * TPS_RATE;
const TSHIRT_TVQ     = TSHIRT_PRICE * TVQ_RATE;
const TSHIRT_TOTAL   = TSHIRT_PRICE + TSHIRT_TPS + TSHIRT_TVQ;

const steps = ["Semaines", "Enfant(s)", "Tuteur(s)", "Extras", "Vérification", "Paiement", "Confirmation"];

const newChild = () => ({
  id: Math.random().toString(36).slice(2),
  firstName: "", lastName: "", age: "", sex: "",
  ramq: "", dobA: "", dobM: "", dobJ: "",
  medication: "", allergies: "",
  tdah: false, tourette: false, tsa: false, asthme: false, rien: false, autres: "", scolarise: false,
});

const priceFor   = (index) => PRICE_BY_RANK[Math.min(index, PRICE_BY_RANK.length - 1)];
const fmt        = (n) => n.toFixed(2);

// ─── Styles ──────────────────────────────────────────────────────────────────
const styleTag = `
  @import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;600;700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Nunito', sans-serif; background: #fff5f5; min-height: 100vh; }
  .reservation-app { min-height: 100vh; background: linear-gradient(160deg, #fff5f5 0%, #fffbe6 100%); position: relative; overflow-x: hidden; }
  .bg-blob { position: fixed; border-radius: 50%; filter: blur(80px); opacity: 0.25; pointer-events: none; z-index: 0; }
  .header { text-align: center; padding: 48px 24px 32px; position: relative; z-index: 1; }
  .header-badge { display: inline-block; background: #CC0000; color: white; font-family: 'Fredoka One', cursive; font-size: 13px; letter-spacing: 2px; text-transform: uppercase; padding: 6px 18px; border-radius: 20px; margin-bottom: 16px; }
  .header h1 { font-family: 'Fredoka One', cursive; font-size: clamp(2.2rem, 6vw, 3.8rem); color: #1a0000; line-height: 1.1; margin-bottom: 12px; }
  .header h1 span { color: #CC0000; }
  .header p { color: #666; font-size: 1.1rem; font-weight: 600; }
  .container { max-width: 820px; margin: 0 auto; padding: 0 20px 80px; position: relative; z-index: 1; }
  .stepper { display: flex; align-items: center; justify-content: center; gap: 0; margin-bottom: 36px; flex-wrap: nowrap; overflow-x: auto; padding-bottom: 8px; }
  .step-item { display: flex; align-items: center; gap: 0; }
  .step-circle { width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px; border: 3px solid #e0d5c8; background: white; color: #aaa; transition: all 0.3s; flex-shrink: 0; }
  .step-circle.active { border-color: #CC0000; background: #CC0000; color: white; box-shadow: 0 0 0 4px rgba(204,0,0,0.2); }
  .step-circle.done   { border-color: #FFD700; background: #FFD700; color: #111; }
  .step-label { font-size: 11px; font-weight: 700; color: #aaa; margin-top: 4px; white-space: nowrap; text-align: center; }
  .step-label.active { color: #CC0000; }
  .step-label.done   { color: #b8960a; }
  .step-connector { width: 32px; height: 3px; background: #e0d5c8; flex-shrink: 0; }
  .step-connector.done { background: #FFD700; }
  .step-wrapper { display: flex; flex-direction: column; align-items: center; }
  .card { background: white; border-radius: 24px; padding: 36px; box-shadow: 0 8px 40px rgba(0,0,0,0.08); border: 1.5px solid #f0e8df; animation: fadeUp 0.4s ease; }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  .section-title { font-family: 'Fredoka One', cursive; font-size: 1.6rem; color: #1a0000; margin-bottom: 6px; }
  .section-sub   { color: #888; font-size: 0.95rem; font-weight: 600; margin-bottom: 28px; }
  .weeks-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 28px; }
  @media (max-width: 560px) { .weeks-grid { grid-template-columns: 1fr; } }
  .week-card { border: 2.5px solid #ece5db; border-radius: 16px; padding: 16px 18px; cursor: pointer; transition: all 0.22s; background: #fdfaf7; position: relative; overflow: hidden; }
  .week-card:hover:not(.full) { border-color: #CC0000; transform: translateY(-2px); box-shadow: 0 6px 20px rgba(204,0,0,0.15); }
  .week-card.selected { border-color: #CC0000; background: #fff5f5; box-shadow: 0 6px 24px rgba(204,0,0,0.2); }
  .week-card.full { opacity: 0.5; cursor: not-allowed; background: #f5f5f5; }
  .week-check { position: absolute; top: 12px; right: 12px; width: 24px; height: 24px; border-radius: 50%; background: #CC0000; color: white; font-size: 13px; display: flex; align-items: center; justify-content: center; font-weight: 900; }
  .week-label { font-family: 'Fredoka One', cursive; font-size: 1rem; color: #1a0000; margin-bottom: 2px; }
  .week-dates { font-size: 0.82rem; color: #888; font-weight: 600; margin-bottom: 8px; }
  .week-spots { display: flex; align-items: center; gap: 8px; }
  .spots-bar  { flex: 1; height: 6px; background: #f0e8df; border-radius: 10px; overflow: hidden; }
  .spots-fill { height: 100%; border-radius: 10px; transition: width 0.4s; }
  .spots-text { font-size: 0.78rem; font-weight: 800; white-space: nowrap; }
  .full-badge { display: inline-block; background: #CC0000; color: white; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; }
  .summary-bar { background: linear-gradient(135deg, #fff5f5, #fffbe6); border: 2px solid #ffd0d0; border-radius: 16px; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
  .summary-bar .label { font-size: 0.9rem; color: #888; font-weight: 700; }
  .summary-bar .value { font-family: 'Fredoka One', cursive; font-size: 1.3rem; color: #CC0000; }
  .price-info { background: #fffbe6; border: 2px solid #FFD700; border-radius: 14px; padding: 14px 18px; margin-bottom: 20px; display: flex; gap: 20px; flex-wrap: wrap; justify-content: center; }
  .price-chip .pc-label { font-size: 0.75rem; font-weight: 800; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
  .price-chip .pc-val   { font-family: 'Fredoka One', cursive; font-size: 1.2rem; color: #CC0000; }
  .price-chip .pc-sub   { font-size: 0.72rem; color: #b8960a; font-weight: 800; }
  .child-block { border: 2px solid #ece5db; border-radius: 16px; padding: 22px; margin-bottom: 16px; background: #fdfaf7; position: relative; }
  .child-block.child-2 { border-color: #ffd0a0; background: #fffbf5; }
  .child-block.child-3 { border-color: #ffd0d0; background: #fff5f5; }
  .child-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
  .child-title { font-family: 'Fredoka One', cursive; font-size: 1.1rem; color: #1a0000; display: flex; align-items: center; gap: 10px; }
  .child-price-badge { display: inline-block; font-family: 'Fredoka One', cursive; font-size: 0.88rem; padding: 4px 12px; border-radius: 20px; font-weight: 400; }
  .badge-1 { background: #fff5f5; color: #CC0000; border: 1.5px solid #ffcccc; }
  .badge-2 { background: #fff8f0; color: #cc6600; border: 1.5px solid #ffd0a0; }
  .badge-3 { background: #fffbe6; color: #b8960a; border: 1.5px solid #FFD700; }
  .btn-remove { background: none; border: 2px solid #ffe0e0; border-radius: 10px; color: #CC0000; font-size: 0.82rem; font-weight: 800; padding: 6px 12px; cursor: pointer; transition: all 0.2s; text-transform: uppercase; letter-spacing: 0.5px; }
  .btn-remove:hover { background: #fff5f5; border-color: #CC0000; }
  .btn-add-child { width: 100%; padding: 14px; border-radius: 14px; border: 2.5px dashed #e0d5c8; background: white; font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 0.97rem; color: #888; cursor: pointer; transition: all 0.22s; margin-bottom: 24px; text-transform: uppercase; letter-spacing: 0.5px; }
  .btn-add-child:hover { border-color: #CC0000; color: #CC0000; background: #fff5f5; }
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 8px; }
  @media (max-width: 560px) { .form-grid { grid-template-columns: 1fr; } }
  .form-group { display: flex; flex-direction: column; gap: 6px; }
  .form-group.full { grid-column: 1 / -1; }
  label { font-size: 0.88rem; font-weight: 800; color: #444; text-transform: uppercase; letter-spacing: 0.5px; }
  input, select, textarea { font-family: 'Nunito', sans-serif; font-size: 0.98rem; font-weight: 600; padding: 12px 16px; border: 2px solid #ece5db; border-radius: 12px; background: white; color: #1a0000; outline: none; transition: border-color 0.2s; width: 100%; }
  input:focus, select:focus, textarea:focus { border-color: #CC0000; }
  input.error { border-color: #CC0000; }
  .error-msg  { font-size: 0.8rem; color: #CC0000; font-weight: 700; }
  .yellow-box { background: #fffbe6; border: 2px solid #FFD700; border-radius: 16px; padding: 20px; margin-bottom: 16px; }
  .yellow-box-title { font-family: 'Fredoka One', cursive; font-size: 1rem; color: #b8960a; margin-bottom: 4px; }
  .yellow-box-note  { font-size: 0.8rem; color: #888; font-weight: 700; margin-bottom: 14px; }
  .red-box   { background: #fff5f5; border: 2px solid #ffcccc; border-radius: 16px; padding: 20px; margin-bottom: 16px; }
  .auth-text { font-size: 0.88rem; color: #555; font-weight: 600; line-height: 1.7; margin-bottom: 14px; }
  .legal-box { background: #fffbe6; border: 2px solid #ffe066; border-radius: 14px; padding: 14px 16px; margin-bottom: 20px; }
  .legal-text { font-size: 0.82rem; color: #666; font-weight: 700; line-height: 1.6; }
  .legal-text strong { color: #CC0000; }
  .check-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px; }
  .receipt-box { background: #fdfaf7; border: 2px solid #ece5db; border-radius: 16px; padding: 20px; margin-bottom: 24px; }
  .receipt-title { font-family: 'Fredoka One', cursive; font-size: 1rem; color: #1a0000; margin-bottom: 14px; }
  .receipt-line { display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1.5px dashed #ece5db; font-size: 0.9rem; }
  .receipt-line:last-child { border-bottom: none; }
  .receipt-line .rl-label { color: #666; font-weight: 700; }
  .receipt-line .rl-val   { font-weight: 800; color: #1a0000; }
  .receipt-line.subtotal  { border-top: 2px solid #ece5db; margin-top: 4px; }
  .receipt-line.grand-total { border-top: 3px solid #CC0000; margin-top: 4px; }
  .receipt-line.grand-total .rl-label { color: #1a0000; font-family: 'Fredoka One', cursive; font-size: 1rem; }
  .receipt-line.grand-total .rl-val   { color: #CC0000; font-family: 'Fredoka One', cursive; font-size: 1.2rem; }
  .stripe-wrapper { background: #1a0000; border-radius: 16px; padding: 24px; margin-bottom: 20px; }
  .stripe-wrapper label { color: #aaa; }
  .security-note { display: flex; align-items: center; gap: 8px; font-size: 0.82rem; color: #888; font-weight: 700; margin-bottom: 20px; }
  .stripe-error { background: #fff5f5; border: 2px solid #CC0000; border-radius: 12px; padding: 12px 16px; color: #CC0000; font-weight: 700; font-size: 0.9rem; margin-bottom: 16px; }
  .btn-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
  .btn { font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 1rem; padding: 14px 32px; border-radius: 14px; border: none; cursor: pointer; transition: all 0.22s; }
  .btn-primary { background: #CC0000; color: white; box-shadow: 0 4px 16px rgba(204,0,0,0.35); }
  .btn-primary:hover { background: #aa0000; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(204,0,0,0.4); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  .btn-secondary { background: white; color: #888; border: 2px solid #ece5db; }
  .btn-secondary:hover { border-color: #ccc; color: #555; }
  .btn-lg { padding: 16px 40px; font-size: 1.1rem; }
  .confetti-area { text-align: center; padding: 20px 0 32px; }
  .confetti-emoji { font-size: 4rem; margin-bottom: 16px; animation: bounce 1s ease infinite; }
  @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
  .confirm-title { font-family: 'Fredoka One', cursive; font-size: 2rem; color: #1a0000; margin-bottom: 8px; }
  .confirm-sub   { color: #888; font-size: 1rem; font-weight: 600; margin-bottom: 32px; }
  .confirm-summary { background: #fffbe6; border: 2px solid #FFD700; border-radius: 16px; padding: 24px; margin-bottom: 24px; }
  .confirm-row   { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1.5px dashed #ffe066; font-size: 0.95rem; }
  .confirm-row:last-child { border-bottom: none; }
  .confirm-row .key { color: #888; font-weight: 700; }
  .confirm-row .val { font-weight: 800; color: #1a0000; }
  .week-tag { display: inline-block; background: #fff5f5; border: 1.5px solid #ffcccc; color: #CC0000; font-size: 0.78rem; font-weight: 800; padding: 3px 10px; border-radius: 20px; margin: 2px 3px 2px 0; }
  .child-tag { display: inline-block; background: #fdfaf7; border: 1.5px solid #e0d5c8; color: #444; font-size: 0.82rem; font-weight: 800; padding: 4px 12px; border-radius: 20px; margin: 2px 3px 2px 0; }
  @media print {
    .bg-blob, .header-badge, .stepper, .no-print { display: none !important; }
    .reservation-app { background: white !important; }
    .header { padding: 16px 24px !important; }
    .header h1 { font-size: 1.8rem !important; }
    .card { box-shadow: none !important; border: 1px solid #ddd !important; padding: 20px !important; }
    .confirm-summary { border: 1px solid #ddd !important; }
  }
`;

// ─── Composant interne Stripe (doit être enfant de <Elements>) ───────────────
function StripePaymentForm({ total, onSuccess, onBack, loading, setLoading }) {
  const stripe   = useStripe();
  const elements = useElements();
  const [stripeError, setStripeError] = useState(null);

  const handlePay = async () => {
    if (!stripe || !elements) return;

    setStripeError(null);
    setLoading(true);

    // Valide le formulaire Stripe côté client
    const { error: submitError } = await elements.submit();
    if (submitError) {
      setStripeError(submitError.message);
      setLoading(false);
      return;
    }

    // Confirme le paiement — Stripe charge la carte
    const { paymentIntent, error: confirmError } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (confirmError) {
      setStripeError(confirmError.message);
      setLoading(false);
      return;
    }

    // Paiement Stripe OK → passer le PI id (issu de confirmPayment) au parent
    onSuccess(paymentIntent?.id);
  };

  return (
    <>
      {stripeError && (
        <div className="stripe-error">⚠️ {stripeError}</div>
      )}
      <div className="stripe-wrapper">
        <PaymentElement
          options={{
            layout: "tabs",
            fields: { billingDetails: { name: "auto", email: "auto" } },
          }}
        />
      </div>
      <div className="security-note">
        🔒 Paiement sécurisé par Stripe — Chiffrement SSL 256 bits
      </div>
      <div className="btn-row">
        <button type="button" className="btn btn-secondary" onClick={onBack} disabled={loading}>
          ← Retour
        </button>
        <button
          type="button"
          className="btn btn-primary btn-lg"
          onClick={handlePay}
          disabled={!stripe || !elements || loading}
        >
          {loading ? "⏳ Traitement..." : `Payer — ${fmt(total)} $`}
        </button>
      </div>
    </>
  );
}

// ─── Composant principal ─────────────────────────────────────────────────────
export default function CampKarate() {
  const [step, setStep]         = useState(0);
  const [selectedWeeks, setSel] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [errors, setErrors]     = useState({});
  const [children, setChildren] = useState([newChild()]);
  const [returnToVerif, setReturnToVerif] = useState(false);
  const [dbWeeks, setDbWeeks]   = useState(null);
  const [weeksError, setWeeksError] = useState(null);
  const [confNum, setConfNum]               = useState("");
  const [paymentIntentId, setPaymentIntentId] = useState(null); // reçu du serveur, jamais splitté
  const [pollStatus, setPollStatus]         = useState("waiting"); // waiting | confirmed | failed
  const [pollTrigger, setPollTrigger]       = useState(0); // incrémenté pour relancer le polling
  const [retryTrigger, setRetryTrigger]     = useState(0); // incrémenté pour relancer create-payment-intent
  // Token unique par tentative de paiement — généré à l'arrivée step 5, stable pendant tout le checkout.
  // Envoyé au serveur pour garantir l'idempotence : un retry réseau réutilise la même réservation.
  const [checkoutToken, setCheckoutToken]   = useState(null);

  // Stripe : clientSecret + paymentIntentId obtenus depuis l'API route
  const [clientSecret, setClientSecret] = useState(null);
  const [clientSecretError, setClientSecretError] = useState(null);

  const [tutor, setTutor] = useState({
    nom1: "", nom2: "", recu: "", recuNom: "", nas: "",
    adresse: "", ville: "", cp: "",
    tel1: "", tel2: "", telUrg: "", nomUrg: "", courriel: "",
  });

  const [extras, setExtras] = useState({
    photo: null, signature: "",
    tshirts: [{ want: false, size: "", type: "", size2: "", type2: "", qty: 1 }],
  });

  // ─── Calculs prix ────────────────────────────────────────────────────────
  const totalPerChild    = children.map((_, i) => selectedWeeks.length * priceFor(i));
  const subTotal         = totalPerChild.reduce((a, b) => a + b, 0);
  const nbGiftedShirts   = selectedWeeks.length >= 2 ? children.length : 0;
  const nbPaidShirts     = extras.tshirts.filter(t => t.want).reduce((sum, t) => sum + (t.qty || 1), 0);
  const tshirtSousTotal  = nbPaidShirts * TSHIRT_PRICE;
  const tshirtTPS        = nbPaidShirts * TSHIRT_TPS;
  const tshirtTVQ        = nbPaidShirts * TSHIRT_TVQ;
  const tshirtTotal      = nbPaidShirts * TSHIRT_TOTAL;
  const nbTshirts        = nbGiftedShirts + nbPaidShirts;
  const total            = subTotal + tshirtTotal;

  // ─── Chargement semaines ─────────────────────────────────────────────────
  const loadWeeks = async () => {
    const { data, error } = await supabase
      .from("week_availability")
      .select("*")
      .order("starts_on", { ascending: true });
    if (error) {
      setWeeksError(error.message);
      setDbWeeks([]);
      return;
    }
    setWeeksError(null);
    setDbWeeks(data || []);
  };

  useEffect(() => { loadWeeks(); }, []);

  // ─── Reset loading à chaque changement d'étape ──────────────────────────
  useEffect(() => {
    setLoading(false);
  }, [step]);

  // ─── Obtenir le clientSecret Stripe quand on arrive à l'étape paiement ──
  useEffect(() => {
    if (step !== 5) return;
    // Pas de guard "if (clientSecret) return" ici —
    // retryTrigger doit pouvoir relancer même si un clientSecret précédent existait

    // Générer le checkoutToken une seule fois par session de paiement.
    // Un retry réseau ou un clic "Réessayer" conserve le même token → pas de doublon.
    // Un vrai abandon + retour à l'étape 5 génère un nouveau token.
    const token = checkoutToken ?? crypto.randomUUID();
    if (!checkoutToken) setCheckoutToken(token);

    const fetchSecret = async () => {
      setClientSecretError(null);
      try {
        const reservationPayload = buildReservationPayload();
        const res = await fetch("/api/create-payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: total,
            customerEmail: tutor.courriel,
            description: `Camp Karaté Été 2026 — ${children.map(c => `${c.firstName} ${c.lastName}`).join(", ")}`,
            reservationPayload,
            checkoutToken: token, // identifiant stable pour idempotence serveur
          }),
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || "Erreur serveur");
        setClientSecret(data.clientSecret);
        setPaymentIntentId(data.paymentIntentId); // propre — vient du serveur
      } catch (err) {
        console.error("PaymentIntent error:", err);
        setClientSecretError("Impossible d'initialiser le paiement. Veuillez réessayer.");
      }
    };
    fetchSecret();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, retryTrigger]);

  // ─── Polling après paiement Stripe : attend que le webhook confirme ──────
  useEffect(() => {
    if (step !== 6 || !paymentIntentId) return;
    if (pollStatus === "confirmed" || pollStatus === "failed") return;

    let attempts = 0;
    const MAX_ATTEMPTS = 24; // 24 × 2.5s = 60s max

    const poll = async () => {
      try {
        const res = await fetch(`/api/reservation-status?pi=${paymentIntentId}`);
        const data = await res.json();
        if (data.status === "confirmed") {
          setConfNum(data.reservation_number || "");
          setPollStatus("confirmed");
          await loadWeeks();
        } else if (data.status === "failed" || data.status === "cancelled") {
          setPollStatus("failed");
        } else {
          attempts++;
          if (attempts < MAX_ATTEMPTS) {
            setTimeout(poll, 2500);
          } else {
            // Timeout : on accepte quand même (le webhook peut arriver en retard)
            setPollStatus("failed");
          }
        }
      } catch {
        attempts++;
        if (attempts < MAX_ATTEMPTS) setTimeout(poll, 2500);
        else setPollStatus("failed");
      }
    };

    poll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, paymentIntentId, pollTrigger]);

  // ─── Helpers semaines ────────────────────────────────────────────────────
  const weeksSource   = dbWeeks ?? [];
  const getWeekById   = (id) => weeksSource.find(w => String(w.id) === String(id));
  const getBooked     = (w) => typeof w?.booked_children === "number" ? w.booked_children : (w?.booked ?? 0);
  const getCapacity   = (w) => typeof w?.spots === "number" ? w.spots : (w?.capacity ?? 0);
  const getAvailable  = (w) => typeof w?.available_spots === "number" ? w.available_spots : getCapacity(w) - getBooked(w);

  const formatWeekDates = (w) => {
    if (w?.starts_on && w?.ends_on) {
      const s = new Date(w.starts_on + "T12:00:00");
      const e = new Date(w.ends_on   + "T12:00:00");
      const sStr = s.toLocaleDateString("fr-CA", { day: "numeric", month: "long" });
      const eStr = e.toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" });
      return `${sStr} – ${eStr}`;
    }
    return w?.dates_text || w?.dates || "";
  };

  // ─── Gestion enfants ─────────────────────────────────────────────────────
  const updateChild = (idx, field, val) => {
    setChildren(prev => prev.map((c, i) => {
      if (i !== idx) return c;
      if (field === "rien" && val === true)
        return { ...c, rien: true, tdah: false, tourette: false, tsa: false, asthme: false };
      if (["tdah", "tourette", "tsa", "asthme"].includes(field) && val === true)
        return { ...c, [field]: val, rien: false };
      return { ...c, [field]: val };
    }));
  };

  const addChild = () => {
    const newCount = children.length + 1;
    const blocked = selectedWeeks.some(id => {
      const w = getWeekById(id);
      return w && getAvailable(w) < newCount;
    });
    if (blocked) return;
    setChildren(c => [...c, newChild()]);
    setExtras(e => ({ ...e, tshirts: [...e.tshirts, { want: false, size: "", type: "", size2: "", type2: "", qty: 1 }] }));
  };

  const removeChild = (idx) => {
    if (children.length === 1) return;
    setChildren(c => c.filter((_, i) => i !== idx));
    setExtras(e => ({ ...e, tshirts: e.tshirts.filter((_, i) => i !== idx) }));
  };

  const updateTshirt = (idx, field, val) =>
    setExtras(e => ({ ...e, tshirts: e.tshirts.map((t, i) => i === idx ? { ...t, [field]: val } : t) }));

  const toggleWeek = (id) => {
    const week = getWeekById(id);
    if (!week) return;
    const available = getAvailable(week);
    if (available <= 0) return;
    if (!selectedWeeks.includes(id) && children.length > available) return;
    setSel(prev => prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id]);
  };

  // ─── Validations ─────────────────────────────────────────────────────────
  const normalizePhone = (v) => {
    let d = v.replace(/\D/g, "");
    if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
    return d;
  };
  const isValidPhone = (v) => normalizePhone(v).length === 10;
  const formatPhone  = (v) => {
    const d = normalizePhone(v).slice(0, 10);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0,3)}-${d.slice(3)}`;
    return `${d.slice(0,3)}-${d.slice(3,6)}-${d.slice(6)}`;
  };
  const formatNas = (v) => {
    const d = v.replace(/\D/g, "").slice(0, 9);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0,3)} ${d.slice(3)}`;
    return `${d.slice(0,3)} ${d.slice(3,6)} ${d.slice(6)}`;
  };

  const validateChildrenStep = (e) => {
    const overbooked = selectedWeeks.filter(id => {
      const w = getWeekById(id);
      return w && getAvailable(w) < children.length;
    });
    if (overbooked.length > 0) {
      e.spots = `Places insuffisantes pour ${children.length} enfants : ${overbooked.map(id => getWeekById(id)?.label).join(", ")}`;
    }
    children.forEach((c, i) => {
      if (!c.firstName.trim()) e[`fn${i}`]   = "Requis";
      if (!c.lastName.trim())  e[`ln${i}`]   = "Requis";
      const age = parseInt(c.age);
      if (c.age === "" || c.age === null || c.age === undefined) e[`age${i}`] = "Requis";
      else if (isNaN(age) || age < 5) e[`age${i}`] = "Âge minimum : 5 ans";
      else if (age > 17)              e[`age${i}`] = "Âge maximum : 17 ans";
      if (!c.sex)              e[`sx${i}`]   = "Requis";
      if (!c.ramq.trim())      e[`ramq${i}`] = "Requis";
      else if (!/^[A-Za-z]{4}\d{8}$/.test(c.ramq.replace(/\s/g, ""))) e[`ramq${i}`] = "Format : ABCD 0000 0000";
      const dobA = parseInt(c.dobA), dobM = parseInt(c.dobM), dobJ = parseInt(c.dobJ);
      if (!c.dobA || !c.dobM || !c.dobJ) {
        e[`dob${i}`] = "Requis";
      } else if (isNaN(dobA) || dobA < 1900 || dobA > new Date().getFullYear()) {
        e[`dob${i}`] = "Année invalide";
      } else if (isNaN(dobM) || dobM < 1 || dobM > 12) {
        e[`dob${i}`] = "Mois invalide (01-12)";
      } else if (isNaN(dobJ) || dobJ < 1 || dobJ > 31) {
        e[`dob${i}`] = "Jour invalide (01-31)";
      } else {
        const testDate = new Date(dobA, dobM - 1, dobJ);
        if (testDate.getFullYear() !== dobA || testDate.getMonth() !== dobM - 1 || testDate.getDate() !== dobJ) {
          e[`dob${i}`] = "Date invalide";
        }
      }
      if (!c.medication.trim()) e[`med${i}`] = "Requis";
      if (!c.allergies.trim())  e[`all${i}`] = "Requis";
      if (!c.tdah && !c.tourette && !c.tsa && !c.asthme && !c.rien) e[`cond${i}`] = "Veuillez cocher au moins une case";
      if (!c.scolarise) e[`scol${i}`] = "Requis — votre enfant doit être déjà scolarisé";
    });
  };

  const validateTutorStep = (e) => {
    if (!tutor.nom1.trim())    e.tutorNom1    = "Requis";
    if (!tutor.recu)           e.tutorRecu    = "Requis";
    if (tutor.recu === "oui") {
      if (!tutor.recuNom.trim()) e.tutorRecuNom = "Requis";
      if (!tutor.nas.trim())     e.tutorNas     = "Requis";
      else if (!/^\d{3}[\s]?\d{3}[\s]?\d{3}$/.test(tutor.nas.trim())) e.tutorNas = "Format : 000 000 000";
    }
    if (!tutor.adresse.trim()) e.tutorAdresse = "Requis";
    if (!tutor.ville.trim())   e.tutorVille   = "Requis";
    if (!tutor.cp.trim())      e.tutorCp      = "Requis";
    else if (!/^[A-Za-z]\d[A-Za-z][\s]?\d[A-Za-z]\d$/.test(tutor.cp.trim())) e.tutorCp = "Format : H0H 0H0";
    if (!tutor.tel1.trim())    e.tutorTel1 = "Requis";
    else if (!isValidPhone(tutor.tel1)) e.tutorTel1 = "Format : 450-222-6989";
    if (!tutor.tel2.trim())    e.tutorTel2 = "Requis";
    else if (!isValidPhone(tutor.tel2)) e.tutorTel2 = "Format : 450-222-6989";
    if (!tutor.telUrg.trim())  e.tutorTelUrg = "Requis";
    else if (!isValidPhone(tutor.telUrg)) e.tutorTelUrg = "Format : 450-222-6989";
    if (!tutor.nomUrg.trim())  e.tutorNomUrg   = "Requis";
    if (!tutor.courriel.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tutor.courriel)) e.tutorCourriel = "Courriel invalide";
  };

  const validateExtrasStep = (e) => {
    if (extras.photo === null)    e.photo     = "Requis";
    if (!extras.signature.trim()) e.signature = "Requis";
    extras.tshirts.forEach((t, i) => {
      if (selectedWeeks.length >= 2 && !t.size) e[`giftSize${i}`] = "Taille requise";
      if (selectedWeeks.length >= 2 && !t.type) e[`giftType${i}`] = "Type requis";
      if (t.want && !t.size2) e[`extraSize${i}`] = "Taille requise";
      if (t.want && !t.type2) e[`extraType${i}`] = "Type requis";
    });
  };

  const validateStep = () => {
    const e = {};
    if (step === 1) validateChildrenStep(e);
    if (step === 2) validateTutorStep(e);
    if (step === 3) validateExtrasStep(e);
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ─── Payload Supabase ─────────────────────────────────────────────────────
  const buildReservationPayload = () => {
    const tshirtsPayload = children.flatMap((c, i) => {
      const t = extras.tshirts[i];
      const rows = [];
      if (selectedWeeks.length >= 2) {
        rows.push({
          child_sort_order: i, is_gift: true, want: true, want_extra: false,
          size: t?.size || null, shirt_type: t?.type || null,
          qty: 1, quantity: 1, unit_price: 0, price: 0,
        });
      }
      if (t?.want) {
        const qty = t.qty || 1;
        rows.push({
          child_sort_order: i, is_gift: false, want: true, want_extra: true,
          size: t.size2 || null, shirt_type: t.type2 || null,
          qty, quantity: qty, unit_price: TSHIRT_PRICE, price: TSHIRT_PRICE,
        });
      }
      return rows;
    });

    return {
      pay_method: "full",
      status: "pending_payment",
      tutor: {
        nom1: tutor.nom1, nom2: tutor.nom2, recu: tutor.recu,
        recuNom: tutor.recuNom, nas: tutor.nas,
        adresse: tutor.adresse, ville: tutor.ville, cp: tutor.cp,
        tel1: tutor.tel1, tel2: tutor.tel2,
        telUrg: tutor.telUrg, nomUrg: tutor.nomUrg, courriel: tutor.courriel,
      },
      photo_consent: extras.photo,
      signature: extras.signature,
      camps_subtotal:   +subTotal.toFixed(2),
      extras_subtotal:  +tshirtSousTotal.toFixed(2),
      tps_amount:       +tshirtTPS.toFixed(2),
      tvq_amount:       +tshirtTVQ.toFixed(2),
      total_amount:     +total.toFixed(2),
      week_ids:  selectedWeeks,
      weeks:     selectedWeeks,
      children: children.map((c, i) => ({
        sort_order: i,
        first_name: c.firstName, last_name: c.lastName,
        age: parseInt(c.age, 10), sex: c.sex, ramq: c.ramq,
        dob_year: parseInt(c.dobA, 10), dob_month: parseInt(c.dobM, 10), dob_day: parseInt(c.dobJ, 10),
        medication: c.medication, allergies: c.allergies,
        tdah: c.tdah, tourette: c.tourette, tsa: c.tsa, asthme: c.asthme,
        rien: c.rien, autres: c.autres || null, scolarise: c.scolarise,
        weekly_price: priceFor(i),
      })),
      tshirts: tshirtsPayload,
    };
  };

  // ─── Appelé par StripePaymentForm : paiement Stripe confirmé côté client ────
  // Le webhook côté serveur s'occupe de créer la réservation dans Supabase.
  // On poll /api/reservation-status jusqu'à ce qu'elle soit confirmée.
  const handlePaymentSuccess = async (piId) => {
    setPaymentIntentId(piId);
    setStep(6); // Affiche l'écran d'attente → le polling prend le relais
  };

  const next = () => {
    if (step === 0 && selectedWeeks.length === 0) return;
    if (!validateStep()) {
      setTimeout(() => {
        const firstError = document.querySelector(".error-msg");
        if (firstError) firstError.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
      return;
    }
    if (returnToVerif && step !== 4) {
      const missingGiftInfo = selectedWeeks.length >= 2 && extras.tshirts.some(t => !t.size || !t.type);
      setReturnToVerif(false);
      setStep(missingGiftInfo ? 3 : 4);
    } else {
      setStep(s => s + 1);
    }
  };

  // ─── Sous-composants UI ───────────────────────────────────────────────────
  const rStyle = (sel) => ({
    display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
    padding: "9px 16px",
    background: sel ? "#fff5f5" : "#fdfaf7",
    border: sel ? "2px solid #CC0000" : "2px solid #ece5db",
    borderRadius: 12, fontSize: "0.88rem", fontWeight: 800,
    color: sel ? "#CC0000" : "#888",
    textTransform: "uppercase", letterSpacing: "0.5px", transition: "all 0.2s",
  });

  const Radio = ({ opts, val, onChange, name }) => (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {opts.map(o => (
        <label key={o.v} style={rStyle(val === o.v)}>
          <input type="radio" name={name} checked={val === o.v} onChange={() => onChange(o.v)} style={{ display: "none" }} />{o.l}
        </label>
      ))}
    </div>
  );

  const Chk = ({ checked, onChange, label }) => (
    <label style={{ ...rStyle(checked), justifyContent: "center" }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ display: "none" }} />
      {checked ? "✓ " : ""}{label}
    </label>
  );

  const badgeClass = (i) => i === 0 ? "badge-1" : i === 1 ? "badge-2" : "badge-3";
  const childColor = (i) => i === 0 ? "" : i === 1 ? " child-2" : " child-3";
  const ordinal    = (i) => `${i + 1}${i === 0 ? "er" : "e"}`;
  const maskRamq   = (v) => { const c = v.replace(/\s/g, ""); return c.length < 4 ? v : `${c.slice(0,4)} **** ****`; };
  const pad2       = (v) => String(v).padStart(2, "0");

  const EditBanner = () => (
    <div style={{ background: "#fffbe6", border: "2px solid #FFD700", borderRadius: 12, padding: "10px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10, fontSize: "0.9rem", fontWeight: 800, color: "#b8960a" }}>
      ✏️ Mode modification — cliquez Continuer pour retourner à la vérification
    </div>
  );

  // ─── Rendu ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{styleTag}</style>
      <div className="reservation-app">
        <div className="bg-blob" style={{ width: 500, height: 500, background: "#CC0000", top: -100, right: -150 }} />
        <div className="bg-blob" style={{ width: 400, height: 400, background: "#FFD700", bottom: 100, left: -100 }} />
        <div className="bg-blob" style={{ width: 300, height: 300, background: "#880000", top: "40%", left: "30%" }} />

        <div className="header">
          <div className="header-badge">🥋 Inscriptions · Été 2026</div>
          <h1>Camp de Jour<br /><span>Karaté</span></h1>
          <p>9h–15h · Garde 7h–9h &amp; 15h30–17h</p>
          <p style={{ marginTop: 6 }}>5 ans et plus · Déjà scolarisé (maternelle ou plus)</p>
          <p style={{ marginTop: 8, fontSize: "0.85rem", color: "#999", fontWeight: 600 }}>
            📋 La RAMQ de l'enfant ainsi que le NAS du parent (si reçu fiscal demandé) seront requis lors de l'inscription.
          </p>
        </div>

        <div className="container">
          <div className="stepper">
            {steps.map((s, i) => (
              <div key={i} className="step-item">
                <div className="step-wrapper">
                  <div className={`step-circle ${i === step ? "active" : i < step ? "done" : ""}`}>
                    {i < step ? "✓" : i + 1}
                  </div>
                  <div className={`step-label ${i === step ? "active" : i < step ? "done" : ""}`}>{s}</div>
                </div>
                {i < steps.length - 1 && <div className={`step-connector ${i < step ? "done" : ""}`} />}
              </div>
            ))}
          </div>

          {/* ── STEP 0 : SEMAINES ── */}
          {step === 0 && (
            <div className="card">
              {returnToVerif && <EditBanner />}
              <div className="section-title">Choisissez vos semaines 🗓️</div>
              <div className="section-sub">Sélectionnez une ou plusieurs semaines. Les mêmes semaines s'appliquent à tous les enfants.</div>
              <div className="price-info">
                <div className="price-chip"><div className="pc-label">1er enfant</div><div className="pc-val">165 $</div><div className="pc-sub">par semaine</div></div>
                <div className="price-chip"><div className="pc-label">2e enfant</div><div className="pc-val">150 $</div><div className="pc-sub">par semaine</div></div>
                <div className="price-chip"><div className="pc-label">3e enfant +</div><div className="pc-val">140 $</div><div className="pc-sub">par semaine</div></div>
              </div>
              {dbWeeks === null && <div style={{ textAlign: "center", padding: "20px 0", color: "#888", fontWeight: 700 }}>⏳ Chargement des disponibilités...</div>}
              {weeksError && <div style={{ background: "#fff5f5", border: "2px solid #CC0000", borderRadius: 12, padding: "12px 16px", marginBottom: 16, color: "#CC0000", fontWeight: 800, fontSize: "0.9rem" }}>⚠️ Impossible de charger les disponibilités. Veuillez rafraîchir la page.</div>}
              {dbWeeks !== null && !weeksError && dbWeeks.length === 0 && <div style={{ textAlign: "center", padding: "20px 0", color: "#888", fontWeight: 700 }}>Aucune semaine disponible pour le moment.</div>}
              <div className="weeks-grid">
                {weeksSource.map(w => {
                  const available       = getAvailable(w);
                  const booked          = getBooked(w);
                  const capacity        = getCapacity(w);
                  const pct             = capacity > 0 ? (booked / capacity) * 100 : 0;
                  const isSelected      = selectedWeeks.includes(w.id);
                  const enoughForFamily = available >= children.length;
                  const isFull          = available <= 0;
                  const isBlocked       = isFull || !enoughForFamily;
                  const barColor        = pct > 80 ? "#CC0000" : pct > 50 ? "#ff9800" : "#22c55e";
                  return (
                    <div key={w.id} className={`week-card ${isSelected ? "selected" : ""} ${isBlocked ? "full" : ""}`} onClick={() => !isBlocked && toggleWeek(w.id)}>
                      {isSelected && <div className="week-check">✓</div>}
                      <div className="week-label">🥋 {w.label}</div>
                      <div className="week-dates">{formatWeekDates(w)}</div>
                      <div className="week-spots">
                        <div className="spots-bar"><div className="spots-fill" style={{ width: `${pct}%`, background: barColor }} /></div>
                        {isFull ? (
                          <span className="full-badge">Complet</span>
                        ) : !enoughForFamily ? (
                          <span className="spots-text" style={{ color: "#CC0000" }}>Pas assez pour {children.length} enfant{children.length > 1 ? "s" : ""}</span>
                        ) : (
                          <span className="spots-text" style={{ color: barColor }}>{available} place{available > 1 ? "s" : ""}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {selectedWeeks.length > 0 && (
                <div className="summary-bar">
                  <div><div className="label">Semaines choisies</div><div className="value">{selectedWeeks.length}</div></div>
                  <div><div className="label">1er enfant</div><div className="value">{selectedWeeks.length * 165} $</div></div>
                  <div><div className="label">2e enfant</div><div className="value">{selectedWeeks.length * 150} $</div></div>
                  <div><div className="label">3e enfant +</div><div className="value">{selectedWeeks.length * 140} $</div></div>
                </div>
              )}
              <div className="btn-row">
                <div />
                <button type="button" className="btn btn-primary btn-lg" onClick={next} disabled={selectedWeeks.length === 0}>Continuer →</button>
              </div>
            </div>
          )}

          {/* ── STEP 1 : ENFANTS ── */}
          {step === 1 && (
            <div className="card">
              {returnToVerif && <EditBanner />}
              {errors.spots && (
                <div style={{ background: "#fff5f5", border: "2px solid #CC0000", borderRadius: 12, padding: "12px 16px", marginBottom: 16, color: "#CC0000", fontWeight: 800, fontSize: "0.9rem" }}>
                  ⚠️ {errors.spots}
                </div>
              )}
              <div className="section-title">Informations des enfant(s) 👦👧</div>
              <div className="section-sub">Tous les champs sont obligatoires.</div>

              {children.map((c, idx) => (
                <div key={c.id} className={`child-block${childColor(idx)}`}>
                  <div className="child-header">
                    <div className="child-title">
                      🥋 {ordinal(idx)} enfant
                      <span className={`child-price-badge ${badgeClass(idx)}`}>{priceFor(idx)} $/sem.</span>
                    </div>
                    {children.length > 1 && (
                      <button type="button" className="btn-remove" onClick={() => removeChild(idx)}>✕ Retirer</button>
                    )}
                  </div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Prénom *</label>
                      <input className={errors[`fn${idx}`] ? "error" : ""} value={c.firstName} onChange={e => updateChild(idx, "firstName", e.target.value)} placeholder="Ex : Léa" />
                      {errors[`fn${idx}`] && <span className="error-msg">{errors[`fn${idx}`]}</span>}
                    </div>
                    <div className="form-group">
                      <label>Nom *</label>
                      <input className={errors[`ln${idx}`] ? "error" : ""} value={c.lastName} onChange={e => updateChild(idx, "lastName", e.target.value)} placeholder="Ex : Tremblay" />
                      {errors[`ln${idx}`] && <span className="error-msg">{errors[`ln${idx}`]}</span>}
                    </div>
                    <div className="form-group">
                      <label>Âge *</label>
                      <input type="number" min="5" max="17" className={errors[`age${idx}`] ? "error" : ""} value={c.age} onChange={e => updateChild(idx, "age", e.target.value)} placeholder="8" />
                      {errors[`age${idx}`] && <span className="error-msg">{errors[`age${idx}`]}</span>}
                    </div>
                    <div className="form-group">
                      <label>Sexe *</label>
                      <Radio name={`sex${idx}`} val={c.sex} onChange={v => updateChild(idx, "sex", v)} opts={[{ v: "F", l: "F" }, { v: "M", l: "M" }]} />
                      {errors[`sx${idx}`] && <span className="error-msg">{errors[`sx${idx}`]}</span>}
                    </div>
                    <div className="form-group">
                      <label># RAMQ *</label>
                      <input className={errors[`ramq${idx}`] ? "error" : ""} value={c.ramq} onChange={e => updateChild(idx, "ramq", e.target.value)} placeholder="XXXX 0000 0000" />
                      {errors[`ramq${idx}`] && <span className="error-msg">{errors[`ramq${idx}`]}</span>}
                    </div>
                    <div className="form-group">
                      <label>Date de naissance * (A / M / J)</label>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                        <input placeholder="AAAA" value={c.dobA} onChange={e => updateChild(idx, "dobA", e.target.value)} maxLength={4} />
                        <input placeholder="MM"   value={c.dobM} onChange={e => updateChild(idx, "dobM", e.target.value)} maxLength={2} />
                        <input placeholder="JJ"   value={c.dobJ} onChange={e => updateChild(idx, "dobJ", e.target.value)} maxLength={2} />
                      </div>
                      {errors[`dob${idx}`] && <span className="error-msg">{errors[`dob${idx}`]}</span>}
                    </div>
                    <div className="form-group full">
                      <label>Médication * <span style={{ fontWeight: 600, textTransform: "none", letterSpacing: 0 }}>(inscrivez "Aucune" si non applicable)</span></label>
                      <input className={errors[`med${idx}`] ? "error" : ""} value={c.medication} onChange={e => updateChild(idx, "medication", e.target.value)} placeholder="Nom et dosage, ou Aucune" />
                      {errors[`med${idx}`] && <span className="error-msg">{errors[`med${idx}`]}</span>}
                    </div>
                    <div className="form-group full">
                      <label>Allergies * <span style={{ fontWeight: 600, textTransform: "none", letterSpacing: 0 }}>(inscrivez "Aucune" si non applicable)</span></label>
                      <input className={errors[`all${idx}`] ? "error" : ""} value={c.allergies} onChange={e => updateChild(idx, "allergies", e.target.value)} placeholder="Alimentaires, médicamenteuses, ou Aucune" />
                      {errors[`all${idx}`] && <span className="error-msg">{errors[`all${idx}`]}</span>}
                    </div>
                    <div className="form-group full">
                      <label>Conditions de santé * <span style={{ fontWeight: 600, textTransform: "none", letterSpacing: 0 }}>(cochez tout ce qui s'applique)</span></label>
                      <div className="check-grid">
                        {[{ key: "tdah", label: "TDAH" }, { key: "tourette", label: "Tourette" }, { key: "tsa", label: "TSA" }, { key: "asthme", label: "Asthme" }, { key: "rien", label: "Aucune" }].map(({ key, label }) => (
                          <Chk key={key} label={label} checked={c[key]} onChange={v => updateChild(idx, key, v)} />
                        ))}
                      </div>
                      {errors[`cond${idx}`] && <span className="error-msg">{errors[`cond${idx}`]}</span>}
                    </div>
                    <div className="form-group full">
                      <label>Autres précisions</label>
                      <input value={c.autres} onChange={e => updateChild(idx, "autres", e.target.value)} placeholder="Autre condition médicale ou information importante..." />
                    </div>
                    <div className="form-group full" style={{ marginTop: 8 }}>
                      <label>Scolarisation * <span style={{ fontWeight: 600, textTransform: "none", letterSpacing: 0 }}>(obligatoire pour participer au camp)</span></label>
                      <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", padding: "12px 16px", background: c.scolarise ? "#fff5f5" : "#fdfaf7", border: c.scolarise ? "2px solid #CC0000" : "2px solid #ece5db", borderRadius: 12, transition: "all 0.2s" }}>
                        <input type="checkbox" checked={c.scolarise} onChange={e => updateChild(idx, "scolarise", e.target.checked)} style={{ width: 18, height: 18, accentColor: "#CC0000", cursor: "pointer" }} />
                        <span style={{ fontSize: "0.95rem", fontWeight: 700, color: c.scolarise ? "#CC0000" : "#888", textTransform: "none", letterSpacing: 0 }}>
                          Je confirme que {children.length > 1 ? "mes enfants sont déjà scolarisés" : "mon enfant est déjà scolarisé"} (maternelle ou plus)
                        </span>
                      </label>
                      {errors[`scol${idx}`] && <span className="error-msg">{errors[`scol${idx}`]}</span>}
                    </div>
                  </div>
                </div>
              ))}

              {children.length < 5 && (() => {
                const newCount = children.length + 1;
                const blocked = selectedWeeks.some(id => { const w = getWeekById(id); return w && getAvailable(w) < newCount; });
                return (
                  <>
                    <button type="button" className="btn-add-child" onClick={addChild} disabled={blocked} style={blocked ? { opacity: 0.4, cursor: "not-allowed" } : {}}>
                      + Ajouter un enfant · {ordinal(children.length)} enfant → {priceFor(children.length)} $/sem.
                    </button>
                    {blocked && <div style={{ marginTop: 8, color: "#CC0000", fontSize: "0.82rem", fontWeight: 700 }}>⚠️ Impossible d'ajouter un autre enfant : une semaine sélectionnée n'a pas assez de places.</div>}
                  </>
                );
              })()}

              <div className="summary-bar" style={{ marginBottom: 24 }}>
                {children.map((c, i) => (
                  <div key={c.id}><div className="label">{c.firstName || `Enfant ${i + 1}`}</div><div className="value">{selectedWeeks.length * priceFor(i)} $</div></div>
                ))}
                <div><div className="label">Total semaines</div><div className="value">{subTotal} $</div></div>
              </div>
              <div className="btn-row">
                <button type="button" className="btn btn-secondary" onClick={() => setStep(0)}>← Retour</button>
                <button type="button" className="btn btn-primary" onClick={next}>Continuer →</button>
              </div>
            </div>
          )}

          {/* ── STEP 2 : TUTEUR ── */}
          {step === 2 && (
            <div className="card">
              {returnToVerif && <EditBanner />}
              <div className="section-title">Coordonnées du ou des tuteurs 👪</div>
              <div className="section-sub">Tous les champs marqués * sont obligatoires.</div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Nom du tuteur 1 *</label>
                  <input className={errors.tutorNom1 ? "error" : ""} value={tutor.nom1} onChange={e => setTutor({ ...tutor, nom1: e.target.value })} placeholder="Prénom et nom" autoComplete="name" />
                  {errors.tutorNom1 && <span className="error-msg">{errors.tutorNom1}</span>}
                </div>
                <div className="form-group">
                  <label>Nom du tuteur 2</label>
                  <input value={tutor.nom2} onChange={e => setTutor({ ...tutor, nom2: e.target.value })} placeholder="Prénom et nom (optionnel)" autoComplete="name" />
                </div>
                <div className="form-group full">
                  <label>Reçu fiscal *</label>
                  <Radio name="recu" val={tutor.recu} onChange={v => setTutor({ ...tutor, recu: v })} opts={[{ v: "oui", l: "Oui" }, { v: "non", l: "Non" }]} />
                  {errors.tutorRecu && <span className="error-msg">{errors.tutorRecu}</span>}
                </div>
                {tutor.recu === "oui" && <>
                  <div className="form-group">
                    <label>Nom au reçu *</label>
                    <input className={errors.tutorRecuNom ? "error" : ""} value={tutor.recuNom} onChange={e => setTutor({ ...tutor, recuNom: e.target.value })} placeholder="Nom complet" />
                    {errors.tutorRecuNom && <span className="error-msg">{errors.tutorRecuNom}</span>}
                  </div>
                  <div className="form-group">
                    <label>NAS *</label>
                    <input className={errors.tutorNas ? "error" : ""} value={tutor.nas} onChange={e => setTutor({ ...tutor, nas: formatNas(e.target.value) })} placeholder="000 000 000" maxLength={11} autoComplete="off" />
                    {errors.tutorNas && <span className="error-msg">{errors.tutorNas}</span>}
                  </div>
                </>}
                <div className="form-group full">
                  <label>Adresse *</label>
                  <input className={errors.tutorAdresse ? "error" : ""} value={tutor.adresse} onChange={e => setTutor({ ...tutor, adresse: e.target.value })} placeholder="Numéro et rue" />
                  {errors.tutorAdresse && <span className="error-msg">{errors.tutorAdresse}</span>}
                </div>
                <div className="form-group">
                  <label>Ville *</label>
                  <input className={errors.tutorVille ? "error" : ""} value={tutor.ville} onChange={e => setTutor({ ...tutor, ville: e.target.value })} placeholder="Ville" />
                  {errors.tutorVille && <span className="error-msg">{errors.tutorVille}</span>}
                </div>
                <div className="form-group">
                  <label>Code postal *</label>
                  <input className={errors.tutorCp ? "error" : ""} value={tutor.cp} onChange={e => setTutor({ ...tutor, cp: e.target.value })} placeholder="H0H 0H0" autoComplete="postal-code" />
                  {errors.tutorCp && <span className="error-msg">{errors.tutorCp}</span>}
                </div>
                <div className="form-group">
                  <label>Tél. (1) *</label>
                  <input className={errors.tutorTel1 ? "error" : ""} value={tutor.tel1} onChange={e => setTutor({ ...tutor, tel1: formatPhone(e.target.value) })} placeholder="450-222-6989" autoComplete="tel" />
                  {errors.tutorTel1 && <span className="error-msg">{errors.tutorTel1}</span>}
                </div>
                <div className="form-group">
                  <label>Tél. (2) *</label>
                  <input className={errors.tutorTel2 ? "error" : ""} value={tutor.tel2} onChange={e => setTutor({ ...tutor, tel2: formatPhone(e.target.value) })} placeholder="450-222-6989" autoComplete="tel" />
                  {errors.tutorTel2 && <span className="error-msg">{errors.tutorTel2}</span>}
                </div>
                <div className="form-group">
                  <label>Tél. urgence *</label>
                  <input className={errors.tutorTelUrg ? "error" : ""} value={tutor.telUrg} onChange={e => setTutor({ ...tutor, telUrg: formatPhone(e.target.value) })} placeholder="450-222-6989" autoComplete="tel" />
                  {errors.tutorTelUrg && <span className="error-msg">{errors.tutorTelUrg}</span>}
                </div>
                <div className="form-group">
                  <label>Nom (urgence) *</label>
                  <input className={errors.tutorNomUrg ? "error" : ""} value={tutor.nomUrg} onChange={e => setTutor({ ...tutor, nomUrg: e.target.value })} placeholder="Prénom et nom" />
                  {errors.tutorNomUrg && <span className="error-msg">{errors.tutorNomUrg}</span>}
                </div>
                <div className="form-group full">
                  <label>Courriel *</label>
                  <input type="email" className={errors.tutorCourriel ? "error" : ""} value={tutor.courriel} onChange={e => setTutor({ ...tutor, courriel: e.target.value })} placeholder="courriel@exemple.ca" autoComplete="email" />
                  {errors.tutorCourriel && <span className="error-msg">{errors.tutorCourriel}</span>}
                </div>
              </div>
              <div className="btn-row">
                <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>← Retour</button>
                <button type="button" className="btn btn-primary" onClick={next}>Continuer →</button>
              </div>
            </div>
          )}

          {/* ── STEP 3 : EXTRAS ── */}
          {step === 3 && (
            <div className="card">
              {returnToVerif && <EditBanner />}
              <div className="section-title">Options & Autorisations 🎽</div>
              <div className="section-sub">T-Shirt par enfant, photos et signature.</div>

              <div className="yellow-box">
                <div className="yellow-box-title">🥋 T-Shirt du dojo</div>
                <div className="yellow-box-note">Un t-shirt noir est obligatoire tous les jours. Vous pouvez commander le t-shirt officiel du dojo (17,40 $ + taxes) ou utiliser n'importe quel t-shirt noir que vous possédez déjà. 🎁 1 t-shirt offert par enfant inscrit à 2 semaines ou plus !</div>
                {children.map((c, idx) => (
                  <div key={c.id} style={{ marginBottom: idx < children.length - 1 ? 14 : 0 }}>
                    <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: "0.9rem", color: "#1a0000", marginBottom: 8 }}>
                      {c.firstName || `Enfant ${idx + 1}`}
                    </div>
                    {selectedWeeks.length >= 2 && (
                      <div style={{ background: "#f0fff4", border: "1.5px solid #22c55e", borderRadius: 10, padding: "10px 14px", marginBottom: 10 }}>
                        <div style={{ color: "#22c55e", fontWeight: 800, fontSize: "0.88rem", marginBottom: 8 }}>🎁 1 t-shirt offert inclus — choisissez la taille</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                          <div className="form-group">
                            <label>Taille *</label>
                            <Radio name={`ts${idx}`} val={extras.tshirts[idx]?.size || ""} onChange={v => updateTshirt(idx, "size", v)} opts={[{ v: "XS", l: "XS" }, { v: "S", l: "S" }, { v: "M", l: "M" }, { v: "L", l: "L" }]} />
                            {errors[`giftSize${idx}`] && <span className="error-msg">{errors[`giftSize${idx}`]}</span>}
                          </div>
                          <div className="form-group">
                            <label>Type *</label>
                            <Radio name={`tt${idx}`} val={extras.tshirts[idx]?.type || ""} onChange={v => updateTshirt(idx, "type", v)} opts={[{ v: "Enfant", l: "Enfant" }, { v: "Adulte", l: "Adulte" }]} />
                            {errors[`giftType${idx}`] && <span className="error-msg">{errors[`giftType${idx}`]}</span>}
                          </div>
                        </div>
                      </div>
                    )}
                    <div style={{ marginBottom: 8 }}>
                      <Chk checked={extras.tshirts[idx]?.want || false} onChange={v => updateTshirt(idx, "want", v)} label="Commander un t-shirt supplémentaire (17,40 $ + taxes)" />
                    </div>
                    {extras.tshirts[idx]?.want && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 8 }}>
                        <div className="form-group">
                          <label>Taille *</label>
                          <Radio name={`tsb${idx}`} val={extras.tshirts[idx].size2 || ""} onChange={v => updateTshirt(idx, "size2", v)} opts={[{ v: "XS", l: "XS" }, { v: "S", l: "S" }, { v: "M", l: "M" }, { v: "L", l: "L" }]} />
                          {errors[`extraSize${idx}`] && <span className="error-msg">{errors[`extraSize${idx}`]}</span>}
                        </div>
                        <div className="form-group">
                          <label>Type *</label>
                          <Radio name={`ttb${idx}`} val={extras.tshirts[idx].type2 || ""} onChange={v => updateTshirt(idx, "type2", v)} opts={[{ v: "Enfant", l: "Enfant" }, { v: "Adulte", l: "Adulte" }]} />
                          {errors[`extraType${idx}`] && <span className="error-msg">{errors[`extraType${idx}`]}</span>}
                        </div>
                        <div className="form-group">
                          <label>Quantité</label>
                          <select value={extras.tshirts[idx].qty || 1} onChange={e => updateTshirt(idx, "qty", parseInt(e.target.value))}>
                            {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </div>
                      </div>
                    )}
                    {idx < children.length - 1 && <hr style={{ border: "none", borderTop: "1.5px dashed #ffe066", margin: "14px 0" }} />}
                  </div>
                ))}
              </div>

              <div className="red-box">
                <div className="yellow-box-title" style={{ color: "#CC0000", marginBottom: 8 }}>📸 Autorisation photos & vidéos</div>
                <div className="auth-text">
                  J'autorise le Camp de Jour Karaté à prendre et à utiliser des photos ou vidéos de mon enfant dans le cadre de ses communications, notamment sur son site web et ses médias sociaux. Cette autorisation est donnée sans compensation et peut être retirée pour les utilisations futures sur demande écrite.
                </div>
                <Radio name="photo" val={extras.photo} onChange={v => setExtras({ ...extras, photo: v })} opts={[{ v: "accepte", l: "✓ J'accepte" }, { v: "refuse", l: "✗ Je refuse" }]} />
                {errors.photo && <span className="error-msg">{errors.photo}</span>}
              </div>

              <div className="legal-box">
                <div className="legal-text">
                  <strong>AUCUN REMBOURSEMENT</strong> en cas d'annulation. En signant, vous confirmez l'exactitude des informations et acceptez les conditions du Camp de Jour Karaté.
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 6 }}>
                <label>Signature du parent responsable *</label>
                <div style={{ border: "2px solid #ece5db", borderBottom: "3px solid #FFD700", borderRadius: "12px 12px 4px 4px", background: "#fdfaf7", height: 70, display: "flex", alignItems: "flex-end", padding: "8px 14px", position: "relative" }}>
                  <div style={{ position: "absolute", top: 8, left: 14, fontSize: "0.7rem", color: "#bbb", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 800 }}>Signez ici</div>
                  <input value={extras.signature} onChange={e => setExtras({ ...extras, signature: e.target.value })} placeholder="Votre nom complet" style={{ background: "transparent", border: "none", fontFamily: "'Nunito',sans-serif", fontSize: "1.3rem", fontStyle: "italic", color: "#1a0000", padding: 0, width: "100%" }} />
                </div>
                {errors.signature && <span className="error-msg">{errors.signature}</span>}
              </div>
              <div style={{ color: "#aaa", fontSize: ".75rem", fontWeight: 800, marginBottom: 20, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Date : {new Date().toLocaleDateString("fr-CA")}
              </div>

              <div className="btn-row">
                <button type="button" className="btn btn-secondary" onClick={() => setStep(2)}>← Retour</button>
                <button type="button" className="btn btn-primary" onClick={next}>Continuer →</button>
              </div>
            </div>
          )}

          {/* ── STEP 4 : VÉRIFICATION ── */}
          {step === 4 && (
            <div className="card">
              <div className="section-title">Vérification 🔍</div>
              <div className="section-sub">Vérifiez vos informations avant de procéder au paiement.</div>

              {/* Semaines */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: "1.1rem", color: "#1a0000" }}>🗓️ Semaines sélectionnées</div>
                  <button type="button" className="btn-remove" onClick={() => {
                      setReturnToVerif(true);
                      // Invalider la session de paiement : données ou montant peuvent avoir changé
                      setCheckoutToken(null); setClientSecret(null); setClientSecretError(null); setPaymentIntentId(null);
                      setStep(0);
                    }}>✏️ Modifier</button>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {selectedWeeks.map(id => { const w = getWeekById(id); return <span key={id} className="week-tag">{w?.label} · {formatWeekDates(w)}</span>; })}
                </div>
              </div>
              <hr style={{ border: "none", borderTop: "1.5px solid #f0e8df", marginBottom: 20 }} />

              {/* Enfants */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: "1.1rem", color: "#1a0000" }}>👦👧 Enfant(s)</div>
                  <button type="button" className="btn-remove" onClick={() => {
                      setReturnToVerif(true);
                      setCheckoutToken(null); setClientSecret(null); setClientSecretError(null); setPaymentIntentId(null);
                      setStep(1);
                    }}>✏️ Modifier</button>
                </div>
                {children.map((c, i) => (
                  <div key={c.id} style={{ background: "#fdfaf7", border: "1.5px solid #ece5db", borderRadius: 12, padding: "14px 16px", marginBottom: 10 }}>
                    <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: "1rem", color: "#CC0000", marginBottom: 8 }}>
                      {ordinal(i)} enfant — {c.firstName} {c.lastName} <span style={{ fontSize: "0.8rem", color: "#aaa", fontFamily: "Nunito" }}>({priceFor(i)} $/sem.)</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px", fontSize: "0.88rem" }}>
                      <div><span style={{ color: "#aaa", fontWeight: 700 }}>Âge : </span><span style={{ fontWeight: 800 }}>{c.age} ans</span></div>
                      <div><span style={{ color: "#aaa", fontWeight: 700 }}>Sexe : </span><span style={{ fontWeight: 800 }}>{c.sex}</span></div>
                      <div><span style={{ color: "#aaa", fontWeight: 700 }}>RAMQ : </span><span style={{ fontWeight: 800 }}>{maskRamq(c.ramq)}</span></div>
                      <div><span style={{ color: "#aaa", fontWeight: 700 }}>DDN : </span><span style={{ fontWeight: 800 }}>{c.dobA}-{pad2(c.dobM)}-{pad2(c.dobJ)}</span></div>
                      <div style={{ gridColumn: "1/-1" }}><span style={{ color: "#aaa", fontWeight: 700 }}>Médication : </span><span style={{ fontWeight: 800 }}>{c.medication}</span></div>
                      <div style={{ gridColumn: "1/-1" }}><span style={{ color: "#aaa", fontWeight: 700 }}>Allergies : </span><span style={{ fontWeight: 800 }}>{c.allergies}</span></div>
                      <div style={{ gridColumn: "1/-1" }}><span style={{ color: "#aaa", fontWeight: 700 }}>Conditions : </span><span style={{ fontWeight: 800 }}>
                        {[c.tdah && "TDAH", c.tourette && "Tourette", c.tsa && "TSA", c.asthme && "Asthme", c.rien && "Aucune"].filter(Boolean).join(", ")}
                      </span></div>
                      {c.autres && <div style={{ gridColumn: "1/-1" }}><span style={{ color: "#aaa", fontWeight: 700 }}>Autres : </span><span style={{ fontWeight: 800 }}>{c.autres}</span></div>}
                    </div>
                  </div>
                ))}
              </div>
              <hr style={{ border: "none", borderTop: "1.5px solid #f0e8df", marginBottom: 20 }} />

              {/* Tuteur */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: "1.1rem", color: "#1a0000" }}>👪 Parent(s) / tuteur(s)</div>
                  <button type="button" className="btn-remove" onClick={() => {
                      setReturnToVerif(true);
                      setCheckoutToken(null); setClientSecret(null); setClientSecretError(null); setPaymentIntentId(null);
                      setStep(2);
                    }}>✏️ Modifier</button>
                </div>
                <div style={{ background: "#fdfaf7", border: "1.5px solid #ece5db", borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px", fontSize: "0.88rem" }}>
                    <div style={{ gridColumn: "1/-1" }}><span style={{ color: "#aaa", fontWeight: 700 }}>Tuteur 1 : </span><span style={{ fontWeight: 800 }}>{tutor.nom1}</span></div>
                    {tutor.nom2 && <div style={{ gridColumn: "1/-1" }}><span style={{ color: "#aaa", fontWeight: 700 }}>Tuteur 2 : </span><span style={{ fontWeight: 800 }}>{tutor.nom2}</span></div>}
                    <div style={{ gridColumn: "1/-1" }}><span style={{ color: "#aaa", fontWeight: 700 }}>Adresse : </span><span style={{ fontWeight: 800 }}>{tutor.adresse}, {tutor.ville} {tutor.cp}</span></div>
                    <div><span style={{ color: "#aaa", fontWeight: 700 }}>Tél. 1 : </span><span style={{ fontWeight: 800 }}>{tutor.tel1}</span></div>
                    <div><span style={{ color: "#aaa", fontWeight: 700 }}>Tél. 2 : </span><span style={{ fontWeight: 800 }}>{tutor.tel2}</span></div>
                    <div><span style={{ color: "#aaa", fontWeight: 700 }}>Urgence : </span><span style={{ fontWeight: 800 }}>{tutor.nomUrg} · {tutor.telUrg}</span></div>
                    <div><span style={{ color: "#aaa", fontWeight: 700 }}>Courriel : </span><span style={{ fontWeight: 800 }}>{tutor.courriel}</span></div>
                    <div><span style={{ color: "#aaa", fontWeight: 700 }}>Reçu fiscal : </span><span style={{ fontWeight: 800 }}>{tutor.recu === "oui" ? `Oui — ${tutor.recuNom} (NAS masqué)` : "Non"}</span></div>
                  </div>
                </div>
              </div>
              <hr style={{ border: "none", borderTop: "1.5px solid #f0e8df", marginBottom: 20 }} />

              {/* Extras */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: "1.1rem", color: "#1a0000" }}>🎽 Options</div>
                  <button type="button" className="btn-remove" onClick={() => {
                      setReturnToVerif(true);
                      setCheckoutToken(null); setClientSecret(null); setClientSecretError(null); setPaymentIntentId(null);
                      setStep(3);
                    }}>✏️ Modifier</button>
                </div>
                <div style={{ background: "#fdfaf7", border: "1.5px solid #ece5db", borderRadius: 12, padding: "14px 16px", fontSize: "0.88rem" }}>
                  {nbGiftedShirts > 0 && (
                    <div style={{ marginBottom: 8, color: "#22c55e", fontWeight: 800 }}>
                      🎁 {nbGiftedShirts} t-shirt{nbGiftedShirts > 1 ? "s" : ""} offert{nbGiftedShirts > 1 ? "s" : ""} — {children.map((c, i) => `${c.firstName || `Enfant ${i + 1}`} : ${extras.tshirts[i]?.size || "?"} ${extras.tshirts[i]?.type || ""}`).join(" | ")}
                    </div>
                  )}
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ color: "#aaa", fontWeight: 700 }}>Extras payants : </span>
                    {nbPaidShirts > 0
                      ? <span style={{ fontWeight: 800 }}>{extras.tshirts.map((t, i) => t.want ? `${children[i]?.firstName || `Enfant ${i + 1}`} · ${t.qty || 1}× ${t.size2} ${t.type2}` : null).filter(Boolean).join(" | ")}</span>
                      : <span style={{ fontWeight: 800, color: "#888" }}>Aucun</span>
                    }
                  </div>
                  <div><span style={{ color: "#aaa", fontWeight: 700 }}>Photos : </span><span style={{ fontWeight: 800, color: extras.photo === "accepte" ? "#22c55e" : "#CC0000" }}>{extras.photo === "accepte" ? "✓ Autorisées" : "✗ Refusées"}</span></div>
                  <div style={{ marginTop: 8 }}><span style={{ color: "#aaa", fontWeight: 700 }}>Signature : </span><span style={{ fontWeight: 800, fontStyle: "italic" }}>{extras.signature}</span></div>
                </div>
              </div>
              <hr style={{ border: "none", borderTop: "1.5px solid #f0e8df", marginBottom: 20 }} />

              {/* Total */}
              <div style={{ background: "linear-gradient(135deg,#fff5f5,#fffbe6)", border: "2px solid #ffd0d0", borderRadius: 16, padding: "16px 20px", marginBottom: 24 }}>
                <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: "1rem", color: "#1a0000", marginBottom: 12 }}>💰 Résumé du montant</div>
                {children.map((c, i) => (
                  <div key={c.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", padding: "4px 0", borderBottom: "1.5px dashed #ece5db" }}>
                    <span style={{ color: "#666", fontWeight: 700 }}>{c.firstName || `Enfant ${i + 1}`} — {selectedWeeks.length} sem. × {priceFor(i)} $</span>
                    <span style={{ fontWeight: 800 }}>{fmt(selectedWeeks.length * priceFor(i))} $</span>
                  </div>
                ))}
                {nbPaidShirts > 0 && <>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", padding: "4px 0", borderBottom: "1.5px dashed #ece5db" }}>
                    <span style={{ color: "#666", fontWeight: 700 }}>T-shirts ({nbPaidShirts} × {fmt(TSHIRT_PRICE)} $)</span>
                    <span style={{ fontWeight: 800 }}>{fmt(tshirtSousTotal)} $</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", padding: "4px 0", borderBottom: "1.5px dashed #ece5db" }}>
                    <span style={{ color: "#666", fontWeight: 700 }}>TPS (5 %)</span>
                    <span style={{ fontWeight: 800 }}>{fmt(tshirtTPS)} $</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", padding: "4px 0", borderBottom: "1.5px dashed #ece5db" }}>
                    <span style={{ color: "#666", fontWeight: 700 }}>TVQ (9,975 %)</span>
                    <span style={{ fontWeight: 800 }}>{fmt(tshirtTVQ)} $</span>
                  </div>
                </>}
                {nbGiftedShirts > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", padding: "4px 0", borderBottom: "1.5px dashed #ece5db" }}>
                    <span style={{ color: "#22c55e", fontWeight: 700 }}>🎁 {nbGiftedShirts} t-shirt{nbGiftedShirts > 1 ? "s" : ""} offert{nbGiftedShirts > 1 ? "s" : ""}</span>
                    <span style={{ fontWeight: 800, color: "#22c55e" }}>Inclus</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0", marginTop: 4, borderTop: "3px solid #CC0000" }}>
                  <span style={{ fontFamily: "'Fredoka One',cursive", fontSize: "1.1rem", color: "#1a0000" }}>Total</span>
                  <span style={{ fontFamily: "'Fredoka One',cursive", fontSize: "1.3rem", color: "#CC0000" }}>{fmt(total)} $</span>
                </div>
              </div>

              <div className="btn-row">
                <button type="button" className="btn btn-secondary" onClick={() => setStep(3)}>← Retour</button>
                <button type="button" className="btn btn-primary btn-lg" onClick={next}>Tout est correct — Payer →</button>
              </div>
            </div>
          )}

          {/* ── STEP 5 : PAIEMENT STRIPE ── */}
          {step === 5 && (
            <div className="card">
              <div className="section-title">Paiement 💳</div>
              <div className="section-sub">Saisissez vos informations de paiement pour confirmer votre inscription.</div>

              {/* Récapitulatif */}
              <div className="receipt-box">
                <div className="receipt-title">🧾 Récapitulatif de votre commande</div>
                {children.map((c, i) => (
                  <div key={c.id} className="receipt-line">
                    <span className="rl-label">{c.firstName || `Enfant ${i + 1}`} — {selectedWeeks.length} sem. × {priceFor(i)} $</span>
                    <span className="rl-val">{fmt(selectedWeeks.length * priceFor(i))} $</span>
                  </div>
                ))}
                {nbGiftedShirts > 0 && (
                  <div className="receipt-line">
                    <span className="rl-label" style={{ color: "#22c55e" }}>🎁 {nbGiftedShirts} t-shirt{nbGiftedShirts > 1 ? "s" : ""} offert{nbGiftedShirts > 1 ? "s" : ""} (2 sem. ou +)</span>
                    <span className="rl-val" style={{ color: "#22c55e" }}>Inclus</span>
                  </div>
                )}
                {nbPaidShirts > 0 && <>
                  <div className="receipt-line">
                    <span className="rl-label">{nbPaidShirts} t-shirt{nbPaidShirts > 1 ? "s" : ""} supp. × {fmt(TSHIRT_PRICE)} $</span>
                    <span className="rl-val">{fmt(tshirtSousTotal)} $</span>
                  </div>
                  <div className="receipt-line">
                    <span className="rl-label" style={{ color: "#aaa" }}>TPS 5 %</span>
                    <span className="rl-val" style={{ color: "#aaa" }}>{fmt(tshirtTPS)} $</span>
                  </div>
                  <div className="receipt-line">
                    <span className="rl-label" style={{ color: "#aaa" }}>TVQ 9,975 %</span>
                    <span className="rl-val" style={{ color: "#aaa" }}>{fmt(tshirtTVQ)} $</span>
                  </div>
                  <div className="receipt-line subtotal">
                    <span className="rl-label">Sous-total extras</span>
                    <span className="rl-val">{fmt(tshirtTotal)} $</span>
                  </div>
                </>}
                <div className="receipt-line grand-total">
                  <span className="rl-label">Total</span>
                  <span className="rl-val">{fmt(total)} $</span>
                </div>
              </div>

              {/* Stripe Elements */}
              {clientSecretError && (
                <div className="stripe-error">⚠️ {clientSecretError} <button type="button" style={{ marginLeft: 12, background: "none", border: "none", color: "#CC0000", fontWeight: 800, cursor: "pointer", textDecoration: "underline" }} onClick={() => {
                      setClientSecret(null);
                      setClientSecretError(null);
                      setRetryTrigger(t => t + 1); // relance create-payment-intent sans changer de step
                    }}>Réessayer</button></div>
              )}
              {!clientSecret && !clientSecretError && (
                <div style={{ textAlign: "center", padding: "32px 0", color: "#888", fontWeight: 700 }}>⏳ Initialisation du paiement sécurisé...</div>
              )}
              {clientSecret && (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: {
                      theme: "night",
                      variables: {
                        colorPrimary: "#CC0000",
                        colorBackground: "#1a0000",
                        colorText: "#ffffff",
                        colorDanger: "#ff4444",
                        fontFamily: "Nunito, sans-serif",
                        borderRadius: "12px",
                      },
                    },
                    locale: "fr-CA",
                  }}
                >
                  <StripePaymentForm
                    total={total}
                    onSuccess={handlePaymentSuccess}
                    onBack={() => {
                      setStep(4);
                      setCheckoutToken(null); // nouveau token si l'utilisateur revient payer
                      setClientSecret(null);
                      setClientSecretError(null);
                    }}
                    loading={loading}
                    setLoading={setLoading}
                  />
                </Elements>
              )}
            </div>
          )}

          {/* ── STEP 6 : ATTENTE WEBHOOK → CONFIRMATION ── */}
          {step === 6 && (
            <div className="card">

              {/* ── État : en attente de confirmation webhook ── */}
              {pollStatus === "waiting" && (
                <div style={{ textAlign: "center", padding: "48px 24px" }}>
                  <div style={{ fontSize: "3rem", marginBottom: 20, animation: "bounce 1s ease infinite" }}>⏳</div>
                  <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: "1.6rem", color: "#1a0000", marginBottom: 12 }}>
                    Paiement en cours de traitement…
                  </div>
                  <div style={{ color: "#888", fontWeight: 600, fontSize: "0.95rem", maxWidth: 400, margin: "0 auto 28px" }}>
                    Votre carte a été débitée. Nous attendons la confirmation de Stripe pour enregistrer votre inscription. Cela prend habituellement quelques secondes.
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "#CC0000", fontWeight: 800 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 1s linear infinite" }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Vérification en cours…
                  </div>
                  <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                </div>
              )}

              {/* ── État : échec ou timeout ── */}
              {pollStatus === "failed" && (
                <div style={{ textAlign: "center", padding: "40px 24px" }}>
                  <div style={{ fontSize: "3rem", marginBottom: 16 }}>⚠️</div>
                  <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: "1.4rem", color: "#CC0000", marginBottom: 12 }}>
                    Confirmation en attente
                  </div>
                  <div style={{ color: "#666", fontWeight: 600, fontSize: "0.92rem", maxWidth: 420, margin: "0 auto 24px", lineHeight: 1.7 }}>
                    Votre paiement a été accepté par Stripe, mais la confirmation d'inscription n'a pas encore été reçue.
                    Vérifiez votre courriel <strong>{tutor.courriel}</strong> dans les prochaines minutes.
                    Si vous ne recevez rien, contactez-nous avec l'identifiant : <code style={{ background: "#f5f5f5", padding: "2px 8px", borderRadius: 6 }}>{paymentIntentId}</code>
                  </div>
                  <button type="button" className="btn btn-secondary" onClick={() => {
                    setPollStatus("waiting");
                    setPollTrigger(t => t + 1); // relance le useEffect de polling
                  }}>
                    🔄 Vérifier à nouveau
                  </button>
                </div>
              )}

              {/* ── État : inscription confirmée ── */}
              {pollStatus === "confirmed" && (
              <>
              <div className="confetti-area">
                <div className="confetti-emoji">🥋</div>
                <div className="confirm-title">Inscription confirmée !</div>
                <div className="confirm-sub">
                  Inscription confirmée pour <strong>{children.map((c, i) => c.firstName || `Enfant ${i + 1}`).join(", ")}</strong>
                </div>
              </div>
              <div className="confirm-summary" id="confirmation-content">
                <div className="confirm-row">
                  <span className="key">Enfants inscrits</span>
                  <span className="val">{children.map((c, i) => <span key={c.id} className="child-tag">{c.firstName || `Enfant ${i + 1}`} · {priceFor(i)} $/sem.</span>)}</span>
                </div>
                <div className="confirm-row">
                  <span className="key">Semaines</span>
                  <span className="val">{selectedWeeks.map(id => { const w = getWeekById(id); return <span key={id} className="week-tag">{w?.label}</span>; })}</span>
                </div>
                <div className="confirm-row">
                  <span className="key">Sous-total camps</span>
                  <span className="val">{fmt(subTotal)} $</span>
                </div>
                {nbGiftedShirts > 0 && (
                  <div className="confirm-row">
                    <span className="key" style={{ color: "#22c55e" }}>🎁 T-shirt{nbGiftedShirts > 1 ? "s" : ""} offert{nbGiftedShirts > 1 ? "s" : ""}</span>
                    <span className="val">{children.map((c, i) => <span key={c.id} className="child-tag">{c.firstName || `Enfant ${i + 1}`} · {extras.tshirts[i]?.size || "?"} {extras.tshirts[i]?.type || ""}</span>)}</span>
                  </div>
                )}
                {nbPaidShirts > 0 && <>
                  <div className="confirm-row">
                    <span className="key">T-shirts supplémentaires</span>
                    <span className="val">{extras.tshirts.map((t, i) => t.want ? <span key={i} className="child-tag">{children[i]?.firstName || `Enfant ${i + 1}`} · {t.qty || 1}× {t.size2} {t.type2}</span> : null)}</span>
                  </div>
                  <div className="confirm-row">
                    <span className="key">{nbPaidShirts} × {fmt(TSHIRT_PRICE)} $ (sous-total)</span>
                    <span className="val">{fmt(tshirtSousTotal)} $</span>
                  </div>
                  <div className="confirm-row">
                    <span className="key" style={{ color: "#aaa" }}>TPS (5 %)</span>
                    <span className="val" style={{ color: "#aaa" }}>{fmt(tshirtTPS)} $</span>
                  </div>
                  <div className="confirm-row">
                    <span className="key" style={{ color: "#aaa" }}>TVQ (9,975 %)</span>
                    <span className="val" style={{ color: "#aaa" }}>{fmt(tshirtTVQ)} $</span>
                  </div>
                  <div className="confirm-row">
                    <span className="key">Total t-shirts avec taxes</span>
                    <span className="val">{fmt(tshirtTotal)} $</span>
                  </div>
                </>}
                <div className="confirm-row">
                  <span className="key">Photos</span>
                  <span className="val" style={{ color: extras.photo === "accepte" ? "#22c55e" : "#CC0000" }}>{extras.photo === "accepte" ? "✓ Autorisées" : "✗ Refusées"}</span>
                </div>
                <div className="confirm-row">
                  <span className="key">Total payé</span>
                  <span className="val" style={{ color: "#CC0000", fontFamily: "'Fredoka One',cursive", fontSize: "1.1rem" }}>{fmt(total)} $</span>
                </div>
                <div className="confirm-row">
                  <span className="key">Mode de paiement</span>
                  <span className="val">Carte (Stripe)</span>
                </div>
                <div className="confirm-row">
                  <span className="key">Courriel</span>
                  <span className="val">{tutor.courriel}</span>
                </div>
                <div className="confirm-row">
                  <span className="key">N° de confirmation</span>
                  <span className="val" style={{ color: "#CC0000", fontFamily: "monospace" }}>{confNum}</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 16 }} className="no-print">
                <button type="button" className="btn btn-secondary" onClick={() => window.print()} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  🖨️ Imprimer
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => {
                  const el = document.getElementById("confirmation-content");
                  if (!el) return;
                  const rows = [];
                  el.querySelectorAll(".confirm-row").forEach(row => {
                    const key = row.querySelector(".key")?.innerText || "";
                    const val = row.querySelector(".val")?.innerText || "";
                    rows.push(`<tr><td style="padding:8px 14px;color:#888;font-weight:700;border-bottom:1px dashed #ffe066;width:50%;font-size:13px">${key}</td><td style="padding:8px 14px;font-weight:800;border-bottom:1px dashed #ffe066;text-align:right;font-size:13px">${val}</td></tr>`);
                  });
                  const win = window.open("", "_blank", "width=700,height=900");
                  if (!win) { alert("Veuillez autoriser les fenêtres pop-up pour sauvegarder le PDF."); return; }
                  win.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Confirmation ${confNum}</title><style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:Arial,sans-serif;background:#fff;color:#1a0000;padding:32px;}.badge{background:#CC0000;color:white;padding:5px 16px;border-radius:20px;font-size:12px;letter-spacing:1px;display:inline-block;margin-bottom:14px;}h1{font-size:2rem;color:#CC0000;margin-bottom:4px;}h2{font-size:1rem;color:#888;font-weight:600;margin-bottom:20px;}table{width:100%;border-collapse:collapse;background:#fffbe6;border:2px solid #FFD700;border-radius:8px;overflow:hidden;margin-bottom:20px;}.footer{font-size:11px;color:#aaa;text-align:center;margin-bottom:20px;}.btn-pdf{display:block;width:100%;padding:14px;background:#CC0000;color:white;border:none;border-radius:10px;font-size:1rem;font-weight:800;cursor:pointer;font-family:Arial;}@media print{.btn-pdf{display:none!important;}}</style></head><body><div class="badge">🥋 Inscriptions · Été 2026</div><h1>Camp de Jour Karaté</h1><h2>Confirmation d'inscription — ${confNum}</h2><table>${rows.join("")}</table><div class="footer">Ce document confirme votre inscription au Camp de Jour Karaté — Été 2026.</div><button class="btn-pdf" onclick="window.print()">🖨️ Enregistrer en PDF / Imprimer</button></body></html>`);
                  win.document.close();
                  win.focus();
                  setTimeout(() => { win.print(); }, 300);
                }} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  💾 Sauvegarder en PDF
                </button>
              </div>

              <div style={{ textAlign: "center" }} className="no-print">
                <button type="button" className="btn btn-primary btn-lg" onClick={() => {
                  setStep(0); setSel([]);
                  setChildren([newChild()]);
                  setTutor({ nom1: "", nom2: "", recu: "", recuNom: "", nas: "", adresse: "", ville: "", cp: "", tel1: "", tel2: "", telUrg: "", nomUrg: "", courriel: "" });
                  setExtras({ photo: null, signature: "", tshirts: [{ want: false, size: "", type: "", size2: "", type2: "", qty: 1 }] });
                  setClientSecret(null);
                  setClientSecretError(null);
                  setReturnToVerif(false);
                  setConfNum("");
                  setPaymentIntentId(null);
                  setPollStatus("waiting");
                  setPollTrigger(0);
                  setRetryTrigger(0);
                  setCheckoutToken(null); // nouveau token pour la prochaine session
                }}>➕ Nouvelle inscription</button>
              </div>
              </> )} {/* fin pollStatus === "confirmed" */}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
