//@ts-check

import React from "react"
import { useErrorMessage } from "../../../hooks/useMessage"
import { listProjectDistinctValues, paginateProjectLogs } from "../../../api/project"
import ModalLogDetail from "../ModalLogDetail"
import ModalTimeline from "../ModalTimeline"
import { sanitizeObject } from "../../../utils/function"

const useTabLogs = ({ project }) => {

    const fields = [
        ...project?.settings?.indexes || [],
        "level",
        "device.type"
    ]

    const [isLoading, setIsLoading] = React.useState(true)
    const [isFieldLoading, setIsFieldLoading] = React.useState(false)

    const [page, setPage] = React.useState(1)
    const [filter, setFilter] = React.useState({
        field: "",
        value: ""
    })

    const [fieldValues, setFieldValues] = React.useState([])

    const [list, setList] = React.useState({})
    const [sortConfig, setSortConfig] = React.useState({ key: null, direction: 'asc' });

    // Add state for column visibility
    const [visibleColumns, setVisibleColumns] = React.useState(
        fields?.sort((a, b) => a?.localeCompare(b))?.reduce((acc, col) => {
            acc[col] = true;
            return acc;
        }, {}) || {}
    );

    // Toggle function
    const toggleColumn = (columnName) => {
        setVisibleColumns(prev => ({
            ...prev,
            [columnName]: !prev[columnName]
        }));
    };

    const [detailModalProps, setDetailModalProps] = React.useState({
        opened: false,
        log: null,
    });

    const closeDetailModal = () => {
        setDetailModalProps((prev) => ({ ...prev, opened: false }));
    };

    const DetailModalComponent = () =>
        React.createElement(ModalLogDetail, { ...detailModalProps, onClose: closeDetailModal });

    const openDetailModal = (/** @type {any} */ log) => {
        setDetailModalProps({
            opened: true,
            log
        });
    };

    const [timelineModalProps, setTimelineModalProps] = React.useState({
        opened: false,
        logKey: "",
        projectId: project?.id,
    });

    const closeTimelineModal = () => {
        setTimelineModalProps((prev) => ({ ...prev, opened: false }));
    };

    const TimelineModalComponent = () =>
        React.createElement(ModalTimeline, { ...timelineModalProps, onClose: closeTimelineModal });

    const openTimelineModal = (/** @type {any} */ logKey) => {
        setTimelineModalProps({
            opened: true,
            logKey,
            projectId: project?.id,
        });
    };


    const ErrorMessage = useErrorMessage()

    // Create new controller for each fetch to allow proper cancellation
    const logsControllerRef = React.useRef(null)
    const fieldValuesControllerRef = React.useRef(null)


    const fetchData = React.useCallback(async () => {

        if (filter?.field && !filter?.value) {
            return
        }


        // Cancel previous request if still pending
        if (logsControllerRef.current) {
            logsControllerRef.current.abort()
        }

        logsControllerRef.current = new AbortController()

        try {
            setIsLoading(true)
            const l = await paginateProjectLogs(
                logsControllerRef.current.signal,
                project?.id,
                sanitizeObject({
                    filterField: filter?.field,
                    filterValue: filter?.value === "All" ? "" : filter?.value,
                    page,
                    sortBy: sortConfig?.key ? `${sortConfig.key}:${sortConfig.direction}` : undefined
                })
            )
            setList(l)

        } catch (e) {
            // Don't show error for aborted requests
            if (e.name !== 'AbortError') {
                ErrorMessage(e)
            }
        } finally {
            setIsLoading(false)
        }
    }, [ErrorMessage, page, project, filter?.field, filter?.value, sortConfig])

    // Separate effect for fetching field values
    React.useEffect(() => {
        const fetchFieldValues = async () => {
            if (!filter?.field) {
                setFieldValues([])
                return
            }
            setIsFieldLoading(true)
            try {
                const f = await listProjectDistinctValues(
                    fieldValuesControllerRef.current?.signal,
                    project?.id,
                    filter?.field
                )
                setFieldValues(f?.sort((a, b) => a?.localeCompare(b)))
            } catch (e) {
                if (e.name !== 'AbortError') {
                    console.error('Error fetching field values:', e)
                }
                setFieldValues([])
            } finally {
                setIsFieldLoading(false)
            }
        }

        fetchFieldValues()
    }, [filter?.field, project?.id])


    React.useEffect(() => {
        fetchData()

        // Cleanup: abort on unmount
        return () => {

            if (logsControllerRef.current) {
                logsControllerRef.current.abort()
            }

            if (fieldValuesControllerRef.current) {
                fieldValuesControllerRef.current.abort()
            }
        }
    }, [fetchData])

    const SortIcon = ({ column }) => {
        if (sortConfig.key !== column) return null;
        return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
    };

    const handleSort = (key) => {
        setSortConfig(prevConfig => ({
            key,
            direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
        }));
    };


    return {
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
        filter,
        fields,
        setFilterField: (field) => {
            setFilter({ field, value: null }),
            setFieldValues([])
        }, // Reset value when field changes
        setFilterValue: (value) => setFilter(prev => ({ ...prev, value })), // Keep field when value changes
        fieldValues,
    }
}

export default useTabLogs