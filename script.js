// Fiszkownica - Główny plik JavaScript
// Wersja: 1.0.3 (poprawione liczniki, testy i wizualizacja poziomów)

// ==================== GŁÓWNE ZMIENNE APLIKACJI ====================
let currentDeck = null;
let currentTopic = null;
let currentFlashcards = [];
let currentFlashcardIndex = 0;
let userProgress = {};
let testMode = 'writing';
let testDeck = null;
let testTopic = null;
let testQuestions = [];
let currentTestQuestion = 0;
let testResults = { correct: 0, total: 0 };
let selectedOption = null;
let trueFalseAnswer = null;
let currentTrueFalseCorrect = null;
let currentDeadlineKey = null;
let testLanguage = 'polish';
let currentSortMethod = 'default';
let testTopics = [];
let currentTestFlashcardIndex = -1;
let currentTestFlashcardIndices = [];
let incorrectAnswers = [];
let isReviewMode = false;
let reviewQuestions = [];
let studyMode = 'all';
let originalFlashcards = [];
let testStudyMode = 'all';
let appData = { decks: [] };
let testStartTime = null;
let testEndTime = null;
let selectedTopicsForTest = new Set();

// Licznik testu
let testCounter = {
    current: 0,
    total: 0,
    correct: 0,
    incorrect: 0
};

// System spaced repetition
let spacedRepetitionIntervals = {
    'new': 1,
    'learning': 3,
    'almost': 7,
    'mastered': 30
};

// Osiągnięcia
let achievements = {
    firstMaster: { name: 'Pierwsze kroki', desc: 'Opanuj pierwszą fiszkę', unlocked: false, icon: 'fas fa-star' },
    streak7: { name: 'Konsekwentny', desc: '7 dni nauki z rzędu', unlocked: false, icon: 'fas fa-calendar-check' },
    master100: { name: 'Ekspert', desc: 'Opanuj 100 fiszek', unlocked: false, icon: 'fas fa-trophy' },
    quickLearner: { name: 'Szybki uczeń', desc: 'Opanuj 10 fiszek w jeden dzień', unlocked: false, icon: 'fas fa-bolt' },
    perfectTest: { name: 'Perfekcjonista', desc: 'Zdaj test ze 100% skutecznością', unlocked: false, icon: 'fas fa-perfect' },
    marathon: { name: 'Maratończyk', desc: 'Przećwicz 50 fiszek w jednej sesji', unlocked: false, icon: 'fas fa-running' },
    earlyBird: { name: 'Ranny ptaszek', desc: 'Ucz się przez 7 dni z rzędu przed 9:00', unlocked: false, icon: 'fas fa-sun' },
    polyglot: { name: 'Poliglota', desc: 'Opanuj fiszki z 5 różnych działów', unlocked: false, icon: 'fas fa-language' },
    speedster: { name: 'Szybki jak błyskawica', desc: 'Odpowiedz na 10 pytań w mniej niż 30 sekund', unlocked: false, icon: 'fas fa-stopwatch' },
    collector: { name: 'Kolekcjoner', desc: 'Posiadaj 500 fiszek w swojej kolekcji', unlocked: false, icon: 'fas fa-layer-group' }
};

// Zmienne loadera
let loadingProgress = 0;
let loadingInterval = null;
let deferredPrompt = null;

// ==================== INICJALIZACJA APLIKACJI ====================
document.addEventListener('DOMContentLoaded', function() {
    startLoadingAnimation();
    setupPWA();
    setTimeout(() => initApp(), 500);
});

// ==================== FUNKCJE LOADERA ====================
function startLoadingAnimation() {
    const loader = document.getElementById('pageLoader');
    const progressBar = document.getElementById('loaderProgress');
    const statusText = document.getElementById('loaderStatus');
    const percentageText = document.getElementById('loaderPercentage');
    
    if (!loader) return;
    
    loader.style.display = 'flex';
    
    loadingInterval = setInterval(() => {
        if (loadingProgress < 90) {
            loadingProgress += Math.random() * 10;
            if (loadingProgress > 90) loadingProgress = 90;
            
            if (progressBar) progressBar.style.width = `${loadingProgress}%`;
            if (percentageText) percentageText.textContent = `${Math.round(loadingProgress)}%`;
            if (statusText) updateLoadingStatus(loadingProgress, statusText);
        }
    }, 200);
}

function updateLoadingStatus(progress, statusElement) {
    if (progress < 20) statusElement.textContent = 'Inicjalizacja...';
    else if (progress < 40) statusElement.textContent = 'Ładowanie danych...';
    else if (progress < 60) statusElement.textContent = 'Przygotowywanie interfejsu...';
    else if (progress < 80) statusElement.textContent = 'Ładowanie ustawień...';
    else statusElement.textContent = 'Prawie gotowe...';
}

function finishLoadingAnimation() {
    clearInterval(loadingInterval);
    
    const loader = document.getElementById('pageLoader');
    const progressBar = document.getElementById('loaderProgress');
    const percentageText = document.getElementById('loaderPercentage');
    const statusText = document.getElementById('loaderStatus');
    
    if (!loader) return;
    
    loadingProgress = 100;
    if (progressBar) progressBar.style.width = '100%';
    if (percentageText) percentageText.textContent = '100%';
    if (statusText) statusText.textContent = 'Gotowe!';
    
    setTimeout(() => {
        loader.classList.add('hidden');
        const appContainer = document.querySelector('.app-container');
        if (appContainer) appContainer.style.opacity = '1';
        
        setTimeout(() => {
            loader.style.display = 'none';
        }, 500);
    }, 1000);
}

function updateLoadingProgress(progress, status) {
    loadingProgress = progress;
    const progressBar = document.getElementById('loaderProgress');
    const statusText = document.getElementById('loaderStatus');
    const percentageText = document.getElementById('loaderPercentage');
    
    if (progressBar) progressBar.style.width = `${progress}%`;
    if (statusText) statusText.textContent = status;
    if (percentageText) percentageText.textContent = `${Math.round(progress)}%`;
}

// ==================== PWA FUNCTIONS ====================
function setupPWA() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js')
            .then(registration => {
                console.log('Service Worker zarejestrowany:', registration);
            })
            .catch(error => {
                console.log('Błąd rejestracji Service Worker:', error);
            });
    }
    
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        showInstallButton();
    });
    
    window.addEventListener('appinstalled', () => {
        hideInstallButton();
        showNotification('Aplikacja została zainstalowana!', 'success');
    });
}

function showInstallButton() {
    const installButton = document.getElementById('installButton');
    if (installButton) installButton.style.display = 'flex';
}

function hideInstallButton() {
    const installButton = document.getElementById('installButton');
    if (installButton) installButton.style.display = 'none';
}

function showInstallPrompt() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('Użytkownik zaakceptował instalację');
            }
            deferredPrompt = null;
            hideInstallButton();
        });
    }
}

// ==================== GŁÓWNA INICJALIZACJA ====================
async function initApp() {
    try {
        updateLoadingProgress(10, 'Ładowanie ustawień...');
        await loadAppData();
        updateLoadingProgress(30, 'Ładowanie postępów...');
        loadUserProgress();
        updateLoadingProgress(50, 'Przygotowywanie interfejsu...');
        setupEventListeners();
        updateLoadingProgress(70, 'Ładowanie zestawów...');
        loadDecks();
        updateLoadingProgress(90, 'Aktualizacja statystyk...');
        updateStats();
        updateQuickStats();
        checkAchievements();
        
        if (localStorage.getItem('darkMode') === 'true') {
            document.body.classList.add('dark-mode');
            document.getElementById('themeToggle').innerHTML = '<i class="fas fa-sun"></i> <span class="btn-text">Motyw</span>';
        }
        
        updateLoadingProgress(95, 'Finalizowanie...');
        
        setTimeout(() => {
            finishLoadingAnimation();
            showNotification('Aplikacja została załadowana pomyślnie!', 'success');
        }, 500);
        
    } catch (error) {
        handleError(error, 'initApp');
        finishLoadingAnimation();
        showNotification('Wystąpił błąd podczas ładowania aplikacji', 'error');
    }
}

// ==================== ŁADOWANIE DANYCH ====================
async function loadAppData() {
    try {
        updateLoadingProgress(15, 'Ładowanie struktury działów...');
        const response = await fetch('data/decks.json');
        const data = await response.json();
        
        console.log('Pobrane dane z decks.json:', data);
        
        if (!data || !Array.isArray(data.decks)) {
            console.error('data.decks nie jest tablicą!', data);
            appData.decks = [];
            return true;
        }
        
        // Ustaw decks bezpośrednio z decks.json
        appData.decks = data.decks.map(deck => ({
            ...deck,
            topics: Array.isArray(deck.topics) ? deck.topics.map(topic => ({
                ...topic,
                flashcards: [] // Flashcards będą ładowane na żądanie
            })) : []
        }));
        
        console.log('appData.decks po mapowaniu:', appData.decks);
        
        updateLoadingProgress(25, 'Przetwarzanie danych...');
        console.log('Dane aplikacji załadowane pomyślnie');
        return true;
    } catch (error) {
        console.error('Błąd ładowania danych:', error);
        appData.decks = [];
        throw error;
    }
}

function loadUserProgress() {
    try {
        const savedProgress = localStorage.getItem('fiszkownicaProgress');
        if (savedProgress) {
            userProgress = JSON.parse(savedProgress);
        } else {
            userProgress = {
                decks: {},
                stats: {
                    total: 0,
                    mastered: 0,
                    learning: 0,
                    new: 0,
                    today: { count: 0, study: 0, test: 0, review: 0 },
                    streak: 0,
                    lastStudyDate: null,
                    totalStudyTime: 0
                },
                deadlines: {},
                spacedRepetition: {},
                achievements: {},
                activityLog: []
            };
            saveUserProgress();
        }
        
        if (!userProgress.achievements) userProgress.achievements = {};
        if (!userProgress.activityLog) userProgress.activityLog = [];
        
        console.log('Postępy załadowane pomyślnie');
        return true;
        
    } catch (error) {
        console.error('Błąd ładowania postępów:', error);
        userProgress = {
            decks: {},
            stats: {
                total: 0,
                mastered: 0,
                learning: 0,
                new: 0,
                today: { count: 0, study: 0, test: 0, review: 0 },
                streak: 0,
                lastStudyDate: null,
                totalStudyTime: 0
            },
            deadlines: {},
            spacedRepetition: {},
            achievements: {},
            activityLog: []
        };
        return false;
    }
}

function saveUserProgress() {
    try {
        localStorage.setItem('fiszkownicaProgress', JSON.stringify(userProgress));
        console.log('Postęp zapisany');
        return true;
    } catch (error) {
        console.error('Błąd zapisywania postępu:', error);
        showNotification('Błąd zapisywania postępu', 'error');
        return false;
    }
}

