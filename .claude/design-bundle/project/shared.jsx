// Shared primitives for FEAP screens — shell, icons, chips, chain, etc.
// Exposes to window for use in other babel scripts.

// ─── Lucide-style inline icons (stroke) ────────────────────────────────
const Icon = ({ d, size = 14, fill, stroke = 'currentColor', style, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill || 'none'}
    stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={style} {...rest}>
    {typeof d === 'string' ? <path d={d} /> : d}
  </svg>
);

const Icons = {
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  chevronRight: <path d="m9 6 6 6-6 6" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  chevronLeft: <path d="m15 6-6 6 6 6" />,
  check: <path d="M4 12l5 5L20 6" />,
  checkCircle: <><circle cx="12" cy="12" r="10" /><path d="m8 12 3 3 5-6" /></>,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  sparkles: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />,
  cpu: <><rect x="5" y="5" width="14" height="14" rx="2" /><rect x="9" y="9" width="6" height="6" /><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" /></>,
  file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></>,
  upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5-5 5 5" /><path d="M12 15V5" /></>,
  download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5" /><path d="M12 15V3" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  trash: <><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></>,
  edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4z" /></>,
  copy: <><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>,
  filter: <path d="M3 4h18l-7 9v6l-4 2v-8z" />,
  home: <><path d="m3 12 9-9 9 9" /><path d="M5 10v10h14V10" /></>,
  grid: <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></>,
  tree: <><circle cx="18" cy="6" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="18" r="3"/><path d="M15.4 7.5 8.6 10.5"/><path d="m8.6 13.5 6.8 3"/></>,
  list: <><path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/></>,
  book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5z" /><path d="M4 19.5v0A2.5 2.5 0 0 1 6.5 22H20v-5" /></>,
  shield: <path d="M12 2 4 5v7c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V5z" />,
  alert: <><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></>,
  info: <><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></>,
  help: <><circle cx="12" cy="12" r="10" /><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01" /></>,
  clock: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>,
  loader: <><path d="M12 3v3M12 18v3M5.6 5.6l2.2 2.2M16.2 16.2l2.2 2.2M3 12h3M18 12h3M5.6 18.4l2.2-2.2M16.2 7.8l2.2-2.2"/></>,
  refresh: <><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></>,
  play: <path d="m6 4 14 8-14 8z" fill="currentColor" />,
  pause: <><rect x="6" y="5" width="4" height="14" fill="currentColor" stroke="none"/><rect x="14" y="5" width="4" height="14" fill="currentColor" stroke="none"/></>,
  stop: <rect x="6" y="6" width="12" height="12" fill="currentColor" stroke="none" />,
  arrow: <><path d="M5 12h14M12 5l7 7-7 7" /></>,
  arrowLeft: <><path d="M19 12H5M12 19l-7-7 7-7"/></>,
  drag: <><circle cx="9" cy="5" r="1" fill="currentColor" stroke="none" /><circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="9" cy="19" r="1" fill="currentColor" stroke="none" /><circle cx="15" cy="5" r="1" fill="currentColor" stroke="none" /><circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="15" cy="19" r="1" fill="currentColor" stroke="none" /></>,
  split: <><path d="M8 3H4v4"/><path d="M16 3h4v4"/><path d="M4 3c4 4 4 18 0 18"/><path d="M20 3c-4 4-4 18 0 18"/></>,
  merge: <><path d="M8 21V5"/><path d="M16 21V5"/><path d="m6 9 2-4 2 4"/><path d="m14 9 2-4 2 4"/></>,
  more: <><circle cx="12" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="18" r="1" fill="currentColor" stroke="none"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></>,
  bell: <><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3a4 4 0 0 1 0 7.8"/></>,
  link: <><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></>,
  lightning: <path d="m13 2-8 12h6l-1 8 8-12h-6z" fill="currentColor" stroke="currentColor"/>,
  package: <><path d="m16 11 5-3V16a2 2 0 0 1-1 1.7l-7 4a2 2 0 0 1-2 0l-7-4A2 2 0 0 1 3 16V8l5 3"/><path d="m12 22V12"/><path d="M3 8l9-4 9 4-9 4-9-4z"/></>,
  scale: <><path d="m16 16 3-8 3 8c-2 1-4 1-6 0z"/><path d="m2 16 3-8 3 8c-2 1-4 1-6 0z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></>,
  globe: <><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></>,
  zap: <path d="m13 2-3 7h4l-3 13 10-14h-5l3-6z"/>,
  expand: <><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></>,
  folder: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>,
  save: <><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></>,
};

// Convenient wrapper: <I name="search" size={14}/>
const I = ({ name, size, ...rest }) => <Icon d={Icons[name]} size={size} {...rest} />;

