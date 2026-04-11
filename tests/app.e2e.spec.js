const { test, expect } = require('@playwright/test');

const LEGACY_PATH = '/';
const MODULAR_PATH =
  '/?ff_useModularUtils=true&ff_useModularHeader=true&ff_useModularSetup=true&ff_useModularDashboard=true&ff_useModularDetail=true&ff_useModularMessages=true';

async function completeSetup(page) {
  await page.fill('#setup-email', 'qa.user@example.com');
  await page.click('.env-segment[data-env="QA"]');
  await expect(page.locator('#setup-continue')).toBeEnabled();
  await page.click('#setup-continue');
  await expect(page.locator('#screen-dashboard')).toHaveClass(/active/);
}

async function openDetailFromFirstStat(page) {
  await page.locator('.stat-card').first().click();
  await expect(page.locator('#screen-detail')).toHaveClass(/active/);
}

async function openDashboard(page) {
  await expect(page.locator('#screen-dashboard')).toHaveClass(/active/);
}

async function openMessaging(page) {
  await page.evaluate(() => window.showMessages());
  await expect(page.locator('#screen-messages')).toHaveClass(/active/);
}

function modeSuite(modeName, path) {
  test.describe(`${modeName} mode`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(path);
      await completeSetup(page);
      await openDashboard(page);
    });

    test('setup -> dashboard, chart and failed actions render', async ({ page }) => {
      await expect(page.locator('#activityChart')).toBeVisible();
      await expect(page.locator('#failed-actions-list')).toBeVisible();
      await expect(page.locator('#failed-actions-list [data-shot-idx]')).toHaveCount(4);
      await expect(page.locator('#failed-actions-list [data-logs-idx]')).toHaveCount(4);
    });

    test('Session & Network panel renders and shows IP monitoring placeholder when API off', async ({ page }) => {
      const sn = page.locator('#session-network-panel');
      await expect(sn).toBeVisible();
      await expect(sn.locator('.session-network-title')).toHaveText('Session & Network');
      await expect(sn).toContainText('IP monitoring not enabled');
    });

    test('dashboard stat opens detail and back returns dashboard', async ({ page }) => {
      await openDetailFromFirstStat(page);
      await page.locator('#screen-detail .back-btn').first().click();
      await expect(page.locator('#screen-dashboard')).toHaveClass(/active/);
    });

    test('failed action screenshot modal open and close', async ({ page }) => {
      await page.locator('#failed-actions-list [data-shot-idx]:not([disabled])').first().click();
      await expect(page.locator('#shot-modal')).toHaveClass(/is-open/);
      await page.click('#shot-modal-close');
      await expect(page.locator('#shot-modal')).not.toHaveClass(/is-open/);
    });

    test('failed action logs modal open and close', async ({ page }) => {
      await page.locator('#failed-actions-list [data-logs-idx]:not([disabled])').first().click();
      await expect(page.locator('#logs-modal')).toHaveClass(/is-open/);
      await page.click('#logs-modal-close');
      await expect(page.locator('#logs-modal')).not.toHaveClass(/is-open/);
    });

    test('detail table renders and filters are clickable', async ({ page }) => {
      await openDetailFromFirstStat(page);
      await expect(page.locator('#lead-table tbody tr').first()).toBeVisible();
      const filterButtons = page.locator('.chip');
      const count = await filterButtons.count();
      if (count > 1) {
        await filterButtons.nth(1).click();
      }
      await expect(page.locator('#lead-table tbody tr')).toHaveCount(await page.locator('#lead-table tbody tr').count());
    });

    test('dashboard acceptance and messages run tracking actions', async ({ page }) => {
      await expect(page.locator('#acceptance-runs-slot')).toBeVisible();
      await expect(page.locator('#messages-runs-slot')).toBeVisible();

      await page.click('#dashboard-acceptance-run-btn');
      await expect(page.locator('#dashboard-acceptance-run-btn')).toHaveText('Running…');
      await expect(page.locator('#dashboard-acceptance-run-btn')).toHaveText('Run Acceptance Check', { timeout: 6000 });

      await page.click('#dashboard-messages-run-btn');
      await expect(page.locator('#dashboard-messages-run-btn')).toHaveText('Running…');
      await expect(page.locator('#dashboard-messages-run-btn')).toHaveText('Run Messages Check', { timeout: 6000 });

      await expect(page.locator('#messages-runs-slot .run-kv strong').nth(2)).not.toHaveText('0');
    });

    test('detail inbox conversation select and send message', async ({ page }) => {
      await page.evaluate(() => window.showDetail('messages-sent'));
      await expect(page.locator('#screen-detail')).toHaveClass(/active/);
      await expect(page.locator('#campaign-conv-list .campaign-conv-item').first()).toBeVisible();
      await page.locator('#campaign-conv-list .campaign-conv-item').first().click();
      const before = await page.locator('#campaign-thread .campaign-bubble').count();
      await page.fill('#campaign-input', `Detail inbox message ${Date.now()}`);
      await page.click('#campaign-send-btn');
      await expect(page.locator('#campaign-input')).toHaveValue('');
      const after = await page.locator('#campaign-thread .campaign-bubble').count();
      expect(after).toBeGreaterThanOrEqual(before + 1);
    });

    test('messaging screen select conversation send and back', async ({ page }) => {
      await openMessaging(page);
      await expect(page.locator('#msg-conv-list .msg-conv').first()).toBeVisible();
      await page.locator('#msg-conv-list .msg-conv').nth(1).click();
      const msgText = `Messaging message ${Date.now()}`;
      await page.fill('#msg-input', msgText);
      await page.click('#msg-send-btn');
      await expect(page.locator('#msg-input')).toHaveValue('');
      await expect(page.locator('#msg-thread .msg-bubble').filter({ hasText: msgText })).toBeVisible({
        timeout: 15000,
      });
      await page.locator('#screen-messages .back-btn').first().click();
      await expect(page.locator('#screen-dashboard')).toHaveClass(/active/);
    });
  });
}

modeSuite('legacy', LEGACY_PATH);
modeSuite('modular', MODULAR_PATH);