// ==================== LOGOWANIE AKTYWNOŚCI ====================
function logActivity(type, details = {}) {
    if (!userProgress.activityLog) userProgress.activityLog = [];
    
    const activity = {
        timestamp: new Date().toISOString(),
        type: type,
        details: details
    };
    
    userProgress.activityLog.unshift(activity);
    
    if (userProgress.activityLog.length > 100) {
        userProgress.activityLog = userProgress.activityLog.slice(0, 100);
    }
    
    const today = new Date().toDateString();
    if (!userProgress.stats.today) {
        userProgress.stats.today = { count: 0, study: 0, test: 0, review: 0 };
    }
    
    userProgress.stats.today.count++;
    
    switch(type) {
        case 'study': userProgress.stats.today.study++; break;
        case 'test': userProgress.stats.today.test++; break;
        case 'review': userProgress.stats.today.review++; break;
    }
    
    saveUserProgress();
    updateStats();
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) themeToggle.addEventListener('click', toggleDarkMode);

    const fileUpload = document.getElementById('fileUpload');
    const fileInput = document.getElementById('fileInput');
    
    if (fileUpload && fileInput) {
        fileUpload.addEventListener('click', () => fileInput.click());
        
        fileUpload.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileUpload.style.borderColor = 'var(--primary)';
            fileUpload.style.backgroundColor = 'rgba(67, 97, 238, 0.1)';
        });
        
        fileUpload.addEventListener('dragleave', () => {
            fileUpload.style.borderColor = '';
            fileUpload.style.backgroundColor = '';
        });
        
        fileUpload.addEventListener('drop', (e) => {
            e.preventDefault();
            fileUpload.style.borderColor = '';
            fileUpload.style.backgroundColor = '';
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                fileInput.files = files;
                handleFileUpload({ target: fileInput });
            }
        });
        
        fileInput.addEventListener('change', handleFileUpload);
    }
    
    document.addEventListener('keydown', handleTestEnterKey);
    document.addEventListener('keydown', handleKeyboardNavigation);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
}

function handleKeyboardNavigation(event) {
    if (event.code === 'Space' && document.getElementById('study').classList.contains('active')) {
        event.preventDefault();
        flipCard();
    }
    
    if (event.code === 'ArrowRight' && document.getElementById('study').classList.contains('active')) {
        event.preventDefault();
        nextCard();
    }
    
    if (event.code === 'ArrowLeft' && document.getElementById('study').classList.contains('active')) {
        event.preventDefault();
        prevCard();
    }
    
    if (event.code >= 'Digit1' && event.code <= 'Digit4' && document.getElementById('study').classList.contains('active')) {
        event.preventDefault();
        const levels = ['new', 'learning', 'almost', 'mastered'];
        const levelIndex = parseInt(event.code.replace('Digit', '')) - 1;
        if (levels[levelIndex]) setKnowledgeLevel(levels[levelIndex]);
    }
    
    if (event.code === 'Escape') {
        closeModal();
        closeAboutModal();
        closeHelpModal();
    }
}

function handleTestEnterKey(event) {
    const testSection = document.getElementById('test');
    if (!testSection || !testSection.classList.contains('active')) return;
    
    if (event.key !== 'Enter') return;
    
    event.preventDefault();
    
    if (testMode === 'writing') {
        checkWritingAnswer();
    } else if (testMode === 'multiple') {
        checkMultipleAnswer();
    } else if (testMode === 'truefalse') {
        checkTrueFalseAnswer();
    }
}

function updateOnlineStatus() {
    if (navigator.onLine) {
        showNotification('Połączenie z internetem przywrócone', 'success');
    } else {
        showNotification('Brak połączenia z internetem. Tryb offline.', 'error');
    }
}

// ==================== DARK MODE ====================
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const themeToggle = document.getElementById('themeToggle');
    if (document.body.classList.contains('dark-mode')) {
        themeToggle.innerHTML = '<i class="fas fa-sun"></i> <span class="btn-text">Motyw</span>';
        localStorage.setItem('darkMode', 'true');
    } else {
        themeToggle.innerHTML = '<i class="fas fa-moon"></i> <span class="btn-text">Motyw</span>';
        localStorage.setItem('darkMode', 'false');
    }
}

// ==================== ZESTAWY FISZEK ====================
function showSortOptions() {
    const sortOptions = document.getElementById('sortOptions');
    if (sortOptions) {
        sortOptions.style.display = sortOptions.style.display === 'none' ? 'flex' : 'none';
    }
}

function sortTopics(method) {
    currentSortMethod = method;
    loadDecks();
}

function filterDecks() {
    const searchTerm = document.getElementById('deckSearch').value.toLowerCase();
    const deckItems = document.querySelectorAll('.deck-item');
    
    deckItems.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(searchTerm) ? 'block' : 'none';
    });
}

function refreshDecks() {
    const decksContainer = document.getElementById('decksContainer');
    if (decksContainer) {
        decksContainer.innerHTML = `
            <div class="loading-decks">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Odświeżanie zestawów...</p>
            </div>
        `;
        
        setTimeout(() => {
            loadDecks();
            showNotification('Zestawy zostały odświeżone', 'success');
        }, 500);
    }
}

function loadDecks() {
    console.log('loadDecks: appData=', appData);
    console.log('loadDecks: Array.isArray(appData.decks)=', Array.isArray(appData.decks));
    
    const decksContainer = document.getElementById('decksContainer');
    const totalDecks = document.getElementById('totalDecks');
    const totalTopics = document.getElementById('totalTopics');
    const totalFlashcardsDeck = document.getElementById('totalFlashcardsDeck');
    const overallProgress = document.getElementById('overallProgress');
    
    if (!decksContainer) {
        console.error('loadDecks: decksContainer nie znaleziony');
        return;
    }
    
    if (!appData || !Array.isArray(appData.decks)) {
        console.error('loadDecks: appData.decks nie jest tablicą!', appData);
        decksContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Błąd ładowania zestawów</h3>
                <p>Nie udało się załadować danych. appData.decks nie istnieje lub nie jest tablicą.</p>
                <button class="btn btn-primary" onclick="location.reload()">
                    <i class="fas fa-sync-alt"></i> Odśwież stronę
                </button>
            </div>
        `;
        return;
    }
    
    let deckCount = 0;
    let topicCount = 0;
    let flashcardCount = 0;
    let masteredCount = 0;
    
    if (Array.isArray(appData.decks)) {
        appData.decks.forEach(deck => {
            if (!deck || typeof deck !== 'object') return;
            deckCount++;
            const topics = Array.isArray(deck.topics) ? deck.topics : [];
            topicCount += topics.length;
            topics.forEach(topic => {
                if (!topic || typeof topic !== 'object') return;
                // POPRAWKA: używamy topic.count zamiast topic.flashcards.length
                const flashcardsLength = topic.count || 0;
                flashcardCount += flashcardsLength;
                if (userProgress && userProgress.decks && userProgress.decks[deck.id] && userProgress.decks[deck.id][topic.id]) {
                    const topicProgress = userProgress.decks[deck.id][topic.id];
                    if (topicProgress && typeof topicProgress === 'object') {
                        const values = Object.values(topicProgress);
                        if (Array.isArray(values)) {
                            values.forEach(level => {
                                if (level === 'mastered') masteredCount++;
                            });
                        }
                    }
                }
            });
        });
    }
    
    if (totalDecks) totalDecks.textContent = deckCount;
    if (totalTopics) totalTopics.textContent = topicCount;
    if (totalFlashcardsDeck) totalFlashcardsDeck.textContent = flashcardCount;
    if (overallProgress) {
        const progress = flashcardCount > 0 ? Math.round((masteredCount / flashcardCount) * 100) : 0;
        overallProgress.textContent = `${progress}%`;
    }
    
    decksContainer.innerHTML = '';
    
    if (appData.decks.length === 0) {
        decksContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <h3>Brak zestawów</h3>
                <p>Dodaj swoje pierwsze fiszki w sekcji Import</p>
                <button class="btn btn-primary" onclick="showSection('import')">
                    <i class="fas fa-plus"></i> Dodaj fiszki
                </button>
            </div>
        `;
        return;
    }
    
    appData.decks.forEach((deck, i) => {
        if (!deck || typeof deck !== 'object') return;
        const deckElement = document.createElement('div');
        deckElement.className = 'deck-item';
        const deckStats = calculateDeckStats(deck);
        const deadlineInfo = getDeadlineInfo(deck.id);
        const topicsLength = Array.isArray(deck.topics) ? deck.topics.length : 0;
        const deckId = `deck-accordion-${i}`;
        deckElement.innerHTML = `
            <div class="deck-main-content">
                <div class="deck-header" onclick="toggleAccordion('${deckId}')">
                    <div class="deck-title-group">
                        <div class="deck-icon-box"><i class="${deck.icon || 'fas fa-folder'}"></i></div>
                        <div>
                            <h3>${deck.name || 'Bez nazwy'}</h3>
                            <p class="deck-desc-short">${deck.description || 'Zestaw fiszek'}</p>
                        </div>
                    </div>
                    <div class="deck-arrow" id="${deckId}-arrow"><i class="fas fa-chevron-down"></i></div>
                </div>
                
                <div class="deck-stats-row">
                    <div class="d-stat"><i class="fas fa-tags"></i> ${topicsLength} tematy</div>
                    <div class="d-stat"><i class="fas fa-layer-group"></i> ${deckStats.total} fiszki</div>
                    <div class="d-stat highlight"><i class="fas fa-chart-pie"></i> ${deckStats.progress}%</div>
                    ${deadlineInfo ? `<div class="d-stat deadline ${deadlineInfo.colorClass}"><i class="fas fa-clock"></i> ${deadlineInfo.text}</div>` : ''}
                </div>

                <div class="deck-topics-container" id="${deckId}" style="display:none;">
                    ${(Array.isArray(deck.topics) ? deck.topics : []).map(topic => {
                    if (!topic || typeof topic !== 'object') return '';
                    // POPRAWKA: używamy topic.count zamiast topic.flashcards.length
                    const flashcardsLength = topic.count || 0;
                    const topicStats = calculateTopicStats(deck.id, topic.id, flashcardsLength);
                    const topicDeadlineInfo = getDeadlineInfo(deck.id, topic.id);
                    return `
                        <div class="topic-item" onclick="selectTopic('${deck.id}', '${topic.id}')">
                            <div class="topic-header">
                                <div style="display:flex; align-items:center; gap:10px;">
                                    <i class="fas fa-tag" style="color:var(--primary);"></i>
                                    <span class="topic-name">${topic.name}</span>
                                </div>
                                <span class="topic-flashcards badge">${flashcardsLength} fiszek</span>
                            </div>
                            <div class="topic-meta">
                                <div class="progress-bar small" style="flex-grow:1;">
                                    <div class="progress" style="width: ${topicStats.progress}%"></div>
                                </div>
                                <span class="progress-text">${topicStats.progress}%</span>
                            </div>
                            ${topicDeadlineInfo ? `<div class="topic-deadline ${topicDeadlineInfo.colorClass}"><i class="fas fa-clock"></i><span>${topicDeadlineInfo.text}</span></div>` : ''}
                        </div>
                    `;
                }).join('')}
                </div>
            </div>
            
            <div class="deck-actions-footer">
                <button class="btn btn-outline btn-sm" onclick="setDeadline('${deck.id}')" title="Ustaw deadline"><i class="fas fa-calendar-alt"></i></button>
                <button class="btn btn-outline btn-sm" onclick="studyDeck('${deck.id}')">Ucz się</button>
                <button class="btn btn-primary btn-sm" onclick="startTestDeck('${deck.id}')">Test</button>
            </div>
        `;
        decksContainer.appendChild(deckElement);
    });
}

// Accordion toggle
function toggleAccordion(id) {
    const content = document.getElementById(id);
    const arrow = document.getElementById(id + '-arrow');
    if (content) {
        if (content.style.display === 'none') {
            content.style.display = 'block';
            if (arrow) arrow.classList.add('rotated');
        } else {
            content.style.display = 'none';
            if (arrow) arrow.classList.remove('rotated');
        }
    }
}

