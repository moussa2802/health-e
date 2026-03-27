"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWhatsAppText = sendWhatsAppText;
exports.sendWhatsAppTemplate = sendWhatsAppTemplate;
exports.sendSmsFallback = sendSmsFallback;
exports.sendViaPreferredChannel = sendViaPreferredChannel;
exports.sendWaTemplate = sendWaTemplate;
// WhatsApp Cloud API implementation using native fetch
const WA_API_VERSION = process.env.WA_API_VERSION || "v20.0";
function digitsFromE164(e164) {
    return (e164 || "").replace(/^\+/, "").replace(/\D+/g, "");
}
async function postGraph(path, body, token, retries = 2) {
    const url = `https://graph.facebook.com/${WA_API_VERSION}/${path}`;
    for (let attempt = 0; attempt <= retries; attempt++) {
        const res = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });
        if (res.ok)
            return res;
        if ([429, 500, 502, 503, 504].includes(res.status) && attempt < retries) {
            const delay = 400 * Math.pow(2, attempt);
            await new Promise((r) => setTimeout(r, delay));
            continue;
        }
        return res;
    }
    // Should never reach
    return new Response(null, { status: 500 });
}
async function sendWhatsAppText(toE164, body) {
    const WA_TOKEN = process.env.WA_TOKEN;
    const WA_PHONE_NUMBER_ID = process.env.WA_PHONE_NUMBER_ID;
    if (!WA_TOKEN || !WA_PHONE_NUMBER_ID) {
        console.log("[WA] Config missing, skipping WhatsApp send");
        return false;
    }
    try {
        const to = digitsFromE164(toE164);
        const res = await postGraph(`${WA_PHONE_NUMBER_ID}/messages`, {
            messaging_product: "whatsapp",
            to,
            type: "text",
            text: { body, preview_url: true },
        }, WA_TOKEN);
        if (res.ok) {
            console.log("[WA Text] Sent successfully to", toE164);
            return true;
        }
        else {
            const error = await res.text();
            console.error("[WA Text] Failed:", res.status, error);
            return false;
        }
    }
    catch (error) {
        console.error("[WA Text] Error:", error);
        return false;
    }
}
async function sendWhatsAppTemplate(toE164, templateName, variables) {
    const WA_TOKEN = process.env.WA_TOKEN;
    const WA_PHONE_NUMBER_ID = process.env.WA_PHONE_NUMBER_ID;
    if (!WA_TOKEN || !WA_PHONE_NUMBER_ID) {
        console.log("[WA] Config missing, skipping WhatsApp template");
        return false;
    }
    try {
        const to = digitsFromE164(toE164);
        const bodyComponent = variables.length > 0
            ? [
                {
                    type: "body",
                    parameters: variables.map((v) => ({ type: "text", text: v })),
                },
            ]
            : [];
        const res = await postGraph(`${WA_PHONE_NUMBER_ID}/messages`, {
            messaging_product: "whatsapp",
            to,
            type: "template",
            template: {
                name: templateName,
                language: { code: "fr" },
                components: bodyComponent,
            },
        }, WA_TOKEN);
        if (res.ok) {
            console.log("[WA Template] Sent successfully", {
                to: toE164,
                templateName,
            });
            return true;
        }
        else {
            const error = await res.text();
            console.error("[WA Template] Failed:", res.status, error);
            return false;
        }
    }
    catch (error) {
        console.error("[WA Template] Error:", error);
        return false;
    }
}
async function sendSmsFallback(toE164, text) {
    // Stub pour développer tranquillement.
    console.log("[SMS Fallback]", { toE164, text });
}
async function sendViaPreferredChannel(toE164, options) {
    const { text, templateName, variables = [] } = options;
    // Try WhatsApp template first if provided
    if (templateName) {
        const templateSuccess = await sendWhatsAppTemplate(toE164, templateName, variables);
        if (templateSuccess)
            return;
    }
    // Try WhatsApp text if template failed or not provided
    if (text) {
        const textSuccess = await sendWhatsAppText(toE164, text);
        if (textSuccess)
            return;
    }
    // Fallback to SMS log
    const fallbackText = text || `Template: ${templateName} with variables: ${variables.join(", ")}`;
    await sendSmsFallback(toE164, fallbackText);
}
/**
 * Helper générique pour envoyer un template WhatsApp avec composants body et/ou button
 */
async function sendWaTemplate(options) {
    const WA_TOKEN = process.env.WA_TOKEN;
    const WA_PHONE_NUMBER_ID = process.env.WA_PHONE_NUMBER_ID;
    if (!WA_TOKEN || !WA_PHONE_NUMBER_ID) {
        console.log("[WA Template] Config missing, skipping");
        return false;
    }
    try {
        const to = digitsFromE164(options.to);
        const components = [];
        // Composant body si bodyParams fourni
        if (options.bodyParams && options.bodyParams.length > 0) {
            components.push({
                type: "body",
                parameters: options.bodyParams.map((v) => ({ type: "text", text: v })),
            });
        }
        // Composant button si button0Param fourni
        if (options.button0Param) {
            components.push({
                type: "button",
                sub_type: "url",
                index: "0",
                parameters: [{ type: "text", text: options.button0Param }],
            });
        }
        const payload = {
            messaging_product: "whatsapp",
            to,
            type: "template",
            template: {
                name: options.name,
                language: { code: options.language },
            },
        };
        // N'ajouter components que si on a des composants
        if (components.length > 0) {
            payload.template.components = components;
        }
        const res = await postGraph(`${WA_PHONE_NUMBER_ID}/messages`, payload, WA_TOKEN);
        if (res.ok) {
            console.log("[WA Template] Sent successfully", {
                to: options.to,
                name: options.name,
                hasBody: !!options.bodyParams,
                hasButton: !!options.button0Param,
            });
            return true;
        }
        else {
            const error = await res.text();
            console.error("[WA Template] Failed:", res.status, error);
            return false;
        }
    }
    catch (error) {
        console.error("[WA Template] Error:", error);
        return false;
    }
}
