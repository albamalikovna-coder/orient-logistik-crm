import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/router';

export default function CreateOrder() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [companyName, setCompanyName] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [items, setItems] = useState([
    { name_ru: '', price_per_unit_rmb: '', total_qty: '', link: '', photo_url: '', description: '' }
  ]);

  const addItem = () => {
    setItems([...items, { name_ru: '', price_per_unit_rmb: '', total_qty: '', link: '', photo_url: '', description: '' }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: string) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 0. Получаем актуальный курс из базы
      const { data: rateData } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'exchange_rate')
        .single();
      
      const currentRate = rateData ? parseFloat(rateData.value) : 13.5;

      // 1. Создаем общую заявку
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{ 
          status: 'draft', 
          notes: orderNotes,
          company_name: companyName,
          exchange_rate: currentRate
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Подготавливаем массив товаров
      const itemsToInsert = items.map(item => ({
        order_id: order.id,
        name_ru: item.name_ru,
        link: item.link,
        photo_url: item.photo_url,
        description: item.description,
        price_per_unit_rmb: parseFloat(item.price_per_unit_rmb) || 0,
        total_qty: parseInt(item.total_qty) || 0,
        total_price_rmb: (parseFloat(item.price_per_unit_rmb) || 0) * (parseInt(item.total_qty) || 0)
      }));

      // 3. Сохраняем все товары разом
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // 4. Считаем общую сумму заказа
      const totalRmb = itemsToInsert.reduce((sum, item) => sum + item.total_price_rmb, 0);
      await supabase
        .from('orders')
        .update({ 
          total_amount_rmb: totalRmb, 
          total_amount_rub: totalRmb * currentRate 
        })
        .eq('id', order.id);

      router.push('/');
    } catch (error) {
      alert('Ошибка при создании заявки');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-sm p-6 md:p-8">
        <h1 className="text-2xl font-bold text-blue-900 mb-6">Создание новой заявки</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50 p-4 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-blue-800">Название организации / Клиент</label>
              <input 
                type="text" required
                className="mt-1 block w-full border border-blue-200 rounded-md p-2"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="ООО 'Вектор' или Имя клиента"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-blue-800">Общее примечание</label>
              <input 
                type="text"
                className="mt-1 block w-full border border-blue-200 rounded-md p-2"
                value={orderNotes}
                onChange={e => setOrderNotes(e.target.value)}
                placeholder="Груз в Москву, СДЭК и т.д."
              />
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-700">Товары в заявке</h2>
            {items.map((item, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg relative bg-gray-50">
                {items.length > 1 && (
                  <button 
                    type="button"
                    onClick={() => removeItem(index)}
                    className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-sm font-bold"
                  >
                    Удалить позицию ×
                  </button>
                )}
                
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Photo Preview Section */}
                  <div className="w-full md:w-48 h-48 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300">
                    {item.photo_url ? (
                      <img src={item.photo_url} alt="Превью" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-gray-400 text-sm text-center px-2">Нет фото</span>
                    )}
                  </div>

                  {/* Fields Section */}
                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="col-span-full">
                        <label className="block text-sm font-medium text-gray-700">Название товара (RU)</label>
                        <input 
                          type="text" required
                          className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                          value={item.name_ru}
                          onChange={e => updateItem(index, 'name_ru', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Цена за ед. (¥ RMB)</label>
                        <input 
                          type="number" step="0.01" required
                          className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                          value={item.price_per_unit_rmb}
                          onChange={e => updateItem(index, 'price_per_unit_rmb', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Количество (шт)</label>
                        <input 
                          type="number" required
                          className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                          value={item.total_qty}
                          onChange={e => updateItem(index, 'total_qty', e.target.value)}
                        />
                      </div>
                      <div className="col-span-full">
                        <label className="block text-sm font-medium text-blue-700 font-bold">Ссылка на фото товара</label>
                        <input 
                          type="text"
                          className="mt-1 block w-full border border-blue-300 rounded-md p-2 text-sm"
                          value={item.photo_url}
                          onChange={e => updateItem(index, 'photo_url', e.target.value)}
                          placeholder="Вставьте прямую ссылку на картинку (.jpg, .png)"
                        />
                      </div>
                      <div className="col-span-full">
                        <label className="block text-sm font-medium text-gray-700">Ссылка на товар</label>
                        <input 
                          type="url"
                          className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                          value={item.link}
                          onChange={e => updateItem(index, 'link', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button 
            type="button"
            onClick={addItem}
            className="w-full border-2 border-dashed border-blue-300 text-blue-600 py-3 rounded-lg hover:bg-blue-50 font-medium transition-colors"
          >
            + Добавить еще один товар в эту заявку
          </button>

          <div className="pt-6 flex gap-4 border-t border-gray-100">
            <button 
              type="button" 
              onClick={() => router.push('/')}
              className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg hover:bg-gray-300 font-bold"
            >
              Отмена
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-bold shadow-lg shadow-blue-200"
            >
              {loading ? 'Сохранение...' : 'Создать заявку (' + items.length + ' поз.)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
