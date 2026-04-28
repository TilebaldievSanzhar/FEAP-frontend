// Screens 5 & 6 — Batch job progress + items list, Batch answer dialog

function BatchProgress() {
  const items = [
    { n: 1, d: 'Электрическая зубная щётка Oral Pro', code: '8509 80 000 0', status: 'completed', conf: 0.87, duty: '10%' },
    { n: 2, d: 'Хлопковая ткань 100%, 120 г/м²', code: '5208 21 900 0', status: 'completed', conf: 0.92, duty: '8%' },
    { n: 3, d: 'Керамическая плитка 600×600', code: '6907 21 900 0', status: 'completed', conf: 0.95, duty: '12%' },
    { n: 4, d: 'Болты нержавеющие M8×40 DIN 933', code: '7318 15 810 0', status: 'needs_input', conf: null, duty: '—', q: 'Класс прочности?' },
    { n: 5, d: 'Светодиодные лампы E27 9Вт', code: '8539 52 000 0', status: 'completed', conf: 0.90, duty: '5%' },
    { n: 6, d: 'Пластиковые контейнеры 500 мл', code: null, status: 'running', conf: null, duty: '—' },
    { n: 7, d: 'Резиновые уплотнители Ø22 мм', code: null, status: 'needs_input', conf: null, duty: '—', q: 'Материал NBR или EPDM?' },
    { n: 8, d: 'Алюминиевый профиль L=6м', code: null, status: 'pending', conf: null, duty: '—' },
    { n: 9, d: 'Краска водная 10л', code: null, status: 'pending', conf: null, duty: '—' },
    { n: 10, d: 'Корм для животных, минеральная добавка', code: null, status: 'failed', conf: null, duty: '—', err: 'API timeout, 3 попытки' },
  ];

  return (
    <Shell active="jobs" crumbs={['Задачи', 'job_01HK4C9X']}>
      <div className="page-head row" style={{ alignItems: 'flex-start' }}>
        <div className="grow">
          <div className="row gap-8" style={{ marginBottom: 6 }}>
            <StatusChip status="running" />
            <span className="chip outline mono">job_01HK4C9X</span>
            <span className="chip outline">из Invoice_2026_0418.pdf</span>
            <span className="chip outline"><I name="clock" size={11} />начато 2 мин назад</span>
          </div>
          <h1 style={{ fontSize: 20 }}>Классификация 10 товаров</h1>
          <p style={{ fontSize: 13 }}>Живой прогресс по SSE. Можете закрыть вкладку — задача продолжится.</p>
        </div>
        <div className="row gap-8">
          <button className="btn"><I name="pause" size={12} />Приостановить</button>
          <button className="btn btn-danger"><I name="stop" size={12} />Отменить</button>
          <button className="btn btn-primary"><I name="help" />Ответить на уточнения (2)</button>
        </div>
      </div>

      {/* Overall progress card */}
      <div className="card" style={{ marginBottom: 20, padding: '18px 24px' }}>
        <div className="row" style={{ marginBottom: 10, alignItems: 'baseline' }}>
          <div className="grow">
            <div className="row gap-8" style={{ alignItems: 'baseline' }}>
              <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>6 <span className="mute" style={{ fontSize: 16 }}>/ 10</span></div>
              <div className="mute" style={{ fontSize: 13 }}>позиций обработано</div>
            </div>
          </div>
          <div className="mute" style={{ fontSize: 12.5 }}>ETA ~1 мин 20 с</div>
        </div>
        <div className="progress segmented" style={{ height: 10, marginBottom: 14 }}>
          {['done','done','done','needs','done','running','needs','','',''].map((s, i) => (
            <i key={i} className={s} />
          ))}
        </div>
        <div className="row gap-16" style={{ flexWrap: 'wrap' }}>
          <button className="chip success" style={{ cursor: 'pointer' }}><I name="checkCircle" size={11} />4 готово</button>
          <button className="chip warn" style={{ cursor: 'pointer' }}><I name="help" size={11} />2 уточнения</button>
          <button className="chip info" style={{ cursor: 'pointer' }}><I name="loader" size={11} />1 в работе</button>
          <button className="chip neutral" style={{ cursor: 'pointer' }}><I name="clock" size={11} />2 в очереди</button>
          <button className="chip danger" style={{ cursor: 'pointer' }}><I name="alert" size={11} />1 ошибка</button>
          <div className="grow" />
          <span className="mute" style={{ fontSize: 12 }}>Токенов потрачено: <span className="mono">24 812</span></span>
        </div>
      </div>

      {/* Items table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="row" style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
          <div className="row gap-6">
            {['Все (10)', 'Готово (4)', 'Уточнения (2)', 'В работе (1)', 'В очереди (2)', 'Ошибки (1)'].map((x, i) => (
              <button key={i} className={'btn btn-sm' + (i === 0 ? ' btn-primary' : ' btn-ghost')}>{x}</button>
            ))}
          </div>
          <div className="grow" />
          <button className="btn btn-sm"><I name="download" />CSV</button>
          <button className="btn btn-sm"><I name="refresh" />Повторить ошибки</button>
        </div>

        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 40 }}>№</th>
              <th>Товар</th>
              <th style={{ width: 150 }}>Код ТН ВЭД</th>
              <th style={{ width: 70 }}>Ставка</th>
              <th style={{ width: 130 }}>Уверенность</th>
              <th style={{ width: 150 }}>Статус</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.n}>
                <td className="mono mute">{String(r.n).padStart(2, '0')}</td>
                <td>
                  <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 420 }}>{r.d}</div>
                  {r.q && <div style={{ fontSize: 11.5, color: 'oklch(0.50 0.15 75)', marginTop: 2 }}>? {r.q}</div>}
                  {r.err && <div style={{ fontSize: 11.5, color: 'var(--danger)', marginTop: 2 }}>✗ {r.err}</div>}
                </td>
                <td>{r.code ? <span className="mono" style={{ color: 'var(--primary)', fontWeight: 500 }}>{r.code}</span> : <span className="faint mono">—</span>}</td>
                <td className="mono">{r.duty}</td>
                <td>{r.conf ? <Confidence value={r.conf} /> : <span className="faint">—</span>}</td>
                <td><StatusChip status={r.status} /></td>
                <td><button className="btn btn-sm btn-ghost"><I name="chevronRight" size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}

function BatchAnswerDialog() {
  const pending = [
    {
      n: 4, d: 'Болты нержавеющие M8×40 DIN 933', chain: 'XV → 73 → 7318 → 7318 15',
      qs: [
        { q: 'Класс прочности', type: 'select', opts: ['A2-70', 'A2-80', 'A4-70', 'A4-80', 'другой'], hint: 'Указано ли в маркировке головки болта?' },
        { q: 'Назначение', type: 'radio', opts: ['Общего назначения', 'Самонарезающие', 'Специальные'] },
      ],
    },
    {
      n: 7, d: 'Резиновые уплотнители круглого сечения Ø22 мм', chain: 'VII → 40 → 4016',
      qs: [
        { q: 'Тип резины', type: 'select', opts: ['NBR (нитрильная)', 'EPDM', 'Силикон', 'Натуральный каучук', 'Неизвестно'] },
        { q: 'Содержание вулканизованной резины, %', type: 'text', placeholder: 'например, 95' },
      ],
    },
  ];

  return (
    <div style={{ display: 'flex', height: '100%', position: 'relative' }}>
      <div style={{ flex: 1, overflow: 'hidden', opacity: 0.4, pointerEvents: 'none' }}>
        <BatchProgress />
      </div>
      {/* Modal overlay */}
      <div style={{
        position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.35)',
        display: 'grid', placeItems: 'center', padding: 32,
      }}>
        <div className="feap" style={{
          width: 720, maxHeight: '92%', background: '#fff', borderRadius: 12,
          boxShadow: '0 24px 48px -12px rgba(0,0,0,.25)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Head */}
          <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)' }}>
            <div className="row gap-8" style={{ marginBottom: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--warn-tint)', color: 'oklch(0.50 0.15 75)', display: 'grid', placeItems: 'center' }}>
                <I name="help" size={16} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Уточнения по 2 товарам</h3>
                <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-subtle)' }}>Заполните все поля и отправьте одним запросом</p>
              </div>
              <div className="grow" />
              <button className="btn btn-sm btn-ghost"><I name="close" /></button>
            </div>
            <div className="progress" style={{ height: 4 }}><i style={{ width: '0%' }} /></div>
            <div className="row" style={{ fontSize: 11.5, color: 'var(--text-subtle)', marginTop: 6 }}>
              <span>0 из 4 полей заполнено</span>
              <div className="grow" />
              <span>Попытка 2 из 3</span>
            </div>
          </div>

          {/* Body */}
          <div className="scroll" style={{ flex: 1, padding: '4px 24px 20px' }}>
            {pending.map((p, pi) => (
              <div key={p.n} style={{ marginTop: 16 }}>
                <div className="row gap-10" style={{ marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 6, background: 'var(--primary-tint)',
                    color: 'var(--primary)', display: 'grid', placeItems: 'center',
                    fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600,
                  }}>{String(p.n).padStart(2, '0')}</div>
                  <div className="grow">
                    <div style={{ fontWeight: 500, fontSize: 13.5 }}>{p.d}</div>
                    <div className="mono mute" style={{ fontSize: 11.5, marginTop: 2 }}>{p.chain}</div>
                  </div>
                  <button className="btn btn-sm btn-ghost">Детали<I name="chevronRight" /></button>
                </div>

                <div className="col gap-12" style={{ paddingLeft: 34 }}>
                  {p.qs.map((q, qi) => (
                    <div key={qi} className="field">
                      <label>{q.q} <span style={{ color: 'var(--danger)' }}>*</span></label>
                      {q.type === 'select' && (
                        <select className="select"><option value="">— выбрать —</option>{q.opts.map((o, i) => <option key={i}>{o}</option>)}</select>
                      )}
                      {q.type === 'radio' && (
                        <div className="row gap-6" style={{ flexWrap: 'wrap' }}>
                          {q.opts.map((o, i) => <button key={i} className={'btn btn-sm' + (pi === 0 && qi === 1 && i === 0 ? ' btn-primary' : '')}>{o}</button>)}
                        </div>
                      )}
                      {q.type === 'text' && (
                        <input className="input" placeholder={q.placeholder} />
                      )}
                      {q.hint && <span className="hint">{q.hint}</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Foot */}
          <div className="side-panel-foot">
            <button className="btn btn-ghost">Отмена</button>
            <div className="grow" />
            <button className="btn"><I name="save" />Сохранить как черновик</button>
            <button className="btn btn-primary"><I name="arrow" />Отправить все ответы</button>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { BatchProgress, BatchAnswerDialog });
