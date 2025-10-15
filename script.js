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
let wakeLock = null;
let currentSongForPlaylist = null;
let playHistory = []; // Track listening history

// YouTube API Key
const YOUTUBE_API_KEY = 'AIzaSyDYw7fqVMXpQgJHxXQZJxZCOzZvBtR8cGU';

// Wake Lock API
async function requestWakeLock() {
    if ('wakeLock' in navigator) {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
            wakeLock.addEventListener('release', () => {
                console.log('Wake Lock released');
            });
        } catch (err) {
            console.error('Wake Lock error:', err);
        }
    }
}

function releaseWakeLock() {
    if (wakeLock !== null) {
        wakeLock.release();
        wakeLock = null;
    }
}

// Load data from localStorage
function loadData() {
    const savedSongs = localStorage.getItem('musicPlayerSongs');
    const savedPlaylists = localStorage.getItem('musicPlayerPlaylists');
    const savedHistory = localStorage.getItem('musicPlayerHistory');
    
    if (savedSongs) songs = JSON.parse(savedSongs);
    if (savedPlaylists) playlists = JSON.parse(savedPlaylists);
    if (savedHistory) playHistory = JSON.parse(savedHistory);
    
    renderSongs();
    renderRecommended();
    renderSidebarPlaylists();
    renderPlaylists();
}

// Save data
function saveData() {
    localStorage.setItem('musicPlayerSongs', JSON.stringify(songs));
    localStorage.setItem('musicPlayerPlaylists', JSON.stringify(playlists));
    localStorage.setItem('musicPlayerHistory', JSON.stringify(playHistory));
}

// Track play history
function trackPlay(songId) {
    const existingIndex = playHistory.findIndex(h => h.songId === songId);
    if (existingIndex > -1) {
        playHistory[existingIndex].count++;
        playHistory[existingIndex].lastPlayed = Date.now();
    } else {
        playHistory.push({
            songId,
            count: 1,
            lastPlayed: Date.now()
        });
    }
    saveData();
}

// Get recommended songs
function getRecommendedSongs() {
    if (songs.length === 0) return [];
    
    // Sort by play count
    const sortedHistory = [...playHistory]
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    
    const recommendedIds = new Set(sortedHistory.map(h => h.songId));
    const recommended = songs.filter(s => recommendedIds.has(s.id));
    
    // If not enough, add recently added songs
    if (recommended.length < 6) {
        const remaining = songs
            .filter(s => !recommendedIds.has(s.id))
            .slice(-6 + recommended.length);
        return [...recommended, ...remaining];
    }
    
    return recommended.slice(0, 6);
}

// Extract YouTube video ID
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

// View Management
function showView(viewName) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`${viewName}-view`).classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    
    if (viewName === 'library') {
        renderLibrary();
    }
}

// Render Library
function renderLibrary() {
    const grid = document.getElementById('library-grid');
    grid.innerHTML = songs.map(song => createSongCard(song)).join('');
}

// Create Song Card
function createSongCard(song) {
    return `
        <div class="song-card">
            <div class="card-actions">
                <button class="card-action-btn" onclick="openAddToPlaylistDialog('${song.id}')" title="Add to playlist">+</button>
                <button class="card-action-btn" onclick="deleteSong('${song.id}')" title="Delete">×</button>
            </div>
            <div class="song-card-image">
                <img src="${song.thumbnail}" alt="${song.title}">
                <div class="song-card-overlay">
                    <button class="play-btn-card" onclick="playNow('${song.id}')">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5.14v14l11-7-11-7z"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="song-card-info">
                <div class="song-card-title">${song.title}</div>
                <div class="song-card-artist">Song</div>
            </div>
        </div>
    `;
}

