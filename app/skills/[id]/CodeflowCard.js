'use client'

import { useState } from 'react'
import { Github, FolderTree, FileText, Folder, Eye, ChevronDown, ChevronUp, ArrowRight, BookOpen, Gauge, Wrench, CheckCircle2, XCircle, AlertTriangle, Layers, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const LANG_COLORS = ['bg-teal-400', 'bg-violet-400', 'bg-amber-400', 'bg-sky-400', 'bg-rose-400', 'bg-slate-500']

const TIER_TONE = {
  docs: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10',
  tiny: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10',
  small: 'text-teal-300 border-teal-500/30 bg-teal-500/10',
  medium: 'text-amber-300 border-amber-500/30 bg-amber-500/10',
  large: 'text-orange-300 border-orange-500/30 bg-orange-500/10',
  huge: 'text-rose-300 border-rose-500/30 bg-rose-500/10',
}
const SETUP_TONE = {
  'no-code': 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10',
  light: 'text-teal-300 border-teal-500/30 bg-teal-500/10',
  dev: 'text-amber-300 border-amber-500/30 bg-amber-500/10',
}

function fileUrl(cf, path) {
  return `${cf.repo.html_url}/blob/${cf.repo.default_branch}/${path}`
}
function dirUrl(cf, path) {
  return `${cf.repo.html_url}/tree/${cf.repo.default_branch}/${path}`
}

function Signal({ ok, label, warn }) {
  const Icon = ok ? CheckCircle2 : warn ? AlertTriangle : XCircle
  const tone = ok ? 'text-emerald-300 border-emerald-500/20 bg-emerald-500/5' : warn ? 'text-amber-300 border-amber-500/20 bg-amber-500/5' : 'text-slate-500 border-slate-700/50 bg-slate-800/30'
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs rounded-full border px-2.5 py-1 ${tone}`}>
      <Icon className="w-3.5 h-3.5" />{label}
    </span>
  )
}

export default function CodeflowCard({ codeflow: cf }) {
  const [open, setOpen] = useState(false)
  if (!cf || !cf.size) return null

  const tierTone = TIER_TONE[cf.size.tier] || TIER_TONE.medium
  const setupTone = SETUP_TONE[cf.setup?.level] || SETUP_TONE.light
  const pushed = cf.repo?.pushed_at ? new Date(cf.repo.pushed_at) : null
  const daysSincePush = pushed ? Math.round((Date.now() - pushed.getTime()) / 86400000) : null
  // No "flow" for reading material (curated lists, guides) — nothing runs there.
  const flow = cf.size.tier === 'docs' ? null : cf.flow

  return (
    <Card className="bg-slate-900/60 border-slate-700/50 backdrop-blur-xl" id="codeflow">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-white flex items-center gap-2">
            <Eye className="w-5 h-5 text-teal-400" />How it works
            <Badge className="bg-teal-500/10 text-teal-300 border-teal-500/30 border text-[10px] uppercase tracking-wider ml-1">Codeflow</Badge>
          </CardTitle>
          <Badge className="bg-emerald-500/10 text-emerald-300 border-emerald-500/30 border text-xs">Free to inspect</Badge>
        </div>
        <p className="text-slate-400 text-sm mt-1">
          How big the code is, how hard it is to run, and where to start reading — read from the real repository, not marketing copy.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Verdict tiles — the three answers a non-coder needs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className={`rounded-lg p-4 border ${tierTone}`}>
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider opacity-80 mb-1"><Gauge className="w-3.5 h-3.5" />Size</div>
            <div className="text-lg font-semibold text-white leading-tight">{cf.size.label}</div>
            <div className="text-sm mt-1 opacity-90">
              {cf.size.tier === 'docs'
                ? `${cf.size.doc_files} document${cf.size.doc_files === 1 ? '' : 's'} · ${cf.size.files} files`
                : `${cf.size.loc_human} lines · ${cf.size.code_files} code files`}
              {cf.size.read_time ? ` · ${cf.size.read_time}` : ''}
            </div>
          </div>
          <div className={`rounded-lg p-4 border ${setupTone}`}>
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider opacity-80 mb-1"><Wrench className="w-3.5 h-3.5" />Setup</div>
            <div className="text-lg font-semibold text-white leading-tight">{cf.setup?.label}</div>
            <div className="text-sm mt-1 opacity-90">{cf.setup?.note}</div>
          </div>
          <div className="rounded-lg p-4 border border-slate-700/50 bg-slate-800/40">
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-400 mb-1"><Layers className="w-3.5 h-3.5" />Runs on</div>
            {cf.setup?.level === 'no-code' ? (
              <>
                <div className="text-lg font-semibold text-white leading-tight">Inside your AI tool</div>
                <div className="text-sm mt-1 text-slate-300">
                  {cf.runtime?.length ? `Helper scripts use ${cf.runtime.join(' · ')}` : 'Nothing to install on your machine'}
                  {cf.signals?.env_example ? ' · needs API keys' : ''}
                </div>
              </>
            ) : (
              <>
                <div className="text-lg font-semibold text-white leading-tight">{cf.runtime?.length ? cf.runtime.join(' · ') : cf.languages?.[0]?.name || 'See README'}</div>
                <div className="text-sm mt-1 text-slate-300">{cf.signals?.env_example ? 'Needs API keys (.env)' : 'No API keys detected'}</div>
              </>
            )}
          </div>
        </div>

        {/* Language mix */}
        {cf.languages?.length > 0 && (
          <div>
            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
              {cf.languages.map((l, i) => (
                <div key={l.name} className={`${LANG_COLORS[i % LANG_COLORS.length]} h-full`} style={{ width: `${l.pct}%` }} title={`${l.name} ${l.pct}%`} />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
              {cf.languages.map((l, i) => (
                <span key={l.name} className="flex items-center gap-1.5 text-xs text-slate-300">
                  <span className={`inline-block w-2 h-2 rounded-full ${LANG_COLORS[i % LANG_COLORS.length]}`} />{l.name} <span className="text-slate-500">{l.pct}%</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Plain-English flow: input → steps → output */}
        {flow?.steps?.length >= 3 && (
          <div className="rounded-lg border border-teal-500/20 bg-teal-500/5 p-4">
            <div className="flex items-center gap-2 text-teal-300 font-semibold mb-1"><Play className="w-4 h-4" />What happens, step by step</div>
            {flow.summary && <p className="text-slate-200 text-sm mb-4">{flow.summary}</p>}
            <div className="flex flex-col md:flex-row md:items-stretch gap-2">
              {flow.input && (
                <div className="flex-shrink-0 rounded-md border border-slate-600 bg-slate-800/60 px-3 py-2 text-xs md:max-w-[140px]">
                  <div className="text-slate-500 uppercase tracking-wider text-[10px] mb-0.5">You give</div>
                  <div className="text-white font-medium">{flow.input}</div>
                </div>
              )}
              {flow.steps.map((s, i) => (
                <div key={i} className="flex flex-col md:flex-row md:items-center gap-2 flex-1 min-w-0">
                  <ArrowRight className="w-4 h-4 text-teal-500/70 rotate-90 md:rotate-0 flex-shrink-0 self-center" />
                  <div className="flex-1 rounded-md border border-teal-500/25 bg-slate-900/70 px-3 py-2 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="w-4 h-4 rounded-full bg-teal-500/20 text-teal-300 text-[10px] flex items-center justify-center font-semibold flex-shrink-0">{i + 1}</span>
                      <span className="text-white text-sm font-medium truncate">{s.title}</span>
                    </div>
                    <div className="text-slate-300 text-xs leading-snug">{s.detail}</div>
                    {s.file && (
                      <a href={fileUrl(cf, s.file)} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-[11px] font-mono text-teal-400/80 hover:text-teal-300 truncate max-w-full">
                        <FileText className="w-3 h-3 flex-shrink-0" /><span className="truncate">{s.file}</span>
                      </a>
                    )}
                  </div>
                </div>
              ))}
              {flow.output && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <ArrowRight className="w-4 h-4 text-teal-500/70 rotate-90 md:rotate-0 self-center" />
                  <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs md:max-w-[140px]">
                    <div className="text-emerald-400/80 uppercase tracking-wider text-[10px] mb-0.5">You get</div>
                    <div className="text-white font-medium">{flow.output}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reading order */}
        {cf.reading_order?.length > 0 && (
          <div>
            <div className="flex items-center gap-2 text-white font-semibold mb-3"><BookOpen className="w-4 h-4 text-teal-400" />Where to start reading</div>
            <ol className="space-y-2">
              {cf.reading_order.map((r, i) => (
                <li key={r.path} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-500/15 text-teal-300 text-sm flex items-center justify-center font-semibold">{i + 1}</span>
                  <div className="min-w-0">
                    <a href={fileUrl(cf, r.path)} target="_blank" rel="noopener noreferrer" className="font-mono text-sm text-teal-300 hover:text-teal-200 break-all">{r.path}</a>
                    <div className="text-slate-400 text-sm">{r.why}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Folder map */}
        {cf.folders?.length > 0 && (
          <div>
            <div className="flex items-center gap-2 text-white font-semibold mb-2"><FolderTree className="w-4 h-4 text-teal-400" />What's in each folder</div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 divide-y divide-slate-800/80">
              {cf.folders.map((f) => (
                <div key={f.path} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <Folder className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <a href={dirUrl(cf, f.path)} target="_blank" rel="noopener noreferrer" className="font-mono text-amber-200 hover:text-amber-100 w-40 truncate flex-shrink-0">{f.path}/</a>
                  <span className="text-slate-300 flex-1 truncate">{f.purpose || 'Module'}</span>
                  <span className="text-slate-500 text-xs flex-shrink-0">{f.files} files</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trust signals */}
        <div className="flex flex-wrap gap-2">
          <Signal ok={cf.signals?.readme} label="README" />
          <Signal ok={cf.signals?.tests} label={cf.signals?.tests ? 'Has tests' : 'No tests found'} />
          <Signal ok={cf.signals?.docs} label={cf.signals?.docs ? 'Documented' : 'Thin docs'} />
          <Signal ok={cf.signals?.ci} label={cf.signals?.ci ? 'CI checks' : 'No CI'} />
          {cf.signals?.docker && <Signal ok label="Docker ready" />}
          {cf.signals?.examples && <Signal ok label="Examples included" />}
          <Signal ok={!!cf.signals?.license} label={cf.signals?.license ? `${cf.signals.license} license` : 'No license'} warn={!cf.signals?.license} />
          {daysSincePush !== null && (
            <Signal ok={daysSincePush <= 180} warn={daysSincePush > 180 && daysSincePush <= 540} label={daysSincePush <= 30 ? 'Updated this month' : daysSincePush <= 180 ? `Updated ${Math.round(daysSincePush / 30)} mo ago` : `Last update ${Math.round(daysSincePush / 30)} mo ago`} />
          )}
          {cf.repo?.archived && <Signal ok={false} warn label="Archived — read only" />}
        </div>

        {/* Under the hood — for developers, collapsed */}
        <div className="rounded-lg border border-slate-800">
          <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between px-4 py-3 text-sm text-slate-300 hover:text-white">
            <span className="flex items-center gap-2"><Github className="w-4 h-4" />Under the hood (for developers)</span>
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {open && (
            <div className="px-4 pb-4 space-y-4 text-sm">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/50"><div className="text-xl font-bold text-white">{cf.size.files}</div><div className="text-xs text-slate-400">files</div></div>
                <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/50"><div className="text-xl font-bold text-white">{cf.size.dirs}</div><div className="text-xs text-slate-400">folders</div></div>
                <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/50"><div className="text-xl font-bold text-white">{cf.size.code_files}</div><div className="text-xs text-slate-400">code · {cf.size.doc_files} docs · {cf.size.config_files} config</div></div>
                <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/50"><div className="text-xl font-bold text-white">{cf.repo?.size_kb >= 1024 ? (cf.repo.size_kb / 1024).toFixed(1) + 'M' : (cf.repo?.size_kb || 0) + 'K'}</div><div className="text-xs text-slate-400">repo size</div></div>
              </div>
              {cf.entry_points?.length > 0 && (
                <div>
                  <div className="text-slate-400 mb-1.5">Entry points</div>
                  <div className="flex flex-wrap gap-2">
                    {cf.entry_points.map((p) => (
                      <a key={p} href={fileUrl(cf, p)} target="_blank" rel="noopener noreferrer"><Badge className="bg-teal-500/10 text-teal-300 border-teal-500/20 border text-xs font-mono"><Play className="w-3 h-3 mr-1" />{p}</Badge></a>
                    ))}
                  </div>
                </div>
              )}
              {cf.config_files?.length > 0 && (
                <div>
                  <div className="text-slate-400 mb-1.5">Config & manifests</div>
                  <div className="flex flex-wrap gap-2">
                    {cf.config_files.map((p) => (
                      <a key={p} href={fileUrl(cf, p)} target="_blank" rel="noopener noreferrer"><Badge variant="outline" className="border-slate-600 text-slate-300 text-xs font-mono"><FileText className="w-3 h-3 mr-1" />{p}</Badge></a>
                    ))}
                  </div>
                </div>
              )}
              {cf.root_files?.length > 0 && (
                <div>
                  <div className="text-slate-400 mb-1.5">Top level</div>
                  <div className="bg-slate-950/60 rounded-lg p-3 border border-slate-800 max-h-56 overflow-auto font-mono text-xs">
                    {cf.folders.map((f) => (
                      <div key={'d-' + f.path} className="flex items-center gap-2 text-amber-300 py-0.5"><Folder className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />{f.path}/</div>
                    ))}
                    {cf.root_files.map((f) => (
                      <div key={'f-' + f} className="flex items-center gap-2 text-slate-300 py-0.5"><FileText className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />{f}</div>
                    ))}
                  </div>
                </div>
              )}
              {cf.truncated && <p className="text-xs text-amber-300/80">Very large repository — GitHub returned a partial file list, so counts are lower bounds.</p>}
              <p className="text-xs text-slate-500">Line counts are estimates from file sizes ({cf.size.loc_human} lines of code). Computed {cf.computed_at ? new Date(cf.computed_at).toLocaleDateString('en-US') : 'recently'} from the default branch.</p>
            </div>
          )}
        </div>

        {cf.repo?.html_url && (
          <a href={cf.repo.html_url} target="_blank" rel="noopener noreferrer" className="block">
            <Button variant="outline" className="w-full border-slate-600 text-slate-200 hover:bg-white/5">
              <Github className="w-4 h-4 mr-2" />Read the full source on GitHub
            </Button>
          </a>
        )}
      </CardContent>
    </Card>
  )
}
