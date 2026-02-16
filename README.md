# 🧪 FiszkoTesty

**FiszkoTesty** to odchudzona wersja projektu Fiszkownica, która skupia się wyłącznie na testowaniu słownictwa.

## Co zawiera

- 3 tryby testu:
  - Pisanie
  - Wielokrotny wybór
  - Prawda / Fałsz
- Kierunek tłumaczenia: **PL → EN** oraz **EN → PL**
- Wybór konkretnych działów i tematów
- Powtórkę samych błędów po zakończonym teście
- Zachowany zestaw danych osadzonych w repozytorium (`data/`), taki jak w Fiszkownicy
- Tryb ciemny i PWA

## Uruchomienie

1. Sklonuj repozytorium.
2. Uruchom `index.html` lokalnie lub przez prosty serwer statyczny, np.:

```bash
python3 -m http.server 4173
```

3. Otwórz `http://localhost:4173`.

## Struktura

- `index.html` – interfejs testów
- `style.css` – styl aplikacji
- `script.js` – logika testów
- `data/` – osadzone dane słownictwa
- `service-worker.js`, `manifest.json` – konfiguracja PWA

