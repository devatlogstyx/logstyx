import {
    Title,
    Text,
    Paper,
    Tabs,

} from '@mantine/core';
import {
    FiUsers,
    FiMail,
} from 'react-icons/fi';

import useDashboardUser from './hook';
import CreateUserInvitation from './CreateUserInvitation';
import TabUser from './TabUser';
import TabUserInvitation from './TabUserInvitation';

const DashboardUser = () => {
    const {
        users,
        activeTab,
        changeTab,
        invitations,
        refetchData
    } = useDashboardUser()


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
                    <CreateUserInvitation
                        onCreate={refetchData}
                    />
                </Paper>

                {/* Tabs */}
                <Tabs value={activeTab} onChange={changeTab}>
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
                        <TabUser
                            users={users}
                            onDelete={refetchData}
                        />
                    </Tabs.Panel>

                    {/* Invitations Panel */}
                    <Tabs.Panel value="invitations" className="pt-6">
                        <TabUserInvitation
                            invitations={invitations}
                            onDelete={refetchData}
                        />
                    </Tabs.Panel>
                </Tabs>

            </div>
        </div>
    );
};

export default DashboardUser;