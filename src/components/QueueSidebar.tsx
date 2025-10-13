import { X, GripVertical, Trash2, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Song {
  id: string;
  title: string;
  thumbnail: string;
  url: string;
}

interface QueueSidebarProps {
  queue: Song[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onReorder: (newQueue: Song[]) => void;
  onRemove: (songId: string) => void;
  onPlayAtIndex: (index: number) => void;
}

interface SortableItemProps {
  song: Song;
  index: number;
  isPlaying: boolean;
  onRemove: () => void;
  onPlay: () => void;
}

const SortableItem = ({ song, index, isPlaying, onRemove, onPlay }: SortableItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: song.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/50 transition-colors ${
        isPlaying ? "bg-primary/10 border border-primary/30" : ""
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="h-4 w-4" />
      </div>
      
      <span className="text-xs text-muted-foreground w-6">{index + 1}</span>
      
      <img
        src={song.thumbnail}
        alt={song.title}
        className="w-10 h-10 rounded object-cover cursor-pointer"
        onClick={onPlay}
      />
      
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onPlay}>
        <p className="text-sm font-medium truncate">{song.title}</p>
        {isPlaying && (
          <p className="text-xs text-primary">Now Playing</p>
        )}
      </div>
      
      <Button
        size="icon"
        variant="ghost"
        onClick={onRemove}
        className="h-8 w-8"
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
};

export const QueueSidebar = ({
  queue,
  currentIndex,
  isOpen,
  onClose,
  onReorder,
  onRemove,
  onPlayAtIndex,
}: QueueSidebarProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = queue.findIndex((song) => song.id === active.id);
      const newIndex = queue.findIndex((song) => song.id === over.id);
      const newQueue = arrayMove(queue, oldIndex, newIndex);
      onReorder(newQueue);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <Card className="fixed top-0 right-0 h-full w-80 glass-bg border-l border-border/50 z-50 flex flex-col">
        <div className="p-4 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <List className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Queue</h3>
            <span className="text-xs text-muted-foreground">
              {queue.length} {queue.length === 1 ? "song" : "songs"}
            </span>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <ScrollArea className="flex-1 p-4">
          {queue.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <List className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No songs in queue</p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={queue.map((song) => song.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1">
                  {queue.map((song, index) => (
                    <SortableItem
                      key={song.id}
                      song={song}
                      index={index}
                      isPlaying={index === currentIndex}
                      onRemove={() => onRemove(song.id)}
                      onPlay={() => onPlayAtIndex(index)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </ScrollArea>
      </Card>
    </>
  );
};
