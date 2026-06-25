compose := "docker compose --env-file config/sockudo/.env --env-file config/redis/.env --env-file config/mysql/.env --env-file config/dashboard-api/.env --env-file config/dashboard-web/.env --env-file config/grafana/.env -f docker/docker-compose.yml"

setup-env:
  @for file in config/*/.env.example scripts/.env.*.example; do \
    target="${file%.example}"; \
    if [ -f "$target" ]; then \
      echo "Skipping $target"; \
    else \
      cp "$file" "$target"; \
      echo "Created $target"; \
    fi; \
  done
  cd scripts && pnpm install

up:
  {{compose}} up -d
  {{compose}} up -d --wait dashboard-api
  just bootstrap-dashboard-app

scale replicas="2":
  {{compose}} up -d --scale sockudo={{replicas}}
  {{compose}} up -d --scale sockudo={{replicas}} --wait dashboard-api
  just bootstrap-dashboard-app

bootstrap-dashboard-app:
  cd scripts && pnpm bootstrap:dashboard-app

down:
  {{compose}} down -v

restart:
  {{compose}} restart

logs:
  {{compose}} logs -f

ps:
  {{compose}} ps

config:
  {{compose}} config

health:
  curl -f http://127.0.0.1:6001/up
