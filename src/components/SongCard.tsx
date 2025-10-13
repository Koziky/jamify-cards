import { Play, Pause, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Song {
  id: string;
  title: string;
  thumbnail: string;
  url: string;
}

interface SongCardProps {
  song: Song;
  isPlaying: boolean;
  onPlay: () => void;
  onDelete: () => void;
}

export const SongCard = ({ song, isPlaying, onPlay, onDelete }: SongCardProps) => {
  return (
    <Card className="group relative overflow-hidden border-border/50 gradient-card hover:border-primary/50 transition-all duration-300 hover:scale-105 hover:glow-primary">
      <div className="aspect-square relative overflow-hidden">
        <img
          src={song.thumbnail}
          alt={song.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Button
            size="lg"
            onClick={onPlay}
            className="rounded-full w-16 h-16 gradient-primary hover:glow-accent transition-all duration-300"
          >
            {isPlaying ? (
              <Pause className="h-6 w-6 fill-current" />
            ) : (
              <Play className="h-6 w-6 fill-current ml-1" />
            )}
          </Button>
        </div>

        <Button
          size="icon"
          variant="destructive"
          onClick={onDelete}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="p-4">
        <h3 className="font-semibold text-foreground line-clamp-2 min-h-[3rem]">
          {song.title}
        </h3>
      </div>

      {isPlaying && (
        <div className="absolute top-2 left-2">
          <div className="flex gap-1 items-end h-6">
            <div className="w-1 bg-accent animate-pulse" style={{ height: '60%', animationDelay: '0ms' }} />
            <div className="w-1 bg-accent animate-pulse" style={{ height: '100%', animationDelay: '150ms' }} />
            <div className="w-1 bg-accent animate-pulse" style={{ height: '40%', animationDelay: '300ms' }} />
          </div>
        </div>
      )}
    </Card>
  );
};
