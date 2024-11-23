// HomePage.tsx
'use client';
import React, { useState, Suspense, lazy } from 'react';
import { Spinner } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css'; // 添加自定义样式文件

const HistoryPage = lazy(() => import('./history/page'));
const BuildPage = lazy(() => import('./build/page')); // 假设构建页面在 `build/page.tsx`

const HomePage: React.FC = () => {
    const [activePage, setActivePage] = useState<'history' | 'build'>('history');

    const renderContent = () => {
        switch (activePage) {
            case 'history':
                return <HistoryPage />;
            case 'build':
                return <BuildPage />;
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
                    </ul>
                </nav>
            </div>

            {/* 主要内容区 */}
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