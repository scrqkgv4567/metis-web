'use client';
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Spinner, Container, Table } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import styles from './vm.module.css';

interface Vm {
    id: number;
    vm_os: string;
    vm_ip: string;
    vm_name: string;
    vm_host: string;
    vm_uuid: string;
    vm_state: string;
}

const VmsDashboard: React.FC = () => {
    const [vms, setVms] = useState<Vm[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    const [notification, setNotification] = useState({ show: false, message: '' });

    const didFetch = useRef(false);

    useEffect(() => {
        if (didFetch.current) return;

        didFetch.current = true;
        const fetchVmsState = async () => {
            try {
                const response = await axios.get(`${apiBaseUrl}/show_vms_state`);
                setVms(response.data.data);
            } catch (error) {
                console.error("Error fetching VM states: ", error);
            } finally {
                setLoading(false);
            }
        };

        fetchVmsState().then(() => console.log("VMs state fetched successfully"));
    }, [apiBaseUrl]);

    const handleVmAction = async (action: string, uuid: string) => {
        try {
            const response = await axios.post(`${apiBaseUrl}/vm_action`, {
                action,
                vm_uuid: uuid,
            });
            if (response.status === 200) {
                setNotification({ show: true, message: '虚拟机操作成功' });

                setTimeout(() => {
                    setNotification({ show: false, message: '' });
                }, 3000);

                setVms(prevState => prevState.map(vm => {
                    if (vm.vm_uuid === uuid) {
                        return { ...vm, vm_state: action === 'poweron' ? 'poweredOn' : 'poweredOff' };
                    }
                    return vm;
                }));
            }
        } catch (error) {
            console.error(`Error performing ${action} action on VM: `, error);
            alert("An error occurred while performing the action.");
        }
    };

    const toggleVmState = (checked: boolean, uuid: string) => {
        const action = checked ? "poweron" : "poweroff";
        handleVmAction(action, uuid).then(() => console.log("VM action performed successfully"));
    };

    return (
        <Container>
            <h1 className="text-center my-4">测试用虚拟机资源列表</h1>
            {notification.show && (
                <div className={styles.notification}>
                    {notification.message}
                </div>
            )}
            {loading ? (
                <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
                    <Spinner animation="border" role="status" style={{ width: '5rem', height: '5rem' }}>
                        <span className="visually-hidden">Loading...</span>
                    </Spinner>
                </div>
            ) : (
                <Table striped bordered hover responsive className="mt-4">
                    <thead className="thead-dark">
                    <tr>
                        <th>ID</th>
                        <th>操作系统</th>
                        <th>虚拟机IP</th>
                        <th>虚拟机名</th>
                        <th>宿主机</th>
                        <th>操作</th>
                    </tr>
                    </thead>
                    <tbody>
                    {vms.map((vm) => (
                        <tr key={vm.id}>
                            <td>{vm.id}</td>
                            <td>{vm.vm_os}</td>
                            <td>{vm.vm_ip}</td>
                            <td>{vm.vm_name}</td>
                            <td>{vm.vm_host}</td>
                            <td>
                                <label className={styles.vmToggle}>
                                    <input
                                        type="checkbox"
                                        checked={vm.vm_state === "poweredOn"}
                                        onChange={(e) => toggleVmState(e.target.checked, vm.vm_uuid)}
                                    />
                                    <span></span>
                                </label>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </Table>
            )}
        </Container>
    );
};

export default VmsDashboard;
