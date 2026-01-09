//@ts-check

import { Modal, Select, TextInput, Button } from "@mantine/core"
import FilterBuilder from "../../../component/FilterBuilder"
import PrimaryButton from "../../../component/button/PrimaryButton"

const CreateWidget = ({
    modalOpened,
    setModalOpened,
    onAddWidget,
    form,
    setForm,
    projects,

}) => {

    return (
        <>
            <PrimaryButton onClick={() => setModalOpened(true)}>Create Widget</PrimaryButton>

            <Modal opened={modalOpened} onClose={() => setModalOpened(false)} title="Add Widget" centered >
                <form onSubmit={onAddWidget} className="space-y-2">
                    <div className="flex flex-col gap-2">
                        <Select
                            label={`Select Template`}
                            value={form.template}
                            onChange={(v) => setForm({ ...form, template: v })}
                            data={[
                                { value: 'total_value', label: 'Total Value' },
                                { value: 'line_chart', label: 'Line Chart' },
                                { value: 'bar_chart', label: 'Bar Chart' },
                                { value: 'table', label: 'Table' },
                                { value: 'pie_chart', label: 'Pie Chart' },
                            ]}
                            className="flex-0"
                        />

                        <TextInput label={`Title`} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Widget title" className="flex-1" />

                        <Select
                            label={`Select Project`}
                            value={form.project}
                            onChange={(v) => setForm({ ...form, project: v })}
                            data={[{ value: '', label: 'Select Project' }, ...(projects || []).map(p => ({ value: String(p.id), label: p.title }))]}
                            className="flex-0"
                        />
                    </div>

                    {form.template === 'total_value' && (
                        <div className="flex gap-2">
                            <Select
                                label={`Operation   `}
                                value={form.config.operation}
                                onChange={(v) => setForm({ ...form, config: { ...form.config, operation: v } })}
                                data={[
                                    { value: 'count', label: 'count' },
                                    { value: 'sum', label: 'sum' },
                                    { value: 'avg', label: 'avg' },
                                    { value: 'min', label: 'min' },
                                    { value: 'max', label: 'max' },
                                    { value: 'first', label: 'first' },
                                    { value: 'latest', label: 'latest' },
                                ]}
                            />

                            {['sum', 'avg', 'min', 'max', 'latest', 'first'].includes(form.config.operation) && (
                                <TextInput label={`Field`} placeholder="raw.field (from project rawIndexes)" className="flex-1" value={form.config.field || ''} onChange={e => setForm({ ...form, config: { ...form.config, field: e.target.value } })} />
                            )}
                        </div>
                    )}

                    <FilterBuilder value={form.config.filters || []} onChange={(v) => setForm({ ...form, config: { ...form.config, filters: v } })} />

                    <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setModalOpened(false)}>Cancel</Button>
                        <Button type="submit">Create Widget</Button>
                    </div>
                </form>
            </Modal>
        </>
    )
}

export default CreateWidget