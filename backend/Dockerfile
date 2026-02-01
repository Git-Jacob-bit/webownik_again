FROM python:3.11-slim

WORKDIR /app

# Instalujemy zależności systemowe (potrzebne dla bibliotek do bazy danych)
RUN apt-get update && apt-get install -y gcc libpq-dev

# Kopiujemy requirements i instalujemy paczki
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Kopiujemy resztę kodu
COPY . .
