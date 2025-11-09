/**
 * Generate MongoDB aggregation pipeline for log widgets
 * FIXED: Timeline aggregations now properly handle filters using $lookup
 */
function generateWidgetPipeline(config) {
    const {
        aggregationType,
        filters = [],
    } = config;

    // Determine collection strategy:
    // - Use logstamp directly ONLY if no field-based filters (date-only filters are OK)
    // - Use log + lookup to logstamp if field-based filters exist
    const hasFieldFilters = filters.some(f => f.field !== 'createdAt');
    
    let collection, pipeline;

    if (aggregationType === 'timeline' && hasFieldFilters) {
        // Timeline with field filters: Start from log, lookup to logstamp
        collection = 'log';
        pipeline = buildTimelineWithFilters(config);
    } else if (aggregationType === 'timeline') {
        // Timeline without field filters: Use logstamp directly
        collection = 'logstamp';
        pipeline = buildSimpleTimeline(config);
    } else {
        // Total aggregation: Use log collection
        collection = 'log';
        pipeline = buildTotalAggregation(config);
    }

    return { pipeline, collection };
}

/**
 * Build timeline aggregation with field-based filters
 * Strategy: log -> filter -> lookup logstamp -> aggregate by time
 */
function buildTimelineWithFilters(config) {
    const {
        filters = [],
        filterLogic = 'AND',
        groupBy,
        dateRange,
        pivotGroups = false
    } = config;

    const pipeline = [];
    const matchConditions = [];

    // Step 1: Apply date range filter on log collection
    if (dateRange) {
        const resolvedDateRange = resolveDateRange(dateRange);
        if (resolvedDateRange) {
            const dateFilter = {};
            if (resolvedDateRange.start) dateFilter.$gte = resolvedDateRange.start;
            if (resolvedDateRange.end) dateFilter.$lte = resolvedDateRange.end;
            if (Object.keys(dateFilter).length > 0) {
                matchConditions.push({ createdAt: dateFilter });
            }
        }
    }

    // Step 2: Apply field-based filters on log collection
    if (filters.length > 0) {
        const filterConditions = filters.map(filter => {
            const hashField = convertToHashField(filter.field);
            return buildFilterCondition(hashField, filter.operator, filter.value);
        });

        if (filterLogic === 'AND') {
            matchConditions.push(...filterConditions);
        } else {
            matchConditions.push({ $or: filterConditions });
        }
    }

    if (matchConditions.length > 0) {
        pipeline.push({
            $match: filterLogic === 'AND' 
                ? { $and: matchConditions }
                : matchConditions.length === 1 
                    ? matchConditions[0] 
                    : { $or: matchConditions }
        });
    }

    // Step 3: Lookup to logstamp collection for time-series data
    // We need to match by key and within the time range
    const lookupMatch = { $expr: { $eq: ['$key', '$$logKey'] } };
    
    if (dateRange) {
        const resolvedDateRange = resolveDateRange(dateRange);
        if (resolvedDateRange) {
            if (resolvedDateRange.start) {
                lookupMatch.$expr = {
                    $and: [
                        lookupMatch.$expr,
                        { $gte: ['$createdAt', resolvedDateRange.start] }
                    ]
                };
            }
            if (resolvedDateRange.end) {
                lookupMatch.$expr = {
                    $and: Array.isArray(lookupMatch.$expr.$and) 
                        ? [...lookupMatch.$expr.$and, { $lte: ['$createdAt', resolvedDateRange.end] }]
                        : [lookupMatch.$expr, { $lte: ['$createdAt', resolvedDateRange.end] }]
                };
            }
        }
    }

    pipeline.push({
        $lookup: {
            from: 'logstamps', // Your logstamp collection name
            let: { logKey: '$key' },
            pipeline: [
                { $match: lookupMatch }
            ],
            as: 'timestamps'
        }
    });

    // Step 4: Unwind timestamps to get individual time entries
    pipeline.push({
        $unwind: '$timestamps'
    });

    // Step 5: Group by time interval and optional field
    const timeInterval = groupBy?.timeInterval || 'hour';
    const groupId = buildTimeGroupId(timeInterval, '$timestamps.createdAt');
    
    if (groupBy?.field) {
        const hashField = groupBy.field === 'level' || groupBy.field === 'key' 
            ? groupBy.field 
            : convertToHashField(groupBy.field);
        
        groupId[sanitizeFieldName(hashField)] = `$${hashField}`;
    }

    pipeline.push({
        $group: {
            _id: groupId,
            count: { $sum: 1 }
        }
    });

    // Step 6: Sort by time
    pipeline.push({
        $sort: { '_id.timestamp': 1 }
    });

    // Step 7: Apply pivot or non-pivot formatting
    if (pivotGroups && groupBy?.field) {
        applyPivotFormatting(pipeline, groupBy.field);
    } else {
        applyNonPivotFormatting(pipeline, groupBy?.field);
    }

    return pipeline;
}

