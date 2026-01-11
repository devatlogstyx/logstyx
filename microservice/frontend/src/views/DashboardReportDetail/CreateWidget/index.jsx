//@ts-check

import { Modal, Select, TextInput, Button, NumberInput, MultiSelect, Textarea } from "@mantine/core"
import FilterBuilder from "../../../component/FilterBuilder"
import PrimaryButton from "../../../component/button/PrimaryButton"
import SecondaryButton from "../../../component/button/SecondaryButton";

const CreateWidget = ({
    modalOpened,
    setModalOpened,
    onClose,
    onAddWidget,
    form,
    projects,
}) => {

    const selectedProject = projects?.find(p => String(p.id) === form.values.project);

    return (
        <>
            <PrimaryButton onClick={() => (setModalOpened ? setModalOpened(true) : (onClose && onClose()))}>Create Widget</PrimaryButton>

            <Modal opened={modalOpened} onClose={() => (setModalOpened ? setModalOpened(false) : (onClose && onClose()))} title="Manage Widget" centered size="lg">
                <form onSubmit={onAddWidget} className="space-y-4">
                    {/* Template Selection */}
                    <Select
                        label="Widget Template"
                        value={form.values.template}
                        onChange={(v) => {
                            form.setFieldValue('template', v);
                            form.setFieldValue('config', { operation: 'count', filters: [] });
                        }}
                        data={[
                            { value: 'total_value', label: 'Total Value' },
                            { value: 'line_chart', label: 'Line Chart' },
                            { value: 'bar_chart', label: 'Bar Chart' },
                            { value: 'table', label: 'Table' },
                            { value: 'pie_chart', label: 'Pie Chart' },
                        ]}
                        required
                    />

                    {/* Widget Title */}
                    <TextInput
                        label="Widget Title"
                        {...form.getInputProps('title')}
                        placeholder="e.g., Total Errors (24h)"
                        required
                    />
                    <Textarea
                        label="Description"
                        {...form.getInputProps('description')}
                        placeholder="Description"
                    />

                    {/* Project Selection */}
                    <Select
                        label="Data Source (Project)"
                        description="Which project's logs to query"
                        {...form.getInputProps('project')}
                        data={[
                            { value: '', label: 'Select Project' },
                            ...(projects || []).map(p => ({ value: String(p.id), label: p.title }))
                        ]}
                        searchable
                        required
                    />

                    {/* TOTAL VALUE CONFIG */}
                    {form.values.template === 'total_value' && (
                        <>
                            <Select
                                label="Operation"
                                {...form.getInputProps('config.operation')}
                                data={[
                                    { value: 'count', label: 'Count - Number of logs' },
                                    { value: 'sum', label: 'Sum - Total of field values' },
                                    { value: 'avg', label: 'Average - Mean of field values' },
                                    { value: 'min', label: 'Minimum - Smallest value' },
                                    { value: 'max', label: 'Maximum - Largest value' },
                                    { value: 'latest', label: 'Latest - Most recent value' },
                                    { value: 'first', label: 'First - Oldest value' },
                                ]}
                                required
                            />

                            {['sum', 'avg', 'min', 'max', 'latest', 'first'].includes(form.values.config.operation) && (
                                <Select
                                    label="Field"
                                    description="Numeric field from project's rawIndexes"
                                    placeholder="Select field"
                                    {...form.getInputProps('config.field')}
                                    data={selectedProject?.settings?.rawIndexes?.map(idx => ({
                                        value: idx,
                                        label: idx
                                    })) || []}
                                    searchable
                                    required
                                />
                            )}
                        </>
                    )}

                    {/* LINE CHART CONFIG */}
                    {form.values.template === 'line_chart' && (
                        <>
                            <div>
                                <label className="text-sm font-medium">Metric</label>
                                <div className="flex gap-2 mt-1">
                                    <Select
                                        placeholder="Operation"
                                        value={form.values.config.metricOp || 'count'}
                                        onChange={(v) => form.setFieldValue('config', {
                                            ...form.values.config,
                                            metricOp: v,
                                            metric: v === 'count' ? 'count' : `${v}:${form.values.config.metricField || ''}`
                                        })}
                                        data={[
                                            { value: 'count', label: 'Count' },
                                            { value: 'sum', label: 'Sum' },
                                            { value: 'avg', label: 'Average' },
                                            { value: 'min', label: 'Min' },
                                            { value: 'max', label: 'Max' },
                                        ]}
                                        className="w-1/3"
                                    />

                                    {form.values.config.metricOp !== 'count' && (
                                        <Select
                                            placeholder="Select field"
                                            value={form.values.config.metricField || ''}
                                            onChange={(v) => form.setFieldValue('config', {
                                                ...form.values.config,
                                                metricField: v,
                                                metric: `${form.values.config.metricOp}:${v}`
                                            })}
                                            data={selectedProject?.settings?.rawIndexes?.map(idx => ({
                                                value: idx,
                                                label: idx
                                            })) || []}
                                            searchable
                                            className="w-1/3"
                                        />
                                    )}
                                </div>
                            </div>

                            <Select
                                label="Time Interval"
                                value={form.values.config.groupByTime || '1h'}
                                onChange={(v) => form.setFieldValue('config', { ...form.values.config, groupByTime: v })}
                                data={[
                                    { value: 'none', label: 'No Grouping (Raw Data)' },
                                    { value: '5m', label: '5 Minutes' },
                                    { value: '10m', label: '10 Minutes' },
                                    { value: '15m', label: '15 Minutes' },
                                    { value: '30m', label: '30 Minutes' },
                                    { value: '1h', label: '1 Hour' },
                                    { value: '1d', label: '1 Day' },
                                ]}
                                required
                            />
                        </>
                    )}

                    {/* BAR CHART CONFIG */}
                    {form.values.template === 'bar_chart' && (
                        <>
                            <div>
                                <label className="text-sm font-medium">Metric</label>
                                <div className="flex gap-2 mt-1">
                                    <Select
                                        placeholder="Operation"
                                        value={form.values.config?.metricOp || 'count'}
                                        onChange={(v) => {
                                            const newConfig = {
                                                ...form.values.config,
                                                metricOp: v,
                                                metric: v === 'count' ? 'count' : `${v}:${form.values.config?.metricField || ''}` // ← Add this line
                                            };
                                            form.setFieldValue('config', newConfig);
                                        }}
                                        data={[
                                            { value: 'count', label: 'Count' },
                                            { value: 'sum', label: 'Sum' },
                                            { value: 'avg', label: 'Average' },
                                            { value: 'min', label: 'Min' },
                                            { value: 'max', label: 'Max' },
                                        ]}
                                    />

                                    {form.values.config?.metricOp !== 'count' && (
                                        <Select
                                            placeholder="Select field"
                                            value={form.values.config?.metricField || ''}
                                            onChange={(v) => {
                                                const newConfig = {
                                                    ...form.values.config,
                                                    metricField: v,
                                                    metric: `${form.values.config?.metricOp}:${v}` // ← Add this line
                                                };
                                                form.setFieldValue('config', newConfig);
                                            }}
                                            data={selectedProject?.settings?.rawIndexes?.map(idx => ({
                                                value: idx,
                                                label: idx
                                            })) || []}
                                            searchable
                                        />
                                    )}
                                </div>
                            </div>

                            <Select
                                label="Group By"
                                description="Field to group by (from project indexes)"
                                placeholder="Select field"
                                value={form.values.config.groupBy || ''}
                                onChange={(v) => form.setFieldValue('config', { ...form.values.config, groupBy: v })}
                                data={[
                                    { value: 'level', label: 'level (Log Level)' },
                                    ...(selectedProject?.settings?.indexes?.map(idx => ({
                                        value: idx,
                                        label: idx
                                    })) || [])
                                ]}
                                searchable
                                required
                            />

                            <NumberInput
                                label="Limit"
                                description="Show top N results"
                                value={form.values.config.limit || 10}
                                onChange={(v) => form.setFieldValue('config', { ...form.values.config, limit: v })}
                                min={1}
                                max={50}
                            />
                        </>
                    )}

                    {/* PIE CHART CONFIG */}
                    {form.values.template === 'pie_chart' && (
                        <>
                            <div>
                                <label className="text-sm font-medium">Metric (Optional)</label>
                                <div className="flex gap-2 mt-1">
                                    <Select
                                        placeholder="Operation"
                                        value={form.values.config.metricOp || 'count'}
                                        onChange={(v) => form.setFieldValue('config', {
                                            ...form.values.config,
                                            metricOp: v,
                                            metric: v === 'count' ? 'count' : `${v}:${form.values.config.metricField || ''}`
                                        })}
                                        data={[
                                            { value: 'count', label: 'Count (default)' },
                                            { value: 'sum', label: 'Sum' },
                                            { value: 'avg', label: 'Average' },
                                        ]}
                                        className="w-1/3"
                                    />

                                    {form.values.config.metricOp && form.values.config.metricOp !== 'count' && (
                                        <Select
                                            placeholder="Select field"
                                            value={form.values.config.metricField || ''}
                                            onChange={(v) => form.setFieldValue('config', {
                                                ...form.values.config,
                                                metricField: v,
                                                metric: `${form.values.config.metricOp}:${v}`
                                            })}
                                            data={selectedProject?.settings?.rawIndexes?.map(idx => ({
                                                value: idx,
                                                label: idx
                                            })) || []}
                                            searchable
                                            className="w-1/3"
                                        />
                                    )}
                                </div>
                            </div>

                            <Select
                                label="Group By"
                                description="Field to group by"
                                placeholder="Select field"
                                value={form.values.config.groupBy || ''}
                                onChange={(v) => form.setFieldValue('config', { ...form.values.config, groupBy: v })}
                                data={[
                                    { value: 'level', label: 'level (Log Level)' },
                                    ...(selectedProject?.settings?.indexes?.map(idx => ({
                                        value: idx,
                                        label: idx
                                    })) || [])
                                ]}
                                searchable
                                required
                            />

                            <NumberInput
                                label="Limit"
                                description="Show top N slices"
                                value={form.values.config.limit || 5}
                                onChange={(v) => form.setFieldValue('config', { ...form.values.config, limit: v })}
                                min={1}
                                max={20}
                            />
                        </>
                    )}

                    {/* TABLE CONFIG */}
                    {form.values.template === 'table' && (
                        <>
                            <MultiSelect
                                label="Columns"
                                description="Select columns to display"
                                placeholder="Select columns"
                                value={form.values.config.columns || []}
                                onChange={(v) => form.setFieldValue('config', { ...form.values.config, columns: v })}
                                data={[
                                    { value: 'createdAt', label: 'Created At' },
                                    { value: 'updatedAt', label: 'Updated At' },
                                    { value: 'level', label: 'Level' },
                                    { value: 'count', label: 'Count' },
                                    ...(selectedProject?.settings?.indexes?.map(idx => ({
                                        value: idx,
                                        label: idx
                                    })) || [])
                                ]}
                                searchable
                                required
                            />

                            <NumberInput
                                label="Limit"
                                description="Number of rows to display"
                                value={form.values.config.limit || 50}
                                onChange={(v) => form.setFieldValue('config', { ...form.values.config, limit: v })}
                                min={1}
                                max={100}
                            />
                        </>
                    )}

                    {/* Time Range - Common for all templates */}
                    <Select
                        label="Time Range"
                        value={form.values.config.timeRange || 'last_24h'}
                        onChange={(v) => form.setFieldValue('config', { ...form.values.config, timeRange: v })}
                        data={[
                            { value: 'last_1h', label: 'Last Hour' },
                            { value: 'last_6h', label: 'Last 6 Hours' },
                            { value: 'last_12h', label: 'Last 12 Hours' },
                            { value: 'last_24h', label: 'Last 24 Hours' },
                            { value: 'last_3d', label: 'Last 3 Days' },
                            { value: 'last_7d', label: 'Last 7 Days' },
                            { value: 'last_30d', label: 'Last 30 Days' },
                        ]}
                    />

                    {/* Filters - Common for all templates */}
                    <FilterBuilder
                        value={form.values.config.filters || []}
                        onChange={(v) => form.setFieldValue('config', { ...form.values.config, filters: v })}
                    />

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-4">
                        <SecondaryButton variant="outline" onClick={onClose}>Cancel</SecondaryButton>
                        <PrimaryButton type="submit">Create Widget</PrimaryButton>
                    </div>
                </form>
            </Modal>
        </>
    )
}

export default CreateWidget