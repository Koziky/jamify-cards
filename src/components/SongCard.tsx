import { Play, Trash2, ListPlus } from "lucide-react";
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
  onAddToQueue: () => void;
  onDelete: () => void;
}

export const SongCard = ({ song, onAddToQueue, onDelete }: SongCardProps) => {
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
            onClick={onAddToQueue}
            className="rounded-full w-16 h-16 gradient-primary hover:glow-accent transition-all duration-300"
          >
            <ListPlus className="h-6 w-6" />
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
    </Card>
  );
};
