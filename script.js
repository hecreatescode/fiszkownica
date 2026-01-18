// Główne zmienne aplikacji
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

// System powtórek spaced repetition
let spacedRepetitionIntervals = {
    'new': 1,      // 1 dzień
    'learning': 3, // 3 dni
    'almost': 7,   // 7 dni
    'mastered': 30 // 30 dni
};

// Osiągnięcia
let achievements = {
    firstMaster: { name: 'Pierwsze kroki', desc: 'Opanuj pierwszą fiszkę', unlocked: false },
    streak7: { name: 'Konsekwentny', desc: '7 dni nauki z rzędu', unlocked: false },
    master100: { name: 'Ekspert', desc: 'Opanuj 100 fiszek', unlocked: false },
    quickLearner: { name: 'Szybki uczeń', desc: 'Opanuj 10 fiszek w jeden dzień', unlocked: false }
};

// Inicjalizacja aplikacji
document.addEventListener('DOMContentLoaded', function() {
    initApp();
});

async function initApp() {
    try {
        await loadAppData();
        loadUserProgress();
        setupEventListeners();
        loadDecks();
        updateStats();
        updateQuickStats();
        checkAchievements();
        
        // Przywróć tryb ciemny jeśli był zapisany
        if (localStorage.getItem('darkMode') === 'true') {
            document.body.classList.add('dark-mode');
            document.getElementById('themeToggle').innerHTML = '<i class="fas fa-sun"></i>';
        }
        
        showNotification('Aplikacja została załadowana pomyślnie!', 'success');
    } catch (error) {
        handleError(error, 'initApp');
        showNotification('Wystąpił błąd podczas ładowania aplikacji', 'error');
    }
}

// Ładowanie danych aplikacji z plików JSON
async function loadAppData() {
    try {
        // Ładujemy strukturę decków
        const decksResponse = await fetch('./data/decks.json');
        const decksStructure = await decksResponse.json();
        
        appData.decks = [];
        
        // Dla każdego decku ładujemy jego tematy
        for (const deckInfo of decksStructure.decks) {
            const deck = {
                id: deckInfo.id,
                name: deckInfo.name,
                topics: []
            };
            
            // Ładujemy tematy dla tego decku
            for (const topicInfo of deckInfo.topics) {
                try {
                    const topicResponse = await fetch(`./data/${deckInfo.id}/${topicInfo.file}`);
                    const flashcards = await topicResponse.json();
                    
                    deck.topics.push({
                        id: topicInfo.id,
                        name: topicInfo.name,
                        flashcards: flashcards
                    });
                } catch (error) {
                    console.error(`Błąd ładowania tematu ${topicInfo.file}:`, error);
                    showNotification(`Błąd ładowania tematu: ${topicInfo.name}`, 'error');
                }
            }
            
            appData.decks.push(deck);
        }
        
        console.log('Dane aplikacji załadowane pomyślnie', appData);
    } catch (error) {
        console.error('Błąd ładowania danych aplikacji:', error);
        // Fallback - puste dane
        appData.decks = [];
        throw error;
    }
}

// Ładowanie postępów użytkownika z localStorage
function loadUserProgress() {
    const savedProgress = localStorage.getItem('fiszkownicaProgress');
    if (savedProgress) {
        userProgress = JSON.parse(savedProgress);
    } else {
        // Inicjalizacja pustych postępów
        userProgress = {
            decks: {},
            stats: {
                total: 0,
                mastered: 0,
                learning: 0,
                new: 0,
                today: { count: 0, time: 0 },
                streak: 0,
                lastStudyDate: null
            },
            deadlines: {},
            spacedRepetition: {},
            achievements: {}
        };
        saveUserProgress();
    }
    
    // Inicjalizacja osiągnięć
    if (!userProgress.achievements) {
        userProgress.achievements = {};
    }
}

// Zapisywanie postępów użytkownika
function saveUserProgress() {
    localStorage.setItem('fiszkownicaProgress', JSON.stringify(userProgress));
}

// Ustawienie nasłuchiwaczy zdarzeń
function setupEventListeners() {
    // Przełącznik trybu ciemnego
    const themeToggle = document.getElementById('themeToggle');
    themeToggle.addEventListener('click', toggleDarkMode);

    // Obsługa uploadu plików
    const fileUpload = document.getElementById('fileUpload');
    const fileInput = document.getElementById('fileInput');
    
    fileUpload.addEventListener('click', () => {
        fileInput.click();
    });
    
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
    
    // Obsługa klawisza Enter w testach
    document.addEventListener('keydown', handleTestEnterKey);
}

// Przełączanie trybu ciemnego
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const themeToggle = document.getElementById('themeToggle');
    if (document.body.classList.contains('dark-mode')) {
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        localStorage.setItem('darkMode', 'true');
    } else {
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        localStorage.setItem('darkMode', 'false');
    }
}

// Pokaż/ukryj opcje sortowania
function showSortOptions() {
    const sortOptions = document.getElementById('sortOptions');
    sortOptions.style.display = sortOptions.style.display === 'none' ? 'flex' : 'none';
}

// Sortowanie tematów
function sortTopics(method) {
    currentSortMethod = method;
    loadDecks();
}

