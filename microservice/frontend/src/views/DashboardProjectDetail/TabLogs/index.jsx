//@ts-check

import { ActionIcon, Badge, Button, Code, Loader, Menu, Pagination, Select, Table, Tooltip } from "@mantine/core"
import { getLevelColor, getNestedValue } from "../../../utils/function"
import { FiActivity, FiCheck, FiColumns, FiInfo, FiMoreVertical } from "react-icons/fi"
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
        isFieldLoading,
        list,
        page,
        fields,
        fieldValues,
        filter,
        setFilterField,
        setFilterValue,
        setPage,
        DetailModalComponent,
        openDetailModal,
        TimelineModalComponent,
        openTimelineModal,
        handleSort,
        SortIcon,
        visibleColumns,
        toggleColumn
    } = useTabLogs({
        project
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
                    <div className="flex gap-2">
                        {/* Column visibility menu */}
                        <Menu shadow="md" width={200}>
                            <Menu.Target>
                                <Button variant="subtle" size="sm">
                                    <FiColumns className="w-4 h-4 mr-2" />
                                    Columns
                                </Button>
                            </Menu.Target>
                            <Menu.Dropdown>
                                <Menu.Label>Toggle Columns</Menu.Label>
                                {project?.settings?.indexes?.map((col) => (
                                    <Menu.Item
                                        key={col}
                                        onClick={() => toggleColumn(col)}
                                        leftSection={visibleColumns[col] ? <FiCheck /> : null}
                                    >
                                        {col}
                                    </Menu.Item>
                                ))}
                            </Menu.Dropdown>
                        </Menu>

                        <Select
                            placeholder={`Filter`}
                            data={fields}
                            value={filter?.field}
                            onChange={setFilterField}
                            className="w-52"
                        />

                        <Select
                            
                            disabled={!filter?.field || isFieldLoading}
                            placeholder={`Filter by ${filter?.field}`}
                            data={["All", ...fieldValues]}
                            value={filter?.value || undefined}
                            onChange={setFilterValue}
                            className="w-52"
                            limit={99}
                            searchable
                        />
                    </div>
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
                            {project?.settings?.indexes?.map((n) =>
                                visibleColumns[n] && (
                                    <Th
                                        key={n}
                                        onClick={() => handleSort(n)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        {n}<SortIcon column={n} />
                                    </Th>
                                )
                            )}
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
                                {project?.settings?.indexes?.map((n) =>
                                    visibleColumns[n] && (
                                        <Td key={n} className="max-w-xs truncate">
                                            {getNestedValue(log, n)}
                                        </Td>
                                    )
                                )}
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