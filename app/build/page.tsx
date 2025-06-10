"use client";
import React, { useState, useEffect, useRef, FC, ReactNode } from 'react';

// A mock PageContainer for stand-alone running. In a real Next.js app, 
// this would likely provide consistent page layout.
const PageContainer: FC<{ children: ReactNode }> = ({ children }) => (
    <div className="container mx-auto px-4 py-8">
        {children}
    </div>
);


// --- Helper Components for a cleaner UI ---

// Icon for form fields
const FormIcon: FC<{ children: ReactNode }> = ({ children }) => (
    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        {children}
    </div>
);

// --- Interfaces & Types ---
// These interfaces define the shape of data used throughout the component.

// Type for options used in custom select components
interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}

// Props for the CustomSelect component
interface CustomSelectProps {
    id: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    options: SelectOption[];
    icon?: ReactNode;
    disabled?: boolean;
}

// Props for the CustomToggle component
interface CustomToggleProps {
    label: string;
    checked: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

// Props for the ResourceMeter component
interface ResourceMeterProps {
    label: string;
    value: number;
    total: number;
    colorClass: string;
}

// Structure of the ESXi host data received from the API
interface EsxiState {
    ip: string;
    diskTotal: number;
    diskUsage: number;
    memTotal: number;
    memUsage: number;
    cpuTotal: number;
    cpuUsage: number;
}

// The selected host can be an EsxiState object or null
type SelectedHost = EsxiState | null;

// Structure for commit data within a project
interface CommitData {
    [commitId: string]: string;
}

// Structure for the project version data, containing multiple components and their commits
interface ProjectVersion {
    data: {
        [componentAndVersion: string]: CommitData;
    };
}

// Main form data structure
interface FormData {
    app_name: string;
    app_version: string;
    channel: string;
    ware_version: 'soft' | 'hard' | 'cloud' | 'soft_cloud';
    cpu: string;
    memory: string;
    disk: string;
    deploy_host: string;
    cloud_platform: 'none' | 'aliyun' | 'tencent' | 'huawei';
    projects: { [key: string]: string };
    is_new: boolean;
}

// --- Helper Component Implementations ---

const CustomSelect: FC<CustomSelectProps> = ({ id, value, onChange, options, icon, disabled = false }) => (
    <div className="relative">
        {icon && <FormIcon>{icon}</FormIcon>}
        <select
            id={id}
            value={value}
            onChange={onChange}
            disabled={disabled}
            className={`w-full py-3 pr-4 text-gray-300 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all appearance-none ${icon ? 'pl-10' : 'pl-4'} disabled:bg-slate-800/50 disabled:cursor-not-allowed`}
        >
            {options.map(option => (
                <option key={option.value} value={option.value} disabled={option.disabled}>
                    {option.label}
                </option>
            ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
            <svg className="w-4 h-4 fill-current text-gray-500" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
        </div>
    </div>
);

const CustomToggle: FC<CustomToggleProps> = ({ label, checked, onChange }) => (
    <label className="flex items-center justify-between cursor-pointer">
        <span className="text-lg font-medium text-slate-300">{label}</span>
        <div className="relative">
            <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
            <div className="block bg-slate-700 w-14 h-8 rounded-full"></div>
            <div className="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform duration-300 ease-in-out"
                 style={{ transform: checked ? 'translateX(100%)' : 'translateX(0)', backgroundColor: checked ? '#0ea5e9' : '#fff' }}></div>
        </div>
    </label>
);

const ResourceMeter: FC<ResourceMeterProps> = ({ label, value, total, colorClass }) => {
    const percentage = total > 0 ? (value / total) * 100 : 0;
    return (
        <div>
            <div className="flex justify-between mb-1">
                <span className="text-base font-medium text-slate-300">{label}</span>
                <span className="text-sm font-medium text-slate-400">{value.toFixed(2)} / {total.toFixed(2)} GB</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2.5">
                <div className={`${colorClass} h-2.5 rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }}></div>
            </div>
        </div>
    );
};

// Loading Spinner
const Spinner: FC = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);


// --- Main Page Component ---
const BuildPage: FC = () => {
    // Using a relative path for API requests as a fallback.
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';

    const [currentStep, setCurrentStep] = useState<number>(1);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [notification, setNotification] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });
    const [appVersionOptions, setAppVersionOptions] = useState<string[]>([]);
    const [esxiState, setEsxiState] = useState<EsxiState[]>([]);
    const [selectedHost, setSelectedHost] = useState<SelectedHost>(null);
    const [projectVersion, setProjectVersion] = useState<ProjectVersion>({ data: {} });
    const [isNew, setIsNew] = useState<boolean>(false);
    const [formData, setFormData] = useState<FormData>({
        app_name: 'waf',
        app_version: '',
        channel: 'uguardsec',
        ware_version: 'soft',
        cpu: '4',
        memory: '8',
        disk: '50',
        deploy_host: 'localhost',
        cloud_platform: 'none',
        projects: {},
        is_new: false,
    });

    const esxiStateDidFetch = useRef<boolean>(false);

    // --- Data Fetching Hooks ---
    
    // Fetches available versions for the selected application
    useEffect(() => {
        const fetchVersions = async () => {
            try {
                const response = await fetch(`${apiBaseUrl}/get_versions/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ project_name: formData.app_name }),
                });
                if (!response.ok) throw new Error('Network response was not ok');
                const data = await response.json() as { versions: string[] };
                setAppVersionOptions(data.versions || []);
            } catch (error) {
                console.error('Failed to fetch versions:', error);
                showNotification('Failed to fetch versions.', 'error');
            }
        };
        fetchVersions();
    }, [formData.app_name, apiBaseUrl]);

    // Fetches the state of ESXi hosts once on component mount
    useEffect(() => {
        const fetchEsxiState = async () => {
            if (esxiStateDidFetch.current) return;
            esxiStateDidFetch.current = true;
            try {
                const response = await fetch(`${apiBaseUrl}/esxi_state`);
                if (!response.ok) throw new Error('Network response was not ok');
                const data = await response.json() as { data: { [ip: string]: any }[] };
                setEsxiState(
                    data.data.map((item) => {
                        const ip = Object.keys(item)[0];
                        const details = item[ip];
                        return {
                            ip: ip,
                            diskTotal: details.disk_total,
                            diskUsage: details.disk_usage,
                            memTotal: details.mem_total,
                            memUsage: details.mem_usage,
                            cpuTotal: details.cpu_total,
                            cpuUsage: details.cpu_usage,
                        };
                    })
                );
            } catch (error) {
                console.error('Error fetching ESXi state:', error);
                showNotification('Error fetching ESXi state.', 'error');
            }
        };
        fetchEsxiState();
    }, [apiBaseUrl]);

    // Fetches project component data when the app version changes
    useEffect(() => {
        const fetchProjectData = async () => {
            if (!formData.app_version) return;
            setIsLoading(true); // Set loading state for the "Next" button
            try {
                const response = await fetch(`${apiBaseUrl}/project_version`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ app_name: formData.app_name, app_version: formData.app_version })
                });
                if (!response.ok) throw new Error('Network response was not ok');
                const data = await response.json() as ProjectVersion;
                setProjectVersion(data);
                // Pre-populate project commits
                setFormData((prev) => ({
                    ...prev,
                    projects: Object.keys(data.data).reduce((acc, key) => {
                        acc[key] = prev.projects[key] || Object.keys(data.data[key])[0];
                        return acc;
                    }, {} as { [key: string]: string })
                }));
            } catch (error) {
                console.error('Error fetching project version data:', error);
                showNotification('Error fetching project data.', 'error');
            } finally {
                setIsLoading(false); // Unset loading state
            }
        }
        fetchProjectData();
    }, [formData.app_name, formData.app_version, apiBaseUrl]);
    
    // --- Handlers ---
    const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
        setNotification({ show: true, message, type });
        setTimeout(() => {
            setNotification({ show: false, message: '', type: 'success' });
        }, 3000);
    };
    
    /**
     * Handles progression to the next step in the form.
     * Implements the logic to skip Step 2 if 'hardware' is selected.
     */
    const handleNextStep = () => {
        if (currentStep === 1 && formData.ware_version === 'hard') {
            setCurrentStep(3); // Skip to Preview
        } else if (currentStep < 3) {
            setCurrentStep(currentStep + 1);
        }
    };

    /**
     * Handles regression to the previous step in the form.
     * Implements the logic to skip back to Step 1 from Preview if 'hardware' is selected.
     */
    const handlePreviousStep = () => {
        if (currentStep === 3 && formData.ware_version === 'hard') {
            setCurrentStep(1); // Go back to Build Parameters
        } else if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleFormSubmit = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${apiBaseUrl}/build/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
             if (!response.ok) throw new Error('Build request failed');
            showNotification('提交成功!', 'success');
        } catch (error) {
            console.error('错误提交:', error);
            showNotification('构建失败.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUseNewBuild = (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked;
        setFormData({ ...formData, is_new: checked });
        setIsNew(checked);
    };

    const handleHostChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const hostIp = e.target.value;
        const selected = esxiState.find((host) => host.ip === hostIp) || null;
        setSelectedHost(selected);
        setFormData({ ...formData, deploy_host: hostIp });
    };
    
    const handleFormChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    // --- Options for Selects (for cleaner JSX) ---
    const appNameOptions: SelectOption[] = [
        { value: 'waf', label: 'WAF' }, { value: 'omas', label: 'omas' },
        { value: 'lams', label: 'lams' }, { value: 'dsas', label: 'dsas' },
        { value: 'cosa', label: 'cosa' },
    ];
    const wareVersionOptions: SelectOption[] = [
        { value: 'soft', label: '软件' }, { value: 'hard', label: '硬件' },
        { value: 'cloud', label: '云平台' }, { value: 'soft_cloud', label: '混合' },
    ];
    const cloudPlatformOptions: SelectOption[] = [
        { value: 'aliyun', label: 'Alibaba Cloud' }, { value: 'tencent', label: 'Tencent Cloud' },
        { value: 'huawei', label: 'Huawei Cloud' },
    ];
    const channelOptions: SelectOption[] = [
        { value: 'uguardsec', label: '天磊版' }, { value: 'sunyainfo', label: '上元信安' },
        { value: 'ruisuyun', label: '锐速云' }, { value: 'whiteboard', label: '中性' },
    ];
    const cpuOptions: SelectOption[] = [
        { value: '4', label: '4 Cores' }, { value: '8', label: '8 Cores' },
        { value: '16', label: '16 Cores' }, { value: '32', label: '32 Cores' },
    ];
    const memoryOptions: SelectOption[] = [
        { value: '8', label: '8 GB' }, { value: '16', label: '16 GB' }, { value: '32', label: '32 GB' },
    ];
    const diskOptions: SelectOption[] = [
        { value: '50', label: '50 GB' }, { value: '100', label: '100 GB' },
        { value: '150', label: '150 GB' }, { value: '250', label: '250 GB' },
        { value: '500', label: '500 GB' },
    ];

    // --- Render logic ---
    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-6 animate-fade-in">
                        <div>
                            <label htmlFor="app_name" className="block text-sm font-medium text-slate-400 mb-2">项目</label>
                            <CustomSelect id="app_name" value={formData.app_name}
                                onChange={(e) => setFormData({ ...formData, app_name: e.target.value, app_version: '' })}
                                options={appNameOptions}
                                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 16c1.642 0 3.12-.495 4.305-1.325a.5.5 0 01.39-.028l4.49 1.283a.5.5 0 00.615-.558V5.513a.5.5 0 00-.615-.558L13.195 6.24a.5.5 0 01-.39-.028A8.001 8.001 0 009 4.804z"/></svg>}
                            />
                        </div>
                        <div>
                           <label htmlFor="app_version" className="block text-sm font-medium text-slate-400 mb-2">版本</label>
                           <CustomSelect id="app_version" value={formData.app_version}
                                onChange={handleFormChange}
                                options={[
                                    { value: '', label: '选择版本', disabled: true },
                                    ...appVersionOptions.map(v => ({ value: v, label: v }))
                                ]}
                                disabled={!formData.app_name || appVersionOptions.length === 0}
                                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v4a1 1 0 102 0V7zm-1 9a1 1 0 110-2 1 1 0 010 2z" clipRule="evenodd" /></svg>}
                           />
                        </div>
                        <div>
                            <label htmlFor="ware_version" className="block text-sm font-medium text-slate-400 mb-2">型号</label>
                            <CustomSelect id="ware_version" value={formData.ware_version}
                                onChange={(e) => setFormData(prev => ({...prev, ware_version: e.target.value as FormData['ware_version']}))}
                                options={wareVersionOptions}
                                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>}
                           />
                        </div>
                        {formData.ware_version === 'cloud' && (
                             <div className="animate-fade-in">
                                 <label htmlFor="cloud_platform" className="block text-sm font-medium text-slate-400 mb-2">Platform</label>
                                 <CustomSelect id="cloud_platform" value={formData.cloud_platform}
                                     onChange={(e) => setFormData(prev => ({...prev, cloud_platform: e.target.value as FormData['cloud_platform']}))}
                                     options={cloudPlatformOptions}
                                     icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 16h-8z" /></svg>}
                                 />
                             </div>
                        )}
                        <div>
                            <label htmlFor="channel" className="block text-sm font-medium text-slate-400 mb-2">渠道</label>
                            <CustomSelect id="channel" value={formData.channel}
                                onChange={handleFormChange}
                                options={channelOptions}
                                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C3.732 4.943 9.522 3 10 3s6.268 1.943 9.542 7c-3.274 5.057-9.062 7-9.542 7S3.732 15.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>}
                            />
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-6 animate-fade-in">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">虚拟机配置</label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                               <CustomSelect id="cpu" value={formData.cpu} onChange={handleFormChange} options={cpuOptions} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm2 0h10v10H5V5z" clipRule="evenodd" /><path d="M7 7h2v2H7V7zm4 0h2v2h-2V7zm-4 4h2v2H7v-2zm4 0h2v2h-2v-2z" /></svg>} />
                               <CustomSelect id="memory" value={formData.memory} onChange={handleFormChange} options={memoryOptions} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm1 2a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 4a1 1 0 100 2h6a1 1 0 100-2H6z" clipRule="evenodd" /></svg>} />
                               <CustomSelect id="disk" value={formData.disk} onChange={handleFormChange} options={diskOptions} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" /></svg>} />
                            </div>
                        </div>
                        {(formData.ware_version === 'soft' || formData.ware_version === 'soft_cloud') && (
                            <div className="space-y-4 animate-fade-in">
                                <div>
                                    <label htmlFor="deploy_host" className="block text-sm font-medium text-slate-400 mb-2">宿主机</label>
                                    <CustomSelect id="deploy_host" value={formData.deploy_host} onChange={handleHostChange}
                                        options={[
                                            { value: 'localhost', label: '选择宿主机' },
                                            ...esxiState.map(h => ({ value: h.ip, label: h.ip }))
                                        ]}
                                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path d="M3 12v3c0 1.1.9 2 2 2h10a2 2 0 002-2v-3a2 2 0 00-2-2H5a2 2 0 00-2 2zm13-4H4a1 1 0 00-1 1v1h14V9a1 1 0 00-1-1zM4 5a2 2 0 012-2h8a2 2 0 012 2v1H4V5z" /></svg>}
                                    />
                                </div>
                                {selectedHost && (
                                    <div className="p-4 bg-slate-800/50 rounded-lg space-y-4 animate-fade-in">
                                        <h4 className="text-lg font-semibold text-sky-400">{selectedHost.ip} 当前资源</h4>
                                        <ResourceMeter label="CPU" value={selectedHost.cpuUsage} total={selectedHost.cpuTotal} colorClass="bg-green-500" />
                                        <ResourceMeter label="Memory" value={selectedHost.memUsage} total={selectedHost.memTotal} colorClass="bg-sky-500" />
                                        <ResourceMeter label="Disk" value={selectedHost.diskUsage} total={selectedHost.diskTotal} colorClass="bg-amber-500" />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            case 3:
                return (
                        <div className="animate-fade-in space-y-6">
                            <div className="max-h-[400px] overflow-y-auto pr-2">
                               <table className="w-full text-sm text-left text-slate-300">
                                    <thead className="text-xs text-slate-400 uppercase bg-slate-800 sticky top-0">
                                        <tr>
                                            <th scope="col" className="px-6 py-3">组件</th>
                                            <th scope="col" className="px-6 py-3">版本</th>
                                            <th scope="col" className="px-6 py-3">提交记录</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.keys(projectVersion.data).length > 0 ? (
                                            Object.keys(projectVersion.data).map((key) => (
                                                <tr key={key} className="bg-slate-900 border-b border-slate-800 hover:bg-slate-800/50">
                                                    <td className="px-6 py-4 font-medium text-white">{key.split('@')[0]}</td>
                                                    <td className="px-6 py-4">{key.split('@')[1]}</td>
                                                    <td className="px-6 py-4">
                                                        <CustomSelect
                                                            id={`project-${key}`}
                                                            value={formData.projects[key] || ''}
                                                            onChange={(e) => setFormData({ ...formData, projects: { ...formData.projects, [key]: e.target.value } })}
                                                            options={[
                                                                { value: '', label: 'Select a commit' },
                                                                ...Object.entries(projectVersion.data[key]).map(([commitId, commitMsg]) => ({ value: commitId, label: commitMsg }))
                                                            ]}
                                                        />
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr><td colSpan={3} className="text-center py-8 text-slate-400">No component data available for the selected version.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="p-4 bg-slate-800/50 rounded-lg">
                               <CustomToggle
                                   label="全新构建"
                                   checked={isNew}
                                   onChange={handleUseNewBuild}
                               />
                            </div>
                        </div>
                    );
            default:
                return null;
        }
    };
    
    const steps = [
        { id: 1, name: '构建参数' },
        { id: 2, name: '配置' },
        { id: 3, name: '预览' }
    ];

    return (
        <div className="bg-slate-900 text-white min-h-screen font-sans">
             {/* Notification Toast */}
            <div className={`fixed top-5 right-5 transition-all duration-300 transform ${notification.show ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'} z-50`}>
                <div className={`flex items-center p-4 rounded-lg shadow-lg text-white ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
                    <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <span>{notification.message}</span>
                </div>
            </div>

            <PageContainer>
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-sky-400">构建页面</h1>
                </header>

                <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Form */}
                    <div className="lg:col-span-2 bg-slate-800/50 p-6 sm:p-8 rounded-2xl shadow-2xl border border-slate-700">
                        {/* Stepper */}
                        <nav aria-label="Progress">
                            <ol role="list" className="flex items-center mb-8">
                                {steps.map((step, stepIdx) => (
                                    <li key={step.name} className={`relative ${stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''}`}>
                                        <div className="flex items-center">
                                            <span className={`h-9 flex items-center justify-center w-9 rounded-full ${currentStep >= step.id ? 'bg-sky-500' : 'bg-slate-700'}`}>
                                                <svg className="w-5 h-5 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                   {currentStep > step.id ? <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /> : <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="10">{step.id}</text>}
                                                </svg>
                                            </span>
                                            <span className="ml-4 text-sm font-medium text-slate-300">{step.name}</span>
                                        </div>
                                        {stepIdx !== steps.length - 1 ? (
                                            <div className="hidden sm:block absolute top-4 left-4 -ml-px mt-0.5 h-0.5 w-full bg-slate-700" aria-hidden="true" >
                                                <div className={`h-0.5 bg-sky-500 transition-all duration-500 ease-in-out`} style={{width: currentStep > step.id ? '100%' : '0%'}}></div>
                                            </div>
                                        ) : null}
                                    </li>
                                ))}
                            </ol>
                        </nav>

                        {/* Form Content */}
                        <div className="min-h-[35rem]">
                            {renderStepContent()}
                        </div>
                    </div>

                    {/* Right Column: Summary and Actions */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-8 bg-slate-800/50 p-6 rounded-2xl shadow-2xl border border-slate-700">
                           <h3 className="text-xl font-semibold text-sky-400 border-b border-slate-700 pb-3 mb-4">概要</h3>
                           <div className="space-y-3 text-sm">
                                <div className="flex justify-between"><span className="text-slate-400">项目:</span><span className="font-medium">{appNameOptions.find(o => o.value === formData.app_name)?.label}</span></div>
                                <div className="flex justify-between"><span className="text-slate-400">版本:</span><span className="font-medium">{formData.app_version || 'N/A'}</span></div>
                                <div className="flex justify-between"><span className="text-slate-400">型号:</span><span className="font-medium">{wareVersionOptions.find(o => o.value === formData.ware_version)?.label}</span></div>
                                <div className="flex justify-between"><span className="text-slate-400">配置:</span><span className="font-medium">{formData.cpu}C / {formData.memory}G / {formData.disk}G</span></div>
                                {(formData.ware_version === 'soft' || formData.ware_version === 'soft_cloud') && <div className="flex justify-between"><span className="text-slate-400">宿主机:</span><span className="font-medium">{formData.deploy_host}</span></div>}
                           </div>

                           <div className="mt-8 pt-6 border-t border-slate-700 flex flex-col space-y-4">
                                <div className="flex justify-between w-full">
                                   <button onClick={handlePreviousStep} disabled={currentStep === 1 || isLoading} className="w-full mr-2 text-center py-3 px-4 rounded-lg font-semibold transition-all duration-300 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed">
                                        后退
                                   </button>
                                   {currentStep < 3 ? (
                                        <button onClick={handleNextStep} disabled={isLoading || (currentStep === 1 && !formData.app_version)} className="w-full ml-2 text-center py-3 px-4 rounded-lg font-semibold transition-all duration-300 text-white bg-sky-600 hover:bg-sky-500 disabled:bg-sky-800/50 disabled:text-sky-500/50 disabled:cursor-not-allowed flex items-center justify-center">
                                            {/* Show spinner when fetching project data after version selection */}
                                            {isLoading && currentStep === 1 ? (
                                                <><Spinner /><span>Loading...</span></>
                                            ) : (
                                                '下一步'
                                            )}
                                        </button>
                                   ) : (
                                        <button onClick={handleFormSubmit} disabled={isLoading} className="w-full ml-2 text-center py-3 px-4 rounded-lg font-semibold transition-all duration-300 text-white bg-green-600 hover:bg-green-500 disabled:bg-green-800 disabled:cursor-not-allowed flex items-center justify-center">
                                            {isLoading ? <><Spinner /> 校验...</> : '开始构建'}
                                        </button>
                                   )}
                                </div>
                           </div>
                        </div>
                    </div>
                </main>
            </PageContainer>
        </div>
    );
};

export default BuildPage;
