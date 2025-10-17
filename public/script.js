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
let playHistory = [];
let wakeLock = null;

// Wake Lock API
async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log('Wake Lock is active');
        }
    } catch (err) {
        console.error('Wake Lock error:', err);
    }
}

function releaseWakeLock() {
    if (wakeLock) {
        wakeLock.release();
        wakeLock = null;
        console.log('Wake Lock released');
    }
}

// Load data from localStorage on startup
function loadData() {
    const savedSongs = localStorage.getItem('musicPlayerSongs');
    const savedPlaylists = localStorage.getItem('musicPlayerPlaylists');
    const savedHistory = localStorage.getItem('playHistory');
    
    if (savedSongs) songs = JSON.parse(savedSongs);
    if (savedPlaylists) playlists = JSON.parse(savedPlaylists);
    if (savedHistory) playHistory = JSON.parse(savedHistory);
    
    renderSongs();
    renderPlaylists();
}

// Save data to localStorage
function saveData() {
    localStorage.setItem('musicPlayerSongs', JSON.stringify(songs));
    localStorage.setItem('musicPlayerPlaylists', JSON.stringify(playlists));
    localStorage.setItem('playHistory', JSON.stringify(playHistory));
}

// Track play history
function trackPlay(songId) {
    const existing = playHistory.find(h => h.songId === songId);
    if (existing) {
        existing.count++;
        existing.lastPlayed = Date.now();
    } else {
        playHistory.push({ songId, count: 1, lastPlayed: Date.now() });
    }
    saveData();
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

// Search Dialog
function openSearchDialog() {
    document.getElementById('search-dialog').classList.add('show');
    document.getElementById('search-input').focus();
}

function closeSearchDialog() {
    document.getElementById('search-dialog').classList.remove('show');
    document.getElementById('search-input').value = '';
    document.getElementById('search-results').innerHTML = '';
}

let searchTimeout;
async function searchSongs() {
    clearTimeout(searchTimeout);
    const query = document.getElementById('search-input').value.trim();
    const resultsDiv = document.getElementById('search-results');
    
    if (!query) {
        resultsDiv.innerHTML = '';
        return;
    }
    
    resultsDiv.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-secondary);">Searching...</div>';
    
    searchTimeout = setTimeout(async () => {
        try {
            const response = await fetch(`${window.location.origin}/functions/v1/spotify-search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });
            
            if (!response.ok) throw new Error('Search failed');
            
            const data = await response.json();
            
            if (data.tracks.length === 0) {
                resultsDiv.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-secondary);">No results found</div>';
                return;
            }
            
            resultsDiv.innerHTML = data.tracks.map(track => `
                <div class="search-result-item">
                    <img src="${track.thumbnail}" alt="${track.title}">
                    <div class="search-result-info">
                        <div class="search-result-title">${track.title}</div>
                        <div class="search-result-artist">${track.artistName}</div>
                    </div>
                    <button class="action-btn" onclick='addSearchResult(${JSON.stringify(track).replace(/'/g, "&#39;")})'>
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                        </svg>
                    </button>
                </div>
            `).join('');
        } catch (error) {
            console.error('Search error:', error);
            resultsDiv.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-secondary);">Search failed. Please try again.</div>';
        }
    }, 500);
}

function addSearchResult(track) {
    const newSong = {
        id: Date.now().toString() + Math.random(),
        title: track.title,
        thumbnail: track.thumbnail,
        url: track.url,
        previewUrl: track.previewUrl,
        spotifyUri: track.spotifyUri,
        isSpotify: true
    };
    
    songs.push(newSong);
    saveData();
    renderSongs();
    showToast('Song added!');
    closeSearchDialog();
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
        grid.innerHTML = filteredSongs.map((song, index) => `
            <div class="song-card" style="animation-delay: ${index * 0.05}s">
                <div class="song-card-image">
                    <img src="${song.thumbnail}" alt="${song.title}">
                    <div class="song-card-overlay">
                        <button class="play-btn" onclick="addToQueue('${song.id}')">
                            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                                <path d="M8 5v14l11-7z"/>
                            </svg>
                        </button>
                    </div>
                    <div class="song-card-actions">
                        <button class="action-btn" onclick="event.stopPropagation(); addToQueue('${song.id}')" title="Add to queue">
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                            </svg>
                        </button>
                        <button class="action-btn" onclick="event.stopPropagation(); openAddToPlaylistDialog('${song.id}')" title="Add to playlist">
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>
                            </svg>
                        </button>
                        <button class="action-btn delete" onclick="event.stopPropagation(); deleteSong('${song.id}')" title="Delete">
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="song-card-info">
                    <div class="song-card-title">${song.title}</div>
                </div>
            </div>
        `).join('');
    }
}

// Add song to playlist dialog
function openAddToPlaylistDialog(songId) {
    const dialog = document.getElementById('add-to-playlist-dialog');
    const list = document.getElementById('add-to-playlist-list');
    
    dialog.dataset.songId = songId;
    
    list.innerHTML = playlists.map(playlist => {
        const isInPlaylist = playlist.songIds?.includes(songId);
        return `
            <button class="playlist-toggle-btn ${isInPlaylist ? 'active' : ''}" 
                    onclick="toggleSongInPlaylist('${playlist.id}', '${songId}')">
                ${playlist.name}
                <span>${isInPlaylist ? '✓' : '+'}</span>
            </button>
        `;
    }).join('');
    
    dialog.classList.add('show');
}

function closeAddToPlaylistDialog() {
    document.getElementById('add-to-playlist-dialog').classList.remove('show');
}

function toggleSongInPlaylist(playlistId, songId) {
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return;
    
    if (!playlist.songIds) playlist.songIds = [];
    
    const index = playlist.songIds.indexOf(songId);
    const button = event.target.closest('.playlist-toggle-btn');
    
    if (index > -1) {
        playlist.songIds.splice(index, 1);
        showToast('✓ Removed from playlist');
        if (button) {
            button.style.animation = 'shake 0.3s ease-out';
            setTimeout(() => button.style.animation = '', 300);
        }
    } else {
        playlist.songIds.push(songId);
        showToast('✓ Added to playlist');
        if (button) {
            button.style.animation = 'pop-in 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
            setTimeout(() => button.style.animation = '', 400);
        }
    }
    
    saveData();
    openAddToPlaylistDialog(songId); // Refresh the dialog
    renderPlaylists();
}

function deleteSong(id) {
    songs = songs.filter(s => s.id !== id);
    queue = queue.filter(s => s.id !== id);
    
    // Remove from all playlists
    playlists.forEach(playlist => {
        if (playlist.songIds) {
            playlist.songIds = playlist.songIds.filter(sid => sid !== id);
        }
    });
    
    saveData();
    renderSongs();
    renderQueue();
    renderPlaylists();
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
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                        <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>
                    </svg>
                    <span>All Songs</span>
                </div>
                <span>${songs.length}</span>
            </button>
        </div>
        ${playlists.map(playlist => `
            <div class="playlist-item">
                <button class="playlist-btn ${selectedPlaylistId === playlist.id ? 'active' : ''}" 
                        onclick="selectPlaylist('${playlist.id}')">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                            <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>
                        </svg>
                        <span>${playlist.name}</span>
                    </div>
                    <span>${playlist.songIds?.length || 0}</span>
                </button>
                <button class="playlist-delete" onclick="deletePlaylist('${playlist.id}')">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                </button>
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
                <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor" style="opacity: 0.5; margin-bottom: 0.5rem;">
                    <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>
                </svg>
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
                <button class="queue-item-delete" onclick="event.stopPropagation(); removeFromQueue(${index})">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                </button>
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
    trackPlay(song.id);
    requestWakeLock();
    
    document.getElementById('player-thumbnail').src = song.thumbnail;
    document.getElementById('player-title').textContent = song.title;
    document.getElementById('music-player').classList.remove('hidden');
    
    // If it's a Spotify track with preview
    if (song.isSpotify && song.previewUrl) {
        playSpotifyPreview(song.previewUrl);
    } else {
        // Try YouTube
        const videoId = extractVideoId(song.url);
        if (!videoId && !song.isSpotify) {
            showToast('Cannot play this song');
            return;
        }
        
        if (!player && videoId) {
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
        } else if (player && videoId) {
            player.loadVideoById(videoId);
            isPlaying = true;
            updatePlayButton();
        }
    }
    
    renderQueue();
}

let audioElement = null;

function playSpotifyPreview(previewUrl) {
    // Stop YouTube if playing
    if (player) {
        try { player.pauseVideo(); } catch (e) {}
    }
    
    // Create or reuse audio element
    if (!audioElement) {
        audioElement = new Audio();
        audioElement.onended = () => playNext();
        audioElement.onplay = () => {
            isPlaying = true;
            updatePlayButton();
        };
        audioElement.onpause = () => {
            isPlaying = false;
            updatePlayButton();
        };
    }
    
    audioElement.src = previewUrl;
    audioElement.volume = volume / 100;
    audioElement.play();
    isPlaying = true;
    updatePlayButton();
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
    if (audioElement && audioElement.src) {
        if (isPlaying) {
            audioElement.pause();
        } else {
            audioElement.play();
        }
    } else if (player) {
        if (isPlaying) {
            player.pauseVideo();
        } else {
            player.playVideo();
        }
    }
}

function updatePlayButton() {
    const btn = document.getElementById('play-pause-btn');
    btn.innerHTML = isPlaying 
        ? '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>'
        : '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
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
    
    if (audioElement) {
        audioElement.volume = volume / 100;
    }
    
    if (player) {
        player.setVolume(volume);
    }
    
    if (volume > 0 && isMuted) {
        isMuted = false;
        if (player) player.unMute();
        if (audioElement) audioElement.muted = false;
    }
    updateVolumeIcon();
}

function toggleMute() {
    if (isMuted) {
        if (player) {
            player.unMute();
            player.setVolume(volume);
        }
        if (audioElement) {
            audioElement.muted = false;
            audioElement.volume = volume / 100;
        }
        isMuted = false;
    } else {
        if (player) player.mute();
        if (audioElement) audioElement.muted = true;
        isMuted = true;
    }
    updateVolumeIcon();
}

function updateVolumeIcon() {
    const icon = document.getElementById('volume-icon');
    if (isMuted || volume === 0) {
        icon.innerHTML = '<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>';
    } else {
        icon.innerHTML = '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>';
    }
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
document.getElementById('search-input').addEventListener('input', searchSongs);

document.getElementById('new-playlist-name').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') createPlaylist();
});

// Load YouTube API
function loadYouTubeAPI() {
    if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
}

// Initialize
loadYouTubeAPI();
loadData();
renderSongs();
renderPlaylists();
updatePlayButton();
updateVolumeIcon();
updateQueueCount();

// Release wake lock when page is hidden
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        releaseWakeLock();
    } else if (isPlaying) {
        requestWakeLock();
    }
});
