// State
let songs = [];
let playlists = [];
let selectedPlaylistId = null;
let queue = [];
let currentIndex = -1;
let isShuffled = false;
let originalQueue = [];
let player = null;
let isPlaying = false;
let volume = 50;
let isMuted = false;

// Load data from localStorage on startup
function loadData() {
    const savedSongs = localStorage.getItem('musicPlayerSongs');
    const savedPlaylists = localStorage.getItem('musicPlayerPlaylists');
    
    if (savedSongs) songs = JSON.parse(savedSongs);
    if (savedPlaylists) playlists = JSON.parse(savedPlaylists);
    
    renderSongs();
    renderPlaylists();
}

// Save data to localStorage
function saveData() {
    localStorage.setItem('musicPlayerSongs', JSON.stringify(songs));
    localStorage.setItem('musicPlayerPlaylists', JSON.stringify(playlists));
}

// Extract YouTube video ID from URL
function extractVideoId(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
        /youtube\.com\/embed\/([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

// YouTube API Ready
function onYouTubeIframeAPIReady() {
    console.log('YouTube API Ready');
}

// Add Song Dialog
function openAddSongDialog() {
    document.getElementById('add-song-dialog').classList.add('show');
}

function closeAddSongDialog() {
    document.getElementById('add-song-dialog').classList.remove('show');
    document.getElementById('youtube-url').value = '';
}

async function addSong() {
    const url = document.getElementById('youtube-url').value.trim();
    
    if (!url) {
        alert('Please enter a YouTube URL');
        return;
    }
    
    const videoId = extractVideoId(url);
    if (!videoId) {
        alert('Invalid YouTube URL');
        return;
    }
    
    try {
        const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
        
        if (!response.ok) throw new Error('Failed to fetch video info');
        
        const data = await response.json();
        
        const newSong = {
            id: Date.now().toString(),
            title: data.title,
            thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            url: `https://www.youtube.com/watch?v=${videoId}`
        };
        
        songs.push(newSong);
        saveData();
        renderSongs();
        closeAddSongDialog();
        showToast('Song added successfully!');
    } catch (error) {
        alert('Failed to add song. Please check the URL and try again.');
    }
}

// Render Songs
function renderSongs() {
    const grid = document.getElementById('songs-grid');
    const emptyState = document.getElementById('empty-state');
    
    const filteredSongs = selectedPlaylistId 
        ? songs.filter(song => {
            const playlist = playlists.find(p => p.id === selectedPlaylistId);
            return playlist?.songIds?.includes(song.id);
        })
        : songs;
    
    if (filteredSongs.length === 0) {
        grid.innerHTML = '';
        emptyState.classList.add('show');
    } else {
        emptyState.classList.remove('show');
        grid.innerHTML = filteredSongs.map(song => `
            <div class="song-card">
                <div class="song-card-image">
                    <img src="${song.thumbnail}" alt="${song.title}">
                    <div class="song-card-overlay">
                        <button class="play-btn" onclick="addToQueue('${song.id}')">➕</button>
                    </div>
                    <button class="delete-btn" onclick="deleteSong('${song.id}')">🗑️</button>
                </div>
                <div class="song-card-info">
                    <div class="song-card-title">${song.title}</div>
                </div>
            </div>
        `).join('');
    }
}

function deleteSong(id) {
    songs = songs.filter(s => s.id !== id);
    queue = queue.filter(s => s.id !== id);
    saveData();
    renderSongs();
    renderQueue();
    showToast('Song deleted');
}

// Playlist Dialog
function openPlaylistDialog() {
    document.getElementById('playlist-dialog').classList.add('show');
    renderPlaylists();
}

function closePlaylistDialog() {
    document.getElementById('playlist-dialog').classList.remove('show');
}

function createPlaylist() {
    const name = document.getElementById('new-playlist-name').value.trim();
    
    if (!name) {
        alert('Please enter a playlist name');
        return;
    }
    
    const newPlaylist = {
        id: Date.now().toString(),
        name,
        songIds: []
    };
    
    playlists.push(newPlaylist);
    saveData();
    renderPlaylists();
    document.getElementById('new-playlist-name').value = '';
    showToast('Playlist created!');
}

function renderPlaylists() {
    const list = document.getElementById('playlists-list');
    
    list.innerHTML = `
        <div class="playlist-item">
            <button class="playlist-btn ${selectedPlaylistId === null ? 'active' : ''}" 
                    onclick="selectPlaylist(null)">
                📋 All Songs
                <span>${songs.length}</span>
            </button>
        </div>
        ${playlists.map(playlist => `
            <div class="playlist-item">
                <button class="playlist-btn ${selectedPlaylistId === playlist.id ? 'active' : ''}" 
                        onclick="selectPlaylist('${playlist.id}')">
                    📋 ${playlist.name}
                    <span>${playlist.songIds?.length || 0}</span>
                </button>
                <button class="playlist-delete" onclick="deletePlaylist('${playlist.id}')">🗑️</button>
            </div>
        `).join('')}
    `;
}

function selectPlaylist(id) {
    selectedPlaylistId = id;
    renderSongs();
    renderPlaylists();
}

function deletePlaylist(id) {
    playlists = playlists.filter(p => p.id !== id);
    if (selectedPlaylistId === id) selectedPlaylistId = null;
    saveData();
    renderPlaylists();
    renderSongs();
    showToast('Playlist deleted');
}

// Queue Management
function addToQueue(songId) {
    const song = songs.find(s => s.id === songId);
    if (song) {
        queue.push(song);
        if (currentIndex === -1) currentIndex = 0;
        renderQueue();
        updateQueueCount();
        showToast('Added to queue');
        
        if (queue.length === 1) {
            loadVideo();
        }
    }
}

function playAll() {
    const filteredSongs = selectedPlaylistId 
        ? songs.filter(song => {
            const playlist = playlists.find(p => p.id === selectedPlaylistId);
            return playlist?.songIds?.includes(song.id);
        })
        : songs;
    
    if (filteredSongs.length === 0) {
        alert('No songs to play');
        return;
    }
    
    queue = [...filteredSongs];
    currentIndex = 0;
    renderQueue();
    updateQueueCount();
    loadVideo();
    showToast('Playing all songs');
}

function removeFromQueue(index) {
    queue.splice(index, 1);
    if (index < currentIndex) currentIndex--;
    if (index === currentIndex && queue.length > 0) {
        loadVideo();
    }
    renderQueue();
    updateQueueCount();
}

function playAtIndex(index) {
    currentIndex = index;
    loadVideo();
}

function toggleShuffle() {
    const shuffleBtn = document.getElementById('shuffle-btn');
    
    if (!isShuffled) {
        originalQueue = [...queue];
        const currentSong = queue[currentIndex];
        const otherSongs = queue.filter((_, idx) => idx !== currentIndex);
        
        for (let i = otherSongs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [otherSongs[i], otherSongs[j]] = [otherSongs[j], otherSongs[i]];
        }
        
        queue = currentIndex >= 0 ? [currentSong, ...otherSongs] : otherSongs;
        currentIndex = currentIndex >= 0 ? 0 : -1;
        isShuffled = true;
        shuffleBtn.classList.add('active');
    } else {
        const currentSong = queue[currentIndex];
        queue = originalQueue;
        currentIndex = queue.findIndex(s => s.id === currentSong?.id);
        isShuffled = false;
        shuffleBtn.classList.remove('active');
    }
    
    renderQueue();
}

function renderQueue() {
    const list = document.getElementById('queue-list');
    
    if (queue.length === 0) {
        list.innerHTML = `
            <div style="text-align: center; padding: 3rem 1rem; color: var(--text-secondary);">
                <div style="font-size: 3rem; margin-bottom: 0.5rem; opacity: 0.5;">📋</div>
                <p>No songs in queue</p>
            </div>
        `;
    } else {
        list.innerHTML = queue.map((song, index) => `
            <div class="queue-item ${index === currentIndex ? 'playing' : ''}" 
                 onclick="playAtIndex(${index})">
                <span class="queue-item-drag">⋮⋮</span>
                <span class="queue-item-index">${index + 1}</span>
                <img src="${song.thumbnail}" alt="${song.title}">
                <div class="queue-item-info">
                    <div class="queue-item-title">${song.title}</div>
                    ${index === currentIndex ? '<div class="queue-item-status">Now Playing</div>' : ''}
                </div>
                <button class="queue-item-delete" onclick="event.stopPropagation(); removeFromQueue(${index})">🗑️</button>
            </div>
        `).join('');
    }
}

function updateQueueCount() {
    document.getElementById('queue-count').textContent = queue.length;
    document.getElementById('sidebar-queue-count').textContent = `${queue.length} ${queue.length === 1 ? 'song' : 'songs'}`;
}

function toggleQueue() {
    document.getElementById('queue-sidebar').classList.toggle('open');
}

// Player Controls
function loadVideo() {
    if (currentIndex < 0 || currentIndex >= queue.length) return;
    
    const song = queue[currentIndex];
    const videoId = extractVideoId(song.url);
    
    document.getElementById('player-thumbnail').src = song.thumbnail;
    document.getElementById('player-title').textContent = song.title;
    document.getElementById('music-player').classList.remove('hidden');
    
    if (!player) {
        player = new YT.Player('youtube-player', {
            height: '0',
            width: '0',
            videoId: videoId,
            playerVars: {
                autoplay: 1
            },
            events: {
                onReady: onPlayerReady,
                onStateChange: onPlayerStateChange
            }
        });
    } else {
        player.loadVideoById(videoId);
        isPlaying = true;
        updatePlayButton();
    }
    
    renderQueue();
}

function onPlayerReady(event) {
    event.target.setVolume(volume);
    isPlaying = true;
    updatePlayButton();
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
        playNext();
    } else if (event.data === YT.PlayerState.PLAYING) {
        isPlaying = true;
        updatePlayButton();
    } else if (event.data === YT.PlayerState.PAUSED) {
        isPlaying = false;
        updatePlayButton();
    }
}

function togglePlayPause() {
    if (!player) return;
    
    if (isPlaying) {
        player.pauseVideo();
    } else {
        player.playVideo();
    }
}

function updatePlayButton() {
    const btn = document.getElementById('play-pause-btn');
    btn.textContent = isPlaying ? '⏸️' : '▶️';
}

function playNext() {
    if (currentIndex < queue.length - 1) {
        currentIndex++;
        loadVideo();
    }
}

function playPrevious() {
    if (currentIndex > 0) {
        currentIndex--;
        loadVideo();
    }
}

function changeVolume(value) {
    volume = parseInt(value);
    if (player) {
        player.setVolume(volume);
    }
    if (volume > 0 && isMuted) {
        isMuted = false;
        player.unMute();
    }
    updateVolumeIcon();
}

function toggleMute() {
    if (!player) return;
    
    if (isMuted) {
        player.unMute();
        player.setVolume(volume);
        isMuted = false;
    } else {
        player.mute();
        isMuted = true;
    }
    updateVolumeIcon();
}

function updateVolumeIcon() {
    const icon = document.getElementById('volume-icon');
    icon.textContent = (isMuted || volume === 0) ? '🔇' : '🔊';
}

// Toast notifications
function showToast(message) {
    // Simple toast - you can enhance this
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 150px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--bg-card);
        color: var(--text-primary);
        padding: 1rem 2rem;
        border-radius: 0.5rem;
        border: 1px solid var(--border);
        z-index: 1000;
        animation: slideUp 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideDown 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

// Add animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideUp {
        from { transform: translate(-50%, 100%); opacity: 0; }
        to { transform: translate(-50%, 0); opacity: 1; }
    }
    @keyframes slideDown {
        from { transform: translate(-50%, 0); opacity: 1; }
        to { transform: translate(-50%, 100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Initialize
loadData();

// Close dialogs on background click
document.getElementById('add-song-dialog').addEventListener('click', (e) => {
    if (e.target.id === 'add-song-dialog') closeAddSongDialog();
});

document.getElementById('playlist-dialog').addEventListener('click', (e) => {
    if (e.target.id === 'playlist-dialog') closePlaylistDialog();
});

// Enter key to add song
document.getElementById('youtube-url').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addSong();
});

document.getElementById('new-playlist-name').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') createPlaylist();
});
