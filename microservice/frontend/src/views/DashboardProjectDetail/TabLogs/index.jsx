//@ts-check

import { ActionIcon, Badge, Button, Code, Loader, Menu, Pagination, Select, Table, Tooltip } from "@mantine/core"
import { getLevelColor, getNestedValue } from "../../../utils/function"
import { FiActivity, FiCheck, FiColumns, FiInfo, FiMoreVertical, FiPlus, FiX } from "react-icons/fi"
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
        list,
        isLoading,
        isFieldLoading,
        page,
        setPage,
        DetailModalComponent,
        openDetailModal,
        TimelineModalComponent,
        openTimelineModal,
        SortIcon,
        handleSort,
        visibleColumns,
        toggleColumn,
        filters,
        fields,
        addFilter,
        removeFilter,
        updateFilterField,
        updateFilterValue,
        fieldValues,
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
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                            {/* Column visibility menu */}
                            <Menu shadow="md" width={200}>
                                <Menu.Target>
                                    <Button variant="subtle" size="sm" fullWidth className="sm:w-auto">
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

                            <Button
                                variant="light"
                                size="sm"
                                onClick={addFilter}
                                fullWidth
                                className="sm:w-auto"
                            >
                                <FiPlus className="w-4 h-4 mr-2" />
                                Add Filter
                            </Button>
                        </div>

                        {/* Filter rows */}
                        <div className="flex flex-col gap-3">
                            {filters.map((filter, index) => (
                                <div key={filter.id} className="flex flex-col sm:flex-row gap-2 p-3 sm:p-0 bg-gray-50 sm:bg-transparent rounded-lg sm:rounded-none">
                                    <Select
                                        placeholder="Filter field"
                                        data={fields}
                                        value={filter.field}
                                        onChange={(value) => updateFilterField(filter.id, value)}
                                        className="w-full sm:w-52"
                                        size="sm"
                                    />

                                    <Select
                                        disabled={!filter.field || isFieldLoading[filter.id]}
                                        placeholder={`Filter by ${filter.field || 'value'}`}
                                        data={["All", ...(fieldValues[filter.id] || [])]}
                                        value={filter.value || undefined}
                                        onChange={(value) => updateFilterValue(filter.id, value)}
                                        className="w-full sm:w-52"
                                        limit={99}
                                        searchable
                                        size="sm"
                                    />

                                    <Button
                                        variant="subtle"
                                        color="red"
                                        size="sm"
                                        onClick={() => removeFilter(filter.id)}
                                        className="sm:w-auto"
                                    >
                                        <FiX className="w-4 h-4 sm:mr-0" />
                                        <span className="sm:hidden ml-2">Remove Filter</span>
                                    </Button>
                                </div>
                            ))}
                        </div>
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