function calculateDeckStats(deck) {
    if (!deck || typeof deck !== 'object') {
        console.warn('calculateDeckStats: deck nie istnieje lub nie jest obiektem', deck);
        return { total: 0, mastered: 0, progress: 0 };
    }
    
    if (!Array.isArray(deck.topics)) {
        console.warn('calculateDeckStats: deck.topics nie jest tablicą', deck.topics);
        return { total: 0, mastered: 0, progress: 0 };
    }
    
    let totalFlashcards = 0;
    let masteredFlashcards = 0;
    
    const topics = deck.topics;
    if (topics.length === 0) {
        return { total: 0, mastered: 0, progress: 0 };
    }
    
    console.log('calculateDeckStats dla', deck.id, ': topics.length=', topics.length);
    
    topics.forEach((topic, index) => {
        if (!topic || typeof topic !== 'object') {
            console.warn('calculateDeckStats: topic[' + index + '] nie jest obiektem', topic);
            return;
        }
        // POPRAWKA: używamy topic.count
        const flashcardsLength = topic.count || 0;
        totalFlashcards += flashcardsLength;
        
        if (userProgress && userProgress.decks && userProgress.decks[deck.id] && userProgress.decks[deck.id][topic.id]) {
            const topicProgress = userProgress.decks[deck.id][topic.id];
            if (topicProgress && typeof topicProgress === 'object') {
                const values = Object.values(topicProgress);
                if (Array.isArray(values)) {
                    values.forEach(level => {
                        if (level === 'mastered') masteredFlashcards++;
                    });
                }
            }
        }
    });
    
    const progress = totalFlashcards > 0 ? Math.round((masteredFlashcards / totalFlashcards) * 100) : 0;
    
    return { total: totalFlashcards, mastered: masteredFlashcards, progress: progress };
}

function calculateTopicStats(deckId, topicId, totalFlashcards) {
    let masteredFlashcards = 0;
    
    if (userProgress && userProgress.decks && userProgress.decks[deckId] && userProgress.decks[deckId][topicId]) {
        const topicProgress = userProgress.decks[deckId][topicId];
        if (topicProgress && typeof topicProgress === 'object') {
            const values = Object.values(topicProgress) || [];
            if (Array.isArray(values)) {
                values.forEach(level => {
                    if (level === 'mastered') masteredFlashcards++;
                });
            }
        }
    }
    
    const progress = totalFlashcards > 0 ? Math.round((masteredFlashcards / totalFlashcards) * 100) : 0;
    
    return { mastered: masteredFlashcards, progress: progress };
}

function studyDeck(deckId) {
    const deck = appData.decks.find(d => d.id === deckId);
    if (deck && Array.isArray(deck.topics) && deck.topics.length > 0) {
        selectTopic(deckId, deck.topics[0].id).catch(e => console.error('Błąd w selectTopic:', e));
    }
}

async function startTestDeck(deckId) {
    const deck = appData.decks.find(d => d.id === deckId);
    if (deck && Array.isArray(deck.topics) && deck.topics.length > 0) {
        await selectTestTopic(deckId, deck.topics[0].id);
        showSection('test');
    }
}

// ==================== WYBÓR TEMATU DO NAUKI ====================
async function loadTopicFlashcards(deckId, topicId) {
    const deck = appData.decks.find(d => d.id === deckId);
    if (!deck) return null;
    const topic = deck.topics.find(t => t.id === topicId);
    if (!topic) return null;

    if (!topic.flashcards || topic.flashcards.length === 0) {
        try {
            const url = `data/${deck.id}/${topic.file}`;
            console.log(`Próba pobrania: ${url}`);
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status} - ${response.statusText}`);
            }
            const data = await response.json();
            console.log(`Otrzymane dane dla ${topic.file}:`, data);
            topic.flashcards = Array.isArray(data) ? data : (data.flashcards || []);
            if (topic.flashcards.length === 0) {
                showNotification(`Brak fiszek w pliku ${topic.file}`, 'error');
            }
        } catch (e) {
            console.error(`Błąd ładowania flashcards dla ${topic.id}:`, e);
            showNotification(`Nie udało się załadować pliku ${topic.file}. Upewnij się, że plik istnieje.`, 'error');
            topic.flashcards = [];
        }
    } else {
        console.log(`Fiszki dla tematu ${topic.name} już były załadowane (${topic.flashcards.length})`);
    }
    return topic;
}

async function selectTopic(deckId, topicId) {
    const topic = await loadTopicFlashcards(deckId, topicId);
    if (!topic) return;
    
    const deck = appData.decks.find(d => d.id === deckId);

    currentDeck = deckId;
    currentTopic = topicId;
    
    const groupedFlashcards = {};
    (Array.isArray(topic.flashcards) ? topic.flashcards : []).forEach(flashcard => {
        if (!flashcard || typeof flashcard !== 'object') return;
        if (!groupedFlashcards[flashcard.polish]) {
            groupedFlashcards[flashcard.polish] = {
                polish: flashcard.polish,
                english: [flashcard.english],
                count: 1,
                originalIndices: [topic.flashcards.indexOf(flashcard)]
            };
        } else {
            if (!groupedFlashcards[flashcard.polish].english.includes(flashcard.english)) {
                groupedFlashcards[flashcard.polish].english.push(flashcard.english);
                groupedFlashcards[flashcard.polish].count++;
                groupedFlashcards[flashcard.polish].originalIndices.push(topic.flashcards.indexOf(flashcard));
            }
        }
    });
    
    originalFlashcards = Object.values(groupedFlashcards);
    
    studyMode = 'all';
    document.getElementById('studyModeToggle').classList.remove('btn-active');
    document.getElementById('studyModeToggle').innerHTML = '<i class="fas fa-filter"></i> Tylko do nauki';
    
    resetAdvancedFilters();
    loadFilteredFlashcards();
    
    currentFlashcardIndex = 0;

    document.getElementById('studyTitle').textContent = `Nauka: ${deck.name} - ${topic.name}`;
    
    const deadlineInfo = getDeadlineInfo(deckId, topicId);
    showDeadlineInfo(deadlineInfo);
    
    showSection('study');
    displayCurrentFlashcard();
    updateStudyStats();
    logActivity('study', { deck: deckId, topic: topicId });
}

function resetAdvancedFilters() {
    document.getElementById('filterNew').checked = true;
    document.getElementById('filterLearning').checked = true;
    document.getElementById('filterAlmost').checked = true;
    document.getElementById('filterMastered').checked = false;
}

function loadFilteredFlashcards() {
    if (studyMode === 'all') {
        currentFlashcards = [...originalFlashcards];
    } else {
        currentFlashcards = originalFlashcards.filter(flashcard => {
            const level = getKnowledgeLevel(currentDeck, currentTopic, flashcard.originalIndices[0]);
            return level !== 'mastered';
        });
    }
    
    applyAdvancedFilters();
}

function toggleStudyMode() {
    const toggleButton = document.getElementById('studyModeToggle');
    
    if (studyMode === 'all') {
        studyMode = 'toLearn';
        toggleButton.classList.add('btn-active');
        toggleButton.innerHTML = '<i class="fas fa-filter"></i> Wszystkie fiszki';
    } else {
        studyMode = 'all';
        toggleButton.classList.remove('btn-active');
        toggleButton.innerHTML = '<i class="fas fa-filter"></i> Tylko do nauki';
    }
    
    loadFilteredFlashcards();
    currentFlashcardIndex = 0;
    displayCurrentFlashcard();
    updateStudyStats();
}

function toggleAdvancedFilters() {
    const filters = document.getElementById('advancedFilters');
    const toggleButton = document.getElementById('advancedFiltersToggle');
    
    if (filters.style.display === 'none') {
        filters.style.display = 'block';
        toggleButton.classList.add('btn-active');
    } else {
        filters.style.display = 'none';
        toggleButton.classList.remove('btn-active');
    }
}

function applyAdvancedFilters() {
    const showNew = document.getElementById('filterNew').checked;
    const showLearning = document.getElementById('filterLearning').checked;
    const showAlmost = document.getElementById('filterAlmost').checked;
    const showMastered = document.getElementById('filterMastered').checked;
    
    currentFlashcards = currentFlashcards.filter(flashcard => {
        const level = getKnowledgeLevel(currentDeck, currentTopic, flashcard.originalIndices[0]);
        
        return (level === 'new' && showNew) ||
               (level === 'learning' && showLearning) ||
               (level === 'almost' && showAlmost) ||
               (level === 'mastered' && showMastered);
    });
    
    if (currentFlashcardIndex >= currentFlashcards.length) {
        currentFlashcardIndex = Math.max(0, currentFlashcards.length - 1);
    }
    
    displayCurrentFlashcard();
    updateStudyStats();
}

// ==================== WYŚWIETLANIE FISZKI ====================
function displayCurrentFlashcard() {
    if (!Array.isArray(currentFlashcards) || currentFlashcards.length === 0) {
        document.getElementById('flashcardFront').textContent = 'Brak fiszek do nauki';
        document.getElementById('flashcardBack').textContent = 'Brak fiszek do nauki';
        document.querySelector('.knowledge-levels').style.display = 'none';
        document.querySelector('.flashcard-controls').style.display = 'none';
        document.getElementById('progressBar').style.width = '0%';
        document.getElementById('progressText').textContent = '0%';
        hideProgressIndicator();
        return;
    }
    
    document.querySelector('.knowledge-levels').style.display = 'grid';
    document.querySelector('.flashcard-controls').style.display = 'flex';

    const flashcard = currentFlashcards[currentFlashcardIndex];
    
    if (flashcard.count && flashcard.count > 1) {
        document.getElementById('flashcardFront').textContent = flashcard.polish;
        document.getElementById('flashcardBack').textContent = flashcard.english.join(', ');
        
        let translationCount = document.querySelector('.translation-count');
        if (!translationCount) {
            translationCount = document.createElement('div');
            translationCount.className = 'translation-count';
            document.querySelector('.flashcard-front').appendChild(translationCount);
        }
        translationCount.textContent = flashcard.count;
    } else {
        document.getElementById('flashcardFront').textContent = flashcard.polish;
        document.getElementById('flashcardBack').textContent = flashcard.english;
        
        const translationCount = document.querySelector('.translation-count');
        if (translationCount) translationCount.remove();
    }
    
    const currentLevel = getKnowledgeLevel(currentDeck, currentTopic, flashcard.originalIndices[0]);
    document.getElementById('flashcardLevel').textContent = getLevelText(currentLevel);
    document.getElementById('flashcardLevelBack').textContent = getLevelText(currentLevel);
    
    // POPRAWKA: dodanie klasy poziomu do kontenera fiszki
    const flashcardElement = document.getElementById('flashcard');
    flashcardElement.classList.remove('flashcard-level-new', 'flashcard-level-learning', 'flashcard-level-almost', 'flashcard-level-mastered');
    flashcardElement.classList.add(`flashcard-level-${currentLevel}`);
    
    document.getElementById('flashcard').classList.remove('flipped');
    document.getElementById('flashcardNumber').textContent = `#${currentFlashcardIndex + 1}`;
    document.getElementById('flashcardTotal').textContent = `/${currentFlashcards.length}`;

    const progress = ((currentFlashcardIndex + 1) / currentFlashcards.length) * 100;
    document.getElementById('progressBar').style.width = `${progress}%`;
    document.getElementById('progressText').textContent = `${Math.round(progress)}%`;
    
    showProgressIndicator(currentFlashcardIndex + 1, currentFlashcards.length);
}

function flipCard() {
    document.getElementById('flashcard').classList.toggle('flipped');
}

function nextCard() {
    if (currentFlashcards.length === 0) return;
    currentFlashcardIndex = (currentFlashcardIndex + 1) % currentFlashcards.length;
    displayCurrentFlashcard();
}

function prevCard() {
    if (currentFlashcards.length === 0) return;
    currentFlashcardIndex = (currentFlashcardIndex - 1 + currentFlashcards.length) % currentFlashcards.length;
    displayCurrentFlashcard();
}

function showProgressIndicator(current, total) {
    const indicator = document.getElementById('progressIndicator');
    const currentSpan = document.getElementById('currentProgress');
    const totalSpan = document.getElementById('totalProgress');
    
    if (indicator && currentSpan && totalSpan) {
        currentSpan.textContent = current;
        totalSpan.textContent = total;
        indicator.style.display = 'flex';
    }
}

function hideProgressIndicator() {
    const indicator = document.getElementById('progressIndicator');
    if (indicator) indicator.style.display = 'none';
}

// ==================== POZIOM WIEDZY ====================
function setKnowledgeLevel(level) {
    if (currentFlashcards.length === 0) return;

    const flashcard = currentFlashcards[currentFlashcardIndex];
    
    // Animation
    const btn = document.querySelector(`.knowledge-btn.knowledge-${level}`);
    if (btn) {
        btn.classList.add('animate-click');
        setTimeout(() => btn.classList.remove('animate-click'), 300);
    }
    
    if (flashcard.originalIndices) {
        flashcard.originalIndices.forEach(originalIndex => {
            setKnowledgeLevelForCard(originalIndex, level);
        });
    } else {
        const originalDeck = appData.decks.find(d => d.id === currentDeck);
        const originalTopic = originalDeck.topics.find(t => t.id === currentTopic);
        const originalIndex = originalTopic.flashcards.findIndex(f => 
            f.polish === flashcard.polish && f.english === flashcard.english
        );
        setKnowledgeLevelForCard(originalIndex, level);
    }
    
    saveUserProgress();
    updateStats();
    updateStudyStats();
    updateQuickStats();
    checkAchievements();
    
    if (studyMode === 'toLearn' && level === 'mastered') {
        loadFilteredFlashcards();
        
        if (currentFlashcards.length === 0) {
            displayCurrentFlashcard();
            return;
        }
        
        if (currentFlashcardIndex >= currentFlashcards.length) {
            currentFlashcardIndex = currentFlashcards.length - 1;
        }
        
        displayCurrentFlashcard();
    }
}

function setKnowledgeLevelForCard(originalIndex, level) {
    if (originalIndex === -1) return;

    if (!userProgress.decks[currentDeck]) userProgress.decks[currentDeck] = {};
    if (!userProgress.decks[currentDeck][currentTopic]) userProgress.decks[currentDeck][currentTopic] = {};
    
    userProgress.decks[currentDeck][currentTopic][originalIndex] = level;
    
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + spacedRepetitionIntervals[level]);
    
    if (!userProgress.spacedRepetition) userProgress.spacedRepetition = {};
    if (!userProgress.spacedRepetition[currentDeck]) userProgress.spacedRepetition[currentDeck] = {};
    if (!userProgress.spacedRepetition[currentDeck][currentTopic]) {
        userProgress.spacedRepetition[currentDeck][currentTopic] = {};
    }
    
    userProgress.spacedRepetition[currentDeck][currentTopic][originalIndex] = nextReview.toISOString();
}

