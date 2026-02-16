// Fiszkownica - Główny plik JavaScript
// Wersja: 1.1.0 (kompleksowa naprawa testów i interfejsu)

// ==================== GŁÓWNE ZMIENNE ====================
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
let testStudyMode = 'all';
let appData = { decks: [] };
let testStartTime = null;
let testEndTime = null;
let selectedTopicsForTest = new Set();
let incorrectAnswers = [];
let isReviewMode = false;
let reviewQuestions = [];
let studyMode = 'all';
let originalFlashcards = [];
let testCounter = { current: 1, total: 0, correct: 0, incorrect: 0 };
let spacedRepetitionIntervals = { 'new': 1, 'learning': 3, 'almost': 7, 'mastered': 30 };
let achievements = {
    firstMaster: { name: 'Pierwsze kroki', desc: 'Opanuj pierwszą fiszkę', unlocked: false, icon: 'fas fa-star' },
    streak7: { name: 'Konsekwentny', desc: '7 dni nauki z rzędu', unlocked: false, icon: 'fas fa-calendar-check' },
    master100: { name: 'Ekspert', desc: 'Opanuj 100 fiszek', unlocked: false, icon: 'fas fa-trophy' },
    quickLearner: { name: 'Szybki uczeń', desc: 'Opanuj 10 fiszek w jeden dzień', unlocked: false, icon: 'fas fa-bolt' },
    perfectTest: { name: 'Perfekcjonista', desc: 'Zdaj test ze 100% skutecznością', unlocked: false, icon: 'fas fa-perfect' },
    marathon: { name: 'Maratończyk', desc: 'Przećwicz 50 fiszek w jednej sesji', unlocked: false, icon: 'fas fa-running' }
};

let loadingProgress = 0;
let loadingInterval = null;
let deferredPrompt = null;

// ==================== INICJALIZACJA ====================
document.addEventListener('DOMContentLoaded', () => {
    startLoadingAnimation();
    setupPWA();
    setTimeout(() => initApp(), 500);
});

// ==================== LOADER ====================
function startLoadingAnimation() {
    const loader = document.getElementById('pageLoader');
    if (!loader) return;
    loader.style.display = 'flex';
    loadingInterval = setInterval(() => {
        if (loadingProgress < 90) {
            loadingProgress += Math.random() * 10;
            if (loadingProgress > 90) loadingProgress = 90;
            document.getElementById('loaderProgress').style.width = `${loadingProgress}%`;
            document.getElementById('loaderPercentage').textContent = `${Math.round(loadingProgress)}%`;
        }
    }, 200);
}

function finishLoadingAnimation() {
    clearInterval(loadingInterval);
    loadingProgress = 100;
    document.getElementById('loaderProgress').style.width = '100%';
    document.getElementById('loaderPercentage').textContent = '100%';
    document.getElementById('loaderStatus').textContent = 'Gotowe!';
    setTimeout(() => {
        document.getElementById('pageLoader').classList.add('hidden');
        document.querySelector('.app-container').style.opacity = '1';
        setTimeout(() => document.getElementById('pageLoader').style.display = 'none', 500);
    }, 1000);
}

// ==================== PWA ====================
function setupPWA() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js').catch(console.log);
    }
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        document.getElementById('installButton').style.display = 'flex';
    });
    window.addEventListener('appinstalled', () => {
        document.getElementById('installButton').style.display = 'none';
    });
}
function showInstallPrompt() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(() => deferredPrompt = null);
    }
}

// ==================== GŁÓWNA INICJALIZACJA ====================
async function initApp() {
    try {
        await loadAppData();
        loadUserProgress();
        setupEventListeners();
        loadDecks();
        updateStats();
        updateQuickStats();
        checkAchievements();
        if (localStorage.getItem('darkMode') === 'true') {
            document.body.classList.add('dark-mode');
            document.getElementById('themeToggle').innerHTML = '<i class="fas fa-sun"></i> <span class="btn-text">Motyw</span>';
        }
        finishLoadingAnimation();
        showNotification('Aplikacja załadowana!', 'success');
    } catch (error) {
        console.error(error);
        finishLoadingAnimation();
        showNotification('Błąd ładowania', 'error');
    }
}

// ==================== DANE ====================
async function loadAppData() {
    try {
        const response = await fetch('data/decks.json');
        const data = await response.json();
        appData.decks = data.decks.map(deck => ({
            ...deck,
            topics: deck.topics.map(topic => ({ ...topic, flashcards: [] }))
        }));
    } catch (error) {
        console.error('Błąd ładowania decks.json', error);
        appData.decks = [];
    }
}

function loadUserProgress() {
    try {
        const saved = localStorage.getItem('fiszkownicaProgress');
        userProgress = saved ? JSON.parse(saved) : {
            decks: {},
            stats: { total: 0, mastered: 0, learning: 0, new: 0, today: { count: 0, study: 0, test: 0, review: 0 }, streak: 0, lastStudyDate: null },
            deadlines: {}, spacedRepetition: {}, achievements: {}
        };
        if (!userProgress.achievements) userProgress.achievements = {};
    } catch (error) {
        console.error(error);
    }
}

function saveUserProgress() {
    localStorage.setItem('fiszkownicaProgress', JSON.stringify(userProgress));
}

// ==================== EVENTY ====================
function setupEventListeners() {
    document.getElementById('themeToggle').addEventListener('click', toggleDarkMode);
    document.addEventListener('keydown', handleKeyboardNavigation);
    window.addEventListener('online', () => showNotification('Połączenie przywrócone', 'success'));
    window.addEventListener('offline', () => showNotification('Brak internetu', 'error'));
}

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    document.getElementById('themeToggle').innerHTML = isDark ? '<i class="fas fa-sun"></i> Motyw' : '<i class="fas fa-moon"></i> Motyw';
    localStorage.setItem('darkMode', isDark);
}

function handleKeyboardNavigation(e) {
    if (document.getElementById('study').classList.contains('active')) {
        if (e.code === 'Space') { e.preventDefault(); flipCard(); }
        if (e.code === 'ArrowRight') { e.preventDefault(); nextCard(); }
        if (e.code === 'ArrowLeft') { e.preventDefault(); prevCard(); }
        if (e.code >= 'Digit1' && e.code <= 'Digit4') {
            e.preventDefault();
            const levels = ['new', 'learning', 'almost', 'mastered'];
            setKnowledgeLevel(levels[parseInt(e.code.replace('Digit', '')) - 1]);
        }
    }
    if (e.code === 'Escape') { closeModal(); closeAboutModal(); closeHelpModal(); }
}

