// Screens 3 & 4 — Document upload + OCR progress, Extracted products table

function DocumentUpload() {
  return (
    <Shell active="docs" crumbs={['Документы', 'Новый документ']}>
      <div className="page-head">
        <h1>Классификация из документа</h1>
        <p>Загрузите инвойс, спецификацию или контракт. Система распознает товарные позиции и классифицирует их по ТН ВЭД.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
        <div className="col gap-16">
          <div className="card card-pad">
            <div className="dropzone">
              <div className="ico"><I name="upload" size={22} /></div>
              <h4>Перетащите файл сюда или нажмите для выбора</h4>
              <p>PDF или изображение · до 25 МБ · до 200 позиций</p>
            </div>

            <div className="div" />

            <div className="col gap-10">
              <div className="kicker">Загружено</div>
              <FileTile name="Invoice_2026_0418.pdf" size="2.4 МБ · 4 страницы" onRemove={() => {}} />
            </div>

            <div className="div" />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="field">
                <label>Тип документа</label>
                <select className="select" defaultValue="invoice">
                  <option value="invoice">Инвойс / Invoice</option>
                  <option>Спецификация</option>
                  <option>Контракт</option>
                  <option>Упаковочный лист</option>
                  <option>Определить автоматически</option>
                </select>
              </div>
              <div className="field">
                <label>Язык документа</label>
                <select className="select"><option>Русский</option><option>Английский</option><option>Китайский</option><option>Автоопределение</option></select>
              </div>
            </div>

            <div className="div" />

            <div className="col gap-8" style={{ fontSize: 13 }}>
              <label className="row gap-8" style={{ cursor: 'pointer' }}>
                <input type="checkbox" /> Автоматически запустить классификацию после OCR
                <span className="hint">(не рекомендуется для первой проверки)</span>
              </label>
              <label className="row gap-8" style={{ cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked /> Объединять дубликаты по описанию
              </label>
            </div>

            <div className="div" />

            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <div className="grow mute" style={{ fontSize: 12 }}>
                <I name="info" size={12} style={{ verticalAlign: '-2px', marginRight: 4 }} />
                Ожидаемое время OCR: ~40 с для 4 страниц
              </div>
              <button className="btn btn-primary btn-lg"><I name="zap" />Начать обработку</button>
            </div>
          </div>
        </div>

        {/* Right column: tips + history */}
        <div className="col gap-12">
          <div className="card card-pad">
            <div className="kicker" style={{ marginBottom: 10 }}>Как подготовить документ</div>
            <div className="col gap-10" style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
              {[
                { i: 'check', t: 'Текстовый PDF распознаётся точнее сканов' },
                { i: 'check', t: 'Одна товарная позиция — одна строка таблицы' },
                { i: 'check', t: 'Колонки: описание, количество, ед., цена' },
                { i: 'alert', t: 'Избегайте фото под углом и бликов' },
              ].map((x, i) => (
                <div key={i} className="row gap-8" style={{ alignItems: 'flex-start' }}>
                  <I name={x.i} size={13} style={{ color: x.i === 'alert' ? 'var(--warn)' : 'var(--success)', marginTop: 2 }} />
                  <span>{x.t}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-head" style={{ padding: '12px 16px' }}>
              <h3>Недавние документы</h3>
            </div>
            <div className="col" style={{ padding: '6px 0' }}>
              {[
                { n: 'Spec_CN_0412.xlsx', t: 'вчера', s: 'completed', c: '28 поз.' },
                { n: 'Invoice_0408.pdf', t: '3 дня назад', s: 'completed', c: '12 поз.' },
                { n: 'Draft_contract.pdf', t: '1 нед. назад', s: 'draft', c: '—' },
              ].map((r, i) => (
                <div key={i} className="row gap-10" style={{ padding: '10px 16px', fontSize: 12.5, borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                  <I name="file" size={14} className="faint" />
                  <div className="grow col">
                    <span style={{ fontWeight: 500 }}>{r.n}</span>
                    <span className="mute" style={{ fontSize: 11.5 }}>{r.t} · {r.c}</span>
                  </div>
                  <StatusChip status={r.s} showIcon={false} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function OcrProgress() {
  return (
    <Shell active="docs" crumbs={['Документы', 'Invoice_2026_0418.pdf']}>
      <div className="page-head row">
        <div className="grow">
          <div className="row gap-8" style={{ marginBottom: 6 }}>
            <StatusChip status="running" />
            <span className="chip outline mono">ocr_01HK4B…</span>
          </div>
          <h1 style={{ fontSize: 20 }}>Invoice_2026_0418.pdf</h1>
          <p style={{ fontSize: 13 }}>Распознавание документа · автозапуск классификации отключён</p>
        </div>
        <button className="btn btn-danger"><I name="stop" size={12} />Отменить</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24 }}>
        <div className="card card-pad">
          <div className="row" style={{ marginBottom: 14 }}>
            <div className="grow">
              <div className="kicker">Этап 3 из 4</div>
              <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em', marginTop: 2 }}>
                Извлечение товарных карточек
              </div>
              <div className="mute" style={{ fontSize: 12.5 }}>LLM структурирует распознанный текст</div>
            </div>
            <div className="col" style={{ alignItems: 'flex-end' }}>
              <div className="mono" style={{ fontSize: 22, fontWeight: 600 }}>68%</div>
              <div className="mute" style={{ fontSize: 11.5 }}>~12 с осталось</div>
            </div>
          </div>
          <div className="progress" style={{ height: 8, marginBottom: 20 }}>
            <i style={{ width: '68%' }} />
          </div>

          <div className="col gap-10">
            {[
              { n: 1, t: 'Загрузка файла', s: 'done', detail: '2.4 МБ · 220 мс' },
              { n: 2, t: 'OCR (распознавание текста)', s: 'done', detail: '4 страницы · 12.4 с · движок: Tesseract 5 + layout' },
              { n: 3, t: 'Извлечение товарных карточек', s: 'run', detail: 'Обработано 18 из ~27 строк' },
              { n: 4, t: 'Нормализация и дедупликация', s: 'pend', detail: 'Ожидает предыдущий этап' },
            ].map((st, i) => (
              <div key={i} className="row gap-12" style={{ alignItems: 'flex-start', padding: '10px 0', borderBottom: i < 3 ? '1px solid var(--border)' : 'none' }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 99, display: 'grid', placeItems: 'center',
                  background: st.s === 'done' ? 'var(--success-tint)' : st.s === 'run' ? 'var(--info-tint)' : 'var(--bg-muted)',
                  color: st.s === 'done' ? 'var(--success)' : st.s === 'run' ? 'var(--info)' : 'var(--text-faint)',
                  border: '1px solid ' + (st.s === 'done' ? 'var(--success-border)' : st.s === 'run' ? 'oklch(0.85 0.06 240)' : 'var(--border)'),
                  flexShrink: 0, fontSize: 11, fontWeight: 600, fontFamily: 'var(--mono)',
                }}>
                  {st.s === 'done' ? <I name="check" size={13} /> : st.s === 'run' ? <I name="loader" size={13} style={{ animation: 'spin 1.2s linear infinite' }} /> : st.n}
                </div>
                <div className="grow">
                  <div className="row">
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{st.t}</div>
                    <div className="grow" />
                    {st.s === 'run' && <span className="chip info">идёт</span>}
                    {st.s === 'done' && <span className="chip success" style={{ padding: '0 6px' }}><I name="check" size={10} /></span>}
                  </div>
                  <div className="mute" style={{ fontSize: 12, marginTop: 2 }}>{st.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="col gap-12">
          <div className="card">
            <div className="card-head" style={{ padding: '12px 16px' }}>
              <h3>Превью документа</h3>
              <div className="grow" />
              <span className="mute" style={{ fontSize: 11.5 }}>страница 1 из 4</span>
            </div>
            <div className="pdf-preview" style={{ height: 280, margin: 0, borderRadius: 0 }}>
              <div style={{ background: '#fff', width: '76%', height: '86%', border: '1px solid var(--border)', padding: 14, fontSize: 8, lineHeight: 1.5, color: '#334155' }}>
                <div style={{ fontWeight: 700, fontSize: 10 }}>INVOICE N° 2026-0418</div>
                <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }} />
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, padding: '1px 0', background: i === 3 ? 'oklch(0.95 0.08 80 / 0.5)' : 'transparent' }}>
                    <span style={{ width: 14 }}>{i + 1}</span>
                    <span style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                      {['Electric toothbrush Oral Pro', 'Cotton fabric 100% 40\'s', 'Ceramic tiles 60x60', 'Stainless steel bolts M8x40', 'LED bulbs E27 9W', 'Plastic containers 500ml', 'Rubber seals 22mm', 'Aluminum profile L=6m', 'Paint water-based 10L'][i]}
                    </span>
                    <span style={{ width: 18, textAlign: 'right' }}>{[10, 500, 250, 2000, 150, 300, 400, 45, 20][i]}</span>
                    <span style={{ width: 20, textAlign: 'right' }}>{[45, 8, 12, 0.5, 3, 2, 1, 28, 25][i]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card card-pad">
            <div className="kicker" style={{ marginBottom: 8 }}>Соединение</div>
            <div className="col gap-6" style={{ fontSize: 12.5 }}>
              <div className="row gap-8"><span className="dot success" />SSE активно · heartbeat 2 с</div>
              <div className="row gap-8"><span className="dot info" />job_01HK4B9X · приоритет normal</div>
              <div className="row gap-8 mute"><I name="info" size={12} />Можете закрыть вкладку — работа продолжится</div>
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Shell>
  );
}

function ExtractedTable() {
  const rows = [
    { n: 1, d: 'Электрическая зубная щётка Oral Pro, ультразвуковая, с аккумулятором Li-ion, 3 насадки', m: 'пластик ABS + металл', q: 10, u: 'шт', p: '$45.00', o: 'CN', conf: 0.94 },
    { n: 2, d: 'Хлопковая ткань 100%, плотность 120 г/м², ширина 150 см', m: 'хлопок 100%', q: 500, u: 'м', p: '$8.00', o: 'CN', conf: 0.88 },
    { n: 3, d: 'Керамическая плитка напольная 600×600 мм, матовая', m: 'керамогранит', q: 250, u: 'м²', p: '$12.00', o: 'CN', conf: 0.91 },
    { n: 4, d: 'Болты из нержавеющей стали M8×40, DIN 933', m: 'сталь A2-70', q: 2000, u: 'шт', p: '$0.50', o: 'CN', conf: 0.97 },
    { n: 5, d: 'Светодиодные лампы E27 9 Вт, 3000K', m: 'пластик + LED', q: 150, u: 'шт', p: '$3.00', o: 'CN', conf: 0.85, warn: 'Не указан производитель' },
    { n: 6, d: 'Транспортные услуги (доставка контейнер 40HC)', m: '—', q: 1, u: 'шт', p: '$2800.00', o: '—', conf: 0.50, skip: true },
    { n: 7, d: 'Пластиковые контейнеры 500 мл с крышкой', m: 'PP', q: 300, u: 'шт', p: '$2.00', o: 'CN', conf: 0.92 },
    { n: 8, d: 'Резиновые уплотнители круглого сечения Ø22 мм', m: 'NBR', q: 400, u: 'шт', p: '$1.00', o: 'CN', conf: 0.89 },
  ];

  return (
    <Shell active="docs" crumbs={['Документы', 'Invoice_2026_0418.pdf', 'Проверка позиций']}>
      <div className="page-head row" style={{ alignItems: 'flex-start' }}>
        <div className="grow">
          <div className="row gap-8" style={{ marginBottom: 6 }}>
            <StatusChip status="completed" />
            <span className="chip outline mono">ocr_01HK4B…</span>
            <span className="chip outline"><I name="clock" size={11} />OCR 18.2 с</span>
          </div>
          <h1 style={{ fontSize: 20 }}>Проверьте извлечённые позиции</h1>
          <p style={{ fontSize: 13 }}>Отредактируйте описания, объедините дубли или исключите мусорные строки. Дальше — классификация одним батчем.</p>
        </div>
        <div className="row gap-8">
          <button className="btn"><I name="download" />Экспорт CSV</button>
          <button className="btn btn-primary btn-lg"><I name="sparkles" />Классифицировать 7 товаров</button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="card" style={{ marginBottom: 16, padding: '14px 20px', display: 'flex', gap: 28, alignItems: 'center' }}>
        <div>
          <div className="kicker">Всего строк</div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>8</div>
        </div>
        <div className="div-v" />
        <div>
          <div className="kicker">Включено</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--success)' }}>7</div>
        </div>
        <div>
          <div className="kicker">Пропущено</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-subtle)' }}>1</div>
        </div>
        <div>
          <div className="kicker">Требуют внимания</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: 'oklch(0.55 0.15 75)' }}>1</div>
        </div>
        <div className="div-v" />
        <div>
          <div className="kicker">Изменено</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            <span className="chip primary">3 строки отредактированы</span>
          </div>
        </div>
        <div className="grow" />
        <div className="row gap-8">
          <button className="btn btn-sm"><I name="plus" />Добавить строку</button>
          <button className="btn btn-sm"><I name="refresh" />Сбросить правки</button>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="row" style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
          <div className="row gap-6">
            <button className="btn btn-sm btn-ghost"><I name="filter" />Фильтр</button>
            <button className="btn btn-sm btn-ghost">Все</button>
            <button className="btn btn-sm btn-ghost">Включённые</button>
            <button className="btn btn-sm btn-ghost">Пропущенные</button>
          </div>
          <div className="grow" />
          <div className="row gap-8">
            <span className="chip outline">Выделено: 0</span>
            <button className="btn btn-sm" disabled><I name="globe" />Применить страну ко всем</button>
          </div>
        </div>

        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 30 }}><input type="checkbox" /></th>
              <th style={{ width: 36 }}>№</th>
              <th>Описание товара</th>
              <th style={{ width: 140 }}>Материал</th>
              <th style={{ width: 80, textAlign: 'right' }}>Кол-во</th>
              <th style={{ width: 60 }}>Ед.</th>
              <th style={{ width: 90, textAlign: 'right' }}>Цена</th>
              <th style={{ width: 60 }}>Страна</th>
              <th style={{ width: 100 }}>Точность OCR</th>
              <th style={{ width: 90 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.n} className={r.skip ? 'muted' : ''}>
                <td><input type="checkbox" /></td>
                <td className="mono mute">{String(r.n).padStart(2, '0')}</td>
                <td>
                  <div style={{ fontWeight: 500 }}>{r.d}</div>
                  {r.warn && (
                    <div className="row gap-6" style={{ marginTop: 4, fontSize: 11.5, color: 'oklch(0.50 0.15 75)' }}>
                      <I name="alert" size={11} />{r.warn}
                    </div>
                  )}
                  {r.skip && (
                    <div className="row gap-6" style={{ marginTop: 4, fontSize: 11.5, color: 'var(--text-subtle)' }}>
                      <I name="info" size={11} />Услуга — не подлежит классификации
                    </div>
                  )}
                </td>
                <td className="mute" style={{ fontSize: 12.5 }}>{r.m}</td>
                <td className="mono" style={{ textAlign: 'right' }}>{r.q.toLocaleString('ru')}</td>
                <td className="mute">{r.u}</td>
                <td className="mono" style={{ textAlign: 'right' }}>{r.p}</td>
                <td><span className="chip outline">{r.o}</span></td>
                <td><Confidence value={r.conf} /></td>
                <td>
                  <div className="row gap-4">
                    <button className="btn btn-sm btn-ghost" title="Редактировать"><I name="edit" size={12} /></button>
                    <button className="btn btn-sm btn-ghost" title="Разделить"><I name="split" size={12} /></button>
                    <button className="btn btn-sm btn-ghost" title="Исключить"><I name="trash" size={12} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}

Object.assign(window, { DocumentUpload, OcrProgress, ExtractedTable });