function getKnowledgeLevel(deckId, topicId, flashcardIndex) {
    if (userProgress.decks[deckId] && 
        userProgress.decks[deckId][topicId] && 
        userProgress.decks[deckId][topicId][flashcardIndex] !== undefined) {
        return userProgress.decks[deckId][topicId][flashcardIndex];
    }
    return 'new';
}

function getLevelText(level) {
    switch(level) {
        case 'new': return 'Nowe';
        case 'learning': return 'Uczę się';
        case 'almost': return 'Prawie umiem';
        case 'mastered': return 'Umiem';
        default: return 'Nowe';
    }
}

// ==================== DEADLINE ====================
function getDeadlineInfo(deckId, topicId = null) {
    const deadlineKey = topicId ? `${deckId}-${topicId}` : deckId;
    const deadline = userProgress.deadlines ? userProgress.deadlines[deadlineKey] : null;
    
    if (!deadline) return null;
    
    const now = new Date();
    const deadlineDate = new Date(deadline.date);
    const timeDiff = deadlineDate - now;
    const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    
    let text, colorClass;
    
    if (timeDiff < 0) {
        const daysAgo = Math.abs(daysDiff);
        text = `Spóźnione o ${daysAgo} dni`;
        colorClass = 'deadline-black';
    } else if (daysDiff === 0) {
        text = 'Dziś kończy się!';
        colorClass = 'deadline-red';
    } else if (daysDiff <= 2) {
        text = `Pozostało ${daysDiff} dni`;
        colorClass = 'deadline-red';
    } else if (daysDiff <= 7) {
        text = `Pozostało ${daysDiff} dni`;
        colorClass = 'deadline-orange';
    } else {
        text = `Pozostało ${daysDiff} dni`;
        colorClass = 'deadline-green';
    }
    
    return { text, colorClass, date: deadlineDate, daysDiff };
}

function showDeadlineInfo(deadlineInfo) {
    const deadlineContainer = document.getElementById('deadlineInfo');
    if (!deadlineContainer) return;
    
    if (deadlineInfo) {
        deadlineContainer.innerHTML = `
            <div class="deadline-alert ${deadlineInfo.colorClass}">
                <i class="fas ${deadlineInfo.colorClass === 'deadline-black' ? 'fa-exclamation-triangle' : 'fa-calendar-check'}"></i>
                <span>${deadlineInfo.text}</span>
                <button class="btn btn-small" onclick="setDeadline('${currentDeck}', '${currentTopic}')">
                    <i class="fas fa-edit"></i>
                </button>
            </div>
        `;
        deadlineContainer.style.display = 'block';
    } else {
        deadlineContainer.innerHTML = `
            <button class="btn btn-outline" onclick="setDeadline('${currentDeck}', '${currentTopic}')">
                <i class="fas fa-calendar-plus"></i> Ustaw deadline
            </button>
        `;
        deadlineContainer.style.display = 'block';
    }
}

function setDeadline(deckId, topicId = null) {
    currentDeadlineKey = topicId ? `${deckId}-${topicId}` : deckId;
    const currentDeadline = userProgress.deadlines ? userProgress.deadlines[currentDeadlineKey] : null;
    
    let name = '';
    const deck = appData.decks.find(d => d.id === deckId);
    if (deck) {
        if (topicId) {
            const topic = deck.topics.find(t => t.id === topicId);
            name = topic ? topic.name : '';
        } else {
            name = deck.name;
        }
    }
    
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 7);
    const defaultDateStr = defaultDate.toISOString().split('T')[0];
    
    document.getElementById('modalTitle').textContent = `Ustaw deadline dla: ${name}`;
    document.getElementById('modalDescription').textContent = 'Wybierz datę deadline:';
    document.getElementById('deadlineDate').value = currentDeadline ? 
        new Date(currentDeadline.date).toISOString().split('T')[0] : defaultDateStr;
    
    document.getElementById('deadlineModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('deadlineModal').style.display = 'none';
    currentDeadlineKey = null;
}

function saveDeadline() {
    if (!currentDeadlineKey) return;
    
    const dateValue = document.getElementById('deadlineDate').value;
    if (!dateValue) {
        showNotification('Proszę wybrać datę', 'error');
        return;
    }
    
    try {
        const dateObj = new Date(dateValue);
        if (isNaN(dateObj.getTime())) {
            showNotification('Nieprawidłowy format daty', 'error');
            return;
        }
        
        if (!userProgress.deadlines) userProgress.deadlines = {};
        userProgress.deadlines[currentDeadlineKey] = {
            date: dateObj.toISOString(),
            setDate: new Date().toISOString()
        };
        
        saveUserProgress();
        loadDecks();
        closeModal();
        showNotification(`Deadline ustawiony na: ${dateObj.toLocaleDateString('pl-PL')}`, 'success');
        
    } catch (error) {
        showNotification('Błąd podczas ustawiania deadline: ' + error.message, 'error');
    }
}

function setDefaultDeadline(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    document.getElementById('deadlineDate').value = date.toISOString().split('T')[0];
}

// ==================== TESTY ====================
function setTestMode(mode) {
    testMode = mode;
    
    document.getElementById('writingTest').style.display = 'none';
    document.getElementById('multipleTest').style.display = 'none';
    document.getElementById('truefalseTest').style.display = 'none';
    
    const testModeButtons = document.querySelectorAll('.test-mode-btn');
    testModeButtons.forEach(btn => btn.classList.remove('active'));
    
    if (mode === 'writing') {
        document.getElementById('writingTest').style.display = 'block';
        document.querySelectorAll('.test-mode-btn')[0].classList.add('active');
    } else if (mode === 'multiple') {
        document.getElementById('multipleTest').style.display = 'block';
        document.querySelectorAll('.test-mode-btn')[1].classList.add('active');
    } else if (mode === 'truefalse') {
        document.getElementById('truefalseTest').style.display = 'block';
        document.querySelectorAll('.test-mode-btn')[2].classList.add('active');
    }
    
    if (testQuestions.length > 0) {
        shuffleArray(testQuestions);
        displayTestQuestion();
    }
}

function changeTestLanguage() {
    testLanguage = document.getElementById('testLanguage').value;
    if (testQuestions.length > 0) displayTestQuestion();
}

function toggleTestStudyMode() {
    const toggleButton = document.getElementById('testStudyModeToggle');
    
    if (testStudyMode === 'all') {
        testStudyMode = 'toLearn';
        toggleButton.classList.add('btn-active');
        toggleButton.innerHTML = '<i class="fas fa-filter"></i> Wszystkie fiszki';
    } else {
        testStudyMode = 'all';
        toggleButton.classList.remove('btn-active');
        toggleButton.innerHTML = '<i class="fas fa-filter"></i> Tylko do nauki';
    }
    
    if (testDeck && testTopic) {
        prepareTestQuestions();
        currentTestQuestion = 0;
        displayTestQuestion();
    }
}

function updateTestSettings() {
    if (testDeck && testTopic) {
        prepareTestQuestions();
        currentTestQuestion = 0;
        displayTestQuestion();
    }
}

async function selectTestTopic(deckId, topicId) {
    const topic = await loadTopicFlashcards(deckId, topicId);
    if (!topic) return;
    const deck = appData.decks.find(d => d.id === deckId);

    testDeck = deckId;
    testTopic = topicId;
    
    selectedTopicsForTest.clear();
    selectedTopicsForTest.add(`${deckId}-${topicId}`);
    
    prepareTestQuestions();
    shuffleArray(testQuestions);
    
    isReviewMode = false;
    incorrectAnswers = [];
    reviewQuestions = [];
    
    currentTestQuestion = 0;
    testResults = { correct: 0, total: testQuestions.length };
    
    document.getElementById('testTitle').textContent = `Test: ${deck.name} - ${topic.name}`;
    document.getElementById('selectedDeckName').textContent = `${deck.name} - ${topic.name}`;
    // POPRAWKA: wyświetlamy liczbę fiszek z topic.count
    document.getElementById('selectedDeckInfo').textContent = `${topic.count || 0} fiszek`;
    
    const topicStats = calculateTopicStats(deckId, topicId, topic.count || 0);
    document.getElementById('selectedDeckStats').innerHTML = `
        <span class="progress-badge">${topicStats.progress}% opanowanych</span>
    `;
    
    document.getElementById('testTopicSelection').style.display = 'none';
    document.getElementById('testResult').style.display = 'none';
    document.getElementById('incorrectAnswersList').style.display = 'none';
    
    setupTestCounter();
    displayTestQuestion();
    testStartTime = new Date();
}

