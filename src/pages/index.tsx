import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/router';
import React from 'react';

export default function Dashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const [exchangeRate, setExchangeRate] = useState('13.5');
  const [loading, setLoading] = useState(true);
  const [savingRate, setSavingRate] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkUserAndFetch();
  }, []);

  async function checkUserAndFetch() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    setUserProfile(profile);
    fetchData(profile);
  }

  async function fetchData(profile: any) {
    // Получаем курс
    const { data: rateData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'exchange_rate')
      .single();
    if (rateData) setExchangeRate(rateData.value);

    // Запрос заказов с учетом роли
    let query = supabase.from('orders').select('*, order_items(*)');
    
    if (profile.role === 'client') {
      query = query.eq('client_id', profile.id);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (!error) setOrders(data || []);
    setLoading(false);
  }

  const toggleOrder = (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedOrders(prev => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <header className="mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-blue-900">OrientLogistik</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-gray-500 text-sm">{userProfile?.full_name}</span>
            <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">
              {userProfile?.role}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {userProfile?.role === 'admin' && (
            <button 
              onClick={() => router.push('/admin/users')}
              className="text-sm font-bold text-blue-600 hover:underline"
            >
              Управление пользователями
            </button>
          )}

          {(userProfile?.role === 'admin' || userProfile?.role === 'ispolnitel') && (
            <div className="flex items-center gap-4 bg-white p-3 rounded-xl shadow-sm border border-gray-100">
              <div className="text-right">
                <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Курс RMB/RUB</p>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" step="0.1"
                    className="w-16 font-bold text-blue-600 text-sm outline-none"
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(e.target.value)}
                  />
                  <span className="text-gray-400">₽</span>
                </div>
              </div>
            </div>
          )}

          <button 
            onClick={() => router.push('/create-order')}
            className="rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700 font-bold shadow-lg shadow-blue-100"
          >
            + Новая заявка
          </button>
          
          <button onClick={handleLogout} className="text-gray-400 hover:text-red-500">
            Выйти
          </button>
        </div>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Итого (RUB)</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">Загрузка данных...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">Заказов пока нет</td></tr>
              ) : (
                orders.map((order) => (
                  <React.Fragment key={order.id}>
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
                          order.status === 'approved' ? 'bg-green-100 text-green-700' : 
                          order.status === 'calculation' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        {order.total_amount_rub?.toLocaleString()} ₽
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button className="text-blue-600 hover:text-blue-900">Открыть</button>
                      </td>
                    </tr>

                    {expandedOrders[order.id] && (
                      <tr className="bg-gray-50">
                        <td colSpan={6} className="px-12 py-4">
                          <div className="border border-gray-200 rounded-lg bg-white overflow-hidden shadow-inner p-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              {order.order_items?.map((item: any) => (
                                <div key={item.id} className="flex items-center gap-3 p-2 border rounded">
                                  <div className="w-10 h-10 bg-gray-100 rounded overflow-hidden">
                                    {item.photo_url && <img src={item.photo_url} className="w-full h-full object-cover" />}
                                  </div>
                                  <div className="text-xs truncate">
                                    <div className="font-bold">{item.name_ru}</div>
                                    <div className="text-gray-500">{item.actual_qty || item.total_qty} шт.</div>
                                  </div>
                                </div>
                              ))}
                            </div>
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
