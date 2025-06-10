"use client";
import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import PageContainer from '@/components/ui/page-container';

// --- Reusable UI Helper Components ---

// SVG Icons (updated)
const FiLock = () => <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>;
const FiUnlock = () => <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>;
const FiChevronDown: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg" {...props}><polyline points="6 9 12 15 18 9"></polyline></svg>;
const FiPackage = () => <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>;
const FiTag = () => <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>;
const FiEye = () => <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>;
const FiX: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg" {...props}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
const FiSquare = () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>;

// Icon for form fields (existing)
interface FormIconProps { children: React.ReactNode }
const FormIcon: React.FC<FormIconProps> = ({ children }) => (
    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        {children}
    </div>
);

// Custom styled select input (existing)
interface SelectOption { value: string; label: string; disabled?: boolean }
interface CustomSelectProps {
    id: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    options: SelectOption[];
    icon?: React.ReactNode;
    disabled?: boolean;
}
const CustomSelect: React.FC<CustomSelectProps> = ({ id, value, onChange, options, icon, disabled = false }) => (
    <div className="relative">
        {icon && <FormIcon>{icon}</FormIcon>}
        <select
            id={id}
            value={value}
            onChange={onChange}
            disabled={disabled}
            className={`w-full py-3 pr-10 text-gray-300 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all appearance-none ${icon ? 'pl-10' : 'pl-4'} disabled:bg-slate-800/50 disabled:cursor-not-allowed`}
        >
            {options.map(option => (
                <option key={option.value} value={option.value} disabled={option.disabled}>
                    {option.label}
                </option>
            ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
            <FiChevronDown className="w-5 h-5 text-gray-500" />
        </div>
    </div>
);

// Loading Spinner (existing)
interface SpinnerProps { size?: string }
const Spinner: React.FC<SpinnerProps> = ({ size = 'h-5 w-5' }) => (
    <svg className={`animate-spin text-white ${size}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

// Countdown timer bar (existing)
interface CountdownBarProps { isoName: string; countdowns: Map<string, number> }
const CountdownBar: React.FC<CountdownBarProps> = ({ isoName, countdowns }) => {
    const totalDuration = 30 * 24 * 60 * 60 * 1000;
    const timeLeft = countdowns.get(isoName) || 0;
    const percentage = timeLeft > 0 ? (timeLeft / totalDuration) * 100 : 0;

    if (timeLeft <= 0) {
        return <div className="text-red-400 text-xs font-semibold">未就绪或已被清理</div>;
    }

    const formattedTime = formatTimeValue(timeLeft);

    return (
        <div>
            <div className="text-xs text-slate-400 mb-1">
                过期时间: {formattedTime}
            </div>
            <div className="w-full bg-slate-700 rounded-full h-1.5">
                <div className="bg-sky-500 h-1.5 rounded-full" style={{ width: `${percentage}%` }}></div>
            </div>
        </div>
    );
};

// Status Badge (existing)
interface StatusBadgeProps { state: string }
const StatusBadge: React.FC<StatusBadgeProps> = ({ state }) => {
    type StateStylesKey = 'STOPPED' | 'RUNNING' | 'DELETE' | 'SUCCESS' | 'FAILURE' | 'VERIFIED' | 'default';
    const stateStyles: Record<StateStylesKey, string> = {
        STOPPED: 'bg-gray-500 text-white',
        RUNNING: 'bg-blue-500 text-white animate-pulse',
        DELETE: 'bg-red-700 text-white',
        SUCCESS: 'bg-green-500 text-white',
        FAILURE: 'bg-red-500 text-white',
        VERIFIED: 'bg-teal-500 text-white',
        default: 'bg-yellow-500 text-white',
    };
    const style = stateStyles[state as StateStylesKey] || stateStyles.default;
    return (
        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${style}`}>
            {state}
        </span>
    );
};


// --- Interfaces & Utility Functions ---

const formatTimeValue = (ms: number): string => {
    if (ms <= 0) return '00:00:00';
    let seconds = Math.floor(ms / 1000);
    let minutes = Math.floor(seconds / 60);
    let hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    hours = hours % 24;
    minutes = minutes % 60;
    seconds = seconds % 60;

    if (days > 0) {
        return `${days}d ${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m`;
    }
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

interface HistoryItem {
    id?: number;
    iso_name: string;
    is_lock: number;
    app_name: string;
    app_version: string;
    start_build_time: string;
    end_build_time: string;
    ci_count: number;
    deploy_host: string;
    ip: string;
    state: string;
}

interface BuildDetails {
    deploy_id: string;
    step: string;
    state: string;
    task_id: string;
}

// --- Modal Components ---

// Details Modal (Existing)
interface DetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    item?: HistoryItem;
    details?: BuildDetails;
    isLoading: boolean;
}
const DetailsModal: React.FC<DetailsModalProps> = ({ isOpen, onClose, item, details, isLoading }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4">
            <div className="bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl border border-slate-700 transform transition-all"
                 onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-5 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-sky-400">构建详情</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <FiX width={24} height={24} />
                    </button>
                </div>
                
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-48">
                            <Spinner size="h-10 w-10" />
                        </div>
                    ) : item && details ? (
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-semibold text-lg text-white mb-3" title={item.iso_name}>{item.iso_name}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <p className="text-slate-300"><strong className="font-medium text-slate-100">项目:</strong> {item.app_name}</p>
                                    <p className="text-slate-300"><strong className="font-medium text-slate-100">版本:</strong> {item.app_version}</p>
                                    <p className="text-slate-300"><strong className="font-medium text-slate-100">构建主机:</strong> {item.deploy_host} ({item.ip})</p>
                                    <p className="text-slate-300"><strong className="font-medium text-slate-100">构建状态:</strong> <StatusBadge state={item.state} /></p>
                                </div>
                            </div>
                            <div className="border-t border-slate-700 pt-4">
                                <h3 className="font-semibold text-lg text-white mb-3">任务信息</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <p className="text-slate-300"><strong className="font-medium text-slate-100">构建 ID:</strong> {details.deploy_id}</p>
                                    <p className="text-slate-300"><strong className="font-medium text-slate-100">任务 ID:</strong> {details.task_id}</p>
                                    <p className="text-slate-300"><strong className="font-medium text-slate-100">当前步骤:</strong> {details.step}</p>
                                    <p className="text-slate-300"><strong className="font-medium text-slate-100">当前状态:</strong> {details.state}</p>
                                </div>
                            </div>
                             <div className="border-t border-slate-700 pt-4">
                                <h3 className="font-semibold text-lg text-white mb-3">构建时间</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <p className="text-slate-300"><strong className="font-medium text-slate-100">开始:</strong> {new Date(item.start_build_time).toLocaleString()}</p>
                                    <p className="text-slate-300"><strong className="font-medium text-slate-100">完成:</strong> {item.end_build_time ? new Date(item.end_build_time).toLocaleString() : 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                         <div className="text-center py-10">
                            <h3 className="text-xl text-slate-300">Could not load build details.</h3>
                            <p className="text-slate-500 mt-2">Please try again later.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Reusable Confirmation Modal (Existing)
interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    isConfirming: boolean;
    confirmButtonClass?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = '取消',
    isConfirming = false,
    confirmButtonClass = 'bg-red-600 hover:bg-red-500 disabled:bg-red-800',
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div
                className="bg-slate-800 rounded-2xl shadow-xl w-full max-w-md border border-slate-700 transform transition-all"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
                <div className="p-6">
                    <h2 className="text-xl font-bold text-red-400 mb-2">{title}</h2>
                    <div className="text-slate-300">{message}</div>
                </div>
                <div className="flex justify-end items-center gap-4 bg-slate-800/50 p-4 border-t border-slate-700 rounded-b-2xl">
                    <button
                        onClick={onClose}
                        disabled={isConfirming}
                        className="py-2 px-4 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-semibold transition-colors disabled:opacity-50"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isConfirming}
                        className={`py-2 px-4 rounded-lg text-white font-semibold transition-colors flex items-center justify-center min-w-[100px] disabled:cursor-wait ${confirmButtonClass}`}
                    >
                        {isConfirming ? <Spinner size="h-5 w-5" /> : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};


// --- Main Page Component ---

const HistoryPageContent: React.FC = () => {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';

    // State management
    const [filterVersionOptions, setFilterVersionOptions] = useState<string[]>([]);
    const [selectedHistoryProject, setSelectedHistoryProject] = useState<string>('');
    const [filterVersion, setFilterVersion] = useState<string>('');
    const [allHistoryData, setAllHistoryData] = useState<HistoryItem[]>([]);
    const [lockStatus, setLockStatus] = useState<Map<string, number>>(new Map());
    const [countdowns, setCountdowns] = useState<Map<string, number>>(new Map());
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [hasMore, setHasMore] = useState<boolean>(true);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingState, setLoadingState] = useState<Map<string, boolean>>(new Map());
    const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
    
    // State for the details modal
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState<boolean>(false);
    const [modalData, setModalData] = useState<{ item: HistoryItem, details: BuildDetails } | null>(null);
    const [isModalLoading, setIsModalLoading] = useState<boolean>(false);

    // State for deletion confirmation
    const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState<boolean>(false);
    const [itemToDelete, setItemToDelete] = useState<HistoryItem | null>(null);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);

    // State for stop confirmation
    const [isStopConfirmModalOpen, setIsStopConfirmModalOpen] = useState<boolean>(false);
    const [itemToStop, setItemToStop] = useState<HistoryItem | null>(null);
    const [isStopping, setIsStopping] = useState<boolean>(false);


    // Toast notification function
    const showNotification = (message: string, type = 'success') => {
        setNotification({ show: true, message, type });
        setTimeout(() => {
            setNotification({ show: false, message: '', type: 'success' });
        }, 3000);
    };

    // --- Data Fetching Effects ---
    useEffect(() => {
        const controller = new AbortController();
        const fetchFilterVersion = async () => {
            if (!selectedHistoryProject) {
                setFilterVersionOptions([]);
                return;
            }
            try {
                const response = await fetch(`${apiBaseUrl}/get_versions/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ project_name: selectedHistoryProject }),
                    signal: controller.signal,
                });
                const data = await response.json();
                setFilterVersionOptions(data.versions || []);
            } catch (error) {
                if (error instanceof Error && error.name !== 'AbortError') {
                    console.error('Failed to fetch versions:', error);
                    showNotification('Failed to fetch versions', 'error');
                }
            }
        };
        fetchFilterVersion();
        return () => controller.abort();
    }, [selectedHistoryProject, apiBaseUrl]);

    useEffect(() => {
        setAllHistoryData([]);
        setCurrentPage(1);
        setHasMore(true);
    }, [selectedHistoryProject, filterVersion]);
    
    useEffect(() => {
        const fetchHistory = async () => {
            if (!hasMore) return;
            setIsLoading(true);
            try {
                const response = await fetch(`${apiBaseUrl}/history?page=${currentPage}&project=${selectedHistoryProject}&version=${filterVersion}`);
                const data = await response.json();
                
                if (Array.isArray(data.history) && data.history.length > 0) {
                    setAllHistoryData((prev) => {
                        const existingIsoNames = new Set(prev.map(item => item.iso_name));
                        const uniqueNewHistory = data.history.filter(
                            (item: HistoryItem) => !existingIsoNames.has(item.iso_name)
                        );
                        return [...prev, ...uniqueNewHistory];
                    });

                    const newLockStatus = new Map(lockStatus);
                    const newCountdowns = new Map(countdowns);
                    data.history.forEach((item: HistoryItem) => {
                        newLockStatus.set(item.iso_name, item.is_lock);
                        const itemEndTime = item.end_build_time ? new Date(item.end_build_time) : null;
                        if (itemEndTime) {
                            itemEndTime.setDate(itemEndTime.getDate() + 30);
                            const timeLeft = Math.max(0, itemEndTime.getTime() - new Date().getTime());
                            newCountdowns.set(item.iso_name, timeLeft);
                        } else {
                            newCountdowns.set(item.iso_name, 0);
                        }
                    });
                    setLockStatus(newLockStatus);
                    setCountdowns(newCountdowns);
                    
                    if (data.history.length < 50) setHasMore(false);

                } else {
                    setHasMore(false);
                }
            } catch (error) {
                console.error('Error fetching history:', error);
                showNotification('Failed to get history data.', 'error');
            } finally {
                setIsLoading(false);
            }
        };
        fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [apiBaseUrl, currentPage, selectedHistoryProject, filterVersion]);

    useEffect(() => {
        const timer = setInterval(() => {
            setCountdowns(current => {
                const updated = new Map(current);
                updated.forEach((value, key) => {
                    if (value > 0) updated.set(key, value - 1000);
                });
                return updated;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // --- Action Handlers ---

    const toggleLock = async (deployId: string, currentLockStatus: number) => {
        if (isDeleting || isStopping) return; 
        const newLockStatus = currentLockStatus === 1 ? 0 : 1;
        setLoadingState(prev => new Map(prev).set(deployId, true));
        try {
            const response = await fetch(`${apiBaseUrl}/build/`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: newLockStatus === 1 ? 'lock' : 'unlock', deploy_id: deployId }),
            });
            if (response.ok) {
                setLockStatus(prev => new Map(prev).set(deployId, newLockStatus));
                showNotification(`Resource ${newLockStatus === 1 ? 'locked' : 'unlocked'} successfully.`, 'success');
            } else {
                throw new Error('API response not OK');
            }
        } catch (error) {
            console.error('Error toggling lock:', error);
            showNotification(`Failed to ${newLockStatus === 1 ? 'lock' : 'unlock'} resource.`, 'error');
        } finally {
            setLoadingState(prev => new Map(prev).set(deployId, false));
        }
    };
    
    // Delete handlers
    const handleDeleteClick = (item: HistoryItem) => {
        if (lockStatus.get(item.iso_name) === 1) {
            showNotification('Cannot delete a locked resource.', 'error');
            return;
        }
        setItemToDelete(item);
        setIsDeleteConfirmModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;

        setIsDeleting(true);
        const deployId = itemToDelete.iso_name;

        try {
            const response = await fetch(`${apiBaseUrl}/build/`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', deploy_id: deployId }),
            });

            if (response.ok) {
                setAllHistoryData(prevData => prevData.filter(item => item.iso_name !== deployId));
                showNotification('Build deleted successfully.', 'success');
            } else {
                const errorData = await response.json().catch(() => ({ info: 'Deletion failed. The build might be in a state that prevents deletion.' }));
                throw new Error(errorData.info || 'Failed to delete build.');
            }
        } catch (error) {
            console.error('Error deleting build:', error);
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
            showNotification(errorMessage, 'error');
        } finally {
            setIsDeleting(false);
            setIsDeleteConfirmModalOpen(false);
            setItemToDelete(null);
        }
    };

    // Stop handlers
    const handleStopClick = (item: HistoryItem) => {
        setItemToStop(item);
        setIsStopConfirmModalOpen(true);
    };

    const handleConfirmStop = async () => {
        if (!itemToStop) return;

        setIsStopping(true);
        const deployId = itemToStop.iso_name;

        try {
            const response = await fetch(`${apiBaseUrl}/build/`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'revoke', deploy_id: deployId }),
            });

            if (response.ok) {
                setAllHistoryData(prevData =>
                    prevData.map(h =>
                        h.iso_name === deployId ? { ...h, state: 'STOPPED' } : h
                    )
                );
                showNotification('Build task stopped successfully.', 'success');
            } else {
                const errorData = await response.json().catch(() => ({ info: 'Could not stop the task. It may have already completed or failed.' }));
                throw new Error(errorData.info || 'Failed to stop build task.');
            }
        } catch (error) {
            console.error('Error stopping build:', error);
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
            showNotification(errorMessage, 'error');
        } finally {
            setIsStopping(false);
            setIsStopConfirmModalOpen(false);
            setItemToStop(null);
        }
    };


    // --- Event Handlers ---
    const handleHistoryProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedHistoryProject(e.target.value);
        setFilterVersion('');
    };

    const handleFilterVersionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setFilterVersion(e.target.value);
    };

    const loadMoreItems = () => {
        if (!isLoading && hasMore) {
            setCurrentPage(prevPage => prevPage + 1);
        }
    };

    const handleViewDetails = async (item: HistoryItem) => {
        setIsDetailsModalOpen(true);
        setIsModalLoading(true);
        setModalData(null); 
        
        try {
            const response = await fetch(`${apiBaseUrl}/build/${item.iso_name}`);
            if (!response.ok) {
                throw new Error('Failed to fetch build details');
            }
            const details: BuildDetails = await response.json();
            setModalData({ item, details });
        } catch (error) {
            console.error(error);
            showNotification('Could not load build details.', 'error');
        } finally {
            setIsModalLoading(false);
        }
    };

    return (
        <div className="bg-slate-900 text-white min-h-screen p-4 sm:p-6 lg:p-8 font-sans">
            <DetailsModal
                isOpen={isDetailsModalOpen}
                onClose={() => setIsDetailsModalOpen(false)}
                item={modalData?.item}
                details={modalData?.details}
                isLoading={isModalLoading}
            />

            <ConfirmationModal
                isOpen={isDeleteConfirmModalOpen}
                onClose={() => !isDeleting && setIsDeleteConfirmModalOpen(false)}
                onConfirm={handleConfirmDelete}
                isConfirming={isDeleting}
                title="确认删除？"
                message={
                    <>
                        你确定要删除该构建：
                        <br />
                        <strong className="text-red-300 font-mono my-2 block break-all">{itemToDelete?.iso_name}</strong>
                        此操作无法撤销。
                    </>
                }
                confirmText="删除"
                confirmButtonClass="bg-red-600 hover:bg-red-500 disabled:bg-red-800"
            />
            
            {/* Stop Confirmation Modal */}
            <ConfirmationModal
                isOpen={isStopConfirmModalOpen}
                onClose={() => !isStopping && setIsStopConfirmModalOpen(false)}
                onConfirm={handleConfirmStop}
                isConfirming={isStopping}
                title="停止任务"
                message={
                     <>
                        将停止以下构建任务:
                        <br />
                        <strong className="text-amber-300 font-mono my-2 block break-all">{itemToStop?.iso_name}</strong>
                        这将终止当前构建过程。
                    </>
                }
                confirmText="停止任务"
                confirmButtonClass="bg-amber-600 hover:bg-amber-500 disabled:bg-amber-800"
            />


            {/* Notification Toast */}
            <div className={`fixed top-5 right-5 transition-all duration-300 transform ${notification.show ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}>
                <div className={`flex items-center p-4 rounded-lg shadow-lg text-white ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
                    <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <span>{notification.message}</span>
                </div>
            </div>

            <PageContainer>
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-sky-400">构建历史</h1>
                    <p className="text-slate-400 mt-1"></p>
                </header>

                {/* Filter Bar */}
                <div className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur-sm pt-4 pb-6 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <CustomSelect
                            id="history-project"
                            value={selectedHistoryProject}
                            onChange={handleHistoryProjectChange}
                            options={[
                                { value: '', label: '所有' },
                                { value: 'waf', label: 'WAF' }, { value: 'omas', label: '堡垒机' },
                                { value: 'lams', label: '日审' }, { value: 'dsas', label: '数审' },
                                { value: 'cosa', label: '二合一' },
                            ]}
                            icon={<FiPackage />}
                        />
                        <CustomSelect
                            id="history-version"
                            value={filterVersion}
                            onChange={handleFilterVersionChange}
                            disabled={!selectedHistoryProject || filterVersionOptions.length === 0}
                            options={[
                                { value: '', label: '所有版本' },
                                ...filterVersionOptions.map(v => ({ value: v, label: v }))
                            ]}
                            icon={<FiTag />}
                        />
                    </div>
                </div>

                {/* Main Content */}
                {isLoading && currentPage === 1 && (
                    <div className="flex justify-center items-center h-64">
                        <Spinner size="h-10 w-10" />
                    </div>
                )}
                
                {!isLoading && allHistoryData.length === 0 && (
                     <div className="text-center py-16">
                        <h3 className="text-xl text-slate-300">No Build Records Found</h3>
                        <p className="text-slate-500 mt-2">Try adjusting your filters or create a new build.</p>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {allHistoryData.map((item) => {
                        const isLocked = lockStatus.get(item.iso_name) === 1;
                        const isThisItemLoading = loadingState.get(item.iso_name);
                        const isThisItemDeleting = isDeleting && itemToDelete?.iso_name === item.iso_name;
                        const isThisItemStopping = isStopping && itemToStop?.iso_name === item.iso_name;
                        const isBusy = isThisItemDeleting || isThisItemStopping;

                        return (
                            <div key={item.iso_name} className={`bg-slate-800/50 rounded-2xl shadow-lg border border-slate-700 flex flex-col justify-between transition-all duration-300 hover:shadow-sky-500/20 hover:-translate-y-1 ${isBusy ? 'opacity-50' : ''}`}>
                                <div className="p-5">
                                    <div className="flex justify-between items-center mb-4">
                                        <StatusBadge state={item.state} />
                                        {/* --- MODIFIED --- Only show lock button if state is SUCCESS */}
                                        {item.state === 'SUCCESS' && (
                                            isThisItemLoading ? <Spinner size="h-4 w-4" /> :
                                            <button onClick={() => toggleLock(item.iso_name, lockStatus.get(item.iso_name) || 0)} className="text-slate-400 hover:text-white transition-colors disabled:cursor-not-allowed" disabled={isBusy}>
                                                {isLocked ? <FiLock /> : <FiUnlock />}
                                            </button>
                                        )}
                                    </div>
                                    <h3 className="font-bold text-lg text-white truncate mb-1" title={item.iso_name}>{item.iso_name}</h3>
                                    <p className="text-sm text-sky-400 font-medium mb-4">{item.app_name} v{item.app_version}</p>
                                    <div className="text-xs text-slate-400 space-y-2">
                                        <p><strong>Host:</strong> {item.deploy_host} ({item.ip})</p>
                                        <p><strong>Started:</strong> {new Date(item.start_build_time).toLocaleString()}</p>
                                        <p><strong>Finished:</strong> {item.end_build_time ? new Date(item.end_build_time).toLocaleString() : 'N/A'}</p>
                                    </div>
                               </div>
                               <div className="bg-slate-800 p-4 rounded-b-2xl space-y-3">
                                    {!isLocked && <CountdownBar isoName={item.iso_name} countdowns={countdowns} />}
                                    <div className="flex justify-end items-center space-x-2">
                                        <button onClick={() => handleViewDetails(item)} className="text-sm py-2 px-3 rounded-md bg-slate-700 hover:bg-slate-600 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed" disabled={isBusy}>
                                           <FiEye /> <span className="ml-2">详情</span>
                                        </button>
                                        
                                        {/* Conditionally render Stop button for RUNNING state */}
                                        {item.state === 'RUNNING' && (
                                            <button
                                                onClick={() => handleStopClick(item)}
                                                disabled={isBusy}
                                                className="text-sm py-2 px-3 rounded-md bg-amber-600/50 hover:bg-amber-600 text-amber-300 hover:text-white transition-colors flex items-center justify-center min-w-[80px] disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed"
                                            >
                                                {isThisItemStopping ? <Spinner size="h-4 w-4" /> : <><FiSquare /><span className="ml-2">停止</span></>}
                                            </button>
                                        )}

                                        {/* --- MODIFIED --- Only show delete button if state is SUCCESS */}
                                        {item.state === 'SUCCESS' && (
                                            <button
                                                onClick={() => handleDeleteClick(item)}
                                                disabled={isLocked || isBusy}
                                                className="text-sm py-2 px-3 rounded-md bg-red-600/50 hover:bg-red-600 text-red-300 hover:text-white transition-colors flex items-center justify-center min-w-[80px] disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed"
                                            >
                                                {isThisItemDeleting ? <Spinner size="h-4 w-4" /> : '删除'}
                                            </button>
                                        )}
                                    </div>
                               </div>
                            </div>
                        )
                    })}
                </div>
                
                {/* Load More Button */}
                <div className="mt-12 text-center">
                    {hasMore && !isLoading && (
                        <button onClick={loadMoreItems} className="py-2 px-6 rounded-lg bg-sky-600 hover:bg-sky-500 font-semibold transition-all">
                            Load More
                        </button>
                    )}
                    {isLoading && currentPage > 1 && <Spinner size="h-8 w-8" />}
                </div>
            </PageContainer>
        </div>
    );
};


const HistoryPage = () => (
    <Suspense fallback={
        <div className="bg-slate-900 h-screen flex justify-center items-center">
            <Spinner size="h-12 w-12" />
        </div>
    }>
        <HistoryPageContent />
    </Suspense>
);

export default HistoryPage;