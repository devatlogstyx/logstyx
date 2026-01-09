//@ts-check
const mongoose = require("mongoose");
const { Validator } = require("node-input-validator");
const { HttpError, createSlug, parseSortBy, num2Ceil, num2Floor, hashString } = require("common/function");
const { getProjectFromCache } = require("../../shared/cache");
const reportModel = require("../model/report.model");
const widgetModel = require("../model/widget.model");
const projectModel = require("../model/project.model");
const { getLogModel } = require("../utils/helper");
const { decryptAndDecompress } = require("common/function");
const { NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE, INVALID_INPUT_ERR_CODE, FORBIDDEN_ERR_CODE, WIDGET_TEMPLATES, PRIVATE_REPORT_VISIBILITY } = require("common/constant");

const { ObjectId } = mongoose.Types;

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
  for (const key of def.requiredConfig) {
    if (config[key] === undefined || config[key] === null || (typeof config[key] === 'string' && !config[key])) return false;
  }
  if (template === 'total_value') {
    const op = String(config.operation || '');
    if (!def.operations.includes(op)) return false;
    if (["sum", "avg", "min", "max"].includes(op) && !config.field) return false;
  }
  return true;
}

/**
 * 
 * @param {string} userId 
 * @param {*} params 
 * @returns 
 */
const createReport = async (userId, params) => {
  const v = new Validator(params, {
    title: "required|string|minLength:1|maxLength:128",
    description: "string",
    visibility: "string|in:PUBLIC,PRIVATE"
  });
  const ok = await v.check();
  if (!ok) {
    throw HttpError(INVALID_INPUT_ERR_CODE, v.errors);
  }

  const slug = createSlug(params.title);
  const exists = await reportModel.findOne({ slug });
  if (exists) {
    throw HttpError(INVALID_INPUT_ERR_CODE, "Report slug already exists");
  }

  const report = await reportModel.create({
    title: params.title,
    description: params.description,
    visibility: params.visibility || PRIVATE_REPORT_VISIBILITY,
    slug,
    createdBy: ObjectId.createFromHexString(userId)
  });
  return report.toJSON();
}

/**
 * 
 * @param {*} query 
 * @param {*} sortBy 
 * @param {*} limit 
 * @param {*} page 
 * @returns 
 */
const paginateReports = async (query = {}, sortBy = "createdAt:desc", limit = 10, page = 1) => {
  const filter = {};
  if (query.search) {
    filter.title = { $regex: String(query.search), $options: 'i' };
  }
  if (query.visibility) {
    filter.visibility = query.visibility;
  }

  limit = num2Ceil(num2Floor(limit, 1), 50);
  page = num2Floor(page, 1);
  const sort = parseSortBy(sortBy);

  const [results, totalResults] = await Promise.all([
    reportModel.find(filter).sort(sort).skip((page - 1) * limit).limit(limit),
    reportModel.countDocuments(filter)
  ]);

  return {
    results: results.map(r => ({
      id: r._id.toString(),
      title: r.title,
      slug: r.slug,
      description: r.description,
      visibility: r.visibility,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    })),
    page,
    totalResults,
    totalPages: Math.ceil(totalResults / limit)
  };
}

/**
 * 
 * @param {string} slug 
 * @returns 
 */
const getReportBySlug = async (slug) => {
  const rpt = await reportModel.findOne({ slug });
  if (!rpt) return null;
  return rpt.toJSON();
}

/**
 * 
 * @param {string} userId 
 * @param {*} id 
 * @param {*} params 
 * @returns 
 */
const updateReport = async (id, params) => {
  const rpt = await reportModel.findById(id);
  if (!rpt) throw HttpError(NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE);


  const v = new Validator(params, {
    title: "string|minLength:1|maxLength:128",
    description: "string",
    visibility: "string|in:PUBLIC,PRIVATE"
  });
  const ok = await v.check();
  if (!ok) {
    throw HttpError(INVALID_INPUT_ERR_CODE, v.errors);
  }

  const payload = {};
  if (params.title) payload.title = params.title;
  if (params.description !== undefined) payload.description = params.description;
  if (params.visibility) payload.visibility = params.visibility;
  if (params.title) payload.slug = createSlug(params.title);

  await reportModel.findByIdAndUpdate(id, { $set: payload });
  const updated = await reportModel.findById(id);
  return updated?.toJSON();
}

/**
 * 
 * @param {string} id 
 * @returns 
 */
