FROM python:3.14-slim@sha256:cea0e6040540fb2b965b6e7fb5ffa00871e632eef63719f0ea54bca189ce14a6 AS builder

WORKDIR /app
ENV VIRTUAL_ENV=/opt/venv \
    PATH="/opt/venv/bin:$PATH" \
    XDG_DATA_HOME=/opt/argos-data \
    ARGOS_CHUNK_TYPE=MINISBD \
    ARGOS_DEVICE_TYPE=cpu

RUN python -m venv "$VIRTUAL_ENV" \
    && apt-get update \
    && apt-get install -y --no-install-recommends gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Kopiujemy requirements i instalujemy paczki
COPY requirements.txt .
RUN grep -v '^argostranslate==' requirements.txt > /tmp/requirements-without-argos.txt \
    && pip install --no-cache-dir --requirement /tmp/requirements-without-argos.txt \
    && pip install --no-cache-dir --no-deps argostranslate==1.11.0 \
    && python -c "from pathlib import Path; p=Path('/opt/venv/lib/python3.11/site-packages/argostranslate/sbd.py'); s=p.read_text(); s=s.replace('import stanza\n', 'try:\n    import stanza\nexcept ImportError:\n    stanza = None\n'); p.write_text(s)"

# Jedyny model językowy aplikacji: polski oryginał -> angielska kopia.
ARG ARGOS_MODEL_SHA256=07eda9edbd6ae5121df7c1d7bd847030423269b8c5056f1c222495c4a81e1721
RUN python -c "import hashlib,urllib.request; p='/tmp/pl-en.argosmodel'; urllib.request.urlretrieve('https://data.argosopentech.com/argospm/v1/translate-pl_en-1_9.argosmodel',p); actual=hashlib.sha256(open(p,'rb').read()).hexdigest(); assert actual=='${ARGOS_MODEL_SHA256}', f'Argos SHA-256 mismatch: {actual}'" \
    && python -c "from argostranslate import package; package.install_from_path('/tmp/pl-en.argosmodel')" \
    && python -c "from argostranslate import translate; pl=next(x for x in translate.get_installed_languages() if x.code=='pl'); en=next(x for x in translate.get_installed_languages() if x.code=='en'); result=pl.get_translation(en).translate('To jest test.'); assert result" \
    && rm -f /tmp/pl-en.argosmodel \
    && pip uninstall --yes pip setuptools

FROM python:3.14-slim@sha256:cea0e6040540fb2b965b6e7fb5ffa00871e632eef63719f0ea54bca189ce14a6

ENV VIRTUAL_ENV=/opt/venv \
    PATH="/opt/venv/bin:$PATH" \
    XDG_DATA_HOME=/opt/argos-data \
    ARGOS_CHUNK_TYPE=MINISBD \
    ARGOS_DEVICE_TYPE=cpu \
    HOME=/tmp \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN groupadd --system --gid 10001 webownik \
    && useradd --system --uid 10001 --gid webownik --home-dir /app --shell /usr/sbin/nologin webownik

WORKDIR /app
COPY --from=builder /opt/venv /opt/venv
COPY --from=builder /opt/argos-data /opt/argos-data
COPY . .
RUN chown -R webownik:webownik /app /opt/argos-data

USER 10001:10001
