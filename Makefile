# FileBin Docker — Makefile helper
# Usage: make <target>

.PHONY: up down restart logs status shell shell-db backup restore create-user pull update clean

## Start semua container
up:
	docker compose up -d

## Stop dan hapus container
down:
	docker compose down

## Restart semua container
restart:
	docker compose restart

## Lihat log real-time
logs:
	docker compose logs -f

## Log app saja
logs-app:
	docker compose logs -f app

## Status container
status:
	docker compose ps

## Masuk ke shell container app
shell:
	docker exec -it filebin_app sh

## Masuk ke shell container db
shell-db:
	docker exec -it filebin_db psql -U fb -d fb

## Buat user baru (jalankan setelah container up)
create-user:
	docker exec -it filebin_app php /var/www/index.php user add_user

## Backup database
backup:
	@mkdir -p ./backups
	docker exec filebin_db bash -c "/usr/bin/pg_dumpall -U fb | gzip -c > /filebin_db.sql.gz"
	docker cp filebin_db:/filebin_db.sql.gz ./backups/filebin_db_$$(date +%Y%m%d_%H%M%S).sql.gz
	docker exec filebin_db bash -c "rm /filebin_db.sql.gz"
	@echo "Backup selesai di ./backups/"

## Pull image terbaru dan restart
update:
	docker compose pull
	docker compose up -d --force-recreate

## Hapus semua container, image, dan volume (HATI-HATI: data hilang!)
clean:
	docker compose down -v --rmi all