// ==================== ZESTAWY ====================
function loadDecks() {
    const container = document.getElementById('decksContainer');
    if (!container) return;
    if (!appData.decks.length) {
        container.innerHTML = '<div class="empty-state">Brak zestawów. Przejdź do importu.</div>';
        return;
    }

    let deckCount = 0, topicCount = 0, flashcardCount = 0, masteredCount = 0;
    appData.decks.forEach(deck => {
        deckCount++;
        topicCount += deck.topics.length;
        deck.topics.forEach(topic => {
            flashcardCount += topic.count || 0;
            if (userProgress.decks[deck.id]?.[topic.id]) {
                Object.values(userProgress.decks[deck.id][topic.id]).forEach(l => { if (l === 'mastered') masteredCount++; });
            }
        });
    });

    document.getElementById('totalDecks').textContent = deckCount;
    document.getElementById('totalTopics').textContent = topicCount;
    document.getElementById('totalFlashcardsDeck').textContent = flashcardCount;
    document.getElementById('overallProgress').textContent = flashcardCount ? Math.round((masteredCount/flashcardCount)*100) + '%' : '0%';

    container.innerHTML = appData.decks.map((deck, i) => {
        const deckId = `deck-${i}`;
        return `
            <div class="deck-item">
                <div class="deck-header" onclick="toggleAccordion('${deckId}')">
                    <div><i class="${deck.icon || 'fas fa-folder'}"></i> <strong>${deck.name}</strong></div>
                    <span class="deck-arrow" id="${deckId}-arrow">▼</span>
                </div>
                <div id="${deckId}" class="deck-topics" style="display:none;">
                    ${deck.topics.map(t => `
                        <div class="topic-item" onclick="selectTopic('${deck.id}', '${t.id}')">
                            <span>${t.name} (${t.count || 0})</span>
                            <span class="topic-progress">${calculateTopicStats(deck.id, t.id, t.count).progress}%</span>
                        </div>
                    `).join('')}
                </div>
                <div class="deck-actions">
                    <button class="btn btn-outline btn-sm" onclick="setDeadline('${deck.id}')">📅</button>
                    <button class="btn btn-outline btn-sm" onclick="studyDeck('${deck.id}')">Ucz się</button>
                    <button class="btn btn-primary btn-sm" onclick="startTestDeck('${deck.id}')">Test</button>
                </div>
            </div>
        `;
    }).join('');
}

function toggleAccordion(id) {
    const el = document.getElementById(id);
    const arrow = document.getElementById(id + '-arrow');
    if (el.style.display === 'none') {
        el.style.display = 'block';
        arrow.style.transform = 'rotate(180deg)';
    } else {
        el.style.display = 'none';
        arrow.style.transform = 'rotate(0)';
    }
}

function calculateTopicStats(deckId, topicId, total) {
    let mastered = 0;
    if (userProgress.decks[deckId]?.[topicId]) {
        Object.values(userProgress.decks[deckId][topicId]).forEach(l => { if (l === 'mastered') mastered++; });
    }
    return { progress: total ? Math.round((mastered/total)*100) : 0 };
}

function studyDeck(deckId) {
    const deck = appData.decks.find(d => d.id === deckId);
    if (deck?.topics.length) selectTopic(deckId, deck.topics[0].id);
}

async function startTestDeck(deckId) {
    const deck = appData.decks.find(d => d.id === deckId);
    if (deck?.topics.length) {
        await selectTestTopic(deckId, deck.topics[0].id);
        showSection('test');
    }
}

// ==================== NAUKA ====================
async function loadTopicFlashcards(deckId, topicId) {
    const deck = appData.decks.find(d => d.id === deckId);
    const topic = deck?.topics.find(t => t.id === topicId);
    if (!topic) return null;
    if (!topic.flashcards?.length) {
        try {
            const res = await fetch(`data/${deck.id}/${topic.file}`);
            topic.flashcards = await res.json();
            topic.count = topic.flashcards.length;
        } catch (e) {
            console.error(e);
            topic.flashcards = [];
            showNotification('Nie udało się załadować fiszek', 'error');
        }
    }
    return topic;
}

async function selectTopic(deckId, topicId) {
    const topic = await loadTopicFlashcards(deckId, topicId);
    if (!topic) return;
    currentDeck = deckId;
    currentTopic = topicId;
    originalFlashcards = topic.flashcards.map((f, idx) => ({ ...f, originalIndex: idx }));
    studyMode = 'all';
    document.getElementById('studyModeToggle').innerHTML = '<i class="fas fa-filter"></i> Tylko do nauki';
    document.getElementById('studyModeToggle').classList.remove('btn-active');
    resetAdvancedFilters();
    applyAdvancedFilters();
    document.getElementById('studyTitle').textContent = `Nauka: ${appData.decks.find(d=>d.id===deckId).name} - ${topic.name}`;
    showSection('study');
    displayCurrentFlashcard();
    updateStudyStats();
}

function resetAdvancedFilters() {
    document.getElementById('filterNew').checked = true;
    document.getElementById('filterLearning').checked = true;
    document.getElementById('filterAlmost').checked = true;
    document.getElementById('filterMastered').checked = false;
}

function applyAdvancedFilters() {
    const filters = {
        new: document.getElementById('filterNew').checked,
        learning: document.getElementById('filterLearning').checked,
        almost: document.getElementById('filterAlmost').checked,
        mastered: document.getElementById('filterMastered').checked
    };
    let filtered = studyMode === 'all' ? [...originalFlashcards] : originalFlashcards.filter(f => getKnowledgeLevel(currentDeck, currentTopic, f.originalIndex) !== 'mastered');
    currentFlashcards = filtered.filter(f => filters[getKnowledgeLevel(currentDeck, currentTopic, f.originalIndex)]);
    currentFlashcardIndex = Math.min(currentFlashcardIndex, currentFlashcards.length - 1);
    displayCurrentFlashcard();
    updateStudyStats();
}

