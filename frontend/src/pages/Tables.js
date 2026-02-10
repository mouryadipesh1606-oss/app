import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, Download, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const CUSTOMER_URL = window.location.origin;

const Tables = () => {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tableName, setTableName] = useState('');

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      const response = await axios.get(`${API}/tables`);
      setTables(response.data);
    } catch (error) {
      toast.error('Failed to fetch tables');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await axios.post(`${API}/tables`, { table_name: tableName });
      toast.success('Table created successfully');
      fetchTables();
      setDialogOpen(false);
      setTableName('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this table?')) return;

    try {
      await axios.delete(`${API}/tables/${id}`);
      toast.success('Table deleted successfully');
      fetchTables();
    } catch (error) {
      toast.error('Failed to delete table');
    }
  };

  const downloadQR = (table) => {
    const canvas = document.getElementById(`qr-${table.id}`);
    if (canvas) {
      const svg = canvas.querySelector('svg');
      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `table-${table.table_name}-qr.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-zinc-400">Loading tables...</div>
      </div>
    );
  }

  return (
    <div className="p-8" data-testid="tables-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Table Management</h1>
          <p className="text-zinc-400">Create and manage your restaurant tables</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-black font-bold h-12 px-6"
              data-testid="add-table-button"
            >
              <Plus size={20} className="mr-2" />
              Add Table
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
            <DialogHeader>
              <DialogTitle className="text-2xl">Add Table</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="table-form">
              <div className="space-y-2">
                <Label htmlFor="table-name">Table Name or Number</Label>
                <Input
                  id="table-name"
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  required
                  placeholder="e.g., Table 1, A1, Outdoor 3"
                  className="bg-zinc-950 border-zinc-800 text-white"
                  data-testid="table-name-input"
                />
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
                  data-testid="submit-table-button"
                >
                  Create Table
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {tables.length === 0 ? (
        <div className="text-center py-12 bg-zinc-900 rounded-md border border-zinc-800">
          <p className="text-zinc-400">No tables yet. Add your first table to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tables.map((table) => (
            <div
              key={table.id}
              className="bg-zinc-900 border border-zinc-800 rounded-md p-6 hover:border-amber-500/50 transition-colors"
              data-testid={`table-${table.id}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">{table.table_name}</h3>
                  <p className="text-sm text-zinc-400">ID: {table.id.slice(0, 8)}</p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDelete(table.id)}
                  className="h-8 w-8 text-red-500 hover:text-red-400"
                  data-testid={`delete-table-${table.id}`}
                >
                  <Trash2 size={16} />
                </Button>
              </div>

              <div className="bg-white p-4 rounded-md mb-4" id={`qr-${table.id}`}>
                <QRCodeSVG
                  value={`${CUSTOMER_URL}/customer/${table.id}`}
                  size={200}
                  level="H"
                  className="w-full h-auto"
                />
              </div>

              <Button
                onClick={() => downloadQR(table)}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-white"
                data-testid={`download-qr-${table.id}`}
              >
                <Download size={16} className="mr-2" />
                Download QR Code
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Tables;
