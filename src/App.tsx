import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Upload, FileText, Copy, Trash2, Download, Terminal, Cpu, ShieldCheck, AlertTriangle } from 'lucide-react';

// --- Firebase Configuration ---
// Bro ရဲ့ Firebase Config ကို ဒီနေရာမှာ အစားထိုးထည့်ပေးပါ
const firebaseConfig = {
  apiKey: "AIzaSyCB2P6uvs0ldhQ3tiQHyncO0Uj2BarrnEM",
  authDomain: "myarchive-a9979.firebaseapp.com",
  projectId: "myarchive-a9979",
  storageBucket: "myarchive-a9979.firebasestorage.app",
  messagingSenderId: "675245584192",
  appId: "1:675245584192:web:f5ee3398da5abd551654a5",
  measurementId: "G-1EXZ4190BR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// App ID (နာမည်တစ်ခုခု ပေးထားလို့ရပါတယ်)
const appId = 'cyber-archive-v1';

// TypeScript Interfaces (Vercel မှာ Error မတက်အောင် Type သတ်မှတ်ခြင်း)
interface ArchiveItem {
  id: string;
  name: string;
  email: string;
  fileName: string;
  fileData: string;
  createdAt: any;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<ArchiveItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  // --- Auth Effect ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Auth Error:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- Data Fetching Effect ---
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'artifacts', appId, 'users', user.uid, 'secure_uploads'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ArchiveItem));
      
      // Sort manually
      fetchedItems.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setItems(fetchedItems);
    }, (err) => {
      console.error("Firestore Error:", err);
    });

    return () => unsubscribe();
  }, [user]);

  // --- Handlers ---

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      if (selectedFile.type !== 'application/pdf') {
        setError('စနစ်အမှား: PDF ဖိုင်သာ လက်ခံသည်။');
        setFile(null);
        setFileName('');
        return;
      }
      
      if (selectedFile.size > 700 * 1024) {
        setError('သတိပေးချက်: ဖိုင်ဆိုဒ် 700KB ထက် မကျော်ရပါ။');
        setFile(null);
        setFileName('');
        return;
      }
      setError('');
      setFile(selectedFile);
      setFileName(selectedFile.name);
    }
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return; // Add check for user

    if (!name || !email || !file) {
      setError('အချက်အလက်မပြည့်စုံပါ။');
      return;
    }
    if (!email.endsWith('.edu')) {
      setError('ဝင်ခွင့်ငြင်းပယ်သည်: .edu မေးလ်သာ အသုံးပြုပါ။');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const base64File = await convertToBase64(file);
      
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'secure_uploads'), {
        name,
        email,
        fileName,
        fileData: base64File,
        createdAt: serverTimestamp()
      });

      // Reset Form
      setName('');
      setEmail('');
      setFile(null);
      setFileName('');
      setError('');
      alert("Data Uplink Successful.");
    } catch (err) {
      console.error("Upload Error:", err);
      setError("ချိတ်ဆက်မှု ပြတ်တောက်သွားသည်။ ပြန်ကြိုးစားပါ။");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    if (!confirm('Delete this record from the database?')) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'secure_uploads', id));
    } catch (err) {
      console.error("Delete Error", err);
    }
  };

  const copyToClipboard = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      alert(`Copied: ${text}`);
    } catch (err) {
      console.error('Copy failed', err);
    }
    document.body.removeChild(textArea);
  };

  // --- Render ---

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-cyan-500 flex items-center justify-center font-mono">
        <div className="animate-pulse flex flex-col items-center">
          <Terminal className="w-12 h-12 mb-4 animate-spin" />
          <p className="tracking-widest">INITIALIZING NEURAL LINK...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-cyan-400 font-mono selection:bg-cyan-900 selection:text-white overflow-x-hidden relative">
      
      {/* Background Grid & Scanlines */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-20" 
           style={{ backgroundImage: 'linear-gradient(#00f3ff 1px, transparent 1px), linear-gradient(90deg, #00f3ff 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>
      <div className="fixed inset-0 z-0 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
      
      <div className="relative z-10 container mx-auto p-4 max-w-4xl">
        
        {/* Header */}
        <header className="mb-8 border-b-2 border-cyan-800 pb-4 flex items-center justify-between">
            <div>
                <h1 className="text-3xl md:text-5xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 drop-shadow-[0_0_10px_rgba(0,243,255,0.5)]">
                    CYBER<span className="text-pink-500">ARCHIVE</span>
                </h1>
                <p className="text-xs md:text-sm text-gray-500 mt-1 uppercase tracking-[0.3em]">Secure Data Vault v2.0.77</p>
            </div>
            <div className="hidden md:block text-right">
                <div className="flex items-center gap-2 text-xs text-green-400">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                    SYSTEM ONLINE
                </div>
                <p className="text-[10px] text-gray-600">UID: {user?.uid.slice(0, 8)}...</p>
            </div>
        </header>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Upload Form */}
            <div className="lg:col-span-1">
                <div className="bg-[#0a0a0a] border border-cyan-900/50 p-6 relative overflow-hidden group">
                    {/* Decorative Corners */}
                    <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-cyan-500"></div>
                    <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-cyan-500"></div>
                    <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-cyan-500"></div>
                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-cyan-500"></div>

                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-pink-500">
                        <Upload size={20} /> DATA UPLINK
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs uppercase text-cyan-700">Identity Name</label>
                            <input 
                                type="text" 
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-[#111] border border-cyan-900/50 text-cyan-100 p-2 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(0,243,255,0.2)] transition-all placeholder-gray-700 text-sm"
                                placeholder="Enter Name..."
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs uppercase text-cyan-700">Edu Protocol Mail</label>
                            <input 
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-[#111] border border-cyan-900/50 text-cyan-100 p-2 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(0,243,255,0.2)] transition-all placeholder-gray-700 text-sm"
                                placeholder="student@university.edu"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs uppercase text-cyan-700">PDF Document</label>
                            <div className="relative">
                                <input 
                                    type="file" 
                                    id="file-upload"
                                    accept="application/pdf"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                                <label 
                                    htmlFor="file-upload" 
                                    className={`w-full flex items-center justify-center gap-2 p-3 border border-dashed ${fileName ? 'border-green-500 text-green-400' : 'border-gray-700 text-gray-500'} bg-[#0f0f0f] cursor-pointer hover:bg-[#151515] transition-colors text-sm`}
                                >
                                    {fileName ? (
                                        <><ShieldCheck size={16} /> {fileName.slice(0, 15)}...</>
                                    ) : (
                                        <><FileText size={16} /> Select PDF</>
                                    )}
                                </label>
                            </div>
                            <p className="text-[10px] text-gray-600 mt-1">* Max size: 700KB (Protocol Limit)</p>
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 text-red-500 text-xs bg-red-900/20 p-2 border border-red-900/50">
                                <AlertTriangle size={12} /> {error}
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={uploading}
                            className={`w-full py-2 px-4 mt-4 font-bold text-sm uppercase tracking-wider relative overflow-hidden group ${uploading ? 'bg-gray-800 cursor-not-allowed' : 'bg-cyan-900/30 hover:bg-cyan-800/50 text-cyan-300 border border-cyan-600'}`}
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                {uploading ? <Cpu className="animate-spin" size={16} /> : 'Initiate Upload'}
                            </span>
                            {!uploading && <div className="absolute inset-0 h-full w-0 bg-cyan-600/20 group-hover:w-full transition-all duration-300"></div>}
                        </button>
                    </form>
                </div>
            </div>

            {/* Right Column: Data List */}
            <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-cyan-100">
                        <Terminal size={20} /> ARCHIVED_DATA
                    </h2>
                    <span className="text-xs bg-cyan-900/30 px-2 py-1 rounded border border-cyan-800 text-cyan-400">
                        COUNT: {items.length}
                    </span>
                </div>

                <div className="grid gap-4 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-cyan-900 scrollbar-track-[#0a0a0a]">
                    {items.length === 0 ? (
                        <div className="border border-dashed border-gray-800 p-8 text-center text-gray-600">
                            NO DATA FRAGMENTS FOUND.
                        </div>
                    ) : (
                        items.map((item) => (
                            <div key={item.id} className="bg-[#080808] border-l-4 border-pink-500 p-4 relative group hover:bg-[#0a0a0a] transition-colors shadow-lg shadow-black/50">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-2 w-full">
                                        <div className="flex items-center gap-3">
                                            <span className="text-pink-500 font-bold text-lg">{item.name}</span>
                                            <button 
                                                onClick={() => copyToClipboard(item.name)}
                                                className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-cyan-400 transition-opacity"
                                                title="Copy Name"
                                            >
                                                <Copy size={14} />
                                            </button>
                                        </div>
                                        
                                        <div className="flex items-center gap-3 text-sm text-gray-400">
                                            <span className="font-mono">{item.email}</span>
                                            <button 
                                                onClick={() => copyToClipboard(item.email)}
                                                className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-cyan-400 transition-opacity"
                                                title="Copy Email"
                                            >
                                                <Copy size={14} />
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-2 text-xs text-cyan-700 mt-2">
                                            <ShieldCheck size={12} />
                                            <span>FILE: {item.fileName}</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2 pl-4 border-l border-gray-800">
                                        <a 
                                            href={item.fileData} 
                                            download={item.fileName}
                                            className="p-2 bg-cyan-900/20 hover:bg-cyan-500 hover:text-black text-cyan-500 rounded transition-all duration-300 flex items-center justify-center"
                                            title="Download PDF"
                                        >
                                            <Download size={18} />
                                        </a>
                                        <button 
                                            onClick={() => handleDelete(item.id)}
                                            className="p-2 bg-red-900/10 hover:bg-red-500 hover:text-black text-red-500 rounded transition-all duration-300 flex items-center justify-center"
                                            title="Purge Data"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                                
                                {/* Decorator Scanline */}
                                <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-pink-500/50 to-transparent opacity-50"></div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 border-t border-cyan-900/30 pt-4 text-center">
            <p className="text-[10px] text-gray-600">
                SECURE ARCHIVE SYSTEM &copy; 2077 <br />
                BUILT WITH REACT_CORE + FIRESTORE_DB
            </p>
        </footer>

      </div>
      
      <style>{`
        /* Custom Scrollbar for Webkit */
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #050505; 
        }
        ::-webkit-scrollbar-thumb {
          background: #1a1a1a; 
          border: 1px solid #333;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #00f3ff; 
        }
      `}</style>
    </div>
  );
}