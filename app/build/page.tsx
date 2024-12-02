'use client';
import React, {useState, useEffect, useRef} from 'react';
import { Card, Form, Button, Spinner, ProgressBar, Alert, Table } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import styles from '@/app/vm/vm.module.css';

interface EsxiItem {
    disk_total: number;
    disk_usage: number;
    mem_total: number;
    mem_usage: number;
    cpu_total: number;
    cpu_usage: number;
}

interface EsxiState {
    ip: string;
    diskTotal: number;
    diskUsage: number;
    memTotal: number;
    memUsage: number;
    cpuTotal: number;
    cpuUsage: number;
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

interface CommitData {
    [commitId: string]: string;
}

interface ProjectVersion {
    data: {
        [key: string]: CommitData;
    };
}

interface ProjectsData {
    [key: string]: string;
}

const BuildPage: React.FC = () => {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

    const [currentStep, setCurrentStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [notification, setNotification] = useState({ show: false, message: '' });
    const [appVersionOptions, setAppVersionOptions] = useState<string[]>([]);
    const [esxiState, setEsxiState] = useState<EsxiState[]>([]);
    const [selectedHost, setSelectedHost] = useState<selectedHost | null>(null);
    const [projectVersion, setProjectVersion] = useState<ProjectVersion>({ data: {} });
    const [isNew, setIsNew] = useState(false);
    const [formData, setFormData] = useState({
        app_name: 'waf',
        app_version: '',
        channel: 'uguardsec',
        ware_version: 'soft',
        cpu: '4',
        memory: '8',
        disk: '50',
        deploy_host: 'localhost',
        cloud_platform: 'none',
        projects: {} as ProjectsData,
        is_new: false,
    });

    const esxiStateDidFetch = useRef(false);
    useEffect(() => {
        const fetchVersions = async () => {
            try {
                const response = await fetch(`${apiBaseUrl}/get_versions/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ project_name: formData.app_name }),
                });
                const data = await response.json();
                setAppVersionOptions(data.versions || []);
            } catch (error) {
                console.error('Failed to fetch versions:', error);
            }
        };
        fetchVersions().then(() =>  console.log('Versions fetched successfully'));
    }, [formData.app_name, apiBaseUrl]);

    useEffect(() => {
        const fetchEsxiState = async () => {
            try {
                if (esxiStateDidFetch.current) return; // 如果已经请求过数据，直接返回

                esxiStateDidFetch.current = true; // 设置为 true，防止后续重复请求
                const response = await fetch(`${apiBaseUrl}/esxi_state`);
                const data = await response.json();
                setEsxiState(
                    data.data.map((item: Record<string, EsxiItem>) => ({
                        ip: Object.keys(item)[0],
                        diskTotal: item[Object.keys(item)[0]].disk_total,
                        diskUsage: item[Object.keys(item)[0]].disk_usage,
                        memTotal: item[Object.keys(item)[0]].mem_total,
                        memUsage: item[Object.keys(item)[0]].mem_usage,
                        cpuTotal: item[Object.keys(item)[0]].cpu_total,
                        cpuUsage: item[Object.keys(item)[0]].cpu_usage,
                    }))
                );
            } catch (error) {
                console.error('Error fetching ESXi state:', error);
            }
        };
        fetchEsxiState().then(() => console.log('ESXi state fetched successfully'));
    }, [apiBaseUrl]);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`${apiBaseUrl}/project_version`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ app_name: formData.app_name, app_version: formData.app_version })
                });
                const data = await response.json();

                // 保持原有选择的提交记录
                setProjectVersion(data);
                setFormData((prevFormData) => ({
                    ...prevFormData,
                    projects: Object.keys(data.data).reduce((acc, key) => {
                        acc[key] = prevFormData.projects[key] || Object.keys(data.data[key])[0];  // 如果原来有选择，则保持选择，否则默认选择第一个提交记录
                        return acc;
                    }, {} as ProjectsData)
                }));
            } finally {
                setIsLoading(false);
            }
        }

        if (formData.app_name && formData.app_version) {
            fetchData().catch(console.error);
        }
    }, [formData.app_name, formData.app_version, apiBaseUrl]);

    const handleNextStep = () => {
        if (currentStep < 3) setCurrentStep(currentStep + 1);
    };

    const handlePreviousStep = () => {
        if (currentStep > 1) setCurrentStep(currentStep - 1);
    };

    const handleFormSubmit = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${apiBaseUrl}/build/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            await response.json();
            setNotification({ show: true, message: '验证构建已开始' });
        } catch (error) {
            console.error('Error on form submit:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleProductionBuild = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${apiBaseUrl}/probuild/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            await response.json();
            setNotification({ show: true, message: '生产构建已开始' });
        } catch (error) {
            console.error('Error on production build:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUseNewBuild = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, is_new: e.target.checked });
        setIsNew(e.target.checked);
    };

    return (
        <div className="container mt-4">
            <Card className="shadow-sm">
                <Card.Header>
                    <h5>生产构建</h5>
                </Card.Header>
                <Card.Body>
                    {notification.show && (
                        <Alert variant="info" onClose={() => setNotification({ show: false, message: '' })} dismissible>
                            {notification.message}
                        </Alert>
                    )}
                    {currentStep === 1 && (
                        <Form>
                            <Form.Group className="mb-3">
                                <Form.Label>项目选择</Form.Label>
                                <Form.Control
                                    as="select"
                                    value={formData.app_name}
                                    onChange={(e) =>
                                        setFormData({ ...formData, app_name: e.target.value, app_version: '' })
                                    }
                                >
                                    <option value="waf">WAF</option>
                                    <option value="omas">堡垒机</option>
                                    <option value="lams">日审</option>
                                    <option value="dsas">数审</option>
                                    <option value="cosa">二合一</option>
                                </Form.Control>
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>版本号</Form.Label>
                                <Form.Control
                                    as="select"
                                    value={formData.app_version}
                                    onChange={(e) => setFormData({ ...formData, app_version: e.target.value })}
                                >
                                    <option value="">请选择版本</option>
                                    {appVersionOptions.map((version) => (
                                        <option key={version} value={version}>
                                            {version}
                                        </option>
                                    ))}
                                </Form.Control>
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>型号</Form.Label>
                                <Form.Control
                                    as="select"
                                    value={formData.ware_version}
                                    onChange={(e) => setFormData({ ...formData, ware_version: e.target.value })}
                                >
                                    <option value="soft">软件版</option>
                                    <option value="hard">硬件版</option>
                                    <option value="cloud">云版</option>
                                    <option value="soft_cloud">全都要</option>
                                </Form.Control>
                            </Form.Group>
                            {formData.ware_version === 'cloud' && (
                                <Form.Group className="mb-3">
                                    <Form.Label>平台</Form.Label>
                                    <Form.Control
                                        as="select"
                                        value={formData.cloud_platform}
                                        onChange={(e) => setFormData({ ...formData, cloud_platform: e.target.value })}
                                    >
                                        <option value="aliyun">阿里云</option>
                                        <option value="tencent">腾讯云</option>
                                        <option value="huawei">华为云</option>
                                    </Form.Control>
                                </Form.Group>
                            )}
                            <Form.Group className="mb-3">
                                <Form.Label>渠道</Form.Label>
                                <Form.Control
                                    as="select"
                                    value={formData.channel}
                                    onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                                >
                                    <option value="uguardsec">天磊</option>
                                    <option value="sunyainfo">上元信安</option>
                                    <option value="ruisuyun">锐速云</option>
                                    <option value="whiteboard">白板</option>
                                </Form.Control>
                            </Form.Group>
                        </Form>
                    )}
                    {currentStep === 2 && (
                        <Form>
                            <Form.Group className="mb-3">
                                <Form.Label>CPU 选择</Form.Label>
                                <Form.Control
                                    as="select"
                                    value={formData.cpu}
                                    onChange={(e) => setFormData({ ...formData, cpu: e.target.value })}
                                >
                                    <option value="4">4 核</option>
                                    <option value="8">8 核</option>
                                    <option value="16">16 核</option>
                                    <option value="32">32 核</option>
                                </Form.Control>
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>内存</Form.Label>
                                <Form.Control
                                    as="select"
                                    value={formData.memory}
                                    onChange={(e) => setFormData({ ...formData, memory: e.target.value })}
                                >
                                    <option value="8">8 GB</option>
                                    <option value="16">16 GB</option>
                                    <option value="32">32 GB</option>
                                </Form.Control>
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>硬盘</Form.Label>
                                <Form.Control
                                    as="select"
                                    value={formData.disk}
                                    onChange={(e) => setFormData({ ...formData, disk: e.target.value })}
                                >
                                    <option value="50">50 GB</option>
                                    <option value="100">100 GB</option>
                                    <option value="150">150 GB</option>
                                    <option value="250">250 GB</option>
                                    <option value="500">500 GB</option>
                                </Form.Control>
                            </Form.Group>
                            {(formData.ware_version === 'soft' || formData.ware_version === 'soft_cloud') && (
                                <Form.Group className="mb-3">
                                    <Form.Label>宿主机</Form.Label>
                                    <Form.Control
                                        as="select"
                                        value={formData.deploy_host}
                                        onChange={(e) => {
                                            const selected = esxiState.find((host) => host.ip === e.target.value);
                                            setSelectedHost(selected || null);
                                            setFormData({ ...formData, deploy_host: e.target.value });
                                        }}
                                    >
                                        <option value="">请选择宿主机</option>
                                        {esxiState.map((host, index) => (
                                            <option key={index} value={host.ip}>
                                                {host.ip}
                                            </option>
                                        ))}
                                    </Form.Control>
                                </Form.Group>
                            )}
                            {selectedHost && (
                                <div>
                                    <ProgressBar
                                        now={(selectedHost.cpuUsage / selectedHost.cpuTotal) * 100}
                                        label={`CPU: ${(selectedHost.cpuUsage / selectedHost.cpuTotal * 100).toFixed(2)}%`}
                                        className="mb-2"
                                    />
                                    <ProgressBar
                                        now={(selectedHost.memUsage / selectedHost.memTotal) * 100}
                                        label={`内存: ${(selectedHost.memUsage / selectedHost.memTotal * 100).toFixed(2)}%`}
                                        className="mb-2"
                                    />
                                    <ProgressBar
                                        now={(selectedHost.diskUsage / selectedHost.diskTotal) * 100}
                                        label={`硬盘: ${(selectedHost.diskUsage / selectedHost.diskTotal * 100).toFixed(2)}%`}
                                        className="mb-2"
                                    />
                                </div>
                            )}
                        </Form>
                    )}
                    {currentStep === 3 && (
                        <div>
                            <h5>{formData.app_name} {formData.app_version} 版本信息</h5>
                            <Table striped bordered hover>
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
                                            <Form.Control
                                                as="select"
                                                data-component-select={key}
                                                value={formData.projects[key] || ''}
                                                onChange={(e) => setFormData({ ...formData, projects: { ...formData.projects, [key]: e.target.value } })}
                                            >
                                                <option value="">请选择提交记录</option>
                                                {Object.keys(projectVersion.data[key]).map((commitId) => (
                                                    <option key={commitId} value={commitId}>
                                                        {projectVersion.data[key][commitId]}
                                                    </option>
                                                ))}
                                            </Form.Control>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </Table>
                            <div>
                                <label className={styles.vmToggle} >全新构建：
                                    <input
                                        type="checkbox"
                                        checked={isNew}
                                        onChange={handleUseNewBuild}
                                    />
                                    <span></span>
                                </label>
                            </div>
                        </div>
                    )}
                    <div className="d-flex justify-content-between mt-3">
                        <Button
                            variant="secondary"
                            onClick={handlePreviousStep}
                            disabled={currentStep === 1}
                        >
                            上一步
                        </Button>
                        {currentStep < 3 ? (
                            <Button variant="primary" onClick={handleNextStep}>
                                下一步
                            </Button>
                        ) : (
                            <>
                                <Button
                                    variant="success"
                                    onClick={handleFormSubmit}
                                    disabled={isLoading}
                                >
                                    {isLoading ? <Spinner animation="border" size="sm" /> : '验证构建'}
                                </Button>
                                {/*<Button*/}
                                {/*    variant="danger"*/}
                                {/*    onClick={handleProductionBuild}*/}
                                {/*    disabled={isLoading}*/}
                                {/*>*/}
                                {/*    {isLoading ? <Spinner animation="border" size="sm" /> : '生产构建'}*/}
                                {/*</Button>*/}
                            </>
                        )}
                    </div>
                </Card.Body>
            </Card>
        </div>
    );
};

export default BuildPage;
