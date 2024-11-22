'use client'
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Spinner, Container, Table, Button } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

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

    useEffect(() => {
        // Fetch VM state from API
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
                alert("虚拟机操作成功");
                // Refresh the VMs state
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

    return (
        <Container>
            <h1 className="text-center my-4">测试用虚拟机资源列表</h1>
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
                                <Button
                                    variant="success"
                                    onClick={() => handleVmAction("poweron", vm.vm_uuid)}
                                    disabled={vm.vm_state === "poweredOn"}
                                    className="me-2"
                                >
                                    开机
                                </Button>
                                <Button
                                    variant="danger"
                                    onClick={() => handleVmAction("poweroff", vm.vm_uuid)}
                                    disabled={vm.vm_state === "poweredOff"}
                                >
                                    关机
                                </Button>
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
