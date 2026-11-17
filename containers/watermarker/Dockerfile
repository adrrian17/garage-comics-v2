FROM python:3.13-slim

# pikepdf is Python bindings over libqpdf; its wheel bundles libqpdf, so no system packages are needed.
RUN pip install --no-cache-dir pikepdf==10.18.2

WORKDIR /app
COPY stamp.py server.py ./

RUN python stamp.py --self-check

USER nobody
EXPOSE 8080
CMD ["python", "server.py"]
