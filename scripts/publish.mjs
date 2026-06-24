import { config } from 'dotenv';
import { Command } from 'commander';
import Pusher from 'pusher';

config({ path: new URL('./.env.publish', import.meta.url) });

const program = new Command();

program
  .option('-c, --channel <channel>', 'channel to publish to', process.env.CHANNEL ?? 'test-channel')
  .option('-e, --event <event>', 'event to trigger', process.env.EVENT ?? 'test-event')
  .option('-m, --message <message>', 'message to send', process.env.MESSAGE ?? 'hello from publisher')
  .parse();

const { channel: channelName, event: eventName, message } = program.opts();

const pusher = new Pusher({
  appId: process.env.SOCKUDO_DEFAULT_APP_ID ?? 'app-id',
  key: process.env.SOCKUDO_DEFAULT_APP_KEY ?? 'app-key',
  secret: process.env.SOCKUDO_DEFAULT_APP_SECRET ?? 'app-secret',
  host: process.env.SOCKUDO_HOST ?? '127.0.0.1',
  port: process.env.SOCKUDO_PORT ?? '6001',
  useTLS: false,
  cluster: 'mt1',
});

const payload = {
  message,
  sentAt: new Date().toISOString(),
};

await pusher.trigger(channelName, eventName, payload);

console.log(`Published ${eventName} to ${channelName}:`);
console.log(JSON.stringify(payload, null, 2));
