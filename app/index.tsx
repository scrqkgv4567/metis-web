// pages/index.js
import React, {FormEvent, useEffect, useState} from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import Link from "next/link";

const IndexPage = () => {
    const [appVersionOptions, setAppVersionOptions] = useState([]);
    const [selectedProject, setSelectedProject] = useState('waf');
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [historyData, setHistoryData] = useState([]);


    // 获取历史记录
    const fetchHistory = () => {
        fetch('http://192.168.1.82:8000/history/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({})
        })
            .then(response => response.json())
            .then(data => {
                setHistoryData(data.history.history);
                console.log('History data:', data.history)
            })
            .catch(error => console.error('Error fetching history:', error));
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    // 处理项目选择变更
    const handleProjectChange = (x: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedProject(x.target.value);
        // 发送请求获取版本信息
        fetchVersions({projectName: x.target.value});
    };

    // 获取版本信息
    const fetchVersions = ({projectName}: { projectName: any }) => {
        fetch('http://192.168.1.82:8000/get_versions/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ project_name: projectName }),
        })
            .then(response => response.json())
            .then(data => {
                setAppVersionOptions(data.versions);
            });
    };

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsLoading(true)
        try {
            const formData = new FormData(event.currentTarget)
            const response = await fetch('http://192.168.1.82:8000/build/', {
                method: 'POST',
                body: formData,
            })

            // Handle response if necessary
            const data = await response.json()
            console.log('Response:', data)
            // ...
        } catch (error) {
            // Handle error if necessary
            console.error(error)
        } finally {
            setIsLoading(false) // Set loading to false when the request completes
        }
    }


    useEffect(() => {
        fetchVersions({projectName: selectedProject});
    }, [selectedProject]);

    return (
        <div className="content-container d-flex flex-column align-items-center">
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
                        {isLoading ? 'Loading...' : 'Submit'}
                    </button>
                </form>
                <div className="version">version: bl_ver</div>
            </div>
            <h1 className="my-4">历史记录</h1>
            <div className="table-container">
                <table className="table table-striped">
                    <thead className="sticky-header">

                    <tr>
                        <th scope="col">#</th>
                        <th scope="col">次数</th>
                        <th scope="col">镜像名</th>
                        <th scope="col">项目</th>
                        <th scope="col">版本</th>
                        <th scope="col">开始构建时间</th>
                        <th scope="col">结束构建时间</th>
                        <th scope="col">构建状态</th>
                        <th scope="col">ip</th>
                    </tr>
                    </thead>
                    <tbody>
                    {Array.isArray(historyData) && historyData.length > 0 ? (
                        historyData.map((historyItem: string[], index) => (

                            <tr key={index}>
                                <td>{historyItem[0]}</td>
                                <td>{historyItem[1]}</td>
                                <td>{historyItem[2]}</td>
                                <td>{historyItem[3]}</td>
                                <td>{historyItem[4]}</td>
                                <td>{historyItem[5]}</td>
                                <td>{historyItem[6]}</td>
                                {/*<Link href={`http://192.168.1.82:8000/build/${historyItem[2]}`}>{historyItem[7]}</Link>*/}
                                {/*return task page*/}
                                <td>
                                    <Link href={`/task?deploy_time=${historyItem[2].split('-')[2]}`}>
                                        {historyItem[7]}
                                    </Link>
                                </td>
                                <td>{historyItem[8]}</td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                        <td>loading……</td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default IndexPage;
