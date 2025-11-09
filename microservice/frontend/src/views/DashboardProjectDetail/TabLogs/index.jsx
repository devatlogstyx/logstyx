//@ts-check

import { ActionIcon, Badge, Code, Loader, Menu, Pagination, Select, Table, Tooltip } from "@mantine/core"
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
        setLevel,
        DetailModalComponent,
        openDetailModal,
        TimelineModalComponent,
        openTimelineModal,
        handleSort,
        SortIcon
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
            <div className="p-6 rounded-md border shadow-sm bg-white flex flex-col gap-4 overflow-x-auto">
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
                            <Th onClick={() => handleSort('level')} style={{ cursor: 'pointer' }}>
                                Level<SortIcon column="level" />
                            </Th>
                            <Th onClick={() => handleSort('count')} style={{ cursor: 'pointer' }}>
                                Count<SortIcon column="count" />
                            </Th>
                            <Th onClick={() => handleSort('device.type')} style={{ cursor: 'pointer' }}>
                                Device<SortIcon column="device.type" />
                            </Th>
                            {project?.settings?.indexes?.map((n) => (
                                <Th
                                    key={n}
                                    onClick={() => handleSort(n)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    {n}<SortIcon column={n} />
                                </Th>
                            ))}
                            <Th onClick={() => handleSort('updatedAt')} style={{ cursor: 'pointer' }}>
                                Last Seen<SortIcon column="updatedAt" />
                            </Th>
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
                                <Td>
                                    <span className="font-medium truncate">{log.device?.type}</span>
                                </Td>
                                {project?.settings?.indexes?.map((n) => {
                                    return (
                                        <Th className="max-w-xs truncate">{getNestedValue(log, n)}</Th>
                                    )
                                })}
                                <Td>
                                    <span className="text-sm text-gray-500">
                                        {moment(log.updatedAt)?.fromNow()}
                                    </span>
                                </Td>
                                <Td className="space-x-2">
                                    <Tooltip label={`View detail`}>
                                        <ActionIcon variant="transparent" onClick={() => openDetailModal(log)}>
                                            <FiInfo className="w-3.5 h-3.5" />
                                        </ActionIcon>
                                    </Tooltip>
                                    <Tooltip label={`View Timeline`}>
                                        <ActionIcon variant="transparent" onClick={() => openTimelineModal(log.key)}>
                                            <FiActivity className="w-3.5 h-3.5" />
                                        </ActionIcon>
                                    </Tooltip>
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

            <DetailModalComponent />
            <TimelineModalComponent />
        </>
    )
}

export default TabLogs