function toggleStudyMode() {
    studyMode = studyMode === 'all' ? 'toLearn' : 'all';
    const btn = document.getElementById('studyModeToggle');
    btn.innerHTML = studyMode === 'all' ? '<i class="fas fa-filter"></i> Tylko do nauki' : '<i class="fas fa-filter"></i> Wszystkie';
    btn.classList.toggle('btn-active', studyMode === 'all');
    applyAdvancedFilters();
}

function toggleAdvancedFilters() {
    const el = document.getElementById('advancedFilters');
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
    document.getElementById('advancedFiltersToggle').classList.toggle('btn-active');
}

function displayCurrentFlashcard() {
    if (!currentFlashcards.length) {
        document.getElementById('flashcardFront').textContent = 'Brak fiszek';
        document.getElementById('flashcardBack').textContent = 'Brak fiszek';
        document.querySelector('.knowledge-levels').style.display = 'none';
        document.querySelector('.flashcard-controls').style.display = 'none';
        document.getElementById('progressBar').style.width = '0%';
        document.getElementById('progressText').textContent = '0%';
        hideProgressIndicator();
        return;
    }
    document.querySelector('.knowledge-levels').style.display = 'grid';
    document.querySelector('.flashcard-controls').style.display = 'flex';
    const f = currentFlashcards[currentFlashcardIndex];
    document.getElementById('flashcardFront').textContent = f.polish;
    document.getElementById('flashcardBack').textContent = f.english;
    const level = getKnowledgeLevel(currentDeck, currentTopic, f.originalIndex);
    document.getElementById('flashcardLevel').textContent = getLevelText(level);
    document.getElementById('flashcardLevelBack').textContent = getLevelText(level);
    document.getElementById('flashcard').classList.remove('flipped');
    document.getElementById('flashcardNumber').textContent = `#${currentFlashcardIndex+1}`;
    document.getElementById('flashcardTotal').textContent = `/${currentFlashcards.length}`;
    const progress = ((currentFlashcardIndex+1)/currentFlashcards.length)*100;
    document.getElementById('progressBar').style.width = `${progress}%`;
    document.getElementById('progressText').textContent = `${Math.round(progress)}%`;
    showProgressIndicator(currentFlashcardIndex+1, currentFlashcards.length);
    // Wizualne oznaczenie poziomu
    const card = document.getElementById('flashcard');
    card.classList.remove('flashcard-level-new', 'flashcard-level-learning', 'flashcard-level-almost', 'flashcard-level-mastered');
    card.classList.add(`flashcard-level-${level}`);
}

function flipCard() { document.getElementById('flashcard').classList.toggle('flipped'); }
function nextCard() { if (currentFlashcards.length) currentFlashcardIndex = (currentFlashcardIndex+1)%currentFlashcards.length; displayCurrentFlashcard(); }
function prevCard() { if (currentFlashcards.length) currentFlashcardIndex = (currentFlashcardIndex-1+currentFlashcards.length)%currentFlashcards.length; displayCurrentFlashcard(); }
function showProgressIndicator(c, t) { 
    const el = document.getElementById('progressIndicator');
    if (el) { document.getElementById('currentProgress').textContent = c; document.getElementById('totalProgress').textContent = t; el.style.display = 'flex'; }
}
function hideProgressIndicator() { const el = document.getElementById('progressIndicator'); if (el) el.style.display = 'none'; }

function getKnowledgeLevel(deckId, topicId, idx) {
    return userProgress.decks[deckId]?.[topicId]?.[idx] || 'new';
}
function getLevelText(l) {
    return { new: 'Nowe', learning: 'Uczę się', almost: 'Prawie umiem', mastered: 'Umiem' }[l] || 'Nowe';
}

function setKnowledgeLevel(level) {
    if (!currentFlashcards.length) return;
    const f = currentFlashcards[currentFlashcardIndex];
    const btn = document.querySelector(`.knowledge-btn.knowledge-${level}`);
    btn?.classList.add('animate-click');
    setTimeout(() => btn?.classList.remove('animate-click'), 300);
    if (!userProgress.decks[currentDeck]) userProgress.decks[currentDeck] = {};
    if (!userProgress.decks[currentDeck][currentTopic]) userProgress.decks[currentDeck][currentTopic] = {};
    userProgress.decks[currentDeck][currentTopic][f.originalIndex] = level;
    const next = new Date(); next.setDate(next.getDate() + spacedRepetitionIntervals[level]);
    if (!userProgress.spacedRepetition) userProgress.spacedRepetition = {};
    if (!userProgress.spacedRepetition[currentDeck]) userProgress.spacedRepetition[currentDeck] = {};
    if (!userProgress.spacedRepetition[currentDeck][currentTopic]) userProgress.spacedRepetition[currentDeck][currentTopic] = {};
    userProgress.spacedRepetition[currentDeck][currentTopic][f.originalIndex] = next.toISOString();
    saveUserProgress();
    updateStats();
    updateQuickStats();
    checkAchievements();
    if (studyMode === 'toLearn' && level === 'mastered') {
        applyAdvancedFilters();
        if (!currentFlashcards.length) displayCurrentFlashcard();
        else if (currentFlashcardIndex >= currentFlashcards.length) currentFlashcardIndex = currentFlashcards.length-1;
        displayCurrentFlashcard();
    }
}

// ==================== TESTY ====================
function setTestMode(mode) {
    testMode = mode;
    document.getElementById('writingTest').style.display = mode === 'writing' ? 'block' : 'none';
    document.getElementById('multipleTest').style.display = mode === 'multiple' ? 'block' : 'none';
    document.getElementById('truefalseTest').style.display = mode === 'truefalse' ? 'block' : 'none';
    document.querySelectorAll('.test-mode-btn').forEach((b,i) => b.classList.toggle('active', (i===0&&mode==='writing')||(i===1&&mode==='multiple')||(i===2&&mode==='truefalse')));
    if (testQuestions.length) displayTestQuestion();
}

function changeTestLanguage() {
    testLanguage = document.getElementById('testLanguage').value;
    if (testQuestions.length) displayTestQuestion();
}

