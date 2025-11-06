//@ts-check

import { ActionIcon, Badge, Code, Loader, Menu, Pagination, Select, Table } from "@mantine/core"
import { getLevelColor, getNestedValue } from "../../../utils/function"
import { FiActivity, FiInfo, FiMoreVertical } from "react-icons/fi"
const {
    Thead,
    Tbody,
    Td,
    Tr,
    Th
} = Table
import moment from "moment-timezone"
import useTabLogs from "./hooks"

const TabLogs = ({
    project,
    logStatistic = []
}) => {
    const {
        isLoading,
        list,
        page,
        setPage,
        level,
        setLevel
    } = useTabLogs({
        projectId: project?.id
    })

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen">
            <div className="text-center">
                <Loader />
            </div>
        </div>
    }
    return (
        <>
            <div className="p-6 rounded-md border shadow-sm bg-white flex flex-col gap-4">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold">Recent Logs</h3>
                    <Select
                        placeholder="Filter by level"
                        data={["All Levels", ...logStatistic.map((n) => n?.level)]}
                        defaultValue="All Levels"
                        value={level}
                        onChange={setLevel}
                        className="w-52"
                    />
                </div>
                <Table highlightOnHover>
                    <Thead>
                        <Tr>
                            <Th>Level</Th>
                            <Th>Count</Th>
                            {project?.settings?.indexes?.map((n) => {
                                return (
                                    <Th>{n}</Th>
                                )
                            })}
                            <Th>Last Seen</Th>
                            <Th></Th>
                        </Tr>
                    </Thead>
                    <Tbody>
                        {list?.results?.map((log) => (
                            <Tr key={log.key}>
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
                                {project?.settings?.indexes?.map((n) => {
                                    return (
                                        <Th>{getNestedValue(log, n)}</Th>
                                    )
                                })}
                                <Td>
                                    <span className="text-sm text-gray-500">
                                        {moment(log.lastSeen)?.fromNow()}
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
                <div className="flex justify-end">
                    <Pagination
                        total={list?.totalPages}
                        value={page}
                        onChange={setPage}
                    />
                </div>
            </div>
        </>
    )
}

export default TabLogs