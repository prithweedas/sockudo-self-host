import { config } from 'dotenv';
import { Command } from 'commander';
import { Pusher } from 'pusher-js';

config({ path: new URL('./.env.consumer', import.meta.url) });

const program = new Command();

program
  .option('-c, --channel <channel>', 'channel to subscribe to', process.env.CHANNEL ?? 'test-channel')
  .option('-e, --event <event>', 'event to listen for', process.env.EVENT ?? 'test-event')
  .parse();

const { channel: channelName, event: eventName } = program.opts();

const appKey = process.env.SOCKUDO_DEFAULT_APP_KEY ?? 'app-key';
const host = process.env.SOCKUDO_HOST ?? '127.0.0.1';
const port = Number(process.env.SOCKUDO_PORT ?? 6001);

const pusher = new Pusher(appKey, {
  cluster: 'mt1',
  enabledTransports: ['ws'],
  forceTLS: false,
  wsHost: host,
  wsPort: port,
});

pusher.connection.bind('state_change', ({ previous, current }) => {
  console.log(`Connection state changed: ${previous} -> ${current}`);
});

pusher.connection.bind('error', (error) => {
  console.error('Connection error:', error);
});

const channel = pusher.subscribe(channelName);

channel.bind('pusher:subscription_succeeded', () => {
  console.log(`Subscribed to ${channelName}; waiting for ${eventName}`);
});

channel.bind('pusher:subscription_error', (error) => {
  console.error(`Subscription error on ${channelName}:`, error);
});

channel.bind(eventName, (data) => {
  console.log(`Received ${eventName} on ${channelName}:`);
  console.log(JSON.stringify(data, null, 2));
});

process.on('SIGINT', () => {
  console.log('\nDisconnecting consumer...');
  pusher.disconnect();
  process.exit(0);
});
