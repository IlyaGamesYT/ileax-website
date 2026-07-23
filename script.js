// ============ КОНФИГУРАЦИЯ ============
const ADMIN_PASSWORD = "2760";
const DATA_FOLDER = "data";

let isAdmin = false;
let currentTrackUrl = null;
let currentPage = 'home';

const AUDIO_FORMATS = ['mp3', 'ogg'];
const IMAGE_FORMATS = ['jpeg', 'jpg', 'png', 'gif', 'webp', 'bmp', 'svg'];
const VIDEO_FORMATS = ['mp4', 'webm'];
const ARCHIVE_FORMATS = ['zip', 'rar'];

// ============ СКАНИРОВАНИЕ ПАПКИ DATA ============
async function scanDataFolder() {
    // Список известных файлов (можно дополнить вручную)
    const knownFiles = [
        'mus1.mp3'
        // Добавляй сюда новые файлы, если нужно
    ];
    
    // Пытаемся загрузить список файлов из data/files.txt (если есть)
    try {
        const response = await fetch(DATA_FOLDER + '/files.txt');
        if (response.ok) {
            const text = await response.text();
            const filesFromTxt = text.split('\n').map(f => f.trim()).filter(f => f.length > 0);
            return [...new Set([...knownFiles, ...filesFromTxt])];
        }
    } catch (e) {}
    
    return knownFiles;
}

async function buildContentFromFiles(files) {
    const musicData = [];
    const minecraftData = [];
    const gamesData = [];
    const otherData = [];
    
    for (const file of files) {
        const type = getFileType(file);
        const title = file.replace(/\.[^/.]+$/, ''); // Имя файла без расширения
        
        // Проверяем существует ли файл
        const exists = await fileExists(file);
        if (!exists) continue;
        
        const item = { type: type, title: title, fileName: file, id: Date.now() + Math.random() };
        
        // Распределяем по разделам (можно настроить)
        if (type === 'music') {
            musicData.push(item);
        } else if (type === 'image') {
            // Картинки распределяем равномерно
            if (minecraftData.length <= gamesData.length) {
                minecraftData.push(item);
            } else {
                gamesData.push(item);
            }
        } else {
            otherData.push(item);
        }
    }
    
    saveData('music_data', musicData);
    saveData('minecraft_data', minecraftData);
    saveData('games_data', gamesData);
    saveData('other_data', otherData);
}

// ============ ХРАНИЛИЩЕ ДАННЫХ ============
function getData(key) {
    try { const data = localStorage.getItem(key); return data ? JSON.parse(data) : []; }
    catch (e) { return []; }
}

function saveData(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); }
    catch (e) {}
}

async function initData() {
    const files = await scanDataFolder();
    await buildContentFromFiles(files);
}

async function fileExists(filename) {
    try {
        const response = await fetch(DATA_FOLDER + '/' + filename, { method: 'HEAD' });
        return response.ok;
    } catch {
        return false;
    }
}

function getFileUrl(item) {
    if (item.fileName) return DATA_FOLDER + '/' + item.fileName;
    return '';
}

function getFileType(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    if (AUDIO_FORMATS.includes(ext)) return 'music';
    if (IMAGE_FORMATS.includes(ext)) return 'image';
    if (VIDEO_FORMATS.includes(ext)) return 'video';
    if (ARCHIVE_FORMATS.includes(ext)) return 'archive';
    return 'file';
}

// ============ ПЕРЕКЛЮЧЕНИЕ ТИПА КОНТЕНТА ============
function toggleContentType(section) {
    const type = document.getElementById(`${section}-content-type`).value;
    document.getElementById(`${section}-file-inputs`).style.display = type === 'file' ? 'block' : 'none';
    document.getElementById(`${section}-text-inputs`).style.display = type === 'text' ? 'block' : 'none';
}

// ============ НАВИГАЦИЯ ============
function navigateTo(page) {
    stopAllMusic();
    closeLightbox();
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`${page}-page`).classList.add('active');
    currentPage = page;
    renderPage(page);
    window.scrollTo(0, 0);
}

function goHome() {
    stopAllMusic();
    closeLightbox();
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('home-page').classList.add('active');
    currentPage = 'home';
    window.scrollTo(0, 0);
}

