import React, {useEffect, useState} from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { FiLock, FiUnlock } from 'react-icons/fi';

import Link from "next/link";



interface LockStatus {
    [key: string]: number; // 或 boolean，如果你希望存储真/假值而非 0 和 1
}
interface selectedHost {
    ip: string;
    memTotal: number;
    memUsage: number;
    cpuTotal: number;
    cpuUsage: number;
}
const IndexPage = () => {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

    const [appVersionOptions, setAppVersionOptions] = useState([]);
    const [filterVersionOptions, setFilterVersionOptions] = useState([]);
    const [selectedProject, setSelectedProject] = useState('waf');
    const [selectedHistoryProject, setSelectedHistoryProject] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [historyData, setHistoryData] = useState([]);
    const [filterVersion, setFilterVersion] = useState('');
    const [triggerHistoryUpdate, setTriggerHistoryUpdate] = useState(false);
    const [notification, setNotification] = useState({ show: false, message: "" });
    const [esxiState, setEsxiState] = useState([]);
    const [selectedHost, setSelectedHost] = useState<selectedHost | null>(null);
    const [lockStatus, setLockStatus] = useState<LockStatus>({});

    const [wareVersion, setWareVersion] = useState('')

    const handleProjectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedProject(event.target.value);
    };

    const handleHistoryProjectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedHistoryProject(event.target.value);
    };


    // Fetch versions for the main project selection
    useEffect(() => {
        const controller = new AbortController();
        const fetchVersions = async () => {
            if (!selectedProject) return;
            try {
                const response = await fetch(`${apiBaseUrl}/get_versions/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ project_name: selectedProject }),
                    signal: controller.signal
                });
                const data = await response.json();
                setAppVersionOptions(data.versions);
            } catch (error) {
                console.error('Failed to fetch versions:', error);
            }
        };

        fetchVersions().then(r => r);
        return () => controller.abort();
    }, [selectedProject, apiBaseUrl]);

    // Fetch versions for the history project selection
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
                    signal: controller.signal
                });
                const data = await response.json();
                setFilterVersionOptions(data.versions);
            } catch (error) {
                console.error('Failed to fetch versions:', error);
            }
        };

        fetchFilterVersion().then(r => r);
        return () => controller.abort();
    }, [selectedHistoryProject, apiBaseUrl]);
    useEffect(() => {
        interface HistoryItem {
            deploy_id: string;  // 部署的唯一标识符
            [key: string]: any;  // 允许访问其他任意属性
        }
        const fetchHistory = async () => {
            try {
                const response = await fetch(`${apiBaseUrl}/history/`);
                const data = await response.json();
                const newLockStatus: Record<string, number> = {};

                const filteredData = data.history.history.filter((item: HistoryItem) =>
                    (!selectedHistoryProject || item[3] === selectedHistoryProject) &&
                    (!filterVersion || item[4] === filterVersion)
                );

                // 初始化锁定状态
                filteredData.forEach((item: HistoryItem) => {
                    newLockStatus[item[2]] = item[9];
                });
                setHistoryData(filteredData);
                setLockStatus(newLockStatus);
            } catch (error) {
                console.error('Error fetching history:', error);
            }
        };

        fetchHistory().then(r => r);
    }, [selectedHistoryProject, filterVersion, apiBaseUrl, triggerHistoryUpdate]);

    useEffect(() => {
        const fetchEsxiState = async () => {
            try {
                const response = await fetch(`${apiBaseUrl}/esxi_state`);
                const data = await response.json();
                // 提取所有的 IP 地址
                setEsxiState(data.data.map((item: any) => ({
                    ip: Object.keys(item)[0],
                    memTotal: item[Object.keys(item)[0]]['mem_total'],
                    memUsage: item[Object.keys(item)[0]]['mem_usage'],
                    cpuTotal: item[Object.keys(item)[0]]['cpu_total'],
                    cpuUsage: item[Object.keys(item)[0]]['cpu_usage']
                })));
                console.log(data);
            } catch (error) {
                console.error('Error fetching esxi state:', error);
            }
        };
        fetchEsxiState().then(r => r);
    }, [apiBaseUrl]);

const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    try {
        const formData = new FormData(event.currentTarget); // Make sure 'event.currentTarget' is correctly used.
        const response = await fetch(`${apiBaseUrl}/build/`, {
            method: 'POST',
            body: formData,
        });
        const data = await response.json();
        console.log('Response:', data);

        setTriggerHistoryUpdate(!triggerHistoryUpdate);
        setNotification({ show: true, message: '构建已开始' });
        setTimeout(() => setNotification({ show: false, message: "" }), 3000);
    } catch (error) {
        console.error('Error on form submit:', error);
    } finally {
        setIsLoading(false);
    }
};

    const handleWareVersionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setWareVersion(event.target.value);
    }

    const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedIP = event.target.value;
        const host = esxiState.find(({ip}) => ip === selectedIP);

        // Only set the host if it is found
        if (host !== undefined) {
            setSelectedHost(host);
        } else {
            // Optionally set to null or handle the undefined case differently
            setSelectedHost(null);  // Adjust this based on how your state should be handled when no host is found
        }
    };


    const toggleLock = async (deployId: any, currentLockStatus: any) => {
        const newLockStatus = currentLockStatus === 1 ? 0 : 1; // 在1和0之间切换

        setIsLoading(true);
        try {
            const response = await fetch(`${apiBaseUrl}/build/`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: newLockStatus === 1 ? 'lock' : 'unlock', deploy_id: deployId }),
            });
            const data = await response.json();
            console.log('Lock response:', data);

            // 使用 deployId 作为键来更新 lockStatus 状态
            setLockStatus(prevStatus => ({
                ...prevStatus,
                [deployId]: newLockStatus
            }));
        } catch (error) {
            console.error('Error toggling lock:', error);
        } finally {
            setIsLoading(false);
        }
    };




    // @ts-ignore
    return (
        <div className="page-container">
            <div className="form-container">
                <div className={`notification ${notification.show ? 'show' : 'hide'}`}>
                    {notification.message}
                </div>
                <form onSubmit={onSubmit}>
                    {/* 项目选择 */}
                    <div className="select-group">
                        <label htmlFor="source1">项目</label>
                        <select name="app_name" id="source1" className="form-select" onChange={handleProjectChange}
                                value={selectedProject}>
                            <option value="waf">waf</option>
                            <option value="omas">堡垒机</option>
                            <option value="lams">日审</option>
                            <option value="cosa">二合一</option>
                        </select>
                    </div>
                    {/* 版本选择 */}
                    <div className="select-group">
                        <label htmlFor="source2">版本</label>
                        <select name="app_version" id="source2" className="form-select">
                            {appVersionOptions.map(version => (
                                <option key={version} value={version}>{version}</option>
                            ))}
                        </select>
                    </div>
                    <div className="select-group">
                        <label htmlFor="source6">型号</label>
                        <select name="ware_version" id="source6" className="form-select" onChange={handleWareVersionChange}>
                            <option value="hard" defaultValue="hard">硬件版</option>
                            <option value="soft">软件版</option>
                            <option value="cloud">云版</option>
                            <option value="soft_cloud">全都要</option>
                        </select>
                    </div>
                    <div className="select-group">
                        <label htmlFor="source3">CPU</label>
                        <select name="cpu" id="source3" className="form-select">
                            <option value="1" defaultValue="1">1</option>
                            <option value="2">2</option>
                            <option value="4">4</option>
                            <option value="8">8</option>
                            <option value="16">16</option>
                            <option value="32">32</option>
                        </select>
                    </div>
                    <div className="select-group">
                        <label htmlFor="source4">内存</label>
                        <select name="memory" id="source4" className="form-select">
                            <option value="1" defaultValue="1">1</option>
                            <option value="2">2</option>
                            <option value="4">4</option>
                            <option value="8">8</option>
                            <option value="16">16</option>
                            <option value="32">32</option>
                        </select>
                    </div>
                    <div className="select-group">
                        <label htmlFor="source5">硬盘</label>
                        <select name="disk" id="source5" className="form-select">
                            <option value="50" defaultValue="50">50</option>
                            <option value="100">100</option>
                            <option value="150">150</option>
                            <option value="250">250</option>
                            <option value="500">500</option>
                        </select>
                    </div>
                    { (wareVersion === 'soft' || wareVersion === 'soft_cloud') && (
                        <div>
                            <div className="select-group">
                                <label htmlFor="source5">宿主机</label>
                                <select name="deploy_host" id="source5" className="form-select" onChange={handleSelectChange}>
                                    <option value="none">请选择宿主机</option>
                                    {esxiState.map((host: any, index) => (
                                        <option key={index} value={host.ip}>{host.ip}</option>
                                    ))}
                                </select>
                            </div>
                            {selectedHost && (
                                <div className="memory-progress">
                                    <label htmlFor="cpuUsage">CPU
                                        ({selectedHost.cpuUsage.toFixed(2)} / {selectedHost.cpuTotal.toFixed(2)} Cores)</label>
                                    <progress id="cpuUsage" max={selectedHost.cpuTotal} value={selectedHost.cpuUsage}
                                              style={{width: '100%'}}></progress>
                                    <label htmlFor="memoryUsage">内存
                                        ({selectedHost.memUsage.toFixed(2)} / {selectedHost.memTotal.toFixed(2)} GB)</label>
                                    <progress id="memoryUsage" max={selectedHost.memTotal} value={selectedHost.memUsage}
                                              style={{width: '100%'}}></progress>
                                    <label htmlFor="memoryUsage">可用CPU/内存
                                        ({(selectedHost.cpuTotal - selectedHost.cpuUsage).toFixed(2)} Cores /
                                        {(selectedHost.memTotal - selectedHost.memUsage).toFixed(2)} GB)</label>
                                </div>
                            )}
                        </div>
                    )}
                    <button className="button" type="submit" disabled={isLoading}>
                        {isLoading ? 'Loading...' : '开始构建'}
                    </button>
                </form>
                <div className="version">version: 0.1.3</div>
            </div>


            <div className="history-container">
                <h3 className="my-4">历史构建</h3>
                <div className="filter-container">
                    <select value={selectedHistoryProject} onChange={handleHistoryProjectChange}
                            className="form-select">
                        <option value="">所有项目</option>
                        <option value="waf">waf</option>
                        <option value="omas">堡垒机</option>
                        <option value="lams">日审</option>
                        <option value="cosa">二合一</option>
                    </select>
                    <select value={filterVersion} onChange={e => setFilterVersion(e.target.value)}
                            className="form-select">
                        <option value="">所有版本</option>
                        {filterVersionOptions.map(version => (
                            <option key={version} value={version}>{version}</option>
                        ))}
                    </select>
                </div>


                    <div className="card-container">
                        {Array.isArray(historyData) && historyData.length > 0 ? (

                            historyData.map((historyItem: any, index) => (

                                <div className="card mb-3" key={index}>

                                    {historyItem[7] === 'STOPPED' && <div className="new-badge-stop">停止</div>}
                                    {historyItem[7] === 'RUNNING' && <div className="new-badge-running">运行</div>}
                                    {historyItem[7] === 'DELETE' && <div className="new-badge-delete">删除</div>}
                                    {historyItem[7] === 'SUCCESS' && <div className="new-badge-success">成功</div>}
                                    {historyItem[7] === 'FAILURE' && <div className="new-badge-failure">失败</div>}
                                    {historyItem[7] === 'VERIFIED' && <div className="new-badge-verify">已验证</div>}
                                    {historyItem[7] === 'PASSED' && <div className="new-badge-verify">已验证删除</div>}
                                    <div className="card-body">

                                        <p className="card-text">项目: {historyItem[3]} </p>
                                        <p className="card-text">版本: {historyItem[4]} </p>
                                        <p className="card-text">时间: {historyItem[5]}～{historyItem[6]}</p>
                                        <p className="card-text">次数: {historyItem[1]}</p>
                                        <p className="card-text">宿主机IP: {historyItem[10]}</p>
                                        <p className="card-text">IP: {historyItem[8]}</p>
                                        <Link href={`/task?deploy_id=${historyItem[2]?.split('-')[2]}`}
                                              className="card-link">查看详情</Link>
                                    </div>
                                    {(historyItem[7] === 'SUCCESS' || historyItem[7] === 'VERIFIED') && !(historyItem[11] === "127.0.0.1" || historyItem[10] === null) && (
                                        <button
                                            className="lock-button"
                                            onClick={() => toggleLock(historyItem[2], lockStatus[historyItem[2]] ?? 0)} // 如果未设置，默认为0
                                        >
                                            {lockStatus[historyItem[2]] === 1 ? <FiLock/> : <FiUnlock/>}
                                        </button>

                                    )}
                                </div>

                            ))
                        ) : (
                            <div>Loading...</div>
                        )}
                    </div>
            </div>

        </div>
    );
};

export default IndexPage;
