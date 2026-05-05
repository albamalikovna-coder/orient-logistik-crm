import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';

export default function OrderDetails() {
  const router = useRouter();
  const { id } = router.query;
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [extraCharges, setExtraCharges] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // Состояние для нового доп. расхода
  const [newCharge, setNewCharge] = useState({ name: '', amount_rmb: '' });

  useEffect(() => {
    if (id) fetchAllData();
  }, [id]);

  async function fetchAllData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    setProfile(profileData);

    const { data: orderData } = await supabase.from('orders').select('*').eq('id', id).single();
    const { data: itemsData } = await supabase.from('order_items').select('*').eq('order_id', id);
    const { data: chargesData } = await supabase.from('order_extra_charges').select('*').eq('order_id', id);

    setOrder(orderData);
    setItems(itemsData || []);
    setExtraCharges(chargesData || []);
    setLoading(false);
  }

  async function updateItem(itemId: string, field: string, value: any) {
    const { error } = await supabase
      .from('order_items')
      .update({ [field]: value })
      .eq('id', itemId);
    if (!error) fetchAllData();
  }

  async function addExtraCharge() {
    if (!newCharge.name || !newCharge.amount_rmb) return;
    const rmb = parseFloat(newCharge.amount_rmb);
    const { error } = await supabase
      .from('order_extra_charges')
      .insert([{
        order_id: id,
        name: newCharge.name,
        amount_rmb: rmb,
        amount_rub: rmb * order.exchange_rate
      }]);
    
    if (!error) {
      setNewCharge({ name: '', amount_rmb: '' });
      fetchAllData();
      recalculateTotal();
    }
  }

  async function recalculateTotal() {
    // Считаем сумму товаров (берем актуальную цену, если есть)
    const itemsTotal = items.reduce((sum, item) => {
      const price = item.actual_price_rmb !== null ? item.actual_price_rmb : item.price_per_unit_rmb;
      const qty = item.actual_qty !== null ? item.actual_qty : item.total_qty;
      return sum + (price * qty);
    }, 0);

    // Считаем доп. расходы
    const chargesTotal = extraCharges.reduce((sum, charge) => sum + charge.amount_rmb, 0);
    const finalRmb = itemsTotal + chargesTotal;

    await supabase
      .from('orders')
      .update({
        total_amount_rmb: finalRmb,
        total_amount_rub: finalRmb * order.exchange_rate,
        status: profile.role === 'ispolnitel' || profile.role === 'admin' ? 'calculation' : order.status
      })
      .eq('id', id);
    
    fetchAllData();
  }

  async function approveOrder() {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'approved', is_approved_by_client: true })
      .eq('id', id);
    if (!error) fetchAllData();
  }

  if (loading) return <div className="p-8 text-center">Загрузка...</div>;

  const isExecutive = profile?.role === 'admin' || profile?.role === 'ispolnitel';

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-6">
          <button onClick={() => router.push('/')} className="text-blue-600 font-bold">← Назад</button>
          <div className="text-right">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
              order.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
            }`}>
              Статус: {order.status}
            </span>
          </div>
        </header>

        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 mb-6">
          <h1 className="text-2xl font-bold text-blue-900 mb-4">Заказ: {order.company_name}</h1>
          <p className="text-gray-500 mb-6">{order.notes}</p>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Товар</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">План (Клиент)</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Факт (Исполнитель)</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-400 uppercase">Итого</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <img src={item.photo_url} className="w-12 h-12 rounded object-cover border" />
                        <div>
                          <div className="font-bold text-sm">{item.name_ru}</div>
                          <a href={item.link} target="_blank" className="text-[10px] text-blue-500 hover:underline">Ссылка на товар</a>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-400 italic">
                      {item.price_per_unit_rmb} ¥ × {item.total_qty} шт.
                    </td>
                    <td className="px-4 py-4">
                      {isExecutive ? (
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            className="w-16 border rounded p-1 text-sm font-bold text-blue-600"
                            placeholder={item.price_per_unit_rmb}
                            value={item.actual_price_rmb || ''}
                            onChange={(e) => updateItem(item.id, 'actual_price_rmb', parseFloat(e.target.value))}
                          />
                          <span className="text-xs">¥</span>
                          <input 
                            type="number" 
                            className="w-12 border rounded p-1 text-sm font-bold text-blue-600"
                            placeholder={item.total_qty}
                            value={item.actual_qty || ''}
                            onChange={(e) => updateItem(item.id, 'actual_qty', parseInt(e.target.value))}
                          />
                          <span className="text-xs">шт.</span>
                        </div>
                      ) : (
                        <div className={`text-sm font-bold ${item.actual_price_rmb ? 'text-blue-600' : 'text-gray-400'}`}>
                          {item.actual_price_rmb || item.price_per_unit_rmb} ¥ × {item.actual_qty || item.total_qty} шт.
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right font-bold">
                      {((item.actual_price_rmb || item.price_per_unit_rmb) * (item.actual_qty || item.total_qty)).toLocaleString()} ¥
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Секция доп. расходов */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 mb-6">
          <h2 className="text-lg font-bold text-gray-700 mb-4">Дополнительные расходы (комиссии, логистика)</h2>
          <div className="space-y-3 mb-4">
            {extraCharges.map((charge) => (
              <div key={charge.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">{charge.name}</span>
                <span className="font-bold">{charge.amount_rmb.toLocaleString()} ¥ ({charge.amount_rub.toLocaleString()} ₽)</span>
              </div>
            ))}
          </div>

          {isExecutive && (
            <div className="flex gap-2 mt-4">
              <input 
                type="text" placeholder="Название (Доставка, комиссия...)" 
                className="flex-1 border rounded-lg p-2 text-sm"
                value={newCharge.name}
                onChange={(e) => setNewCharge({...newCharge, name: e.target.value})}
              />
              <input 
                type="number" placeholder="Сумма ¥" 
                className="w-32 border rounded-lg p-2 text-sm"
                value={newCharge.amount_rmb}
                onChange={(e) => setNewCharge({...newCharge, amount_rmb: e.target.value})}
              />
              <button onClick={addExtraCharge} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm">Добавить</button>
            </div>
          )}
        </div>

        {/* Итоговый блок */}
        <div className="bg-blue-900 text-white rounded-2xl p-8 shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <div className="text-blue-300 text-sm uppercase font-bold tracking-widest mb-1">Итого к оплате</div>
            <div className="text-4xl font-black">
              {order.total_amount_rub?.toLocaleString()} ₽
              <span className="text-lg ml-2 text-blue-300 font-normal">({order.total_amount_rmb?.toLocaleString()} ¥)</span>
            </div>
            <div className="text-xs text-blue-400 mt-2 italic">*Расчет произведен по курсу: 1 ¥ = {order.exchange_rate} ₽</div>
          </div>

          {profile.role === 'client' && order.status !== 'approved' && (
            <button 
              onClick={approveOrder}
              className="bg-green-500 hover:bg-green-600 text-white px-10 py-4 rounded-xl font-bold text-lg shadow-lg shadow-green-900/20"
            >
              Согласовать расчет ✅
            </button>
          )}

          {isExecutive && (
            <button 
              onClick={recalculateTotal}
              className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-xl font-bold"
            >
              Пересчитать итоги 🔄
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
