compose := "docker compose --env-file config/sockudo/.env --env-file config/redis/.env -f docker/docker-compose.yml"

up:
	{{compose}} up -d

down:
	{{compose}} down

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
	curl -f http://127.0.0.1:9601/metrics