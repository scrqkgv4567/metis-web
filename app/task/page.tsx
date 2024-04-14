'use client'
import React, { FormEvent, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

interface TaskState {
    deploy_time: string;
    step: string;
    state: string;
    action: string;
}

const TaskPage = () => {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

    const searchParams = useSearchParams();
    const deploy_id = searchParams.get('deploy_id');
    const [isLoading, setIsLoading] = useState(false);
    const [taskState, setTaskState] = useState<TaskState>({} as TaskState);

    useEffect(() => {
        const doFetchTask = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`${apiBaseUrl}/build/${deploy_id}`);
                const data = await response.json();
                setTaskState(data);
            } catch (error) {
                console.error('Error fetching task:', error);
            } finally {
                setIsLoading(false);
            }
        };

        doFetchTask().catch(error => console.error('Failed to fetch task details:', error));
    }, [deploy_id, apiBaseUrl]);

    const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.append('action', 'revoke');
            formData.append('deploy_time', taskState.deploy_time);
            const response = await fetch(`http://192.168.1.82:8000/build/`, {
                method: 'PUT',
                body: formData,
            });
            const data = await response.json();
            console.log('Response:', data);
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
                    <div className="form-control-plaintext">{taskState.state}</div>
                </div>
                <button type="submit" disabled={isLoading} className={`btn ${isLoading ? 'btn-secondary' : 'btn-danger'} btn-lg btn-block`}>
                    {isLoading ? 'Loading...' : '停止'}
                </button>
            </form>
        </div>
    );
}

export default TaskPage;
