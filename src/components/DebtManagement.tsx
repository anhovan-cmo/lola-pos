import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, where, doc, updateDoc, addDoc, orderBy } from 'firebase/firestore';
import { Debt } from '../types';
import { Wallet, Landmark, ArrowRightCircle, CreditCard, Clock, AlertCircle, PlusCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface DebtManagementProps {
  currentUser: any;
  userRole: string;
}

export default function DebtManagement({ currentUser, userRole }: DebtManagementProps) {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'receivable' | 'payable'>('all');
  const [isAddingDebt, setIsAddingDebt] = useState(false);
  
  const isPrivileged = userRole === 'admin' || userRole === 'accountant' || currentUser.email === 'anhovan.cmo@gmail.com';

  // New debt state
  const [newDebt, setNewDebt] = useState<Partial<Debt>>({
    type: 'receivable',
    personName: '',
    amount: 0,
    remainingAmount: 0,
    dueDate: '',
    status: 'pending'
  });

  useEffect(() => {
    let q;
    if (isPrivileged) {
      q = query(collection(db, 'debts'), orderBy('createdAt', 'desc'));
    } else {
      q = query(
        collection(db, 'debts'), 
        where('ownerId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );
    }
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Debt));
      setDebts(dData);
    });
    return () => unsubscribe();
  }, [isPrivileged, currentUser.uid]);

  const handleAddDebt = async () => {
    if (!newDebt.personName || !newDebt.amount) return;
    try {
      await addDoc(collection(db, 'debts'), {
        ...newDebt,
        remainingAmount: newDebt.amount,
        createdAt: new Date().toISOString(),
        ownerId: currentUser.uid
      });
      setIsAddingDebt(false);
      setNewDebt({ type: 'receivable', personName: '', amount: 0, status: 'pending' });
    } catch (error) {
      console.error("Failed to add debt:", error);
    }
  };

  const updatePayment = async (debtId: string, amountPaid: number, remaining: number) => {
    const newRemaining = Math.max(0, remaining - amountPaid);
    const newStatus = newRemaining === 0 ? 'paid' : 'partially_paid';
    
    try {
      await updateDoc(doc(db, 'debts', debtId), {
        remainingAmount: newRemaining,
        status: newStatus
      });
    } catch (error) {
      console.error("Payment update failed:", error);
    }
  };

  const stats = {
    receivable: debts.filter(d => d.type === 'receivable' && d.status !== 'paid').reduce((sum, d) => sum + d.remainingAmount, 0),
    payable: debts.filter(d => d.type === 'payable' && d.status !== 'paid').reduce((sum, d) => sum + d.remainingAmount, 0),
  };

  const formatCurrency = (amt: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amt);

  const filteredDebts = debts.filter(d => filterType === 'all' || d.type === filterType);

  return (
    <div className="space-y-8">
      {/* Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-emerald-50 p-8 rounded-[2.5rem] border border-emerald-100 flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-emerald-600">
              <ArrowRightCircle className="w-4 h-4" />
              <p className="text-[10px] font-black uppercase tracking-widest">Nợ phải thu (Khách hữu)</p>
            </div>
            <h3 className="text-3xl font-serif font-black text-emerald-900">{formatCurrency(stats.receivable)}</h3>
            <p className="text-xs text-emerald-700 italic">Tổng số nợ từ người mua vật phẩm</p>
          </div>
          <div className="w-16 h-16 bg-emerald-600 rounded-3xl flex items-center justify-center text-white shadow-lg">
            <Wallet className="w-8 h-8" />
          </div>
        </div>

        <div className="bg-rose-50 p-8 rounded-[2.5rem] border border-rose-100 flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-rose-600">
              <Landmark className="w-4 h-4" />
              <p className="text-[10px] font-black uppercase tracking-widest">Nợ phải trả (Nhà cung cấp)</p>
            </div>
            <h3 className="text-3xl font-serif font-black text-rose-900">{formatCurrency(stats.payable)}</h3>
            <p className="text-xs text-rose-700 italic">Khoản nợ chưa tất toán với bạn hàng</p>
          </div>
          <div className="w-16 h-16 bg-rose-600 rounded-3xl flex items-center justify-center text-white shadow-lg shadow-rose-200">
            <CreditCard className="w-8 h-8" />
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] border border-wood-100 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-wood-900" />
            <h3 className="text-xl font-serif font-bold text-wood-900">Chi tiết Sổ nợ</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex bg-wood-50 p-1 rounded-xl">
              {(['all', 'receivable', 'payable'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                    filterType === t ? "bg-white text-wood-900 shadow-sm" : "text-wood-400 hover:text-wood-600"
                  )}
                >
                  {t === 'all' ? 'Tất cả' : t === 'receivable' ? 'Phải thu' : 'Phải trả'}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setIsAddingDebt(true)}
              className="flex items-center gap-2 px-4 py-2 bg-wood-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-all"
            >
              <PlusCircle className="w-4 h-4" /> Ghi nợ mới
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-[10px] font-bold text-wood-400 uppercase tracking-widest border-b border-wood-50">
                <th className="px-6 py-4">Đối tượng</th>
                <th className="px-6 py-4">Loại nợ</th>
                <th className="px-6 py-4">Tổng gốc</th>
                <th className="px-6 py-4">Còn lại</th>
                <th className="px-6 py-4">Hạn định</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-wood-50">
              {filteredDebts.map((debt) => (
                <tr key={debt.id} className="group hover:bg-wood-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-bold text-wood-900">{debt.personName}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-widest",
                      debt.type === 'receivable' ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {debt.type === 'receivable' ? 'Thu' : 'Trả'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-wood-600">{formatCurrency(debt.amount)}</td>
                  <td className="px-6 py-4">
                    <span className="font-mono font-bold text-wood-900">{formatCurrency(debt.remainingAmount)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-xs flex items-center gap-1",
                      debt.dueDate && new Date(debt.dueDate) < new Date() && debt.status !== 'paid' ? "text-rose-500 font-bold" : "text-wood-400"
                    )}>
                      {debt.dueDate ? new Date(debt.dueDate).toLocaleDateString() : 'Không hạn'}
                      {debt.dueDate && new Date(debt.dueDate) < new Date() && debt.status !== 'paid' && <AlertCircle className="w-3 h-3" />}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                      debt.status === 'paid' ? "bg-emerald-50 text-emerald-600" :
                      debt.status === 'partially_paid' ? "bg-amber-50 text-amber-600" :
                      "bg-rose-50 text-rose-600"
                    )}>
                      {debt.status === 'paid' ? 'Đã tất toán' : debt.status === 'partially_paid' ? 'Trả một phần' : 'Chưa trả'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {debt.status !== 'paid' && (
                      <button 
                        onClick={() => {
                          const pay = prompt("Nhập số tiền thanh toán:", debt.remainingAmount.toString());
                          if (pay) updatePayment(debt.id, Number(pay), debt.remainingAmount);
                        }}
                        className="p-2 hover:bg-wood-100 rounded-lg text-wood-600 hover:text-wood-900 transition-all"
                        title="Thanh toán nợ"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isAddingDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 border border-wood-100 shadow-2xl">
            <h3 className="text-2xl font-serif font-black text-wood-900 mb-8 border-b border-wood-50 pb-4">Ghi danh Sổ nợ</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className="text-[10px] font-black text-wood-400 uppercase tracking-widest mb-2 block">Loại hình</label>
                <div className="flex bg-wood-50 p-1 rounded-2xl">
                  <button 
                    onClick={() => setNewDebt({...newDebt, type: 'receivable'})}
                    className={cn(
                      "flex-1 py-3 rounded-xl text-xs font-bold transition-all",
                      newDebt.type === 'receivable' ? "bg-white text-emerald-600 shadow-sm" : "text-wood-400 hover:text-wood-600"
                    )}
                  >
                    Nợ phải thu
                  </button>
                  <button 
                    onClick={() => setNewDebt({...newDebt, type: 'payable'})}
                    className={cn(
                      "flex-1 py-3 rounded-xl text-xs font-bold transition-all",
                      newDebt.type === 'payable' ? "bg-white text-rose-600 shadow-sm" : "text-wood-400 hover:text-wood-600"
                    )}
                  >
                    Nợ phải trả
                  </button>
                </div>
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-black text-wood-400 uppercase tracking-widest mb-2 block">Tên đối tượng (Khách/Bạn hàng)</label>
                <input 
                  type="text" 
                  value={newDebt.personName}
                  onChange={(e) => setNewDebt({...newDebt, personName: e.target.value})}
                  className="w-full px-6 py-4 bg-wood-50 border border-wood-100 rounded-2xl outline-none focus:ring-2 focus:ring-wood-200 font-medium"
                  placeholder="Nhập tên người giao kèo..."
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-wood-400 uppercase tracking-widest mb-2 block">Số tiền gốc</label>
                <input 
                  type="number" 
                  value={newDebt.amount}
                  onChange={(e) => setNewDebt({...newDebt, amount: Number(e.target.value)})}
                  className="w-full px-6 py-4 bg-wood-50 border border-wood-100 rounded-2xl outline-none focus:ring-2 focus:ring-wood-200 font-mono font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-wood-400 uppercase tracking-widest mb-2 block">Hạn định trả</label>
                <input 
                  type="date" 
                  value={newDebt.dueDate}
                  onChange={(e) => setNewDebt({...newDebt, dueDate: e.target.value})}
                  className="w-full px-6 py-4 bg-wood-50 border border-wood-100 rounded-2xl outline-none focus:ring-2 focus:ring-wood-200"
                />
              </div>
            </div>
            <div className="flex items-center gap-4 mt-10">
              <button 
                onClick={() => setIsAddingDebt(false)}
                className="flex-1 py-4 text-wood-500 font-bold hover:bg-wood-50 rounded-2xl transition-all"
              >
                Trở ra
              </button>
              <button 
                onClick={handleAddDebt}
                className="flex-3 py-4 bg-wood-900 text-white rounded-2xl font-black shadow-lg hover:shadow-xl hover:bg-black transition-all"
              >
                Ấn định sổ nợ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
