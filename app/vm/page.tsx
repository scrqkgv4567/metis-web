'use client';
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import {
    CircularProgress,
    Container,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Typography,
    Box,
} from '@mui/material';
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
    // Default to an empty string if the environment variable is undefined
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
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
            <Typography variant="h5" align="center" sx={{ my: 4 }}>
                测试用虚拟机资源列表
            </Typography>
            {notification.show && (
                <div className={styles.notification}>
                    {notification.message}
                </div>
            )}
            {loading ? (
                <Box display="flex" justifyContent="center" alignItems="center" sx={{ height: '50vh' }}>
                    <CircularProgress sx={{ width: '5rem', height: '5rem' }} />
                </Box>
            ) : (
                <Table sx={{ mt: 4 }}>
                    <TableHead>
                        <TableRow>
                            <TableCell>ID</TableCell>
                            <TableCell>操作系统</TableCell>
                            <TableCell>虚拟机IP</TableCell>
                            <TableCell>虚拟机名</TableCell>
                            <TableCell>宿主机</TableCell>
                            <TableCell>操作</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {vms.map((vm) => (
                            <TableRow key={vm.id}>
                                <TableCell>{vm.id}</TableCell>
                                <TableCell>{vm.vm_os}</TableCell>
                                <TableCell>{vm.vm_ip}</TableCell>
                                <TableCell>{vm.vm_name}</TableCell>
                                <TableCell>{vm.vm_host}</TableCell>
                                <TableCell>
                                    <label className={styles.vmToggle}>
                                        <input
                                            type="checkbox"
                                            checked={vm.vm_state === "poweredOn"}
                                            onChange={(e) => toggleVmState(e.target.checked, vm.vm_uuid)}
                                        />
                                        <span></span>
                                    </label>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </Container>
    );
};

export default VmsDashboard;
