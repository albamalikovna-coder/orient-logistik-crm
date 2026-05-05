import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';

export default function OrderDetails() {
  const router = useRouter();
  const { id } = router.query;
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Курсы валют
  const [rates, setRates] = useState({ usd: 92.5, cny: 12.8, cross: 7.22 });

  useEffect(() => {
    if (id) {
      fetchRates();
      fetchAllData();
    }
  }, [id]);

  async function fetchRates() {
    try {
      const res = await fetch('https://www.cbr-xml-daily.ru/daily_json.js');
      const data = await res.json();
      const usd = data.Valute.USD.Value;
      const cny = data.Valute.CNY.Value;
      setRates({
        usd: usd,
        cny: cny,
        cross: usd / cny
      });
    } catch (e) {
      console.error('Error fetching CBR rates');
    }
  }

  async function fetchAllData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setProfile(profileData);

    const { data: orderData } = await supabase.from('orders').select('*').eq('id', id).single();
    const { data: itemsData } = await supabase.from('order_items').select('*').eq('order_id', id);

    setOrder(orderData);
    setItems(itemsData || []);
    setLoading(false);
  }

  async function updateItem(itemId: string, field: string, value: any) {
    const { error } = await supabase.from('order_items').update({ [field]: value }).eq('id', itemId);
    if (!error) fetchAllData();
  }

  async function updateOrder(field: string, value: any) {
    const { error } = await supabase.from('orders').update({ [field]: value }).eq('id', id);
    if (!error) fetchAllData();
  }

  if (loading) return <div className="p-8 text-center text-blue-900 font-bold">Загрузка калькулятора...</div>;

  const isExecutive = profile?.role === 'admin' || profile?.role === 'ispolnitel';
  
  // Расчеты
  const totalInvoiceRmb = items.reduce((sum, item) => sum + ((item.actual_price_rmb || item.price_per_unit_rmb) * (item.actual_qty || item.total_qty)), 0);
  const totalInvoiceUsd = totalInvoiceRmb / rates.cross;

  const totalDutyRmb = items.reduce((sum, item) => {
    const cost = (item.actual_price_rmb || item.price_per_unit_rmb) * (item.actual_qty || item.total_qty);
    return sum + (cost * (item.duty_percent || 0) / 100);
  }, 0);

  const totalVatRmb = items.reduce((sum, item) => {
    const cost = (item.actual_price_rmb || item.price_per_unit_rmb) * (item.actual_qty || item.total_qty);
    const duty = cost * (item.duty_percent || 0) / 100;
    return sum + ((cost + duty) * 0.22); // НДС 22%
  }, 0);

  const totalCustomsRmb = totalDutyRmb + totalVatRmb;
  const totalCustomsUsd = totalCustomsRmb / rates.cross;

  const logisticUsd = parseFloat(order.logistic_cost_usd) || 0;
  const bankUsd = parseFloat(order.bank_fees_usd) || 0;
  const serviceUsd = parseFloat(order.company_service_usd) || 0;
  const certUsd = parseFloat(order.certification_usd) || 0;
  const labelUsd = parseFloat(order.labeling_usd) || 0;

  const grandTotalUsd = totalInvoiceUsd + totalCustomsUsd + logisticUsd + bankUsd + serviceUsd + certUsd + labelUsd;
  const grandTotalRub = grandTotalUsd * rates.usd;

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm">
          <button onClick={() => router.push('/')} className="text-blue-600 font-bold flex items-center gap-2">
            <span>←</span> Список заказов
          </button>
          <div className="flex gap-4 items-center">
             <div className="text-[10px] text-blue-400 font-bold bg-blue-50 px-2 py-1 rounded">V2.0 LOGISTIC PRO</div>
             <div className="text-xs text-gray-400">Курс ЦБ: 1$ = {rates.usd.toFixed(2)}₽ | 1¥ = {rates.cny.toFixed(2)}₽</div>
             <span className="bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">{order.status}</span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Левая колонка: Товары */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 p-4 border-b border-gray-200 flex justify-between">
                <h2 className="font-bold text-gray-700">Товары и параметры груза</h2>
                <div className="text-xs text-gray-400">НДС зафиксирован: 22%</div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50/50 text-gray-400 uppercase text-[10px] font-bold">
                    <tr>
                      <th className="px-4 py-3 text-left">Наименование</th>
                      <th className="px-4 py-3 text-left">Параметры (ТН ВЭД / Вес / Объем)</th>
                      <th className="px-4 py-3 text-left">Цена (¥) / Кол-во</th>
                      <th className="px-4 py-3 text-left">Пошлина %</th>
                      <th className="px-4 py-3 text-right">Инвойс ($)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <img src={item.photo_url} className="w-10 h-10 rounded shadow-sm object-cover" />
                            <div className="font-bold text-gray-800">{item.name_ru}</div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {isExecutive ? (
                            <div className="grid grid-cols-3 gap-1">
                              <input placeholder="ТН ВЭД" className="border rounded p-1 text-[10px]" value={item.hscode || ''} onChange={(e) => updateItem(item.id, 'hscode', e.target.value)} />
                              <input placeholder="Вес кг" type="number" className="border rounded p-1 text-[10px]" value={item.weight_kg || ''} onChange={(e) => updateItem(item.id, 'weight_kg', parseFloat(e.target.value))} />
                              <input placeholder="Объем м3" type="number" className="border rounded p-1 text-[10px]" value={item.volume_m3 || ''} onChange={(e) => updateItem(item.id, 'volume_m3', parseFloat(e.target.value))} />
                            </div>
                          ) : (
                            <div className="text-xs text-gray-500">
                              {item.hscode} | {item.weight_kg}кг | {item.volume_m3}м³
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {isExecutive ? (
                            <div className="flex gap-1">
                              <input type="number" className="w-14 border rounded p-1 font-bold text-blue-600" value={item.actual_price_rmb || ''} placeholder={item.price_per_unit_rmb} onChange={(e) => updateItem(item.id, 'actual_price_rmb', parseFloat(e.target.value))} />
                              <input type="number" className="w-10 border rounded p-1" value={item.actual_qty || ''} placeholder={item.total_qty} onChange={(e) => updateItem(item.id, 'actual_qty', parseInt(e.target.value))} />
                            </div>
                          ) : (
                            <div className="font-medium">{item.actual_price_rmb || item.price_per_unit_rmb} ¥ × {item.actual_qty || item.total_qty} шт.</div>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {isExecutive ? (
                            <input type="number" className="w-12 border rounded p-1 font-bold text-orange-600" value={item.duty_percent || ''} onChange={(e) => updateItem(item.id, 'duty_percent', parseFloat(e.target.value))} />
                          ) : (
                            <span className="font-bold text-orange-600">{item.duty_percent}%</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right font-bold text-gray-900">
                          $ {(((item.actual_price_rmb || item.price_per_unit_rmb) * (item.actual_qty || item.total_qty)) / rates.cross).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Доставка и Платежи */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">🚚 Доставка</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Адрес / Срок</label>
                    {isExecutive ? (
                      <div className="flex gap-2">
                        <input className="flex-1 border rounded-lg p-2 text-sm" placeholder="Адрес доставки" value={order.address_delivery || ''} onChange={(e) => updateOrder('address_delivery', e.target.value)} />
                        <input className="w-24 border rounded-lg p-2 text-sm" placeholder="30-35 дней" value={order.delivery_days || ''} onChange={(e) => updateOrder('delivery_days', e.target.value)} />
                      </div>
                    ) : (
                      <div className="text-sm font-bold text-gray-800">{order.address_delivery} — {order.delivery_days}</div>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">💰 График платежей (₽)</h3>
                <div className="grid grid-cols-3 gap-2">
                  {['payment_1_rub', 'payment_2_rub', 'payment_3_rub'].map((key, i) => (
                    <div key={key}>
                      <label className="text-[10px] font-bold text-gray-400 uppercase">{i+1}-й платеж</label>
                      {isExecutive ? (
                        <input type="number" className="w-full border rounded-lg p-2 text-xs font-bold" value={order[key] || ''} onChange={(e) => updateOrder(key, parseFloat(e.target.value))} />
                      ) : (
                        <div className="text-sm font-bold">{order[key]?.toLocaleString()} ₽</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Правая колонка: Финансовый расчет (Excel style) */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg border-2 border-blue-600 overflow-hidden">
              <div className="bg-blue-600 p-4 text-white font-bold text-center uppercase tracking-widest text-sm">Итоговый расчет поставки</div>
              <div className="p-6 space-y-4">
                
                <div className="flex justify-between items-center text-sm border-b pb-2">
                  <span className="text-gray-500">Инвойсовая стоимость:</span>
                  <span className="font-bold text-lg">$ {totalInvoiceUsd.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center text-sm border-b pb-2">
                  <span className="text-gray-500">Таможенные платежи:</span>
                  <span className="font-bold text-orange-600">$ {totalCustomsUsd.toFixed(2)}</span>
                </div>

                <div className="space-y-3 pt-2">
                   {[
                     {label: 'Стоимость логистики', key: 'logistic_cost_usd'},
                     {label: 'Банковские расходы', key: 'bank_fees_usd'},
                     {label: 'Услуги компании', key: 'company_service_usd'},
                     {label: 'Сертификация', key: 'certification_usd'},
                     {label: 'Маркировка ЧЗ', key: 'labeling_usd'}
                   ].map((field) => (
                     <div key={field.key} className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">{field.label}:</span>
                        {isExecutive ? (
                          <div className="flex items-center gap-1">
                            <input type="number" className="w-20 border-b text-right outline-none focus:border-blue-500 text-sm font-bold" value={order[field.key] || ''} onChange={(e) => updateOrder(field.key, parseFloat(e.target.value))} />
                            <span className="text-xs text-gray-400">$</span>
                          </div>
                        ) : (
                          <span className="font-bold text-sm">$ {order[field.key]?.toLocaleString()}</span>
                        )}
                     </div>
                   ))}
                </div>

                <div className="mt-8 pt-6 border-t-2 border-dashed border-gray-100">
                  <div className="text-[10px] text-gray-400 uppercase font-black mb-1">Всего к оплате (₽)</div>
                  <div className="text-3xl font-black text-blue-900 tracking-tighter">
                    {grandTotalRub.toLocaleString(undefined, {maximumFractionDigits: 0})} ₽
                  </div>
                  <div className="text-xs text-gray-400 mt-2">
                    $ {grandTotalUsd.toLocaleString(undefined, {maximumFractionDigits: 2})} | {grandTotalUsd > 0 ? (grandTotalRub / items.reduce((s,i) => s + (i.actual_qty || i.total_qty), 0)).toFixed(0) : 0} ₽/шт
                  </div>
                </div>

                {profile?.role === 'client' && order.status !== 'approved' && (
                  <button onClick={async () => {
                    await supabase.from('orders').update({ status: 'approved' }).eq('id', id);
                    fetchAllData();
                  }} className="w-full bg-green-500 text-white py-4 rounded-xl font-bold mt-6 shadow-lg shadow-green-100 hover:bg-green-600 transition-all">
                    СОГЛАСОВАТЬ РАСЧЕТ ✅
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
