import { config } from 'dotenv';
import { Command } from 'commander';
import { createHmac } from 'node:crypto';
import { Pusher } from 'pusher-js';

config({ path: new URL('./.env.consumer', import.meta.url) });

const program = new Command();

program
  .option('--user-id <userId>', 'presence user id', process.env.DEMO_USER_ID ?? 'demo-user-1')
  .option('--user-name <userName>', 'presence user name', process.env.DEMO_USER_NAME ?? 'Demo User')
  .parse();

const { userId, userName } = program.opts();

const appKey = process.env.SOCKUDO_DEFAULT_APP_KEY ?? 'app-key';
const appSecret = process.env.SOCKUDO_DEFAULT_APP_SECRET ?? 'app-secret';
const host = process.env.SOCKUDO_HOST ?? '127.0.0.1';
const port = Number(process.env.SOCKUDO_PORT ?? 6001);

const subscriptions = [
  {
    name: 'public-clock',
    event: 'clock.tick',
    label: 'UTC clock',
  },
  {
    name: 'private-prices-aapl',
    event: 'stock.price.updated',
    label: 'AAPL feed',
  },
  {
    name: 'private-prices-googl',
    event: 'stock.price.updated',
    label: 'GOOGL feed',
  },
  {
    name: 'presence-notifications',
    event: 'notification.created',
    label: 'Notifications',
    presence: true,
  },
];

function sign(value) {
  return createHmac('sha256', appSecret).update(value).digest('hex');
}

function authorizeChannel(socketId, channelName) {
  if (channelName.startsWith('presence-')) {
    const channelData = JSON.stringify({
      user_id: userId,
      user_info: {
        name: userName,
      },
    });
    const signature = sign(`${socketId}:${channelName}:${channelData}`);

    return {
      auth: `${appKey}:${signature}`,
      channel_data: channelData,
    };
  }

  const signature = sign(`${socketId}:${channelName}`);

  return {
    auth: `${appKey}:${signature}`,
  };
}

const pusher = new Pusher(appKey, {
  cluster: 'mt1',
  enabledTransports: ['ws'],
  forceTLS: false,
  wsHost: host,
  wsPort: port,
  channelAuthorization: {
    customHandler: ({ socketId, channelName }, callback) => {
      try {
        callback(null, authorizeChannel(socketId, channelName));
      } catch (error) {
        callback(error);
      }
    },
  },
});

pusher.connection.bind('state_change', ({ previous, current }) => {
  console.log(`Connection state changed: ${previous} -> ${current}`);
});

pusher.connection.bind('error', (error) => {
  console.error('Connection error:', error);
});

for (const subscription of subscriptions) {
  const channel = pusher.subscribe(subscription.name);

  channel.bind('pusher:subscription_succeeded', (members) => {
    console.log(`Subscribed to ${subscription.name} (${subscription.label}); waiting for ${subscription.event}`);

    if (subscription.presence && members) {
      console.log(`Presence members in ${subscription.name}: ${members.count ?? 'unknown'}`);
    }
  });

  channel.bind('pusher:subscription_error', (error) => {
    console.error(`Subscription error on ${subscription.name}:`, error);
  });

  if (subscription.presence) {
    channel.bind('pusher:member_added', (member) => {
      console.log(`Presence member joined ${subscription.name}: ${member.id}`);
    });

    channel.bind('pusher:member_removed', (member) => {
      console.log(`Presence member left ${subscription.name}: ${member.id}`);
    });
  }

  channel.bind(subscription.event, (data) => {
    console.log(`Received ${subscription.event} on ${subscription.name}:`);
    console.log(JSON.stringify(data, null, 2));
  });
}

process.on('SIGINT', () => {
  console.log('\nDisconnecting consumer...');
  pusher.disconnect();
  process.exit(0);
});
