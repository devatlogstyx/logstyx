// @ts-check
const {
  HttpError,
  HttpResponse,
} = require("common/function");
const {
  SUCCESS_ERR_CODE,
  SUCCESS_ERR_MESSAGE,
  NO_ACCESS_ERR_CODE,
  NO_ACCESS_ERR_MESSAGE,
  NOT_FOUND_ERR_CODE,
  NOT_FOUND_ERR_MESSAGE,
  FORBIDDEN_ERR_CODE,
  PRIVATE_REPORT_VISIBILITY,
  WRITE_REPORT_USER_ROLE,
  READ_REPORT_USER_ROLE,
} = require("common/constant");

const {
  createReport,
  paginateReports,
  getReportBySlug,
  updateReport,
  deleteReport,
  createWidget,
  listWidgets,
  updateWidget,
  deleteWidget,
  executeWidgetQuery,
  findWidgetById,
  findReportById,

} = require("../service/report");
const { getWidgetDataCache } = require("../../shared/cache");
const { canUserDo } = require("../../shared/provider/auth.service");
const { getLogModel } = require("../service/logger");

module.exports = {
  /**
   * 
   * @param {*} req 
   * @param {*} res 
   */
  async ReportCreate(req, res) {
    if (!req?.user) {
      throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE);
    }

    const haveWriteAccess = await canUserDo(req?.user?.id, WRITE_REPORT_USER_ROLE)
    if (!haveWriteAccess) {
      throw HttpError(FORBIDDEN_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
    }

    const data = await createReport(req.user.id, req.body || {});
    HttpResponse(res).json({ error: SUCCESS_ERR_CODE, message: SUCCESS_ERR_MESSAGE, data });
  },
  /**
   * 
   * @param {*} req 
   * @param {*} res 
   */
  async ReportPaginate(req, res) {
    if (!req?.user) {
      throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE);
    }

    const haveWriteAccess = await canUserDo(req?.user?.id, READ_REPORT_USER_ROLE)
    if (!haveWriteAccess) {
      throw HttpError(FORBIDDEN_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
    }

    const { search, visibility, sortBy, page, limit } = req.query || {};
    const data = await paginateReports({ search, visibility }, sortBy, limit, page);
    HttpResponse(res).json({ error: SUCCESS_ERR_CODE, message: SUCCESS_ERR_MESSAGE, data });
  },

  /**
   * 
   * @param {*} req 
   * @param {*} res 
   */
  async ReportGetBySlug(req, res) {
    const report = await getReportBySlug(req?.params?.slug);
    if (!report) throw HttpError(NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE);
    if (report.visibility === PRIVATE_REPORT_VISIBILITY) {
      if (!req?.user) {
        throw HttpError(FORBIDDEN_ERR_CODE, NO_ACCESS_ERR_MESSAGE);
      }
    }
    const widgets = await listWidgets(report, true);
    HttpResponse(res).json({ error: SUCCESS_ERR_CODE, message: SUCCESS_ERR_MESSAGE, data: { ...report, id: report._id?.toString?.() || report.id, widgets } });
  },
  /**
   * 
   * @param {*} req 
   * @param {*} res 
   */

  async ReportUpdate(req, res) {
    if (!req?.user) throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE);

    const haveWriteAccess = await canUserDo(req?.user?.id, WRITE_REPORT_USER_ROLE)
    if (!haveWriteAccess) {
      throw HttpError(FORBIDDEN_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
    }

    const data = await updateReport(req.params.id, req.body || {});
    HttpResponse(res).json({ error: SUCCESS_ERR_CODE, message: SUCCESS_ERR_MESSAGE, data });
  },

  /**
   * 
   * @param {*} req 
   * @param {*} res 
   */
  async ReportRemove(req, res) {
    if (!req?.user) throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE);

    const haveWriteAccess = await canUserDo(req?.user?.id, WRITE_REPORT_USER_ROLE)
    if (!haveWriteAccess) {
      throw HttpError(FORBIDDEN_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
    }

    await deleteReport(req.params.id);
    HttpResponse(res).json({ error: SUCCESS_ERR_CODE, message: SUCCESS_ERR_MESSAGE });
  },

  /**
   * 
   * @param {*} req 
   * @param {*} res 
   */
  async WidgetCreate(req, res) {
    if (!req?.user) throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE);

    const haveWriteAccess = await canUserDo(req?.user?.id, WRITE_REPORT_USER_ROLE)
    if (!haveWriteAccess) {
      throw HttpError(FORBIDDEN_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
    }

    const data = await createWidget(req.params.reportId, req.body || {});
    HttpResponse(res).json({ error: SUCCESS_ERR_CODE, message: SUCCESS_ERR_MESSAGE, data });
  },

  /**
   * 
   * @param {*} req 
   * @param {*} res 
   */
  async WidgetList(req, res) {
    const report = await findReportById(req.params.reportId);
    if (!report) throw HttpError(NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE);
    if (report.visibility === PRIVATE_REPORT_VISIBILITY) {
      if (!req?.user) {
        throw HttpError(FORBIDDEN_ERR_CODE, NO_ACCESS_ERR_MESSAGE);
      }
    }
    const widgets = await listWidgets(report, true);
    HttpResponse(res).json({ error: SUCCESS_ERR_CODE, message: SUCCESS_ERR_MESSAGE, data: widgets });
  },

  /**
   * 
   * @param {*} req 
   * @param {*} res 
   */
  async WidgetUpdate(req, res) {
    if (!req?.user) throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE);

    const haveWriteAccess = await canUserDo(req?.user?.id, WRITE_REPORT_USER_ROLE)
    if (!haveWriteAccess) {
      throw HttpError(FORBIDDEN_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
    }

    const data = await updateWidget(req.params.id, req.body || {}, getLogModel);
    HttpResponse(res).json({ error: SUCCESS_ERR_CODE, message: SUCCESS_ERR_MESSAGE, data });
  },

  /**
   * 
   * @param {*} req 
   * @param {*} res 
   */
  async WidgetRemove(req, res) {
    if (!req?.user) throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE);

    const haveWriteAccess = await canUserDo(req?.user?.id, WRITE_REPORT_USER_ROLE)
    if (!haveWriteAccess) {
      throw HttpError(FORBIDDEN_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
    }

    await deleteWidget(req.params.id);
    HttpResponse(res).json({ error: SUCCESS_ERR_CODE, message: SUCCESS_ERR_MESSAGE });
  },

  /**
   * 
   * @param {*} req 
   * @param {*} res 
   * @returns 
   */
  async WidgetData(req, res) {
    const report = await getReportBySlug(req.params.slug);
    if (!report) throw HttpError(NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE);
    if (report.visibility === PRIVATE_REPORT_VISIBILITY) {
      if (!req?.user) {
        throw HttpError(FORBIDDEN_ERR_CODE, NO_ACCESS_ERR_MESSAGE);
      }
    }

    const widget = await findWidgetById(req.params.widgetId);
    if (!widget || widget.report?.toString() !== report.id) {
      throw HttpError(NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE);
    }

    const cachedData = await getWidgetDataCache(widget?.id);
    if (cachedData) {
      HttpResponse(res).json({ error: SUCCESS_ERR_CODE, message: SUCCESS_ERR_MESSAGE, data: cachedData });
      return;
    }

    const data = await executeWidgetQuery(widget, getLogModel);
    HttpResponse(res).json({ error: SUCCESS_ERR_CODE, message: SUCCESS_ERR_MESSAGE, data });
  },
}