/**
 * Build simple timeline without field filters
 * Can use logstamp directly for better performance
 */
function buildSimpleTimeline(config) {
    const {
        groupBy,
        dateRange,
        pivotGroups = false
    } = config;

    const pipeline = [];

    // Step 1: Date range filter
    if (dateRange) {
        const resolvedDateRange = resolveDateRange(dateRange);
        if (resolvedDateRange) {
            const dateFilter = {};
            if (resolvedDateRange.start) dateFilter.$gte = resolvedDateRange.start;
            if (resolvedDateRange.end) dateFilter.$lte = resolvedDateRange.end;
            if (Object.keys(dateFilter).length > 0) {
                pipeline.push({ $match: { createdAt: dateFilter } });
            }
        }
    }

    // Step 2: Group by time
    const timeInterval = groupBy?.timeInterval || 'hour';
    const groupId = buildTimeGroupId(timeInterval, '$createdAt');

    // Note: For simple timeline, we can't group by field since logstamp doesn't have those fields
    // If groupBy.field is specified, this should use buildTimelineWithFilters instead

    pipeline.push({
        $group: {
            _id: groupId,
            count: { $sum: 1 }
        }
    });

    // Step 3: Sort by time
    pipeline.push({
        $sort: { '_id.timestamp': 1 }
    });

    // Step 4: Format output
    pipeline.push({
        $project: {
            _id: 0,
            timestamp: '$_id.timestamp',
            count: 1
        }
    });

    return pipeline;
}

/**
 * Build total aggregation (existing logic, unchanged)
 */
function buildTotalAggregation(config) {
    const {
        visualType,
        filters = [],
        filterLogic = 'AND',
        groupBy,
        dateRange,
        limit
    } = config;

    const pipeline = [];
    const matchConditions = [];

    // Date range filter
    if (dateRange) {
        const resolvedDateRange = resolveDateRange(dateRange);
        if (resolvedDateRange) {
            const dateFilter = {};
            if (resolvedDateRange.start) dateFilter.$gte = resolvedDateRange.start;
            if (resolvedDateRange.end) dateFilter.$lte = resolvedDateRange.end;
            if (Object.keys(dateFilter).length > 0) {
                matchConditions.push({ createdAt: dateFilter });
            }
        }
    }

    // Field filters
    if (filters.length > 0) {
        const filterConditions = filters.map(filter => {
            const hashField = convertToHashField(filter.field);
            return buildFilterCondition(hashField, filter.operator, filter.value);
        });

        if (filterLogic === 'AND') {
            matchConditions.push(...filterConditions);
        } else {
            matchConditions.push({ $or: filterConditions });
        }
    }

    if (matchConditions.length > 0) {
        pipeline.push({
            $match: filterLogic === 'AND' 
                ? { $and: matchConditions }
                : matchConditions.length === 1 
                    ? matchConditions[0] 
                    : { $or: matchConditions }
        });
    }

    if (visualType === 'number') {
        pipeline.push({
            $group: {
                _id: null,
                total: { $sum: '$count' }
            }
        });
        
        pipeline.push({
            $project: {
                _id: 0,
                total: 1
            }
        });
    } else {
        if (!groupBy?.field) {
            throw new Error('groupBy.field is required for pie/bar/line charts');
        }

        const hashField = groupBy.field === 'level' || groupBy.field === 'key' 
            ? groupBy.field 
            : convertToHashField(groupBy.field);

        pipeline.push({
            $group: {
                _id: `$${hashField}`,
                count: { $sum: '$count' }
            }
        });

        pipeline.push({
            $sort: { count: -1 }
        });

        if (limit && limit > 0) {
            pipeline.push({
                $limit: limit
            });
        }

        pipeline.push({
            $project: {
                _id: 0,
                label: '$_id',
                value: '$count'
            }
        });
    }

    return pipeline;
}

/**
 * Apply pivot formatting to pipeline
 */
