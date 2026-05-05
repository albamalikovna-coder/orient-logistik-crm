import { useState, useRef } from 'react';
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
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

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

  const uploadFile = async (index: number, file: File | Blob) => {
    setLoading(true);
    try {
      const fileExt = (file as File).name?.split('.').pop() || 'png';
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `items/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      updateItem(index, 'photo_url', data.publicUrl);
    } catch (error) {
      alert('Ошибка загрузки фото');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(index, file);
  };

  const handlePaste = async (index: number, e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          await uploadFile(index, blob);
          break;
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Пользователь не авторизован');

      const { data: rateData } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'exchange_rate')
        .single();
      
      const currentRate = rateData ? parseFloat(rateData.value) : 13.5;

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{ 
          status: 'draft', 
          notes: orderNotes,
          company_name: companyName,
          exchange_rate: currentRate,
          client_id: user.id
        }])
        .select()
        .single();

      if (orderError) throw orderError;

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

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      const totalRmb = itemsToInsert.reduce((sum, item) => sum + item.total_price_rmb, 0);
      await supabase
        .from('orders')
        .update({ 
          total_amount_rmb: totalRmb, 
          total_amount_rub: totalRmb * currentRate 
        })
        .eq('id', order.id);

      router.push('/');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-sm p-6 md:p-8 border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-blue-900">Создание новой заявки</h1>
          <button onClick={() => router.push('/')} className="text-gray-400 hover:text-blue-600">Отмена</button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50 p-4 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-blue-800">Организация / Клиент</label>
              <input 
                type="text" required
                className="mt-1 block w-full border border-blue-200 rounded-md p-2"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="ООО 'Вектор'"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-blue-800">Общее примечание</label>
              <input 
                type="text"
                className="mt-1 block w-full border border-blue-200 rounded-md p-2"
                value={orderNotes}
                onChange={e => setOrderNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-4">
            {items.map((item, index) => (
              <div 
                key={index} 
                onPaste={(e) => handlePaste(index, e)}
                className="p-4 border border-gray-100 rounded-lg relative bg-gray-50 flex flex-col md:flex-row gap-6 transition-all focus-within:ring-2 focus-within:ring-blue-100"
              >
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItem(index)} className="absolute top-2 right-2 text-red-400">×</button>
                )}
                
                 <div 
                   onClick={() => fileInputRefs.current[index]?.click()}
                   className="w-full md:w-32 h-32 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300 cursor-pointer hover:bg-gray-100 transition-colors"
                   title="Кликните для выбора или нажмите Ctrl+V для вставки"
                 >
                   {item.photo_url ? (
                     <img src={item.photo_url} className="w-full h-full object-contain" />
                   ) : (
                     <div className="text-center">
                       <span className="text-[10px] text-gray-400 font-bold block">ФОТО</span>
                       <span className="text-[8px] text-gray-300 block mt-1">Ctrl + V</span>
                     </div>
                   )}
                   <input type="file" className="hidden" ref={el => { fileInputRefs.current[index] = el; }} onChange={e => handleFileUpload(index, e)} />
                 </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-full">
                    <label className="block text-xs font-bold text-gray-400 uppercase">Название товара (RU)</label>
                    <input type="text" required className="w-full border-b border-gray-300 bg-transparent py-1 outline-none focus:border-blue-500" value={item.name_ru} onChange={e => updateItem(index, 'name_ru', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase">Цена (¥ RMB)</label>
                    <input type="number" step="0.01" required className="w-full border-b border-gray-300 bg-transparent py-1 outline-none focus:border-blue-500" value={item.price_per_unit_rmb} onChange={e => updateItem(index, 'price_per_unit_rmb', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase">Кол-во (шт)</label>
                    <input type="number" required className="w-full border-b border-gray-300 bg-transparent py-1 outline-none focus:border-blue-500" value={item.total_qty} onChange={e => updateItem(index, 'total_qty', e.target.value)} />
                  </div>
                  <div className="col-span-full">
                    <label className="block text-xs font-bold text-gray-400 uppercase">Ссылка</label>
                    <input type="url" className="w-full border-b border-gray-300 bg-transparent py-1 outline-none focus:border-blue-500" value={item.link} onChange={e => updateItem(index, 'link', e.target.value)} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button type="button" onClick={addItem} className="w-full py-3 border-2 border-dashed border-gray-200 text-gray-400 rounded-xl hover:bg-gray-50">+ Добавить позицию</button>

          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-100">
            {loading ? 'Сохранение...' : 'Создать заявку'}
          </button>
        </form>
      </div>
    </div>
  );
}
