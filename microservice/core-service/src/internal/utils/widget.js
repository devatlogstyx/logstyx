const { hashString } = require("common/function");
const { validateCustomIndex } = require("./helper");

const VALID_VISUAL_TYPES = ['number', 'pie', 'bar', 'line'];
const VALID_AGGREGATION_TYPES = ['total', 'timeline'];
const VALID_OPERATORS = ['eq', 'ne', 'in', 'nin', 'exists', 'gt', 'gte', 'lt', 'lte'];
const VALID_FILTER_LOGIC = ['AND', 'OR'];
const VALID_TIME_INTERVALS = ['minute', 'hour', 'day', 'week', 'month'];
const VALID_DATE_RANGE_TYPES = ['none', 'absolute', 'relative'];
const VALID_TIME_UNITS = ['minutes', 'hours', 'days', 'weeks', 'months'];


/**
 * Generate MongoDB aggregation pipeline for log widgets
 * FIXED: Timeline aggregations now properly handle filters using $lookup
 */
function generateWidgetPipeline(projectId, config) {
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
        pipeline = buildTimelineWithFilters(projectId, config);
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
function buildTimelineWithFilters(projectId, config) {
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
            const isCustomIndex = validateCustomIndex(filter?.field);
            const field = isCustomIndex ? convertToHashField(filter.field) : filter.field;
            const value = isCustomIndex ? hashString(filter.value, filter?.field) : filter.value;

            return buildFilterCondition(field, filter.operator, value, filter?.field);
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
            from: `Logstamp_${projectId}`, // Your logstamp collection name
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
            const isCustomIndex = validateCustomIndex(filter?.field);
            const field = isCustomIndex ? convertToHashField(filter.field) : filter.field;
            const value = isCustomIndex ? hashString(filter.value, filter?.field) : filter.value;

            return buildFilterCondition(field, filter.operator, value, filter?.field);
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

/**
 * Main validation function
 * @param {Object} config - Widget configuration object
 * @returns {Object} { valid: boolean, errors: string[] }
 */
function validateWidgetConfig(config) {
    const errors = [];

    if (!config) {
        return { valid: false, errors: ['Config is required'] };
    }

    // Validate all aspects of config
    validateVisualType(config, errors);
    validateAggregationType(config, errors);
    validateGroupBy(config, errors);
    validateFilters(config, errors);
    validateFilterLogic(config, errors);
    validateDateRange(config, errors);
    validateLimit(config, errors);
    validatePivotGroups(config, errors);

    return {
        valid: errors.length === 0,
        errors
    };
}

function validateVisualType(config, errors) {
    if (!config.visualType) {
        errors.push('visualType is required');
        return;
    }

    if (!VALID_VISUAL_TYPES.includes(config.visualType)) {
        errors.push(`visualType must be one of: ${VALID_VISUAL_TYPES.join(', ')}`);
    }
}

function validateAggregationType(config, errors) {
    if (!config.aggregationType) {
        errors.push('aggregationType is required');
        return;
    }

    if (!VALID_AGGREGATION_TYPES.includes(config.aggregationType)) {
        errors.push(`aggregationType must be one of: ${VALID_AGGREGATION_TYPES.join(', ')}`);
    }
}

function validateGroupBy(config, errors) {
    const { visualType, aggregationType, groupBy } = config;

    // groupBy.field is required for non-number visualizations in total aggregation
    if (visualType !== 'number' && aggregationType === 'total') {
        if (!groupBy || !groupBy.field) {
            errors.push('groupBy.field is required for pie/bar/line charts with total aggregation');
        }
    }

    // groupBy.timeInterval is required for timeline aggregation
    if (aggregationType === 'timeline') {
        if (!groupBy || !groupBy.timeInterval) {
            errors.push('groupBy.timeInterval is required for timeline aggregation');
            return;
        }

        if (!VALID_TIME_INTERVALS.includes(groupBy.timeInterval)) {
            errors.push(`groupBy.timeInterval must be one of: ${VALID_TIME_INTERVALS.join(', ')}`);
        }
    }

    // Validate groupBy.field if present
    if (groupBy && groupBy.field) {
        if (typeof groupBy.field !== 'string' || groupBy.field.trim() === '') {
            errors.push('groupBy.field must be a non-empty string');
        }
    }
}

function validateFilters(config, errors) {
    if (!config.filters) {
        return; // filters are optional
    }

    if (!Array.isArray(config.filters)) {
        errors.push('filters must be an array');
        return;
    }

    config.filters.forEach((filter, index) => {
        if (!filter.field) {
            errors.push(`Filter at index ${index}: field is required`);
        } else if (typeof filter.field !== 'string' || filter.field.trim() === '') {
            errors.push(`Filter at index ${index}: field must be a non-empty string`);
        }

        if (!filter.operator) {
            errors.push(`Filter at index ${index}: operator is required`);
        } else if (!VALID_OPERATORS.includes(filter.operator)) {
            errors.push(`Filter at index ${index}: operator must be one of: ${VALID_OPERATORS.join(', ')}`);
        }

        if (filter.value === undefined) {
            errors.push(`Filter at index ${index}: value is required`);
        }

        // Validate value type for specific operators
        if (['in', 'nin'].includes(filter.operator)) {
            if (!Array.isArray(filter.value) && typeof filter.value !== 'string') {
                errors.push(`Filter at index ${index}: value must be an array or string for 'in'/'nin' operators`);
            }
        }

        if (filter.operator === 'exists') {
            if (typeof filter.value !== 'boolean' && filter.value !== 'true' && filter.value !== 'false') {
                errors.push(`Filter at index ${index}: value must be boolean for 'exists' operator`);
            }
        }

        if (['gt', 'gte', 'lt', 'lte'].includes(filter.operator)) {
            if (typeof filter.value !== 'number' && !(filter.value instanceof Date) && isNaN(Date.parse(filter.value))) {
                errors.push(`Filter at index ${index}: value must be a number or valid date for comparison operators`);
            }
        }
    });
}

function validateFilterLogic(config, errors) {
    if (config.filterLogic && !VALID_FILTER_LOGIC.includes(config.filterLogic)) {
        errors.push(`filterLogic must be one of: ${VALID_FILTER_LOGIC.join(', ')}`);
    }
}

function validateDateRange(config, errors) {
    if (!config.dateRange) {
        return; // dateRange is optional
    }

    const { dateRange } = config;

    if (!dateRange.type) {
        errors.push('dateRange.type is required when dateRange is specified');
        return;
    }

    if (!VALID_DATE_RANGE_TYPES.includes(dateRange.type)) {
        errors.push(`dateRange.type must be one of: ${VALID_DATE_RANGE_TYPES.join(', ')}`);
        return;
    }

    if (dateRange.type === 'absolute') {
        if (!dateRange.absolute) {
            errors.push('dateRange.absolute is required when type is "absolute"');
            return;
        }

        const { start, end } = dateRange.absolute;

        if (start && isNaN(Date.parse(start))) {
            errors.push('dateRange.absolute.start must be a valid date');
        }

        if (end && isNaN(Date.parse(end))) {
            errors.push('dateRange.absolute.end must be a valid date');
        }

        if (start && end && new Date(start) > new Date(end)) {
            errors.push('dateRange.absolute.start must be before end');
        }
    }

    if (dateRange.type === 'relative') {
        if (!dateRange.relative) {
            errors.push('dateRange.relative is required when type is "relative"');
            return;
        }

        const { value, unit } = dateRange.relative;

        if (value === undefined || value === null) {
            errors.push('dateRange.relative.value is required');
        } else if (typeof value !== 'number' || value <= 0) {
            errors.push('dateRange.relative.value must be a positive number');
        }

        if (!unit) {
            errors.push('dateRange.relative.unit is required');
        } else if (!VALID_TIME_UNITS.includes(unit)) {
            errors.push(`dateRange.relative.unit must be one of: ${VALID_TIME_UNITS.join(', ')}`);
        }
    }
}

function validateLimit(config, errors) {
    if (config.limit !== undefined && config.limit !== null) {
        if (typeof config.limit !== 'number' || config.limit < 1 || !Number.isInteger(config.limit)) {
            errors.push('limit must be a positive integer');
        }
    }
}

function validatePivotGroups(config, errors) {
    if (config.pivotGroups !== undefined && config.pivotGroups !== null) {
        if (typeof config.pivotGroups !== 'boolean') {
            errors.push('pivotGroups must be a boolean');
        }

        // pivotGroups only makes sense with timeline + groupBy.field
        if (config.pivotGroups && config.aggregationType === 'timeline') {
            if (!config.groupBy || !config.groupBy.field) {
                errors.push('pivotGroups requires groupBy.field to be specified');
            }
        }
    }
}

module.exports = {
    generateWidgetPipeline,
    convertToHashField,
    resolveDateRange,
    sanitizeFieldName,
    validateWidgetConfig
};