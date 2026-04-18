import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Calculator, 
  Package, 
  History, 
  Search,
  Menu,
  X,
  LogOut,
  LogIn,
  Settings as SettingsIcon,
  Shield,
  BookOpen,
  BarChart4
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils.ts';
import { Product, Quote } from './types.ts';
import { INITIAL_PRODUCTS } from './constants.ts';
import { auth, db } from './lib/firebase.ts';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider, 
  signOut,
  User 
} from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  addDoc, 
  setDoc,
  getDoc,
  getDocFromServer,
  doc, 
  deleteDoc,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';

// View components
import Dashboard from './components/Dashboard.tsx';
import PriceCalculator from './components/PriceCalculator.tsx';
import ProductManagement from './components/ProductManagement.tsx';
import OrderHistory from './components/OrderHistory.tsx';
import Settings from './components/Settings.tsx';

import InventoryManagement from './components/InventoryManagement.tsx';
import FinanceDashboard from './components/FinanceDashboard.tsx';
import DebtManagementView from './components/DebtManagement.tsx';
import HelpGuide from './components/HelpGuide.tsx';

type View = 'dashboard' | 'calculator' | 'products' | 'orders' | 'inventory' | 'finance' | 'debts' | 'help' | 'settings';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string>('employee');
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [stockThreshold, setStockThreshold] = useState<number>(() => {
    const saved = localStorage.getItem('stockThreshold');
    return saved ? parseInt(saved) : 5;
  });

  useEffect(() => {
    localStorage.setItem('stockThreshold', stockThreshold.toString());
  }, [stockThreshold]);

  const adminEmails = ['anhovan.cmo@gmail.com', 'honggiahan644@gmail.com'];

  // Test Firestore Connection
  useEffect(() => {
    const testConnection = async () => {
      try {
        // Use a dummy doc to test connection to server
        await getDocFromServer(doc(db, '_internal_', 'connection_test'));
        console.log("Firestore connection verified.");
      } catch (error: any) {
        if (error.message?.includes('the client is offline')) {
          console.error("Please check your Firebase configuration: Client is offline.");
        } else {
          console.warn("Firestore connection test (not affecting functionality):", error.message);
        }
      }
    };
    testConnection();
  }, []);

  // Auth Listener
  useEffect(() => {
    // Timeout to prevent infinite loading if Firebase hangs
    const timer = setTimeout(() => {
      if (loading) {
        setLoading(false);
        console.warn("Loading timed out. Firebase initialization may have failed or taken too long.");
      }
    }, 15000); // 15 seconds timeout

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      clearTimeout(timer);
      
      // Handle redirect result if any
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          console.log("Redirect login successful");
        }
      } catch (err) {
        console.error("Redirect login error:", err);
      }

      try {
        if (u) {
          // Fetch or Create user profile
          const userDocRef = doc(db, 'users', u.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (!userDoc.exists()) {
            const role = adminEmails.includes(u.email || '') ? 'admin' : 'employee';
            const newUser = {
              email: u.email,
              displayName: u.displayName,
              role: role,
              updatedAt: new Date().toISOString()
            };
            await setDoc(userDocRef, newUser);
            setUserRole(role);
          } else {
            setUserRole(userDoc.data().role);
          }
          setUser(u);
        } else {
          setUser(null);
          setUserRole('employee');
        }
      } catch (error: any) {
        console.error("Auth listener error:", error);
        if (error.code === 'permission-denied') {
          alert("Lỗi phân quyền: Bạn không có quyền truy cập dữ liệu người dùng. Vui lòng thử đăng nhập lại hoặc liên hệ admin.");
        }
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Listen for role changes in real-time
  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      if (doc.exists()) {
        setUserRole(doc.data().role);
      }
    });
    return () => unsubscribe();
  }, [user]);

  // Firestore Sync - Products
  useEffect(() => {
    if (!user) return;
    
    // We'll show public products + user's products
    // For simplicity, let's just fetch all products for now if they are shared, 
    // or filter by ownerId if preferred.
    const q = query(collection(db, 'products'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      // If no products in DB yet, use initial ones
      setProducts(prods.length > 0 ? prods : INITIAL_PRODUCTS);
    });
    return () => unsubscribe();
  }, [user]);

  // Firestore Sync - Quotes
  useEffect(() => {
    if (!user) return;
    
    const isAdminView = userRole === 'admin' || userRole === 'accountant' || adminEmails.includes(user.email || '');

    let q;
    if (isAdminView) {
      q = query(collection(db, 'quotes'), orderBy('createdAt', 'desc'));
    } else {
      q = query(
        collection(db, 'quotes'), 
        where('ownerId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const qs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Quote));
      setQuotes(qs);
    });
    return () => unsubscribe();
  }, [user, userRole]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    // Force account selection to avoid auto-login loops if there's an issue
    provider.setCustomParameters({ prompt: 'select_account' });
    
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Login with popup failed:", error);
      
      const currentHost = window.location.hostname;
      const errorCode = error.code;
      
      if (errorCode === 'auth/unauthorized-domain' || errorCode === 'auth/popup-blocked') {
        console.log("Attempting fallback to redirect login...");
        try {
          await signInWithRedirect(auth, provider);
        } catch (redirError: any) {
          console.error("Redirect login failed:", redirError);
          const message = `LỖI XÁC THỰC:\n\n1. Hãy copy tên miền này: ${currentHost}\n2. Dán vào 'Authorized domains' trong Firebase Console.\n\nChi tiết lỗi: ${redirError.message}`;
          alert(message);
        }
      } else {
        const message = `ĐĂNG NHẬP THẤT BẠI\n\n- Tên miền hiện tại: ${currentHost}\n- Mã lỗi: ${errorCode}\n\nHƯỚNG DẪN: Hãy chắc chắn tên miền trên đã được thêm vào danh sách 'Authorized domains' trong cài đặt Authentication của dự án NAS FUGALO.`;
        alert(message);
      }
    }
  };

  const handleLogout = () => signOut(auth);

  const cleanData = (obj: any) => {
    const cleaned = { ...obj };
    Object.keys(cleaned).forEach(key => {
      if (cleaned[key] === undefined) {
        cleaned[key] = null;
      }
    });
    return cleaned;
  };

  const saveQuote = async (quote: Quote) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'quotes'), cleanData({
        ...quote,
        ownerId: user.uid,
      }));
    } catch (error) {
      console.error("Save quote failed:", error);
      throw error;
    }
  };

  const saveProduct = async (product: Product) => {
    if (!user) return;
    try {
      const { id, ...data } = product;
      await setDoc(doc(db, 'products', id), cleanData({
        ...data,
        ownerId: user.uid
      }));
    } catch (error) {
      console.error("Save product failed:", error);
      throw error;
    }
  };

  const deleteProduct = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (error) {
      console.error("Delete product failed:", error);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Lầu Ngắm Cảnh', icon: LayoutDashboard },
    { id: 'calculator', label: 'Định Giá Đồ Cổ', icon: Calculator },
    { id: 'products', label: 'Kho Cổ Vật', icon: Package },
    { id: 'orders', label: 'Niên Giám Giao Dịch', icon: History },
    { id: 'help', label: 'Kinh Nang Vận Hành', icon: BookOpen },
  ];

  const isAdmin = userRole === 'admin' || adminEmails.includes(user?.email || '');
  const isAccountant = userRole === 'accountant';
  
  const navToDisplay = [...navItems];
  
  if (isAdmin || isAccountant) {
    navToDisplay.push(
      { id: 'inventory', label: 'Kho Bãi & Tồn', icon: Package },
      { id: 'finance', label: 'Quản vụ Tài chính', icon: BarChart4 },
      { id: 'debts', label: 'Sổ cái Công nợ', icon: History }
    );
  }

  if (isAdmin) {
    navToDisplay.push({ id: 'settings', label: 'Quản khu Cấu hình', icon: SettingsIcon });
  }

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-wood-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-wood-200 border-t-wood-800 rounded-full animate-spin" />
          <p className="font-serif italic text-wood-600">Đang khởi tạo tâm khảm...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-wood-50 p-6">
        <div className="max-w-md w-full bg-white p-12 rounded-[3.5rem] border border-[#E5D8CC] shadow-2xl shadow-wood-100 flex flex-col items-center text-center space-y-10 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-wood-800 via-amber-400 to-wood-800" />
          
          <div className="w-24 h-24 bg-wood-900 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-wood-900/40 rotate-6 transform transition-transform hover:rotate-0 duration-500">
            <Calculator className="text-amber-400 w-12 h-12" />
          </div>

          <div className="space-y-4">
            <h1 className="text-5xl font-display font-black text-wood-900 tracking-tighter">LOLA POS</h1>
            <div className="flex flex-col gap-1">
              <p className="text-wood-500 font-serif italic text-lg leading-tight">Vinh vầy nét cổ, Định giá tầm cao</p>
              <div className="w-12 h-0.5 bg-amber-400 mx-auto" />
            </div>
          </div>

          <div className="w-full space-y-5 pt-4">
            <button 
              onClick={handleLogin}
              className="w-full py-5 bg-wood-900 text-white rounded-[2rem] font-bold flex items-center justify-center gap-3 hover:bg-wood-950 transition-all shadow-xl shadow-wood-900/10 active:scale-95"
            >
              <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                 <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" className="w-4 h-4" alt="" />
              </div>
              Đăng nhập Hệ thống
            </button>
            <div className="flex flex-col gap-1">
              <p className="small-caps opacity-60">Sổ lộ kinh thư nạp lục</p>
              <p className="text-[9px] text-wood-400 font-medium">Bảo mật đa tầng bằng tâm khảm số</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard 
            quotes={quotes} 
            products={products} 
            stockThreshold={stockThreshold}
          />
        );
      case 'calculator':
        return (
          <PriceCalculator 
            products={products} 
            onSaveQuote={saveQuote} 
          />
        );
      case 'products':
        return (
          <ProductManagement 
            products={products} 
            onAddProduct={saveProduct}
            onDeleteProduct={deleteProduct}
          />
        );
      case 'orders':
        return <OrderHistory quotes={quotes} />;
      case 'inventory':
        return (
          <InventoryManagement 
            products={products} 
            currentUser={user} 
            stockThreshold={stockThreshold}
            setStockThreshold={setStockThreshold}
          />
        );
      case 'finance':
        return <FinanceDashboard quotes={quotes} products={products} />;
      case 'debts':
        return <DebtManagementView currentUser={user} userRole={userRole} />;
      case 'help':
        return <HelpGuide />;
      case 'settings':
        return <Settings currentUser={user} currentUserRole={userRole} />;
      default:
        return (
          <Dashboard 
            quotes={quotes} 
            products={products} 
            stockThreshold={stockThreshold}
          />
        );
    }
  };

  return (
    <div className="flex h-screen bg-wood-50 text-wood-900 font-sans overflow-hidden">
      {/* Overlay for mobile sidebar */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar - Desktop & Mobile */}
      <aside 
        className={cn(
          "bg-white border-r border-wood-200 transition-all duration-500 flex flex-col z-50 fixed inset-y-0 left-0 lg:relative shadow-2xl shadow-black/[0.02]",
          isSidebarOpen ? "w-72" : "w-24",
          !isMobileMenuOpen && "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="p-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-4 overflow-hidden">
            <div className="w-12 h-12 bg-wood-900 rounded-2xl flex items-center justify-center shrink-0 shadow-xl shadow-wood-900/20 rotate-3 group-hover:rotate-0 transition-transform">
              <Calculator className="text-amber-400 w-7 h-7" />
            </div>
            {isSidebarOpen && (
              <div className="flex flex-col">
                <span className="font-display font-black text-2xl tracking-tighter text-wood-900">LOLA</span>
                <span className="small-caps -mt-1 opacity-50">Cổ Nghệ POS</span>
              </div>
            )}
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden p-2 text-wood-400 hover:text-wood-900"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-6 overflow-y-auto hidden-scrollbar">
          {navToDisplay.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setCurrentView(item.id as View);
                if (window.innerWidth < 1024) setIsMobileMenuOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-3xl transition-all duration-300 group relative overflow-hidden",
                currentView === item.id 
                  ? "bg-wood-900 text-white shadow-xl shadow-wood-900/20" 
                  : "text-wood-600 hover:bg-wood-50 hover:text-wood-900"
              )}
            >
              <item.icon className={cn("w-6 h-6 shrink-0 z-10", currentView === item.id ? "text-amber-400" : "text-wood-500 group-hover:text-wood-900")} />
              <span className={cn(
                "transition-all duration-500 whitespace-nowrap z-10 font-bold",
                !isSidebarOpen && "lg:opacity-0 lg:translate-x-10"
              )}>{item.label}</span>
              
              {currentView === item.id && (
                <motion.div 
                   layoutId="activeNav"
                   className="absolute inset-0 bg-wood-900 z-0"
                />
              )}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-wood-100 space-y-4 bg-wood-50/50">
            {isSidebarOpen ? (
                <div className="flex items-center gap-4 px-2 py-2">
                    <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white shadow-md shrink-0">
                        <img src={user.photoURL || ''} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-wood-900 truncate tracking-tight">{user.displayName}</p>
                        <div className="flex items-center gap-1.5">
                            <Shield className="w-3 h-3 text-amber-600" />
                            <p className="text-[10px] truncate uppercase font-black text-amber-700 tracking-widest">
                                {userRole === 'admin' ? 'Chưởng môn' : userRole === 'accountant' ? 'Thủ quỹ' : 'Môn đệ'}
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white shadow-md mx-auto group relative cursor-help">
                    <img src={user.photoURL || ''} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-wood-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                         <Shield className="w-5 h-5 text-white" />
                    </div>
                </div>
            )}
            
            <button 
                onClick={handleLogout}
                className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 text-rose-500 hover:bg-rose-50 hover:text-rose-700 font-bold text-sm",
                    !isSidebarOpen && "justify-center"
                )}
            >
                <LogOut className="w-6 h-6" />
                {isSidebarOpen && <span>Gác bút thoát thân</span>}
            </button>

          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="hidden lg:flex w-full items-center justify-center py-2 text-wood-300 hover:text-wood-600 transition-colors"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col relative bg-wood-50/50">
        {/* Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md shrink-0 border-b border-wood-100 flex items-center justify-between px-6 lg:px-12 sticky top-0 z-30 shadow-sm shadow-black/[0.01]">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-3 -ml-3 text-wood-600 hover:text-wood-900 lg:hidden bg-wood-50 rounded-2xl"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex flex-col">
              <h1 className="text-lg lg:text-2xl font-display font-black text-wood-900 tracking-tight">
                {navToDisplay.find(i => i.id === currentView)?.label}
              </h1>
              <p className="small-caps opacity-60 hidden lg:block">Cổ Nghệ Lục Nạp - LOLA System</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="relative group hidden xl:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-wood-400" />
              <input 
                type="text" 
                placeholder="Tra cứu sử lục..."
                className="pl-11 pr-5 py-3 bg-wood-50 border-none rounded-2xl text-sm w-72 focus:ring-2 focus:ring-wood-200 transition-all outline-none font-medium shadow-inner"
              />
            </div>
            
            <div className="flex items-center gap-4 bg-wood-50 p-1.5 pr-4 rounded-2xl border border-wood-100 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-wood-900 font-display font-black text-sm overflow-hidden ring-2 ring-wood-100">
                {user.photoURL ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" /> : user.displayName?.charAt(0) || 'U'}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-wood-900 truncate max-w-[100px] leading-none mb-1">
                  {user.displayName?.split(' ').pop()}
                </span>
                <span className="text-[10px] font-black text-amber-700 uppercase tracking-tighter leading-none">
                  {userRole === 'admin' ? 'Chủ quản' : 'Môn đệ'}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-6 lg:p-10 max-w-[1600px] mx-auto w-full flex-1 pb-32 lg:pb-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="min-h-full"
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Mobile Bottom Navigation Bar */}
        <div className="fixed bottom-6 left-6 right-6 bg-wood-900/90 backdrop-blur-2xl border border-white/10 px-4 py-3 flex items-center justify-around z-40 lg:hidden rounded-[2rem] shadow-2xl shadow-black/40">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id as View)}
              className={cn(
                "flex flex-col items-center gap-1 transition-all duration-300 py-2 px-4 rounded-2xl",
                currentView === item.id 
                  ? "text-amber-400 bg-white/10" 
                  : "text-white/40"
              )}
            >
              <item.icon className={cn("w-6 h-6", currentView === item.id && "scale-110")} />
            </button>
          ))}
          {(isAdmin || isAccountant) && (
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="flex flex-col items-center gap-1 text-white/40 py-2 px-4"
            >
              <Menu className="w-6 h-6" />
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

