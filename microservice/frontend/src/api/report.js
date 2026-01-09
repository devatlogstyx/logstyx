//@ts-check
import Axios from './AxiosClient';

export const createReport = async (signal, payload) => {
  const { data } = await Axios.post(`/v1/reports`, payload, { signal });
  return data?.data;
}

export const paginateReports = async (signal, params) => {
  const { data } = await Axios.get(`/v1/reports`, { signal, params });
  return data?.data;
}

export const getReportBySlug = async (signal, slug) => {
  const { data } = await Axios.get(`/v1/reports/${slug}`, { signal });
  return data?.data;
}

export const updateReport = async (signal, id, payload) => {
  const { data } = await Axios.put(`/v1/reports/${id}`, payload, { signal });
  return data?.data;
}

export const deleteReport = async (signal, id) => {
  const { data } = await Axios.delete(`/v1/reports/${id}`, { signal });
  return data?.data;
}

export const createWidget = async (signal, reportId, payload) => {
  const { data } = await Axios.post(`/v1/reports/${reportId}/widgets`, payload, { signal });
  return data?.data;
}

export const listWidgets = async (signal, reportId) => {
  const { data } = await Axios.get(`/v1/reports/${reportId}/widgets`, { signal });
  return data?.data;
}

export const updateWidget = async (signal, id, payload) => {
  const { data } = await Axios.put(`/v1/reports/widgets/${id}`, payload, { signal });
  return data?.data;
}

export const deleteWidget = async (signal, id) => {
  const { data } = await Axios.delete(`/v1/reports/widgets/${id}`, { signal });
  return data?.data;
}

export const getWidgetData = async (signal, slug, widgetId) => {
  const { data } = await Axios.get(`/v1/reports/${slug}/widgets/${widgetId}/data`, { signal });
  return data?.data;
}