const deleteReport = async (id) => {
  const rpt = await reportModel.findById(id);
  if (!rpt) throw HttpError(NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE);

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    await widgetModel.deleteMany({ report: rpt._id }).session(session);
    await reportModel.findByIdAndDelete(id).session(session);
    await session.commitTransaction();
  } catch (e) {
    await session.abortTransaction();
    throw e;
  } finally {
    session.endSession();
  }
  return true;
}

/**
 * 
 * @param {*} report 
 * @returns 
 */
const isReportPublic = (report) => report.visibility && report.visibility !== PRIVATE_REPORT_VISIBILITY;

/**
 * 
 * @param {*} reportId 
 * @param {*} payload 
 * @returns 
 */
const createWidget = async (reportId, payload) => {
  const rpt = await reportModel.findById(reportId);
  if (!rpt) throw HttpError(NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE);


  const v = new Validator(payload, {
    project: "required|string",
    template: "required|string|in:total_value,line_chart,bar_chart,table,pie_chart",
    title: "required|string|minLength:1|maxLength:128",
    position: "object",
    config: "required|object"
  });
  const ok = await v.check();
  if (!ok) throw HttpError(INVALID_INPUT_ERR_CODE, v.errors);

  const proj = await projectModel.findById(payload.project);
  if (!proj) throw HttpError(NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE);

  if (!validateWidgetConfig(payload.template, payload.config)) {
    throw HttpError(INVALID_INPUT_ERR_CODE, "Invalid widget config");
  }

  const created = await widgetModel.create({
    report: ObjectId.createFromHexString(reportId),
    project: ObjectId.createFromHexString(payload.project),
    template: payload.template,
    title: payload.title,
    position: payload.position || {},
    config: payload.config
  });
  return created.toJSON();
}

/**
 * 
 * @param {*} report 
 * @param {*} includeProjectInfo 
 * @returns 
 */
const listWidgets = async (report, includeProjectInfo = false) => {
  const q = widgetModel.find({ report: ObjectId.createFromHexString(report.id || report._id.toString()) });
  if (includeProjectInfo) {
    q.populate('project');
  }
  const list = await q;
  return list.map(w => {
    const json = w.toJSON();
    if (includeProjectInfo && json.project) {
      json.project = {
        id: json.project._id?.toString(),
        title: json.project.title,
        slug: json.project.slug,
        settings: json.project.settings
      };
    }
    json.id = json._id?.toString();
    delete json._id;
    return json;
  });
}

/**
 * 
 * @param {*} widgetId 
 * @param {*} payload 
 * @returns 
 */
const updateWidget = async (widgetId, payload) => {
  const w = await widgetModel.findById(widgetId);
  if (!w) throw HttpError(NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE);
  const rpt = await reportModel.findById(w.report);
  if (!rpt) throw HttpError(NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE);

  // @ts-ignore
  if (payload.template && !WIDGET_TEMPLATES[payload.template]) {
    throw HttpError(INVALID_INPUT_ERR_CODE, 'Invalid template');
  }
  if (payload.config && !(validateWidgetConfig(payload.template || w.template, payload.config))) {
    throw HttpError(INVALID_INPUT_ERR_CODE, 'Invalid widget config');
  }

  const update = {};
  if (payload.title !== undefined) update.title = payload.title;
  if (payload.position !== undefined) update.position = payload.position;
  if (payload.template !== undefined) update.template = payload.template;
  if (payload.config !== undefined) update.config = payload.config;
  if (payload.project) update.project = ObjectId.createFromHexString(payload.project);

  await widgetModel.findByIdAndUpdate(widgetId, { $set: update });
  const updated = await widgetModel.findById(widgetId);
  return updated?.toJSON();
}

/**
 * 
 * @param {string} widgetId 
 * @returns 
 */
const deleteWidget = async (widgetId) => {
  const w = await widgetModel.findById(widgetId);
  if (!w) throw HttpError(NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE);
  const rpt = await reportModel.findById(w.report);
  if (!rpt) throw HttpError(NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE);
  await widgetModel.findByIdAndDelete(widgetId);
  return true;
}

const buildMongoQuery = (filters = {}, project = null) => {
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
    const path = field.replace(/\./g, '_');
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
      ms = 60 * 60 * 1000; break;
    case 'last_24h':
      ms = 24 * 60 * 60 * 1000; break;
    case 'last_7d':
      ms = 7 * 24 * 60 * 60 * 1000; break;
    case 'last_30d':
      ms = 30 * 24 * 60 * 60 * 1000; break;
    default:
      ms = 24 * 60 * 60 * 1000;
  }
  return { $gte: new Date(now - ms) };
}

/**
 * 
 * @param {*} widget 
 * @param {*} project 
 * @returns 
 */