function showTestTopicSelection() {
    const topicsContainer = document.getElementById('testTopicsContainer');
    topicsContainer.innerHTML = '';
    
    const groupedTopics = {};
    appData.decks.forEach(deck => {
        if (!groupedTopics[deck.id]) {
            groupedTopics[deck.id] = {
                deckName: deck.name,
                topics: []
            };
        }
        
        deck.topics.forEach(topic => {
            const topicKey = `${deck.id}-${topic.id}`;
            const isSelected = selectedTopicsForTest.has(topicKey);
            
            groupedTopics[deck.id].topics.push({
                deckId: deck.id,
                topicId: topic.id,
                topicName: topic.name,
                // POPRAWKA: używamy topic.count
                flashcardCount: topic.count || 0,
                isSelected: isSelected
            });
        });
    });
    
    Object.keys(groupedTopics).forEach((deckId, index) => {
        const deckData = groupedTopics[deckId];
        const deckContainer = document.createElement('div');
        deckContainer.className = 'deck-item'; // Use same class as My Decks
        const accordionId = `test-deck-accordion-${index}`;
        
        // Find deck icon if possible, otherwise default
        const deck = appData.decks.find(d => d.id === deckId);
        const deckIcon = deck ? deck.icon : 'fas fa-folder';

        deckContainer.innerHTML = `
            <div class="deck-header" onclick="toggleAccordion('${accordionId}')" style="margin-bottom:0; padding: 15px;">
                <div class="deck-title-group">
                    <div class="deck-icon-box" style="width:40px; height:40px; font-size:1.2rem;"><i class="${deckIcon}"></i></div>
                    <div>
                        <h3 style="font-size:1.1rem;">${deckData.deckName}</h3>
                        <p class="deck-desc-short">${deckData.topics.length} tematów</p>
                    </div>
                </div>
                <div class="deck-arrow" id="${accordionId}-arrow"><i class="fas fa-chevron-down"></i></div>
            </div>
            
            <div class="deck-topics-container" id="${accordionId}" style="display:none; border-top:1px solid #f1f5f9; padding: 15px;">
                ${deckData.topics.map(topic => {
                    const topicStats = calculateTopicStats(topic.deckId, topic.topicId, topic.flashcardCount);
                    return `
                        <div class="topic-item" onclick="toggleTopicSelectionFromDiv(event, '${topic.deckId}', '${topic.topicId}')" style="padding: 10px;">
                            <div class="topic-header">
                                <div style="display:flex; align-items:center; gap:10px;">
                                    <input type="checkbox" 
                                           id="cb-${topic.deckId}-${topic.topicId}"
                                           ${topic.isSelected ? 'checked' : ''}
                                           class="topic-checkbox"
                                           style="width:18px; height:18px; cursor:pointer;">
                                    <span class="topic-name" style="font-size:1rem;">${topic.topicName}</span>
                                </div>
                                <span class="topic-flashcards badge">${topic.flashcardCount}</span>
                            </div>
                            <div class="topic-meta" style="margin-top:5px;">
                                <div class="progress-bar small" style="flex-grow:1; height:6px;">
                                    <div class="progress" style="width: ${topicStats.progress}%"></div>
                                </div>
                                <span class="progress-text" style="font-size:0.8rem;">${topicStats.progress}%</span>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        
        topicsContainer.appendChild(deckContainer);
    });
    
    document.getElementById('testTopicSelection').style.display = 'block';
}

function toggleTopicSelectionFromDiv(event, deckId, topicId) {
    // Prevent triggering if clicking directly on checkbox (it handles itself)
    if (event.target.type === 'checkbox') {
        toggleTopicSelection(deckId, topicId, event.target.checked);
        return;
    }
    
    const checkbox = document.getElementById(`cb-${deckId}-${topicId}`);
    if (checkbox) {
        checkbox.checked = !checkbox.checked;
        toggleTopicSelection(deckId, topicId, checkbox.checked);
    }
}

function toggleTopicSelection(deckId, topicId, isSelected) {
    const topicKey = `${deckId}-${topicId}`;
    if (isSelected) {
        selectedTopicsForTest.add(topicKey);
    } else {
        selectedTopicsForTest.delete(topicKey);
    }
}

function hideTestTopicSelection() {
    document.getElementById('testTopicSelection').style.display = 'none';
}

async function startTestFromSelection() {
    if (selectedTopicsForTest.size === 0) {
        showNotification('Wybierz przynajmniej jeden temat', 'error');
        return;
    }
    
    hideTestTopicSelection();

    // Ensure all selected topics are loaded
    const loadPromises = [];
    selectedTopicsForTest.forEach(topicKey => {
        const [deckId, topicId] = topicKey.split('-');
        loadPromises.push(loadTopicFlashcards(deckId, topicId));
    });
    await Promise.all(loadPromises);
    
    let allFlashcards = [];
    let selectedDeckName = '';
    let totalFlashcards = 0;
    
    selectedTopicsForTest.forEach(topicKey => {
        const [deckId, topicId] = topicKey.split('-');
        const deck = appData.decks.find(d => d.id === deckId);
        const topic = deck.topics.find(t => t.id === topicId);
        
        if (deck && topic) {
            allFlashcards = allFlashcards.concat(topic.flashcards.map((card, index) => ({
                ...card,
                deckId: deckId,
                topicId: topicId,
                originalIndex: index
            })));
            
            if (!selectedDeckName) {
                selectedDeckName = deck.name;
            } else if (!selectedDeckName.includes(deck.name)) {
                selectedDeckName += `, ${deck.name}`;
            }
            
            totalFlashcards += Array.isArray(topic.flashcards) ? topic.flashcards.length : 0;
        }
    });
    
    testDeck = 'multiple';
    testTopic = 'multiple';
    
    prepareTestQuestionsFromFlashcards(allFlashcards);
    shuffleArray(testQuestions);
    
    isReviewMode = false;
    incorrectAnswers = [];
    reviewQuestions = [];
    
    currentTestQuestion = 0;
    testResults = { correct: 0, total: testQuestions.length };
    
    document.getElementById('testTitle').textContent = `Test: ${selectedDeckName}`;
    document.getElementById('selectedDeckName').textContent = selectedDeckName;
    document.getElementById('selectedDeckInfo').textContent = `${selectedTopicsForTest.size} tematów, ${totalFlashcards} fiszek`;
    
    let masteredCount = 0;
    allFlashcards.forEach(card => {
        const level = getKnowledgeLevel(card.deckId, card.topicId, card.originalIndex);
        if (level === 'mastered') masteredCount++;
    });
    
    const progress = totalFlashcards > 0 ? Math.round((masteredCount / totalFlashcards) * 100) : 0;
    document.getElementById('selectedDeckStats').innerHTML = `
        <span class="progress-badge">${progress}% opanowanych</span>
    `;
    
    document.getElementById('testResult').style.display = 'none';
    document.getElementById('incorrectAnswersList').style.display = 'none';
    
    setupTestCounter();
    displayTestQuestion();
    testStartTime = new Date();
}

function prepareTestQuestionsFromFlashcards(flashcards) {
    // POPRAWKA: sprawdzenie czy są fiszki
    if (!flashcards || flashcards.length === 0) {
        showNotification('Brak fiszek do utworzenia testu.', 'error');
        testQuestions = [];
        testCounter.total = 0;
        updateTestCounter();
        return;
    }

    const questionCountSelect = document.getElementById('testQuestionsCount');
    const selectedCount = questionCountSelect ? questionCountSelect.value : 'all';
    
    let filteredFlashcards = [...flashcards];
    
    if (testStudyMode === 'toLearn') {
        filteredFlashcards = flashcards.filter(card => {
            const level = getKnowledgeLevel(card.deckId, card.topicId, card.originalIndex);
            return level !== 'mastered';
        });
        
        if (filteredFlashcards.length === 0) {
            filteredFlashcards = [...flashcards];
        }
    }
    
    const uniqueFlashcards = new Map();
    filteredFlashcards.forEach(flashcard => {
        const key = testLanguage === 'polish' ? flashcard.polish : flashcard.english;
        if (!uniqueFlashcards.has(key)) {
            uniqueFlashcards.set(key, {
                flashcard: flashcard,
                originalIndices: [flashcard.originalIndex],
                deckId: flashcard.deckId,
                topicId: flashcard.topicId
            });
        } else {
            uniqueFlashcards.get(key).originalIndices.push(flashcard.originalIndex);
        }
    });
    
    testQuestions = Array.from(uniqueFlashcards.values());
    
    if (selectedCount !== 'all') {
        const count = parseInt(selectedCount);
        if (testQuestions.length > count) {
            shuffleArray(testQuestions);
            testQuestions = testQuestions.slice(0, count);
        }
    }
    
    testCounter = {
        current: 1,
        total: testQuestions.length,
        correct: 0,
        incorrect: 0
    };
    
    updateTestCounter();
}

function prepareTestQuestions() {
    if (!testDeck || !testTopic || testDeck === 'multiple') return;

    const deck = appData.decks.find(d => d.id === testDeck);
    const topic = deck.topics.find(t => t.id === testTopic);

    // POPRAWKA: jeśli fiszki nie są załadowane, spróbuj załadować
    if (!topic.flashcards || topic.flashcards.length === 0) {
        console.warn('Fiszki dla tematu nie są załadowane, próbuję załadować...');
        // Możemy wywołać loadTopicFlashcards, ale to może być asynchroniczne – lepiej zrobić to wcześniej.
        // W selectTestTopic już ładujemy, więc tutaj powinny być.
        showNotification('Brak fiszek w tym temacie. Spróbuj ponownie.', 'error');
        testQuestions = [];
        testCounter.total = 0;
        updateTestCounter();
        return;
    }

    let availableFlashcards = [];
    
    if (testStudyMode === 'all') {
        availableFlashcards = [...topic.flashcards];
    } else {
        availableFlashcards = topic.flashcards.filter((flashcard, index) => {
            const level = getKnowledgeLevel(testDeck, testTopic, index);
            return level !== 'mastered';
        });
    }
    
    if (availableFlashcards.length === 0) {
        availableFlashcards = [...topic.flashcards];
    }
    
    const uniqueFlashcards = new Map();
    availableFlashcards.forEach((flashcard, index) => {
        const key = testLanguage === 'polish' ? flashcard.polish : flashcard.english;
        if (!uniqueFlashcards.has(key)) {
            uniqueFlashcards.set(key, {
                flashcard: flashcard,
                originalIndices: [index]
            });
        } else {
            uniqueFlashcards.get(key).originalIndices.push(index);
        }
    });
    
    testQuestions = Array.from(uniqueFlashcards.values());
    
    const questionCountSelect = document.getElementById('testQuestionsCount');
    if (questionCountSelect && questionCountSelect.value !== 'all') {
        const count = parseInt(questionCountSelect.value);
        if (testQuestions.length > count) {
            shuffleArray(testQuestions);
            testQuestions = testQuestions.slice(0, count);
        }
    }
    
    testCounter = {
        current: 1,
        total: testQuestions.length,
        correct: 0,
        incorrect: 0
    };
    
    updateTestCounter();
}

