/**
 * E2E — Parcours paiement (critique)
 *
 * Ce test couvre le parcours complet :
 *   Homepage → Choix professionnel → Prise de RDV → Paiement PayTech
 *
 * Variables d'environnement nécessaires :
 *   E2E_PATIENT_EMAIL, E2E_PATIENT_PASSWORD  — compte patient de test
 *   E2E_PROFESSIONAL_ID                       — ID d'un professionnel de test
 */
import { test, expect, Page } from "@playwright/test";

const BASE_URL = "http://localhost:5173";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function loginAsPatient(page: Page) {
  const email = process.env.E2E_PATIENT_EMAIL ?? "patient.test@health-e.sn";
  const password = process.env.E2E_PATIENT_PASSWORD ?? "";

  await page.goto(`${BASE_URL}/login`);
  await page.getByRole("tab", { name: /patient/i }).click();
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/mot de passe/i).fill(password);
  await page.getByRole("button", { name: /connexion/i }).click();
  await page.waitForURL(/dashboard|accueil/i, { timeout: 10_000 });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe("Parcours paiement PayTech", () => {
  test("La homepage se charge correctement", async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page).toHaveTitle(/health-e/i);
    await expect(page.getByText(/prendre rendez-vous/i).first()).toBeVisible();
  });

  test("Le formulaire de connexion patient est accessible", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await expect(page.getByRole("heading", { name: /connexion/i })).toBeVisible();
    // Sélectionner le rôle patient
    const patientTab = page.getByRole("tab", { name: /patient/i });
    if (await patientTab.isVisible()) await patientTab.click();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/mot de passe/i)).toBeVisible();
  });

  test("Les champs de login sont remplis et soumis correctement", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    const patientTab = page.getByRole("tab", { name: /patient/i });
    if (await patientTab.isVisible()) await patientTab.click();
    await page.getByLabel(/email/i).fill("test@example.com");
    await page.getByLabel(/mot de passe/i).fill("wrongpass");
    await page.getByRole("button", { name: /connexion/i }).click();
    // Doit afficher un message d'erreur — pas une redirection
    await expect(page.getByText(/email|mot de passe|incorrect/i)).toBeVisible({ timeout: 5_000 });
  });

  test("La liste des professionnels est accessible sans connexion", async ({ page }) => {
    await page.goto(`${BASE_URL}/professionals`);
    // La liste est publique
    await expect(page.getByRole("heading")).toBeVisible({ timeout: 8_000 });
  });

  test("La page de prise de RDV est accessible pour un patient connecté", async ({ page }) => {
    test.skip(!process.env.E2E_PATIENT_EMAIL, "E2E_PATIENT_EMAIL non configuré");
    await loginAsPatient(page);

    // Aller sur la liste des professionnels
    await page.goto(`${BASE_URL}/professionals`);

    // Cliquer sur le premier professionnel
    const firstPro = page.locator('[data-testid="professional-card"]').first();
    if (await firstPro.isVisible()) {
      await firstPro.click();
      await expect(page.getByRole("button", { name: /rendez-vous|réserver/i })).toBeVisible({ timeout: 5_000 });
    }
  });

  test("Le parcours de prise de RDV déclenche la fenêtre de paiement", async ({ page }) => {
    test.skip(!process.env.E2E_PATIENT_EMAIL, "E2E_PATIENT_EMAIL non configuré");
    await loginAsPatient(page);

    const proId = process.env.E2E_PROFESSIONAL_ID;
    test.skip(!proId, "E2E_PROFESSIONAL_ID non configuré");

    await page.goto(`${BASE_URL}/book/${proId}`);

    // Sélectionner un créneau disponible
    const slot = page.locator('[data-testid="time-slot"]:not([disabled])').first();
    if (await slot.isVisible()) {
      await slot.click();
      // Confirmer le RDV
      const confirmBtn = page.getByRole("button", { name: /confirmer|procéder/i });
      await confirmBtn.click();

      // La fenêtre de paiement PayTech doit s'ouvrir ou on doit être redirigé
      // PayTech ouvre une nouvelle fenêtre ou redirige vers paytech.sn
      await page.waitForResponse(
        (resp) => resp.url().includes("paytech-initiate-payment") && resp.status() === 200,
        { timeout: 15_000 }
      );
    }
  });
});

test.describe("IPN Webhook", () => {
  test("L'endpoint IPN répond avec 405 sur GET (non-POST)", async ({ request }) => {
    const resp = await request.get(`${BASE_URL}/.netlify/functions/paytech-ipn`);
    // GET doit être rejeté
    expect([405, 404]).toContain(resp.status());
  });

  test("L'endpoint initiate-payment rejette les requêtes sans body", async ({ request }) => {
    const resp = await request.post(
      `${BASE_URL}/.netlify/functions/paytech-initiate-payment`,
      { data: {} }
    );
    expect(resp.status()).toBe(400);
    const body = await resp.json();
    expect(body.success).toBe(0);
  });
});
