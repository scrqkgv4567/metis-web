// `app/dashboard/page.tsx` is the UI for the `/dashboard` URL
"use client";  // 声明这是一个 Client Side Render 的 Component. Next.js 默认使用 Server Side Render
import React, {
    FormEvent,
    useEffect,
    useState
} from 'react';
import { useSearchParams } from 'next/navigation'
const TaskPage = () => {
    const searchParams = useSearchParams()
    const deploy_time = searchParams.get('deploy_time')

    const [taskState, setTaskState] = useState([]);
    const fetchTask = () => {

        try{
        fetch(`http://192.168.1.82:8000/build/${deploy_time}`, {
            method: "GET",
            headers: {
                'Content-Type': 'application/json',
            },

        })  .then(response => response.json())
            .then(data => {
                setTaskState(data);
                console.log('task info:', data)
            })
        }catch (error)
    {
        console.log('Error fetching task:', error)
    }
    }
    useEffect(() => {
        fetchTask();
    }, []);

    async function onSwitch(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        try {
            const formData = new FormData(event.currentTarget)
            // 接口示例：/build/timestamp?action=revoke method: PUT
            const response = await fetch('http://192.168.1.82:8000/build/', {
                method: 'PUT',
                body: JSON.stringify({deploy_time: formData.get('deploy_time'), action: formData.get('action')})

            })
        }catch (error) {
            // Handle error if necessary
            console.error(error)
        }
    }

    return (
        <div>
            return <>deploy_time: {deploy_time}</>
        </div>
    )
}

export default TaskPage;