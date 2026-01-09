import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { paginateReports, createReport } from '../../api/report';
import { PRIVATE_REPORT_VISIBILITY, PUBLIC_REPORT_VISIBILITY } from '../../utils/constant';
import PrimaryButton from "./../../component/button/PrimaryButton"
import { useErrorMessage } from '../../hooks/useMessage';

export default function DashboardReports() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [visibility, setVisibility] = useState(PRIVATE_REPORT_VISIBILITY);
  const ErrorMessage = useErrorMessage()

  useEffect(() => {
    const ctrl = new AbortController();
    paginateReports(ctrl.signal, { page: 1, limit: 50 }).then(res => {
      setList(res?.results || []);
    }).finally(() => setLoading(false));
    return () => ctrl.abort();
  }, []);

  const onCreate = async (e) => {
    e.preventDefault();
    try {
      const ctrl = new AbortController();
      const data = await createReport(ctrl.signal, { title, visibility });
      if (data) {
        setList([data, ...list]);
        setTitle('');
      }
    } catch (err) {
      ErrorMessage(err)
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-3">Reports</h1>
      <form onSubmit={onCreate} className="flex gap-2 mb-4">
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Report title" className="border p-2 flex-1" />
        <select value={visibility} onChange={e => setVisibility(e.target.value)} className="border p-2">
          <option value={PRIVATE_REPORT_VISIBILITY}>Private</option>
          <option value={PUBLIC_REPORT_VISIBILITY}>Public</option>
        </select>
        <PrimaryButton className="bg-blue-600 text-white px-4 py-2" type="submit">Create</PrimaryButton>
      </form>
      {loading ? <div>Loading...</div> : (
        <ul className="space-y-2">
          {list.map(r => (
            <li key={r.id} className="border p-3 flex justify-between">
              <div>
                <div className="font-semibold">{r.title}</div>
                <div className="text-sm text-gray-500">/{r.slug} — {r.visibility}</div>
              </div>
              <div>
                <Link className="text-blue-600" to={`/dashboard/reports/${r.slug}`}>Open</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