// Render Recommended
function renderRecommended() {
    const section = document.getElementById('recommended-section');
    const grid = document.getElementById('recommended-grid');
    const recommended = getRecommendedSongs();
    
    if (recommended.length === 0) {
        section.style.display = 'none';
        return;
    }
    
    section.style.display = 'block';
    grid.innerHTML = recommended.map(song => createSongCard(song)).join('');
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
    
    if (songs.length === 0) {
        grid.innerHTML = '';
        emptyState.classList.add('show');
    } else {
        emptyState.classList.remove('show');
        grid.innerHTML = filteredSongs.map(song => createSongCard(song)).join('');
    }
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
        
        if (selectedPlaylistId !== null) {
            const playlist = playlists.find(p => p.id === selectedPlaylistId);
            if (playlist && !playlist.songIds.includes(newSong.id)) {
                playlist.songIds.push(newSong.id);
            }
        }
        
        saveData();
        renderSongs();
        renderRecommended();
        closeAddSongDialog();
        showToast('Song added successfully!');
    } catch (error) {
        alert('Failed to add song. Please check the URL and try again.');
    }
}

// Search Dialog
function openSearchDialog() {
    document.getElementById('search-dialog').classList.add('show');
    setTimeout(() => {
        document.getElementById('search-query').focus();
    }, 100);
}

function closeSearchDialog() {
    document.getElementById('search-dialog').classList.remove('show');
    document.getElementById('search-query').value = '';
    document.getElementById('search-results').innerHTML = '';
}

async function searchYouTube() {
    const query = document.getElementById('search-query').value.trim();
    
    if (!query) {
        document.getElementById('search-results').innerHTML = '';
        return;
    }
    
    const resultsDiv = document.getElementById('search-results');
    resultsDiv.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">Searching...</p>';
    
    try {
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=20&q=${encodeURIComponent(query)}&type=video&key=${YOUTUBE_API_KEY}`
        );
        
        if (!response.ok) throw new Error('Search failed');
        
        const data = await response.json();
        
        if (data.items.length === 0) {
            resultsDiv.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">No results found</p>';
            return;
        }
        
        resultsDiv.innerHTML = data.items.map(item => `
            <div class="search-result-item" onclick="addSearchResult('${item.id.videoId}', \`${item.snippet.title.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`)">
                <img src="${item.snippet.thumbnails.medium.url}" alt="${item.snippet.title}">
                <div class="search-result-info">
                    <div class="search-result-title">${item.snippet.title}</div>
                    <div class="search-result-channel">${item.snippet.channelTitle}</div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Search error:', error);
        resultsDiv.innerHTML = '<p style="text-align: center; color: #e22134; padding: 40px;">Search failed. Please try again.</p>';
    }
}

// Auto-search as user types
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-query');
    let searchTimeout;
    
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchYouTube();
        }, 500);
    });
});

function addSearchResult(videoId, title) {
    const newSong = {
        id: Date.now().toString(),
        title: title,
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        url: `https://www.youtube.com/watch?v=${videoId}`
    };
    
    songs.push(newSong);
    
    if (selectedPlaylistId !== null) {
        const playlist = playlists.find(p => p.id === selectedPlaylistId);
        if (playlist && !playlist.songIds.includes(newSong.id)) {
            playlist.songIds.push(newSong.id);
        }
    }
    
    saveData();
    renderSongs();
    renderRecommended();
    closeSearchDialog();
    showToast('Song added successfully!');
}

function deleteSong(id) {
    songs = songs.filter(s => s.id !== id);
    queue = queue.filter(s => s.id !== id);
    playHistory = playHistory.filter(h => h.songId !== id);
    
    playlists.forEach(playlist => {
        playlist.songIds = playlist.songIds.filter(songId => songId !== id);
    });
    
    saveData();
    renderSongs();
    renderRecommended();
    renderQueue();
    showToast('Song deleted');
}

// Play song immediately
function playNow(songId) {
    const song = songs.find(s => s.id === songId);
    if (song) {
        queue = [song];
        currentIndex = 0;
        renderQueue();
        updateQueueCount();
        loadVideo();
        trackPlay(songId);
    }
}

