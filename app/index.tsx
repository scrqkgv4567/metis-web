'use client';
import React, { useState, Suspense, lazy, useEffect } from 'react';
// This hook is part of Next.js and is preserved from your original code.
// It requires a Next.js environment to function.
import { useSearchParams } from 'next/navigation';

// --- SVG Icons for Navigation ---
const FiWrench = () => <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>;
const FiClock = () => <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>;
const FiServer = () => <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>;

// --- Helper Component for Loading State ---
const PageLoader = () => (
    <div className="w-full h-full flex justify-center items-center">
         <svg className="animate-spin text-sky-400 h-12 w-12" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    </div>
);


// --- Original Lazy Imports Preserved ---
const BuildPage = lazy(() => import('./build/page'));
const HistoryPage = lazy(() => import('./history/page'));
const VMPage = lazy(() => import('./vm/page'));


const HomePage: React.FC = () => {
    // --- Original State Logic Preserved ---
    const [activePage, setActivePage] = useState<'history' | 'build' | 'vm'>('build');
    const searchParams = useSearchParams();

    useEffect(() => {
        const initialPage = searchParams.get('page') as 'history' | 'build' | 'vm' | null;
        if (initialPage && ['history', 'build', 'vm'].includes(initialPage)) {
            setActivePage(initialPage);
        }
    }, [searchParams]);

    const menuItems = [
        { id: 'build', label: '构建', icon: <FiWrench /> },
        { id: 'history', label: '历史', icon: <FiClock /> },
        { id: 'vm', label: '虚拟机', icon: <FiServer /> },
    ];
    
    // --- Original Content Rendering Logic Preserved ---
    const renderContent = () => {
        switch (activePage) {
            case 'history': return <HistoryPage />;
            case 'build': return <BuildPage />;
            case 'vm': return <VMPage />;
            default: return <div className="p-8 text-xl text-slate-400">页面不存在</div>;
        }
    };
    
    const handleNavClick = (e: React.MouseEvent, page: 'history' | 'build' | 'vm') => {
        e.preventDefault();
        setActivePage(page);
        // This updates the URL without a page reload, preserving the app's SPA behavior.
        window.history.pushState(null, '', `?page=${page}`);
    };

    return (
        <div className="flex h-screen bg-slate-900 text-white font-sans">
            {/* Styled Sidebar */}
            <aside className="w-60 flex-shrink-0 bg-slate-900/80 backdrop-blur-sm p-4 flex flex-col border-r border-slate-700">
                 <div className="flex items-center mb-10 pl-2 h-16">
                     <svg className="w-8 h-8 text-sky-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <h1 className="text-2xl font-bold text-white ml-3">Metis</h1>
                </div>

                <nav className="flex-grow">
                    <ul className="space-y-2">
                        {menuItems.map(item => (
                            <li key={item.id}>
                                <a
                                    href={`?page=${item.id}`}
                                    onClick={(e) => handleNavClick(e, item.id as 'history' | 'build' | 'vm')}
                                    className={`flex items-center py-3 px-4 rounded-lg transition-all duration-200 ${
                                        activePage === item.id 
                                        ? 'bg-sky-600 text-white shadow-lg' 
                                        : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                                    }`}
                                >
                                    <span className="w-6">{item.icon}</span>
                                    <span className="ml-3 font-medium">{item.label}</span>
                                </a>
                            </li>
                        ))}
                    </ul>
                </nav>
            </aside>

            {/* Main Content Area */}
            <div className="flex flex-col flex-grow">
                <header className="flex-shrink-0 h-16 bg-slate-900/60 backdrop-blur-sm border-b border-slate-700 flex items-center px-8">
                     <h2 className="text-xl font-semibold capitalize">{activePage}</h2>
                </header>
                <main className="flex-grow overflow-y-auto">
                    <Suspense fallback={<PageLoader />}>
                        {renderContent()}
                    </Suspense>
                </main>
            </div>
        </div>
    );
};

export default HomePage;