function toggleTestStudyMode() {
    testStudyMode = testStudyMode === 'all' ? 'toLearn' : 'all';
    const btn = document.getElementById('testStudyModeToggle');
    btn.innerHTML = testStudyMode === 'all' ? '<i class="fas fa-filter"></i> Tylko do nauki' : '<i class="fas fa-filter"></i> Wszystkie';
    btn.classList.toggle('btn-active', testStudyMode === 'all');
    if (testDeck && testTopic) {
        prepareTestQuestions();
        displayTestQuestion();
    }
}

function updateTestSettings() {
    if (testDeck && testTopic) {
        prepareTestQuestions();
        displayTestQuestion();
    }
}

async function selectTestTopic(deckId, topicId) {
    const topic = await loadTopicFlashcards(deckId, topicId);
    if (!topic) return;
    testDeck = deckId;
    testTopic = topicId;
    selectedTopicsForTest.clear();
    selectedTopicsForTest.add(`${deckId}-${topicId}`);
    renderTestTopicSelection();
    prepareTestQuestions();
    displayTestQuestion();
    testStartTime = new Date();
    showSection('test');
}

function renderTestTopicSelection() {
    const container = document.getElementById('testTopicsContainer');
    if (!container) return;
    container.innerHTML = '';
    appData.decks.forEach(deck => {
        const deckDiv = document.createElement('div');
        deckDiv.className = 'test-deck-group';
        const header = document.createElement('div');
        header.className = 'test-deck-header';
        header.innerHTML = `
            <input type="checkbox" class="deck-select-all" data-deck="${deck.id}" onchange="toggleDeckSelection('${deck.id}')">
            <span>${deck.name}</span>
        `;
        deckDiv.appendChild(header);
        deck.topics.forEach(topic => {
            const key = `${deck.id}-${topic.id}`;
            const label = document.createElement('label');
            label.className = 'test-topic-item';
            label.innerHTML = `
                <input type="checkbox" value="${key}" ${selectedTopicsForTest.has(key) ? 'checked' : ''} onchange="toggleTopicSelection('${deck.id}','${topic.id}')">
                <span>${topic.name} (${topic.count || 0})</span>
            `;
            deckDiv.appendChild(label);
        });
        container.appendChild(deckDiv);
    });
}

function toggleTopicSelection(deckId, topicId) {
    const key = `${deckId}-${topicId}`;
    if (selectedTopicsForTest.has(key)) selectedTopicsForTest.delete(key);
    else selectedTopicsForTest.add(key);
    // Odznacz select all jeśli nie wszystkie zaznaczone
    const deckCheck = document.querySelector(`.deck-select-all[data-deck="${deckId}"]`);
    if (deckCheck) {
        const allTopics = appData.decks.find(d=>d.id===deckId).topics.map(t=>`${deckId}-${t.id}`);
        const allSelected = allTopics.every(k => selectedTopicsForTest.has(k));
        deckCheck.checked = allSelected;
    }
}

function toggleDeckSelection(deckId) {
    const cb = document.querySelector(`.deck-select-all[data-deck="${deckId}"]`);
    const checked = cb.checked;
    appData.decks.find(d=>d.id===deckId).topics.forEach(t => {
        const key = `${deckId}-${t.id}`;
        if (checked) selectedTopicsForTest.add(key);
        else selectedTopicsForTest.delete(key);
    });
    // odśwież checkboxy tematów
    document.querySelectorAll(`.test-topic-item input[value^="${deckId}-"]`).forEach(c => c.checked = checked);
}

async function startTestFromSelection() {
    if (selectedTopicsForTest.size === 0) {
        showNotification('Wybierz przynajmniej jeden temat', 'error');
        return;
    }
    // Załaduj wszystkie wybrane tematy
    const promises = [];
    selectedTopicsForTest.forEach(key => {
        const [deckId, topicId] = key.split('-');
        promises.push(loadTopicFlashcards(deckId, topicId));
    });
    await Promise.all(promises);
    // Zbierz fiszki
    let allFlashcards = [];
    selectedTopicsForTest.forEach(key => {
        const [deckId, topicId] = key.split('-');
        const topic = appData.decks.find(d=>d.id===deckId).topics.find(t=>t.id===topicId);
        if (topic.flashcards) {
            allFlashcards = allFlashcards.concat(topic.flashcards.map((f,idx) => ({ ...f, deckId, topicId, originalIndex: idx })));
        }
    });
    if (!allFlashcards.length) {
        showNotification('Brak fiszek w wybranych tematach', 'error');
        return;
    }
    testDeck = 'multiple';
    testTopic = 'multiple';
    prepareTestQuestionsFromFlashcards(allFlashcards);
    currentTestQuestion = 0;
    testResults = { correct: 0, total: testQuestions.length };
    testCounter = { current: 1, total: testQuestions.length, correct: 0, incorrect: 0 };
    updateTestCounter();
    displayTestQuestion();
    testStartTime = new Date();
}

function prepareTestQuestionsFromFlashcards(flashcards) {
    const count = document.getElementById('testQuestionsCount').value;
    let filtered = flashcards;
    if (testStudyMode === 'toLearn') {
        filtered = flashcards.filter(f => getKnowledgeLevel(f.deckId, f.topicId, f.originalIndex) !== 'mastered');
        if (!filtered.length) filtered = flashcards;
    }
    // Unikalne pary
    const unique = new Map();
    filtered.forEach(f => {
        const key = testLanguage === 'polish' ? f.polish : f.english;
        if (!unique.has(key)) unique.set(key, { flashcard: f, originalIndices: [f.originalIndex], deckId: f.deckId, topicId: f.topicId });
        else unique.get(key).originalIndices.push(f.originalIndex);
    });
    testQuestions = Array.from(unique.values());
    if (count !== 'all') {
        const limit = parseInt(count);
        if (testQuestions.length > limit) {
            shuffleArray(testQuestions);
            testQuestions = testQuestions.slice(0, limit);
        }
    }
    testCounter.total = testQuestions.length;
    testCounter.current = 1;
}

