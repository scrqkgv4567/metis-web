'use client'
import React, { FormEvent, useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface TaskState {
    deploy_time: string;
    step: string;
    state: string;
    action: string;
}

const TaskPageContent  = () => {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

    const searchParams = useSearchParams();
    const deploy_id = searchParams.get('deploy_id');
    const [isLoading, setIsLoading] = useState(false);
    const [taskState, setTaskState] = useState<TaskState>({} as TaskState);
    const [action, setAction] = useState('');
    const [triggerOnsubmit, setTriggerOnsubmit] = useState(false);
    useEffect(() => {
        const doFetchTask = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`${apiBaseUrl}/build/${deploy_id}`);
                const data = await response.json();
                const translatedState = translateTaskState({state: data.state});
                const translatedStep = translateTaskStep({step: data.step});

                setTaskState({ ...data, state: translatedState, step: translatedStep });
            } catch (error) {
                console.error('Error fetching task:', error);
            } finally {
                setIsLoading(false);
            }
        };

        doFetchTask().catch(error => console.error('Failed to fetch task details:', error));
    }, [deploy_id, apiBaseUrl, triggerOnsubmit]);
    function translateTaskStep({step}: { step: any }) {
        switch (step) {
            case 'preparation_task':
                return '预发布任务';
            case 'build_task':
                return '生产任务';
            case 'init_sql':
                return '初始化 SQL';
            case 'apply_task':
                return '安装系统';
            case 'check_task_file':
                return '检查文件完整性';
            case 'package_task':
                return 'ISO镜像打包';
            default:
                return step; // Return original step if no translation found
        }
    }
    function translateTaskState({state}: { state: any }) {
        switch (state) {
            case 'STOPPED':
                return '已停止';
            case 'RUNNING':
                return '正在运行';
            case 'FINISHED':
                return '已完成';
            case 'VERIFIED':
                return '生产通过';
            case 'DELETED':
                return '已删除';
            case 'PASSED':
                return '生产通过已删除';
            default:
                return state; // Return original state if no translation found
        }
    }
    const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.append('action', action);
            formData.append('deploy_time', taskState.deploy_time);
            console.log('Submitting:', formData)
            const response = await fetch(`${apiBaseUrl}/build/`, {
                method: 'PUT',
                body: formData,
            });
            const data = await response.json();
            console.log('Response:', data);
            setTriggerOnsubmit(!triggerOnsubmit);
        } catch (error) {
            console.error('Error submitting:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container mt-5">
            <form onSubmit={onSubmit} className="bg-white p-5 rounded shadow-md mx-auto" style={{ maxWidth: '500px' }}>
                <div className="mb-3">
                    <label className="form-label font-weight-bold">构建 ID:</label>
                    <div className="form-control-plaintext">{taskState.deploy_time}</div>
                </div>
                <div className="mb-3">
                    <label className="form-label font-weight-bold">当前任务:</label>
                    <div className="form-control-plaintext">{taskState.step}</div>
                </div>
                <div className="mb-3">
                    <label className="form-label font-weight-bold">任务状态:</label>
                    <div className="form-control-plaintext">
                        {taskState.state}
                    </div>
                </div>
                <div className="btn-group d-flex" role="group">
                    {taskState.state === '正在运行' && (
                        <button type="submit" disabled={isLoading}
                                onClick={() => setAction('revoke')}
                                className={`btn ${isLoading ? 'btn-secondary' : 'btn-danger'} flex-grow-1`}>
                            {isLoading ? 'Loading...' : '停止'}
                        </button>
                    )}
                    {taskState.step === '安装系统' && (taskState.state === '已完成' || taskState.state === '生产通过')  && (
                        <button type="submit" disabled={isLoading}
                                onClick={() => setAction('delete')}
                                className={`btn ${isLoading ? 'btn-secondary' : 'btn-danger'} flex-grow-1`}>
                            {isLoading ? 'Loading...' : '删除'}
                        </button>
                    )}
                    {taskState.step === '安装系统' && taskState.state === '已完成' && (
                        <button type="submit" disabled={isLoading}
                                onClick={() => setAction('verify')}
                                className={`btn ${isLoading ? 'btn-secondary' : 'btn-danger'} flex-grow-1`}>
                            {isLoading ? 'Loading...' : '生产通过'}
                        </button>
                    )}
                </div>
            </form>
        </div>
    );


}

const TaskPage = () => (
    <Suspense fallback={<div>Loading task details...</div>}>
        <TaskPageContent />
    </Suspense>
);

export default TaskPage;
