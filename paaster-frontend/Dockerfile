FROM node:lts AS builder
COPY . .
RUN npm install && npm run build

FROM nginx:alpine
WORKDIR /usr/share/nginx/html
RUN rm -rf ./*
COPY --from=builder ./dist .

ENTRYPOINT ["nginx", "-g", "daemon off;"]