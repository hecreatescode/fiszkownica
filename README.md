# 📚 Fiszkownica

**Fiszkownica** to nowoczesna aplikacja webowa typu PWA (Progressive Web App) służąca do efektywnej nauki języków obcych za pomocą fiszek. Wykorzystuje system powtórek w odstępach czasowych (Spaced Repetition System), aby zmaksymalizować zapamiętywanie materiału.

![Wersja](https://img.shields.io/badge/wersja-1.0.1-blue)
![Licencja](https://img.shields.io/badge/licencja-MIT-green)

## ✨ Główne funkcjonalności

*   **🧠 System Spaced Repetition:** Inteligentne planowanie powtórek na podstawie oceny znajomości słówka (Nowe, Uczę się, Prawie umiem, Umiem).
*   **📱 Aplikacja PWA:** Możliwość instalacji na telefonie lub komputerze i pracy w trybie offline.
*   **🎓 Tryby nauki:**
    *   **Standardowa nauka:** Przeglądanie fiszek z możliwością odwracania i oceny.
    *   **Szybka powtórka:** Automatyczne generowanie sesji z fiszek, których termin powtórki właśnie minął.
*   **📝 Tryby testowania:**
    *   Pisanie (wpisywanie tłumaczenia).
    *   Wielokrotny wybór (A, B, C, D).
    *   Prawda / Fałsz.
*   **📊 Statystyki i Grywalizacja:**
    *   Śledzenie postępów, dni nauki z rzędu (streak).
    *   System odznak i osiągnięć (np. "Ranny ptaszek", "Poliglota").
    *   Wykresy postępów.
*   **📂 Zarządzanie materiałem:**
    *   Podział na Działy i Tematy.
    *   Import własnych fiszek z plików tekstowych.
    *   Eksport i import postępów nauki.
*   **🎨 Wygląd:**
    *   Nowoczesny, responsywny interfejs.
    *   Obsługa trybu ciemnego (Dark Mode).

## 🚀 Jak uruchomić

Aplikacja jest dostępna online pod adresem: **[https://hecreatescode.github.io/fiszkownica/](https://hecreatescode.github.io/fiszkownica/)**

Ponieważ jest to statyczna aplikacja webowa, nie wymaga skomplikowanej instalacji backendu.

1.  Sklonuj repozytorium lub pobierz pliki.
2.  Uruchom plik `index.html` w przeglądarce internetowej.
    *   *Zalecane:* Użyj lokalnego serwera (np. Live Server w VS Code), aby w pełni korzystać z funkcji PWA i Service Workera.
3.  Aby zainstalować aplikację, kliknij przycisk "Zainstaluj aplikację" w stopce lub w pasku adresu przeglądarki (Chrome/Edge).

## 📥 Format importu fiszek

Możesz dodać własne zestawy fiszek, importując plik `.txt`. Format pliku musi być następujący:

```text
polskie słowo - angielskie tłumaczenie
kot - cat
pies - dog
dom - house
```

*   Każda para w nowej linii.
*   Separator to myślnik otoczony spacjami (` - `).
*   Kodowanie pliku: UTF-8.

## 🛠️ Technologie

*   **HTML5** - Struktura semantyczna.
*   **CSS3** - Stylowanie (Flexbox, Grid, Zmienne CSS, Animacje).
*   **JavaScript (ES6+)** - Logika aplikacji, obsługa danych, PWA.
*   **JSON** - Przechowywanie danych o zestawach fiszek.
*   **Service Worker** - Obsługa trybu offline i cache'owania.
*   **Chart.js** - Generowanie wykresów w statystykach.
*   **Font Awesome** - Ikony.

## 📂 Struktura plików

*   `index.html` - Główny plik aplikacji.
*   `style.css` - Arkusze stylów.
*   `script.js` - Główna logika aplikacji.
*   `service-worker.js` - Konfiguracja PWA i cache.
*   `manifest.json` - Metadane aplikacji PWA.
*   `data/` - Folder zawierający pliki JSON z zestawami fiszek.

## 🤝 Autor

Projekt stworzony w latach 2025-2026.

---

*Aplikacja stworzona w celach edukacyjnych.*