// ============ МУЗЫКАЛЬНЫЙ ПЛЕЕР ============
function toggleMusic(url, event) {
    if (event) event.stopPropagation();
    const player = document.getElementById('audio-player');
    
    if (currentTrackUrl === url) {
        player.paused ? (player.volume = 1.0, player.play()) : player.pause();
        updateAllIcons();
        return;
    }
    
    player.src = url;
    player.volume = 1.0;
    player.play().catch(() => {});
    currentTrackUrl = url;
    player.onended = () => { currentTrackUrl = null; updateAllIcons(); };
    player.onpause = () => updateAllIcons();
    player.onplay = () => updateAllIcons();
    updateAllIcons();
}

function stopAllMusic() {
    const player = document.getElementById('audio-player');
    if (!player.paused || currentTrackUrl !== null) {
        fadeOutAudio(player, 1000);
        currentTrackUrl = null;
        updateAllIcons();
    }
}

function fadeOutAudio(player, duration) {
    const startVolume = player.volume;
    const startTime = performance.now();
    function fade() {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        player.volume = startVolume * (1 - progress);
        if (progress < 1) requestAnimationFrame(fade);
        else { player.pause(); player.currentTime = 0; player.volume = startVolume; }
    }
    requestAnimationFrame(fade);
}

function updateAllIcons() {
    const player = document.getElementById('audio-player');
    const isPlaying = !player.paused && currentTrackUrl !== null;
    document.querySelectorAll('.play-btn').forEach(btn => {
        const btnUrl = btn.getAttribute('data-url');
        const card = btn.closest('.content-card');
        btn.innerHTML = (btnUrl === currentTrackUrl && isPlaying) ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
        if (card) card.classList.toggle('playing', btnUrl === currentTrackUrl && isPlaying);
    });
}

// ============ РЕНДЕРИНГ ============
function renderMusic() { 
    document.getElementById('music-list').innerHTML = getData('music_data').map((item, i) => renderItem(item, i, 'music')).join(''); 
    setupDragAndDrop('music-list', 'music_data'); 
    updateAllIcons(); 
}
function renderMinecraft() { 
    document.getElementById('minecraft-list').innerHTML = getData('minecraft_data').map((item, i) => renderItem(item, i, 'minecraft')).join(''); 
    setupDragAndDrop('minecraft-list', 'minecraft_data'); 
    updateAllIcons(); 
}
function renderGames() { 
    document.getElementById('games-list').innerHTML = getData('games_data').map((item, i) => renderItem(item, i, 'games')).join(''); 
    setupDragAndDrop('games-list', 'games_data'); 
    updateAllIcons(); 
}
function renderOther() { 
    document.getElementById('other-list').innerHTML = getData('other_data').map((item, i) => renderItem(item, i, 'other')).join(''); 
    setupDragAndDrop('other-list', 'other_data'); 
    updateAllIcons(); 
}

