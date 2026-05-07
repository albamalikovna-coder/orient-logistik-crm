import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/router';

export default function CreateOrder() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [companyName, setCompanyName] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [items, setItems] = useState([
    { name_ru: '', price_per_unit_rmb: '', total_qty: '', link: '', photo_url: '', description: '', remark_text: '', remark_photo_url: '' }
  ]);
  const [extraRemarks, setExtraRemarks] = useState<{ text: string, photo_url: string }[]>([]);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const remarkFileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const itemRemarkFileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const addItem = () => {
    setItems([...items, { name_ru: '', price_per_unit_rmb: '', total_qty: '', link: '', photo_url: '', description: '', remark_text: '', remark_photo_url: '' }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: string) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    setItems(newItems);
  };

  const uploadFile = async (file: File | Blob) => {
    const fileExt = (file as File).name?.split('.').pop() || 'png';
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleItemFileUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const url = await uploadFile(file);
      updateItem(index, 'photo_url', url);
    } catch (error) {
      alert('Ошибка загрузки фото');
    } finally {
      setLoading(false);
    }
  };

  const handleItemRemarkPhotoUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const url = await uploadFile(file);
      updateItem(index, 'remark_photo_url', url);
    } catch (error) {
      alert('Ошибка загрузки фото примечания');
    } finally {
      setLoading(false);
    }
  };

  const handleItemPaste = async (index: number, e: React.ClipboardEvent) => {
    const clipboardItems = e.clipboardData?.items;
    if (!clipboardItems) return;

    for (let i = 0; i < clipboardItems.length; i++) {
      if (clipboardItems[i].type.indexOf('image') !== -1) {
        const blob = clipboardItems[i].getAsFile();
        if (blob) {
          setLoading(true);
          try {
            const url = await uploadFile(blob);
            updateItem(index, 'photo_url', url);
          } catch (error) {
            alert('Ошибка загрузки фото');
          } finally {
            setLoading(false);
          }
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
        remark_text: item.remark_text,
        remark_photo_url: item.remark_photo_url,
        price_per_unit_rmb: parseFloat(item.price_per_unit_rmb) || 0,
        total_qty: parseInt(item.total_qty) || 0,
        total_price_rmb: (parseFloat(item.price_per_unit_rmb) || 0) * (parseInt(item.total_qty) || 0)
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // Сохраняем дополнительные примечания
      if (extraRemarks.length > 0) {
        const remarksToInsert = extraRemarks.map(r => ({
          order_id: order.id,
          text: r.text,
          photo_url: r.photo_url
        }));
        const { error: remarksError } = await supabase
          .from('order_remarks')
          .insert(remarksToInsert);
        if (remarksError) throw remarksError;
      }

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
                onPaste={(e) => handleItemPaste(index, e)}
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
                   <input type="file" className="hidden" ref={el => { fileInputRefs.current[index] = el; }} onChange={e => handleItemFileUpload(index, e)} />
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

                  {/* Примечание к позиции */}
                  <div className="col-span-full pt-4 border-t border-gray-100 flex gap-4">
                    <div 
                      onClick={() => itemRemarkFileInputRefs.current[index]?.click()}
                      className="w-16 h-16 bg-gray-50 rounded flex items-center justify-center border border-dashed border-gray-300 cursor-pointer overflow-hidden shrink-0"
                    >
                      {item.remark_photo_url ? (
                        <img src={item.remark_photo_url} className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-[8px] text-gray-400 font-bold">ФОТО ПРИМ.</span>
                      )}
                      <input type="file" className="hidden" ref={el => { itemRemarkFileInputRefs.current[index] = el; }} onChange={e => handleItemRemarkPhotoUpload(index, e)} />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase">Примечание к этой позиции</label>
                      <input 
                        type="text" 
                        placeholder="Напр: уточнение по размеру, упаковке или цвету..."
                        className="w-full border-b border-gray-200 bg-transparent py-1 text-sm outline-none focus:border-blue-300" 
                        value={item.remark_text} 
                        onChange={e => updateItem(index, 'remark_text', e.target.value)} 
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button type="button" onClick={addItem} className="w-full py-3 border-2 border-dashed border-gray-200 text-gray-400 rounded-xl hover:bg-gray-50">+ Добавить позицию</button>

          {/* Дополнительные примечания */}
          <div className="space-y-4 pt-6 border-t border-gray-100">
            <h2 className="text-lg font-bold text-blue-900">Дополнительные примечания</h2>
            {extraRemarks.map((remark, index) => (
              <div 
                key={index} 
                onPaste={(e) => handleRemarkPaste(index, e)}
                className="p-4 border border-blue-50 rounded-lg relative bg-white flex flex-col md:flex-row gap-6"
              >
                <button type="button" onClick={() => removeRemark(index)} className="absolute top-2 right-2 text-red-400">×</button>
                
                <div 
                  onClick={() => remarkFileInputRefs.current[index]?.click()}
                  className="w-full md:w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
                  title="Кликните для выбора или нажмите Ctrl+V для вставки"
                >
                  {remark.photo_url ? (
                    <img src={remark.photo_url} className="w-full h-full object-contain" />
                  ) : (
                    <div className="text-center">
                      <span className="text-[10px] text-gray-400 font-bold block">ФОТО</span>
                    </div>
                  )}
                  <input type="file" className="hidden" ref={el => { remarkFileInputRefs.current[index] = el; }} onChange={e => handleRemarkFileUpload(index, e)} />
                </div>

                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Текст примечания</label>
                  <textarea 
                    className="w-full border border-gray-200 rounded-md p-2 text-sm min-h-[80px]"
                    placeholder="Введите описание или примечание..."
                    value={remark.text}
                    onChange={e => updateRemark(index, 'text', e.target.value)}
                  />
                </div>
              </div>
            ))}
            <button type="button" onClick={addRemark} className="w-full py-2 border border-blue-200 text-blue-500 rounded-lg hover:bg-blue-50 text-sm">+ Добавить примечание с фото</button>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-100">
            {loading ? 'Сохранение...' : 'Создать заявку'}
          </button>
        </form>
      </div>
    </div>
  );
}
