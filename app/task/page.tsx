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
    const searchParams = useSearchParams();
    const deploy_id = searchParams.get('deploy_id');
    const [isLoading, setIsLoading] = useState(false);
    const [taskState, setTaskState] = useState<TaskState>({
        deploy_time: '',
        step: '',
        state: '',
        action: ''
    });

    const fetchTask = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`http://192.168.1.82:8000/build/${deploy_id}`);
            const data = await response.json();
            setTaskState(data);
        } catch (error) {
            console.error('Error fetching task:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTask();
    }, []);

    const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoading(true);
        try {
            const formData = new FormData(event.currentTarget);
            formData.append('action', 'revoke');

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
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <form onSubmit={onSubmit}>
                <label style={{ display: 'block', marginBottom: '10px' }}>
                    <span>构建id:</span>
                    <input type="text" name="deploy_time" value={taskState.deploy_time} readOnly style={{ marginLeft: '10px' }}/>
                </label>
                <label style={{ display: 'block', marginBottom: '10px' }}>
                    <span>当前任务:</span>
                    <input type="text" value={taskState.step} readOnly style={{ marginLeft: '10px' }}/>
                </label>
                <label style={{ display: 'block', marginBottom: '10px' }}>
                    <span>任务状态:</span>
                    <input type="text" value={taskState.state} readOnly style={{ marginLeft: '10px' }}/>
                </label>
                <button className="button" type="submit" disabled={isLoading} style={{ marginTop: '20px', padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}>
                    {isLoading ? 'Loading...' : 'Submit'}
                </button>
            </form>
        </div>
    );
}

export default TaskPage;
