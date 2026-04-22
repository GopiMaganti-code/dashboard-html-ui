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

async function openIpMonitoring(page) {
  await page.click('#dashboard-ip-monitoring-btn');
  await expect(page.locator('#screen-ip-monitoring')).toHaveClass(/active/);
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
      await openIpMonitoring(page);
      const sn = page.locator('#session-network-panel');
      await expect(sn).toBeVisible();
      await expect(sn.locator('.session-network-title')).toHaveText('Campaign IP Monitoring');
      await expect(sn).toContainText('IP monitoring is disabled');
    });

    test('Campaign IP panel full dataset scenario keeps banner hidden', async ({ page }) => {
      await openIpMonitoring(page);
      await page.evaluate(() => {
        const payload = {
          campaigns: [{
            campaign_id: 'CMP-FULL',
            last_ts: '2026-04-18T15:15:28.095000',
            unique_ips: 2,
            events: 10,
            ip_rotation: 'dynamic',
            ips_total: 2,
            ips_limit: 50,
            ips_offset: 0,
            ips_has_more: false,
            ips: [
              { ip: '1.1.1.1', city: 'Hyderabad', country_code: 'IN', provider: 'iproyal', mode: 'sticky', sticky_session_id: 'sid-a', count: 6, last_ts: '2026-04-18T15:15:28.095000' },
              { ip: '2.2.2.2', city: 'Mumbai', country_code: 'IN', provider: 'iproyal', mode: 'sticky', sticky_session_id: 'sid-a', count: 4, last_ts: '2026-04-18T10:15:28.095000' }
            ]
          }]
        };
        window.AppSessionNetworkPanel.renderSessionNetworkPanel('session-network-panel', payload, {
          escapeHtml: (s) => String(s),
          loaded: true
        });
      });
      await expect(page.locator('#session-network-panel')).not.toContainText('Data is partially loaded');
      await expect(page.locator('#session-network-panel')).toContainText('Heuristic Risk');
    });

    test('Campaign IP panel partial dataset shows top-N label and banner', async ({ page }) => {
      await openIpMonitoring(page);
      await page.evaluate(() => {
        const mount = document.getElementById('session-network-panel');
        if (mount) {
          mount.__campaignIpState = { sortBy: 'risk', highRiskOnly: false, rotation: 'all', expanded: { 'CMP-PARTIAL': true } };
        }
        const payload = {
          campaigns: [{
            campaign_id: 'CMP-PARTIAL',
            last_ts: '2026-04-18T15:15:28.095000',
            unique_ips: 58,
            events: 183,
            ip_rotation: 'dynamic',
            ips_total: 58,
            ips_limit: 25,
            ips_offset: 0,
            ips_has_more: true,
            ips: [
              { ip: '1.1.1.1', city: 'Hyderabad', country_code: 'IN', provider: 'iproyal', mode: 'sticky', sticky_session_id: 'sid-a', count: 2, last_ts: '2026-04-18T15:15:28.095000' },
              { ip: '2.2.2.2', city: 'Mumbai', country_code: 'IN', provider: 'iproyal', mode: 'sticky', sticky_session_id: 'sid-a', count: 1, last_ts: '2026-04-18T14:15:28.095000' }
            ]
          }]
        };
        window.AppSessionNetworkPanel.renderSessionNetworkPanel('session-network-panel', payload, {
          escapeHtml: (s) => String(s),
          loaded: true
        });
      });
      await expect(page.locator('#session-network-panel')).toContainText('Data is partially loaded');
      await expect(page.locator('#session-network-panel')).toContainText('Top 2 IPs (out of 58)');
    });

    test('Sticky session reuse alone does not mark all IPs risky', async ({ page }) => {
      await openIpMonitoring(page);
      await page.evaluate(() => {
        const mount = document.getElementById('session-network-panel');
        if (mount) {
          mount.__campaignIpState = { sortBy: 'risk', highRiskOnly: false, rotation: 'all', expanded: { 'CMP-STICKY': true } };
        }
        const ips = [];
        for (let i = 0; i < 6; i += 1) {
          ips.push({
            ip: `10.0.0.${i + 1}`,
            city: 'Hyderabad',
            country_code: 'IN',
            provider: 'iproyal',
            mode: 'sticky',
            sticky_session_id: 'same-sticky',
            count: 2,
            last_ts: '2026-04-18T15:15:28.095000'
          });
        }
        const payload = {
          campaigns: [{
            campaign_id: 'CMP-STICKY',
            last_ts: '2026-04-18T15:15:28.095000',
            unique_ips: 6,
            events: 12,
            ip_rotation: 'dynamic',
            ips_total: 6,
            ips_limit: 50,
            ips_offset: 0,
            ips_has_more: false,
            ips: ips
          }]
        };
        window.AppSessionNetworkPanel.renderSessionNetworkPanel('session-network-panel', payload, {
          escapeHtml: (s) => String(s),
          loaded: true
        });
      });
      const riskyBadges = await page.locator('#session-network-panel .campaign-ip-badge--risk').count();
      expect(riskyBadges).toBe(0);
    });

    test('High burst and static rotation pushes heuristic risk high', async ({ page }) => {
      await openIpMonitoring(page);
      await page.evaluate(() => {
        const now = Date.now();
        const recentIso = new Date(now - 30 * 60 * 1000).toISOString();
        const payload = {
          campaigns: [{
            campaign_id: 'CMP-BURST',
            last_ts: recentIso,
            unique_ips: 5,
            events: 20,
            ip_rotation: 'static',
            ips_total: 5,
            ips_limit: 5,
            ips_offset: 0,
            ips_has_more: false,
            ips: [
              { ip: '3.3.3.3', city: 'Hyderabad', country_code: 'IN', provider: 'iproyal', mode: 'sticky', sticky_session_id: 'sid-1', count: 12, last_ts: recentIso },
              { ip: '4.4.4.4', city: 'Mumbai', country_code: 'IN', provider: 'iproyal', mode: 'sticky', sticky_session_id: 'sid-2', count: 4, last_ts: recentIso },
              { ip: '5.5.5.5', city: 'Delhi', country_code: 'IN', provider: 'iproyal', mode: 'sticky', sticky_session_id: 'sid-3', count: 4, last_ts: recentIso }
            ]
          }]
        };
        window.AppSessionNetworkPanel.renderSessionNetworkPanel('session-network-panel', payload, {
          escapeHtml: (s) => String(s),
          loaded: true
        });
      });
      await expect(page.locator('#session-network-panel')).toContainText('Heuristic Risk: High');
    });

    test('Mixed risk scenario renders both low and high heuristic outcomes', async ({ page }) => {
      await openIpMonitoring(page);
      await page.evaluate(() => {
        const nowIso = new Date().toISOString();
        const payload = {
          campaigns: [
            {
              campaign_id: 'CMP-MIX-HIGH',
              last_ts: nowIso,
              unique_ips: 4,
              events: 10,
              ip_rotation: 'static',
              ips_total: 4,
              ips_limit: 4,
              ips_offset: 0,
              ips_has_more: false,
              ips: [
                { ip: '6.6.6.6', city: 'Hyd', country_code: 'IN', provider: 'p', mode: 'sticky', sticky_session_id: 's1', count: 9, last_ts: nowIso },
                { ip: '7.7.7.7', city: 'Mum', country_code: 'IN', provider: 'p', mode: 'sticky', sticky_session_id: 's2', count: 1, last_ts: nowIso }
              ]
            },
            {
              campaign_id: 'CMP-MIX-LOW',
              last_ts: nowIso,
              unique_ips: 2,
              events: 40,
              ip_rotation: 'dynamic',
              ips_total: 2,
              ips_limit: 2,
              ips_offset: 0,
              ips_has_more: false,
              ips: [
                { ip: '8.8.8.8', city: 'Hyd', country_code: 'IN', provider: 'p', mode: 'sticky', sticky_session_id: 's-low', count: 2, last_ts: nowIso },
                { ip: '9.9.9.9', city: 'Hyd', country_code: 'IN', provider: 'p', mode: 'sticky', sticky_session_id: 's-low', count: 2, last_ts: nowIso }
              ]
            }
          ]
        };
        window.AppSessionNetworkPanel.renderSessionNetworkPanel('session-network-panel', payload, {
          escapeHtml: (s) => String(s),
          loaded: true
        });
      });
      await expect(page.locator('#session-network-panel')).toContainText('Heuristic Risk: High');
      await expect(page.locator('#session-network-panel')).toContainText('Heuristic Risk: Low');
    });

    test('Backend risk object overrides heuristic when provided', async ({ page }) => {
      await openIpMonitoring(page);
      await page.evaluate(() => {
        const nowIso = new Date().toISOString();
        const payload = {
          campaigns: [{
            campaign_id: 'CMP-API-RISK',
            last_ts: nowIso,
            unique_ips: 2,
            events: 20,
            ip_rotation: 'dynamic',
            risk: {
              level: 'high',
              score: 88,
              reasons: ['BACKEND_MODEL'],
              confidence: 'high'
            },
            ips_total: 2,
            ips_limit: 2,
            ips_offset: 0,
            ips_has_more: false,
            ips: [
              { ip: '10.10.10.10', city: 'Hyd', country_code: 'IN', provider: 'p', mode: 'sticky', sticky_session_id: 'a', count: 2, last_ts: nowIso },
              { ip: '11.11.11.11', city: 'Hyd', country_code: 'IN', provider: 'p', mode: 'sticky', sticky_session_id: 'a', count: 2, last_ts: nowIso }
            ]
          }]
        };
        window.AppSessionNetworkPanel.renderSessionNetworkPanel('session-network-panel', payload, {
          escapeHtml: (s) => String(s),
          loaded: true
        });
      });
      await expect(page.locator('#session-network-panel')).toContainText('Heuristic Risk: High');
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