// Playlist Management
function openAddToPlaylistDialog(songId) {
    currentSongForPlaylist = songId;
    const dialog = document.getElementById('add-to-playlist-dialog');
    const list = document.getElementById('available-playlists');
    
    list.innerHTML = playlists.map(playlist => {
        const hasSong = playlist.songIds.includes(songId);
        return `
            <div class="playlist-item">
                <button class="playlist-btn ${hasSong ? 'active' : ''}" 
                        onclick="toggleSongInPlaylist('${playlist.id}', '${songId}')">
                    ${playlist.name}
                    ${hasSong ? '<span>✓</span>' : '<span>Add</span>'}
                </button>
            </div>
        `;
    }).join('');
    
    dialog.classList.add('show');
}

function closeAddToPlaylistDialog() {
    document.getElementById('add-to-playlist-dialog').classList.remove('show');
    currentSongForPlaylist = null;
}

function toggleSongInPlaylist(playlistId, songId) {
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return;
    
    const index = playlist.songIds.indexOf(songId);
    if (index > -1) {
        playlist.songIds.splice(index, 1);
        showToast('Removed from playlist');
    } else {
        playlist.songIds.push(songId);
        showToast('Added to playlist');
    }
    
    saveData();
    openAddToPlaylistDialog(songId);
}

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
    renderSidebarPlaylists();
    document.getElementById('new-playlist-name').value = '';
    showToast('Playlist created!');
}

function renderPlaylists() {
    const list = document.getElementById('playlists-list');
    
    list.innerHTML = playlists.map(playlist => `
        <div class="playlist-item">
            <button class="playlist-btn ${selectedPlaylistId === playlist.id ? 'active' : ''}" 
                    onclick="selectPlaylist('${playlist.id}')">
                ${playlist.name}
                <span>${playlist.songIds?.length || 0} songs</span>
            </button>
            <button class="playlist-delete" onclick="deletePlaylist('${playlist.id}')">Delete</button>
        </div>
    `).join('');
}

function renderSidebarPlaylists() {
    const container = document.getElementById('sidebar-playlists');
    
    container.innerHTML = playlists.map(playlist => `
        <button class="playlist-sidebar-item ${selectedPlaylistId === playlist.id ? 'active' : ''}" 
                onclick="selectPlaylist('${playlist.id}')">
            ${playlist.name}
        </button>
    `).join('');
}

function selectPlaylist(id) {
    selectedPlaylistId = id;
    showView('home');
    renderSongs();
    renderPlaylists();
    renderSidebarPlaylists();
    
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
}

function deletePlaylist(id) {
    playlists = playlists.filter(p => p.id !== id);
    if (selectedPlaylistId === id) selectedPlaylistId = null;
    saveData();
    renderPlaylists();
    renderSidebarPlaylists();
    renderSongs();
    showToast('Playlist deleted');
}

