'use client';
import React, { useEffect, useState, useRef } from "react";
import PageContainer from '@/components/ui/page-container';

// --- Helper Components ---

const Spinner = ({ size = 'h-12 w-12' }) => (
    <div className="flex justify-center items-center py-16">
        <svg className={`animate-spin text-sky-400 ${size}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    </div>
);

interface VmStateToggleProps {
    isChecked: boolean;
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    disabled?: boolean;
}

const VmStateToggle = ({ isChecked, onChange, disabled = false }: VmStateToggleProps) => (
    <label className="relative inline-flex items-center cursor-pointer">
        <input 
            type="checkbox" 
            checked={isChecked} 
            onChange={onChange} 
            className="sr-only peer"
            disabled={disabled}
        />
        <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-focus:ring-4 peer-focus:ring-sky-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
    </label>
);

interface VmStateBadgeProps {
    state: string;
}

const VmStateBadge = ({ state }: VmStateBadgeProps) => {
    const isPoweredOn = state === 'poweredOn';
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isPoweredOn ? 'bg-green-600 text-green-100' : 'bg-slate-700 text-slate-300'}`}>
            <span className={`w-2 h-2 mr-1.5 rounded-full ${isPoweredOn ? 'bg-green-400' : 'bg-slate-500'}`}></span>
            {isPoweredOn ? 'Running' : 'Stopped'}
        </span>
    );
};


// --- Main Component ---

interface Vm {
    id: number;
    vm_os: string;
    vm_ip: string;
    vm_name: string;
    vm_host: string;
    vm_uuid: string;
    vm_state: string; // e.g., "poweredOn", "poweredOff"
}

const VmsDashboard: React.FC = () => {
    const [vms, setVms] = useState<Vm[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null); // Track UUID of VM under action
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
    const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
    const didFetch = useRef(false);

    const showNotification = (message: string, type = 'success') => {
        setNotification({ show: true, message, type });
        setTimeout(() => {
            setNotification({ show: false, message: '', type: 'success' });
        }, 3000);
    };

    useEffect(() => {
        if (didFetch.current) return;
        didFetch.current = true;
        
        const fetchVmsState = async () => {
            setLoading(true);
            try {
                const response = await fetch(`${apiBaseUrl}/show_vms_state`);
                if (!response.ok) throw new Error('Network response was not ok');
                const data = await response.json();
                setVms(data.data);
            } catch (error) {
                console.error("Error fetching VM states: ", error);
                showNotification("Error fetching VM states", "error");
            } finally {
                setLoading(false);
            }
        };

        fetchVmsState().then(() => console.log("VMs state fetched successfully"));
    }, [apiBaseUrl]);

    const handleVmAction = async (action: string, uuid: string) => {
        setActionLoading(uuid);
        try {
            const response = await fetch(`${apiBaseUrl}/vm_action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, vm_uuid: uuid }),
            });

            if (response.ok) {
                showNotification('虚拟机操作成功', 'success');
                // Optimistically update the state
                setVms(prevState => prevState.map(vm => 
                    vm.vm_uuid === uuid 
                    ? { ...vm, vm_state: action === 'poweron' ? 'poweredOn' : 'poweredOff' } 
                    : vm
                ));
            } else {
                 throw new Error('Action failed');
            }
        } catch (error) {
            console.error(`Error performing ${action} action on VM: `, error);
            showNotification("An error occurred while performing the action.", "error");
        } finally {
            setActionLoading(null);
        }
    };

    const toggleVmState = (checked: boolean, uuid: string) => {
        const action = checked ? "poweron" : "poweroff";
        handleVmAction(action, uuid);
    };

    return (
        <PageContainer className="font-sans">
            {/* Notification Toast */}
            <div className={`fixed top-5 right-5 transition-all duration-300 transform ${notification.show ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}>
                <div className={`flex items-center p-4 rounded-lg shadow-lg text-white ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
                    <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <span>{notification.message}</span>
                </div>
            </div>

            <header className="mb-8">
                <h1 className="text-3xl font-bold text-sky-400">Virtual Machine Resources</h1>
                <p className="text-slate-400 mt-1">Manage and monitor your test environment VMs.</p>
            </header>

            {loading ? (
                <Spinner />
            ) : (
                <div className="bg-slate-800/50 rounded-2xl shadow-lg border border-slate-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-slate-300">
                            <thead className="text-xs text-slate-400 uppercase bg-slate-800">
                                <tr>
                                    <th scope="col" className="px-6 py-3">VM Name</th>
                                    <th scope="col" className="px-6 py-3">State</th>
                                    <th scope="col" className="px-6 py-3">IP Address</th>
                                    <th scope="col" className="px-6 py-3">Operating System</th>
                                    <th scope="col" className="px-6 py-3">Host</th>
                                    <th scope="col" className="px-6 py-3 text-center">Power Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {vms.map((vm) => (
                                    <tr key={vm.id} className="border-b border-slate-700 hover:bg-slate-800/40">
                                        <td className="px-6 py-4 font-medium text-white whitespace-nowrap">{vm.vm_name}</td>
                                        <td className="px-6 py-4"><VmStateBadge state={vm.vm_state} /></td>
                                        <td className="px-6 py-4">{vm.vm_ip}</td>
                                        <td className="px-6 py-4">{vm.vm_os}</td>
                                        <td className="px-6 py-4">{vm.vm_host}</td>
                                        <td className="px-6 py-4 text-center">
                                            {actionLoading === vm.vm_uuid ? (
                                                <div className="flex justify-center">
                                                     <svg className="animate-spin text-white h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                </div>
                                            ) : (
                                                <VmStateToggle
                                                    isChecked={vm.vm_state === "poweredOn"}
                                                    onChange={(e) => toggleVmState(e.target.checked, vm.vm_uuid)}
                                                />
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </PageContainer>
    );
};

export default VmsDashboard;
