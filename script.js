const state = {
  decks: [],
  questions: [],
  current: 0,
  score: 0,
  mistakes: [],
  startTime: 0,
  currentQuestion: null,
  checked: false,
  retryPool: null
};


if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('service-worker.js').catch(() => {}));
}
const el = {
  setupView: document.getElementById('setupView'),
  quizView: document.getElementById('quizView'),
  resultView: document.getElementById('resultView'),
  mode: document.getElementById('modeSelect'),
  direction: document.getElementById('directionSelect'),
  count: document.getElementById('countSelect'),
  shuffle: document.getElementById('shuffleSelect'),
  topics: document.getElementById('topicsContainer'),
  selectedInfo: document.getElementById('selectedInfo'),
  startBtn: document.getElementById('startBtn'),
  selectAllBtn: document.getElementById('selectAllBtn'),
  clearAllBtn: document.getElementById('clearAllBtn'),
  questionText: document.getElementById('questionText'),
  quizProgress: document.getElementById('quizProgress'),
  writingBox: document.getElementById('writingBox'),
  writingInput: document.getElementById('writingInput'),
  checkWritingBtn: document.getElementById('checkWritingBtn'),
  choiceBox: document.getElementById('choiceBox'),
  feedback: document.getElementById('feedback'),
  nextBtn: document.getElementById('nextBtn'),
  scoreLine: document.getElementById('scoreLine'),
  timeLine: document.getElementById('timeLine'),
  mistakesWrap: document.getElementById('mistakesWrap'),
  mistakesList: document.getElementById('mistakesList'),
  retryMistakesBtn: document.getElementById('retryMistakesBtn'),
  newQuizBtn: document.getElementById('newQuizBtn'),
  themeToggle: document.getElementById('themeToggle')
};

init();

async function init() {
  await loadDecksWithFlashcards();
  renderTopics();
  bindEvents();
  loadTheme();
}

async function loadDecksWithFlashcards() {
  const response = await fetch('data/decks.json');
  const json = await response.json();
  const decks = [];
  for (const deck of json.decks) {
    const topics = [];
    for (const topic of deck.topics) {
      const file = await fetch(`data/${deck.id}/${topic.file}`).then(r => r.json());
      topics.push({ ...topic, flashcards: file });
    }
    decks.push({ ...deck, topics });
  }
  state.decks = decks;
}

function renderTopics() {
  el.topics.innerHTML = state.decks.map(deck => `
    <div class="deck">
      <h3>${deck.name}</h3>
      <div class="topic-list">
        ${deck.topics.map(topic => `
          <label class="topic-item">
            <input type="checkbox" class="topic-check" value="${deck.id}::${topic.id}">
            <span>${topic.name} <small>(${topic.flashcards.length})</small></span>
          </label>
        `).join('')}
      </div>
    </div>
  `).join('');
  updateSelectedInfo();
}

function bindEvents() {
  document.addEventListener('change', e => {
    if (e.target.classList.contains('topic-check')) updateSelectedInfo();
  });
  el.startBtn.addEventListener('click', () => startQuiz(false));
  el.selectAllBtn.addEventListener('click', () => toggleAllTopics(true));
  el.clearAllBtn.addEventListener('click', () => toggleAllTopics(false));
  el.checkWritingBtn.addEventListener('click', onWriteCheck);
  el.writingInput.addEventListener('keydown', e => { if (e.key === 'Enter') onWriteCheck(); });
  el.nextBtn.addEventListener('click', nextQuestion);
  el.newQuizBtn.addEventListener('click', resetToSetup);
  el.retryMistakesBtn.addEventListener('click', () => startQuiz(true));
  el.themeToggle.addEventListener('click', toggleTheme);
}

function toggleAllTopics(checked) {
  document.querySelectorAll('.topic-check').forEach(c => c.checked = checked);
  updateSelectedInfo();
}

function getSelectedKeys() {
  return [...document.querySelectorAll('.topic-check:checked')].map(c => c.value);
}

function updateSelectedInfo() {
  const selected = getSelectedKeys().length;
  el.selectedInfo.textContent = `Wybrano ${selected} tematów`;
}

function startQuiz(fromMistakes) {
  const mode = el.mode.value;
  const direction = el.direction.value;

  let pool = [];
  if (fromMistakes && state.retryPool?.length) {
    pool = structuredClone(state.retryPool);
  } else {
    const selected = getSelectedKeys();
    if (!selected.length) return alert('Wybierz przynajmniej jeden temat.');

    for (const key of selected) {
      const [deckId, topicId] = key.split('::');
      const deck = state.decks.find(d => d.id === deckId);
      const topic = deck.topics.find(t => t.id === topicId);
      for (const card of topic.flashcards) {
        pool.push({ deck: deck.name, topic: topic.name, polish: card.polish, english: card.english });
      }
    }
  }

  if (!pool.length) return alert('Brak danych do testu.');

  if (el.shuffle.value === 'yes') shuffle(pool);
  const limit = el.count.value === 'all' ? pool.length : Number(el.count.value);
  pool = pool.slice(0, limit);

  state.questions = buildQuestions(pool, mode, direction);
  state.current = 0;
  state.score = 0;
  state.mistakes = [];
  state.checked = false;
  state.startTime = Date.now();

  el.setupView.classList.add('hidden');
  el.resultView.classList.add('hidden');
  el.quizView.classList.remove('hidden');

  showQuestion();
}

