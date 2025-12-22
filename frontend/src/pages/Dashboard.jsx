import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { Users, ShieldAlert, Monitor, Router, Radio } from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const Dashboard = () => {
    const [stats, setStats] = useState({
        total_devices: 0,
        blocked_devices: 0,
        online_users: 0,
        ap_distribution: []
    });
    const [serviceStatus, setServiceStatus] = useState({
        freeradius: 'unknown'
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await axios.get('/api/dashboard/stats');
                setStats(res.data);
            } catch (err) {
                console.error(err);
            }
        };

        const fetchStatus = async () => {
            try {
                const res = await axios.get('/api/dashboard/status');
                setServiceStatus(res.data);
            } catch (err) {
                console.error(err);
            }
        };

        fetchStats();
        fetchStatus();

        // Poll every 30 seconds
        const interval = setInterval(() => {
            fetchStats();
            fetchStatus();
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    const chartData = {
        labels: ['Allowed', 'Blocked'],
        datasets: [
            {
                data: [stats.total_devices - stats.blocked_devices, stats.blocked_devices],
                backgroundColor: [
                    'rgba(56, 189, 248, 0.8)', // Sky
                    'rgba(244, 63, 94, 0.8)',  // Rose
                ],
                borderColor: [
                    'rgba(56, 189, 248, 1)',
                    'rgba(244, 63, 94, 1)',
                ],
                borderWidth: 1,
            },
        ],
    };

    const apChartData = {
        labels: stats.ap_distribution?.map(d => d.name) || [],
        datasets: [{
            label: 'Connected Clients',
            data: stats.ap_distribution?.map(d => d.count) || [],
            backgroundColor: 'rgba(16, 185, 129, 0.6)', // Emerald
            borderColor: 'rgba(16, 185, 129, 1)',
            borderWidth: 1
        }]
    };

    return (
        <div>
            <h1>Dashboard</h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '2rem' }}>
                <Link to="/online-users" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <StatCard
                        title="Online Users"
                        value={stats.online_users}
                        icon={<Users size={32} color="#10b981" />}
                        subtext={`${stats.ap_distribution?.length || 0} APs active`}
                    />
                </Link>
                <StatCard
                    title="Total Devices"
                    value={stats.total_devices}
                    icon={<Monitor size={32} color="#38bdf8" />}
                />
                <StatCard
                    title="Blocked Devices"
                    value={stats.blocked_devices}
                    icon={<ShieldAlert size={32} color="#f43f5e" />}
                />
                <StatCard
                    title="FreeRADIUS"
                    value={serviceStatus.freeradius === 'active' ? 'Running' : 'Stopped'}
                    icon={<Radio size={32} color={serviceStatus.freeradius === 'active' ? '#10b981' : '#f43f5e'} />}
                    subtext={serviceStatus.freeradius === 'active' ? 'Service is healthy' : 'Service is down'}
                    statusColor={serviceStatus.freeradius === 'active' ? '#10b981' : '#f43f5e'}
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h3>Device Status Distribution</h3>
                    <div style={{ position: 'relative', height: '300px', display: 'flex', justifyContent: 'center' }}>
                        <Doughnut data={chartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: 'white' } } } }} />
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h3>AP Client Distribution</h3>
                    <div style={{ position: 'relative', height: '300px' }}>
                        {stats.ap_distribution?.length > 0 ? (
                            <Bar
                                data={apChartData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: { legend: { display: false }, title: { display: false } },
                                    scales: {
                                        y: { beginAtZero: true, ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.1)' } },
                                        x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
                                    }
                                }}
                            />
                        ) : (
                            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                                <Router size={48} strokeWidth={1} style={{ marginBottom: '1rem' }} />
                                <div>No active client distribution data</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ title, value, icon, subtext, statusColor }) => (
    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#94a3b8', fontSize: '0.9rem', textTransform: 'uppercase' }}>{title}</h4>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{value}</div>
            {subtext && <div style={{ fontSize: '0.8em', color: statusColor || '#10b981', marginTop: '4px' }}>{subtext}</div>}
        </div>
        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '16px' }}>
            {icon}
        </div>
    </div>
);

export default Dashboard;