// ─── Shell: Sidebar + Topbar ──────────────────────────────────────────
function SideBar({ active }) {
  const items = [
    { section: 'Работа' },
    { id: 'single', label: 'Классификация товара', icon: 'sparkles' },
    { id: 'docs', label: 'Документы', icon: 'file', count: 3 },
    { id: 'jobs', label: 'Задачи', icon: 'list', count: 12 },
    { section: 'Справочники' },
    { id: 'tree', label: 'Дерево ТН ВЭД', icon: 'tree' },
    { id: 'ntm', label: 'Меры НТР', icon: 'shield' },
    { id: 'rates', label: 'Ставки и акцизы', icon: 'scale' },
    { section: 'Организация' },
    { id: 'team', label: 'Команда', icon: 'users' },
    { id: 'settings', label: 'Настройки', icon: 'settings' },
  ];
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">FE</div>
        <div>
          <div className="brand-name">FEAP</div>
          <div className="brand-sub">ВЭД-классификатор</div>
        </div>
      </div>
      {items.map((x, i) => x.section ? (
        <div key={i} className="nav-section">{x.section}</div>
      ) : (
        <div key={i} className={'nav-item' + (active === x.id ? ' active' : '')}>
          <I name={x.icon} />
          <span>{x.label}</span>
          {x.count != null && <span className="count">{x.count}</span>}
        </div>
      ))}
      <div style={{ flex: 1 }} />
      <div style={{ padding: '10px 10px 0', borderTop: '1px solid var(--border)', marginTop: 10, fontSize: 11.5, color: 'var(--text-subtle)' }}>
        <div className="row gap-6"><span className="dot success"></span>API онлайн · v1.4.2</div>
      </div>
    </aside>
  );
}

function TopBar({ crumbs = [], search = true }) {
  return (
    <div className="topbar">
      {crumbs.length > 0 && (
        <div className="crumbs">
          {crumbs.map((c, i) => (
            <React.Fragment key={i}>
              {i > 0 && <I name="chevronRight" size={12} className="sep" />}
              <span className={i === crumbs.length - 1 ? 'cur' : ''}>{c}</span>
            </React.Fragment>
          ))}
        </div>
      )}
      {search && (
        <div className="search">
          <I name="search" />
          <input placeholder="Поиск по коду, описанию, задачам…" />
          <span className="kbd">⌘K</span>
        </div>
      )}
      <button className="btn btn-sm btn-ghost"><I name="bell" /></button>
      <div className="user">
        <div className="avatar">АК</div>
        <div className="col">
          <div className="user-name">Айгуль Калыбекова</div>
          <div className="user-org">ОсОО «Кыргыз-Лоджистик»</div>
        </div>
      </div>
    </div>
  );
}

function Shell({ active, crumbs, children }) {
  return (
    <div className="feap stage">
      <div className="app-shell">
        <SideBar active={active} />
        <div className="main">
          <TopBar crumbs={crumbs} />
          <div className="content scroll">{children}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Status Chip ──────────────────────────────────────────────────────
function StatusChip({ status, showIcon = true }) {
  const map = {
    completed: { label: 'Завершено', tone: 'success', icon: 'checkCircle' },
    running: { label: 'Выполняется', tone: 'info', icon: 'loader' },
    pending: { label: 'В очереди', tone: 'neutral', icon: 'clock' },
    needs_input: { label: 'Нужны уточнения', tone: 'warn', icon: 'help' },
    failed: { label: 'Ошибка', tone: 'danger', icon: 'alert' },
    cancelled: { label: 'Отменено', tone: 'neutral', icon: 'close' },
    draft: { label: 'Черновик', tone: 'outline', icon: 'edit' },
  };
  const c = map[status] || map.pending;
  return (
    <span className={'chip ' + c.tone}>
      {showIcon && <I name={c.icon} size={11} />}
      {c.label}
    </span>
  );
}

// ─── Classification chain (section → group → …) ──────────────────────
function Chain({ steps }) {
  return (
    <div className="chain">
      {steps.map((s, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="chain-sep"><I name="chevronRight" size={14} /></span>}
          <div className={'chain-step' + (s.current ? ' current' : '')}>
            <div className="lvl">{s.lvl}</div>
            <div className="code">{s.code}</div>
            {s.desc && <div className="desc">{s.desc}</div>}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Confidence bar ───────────────────────────────────────────────────
function Confidence({ value }) {
  const pct = Math.round(value * 100);
  const klass = value >= 0.8 ? '' : value >= 0.6 ? ' mid' : ' low';
  return (
    <div className={'conf' + klass}>
      <div className="conf-bar"><i style={{ width: pct + '%' }} /></div>
      <span className="conf-val">{pct}%</span>
    </div>
  );
}

// ─── File tile ────────────────────────────────────────────────────────
function FileTile({ name, size, onRemove }) {
  const ext = name.split('.').pop().toUpperCase();
  return (
    <div className="file-tile">
      <div className="ico">{ext}</div>
      <div className="meta">
        <div className="name">{name}</div>
        <div className="size">{size}</div>
      </div>
      {onRemove && (
        <button className="btn btn-sm btn-ghost" onClick={onRemove}>
          <I name="close" size={13} />
        </button>
      )}
    </div>
  );
}

Object.assign(window, {
  Icon, Icons, I, Shell, SideBar, TopBar, StatusChip, Chain, Confidence, FileTile,
});
