DO $$
BEGIN
  IF to_regclass('public.dashboard_users') IS NULL THEN
    RAISE EXCEPTION 'Expected public.dashboard_users to exist. Start dashboard-api before running this script.';
  END IF;

  IF to_regclass('public.applications') IS NULL THEN
    RAISE EXCEPTION 'Expected public.applications to exist. Start sockudo/dashboard-api before running this script.';
  END IF;
END;
$$;

UPDATE public.dashboard_users
SET active = true
WHERE active IS DISTINCT FROM true;

INSERT INTO public.applications (
  id,
  key,
  secret,
  max_connections,
  enable_client_messages,
  enabled,
  max_backend_events_per_second,
  max_client_events_per_second,
  max_read_requests_per_second,
  max_presence_members_per_channel,
  max_presence_member_size_in_kb,
  max_channel_name_length,
  max_event_channels_at_once,
  max_event_name_length,
  max_event_payload_in_kb,
  max_event_batch_size,
  enable_user_authentication,
  enable_watchlist_events,
  policy,
  webhooks,
  allowed_origins,
  created_at,
  updated_at,
  channel_delta_compression,
  idempotency,
  connection_recovery
)
VALUES (
  'local-test-app',
  'local-test-app-key',
  '9d651dd2eaebfb1b2fb2513d06911dfbf51e88dcdbe6f722',
  1000000,
  false,
  true,
  1000000,
  1000000,
  1000000,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  false,
  '{
    "limits": {
      "max_connections": 1000000,
      "max_client_events_per_second": 1000000,
      "max_backend_events_per_second": 1000000,
      "max_read_requests_per_second": 1000000
    },
    "features": {
      "enable_client_messages": false,
      "enable_user_authentication": false,
      "enable_watchlist_events": false
    },
    "channels": {
      "allowed_origins": ["*"]
    },
    "webhooks": []
  }'::jsonb,
  '[]'::jsonb,
  '["*"]'::jsonb,
  now(),
  now(),
  NULL,
  NULL,
  NULL
)
ON CONFLICT (id) DO UPDATE
SET
  key = EXCLUDED.key,
  secret = EXCLUDED.secret,
  max_connections = EXCLUDED.max_connections,
  enable_client_messages = EXCLUDED.enable_client_messages,
  enabled = EXCLUDED.enabled,
  max_backend_events_per_second = EXCLUDED.max_backend_events_per_second,
  max_client_events_per_second = EXCLUDED.max_client_events_per_second,
  max_read_requests_per_second = EXCLUDED.max_read_requests_per_second,
  enable_user_authentication = EXCLUDED.enable_user_authentication,
  enable_watchlist_events = EXCLUDED.enable_watchlist_events,
  policy = EXCLUDED.policy,
  webhooks = EXCLUDED.webhooks,
  allowed_origins = EXCLUDED.allowed_origins,
  updated_at = now();
