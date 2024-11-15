import React, {useEffect, useState} from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { FiLock, FiUnlock } from 'react-icons/fi';

import Link from "next/link";



interface LockStatus {
    [key: string]: number; // 或 boolean，如果你希望存储真/假值而非 0 和 1
}
interface selectedHost {
    ip: string;
    diskTotal: number;
    diskUsage: number;
    memTotal: number;
    memUsage: number;
    cpuTotal: number;
    cpuUsage: number;
}

interface ProjectVersion {
    data: {
        [key: string]: string; // 假设每个值都是字符串，根据实际情况调整
    };
}


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

    const [wareVersion, setWareVersion] = useState('soft')

    const [countdowns, setCountdowns] = useState({});

    const [currentPage, setCurrentPage] = useState(1);

    const [saveFormData, setSaveFormData] = useState({
        app_name: '',
        app_version: '',
        channel: '',
        ware_version: '',
        cpu: '',
        memory: '',
        disk: '',
        deploy_host: '',
        cloud_platform: ''
    });
    const [projectVersion, setProjectVersion] = useState<ProjectVersion>({data: {}});


    useEffect(() => {
        const fetchData = async () => {
            // 假设这是获取数据的 API URL
            const response = await fetch(`${apiBaseUrl}/project_version`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ app_name: saveFormData.app_name, app_version: saveFormData.app_version })
            });
            const data = await response.json();
            setProjectVersion(data);
        };

        fetchData();
    }, [saveFormData.app_name, saveFormData.app_version, apiBaseUrl]);

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



    useEffect(() => {
        const fetchEsxiState = async () => {
            try {
                const response = await fetch(`${apiBaseUrl}/esxi_state`);
                const data = await response.json();
                // 提取所有的 IP 地址
                setEsxiState(data.data.map((item: any) => ({
                    ip: Object.keys(item)[0],
                    diskTotal: item[Object.keys(item)[0]]['disk_total'],
                    diskUsage: item[Object.keys(item)[0]]['disk_usage'],
                    memTotal: item[Object.keys(item)[0]]['mem_total'],
                    memUsage: item[Object.keys(item)[0]]['mem_usage'],
                    cpuTotal: item[Object.keys(item)[0]]['cpu_total'],
                    cpuUsage: item[Object.keys(item)[0]]['cpu_usage']
                })));

            } catch (error) {
                console.error('Error fetching esxi state:', error);
            }
        };
        fetchEsxiState().then(r => r);
    }, [apiBaseUrl]);
