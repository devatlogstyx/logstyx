//@ts-check

const { INVALID_INPUT_ERR_CODE, WIDGET_TEMPLATES } = require("common/constant");
const { HttpError, hashString } = require("common/function");
const { sanitizeFieldName } = require("./bucket");
const { HToMs } = require("./log");

/**
 *
 * @param {string} template
 * @param {*} config
 * @returns
 */
const validateWidgetConfig = (template, config) => {
  // @ts-ignore
  const def = WIDGET_TEMPLATES[template];
  if (!def) return false;
  if (!config || typeof config !== 'object') return false;

  // Check required config fields
  for (const key of def.requiredConfig) {
    if (config[key] === undefined || config[key] === null || (typeof config[key] === 'string' && !config[key])) {
      return false;
    }
  }

  // Template-specific validation
  if (template === 'total_value') {
    const op = String(config.operation || '');
    if (!def.operations.includes(op)) return false;
    // Requires field for aggregation operations
    if (["sum", "avg", "min", "max", "latest", "first"].includes(op) && !config.field) {
      return false;
    }
  }

  if (template === 'line_chart') {
    const metric = config.metric;
    if (!metric) return false;

    // If metric is not "count", it must be "operation:field"
    if (metric !== 'count') {
      const parts = metric.split(':');
      if (parts.length !== 2 || !parts[1]) {
        return false;
      }
      const [op, field] = parts;
      if (!['sum', 'avg', 'min', 'max'].includes(op)) {
        return false;
      }
    }
  }

  if (template === 'bar_chart') {
    const metric = config.metric;
    if (!metric) return false;

    // If metric is not "count", validate format
    if (metric !== 'count') {
      const parts = metric.split(':');
      if (parts.length !== 2 || !parts[1]) {
        return false;
      }
      const [op, field] = parts;
      if (!['sum', 'avg', 'min', 'max'].includes(op)) {
        return false;
      }
    }

    // groupBy is required
    if (!config.groupBy) return false;
  }

  if (template === 'pie_chart') {
    // groupBy is required
    if (!config.groupBy) return false;

    // metric validation (optional, defaults to count)
    const metric = config.metric;
    if (metric && metric !== 'count') {
      const parts = metric.split(':');
      if (parts.length !== 2 || !parts[1]) {
        return false;
      }
      const [op, field] = parts;
      if (!['sum', 'avg'].includes(op)) {
        return false;
      }
    }
  }

  if (template === 'table') {
    // columns must be an array with at least one column
    if (!Array.isArray(config.columns) || config.columns.length === 0) {
      return false;
    }
  }

  return true;
}

/**
 *
 * @param {*} timeRange
 * @returns
 */
const buildTimeRangeFilter = (timeRange) => {
  const now = Date.now();
  let ms = 0;
  switch (timeRange) {
    case 'last_1h':
      ms = HToMs(1); break;
    case 'last_6h':
      ms = HToMs(6); break;
    case 'last_12h':
      ms = HToMs(12); break;
    case 'last_24h':
      ms = HToMs(24); break;
    case 'last_3d':
      ms = HToMs(3 * 24); break;
    case 'last_7d':
      ms = HToMs(7 * 24); break;
    case 'last_30d':
      ms = HToMs(30 * 24); break;
    default:
      ms = HToMs(24);
  }
  return { $gte: new Date(now - ms) };
}

/**
 *
 * @param {*} dateField
 * @param {*} interval
 * @returns
 */
const bucketForInterval = (dateField, interval) => {
  switch (interval) {
    case '5m': return { $dateTrunc: { date: dateField, unit: 'minute', binSize: 5 } };
    case '10m': return { $dateTrunc: { date: dateField, unit: 'minute', binSize: 10 } };
    case '15m': return { $dateTrunc: { date: dateField, unit: 'minute', binSize: 15 } };
    case '30m': return { $dateTrunc: { date: dateField, unit: 'minute', binSize: 30 } };
    case '1h': return { $dateTrunc: { date: dateField, unit: 'hour' } };
    case '1d': return { $dateTrunc: { date: dateField, unit: 'day' } };
    default: return { $dateTrunc: { date: dateField, unit: 'hour' } };
  }
}

/**
 *
 * @param {*} isoString
 * @param {*} interval
 * @returns
 */
const formatTimeLabel = (isoString, interval) => {
  const date = new Date(isoString);

  switch (interval) {
    case '5m':
    case '10m':
    case '15m':
    case '30m':
    case '1h':
      // Show time only: "14:30"
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });

    case '1d':
      // Show date: "Jan 10"
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });

    default:
      // Default to date + time: "Jan 10, 14:30"
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
  }
};

/**
 *
 * @param {*} groupBy
 * @returns
 */
const resolveGroupByField = (groupBy) => {
  if (!groupBy) return null;
  if (groupBy.startsWith('hash.') || groupBy.startsWith('raw.')) return `$${groupBy}`;
  if (groupBy.includes('.')) {
    return `$hash.${sanitizeFieldName(groupBy)}`;
  }
  return `$${groupBy}`;
}

/**
 *
 * @param {*} filters
 * @param {*} project
 * @returns
 */
const buildMongoFilterQuery = (filters = {}, project = null) => {
  /**
   *
   * @param {*} field
   * @param {*} operator
   * @param {*} val
   * @returns
   */
  const makeCond = (field, operator, val) => {
    if (field === 'level') {
      if (operator === 'ne') return { level: { $ne: val } };
      if (operator === 'contains' && typeof val === 'string') return { level: { $regex: String(val), $options: 'i' } };
      return { level: val };
    }
    const path = sanitizeFieldName(field);
    const hashKey = `hash.${path}`;
    const rawKey = `raw.${path}`;
    const isRaw = project?.settings?.rawIndexes?.includes(field);

    if (isRaw) {
      if (['gt', 'gte', 'lt', 'lte'].includes(operator)) {
        const num = isNaN(Number(val)) ? val : Number(val);
        return { [rawKey]: { [`$${operator}`]: num } };
      }
      if (operator === 'ne') return { [rawKey]: { $ne: val } };
      if (operator === 'contains' && typeof val === 'string') return { [rawKey]: { $regex: String(val), $options: 'i' } };
      return { [rawKey]: val };
    } else {
      const hashed = hashString(String(val), field);
      if (operator === 'ne') return { [hashKey]: { $ne: hashed } };
      return { [hashKey]: hashed };
    }
  };

  if (Array.isArray(filters)) {
    const andConds = [];
    for (const f of filters) {
      if (!f || !f.field) continue;
      const operator = f.operator || 'eq';
      andConds.push(makeCond(f.field, operator, f.value));
    }
    return andConds.length ? { $and: andConds } : {};
  }

  const query = {};
  if (!filters || typeof filters !== 'object') return query;
  for (const [key, value] of Object.entries(filters)) {
    Object.assign(query, makeCond(key, 'eq', value));
  }
  return query;
}

module.exports = {
  validateWidgetConfig,
  buildTimeRangeFilter,
  bucketForInterval,
  formatTimeLabel,
  resolveGroupByField,
  buildMongoFilterQuery
}
