ALTER TABLE droppy_settings ADD COLUMN `proxy_ips` TEXT NULL DEFAULT NULL;
ALTER TABLE droppy_settings ADD COLUMN `use_alt_download` INT NOT NULL DEFAULT 0;
ALTER TABLE droppy_settings ADD COLUMN `ip_upload_limit` INT NOT NULL DEFAULT 50;