function prepareTestQuestions() {
    if (!testDeck || testDeck === 'multiple') return;
    const topic = appData.decks.find(d=>d.id===testDeck).topics.find(t=>t.id===testTopic);
    if (!topic.flashcards?.length) {
        showNotification('Brak fiszek w tym temacie', 'error');
        testQuestions = [];
        return;
    }
    let available = [...topic.flashcards];
    if (testStudyMode === 'toLearn') {
        available = available.filter((f,idx) => getKnowledgeLevel(testDeck, testTopic, idx) !== 'mastered');
        if (!available.length) available = [...topic.flashcards];
    }
    const unique = new Map();
    available.forEach((f,idx) => {
        const key = testLanguage === 'polish' ? f.polish : f.english;
        if (!unique.has(key)) unique.set(key, { flashcard: f, originalIndices: [idx] });
        else unique.get(key).originalIndices.push(idx);
    });
    testQuestions = Array.from(unique.values());
    const count = document.getElementById('testQuestionsCount').value;
    if (count !== 'all') {
        const limit = parseInt(count);
        if (testQuestions.length > limit) {
            shuffleArray(testQuestions);
            testQuestions = testQuestions.slice(0, limit);
        }
    }
    testCounter.total = testQuestions.length;
    testCounter.current = 1;
}

function updateTestCounter() {
    const el = document.getElementById('testCounter');
    if (el) el.innerHTML = `
        <div><span class="counter-value">${testCounter.current}</span> Pytanie</div>
        <div><span class="counter-value">${testCounter.total}</span> Wszystkich</div>
        <div><span class="counter-value">${testCounter.correct}</span> Poprawne</div>
        <div><span class="counter-value">${testCounter.incorrect}</span> Błędne</div>
    `;
}

function displayTestQuestion() {
    if ((!isReviewMode && !testQuestions.length) || (isReviewMode && !reviewQuestions.length)) {
        showNotification('Brak pytań', 'info');
        return;
    }
    if (isReviewMode && currentTestQuestion >= reviewQuestions.length) { finishReview(); return; }
    if (!isReviewMode && currentTestQuestion >= testQuestions.length) { finishTest(); return; }

    const q = isReviewMode ? reviewQuestions[currentTestQuestion] : testQuestions[currentTestQuestion];
    const deckId = isReviewMode ? q.deckId : (testDeck === 'multiple' ? q.deckId : testDeck);
    const topicId = isReviewMode ? q.topicId : (testDeck === 'multiple' ? q.topicId : testTopic);
    const level = getKnowledgeLevel(deckId, topicId, q.originalIndices[0]);
    const levelClass = `level-${level}`;
    const levelText = getLevelText(level);

    ['writing', 'multiple', 'truefalse'].forEach(m => {
        const badge = document.getElementById(m + 'Level');
        if (badge) { badge.textContent = levelText; badge.className = `test-level-badge ${levelClass}`; }
    });

    if (testMode === 'writing') {
        document.getElementById('writingQuestion').textContent = testLanguage === 'polish' 
            ? `Jak po angielsku powiesz "${q.flashcard.polish}"?` 
            : `Jak po polsku powiesz "${q.flashcard.english}"?`;
        document.getElementById('writingAnswer').value = '';
        document.getElementById('writingFeedback').textContent = '';
    } else if (testMode === 'multiple') {
        document.getElementById('multipleQuestion').textContent = testLanguage === 'polish' 
            ? `Jak po angielsku powiesz "${q.flashcard.polish}"?` 
            : `Jak po polsku powiesz "${q.flashcard.english}"?`;
        const correct = testLanguage === 'polish' ? q.flashcard.english : q.flashcard.polish;
        let options = [correct];
        while (options.length < 4) {
            const rand = Math.floor(Math.random() * testQuestions.length);
            const opt = testLanguage === 'polish' ? testQuestions[rand].flashcard.english : testQuestions[rand].flashcard.polish;
            if (!options.includes(opt)) options.push(opt);
        }
        shuffleArray(options);
        document.getElementById('multipleOptions').innerHTML = options.map((opt,i) => 
            `<div class="test-option" onclick="selectMultipleOption(${i})">${opt}</div>`
        ).join('');
        selectedOption = null;
        document.getElementById('multipleFeedback').textContent = '';
    } else if (testMode === 'truefalse') {
        const isCorrect = Math.random() > 0.5;
        let displayed;
        if (testLanguage === 'polish') {
            displayed = isCorrect ? q.flashcard.english : testQuestions.find(t => t.flashcard.english !== q.flashcard.english)?.flashcard.english || q.flashcard.english;
            document.getElementById('truefalseQuestion').textContent = `"${q.flashcard.polish}" to "${displayed}"?`;
        } else {
            displayed = isCorrect ? q.flashcard.polish : testQuestions.find(t => t.flashcard.polish !== q.flashcard.polish)?.flashcard.polish || q.flashcard.polish;
            document.getElementById('truefalseQuestion').textContent = `"${q.flashcard.english}" to "${displayed}"?`;
        }
        currentTrueFalseCorrect = isCorrect;
        trueFalseAnswer = null;
        document.querySelectorAll('.test-tf-option').forEach(o => o.classList.remove('selected'));
        document.getElementById('truefalseFeedback').textContent = '';
    }
    testCounter.current = currentTestQuestion + 1;
    updateTestCounter();
}

function selectMultipleOption(idx) {
    selectedOption = idx;
    document.querySelectorAll('#multipleOptions .test-option').forEach((o,i) => o.classList.toggle('selected', i===idx));
}
function selectTrueFalse(ans) {
    trueFalseAnswer = ans;
    document.querySelectorAll('.test-tf-option').forEach(o => o.classList.toggle('selected', (o.classList.contains('true') && ans) || (o.classList.contains('false') && !ans)));
}

function checkWritingAnswer() {
    const ans = document.getElementById('writingAnswer').value.trim().toLowerCase();
    const q = isReviewMode ? reviewQuestions[currentTestQuestion] : testQuestions[currentTestQuestion];
    const correct = isReviewMode ? q.correctAnswer.toLowerCase() : (testLanguage === 'polish' ? q.flashcard.english.toLowerCase() : q.flashcard.polish.toLowerCase());
    const feedback = document.getElementById('writingFeedback');
    if (ans === correct) {
        feedback.textContent = '✅ Poprawnie!'; feedback.className = 'test-feedback correct';
        testCounter.correct++; testResults.correct++;
        updateKnowledgeLevelAfterTest(true);
    } else {
        feedback.textContent = `❌ Błędnie. Poprawnie: ${correct}`; feedback.className = 'test-feedback incorrect';
        testCounter.incorrect++;
        if (!isReviewMode) incorrectAnswers.push({ flashcard: q.flashcard, userAnswer: ans, correctAnswer: correct, deckId: q.deckId || testDeck, topicId: q.topicId || testTopic, originalIndices: q.originalIndices });
    }
    updateTestCounter();
    setTimeout(() => { currentTestQuestion++; displayTestQuestion(); }, 1500);
}

