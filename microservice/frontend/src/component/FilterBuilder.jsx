import { useState } from 'react';
import { Select, TextInput, Button, Group, Stack, ActionIcon } from '@mantine/core';
import { IoIosTrash } from "react-icons/io"

const OPS = [
  { value: 'eq', label: '=' },
  { value: 'ne', label: '!=' },
  { value: 'contains', label: 'contains' },
  { value: 'gt', label: '>' },
  { value: 'gte', label: '>=' },
  { value: 'lt', label: '<' },
  { value: 'lte', label: '<=' },
];

export default function FilterBuilder({ value = [], onChange }) {
  const [filters, setFilters] = useState(value.length ? value : [{ field: '', operator: 'eq', value: '' }]);

  const update = (next) => {
    setFilters(next);
    // Only send valid filters (those with both field and value)
    const validFilters = next.filter(f => f.field && f.value);
    onChange && onChange(validFilters);
  }

  const add = () => update([...filters, { field: '', operator: 'eq', value: '' }]);
  const remove = (idx) => update(filters.filter((_, i) => i !== idx));

  const setField = (idx, key, val) => {
    const next = filters.slice();
    next[idx] = { ...next[idx], [key]: val };
    update(next);
  }

  return (
    <Stack spacing="xs">
      <div className="text-sm font-medium">Filters</div>
      {filters.map((f, i) => (
        <Group key={i} align="center" spacing="sm" noWrap>
          <TextInput placeholder="field (e.g. level or context.userId or data.amount)" value={f.field} onChange={(e) => setField(i, 'field', e.target.value)} style={{ flex: 1 }} />
          <Select value={f.operator} onChange={(v) => setField(i, 'operator', v)} data={OPS} style={{ width: 120 }} />
          <TextInput placeholder="value" value={f.value} onChange={(e) => setField(i, 'value', e.target.value)} style={{ flex: 1 }} />
          <ActionIcon className='!text-red-500 !bg-transparent' onClick={() => remove(i)}>
            <IoIosTrash />
          </ActionIcon>
        </Group>
      ))}
      <div>
        <Button variant="light" onClick={add}>+ Add Filter</Button>
      </div>
    </Stack>
  );
}