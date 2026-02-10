import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { ShoppingCart, Plus, Minus, Bell, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Customer = () => {
  const { tableId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);

  useEffect(() => {
    fetchTableInfo();
  }, [tableId]);

  const fetchTableInfo = async () => {
    try {
      const response = await axios.get(`${API}/customer/table/${tableId}`);
      setData(response.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to load menu');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item) => {
    const existing = cart.find((c) => c.menu_item_id === item.id);
    if (existing) {
      setCart(
        cart.map((c) =>
          c.menu_item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        )
      );
    } else {
      setCart([
        ...cart,
        {
          menu_item_id: item.id,
          name: item.name,
          price: item.price,
          quantity: 1
        }
      ]);
    }
    toast.success(`${item.name} added to cart`);
  };

  const updateQuantity = (itemId, delta) => {
    setCart(
      cart
        .map((c) =>
          c.menu_item_id === itemId ? { ...c, quantity: c.quantity + delta } : c
        )
        .filter((c) => c.quantity > 0)
    );
  };

  const getTotalPrice = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    setPlacingOrder(true);
    try {
      await axios.post(`${API}/customer/orders`, {
        table_id: tableId,
        items: cart
      });
      toast.success('Order placed successfully! Staff will bring your order shortly.');
      setCart([]);
      setShowCart(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to place order');
    } finally {
      setPlacingOrder(false);
    }
  };

  const handleCallStaff = async () => {
    try {
      await axios.post(`${API}/customer/bell`, { table_id: tableId });
      toast.success('Staff has been notified!');
    } catch (error) {
      toast.error('Failed to call staff');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400">Loading menu...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 text-xl mb-2">Table not found</p>
          <p className="text-zinc-400">Please scan a valid QR code</p>
        </div>
      </div>
    );
  }

  const groupedMenu = data.menu.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-zinc-950 grain-texture" data-testid="customer-page">
      <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight" data-testid="restaurant-name">
              {data.restaurant_name}
            </h1>
            <p className="text-sm text-zinc-400">{data.table.table_name}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleCallStaff}
              variant="outline"
              className="border-zinc-700 text-white hover:bg-zinc-800"
              data-testid="call-staff-button"
            >
              <Bell size={18} className="mr-2" />
              Call Staff
            </Button>
            <Button
              onClick={() => setShowCart(!showCart)}
              className="bg-amber-500 hover:bg-amber-600 text-black font-bold relative"
              data-testid="cart-button"
            >
              <ShoppingCart size={18} className="mr-2" />
              Cart
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center" data-testid="cart-count">
                  {cart.length}
                </span>
              )}
            </Button>
          </div>
        </div>
      </header>

      {data.gallery.length > 0 && (
        <section className="container mx-auto px-4 py-8">
          <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">Gallery</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {data.gallery.map((img) => (
              <div key={img.id} className="aspect-video rounded-md overflow-hidden">
                <img
                  src={img.image_url}
                  alt="Restaurant"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = 'https://placehold.co/400x300/18181b/a1a1aa?text=Image';
                  }}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="container mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">Menu</h2>
        <div className="space-y-8">
          {Object.entries(groupedMenu).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-2xl font-bold text-amber-500 mb-4 tracking-tight">{category}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="bg-zinc-900 border border-zinc-800 rounded-md p-4 hover:border-amber-500/50 transition-colors"
                    data-testid={`menu-item-${item.id}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="text-lg font-bold text-white mb-1">{item.name}</h4>
                        <p className="text-2xl font-bold text-amber-500 tracking-tight">${item.price.toFixed(2)}</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => addToCart(item)}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold"
                      data-testid={`add-to-cart-${item.id}`}
                    >
                      <Plus size={16} className="mr-2" />
                      Add to Cart
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {showCart && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setShowCart(false)}>
          <div
            className="absolute right-0 top-0 bottom-0 w-full md:w-96 bg-zinc-900 border-l border-zinc-800 p-6 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            data-testid="cart-panel"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Your Cart</h2>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowCart(false)}
                className="text-zinc-400"
                data-testid="close-cart-button"
              >
                <X size={20} />
              </Button>
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart size={48} className="mx-auto mb-4 text-zinc-600" />
                <p className="text-zinc-400">Your cart is empty</p>
              </div>
            ) : (
              <>
                <div className="space-y-4 mb-6">
                  {cart.map((item) => (
                    <div
                      key={item.menu_item_id}
                      className="bg-zinc-950 border border-zinc-800 rounded-md p-4"
                      data-testid={`cart-item-${item.menu_item_id}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-bold text-white">{item.name}</h4>
                          <p className="text-amber-500">${item.price.toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => updateQuantity(item.menu_item_id, -1)}
                            className="h-8 w-8 border-zinc-700"
                            data-testid={`decrease-quantity-${item.menu_item_id}`}
                          >
                            <Minus size={14} />
                          </Button>
                          <span className="text-white w-8 text-center" data-testid={`quantity-${item.menu_item_id}`}>
                            {item.quantity}
                          </span>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => updateQuantity(item.menu_item_id, 1)}
                            className="h-8 w-8 border-zinc-700"
                            data-testid={`increase-quantity-${item.menu_item_id}`}
                          >
                            <Plus size={14} />
                          </Button>
                        </div>
                        <span className="font-bold text-white">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-zinc-800 pt-6">
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-xl font-bold text-white">Total</span>
                    <span className="text-2xl font-bold text-amber-500" data-testid="cart-total">
                      ${getTotalPrice().toFixed(2)}
                    </span>
                  </div>

                  <Button
                    onClick={handlePlaceOrder}
                    disabled={placingOrder}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold h-12"
                    data-testid="place-order-button"
                  >
                    {placingOrder ? 'Placing Order...' : 'Place Order'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Customer;
