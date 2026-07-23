#!/bin/bash
set -e

CONF_DIR=/var/www/html/application/config

# --- Patch database.php ---
sed -i "s/'hostname' => 'localhost'/'hostname' => '${DB_HOST:-db}'/" $CONF_DIR/database.php
sed -i "s/'username' => ''/'username' => '${DB_USER:-droppy}'/" $CONF_DIR/database.php
sed -i "s/'password' => ''/'password' => '${DB_PASS:-droppyPass2024}'/" $CONF_DIR/database.php
sed -i "s/'database' => ''/'database' => '${DB_NAME:-droppy}'/" $CONF_DIR/database.php

# --- Patch config.php ---
sed -i "s|\$config\['base_url'\] = ''|\$config['base_url'] = '${BASE_URL:-https://sis5.xyz/}'|" $CONF_DIR/config.php
sed -i "s|\$config\['encryption_key'\] = ''|\$config['encryption_key'] = '${ENCRYPTION_KEY:-a8f3d2e1c9b4f7a0e5d6c3b2a1f8e9d0}'|" $CONF_DIR/config.php

echo "[droppy] Config patched successfully"
echo "[droppy] base_url = ${BASE_URL:-https://sis5.xyz/}"
echo "[droppy] db_host  = ${DB_HOST:-db}"

# Start Apache
exec apache2-foreground
