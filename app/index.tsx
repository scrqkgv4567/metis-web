'use client';
import React, { useState, Suspense, lazy } from 'react';
import { Spinner } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';
import { useSearchParams } from 'next/navigation';
const BuildPage = lazy(() => import('./build/page'));
const HistoryPage = lazy(() => import('./history/page'));
const VMPage = lazy(() => import('./vm/page'));
const HomePage: React.FC = () => {
    const searchParams = useSearchParams();
    const initialPage = searchParams.get('page') as 'history' | 'build' | 'vm' || 'build';
    const [activePage, setActivePage] = useState<'history' | 'build' | 'vm'>(initialPage);

    const renderContent = () => {
        switch (activePage) {
            case 'history':
                return <HistoryPage />;
            case 'build':
                return <BuildPage />;
            case 'vm':
                return <VMPage />;
            default:
                return <div>页面不存在</div>;
        }
    };

    return (
        <div className="app-container">
            {/* 左侧导航栏 */}
            <div className="sidebar">
                <div className="logo">
                    <h2>Metis</h2>
                </div>
                <nav>
                    <ul>
                        <li
                            className={activePage === 'build' ? 'active' : ''}
                            onClick={() => setActivePage('build')}
                        >
                            构建
                        </li>
                        <li
                            className={activePage === 'history' ? 'active' : ''}
                            onClick={() => setActivePage('history')}
                        >
                            历史
                        </li>
                        <li
                            className={activePage === 'vm' ? 'active' : ''}
                            onClick={() => setActivePage('vm')}
                        >
                            虚拟机
                        </li>
                    </ul>
                </nav>
            </div>

            <div className="content">
                <Suspense fallback={
                    <div className="spinner-container">
                        <Spinner animation="border" variant="primary" />
                    </div>
                }>
                    {renderContent()}
                </Suspense>
            </div>
        </div>
    );
};
export default HomePage;