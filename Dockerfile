FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 IKA_DB=/data/ika.db
WORKDIR /srv
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY ika_inactives.py ./
COPY app ./app

RUN useradd --uid 1000 --create-home ika && mkdir -p /data && chown ika /data
USER ika
VOLUME /data
EXPOSE 8080
HEALTHCHECK --interval=60s --timeout=5s CMD python -c "import urllib.request,os; urllib.request.urlopen('http://127.0.0.1:8080/health')" || exit 1
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