function applyPivotFormatting(pipeline, field) {
    const hashField = field === 'level' || field === 'key' 
        ? field 
        : convertToHashField(field);
    
    const sanitizedField = sanitizeFieldName(hashField);

    pipeline.push({
        $group: {
            _id: '$_id.timestamp',
            data: {
                $push: {
                    k: `$_id.${sanitizedField}`,
                    v: '$count'
                }
            }
        }
    });

    pipeline.push({
        $project: {
            _id: 0,
            timestamp: '$_id',
            groups: { $arrayToObject: '$data' }
        }
    });

    pipeline.push({
        $replaceRoot: {
            newRoot: {
                $mergeObjects: [
                    { timestamp: '$timestamp' },
                    '$groups'
                ]
            }
        }
    });

    pipeline.push({
        $sort: { timestamp: 1 }
    });
}

/**
 * Apply non-pivot formatting to pipeline
 */
function applyNonPivotFormatting(pipeline, field) {
    const projection = {
        _id: 0,
        timestamp: '$_id.timestamp',
        count: 1
    };

    if (field) {
        const hashField = field === 'level' || field === 'key' 
            ? field 
            : convertToHashField(field);
        const sanitizedField = sanitizeFieldName(hashField);
        projection.group = `$_id.${sanitizedField}`;
    }

    pipeline.push({
        $project: projection
    });
}

/**
 * Build time-based group ID for timeline aggregations
 * @param {string} interval - Time interval
 * @param {string} dateField - Field to use for date (e.g., '$createdAt' or '$timestamps.createdAt')
 */
function buildTimeGroupId(interval, dateField = '$createdAt') {
    const base = {
        year: { $year: dateField },
        month: { $month: dateField }
    };

    switch (interval) {
        case 'minute':
            return {
                ...base,
                day: { $dayOfMonth: dateField },
                hour: { $hour: dateField },
                minute: { $minute: dateField },
                timestamp: {
                    $dateTrunc: {
                        date: dateField,
                        unit: 'minute'
                    }
                }
            };
        case 'hour':
            return {
                ...base,
                day: { $dayOfMonth: dateField },
                hour: { $hour: dateField },
                timestamp: {
                    $dateTrunc: {
                        date: dateField,
                        unit: 'hour'
                    }
                }
            };
        case 'day':
            return {
                ...base,
                day: { $dayOfMonth: dateField },
                timestamp: {
                    $dateTrunc: {
                        date: dateField,
                        unit: 'day'
                    }
                }
            };
        case 'week':
            return {
                year: { $isoWeekYear: dateField },
                week: { $isoWeek: dateField },
                timestamp: {
                    $dateTrunc: {
                        date: dateField,
                        unit: 'week'
                    }
                }
            };
        case 'month':
            return {
                ...base,
                timestamp: {
                    $dateTrunc: {
                        date: dateField,
                        unit: 'month'
                    }
                }
            };
        default:
            throw new Error(`Unsupported time interval: ${interval}`);
    }
}

// Helper functions (unchanged)
function sanitizeFieldName(field) {
    return field.replace(/\./g, '_');
}

function convertToHashField(field) {
    if (field.startsWith('hash.')) {
        return field;
    }
    if (field === 'level' || field === 'key') {
        return field;
    }
    const hashPath = field.replace(/\./g, '_');
    return `hash.${hashPath}`;
}

function buildFilterCondition(field, operator, value) {
    switch (operator) {
        case 'eq':
            return { [field]: value };
        case 'ne':
            return { [field]: { $ne: value } };
        case 'in':
            return { [field]: { $in: Array.isArray(value) ? value : [value] } };
        case 'nin':
            return { [field]: { $nin: Array.isArray(value) ? value : [value] } };
        case 'exists':
            return { [field]: { $exists: Boolean(value) } };
        case 'gt':
            return { [field]: { $gt: value } };
        case 'gte':
            return { [field]: { $gte: value } };
        case 'lt':
            return { [field]: { $lt: value } };
        case 'lte':
            return { [field]: { $lte: value } };
        default:
            throw new Error(`Unsupported operator: ${operator}`);
    }
}

function resolveDateRange(dateRange) {
    if (!dateRange || dateRange.type === 'none') {
        return null;
    }

    if (dateRange.type === 'absolute') {
        return {
            start: dateRange.absolute?.start,
            end: dateRange.absolute?.end
        };
    }

    if (dateRange.type === 'relative' && dateRange.relative) {
        const { value, unit } = dateRange.relative;
        const now = new Date();
        const start = new Date(now);

        switch (unit) {
            case 'minutes':
                start.setMinutes(start.getMinutes() - value);
                break;
            case 'hours':
                start.setHours(start.getHours() - value);
                break;
            case 'days':
                start.setDate(start.getDate() - value);
                break;
            case 'weeks':
                start.setDate(start.getDate() - (value * 7));
                break;
            case 'months':
                start.setMonth(start.getMonth() - value);
                break;
            default:
                throw new Error(`Unsupported time unit: ${unit}`);
        }

        return {
            start,
            end: now
        };
    }

    return null;
}

