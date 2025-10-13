import { useState, useEffect } from "react";
import { Music2 } from "lucide-react";
import { SongCard } from "@/components/SongCard";
import { AddSongDialog } from "@/components/AddSongDialog";
import { PlaylistManager } from "@/components/PlaylistManager";

interface Song {
  id: string;
  title: string;
  thumbnail: string;
  url: string;
}

interface Playlist {
  id: string;
  name: string;
  songIds: string[];
}

const Index = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);

  // Load from localStorage
  useEffect(() => {
    const savedSongs = localStorage.getItem("musicPlayerSongs");
    const savedPlaylists = localStorage.getItem("musicPlayerPlaylists");
    
    if (savedSongs) setSongs(JSON.parse(savedSongs));
    if (savedPlaylists) setPlaylists(JSON.parse(savedPlaylists));
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem("musicPlayerSongs", JSON.stringify(songs));
  }, [songs]);

  useEffect(() => {
    localStorage.setItem("musicPlayerPlaylists", JSON.stringify(playlists));
  }, [playlists]);

  const handleAddSong = (songData: { title: string; thumbnail: string; url: string }) => {
    const newSong: Song = {
      id: Date.now().toString(),
      ...songData,
    };
    setSongs([...songs, newSong]);
  };

  const handleDeleteSong = (id: string) => {
    setSongs(songs.filter((song) => song.id !== id));
    if (currentlyPlayingId === id) {
      setCurrentlyPlayingId(null);
    }
  };

  const handleCreatePlaylist = (name: string) => {
    const newPlaylist: Playlist = {
      id: Date.now().toString(),
      name,
      songIds: [],
    };
    setPlaylists([...playlists, newPlaylist]);
  };

  const handleDeletePlaylist = (id: string) => {
    setPlaylists(playlists.filter((playlist) => playlist.id !== id));
    if (selectedPlaylistId === id) {
      setSelectedPlaylistId(null);
    }
  };

  const filteredSongs = selectedPlaylistId
    ? songs.filter((song) => {
        const playlist = playlists.find((p) => p.id === selectedPlaylistId);
        return playlist?.songIds.includes(song.id);
      })
    : songs;

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <div className="p-3 rounded-2xl gradient-primary glow-primary">
              <Music2 className="h-10 w-10" />
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Music Player
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Add songs from YouTube and create your perfect playlists
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-center gap-4">
          <AddSongDialog onAddSong={handleAddSong} />
          <PlaylistManager
            playlists={playlists}
            onCreatePlaylist={handleCreatePlaylist}
            onDeletePlaylist={handleDeletePlaylist}
            onSelectPlaylist={setSelectedPlaylistId}
            selectedPlaylistId={selectedPlaylistId}
          />
        </div>

        {/* Songs Grid */}
        {filteredSongs.length === 0 ? (
          <div className="text-center py-20">
            <Music2 className="h-20 w-20 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-2xl font-semibold text-muted-foreground mb-2">
              No songs yet
            </h3>
            <p className="text-muted-foreground">
              Add your first song to get started!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredSongs.map((song) => (
              <SongCard
                key={song.id}
                song={song}
                isPlaying={currentlyPlayingId === song.id}
                onPlay={() => {
                  if (currentlyPlayingId === song.id) {
                    setCurrentlyPlayingId(null);
                  } else {
                    setCurrentlyPlayingId(song.id);
                    window.open(song.url, "_blank");
                  }
                }}
                onDelete={() => handleDeleteSong(song.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
