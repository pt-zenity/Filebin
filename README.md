# Droppy — Online File Sharing

Self-hosted file sharing berbasis **Droppy** (CodeIgniter/PHP), dideploy via Docker dengan SSL Cloudflare.

## Stack
- **App**: PHP 8.1 + Apache (custom Docker image)
- **Database**: MySQL 8.0
- **Reverse Proxy**: Traefik v3 (Dokploy)
- **SSL**: Cloudflare Origin Certificate (RSA 4096, valid 15 tahun)

## URL
**https://sis5.xyz**

## Quick Start

```bash
# 1. Salin dan edit konfigurasi
cp .env.example .env

# 2. Build dan jalankan
docker compose up -d --build

# 3. Cek status
docker compose ps
docker compose logs -f app
```

## Perintah Berguna

```bash
docker compose ps               # Status containers
docker compose logs -f app      # Log aplikasi
docker compose logs -f db       # Log database
docker compose restart app      # Restart app
docker compose down             # Stop semua
docker compose up -d --build    # Rebuild dan start
```

## Konfigurasi (.env)

| Variable | Keterangan |
|---|---|
| `BASE_URL` | URL publik app |
| `ENCRYPTION_KEY` | 32-char hex key untuk enkripsi session |
| `DB_PASS` | Password user database |
| `DB_ROOT_PASS` | Password root database |

## Struktur File

```
.
├── Dockerfile          # PHP 8.1 + Apache image
├── entrypoint.sh       # Auto-patch config saat container start
├── docker-compose.yml  # Service: app + db
├── .env                # Konfigurasi aktif (tidak di-commit)
├── .env.example        # Template konfigurasi
└── Files/              # Source code Droppy (CodeIgniter)
    ├── application/
    ├── assets/
    ├── uploads/
    └── index.php
```

## Traefik Config (server)

```
/etc/dokploy/traefik/dynamic/droppy.yml          # Router: sis5.xyz -> droppy_app
/etc/dokploy/traefik/dynamic/certificates/       # SSL cert & key
```
