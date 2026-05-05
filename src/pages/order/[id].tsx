import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';

export default function OrderDetails() {
  const router = useRouter();
  const { id } = router.query;
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchOrderData();
  }, [id]);

  async function fetchOrderData() {
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (orderError) {
      console.error(orderError);
    } else {
      setOrder(orderData);
      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', id);
      
      if (!itemsError) setItems(itemsData || []);
    }
    setLoading(false);
  }

  if (loading) return <div className="p-8 text-center">Загрузка данных...</div>;
  if (!order) return <div className="p-8 text-center text-red-500">Заказ не найден</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <button 
          onClick={() => router.push('/')}
          className="mb-6 text-blue-600 hover:text-blue-800 font-medium flex items-center"
        >
          ← Назад к списку
        </button>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
          <div className="bg-blue-900 p-6 text-white">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <p className="text-blue-200 text-sm uppercase tracking-wider">Заявка от {new Date(order.created_at).toLocaleDateString()}</p>
                <h1 className="text-2xl font-bold">{order.company_name || 'Без названия'}</h1>
              </div>
              <div className="bg-white/20 px-4 py-2 rounded-lg backdrop-blur-sm">
                <p className="text-xs text-blue-100 uppercase">Статус</p>
                <p className="font-bold">{order.status}</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Список товаров</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Фото</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Товар</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Цена (¥)</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Кол-во</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Сумма (¥)</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ссылка</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="h-16 w-16 flex-shrink-0">
                          {item.photo_url ? (
                            <img src={item.photo_url} alt="" className="h-16 w-16 rounded-md object-cover border border-gray-200" />
                          ) : (
                            <div className="h-16 w-16 rounded-md bg-gray-100 flex items-center justify-center text-[10px] text-gray-400">Нет фото</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900 font-medium">{item.name_ru}</td>
                      <td className="px-4 py-4 text-sm text-gray-500">{item.price_per_unit_rmb} ¥</td>
                      <td className="px-4 py-4 text-sm text-gray-500">{item.total_qty} шт</td>
                      <td className="px-4 py-4 text-sm text-gray-900">{item.total_price_rmb} ¥</td>
                      <td className="px-4 py-4 text-sm">
                        {item.link && (
                          <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Открыть ↗</a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-gray-50 p-6 border-t border-gray-100">
            <div className="flex flex-col md:flex-row justify-end gap-6 text-right">
              <div>
                <p className="text-sm text-gray-500 uppercase">Итого в Юанях</p>
                <p className="text-2xl font-bold text-gray-900">{order.total_amount_rmb} ¥</p>
              </div>
              <div className="bg-blue-600 text-white p-4 rounded-xl shadow-lg shadow-blue-100">
                <p className="text-sm text-blue-100 uppercase text-center md:text-right">Итого в Рублях</p>
                <p className="text-3xl font-black text-center md:text-right">{order.total_amount_rub} ₽</p>
                <p className="text-xs text-blue-100 text-center md:text-right mt-1">Курс: {order.exchange_rate} ₽/¥</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