function setupTestCounter() {
    const testContainer = document.getElementById('test');
    if (!testContainer.querySelector('#testCounter')) {
        const counterDiv = document.createElement('div');
        counterDiv.id = 'testCounter';
        counterDiv.className = 'test-counter';
        const settings = testContainer.querySelector('.test-settings');
        if (settings) testContainer.insertBefore(counterDiv, settings.nextSibling);
    }
    updateTestCounter();
}

function updateTestCounter() {
    const counterContainer = document.getElementById('testCounter');
    if (!counterContainer) return;
    
    counterContainer.innerHTML = `
        <div class="counter-item">
            <span class="counter-value">${testCounter.current}</span>
            <span class="counter-label">Pytanie</span>
        </div>
        <div class="counter-item">
            <span class="counter-value">${testCounter.total}</span>
            <span class="counter-label">Wszystkich</span>
        </div>
        <div class="counter-item">
            <span class="counter-value">${testCounter.correct}</span>
            <span class="counter-label">Poprawne</span>
        </div>
        <div class="counter-item">
            <span class="counter-value">${testCounter.incorrect}</span>
            <span class="counter-label">Błędne</span>
        </div>
    `;
}

function displayTestQuestion() {
    // Sprawdzenie czy są pytania
    if ((!isReviewMode && (!testQuestions || testQuestions.length === 0)) ||
        (isReviewMode && (!reviewQuestions || reviewQuestions.length === 0))) {
        showNotification('Brak fiszek do przetestowania w tym zestawie.', 'info');
        // Opcjonalnie wróć do wyboru zestawu
        showTestTopicSelection();
        return;
    }

    if (isReviewMode && currentTestQuestion >= reviewQuestions.length) {
        finishReview();
        return;
    }
    
    if (!isReviewMode && currentTestQuestion >= testQuestions.length) {
        finishTest();
        return;
    }

    let question;
    if (isReviewMode) {
        question = reviewQuestions[currentTestQuestion].flashcard;
    } else {
        question = testQuestions[currentTestQuestion];
    }

    document.getElementById('writingFeedback').textContent = '';
    document.getElementById('multipleFeedback').textContent = '';
    document.getElementById('truefalseFeedback').textContent = '';
    
    const deckId = isReviewMode ? reviewQuestions[currentTestQuestion].deckId : 
                   (testDeck === 'multiple' ? question.deckId : testDeck);
    const topicId = isReviewMode ? reviewQuestions[currentTestQuestion].topicId : 
                    (testDeck === 'multiple' ? question.topicId : testTopic);
    
    currentTestFlashcardIndices = question.originalIndices ? [...question.originalIndices] : [];
    currentTestFlashcardIndex = currentTestFlashcardIndices.length ? currentTestFlashcardIndices[0] : -1;
    
    let knowledgeLevel = 'new';
    if (currentTestFlashcardIndex !== -1) {
        knowledgeLevel = getKnowledgeLevel(deckId, topicId, currentTestFlashcardIndex);
    }
    
    const levelClass = `level-${knowledgeLevel}`;
    const levelText = getLevelText(knowledgeLevel);
    
    document.getElementById('writingLevel').textContent = levelText;
    document.getElementById('writingLevel').className = `test-level-badge ${levelClass}`;
    document.getElementById('multipleLevel').textContent = levelText;
    document.getElementById('multipleLevel').className = `test-level-badge ${levelClass}`;
    document.getElementById('truefalseLevel').textContent = levelText;
    document.getElementById('truefalseLevel').className = `test-level-badge ${levelClass}`;
    
    testCounter.current = currentTestQuestion + 1;
    updateTestCounter();
    
    if (testMode === 'writing') {
        if (testLanguage === 'polish') {
            document.getElementById('writingQuestion').textContent = `Jak po angielsku powiesz "${question.flashcard.polish}"?`;
            document.getElementById('writingAnswer').placeholder = "Wpisz tłumaczenie angielskie...";
        } else {
            document.getElementById('writingQuestion').textContent = `Jak po polsku powiesz "${question.flashcard.english}"?`;
            document.getElementById('writingAnswer').placeholder = "Wpisz tłumaczenie polskie...";
        }
        document.getElementById('writingAnswer').value = '';
    } else if (testMode === 'multiple') {
        if (testLanguage === 'polish') {
            document.getElementById('multipleQuestion').textContent = `Jak po angielsku powiesz "${question.flashcard.polish}"?`;
        } else {
            document.getElementById('multipleQuestion').textContent = `Jak po polsku powiesz "${question.flashcard.english}"?`;
        }
        
        let correctAnswers;
        if (testLanguage === 'polish') {
            correctAnswers = [question.flashcard.english];
        } else {
            correctAnswers = [question.flashcard.polish];
        }

        const options = [...correctAnswers];
        
        while (options.length < 4) {
            const randomIndex = Math.floor(Math.random() * testQuestions.length);
            const randomOption = testLanguage === 'polish' 
                ? testQuestions[randomIndex].flashcard.english 
                : testQuestions[randomIndex].flashcard.polish;
                
            if (!options.includes(randomOption)) {
                options.push(randomOption);
            }
        }
        
        shuffleArray(options);
        
        const optionsContainer = document.getElementById('multipleOptions');
        optionsContainer.innerHTML = '';
        
        options.forEach((option, index) => {
            const optionElement = document.createElement('div');
            optionElement.className = 'test-option';
            optionElement.textContent = option;
            optionElement.onclick = () => selectMultipleOption(index);
            optionsContainer.appendChild(optionElement);
        });
        
        selectedOption = null;
    } else if (testMode === 'truefalse') {
        const isCorrect = Math.random() > 0.5;
        
        if (testLanguage === 'polish') {
            let displayedTranslation;
            if (isCorrect) {
                displayedTranslation = question.flashcard.english;
            } else {
                do {
                    const randomQ = testQuestions[Math.floor(Math.random() * testQuestions.length)];
                    displayedTranslation = randomQ.flashcard.english;
                } while (displayedTranslation === question.flashcard.english);
            }

            document.getElementById('truefalseQuestion').textContent = `"${question.flashcard.polish}" po angielsku to "${displayedTranslation}"`;
        } else {
            let displayedTranslation;
            if (isCorrect) {
                displayedTranslation = question.flashcard.polish;
            } else {
                const randomQ = testQuestions[Math.floor(Math.random() * testQuestions.length)];
                displayedTranslation = randomQ.flashcard.polish;
            }
            document.getElementById('truefalseQuestion').textContent = `"${question.flashcard.english}" po polsku to "${displayedTranslation}"`;
        }
        
        currentTrueFalseCorrect = isCorrect;
        trueFalseAnswer = null;
        
        const options = document.querySelectorAll('.test-tf-option');
        options.forEach(option => option.classList.remove('selected'));
    }
}

function selectMultipleOption(index) {
    selectedOption = index;
    
    const options = document.querySelectorAll('#multipleOptions .test-option');
    options.forEach((opt, i) => {
        opt.classList.toggle('selected', i === index);
    });
}

function selectTrueFalse(answer) {
    trueFalseAnswer = answer;
    
    const options = document.querySelectorAll('.test-tf-option');
    options.forEach(option => {
        const isTrue = option.classList.contains('true');
        option.classList.toggle('selected', (isTrue && answer) || (!isTrue && !answer));
    });
}

function checkWritingAnswer() {
    const answer = document.getElementById('writingAnswer').value.trim();
    
    if ((!isReviewMode && currentTestQuestion >= testQuestions.length) || 
        (isReviewMode && currentTestQuestion >= reviewQuestions.length)) {
        return;
    }
    
    let correctAnswer;
    if (isReviewMode) {
        const reviewItem = reviewQuestions[currentTestQuestion];
        correctAnswer = reviewItem.correctAnswer;
    } else {
        const currentFlashcard = testQuestions[currentTestQuestion];
        correctAnswer = testLanguage === 'polish' 
            ? currentFlashcard.flashcard.english 
            : currentFlashcard.flashcard.polish;
    }
        
    const feedback = document.getElementById('writingFeedback');
    
    if (answer.toLowerCase() === correctAnswer.toLowerCase()) {
        feedback.textContent = '✅ Poprawna odpowiedź!';
        feedback.className = 'test-feedback correct';
        testCounter.correct++;
        testResults.correct++;
        updateTestCounter();
        updateKnowledgeLevelAfterTest(true);
    } else {
        feedback.textContent = `❌ Błędna odpowiedź. Poprawnie: ${correctAnswer}`;
        feedback.className = 'test-feedback incorrect';
        testCounter.incorrect++;
        updateTestCounter();
        updateKnowledgeLevelAfterTest(false);
        
        if (!isReviewMode) {
            const currentQuestion = testQuestions[currentTestQuestion];
            incorrectAnswers.push({
                flashcard: currentQuestion.flashcard,
                userAnswer: answer,
                correctAnswer: correctAnswer,
                questionType: 'writing',
                deckId: testDeck === 'multiple' ? currentQuestion.deckId : testDeck,
                topicId: testDeck === 'multiple' ? currentQuestion.topicId : testTopic,
                originalIndices: currentQuestion.originalIndices
            });
        }
    }
    
    setTimeout(() => {
        currentTestQuestion++;
        displayTestQuestion();
    }, 1500);
}

function checkMultipleAnswer() {
    if (selectedOption === null) {
        showNotification('Wybierz odpowiedź!', 'error');
        return;
    }
    
    if ((!isReviewMode && currentTestQuestion >= testQuestions.length) || 
        (isReviewMode && currentTestQuestion >= reviewQuestions.length)) {
        return;
    }
    
    const options = document.querySelectorAll('#multipleOptions .test-option');
    const selectedText = options[selectedOption].textContent;
    
    let correctAnswer;
    if (isReviewMode) {
        const reviewItem = reviewQuestions[currentTestQuestion];
        correctAnswer = reviewItem.correctAnswer;
    } else {
        const currentFlashcard = testQuestions[currentTestQuestion];
        correctAnswer = testLanguage === 'polish' 
            ? currentFlashcard.flashcard.english 
            : currentFlashcard.flashcard.polish;
    }
        
    const feedback = document.getElementById('multipleFeedback');
    
    if (selectedText.toLowerCase() === correctAnswer.toLowerCase()) {
        feedback.textContent = '✅ Poprawna odpowiedź!';
        feedback.className = 'test-feedback correct';
        testCounter.correct++;
        testResults.correct++;
        updateTestCounter();
        updateKnowledgeLevelAfterTest(true);
    } else {
        feedback.textContent = `❌ Błędna odpowiedź. Poprawnie: ${correctAnswer}`;
        feedback.className = 'test-feedback incorrect';
        testCounter.incorrect++;
        updateTestCounter();
        updateKnowledgeLevelAfterTest(false);
        
        if (!isReviewMode) {
            const currentQuestion = testQuestions[currentTestQuestion];
            incorrectAnswers.push({
                flashcard: currentQuestion.flashcard,
                userAnswer: selectedText,
                correctAnswer: correctAnswer,
                questionType: 'multiple',
                deckId: testDeck === 'multiple' ? currentQuestion.deckId : testDeck,
                topicId: testDeck === 'multiple' ? currentQuestion.topicId : testTopic,
                originalIndices: currentQuestion.originalIndices
            });
        }
    }
    
    setTimeout(() => {
        currentTestQuestion++;
        displayTestQuestion();
    }, 1500);
}

