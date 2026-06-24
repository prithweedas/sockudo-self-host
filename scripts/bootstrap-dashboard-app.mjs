import { config } from 'dotenv';

config({ path: new URL('../config/dashboard-api/.env', import.meta.url) });
config({ path: new URL('./.env.publish', import.meta.url) });

const dashboardApiUrl = process.env.DASHBOARD_API_URL
  ?? `http://127.0.0.1:${process.env.DASHBOARD_API_PORT ?? '3460'}`;
const dashboardEmail = process.env.DASHBOARD_SEED_EMAIL;
const dashboardPassword = process.env.DASHBOARD_SEED_PASSWORD;

const appId = requireEnv('SOCKUDO_DEFAULT_APP_ID', process.env.SOCKUDO_DEFAULT_APP_ID);
const appKey = requireEnv('SOCKUDO_DEFAULT_APP_KEY', process.env.SOCKUDO_DEFAULT_APP_KEY);
const appSecret = requireEnv('SOCKUDO_DEFAULT_APP_SECRET', process.env.SOCKUDO_DEFAULT_APP_SECRET);

const appPayload = {
  id: appId,
  key: appKey,
  secret: appSecret,
  enabled: true,
  policy: {
    limits: {
      max_connections: 1000000,
      max_client_events_per_second: 1000000,
      max_backend_events_per_second: 1000000,
      max_read_requests_per_second: 1000000,
    },
    features: {
      enable_client_messages: false,
      enable_user_authentication: false,
      enable_watchlist_events: false,
    },
    channels: {
      allowed_origins: ['*'],
    },
    webhooks: [],
  },
};

function requireEnv(name, value) {
  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

async function request(path, options = {}) {
  const response = await fetch(new URL(path, dashboardApiUrl), {
    ...options,
    headers: {
      accept: 'application/json',
      ...options.headers,
    },
  });

  const text = await response.text();
  let body = null;

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  return { response, body };
}

async function waitForDashboardApi() {
  const deadline = Date.now() + 30000;
  let lastError = null;

  while (Date.now() < deadline) {
    try {
      const { response } = await request('/health');
      if (response.ok) {
        return;
      }

      lastError = new Error(`dashboard-api /health returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`dashboard-api did not become healthy: ${lastError?.message ?? 'unknown error'}`);
}

async function login() {
  const email = requireEnv('DASHBOARD_SEED_EMAIL', dashboardEmail);
  const password = requireEnv('DASHBOARD_SEED_PASSWORD', dashboardPassword);

  const { response, body } = await request('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(`dashboard login failed with ${response.status}: ${JSON.stringify(body)}`);
  }

  const cookie = response.headers.get('set-cookie');
  if (!cookie) {
    throw new Error('dashboard login did not return a session cookie');
  }

  return cookie.split(';')[0];
}

async function getApp(cookie) {
  const { response, body } = await request(`/api/v1/apps/${encodeURIComponent(appId)}`, {
    headers: { cookie },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`app lookup failed with ${response.status}: ${JSON.stringify(body)}`);
  }

  return body;
}

async function createApp(cookie) {
  const { response, body } = await request('/api/v1/apps', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie,
    },
    body: JSON.stringify(appPayload),
  });

  if (!response.ok) {
    throw new Error(`app create failed with ${response.status}: ${JSON.stringify(body)}`);
  }

  return body;
}

async function updateApp(cookie) {
  const { id, ...updatePayload } = appPayload;
  const { response, body } = await request(`/api/v1/apps/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      cookie,
    },
    body: JSON.stringify(updatePayload),
  });

  if (!response.ok) {
    throw new Error(`app update failed with ${response.status}: ${JSON.stringify(body)}`);
  }

  return body;
}

async function main() {
  console.log(`Waiting for dashboard API at ${dashboardApiUrl}`);
  await waitForDashboardApi();

  const cookie = await login();
  const existing = await getApp(cookie);

  if (existing) {
    await updateApp(cookie);
    console.log(`Updated dashboard app ${appId}`);
  } else {
    await createApp(cookie);
    console.log(`Created dashboard app ${appId}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
