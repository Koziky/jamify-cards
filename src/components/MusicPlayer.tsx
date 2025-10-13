import { useState, useRef, useEffect } from "react";
import YouTube, { YouTubeProps, YouTubePlayer } from "react-youtube";
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";

interface Song {
  id: string;
  title: string;
  thumbnail: string;
  url: string;
}

interface MusicPlayerProps {
  currentSong: Song | null;
  onNext: () => void;
  onPrevious: () => void;
  hasNext: boolean;
  hasPrevious: boolean;
  isShuffled: boolean;
  onToggleShuffle: () => void;
}

export const MusicPlayer = ({
  currentSong,
  onNext,
  onPrevious,
  hasNext,
  hasPrevious,
  isShuffled,
  onToggleShuffle,
}: MusicPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(50);
  const [isMuted, setIsMuted] = useState(false);
  const playerRef = useRef<YouTubePlayer | null>(null);

  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const opts: YouTubeProps['opts'] = {
    height: '0',
    width: '0',
    playerVars: {
      autoplay: 1,
    },
  };

  const onReady: YouTubeProps['onReady'] = (event) => {
    playerRef.current = event.target;
    event.target.setVolume(volume);
    setIsPlaying(true);
  };

  const onEnd: YouTubeProps['onEnd'] = () => {
    if (hasNext) {
      onNext();
    } else {
      setIsPlaying(false);
    }
  };

  const togglePlayPause = () => {
    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.pauseVideo();
      } else {
        playerRef.current.playVideo();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (playerRef.current) {
      playerRef.current.setVolume(newVolume);
    }
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    if (playerRef.current) {
      if (isMuted) {
        playerRef.current.unMute();
        playerRef.current.setVolume(volume);
      } else {
        playerRef.current.mute();
      }
      setIsMuted(!isMuted);
    }
  };

  useEffect(() => {
    setIsPlaying(true);
  }, [currentSong]);

  if (!currentSong) return null;

  const videoId = extractVideoId(currentSong.url);

  return (
    <Card className="fixed bottom-0 left-0 right-0 glass-bg border-t border-border/50 p-4 z-50">
      {videoId && (
        <YouTube
          videoId={videoId}
          opts={opts}
          onReady={onReady}
          onEnd={onEnd}
        />
      )}
      
      <div className="max-w-7xl mx-auto flex items-center gap-6">
        {/* Current Song Info */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <img
            src={currentSong.thumbnail}
            alt={currentSong.title}
            className="w-14 h-14 rounded-lg object-cover"
          />
          <div className="min-w-0 flex-1">
            <h4 className="font-semibold truncate">{currentSong.title}</h4>
            <p className="text-sm text-muted-foreground">Now Playing</p>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant={isShuffled ? "default" : "ghost"}
            onClick={onToggleShuffle}
            className={isShuffled ? "gradient-primary" : ""}
          >
            <Shuffle className="h-4 w-4" />
          </Button>
          
          <Button
            size="icon"
            variant="ghost"
            onClick={onPrevious}
            disabled={!hasPrevious}
          >
            <SkipBack className="h-5 w-5" />
          </Button>
          
          <Button
            size="icon"
            onClick={togglePlayPause}
            className="gradient-primary w-12 h-12"
          >
            {isPlaying ? (
              <Pause className="h-5 w-5 fill-current" />
            ) : (
              <Play className="h-5 w-5 fill-current ml-0.5" />
            )}
          </Button>
          
          <Button
            size="icon"
            variant="ghost"
            onClick={onNext}
            disabled={!hasNext}
          >
            <SkipForward className="h-5 w-5" />
          </Button>
        </div>

        {/* Volume Control */}
        <div className="flex items-center gap-2 w-32">
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleMute}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="h-5 w-5" />
            ) : (
              <Volume2 className="h-5 w-5" />
            )}
          </Button>
          <Slider
            value={[isMuted ? 0 : volume]}
            onValueChange={handleVolumeChange}
            max={100}
            step={1}
            className="flex-1"
          />
        </div>
      </div>
    </Card>
  );
};