// Example 1: Pie chart of error logs by service (last 24 hours)
const pieChartConfig = {
    visualType: 'pie',
    aggregationType: 'total',
    groupBy: {
        field: 'context.service'
    },
    filters: [
        {
            field: 'level',
            operator: 'eq',
            value: 'error'
        }
    ],
    filterLogic: 'AND',
    dateRange: {
        type: 'relative',
        relative: {
            value: 24,
            unit: 'hours'
        }
    },
    limit: 10
};
// Expected Result:
// [
//   { label: 'auth-service', value: 245 },
//   { label: 'payment-service', value: 189 },
//   { label: 'api-gateway', value: 156 },
//   { label: 'user-service', value: 98 }
// ]

// Example 2: Line chart timeline - NON-PIVOTED (last 7 days)
const lineChartNonPivot = {
    visualType: 'line',
    aggregationType: 'timeline',
    groupBy: {
        field: 'level',
        timeInterval: 'hour'
    },
    dateRange: {
        type: 'relative',
        relative: {
            value: 7,
            unit: 'days'
        }
    },
    pivotGroups: false
};
// Expected Result:
// [
//   { timestamp: 2024-01-01T00:00:00.000Z, group: 'error', count: 45 },
//   { timestamp: 2024-01-01T00:00:00.000Z, group: 'critical', count: 12 },
//   { timestamp: 2024-01-01T00:00:00.000Z, group: 'info', count: 234 },
//   { timestamp: 2024-01-01T01:00:00.000Z, group: 'error', count: 38 },
//   { timestamp: 2024-01-01T01:00:00.000Z, group: 'critical', count: 8 },
//   { timestamp: 2024-01-01T01:00:00.000Z, group: 'info', count: 198 }
// ]

// Example 3: Line chart timeline - PIVOTED ⭐ (last 30 days)
const lineChartPivot = {
    visualType: 'line',
    aggregationType: 'timeline',
    groupBy: {
        field: 'level',
        timeInterval: 'hour'
    },
    dateRange: {
        type: 'relative',
        relative: {
            value: 30,
            unit: 'days'
        }
    },
    pivotGroups: true
};
// Expected Result:
// [
//   { timestamp: 2024-01-01T00:00:00.000Z, error: 45, critical: 12, info: 234, warning: 67 },
//   { timestamp: 2024-01-01T01:00:00.000Z, error: 38, critical: 8, info: 198, warning: 52 },
//   { timestamp: 2024-01-01T02:00:00.000Z, error: 42, critical: 15, info: 221, warning: 71 }
// ]

// Example 4: Bar chart with multiple filters - last 12 hours
const barChartConfig = {
    visualType: 'bar',
    aggregationType: 'total',
    groupBy: {
        field: 'data.userId'
    },
    filters: [
        {
            field: 'context.service',
            operator: 'eq',
            value: 'auth-service'
        },
        {
            field: 'context.service',
            operator: 'eq',
            value: 'payment-service'
        }
    ],
    filterLogic: 'OR',
    dateRange: {
        type: 'relative',
        relative: {
            value: 12,
            unit: 'hours'
        }
    },
    limit: 5
};
// Expected Result:
// [
//   { label: 'user_12345', value: 892 },
//   { label: 'user_67890', value: 745 },
//   { label: 'user_11111', value: 623 },
//   { label: 'user_22222', value: 501 },
//   { label: 'user_33333', value: 489 }
// ]

// Example 5: Total count widget (last 24 hours)
const numberConfig = {
    visualType: 'number',
    aggregationType: 'total',
    filters: [
        {
            field: 'level',
            operator: 'eq',
            value: 'error'
        },
        {
            field: 'context.environment',
            operator: 'eq',
            value: 'production'
        }
    ],
    filterLogic: 'AND',
    dateRange: {
        type: 'relative',
        relative: {
            value: 24,
            unit: 'hours'
        }
    }
};
// Expected Result:
// [
//   { total: 1247 }
// ]

// Example 6: Timeline grouped by service with pivoted data ⭐ (last 48 hours)
const serviceTimeline = {
    visualType: 'line',
    aggregationType: 'timeline',
    groupBy: {
        field: 'context.service',
        timeInterval: 'hour'
    },
    filters: [
        {
            field: 'level',
            operator: 'in',
            value: ['error', 'critical']
        }
    ],
    dateRange: {
        type: 'relative',
        relative: {
            value: 48,
            unit: 'hours'
        }
    },
    pivotGroups: true
};
// Expected Result:
// [
//   { timestamp: 2024-01-01T00:00:00.000Z, 'auth-service': 120, 'payment-service': 45, 'api-gateway': 89, 'user-service': 34 },
//   { timestamp: 2024-01-01T01:00:00.000Z, 'auth-service': 95, 'payment-service': 52, 'api-gateway': 76, 'user-service': 28 },
//   { timestamp: 2024-01-01T02:00:00.000Z, 'auth-service': 108, 'payment-service': 61, 'api-gateway': 82, 'user-service': 41 }
// ]