const executeTotalValueQuery = async (widget, project) => {
  const { log } = await getLogModel(project.id);
  const filters = buildMongoQuery(widget.config?.filters || {}, project);
  const timeFilter = widget.config?.timeRange ? { updatedAt: buildTimeRangeFilter(widget.config.timeRange) } : {};
  const query = { ...filters, ...timeFilter };
  const op = widget.config.operation;

  if (op === 'count') {
    const res = await log.aggregate([
      { $match: query },
      { $group: { _id: null, value: { $sum: '$count' } } },
      { $project: { _id: 0, value: 1 } }
    ]);
    return { value: res?.[0]?.value || 0 };
  }

  const fieldPath = widget.config.field;
  if (!fieldPath) throw HttpError(INVALID_INPUT_ERR_CODE, 'Field is required for operation');
  const isRaw = project?.settings?.rawIndexes?.includes(fieldPath);
  const field = isRaw ? `$raw.${fieldPath.replace(/\./g, '_')}` : `$raw.${fieldPath.replace(/\./g, '_')}`;

  // NEW: Latest operation
  if (op === 'latest') {
    const doc = await log.findOne(query)
      .sort({ updatedAt: -1 }) // Most recent first
      .select(`raw.${fieldPath.replace(/\./g, '_')}`)
      .lean();

    if (!doc) return { value: null };

    const rawKey = fieldPath.replace(/\./g, '_');
    return { value: doc.raw?.[rawKey] || null };
  }

  if (op === 'first') {
    const doc = await log.findOne(query)
      .sort({ updatedAt: 1 }) // Oldest first
      .select(`raw.${fieldPath.replace(/\./g, '_')}`)
      .lean();

    if (!doc) return { value: null };

    const rawKey = fieldPath.replace(/\./g, '_');
    return { value: doc.raw?.[rawKey] || null };
  }
  // Existing aggregations
  const group = {};
  switch (op) {
    case 'sum': group.value = { $sum: field }; break;
    case 'avg': group.value = { $avg: field }; break;
    case 'min': group.value = { $min: field }; break;
    case 'max': group.value = { $max: field }; break;
  }

  const res = await log.aggregate([
    { $match: query },
    { $group: { _id: null, ...group } },
    { $project: { _id: 0, value: 1 } }
  ]);

  return { value: res?.[0]?.value || 0 };
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
    case '1h': return { $dateTrunc: { date: dateField, unit: 'hour' } };
    case '1d': return { $dateTrunc: { date: dateField, unit: 'day' } };
    default: return { $dateTrunc: { date: dateField, unit: 'hour' } };
  }
}

/**
 * 
 * @param {*} widget 
 * @param {*} project 
 * @returns 
 */
const executeLineChartQuery = async (widget, project) => {
  const { logstamp } = await getLogModel(project.id);
  const timeRange = widget.config?.timeRange || 'last_24h';
  const timeMatch = { createdAt: buildTimeRangeFilter(timeRange) };
  const filters = buildMongoQuery(widget.config?.filters || {}, project);
  const match = { ...timeMatch, ...filters };
  const interval = widget.config?.groupByTime || '1h';
  const bucket = bucketForInterval('$createdAt', interval);

  const pipeline = [
    { $match: match },
    { $group: { _id: bucket, value: { $sum: 1 } } },
    { $sort: { _id: 1 } },
    { $project: { label: '$_id', value: 1, _id: 0 } }
  ];
  const res = await logstamp.aggregate(pipeline);
  const labels = res.map(r => r.label);
  const values = res.map(r => r.value);
  return { labels, values };
}

/**
 * 
 * @param {*} metric 
 * @returns 
 */
const parseMetric = (metric) => {
  if (!metric || metric === 'count') return { type: 'count' };
  if (metric.startsWith('sum:')) return { type: 'sum', field: metric.slice(4) };
  return { type: 'field', field: metric };
}

/**
 * 
 * @param {*} groupBy 
 * @returns 
 */
const resolveGroupByField = (groupBy) => {
  if (!groupBy) return null;
  if (groupBy.startsWith('hash.') || groupBy.startsWith('raw.')) return `$${groupBy}`;
  if (groupBy.includes('.')) {
    return `$hash.${groupBy.replace(/\./g, '_')}`;
  }
  return `$${groupBy}`;
}

/**
 * 
 * @param {*} widget 
 * @param {*} project 
 * @returns 
 */
