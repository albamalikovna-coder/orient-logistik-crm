import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/router';

export default function Dashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rates, setRates] = useState({ usd: 75.44, cny: 11.03, cross: 6.84 });
  const router = useRouter();

  useEffect(() => {
    fetch('https://www.cbr-xml-daily.ru/daily_json.js')
      .then(res => res.json())
      .then(data => {
        const usd = data.Valute.USD.Value;
        const cny = data.Valute.CNY.Value;
        setRates({ usd, cny, cross: usd / cny });
      }).catch(() => {});
  }, []);

  useEffect(() => {
    checkUserAndFetch();
  }, []);

  async function checkUserAndFetch() {
    setLoading(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.log('Auth error or no user:', authError);
        router.push('/login');
        return;
      }

      // Получаем профиль
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileError) {
        console.error('Profile error:', profileError);
        // Если профиля нет (триггер не успел сработать), создаем временный объект
        const fallbackProfile = { id: user.id, role: 'client', full_name: user.email };
        setUserProfile(fallbackProfile);
        fetchData(fallbackProfile);
      } else {
        setUserProfile(profile);
        fetchData(profile);
      }
    } catch (err) {
      console.error('General error in checkUser:', err);
      setLoading(false);
    }
  }

  async function fetchData(profile: any) {
    try {
      // Запрос заказов
      let query = supabase.from('orders').select('*, order_items(*)');
      
      if (profile && profile.role === 'client') {
        query = query.eq('client_id', profile.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Orders fetch error:', error);
      } else {
        setOrders(data || []);
      }
    } catch (err) {
      console.error('Data fetch error:', err);
    } finally {
      setLoading(false);
    }
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
            <span className="text-gray-500 text-sm">{userProfile?.full_name || userProfile?.id?.substring(0,8)}</span>
            <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">
              {userProfile?.role || 'user'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {userProfile?.role === 'admin' && (
            <button 
              onClick={() => router.push('/admin/users')}
              className="text-sm font-bold text-blue-600 hover:underline"
            >
              Пользователи
            </button>
          )}

          <button 
            onClick={() => router.push('/create-order')}
            className="rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700 font-bold shadow-lg shadow-blue-100"
          >
            + Новая заявка
          </button>
          
          <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 text-sm">
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
                          order.status === 'pending_payment' ? 'bg-green-100 text-green-700' : 
                          order.status === 'calculating' ? 'bg-yellow-100 text-yellow-700' : 
                          order.status === 'draft' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {order.status === 'pending_payment' ? 'Согласовано' : 
                           order.status === 'calculating' ? 'Расчет' : 
                           order.status === 'draft' ? 'Черновик' : order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        {Math.round(
                          (parseFloat(order.payment_1_rub || 0) + 
                           parseFloat(order.payment_2_rub || 0) + 
                           parseFloat(order.payment_3_rub || 0)) || (order.total_amount_rub || 0)
                        ).toLocaleString()} ₽
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button className="text-blue-600 hover:text-blue-900">Открыть</button>
                      </td>
                    </tr>

                    {expandedOrders[order.id] && (
                      <tr className="bg-gray-50/30">
                        <td colSpan={6} className="px-6 pb-8 pt-2">
                          <div className="bg-white border border-gray-100 rounded-[24px] shadow-xl shadow-gray-200/50 overflow-hidden p-8 space-y-8">
                            
                            <div className="flex flex-col lg:flex-row gap-8">
                              {/* Левая часть: Параметры груза и Доставка */}
                              <div className="flex-1 space-y-6">
                                {/* Параметры груза */}
                                <div className="bg-gray-50/50 rounded-2xl p-6 border border-gray-100">
                                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Параметры груза</h4>
                                  <div className="space-y-4">
                                    {order.order_items?.map((item: any) => (
                                      <div key={item.id} className="flex items-center justify-between p-4 bg-white border border-gray-50 rounded-2xl shadow-sm">
                                        <div className="flex items-center gap-5">
                                          <div className="w-14 h-14 bg-gray-50 rounded-xl overflow-hidden flex-shrink-0 border border-gray-100">
                                            {item.photo_url && <img src={item.photo_url} className="w-full h-full object-cover" alt={item.name_ru} />}
                                          </div>
                                          <div>
                                            <div className="text-sm font-black text-gray-800">{item.name_ru}</div>
                                            <div className="text-[10px] text-gray-400 font-bold mt-1">
                                              {item.hscode || '80000'} | {item.weight_kg || 0} кг | {item.volume_m3 || 0} м³
                                            </div>
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <div className="text-xs font-black text-gray-400">
                                            <span className="text-blue-600">{(item.actual_price_rmb || item.price_per_unit_rmb)} ¥</span> × {(item.actual_qty || item.total_qty)} шт.
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Доставка */}
                                <div className="bg-gray-50/50 rounded-2xl p-6 border border-gray-100">
                                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Доставка и сроки</h4>
                                  <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-gray-50 flex items-center justify-center text-xl">📍</div>
                                    <div>
                                      <div className="font-black text-gray-800 text-sm">{order.address_delivery || 'Адрес уточняется'}</div>
                                      <div className="text-xs text-gray-400 font-bold mt-0.5">{order.delivery_days || 'Сроки уточняются'}</div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Правая часть: Финансовый блок (Градиент) */}
                              <div className="lg:w-[400px] bg-gradient-to-br from-[#1e40af] via-[#3b82f6] to-[#6366f1] rounded-[32px] p-8 text-white shadow-2xl shadow-blue-200 relative overflow-hidden flex flex-col justify-between">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                                <div className="relative z-10">
                                  <h4 className="text-[10px] font-black text-blue-100 uppercase tracking-[0.2em] mb-8 opacity-80">Финансовый расчет</h4>
                                  <div className="space-y-4">
                                    <div className="flex justify-between items-center text-sm border-b border-white/10 pb-3">
                                      <div className="flex items-center gap-3">
                                        <span className="opacity-80">📦</span>
                                        <span className="font-bold opacity-90 text-[11px]">Товары (Invoice):</span>
                                      </div>
                                      <span className="font-black text-sm">$ {(order.order_items?.reduce((sum: number, item: any) => {
                                        const p = parseFloat(item.actual_price_rmb || item.price_per_unit_rmb) || 0;
                                        const q = parseFloat(item.actual_qty || item.total_qty) || 0;
                                        return sum + (p * q);
                                      }, 0) / rates.cross).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm border-b border-white/10 pb-3">
                                      <div className="flex items-center gap-3">
                                        <span className="opacity-80">🛂</span>
                                        <span className="font-bold opacity-90 text-[11px]">Таможня (Пошлина+НДС):</span>
                                      </div>
                                      <span className="font-black text-sm">
                                        $ {(
                                          (order.order_items?.reduce((sum: number, item: any) => {
                                            const p = parseFloat(item.actual_price_rmb || item.price_per_unit_rmb) || 0;
                                            const q = parseFloat(item.actual_qty || item.total_qty) || 0;
                                            const cost = p * q;
                                            const duty = cost * (parseFloat(item.duty_percent || 0) / 100);
                                            const vat = (cost + duty) * 0.22;
                                            return sum + duty + vat;
                                          }, 0) / rates.cross)
                                        ).toFixed(2)}
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm border-b border-white/10 pb-3">
                                      <div className="flex items-center gap-3">
                                        <span className="opacity-80">🚢</span>
                                        <span className="font-bold opacity-90 text-[11px]">Логистика:</span>
                                      </div>
                                      <span className="font-black text-sm">$ {order.logistic_cost_usd || 0}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm border-b border-white/10 pb-3">
                                      <div className="flex items-center gap-3">
                                        <span className="opacity-80">🔮</span>
                                        <span className="font-bold opacity-90 text-[11px]">Прочие расходы:</span>
                                      </div>
                                      <span className="font-black text-sm">
                                        $ {(
                                          parseFloat(order.bank_fees_usd || 0) + 
                                          parseFloat(order.company_service_usd || 0) + 
                                          parseFloat(order.certification_usd || 0) + 
                                          parseFloat(order.labeling_usd || 0)
                                        ).toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="relative z-10 mt-12 pt-6 border-t border-white/20">
                                  <div className="text-[10px] text-blue-100 uppercase font-black mb-1 opacity-80">Всего к оплате</div>
                                  <div className="text-4xl font-black tracking-tighter">
                                    {Math.round(
                                      (parseFloat(order.payment_1_rub || 0) + 
                                       parseFloat(order.payment_2_rub || 0) + 
                                       parseFloat(order.payment_3_rub || 0)) || (order.total_amount_rub || 0)
                                    ).toLocaleString()} ₽
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* График платежей */}
                            <div className="pt-6 border-t border-gray-100">
                              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">График платежей</h4>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {[
                                  {label: '1-й платеж', val: order.payment_1_rub},
                                  {label: '2-й платеж', val: order.payment_2_rub},
                                  {label: '3-й платеж', val: order.payment_3_rub}
                                ].map((p, i) => (
                                  <div key={i} className="bg-white border border-gray-100 rounded-[20px] p-5 shadow-sm flex items-center justify-between">
                                    <div>
                                      <div className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1">{p.label}</div>
                                      <div className="text-sm font-black text-gray-800">{Math.round(p.val || 0).toLocaleString()} ₽</div>
                                    </div>
                                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-lg shadow-inner">🗓️</div>
                                  </div>
                                ))}
                              </div>
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
