import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { Settings as SettingsIcon, Shield, User as UserIcon, Wallet, Save } from 'lucide-react';
import { cn } from '../lib/utils';

interface UserData {
  id: string;
  email: string;
  displayName: string;
  role: 'admin' | 'employee' | 'accountant';
  updatedAt: string;
}

interface SettingsProps {
  currentUser: FirebaseUser;
  currentUserRole: string;
}

export default function Settings({ currentUser, currentUserRole }: SettingsProps) {
  const [users, setUsers] = useState<UserData[]>([]);
  const isAdmin = currentUserRole === 'admin' || currentUser.email === 'anhovan.cmo@gmail.com';

  useEffect(() => {
    if (!isAdmin) return;

    const q = query(collection(db, 'users'), orderBy('email'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const uData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserData));
      setUsers(uData);
    });
    return () => unsubscribe();
  }, [isAdmin]);

  const updateRole = async (userId: string, newRole: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: newRole,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Failed to update role:", error);
    }
  };

  if (!isAdmin) {
    return (
      <div className="py-20 text-center">
        <Shield className="w-16 h-16 text-wood-100 mx-auto mb-4" />
        <h3 className="text-xl font-serif font-bold text-wood-900 mb-2">Quyền hạn không đủ</h3>
        <p className="text-wood-500 italic">Chỉ có nghệ nhân tối cao mới có quyền thay đổi cấu hình hệ thống.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-3xl border border-[#F0E6DC] shadow-sm space-y-6">
        <div className="flex items-center gap-3 border-b border-wood-50 pb-6">
          <div className="w-12 h-12 bg-wood-900 rounded-2xl flex items-center justify-center text-amber-400">
            <SettingsIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-serif font-bold text-wood-900">Quản khu Nhân sự</h3>
            <p className="text-sm text-wood-500 italic">Phân định vai trò và quyền hạn cho các thành viên trong tiệm</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-[10px] font-bold text-wood-400 uppercase tracking-widest border-b border-wood-50">
                <th className="px-6 py-4">Nhân sự</th>
                <th className="px-6 py-4">Email Liên lạc</th>
                <th className="px-6 py-4 text-center">Vai trò Ấn định</th>
                <th className="px-6 py-4 text-right">Cập nhật cuối</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-wood-50">
              {users.map((user) => (
                <tr key={user.id} className="group hover:bg-wood-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-wood-100 flex items-center justify-center text-wood-600 font-bold text-xs">
                        {user.displayName?.charAt(0) || user.email.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-bold text-wood-900">{user.displayName || 'Vô danh'}</span>
                      {user.id === currentUser.uid && (
                        <span className="text-[10px] bg-wood-900 text-white px-2 py-0.5 rounded-full">Bạn</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-wood-600">{user.email}</td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <select 
                        value={user.role}
                        onChange={(e) => updateRole(user.id, e.target.value)}
                        className={cn(
                          "px-4 py-2 border rounded-xl outline-none text-xs font-black transition-all appearance-none text-center cursor-pointer",
                          user.role === 'admin' ? "bg-amber-100 border-amber-200 text-amber-800" :
                          user.role === 'accountant' ? "bg-wood-100 border-wood-200 text-wood-800" :
                          "bg-stone-100 border-stone-200 text-stone-600"
                        )}
                      >
                        <option value="admin">Quản sự (Admin)</option>
                        <option value="accountant">Tả hữu (Kế toán)</option>
                        <option value="employee">Thợ việc (Nhân viên)</option>
                      </select>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-xs text-wood-400 font-medium">
                    {user.updatedAt ? new Date(user.updatedAt).toLocaleString() : 'Chưa rõ'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 space-y-3">
          <Shield className="w-8 h-8 text-amber-600" />
          <h4 className="font-serif font-bold text-amber-900">Quản sự (Admin)</h4>
          <p className="text-xs text-amber-700 italic">Toàn quyền điều phối bảo vật, giao kèo và nhân sự. Xem được mọi dữ liệu của tiệm.</p>
        </div>
        <div className="bg-wood-50 p-6 rounded-3xl border border-wood-100 space-y-3">
          <Wallet className="w-8 h-8 text-wood-600" />
          <h4 className="font-serif font-bold text-wood-900">Tả hữu (Kế toán)</h4>
          <p className="text-xs text-wood-700 italic">Theo dõi sổ sách, xem toàn bộ niên giám giao dịch và báo cáo tài chính.</p>
        </div>
        <div className="bg-stone-50 p-6 rounded-3xl border border-stone-100 space-y-3">
          <UserIcon className="w-8 h-8 text-stone-600" />
          <h4 className="font-serif font-bold text-stone-900">Thợ việc (Nhân viên)</h4>
          <p className="text-xs text-stone-700 italic">Chỉ quản lý được các giao kèo và bảo vật do mình tự tay lập ra.</p>
        </div>
      </div>
    </div>
  );
}