function checkMultipleAnswer() {
    if (selectedOption === null) { showNotification('Wybierz odpowiedź', 'error'); return; }
    const selected = document.querySelectorAll('#multipleOptions .test-option')[selectedOption].textContent.toLowerCase();
    const q = isReviewMode ? reviewQuestions[currentTestQuestion] : testQuestions[currentTestQuestion];
    const correct = isReviewMode ? q.correctAnswer.toLowerCase() : (testLanguage === 'polish' ? q.flashcard.english.toLowerCase() : q.flashcard.polish.toLowerCase());
    const feedback = document.getElementById('multipleFeedback');
    if (selected === correct) {
        feedback.textContent = '✅ Poprawnie!'; feedback.className = 'test-feedback correct';
        testCounter.correct++; testResults.correct++;
        updateKnowledgeLevelAfterTest(true);
    } else {
        feedback.textContent = `❌ Błędnie. Poprawnie: ${correct}`; feedback.className = 'test-feedback incorrect';
        testCounter.incorrect++;
        if (!isReviewMode) incorrectAnswers.push({ flashcard: q.flashcard, userAnswer: selected, correctAnswer: correct, deckId: q.deckId || testDeck, topicId: q.topicId || testTopic, originalIndices: q.originalIndices });
    }
    updateTestCounter();
    setTimeout(() => { currentTestQuestion++; displayTestQuestion(); }, 1500);
}

function checkTrueFalseAnswer() {
    if (trueFalseAnswer === null) { showNotification('Wybierz odpowiedź', 'error'); return; }
    const q = isReviewMode ? reviewQuestions[currentTestQuestion] : testQuestions[currentTestQuestion];
    const correct = isReviewMode ? (q.correctAnswer === 'Prawda') : currentTrueFalseCorrect;
    const feedback = document.getElementById('truefalseFeedback');
    if (trueFalseAnswer === correct) {
        feedback.textContent = '✅ Poprawnie!'; feedback.className = 'test-feedback correct';
        testCounter.correct++; testResults.correct++;
        updateKnowledgeLevelAfterTest(true);
    } else {
        feedback.textContent = '❌ Błędnie.'; feedback.className = 'test-feedback incorrect';
        testCounter.incorrect++;
        if (!isReviewMode) incorrectAnswers.push({ flashcard: q.flashcard, userAnswer: trueFalseAnswer ? 'Prawda' : 'Fałsz', correctAnswer: correct ? 'Prawda' : 'Fałsz', deckId: q.deckId || testDeck, topicId: q.topicId || testTopic, originalIndices: q.originalIndices });
    }
    updateTestCounter();
    setTimeout(() => { currentTestQuestion++; displayTestQuestion(); }, 1500);
}

function updateKnowledgeLevelAfterTest(isCorrect) {
    if (testDeck === 'multiple' || !testDeck) return;
    const q = testQuestions[currentTestQuestion-1]; // poprzednie pytanie
    if (!q) return;
    if (!userProgress.decks[testDeck]) userProgress.decks[testDeck] = {};
    if (!userProgress.decks[testDeck][testTopic]) userProgress.decks[testDeck][testTopic] = {};
    q.originalIndices.forEach(idx => {
        const cur = getKnowledgeLevel(testDeck, testTopic, idx);
        let next = cur;
        if (isCorrect) {
            if (cur === 'new') next = 'learning';
            else if (cur === 'learning') next = 'almost';
            else if (cur === 'almost') next = 'mastered';
        } else {
            if (cur === 'learning') next = 'new';
            else if (cur === 'almost') next = 'learning';
            else if (cur === 'mastered') next = 'almost';
        }
        userProgress.decks[testDeck][testTopic][idx] = next;
        const rev = new Date(); rev.setDate(rev.getDate() + spacedRepetitionIntervals[next]);
        if (!userProgress.spacedRepetition) userProgress.spacedRepetition = {};
        if (!userProgress.spacedRepetition[testDeck]) userProgress.spacedRepetition[testDeck] = {};
        if (!userProgress.spacedRepetition[testDeck][testTopic]) userProgress.spacedRepetition[testDeck][testTopic] = {};
        userProgress.spacedRepetition[testDeck][testTopic][idx] = rev.toISOString();
    });
    saveUserProgress();
    updateStats();
    updateQuickStats();
    checkAchievements();
}

function finishTest() {
    testEndTime = new Date();
    const time = Math.floor((testEndTime - testStartTime)/1000);
    document.getElementById('correctAnswers').textContent = testResults.correct;
    document.getElementById('incorrectAnswers').textContent = testResults.total - testResults.correct;
    document.getElementById('scoreValue').textContent = testResults.correct;
    document.getElementById('scoreMax').textContent = `/ ${testResults.total}`;
    document.getElementById('percentageScore').textContent = `${Math.round((testResults.correct/testResults.total)*100)}%`;
    document.getElementById('testTime').textContent = `${time}s`;
    if (incorrectAnswers.length) {
        document.getElementById('incorrectAnswersList').style.display = 'block';
        document.getElementById('incorrectAnswersContainer').innerHTML = incorrectAnswers.map(i => 
            `<div class="incorrect-answer-item">${i.flashcard.polish} – Twoja: ${i.userAnswer}, poprawna: ${i.correctAnswer}</div>`
        ).join('');
    }
    document.getElementById('testResult').style.display = 'block';
}

function toggleIncorrectList() {
    const c = document.getElementById('incorrectAnswersContainer');
    c.style.display = c.style.display === 'none' ? 'block' : 'none';
}

function reviewIncorrectAnswers() {
    if (!incorrectAnswers.length) return;
    isReviewMode = true;
    reviewQuestions = [...incorrectAnswers];
    shuffleArray(reviewQuestions);
    currentTestQuestion = 0;
    testResults = { correct: 0, total: reviewQuestions.length };
    testCounter = { current: 1, total: reviewQuestions.length, correct: 0, incorrect: 0 };
    updateTestCounter();
    document.getElementById('testResult').style.display = 'none';
    displayTestQuestion();
}

