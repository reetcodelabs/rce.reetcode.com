FROM node:20-bookworm

ARG DEBIAN_FRONTEND=noninteractive

WORKDIR /app

RUN npm install -g pnpm

COPY . .

# Update package lists
RUN apt-get update

# Upgrade OS dependencies
RUN apt-get upgrade -y

# Install necessary build and development packages
RUN apt-get install -y \
    coreutils binutils build-essential libseccomp-dev gcc \
    apt-utils curl tar bzip2 gzip make cmake zip unzip autoconf pkg-config \
    flex perl sed clang libc6-dev libc6

# Build the 'nosocket' component
RUN make -C ./nosocket/ all && make -C ./nosocket/ install

# Install npm dependencies without package-lock.json
RUN pnpm i

# Run custom installation script
RUN node ./scripts/install.cjs

# Clean up unnecessary packages to reduce image size
RUN apt-get remove -y bzip2 make cmake zip unzip flex clang gcc g++ apt-utils build-essential

# Register OS users
RUN node ./scripts/register-users.cjs

# Build the application
RUN pnpm build

# Remove dev dependencies and install only runtime dependencies
RUN rm -rf node_modules

RUN pnpm i

# Clean up package lists and other unnecessary files
RUN apt-get autoremove -y && apt-get clean -y && rm -rf /var/lib/apt/lists/*

ENV PORT=50051

ENV NODE_ENV=production

EXPOSE ${PORT}

CMD ["node", "./dist/index.js"]