// Ładowanie zestawów fiszek z uwzględnieniem sortowania
function loadDecks() {
    const decksContainer = document.getElementById('decksContainer');
    if (!decksContainer) return;
    
    decksContainer.innerHTML = '';

    appData.decks.forEach(deck => {
        // Oblicz całkowitą liczbę fiszek w dziale
        const totalFlashcards = deck.topics.reduce((total, topic) => total + topic.flashcards.length, 0);
        
        const deckElement = document.createElement('div');
        deckElement.className = 'menu-card';
        
        // Sprawdź czy są deadline'y dla tego działu
        const deadlineInfo = getDeadlineInfo(deck.id);
        
        // Przygotuj tematy do wyświetlenia (z sortowaniem)
        let topicsToDisplay = [...deck.topics];
        
        if (currentSortMethod === 'deadline') {
            topicsToDisplay.sort((a, b) => {
                const deadlineA = getDeadlineInfo(deck.id, a.id);
                const deadlineB = getDeadlineInfo(deck.id, b.id);
                
                if (!deadlineA && !deadlineB) return 0;
                if (!deadlineA) return 1;
                if (!deadlineB) return -1;
                
                return new Date(deadlineA.date) - new Date(deadlineB.date);
            });
        } else if (currentSortMethod === 'alphabetical') {
            topicsToDisplay.sort((a, b) => a.name.localeCompare(b.name));
        } else if (currentSortMethod === 'flashcards') {
            topicsToDisplay.sort((a, b) => b.flashcards.length - a.flashcards.length);
        }
        
        deckElement.innerHTML = `
            <div class="deck-header">
                <div>
                    <h3><i class="fas fa-folder"></i> ${deck.name}</h3>
                    <span>${deck.topics.length} tematów, ${totalFlashcards} fiszek</span>
                </div>
                ${deadlineInfo ? `
                    <div class="deadline-badge ${deadlineInfo.colorClass}">
                        <i class="fas fa-calendar-day"></i> 
                        <span>${deadlineInfo.text}</span>
                    </div>
                ` : ''}
            </div>
            <div class="deck-topics">
                ${topicsToDisplay.map(topic => {
                    const topicDeadlineInfo = getDeadlineInfo(deck.id, topic.id);
                    return `
                        <div class="topic-item" onclick="selectTopic('${deck.id}', '${topic.id}')">
                            <div>${topic.name}</div>
                            <div class="topic-details">
                                <small>${topic.flashcards.length} fiszek</small>
                                ${topicDeadlineInfo ? `
                                    <small class="deadline-small ${topicDeadlineInfo.colorClass}">
                                        <i class="fas fa-clock"></i> ${topicDeadlineInfo.text}
                                    </small>
                                ` : ''}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
            <div class="deck-actions">
                <button class="btn btn-outline" onclick="setDeadline('${deck.id}')">
                    <i class="fas fa-calendar-plus"></i> Ustaw deadline
                </button>
            </div>
        `;
        decksContainer.appendChild(deckElement);
    });
}

// Pobierz informacje o deadline dla działu/tematu
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
        // Deadline minął
        const daysAgo = Math.abs(daysDiff);
        text = `Spóźnione o ${daysAgo} dni`;
        colorClass = 'deadline-black';
    } else if (daysDiff === 0) {
        // Deadline dzisiaj
        text = 'Dziś kończy się!';
        colorClass = 'deadline-red';
    } else if (daysDiff <= 2) {
        // Mniej niż 2 dni
        text = `Pozostało ${daysDiff} dni`;
        colorClass = 'deadline-red';
    } else if (daysDiff <= 7) {
        // Tydzień lub mniej
        text = `Pozostało ${daysDiff} dni`;
        colorClass = 'deadline-orange';
    } else {
        // Więcej niż tydzień
        text = `Pozostało ${daysDiff} dni`;
        colorClass = 'deadline-green';
    }
    
    return { text, colorClass, date: deadlineDate, daysDiff };
}

// Otwórz modal do ustawiania deadline
function setDeadline(deckId, topicId = null) {
    currentDeadlineKey = topicId ? `${deckId}-${topicId}` : deckId;
    const currentDeadline = userProgress.deadlines ? userProgress.deadlines[currentDeadlineKey] : null;
    
    // Pobierz nazwę działu/tematu
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
    
    // Ustaw domyślną datę (za 7 dni)
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 7);
    const defaultDateStr = defaultDate.toISOString().split('T')[0];
    
    // Ustaw treść modalu
    document.getElementById('modalTitle').textContent = `Ustaw deadline dla: ${name}`;
    document.getElementById('modalDescription').textContent = 'Wybierz datę deadline:';
    document.getElementById('deadlineDate').value = currentDeadline ? 
        new Date(currentDeadline.date).toISOString().split('T')[0] : defaultDateStr;
    
    // Pokaż modal
    document.getElementById('deadlineModal').style.display = 'block';
}

// Zamknij modal
function closeModal() {
    document.getElementById('deadlineModal').style.display = 'none';
    currentDeadlineKey = null;
}

// Zapisz deadline z modalu
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
        
        // Zapisz deadline
        if (!userProgress.deadlines) userProgress.deadlines = {};
        userProgress.deadlines[currentDeadlineKey] = {
            date: dateObj.toISOString(),
            setDate: new Date().toISOString()
        };
        
        saveUserProgress();
        loadDecks(); // Odśwież widok
        closeModal();
        showNotification(`Deadline ustawiony na: ${dateObj.toLocaleDateString('pl-PL')}`, 'success');
        
    } catch (error) {
        showNotification('Błąd podczas ustawiania deadline: ' + error.message, 'error');
    }
}

// Zmiana języka testu
function changeTestLanguage() {
    testLanguage = document.getElementById('testLanguage').value;
    if (testQuestions.length > 0) {
        displayTestQuestion();
    }
}

// Wybór tematu do nauki z deduplikacją fiszek
function selectTopic(deckId, topicId) {
    const deck = appData.decks.find(d => d.id === deckId);
    if (!deck) return;

    const topic = deck.topics.find(t => t.id === topicId);
    if (!topic) return;

    currentDeck = deckId;
    currentTopic = topicId;
    
    // DEDUPLIKACJA: Grupuj fiszki po polskich słowach
    const groupedFlashcards = {};
    topic.flashcards.forEach(flashcard => {
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
    
    // Zresetuj tryb nauki do domyślnego
    studyMode = 'all';
    document.getElementById('studyModeToggle').classList.remove('btn-active');
    document.getElementById('studyModeToggle').innerHTML = '<i class="fas fa-filter"></i> Tylko do nauki';
    
    // Resetuj zaawansowane filtry
    resetAdvancedFilters();
    
    // Załaduj fiszki z uwzględnieniem filtrowania
    loadFilteredFlashcards();
    
    currentFlashcardIndex = 0;

    // Aktualizacja interfejsu
    document.getElementById('studyTitle').textContent = `Nauka: ${deck.name} - ${topic.name}`;
    
    // Sprawdź i pokaż informację o deadline
    const deadlineInfo = getDeadlineInfo(deckId, topicId);
    showDeadlineInfo(deadlineInfo);
    
    showSection('study');
    displayCurrentFlashcard();
    updateStudyStats();
}

// Resetuj zaawansowane filtry
function resetAdvancedFilters() {
    document.getElementById('filterNew').checked = true;
    document.getElementById('filterLearning').checked = true;
    document.getElementById('filterAlmost').checked = true;
    document.getElementById('filterMastered').checked = false;
}

// Załaduj przefiltrowane fiszki na podstawie trybu nauki
function loadFilteredFlashcards() {
    if (studyMode === 'all') {
        // Pokaż wszystkie fiszki
        currentFlashcards = [...originalFlashcards];
    } else {
        // Filtruj fiszki - pokaż tylko te, które nie są opanowane na 100%
        currentFlashcards = originalFlashcards.filter(flashcard => {
            // Dla zgrupowanych fiszek sprawdzamy po pierwszym oryginalnym indeksie
            const level = getKnowledgeLevel(currentDeck, currentTopic, flashcard.originalIndices[0]);
            return level !== 'mastered';
        });
    }
    
    // Dodatkowo zastosuj zaawansowane filtry
    applyAdvancedFilters();
}

// Przełącz tryb nauki (wszystkie fiszki / tylko do nauki)
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
    
    // Załaduj przefiltrowane fiszki
    loadFilteredFlashcards();
    
    // Zresetuj indeks fiszki
    currentFlashcardIndex = 0;
    
    // Aktualizuj widok
    displayCurrentFlashcard();
    updateStudyStats();
}

// Przełącz tryb nauki w testach (wszystkie fiszki / tylko do nauki)
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
    
    // Jeśli test jest już wybrany, przeładuj pytania z uwzględnieniem filtra
    if (testDeck && testTopic) {
        prepareTestQuestions();
        currentTestQuestion = 0;
        displayTestQuestion();
    }
}

// Pokaż/ukryj zaawansowane filtry
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

// Zastosuj zaawansowane filtry
function applyAdvancedFilters() {
    const showNew = document.getElementById('filterNew').checked;
    const showLearning = document.getElementById('filterLearning').checked;
    const showAlmost = document.getElementById('filterAlmost').checked;
    const showMastered = document.getElementById('filterMastered').checked;
    
    // Filtruj fiszki na podstawie poziomów wiedzy
    currentFlashcards = currentFlashcards.filter(flashcard => {
        // Dla zgrupowanych fiszek sprawdzamy po pierwszym oryginalnym indeksie
        const level = getKnowledgeLevel(currentDeck, currentTopic, flashcard.originalIndices[0]);
        
        return (level === 'new' && showNew) ||
               (level === 'learning' && showLearning) ||
               (level === 'almost' && showAlmost) ||
               (level === 'mastered' && showMastered);
    });
    
    // Dostosuj indeks jeśli jest poza zakresem
    if (currentFlashcardIndex >= currentFlashcards.length) {
        currentFlashcardIndex = Math.max(0, currentFlashcards.length - 1);
    }
    
    displayCurrentFlashcard();
    updateStudyStats();
}

// Nowa funkcja przygotowująca pytania testowe z filtrowaniem
function prepareTestQuestions() {
    const deck = appData.decks.find(d => d.id === testDeck);
    const topic = deck.topics.find(t => t.id === testTopic);

    // Zbieramy listę fiszek uwzględniając tryb (wszystkie / tylko do nauki)
    const itemsToConsider = [];
    topic.flashcards.forEach((flashcard, index) => {
        if (testStudyMode === 'all') {
            itemsToConsider.push({ flashcard, index });
        } else {
            const level = getKnowledgeLevel(testDeck, testTopic, index);
            if (level !== 'mastered') itemsToConsider.push({ flashcard, index });
        }
    });

    if (itemsToConsider.length === 0) {
        // Fallback do wszystkich fiszek jeśli nie ma nic do nauki
        topic.flashcards.forEach((flashcard, index) => itemsToConsider.push({ flashcard, index }));
    }

    // Deduplikujemy pytania po fragmencie, który będzie wyświetlany (zależnie od języka testu)
    const map = new Map();
    itemsToConsider.forEach(({ flashcard, index }) => {
        const key = testLanguage === 'polish' ? flashcard.polish : flashcard.english;
        if (!map.has(key)) {
            map.set(key, {
                // Pola kompatybilne z istniejącym kodem
                polish: flashcard.polish,
                english: flashcard.english,
                // Dodatkowe zbiory możliwych tłumaczeń
                polishes: [flashcard.polish],
                englishs: [flashcard.english],
                // Indeksy oryginalnych fiszek w temacie
                originalIndices: [index]
            });
        } else {
            const entry = map.get(key);
            // Dodajemy tłumaczenie tylko jeśli go jeszcze nie ma
            if (!entry.englishs.includes(flashcard.english)) entry.englishs.push(flashcard.english);
            if (!entry.polishes.includes(flashcard.polish)) entry.polishes.push(flashcard.polish);
            if (!entry.originalIndices.includes(index)) entry.originalIndices.push(index);
        }
    });

    testQuestions = Array.from(map.values());

    // Tasowanie pytań
    shuffleArray(testQuestions);
}

// Aktualizuj statystyki nauki
function updateStudyStats() {
    if (!currentDeck || !currentTopic) return;
    
    const totalFlashcards = originalFlashcards.length;
    const masteredFlashcards = originalFlashcards.filter(flashcard => {
        const level = getKnowledgeLevel(currentDeck, currentTopic, flashcard.originalIndices[0]);
        return level === 'mastered';
    }).length;
    
    const toLearnFlashcards = totalFlashcards - masteredFlashcards;
    const currentModeFlashcards = currentFlashcards.length;
    
    // Utwórz lub zaktualizuj kontener statystyk
    let statsContainer = document.getElementById('studyStats');
    if (!statsContainer) {
        statsContainer = document.createElement('div');
        statsContainer.id = 'studyStats';
        statsContainer.className = 'study-stats';
        const deadlineInfo = document.getElementById('deadlineInfo');
        deadlineInfo.after(statsContainer);
    }
    
    statsContainer.innerHTML = `
        <div class="study-stat">
            <div class="study-stat-value">${totalFlashcards}</div>
            <div class="study-stat-label">Wszystkie</div>
        </div>
        <div class="study-stat">
            <div class="study-stat-value">${masteredFlashcards}</div>
            <div class="study-stat-label">Opanowane</div>
        </div>
        <div class="study-stat">
            <div class="study-stat-value">${toLearnFlashcards}</div>
            <div class="study-stat-label">Do nauki</div>
        </div>
        <div class="study-stat">
            <div class="study-stat-value">${currentModeFlashcards}</div>
            <div class="study-stat-label">W trybie</div>
        </div>
    `;
}

// Wybór tematu do testu
function selectTestTopic(deckId, topicId) {
    const deck = appData.decks.find(d => d.id === deckId);
    if (!deck) return;

    const topic = deck.topics.find(t => t.id === topicId);
    if (!topic) return;

    testDeck = deckId;
    testTopic = topicId;
    
    // Przygotuj pytania testowe z uwzględnieniem filtra
    prepareTestQuestions();
    // Dodatkowe tasowanie, aby mieć pewność, że kolejność jest losowa
    shuffleArray(testQuestions);
    
    // Resetujemy tryb poprawy
    isReviewMode = false;
    incorrectAnswers = [];
    reviewQuestions = [];
    
    currentTestQuestion = 0;
    testResults = { correct: 0, total: testQuestions.length };

    // Aktualizacja interfejsu
    document.getElementById('testTitle').textContent = `Test: ${deck.name} - ${topic.name}`;
    
    // Ukryj wybór tematów
    document.getElementById('testTopicSelection').style.display = 'none';
    
    // Rozpocznij test
    document.getElementById('testResult').style.display = 'none';
    document.getElementById('incorrectAnswersList').style.display = 'none';
    displayTestQuestion();
}

// Funkcja do tasowania tablicy
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Pokazanie informacji o deadline w widoku nauki
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

// Wyświetlanie aktualnej fiszki z obsługą wielu tłumaczeń
function displayCurrentFlashcard() {
    if (currentFlashcards.length === 0) {
        document.getElementById('flashcardFront').textContent = 'Brak fiszek do nauki';
        document.getElementById('flashcardBack').textContent = 'Brak fiszek do nauki';
        
        // Ukryj kontrolek jeśli nie ma fiszek
        document.querySelector('.knowledge-levels').style.display = 'none';
        document.querySelector('.flashcard-controls').style.display = 'none';
        document.getElementById('progressBar').style.width = '0%';
        return;
    }
    
    // Pokaż kontrolek jeśli są fiszek
    document.querySelector('.knowledge-levels').style.display = 'flex';
    document.querySelector('.flashcard-controls').style.display = 'flex';

    const flashcard = currentFlashcards[currentFlashcardIndex];

    // Sprawdzamy czy to zgrupowana fiszka z wieloma tłumaczeniami
    if (flashcard.count && flashcard.count > 1) {
        document.getElementById('flashcardFront').textContent = flashcard.polish;
        document.getElementById('flashcardBack').textContent = flashcard.english.join(', ');
        
        // Pokaż liczbę tłumaczeń
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
        
        // Ukryj liczbę tłumaczeń jeśli nie jest potrzebna
        const translationCount = document.querySelector('.translation-count');
        if (translationCount) {
            translationCount.remove();
        }
    }

    // Resetowanie obrócenia fiszki
    document.getElementById('flashcard').classList.remove('flipped');

    // Aktualizacja paska postępu
    const progress = ((currentFlashcardIndex + 1) / currentFlashcards.length) * 100;
    document.getElementById('progressBar').style.width = `${progress}%`;
}

// Wyświetlanie pytania testowego
function displayTestQuestion() {
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
        // W trybie poprawy używamy fiszki z obiektu błędnej odpowiedzi
        question = reviewQuestions[currentTestQuestion].flashcard;
    } else {
        question = testQuestions[currentTestQuestion];
    }

    // Resetowanie feedbacku
    document.getElementById('writingFeedback').textContent = '';
    document.getElementById('multipleFeedback').textContent = '';
    document.getElementById('truefalseFeedback').textContent = '';
    
    // Znajdź oryginalny indeks fiszki w temacie
    const originalDeck = appData.decks.find(d => d.id === testDeck);
    const originalTopic = originalDeck.topics.find(t => t.id === testTopic);
    // question.originalIndices zawiera oryginalne indeksy fiszek odpowiadające temu pytaniu
    currentTestFlashcardIndices = question.originalIndices ? [...question.originalIndices] : [];
    // Dla kompatybilności starego kodu pozostawiam pojedynczy indeks (pierwszy)
    currentTestFlashcardIndex = currentTestFlashcardIndices.length ? currentTestFlashcardIndices[0] : -1;
    
    // Pobierz poziom znajomości fiszki (używamy first index z currentTestFlashcardIndices)
    let knowledgeLevel = 'new';
    if (currentTestFlashcardIndex !== -1) {
        knowledgeLevel = getKnowledgeLevel(testDeck, testTopic, currentTestFlashcardIndex);
    }
    
    // Ustaw klasę dla poziomu wiedzy
    const levelClass = `level-${knowledgeLevel}`;
    const levelText = getLevelText(knowledgeLevel);
    
    // Ustaw poziom wiedzy dla wszystkich trybów testowych
    document.getElementById('writingLevel').textContent = levelText;
    document.getElementById('writingLevel').className = `test-level-badge ${levelClass}`;
    document.getElementById('multipleLevel').textContent = levelText;
    document.getElementById('multipleLevel').className = `test-level-badge ${levelClass}`;
    document.getElementById('truefalseLevel').textContent = levelText;
    document.getElementById('truefalseLevel').className = `test-level-badge ${levelClass}`;
    
    if (testMode === 'writing') {
        if (testLanguage === 'polish') {
            document.getElementById('writingQuestion').textContent = `Jak po angielsku powiesz "${question.polish}"?`;
            document.getElementById('writingAnswer').placeholder = "Wpisz tłumaczenie angielskie...";
        } else {
            document.getElementById('writingQuestion').textContent = `Jak po polsku powiesz "${question.english}"?`;
            document.getElementById('writingAnswer').placeholder = "Wpisz tłumaczenie polskie...";
        }
        document.getElementById('writingAnswer').value = '';
    } else if (testMode === 'multiple') {
        if (testLanguage === 'polish') {
            document.getElementById('multipleQuestion').textContent = `Jak po angielsku powiesz "${question.polish}"?`;
        } else {
            document.getElementById('multipleQuestion').textContent = `Jak po polsku powiesz "${question.english}"?`;
        }
        
        // Dla trybu wielokrotnego wyboru, uwzględniamy wszystkie możliwe poprawne odpowiedzi
        let correctAnswers;
        if (testLanguage === 'polish') {
            // question.englishs zawiera wszystkie możliwe angielskie tłumaczenia danego polskiego klucza
            correctAnswers = question.englishs ? [...question.englishs] : [question.english];
        } else {
            correctAnswers = question.polishes ? [...question.polishes] : [question.polish];
        }

        const options = [...correctAnswers];
        
        // Dodajemy opcje aż do 4
        while (options.length < 4) {
            const randomIndex = Math.floor(Math.random() * testQuestions.length);
            const randomOption = testLanguage === 'polish' 
                ? (testQuestions[randomIndex].englishs ? testQuestions[randomIndex].englishs[0] : testQuestions[randomIndex].english) 
                : (testQuestions[randomIndex].polishes ? testQuestions[randomIndex].polishes[0] : testQuestions[randomIndex].polish);
                
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
        // Dla trybu prawda/fałsz, uwzględniamy wszystkie możliwe tłumaczenia
        const isCorrect = Math.random() > 0.5;
        
        if (testLanguage === 'polish') {
            // Dla poprawnej odpowiedzi wybieramy jedno z poprawnych tłumaczeń
            const correctOptions = question.englishs && question.englishs.length ? question.englishs : [question.english];
            let displayedTranslation;
            if (isCorrect) {
                displayedTranslation = correctOptions[Math.floor(Math.random() * correctOptions.length)];
            } else {
                // Fałsz - wybierz losową angielską nazwę z innego pytania
                do {
                    const randomQ = testQuestions[Math.floor(Math.random() * testQuestions.length)];
                    displayedTranslation = randomQ.englishs && randomQ.englishs.length ? randomQ.englishs[0] : randomQ.english;
                } while (correctOptions.includes(displayedTranslation));
            }

            document.getElementById('truefalseQuestion').textContent = `"${question.polish}" po angielsku to "${displayedTranslation}"`;
        } else {
            const correctOptions = question.polishes && question.polishes.length ? question.polishes : [question.polish];
            const displayedTranslation = isCorrect ? correctOptions[Math.floor(Math.random() * correctOptions.length)] : (testQuestions[Math.floor(Math.random() * testQuestions.length)].polish);
            document.getElementById('truefalseQuestion').textContent = `"${question.english}" po polsku to "${displayedTranslation}"`;
        }
        
        trueFalseAnswer = isCorrect;
    }
}

// Pobierz poziom znajomości fiszki
function getKnowledgeLevel(deckId, topicId, flashcardIndex) {
    if (userProgress.decks[deckId] && 
        userProgress.decks[deckId][topicId] && 
        userProgress.decks[deckId][topicId][flashcardIndex] !== undefined) {
        return userProgress.decks[deckId][topicId][flashcardIndex];
    }
    return 'new';
}

// Pobierz tekst poziomu znajomości
function getLevelText(level) {
    switch(level) {
        case 'new': return 'Nowe';
        case 'learning': return 'Uczę się';
        case 'almost': return 'Prawie umiem';
        case 'mastered': return 'Umiem';
        default: return 'Nowe';
    }
}

// Obsługa obracania fiszki
function flipCard() {
    document.getElementById('flashcard').classList.toggle('flipped');
}

// Ustawianie poziomu znajomości fiszki z spaced repetition
function setKnowledgeLevel(level) {
    if (currentFlashcards.length === 0) return;

    const flashcard = currentFlashcards[currentFlashcardIndex];
    
    // Jeśli to zgrupowana fiszka, ustaw poziom dla wszystkich oryginalnych indeksów
    if (flashcard.originalIndices) {
        flashcard.originalIndices.forEach(originalIndex => {
            setKnowledgeLevelForCard(originalIndex, level);
        });
    } else {
        // Znajdź oryginalny indeks fiszki w temacie
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
    
    // Jeśli jesteśmy w trybie "tylko do nauki" i ustawiliśmy poziom na "umiem",
    // przejdź do następnej fiszki i odśwież listę
    if (studyMode === 'toLearn' && level === 'mastered') {
        // Usuń bieżącą fiszkę z listy (jeśli jest opanowana)
        loadFilteredFlashcards();
        
        if (currentFlashcards.length === 0) {
            // Brak więcej fiszek do nauki
            displayCurrentFlashcard();
            return;
        }
        
        // Dostosuj indeks jeśli jest poza zakresem
        if (currentFlashcardIndex >= currentFlashcards.length) {
            currentFlashcardIndex = currentFlashcards.length - 1;
        }
        
        displayCurrentFlashcard();
    }
}

// Ustaw poziom wiedzy dla pojedynczej fiszki z spaced repetition
function setKnowledgeLevelForCard(originalIndex, level) {
    if (originalIndex === -1) return;

    if (!userProgress.decks[currentDeck]) {
        userProgress.decks[currentDeck] = {};
    }
    
    if (!userProgress.decks[currentDeck][currentTopic]) {
        userProgress.decks[currentDeck][currentTopic] = {};
    }
    
    userProgress.decks[currentDeck][currentTopic][originalIndex] = level;
    
    // Ustaw datę następnej powtórki w spaced repetition
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + spacedRepetitionIntervals[level]);
    
    if (!userProgress.spacedRepetition) userProgress.spacedRepetition = {};
    if (!userProgress.spacedRepetition[currentDeck]) userProgress.spacedRepetition[currentDeck] = {};
    if (!userProgress.spacedRepetition[currentDeck][currentTopic]) userProgress.spacedRepetition[currentDeck][currentTopic] = {};
    
    userProgress.spacedRepetition[currentDeck][currentTopic][originalIndex] = nextReview.toISOString();
}

// Przejście do następnej fiszki
function nextCard() {
    if (currentFlashcards.length === 0) return;
    
    currentFlashcardIndex = (currentFlashcardIndex + 1) % currentFlashcards.length;
    displayCurrentFlashcard();
}

// Przejście do poprzedniej fiszki
function prevCard() {
    if (currentFlashcards.length === 0) return;
    
    currentFlashcardIndex = (currentFlashcardIndex - 1 + currentFlashcards.length) % currentFlashcards.length;
    displayCurrentFlashcard();
}

// Wybór zestawu do nauki
function selectDeck() {
    showSection('decks');
}

// Wybór zestawu do testu - pokazuje wybór tematów
function selectTestDeck() {
    showTestTopicSelection();
}

// Pokaż wybór tematów do testu
function showTestTopicSelection() {
    const topicsContainer = document.getElementById('testTopicsContainer');
    topicsContainer.innerHTML = '';
    
    // Zgrupuj tematy według działów
    const groupedTopics = {};
    appData.decks.forEach(deck => {
        if (!groupedTopics[deck.id]) {
            groupedTopics[deck.id] = {
                deckName: deck.name,
                topics: []
            };
        }
        
        deck.topics.forEach(topic => {
            groupedTopics[deck.id].topics.push({
                deckId: deck.id,
                topicId: topic.id,
                topicName: topic.name,
                flashcardCount: topic.flashcards.length
            });
        });
    });
    
    // Wyświetl działy ze zwijanymi tematami
    Object.keys(groupedTopics).forEach(deckId => {
        const deckData = groupedTopics[deckId];
        
        // Utwórz kontener dla działu
        const deckContainer = document.createElement('div');
        deckContainer.className = 'test-deck-container';
        
        // Nagłówek działu (klikalny)
        const deckHeader = document.createElement('div');
        deckHeader.className = 'test-deck-header';
        deckHeader.innerHTML = `
            <i class="fas fa-chevron-right deck-chevron"></i>
            <span>${deckData.deckName}</span>
            <small>${deckData.topics.length} tematów</small>
        `;
        
        // Kontener z tematami (początkowo ukryty)
        const topicsListContainer = document.createElement('div');
        topicsListContainer.className = 'test-topics-list collapsed';
        
        // Dodaj tematy do kontenera
        deckData.topics.forEach(topic => {
            const topicElement = document.createElement('div');
            topicElement.className = 'topic-item';
            
            // Pobierz informacje o deadline dla tematu
            const deadlineInfo = getDeadlineInfo(topic.deckId, topic.topicId);
            const deadlineHtml = deadlineInfo ? `
                <small class="test-topic-deadline ${deadlineInfo.colorClass}">
                    <i class="fas fa-clock"></i> ${deadlineInfo.text}
                </small>
            ` : '';
            
            topicElement.innerHTML = `
                <div>${topic.topicName}</div>
                <div class="topic-details">
                    <small>${topic.flashcardCount} fiszek</small>
                    ${deadlineHtml}
                </div>
            `;
            topicElement.onclick = () => selectTestTopic(topic.deckId, topic.topicId);
            topicsListContainer.appendChild(topicElement);
        });
        
        // Obsługa kliknięcia w nagłówek działu (rozwijanie/zwijanie)
        deckHeader.onclick = () => {
            const chevron = deckHeader.querySelector('.deck-chevron');
            if (topicsListContainer.classList.contains('collapsed')) {
                topicsListContainer.classList.remove('collapsed');
                chevron.classList.add('rotated');
            } else {
                topicsListContainer.classList.add('collapsed');
                chevron.classList.remove('rotated');
            }
        };
        
        deckContainer.appendChild(deckHeader);
        deckContainer.appendChild(topicsListContainer);
        topicsContainer.appendChild(deckContainer);
    });
    
    // Pokaż kontener wyboru tematów
    document.getElementById('testTopicSelection').style.display = 'block';
}

// Ustawianie trybu testu
function setTestMode(mode) {
    testMode = mode;
    
    // Ukrywanie wszystkich kontenerów testowych
    document.getElementById('writingTest').style.display = 'none';
    document.getElementById('multipleTest').style.display = 'none';
    document.getElementById('truefalseTest').style.display = 'none';
    
    // Pokazywanie wybranego kontenera testowego
    if (mode === 'writing') {
        document.getElementById('writingTest').style.display = 'block';
    } else if (mode === 'multiple') {
        document.getElementById('multipleTest').style.display = 'block';
    } else if (mode === 'truefalse') {
        document.getElementById('truefalseTest').style.display = 'block';
    }
    
    // Jeśli są już załadowane pytania, zaktualizuj widok
    if (testQuestions.length > 0) {
        // Przy każdej zmianie trybu testu przetasuj pytania, by kolejność była losowa
        shuffleArray(testQuestions);
        displayTestQuestion();
    }
}

// Wybór opcji w trybie wielokrotnego wyboru
function selectMultipleOption(index) {
    selectedOption = index;
    
    // Wizualne zaznaczenie wybranej opcji
    const options = document.querySelectorAll('#multipleOptions .test-option');
    options.forEach((opt, i) => {
        if (i === index) {
            opt.classList.add('selected');
        } else {
            opt.classList.remove('selected');
        }
    });
}

// Wybór odpowiedzi w trybie prawda/fałsz
function selectTrueFalse(answer) {
    trueFalseAnswer = answer;
    
    // Wizualne zaznaczenie wybranej opcji
    const trueOption = document.querySelector('.test-tf-option.true');
    const falseOption = document.querySelector('.test-tf-option.false');
    
    trueOption.classList.toggle('selected', answer === true);
    falseOption.classList.toggle('selected', answer === false);
}

// Obsługa klawisza Enter w testach
function handleTestEnterKey(event) {
    // Sprawdź czy jesteśmy w sekcji testów
    const testSection = document.getElementById('test');
    if (!testSection || !testSection.classList.contains('active')) return;
    
    // Sprawdź czy naciśnięto Enter
    if (event.key !== 'Enter') return;
    
    // Zapobiegaj domyślnej akcji
    event.preventDefault();
    
    // Wywołaj odpowiednią funkcję sprawdzania w zależności od trybu testu
    if (testMode === 'writing') {
        const writingTest = document.getElementById('writingTest');
        if (writingTest && writingTest.style.display !== 'none') {
            checkWritingAnswer();
        }
    } else if (testMode === 'multiple') {
        const multipleTest = document.getElementById('multipleTest');
        if (multipleTest && multipleTest.style.display !== 'none') {
            checkMultipleAnswer();
        }
    } else if (testMode === 'truefalse') {
        const truefalseTest = document.getElementById('truefalseTest');
        if (truefalseTest && truefalseTest.style.display !== 'none') {
            checkTrueFalseAnswer();
        }
    }
}

// Sprawdzanie odpowiedzi w trybie pisania
function checkWritingAnswer() {
    const answer = document.getElementById('writingAnswer').value.trim().toLowerCase();
    
    // Sprawdź czy test jest aktywny
    if ((!isReviewMode && currentTestQuestion >= testQuestions.length) || 
        (isReviewMode && currentTestQuestion >= reviewQuestions.length)) {
        return;
    }
    
    let correctAnswers;
    let correctAnswersOriginal; // Oryginalna wersja z dużymi literami do wyświetlenia
    if (isReviewMode) {
        const reviewItem = reviewQuestions[currentTestQuestion];
        if (reviewItem && reviewItem.correctAnswersArray && reviewItem.correctAnswersArray.length) {
            correctAnswersOriginal = [...reviewItem.correctAnswersArray];
            correctAnswers = reviewItem.correctAnswersArray.map(a => a.toLowerCase());
        } else if (reviewItem && reviewItem.correctAnswer) {
            // fallback: rozbijamy zapisany string 'a / b / c'
            correctAnswersOriginal = reviewItem.correctAnswer.split('/').map(a => a.trim());
            correctAnswers = correctAnswersOriginal.map(a => a.toLowerCase());
        } else {
            correctAnswers = [];
            correctAnswersOriginal = [];
        }
    } else {
        const currentFlashcard = testQuestions[currentTestQuestion];
        if (!currentFlashcard) {
            return; // Zabezpieczenie przed undefined
        }
        if (testLanguage === 'polish') {
            correctAnswersOriginal = currentFlashcard.englishs || [currentFlashcard.english];
            correctAnswers = correctAnswersOriginal.map(a => a.toLowerCase());
        } else {
            correctAnswersOriginal = currentFlashcard.polishes || [currentFlashcard.polish];
            correctAnswers = correctAnswersOriginal.map(a => a.toLowerCase());
        }
    }
        
    const feedback = document.getElementById('writingFeedback');
    
    if (correctAnswers.includes(answer)) {
        testResults.correct++;
        feedback.textContent = 'Poprawna odpowiedź!';
        feedback.className = 'test-feedback correct';
        updateKnowledgeLevelAfterTest(true);
    } else {
        // Pokazujemy wszystkie poprawne odpowiedzi z oryginalnymi wielkimi literami
        const correctAnswersText = correctAnswersOriginal.join(' lub ');
        feedback.textContent = `Błędna odpowiedź. Poprawne odpowiedzi to: ${correctAnswersText}`;
        feedback.className = 'test-feedback incorrect';
        updateKnowledgeLevelAfterTest(false);
        
        if (!isReviewMode) {
            incorrectAnswers.push({
                flashcard: testQuestions[currentTestQuestion],
                userAnswer: answer,
                correctAnswer: correctAnswersOriginal.join(' / '), // Zapisujemy wszystkie poprawne odpowiedzi z oryginalnymi wielkimi literami
                correctAnswersArray: [...correctAnswersOriginal],
                questionType: 'writing',
                originalIndices: testQuestions[currentTestQuestion].originalIndices ? [...testQuestions[currentTestQuestion].originalIndices] : []
            });
        }
    }
    
    setTimeout(() => {
        currentTestQuestion++;
        displayTestQuestion();
    }, 2000);
}

// Sprawdzanie odpowiedzi w trybie wielokrotnego wyboru
function checkMultipleAnswer() {
    if (selectedOption === null) {
        showNotification('Wybierz odpowiedź!', 'error');
        return;
    }
    
    // Sprawdź czy test jest aktywny
    if ((!isReviewMode && currentTestQuestion >= testQuestions.length) || 
        (isReviewMode && currentTestQuestion >= reviewQuestions.length)) {
        return;
    }
    
    const options = document.querySelectorAll('#multipleOptions .test-option');
    const selectedText = options[selectedOption].textContent;
    
    let correctAnswers;
    let correctAnswersOriginal; // Oryginalna wersja z dużymi literami do wyświetlenia
    if (isReviewMode) {
        const reviewItem = reviewQuestions[currentTestQuestion];
        if (reviewItem && reviewItem.correctAnswersArray && reviewItem.correctAnswersArray.length) {
            correctAnswersOriginal = [...reviewItem.correctAnswersArray];
            correctAnswers = reviewItem.correctAnswersArray.map(a => a.toLowerCase());
        } else if (reviewItem && reviewItem.correctAnswer) {
            correctAnswersOriginal = reviewItem.correctAnswer.split('/').map(a => a.trim());
            correctAnswers = correctAnswersOriginal.map(a => a.toLowerCase());
        } else {
            correctAnswers = [];
            correctAnswersOriginal = [];
        }
    } else {
        const currentFlashcard = testQuestions[currentTestQuestion];
        if (!currentFlashcard) {
            return; // Zabezpieczenie przed undefined
        }
        if (testLanguage === 'polish') {
            correctAnswersOriginal = currentFlashcard.englishs ? [...currentFlashcard.englishs] : [currentFlashcard.english];
            correctAnswers = correctAnswersOriginal.map(a => a.toLowerCase());
        } else {
            correctAnswersOriginal = currentFlashcard.polishes ? [...currentFlashcard.polishes] : [currentFlashcard.polish];
            correctAnswers = correctAnswersOriginal.map(a => a.toLowerCase());
        }
    }
        
    const feedback = document.getElementById('multipleFeedback');
    
    if (correctAnswers.includes(selectedText.toLowerCase())) {
        testResults.correct++;
        feedback.textContent = 'Poprawna odpowiedź!';
        feedback.className = 'test-feedback correct';
        updateKnowledgeLevelAfterTest(true);
    } else {
        const correctAnswersText = correctAnswersOriginal.join(' lub ');
        feedback.textContent = `Błędna odpowiedź. Poprawne odpowiedzi to: ${correctAnswersText}`;
        feedback.className = 'test-feedback incorrect';
        updateKnowledgeLevelAfterTest(false);
        
        if (!isReviewMode) {
            incorrectAnswers.push({
                flashcard: testQuestions[currentTestQuestion],
                userAnswer: selectedText,
                correctAnswer: correctAnswersOriginal.join(' / '),
                correctAnswersArray: [...correctAnswersOriginal],
                questionType: 'multiple',
                originalIndices: testQuestions[currentTestQuestion].originalIndices ? [...testQuestions[currentTestQuestion].originalIndices] : []
            });
        }
    }
    
    setTimeout(() => {
        currentTestQuestion++;
        displayTestQuestion();
    }, 2000);
}

// Sprawdzanie odpowiedzi w trybie prawda/fałsz
function checkTrueFalseAnswer() {
    if (trueFalseAnswer === null) {
        showNotification('Wybierz odpowiedź!', 'error');
        return;
    }
    
    // Sprawdź czy test jest aktywny
    if ((!isReviewMode && currentTestQuestion >= testQuestions.length) || 
        (isReviewMode && currentTestQuestion >= reviewQuestions.length)) {
        return;
    }
    
    // W trybie true/false odpowiedź jest zapisana w zmiennej trueFalseAnswer
    const feedback = document.getElementById('truefalseFeedback');
    
    // Pobierz poprawne tłumaczenie w zależności od trybu
    let isCorrectAnswer;
    if (isReviewMode) {
        // W trybie poprawy używamy zapisanej poprawnej odpowiedzi
        isCorrectAnswer = reviewQuestions[currentTestQuestion].correctAnswer === 'Prawda';
    } else {
        // W normalnym trybie używamy aktualnego pytanie
        isCorrectAnswer = trueFalseAnswer;
    }
    
    if (trueFalseAnswer === isCorrectAnswer) {
        testResults.correct++;
        feedback.textContent = 'Poprawna odpowiedź!';
        feedback.className = 'test-feedback correct';
        updateKnowledgeLevelAfterTest(true);
    } else {
        feedback.textContent = 'Błędna odpowiedź!';
        feedback.className = 'test-feedback incorrect';
        updateKnowledgeLevelAfterTest(false);
        
        // Zapisz błędną odpowiedź do późniejszej poprawy (tylko w normalnym trybie)
        if (!isReviewMode) {
            incorrectAnswers.push({
                flashcard: testQuestions[currentTestQuestion],
                userAnswer: trueFalseAnswer ? 'Prawda' : 'Fałsz',
                correctAnswer: isCorrectAnswer ? 'Prawda' : 'Fałsz',
                questionType: 'truefalse',
                originalIndices: testQuestions[currentTestQuestion].originalIndices ? [...testQuestions[currentTestQuestion].originalIndices] : []
            });
        }
    }
    
    setTimeout(() => {
        currentTestQuestion++;
        displayTestQuestion();
    }, 2000);
}

// Aktualizacja poziomu wiedzy po teście
function updateKnowledgeLevelAfterTest(isCorrect) {
    // Wspieramy wiele oryginalnych indeksów (gdy pytanie reprezentuje kilka fiszek)
    const indices = (currentTestFlashcardIndices && currentTestFlashcardIndices.length) ? currentTestFlashcardIndices : (currentTestFlashcardIndex !== -1 ? [currentTestFlashcardIndex] : []);
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
        
        // Aktualizuj spaced repetition
        const nextReview = new Date();
        nextReview.setDate(nextReview.getDate() + spacedRepetitionIntervals[newLevel]);
        
        if (!userProgress.spacedRepetition) userProgress.spacedRepetition = {};
        if (!userProgress.spacedRepetition[testDeck]) userProgress.spacedRepetition[testDeck] = {};
        if (!userProgress.spacedRepetition[testDeck][testTopic]) userProgress.spacedRepetition[testDeck][testTopic] = {};
        
        userProgress.spacedRepetition[testDeck][testTopic][idx] = nextReview.toISOString();
    });

    saveUserProgress();
    updateStats();
    updateQuickStats();
    checkAchievements();
}

// Zakończenie testu
function finishTest() {
    document.getElementById('correctAnswers').textContent = testResults.correct;
    document.getElementById('totalQuestions').textContent = testResults.total;
    
    // Jeśli są błędne odpowiedzi, pokaż listę do poprawy
    if (incorrectAnswers.length > 0) {
        showIncorrectAnswersList();
        document.getElementById('incorrectAnswersList').style.display = 'block';
    }
    
    document.getElementById('testResult').style.display = 'block';
}

// Wyświetl listę błędnych odpowiedzi
function showIncorrectAnswersList() {
    const container = document.getElementById('incorrectAnswersContainer');
    container.innerHTML = '';
    
    incorrectAnswers.forEach((item, index) => {
        const answerItem = document.createElement('div');
        answerItem.className = 'incorrect-answer-item';
        
        let questionText = '';
        if (testLanguage === 'polish') {
            questionText = `"${item.flashcard.polish}" → ${item.correctAnswer}`;
        } else {
            questionText = `"${item.flashcard.english}" → ${item.correctAnswer}`;
        }
        
        answerItem.innerHTML = `
            <div class="incorrect-question">${questionText}</div>
            <div class="incorrect-user-answer">Twoja odpowiedź: ${item.userAnswer}</div>
            <div class="incorrect-correct-answer">Poprawna odpowiedź: ${item.correctAnswer}</div>
        `;
        
        container.appendChild(answerItem);
    });
}

// Rozpocznij poprawę błędnych odpowiedzi
function reviewIncorrectAnswers() {
    isReviewMode = true;
    reviewQuestions = [...incorrectAnswers];
    // Tasuj kolejność pytań do poprawy
    shuffleArray(reviewQuestions);
    currentTestQuestion = 0;
    testResults.correct = testResults.correct; // Zachowujemy dotychczasowy wynik
    document.getElementById('testResult').style.display = 'none';
    document.getElementById('testTitle').textContent = `Poprawa błędów: ${testDeck} - ${testTopic}`;
    displayTestQuestion();
}

// Zakończenie poprawy błędów
function finishReview() {
    // Po poprawie wszystkich błędnych odpowiedzi, zakończ test
    document.getElementById('correctAnswers').textContent = testResults.correct;
    document.getElementById('totalQuestions').textContent = testResults.total;
    document.getElementById('testResult').style.display = 'block';
    document.getElementById('incorrectAnswersList').style.display = 'none';
    
    // Wyczyść listę błędnych odpowiedzi po poprawie
    incorrectAnswers = [];
}

// Resetowanie testu
function resetTest() {
    isReviewMode = false;
    currentTestQuestion = 0;
    
    // Przygotuj ponownie pytania (może się zmienić liczba jeśli tryb "tylko do nauki" jest aktywny)
    prepareTestQuestions();
    // Upewnij się, że przy restarcie testu pytania są w losowej kolejności
    shuffleArray(testQuestions);
    
    testResults = { correct: 0, total: testQuestions.length };
    document.getElementById('testResult').style.display = 'none';
    document.getElementById('incorrectAnswersList').style.display = 'none';
    incorrectAnswers = [];
    
    displayTestQuestion();
}

// Aktualizacja statystyk
function updateStats() {
    // Obliczanie statystyk na podstawie postępów użytkownika
    let total = 0;
    let mastered = 0;
    let learning = 0;
    let newCards = 0;
    
    for (const deck in userProgress.decks) {
        for (const topic in userProgress.decks[deck]) {
            for (const card in userProgress.decks[deck][topic]) {
                total++;
                const level = userProgress.decks[deck][topic][card];
                if (level === 'mastered') mastered++;
                else if (level === 'learning' || level === 'almost') learning++;
                else newCards++;
            }
        }
    }
    
    document.getElementById('totalFlashcards').textContent = total;
    document.getElementById('masteredFlashcards').textContent = mastered;
    document.getElementById('learningFlashcards').textContent = learning;
    document.getElementById('newFlashcards').textContent = newCards;
    
    document.getElementById('todayActivity').textContent = `Przećwiczyłeś ${userProgress.stats.today.count} fiszek przez ${userProgress.stats.today.time} minut`;
    document.getElementById('learningStreak').textContent = `Uczysz się codziennie od ${userProgress.stats.streak} dni z rzędu!`;
}

// Szybka powtórka - fiszki wymagające powtórki
function startQuickStudy() {
    const dueFlashcards = getDueFlashcards();
    if (dueFlashcards.length === 0) {
        showNotification('Brak fiszek do powtórki! Wszystkie fiszki są aktualne.', 'info');
        return;
    }
    
    // Przygotuj currentFlashcards z dueFlashcards
    currentFlashcards = dueFlashcards;
    currentFlashcardIndex = 0;
    currentDeck = null;
    currentTopic = null;
    
    document.getElementById('studyTitle').textContent = 'Szybka powtórka';
    document.getElementById('deadlineInfo').style.display = 'none';
    
    // Ukryj zaawansowane filtry w trybie szybkiej powtórki
    document.getElementById('advancedFilters').style.display = 'none';
    document.getElementById('advancedFiltersToggle').classList.remove('btn-active');
    
    showSection('study');
    displayCurrentFlashcard();
    updateStudyStats();
}

// Pobierz fiszki wymagające powtórki (spaced repetition)
function getDueFlashcards() {
    const due = [];
    const today = new Date().toISOString().split('T')[0];
    
    if (!userProgress.spacedRepetition) return due;
    
    // Przejdź przez wszystkie fiszki ze spaced repetition
    Object.keys(userProgress.spacedRepetition).forEach(deckId => {
        Object.keys(userProgress.spacedRepetition[deckId]).forEach(topicId => {
            Object.keys(userProgress.spacedRepetition[deckId][topicId]).forEach(cardIndex => {
                const nextReview = userProgress.spacedRepetition[deckId][topicId][cardIndex];
                if (nextReview <= today) {
                    // Znajdź fiszkę w danych aplikacji
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

// Aktualizuj statystyki szybkiej powtórki
function updateQuickStats() {
    const dueCards = getDueFlashcards().length;
    document.getElementById('quickStats').textContent = `${dueCards} fiszek do powtórki`;
}

// Sprawdź i odblokuj osiągnięcia
function checkAchievements() {
    let masteredCount = 0;
    
    // Policz opanowane fiszki
    for (const deck in userProgress.decks) {
        for (const topic in userProgress.decks[deck]) {
            for (const card in userProgress.decks[deck][topic]) {
                if (userProgress.decks[deck][topic][card] === 'mastered') {
                    masteredCount++;
                }
            }
        }
    }
    
    // Sprawdź osiągnięcia
    if (masteredCount >= 1 && !userProgress.achievements.firstMaster) {
        unlockAchievement('firstMaster');
    }
    
    if (masteredCount >= 100 && !userProgress.achievements.master100) {
        unlockAchievement('master100');
    }
    
    if (userProgress.stats.streak >= 7 && !userProgress.achievements.streak7) {
        unlockAchievement('streak7');
    }
    
    // Sprawdź czy użytkownik opanował 10 fiszek dzisiaj
    if (userProgress.stats.today.count >= 10 && !userProgress.achievements.quickLearner) {
        unlockAchievement('quickLearner');
    }
}

// Odblokuj osiągnięcie
function unlockAchievement(achievementKey) {
    if (!userProgress.achievements[achievementKey]) {
        userProgress.achievements[achievementKey] = true;
        saveUserProgress();
        
        const achievement = achievements[achievementKey];
        showNotification(`🎉 Osiągnięcie odblokowane: ${achievement.name} - ${achievement.desc}`, 'success');
        
        // Odśwież widok osiągnięć
        updateAchievementsView();
    }
}

// Aktualizuj widok osiągnięć
function updateAchievementsView() {
    const container = document.getElementById('achievementsList');
    if (!container) return;
    
    container.innerHTML = '';
    
    Object.keys(achievements).forEach(key => {
        const achievement = achievements[key];
        const isUnlocked = userProgress.achievements[key];
        
        const achievementElement = document.createElement('div');
        achievementElement.className = `achievement ${isUnlocked ? 'unlocked' : 'locked'}`;
        achievementElement.innerHTML = `
            <i class="fas ${isUnlocked ? 'fa-trophy' : 'fa-lock'}"></i>
            <span>${achievement.name} - ${achievement.desc}</span>
        `;
        
        container.appendChild(achievementElement);
    });
}

// Obsługa uploadu plików
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Sprawdź rozszerzenie pliku
    if (!file.name.toLowerCase().endsWith('.txt')) {
        showNotification('Proszę wybrać plik z rozszerzeniem .txt', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        processUploadedFile(content, file.name);
    };
    reader.onerror = function() {
        showNotification('Błąd podczas czytania pliku', 'error');
    };
    reader.readAsText(file);
}

// Przetwarzanie przesłanego pliku
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
            // Tutaj można dodać logikę zapisywania zaimportowanych fiszek
        } else {
            showNotification('Nie udało się zaimportować żadnych fiszek. Sprawdź format pliku.', 'error');
        }
    } catch (error) {
        showNotification('Błąd podczas przetwarzania pliku: ' + error.message, 'error');
    }
}

// Tworzenie nowego działu
function createNewDeck() {
    const deckName = document.getElementById('newDeckName').value.trim();
    const topicName = document.getElementById('newTopicName').value.trim();
    
    if (!deckName || !topicName) {
        showNotification('Wprowadź nazwę działu i tematu', 'error');
        return;
    }
    
    // Tutaj można dodać logikę tworzenia nowego działu i tematu
    showNotification(`Utworzono nowy dział: ${deckName} z tematem: ${topicName}`, 'success');
    
    // Czyszczenie pól formularza
    document.getElementById('newDeckName').value = '';
    document.getElementById('newTopicName').value = '';
}

// Eksport postępów
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

// Wyświetl notyfikację
function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationsContainer');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    container.appendChild(notification);
    
    // Automatyczne usuwanie po 5 sekundach
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}

// Obsługa błędów
function handleError(error, context) {
    console.error(`Błąd w ${context}:`, error);
    showNotification(`Wystąpił błąd: ${error.message}`, 'error');
}

// Podstawowe funkcje nawigacyjne
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(sectionId).classList.add('active');
}

// Zamknij modal po kliknięciu poza nim
window.onclick = function(event) {
    const modal = document.getElementById('deadlineModal');
    if (event.target === modal) {
        closeModal();
    }
};

// Zapobiegaj domyślnej akcji dla drop
window.addEventListener('dragover', (e) => {
    e.preventDefault();
});

window.addEventListener('drop', (e) => {
    e.preventDefault();
});