function finishReview() {
    isReviewMode = false;
    incorrectAnswers = [];
    document.getElementById('testResult').style.display = 'block';
}

function resetTest() {
    isReviewMode = false;
    currentTestQuestion = 0;
    testResults = { correct: 0, total: testQuestions.length };
    testCounter = { current: 1, total: testQuestions.length, correct: 0, incorrect: 0 };
    updateTestCounter();
    displayTestQuestion();
    testStartTime = new Date();
    document.getElementById('testResult').style.display = 'none';
    document.getElementById('incorrectAnswersList').style.display = 'none';
}

// ==================== SZYBKA POWTÓRKA ====================
function startQuickStudy() {
    const due = getDueFlashcards();
    if (!due.length) { showNotification('Brak fiszek do powtórki', 'info'); return; }
    currentFlashcards = due;
    currentFlashcardIndex = 0;
    currentDeck = null; currentTopic = null;
    document.getElementById('studyTitle').textContent = 'Szybka powtórka';
    document.getElementById('deadlineInfo').style.display = 'none';
    document.getElementById('advancedFilters').style.display = 'none';
    document.getElementById('advancedFiltersToggle').classList.remove('btn-active');
    showSection('study');
    displayCurrentFlashcard();
}

function getDueFlashcards() {
    const due = [];
    const today = new Date().toISOString().split('T')[0];
    if (!userProgress.spacedRepetition) return due;
    Object.keys(userProgress.spacedRepetition).forEach(deckId => {
        Object.keys(userProgress.spacedRepetition[deckId]).forEach(topicId => {
            Object.keys(userProgress.spacedRepetition[deckId][topicId]).forEach(idx => {
                if (userProgress.spacedRepetition[deckId][topicId][idx].split('T')[0] <= today) {
                    const deck = appData.decks.find(d => d.id === deckId);
                    const topic = deck?.topics.find(t => t.id === topicId);
                    if (topic?.flashcards?.[idx]) {
                        due.push({ ...topic.flashcards[idx], originalIndices: [parseInt(idx)], deckId, topicId });
                    }
                }
            });
        });
    });
    return due;
}

// ==================== STATYSTYKI ====================
function updateStats() {
    let total = 0, mastered = 0, learning = 0, newCards = 0;
    appData.decks.forEach(deck => {
        deck.topics.forEach(topic => {
            total += topic.count || 0;
            if (topic.flashcards) {
                topic.flashcards.forEach((_, idx) => {
                    const l = getKnowledgeLevel(deck.id, topic.id, idx);
                    if (l === 'mastered') mastered++;
                    else if (l === 'learning' || l === 'almost') learning++;
                    else newCards++;
                });
            }
        });
    });
    document.getElementById('totalFlashcards').textContent = total;
    document.getElementById('masteredFlashcards').textContent = mastered;
    document.getElementById('learningFlashcards').textContent = learning;
    document.getElementById('newFlashcards').textContent = newCards;
    document.getElementById('statsBadge').textContent = total ? Math.round((mastered/total)*100) + '%' : '0%';
    // streak
    const today = new Date().toDateString();
    const last = userProgress.stats.lastStudyDate;
    if (last && new Date(last).toDateString() === today) {
        userProgress.stats.today.count++;
    } else {
        userProgress.stats.today.count = 1;
        userProgress.stats.lastStudyDate = new Date().toISOString();
        if (last) {
            const diff = Math.ceil((new Date() - new Date(last)) / (1000*60*60*24));
            userProgress.stats.streak = diff === 1 ? (userProgress.stats.streak||0)+1 : 1;
        } else userProgress.stats.streak = 1;
    }
    document.getElementById('todayActivity').textContent = `Przećwiczyłeś ${userProgress.stats.today.count} fiszek`;
    document.getElementById('learningStreak').textContent = `Seria: ${userProgress.stats.streak} dni`;
    document.getElementById('todayStudy').textContent = userProgress.stats.today.study || 0;
    document.getElementById('todayTest').textContent = userProgress.stats.today.test || 0;
    document.getElementById('todayReview').textContent = userProgress.stats.today.review || 0;
    document.getElementById('streakBadge').textContent = `${userProgress.stats.streak} dni`;
    saveUserProgress();
}

function updateStudyStats() {
    if (!currentDeck || !currentTopic) return;
    const total = originalFlashcards.length;
    const mastered = originalFlashcards.filter(f => getKnowledgeLevel(currentDeck, currentTopic, f.originalIndex) === 'mastered').length;
    const toLearn = total - mastered;
    document.getElementById('studyStats').innerHTML = `
        <div class="study-stat"><span>${total}</span> Wszystkie</div>
        <div class="study-stat"><span>${mastered}</span> Opanowane</div>
        <div class="study-stat"><span>${toLearn}</span> Do nauki</div>
        <div class="study-stat"><span>${currentFlashcards.length}</span> W trybie</div>
    `;
}

function updateQuickStats() {
    const due = getDueFlashcards().length;
    document.getElementById('quickStats').textContent = `${due} fiszek`;
    document.getElementById('studyReadyCount').textContent = due;
    document.getElementById('totalDecksCount').textContent = appData.decks.length;
}

// ==================== OSIĄGNIĘCIA ====================
function checkAchievements() {
    let mastered = 0;
    for (let d in userProgress.decks) {
        for (let t in userProgress.decks[d]) {
            for (let c in userProgress.decks[d][t]) {
                if (userProgress.decks[d][t][c] === 'mastered') mastered++;
            }
        }
    }
    if (mastered >= 1 && !userProgress.achievements.firstMaster) unlockAchievement('firstMaster');
    if (mastered >= 100 && !userProgress.achievements.master100) unlockAchievement('master100');
    if (userProgress.stats.streak >= 7 && !userProgress.achievements.streak7) unlockAchievement('streak7');
    if (userProgress.stats.today.count >= 10 && !userProgress.achievements.quickLearner) unlockAchievement('quickLearner');
    updateAchievementsView();
}

function unlockAchievement(key) {
    userProgress.achievements[key] = true;
    saveUserProgress();
    showNotification(`🏆 ${achievements[key].name} odblokowane!`, 'success');
}

