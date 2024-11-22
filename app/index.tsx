import React, { useEffect, useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

interface selectedHost {
    ip: string;
    diskTotal: number;
    diskUsage: number;
    memTotal: number;
    memUsage: number;
    cpuTotal: number;
    cpuUsage: number;
}

interface CommitData {
    [commitId: string]: string;
}

interface ProjectVersion {
    data: {
        [key: string]: CommitData;
    };
}

const IndexPage = () => {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

    const [appVersionOptions, setAppVersionOptions] = useState([]);
    const [selectedProject, setSelectedProject] = useState('waf');
    const [isLoading, setIsLoading] = useState(false);
    const [notification, setNotification] = useState({ show: false, message: '' });
    const [esxiState, setEsxiState] = useState([]);
    const [selectedHost, setSelectedHost] = useState<selectedHost | null>(null);
    const [wareVersion, setWareVersion] = useState('soft');
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
        cloud_platform: '',
        projects: {},
    });
    const [projectVersion, setProjectVersion] = useState<ProjectVersion>({ data: {} });
    const [selectedCommits, setSelectedCommits] = useState<{ [componentName: string]: string }>({});
    const [isPreviewButton, setIsPreviewButton] = useState(false);
    const [cloudPlatform, setCloudPlatform] = useState('none');

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // 假设这是获取数据的 API URL
                const response = await fetch(`${apiBaseUrl}/project_version`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ app_name: saveFormData.app_name, app_version: saveFormData.app_version }),
                });
                const data = await response.json();
                setProjectVersion(data);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData().then((r) => r);
    }, [saveFormData.app_name, saveFormData.app_version, apiBaseUrl]);

    const handleProjectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedProject(event.target.value);
    };

    useEffect(() => {
        const controller = new AbortController();
        const fetchVersions = async () => {
            if (!selectedProject) return;
            try {
                const response = await fetch(`${apiBaseUrl}/get_versions/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ project_name: selectedProject }),
                    signal: controller.signal,
                });
                const data = await response.json();
                setAppVersionOptions(data.versions);
            } catch (error) {
                console.error('Failed to fetch versions:', error);
            }
        };

        fetchVersions().then((r) => r);
        return () => controller.abort();
    }, [selectedProject, apiBaseUrl]);

    useEffect(() => {
        const fetchEsxiState = async () => {
            try {
                const response = await fetch(`${apiBaseUrl}/esxi_state`);
                const data = await response.json();
                // 提取所有的 IP 地址
                setEsxiState(
                    data.data.map((item: any) => ({
                        ip: Object.keys(item)[0],
                        diskTotal: item[Object.keys(item)[0]]['disk_total'],
                        diskUsage: item[Object.keys(item)[0]]['disk_usage'],
                        memTotal: item[Object.keys(item)[0]]['mem_total'],
                        memUsage: item[Object.keys(item)[0]]['mem_usage'],
                        cpuTotal: item[Object.keys(item)[0]]['cpu_total'],
                        cpuUsage: item[Object.keys(item)[0]]['cpu_usage'],
                    }))
                );
            } catch (error) {
                console.error('Error fetching esxi state:', error);
            }
        };
        fetchEsxiState().then((r) => r);
    }, [apiBaseUrl]);

    const proBuild = async () => {
        setIsLoading(true);
        try {
            const dataToSend = {
                app_name: selectedProject,
                app_version: saveFormData.app_version,
                channel: saveFormData.channel,
                ware_version: saveFormData.ware_version,
                cloud_platform: saveFormData.cloud_platform,
                projects: selectedCommits,
            };

            const response = await fetch(`${apiBaseUrl}/probuild/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSend),
            });
            await response.json();

            setNotification({ show: true, message: '生产构建已开始' });
            setTimeout(() => setNotification({ show: false, message: '' }), 3000);
            setCurrentPage(1);
        } catch (error) {
            console.error('Error on form submit:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoading(true);
        try {
            const dataToSend = {
                app_name: selectedProject,
                app_version: saveFormData.app_version,
                channel: saveFormData.channel,
                ware_version: saveFormData.ware_version,
                cloud_platform: saveFormData.cloud_platform,
                cpu: saveFormData.cpu,
                memory: saveFormData.memory,
                disk: saveFormData.disk,
                deploy_host: saveFormData.deploy_host,
                projects: selectedCommits,
            };

            const response = await fetch(`${apiBaseUrl}/build/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSend),
            });
            await response.json();

            setNotification({ show: true, message: '验证构建已开始' });
            setTimeout(() => setNotification({ show: false, message: '' }), 3000);
            setCurrentPage(1);
        } catch (error) {
            console.error('Error on form submit:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleWareVersionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setWareVersion(event.target.value);
        setIsPreviewButton(event.target.value !== 'soft');
        setCloudPlatform(event.target.value === 'cloud' ? 'cloud' : 'none');
    };

    const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedIP = event.target.value;
        const host = esxiState.find(({ ip }) => ip === selectedIP);

        // Only set the host if it is found
        if (host !== undefined) {
            setSelectedHost(host);
        } else {
            setSelectedHost(null);
        }
    };

    const nextPage = () => {
        const form = document.querySelector('.form-container form');
        // 保存第一页的数据
        const newFormData = {
            app_name: selectedProject,
            app_version: (form?.querySelector('#source2') as HTMLSelectElement).value,
            ware_version: (form?.querySelector('#source6') as HTMLSelectElement).value,
            channel: (form?.querySelector('#source7') as HTMLSelectElement).value,
            cloud_platform: (form?.querySelector('#source8') as HTMLSelectElement)?.value ?? '',
            cpu: '',
            memory: '',
            disk: '',
            deploy_host: '',
            projects: {},
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
        if (!isPreviewButton) {
            const form = document.querySelector('.form-container form');
            const newFormData = {
                ...saveFormData,
                cpu: (form?.querySelector('#source3') as HTMLSelectElement).value,
                memory: (form?.querySelector('#source4') as HTMLSelectElement).value,
                disk: (form?.querySelector('#source5') as HTMLSelectElement).value,
                deploy_host: (form?.querySelector('#source6') as HTMLSelectElement).value,
                cloud_platform: (form?.querySelector('#source8') as HTMLSelectElement)?.value ?? '',
            };

            setSaveFormData(newFormData);
            setCurrentPage(3);
        } else {
            nextPage();
            setCurrentPage(3);
        }
    };

    // Handle commit selection changes
    const handleCommitChange = (componentName: string, commitId: string) => {
        setSelectedCommits((prev) => ({
            ...prev,
            [componentName]: commitId,
        }));
    };

    // Initialize selected commits when entering page 3
    useEffect(() => {
        if (currentPage === 3 && Object.keys(projectVersion.data).length > 0) {
            const initialSelectedCommits: { [key: string]: string } = {};
            Object.keys(projectVersion.data).forEach((key) => {
                const commits = projectVersion.data[key];
                const commitKeys = Object.keys(commits);
                if (commitKeys.length > 0) {
                    initialSelectedCommits[key.split('@')[0]] = commitKeys[0]; // Default to first commitId
                }
            });
            setSelectedCommits(initialSelectedCommits);
        }
    }, [currentPage, projectVersion]);

    return (
        <div className="page-container">
            <div className="form-container">
                <div className={`notification ${notification.show ? 'show' : 'hide'}`}>{notification.message}</div>
                <form onSubmit={onSubmit}>
                    {currentPage === 1 && (
                        <>
                            {/* 第一页内容 */}
                            <div className="select-group">
                                <label htmlFor="source1">项目</label>
                                <select
                                    name="app_name"
                                    id="source1"
                                    className="form-select"
                                    onChange={handleProjectChange}
                                    value={selectedProject}
                                >
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
                                    {appVersionOptions.map((version) => (
                                        <option key={version} value={version}>
                                            {version}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="select-group">
                                <label htmlFor="source6">型号</label>
                                <select name="ware_version" id="source6" className="form-select" onChange={handleWareVersionChange}>
                                    <option value="soft" defaultValue="soft">
                                        软件版
                                    </option>
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
                                        <option value="aliyun" defaultValue="aliyun">
                                            阿里云
                                        </option>
                                        <option value="tencent" defaultValue="tencent">
                                            腾讯云
                                        </option>
                                        <option value="huawei" defaultValue="huawei">
                                            华为云
                                        </option>
                                    </select>
                                </div>
                            )}
                            <div className="select-group">
                                <label htmlFor="source7">渠道</label>
                                <select name="channel" id="source7" className="form-select">
                                    <option value="uguardsec" defaultValue="uguardsec">
                                        天磊
                                    </option>
                                    <option value="sunyainfo">上元信安</option>
                                    <option value="ruisuyun">锐速云</option>
                                    <option value="whiteboard">白板</option>
                                </select>
                            </div>
                            {isPreviewButton ? (
                                <button type="button" onClick={project_version}>
                                    预览
                                </button>
                            ) : (
                                <button type="button" onClick={nextPage}>
                                    下一页
                                </button>
                            )}
                        </>
                    )}

                    {currentPage === 2 && (
                        <>
                            {/* 第二页内容 */}
                            <div className="select-group">
                                <label htmlFor="source3">CPU</label>
                                <select name="cpu" id="source3" className="form-select">
                                    <option value="4" defaultValue="4">
                                        4
                                    </option>
                                    <option value="8">8</option>
                                    <option value="16">16</option>
                                    <option value="32">32</option>
                                </select>
                            </div>
                            <div className="select-group">
                                <label htmlFor="source4">内存</label>
                                <select name="memory" id="source4" className="form-select">
                                    <option value="16" defaultValue="16">
                                        16
                                    </option>
                                    <option value="8">8</option>
                                    <option value="32">32</option>
                                </select>
                            </div>
                            <div className="select-group">
                                <label htmlFor="source5">硬盘</label>
                                <select name="disk" id="source5" className="form-select">
                                    <option value="50" defaultValue="50">
                                        50
                                    </option>
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
                                        <select name="deploy_host" id="source6" className="form-select" onChange={handleSelectChange}>
                                            {esxiState.map((host: any, index) => (
                                                <option key={index} value={host.ip}>
                                                    {host.ip}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    {selectedHost && (
                                        <div className="memory-progress">
                                            <label htmlFor="cpuUsage">
                                                CPU ({selectedHost.cpuUsage.toFixed(2)} / {selectedHost.cpuTotal.toFixed(2)} Cores)
                                            </label>
                                            <progress
                                                id="cpuUsage"
                                                max={selectedHost.cpuTotal}
                                                value={selectedHost.cpuUsage}
                                                style={{ width: '100%' }}
                                            ></progress>
                                            <label htmlFor="memoryUsage">
                                                内存 ({selectedHost.memUsage.toFixed(2)} / {selectedHost.memTotal.toFixed(2)} GB)
                                            </label>
                                            <progress
                                                id="memoryUsage"
                                                max={selectedHost.memTotal}
                                                value={selectedHost.memUsage}
                                                style={{ width: '100%' }}
                                            ></progress>
                                            <label htmlFor="diskUsage">
                                                硬盘 ({selectedHost.diskUsage.toFixed(2)} / {selectedHost.diskTotal.toFixed(2)} GB)
                                            </label>
                                            <progress
                                                id="diskUsage"
                                                max={selectedHost.diskTotal}
                                                value={selectedHost.diskUsage}
                                                style={{ width: '100%' }}
                                            ></progress>
                                            <label htmlFor="availableResources">
                                                可用 CPU/内存/硬盘
                                                <br />
                                                {(selectedHost.cpuTotal - selectedHost.cpuUsage).toFixed(2)} Cores /{' '}
                                                {(selectedHost.memTotal - selectedHost.memUsage).toFixed(2)} GB /{' '}
                                                {(selectedHost.diskTotal - selectedHost.diskUsage).toFixed(2)} GB
                                            </label>
                                        </div>
                                    )}
                                </div>
                            )}
                            <button type="button" onClick={previousPage}>
                                上一页
                            </button>
                            <button type="button" onClick={project_version}>
                                预览
                            </button>
                        </>
                    )}
                    {currentPage === 3 && (
                        <>
                            {/* 第三页内容 */}
                            <div className="contain-content">
                                <h4>
                                    {saveFormData.app_name} {saveFormData.app_version}版本信息
                                </h4>
                                <table className="version-table">
                                    <thead>
                                    <tr>
                                        <th>组件名称</th>
                                        <th>版本号</th>
                                        <th>提交记录</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {Object.keys(projectVersion.data).length > 0 &&
                                        Object.keys(projectVersion.data).map((key) => {
                                            const commits = projectVersion.data[key];
                                            const commitKeys = Object.keys(commits);
                                            const componentName = key.split('@')[0];

                                            return (
                                                <tr key={key}>
                                                    <td>{componentName}</td>
                                                    <td>{key.split('@')[1]}</td>
                                                    <td>
                                                        <select
                                                            onChange={(e) => handleCommitChange(componentName, e.target.value)}
                                                            value={selectedCommits[componentName] || ''}
                                                        >
                                                            {commitKeys.length > 0 ? (
                                                                commitKeys.map((commitId) => (
                                                                    <option key={commitId} value={commitId}>
                                                                        {commits[commitId]}
                                                                    </option>
                                                                ))
                                                            ) : (
                                                                <option disabled>未找到提交记录</option>
                                                            )}
                                                        </select>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div className="button-group">
                                <button type="button" onClick={previousPage} className="cancel-button">
                                    取消
                                </button>
                                <button type="submit" disabled={isLoading} className="submit-button">
                                    {isLoading ? 'Loading...' : '验证构建'}
                                </button>
                                <button type="button" onClick={proBuild} className="build-button">
                                    生产构建
                                </button>
                            </div>
                        </>
                    )}
                </form>
                <div className="version">version: replacever</div>
            </div>
        </div>
    );
};

export default IndexPage;
