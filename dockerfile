# Stage 1: Build React
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Run Backend + Serve Frontend
FROM node:18-alpine
WORKDIR /app

# Copy backend files
COPY package*.json ./
RUN npm install --production
COPY *.js ./

# สร้าง uploads folder
RUN mkdir -p uploads/images

# Copy built frontend
COPY --from=build /app/dist ./public

# Install serve
RUN npm install -g serve

EXPOSE 80 3040

COPY start.sh ./
RUN chmod +x start.sh
CMD ["./start.sh"]