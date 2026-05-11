import { useListGallery, useCreateGalleryImage, useDeleteGalleryImage, getListGalleryQueryKey } from "@workspace/api-client-react";
import { Plus, Trash2, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { queryClient } from "@/lib/queryClient";

export default function Gallery() {
  const { data: images, isLoading } = useListGallery({ query: { queryKey: getListGalleryQueryKey() } });
  const createImg = useCreateGalleryImage();
  const deleteImg = useDeleteGalleryImage();
  const { toast } = useToast();
  
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");

  const handleAdd = () => {
    if (!url) return;
    createImg.mutate(
      { data: { imageUrl: url, caption, sortOrder: 0 } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListGalleryQueryKey() });
          toast({ title: "Image added" });
          setOpen(false);
          setUrl("");
          setCaption("");
        }
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteImg.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListGalleryQueryKey() });
          toast({ title: "Image removed" });
        }
      }
    );
  };

  return (
    <div className="p-4 md:p-8 space-y-6 pb-24 md:pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gallery</h1>
          <p className="text-muted-foreground mt-1">Manage public website photos</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="hidden md:flex"><Plus className="mr-2 h-4 w-4"/> Add Image</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Gallery Image</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Image URL</label>
                <Input placeholder="https://..." value={url} onChange={e => setUrl(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Caption (Optional)</label>
                <Input value={caption} onChange={e => setCaption(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAdd} disabled={!url || createImg.isPending}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="aspect-square bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : images?.length === 0 ? (
        <div className="text-center py-20 flex flex-col items-center">
          <ImageIcon className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-foreground">No images yet</h3>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images?.map(img => (
            <div key={img.id} className="group relative aspect-square rounded-xl overflow-hidden bg-slate-100">
              <img src={img.imageUrl} alt={img.caption || ""} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button variant="destructive" size="sm" onClick={() => handleDelete(img.id)}>
                  <Trash2 className="h-4 w-4 mr-2" /> Remove
                </Button>
              </div>
              {img.caption && (
                <div className="absolute bottom-0 inset-x-0 bg-black/60 p-2 text-white text-xs truncate">
                  {img.caption}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Mobile FAB */}
      <Button size="icon" className="fixed bottom-20 right-6 h-14 w-14 rounded-full shadow-xl shadow-primary/20 z-40 md:hidden" onClick={() => setOpen(true)}>
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
}