// Queue Management
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
    } else if (queue.length === 0) {
        currentIndex = -1;
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
            <div style="text-align: center; padding: 60px 20px; color: var(--text-secondary);">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 16px; opacity: 0.5;">
                    <path d="M15 15H1v-1.5h14V15zm0-4.5H1V9h14v1.5zm-14-7A2.5 2.5 0 0 1 3.5 1h9a2.5 2.5 0 0 1 0 5h-9A2.5 2.5 0 0 1 1 3.5z"/>
                </svg>
                <p>No songs in queue</p>
            </div>
        `;
    } else {
        list.innerHTML = queue.map((song, index) => `
            <div class="queue-item ${index === currentIndex ? 'playing' : ''}" 
                 onclick="playAtIndex(${index})">
                <span class="queue-item-index">${index + 1}</span>
                <img src="${song.thumbnail}" alt="${song.title}">
                <div class="queue-item-info">
                    <div class="queue-item-title">${song.title}</div>
                </div>
                <button class="queue-item-delete" onclick="event.stopPropagation(); removeFromQueue(${index})">×</button>
            </div>
        `).join('');
    }
}

function updateQueueCount() {
    // Queue count is not displayed in this version
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
    document.getElementById('player-artist').textContent = 'Song';
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
        player.playVideo();
        isPlaying = true;
        updatePlayButton();
    }
    
    trackPlay(song.id);
    renderQueue();
}

function onPlayerReady(event) {
    event.target.setVolume(volume);
    event.target.playVideo();
    isPlaying = true;
    updatePlayButton();
    requestWakeLock();
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
        playNext();
    } else if (event.data === YT.PlayerState.PLAYING) {
        isPlaying = true;
        updatePlayButton();
        requestWakeLock();
    } else if (event.data === YT.PlayerState.PAUSED) {
        isPlaying = false;
        updatePlayButton();
        releaseWakeLock();
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
    const icon = document.getElementById('play-icon');
    if (isPlaying) {
        icon.innerHTML = '<path d="M3 1.713a.7.7 0 0 1 1.05-.607l10.89 6.288a.7.7 0 0 1 0 1.212L4.05 14.894A.7.7 0 0 1 3 14.286V1.713z"/>';
    } else {
        icon.innerHTML = '<path d="M5.7 3a.7.7 0 0 0-.7.7v8.6a.7.7 0 0 0 .7.7h1.6a.7.7 0 0 0 .7-.7V3.7a.7.7 0 0 0-.7-.7H5.7zm2.8 0a.7.7 0 0 0-.7.7v8.6a.7.7 0 0 0 .7.7h1.6a.7.7 0 0 0 .7-.7V3.7a.7.7 0 0 0-.7-.7H8.5z"/>';
    }
}

function playNext() {
    if (currentIndex < queue.length - 1) {
        currentIndex++;
        loadVideo();
    } else {
        releaseWakeLock();
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
    if (isMuted || volume === 0) {
        icon.innerHTML = '<path d="M13.86 5.47a.75.75 0 0 0-1.061 0l-1.47 1.47-1.47-1.47A.75.75 0 0 0 8.8 6.53L10.269 8l-1.47 1.47a.75.75 0 1 0 1.06 1.06l1.47-1.47 1.47 1.47a.75.75 0 0 0 1.06-1.06L12.39 8l1.47-1.47a.75.75 0 0 0 0-1.06z"/><path d="M10.116 1.5A.75.75 0 0 0 8.991.85l-6.925 4a3.642 3.642 0 0 0-1.33 4.967 3.639 3.639 0 0 0 1.33 1.332l6.925 4a.75.75 0 0 0 1.125-.649v-1.906a4.73 4.73 0 0 1-1.5-.694v1.3L2.817 9.852a2.141 2.141 0 0 1-.781-2.92c.187-.324.456-.594.78-.782l5.8-3.35v1.3c.45-.313.956-.55 1.5-.694V1.5z"/>';
    } else {
        icon.innerHTML = '<path d="M9.741.85a.75.75 0 0 1 .375.65v13a.75.75 0 0 1-1.125.65l-6.925-4a3.642 3.642 0 0 1-1.33-4.967 3.639 3.639 0 0 1 1.33-1.332l6.925-4a.75.75 0 0 1 .75 0zm-6.924 5.3a2.139 2.139 0 0 0 0 3.7l5.8 3.35V2.8l-5.8 3.35zm8.683 4.29V5.56a2.75 2.75 0 0 1 0 4.88z"/><path d="M11.5 13.614a5.752 5.752 0 0 0 0-11.228v1.55a4.252 4.252 0 0 1 0 8.127v1.55z"/>';
    }
}

// Toast notifications
function showToast(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 120px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--bg-card);
        color: var(--text-primary);
        padding: 12px 24px;
        border-radius: 24px;
        z-index: 1000;
        font-size: 14px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.5);
        animation: slideUp 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideDown 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

// Animations
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

document.getElementById('search-dialog').addEventListener('click', (e) => {
    if (e.target.id === 'search-dialog') closeSearchDialog();
});

document.getElementById('playlist-dialog').addEventListener('click', (e) => {
    if (e.target.id === 'playlist-dialog') closePlaylistDialog();
});

document.getElementById('add-to-playlist-dialog').addEventListener('click', (e) => {
    if (e.target.id === 'add-to-playlist-dialog') closeAddToPlaylistDialog();
});

// Enter key handlers
document.getElementById('youtube-url').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addSong();
});

document.getElementById('new-playlist-name').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') createPlaylist();
});

// Wake lock management
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        releaseWakeLock();
    } else if (isPlaying) {
        requestWakeLock();
    }
});