function checkTrueFalseAnswer() {
    if (trueFalseAnswer === null) {
        showNotification('Wybierz odpowiedź!', 'error');
        return;
    }
    
    if ((!isReviewMode && currentTestQuestion >= testQuestions.length) || 
        (isReviewMode && currentTestQuestion >= reviewQuestions.length)) {
        return;
    }
    
    let isCorrectAnswer;
    if (isReviewMode) {
        isCorrectAnswer = reviewQuestions[currentTestQuestion].correctAnswer === 'Prawda';
    } else {
        isCorrectAnswer = currentTrueFalseCorrect;
    }
    
    const feedback = document.getElementById('truefalseFeedback');
    
    if (trueFalseAnswer === isCorrectAnswer) {
        feedback.textContent = '✅ Poprawna odpowiedź!';
        feedback.className = 'test-feedback correct';
        testCounter.correct++;
        testResults.correct++;
        updateTestCounter();
        updateKnowledgeLevelAfterTest(true);
    } else {
        feedback.textContent = '❌ Błędna odpowiedź!';
        feedback.className = 'test-feedback incorrect';
        testCounter.incorrect++;
        updateTestCounter();
        updateKnowledgeLevelAfterTest(false);
        
        if (!isReviewMode) {
            const currentQuestion = testQuestions[currentTestQuestion];
            incorrectAnswers.push({
                flashcard: currentQuestion.flashcard,
                userAnswer: trueFalseAnswer ? 'Prawda' : 'Fałsz',
                correctAnswer: isCorrectAnswer ? 'Prawda' : 'Fałsz',
                questionType: 'truefalse',
                deckId: testDeck === 'multiple' ? currentQuestion.deckId : testDeck,
                topicId: testDeck === 'multiple' ? currentQuestion.topicId : testTopic,
                originalIndices: currentQuestion.originalIndices
            });
        }
    }
    
    setTimeout(() => {
        currentTestQuestion++;
        displayTestQuestion();
    }, 1500);
}

function updateKnowledgeLevelAfterTest(isCorrect) {
    if (!testDeck || testDeck === 'multiple') return;
    
    const indices = currentTestFlashcardIndices.length ? currentTestFlashcardIndices : 
                   (currentTestFlashcardIndex !== -1 ? [currentTestFlashcardIndex] : []);
    if (indices.length === 0) return;

    if (!userProgress.decks[testDeck]) userProgress.decks[testDeck] = {};
    if (!userProgress.decks[testDeck][testTopic]) userProgress.decks[testDeck][testTopic] = {};

    indices.forEach(idx => {
        const currentLevel = getKnowledgeLevel(testDeck, testTopic, idx);
        let newLevel = currentLevel;

        if (isCorrect) {
            switch(currentLevel) {
                case 'new': newLevel = 'learning'; break;
                case 'learning': newLevel = 'almost'; break;
                case 'almost': newLevel = 'mastered'; break;
                case 'mastered': newLevel = 'mastered'; break;
            }
        } else {
            switch(currentLevel) {
                case 'new': newLevel = 'new'; break;
                case 'learning': newLevel = 'new'; break;
                case 'almost': newLevel = 'learning'; break;
                case 'mastered': newLevel = 'almost'; break;
            }
        }

        userProgress.decks[testDeck][testTopic][idx] = newLevel;
        
        const nextReview = new Date();
        nextReview.setDate(nextReview.getDate() + spacedRepetitionIntervals[newLevel]);
        
        if (!userProgress.spacedRepetition) userProgress.spacedRepetition = {};
        if (!userProgress.spacedRepetition[testDeck]) userProgress.spacedRepetition[testDeck] = {};
        if (!userProgress.spacedRepetition[testDeck][testTopic]) {
            userProgress.spacedRepetition[testDeck][testTopic] = {};
        }
        
        userProgress.spacedRepetition[testDeck][testTopic][idx] = nextReview.toISOString();
    });

    saveUserProgress();
    updateStats();
    updateQuickStats();
    checkAchievements();
}

function finishTest() {
    testEndTime = new Date();
    const testTime = testEndTime - testStartTime;
    const seconds = Math.floor(testTime / 1000);
    
    document.getElementById('correctAnswers').textContent = testResults.correct;
    document.getElementById('incorrectAnswers').textContent = testResults.total - testResults.correct;
    document.getElementById('scoreValue').textContent = testResults.correct;
    document.getElementById('scoreMax').textContent = `/ ${testResults.total}`;
    document.getElementById('percentageScore').textContent = `${Math.round((testResults.correct / testResults.total) * 100)}%`;
    document.getElementById('testTime').textContent = `${seconds}s`;
    
    if (incorrectAnswers.length > 0) {
        showIncorrectAnswersList();
        document.getElementById('incorrectAnswersList').style.display = 'block';
    }
    
    document.getElementById('testResult').style.display = 'block';
    logActivity('test', { 
        correct: testResults.correct, 
        total: testResults.total, 
        time: seconds,
        deck: testDeck,
        topic: testTopic 
    });
}

function showIncorrectAnswersList() {
    const container = document.getElementById('incorrectAnswersContainer');
    container.innerHTML = '';
    
    incorrectAnswers.forEach((item, index) => {
        const answerItem = document.createElement('div');
        answerItem.className = 'incorrect-answer-item';
        
        let questionText = '';
        if (testLanguage === 'polish') {
            questionText = `"${item.flashcard.polish}"`;
        } else {
            questionText = `"${item.flashcard.english}"`;
        }
        
        answerItem.innerHTML = `
            <div class="incorrect-question">${questionText}</div>
            <div class="incorrect-user-answer">Twoja odpowiedź: ${item.userAnswer}</div>
            <div class="incorrect-correct-answer">Poprawna odpowiedź: ${item.correctAnswer}</div>
        `;
        
        container.appendChild(answerItem);
    });
}

function toggleIncorrectList() {
    const container = document.getElementById('incorrectAnswersContainer');
    const toggleBtn = document.querySelector('#incorrectAnswersList .btn-small i');
    
    if (container.style.display === 'none') {
        container.style.display = 'block';
        toggleBtn.className = 'fas fa-chevron-up';
    } else {
        container.style.display = 'none';
        toggleBtn.className = 'fas fa-chevron-down';
    }
}

function reviewIncorrectAnswers() {
    isReviewMode = true;
    reviewQuestions = [...incorrectAnswers];
    shuffleArray(reviewQuestions);
    currentTestQuestion = 0;
    testResults.correct = 0;
    testResults.total = reviewQuestions.length;
    testCounter.correct = 0;
    testCounter.incorrect = 0;
    testCounter.total = reviewQuestions.length;
    testCounter.current = 1;
    updateTestCounter();
    
    document.getElementById('testResult').style.display = 'none';
    document.getElementById('testTitle').textContent = `Poprawa błędów: ${testDeck === 'multiple' ? 'Wiele tematów' : testDeck}`;
    displayTestQuestion();
}

function finishReview() {
    document.getElementById('correctAnswers').textContent = testResults.correct;
    document.getElementById('scoreMax').textContent = `/ ${testResults.total}`;
    document.getElementById('testResult').style.display = 'block';
    document.getElementById('incorrectAnswersList').style.display = 'none';
    incorrectAnswers = [];
    isReviewMode = false;
}

function resetTest() {
    isReviewMode = false;
    currentTestQuestion = 0;
    
    if (testDeck && testTopic) {
        if (testDeck === 'multiple') {
            prepareTestQuestionsFromFlashcards(getSelectedFlashcards());
        } else {
            prepareTestQuestions();
        }
    }
    
    shuffleArray(testQuestions);
    
    testResults = { correct: 0, total: testQuestions.length };
    testCounter.correct = 0;
    testCounter.incorrect = 0;
    testCounter.total = testQuestions.length;
    testCounter.current = 1;
    
    document.getElementById('testResult').style.display = 'none';
    document.getElementById('incorrectAnswersList').style.display = 'none';
    incorrectAnswers = [];
    
    updateTestCounter();
    displayTestQuestion();
    testStartTime = new Date();
}

function getSelectedFlashcards() {
    let allFlashcards = [];
    
    selectedTopicsForTest.forEach(topicKey => {
        const [deckId, topicId] = topicKey.split('-');
        const deck = appData.decks.find(d => d.id === deckId);
        const topic = deck.topics.find(t => t.id === topicId);
        
        if (deck && topic) {
            allFlashcards = allFlashcards.concat(topic.flashcards.map((card, index) => ({
                ...card,
                deckId: deckId,
                topicId: topicId,
                originalIndex: index
            })));
        }
    });
    
    return allFlashcards;
}

// ==================== SZYBKA POWTÓRKA ====================
function startQuickStudy() {
    const dueFlashcards = getDueFlashcards();
    if (dueFlashcards.length === 0) {
        showNotification('Brak fiszek do powtórki! Wszystkie fiszki są aktualne.', 'info');
        return;
    }
    
    currentFlashcards = dueFlashcards;
    currentFlashcardIndex = 0;
    currentDeck = null;
    currentTopic = null;
    
    document.getElementById('studyTitle').textContent = 'Szybka powtórka';
    document.getElementById('deadlineInfo').style.display = 'none';
    document.getElementById('advancedFilters').style.display = 'none';
    document.getElementById('advancedFiltersToggle').classList.remove('btn-active');
    
    showSection('study');
    displayCurrentFlashcard();
    updateStudyStats();
    logActivity('review', { count: dueFlashcards.length });
}

function getDueFlashcards() {
    const due = [];
    const today = new Date().toISOString().split('T')[0];
    
    if (!userProgress.spacedRepetition) return due;
    
    Object.keys(userProgress.spacedRepetition).forEach(deckId => {
        Object.keys(userProgress.spacedRepetition[deckId]).forEach(topicId => {
            Object.keys(userProgress.spacedRepetition[deckId][topicId]).forEach(cardIndex => {
                const nextReview = userProgress.spacedRepetition[deckId][topicId][cardIndex];
                if (nextReview.split('T')[0] <= today) {
                    const deck = appData.decks.find(d => d.id === deckId);
                    if (deck) {
                        const topic = deck.topics.find(t => t.id === topicId);
                        if (topic && topic.flashcards[cardIndex]) {
                            due.push({
                                polish: topic.flashcards[cardIndex].polish,
                                english: topic.flashcards[cardIndex].english,
                                count: 1,
                                originalIndices: [parseInt(cardIndex)],
                                deckId: deckId,
                                topicId: topicId
                            });
                        }
                    }
                }
            });
        });
    });
    
    return due;
}