const executeBarChartQuery = async (widget, project) => {
  const { log } = await getLogModel(project.id);
  const filters = buildMongoQuery(widget.config?.filters || {}, project);
  const metric = parseMetric(widget.config?.metric || 'count');
  const groupField = resolveGroupByField(widget.config?.groupBy);
  if (!groupField) throw HttpError(INVALID_INPUT_ERR_CODE, 'groupBy is required');
  const pipeline = [{ $match: filters }, { $group: { _id: groupField } }];
  if (metric.type === 'count') {
    pipeline[1].$group.value = { $sum: 1 };
  } else if (metric.type === 'sum') {
    const f = `$raw.${metric.field.replace(/\./g, '_')}`;
    pipeline[1].$group.value = { $sum: f };
  }
  pipeline.push({ $sort: { value: -1 } });
  if (widget.config?.limit) pipeline.push({ $limit: Number(widget.config.limit) });
  const res = await log.aggregate(pipeline);
  return { labels: res.map(r => r._id), values: res.map(r => r.value) };
}

const executeTableQuery = async (widget, project) => {
  const { log } = await getLogModel(project.id);
  const filters = buildMongoQuery(widget.config?.filters || {}, project);
  const sortBy = widget.config?.sortBy || 'updatedAt:desc';
  const limit = Math.min(Number(widget.config?.limit || 50), 200);
  const [field, order] = (sortBy || 'updatedAt:desc').split(':');
  const sort = { [field]: order === 'asc' ? 1 : -1 };

  const docs = await log.find(filters).sort(sort).limit(limit);
  const rows = [];
  for (const d of docs) {
    const ctx = await decryptAndDecompress(d.context);
    const data = await decryptAndDecompress(d.data);
    const row = { id: d._id.toString(), createdAt: d.createdAt, updatedAt: d.updatedAt, level: d.level };
    const columns = widget.config?.columns || [];
    for (const col of columns) {
      if (col === 'createdAt' || col === 'updatedAt' || col === 'level') continue;
      if (col.startsWith('context.')) {
        row[col] = ctx?.[col.split('.').slice(1).join('.')];
      } else if (col.startsWith('data.')) {
        row[col] = data?.[col.split('.').slice(1).join('.')];
      } else if (col.startsWith('hash.')) {
        row[col] = d.hash?.[col.split('.').slice(1).join('.')];
      }
    }
    rows.push(row);
  }
  return { rows };
}

/**
 * 
 * @param {*} widget 
 * @param {*} project 
 * @returns 
 */
const executePieChartQuery = async (widget, project) => {
  const { log } = await getLogModel(project.id);
  const filters = buildMongoQuery(widget.config?.filters || {}, project);
  const groupField = resolveGroupByField(widget.config?.groupBy);
  if (!groupField) throw HttpError(INVALID_INPUT_ERR_CODE, 'groupBy is required');
  const pipeline = [
    { $match: filters },
    { $group: { _id: groupField, value: { $sum: 1 } } },
    { $sort: { value: -1 } },
  ];
  if (widget.config?.limit) pipeline.push({ $limit: Number(widget.config.limit) });
  const res = await log.aggregate(pipeline);
  return { labels: res.map(r => r._id), values: res.map(r => r.value) };
}

const executeWidgetQuery = async (widget) => {
  const project = await getProjectFromCache(widget.project?.toString?.() || widget.project);
  if (!project) throw HttpError(NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE);
  switch (widget.template) {
    case 'total_value':
      return await executeTotalValueQuery(widget, project);
    case 'line_chart':
      return await executeLineChartQuery(widget, project);
    case 'bar_chart':
      return await executeBarChartQuery(widget, project);
    case 'table':
      return await executeTableQuery(widget, project);
    case 'pie_chart':
      return await executePieChartQuery(widget, project);
    default:
      throw HttpError(INVALID_INPUT_ERR_CODE, `Unknown template: ${widget.template}`);
  }
}

const WidgetDataCache = new Map();
const getCachedWidgetData = (widgetId) => {
  const cached = WidgetDataCache.get(String(widgetId));
  if (!cached) return null;
  const { ts, data } = cached;
  if (Date.now() - ts > 60 * 1000) {
    WidgetDataCache.delete(String(widgetId));
    return null;
  }
  return data;
}

/**
 * 
 * @param {string} widgetId 
 * @param {*} data 
 */
const setCachedWidgetData = (widgetId, data) => {
  WidgetDataCache.set(String(widgetId), { ts: Date.now(), data });
}

module.exports = {
  WIDGET_TEMPLATES,
  createReport,
  paginateReports,
  getReportBySlug,
  updateReport,
  deleteReport,
  isReportPublic,
  createWidget,
  listWidgets,
  updateWidget,
  deleteWidget,
  executeWidgetQuery,
  getCachedWidgetData,
  setCachedWidgetData,
};
