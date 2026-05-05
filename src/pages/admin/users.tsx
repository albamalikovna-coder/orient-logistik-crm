import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/router';

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAdmin();
    fetchUsers();
  }, []);

  async function checkAdmin() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      alert('Доступ запрещен');
      router.push('/');
    }
  }

  async function fetchUsers() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch users error:', error);
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  }

  async function updateRole(userId: string, newRole: string) {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (!error) fetchUsers();
  }

  async function toggleBlock(userId: string, currentBlock: boolean) {
    const { error } = await supabase
      .from('profiles')
      .update({ is_blocked: !currentBlock })
      .eq('id', userId);

    if (!error) fetchUsers();
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-blue-900">Управление пользователями</h1>
            <p className="text-gray-500 text-sm">Назначайте роли и блокируйте доступ</p>
          </div>
          <button 
            onClick={() => router.push('/')}
            className="text-blue-600 font-bold hover:underline"
          >
            ← Назад в CRM
          </button>
        </header>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Пользователь</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Роль</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Статус</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-4 text-center">Загрузка...</td></tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className={user.is_blocked ? 'bg-red-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">{user.full_name || 'Без имени'}</div>
                      <div className="text-xs text-gray-500">{user.id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm capitalize">
                      <select 
                        className="bg-transparent border rounded p-1"
                        value={user.role}
                        onChange={(e) => updateRole(user.id, e.target.value)}
                      >
                        <option value="client">Клиент</option>
                        <option value="ispolnitel">Исполнитель</option>
                        <option value="admin">Админ</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-[10px] font-bold rounded-full ${
                        user.is_blocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {user.is_blocked ? 'ЗАБЛОКИРОВАН' : 'АКТИВЕН'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button 
                        onClick={() => toggleBlock(user.id, user.is_blocked)}
                        className={`font-bold ${user.is_blocked ? 'text-green-600' : 'text-red-600'} hover:underline`}
                      >
                        {user.is_blocked ? 'Разблокировать' : 'Заблокировать'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
