import { useState } from 'react';

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
    onChange && onChange(next);
  }

  const add = () => update([ ...filters, { field: '', operator: 'eq', value: '' } ]);
  const remove = (idx) => update(filters.filter((_,i)=>i!==idx));

  const setField = (idx, key, val) => {
    const next = filters.slice();
    next[idx] = { ...next[idx], [key]: val };
    update(next);
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">Filters</div>
      {filters.map((f, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input className="border p-2 flex-1" placeholder="field (e.g. level or context.userId or data.amount)" value={f.field} onChange={e=>setField(i,'field',e.target.value)} />
          <select className="border p-2" value={f.operator} onChange={e=>setField(i,'operator',e.target.value)}>
            {OPS.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
          </select>
          <input className="border p-2 flex-1" placeholder="value" value={f.value} onChange={e=>setField(i,'value',e.target.value)} />
          <button type="button" className="px-2 py-1 border" onClick={()=>remove(i)}>-</button>
        </div>
      ))}
      <button type="button" className="px-3 py-1 border" onClick={add}>+ Add Filter</button>
    </div>
  );
}
