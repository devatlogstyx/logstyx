import { useState } from 'react';
import { Select, TextInput, Button, Group, Stack, ActionIcon, TagsInput } from '@mantine/core';
import { IoIosTrash } from "react-icons/io"

const OPS = [
  { value: 'eq', label: '=' },
  { value: 'ne', label: '!=' },
  { value: 'contains', label: 'contains' },
  { value: 'gt', label: '>' },
  { value: 'gte', label: '>=' },
  { value: 'lt', label: '<' },
  { value: 'lte', label: '<=' },
  { value: 'in', label: 'in' },
  { value: 'nin', label: 'not in' },
];

export default function FilterBuilder({ value = [], onChange }) {
  const [filters, setFilters] = useState(value.length ? value : [{ field: '', operator: 'eq', value: '' }]);

  const update = (next) => {
    setFilters(next);
    // Only send valid filters (those with both field and value)
    const validFilters = next.filter(f => {
      if (!f.field) return false;
      if (f.operator === 'in' || f.operator === 'nin') {
        return Array.isArray(f.value) && f.value.length > 0;
      }
      return f.value;
    });
    onChange && onChange(validFilters);
  }

  const add = () => update([...filters, { field: '', operator: 'eq', value: '' }]);
  const remove = (idx) => update(filters.filter((_, i) => i !== idx));

  const setField = (idx, key, val) => {
    const next = filters.slice();

    // If changing operator to/from in/nin, convert value type
    if (key === 'operator') {
      const oldOp = next[idx].operator;
      const newOp = val;
      const isOldArray = oldOp === 'in' || oldOp === 'nin';
      const isNewArray = newOp === 'in' || newOp === 'nin';

      if (!isOldArray && isNewArray) {
        // Convert string to array
        next[idx] = { ...next[idx], operator: val, value: next[idx].value ? [next[idx].value] : [] };
      } else if (isOldArray && !isNewArray) {
        // Convert array to string
        next[idx] = { ...next[idx], operator: val, value: Array.isArray(next[idx].value) ? next[idx].value[0] || '' : '' };
      } else {
        next[idx] = { ...next[idx], [key]: val };
      }
    } else {
      next[idx] = { ...next[idx], [key]: val };
    }

    update(next);
  }

  return (
    <Stack spacing="xs">
      <div className="text-sm font-medium">Filters</div>
      {filters.map((f, i) => (
        <Group key={i} align="center" spacing="sm" noWrap>
          <TextInput
            placeholder="field (e.g. level or context.userId or data.amount)"
            value={f.field}
            onChange={(e) => setField(i, 'field', e.target.value)}
            style={{ flex: 1 }}
          />
          <Select
            value={f.operator}
            onChange={(v) => setField(i, 'operator', v)}
            data={OPS}
            style={{ width: 120 }}
          />
          {(f.operator === 'in' || f.operator === 'nin') ? (
            <TagsInput
              placeholder="Enter values and press Enter"
              value={Array.isArray(f.value) ? f.value : []}
              onChange={(v) => setField(i, 'value', v)}
              style={{ flex: 1 }}
            />
          ) : (
            <TextInput
              placeholder="value"
              value={f.value}
              onChange={(e) => setField(i, 'value', e.target.value)}
              style={{ flex: 1 }}
            />
          )}
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