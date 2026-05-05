import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/router';

export default function Dashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [exchangeRate, setExchangeRate] = useState('13.5');
  const [loading, setLoading] = useState(true);
  const [savingRate, setSavingRate] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    // Получаем курс
    const { data: rateData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'exchange_rate')
      .single();
    
    if (rateData) setExchangeRate(rateData.value);

    // Получаем заказы
    const { data, error } = await supabase
      .from('orders')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false });

    if (error) console.log('Error fetching orders:', error);
    else setOrders(data || []);
    setLoading(false);
  }

  async function updateRate() {
    setSavingRate(true);
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'exchange_rate', value: exchangeRate });
    
    if (error) alert('Ошибка при сохранении курса');
    else alert('Курс обновлен!');
    setSavingRate(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <header className="mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-blue-900">OrientLogistik</h1>
          <p className="text-gray-500 text-sm">Система управления закупками</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-3 rounded-xl shadow-sm border border-gray-100">
          <div className="text-right">
            <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Курс RMB/RUB</p>
            <div className="flex items-center gap-2">
              <input 
                type="number" step="0.1"
                className="w-20 font-bold text-blue-600 text-lg border-b-2 border-transparent focus:border-blue-500 outline-none"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(e.target.value)}
              />
              <span className="text-gray-400">₽</span>
            </div>
          </div>
          <button 
            onClick={updateRate}
            disabled={savingRate}
            className="bg-blue-50 text-blue-600 p-2 rounded-lg hover:bg-blue-100 transition-colors"
          >
            {savingRate ? '...' : '💾'}
          </button>
        </div>

        <button 
          onClick={() => router.push('/create-order')}
          className="rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700 font-bold shadow-lg shadow-blue-100"
        >
          + Новая заявка
        </button>
      </header>


      <main>
        <div className="rounded-xl bg-white shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Дата</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Организация</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Сумма (RMB)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Итого (RUB)</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-4 text-center">Загрузка...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">Заказов пока нет</td></tr>
              ) : (
                orders.map((order) => (
                  <tr 
                    key={order.id} 
                    className="hover:bg-gray-50 cursor-pointer" 
                    onClick={() => router.push(`/order/${order.id}`)}
                  >

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {order.company_name || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        order.status === 'delivered' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.total_amount_rmb} ¥</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{order.total_amount_rub} ₽</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">Подробнее</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
