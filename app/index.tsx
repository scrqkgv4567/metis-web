import React, { useEffect, useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { CSSTransition, TransitionGroup } from 'react-transition-group';

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

    const [appVersionOptions, setAppVersionOptions] = useState<string[]>([]);
    const [selectedProject, setSelectedProject] = useState('waf');
    const [isLoading, setIsLoading] = useState(false);
    const [notification, setNotification] = useState({ show: false, message: "" });
    const [esxiState, setEsxiState] = useState<selectedHost[]>([]);
    const [selectedHost, setSelectedHost] = useState<selectedHost | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [saveFormData, setSaveFormData] = useState({
        app_name: 'waf',
        app_version: '',
        channel: '',
        ware_version: 'soft',
        cpu: '',
        memory: '',
        disk: '',
        deploy_host: '',
        cloud_platform: ''
    });
    const [projectVersion, setProjectVersion] = useState<ProjectVersion>({ data: {} });

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`${apiBaseUrl}/project_version`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ app_name: saveFormData.app_name, app_version: saveFormData.app_version })
                });
                const data = await response.json();
                setProjectVersion(data);
            } finally {
                setIsLoading(false);
            }
        }

        if (saveFormData.app_name && saveFormData.app_version) {
            fetchData().catch(console.error);
        }
    }, [saveFormData.app_name, saveFormData.app_version, apiBaseUrl]);

    const handleProjectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedProject(event.target.value);
        setSaveFormData({
            ...saveFormData,
            app_name: event.target.value,
            app_version: '', // Reset app_version when project changes
        });
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
                    signal: controller.signal
                });
                const data = await response.json();
                setAppVersionOptions(data.versions);
            } catch (error) {
                console.error('Failed to fetch versions:', error);
            }
        };

        fetchVersions().catch(console.error);
        return () => controller.abort();
    }, [selectedProject, apiBaseUrl]);

    useEffect(() => {
        const fetchEsxiState = async () => {
            try {
                const response = await fetch(`${apiBaseUrl}/esxi_state`);
                const data = await response.json();
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
        fetchEsxiState().catch(console.error);
    }, [apiBaseUrl]);

    const proBuild = async () => {
        setIsLoading(true);
        try {
            const formData = new FormData();
            Object.keys(saveFormData).forEach(key => {
                formData.append(key, (saveFormData as any)[key]);
            });

            const response = await fetch(`${apiBaseUrl}/probuild/`, {
                method: 'POST',
                body: formData,
            });
            await response.json();

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
            const formData = new FormData();
            Object.keys(saveFormData).forEach(key => {
                formData.append(key, (saveFormData as any)[key]);
            });

            const response = await fetch(`${apiBaseUrl}/build/`, {
                method: 'POST',
                body: formData,
            });
            await response.json();

            setNotification({ show: true, message: '验证构建已开始' });
            setTimeout(() => setNotification({ show: false, message: "" }), 3000);
            setCurrentPage(1);
        } catch (error) {
            console.error('Error on form submit:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const nextPage = () => {
        setCurrentPage(2);
    };

    const previousPage = () => {
        setCurrentPage(currentPage - 1);
    };

    const [isPreviewButton, setIsPreviewButton] = useState(false);

    const project_version = () => {
        setCurrentPage(3);
    };

    return (
        <div className="page-container">
            <div className="form-container">
                <TransitionGroup>
                    <CSSTransition
                        key={currentPage}
                        timeout={500}
                        classNames="fade"
                    >
                        <div>
                            <form onSubmit={onSubmit} className="needs-validation" noValidate>
                                {currentPage === 1 && (
                                    <>
                                        <div className="mb-3">
                                            <label htmlFor="source1" className="form-label">项目</label>
                                            <select
                                                name="app_name"
                                                id="source1"
                                                className="form-select"
                                                onChange={handleProjectChange}
                                                value={saveFormData.app_name}
                                            >
                                                <option value="waf">waf</option>
                                                <option value="omas">堡垒机</option>
                                                <option value="lams">日审</option>
                                                <option value="dsas">数审</option>
                                                <option value="cosa">二合一</option>
                                            </select>
                                        </div>
                                        <div className="mb-3">
                                            <label htmlFor="source2" className="form-label">版本</label>
                                            <select
                                                name="app_version"
                                                id="source2"
                                                className="form-select"
                                                value={saveFormData.app_version}
                                                onChange={(e) => setSaveFormData({
                                                    ...saveFormData,
                                                    app_version: e.target.value
                                                })}
                                            >
                                                <option value="">请选择</option>
                                                {appVersionOptions.map(version => (
                                                    <option key={version} value={version}>{version}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="mb-3">
                                            <label htmlFor="source6" className="form-label">型号</label>
                                            <select
                                                name="ware_version"
                                                id="source6"
                                                className="form-select"
                                                value={saveFormData.ware_version}
                                                onChange={(e) => setSaveFormData({ ...saveFormData, ware_version: e.target.value })}
                                            >
                                                <option value="soft">软件版</option>
                                                <option value="hard">硬件版</option>
                                                <option value="cloud">云版</option>
                                                <option value="soft_cloud">全都要</option>
                                            </select>
                                        </div>

                                        {saveFormData.ware_version === 'cloud' && (
                                            <div className="mb-3">
                                                <label htmlFor="source8" className="form-label">平台</label>
                                                <select
                                                    name="cloud_platform"
                                                    id="source8"
                                                    className="form-select"
                                                    value={saveFormData.cloud_platform}
                                                    onChange={(e) => setSaveFormData({ ...saveFormData, cloud_platform: e.target.value })}
                                                >
                                                    <option value="aliyun">阿里云</option>
                                                    <option value="tencent">腾讯云</option>
                                                    <option value="huawei">华为云</option>
                                                </select>
                                            </div>
                                        )}
                                        <div className="mb-3">
                                            <label htmlFor="source7" className="form-label">渠道</label>
                                            <select
                                                name="channel"
                                                id="source7"
                                                className="form-select"
                                                value={saveFormData.channel}
                                                onChange={(e) => setSaveFormData({ ...saveFormData, channel: e.target.value })}
                                            >
                                                <option value="uguardsec">天磊</option>
                                                <option value="sunyainfo">上元信安</option>
                                                <option value="ruisuyun">锐速云</option>
                                                <option value="whiteboard">白板</option>
                                            </select>
                                        </div>
                                        {isPreviewButton ? (
                                            <button type="button" onClick={project_version} className="btn btn-primary">预览</button>
                                        ) : (
                                            <button type="button" onClick={nextPage} className="btn btn-primary">下一页</button>
                                        )}
                                    </>
                                )}

                                {currentPage === 2 && (
                                    <>
                                        <div className="mb-3">
                                            <label htmlFor="source3" className="form-label">CPU</label>
                                            <select
                                                name="cpu"
                                                id="source3"
                                                className="form-select"
                                                value={saveFormData.cpu}
                                                onChange={(e) => setSaveFormData({ ...saveFormData, cpu: e.target.value })}
                                            >
                                                <option value="4">4</option>
                                                <option value="8">8</option>
                                                <option value="16">16</option>
                                                <option value="32">32</option>
                                            </select>
                                        </div>
                                        <div className="mb-3">
                                            <label htmlFor="source4" className="form-label">内存</label>
                                            <select
                                                name="memory"
                                                id="source4"
                                                className="form-select"
                                                value={saveFormData.memory}
                                                onChange={(e) => setSaveFormData({ ...saveFormData, memory: e.target.value })}
                                            >
                                                <option value="8">8</option>
                                                <option value="16">16</option>
                                                <option value="32">32</option>
                                            </select>
                                        </div>
                                        <div className="mb-3">
                                            <label htmlFor="source5" className="form-label">硬盘</label>
                                            <select
                                                name="disk"
                                                id="source5"
                                                className="form-select"
                                                value={saveFormData.disk}
                                                onChange={(e) => setSaveFormData({ ...saveFormData, disk: e.target.value })}
                                            >
                                                <option value="50">50</option>
                                                <option value="100">100</option>
                                                <option value="150">150</option>
                                                <option value="250">250</option>
                                                <option value="500">500</option>
                                            </select>
                                        </div>
                                        {(saveFormData.ware_version === 'soft' || saveFormData.ware_version === 'soft_cloud') && (
                                            <div className="mb-3">
                                                <label htmlFor="source6" className="form-label">宿主机</label>
                                                <select
                                                    name="deploy_host"
                                                    id="source6"
                                                    className="form-select"
                                                    value={saveFormData.deploy_host}
                                                    onChange={(e) => {
                                                        const selectedIP = e.target.value;
                                                        const host = esxiState.find(({ ip }) => ip === selectedIP);
                                                        setSelectedHost(host || null);
                                                        setSaveFormData({ ...saveFormData, deploy_host: e.target.value });
                                                    }}
                                                >
                                                    <option value="">请选择</option>
                                                    {esxiState.map((host: any, index) => (
                                                        <option key={index} value={host.ip}>{host.ip}</option>
                                                    ))}
                                                </select>
                                                {selectedHost && (
                                                    <div className="memory-progress">
                                                        <label htmlFor="cpuUsage" className="form-label">CPU
                                                            ({selectedHost.cpuUsage.toFixed(2)} / {selectedHost.cpuTotal.toFixed(2)} Cores)</label>
                                                        <progress id="cpuUsage" max={selectedHost.cpuTotal} value={selectedHost.cpuUsage} className="w-100"></progress>
                                                        <label htmlFor="memoryUsage" className="form-label">内存
                                                            ({selectedHost.memUsage.toFixed(2)} / {selectedHost.memTotal.toFixed(2)} GB)</label>
                                                        <progress id="memoryUsage" max={selectedHost.memTotal} value={selectedHost.memUsage} className="w-100"></progress>
                                                        <label htmlFor="diskUsage" className="form-label">硬盘
                                                            ({selectedHost.diskUsage.toFixed(2)} / {selectedHost.diskTotal.toFixed(2)} GB)</label>
                                                        <progress id="diskUsage" max={selectedHost.diskTotal} value={selectedHost.diskUsage} className="w-100"></progress>
                                                        <label htmlFor="availableResources" className="form-label">可用 CPU/内存/硬盘<br />
                                                            {(selectedHost.cpuTotal - selectedHost.cpuUsage).toFixed(2)} Cores /
                                                            {(selectedHost.memTotal - selectedHost.memUsage).toFixed(2)} GB /
                                                            {(selectedHost.diskTotal - selectedHost.diskUsage).toFixed(2)} GB</label>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <div className="d-flex justify-content-between">
                                            <button type="button" onClick={previousPage} className="btn btn-secondary">上一页</button>
                                            <button type="button" onClick={project_version} className="btn btn-primary">预览</button>
                                        </div>
                                    </>
                                )}

                                {currentPage === 3 && (
                                    <>
                                        <div className='contain-content mb-4'>
                                            <h4>{saveFormData.app_name} {saveFormData.app_version} 版本信息</h4>
                                            <table className="table table-striped">
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
                                                                <select className="form-select">
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
                                        <div className="d-flex justify-content-between">
                                            <button type="button" onClick={previousPage} className="btn btn-secondary">上一页</button>
                                            <button type="submit" disabled={isLoading} className="btn btn-success">
                                                {isLoading ? 'Loading...' : '验证构建'}
                                            </button>
                                            <button type="button" onClick={proBuild} className="btn btn-danger">生产构建</button>
                                        </div>
                                    </>
                                )}
                            </form>
                        </div>
                    </CSSTransition>
                </TransitionGroup>
                <div className="mt-4 text-muted">version: replacever</div>
            </div>
        </div>
    );
};

export default IndexPage;