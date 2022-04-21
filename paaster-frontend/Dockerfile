FROM node AS builder
COPY . .

ARG VITE_NAME
ARG VITE_BACKEND

RUN touch /.env
RUN echo "VITE_NAME=${VITE_NAME}\nVITE_BACKEND=${VITE_BACKEND}" > .env

RUN npm install && npm run build


FROM nginx:alpine
WORKDIR /usr/share/nginx/html
RUN rm -rf ./*

RUN rm /etc/nginx/nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx

COPY --from=builder ./dist .

ENTRYPOINT ["nginx", "-g", "daemon off;"]
