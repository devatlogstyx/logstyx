//@ts-check

import { ActionIcon, Badge, Code, Menu, Select, Table } from "@mantine/core"
import { getLevelColor } from "../../../utils/function"
import { FiActivity, FiInfo, FiMoreVertical } from "react-icons/fi"
const {
    Thead,
    Tbody,
    Td,
    Tr,
    Th
} = Table

const TabLogs = ({
    logs
}) => {
    
    return (
        <>
            <div className="p-6 rounded-md border shadow-sm bg-white">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold">Recent Logs</h3>
                    <Select
                        placeholder="Filter by level"
                        data={[
                            { value: 'all', label: 'All Levels' },
                            { value: 'error', label: 'Error' },
                            { value: 'warning', label: 'Warning' },
                            { value: 'info', label: 'Info' },
                        ]}
                        defaultValue="all"
                        className="w-52"
                    />
                </div>
                <Table highlightOnHover>
                    <Thead>
                        <Tr>
                            <Th>Level</Th>
                            <Th>Count</Th>
                            <Th>Last Seen</Th>
                            <Th></Th>
                        </Tr>
                    </Thead>
                    <Tbody>
                        {logs.map((log) => (
                            <Tr key={log.id}>
                                <Td>
                                    <Badge
                                        color={getLevelColor(log.level)}
                                        variant="light"
                                    >
                                        {log.level}
                                    </Badge>
                                </Td>
                                <Td>
                                    <span className="font-medium">{log.count}</span>
                                </Td>
                               
                                <Td>
                                    <span className="text-sm text-gray-500">
                                        {log.lastSeen}
                                    </span>
                                </Td>
                                <Td>
                                    <Menu position="bottom-end">
                                        <Menu.Target>
                                            <ActionIcon>
                                                <FiMoreVertical className="w-4 h-4" />
                                            </ActionIcon>
                                        </Menu.Target>
                                        <Menu.Dropdown>
                                            <Menu.Item leftSection={<FiInfo className="w-3.5 h-3.5" />}>View Details</Menu.Item>
                                            <Menu.Item leftSection={<FiActivity className="w-3.5 h-3.5" />}>View Timeline</Menu.Item>
                                        </Menu.Dropdown>
                                    </Menu>
                                </Td>
                            </Tr>
                        ))}
                    </Tbody>
                </Table>
            </div>
        </>
    )
}

export default TabLogs