const proBuild = async () => {
    setIsLoading(true);
    try {
        const formData = new FormData();
        formData.append('app_name', selectedProject);
        formData.append('app_version', saveFormData.app_version);
        formData.append('channel', saveFormData.channel);
        formData.append('ware_version', saveFormData.ware_version);
        formData.append('cloud_platform', saveFormData.cloud_platform);

        const response = await fetch(`${apiBaseUrl}/probuild/`, {
            method: 'POST',
            body: formData,
        });
        const data = await response.json();

        setTriggerHistoryUpdate(!triggerHistoryUpdate);
        setNotification({ show: true, message: '生产构建已开始' });
        setTimeout(() => setNotification({ show: false, message: "" }), 3000);
        setCurrentPage(1);
    } catch (error) {
        console.error('Error on form submit:', error);
    } finally {
        setIsLoading(false);
    }
}
const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    try {
        const formData = new FormData(event.currentTarget); // Make sure 'event.currentTarget' is correctly used.

        formData.append('app_name', selectedProject);
        formData.append('app_version', saveFormData.app_version);
        formData.append('channel', saveFormData.channel);
        formData.append('ware_version', saveFormData.ware_version);
        formData.append('cloud_platform', saveFormData.cloud_platform);
        formData.append('cpu', saveFormData.cpu);
        formData.append('memory', saveFormData.memory);
        formData.append('disk', saveFormData.disk);
        formData.append('deploy_host', saveFormData.deploy_host);

        const response = await fetch(`${apiBaseUrl}/build/`, {
            method: 'POST',
            body: formData,
        });
        const data = await response.json();


        setTriggerHistoryUpdate(!triggerHistoryUpdate);
        setNotification({ show: true, message: '验证构建已开始' });
        setTimeout(() => setNotification({ show: false, message: "" }), 3000);
        setCurrentPage(1);
    } catch (error) {
        console.error('Error on form submit:', error);
    } finally {
        setIsLoading(false);
    }
};

    const [isPreviewButton, setIsPreviewButton] = useState(false);
    const [cloudPlatform, setCloudPlatform] = useState('none');

    const handleWareVersionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setWareVersion(event.target.value);
        setIsPreviewButton(event.target.value !== 'soft');
        setCloudPlatform(event.target.value === 'cloud' ? 'cloud' : 'none');
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

    const nextPage = () => {

        const form = document.querySelector('.form-container form');
        // 保存第一页的数据
        const newFormData= {
            app_name: selectedProject,
            app_version: (form?.querySelector('#source2') as HTMLSelectElement).value,
            ware_version: (form?.querySelector('#source6') as HTMLSelectElement).value,
            channel: (form?.querySelector('#source7') as HTMLSelectElement).value,
            cloud_platform: (form?.querySelector('#source8') as HTMLSelectElement)?.value ?? '',
            cpu: '',
            memory: '',
            disk: '',
            deploy_host: ''
        };

        setSaveFormData(newFormData);
        setCurrentPage(2);
    };

    const previousPage = () => {
        setCurrentPage(1);
        setIsPreviewButton(false);
    };

    const project_version = () => {
        // 保存cpu, memory, disk, deploy_host
        if (! isPreviewButton) {
            const form = document.querySelector('.form-container form');
            const newFormData = {
                ...saveFormData,
                cpu: (form?.querySelector('#source3') as HTMLSelectElement).value,
                memory: (form?.querySelector('#source4') as HTMLSelectElement).value,
                disk: (form?.querySelector('#source5') as HTMLSelectElement).value,
                deploy_host: (form?.querySelector('#source6') as HTMLSelectElement).value,
                cloud_platform: (form?.querySelector('#source8') as HTMLSelectElement)?.value ?? '',
            }

            setSaveFormData(newFormData);
            setCurrentPage(3);
        }else {
            nextPage()
            setCurrentPage(3)
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
                    {currentPage === 1 && (
                        <>
                        {/* 第一页内容 */}
                        <div className="select-group">
                            <label htmlFor="source1">项目</label>
                            <select name="app_name" id="source1" className="form-select" onChange={handleProjectChange}
                                    value={selectedProject}>
                                <option value="waf">waf</option>
                                <option value="omas">堡垒机</option>
                                <option value="lams">日审</option>
                                <option value="dsas">数审</option>
                                <option value="cosa">二合一</option>
                            </select>
                        </div>
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
                            <select name="ware_version" id="source6" className="form-select"
                                    onChange={handleWareVersionChange}>
                                <option value="soft" defaultValue="soft">软件版</option>
                                <option value="hard">硬件版</option>
                                <option value="cloud">云版</option>
                                <option value="soft_cloud">全都要</option>
                            </select>
                        </div>

                            {cloudPlatform === 'cloud' && (
                                // 阿里云 腾讯云 华为云

                                    <div className="select-group">
                                        <label htmlFor="source8">平台</label>
                                        <select name="cloud_platform" id="source8" className="form-select">
                                            <option value="aliyun" defaultValue="aliyun">阿里云</option>
                                            <option value="tencent" defaultValue="tencent">腾讯云</option>
                                            <option value="huawei" defaultValue="huawei">华为云</option>
                                        </select>
                                    </div>
                            )}
                        <div className="select-group">
                            <label htmlFor="source7">渠道</label>
                            <select name="channel" id="source7" className="form-select">
                                <option value="uguardsec" defaultValue="uguardsec">天磊</option>
                                <option value="sunyainfo">上元信安</option>
                                <option value="ruisuyun">锐速云</option>
                                <option value="whiteboard">白板</option>
                            </select>
                        </div>
                        {(isPreviewButton) && (
                            <button type="button" onClick={project_version}>预览</button>
                        ) || (
                            <button type="button" onClick={nextPage}>下一页</button>
                    )}
                </>
                )}

                {currentPage === 2 && (
                        <>
                            {/* 第二页内容 */}
                            <div className="select-group">
                                <label htmlFor="source3">CPU</label>
                                <select name="cpu" id="source3" className="form-select">
                                    <option value="4" defaultValue="4">4</option>
                                    <option value="8">8</option>
                                    <option value="16">16</option>
                                    <option value="32">32</option>
                                </select>
                            </div>
                            <div className="select-group">
                                <label htmlFor="source4">内存</label>
                                <select name="memory" id="source4" className="form-select">
                                    <option value="16" defaultValue="16">16</option>
                                    <option value="8">8</option>
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
                            {(wareVersion === 'soft' || wareVersion === 'soft_cloud') && (
                                <div>
                                    <div className="select-group">
                                        <label htmlFor="source6">宿主机</label>
                                        <select name="deploy_host" id="source6" className="form-select"
                                                onChange={handleSelectChange}>

                                            {esxiState.map((host: any, index) => (
                                                <option key={index} value={host.ip}>{host.ip}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {selectedHost && (
                                        <div className="memory-progress">
                                            <label htmlFor="cpuUsage">CPU
                                                ({selectedHost.cpuUsage.toFixed(2)} / {selectedHost.cpuTotal.toFixed(2)} Cores)</label>
                                            <progress id="cpuUsage" max={selectedHost.cpuTotal}
                                                      value={selectedHost.cpuUsage}
                                                      style={{width: '100%'}}></progress>
                                            <label htmlFor="memoryUsage">内存
                                                ({selectedHost.memUsage.toFixed(2)} / {selectedHost.memTotal.toFixed(2)} GB)</label>
                                            <progress id="memoryUsage" max={selectedHost.memTotal}
                                                      value={selectedHost.memUsage}
                                                      style={{width: '100%'}}></progress>
                                            <label htmlFor="memoryUsage">硬盘
                                                ({selectedHost.diskUsage.toFixed(2)} / {selectedHost.diskTotal.toFixed(2)} GB)</label>
                                            <progress id="memoryUsage" max={selectedHost.diskTotal}
                                                      value={selectedHost.diskUsage}
                                                      style={{width: '100%'}}></progress>
                                            <label htmlFor="memoryUsage">可用
                                                CPU/内存/硬盘<br/>
                                                {(selectedHost.cpuTotal - selectedHost.cpuUsage).toFixed(2)} Cores /
                                                {(selectedHost.memTotal - selectedHost.memUsage).toFixed(2)} GB /
                                                {(selectedHost.diskTotal - selectedHost.diskUsage).toFixed(2)} GB</label>
                                        </div>
                                    )}
                                </div>
                            )}
                            <button type="button" onClick={previousPage}>上一页</button>
                            <button type="button" onClick={project_version}>预览</button>
                             </>
                            )}
                    {currentPage === 3 && (
                        <>
                            {/* 第三页内容 */}
                            <div className='contain-content'>
                                <h4>{saveFormData.app_name} {saveFormData.app_version}版本信息</h4>
                                <table className="version-table">
                                    <thead>
                                    <tr>
                                        <th>组件名称</th>
                                        <th>版本号</th>
                                        <th>提交记录</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {Object.keys(projectVersion.data).length > 0 && Object.keys(projectVersion.data).map((key) => (
                                        <tr key={key}>
                                            <td>{key.split('@')[0]}</td>
                                            <td>{key.split('@')[1]}</td>
                                            <td>
                                                <select>
                                                    {Object.keys(projectVersion.data[key]).map((commitId) => (
                                                        <option key={commitId} value={commitId}>
                                                            {projectVersion.data[key][commitId]}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>


                            <div className="button-group">
                                <button type="button" onClick={previousPage} className="cancel-button">取消</button>
                                <button type="submit" disabled={isLoading} className="submit-button">
                                    {isLoading ? 'Loading...' : '验证构建'}
                                </button>
                                <button type="button" onClick={proBuild} className="build-button">生产构建</button>
                            </div>

                        </>
                    )}

                </form>
                <div className="version">version: replacever</div>
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
                                        {   historyItem['deploy_host'] !== "127.0.0.1" &&
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

        </div>
    );
};

export default IndexPage;
