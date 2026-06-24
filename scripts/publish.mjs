import { config } from 'dotenv';
import Pusher from 'pusher';

config({ path: new URL('../config/sockudo/.env', import.meta.url) });
config();

const pusher = new Pusher({
  appId: process.env.SOCKUDO_DEFAULT_APP_ID ?? 'app-id',
  key: process.env.SOCKUDO_DEFAULT_APP_KEY ?? 'app-key',
  secret: process.env.SOCKUDO_DEFAULT_APP_SECRET ?? 'app-secret',
  host: process.env.SOCKUDO_HOST ?? '127.0.0.1',
  port: process.env.SOCKUDO_PORT ?? '6001',
  useTLS: false,
  cluster: 'mt1',
});

const channelName = process.env.CHANNEL ?? 'test-channel';
const eventName = process.env.EVENT ?? 'test-event';
const payload = {
  message: process.env.MESSAGE ?? 'hello from publisher',
  sentAt: new Date().toISOString(),
};

await pusher.trigger(channelName, eventName, payload);

console.log(`Published ${eventName} to ${channelName}:`);
console.log(JSON.stringify(payload, null, 2));
