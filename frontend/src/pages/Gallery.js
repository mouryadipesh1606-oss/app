import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Gallery = () => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    try {
      const response = await axios.get(`${API}/gallery`);
      setImages(response.data);
    } catch (error) {
      toast.error('Failed to fetch gallery images');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await axios.post(`${API}/gallery`, { image_url: imageUrl });
      toast.success('Image added successfully');
      fetchImages();
      setDialogOpen(false);
      setImageUrl('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this image?')) return;

    try {
      await axios.delete(`${API}/gallery/${id}`);
      toast.success('Image deleted successfully');
      fetchImages();
    } catch (error) {
      toast.error('Failed to delete image');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-zinc-400">Loading gallery...</div>
      </div>
    );
  }

  return (
    <div className="p-8" data-testid="gallery-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Gallery Management</h1>
          <p className="text-zinc-400">Upload and manage your restaurant photos</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-black font-bold h-12 px-6"
              data-testid="add-image-button"
            >
              <Plus size={20} className="mr-2" />
              Add Image
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
            <DialogHeader>
              <DialogTitle className="text-2xl">Add Image</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="image-form">
              <div className="space-y-2">
                <Label htmlFor="image-url">Image URL</Label>
                <Input
                  id="image-url"
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  required
                  placeholder="https://example.com/image.jpg"
                  className="bg-zinc-950 border-zinc-800 text-white"
                  data-testid="image-url-input"
                />
                <p className="text-xs text-zinc-500">Enter a direct URL to the image</p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setDialogOpen(false)}
                  className="flex-1"
                  data-testid="cancel-button"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-bold"
                  data-testid="submit-image-button"
                >
                  Add Image
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {images.length === 0 ? (
        <div className="text-center py-12 bg-zinc-900 rounded-md border border-zinc-800">
          <p className="text-zinc-400">No images yet. Add your first image to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {images.map((image) => (
            <div
              key={image.id}
              className="bg-zinc-900 border border-zinc-800 rounded-md overflow-hidden hover:border-amber-500/50 transition-colors group"
              data-testid={`gallery-image-${image.id}`}
            >
              <div className="aspect-video relative">
                <img
                  src={image.image_url}
                  alt="Restaurant"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = 'https://placehold.co/600x400/18181b/a1a1aa?text=Image+Not+Found';
                  }}
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={() => handleDelete(image.id)}
                    className="bg-red-500 hover:bg-red-600"
                    data-testid={`delete-image-${image.id}`}
                  >
                    <Trash2 size={20} />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Gallery;