function updateAchievementsView() {
    const container = document.getElementById('achievementsList');
    if (!container) return;
    let unlocked = 0;
    container.innerHTML = Object.keys(achievements).map(key => {
        const a = achievements[key];
        const isUnlocked = userProgress.achievements[key];
        if (isUnlocked) unlocked++;
        return `<div class="achievement ${isUnlocked ? 'unlocked' : 'locked'}"><i class="${a.icon}"></i> ${a.name}</div>`;
    }).join('');
    document.getElementById('achievementsCount').textContent = `${unlocked}/${Object.keys(achievements).length}`;
}

// ==================== IMPORT/EXPORT ====================
function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file || !file.name.endsWith('.txt')) { showNotification('Wybierz plik .txt', 'error'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
        const lines = ev.target.result.split('\n');
        const flashcards = lines.map(l => l.trim()).filter(l => l).map(l => {
            const parts = l.split(' - ');
            return parts.length === 2 ? { polish: parts[0].trim(), english: parts[1].trim() } : null;
        }).filter(Boolean);
        if (flashcards.length) {
            showNotification(`Zaimportowano ${flashcards.length} fiszek`, 'success');
            document.getElementById('filePreview').style.display = 'block';
            document.getElementById('fileName').textContent = file.name;
            document.getElementById('fileLines').textContent = flashcards.length;
            document.getElementById('fileContent').textContent = ev.target.result.substring(0,500) + '...';
        } else showNotification('Brak poprawnych par', 'error');
    };
    reader.readAsText(file);
}
function clearFileInput() { document.getElementById('fileInput').value = ''; document.getElementById('filePreview').style.display = 'none'; }
function triggerFileInput() { document.getElementById('fileInput').click(); }

function createNewDeck() {
    const deckName = document.getElementById('newDeckName').value.trim();
    const topicName = document.getElementById('newTopicName').value.trim();
    if (!deckName || !topicName) { showNotification('Wprowadź nazwy', 'error'); return; }
    const deckId = deckName.toLowerCase().replace(/\s+/g, '-');
    const topicId = topicName.toLowerCase().replace(/\s+/g, '-');
    appData.decks.push({
        id: deckId, name: deckName, icon: 'fas fa-folder', description: 'Nowy zestaw',
        topics: [{ id: topicId, name: topicName, count: 0, flashcards: [] }]
    });
    document.getElementById('newDeckName').value = '';
    document.getElementById('newTopicName').value = '';
    document.getElementById('deckDescription').value = '';
    loadDecks();
    showNotification('Utworzono zestaw', 'success');
}

function exportProgress() {
    const data = JSON.stringify(userProgress, null, 2);
    const blob = new Blob([data], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `fiszkownica-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    showNotification('Postępy wyeksportowane', 'success');
}

// ==================== NOTYFIKACJE ====================
function showNotification(msg, type = 'info') {
    const c = document.getElementById('notificationsContainer');
    const n = document.createElement('div');
    n.className = `notification notification-${type}`;
    n.textContent = msg;
    c.appendChild(n);
    setTimeout(() => n.remove(), 5000);
}

// ==================== DEADLINE ====================
function setDeadline(deckId, topicId = null) {
    currentDeadlineKey = topicId ? `${deckId}-${topicId}` : deckId;
    const deck = appData.decks.find(d=>d.id===deckId);
    const name = topicId ? deck?.topics.find(t=>t.id===topicId)?.name : deck?.name;
    document.getElementById('modalTitle').innerHTML = `<i class="fas fa-calendar-day"></i> Ustaw deadline dla: ${name}`;
    document.getElementById('deadlineDate').value = new Date(Date.now()+7*86400000).toISOString().split('T')[0];
    document.getElementById('deadlineModal').style.display = 'block';
}
function closeModal() { document.getElementById('deadlineModal').style.display = 'none'; currentDeadlineKey = null; }
function saveDeadline() {
    const date = document.getElementById('deadlineDate').value;
    if (!date) { showNotification('Wybierz datę', 'error'); return; }
    if (!userProgress.deadlines) userProgress.deadlines = {};
    userProgress.deadlines[currentDeadlineKey] = { date: new Date(date).toISOString(), setDate: new Date().toISOString() };
    saveUserProgress();
    loadDecks();
    closeModal();
    showNotification('Deadline zapisany', 'success');
}
function setDefaultDeadline(days) {
    const d = new Date(); d.setDate(d.getDate()+days);
    document.getElementById('deadlineDate').value = d.toISOString().split('T')[0];
}
function getDeadlineInfo(deckId, topicId) {
    const key = topicId ? `${deckId}-${topicId}` : deckId;
    const d = userProgress.deadlines?.[key];
    if (!d) return null;
    const days = Math.ceil((new Date(d.date) - new Date()) / (1000*60*60*24));
    if (days < 0) return { text: `Spóźnione o ${-days} dni`, class: 'deadline-black' };
    if (days === 0) return { text: 'Dziś!', class: 'deadline-red' };
    if (days <= 2) return { text: `Pozostało ${days} dni`, class: 'deadline-red' };
    if (days <= 7) return { text: `Pozostało ${days} dni`, class: 'deadline-orange' };
    return { text: `Pozostało ${days} dni`, class: 'deadline-green' };
}

// ==================== MODALE ====================
function showAbout() { document.getElementById('aboutModal').style.display = 'block'; }
function closeAboutModal() { document.getElementById('aboutModal').style.display = 'none'; }
function showHelp() { document.getElementById('helpModal').style.display = 'block'; }
function closeHelpModal() { document.getElementById('helpModal').style.display = 'none'; }
window.onclick = (e) => {
    if (e.target.classList.contains('modal')) {
        if (e.target.id === 'deadlineModal') closeModal();
        else if (e.target.id === 'aboutModal') closeAboutModal();
        else if (e.target.id === 'helpModal') closeHelpModal();
    }
};

// ==================== NAWIGACJA ====================
function showSection(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    if (id === 'test') renderTestTopicSelection();
    if (id === 'stats') { updateStats(); updateAchievementsView(); }
}
function selectDeck() { showSection('decks'); }

// ==================== POMOCNICZE ====================
function shuffleArray(a) { for (let i=a.length-1; i>0; i--) { const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

console.log('Fiszkownica 1.1.0 załadowana');