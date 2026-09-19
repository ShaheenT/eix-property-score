import { test, expect } from '@playwright/test';

const CUSTOMER = {
  name: 'Tahriq Toefy',
  email: 'tahriqht@gmail.com',
  whatsapp: '+27724367981',
  listingUrl:
    'https://www.property24.com/for-sale/observatory/cape-town/western-cape/10157/117506054',
};

test('R149: complete South African buyer checkout intake', async ({ page }) => {
  let checkoutPayload: Record<string, unknown> | null = null;

  await page.route('**/api/checkout', async (route) => {
    checkoutPayload = JSON.parse(route.request().postData() || '{}');

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        checkout_url: '/e2e/paystack-checkout',
      }),
    });
  });

  await page.goto('/');
  await expect(
    page.getByRole('button', { name: /Analyse My Property — R149/i }),
  ).toBeVisible();

  await page.getByPlaceholder('e.g. Thabo Mokoena').fill(CUSTOMER.name);
  await page.getByPlaceholder('you@email.com').fill(CUSTOMER.email);
  await page.getByPlaceholder('+44 7700 900123').fill(CUSTOMER.whatsapp);

  const buyerSelect = page
    .locator('label')
    .filter({ hasText: 'Who are you buying as?' })
    .locator('..')
    .getByRole('combobox');

  await buyerSelect.click();
  await page.getByRole('option', { name: 'South African buyer' }).click();

  await page
    .getByPlaceholder(
      'Paste a Property24, Private Property, Facebook or agency link—or enter the address',
    )
    .fill(CUSTOMER.listingUrl);

  await expect(page.getByText('Property24', { exact: true })).toBeVisible();

  const goalSelect = page
    .locator('label')
    .filter({ hasText: 'What are you trying to decide?' })
    .locator('..')
    .getByRole('combobox');

  await goalSelect.click();
  await page.getByRole('option', { name: 'Buy to Live' }).click();

  await page.getByRole('button', {
    name: /Analyse My Property — R149/i,
  }).click();

  await expect.poll(() => checkoutPayload).toEqual({
    name: CUSTOMER.name,
    email: CUSTOMER.email,
    whatsapp: CUSTOMER.whatsapp,
    listing_url: CUSTOMER.listingUrl,
    goal: 'Buy to Live',
    product: 'standard_report',
    buyer_type: 'south_african',
    buyer_country: null,
    buyer_purpose: null,
    buyer_budget: null,
  });
});
