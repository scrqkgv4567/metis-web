'use client';
import React, { useEffect, useState, useMemo, useRef, Suspense } from 'react';
import Link from 'next/link';
import { FiLock, FiUnlock } from 'react-icons/fi';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Card, Button, Row, Col, Form, Badge, Spinner } from 'react-bootstrap';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './history.css';

function formatTime(ms: number): string {
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

    const [filterVersionOptions, setFilterVersionOptions] = useState<string[]>([]);
    const [selectedHistoryProject, setSelectedHistoryProject] = useState<string>('');
    const [allHistoryData, setAllHistoryData] = useState<HistoryItem[]>([]);
    const [filterVersion, setFilterVersion] = useState<string>('');
    const [lockStatus, setLockStatus] = useState<Map<string, number>>(new Map());
    const [countdowns, setCountdowns] = useState<Map<string, number>>(new Map());
    const [showMore, setShowMore] = useState<boolean>(false);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const pageSize = 6;
    const [loadingState, setLoadingState] = useState<Map<string, boolean>>(new Map());
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const didFetch = useRef(false);

    const handleHistoryProjectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedHistoryProject(event.target.value);
        setFilterVersion('');
        setCurrentPage(1);
    };

    useEffect(() => {
        if (didFetch.current) return;

        didFetch.current = true;
        const fetchHistory = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`${apiBaseUrl}/history/`);
                const data = await response.json();
                const newLockStatus = new Map<string, number>();
                const newCountdowns = new Map<string, number>();

                data.history.forEach((item: HistoryItem) => {
                    newLockStatus.set(item['iso_name'], item['is_lock']);
                    const endTime = item['end_build_time'] ? new Date(item['end_build_time']) : null;
                    if (endTime) {
                        endTime.setDate(endTime.getDate() + 30);
                        const now = new Date(), timeLeft = endTime > now ? endTime.getTime() - now.getTime() : 0;
                        newCountdowns.set(item['iso_name'], timeLeft);
                    } else {
                        newCountdowns.set(item['iso_name'], 0);
                    }
                });
                setAllHistoryData(data.history);
                setLockStatus(newLockStatus);
                setCountdowns(newCountdowns);
            } catch (error) {
                console.error('Error fetching history:', error);
                toast.error('获取历史数据失败');
            } finally {
                setIsLoading(false);
            }
        };

        fetchHistory();
    }, [apiBaseUrl]);

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

    const filteredHistoryData = useMemo(() => {
        return allHistoryData.filter((item) =>
            (!selectedHistoryProject || item['app_name'] === selectedHistoryProject) &&
            (!filterVersion || item['app_version'] === filterVersion)
        );
    }, [allHistoryData, selectedHistoryProject, filterVersion]);

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
    }, [allHistoryData]);

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

    const paginatedData = useMemo(() => {
        return filteredHistoryData.slice(0, currentPage * pageSize);
    }, [filteredHistoryData, currentPage]);

    return (
        <Container className="mt-4">
            <ToastContainer />
            <h3 className="mb-4">历史构建</h3>
            <div style={{ position: 'sticky', top: 0, backgroundColor: '#f1f1f0', zIndex: 1000, paddingBottom: '0.5rem' }}>
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
                        <Form.Select value={filterVersion} onChange={(e) => { setFilterVersion(e.target.value); setCurrentPage(1); }}>
                            <option value="">所有版本</option>
                            {filterVersionOptions.map((version) => (
                                <option key={version} value={version}>{version}</option>
                            ))}
                        </Form.Select>
                    </Col>
                </Row>
            </div>
            {isLoading ? (
                <div className="loading-spinner-container">
                    <Spinner animation="border" role="status">
                        <span className="visually-hidden">加载中...</span>
                    </Spinner>
                </div>
            ) : (
                <Row className="g-4">
                    {Array.isArray(paginatedData) && paginatedData.length > 0 ? (
                        <>
                            {paginatedData.map((historyItem, index) => (
                                <Col md={4} key={index} className={index >= paginatedData.length - 3 && !showMore ? 'opacity-50' : ''}>
                                    <Card className="h-100 shadow-sm">
                                        <Card.Body>
                                            <Badge
                                                bg={
                                                    historyItem['state'] === 'STOPPED'
                                                        ? 'secondary'
                                                        : historyItem['state'] === 'RUNNING'
                                                            ? 'primary'
                                                            : historyItem['state'] === 'DELETE'
                                                                ? 'danger'
                                                                : historyItem['state'] === 'SUCCESS'
                                                                    ? 'success'
                                                                    : historyItem['state'] === 'FAILURE'
                                                                        ? 'danger'
                                                                        : historyItem['state'] === 'VERIFIED'
                                                                            ? 'info'
                                                                            : 'warning'
                                                }
                                                className="mb-3"
                                            >
                                                {historyItem['state']}
                                            </Badge>
                                            <Card.Text><strong>项目:</strong> {historyItem['app_name']}</Card.Text>
                                            <Card.Text><strong>版本:</strong> {historyItem['app_version']}</Card.Text>
                                            <Card.Text><strong>时间:</strong> {historyItem['start_build_time']} ～ {historyItem['end_build_time']}</Card.Text>
                                            <Card.Text><strong>次数:</strong> {historyItem['ci_count']}</Card.Text>
                                            <Card.Text><strong>宿主机IP:</strong> {historyItem['deploy_host']}</Card.Text>
                                            <Card.Text><strong>IP:</strong> {historyItem['ip']}</Card.Text>
                                            {/*<Card.Text>*/}
                                            {/*    <strong>剩余时间:</strong> {formatTime(countdowns.get(historyItem['iso_name']) ?? 0)}*/}
                                            {/*</Card.Text>*/}
                                            <Link href={`/task?deploy_id=${historyItem['iso_name']?.split('-')[2]}`} passHref>
                                                <Button variant="link" className="p-0">查看详情</Button>
                                            </Link>
                                            {(historyItem['state'] === 'SUCCESS' || historyItem['state'] === 'VERIFIED') &&
                                                historyItem['deploy_host'] !== '127.0.0.1' && (
                                                    <Button
                                                        variant="outline-secondary"
                                                        onClick={() => toggleLock(historyItem['iso_name'], lockStatus.get(historyItem['iso_name']) ?? 0)}
                                                        className="float-end"
                                                        disabled={loadingState.get(historyItem['iso_name'])}
                                                    >
                                                        {loadingState.get(historyItem['iso_name']) ? (
                                                            <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                                                        ) : lockStatus.get(historyItem['iso_name']) === 1 ? <FiLock /> : <FiUnlock />}
                                                    </Button>
                                                )}
                                        </Card.Body>
                                    </Card>
                                </Col>
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
                </Row>
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
