'use client'
import React, { FormEvent, useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CircularProgress, Container, Typography, Button, Box, TextField, Paper } from '@mui/material';
import { styled } from '@mui/system';

interface TaskState {
    deploy_id: string;
    step: string;
    state: string;
    action: string;
}

const StyledPaper = styled(Paper)(({ theme }) => ({
    padding: theme.spacing(4),
    maxWidth: '500px',
    margin: '0 auto',
}));

const TaskPageContent  = () => {
    // Default to an empty string if the environment variable is undefined
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
    const router = useRouter();

    const searchParams = useSearchParams();
    const deploy_id = searchParams.get('deploy_id');
    const [isLoading, setIsLoading] = useState(false);
    const [taskState, setTaskState] = useState<TaskState>({} as TaskState);
    const [action, setAction] = useState('');
    const [triggerOnSubmit, setTriggerOnSubmit] = useState(false);

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
    }, [deploy_id, apiBaseUrl, triggerOnSubmit]);

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
            case 'FAILURE':
                return '失败';
            case 'VERIFIED':
                return '生产通过';
            case 'DELETED':
                return '已删除';
            case 'PASSED':
                return '生产通过已删除';
            case 'LOCKED':
                return '锁定';
            case 'UNLOCKED':
                return '未锁定';
            default:
                return state; // Return original state if no translation found
        }
    }

    const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoading(true);
        try {
            console.log('Submitting:', action, taskState.deploy_id)
            const response = await fetch(`${apiBaseUrl}/build/`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({action: action, deploy_id: taskState.deploy_id}),
            });
            const data = await response.json();
            console.log('Response:', data);
            setTriggerOnSubmit(!triggerOnSubmit);
        } catch (error) {
            console.error('Error submitting:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const onHistoryClick = () => {
        router.push('/?page=history');
    };

    return (
        <Container maxWidth="sm" sx={{ mt: 5 }}>
            <StyledPaper elevation={3}>
                <form onSubmit={onSubmit}>
                    <Typography variant="h6" gutterBottom>构建 ID:</Typography>
                    <TextField
                        variant="outlined"
                        fullWidth
                        slotProps={{ input: { readOnly: true } }}
                        value={taskState.deploy_id || ''}
                        sx={{ mb: 3 }}
                    />

                    <Typography variant="h6" gutterBottom>当前任务:</Typography>
                    <TextField
                        variant="outlined"
                        fullWidth
                        slotProps={{ input: { readOnly: true } }}
                        value={taskState.step || ''}
                        sx={{ mb: 3 }}
                    />

                    <Typography variant="h6" gutterBottom>构建状态:</Typography>
                    <TextField
                        variant="outlined"
                        fullWidth
                        slotProps={{ input: { readOnly: true } }}
                        value={taskState.state || ''}
                        sx={{ mb: 3 }}
                    />

                    <Box display="flex" justifyContent="space-between" mt={3}>
                        {taskState.state === '正在运行' && (
                            <Button
                                type="submit"
                                variant="contained"
                                color="error"
                                onClick={() => setAction('revoke')}
                                disabled={isLoading}
                            >
                                {isLoading ? <CircularProgress size={24} /> : '停止'}
                            </Button>
                        )}
                        {taskState.step === '安装系统' && !(taskState.state === "锁定") && (taskState.state === '已完成' || taskState.state === '生产通过' || taskState.state === '未锁定' )  && (
                            <Button
                                type="submit"
                                variant="contained"
                                color="error"
                                onClick={() => setAction('delete')}
                                disabled={isLoading}
                            >
                                {isLoading ? <CircularProgress size={24} /> : '删除'}
                            </Button>
                        )}
                        {taskState.step === '安装系统' &&(taskState.state === '已完成' || taskState.state === '锁定' || taskState.state === '未锁定' )  && (
                            <Button
                                type="submit"
                                variant="contained"
                                color="primary"
                                onClick={() => setAction('verify')}
                                disabled={isLoading}
                            >
                                {isLoading ? <CircularProgress size={24} /> : '生产通过'}
                            </Button>
                        )}
                    </Box>

                    <Box display="flex" justifyContent="center" mt={3}>
                        <Button
                            variant="contained"
                            color="secondary"
                            onClick={onHistoryClick}
                        >返回首页

                        </Button>
                    </Box>
                </form>
            </StyledPaper>
        </Container>
    );
}

const TaskPage = () => (
    <Suspense fallback={<Box display="flex" justifyContent="center" mt={5}><CircularProgress /></Box>}>
        <TaskPageContent />
    </Suspense>
);

export default TaskPage;
