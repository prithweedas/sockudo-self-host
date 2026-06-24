import { config } from 'dotenv';
import { Command } from 'commander';
import Pusher from 'pusher';

config({ path: new URL('./.env.publish', import.meta.url) });

const program = new Command();

program
  .option('--stock-interval-ms <ms>', 'stock feed interval', process.env.STOCK_INTERVAL_MS ?? '1000')
  .option('--clock-interval-ms <ms>', 'clock tick interval', process.env.CLOCK_INTERVAL_MS ?? '30000')
  .option(
    '--notification-interval-ms <ms>',
    'notification event interval',
    process.env.NOTIFICATION_INTERVAL_MS ?? '5000',
  )
  .parse();

const options = program.opts();
const stockIntervalMs = Number(options.stockIntervalMs);
const clockIntervalMs = Number(options.clockIntervalMs);
const notificationIntervalMs = Number(options.notificationIntervalMs);

const pusher = new Pusher({
  appId: process.env.SOCKUDO_DEFAULT_APP_ID ?? 'app-id',
  key: process.env.SOCKUDO_DEFAULT_APP_KEY ?? 'app-key',
  secret: process.env.SOCKUDO_DEFAULT_APP_SECRET ?? 'app-secret',
  host: process.env.SOCKUDO_HOST ?? '127.0.0.1',
  port: process.env.SOCKUDO_PORT ?? '6001',
  useTLS: false,
  cluster: 'mt1',
});

const notificationTitles = [
  'New message from Alice',
  'New mention in Support Room',
  'New deployment notification',
  'New approval request',
  'New incident update',
  'New comment on your ticket',
];

const timers = [];

function randomPrice() {
  return Number((100 + Math.random() * 400).toFixed(2));
}

function randomNotificationTitle() {
  return notificationTitles[Math.floor(Math.random() * notificationTitles.length)];
}

async function publish(channel, event, payload) {
  try {
    await pusher.trigger(channel, event, payload);
    console.log(`Published ${event} to ${channel}: ${JSON.stringify(payload)}`);
  } catch (error) {
    console.error(`Failed to publish ${event} to ${channel}:`, error);
  }
}

function publishClockTick() {
  return publish('public-clock', 'clock.tick', {
    utcTime: new Date().toISOString(),
    sentAt: new Date().toISOString(),
  });
}

function publishStockPrice(symbol, channel) {
  return publish(channel, 'stock.price.updated', {
    symbol,
    price: randomPrice(),
    currency: 'USD',
    sentAt: new Date().toISOString(),
  });
}

function publishNotification() {
  return publish('presence-notifications', 'notification.created', {
    type: 'new_message',
    title: randomNotificationTitle(),
    sentAt: new Date().toISOString(),
  });
}

function schedule(label, intervalMs, callback) {
  void callback();
  const timer = setInterval(() => {
    void callback();
  }, intervalMs);

  timers.push(timer);
  console.log(`Started ${label} every ${intervalMs}ms`);
}

schedule('UTC clock ticks', clockIntervalMs, publishClockTick);
schedule('AAPL price feed', stockIntervalMs, () => publishStockPrice('AAPL', 'private-prices-aapl'));
schedule('GOOGL price feed', stockIntervalMs, () => publishStockPrice('GOOGL', 'private-prices-googl'));
schedule('presence notifications', notificationIntervalMs, publishNotification);

process.on('SIGINT', () => {
  console.log('\nStopping publisher...');
  for (const timer of timers) {
    clearInterval(timer);
  }
  process.exit(0);
});
