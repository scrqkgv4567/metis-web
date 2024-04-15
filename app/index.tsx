import React, { useEffect, useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import Link from "next/link";

const IndexPage = () => {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

    const [appVersionOptions, setAppVersionOptions] = useState([]);
    const [filterVersionOptions, setFilterVersionOptions] = useState([]);
    const [selectedProject, setSelectedProject] = useState('waf');
    const [selectedHistoryProject, setSelectedHistoryProject] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [historyData, setHistoryData] = useState([]);
    const [filterVersion, setFilterVersion] = useState('');

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
        const fetchHistory = async () => {
            try {
                const response = await fetch(`${apiBaseUrl}/history/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({})
                });
                const data = await response.json();

                interface HistoryItem {
                  [index: number]: string | number;
                }
                const filteredData = data.history.history.filter((item: HistoryItem) =>
                    (!selectedHistoryProject || item[3] === selectedHistoryProject) &&
                    (!filterVersion || item[4] === filterVersion)
                );
                setHistoryData(filteredData);
            } catch (error) {
                console.error('Error fetching history:', error);
            }
        };

        fetchHistory().then(r => r);
    }, [selectedHistoryProject, filterVersion, apiBaseUrl]);

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
    } catch (error) {
        console.error('Error on form submit:', error);
    } finally {
        setIsLoading(false);
    }
};




    // @ts-ignore
    return (
        <div className="page-container">
            <div className="form-container">
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
                        <select name="ware_version" id="source6" className="form-select">
                            <option value="hard" selected>硬件版</option>
                            <option value="soft">软件版</option>
                            <option value="cloud">云版</option>
                            <option value="soft_cloud">全都要</option>
                        </select>
                    </div>
                    <div className="select-group">
                        <label htmlFor="source3">CPU</label>
                        <select name="cpu" id="source3" className="form-select">
                            <option value="1" selected>1</option>
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
                            <option value="1" selected>1</option>
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
                            <option value="50" selected>50</option>
                            <option value="100">100</option>
                            <option value="150">150</option>
                            <option value="250">250</option>
                            <option value="500">500</option>
                        </select>
                    </div>

                    <button className="button" type="submit" disabled={isLoading}>
                        {isLoading ? 'Loading...' : '开始构建'}
                    </button>
                </form>
                <div className="version">version: 0.1.3</div>
            </div>


            <div className="history-container">
                <h1 className="my-4">历史记录</h1>
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
                        historyData.map((historyItem: string[], index) => (
                            <div className="card mb-3" key={index}>
                                <div className="card-body">
                                    <h5 className="card-title">{historyItem[2]}</h5>
                                    <p className="card-text">项目: {historyItem[3]} 版本: {historyItem[4]} </p>
                                    <p className="card-text">构建状态: {historyItem[7]}</p>

                                    <p className="card-text">构建时间: {historyItem[5]}～{historyItem[6]}</p>
                                    <p className="card-text">次数: {historyItem[1]}</p>
                                    <p className="card-text">IP: {historyItem[8]}</p>

                                    <Link href={`/task?deploy_id=${historyItem[2]?.split('-')[2]}`}
                                          className="card-link">查看详情</Link>

                                </div>
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
