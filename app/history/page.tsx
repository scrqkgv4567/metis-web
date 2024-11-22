'use client'
import React, {useEffect, useState, Suspense } from 'react';
import Link from "next/link";
import {FiLock, FiUnlock} from "react-icons/fi";
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Card, Button, Row, Col, Form, Badge, Spinner } from 'react-bootstrap';

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

    const [filterVersionOptions, setFilterVersionOptions] = useState<string[]>([]);
    const [selectedHistoryProject, setSelectedHistoryProject] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [historyData, setHistoryData] = useState<any[]>([]);
    const [filterVersion, setFilterVersion] = useState('');
    const [triggerHistoryUpdate, setTriggerHistoryUpdate] = useState(false);
    const [lockStatus, setLockStatus] = useState<LockStatus>({});
    const [countdowns, setCountdowns] = useState<{ [key: string]: number }>({});

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
            deploy_id: string;
            [key: string]: any;
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

                filteredData.forEach((item: HistoryItem): any => {
                    newLockStatus[item['iso_name']] = item['is_lock'];
                    const endTime = item['end_build_time'] ? new Date(item['end_build_time']) : null;
                    if (endTime) {
                        endTime.setDate(endTime.getDate() + 30);
                        const now = new Date(), timeLeft = endTime > now ? endTime.getTime() - now.getTime() : 0;
                        newCountdowns[item['iso_name']] = timeLeft;
                    } else {
                        newCountdowns[item['iso_name']] = 0;
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
                    if (updated[key] > 0) {
                        updated[key] -= 1000;
                    } else {
                        const historyItem = historyData.find(item => item['iso_name'] === key);
                        if (historyItem && historyItem['state'] !== "FAILURE" && historyItem['state'] !== "DELETE" && historyItem['deploy_host'] !== "127.0.0.1" &&
                            historyItem['end_build_time'] !== null && historyItem['ip'] !== null && historyItem['is_lock'] !== null && historyItem['deploy_host'] !== null) {
                            updated[key] = 0;
                        }
                    }
                });
                return updated;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [historyData]);

    const toggleLock = async (deployId: any, currentLockStatus: any) => {
        const newLockStatus = currentLockStatus === 1 ? 0 : 1;
        setIsLoading(true);
        try {
            const response = await fetch(`${apiBaseUrl}/build/`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: newLockStatus === 1 ? 'lock' : 'unlock', deploy_id: deployId }),
            });
            const data = await response.json();
            console.log('Lock response:', data);
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
        <Container className="mt-4">
            <h3 className="mb-4">历史构建</h3>
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
                    <Form.Select value={filterVersion} onChange={e => setFilterVersion(e.target.value)}>
                        <option value="">所有版本</option>
                        {filterVersionOptions.map(version => (
                            <option key={version} value={version}>{version}</option>
                        ))}
                    </Form.Select>
                </Col>
            </Row>
            <Row className="g-4">
                {isLoading ? (
                    <Spinner animation="border" role="status" className="mx-auto">
                        <span className="visually-hidden">Loading...</span>
                    </Spinner>
                ) : Array.isArray(historyData) && historyData.length > 0 ? (
                    historyData.map((historyItem: any, index) => (
                        <Col md={4} key={index}>
                            <Card className="h-100 shadow-sm">
                                <Card.Body>
                                    <Badge bg={historyItem['state'] === 'STOPPED' ? 'secondary' :
                                        historyItem['state'] === 'RUNNING' ? 'primary' :
                                        historyItem['state'] === 'DELETE' ? 'danger' :
                                        historyItem['state'] === 'SUCCESS' ? 'success' :
                                        historyItem['state'] === 'FAILURE' ? 'danger' :
                                        historyItem['state'] === 'VERIFIED' ? 'info' : 'warning'}
                                        className="mb-3">
                                        {historyItem['state']}
                                    </Badge>
                                    <Card.Text><strong>项目:</strong> {historyItem['app_name']}</Card.Text>
                                    <Card.Text><strong>版本:</strong> {historyItem['app_version']}</Card.Text>
                                    <Card.Text><strong>时间:</strong> {historyItem['start_build_time']} ～ {historyItem['end_build_time']}</Card.Text>
                                    <Card.Text><strong>次数:</strong> {historyItem['ci_count']}</Card.Text>
                                    <Card.Text><strong>宿主机IP:</strong> {historyItem['deploy_host']}</Card.Text>
                                    <Card.Text><strong>IP:</strong> {historyItem['ip']}</Card.Text>
                                    <Link href={`/task?deploy_id=${historyItem['iso_name']?.split('-')[2]}`} passHref>
                                        <Button variant="link" className="p-0">查看详情</Button>
                                    </Link>
                                    {(historyItem['state'] === 'SUCCESS' || historyItem['state'] === 'VERIFIED') && historyItem['deploy_host'] !== "127.0.0.1" && (
                                        <Button
                                            variant="outline-secondary"
                                            onClick={() => toggleLock(historyItem['iso_name'], lockStatus[historyItem['iso_name']] ?? 0)}
                                            className="float-end"
                                        >
                                            {lockStatus[historyItem['iso_name']] === 1 ? <FiLock /> : <FiUnlock />}
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
        </Container>
    );
}

const HistoryPage = () => (
    <Suspense fallback={<div>Loading history details...</div>}>
        <HistoryPageContent />
    </Suspense>
);

export default HistoryPage;