// ==================== STATYSTYKI ====================
function updateStats() {
    if (!userProgress) {
        userProgress = {
            decks: {},
            stats: {
                total: 0,
                mastered: 0,
                learning: 0,
                new: 0,
                today: { count: 0, study: 0, test: 0, review: 0 },
                streak: 0,
                lastStudyDate: null,
                totalStudyTime: 0
            },
            deadlines: {},
            spacedRepetition: {},
            achievements: {},
            activityLog: []
        };
    }

    let total = 0;
    let mastered = 0;
    let learning = 0;
    let newCards = 0;

    appData.decks.forEach(deck => {
        deck.topics.forEach(topic => {
            // POPRAWKA: używamy topic.count zamiast topic.flashcards.length
            const flashcardsLength = topic.count || 0;
            total += flashcardsLength;
            
            // Ale aby policzyć poziom, potrzebujemy rzeczywistych fiszek – muszą być załadowane.
            // W przeciwnym razie nie wiemy, ile jest opanowanych.
            // Możemy to zrobić tylko dla załadowanych tematów.
            if (topic.flashcards && topic.flashcards.length > 0) {
                topic.flashcards.forEach((flashcard, index) => {
                    const level = getKnowledgeLevel(deck.id, topic.id, index);
                    switch(level) {
                        case 'mastered':
                            mastered++;
                            break;
                        case 'learning':
                        case 'almost':
                            learning++;
                            break;
                        case 'new':
                        default:
                            newCards++;
                            break;
                    }
                });
            }
        });
    });

    document.getElementById('totalFlashcards').textContent = total;
    document.getElementById('masteredFlashcards').textContent = mastered;
    document.getElementById('learningFlashcards').textContent = learning;
    document.getElementById('newFlashcards').textContent = newCards;

    const today = new Date().toDateString();
    const lastStudy = userProgress.stats.lastStudyDate;
    
    if (lastStudy && new Date(lastStudy).toDateString() === today) {
        userProgress.stats.today.count++;
    } else {
        userProgress.stats.today.count = 1;
        userProgress.stats.lastStudyDate = new Date().toISOString();
        
        if (lastStudy) {
            const lastStudyDate = new Date(lastStudy);
            const todayDate = new Date();
            const diffTime = Math.abs(todayDate - lastStudyDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
                userProgress.stats.streak++;
            } else {
                userProgress.stats.streak = 1;
            }
        } else {
            userProgress.stats.streak = 1;
        }
    }

    document.getElementById('todayActivity').textContent = 
        `Przećwiczyłeś ${userProgress.stats.today.count} fiszek dzisiaj`;
    
    document.getElementById('learningStreak').textContent = 
        `Uczysz się codziennie od ${userProgress.stats.streak} dni z rzędu!`;

    document.getElementById('todayStudy').textContent = userProgress.stats.today.study || 0;
    document.getElementById('todayTest').textContent = userProgress.stats.today.test || 0;
    document.getElementById('todayReview').textContent = userProgress.stats.today.review || 0;
    
    document.getElementById('streakBadge').textContent = `${userProgress.stats.streak} dni`;

    saveUserProgress();
    updateStatsBadge();
}

function updateStatsBadge() {
    const total = parseInt(document.getElementById('totalFlashcards').textContent) || 0;
    const mastered = parseInt(document.getElementById('masteredFlashcards').textContent) || 0;
    const progress = total > 0 ? Math.round((mastered / total) * 100) : 0;
    
    document.getElementById('statsBadge').textContent = `${progress}%`;
}

function updateStudyStats() {
    if (!currentDeck || !currentTopic) return;
    
    const totalFlashcards = originalFlashcards.length;
    const masteredFlashcards = originalFlashcards.filter(flashcard => {
        const level = getKnowledgeLevel(currentDeck, currentTopic, flashcard.originalIndices[0]);
        return level === 'mastered';
    }).length;
    
    const toLearnFlashcards = totalFlashcards - masteredFlashcards;
    const currentModeFlashcards = currentFlashcards.length;
    
    let statsContainer = document.getElementById('studyStats');
    if (!statsContainer) {
        statsContainer = document.createElement('div');
        statsContainer.id = 'studyStats';
        statsContainer.className = 'study-stats-container';
        const deadlineInfo = document.getElementById('deadlineInfo');
        if (deadlineInfo) deadlineInfo.after(statsContainer);
    }
    
    statsContainer.innerHTML = `
        <div class="study-stat">
            <i class="fas fa-layer-group study-stat-icon"></i>
            <div class="study-stat-value">${totalFlashcards}</div>
            <div class="study-stat-label">Wszystkie</div>
        </div>
        <div class="study-stat">
            <i class="fas fa-check-circle study-stat-icon"></i>
            <div class="study-stat-value">${masteredFlashcards}</div>
            <div class="study-stat-label">Opanowane</div>
        </div>
        <div class="study-stat">
            <i class="fas fa-book-open study-stat-icon"></i>
            <div class="study-stat-value">${toLearnFlashcards}</div>
            <div class="study-stat-label">Do nauki</div>
        </div>
        <div class="study-stat">
            <i class="fas fa-filter study-stat-icon"></i>
            <div class="study-stat-value">${currentModeFlashcards}</div>
            <div class="study-stat-label">W trybie</div>
        </div>
    `;
}

function updateQuickStats() {
    const dueCards = getDueFlashcards().length;
    document.getElementById('quickStats').textContent = `${dueCards} fiszek`;
    
    document.getElementById('studyReadyCount').textContent = dueCards;
    document.getElementById('totalDecksCount').textContent = appData.decks.length;
}

// ==================== OSIĄGNIĘCIA ====================
function checkAchievements() {
    let masteredCount = 0;
    let totalCount = 0;
    
    for (const deck in userProgress.decks) {
        for (const topic in userProgress.decks[deck]) {
            for (const card in userProgress.decks[deck][topic]) {
                totalCount++;
                if (userProgress.decks[deck][topic][card] === 'mastered') {
                    masteredCount++;
                }
            }
        }
    }
    
    if (masteredCount >= 1 && !userProgress.achievements.firstMaster) {
        unlockAchievement('firstMaster');
    }
    
    if (masteredCount >= 100 && !userProgress.achievements.master100) {
        unlockAchievement('master100');
    }
    
    if (userProgress.stats.streak >= 7 && !userProgress.achievements.streak7) {
        unlockAchievement('streak7');
    }
    
    if (userProgress.stats.today.count >= 10 && !userProgress.achievements.quickLearner) {
        unlockAchievement('quickLearner');
    }
    
    updateAchievementsView();
}

function unlockAchievement(achievementKey) {
    if (!userProgress.achievements[achievementKey]) {
        userProgress.achievements[achievementKey] = true;
        saveUserProgress();
        
        const achievement = achievements[achievementKey];
        showNotification(`🎉 Osiągnięcie odblokowane: ${achievement.name} - ${achievement.desc}`, 'success');
    }
}

function updateAchievementsView() {
    const container = document.getElementById('achievementsList');
    if (!container) return;
    
    container.innerHTML = '';
    
    let unlockedCount = 0;
    Object.keys(achievements).forEach(key => {
        const achievement = achievements[key];
        const isUnlocked = userProgress.achievements[key];
        
        if (isUnlocked) unlockedCount++;
        
        const achievementElement = document.createElement('div');
        achievementElement.className = `achievement ${isUnlocked ? 'unlocked' : 'locked'}`;
        achievementElement.innerHTML = `
            <i class="${achievement.icon}"></i>
            <div class="achievement-info">
                <strong>${achievement.name}</strong>
                <small>${achievement.desc}</small>
            </div>
        `;
        
        container.appendChild(achievementElement);
    });
    
    document.getElementById('achievementsCount').textContent = `${unlockedCount}/${Object.keys(achievements).length}`;
}

// ==================== IMPORT/EXPORT ====================
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.name.toLowerCase().endsWith('.txt')) {
        showNotification('Proszę wybrać plik z rozszerzeniem .txt', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        processUploadedFile(e.target.result, file.name);
    };
    reader.onerror = function() {
        showNotification('Błąd podczas czytania pliku', 'error');
    };
    reader.readAsText(file);
}

function processUploadedFile(content, fileName) {
    try {
        const lines = content.split('\n');
        const flashcards = [];
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;
            
            const parts = trimmedLine.split(' - ');
            if (parts.length === 2) {
                flashcards.push({
                    polish: parts[0].trim(),
                    english: parts[1].trim()
                });
            }
        }
        
        if (flashcards.length > 0) {
            showNotification(`Pomyślnie zaimportowano ${flashcards.length} fiszek z pliku ${fileName}`, 'success');
            
            document.getElementById('filePreview').style.display = 'block';
            document.getElementById('fileName').textContent = fileName;
            document.getElementById('fileLines').textContent = flashcards.length;
            document.getElementById('fileContent').textContent = content.substring(0, 500) + (content.length > 500 ? '...' : '');
        } else {
            showNotification('Nie udało się zaimportować żadnych fiszek. Sprawdź format pliku.', 'error');
        }
    } catch (error) {
        showNotification('Błąd podczas przetwarzania pliku: ' + error.message, 'error');
    }
}

function createNewDeck() {
    const deckName = document.getElementById('newDeckName').value.trim();
    const topicName = document.getElementById('newTopicName').value.trim();
    
    if (!deckName || !topicName) {
        showNotification('Wprowadź nazwę działu i tematu', 'error');
        return;
    }
    
    const newDeckId = deckName.toLowerCase().replace(/\s+/g, '-');
    const newTopicId = topicName.toLowerCase().replace(/\s+/g, '-');
    
    const newDeck = {
        id: newDeckId,
        name: deckName,
        icon: 'fas fa-folder',
        description: document.getElementById('deckDescription').value.trim() || 'Nowy zestaw fiszek',
        topics: [
            {
                id: newTopicId,
                name: topicName,
                count: 0, // POPRAWKA: dodajemy count
                flashcards: []
            }
        ]
    };
    
    appData.decks.push(newDeck);
    
    document.getElementById('newDeckName').value = '';
    document.getElementById('newTopicName').value = '';
    document.getElementById('deckDescription').value = '';
    
    loadDecks();
    showNotification(`Utworzono nowy dział: ${deckName} z tematem: ${topicName}`, 'success');
}

function exportProgress() {
    try {
        const dataStr = JSON.stringify(userProgress, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `fiszkownica-progress-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        showNotification('Postępy zostały wyeksportowane', 'success');
    } catch (error) {
        showNotification('Błąd podczas eksportowania postępów: ' + error.message, 'error');
    }
}

// ==================== NOTYFIKACJE ====================
function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationsContainer');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    container.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}

// ==================== BŁĘDY ====================
function handleError(error, context) {
    console.error(`Błąd w ${context}:`, error);
    showNotification(`Wystąpił błąd: ${error.message}`, 'error');
}

// ==================== NAVIGATION ====================
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(sectionId).classList.add('active');
    
    if (sectionId === 'stats') {
        updateStats();
        updateAchievementsView();
    }
}

function selectDeck() {
    showSection('decks');
}

function showAbout() {
    document.getElementById('aboutModal').style.display = 'block';
    
    const aboutStats = document.getElementById('aboutStats');
    if (aboutStats) {
        const total = parseInt(document.getElementById('totalFlashcards').textContent) || 0;
        const mastered = parseInt(document.getElementById('masteredFlashcards').textContent) || 0;
        const streak = userProgress.stats.streak || 0;
        
        aboutStats.innerHTML = `
            <p><strong>Statystyki:</strong></p>
            <p>Fiszek: ${total}</p>
            <p>Opanowanych: ${mastered} (${total > 0 ? Math.round((mastered/total)*100) : 0}%)</p>
            <p>Seria dni: ${streak}</p>
        `;
    }
}

function closeAboutModal() {
    document.getElementById('aboutModal').style.display = 'none';
}

function showHelp() {
    document.getElementById('helpModal').style.display = 'block';
}

function closeHelpModal() {
    document.getElementById('helpModal').style.display = 'none';
}

function triggerFileInput() {
    document.getElementById('fileInput').click();
}

function clearFileInput() {
    document.getElementById('fileInput').value = '';
    document.getElementById('filePreview').style.display = 'none';
    showNotification('Plik został usunięty', 'info');
}

// ==================== UTILITIES ====================
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Zamknij modal po kliknięciu poza nim
window.onclick = function(event) {
    const modals = ['deadlineModal', 'aboutModal', 'helpModal'];
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (event.target === modal) {
            if (modalId === 'deadlineModal') closeModal();
            else if (modalId === 'aboutModal') closeAboutModal();
            else if (modalId === 'helpModal') closeHelpModal();
        }
    });
};

console.log('Fiszkownica - aplikacja załadowana pomyślnie!');