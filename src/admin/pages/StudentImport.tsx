import { useRef, useState } from 'react';
import { api, toast } from '../lib';
import { csvCell, fold, parseCsv } from '../../lib/import';
import { Button, Icon } from '../ui';

// Match the export columns so staff can edit and reimport the file.
const COLUMNS: [key: string, header: string, aliases: string[]][] = [
  ['code', 'Mã', ['ma', 'ma hv', 'ma hoc vien']],
  ['fullName', 'Họ tên', ['ho ten', 'ho va ten', 'ten', 'hoc vien']],
  ['phone', 'SĐT', ['sdt', 'so dien thoai', 'dien thoai']],
  ['birthYear', 'Năm sinh', ['nam sinh']],
  ['parentName', 'Phụ huynh', ['phu huynh', 'ten phu huynh']],
  ['parentPhone', 'SĐT phụ huynh', ['sdt phu huynh', 'so dien thoai phu huynh']],
  ['location', 'Cơ sở', ['co so']],
  ['classes', 'Lớp', ['lop', 'lop hoc']],
  ['plan', 'Gói học phí', ['goi', 'goi hoc phi', 'goi tap']],
  ['joinedAt', 'Ngày nhập học', ['ngay nhap hoc', 'ngay vao']],
  ['status', 'Trạng thái', ['trang thai']],
  ['note', 'Ghi chú', ['ghi chu']],
];

const cellText = (v: unknown) =>
  v == null ? '' : v instanceof Date ? v.toISOString().slice(0, 10) : String(v).replace(/^'/, '').trim();

async function readRows(file: File): Promise<Record<string, string>[]> {
  let grid: unknown[][];
  if (/\.csv$/i.test(file.name) || file.type === 'text/csv') grid = parseCsv((await file.text()).replace(/^﻿/, ''));
  else {
    const { readSheet } = await import('read-excel-file/browser'); // Load the spreadsheet parser on demand.
    grid = await readSheet(file);
  }
  const [header, ...body] = grid;
  if (!header) throw new Error('File trống');
  const index = COLUMNS.map(([key, h, aliases]) => [key, header.findIndex((c) => [fold(h), ...aliases].includes(fold(cellText(c))))] as const);
  if (!index.some(([k, i]) => (k === 'fullName' || k === 'code') && i >= 0)) throw new Error('Cần cột "Họ tên" hoặc "Mã" ở dòng đầu tiên. Dùng file mẫu cho đúng cột.');
  return body.map((r) => Object.fromEntries(index.filter(([, i]) => i >= 0).map(([k, i]) => [k, cellText(r[i])])));
}

function downloadTemplate() {
  const csv = '﻿' + COLUMNS.map(([, h]) => h).join(',') + '\r\n' + ',Nguyễn Văn A,0912345678,2000,,,Cơ sở 1 — An Phú Đông,,Standard,01/11/2026,Đang học,\r\n';
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = 'mau-nhap-hoc-vien.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

type Result = { created: number; updated: number; errors: { row: number; error: string }[] };

function downloadFailed(rows: Record<string, string>[]) {
  const columns = COLUMNS.filter(([key]) => Object.hasOwn(rows[0], key));
  const csv = '﻿' + [columns.map(([, header]) => header), ...rows.map((row) => columns.map(([key]) => row[key]))]
    .map((line) => line.map(csvCell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'hoc-vien-chua-nhap.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function StudentImport({ onDone }: { onDone: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const fileRead = useRef(0);
  const [rows, setRows] = useState<Record<string, string>[] | null>(null);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function pick(f?: File) {
    if (!f) return;
    const read = ++fileRead.current;
    setRows(null);
    setFileName('');
    setResult(null);
    try {
      const r = await readRows(f);
      if (read !== fileRead.current) return;
      if (!r.length) throw new Error('File không có dòng học viên nào');
      if (r.length > 2000) throw new Error('Tối đa 2000 học viên mỗi lần nhập');
      setRows(r);
      setFileName(f.name);
    } catch (e: any) { if (read === fileRead.current) toast(e.message, 'err'); }
  }

  async function submit() {
    if (!rows) return;
    setBusy(true);
    try {
      const r = await api<Result>('/admin/students/import', { body: { rows } });
      setResult(r);
      setRows(r.errors.length ? rows.filter((_, i) => r.errors.some((e) => e.row === i + 2)) : null);
      toast(`Đã thêm ${r.created}, cập nhật ${r.updated} học viên`);
      onDone();
    } catch (e: any) { toast(e.message, 'err'); } finally { setBusy(false); }
  }

  return (
    <div className="mb-4">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="ghost" icon="plus" disabled={busy} onClick={() => ref.current?.click()}>Nhập Excel</Button>
        <button type="button" onClick={downloadTemplate} className="min-h-12 px-2 text-sm font-semibold underline cursor-pointer">Tải file mẫu</button>
        <input ref={ref} type="file" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" className="hidden"
          onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
      </div>

      {rows && (
        <div className="mt-3 border-2 border-ink bg-white p-4">
          <p className="font-semibold">{fileName}: <b>{rows.length}</b> học viên</p>
          <p className="text-sm text-neutral-500">Có cột "Mã" trùng học viên cũ → cập nhật; không có mã → thêm mới. Kiểm tra vài dòng đầu:</p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b">{['Mã', 'Họ tên', 'SĐT', 'Cơ sở', 'Gói'].map((h) => <th key={h} className="py-1 pr-3">{h}</th>)}</tr></thead>
              <tbody>
                {rows.slice(0, 5).map((r, i) => (
                  <tr key={i} className="border-b border-neutral-100">
                    <td className="py-1 pr-3">{r.code || <i className="text-neutral-400">mới</i>}</td><td className="pr-3">{r.fullName}</td><td className="pr-3">{r.phone || r.parentPhone}</td><td className="pr-3">{r.location}</td><td>{r.plan}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex gap-2">
            <Button type="button" icon="check" loading={busy} onClick={submit}>Nhập {rows.length} học viên</Button>
            <Button type="button" variant="ghost" onClick={() => setRows(null)}>Huỷ</Button>
          </div>
        </div>
      )}

      {result && result.errors.length > 0 && (
        <div className="mt-3 border border-amber-300 bg-amber-50 p-4 text-sm" role="alert">
          <p className="font-semibold"><Icon name="x" className="mr-1 inline size-4" />{result.errors.length} dòng chưa nhập được. Tải riêng các dòng này, sửa rồi nhập lại file đó:</p>
          {rows && <Button type="button" variant="ghost" onClick={() => downloadFailed(rows)}>Tải dòng chưa nhập</Button>}
          <ul className="mt-2 max-h-48 list-disc overflow-y-auto pl-5">
            {result.errors.map((e) => <li key={e.row}>Dòng {e.row}: {e.error}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
