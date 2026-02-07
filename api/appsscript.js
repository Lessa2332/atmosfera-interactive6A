<// Конфігурація гри
const GAME_CONFIG = {
    apiUrl: 'https://script.google.com/macros/s/AKfycbwSQ8InOBf-kE0uDc26UZD6Ftp6_EKHSfo3YzZbq9nfY2f0ssSVx4fOz41IOmPnap-2JA/exec', // Замініть на ваш URL
    levels: [
        { id: 1, title: "Температура повітря", emoji: "🌡️", theme: "Температура", color: "#FF9500" },
        { id: 2, title: "Атмосферний тиск", emoji: "📉", theme: "Тиск", color: "#00FFFF" },
        { id: 3, title: "Вітер", emoji: "🌬️", theme: "Вітер", color: "#39FF14" },
        { id: 4, title: "Хмари та вологість", emoji: "☁️", theme: "Хмари", color: "#C77DFF" },
        { id: 5, title: "Опади", emoji: "🌧️", theme: "Опади", color: "#0099FF" },
        { id: 6, title: "Підсумковий проект", emoji: "🧭", theme: "Проект", color: "#FF4081" }
    ],
    maxStarsPerLevel: 3
};

// Дані гравця
let player = {
    name: localStorage.getItem('playerName') || 'Гравець',
    class: localStorage.getItem('playerClass') || '6 клас',
    crystals: parseInt(localStorage.getItem('playerCrystals')) || 0,
    totalStars: parseInt(localStorage.getItem('playerStars')) || 0,
    totalScore: parseInt(localStorage.getItem('playerScore')) || 0,
    completed: JSON.parse(localStorage.getItem('completedLevels')) || [],
    stars: JSON.parse(localStorage.getItem('levelStars')) || {},
    scores: JSON.parse(localStorage.getItem('levelScores')) || {}
};

// Ініціалізація гри
function initGame() {
    updatePlayerDisplay();
    renderLevels();
    loadLeaderboard();
    setupEventListeners();
}

// Оновлення відображення даних гравця
function updatePlayerDisplay() {
    document.getElementById('username').textContent = player.name;
    document.getElementById('crystal-count').textContent = player.crystals;
    document.getElementById('total-stars').textContent = player.totalStars;
    document.getElementById('total-score').textContent = player.totalScore;
    
    const completedCount = player.completed.length;
    const percent = Math.round((completedCount / GAME_CONFIG.levels.length) * 100);
    
    document.getElementById('progress-fill').style.width = percent + '%';
    document.getElementById('progress-text').textContent = `${completedCount}/${GAME_CONFIG.levels.length}`;
    document.getElementById('progress-percent').textContent = `${percent}%`;
}

// Генерація рівнів
function renderLevels() {
    const container = document.getElementById('levels-grid');
    container.innerHTML = '';
    
    GAME_CONFIG.levels.forEach((level, index) => {
        const isUnlocked = level.id === 1 || player.completed.includes(level.id - 1);
        const stars = player.stars[level.id] || 0;
        const score = player.scores[level.id] || 0;
        
        const levelCard = document.createElement('div');
        levelCard.className = `level-card ${isUnlocked ? 'unlocked' : 'locked'}`;
        levelCard.style.borderColor = isUnlocked ? level.color : 'var(--glass-border)';
        
        levelCard.innerHTML = `
            <div class="level-number">${level.id}</div>
            <div class="level-emoji">${level.emoji}</div>
            <div class="level-title">${level.title}</div>
            
            ${isUnlocked ? `
            <div class="level-stars">
                ${'★'.repeat(stars)}${'☆'.repeat(GAME_CONFIG.maxStarsPerLevel - stars)}
            </div>
            <div class="level-score">💎 ${score}</div>
            ` : ''}
            
            <button class="level-button" 
                onclick="${isUnlocked ? `startLevel(${level.id})` : ''}"
                ${!isUnlocked ? 'disabled' : ''}
                style="background: linear-gradient(45deg, ${level.color}, ${level.color}80)">
                ${isUnlocked ? 'ГРАТИ' : '🔒 ЗАБЛОКОВАНО'}
            </button>
        `;
        
        container.appendChild(levelCard);
    });
}

