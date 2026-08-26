const fetch = require("node-fetch");
const { verifyAuth, db } = require("./_firebase");

const PAYTECH_CONFIG = {
  apiUrl: "https://paytech.sn/api/payment/request-payment",
  apiKey: process.env.PAYTECH_API_KEY,
  apiSecret: process.env.PAYTECH_API_SECRET,
  env: process.env.PAYTECH_ENV || "prod",
  ipnUrl: process.env.PAYTECH_IPN_URL || "https://health-e.sn/.netlify/functions/paytech-ipn",
};

const KORIS_PACKS = {
  pack_25: { koris: 25000, price: 1000, label: "25 000 Koris" },
  pack_60: { koris: 60000, price: 2000, label: "60 000 Koris" },
  pack_150: { koris: 150000, price: 4000, label: "150 000 Koris" },
};

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const user = await verifyAuth(event);
  if (!user) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: "Non authentifié" }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "JSON invalide" }) };
  }

  const { packId } = body;
  const pack = KORIS_PACKS[packId];
  if (!pack) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Pack invalide" }) };
  }

  if (!PAYTECH_CONFIG.apiKey || !PAYTECH_CONFIG.apiSecret) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Configuration PayTech manquante" }) };
  }

  const orderId = `KORIS_${user.uid}_${Date.now()}`;

  const orderRef = db.collection("koris_orders").doc(orderId);
  await orderRef.set({
    userId: user.uid,
    packId,
    koris: pack.koris,
    price: pack.price,
    status: "pending",
    createdAt: new Date().toISOString(),
  });

  const siteUrl = process.env.URL || "https://health-e.sn";

  const paymentData = {
    item_name: `Health-e — ${pack.label}`,
    item_price: pack.price,
    ref_command: orderId,
    command_name: `Achat ${pack.label}`,
    currency: "XOF",
    env: PAYTECH_CONFIG.env,
    success_url: `${siteUrl}/acheter-koris?success=true&order=${orderId}`,
    cancel_url: `${siteUrl}/acheter-koris?cancelled=true`,
    ipn_url: PAYTECH_CONFIG.ipnUrl,
    custom_field: JSON.stringify({
      paymentType: "koris_purchase",
      orderId,
      userId: user.uid,
      packId,
      koris: pack.koris,
    }),
  };

  try {
    const response = await fetch(PAYTECH_CONFIG.apiUrl, {
      method: "POST",
      headers: {
        API_KEY: PAYTECH_CONFIG.apiKey,
        API_SECRET: PAYTECH_CONFIG.apiSecret,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(paymentData),
    });

    const data = await response.json();

    if (data.success === 1 || data.token) {
      const redirectUrl = data.redirect_url || `https://paytech.sn/payment/checkout/${data.token}`;
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, redirect_url: redirectUrl, orderId }),
      };
    }

    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ error: "Erreur PayTech", details: data }),
    };
  } catch (err) {
    console.error("paytech-koris error:", err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Erreur lors de l'initiation du paiement" }),
    };
  }
};
