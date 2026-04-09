"use client";

import { useState, useEffect } from "react";

const TSHIRT_PRICE  = 17.40;
const TPS_RATE      = 0.05;
const TVQ_RATE      = 0.09975;
const PRICE_BY_RANK = [165, 150, 140];
const priceFor      = (i) => PRICE_BY_RANK[Math.min(i, PRICE_BY_RANK.length - 1)];
const fmt           = (n) => Number(n).toFixed(2);

export default function AdminConfirmations() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [sent, setSent]                 = useState({});

  useEffect(() => { loadReservations(); }, []);

  const loadReservations = async () => {
    setLoading(true);
    const res  = await fetch("/api/admin/reservations");
    const data = await res.json();
    setReservations(data || []);
    setLoading(false);
  };

  const filtered = reservations.filter(r =>
    r.reservation_number?.toLowerCase().includes(search.toLowerCase()) ||
    r.parent_full_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.email?.toLowerCase().includes(search.toLowerCase())
  );

  const generatePDF = (r) => {
    const children = r.reservation_children || [];
    const tshirts  = r.reservation_tshirts  || [];
    const weeks    = [...new Map(
      (r.reservation_weeks || [])
        .filter(rw => rw.weeks)
        .map(rw => [rw.weeks.id, rw.weeks])
    ).values()].sort((a, b) => a.id - b.id);

    const paymentDate = new Date(r.updated_at || r.created_at).toLocaleDateString("fr-CA", {
      year: "numeric", month: "long", day: "numeric"
    }) + " à " + new Date(r.updated_at || r.created_at).toLocaleTimeString("fr-CA", {
      hour: "2-digit", minute: "2-digit"
    });

    const formatWeek = (w) => {
      const s = new Date(w.starts_on + "T12:00:00").toLocaleDateString("fr-CA", { day: "numeric", month: "long" });
      const e = new Date(w.ends_on   + "T12:00:00").toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" });
      return `${w.label} (${s} – ${e})`;
    };

    const nbWeeks       = weeks.length;
    const campsSubtotal = children.reduce((sum, _, i) => sum + nbWeeks * priceFor(i), 0);
    const paidShirts    = tshirts.filter(t => !t.is_gift);
    const nbPaid        = paidShirts.reduce((sum, t) => sum + (t.quantity || 1), 0);
    const tshirtSub     = nbPaid * TSHIRT_PRICE;
    const tshirtTPS     = tshirtSub * TPS_RATE;
    const tshirtTVQ     = tshirtSub * TVQ_RATE;
    const giftShirts    = tshirts.filter(t => t.is_gift);

    const campRows = children.map((c, i) =>
      `<tr>
        <td style="padding:8px 14px;border-bottom:1px solid #f0e0a0;font-size:13px;color:#555;font-weight:600">
          ${c.first_name} ${c.last_name} — ${nbWeeks} sem. × ${priceFor(i)} $
        </td>
        <td style="padding:8px 14px;border-bottom:1px solid #f0e0a0;text-align:right;font-size:13px;font-weight:700">
          ${fmt(nbWeeks * priceFor(i))} $
        </td>
      </tr>`
    ).join("");

    const giftRows = giftShirts.map(t =>
      `<tr>
        <td style="padding:8px 14px;border-bottom:1px solid #f0e0a0;font-size:13px;color:#22c55e;font-weight:600">
          🎁 T-shirt offert — ${t.size || "?"} ${t.shirt_type || ""}
        </td>
        <td style="padding:8px 14px;border-bottom:1px solid #f0e0a0;text-align:right;font-size:13px;font-weight:700;color:#22c55e">
          Inclus
        </td>
      </tr>`
    ).join("");

    const paidShirtRows = nbPaid > 0 ? `
      <tr>
        <td style="padding:8px 14px;border-bottom:1px solid #f0e0a0;font-size:13px;color:#555;font-weight:600">
          T-shirts supplémentaires (${nbPaid} × ${fmt(TSHIRT_PRICE)} $)
        </td>
        <td style="padding:8px 14px;border-bottom:1px solid #f0e0a0;text-align:right;font-size:13px;font-weight:700">
          ${fmt(tshirtSub)} $
        </td>
      </tr>
      <tr>
        <td style="padding:8px 14px;border-bottom:1px solid #f0e0a0;font-size:13px;color:#888;font-weight:600">TPS (5 %) — N° 711574897 RC 0001</td>
        <td style="padding:8px 14px;border-bottom:1px solid #f0e0a0;text-align:right;font-size:13px;font-weight:700;color:#888">${fmt(tshirtTPS)} $</td>
      </tr>
      <tr>
        <td style="padding:8px 14px;border-bottom:1px solid #f0e0a0;font-size:13px;color:#888;font-weight:600">TVQ (9,975 %) — N° 1224802931 IC 0001</td>
        <td style="padding:8px 14px;border-bottom:1px solid #f0e0a0;text-align:right;font-size:13px;font-weight:700;color:#888">${fmt(tshirtTVQ)} $</td>
      </tr>` : "";

    const win = window.open("", "_blank", "width=760,height=1050");
    if (!win) { alert("Autorisez les pop-ups pour générer le PDF."); return; }

    win.document.write(`<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8">
<title>Confirmation ${r.reservation_number}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:Arial,sans-serif;background:#fff;color:#1a0000;padding:36px;max-width:700px;margin:0 auto;}
  .top{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:20px;border-bottom:3px solid #CC0000;margin-bottom:22px;}
  .org-name{font-size:1.5rem;font-weight:900;color:#CC0000;margin-bottom:2px;}
  .org-sub{font-size:0.9rem;color:#CC0000;font-weight:700;margin-bottom:8px;}
  .org-details{font-size:0.75rem;color:#555;line-height:1.9;}
  .doc-right{text-align:right;}
  .doc-label{font-size:0.68rem;font-weight:800;color:#888;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:4px;}
  .doc-num{font-size:1.1rem;font-weight:900;color:#CC0000;font-family:monospace;margin-bottom:6px;}
  .doc-date{font-size:0.75rem;color:#555;line-height:1.8;}
  .badge-paid{display:inline-block;background:#22c55e;color:white;padding:4px 14px;border-radius:20px;font-size:0.7rem;font-weight:800;letter-spacing:1px;text-transform:uppercase;margin-top:10px;}
  .section{margin-bottom:18px;}
  .section-label{font-size:0.65rem;font-weight:800;color:#888;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px;}
  .info-box{background:#fafafa;border:1px solid #e8e8e8;border-radius:8px;padding:11px 15px;font-size:0.82rem;line-height:2;}
  .info-box strong{color:#1a0000;font-weight:700;}
  table{width:100%;border-collapse:collapse;border:2px solid #FFD700;border-radius:8px;overflow:hidden;margin-bottom:4px;}
  thead tr{background:#FFD700;}
  thead td{padding:8px 14px;font-weight:800;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.5px;color:#7a6000;}
  .total-row td{font-weight:900;color:#CC0000;font-size:1rem;padding:12px 14px;border-top:3px solid #CC0000;background:#fff0f0;}
  .tax-note{font-size:0.7rem;color:#888;font-style:italic;margin-top:6px;line-height:1.7;}
  .footer{margin-top:22px;padding-top:14px;border-top:1px solid #e0e0e0;font-size:0.68rem;color:#888;line-height:2;text-align:center;}
  .btn-pdf{display:block;width:100%;padding:14px;background:#CC0000;color:white;border:none;border-radius:10px;font-size:1rem;font-weight:800;cursor:pointer;font-family:Arial;margin-top:18px;}
  @media print{.btn-pdf{display:none!important;}}
</style></head><body>

<div class="top">
  <div>
    <div class="org-name">Camp de Jour Karaté</div>
    <div class="org-sub">Dojo de Lavaltrie — Karaté Sunfuki</div>
    <div class="org-details">
      C-985 rue Notre-Dame<br>
      Lavaltrie, QC &nbsp; J5T 1R4<br>
      Tél. : 438-886-6270<br>
      lavaltrie@karatesunfuki.com
    </div>
  </div>
  <div class="doc-right">
    <div class="doc-label">Confirmation &amp; Reçu de paiement</div>
    <div class="doc-num">${r.reservation_number}</div>
    <div class="doc-date">
      Date du paiement :<br>
      <strong>${paymentDate}</strong><br>
      Mode : Carte (Stripe) — Paiement complet
    </div>
    <div class="badge-paid">✓ Paiement complet reçu</div>
  </div>
</div>

<div class="section">
  <div class="section-label">Payeur</div>
  <div class="info-box">
    <strong>Tuteur 1 :</strong> ${r.parent_full_name || "—"}<br>
    ${r.parent_name_2 ? `<strong>Tuteur 2 :</strong> ${r.parent_name_2}<br>` : ""}
    <strong>Adresse :</strong> ${r.address_line1 || "—"}, ${r.city || "—"} &nbsp;${r.postal_code || "—"}<br>
    <strong>Courriel :</strong> ${r.email || "—"}<br>
    <strong>Tél. :</strong> ${r.phone || "—"}
  </div>
</div>

<div class="section">
  <div class="section-label">Enfant(s) inscrit(s)</div>
  <div class="info-box">
    ${children.map(c => `<strong>${c.first_name} ${c.last_name}</strong> — ${c.age || "?"} ans · ${c.gender || "?"}<br>`).join("")}
  </div>
</div>

<div class="section">
  <div class="section-label">Semaines sélectionnées</div>
  <div class="info-box">
    ${weeks.map(w => `• ${formatWeek(w)}`).join("<br>")}
  </div>
</div>

<div class="section">
  <div class="section-label">Détail de la commande</div>
  <table>
    <thead><tr><td>Description</td><td style="text-align:right">Montant</td></tr></thead>
    <tbody>
      ${campRows}
      ${giftRows}
      ${paidShirtRows}
      <tr class="total-row">
        <td>TOTAL PAYÉ — Paiement unique et complet</td>
        <td style="text-align:right">${fmt(r.total_amount || (campsSubtotal + tshirtSub + tshirtTPS + tshirtTVQ))} $</td>
      </tr>
    </tbody>
  </table>
  ${nbPaid > 0
    ? `<div class="tax-note">Les taxes (TPS/TVQ) s'appliquent uniquement sur les articles de marchandise (t-shirts). Les frais d'inscription au camp sont exempts de taxes.</div>`
    : `<div class="tax-note">Les frais d'inscription au camp sont exempts de taxes (TPS N° 711574897 RC 0001 · TVQ N° 1224802931 IC 0001).</div>`
  }
</div>

<div class="footer">
  Ce document confirme votre inscription et votre paiement au Camp de Jour Karaté — Dojo de Lavaltrie — Été 2026.<br>
  Conservez ce reçu pour vos dossiers. &nbsp;|&nbsp; Questions : lavaltrie@karatesunfuki.com &nbsp;|&nbsp; 438-886-6270
</div>

<button class="btn-pdf" onclick="window.print()">🖨️ Imprimer / Enregistrer en PDF</button>
</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };

  const styleTag = `
    @import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;600;700;800&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Nunito', sans-serif; background: #fff5f5; }
    .admin-wrap { min-height: 100vh; background: linear-gradient(160deg, #fff5f5 0%, #fffbe6 100%); padding: 40px 20px; }
    .admin-header { text-align: center; margin-bottom: 32px; }
    .admin-title { font-family: 'Fredoka One', cursive; font-size: 2rem; color: #1a0000; margin-bottom: 6px; }
    .admin-sub { color: #888; font-weight: 600; font-size: 0.95rem; }
    .search-bar { max-width: 600px; margin: 0 auto 28px; }
    .search-bar input { width: 100%; padding: 14px 20px; border: 2px solid #ece5db; border-radius: 14px; font-family: 'Nunito', sans-serif; font-size: 1rem; font-weight: 600; outline: none; }
    .search-bar input:focus { border-color: #CC0000; }
    .stats { display: flex; gap: 16px; justify-content: center; margin-bottom: 28px; flex-wrap: wrap; }
    .stat { background: white; border: 2px solid #ece5db; border-radius: 14px; padding: 14px 24px; text-align: center; }
    .stat-val { font-family: 'Fredoka One', cursive; font-size: 1.8rem; color: #CC0000; }
    .stat-label { font-size: 0.78rem; font-weight: 800; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
    .resa-list { max-width: 860px; margin: 0 auto; display: flex; flex-direction: column; gap: 14px; }
    .resa-card { background: white; border: 2px solid #ece5db; border-radius: 18px; padding: 22px 24px; display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; transition: box-shadow 0.2s; }
    .resa-card:hover { box-shadow: 0 6px 24px rgba(0,0,0,0.08); }
    .resa-card.sent { border-color: #22c55e; background: #f0fff4; }
    .resa-info { flex: 1; }
    .resa-num { font-family: 'Fredoka One', cursive; font-size: 1rem; color: #CC0000; margin-bottom: 4px; }
    .resa-name { font-weight: 800; font-size: 1rem; color: #1a0000; margin-bottom: 2px; }
    .resa-email { font-size: 0.85rem; color: #888; font-weight: 600; margin-bottom: 4px; }
    .resa-meta { font-size: 0.8rem; color: #aaa; font-weight: 700; }
    .resa-total { font-family: 'Fredoka One', cursive; font-size: 1.3rem; color: #1a0000; text-align: right; }
    .resa-actions { display: flex; flex-direction: column; gap: 8px; align-items: flex-end; }
    .btn-pdf { background: #CC0000; color: white; border: none; border-radius: 12px; padding: 10px 20px; font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 0.9rem; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
    .btn-pdf:hover { background: #aa0000; transform: translateY(-1px); }
    .btn-sent { background: none; border: 2px solid #22c55e; border-radius: 12px; padding: 6px 14px; color: #22c55e; font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 0.82rem; cursor: pointer; white-space: nowrap; }
    .sent-badge { background: #22c55e; color: white; border-radius: 20px; padding: 3px 10px; font-size: 0.75rem; font-weight: 800; }
    .loading { text-align: center; padding: 60px; color: #888; font-weight: 700; font-size: 1.1rem; }
    .children-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
    .child-tag { background: #fff5f5; border: 1.5px solid #ffcccc; color: #CC0000; font-size: 0.75rem; font-weight: 800; padding: 2px 8px; border-radius: 20px; }
    .week-tag { background: #fffbe6; border: 1.5px solid #FFD700; color: #b8960a; font-size: 0.75rem; font-weight: 800; padding: 2px 8px; border-radius: 20px; }
  `;

  return (
    <>
      <style>{styleTag}</style>
      <div className="admin-wrap">
        <div className="admin-header">
          <div className="admin-title">🥋 Admin — Confirmations</div>
          <div className="admin-sub">Générez et envoyez les PDFs de confirmation à vos clients</div>
        </div>

        <div className="stats">
          <div className="stat">
            <div className="stat-val">{reservations.length}</div>
            <div className="stat-label">Réservations confirmées</div>
          </div>
          <div className="stat">
            <div className="stat-val">{Object.keys(sent).length}</div>
            <div className="stat-label">PDFs générés</div>
          </div>
          <div className="stat">
            <div className="stat-val">{reservations.length - Object.keys(sent).length}</div>
            <div className="stat-label">Restants</div>
          </div>
          <div className="stat">
            <div className="stat-val">{fmt(reservations.reduce((s, r) => s + Number(r.total_amount || 0), 0))} $</div>
            <div className="stat-label">Total encaissé</div>
          </div>
        </div>

        <div className="search-bar">
          <input
            placeholder="🔍 Rechercher par nom, numéro ou courriel..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading && <div className="loading">⏳ Chargement des réservations...</div>}

        <div className="resa-list">
          {filtered.map(r => {
            const children = r.reservation_children || [];
            const weeks    = [...new Map(
              (r.reservation_weeks || []).filter(rw => rw.weeks).map(rw => [rw.weeks.id, rw.weeks])
            ).values()];
            const isSent = sent[r.id];

            return (
              <div key={r.id} className={`resa-card ${isSent ? "sent" : ""}`}>
                <div className="resa-info">
                  <div className="resa-num">{r.reservation_number}</div>
                  <div className="resa-name">{r.parent_full_name}</div>
                  <div className="resa-email">📧 {r.email} &nbsp;·&nbsp; 📞 {r.phone}</div>
                  <div className="children-tags">
                    {children.map(c => (
                      <span key={c.id} className="child-tag">🥋 {c.first_name} {c.last_name}</span>
                    ))}
                    {weeks.map(w => (
                      <span key={w.id} className="week-tag">📅 {w.label}</span>
                    ))}
                  </div>
                  <div className="resa-meta" style={{ marginTop: 6 }}>
                    Inscrit le {new Date(r.created_at).toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" })}
                    {isSent && <span className="sent-badge" style={{ marginLeft: 8 }}>✓ PDF généré</span>}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="resa-total">{fmt(r.total_amount || 0)} $</div>
                  <div className="resa-actions" style={{ marginTop: 10 }}>
                    <button
                      className="btn-pdf"
                      onClick={() => { generatePDF(r); setSent(s => ({ ...s, [r.id]: true })); }}
                    >
                      💾 Générer PDF
                    </button>
                    {isSent && (
                      <button
                        className="btn-sent"
                        onClick={() => setSent(s => { const n = { ...s }; delete n[r.id]; return n; })}
                      >
                        ↩ Marquer non envoyé
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {!loading && filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px", color: "#888", fontWeight: 700 }}>
              Aucune réservation trouvée.
            </div>
          )}
        </div>
      </div>
    </>
  );
}