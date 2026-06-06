# ============================================================
#  ARable GLB -> USDZ converter
#  Base image already contains Google's usd_from_gltf binary.
#  We add Node.js + the Express wrapper (server.js).
# ============================================================
FROM leon/usd-from-gltf:latest

# Install Node.js 20 (base image is Ubuntu-based)
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY server.js ./

# The base image sets usd_from_gltf as ENTRYPOINT; reset it so we run Node.
ENTRYPOINT []
ENV PORT=3000
# If the binary is not auto-detected, set its absolute path here, e.g.:
# ENV UFG_BIN=/usr/local/bin/usd_from_gltf
EXPOSE 3000
CMD ["node", "server.js"]
