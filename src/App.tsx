import React, { useMemo, useState, useEffect } from "react";

// =============================================================
// ENERGISA – Protótipo Navegável (EMS & ESS)
// Login Operador: Usuario Dsx / Senha Dsx123
// Login Gestor:   Leonardo / Leonardo123
// Armazenamento: localStorage
// Perfis: operador (somente visualiza), gestor (cria/edita/exclui/exporta/apaga)
// =============================================================

// ----------------------------- Helpers ------------------------
const fmtDate = (d: Date | string) => new Date(d).toISOString().slice(0, 10);
const today = fmtDate(new Date());
const monthKey = (d: string) => d.slice(0, 7); // YYYY-MM
const computeIsReadOnly = (role: string) => role !== "gestor";

const COMPANY_OPTIONS = [
  { id: "EMS", name: "Energisa Mato Grosso do Sul", emoji: "🏢" },
  { id: "ESS", name: "Energisa Sul Sudeste", emoji: "🏭" },
] as const;

const TYPE_OPTIONS = [
  { id: "poda", label: "Poda de Árvore", icon: "🌳" },
  { id: "espacador", label: "Instalação Espaçador", icon: "🛠️" },
] as const;

// --------------------------- Data Layer -----------------------
function loadAll(): Record<string, any[]> {
  try {
    return JSON.parse(localStorage.getItem("energisa_records") || "{}");
  } catch {
    return {};
  }
}
function saveAll(data: Record<string, any[]>) {
  localStorage.setItem("energisa_records", JSON.stringify(data));
}
function useRecords(company: string) {
  const [data, setData] = useState<Record<string, any[]>>(() => loadAll());
  useEffect(() => {
    const onStorage = () => setData(loadAll());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const list = data[company] || [];

  const upsert = (rec: any) => {
    const copy = loadAll();
    const arr = copy[company] || [];
    const idx = arr.findIndex((r: any) => r.id === rec.id);
    if (idx >= 0) arr[idx] = rec; else arr.push(rec);
    copy[company] = arr;
    saveAll(copy);
    setData(copy);
  };
  const remove = (id: string) => {
    const copy = loadAll();
    copy[company] = (copy[company] || []).filter((r: any) => r.id !== id);
    saveAll(copy);
    setData(copy);
  };
  const clearAll = () => {
    const copy = loadAll();
    copy[company] = [];
    saveAll(copy);
    setData(copy);
  };
  return { list, upsert, remove, clearAll };
}

// ------------------------- Primitives -------------------------
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-sky-800/90 rounded-2xl shadow-md border border-white/20 text-white ${className}`}>
      {children}
    </div>
  );
}
function Stat({ title, value, subtitle, icon }: { title: string; value: any; subtitle?: string; icon: React.ReactNode }) {
  return (
    <Card className="p-6 flex items-center gap-4">
      <div className="text-3xl">{icon}</div>
      <div>
        <div className="text-sky-100 text-sm">{title}</div>
        <div className="text-3xl font-bold text-white">{value}</div>
        {subtitle && <div className="text-xs text-sky-200 mt-1">{subtitle}</div>}
      </div>
    </Card>
  );
}

// ---------------------------- Charts --------------------------
function LineChart({ series, labels }: { series: { name: string; data: number[]; colorClass: string }[]; labels: string[] }) {
  const width = 820;
  const height = 260;
  const padding = 40;
  const max = Math.max(1, ...series.flatMap((s) => s.data));
  const stepX = (width - padding * 2) / (labels.length - 1 || 1);
  const scaleY = (v: number) => height - padding - (v / max) * (height - padding * 2);

  return (
    <svg className="w-full" viewBox={`0 0 ${width} ${height}`}>
      <rect x="0" y="0" width={width} height={height} fill="transparent" />
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
        <line key={i} x1={padding} x2={width - padding} y1={padding + t * (height - padding * 2)} y2={padding + t * (height - padding * 2)} stroke="#9db2ce30" />
      ))}
      <line x1={padding} x2={padding} y1={padding} y2={height - padding} stroke="#9db2ce70" />
      <line x1={padding} x2={width - padding} y1={height - padding} y2={height - padding} stroke="#9db2ce70" />
      {series.map((s, si) => (
        <g key={si}>
          {s.data.map((v, i) => {
            if (i === 0) return null;
            const x1 = padding + (i - 1) * stepX;
            const y1 = scaleY(s.data[i - 1] || 0);
            const x2 = padding + i * stepX;
            const y2 = scaleY(v);
            return (
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={3} className={s.colorClass} stroke="currentColor" />
            );
          })}
        </g>
      ))}
    </svg>
  );
}

function MonthlyBars({ records }: { records: any[] }) {
  const y = new Date().getFullYear();
  const months = Array.from({ length: 12 }, (_, m) => `${y}-${String(m + 1).padStart(2, "0")}`);
  const sum = (type: "poda" | "espacador", k: string) => records.filter((r) => monthKey(r.date) === k && r.type === type).reduce((s, r) => s + r.qty, 0);
  const max = Math.max(1, ...months.map((k) => sum("poda", k) + sum("espacador", k)));

  return (
    <div className="grid grid-cols-12 gap-2 items-end h-56">
      {months.map((k, i) => {
        const poda = sum("poda", k);
        const esp = sum("espacador", k);
        const total = poda + esp;
        const h = (total / max) * 200;
        return (
          <div key={k} className="flex flex-col items-center">
            <div className="w-6 rounded-t-md" style={{ height: h }}>
              <div title={`Poda: ${poda}`} className="w-full bg-green-400 rounded-t-md" style={{ height: total ? (poda / total) * h : 0 }} />
              <div title={`Espaçador: ${esp}`} className="w-full bg-blue-400" style={{ height: total ? (esp / total) * h : 0 }} />
            </div>
            <div className="text-[10px] text-white/80 mt-1">{["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"][i]}</div>
          </div>
        );
      })}
    </div>
  );
}

// ----------------------- Company Select -----------------------
function CompanySelect({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-900 to-sky-800 text-white p-6">
      <header className="max-w-5xl mx-auto flex items-center gap-3">
        <img src="https://upload.wikimedia.org/wikipedia/commons/a/ae/Marca_Energisa_logo.png" alt="Energisa" className="h-8 bg-white rounded-md p-1" />
        <div className="text-2xl font-bold">ENERGISA</div>
      </header>
      <main className="max-w-5xl mx-auto mt-16">
        <h2 className="text-center text-2xl font-semibold">Selecione sua empresa:</h2>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {COMPANY_OPTIONS.map((c) => (
            <button key={c.id} onClick={() => onSelect(c.id)} className="p-8 bg-white/10 hover:bg-white/15 rounded-2xl border border-white/20 text-left">
              <div className="text-4xl mb-3">{c.emoji}</div>
              <div className="text-xl font-bold">{c.id}</div>
              <div className="text-white/80">{c.name}</div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}

// -------------------------- Login -----------------------------
function Login({ onSuccess }: { onSuccess: (role: string) => void }) {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [role, setRole] = useState("operador");
  const [error, setError] = useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((u === "Dsx" && p === "Dsx123") || (u === "Leonardo" && p === "Leonardo123")) onSuccess(role);
    else setError("Usuário ou senha inválidos");
  };
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-900 to-sky-800 text-white flex items-center justify-center p-6">
      <Card className="w-full max-w-md p-8">
        <div className="flex items-center gap-3 mb-6">
          <img src="https://upload.wikimedia.org/wikipedia/commons/a/ae/Marca_Energisa_logo.png" alt="Energisa" className="h-8 bg-white rounded-md p-1"/>
          <h1 className="text-2xl font-bold">ENERGISA</h1>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-sm">Usuário</label>
            <input className="w-full mt-1 px-3 py-2 rounded-xl bg-white/80 text-sky-900" value={u} onChange={(e) => setU(e.target.value)} />
          </div>
          <div>
            <label className="text-sm">Senha</label>
            <input type="password" className="w-full mt-1 px-3 py-2 rounded-xl bg-white/80 text-sky-900" value={p} onChange={(e) => setP(e.target.value)} />
          </div>
          <div>
            <label className="text-sm">Perfil</label>
            <select className="w-full mt-1 px-3 py-2 rounded-xl bg-white/80 text-sky-900" value={role} onChange={(e) => setRole((e.target as HTMLSelectElement).value)}>
              <option value="operador">Operador</option>
              <option value="gestor">Gestor</option>
            </select>
          </div>
          {error && <div className="text-red-300 text-sm">{error}</div>}
          <button className="w-full py-2 rounded-xl bg-orange-500 hover:bg-orange-600 font-semibold">Entrar</button>
        </form>
      </Card>
    </div>
  );
}

// ----------------------- New Record Modal ---------------------
function NewRecordModal({ initial, onClose, onSave }: { initial: any | null; onClose: () => void; onSave: (rec: any) => void }) {
  const [form, setForm] = useState<any>(
    initial || { id: (crypto?.randomUUID?.() || String(Math.random())).toString(), date: today, type: "poda", qty: 0, notes: "" }
  );
  const update = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-6">
      {/* Modal claro para contraste */}
      <div className="w-full max-w-lg p-6 rounded-2xl bg-white text-slate-900 shadow-xl">
        <h3 className="text-xl font-bold mb-4">{initial ? "Editar Registro" : "Novo Registro"}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-slate-700">Data</label>
            <input type="date" className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500" value={form.date} onChange={(e) => update("date", (e.target as HTMLInputElement).value)} />
          </div>
          <div>
            <label className="text-sm text-slate-700">Tipo</label>
            <select className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500" value={form.type} onChange={(e) => update("type", (e.target as HTMLSelectElement).value)}>
              {TYPE_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-slate-700">Quantidade</label>
            <input type="number" min={0} className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500" value={form.qty} onChange={(e) => update("qty", Number((e.target as HTMLInputElement).value))} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm text-slate-700">Observações</label>
            <textarea className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500" rows={3} value={form.notes} onChange={(e) => update("notes", (e.target as HTMLTextAreaElement).value)} />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700">Cancelar</button>          <button onClick={() => onSave(form)} className="px-4 py-2 rounded-xl bg-sky-600 text-white">Salvar</button>
        </div>
      </div>
    </div>
  );
}

// --------------------- CSV Utilities --------------------------
function buildCsv(rows: any[]) {
  const headers = ["data","tipo","quantidade","observacoes"];
  const table = rows.map((r) => [
    r.date,
    r.type === "poda" ? "Poda de Árvore" : "Instalação Espaçador",
    r.qty,
    String(r.notes || "").replace(/\n/g, " ")
  ]);
  const csv = [headers, ...table]
    .map((row) => row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(';'))
    .join('\n');
  return csv;
}

function downloadCsvFile(filename: string, csv: string) {
  // Sempre com BOM para compatibilidade com Excel (pt-BR)
  const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
  const blob = new Blob([bom, new TextEncoder().encode(csv)], { type: 'text/csv;charset=utf-8;' });

  // Fallback IE/Edge legado
  // @ts-ignore
  if (window.navigator && window.navigator.msSaveOrOpenBlob) {
    // @ts-ignore
    window.navigator.msSaveOrOpenBlob(blob, filename);
    return;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();

  // Tentativa extra: abrir em nova aba se o navegador ignorar o atributo download
  try { window.open(url, '_blank', 'noopener'); } catch (e) { /* ignore */ }
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

// ------------------------ Records View ------------------------
function RecordsView({ company, role }: { company: string; role: string }) {
  const { list, upsert, remove, clearAll } = useRecords(company);
  const [qDate, setQDate] = useState<string>("");
  const [modal, setModal] = useState<any | null>(null);
  const isReadOnly = computeIsReadOnly(role);

  const filtered = useMemo(() => {
    const sorted = [...list].sort((a, b) => (a.date > b.date ? -1 : 1));
    if (!qDate) return sorted;
    return sorted.filter((r) => r.date === qDate);
  }, [list, qDate]);

  const monthTotals = useMemo(() => {
    const m = monthKey(today);
    const ofMonth = list.filter((r) => monthKey(r.date) === m);
    const poda = ofMonth.filter((r) => r.type === "poda").reduce((s, r) => s + r.qty, 0);
    const esp = ofMonth.filter((r) => r.type === "espacador").reduce((s, r) => s + r.qty, 0);
    return { poda, esp, total: poda + esp };
  }, [list]);

  const onExport = () => {
    const csv = buildCsv(list);
    downloadCsvFile(`${company}_registros.csv`, csv);
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <Stat title="Poda de Árvore" value={monthTotals.poda} subtitle="Total do mês" icon="🌳" />
        <Stat title="Instalação Espaçador" value={monthTotals.esp} subtitle="Total do mês" icon="🛠️" />
      </div>

      <div className="flex items-end gap-3">
        <div>
          <label className="text-sm text-white/80">Filtrar por data</label>
          <input type="date" className="block px-3 py-2 rounded-xl bg-white/90 text-sky-900" value={qDate} onChange={(e) => setQDate((e.target as HTMLInputElement).value)} />
        </div>
        {!isReadOnly && (
          <button onClick={onExport} className="h-[42px] px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 font-semibold">Exportar CSV</button>
        )}
        {!isReadOnly && (
          <button onClick={() => setModal({})} className="h-[42px] px-4 rounded-xl bg-cyan-500 hover:bg-cyan-600 font-semibold">+ Novo Registro</button>
        )}
        {!isReadOnly && (
          <button onClick={() => { if (confirm('Tem certeza que deseja apagar TODOS os registros desta empresa?')) clearAll(); }} className="h-[42px] px-4 rounded-xl bg-red-500/90 hover:bg-red-600 font-semibold">Apagar tudo</button>
        )}
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-sky-900/20">
            <tr>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Quantidade</th>
              <th className="px-4 py-3">Observações</th>
              <th className="px-4 py-3 w-40">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-white/70">Nenhum registro encontrado.</td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-white/10">
                <td className="px-4 py-3">{r.date}</td>
                <td className="px-4 py-3">{r.type === "poda" ? "Poda de Árvore" : "Instalação Espaçador"}</td>
                <td className="px-4 py-3">{r.qty}</td>
                <td className="px-4 py-3">{r.notes}</td>
                <td className="px-4 py-3 flex gap-2">
                  {isReadOnly ? (
                    <span className="text-white/60 text-sm">Somente leitura</span>
                  ) : (
                    <>
                      <button className="px-3 py-1 rounded-lg bg-amber-500/90" onClick={() => setModal(r)}>Editar</button>
                      <button className="px-3 py-1 rounded-lg bg-rose-600/90" onClick={() => remove(r.id)}>Excluir</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {modal && (
        <NewRecordModal
          initial={modal.id ? modal : null}
          onClose={() => setModal(null)}
          onSave={(rec) => { upsert(rec); setModal(null); }}
        />
      )}
    </div>
  );
}

// --------------------- Executive Dashboard --------------------
function ExecutiveDashboard({ company }: { company: string }) {
  const { list } = useRecords(company);
  const [period, setPeriod] = useState("mes"); // mes | 30 | all

  const range = useMemo(() => {
    const now = new Date();
    if (period === "30") {
      const start = new Date();
      start.setDate(now.getDate() - 29);
      return { start: fmtDate(start), end: fmtDate(now) } as const;
    }
    if (period === "all") return { start: "0000-01-01", end: fmtDate(now) } as const;
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start: fmtDate(start), end: fmtDate(now) } as const;
  }, [period]);

  const inRange = list.filter((r) => r.date >= range.start && r.date <= range.end);
  const total = inRange.reduce((s, r) => s + r.qty, 0);
  const poda = inRange.filter((r) => r.type === "poda").reduce((s, r) => s + r.qty, 0);
  const esp = inRange.filter((r) => r.type === "espacador").reduce((s, r) => s + r.qty, 0);

  const last30Labels = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return fmtDate(d);
  });
  const daily = (type: "poda" | "espacador") => last30Labels.map((d) => inRange.filter((r) => r.type === type && r.date === d).reduce((s, r) => s + r.qty, 0));

  const avgDia = (() => {
    const days = Math.max(1, (new Date(range.end).getTime() - new Date(range.start).getTime()) / (1000 * 60 * 60 * 24) + 1);
    return (total / days).toFixed(1);
  })();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <label className="text-sm text-white/80">Período:</label>
        <select value={period} onChange={(e) => setPeriod((e.target as HTMLSelectElement).value)} className="px-3 py-2 rounded-xl bg-white/90 text-sky-900">
          <option value="mes">Este mês</option>
          <option value="30">Últimos 30 dias</option>
          <option value="all">Todo o período</option>
        </select>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Stat title="Total de Atividades" value={total} subtitle="" icon="📊" />
        <Stat title="Poda de Árvore" value={poda} subtitle="Total do período" icon="🌳" />
        <Stat title="Instalação Espaçador" value={esp} subtitle="Total do período" icon="⚡" />
        <Stat title="Média Diária" value={avgDia} subtitle="Atividades/dia" icon="📈" />
      </div>

      <Card className="p-6">
        <h4 className="text-white mb-2 font-semibold">Evolução Temporal (Últimos 30 dias)</h4>
        <LineChart
          labels={last30Labels}
          series={[
            { name: "Poda", data: daily("poda"), colorClass: "text-green-400" },
            { name: "Espaçador", data: daily("espacador"), colorClass: "text-blue-400" },
          ]}
        />
        <div className="flex gap-6 mt-2 text-sm text-white/80">
          <span className="inline-flex items-center gap-2"><i className="w-3 h-3 inline-block bg-green-400 rounded-sm"/> Poda</span>
          <span className="inline-flex items-center gap-2"><i className="w-3 h-3 inline-block bg-blue-400 rounded-sm"/> Espaçador</span>
        </div>
      </Card>

      <Card className="p-6">
        <h4 className="text-white mb-4 font-semibold">Análise Mensal</h4>
        <MonthlyBars records={list} />
      </Card>
    </div>
  );
}

// ---------------------------- Shell ---------------------------
function Shell({ company, role, onLogout, onChangeCompany }: { company: string; role: string; onLogout: () => void; onChangeCompany: () => void }) {
  const [tab, setTab] = useState("registros");
  const title = company === "EMS" ? "EMS" : "ESS";

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-900 to-sky-800 text-white">
      <header className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="https://upload.wikimedia.org/wikipedia/commons/a/ae/Marca_Energisa_logo.png" alt="Energisa" className="h-8 bg-white rounded-md p-1"/>
          <span className="text-xl font-bold">ENERGISA</span>
          <span className="ml-3 px-3 py-1 text-sm rounded-full bg-cyan-600/80">{title}</span>
          <span className="ml-2 text-xs text-white/70 border border-white/20 rounded-full px-2">Perfil: {role}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setTab("registros")} className={`px-3 py-2 rounded-xl ${tab==='registros'?'bg-white/15':''}`}>Registros</button>
          <button onClick={() => setTab("dashboard")} className={`px-3 py-2 rounded-xl ${tab==='dashboard'?'bg-white/15':''}`}>Dashboard Executivo</button>
          <button onClick={onChangeCompany} className="px-3 py-2 rounded-xl">Trocar Empresa</button>
          <button onClick={onLogout} className="px-3 py-2 rounded-xl bg-rose-600">Sair</button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 pb-16">
        {tab === "registros" ? (
          <section className="mt-4">
            <RecordsView company={company} role={role} />
          </section>
        ) : (
          <section className="mt-4">
            <ExecutiveDashboard company={company} />
          </section>
        )}
      </main>
    </div>
  );
}

// ----------------------------- App ----------------------------
export default function App() {
  const [auth, setAuth] = useState(false);
  const [company, setCompany] = useState<string | null>(null);
  const [role, setRole] = useState("operador");

  if (!auth) return <Login onSuccess={(r) => { setRole(r); setAuth(true); }} />;
  if (!company) return <CompanySelect onSelect={setCompany} />;
  return (
    <Shell
      company={company}
      role={role}
      onLogout={() => { setAuth(false); setCompany(null); }}
      onChangeCompany={() => setCompany(null)}
    />
  );
}

// -------------------------- Self-tests ------------------------
(function runSelfTests() {
  try {
    console.assert(fmtDate("2025-08-27T10:00:00Z").length === 10, "fmtDate deve retornar YYYY-MM-DD");
    console.assert(monthKey("2025-08-27") === "2025-08", "monthKey incorreto");

    // Permissions
    console.assert(computeIsReadOnly("operador") === true, "operador deve ser somente leitura");
    console.assert(computeIsReadOnly("gestor") === false, "gestor deve ter permissões completas");

    // CSV generator smoke test
    const sample = [
      { id: "1", date: "2025-08-01", type: "poda", qty: 2, notes: "ok" },
      { id: "2", date: "2025-08-02", type: "espacador", qty: 3, notes: "ok" },
    ];
    const csv = buildCsv(sample);
    console.assert(csv.includes('Poda de Árvore') && csv.split('\n').length === 3, "CSV básico deve ter 3 linhas");
    console.assert(csv.charCodeAt(0) !== 0xfeff, "CSV string não deve conter BOM embutido (BOM só no arquivo)");
  } catch (e) {
    console.warn("Self-tests falharam:", e);
  }
})();