function renderItem(item, index, section) {
    const url = getFileUrl(item);
    const dragHandle = isAdmin ? '<span class="drag-handle" draggable="true"><i class="fas fa-grip-vertical"></i></span>' : '';
    const deleteBtn = isAdmin ? `<button class="delete-btn" onclick="event.stopPropagation(); deleteItem('${section}', ${index})"><i class="fas fa-times"></i></button>` : '';
    
    if (item.type === 'music') {
        return `<div class="content-card music-card" draggable="${isAdmin}" data-index="${index}">${dragHandle}<button class="play-btn" data-url="${url}" onclick="toggleMusic('${url}', event)"><i class="fas fa-play"></i></button><div class="card-content"><span>${item.title}</span>${item.fileName ? `<br><small style="color:#8b949e;">📁 ${item.fileName}</small>` : ''}</div>${deleteBtn}</div>`;
    }
    if (item.type === 'image') {
        return `<div class="content-card image-card" draggable="${isAdmin}" data-index="${index}">${dragHandle}<img src="${url}" class="card-image" alt="${item.title}" onclick="openLightbox('${url}', '${item.title.replace(/'/g, "\\'")}')" onerror="this.style.display='none';"><div class="card-content"><span>${item.title}</span>${item.fileName ? `<br><small style="color:#8b949e;">📁 ${item.fileName}</small>` : ''}</div>${deleteBtn}</div>`;
    }
    if (item.type === 'video') {
        return `<div class="content-card video-card" draggable="${isAdmin}" data-index="${index}">${dragHandle}<div class="video-thumbnail" onclick="openVideo('${url}', '${item.title.replace(/'/g, "\\'")}')"><video src="${url}" preload="metadata" class="video-preview" muted></video><div class="video-play-overlay"><i class="fas fa-play"></i></div></div><div class="card-content"><span>${item.title}</span>${item.fileName ? `<br><small style="color:#8b949e;">📁 ${item.fileName}</small>` : ''}</div>${deleteBtn}</div>`;
    }
    if (item.type === 'archive') {
        return `<div class="content-card file-card" draggable="${isAdmin}" data-index="${index}">${dragHandle}<i class="fas fa-file-archive file-icon"></i><div class="card-content"><span>${item.title}</span>${item.fileName ? `<br><small style="color:#8b949e;">📁 ${item.fileName}</small>` : ''}<br><small style="color:#8b949e;">Архив</small></div><a href="${url}" download="${item.fileName || 'file'}" class="download-btn-small" onclick="event.stopPropagation();"><i class="fas fa-download"></i> Скачать</a>${deleteBtn}</div>`;
    }
    if (item.type === 'file') {
        return `<div class="content-card file-card" draggable="${isAdmin}" data-index="${index}">${dragHandle}<i class="fas fa-file file-icon"></i><div class="card-content"><span>${item.title}</span>${item.fileName ? `<br><small style="color:#8b949e;">📁 ${item.fileName}</small>` : ''}<br><small style="color:#8b949e;">Файл</small></div><a href="${url}" download="${item.fileName || 'file'}" class="download-btn-small" onclick="event.stopPropagation();"><i class="fas fa-download"></i> Скачать</a>${deleteBtn}</div>`;
    }
    if (item.type === 'text') {
        return `<div class="content-card text-card" draggable="${isAdmin}" data-index="${index}">${dragHandle}<div class="card-content"><p>${item.text.replace(/\n/g, '<br>')}</p></div>${deleteBtn}</div>`;
    }
    return '';
}

// ============ ДОБАВЛЕНИЕ КОНТЕНТА (только текст) ============
function addContent(section) {
    const dataKeyMap = { 'music': 'music_data', 'mc': 'minecraft_data', 'games': 'games_data', 'other': 'other_data' };
    const dataKey = dataKeyMap[section];
    const data = getData(dataKey);
    const type = document.getElementById(`${section}-content-type`).value;
    
    if (type === 'text') {
        const textarea = document.getElementById(`new-${section}-text`);
        const text = textarea.value.trim();
        if (!text) return;
        data.unshift({ type: 'text', text: text, id: Date.now() });
        saveData(dataKey, data);
        textarea.value = '';
        renderPage(section === 'mc' ? 'minecraft' : section);
    }
    
    // Файлы больше не добавляем через админку — просто кидаем в папку data
    if (type === 'file') {
        alert('Просто положите файл в папку data и нажмите Push в GitHub Desktop!');
    }
}

// ============ УДАЛЕНИЕ ============
function deleteItem(section, index) {
    const dataKeyMap = { 'music': 'music_data', 'minecraft': 'minecraft_data', 'games': 'games_data', 'other': 'other_data' };
    const data = getData(dataKeyMap[section]);
    const item = data[index];
    if (item.type === 'music' && currentTrackUrl === getFileUrl(item)) {
        const player = document.getElementById('audio-player');
        player.pause(); player.currentTime = 0; currentTrackUrl = null;
    }
    data.splice(index, 1);
    saveData(dataKeyMap[section], data);
    renderPage(section);
}

// ============ DRAG AND DROP ============
let draggedIndex = null, draggedSection = null;

function setupDragAndDrop(containerId, dataKey) {
    if (!isAdmin) return;
    document.getElementById(containerId).querySelectorAll('.content-card[draggable="true"]').forEach(card => {
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragover', handleDragOver);
        card.addEventListener('dragleave', handleDragLeave);
        card.addEventListener('drop', handleDrop);
        card.addEventListener('dragend', handleDragEnd);
    });
}

