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
    ]

    const [isLoading, setIsLoading] = React.useState(true)
    const [isFieldLoading, setIsFieldLoading] = React.useState({}) // Changed to object to track each filter

    const [page, setPage] = React.useState(1)

    // Changed to array of filters
    const [filters, setFilters] = React.useState([])

    // Changed to object keyed by filter id
    const [fieldValues, setFieldValues] = React.useState({})

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
    const fieldValuesControllersRef = React.useRef({})

    // Add filter
    const addFilter = () => {
        setFilters(prev => [...prev, { id: Date.now(), field: "", value: "" }])
    }

    // Remove filter
    const removeFilter = (filterId) => {
        setFilters(prev => prev.filter(f => f.id !== filterId))
        setFieldValues(prev => {
            const newValues = { ...prev }
            delete newValues[filterId]
            return newValues
        })
    }

    // Update filter field
    const updateFilterField = (filterId, field) => {
        setFilters(prev => prev.map(f =>
            f.id === filterId ? { ...f, field, value: "" } : f
        ))
        setFieldValues(prev => {
            const newValues = { ...prev }
            delete newValues[filterId]
            return newValues
        })
    }

    // Update filter value
    const updateFilterValue = (filterId, value) => {
        setFilters(prev => prev.map(f =>
            f.id === filterId ? { ...f, value } : f
        ))
    }

    const fetchData = React.useCallback(async () => {
        // Check if any filter has a field but no value
        const hasIncompleteFilter = filters.some(f => !f.field || f.value === "All" || !f.value)
        if (hasIncompleteFilter && filters?.length > 0) {
            return
        }

        // Cancel previous request if still pending
        if (logsControllerRef.current) {
            logsControllerRef.current.abort()
        }

        logsControllerRef.current = new AbortController()

        try {
            setIsLoading(true)

            // Build filter arrays for API call
            const filterFields = []
            const filterValues = []

            filters.forEach((filter) => {
                if (filter.field && filter.value && filter.value !== "All") {
                    filterFields.push(filter.field)
                    filterValues.push(filter.value)
                }
            })

            const l = await paginateProjectLogs(
                logsControllerRef.current.signal,
                project?.id,
                sanitizeObject({
                    filterField: filterFields.length > 0 ? filterFields : undefined,
                    filterValue: filterValues.length > 0 ? filterValues : undefined,
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
    }, [ErrorMessage, page, project, filters, sortConfig])

    // Fetch field values for each filter
    React.useEffect(() => {
        const fetchAllFieldValues = async () => {
            for (const filter of filters) {
                if (!filter.field) {
                    setFieldValues(prev => {
                        const newValues = { ...prev }
                        delete newValues[filter.id]
                        return newValues
                    })
                    continue
                }

                setIsFieldLoading(prev => ({ ...prev, [filter.id]: true }))

                try {
                    // Cancel previous request for this filter
                    if (fieldValuesControllersRef.current[filter.id]) {
                        fieldValuesControllersRef.current[filter.id].abort()
                    }

                    fieldValuesControllersRef.current[filter.id] = new AbortController()

                    const f = await listProjectDistinctValues(
                        fieldValuesControllersRef.current[filter.id].signal,
                        project?.id,
                        filter.field
                    )
                    setFieldValues(prev => ({
                        ...prev,
                        [filter.id]: f?.sort((a, b) => a?.localeCompare(b))
                    }))
                } catch (e) {
                    if (e.name !== 'AbortError') {
                        console.error('Error fetching field values:', e)
                    }
                    setFieldValues(prev => {
                        const newValues = { ...prev }
                        delete newValues[filter.id]
                        return newValues
                    })
                } finally {
                    setIsFieldLoading(prev => ({ ...prev, [filter.id]: false }))
                }
            }
        }

        fetchAllFieldValues()
    }, [filters, project?.id])

    React.useEffect(() => {
        fetchData()

        // Cleanup: abort on unmount
        return () => {
            if (logsControllerRef.current) {
                logsControllerRef.current.abort()
            }

            Object.values(fieldValuesControllersRef.current).forEach(controller => {
                if (controller) controller.abort()
            })
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
        filters,
        fields,
        addFilter,
        removeFilter,
        updateFilterField,
        updateFilterValue,
        fieldValues,
        refetchData: fetchData
    }
}

export default useTabLogs