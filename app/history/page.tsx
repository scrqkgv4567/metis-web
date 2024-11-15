'use client'
import React, {useEffect, useState, Suspense } from 'react';
import Link from "next/link";
import {FiLock, FiUnlock} from "react-icons/fi";
import 'bootstrap/dist/css/bootstrap.min.css';

function formatTime(ms: any) {
    if (ms <= 0) {
        return "00:00:00";
    }

    let seconds:any = Math.floor(ms / 1000);
    let minutes:any = Math.floor(seconds / 60);
    let hours:any = Math.floor(minutes / 60);

    seconds = seconds % 60;
    minutes = minutes % 60;

    // Pad with zeros to ensure double digits
    hours = hours.toString().padStart(2, '0');
    minutes = minutes.toString().padStart(2, '0');
    seconds = seconds.toString().padStart(2, '0');

    return `${hours}:${minutes}:${seconds}`;
}

const HistoryPageContent  = () => {
    interface LockStatus {
        [key: string]: number;
    }
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;


    const [filterVersionOptions, setFilterVersionOptions] = useState([]);
    const [selectedHistoryProject, setSelectedHistoryProject] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [historyData, setHistoryData] = useState([]);
    const [filterVersion, setFilterVersion] = useState('');
    const [triggerHistoryUpdate, setTriggerHistoryUpdate] = useState(false);
    const [lockStatus, setLockStatus] = useState<LockStatus>({});
    const [countdowns, setCountdowns] = useState({});


    const handleHistoryProjectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedHistoryProject(event.target.value);
    };
    const triggerRecycleAPI = async (deployId: string) => {
        try {
            await fetch(`${apiBaseUrl}/build/`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({action: 'recycle', deploy_id: deployId}),
            });
            console.log(`Resource recycled for deployId: ${deployId}`);
        } catch (error) {
            console.error('Error recycling resource:', error);
        }
    };


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

                const newCountdowns = {...countdowns};
                const filteredData = data.history.filter((item: HistoryItem) =>
                    (!selectedHistoryProject || item['app_name'] === selectedHistoryProject) &&
                    (!filterVersion || item['app_version'] === filterVersion)
                );


                // 初始化锁定状态
                filteredData.forEach((item: HistoryItem): any => {
                    newLockStatus[item['iso_name']] = item['is_lock'];
                });

                filteredData.forEach((item: any): any => {
                    newLockStatus[item['iso_name']] = item['is_lock'];

                    // Calculate countdown end time, adding 30 days to the end time
                    const endTime = item['end_build_time'] ? new Date(item['end_build_time']) : null;
                    if (endTime) {
                        endTime.setDate(endTime.getDate() + 30);
                        // Add 30 days to the end time
                        const now = new Date(), timeLeft = endTime > now ? endTime.getTime() - now.getTime() : 0;
                        // @ts-ignore
                        newCountdowns[item['iso_name']] = timeLeft;
                    } else {
                        // @ts-ignore
                        newCountdowns[item['iso_name']] = 0; // If endTime is null, set countdown to 0
                    }
                });
                setHistoryData(filteredData);
                setLockStatus(newLockStatus);
                setCountdowns(newCountdowns);
            } catch (error) {
                console.error('Error fetching history:', error);
            }
        };

        fetchHistory().then(r => r);
    }, [selectedHistoryProject, filterVersion, apiBaseUrl, triggerHistoryUpdate]);

    useEffect(() => {
        const timer = setInterval(() => {
            setCountdowns(current => {
                const updated = {...current};
                Object.keys(updated).forEach(key => {
                    // @ts-ignore
                    if (updated[key] > 0) {
                        // @ts-ignore
                        updated[key] -= 1000;
                    } else { // @ts-ignore
                        if (updated[key] <= 0) {
                            // Before triggering, make sure all conditions are met
                            const historyItem = historyData.find(item => item['iso_name'] === key);
                            if (historyItem && historyItem['state'] !== "FAILURE" && historyItem['state'] !== "DELETE" && historyItem['deploy_host'] !== "127.0.0.1" &&
                                historyItem['end_build_time'] !== null && historyItem['ip'] !== null && historyItem['is_lock'] !== null && historyItem['deploy_host'] !== null) {
                                // 暂时注释掉，避免误操作
                                // triggerRecycleAPI(key);
                                // @ts-ignore
                                updated[key] = 0; // Optionally reset or handle as needed
                            }
                        }
                    }
                });
                return updated;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [historyData]);  // Ensure historyData is in the dependency array if it's not static



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


    return (
        <div className="history-container">
            <h3 className="my-4">历史构建</h3>
            <div className="filter-container">
                <select value={selectedHistoryProject} onChange={handleHistoryProjectChange}
                        className="form-select">
                    <option value="">所有项目</option>
                    <option value="waf">waf</option>
                    <option value="omas">堡垒机</option>
                    <option value="lams">日审</option>
                    <option value="dsas">数审</option>
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

                            {historyItem['state'] === 'STOPPED' && <div className="new-badge-stop">停止</div>}
                            {historyItem['state'] === 'RUNNING' && <div className="new-badge-running">运行</div>}
                            {historyItem['state'] === 'DELETE' && <div className="new-badge-delete">删除</div>}
                            {historyItem['state'] === 'SUCCESS' && <div className="new-badge-success">成功</div>}
                            {historyItem['state'] === 'FAILURE' && <div className="new-badge-failure">失败</div>}
                            {historyItem['state'] === 'VERIFIED' && <div className="new-badge-verify">已验证</div>}
                            {historyItem['state'] === 'PASSED' && <div className="new-badge-verify">已验证删除</div>}
                            <div className="card-body">

                                <p className="card-text">项目: {historyItem['app_name']} </p>
                                <p className="card-text">版本: {historyItem['app_version']} </p>
                                <p className="card-text">时间: {historyItem['start_build_time']}～{historyItem['end_build_time']}</p>
                                <p className="card-text">次数: {historyItem['ci_count']}</p>
                                <p className="card-text">宿主机IP: {historyItem['deploy_host']}</p>
                                <p className="card-text">IP: {historyItem['ip']}</p>
                                {historyItem['deploy_host'] !== "127.0.0.1" &&
                                    historyItem['state'] !== "FAILURE" &&
                                    historyItem['state'] !== "DELETE" &&
                                    historyItem['end_build_time'] !== null &&
                                    historyItem['ip'] !== null &&
                                    historyItem['is_lock'] !== null
                                    // historyItem['deploy_host'] !== null &&
                                    // (
                                    //     <div className="card-text">
                                    //         删除倒计时: {countdowns[historyItem['iso_name']] ? formatTime(countdowns[historyItem['iso_name']]) : 'Recycling triggered'}
                                    //     </div>
                                    // )
                                }


                                <Link href={`/task?deploy_id=${historyItem['iso_name']?.split('-')[2]}`}
                                      className="card-link">查看详情</Link>
                            </div>
                            {(historyItem['state'] === 'SUCCESS' || historyItem['state'] === 'VERIFIED') && !(historyItem['deploy_host'] === "127.0.0.1" || historyItem[11] === null) && (
                                <button
                                    className="lock-button"
                                    onClick={() => toggleLock(historyItem['iso_name'], lockStatus[historyItem['iso_name']] ?? 0)} // 如果未设置，默认为0
                                >
                                    {lockStatus[historyItem['iso_name']] === 1 ? <FiLock/> : <FiUnlock/>}
                                </button>

                            )}
                        </div>

                    ))
                ) : (
                    <div>Loading...</div>
                )}
            </div>
        </div>
    );
}

const HistoryPage = () => (
    <Suspense fallback={<div>Loading history details...</div>}>
        <HistoryPageContent />
    </Suspense>
);

export default HistoryPage;