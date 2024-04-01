#!/bin/sh
ROOT_DIR=/usr/share/nginx/html

# Replace env vars in JavaScript and HTML files served by NGINX
find "$ROOT_DIR" -type f \( -name "*.js" -o -name "*.html" \) -exec sed -i 's|VITE_NAME_PLACEHOLDER|'"$VITE_NAME"'|g' {} +
find "$ROOT_DIR" -type f \( -name "*.js" -o -name "*.html" \) -exec sed -i 's|VITE_API_URL_PLACEHOLDER|'"$VITE_API_URL"'|g' {} +
