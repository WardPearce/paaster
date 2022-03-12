FROM tiangolo/uvicorn-gunicorn:python3.9

LABEL maintainer="WardPearce <wardpearce@pm.me>"

COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

COPY ./ /app
