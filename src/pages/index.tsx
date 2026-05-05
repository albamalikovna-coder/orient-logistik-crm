import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/router';

export default function Dashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
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

    // Получаем заказы ВМЕСТЕ с товарами
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false });

    if (error) console.log('Error fetching orders:', error);
    else setOrders(data || []);
    setLoading(false);
  }

  const toggleOrder = (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Чтобы не срабатывал переход на страницу заказа
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  async function updateRate() {
    try {
      setSavingRate(true);
      const { error } = await supabase
        .from('settings')
        .upsert({ key: 'exchange_rate', value: exchangeRate.toString() });
      
      if (error) throw error;
      alert('Курс обновлен и сохранен!');
    } catch (error) {
      alert('Ошибка при сохранении курса');
      console.error(error);
    } finally {
      setSavingRate(false);
    }
  }

  async function fetchCbrRate() {
    try {
      setSavingRate(true);
      const res = await fetch('https://www.cbr-xml-daily.ru/daily_json.js');
      const data = await res.json();
      const rate = data.Valute.CNY.Value;
      setExchangeRate(rate.toString());
      
      const { error } = await supabase
        .from('settings')
        .upsert({ key: 'exchange_rate', value: rate.toString() });
      
      if (error) throw error;
      alert(`Курс ЦБ (${rate}) получен и сохранен!`);
    } catch (error) {
      alert('Ошибка при получении курса ЦБ');
      console.error(error);
    } finally {
      setSavingRate(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
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
          <div className="flex flex-col gap-1">
            <button 
              onClick={updateRate}
              disabled={savingRate}
              className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg hover:bg-blue-100 transition-colors text-xs font-bold"
            >
              {savingRate ? '...' : 'СОХРАНИТЬ'}
            </button>
            <button 
              onClick={fetchCbrRate}
              disabled={savingRate}
              className="bg-orange-50 text-orange-600 px-3 py-1 rounded-lg hover:bg-orange-100 transition-colors text-xs font-bold"
            >
              КУРС ЦБ
            </button>
          </div>
        </div>

        <button 
          onClick={() => router.push('/create-order')}
          className="rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700 font-bold shadow-lg shadow-blue-100"
        >
          + Новая заявка
        </button>
      </header>

      <main>
        <div className="rounded-xl bg-white shadow-sm overflow-hidden border border-gray-100">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-10 px-6 py-3"></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Дата</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Организация</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Сумма (RMB)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Итого (RUB)</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">Загрузка данных...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">Заказов пока нет</td></tr>
              ) : (
                orders.map((order) => (
                  <React.Fragment key={order.id}>
                    {/* Основная строка заказа */}
                    <tr 
                      className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/order/${order.id}`)}
                    >
                      <td className="px-6 py-4" onClick={(e) => toggleOrder(order.id, e)}>
                        <button className="text-gray-400 hover:text-blue-600">
                          {expandedOrders[order.id] ? '▼' : '▶'}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {order.company_name || 'Без названия'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-[10px] uppercase tracking-wider font-bold rounded-md ${
                          order.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{order.total_amount_rmb?.toLocaleString()} ¥</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{order.total_amount_rub?.toLocaleString()} ₽</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button className="text-blue-600 hover:text-blue-900">Открыть</button>
                      </td>
                    </tr>

                    {/* Развернутая часть с товарами */}
                    {expandedOrders[order.id] && (
                      <tr className="bg-gray-50">
                        <td colSpan={7} className="px-12 py-4">
                          <div className="border border-gray-200 rounded-lg bg-white overflow-hidden shadow-inner">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50/50">
                                <tr>
                                  <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase">Фото</th>
                                  <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase">Товар (RU)</th>
                                  <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase">Цена (¥)</th>
                                  <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase">Кол-во</th>
                                  <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase">Сумма (¥)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {order.order_items?.map((item: any) => (
                                  <tr key={item.id} className="hover:bg-gray-50/50">
                                    <td className="px-4 py-2">
                                      <div className="w-12 h-12 bg-gray-100 rounded border border-gray-200 overflow-hidden flex items-center justify-center">
                                        {item.photo_url ? (
                                          <img src={item.photo_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                          <span className="text-[10px] text-gray-400 italic">No img</span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-4 py-2 text-sm text-gray-700 font-medium">{item.name_ru}</td>
                                    <td className="px-4 py-2 text-sm text-gray-500">{item.price_per_unit_rmb} ¥</td>
                                    <td className="px-4 py-2 text-sm text-gray-500">{item.total_qty} шт.</td>
                                    <td className="px-4 py-2 text-sm font-semibold text-gray-900">
                                      {(item.price_per_unit_rmb * item.total_qty).toLocaleString()} ¥
                                    </td>
                                  </tr>
                                ))}
                                {(!order.order_items || order.order_items.length === 0) && (
                                  <tr>
                                    <td colSpan={5} className="px-4 py-4 text-center text-xs text-gray-400">
                                      В этом заказе нет товаров
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

// Добавляем импорт React, так как используем Fragment
import React from 'react';
