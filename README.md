# FileBin — File Sharing Service

Self-hosted file sharing service berbasis [FileBin](https://github.com/Bluewind/filebin), dideploy via Docker menggunakan image [varakh/filebin](https://hub.docker.com/r/varakh/filebin).

## Stack
- **App:** PHP/CodeIgniter (varakh/filebin)
- **Database:** PostgreSQL 16
- **Reverse Proxy:** (opsional) Nginx
- **Runtime:** Docker + Docker Compose

## Quick Start

```bash
# 1. Clone repo
git clone <repo-url>
cd webapp

# 2. Salin dan edit konfigurasi
cp .env.example .env
# Edit BASE_URL dan ENCRYPTION_KEY di .env

# 3. Jalankan
docker compose up -d

# 4. Buat user pertama
docker exec -it filebin_app php /var/www/index.php user add_user

# 5. Buka browser
open http://localhost:8080
```

## Perintah Berguna

| Perintah | Fungsi |
|---|---|
| `make up` | Start semua container |
| `make down` | Stop container |
| `make logs` | Lihat log real-time |
| `make status` | Status container |
| `make create-user` | Buat user baru |
| `make backup` | Backup database |
| `make update` | Update ke image terbaru |
| `make shell` | Shell ke container app |

## Konfigurasi (.env)

| Variable | Default | Keterangan |
|---|---|---|
| `BASE_URL` | `http://localhost:8080/` | URL publik (wajib diubah) |
| `ENCRYPTION_KEY` | (generated) | Key enkripsi 32 hex chars |
| `DB_PASS` | `fbSecurePass2024` | Password database |

## Port
- **8080** → FileBin web app

## Data Persistence
- `fb-data-vol` → Upload files (`/var/www/data/uploads`)  
- `fb-db-vol` → PostgreSQL data (`/var/lib/postgresql/data`)
