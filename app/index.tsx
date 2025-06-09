'use client';
import React, { useState, Suspense, lazy, useEffect } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  AppBar,
  Toolbar,
  Typography,
  CircularProgress,
} from '@mui/material';
import { useSearchParams } from 'next/navigation';

const BuildPage = lazy(() => import('./build/page'));
const HistoryPage = lazy(() => import('./history/page'));
const VMPage = lazy(() => import('./vm/page'));

const HomePage: React.FC = () => {
    const [activePage, setActivePage] = useState<'history' | 'build' | 'vm'>('build');
    const searchParams = useSearchParams();

    useEffect(() => {
        const initialPage = searchParams.get('page') as 'history' | 'build' | 'vm' | null;
        if (initialPage) {
            setActivePage(initialPage);
        }
    }, [searchParams]);

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
        <Box sx={{ display: 'flex' }}>
            <AppBar position="fixed">
                <Toolbar>
                    <Typography variant="h6" noWrap component="div">
                        Metis
                    </Typography>
                </Toolbar>
            </AppBar>
            <Drawer
                variant="permanent"
                sx={{
                    width: 240,
                    flexShrink: 0,
                    [`& .MuiDrawer-paper`]: { width: 240, boxSizing: 'border-box' },
                }}
            >
                <Toolbar />
                <List>
                    <ListItem disablePadding>
                        <ListItemButton selected={activePage === 'build'} onClick={() => setActivePage('build')}>
                            <ListItemText primary="构建" />
                        </ListItemButton>
                    </ListItem>
                    <ListItem disablePadding>
                        <ListItemButton selected={activePage === 'history'} onClick={() => setActivePage('history')}>
                            <ListItemText primary="历史" />
                        </ListItemButton>
                    </ListItem>
                    <ListItem disablePadding>
                        <ListItemButton selected={activePage === 'vm'} onClick={() => setActivePage('vm')}>
                            <ListItemText primary="虚拟机" />
                        </ListItemButton>
                    </ListItem>
                </List>
            </Drawer>
            <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
                <Toolbar />
                <Suspense
                    fallback={
                        <Box className="spinner-container">
                            <CircularProgress />
                        </Box>
                    }
                >
                    {renderContent()}
                </Suspense>
            </Box>
        </Box>
    );
};

export default HomePage;
