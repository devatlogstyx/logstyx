import { useState } from 'react';
import { 
    Container, 
    Title, 
    Text, 
    TextInput, 
    Button, 
    Paper, 
    Avatar, 
    Badge, 
    Group, 
    Stack,
    Tabs,
    Modal,
    ActionIcon,
    Checkbox,
    Grid
} from '@mantine/core';
import { 
    FiUsers, 
    FiMail, 
    FiSearch, 
    FiPlus, 
    FiShield, 
    FiTrash, 
    FiEdit 
} from 'react-icons/fi';
import { IoMail, IoShield, IoTrash } from 'react-icons/io5';

const DashboardUser = () => {
    // Mock data - replace with your actual data fetching
    const [users, setUsers] = useState([
        { id: 1, fullname: 'John Doe', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John', permissions: ['read', 'write'] },
        { id: 2, fullname: 'Jane Smith', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jane', permissions: ['read', 'write', 'admin'] },
        { id: 3, fullname: 'Bob Johnson', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob', permissions: ['read'] },
    ]);

    const [invitations, setInvitations] = useState([
        { id: 1, email: 'alice@example.com', permissions: ['read', 'write'] },
        { id: 2, email: 'charlie@example.com', permissions: ['read'] },
    ]);

    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('users');
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [newInvite, setNewInvite] = useState({ email: '', permissions: [] });

    const permissionOptions = ['read', 'write', 'admin', 'delete'];

    const filteredUsers = users.filter(user => 
        user.fullname.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredInvitations = invitations.filter(inv => 
        inv.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDeleteUser = (id) => {
        setUsers(users.filter(u => u.id !== id));
    };

    const handleDeleteInvitation = (id) => {
        setInvitations(invitations.filter(i => i.id !== id));
    };

    const handleSendInvite = () => {
        if (newInvite.email && newInvite.permissions.length > 0) {
            setInvitations([...invitations, { 
                id: Date.now(), 
                email: newInvite.email, 
                permissions: newInvite.permissions 
            }]);
            setNewInvite({ email: '', permissions: [] });
            setShowInviteModal(false);
        }
    };

    const togglePermission = (permission) => {
        setNewInvite(prev => ({
            ...prev,
            permissions: prev.permissions.includes(permission)
                ? prev.permissions.filter(p => p !== permission)
                : [...prev.permissions, permission]
        }));
    };

    return (
        <div className="max-w-7xl mx-auto py-8 px-4">
            <div className="space-y-8">
                {/* Header */}
                <div>
                    <Title order={1} className="mb-2">User Management</Title>
                    <Text className="text-gray-600">Manage users and pending invitations</Text>
                </div>

                {/* Search and Actions Bar */}
                <Paper className="p-4 border border-gray-200 rounded-lg shadow-sm">
                    <div className="flex gap-4 items-center justify-end">
                        <Button 
                            leftSection={<FiPlus size={16} />}
                            onClick={() => setShowInviteModal(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap"
                        >
                            Invite User
                        </Button>
                    </div>
                </Paper>

                {/* Tabs */}
                <Tabs value={activeTab} onChange={setActiveTab}>
                    <Tabs.List className="border-b border-gray-200">
                        <Tabs.Tab 
                            value="users" 
                            leftSection={<FiUsers size={16} />}
                            className="data-[active]:border-b-2 data-[active]:border-blue-600 data-[active]:text-blue-600"
                        >
                            <span className="font-medium">Active Users ({users.length})</span>
                        </Tabs.Tab>
                        <Tabs.Tab 
                            value="invitations" 
                            leftSection={<FiMail size={16} />}
                            className="data-[active]:border-b-2 data-[active]:border-blue-600 data-[active]:text-blue-600"
                        >
                            <span className="font-medium">Pending Invitations ({invitations.length})</span>
                        </Tabs.Tab>
                    </Tabs.List>

                    {/* Users Panel */}
                    <Tabs.Panel value="users" className="pt-6">
                        <div className="space-y-4">
                            {filteredUsers.length > 0 ? (
                                filteredUsers.map(user => (
                                    <Paper key={user.id} className="p-6 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <Avatar 
                                                    src={user.image} 
                                                    alt={user.fullname}
                                                    className="w-12 h-12 rounded-full"
                                                />
                                                <div>
                                                    <Text className="font-semibold text-gray-900">{user.fullname}</Text>
                                                    <div className="flex gap-2 mt-2">
                                                        {user.permissions.map(perm => (
                                                            <Badge 
                                                                key={perm}
                                                                leftSection={<FiShield size={12} />}
                                                                variant="light"
                                                                className="bg-blue-50 text-blue-700 border border-blue-200"
                                                            >
                                                                {perm}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <ActionIcon 
                                                    variant="light"
                                                    className="text-blue-600 hover:bg-blue-50 border border-gray-200 rounded-lg"
                                                >
                                                    <FiEdit size={18} />
                                                </ActionIcon>
                                                <ActionIcon 
                                                    variant="light"
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    className="text-red-600 hover:bg-red-50 border border-gray-200 rounded-lg"
                                                >
                                                    <FiTrash size={18} />
                                                </ActionIcon>
                                            </div>
                                        </div>
                                    </Paper>
                                ))
                            ) : (
                                <Paper className="p-12 border border-gray-200 rounded-lg shadow-sm">
                                    <div className="flex flex-col items-center gap-4">
                                        <FiUsers size={48} stroke={1.5} className="text-gray-400" />
                                        <Text className="text-gray-500">No users found</Text>
                                    </div>
                                </Paper>
                            )}
                        </div>
                    </Tabs.Panel>

                    {/* Invitations Panel */}
                    <Tabs.Panel value="invitations" className="pt-6">
                        <div className="space-y-4">
                            {filteredInvitations.length > 0 ? (
                                filteredInvitations.map(invitation => (
                                    <Paper key={invitation.id} className="p-6 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <Avatar className="w-12 h-12 rounded-full bg-gray-200">
                                                    <IoMail size={24} className="text-gray-500" />
                                                </Avatar>
                                                <div>
                                                    <Text className="font-semibold text-gray-900">{invitation.email}</Text>
                                                    <div className="flex gap-2 mt-2">
                                                        {invitation.permissions.map(perm => (
                                                            <Badge 
                                                                key={perm}
                                                                leftSection={<IoShield size={12} />}
                                                                variant="light"
                                                                className="bg-amber-50 text-amber-700 border border-amber-200"
                                                            >
                                                                {perm}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            <ActionIcon 
                                                variant="light"
                                                onClick={() => handleDeleteInvitation(invitation.id)}
                                                className="text-red-600 hover:bg-red-50 border border-gray-200 rounded-lg"
                                            >
                                                <IoTrash size={18} />
                                            </ActionIcon>
                                        </div>
                                    </Paper>
                                ))
                            ) : (
                                <Paper className="p-12 border border-gray-200 rounded-lg shadow-sm">
                                    <div className="flex flex-col items-center gap-4">
                                        <IoMail size={48} stroke={1.5} className="text-gray-400" />
                                        <Text className="text-gray-500">No pending invitations</Text>
                                    </div>
                                </Paper>
                            )}
                        </div>
                    </Tabs.Panel>
                </Tabs>

                {/* Invite Modal */}
                <Modal 
                    opened={showInviteModal} 
                    onClose={() => setShowInviteModal(false)}
                    title={<Text className="font-bold text-lg">Invite New User</Text>}
                    centered
                    classNames={{
                        content: 'rounded-lg',
                        header: 'border-b border-gray-200 pb-4',
                        body: 'pt-4'
                    }}
                >
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Email Address
                            </label>
                            <TextInput
                                placeholder="user@example.com"
                                value={newInvite.email}
                                onChange={(e) => setNewInvite({ ...newInvite, email: e.target.value })}
                                required
                                classNames={{
                                    input: 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                                }}
                            />
                        </div>

                        <div>
                            <Text className="text-sm font-medium text-gray-700 mb-3">Permissions</Text>
                            <Grid>
                                {permissionOptions.map(perm => (
                                    <Grid.Col key={perm} span={6}>
                                        <Checkbox
                                            label={perm}
                                            checked={newInvite.permissions.includes(perm)}
                                            onChange={() => togglePermission(perm)}
                                            classNames={{
                                                label: 'text-gray-700 cursor-pointer'
                                            }}
                                        />
                                    </Grid.Col>
                                ))}
                            </Grid>
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <Button 
                                variant="light"
                                onClick={() => setShowInviteModal(false)}
                                className="border border-gray-300 text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </Button>
                            <Button 
                                onClick={handleSendInvite}
                                disabled={!newInvite.email || newInvite.permissions.length === 0}
                                className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Send Invite
                            </Button>
                        </div>
                    </div>
                </Modal>
            </div>
        </div>
    );
};

export default DashboardUser;