function handleDragStart(e) {
    const card = e.target.closest('.content-card');
    if (!card) return;
    draggedIndex = parseInt(card.dataset.index);
    draggedSection = card.closest('.content-list').id;
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; const card = e.target.closest('.content-card'); if (card) card.classList.add('drag-over'); }
function handleDragLeave(e) { const card = e.target.closest('.content-card'); if (card) card.classList.remove('drag-over'); }

function handleDrop(e) {
    e.preventDefault();
    const card = e.target.closest('.content-card');
    if (card) card.classList.remove('drag-over');
    if (!card || draggedIndex === null) return;
    const targetIndex = parseInt(card.dataset.index);
    if (draggedIndex === targetIndex) return;
    const dataKeyMap = { 'music-list': 'music_data', 'minecraft-list': 'minecraft_data', 'games-list': 'games_data', 'other-list': 'other_data' };
    const sectionMap = { 'music-list': 'music', 'minecraft-list': 'minecraft', 'games-list': 'games', 'other-list': 'other' };
    const data = getData(dataKeyMap[draggedSection]);
    const [moved] = data.splice(draggedIndex, 1);
    data.splice(targetIndex, 0, moved);
    saveData(dataKeyMap[draggedSection], data);
    renderPage(sectionMap[draggedSection]);
}

function handleDragEnd(e) {
    const card = e.target.closest('.content-card');
    if (card) card.classList.remove('dragging');
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    draggedIndex = null; draggedSection = null;
}

// ============ ЛАЙТБОКС ============
function openLightbox(src, caption) {
    const lb = document.getElementById('lightbox');
    const img = document.getElementById('lightbox-img');
    const cap = document.getElementById('lightbox-caption');
    const oldVideo = lb.querySelector('video');
    if (oldVideo) oldVideo.remove();
    img.style.display = 'block';
    img.src = src;
    cap.innerText = caption;
    lb.classList.add('active');
}

function openVideo(src, caption) {
    const lb = document.getElementById('lightbox');
    const img = document.getElementById('lightbox-img');
    const cap = document.getElementById('lightbox-caption');
    const oldVideo = lb.querySelector('video');
    if (oldVideo) oldVideo.remove();
    img.style.display = 'none';
    const video = document.createElement('video');
    video.src = src;
    video.controls = true;
    video.autoplay = true;
    video.playsInline = true;
    video.preload = 'auto';
    const closeBtn = lb.querySelector('.close-lightbox');
    lb.insertBefore(video, closeBtn);
    cap.innerText = caption;
    lb.classList.add('active');
    video.load();
    video.play().catch(() => { video.muted = true; video.play().catch(() => {}); });
}

function closeLightbox() {
    const lb = document.getElementById('lightbox');
    const img = document.getElementById('lightbox-img');
    const video = lb.querySelector('video');
    if (video) { video.pause(); video.remove(); }
    img.style.display = 'block';
    lb.classList.remove('active');
}

// ============ АДМИНКА ============
function toggleAdmin() {
    if (isAdmin) { isAdmin = false; updateAdminUI(); return; }
    const pass = prompt("🔒 Введите пароль:");
    if (pass === ADMIN_PASSWORD) isAdmin = true;
    updateAdminUI();
}

function updateAdminUI() {
    document.querySelectorAll('.admin-zone').forEach(el => el.style.display = isAdmin ? 'block' : 'none');
    document.getElementById('admin-toggle-btn').style.background = isAdmin ? '#f0883e' : '#30363d';
    if (currentPage !== 'home') renderPage(currentPage);
}

function renderPage(page) {
    switch(page) {
        case 'music': renderMusic(); break;
        case 'minecraft': renderMinecraft(); break;
        case 'games': renderGames(); break;
        case 'other': renderOther(); break;
    }
}

// ============ ИНИЦИАЛИЗАЦИЯ ============
window.onload = async () => { 
    await initData(); 
    updateAdminUI(); 
};
document.addEventListener('click', function(e) { if (e.target === document.getElementById('lightbox')) closeLightbox(); });
document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeLightbox(); });