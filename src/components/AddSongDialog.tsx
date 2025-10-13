import { useState } from "react";
import { Plus } from "lucide-react";
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
import { toast } from "sonner";

interface AddSongDialogProps {
  onAddSong: (song: { title: string; thumbnail: string; url: string }) => void;
}

export const AddSongDialog = ({ onAddSong }: AddSongDialogProps) => {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

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

  const handleAddSong = async () => {
    if (!url.trim()) {
      toast.error("Please enter a YouTube URL");
      return;
    }

    setLoading(true);
    try {
      const videoId = extractVideoId(url);
      
      if (!videoId) {
        toast.error("Invalid YouTube URL");
        setLoading(false);
        return;
      }

      // Fetch video info using YouTube oEmbed API
      const response = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch video info");
      }

      const data = await response.json();
      
      onAddSong({
        title: data.title,
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        url: `https://www.youtube.com/watch?v=${videoId}`,
      });

      toast.success("Song added successfully!");
      setUrl("");
      setOpen(false);
    } catch (error) {
      toast.error("Failed to add song. Please check the URL and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="gradient-primary hover:glow-accent transition-all duration-300">
          <Plus className="mr-2 h-5 w-5" />
          Add Song
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-bg border-border/50">
        <DialogHeader>
          <DialogTitle>Add Song from YouTube</DialogTitle>
          <DialogDescription>
            Paste a YouTube URL to add a song to your library
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="url">YouTube URL</Label>
            <Input
              id="url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleAddSong()}
              className="bg-secondary/50 border-border/50"
            />
          </div>
          <Button
            onClick={handleAddSong}
            disabled={loading}
            className="w-full gradient-primary"
          >
            {loading ? "Adding..." : "Add Song"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