function buildQuestions(pool, mode, direction) {
  const answerField = direction === 'pl-en' ? 'english' : 'polish';
  const promptField = direction === 'pl-en' ? 'polish' : 'english';

  return pool.map(item => {
    const question = {
      ...item,
      mode,
      prompt: item[promptField],
      answer: item[answerField]
    };

    if (mode === 'multiple') {
      const distractors = pool
        .filter(p => p[answerField] !== question.answer)
        .map(p => p[answerField]);
      shuffle(distractors);
      const options = [...new Set([question.answer, ...distractors.slice(0, 3)])];
      while (options.length < 4 && distractors.length) options.push(distractors.pop());
      shuffle(options);
      question.options = options;
    }

    if (mode === 'truefalse') {
      const useTrue = Math.random() < 0.5;
      if (useTrue) {
        question.statement = `${question.prompt} = ${question.answer}`;
        question.trueAnswer = true;
      } else {
        const fake = pool.find(p => p[answerField] !== question.answer)?.[answerField] || question.answer;
        question.statement = `${question.prompt} = ${fake}`;
        question.trueAnswer = false;
      }
    }

    return question;
  });
}

function showQuestion() {
  state.checked = false;
  const q = state.questions[state.current];
  state.currentQuestion = q;

  el.feedback.textContent = '';
  el.feedback.className = 'feedback';
  el.nextBtn.classList.add('hidden');
  el.quizProgress.textContent = `${state.current + 1} / ${state.questions.length}`;

  el.writingBox.classList.add('hidden');
  el.choiceBox.classList.add('hidden');

  if (q.mode === 'writing') {
    el.questionText.textContent = q.prompt;
    el.writingInput.value = '';
    el.writingBox.classList.remove('hidden');
    el.writingInput.focus();
    return;
  }

  if (q.mode === 'multiple') {
    el.questionText.textContent = q.prompt;
    el.choiceBox.innerHTML = q.options.map(o => `<button type="button" class="choice">${o}</button>`).join('');
    el.choiceBox.classList.remove('hidden');
    [...el.choiceBox.querySelectorAll('.choice')].forEach(btn => {
      btn.addEventListener('click', () => evaluate(btn.textContent, q.answer));
    });
    return;
  }

  el.questionText.textContent = q.statement;
  el.choiceBox.innerHTML = `
    <button type="button" class="choice" data-v="true">Prawda</button>
    <button type="button" class="choice" data-v="false">Fałsz</button>
  `;
  el.choiceBox.classList.remove('hidden');
  [...el.choiceBox.querySelectorAll('.choice')].forEach(btn => {
    btn.addEventListener('click', () => evaluate(btn.dataset.v === 'true', q.trueAnswer));
  });
}

function onWriteCheck() {
  if (state.currentQuestion?.mode !== 'writing') return;
  evaluate(normalize(el.writingInput.value), normalize(state.currentQuestion.answer));
}

function evaluate(given, expected) {
  if (state.checked) return;
  state.checked = true;

  const isCorrect = given === expected;
  if (isCorrect) {
    state.score += 1;
    el.feedback.textContent = '✅ Poprawna odpowiedź';
    el.feedback.classList.add('ok');
  } else {
    el.feedback.textContent = `❌ Błędnie. Poprawnie: ${state.currentQuestion.answer}`;
    el.feedback.classList.add('bad');
    state.mistakes.push(state.currentQuestion);
  }

  el.nextBtn.classList.remove('hidden');
}

function nextQuestion() {
  state.current += 1;
  if (state.current >= state.questions.length) return finishQuiz();
  showQuestion();
}

function finishQuiz() {
  const ms = Date.now() - state.startTime;
  const sec = Math.round(ms / 1000);
  const pct = Math.round((state.score / state.questions.length) * 100);

  state.retryPool = state.mistakes.map(m => ({
    deck: m.deck,
    topic: m.topic,
    polish: m.polish,
    english: m.english
  }));

  el.scoreLine.textContent = `Wynik: ${state.score}/${state.questions.length} (${pct}%)`;
  el.timeLine.textContent = `Czas: ${sec}s`;

  if (state.mistakes.length) {
    el.mistakesWrap.classList.remove('hidden');
    el.mistakesList.innerHTML = state.mistakes.map(m =>
      `<li><strong>${m.prompt}</strong> → ${m.answer} <small>(${m.deck} / ${m.topic})</small></li>`
    ).join('');
    el.retryMistakesBtn.classList.remove('hidden');
  } else {
    el.mistakesWrap.classList.add('hidden');
    el.retryMistakesBtn.classList.add('hidden');
  }

  el.quizView.classList.add('hidden');
  el.resultView.classList.remove('hidden');
}

function resetToSetup() {
  el.resultView.classList.add('hidden');
  el.quizView.classList.add('hidden');
  el.setupView.classList.remove('hidden');
}

function normalize(value) {
  return String(value).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function toggleTheme() {
  document.body.classList.toggle('dark');
  const isDark = document.body.classList.contains('dark');
  localStorage.setItem('fiszkoTestyTheme', isDark ? 'dark' : 'light');
  el.themeToggle.textContent = isDark ? '☀️ Motyw' : '🌙 Motyw';
}

function loadTheme() {
  const theme = localStorage.getItem('fiszkoTestyTheme');
  if (theme === 'dark') document.body.classList.add('dark');
  const isDark = document.body.classList.contains('dark');
  el.themeToggle.textContent = isDark ? '☀️ Motyw' : '🌙 Motyw';
}
