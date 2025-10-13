import { useState } from "react";
import { ListMusic, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface Playlist {
  id: string;
  name: string;
  songIds: string[];
}

interface PlaylistManagerProps {
  playlists: Playlist[];
  onCreatePlaylist: (name: string) => void;
  onDeletePlaylist: (id: string) => void;
  onSelectPlaylist: (id: string | null) => void;
  selectedPlaylistId: string | null;
}

export const PlaylistManager = ({
  playlists,
  onCreatePlaylist,
  onDeletePlaylist,
  onSelectPlaylist,
  selectedPlaylistId,
}: PlaylistManagerProps) => {
  const [open, setOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");

  const handleCreate = () => {
    if (!newPlaylistName.trim()) {
      toast.error("Please enter a playlist name");
      return;
    }
    onCreatePlaylist(newPlaylistName);
    setNewPlaylistName("");
    toast.success("Playlist created!");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg" className="border-border/50 hover:border-primary/50">
          <ListMusic className="mr-2 h-5 w-5" />
          Playlists
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-bg border-border/50">
        <DialogHeader>
          <DialogTitle>Your Playlists</DialogTitle>
          <DialogDescription>Create and manage your music playlists</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="New playlist name..."
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleCreate()}
              className="bg-secondary/50 border-border/50"
            />
            <Button onClick={handleCreate} className="gradient-primary">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              <Button
                variant={selectedPlaylistId === null ? "default" : "ghost"}
                className={`w-full justify-start ${selectedPlaylistId === null ? "gradient-primary" : ""}`}
                onClick={() => onSelectPlaylist(null)}
              >
                <ListMusic className="mr-2 h-4 w-4" />
                All Songs
              </Button>
              
              {playlists.map((playlist) => (
                <div key={playlist.id} className="flex gap-2">
                  <Button
                    variant={selectedPlaylistId === playlist.id ? "default" : "ghost"}
                    className={`flex-1 justify-start ${selectedPlaylistId === playlist.id ? "gradient-primary" : ""}`}
                    onClick={() => onSelectPlaylist(playlist.id)}
                  >
                    <ListMusic className="mr-2 h-4 w-4" />
                    {playlist.name}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {playlist.songIds.length}
                    </span>
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => {
                      onDeletePlaylist(playlist.id);
                      toast.success("Playlist deleted");
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
