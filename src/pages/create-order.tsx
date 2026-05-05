import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/router';

export default function CreateOrder() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    name_ru: '',
    name_ch: '',
    link: '',
    price_per_unit_rmb: '',
    total_qty: '',
    description: '',
    material: '',
    model: '',
    brand: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Создаем заказ
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{ status: 'draft' }])
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Добавляем товар к заказу
      const { error: itemError } = await supabase
        .from('order_items')
        .insert([{
          order_id: order.id,
          ...formData,
          price_per_unit_rmb: parseFloat(formData.price_per_unit_rmb) || 0,
          total_qty: parseInt(formData.total_qty) || 0,
          total_price_rmb: (parseFloat(formData.price_per_unit_rmb) || 0) * (parseInt(formData.total_qty) || 0)
        }]);

      if (itemError) throw itemError;

      router.push('/');
    } catch (error) {
      alert('Ошибка при создании заказа');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm p-8">
        <h1 className="text-2xl font-bold text-blue-900 mb-6">Новая заявка</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Название товара (RU)</label>
            <input 
              type="text" required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              value={formData.name_ru}
              onChange={e => setFormData({...formData, name_ru: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Цена за ед. (¥ RMB)</label>
              <input 
                type="number" step="0.01" required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                value={formData.price_per_unit_rmb}
                onChange={e => setFormData({...formData, price_per_unit_rmb: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Количество (шт)</label>
              <input 
                type="number" required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                value={formData.total_qty}
                onChange={e => setFormData({...formData, total_qty: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Ссылка на товар</label>
            <input 
              type="url"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              value={formData.link}
              onChange={e => setFormData({...formData, link: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Описание / Примечание</label>
            <textarea 
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              rows={3}
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            ></textarea>
          </div>

          <div className="pt-4 flex gap-4">
            <button 
              type="button" 
              onClick={() => router.back()}
              className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300"
            >
              Отмена
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Создание...' : 'Создать заявку'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
