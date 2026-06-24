compose := "docker compose --env-file config/sockudo/.env --env-file config/redis/.env --env-file config/postgres/.env --env-file config/dashboard-api/.env --env-file config/dashboard-web/.env --env-file config/grafana/.env -f docker/docker-compose.yml"

up:
	{{compose}} up -d

scale replicas="2":
	{{compose}} up -d --scale sockudo={{replicas}}

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

metrics:
	curl -f http://127.0.0.1:9601/metrics

prometheus:
	@echo "Prometheus: http://127.0.0.1:9090"

targets:
	@echo "Sockudo targets: http://127.0.0.1:9090/targets?search=sockudo"

grafana:
	@echo "Grafana: http://127.0.0.1:3000"
	@echo "Default login comes from config/grafana/.env"

observability:
	@echo "Prometheus: http://127.0.0.1:9090"
	@echo "Grafana: http://127.0.0.1:3000"
	@echo "Dashboard: Sockudo / Sockudo Overview"