// Example 7: Timeline without grouping (last 7 days)
const simpleTimeline = {
    visualType: 'line',
    aggregationType: 'timeline',
    groupBy: {
        timeInterval: 'day'
    },
    dateRange: {
        type: 'relative',
        relative: {
            value: 7,
            unit: 'days'
        }
    }
};
// Expected Result:
// [
//   { timestamp: 2024-01-01T00:00:00.000Z, count: 15234 },
//   { timestamp: 2024-01-02T00:00:00.000Z, count: 14892 },
//   { timestamp: 2024-01-03T00:00:00.000Z, count: 16445 },
//   { timestamp: 2024-01-04T00:00:00.000Z, count: 15678 }
// ]

// Example 8: Using absolute date range (for historical analysis)
const absoluteDateRange = {
    visualType: 'bar',
    aggregationType: 'total',
    groupBy: {
        field: 'level'
    },
    dateRange: {
        type: 'absolute',
        absolute: {
            start: new Date('2024-01-01T00:00:00Z'),
            end: new Date('2024-01-31T23:59:59Z')
        }
    }
};
// Expected Result:
// [
//   { label: 'error', value: 12450 },
//   { label: 'warning', value: 8932 },
//   { label: 'info', value: 45678 }
// ]

// Example 9: No date range (all time)
const allTimeWidget = {
    visualType: 'number',
    aggregationType: 'total',
    filters: [
        {
            field: 'level',
            operator: 'eq',
            value: 'critical'
        }
    ],
    dateRange: {
        type: 'none'
    }
};
// Generate and log pipelines
console.log('=== Example 1: Pie Chart (Last 24h) ===');
const result1 = generateWidgetPipeline(pieChartConfig);
console.log('Collection:', result1.collection);
console.log('Pipeline:', JSON.stringify(result1.pipeline, null, 2));

console.log('\n=== Example 2: Line Chart Non-Pivoted (Last 7 days) ===');
const result2 = generateWidgetPipeline(lineChartNonPivot);
console.log('Collection:', result2.collection);
console.log('Pipeline:', JSON.stringify(result2.pipeline, null, 2));

console.log('\n=== Example 3: Line Chart Pivoted (Last 30 days) ⭐ ===');
const result3 = generateWidgetPipeline(lineChartPivot);
console.log('Collection:', result3.collection);
console.log('Pipeline:', JSON.stringify(result3.pipeline, null, 2));

console.log('\n=== Example 4: Bar Chart (Last 12h) ===');
const result4 = generateWidgetPipeline(barChartConfig);
console.log('Collection:', result4.collection);
console.log('Pipeline:', JSON.stringify(result4.pipeline, null, 2));

console.log('\n=== Example 5: Number Widget (Last 24h) ===');
const result5 = generateWidgetPipeline(numberConfig);
console.log('Collection:', result5.collection);
console.log('Pipeline:', JSON.stringify(result5.pipeline, null, 2));

console.log('\n=== Example 6: Service Timeline Pivoted (Last 48h) ⭐ ===');
const result6 = generateWidgetPipeline(serviceTimeline);
console.log('Collection:', result6.collection);
console.log('Pipeline:', JSON.stringify(result6.pipeline, null, 2));

console.log('\n=== Example 7: Simple Timeline (Last 7 days) ===');
const result7 = generateWidgetPipeline(simpleTimeline);
console.log('Collection:', result7.collection);
console.log('Pipeline:', JSON.stringify(result7.pipeline, null, 2));

console.log('\n=== Example 8: Absolute Date Range ===');
const result8 = generateWidgetPipeline(absoluteDateRange);
console.log('Collection:', result8.collection);
console.log('Pipeline:', JSON.stringify(result8.pipeline, null, 2));

console.log('\n=== Example 9: All Time (No Date Range) ===');
const result9 = generateWidgetPipeline(allTimeWidget);
console.log('Collection:', result9.collection);
console.log('Pipeline:', JSON.stringify(result9.pipeline, null, 2));


module.exports = { 
    generateWidgetPipeline, 
    convertToHashField, 
    resolveDateRange,
    sanitizeFieldName
};