FROM node:24-bookworm

USER root
RUN apt-get update && apt-get install -y \
  git curl ca-certificates bash \
  && rm -rf /var/lib/apt/lists/*

RUN corepack disable || true
RUN npm i -g pnpm

# 安裝 starship
RUN curl -sS https://starship.rs/install.sh | sh -s -- -y

# 切回 node 使用者
USER node
WORKDIR /workspaces

# ✅ 確保 store 目錄存在、並設定給 node 的 user config
RUN mkdir -p /home/node/.pnpm-store \
  && pnpm config set store-dir /home/node/.pnpm-store

# 建立 config 目錄
RUN mkdir -p /home/node/.config

# 複製 starship 設定
COPY starship.toml /home/node/.config/starship.toml

# 啟用 starship
RUN echo 'eval "$(starship init bash)"' >> /home/node/.bashrc