// Запуск рівня
function startLevel(levelId) {
    const level = GAME_CONFIG.levels.find(l => l.id === levelId);
    
    // Показуємо завантаження
    showMessage(`Завантаження: ${level.title}...`, 'info');
    
    // Перехід на сторінку рівня
    setTimeout(() => {
        window.location.href = `levels/level${levelId}.html`;
    }, 1000);
}

// Збереження результатів рівня
function saveLevelResults(levelId, score, starsEarned, crystalsEarned) {
    if (!player.completed.includes(levelId)) {
        player.completed.push(levelId);
    }
    
    player.stars[levelId] = Math.max(player.stars[levelId] || 0, starsEarned);
    player.scores[levelId] = Math.max(player.scores[levelId] || 0, score);
    player.crystals += crystalsEarned;
    player.totalStars = Object.values(player.stars).reduce((a, b) => a + b, 0);
    player.totalScore = Object.values(player.scores).reduce((a, b) => a + b, 0);
    
    // Зберігаємо в localStorage
    localStorage.setItem('playerName', player.name);
    localStorage.setItem('playerClass', player.class);
    localStorage.setItem('playerCrystals', player.crystals);
    localStorage.setItem('playerStars', player.totalStars);
    localStorage.setItem('playerScore', player.totalScore);
    localStorage.setItem('completedLevels', JSON.stringify(player.completed));
    localStorage.setItem('levelStars', JSON.stringify(player.stars));
    localStorage.setItem('levelScores', JSON.stringify(player.scores));
    
    // Відправляємо на сервер
    sendToLeaderboard(score, GAME_CONFIG.levels[levelId - 1].theme);
    
    // Оновлюємо відображення
    updatePlayerDisplay();
    renderLevels();
    
    // Показуємо повідомлення про успіх
    showMessage(`+${crystalsEarned} 💎 | +${starsEarned} ⭐ | Успіх!`, 'success');
}

// Відправка результатів на лідерборд
async function sendToLeaderboard(score, theme) {
    try {
        const response = await fetch(GAME_CONFIG.apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: player.name,
                class: player.class,
                theme: theme,
                points: score
            })
        });
        
        const data = await response.json();
        if (data.status === 'success') {
            loadLeaderboard();
        }
    } catch (error) {
        console.error('Помилка відправки:', error);
    }
}

// Показ повідомлень
function showMessage(text, type = 'info') {
    const message = document.createElement('div');
    message.className = `success-message ${type}`;
    message.textContent = text;
    message.style.background = type === 'success' 
        ? 'linear-gradient(45deg, var(--accent-lime), #00cc00)' 
        : 'linear-gradient(45deg, var(--accent-cyan), #0099FF)';
    
    document.body.appendChild(message);
    
    setTimeout(() => {
        message.remove();
    }, 3000);
}

// Профіль
function showProfile() {
    document.getElementById('player-name').value = player.name;
    document.getElementById('player-class').value = player.class;
    document.getElementById('profile-modal').style.display = 'flex';
}

function saveProfile() {
    player.name = document.getElementById('player-name').value.trim() || 'Гравець';
    player.class = document.getElementById('player-class').value.trim() || '6 клас';
    
    localStorage.setItem('playerName', player.name);
    localStorage.setItem('playerClass', player.class);
    
    updatePlayerDisplay();
    document.getElementById('profile-modal').style.display = 'none';
    
    showMessage('Профіль оновлено!', 'success');
}

// Налаштування
function showSettings() {
    // Можна додати налаштування звуку, музики тощо
    showMessage('Налаштування в розробці!', 'info');
}

// Налаштування обробників подій
function setupEventListeners() {
    // Закриття модальних вікон при кліку навколо
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.style.display = 'none';
            }
        });
    });
    
    // Enter для збереження профілю
    document.getElementById('player-name')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') saveProfile();
    });
    
    document.getElementById('player-class')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') saveProfile();
    });
}

// Ініціалізація при завантаженні сторінки
window.onload = function() {
    initGame();
};

// Для використання в рівнях
function completeLevel(levelId, score, stars) {
    const crystalsEarned = score * 10 + stars * 50;
    saveLevelResults(levelId, score, stars, crystalsEarned);
    window.location.href = 'game.html';
}