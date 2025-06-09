'use client';
import React, { useEffect, useState, useMemo, useRef, Suspense } from 'react';
import Link from 'next/link';
import { FiLock, FiUnlock } from 'react-icons/fi';
import {
    Container,
    Card,
    Button,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Badge,
    CircularProgress,
    Box,
} from '@mui/material';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './history.css';

export function formatTime(ms: number): string {
    if (ms <= 0) {
        return '00:00:00';
    }
    let seconds = Math.floor(ms / 1000);
    let minutes = Math.floor(seconds / 60);
    let hours = Math.floor(minutes / 60);

    seconds = seconds % 60;
    minutes = minutes % 60;

    const hoursStr = hours.toString().padStart(2, '0');
    const minutesStr = minutes.toString().padStart(2, '0');
    const secondsStr = seconds.toString().padStart(2, '0');

    return `${hoursStr}:${minutesStr}:${secondsStr}`;
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

const HistoryPageContent: React.FC = () => {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';

    // 筛选相关
    const [filterVersionOptions, setFilterVersionOptions] = useState<string[]>([]);
    const [selectedHistoryProject, setSelectedHistoryProject] = useState<string>('');
    const [filterVersion, setFilterVersion] = useState<string>('');

    // 历史数据、锁定状态、倒计时等
    const [allHistoryData, setAllHistoryData] = useState<HistoryItem[]>([]);
    const [lockStatus, setLockStatus] = useState<Map<string, number>>(new Map());
    const [countdowns, setCountdowns] = useState<Map<string, number>>(new Map());

    // 分页 & 加载控制
    const [currentPage, setCurrentPage] = useState<number>(1);     // 当前加载的页码
    const [hasMore, setHasMore] = useState<boolean>(true);         // 是否还有更多数据
    const [isLoading, setIsLoading] = useState<boolean>(false);    // 是否在加载中
    const [loadingState, setLoadingState] = useState<Map<string, boolean>>(new Map());

    // 监听项目下拉选项变化时，重新获取对应可选版本
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
                }
            }
        };

        fetchFilterVersion();
        return () => controller.abort();
    }, [selectedHistoryProject, apiBaseUrl]);

    // 当项目或版本筛选变化时，重置历史数据与分页，从头加载
    useEffect(() => {
        setAllHistoryData([]);
        setCurrentPage(1);
        setHasMore(true);
    }, [selectedHistoryProject, filterVersion]);

    // 根据 currentPage 的变化，向后端请求相应的历史数据并追加
    useEffect(() => {
        const fetchHistory = async () => {
            setIsLoading(true);
            try {
                // 使用新接口 /history?page=xxx
                const response = await fetch(`${apiBaseUrl}/history?page=${currentPage}&project=${selectedHistoryProject}&version=${filterVersion}`);
                const data = await response.json();

                // 组装锁定和倒计时信息
                const newLockStatus = new Map(lockStatus);
                const newCountdowns = new Map(countdowns);

                if (Array.isArray(data.history) && data.history.length > 0) {
                    data.history.forEach((item: HistoryItem) => {
                        // 设置锁定状态
                        newLockStatus.set(item.iso_name, item.is_lock);

                        // 计算倒计时（30天）
                        const endTime = item.end_build_time ? new Date(item.end_build_time) : null;
                        if (endTime) {
                            endTime.setDate(endTime.getDate() + 30);
                            const now = new Date();
                            const timeLeft = endTime > now ? endTime.getTime() - now.getTime() : 0;
                            newCountdowns.set(item.iso_name, timeLeft);
                        } else {
                            newCountdowns.set(item.iso_name, 0);
                        }
                    });

                    // 追加到现有的 allHistoryData 中
                    setAllHistoryData((prev) => [...prev, ...data.history]);
                    setLockStatus(newLockStatus);
                    setCountdowns(newCountdowns);

                    // 如果返回的数据量 < 50，说明后端没更多数据了
                    if (data.history.length < 50) {
                        setHasMore(false);
                    }
                } else {
                    // 没有数据，直接判定为没有更多
                    setHasMore(false);
                }
            } catch (error) {
                console.error('Error fetching history:', error);
                toast.error('获取历史数据失败');
            } finally {
                setIsLoading(false);
            }
        };

        fetchHistory();
        // 注意：lockStatus 和 countdowns 也许要放进依赖里，
        // 但如果想要保持在加载中不重复刷新的逻辑，可以只在这里简单调用。
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [apiBaseUrl, currentPage]);

    // 前端过滤逻辑
    const filteredHistoryData = useMemo(() => {
        return allHistoryData.filter(
            (item) =>
                (!selectedHistoryProject || item.app_name === selectedHistoryProject) &&
                (!filterVersion || item.app_version === filterVersion)
        );
    }, [allHistoryData, selectedHistoryProject, filterVersion]);

    // 每 5 秒更新一次倒计时
    useEffect(() => {
        const timer = setInterval(() => {
            setCountdowns((current) => {
                const updated = new Map(current);
                updated.forEach((value, key) => {
                    if (value > 0) {
                        updated.set(key, value - 5000);
                    }
                });
                return updated;
            });
        }, 5000);

        return () => clearInterval(timer);
    }, []);

    // 切换锁定状态
    const toggleLock = async (deployId: string, currentLockStatus: number) => {
        const newLockStatus = currentLockStatus === 1 ? 0 : 1;
        setLoadingState((prev) => new Map(prev).set(deployId, true));
        try {
            const response = await fetch(`${apiBaseUrl}/build/`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: newLockStatus === 1 ? 'lock' : 'unlock', deploy_id: deployId }),
            });

            if (response.ok) {
                setLockStatus((prevStatus) => new Map(prevStatus).set(deployId, newLockStatus));
                toast.success(`资源${newLockStatus === 1 ? '已锁定' : '已解锁'}成功`);
            } else {
                toast.error(`资源${newLockStatus === 1 ? '锁定' : '解锁'}失败`);
            }
        } catch (error) {
            console.error('Error toggling lock:', error);
            toast.error(`资源${newLockStatus === 1 ? '锁定' : '解锁'}失败`);
        } finally {
            setLoadingState((prev) => new Map(prev).set(deployId, false));
        }
    };

    // 项目下拉选择
    const handleHistoryProjectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedHistoryProject(event.target.value);
        setFilterVersion('');
        setCurrentPage(0); // 重置页码
    };

    return (
        <Container className="mt-4">
            <ToastContainer />
            <h3 className="mb-4">历史构建</h3>

            {/* 顶部筛选栏 */}
            <div style={{ position: 'sticky', top: 0, backgroundColor: '#f1f1f0', zIndex: 1000, paddingBottom: '0.5rem' }}>
<<<<<<< HEAD
                <Row className="mb-4">
                    <Col md={6}>
                        <Form.Select value={selectedHistoryProject} onChange={handleHistoryProjectChange}>
                            <option value="">所有项目</option>
                            <option value="waf">waf</option>
                            <option value="omas">堡垒机</option>
                            <option value="lams">日审</option>
                            <option value="dsas">数审</option>
                            <option value="cosa">二合一</option>
                        </Form.Select>
                    </Col>
                    <Col md={6}>
                        <Form.Select
                            value={filterVersion}
                            onChange={(e) => {
                                setFilterVersion(e.target.value);
                                setCurrentPage(0); // 重置页码
                            }}
                        >
                            <option value="">所有版本</option>
                            {filterVersionOptions.map((version) => (
                                <option key={version} value={version}>
                                    {version}
                                </option>
                            ))}
                        </Form.Select>
                    </Col>
                </Row>
            </div>

            {/* 加载中时的提示 */}
            {isLoading && (
                <div className="loading-spinner-container">
                    <Spinner animation="border" role="status">
                        <span className="visually-hidden">加载中...</span>
                    </Spinner>
                </div>
            )}

            {/* 卡片列表 */}
            <Row className="g-4">
                {Array.isArray(filteredHistoryData) && filteredHistoryData.length > 0 ? (
                    filteredHistoryData.map((historyItem, index) => (
                        <Col md={4} key={index}>
                            <Card className="h-100 shadow-sm">
                                <Card.Body>
                                    <Badge
                                        bg={
                                            historyItem.state === 'STOPPED'
                                                ? 'secondary'
                                                : historyItem.state === 'RUNNING'
                                                    ? 'primary'
                                                    : historyItem.state === 'DELETE'
                                                        ? 'danger'
                                                        : historyItem.state === 'SUCCESS'
                                                            ? 'success'
                                                            : historyItem.state === 'FAILURE'
                                                                ? 'danger'
                                                                : historyItem.state === 'VERIFIED'
                                                                    ? 'info'
                                                                    : 'warning'
                                        }
                                        className="mb-3"
                                    >
                                        {historyItem.state}
                                    </Badge>
                                    <Card.Text>
                                        <strong>项目:</strong> {historyItem.app_name}
                                    </Card.Text>
                                    <Card.Text>
                                        <strong>版本:</strong> {historyItem.app_version}
                                    </Card.Text>
                                    <Card.Text>
                                        <strong>时间:</strong> {historyItem.start_build_time} ～ {historyItem.end_build_time}
                                    </Card.Text>
                                    <Card.Text>
                                        <strong>次数:</strong> {historyItem.ci_count}
                                    </Card.Text>
                                    <Card.Text>
                                        <strong>宿主机IP:</strong> {historyItem.deploy_host}
                                    </Card.Text>
                                    <Card.Text>
                                        <strong>IP:</strong> {historyItem.ip}
                                    </Card.Text>
                                    {/* 如需显示剩余时间，可以取消注释 */}
                                    {/* <Card.Text>
                    <strong>剩余时间:</strong> {formatTime(countdowns.get(historyItem.iso_name) ?? 0)}
                  </Card.Text> */}
                                    <Link href={`/task?deploy_id=${historyItem.iso_name?.split('-')[2]}`} passHref>
                                        <Button variant="link" className="p-0">
                                            查看详情
                                        </Button>
                                    </Link>
                                    {(historyItem.state === 'SUCCESS' || historyItem.state === 'VERIFIED') &&
                                        historyItem.deploy_host !== '127.0.0.1' && (
                                            <Button
                                                variant="outline-secondary"
                                                onClick={() =>
                                                    toggleLock(historyItem.iso_name, lockStatus.get(historyItem.iso_name) ?? 0)
=======
                <Grid container spacing={2} className="mb-4">
                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel id="history-project-label">项目</InputLabel>
                            <Select
                                labelId="history-project-label"
                                value={selectedHistoryProject}
                                label="项目"
                                onChange={handleHistoryProjectChange}
                            >
                                <MenuItem value="">所有项目</MenuItem>
                                <MenuItem value="waf">waf</MenuItem>
                                <MenuItem value="omas">堡垒机</MenuItem>
                                <MenuItem value="lams">日审</MenuItem>
                                <MenuItem value="dsas">数审</MenuItem>
                                <MenuItem value="cosa">二合一</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel id="history-version-label">版本</InputLabel>
                            <Select
                                labelId="history-version-label"
                                value={filterVersion}
                                label="版本"
                                onChange={(e) => { setFilterVersion(e.target.value as string); setCurrentPage(1); }}
                            >
                                <MenuItem value="">所有版本</MenuItem>
                                {filterVersionOptions.map((version) => (
                                    <MenuItem key={version} value={version}>{version}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>
            </div>
            {isLoading ? (
                <Box className="loading-spinner-container">
                    <CircularProgress />
                </Box>
            ) : (
                <Grid container spacing={4}>
                    {Array.isArray(paginatedData) && paginatedData.length > 0 ? (
                        <>
                            {paginatedData.map((historyItem, index) => (
                                <Grid item xs={12} md={4} key={index} className={index >= paginatedData.length - 3 && !showMore ? 'opacity-50' : ''}>
                                    <Card className="h-100 shadow-sm">
                                        <CardContent>
                                            <Badge
                                                color={
                                                    historyItem['state'] === 'STOPPED'
                                                        ? 'secondary'
                                                        : historyItem['state'] === 'RUNNING'
                                                            ? 'primary'
                                                            : historyItem['state'] === 'DELETE'
                                                                ? 'error'
                                                                : historyItem['state'] === 'SUCCESS'
                                                                    ? 'success'
                                                                    : historyItem['state'] === 'FAILURE'
                                                                        ? 'error'
                                                                        : historyItem['state'] === 'VERIFIED'
                                                                            ? 'info'
                                                                            : 'warning'
>>>>>>> d878dbf2cb03cd9b1a235ee98afcb19a73944d38
                                                }
                                                className="float-end"
                                                disabled={loadingState.get(historyItem.iso_name)}
                                            >
<<<<<<< HEAD
                                                {loadingState.get(historyItem.iso_name) ? (
                                                    <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                                                ) : lockStatus.get(historyItem.iso_name) === 1 ? (
                                                    <FiLock />
                                                ) : (
                                                    <FiUnlock />
                                                )}
                                            </Button>
                                        )}
                                </Card.Body>
                            </Card>
                        </Col>
                    ))
                ) : (
                    <div>暂无历史数据</div>
                )}
            </Row>

            {/* 如果还有更多数据，就显示“展示更多”按钮 */}
            {hasMore && !isLoading && (
                <Button
                    variant="link"
                    className="mx-auto d-block mt-4 animate__animated animate__pulse animate__infinite"
                    onClick={() => setCurrentPage((prevPage) => prevPage + 1)}
                >
                    展示更多
                </Button>
=======
                                                {historyItem['state']}
                                            </Badge>
                                            <Typography variant="body2"><strong>项目:</strong> {historyItem['app_name']}</Typography>
                                            <Typography variant="body2"><strong>版本:</strong> {historyItem['app_version']}</Typography>
                                            <Typography variant="body2"><strong>时间:</strong> {historyItem['start_build_time']} ～ {historyItem['end_build_time']}</Typography>
                                            <Typography variant="body2"><strong>次数:</strong> {historyItem['ci_count']}</Typography>
                                            <Typography variant="body2"><strong>宿主机IP:</strong> {historyItem['deploy_host']}</Typography>
                                            <Typography variant="body2"><strong>IP:</strong> {historyItem['ip']}</Typography>
                                            {/*<Card.Text>*/}
                                            {/*    <strong>剩余时间:</strong> {formatTime(countdowns.get(historyItem['iso_name']) ?? 0)}*/}
                                            {/*</Card.Text>*/}
                                            <Link href={`/task?deploy_id=${historyItem['iso_name']?.split('-')[2]}`} passHref>
                                                <Button variant="text" sx={{ p: 0 }}>查看详情</Button>
                                            </Link>
                                            {(historyItem['state'] === 'SUCCESS' || historyItem['state'] === 'VERIFIED') &&
                                                historyItem['deploy_host'] !== '127.0.0.1' && (
                                                    <Button
                                                        variant="outlined"
                                                        onClick={() => toggleLock(historyItem['iso_name'], lockStatus.get(historyItem['iso_name']) ?? 0)}
                                                        sx={{ float: 'right' }}
                                                        disabled={loadingState.get(historyItem['iso_name'])}
                                                    >
                                                        {loadingState.get(historyItem['iso_name']) ? (
                                                            <CircularProgress size={20} />
                                                        ) : lockStatus.get(historyItem['iso_name']) === 1 ? <FiLock /> : <FiUnlock />}
                                                    </Button>
                                                )}
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                            {!showMore && filteredHistoryData.length > pageSize && (
                                <Button
                                    variant="link"
                                    className="mx-auto d-block mt-4 animate__animated animate__pulse animate__infinite"
                                    onClick={() => setCurrentPage((prevPage) => prevPage + 1)}
                                >
                                    展示更多
                                </Button>
                            )}
                        </>
                    ) : (
                        <div>暂无历史数据</div>
                    )}
                </Grid>
>>>>>>> d878dbf2cb03cd9b1a235ee98afcb19a73944d38
            )}
        </Container>
    );
};

const HistoryPage: React.FC = () => (
    <Suspense fallback={<div>Loading history details...</div>}>
        <HistoryPageContent />
    </Suspense>
);

export default HistoryPage;
