'use client';
import React, {useState, useEffect, useRef} from 'react';
import {
    Box,
    Card,
    CardHeader,
    CardContent,
    Button,
    CircularProgress,
    Alert,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    LinearProgress,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Typography,
} from '@mui/material';
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
    // Default to an empty string if the environment variable is undefined
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';

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
        <Box sx={{ mt: 4 }}>
            <Card variant="outlined">
                <CardHeader title="生产构建" />
                <CardContent>
                    {notification.show && (
                        <Alert severity="info" onClose={() => setNotification({ show: false, message: '' })}>
                            {notification.message}
                        </Alert>
                    )}
                    {currentStep === 1 && (
                        <>
                            <FormControl fullWidth margin="normal">
                                <InputLabel id="app-name-label">项目选择</InputLabel>
                                <Select
                                    labelId="app-name-label"
                                    value={formData.app_name}
                                    label="项目选择"
                                    onChange={(e) =>
                                        setFormData({ ...formData, app_name: e.target.value as string, app_version: '' })
                                    }
                                >
                                    <MenuItem value="waf">WAF</MenuItem>
                                    <MenuItem value="omas">堡垒机</MenuItem>
                                    <MenuItem value="lams">日审</MenuItem>
                                    <MenuItem value="dsas">数审</MenuItem>
                                    <MenuItem value="cosa">二合一</MenuItem>
                                </Select>
                            </FormControl>
                            <FormControl fullWidth margin="normal">
                                <InputLabel id="app-version-label">版本号</InputLabel>
                                <Select
                                    labelId="app-version-label"
                                    value={formData.app_version}
                                    label="版本号"
                                    onChange={(e) => setFormData({ ...formData, app_version: e.target.value as string })}
                                >
                                    <MenuItem value="">
                                        <em>请选择版本</em>
                                    </MenuItem>
                                    {appVersionOptions.map((version) => (
                                        <MenuItem key={version} value={version}>
                                            {version}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl fullWidth margin="normal">
                                <InputLabel id="ware-version-label">型号</InputLabel>
                                <Select
                                    labelId="ware-version-label"
                                    value={formData.ware_version}
                                    label="型号"
                                    onChange={(e) => setFormData({ ...formData, ware_version: e.target.value as string })}
                                >
                                    <MenuItem value="soft">软件版</MenuItem>
                                    <MenuItem value="hard">硬件版</MenuItem>
                                    <MenuItem value="cloud">云版</MenuItem>
                                    <MenuItem value="soft_cloud">全都要</MenuItem>
                                </Select>
                            </FormControl>
                            {formData.ware_version === 'cloud' && (
                                <FormControl fullWidth margin="normal">
                                    <InputLabel id="platform-label">平台</InputLabel>
                                    <Select
                                        labelId="platform-label"
                                        value={formData.cloud_platform}
                                        label="平台"
                                        onChange={(e) => setFormData({ ...formData, cloud_platform: e.target.value as string })}
                                    >
                                        <MenuItem value="aliyun">阿里云</MenuItem>
                                        <MenuItem value="tencent">腾讯云</MenuItem>
                                        <MenuItem value="huawei">华为云</MenuItem>
                                    </Select>
                                </FormControl>
                            )}
                            <FormControl fullWidth margin="normal">
                                <InputLabel id="channel-label">渠道</InputLabel>
                                <Select
                                    labelId="channel-label"
                                    value={formData.channel}
                                    label="渠道"
                                    onChange={(e) => setFormData({ ...formData, channel: e.target.value as string })}
                                >
                                    <MenuItem value="uguardsec">天磊</MenuItem>
                                    <MenuItem value="sunyainfo">上元信安</MenuItem>
                                    <MenuItem value="ruisuyun">锐速云</MenuItem>
                                    <MenuItem value="whiteboard">白板</MenuItem>
                                </Select>
                            </FormControl>
                        </>
                    )}
                    {currentStep === 2 && (
                        <>
                            <FormControl fullWidth margin="normal">
                                <InputLabel id="cpu-label">CPU 选择</InputLabel>
                                <Select
                                    labelId="cpu-label"
                                    value={formData.cpu}
                                    label="CPU 选择"
                                    onChange={(e) => setFormData({ ...formData, cpu: e.target.value as string })}
                                >
                                    <MenuItem value="4">4 核</MenuItem>
                                    <MenuItem value="8">8 核</MenuItem>
                                    <MenuItem value="16">16 核</MenuItem>
                                    <MenuItem value="32">32 核</MenuItem>
                                </Select>
                            </FormControl>
                            <FormControl fullWidth margin="normal">
                                <InputLabel id="memory-label">内存</InputLabel>
                                <Select
                                    labelId="memory-label"
                                    value={formData.memory}
                                    label="内存"
                                    onChange={(e) => setFormData({ ...formData, memory: e.target.value as string })}
                                >
                                    <MenuItem value="8">8 GB</MenuItem>
                                    <MenuItem value="16">16 GB</MenuItem>
                                    <MenuItem value="32">32 GB</MenuItem>
                                </Select>
                            </FormControl>
                            <FormControl fullWidth margin="normal">
                                <InputLabel id="disk-label">硬盘</InputLabel>
                                <Select
                                    labelId="disk-label"
                                    value={formData.disk}
                                    label="硬盘"
                                    onChange={(e) => setFormData({ ...formData, disk: e.target.value as string })}
                                >
                                    <MenuItem value="50">50 GB</MenuItem>
                                    <MenuItem value="100">100 GB</MenuItem>
                                    <MenuItem value="150">150 GB</MenuItem>
                                    <MenuItem value="250">250 GB</MenuItem>
                                    <MenuItem value="500">500 GB</MenuItem>
                                </Select>
                            </FormControl>
                            {(formData.ware_version === 'soft' || formData.ware_version === 'soft_cloud') && (
                                <FormControl fullWidth margin="normal">
                                    <InputLabel id="host-label">宿主机</InputLabel>
                                    <Select
                                        labelId="host-label"
                                        value={formData.deploy_host}
                                        label="宿主机"
                                        onChange={(e) => {
                                            const selected = esxiState.find((host) => host.ip === e.target.value);
                                            setSelectedHost(selected || null);
                                            setFormData({ ...formData, deploy_host: e.target.value as string });
                                        }}
                                    >
                                        <MenuItem value="">
                                            <em>请选择宿主机</em>
                                        </MenuItem>
                                        {esxiState.map((host, index) => (
                                            <MenuItem key={index} value={host.ip}>
                                                {host.ip}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            )}
                            {selectedHost && (
                                <Box sx={{ my: 2 }}>
                                    <Typography variant="body2" gutterBottom>
                                        CPU: {(selectedHost.cpuUsage / selectedHost.cpuTotal * 100).toFixed(2)}%
                                    </Typography>
                                    <LinearProgress
                                        variant="determinate"
                                        value={(selectedHost.cpuUsage / selectedHost.cpuTotal) * 100}
                                        sx={{ mb: 1 }}
                                    />
                                    <Typography variant="body2" gutterBottom>
                                        内存: {(selectedHost.memUsage / selectedHost.memTotal * 100).toFixed(2)}%
                                    </Typography>
                                    <LinearProgress
                                        variant="determinate"
                                        value={(selectedHost.memUsage / selectedHost.memTotal) * 100}
                                        sx={{ mb: 1 }}
                                    />
                                    <Typography variant="body2" gutterBottom>
                                        硬盘: {(selectedHost.diskUsage / selectedHost.diskTotal * 100).toFixed(2)}%
                                    </Typography>
                                    <LinearProgress
                                        variant="determinate"
                                        value={(selectedHost.diskUsage / selectedHost.diskTotal) * 100}
                                    />
                                </Box>
                            )}
                        </>
                    )}
                    {currentStep === 3 && (
                        <div>
                            <h5>{formData.app_name} {formData.app_version} 版本信息</h5>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>组件名称</TableCell>
                                        <TableCell>版本号</TableCell>
                                        <TableCell>提交记录</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {Object.keys(projectVersion.data).length > 0 && Object.keys(projectVersion.data).map((key) => (
                                        <TableRow key={key}>
                                            <TableCell>{key.split('@')[0]}</TableCell>
                                            <TableCell>{key.split('@')[1]}</TableCell>
                                            <TableCell>
                                                <FormControl fullWidth size="small">
                                                    <Select
                                                        data-component-select={key}
                                                        value={formData.projects[key] || ''}
                                                        onChange={(e) => setFormData({ ...formData, projects: { ...formData.projects, [key]: e.target.value as string } })}
                                                    >
                                                        <MenuItem value="">
                                                            <em>请选择提交记录</em>
                                                        </MenuItem>
                                                        {Object.keys(projectVersion.data[key]).map((commitId) => (
                                                            <MenuItem key={commitId} value={commitId}>
                                                                {projectVersion.data[key][commitId]}
                                                            </MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
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
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                        <Button
                            variant="outlined"
                            onClick={handlePreviousStep}
                            disabled={currentStep === 1}
                        >
                            上一步
                        </Button>
                        {currentStep < 3 ? (
                            <Button variant="contained" onClick={handleNextStep}>
                                下一步
                            </Button>
                        ) : (
                            <>
                                <Button
                                    variant="contained"
                                    color="success"
                                    onClick={handleFormSubmit}
                                    disabled={isLoading}
                                >
                                    {isLoading ? <CircularProgress size={24} /> : '验证构建'}
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
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
};

export default BuildPage;
