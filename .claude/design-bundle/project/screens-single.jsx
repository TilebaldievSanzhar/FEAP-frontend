// Screen 1 — Single product classification (idle, result, needs_input)
// Three states exposed as artboards.

function SingleClassifyIdle() {
  const [desc, setDesc] = React.useState('');
  return (
    <Shell active="single" crumbs={['Работа', 'Классификация товара']}>
      <div className="page-head">
        <h1>Классификация товара</h1>
        <p>Опишите товар на естественном языке. Система подберёт 10-значный код ТН ВЭД, ставки и применимые меры нетарифного регулирования.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>
        <div className="card">
          <div className="card-head">
            <div className="row gap-10 grow">
              <I name="sparkles" style={{ color: 'var(--primary)' }} />
              <h3>Новая классификация</h3>
            </div>
            <span className="chip neutral mono">session · new</span>
          </div>
          <div className="card-pad col gap-20">
            <div className="field">
              <label>Описание товара <span style={{ color: 'var(--danger)' }}>*</span></label>
              <textarea className="textarea" rows={5}
                placeholder="Например: электрическая зубная щётка с аккумулятором, ультразвуковая, 3 насадки в комплекте, бренд Oral Pro, для взрослых…"
                value={desc} onChange={e => setDesc(e.target.value)} />
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="hint">Минимум 3 символа. Чем подробнее описание — тем точнее результат.</span>
                <span className="hint mono">{desc.length} / 2000</span>
              </div>
            </div>

            <div className="accord">
              <div className="accord-head">
                <I name="chevronRight" size={13} />
                <div className="grow" style={{ fontWeight: 500, fontSize: 13 }}>Дополнительные параметры</div>
                <span className="chip outline">0 параметров</span>
              </div>
            </div>

            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div className="row gap-8">
                <span className="chip outline"><I name="globe" size={11} />Страна: Китай</span>
                <span className="chip outline"><I name="package" size={11} />HS-6 подсказка не задана</span>
              </div>
              <div className="row gap-8">
                <button className="btn"><I name="save" />Сохранить черновик</button>
                <button className="btn btn-primary" disabled={desc.length < 3}>
                  <I name="sparkles" />Классифицировать
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="col gap-12">
          <div className="card card-pad">
            <div className="kicker" style={{ marginBottom: 10 }}>Как это работает</div>
            <ol style={{ paddingLeft: 18, margin: 0, fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.7 }}>
              <li>LLM читает описание</li>
              <li>Идёт по дереву: раздел → группа → позиция → субпозиция → код</li>
              <li>На любом шаге может запросить уточнение</li>
              <li>Возвращает код + ставки + меры НТР</li>
            </ol>
          </div>
          <div className="card card-pad">
            <div className="kicker" style={{ marginBottom: 10 }}>Недавние</div>
            <div className="col gap-8">
              {[
                { c: '8509 40 000 0', d: 'Блендер погружной', t: '12 мин назад', s: 'completed' },
                { c: '6403 99 960 0', d: 'Ботинки кожаные муж.', t: '1 ч назад', s: 'completed' },
                { c: '—', d: 'Смесь минеральная для корма', t: '2 ч назад', s: 'needs_input' },
              ].map((r, i) => (
                <div key={i} className="row gap-8" style={{ fontSize: 12.5, padding: '6px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
                  <div className="grow col">
                    <span className="mono" style={{ fontSize: 11.5, color: 'var(--primary)' }}>{r.c}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{r.d}</span>
                  </div>
                  <StatusChip status={r.s} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function SingleClassifyResult() {
  return (
    <Shell active="single" crumbs={['Работа', 'Классификация товара', 'Результат']}>
      <div className="page-head row" style={{ alignItems: 'flex-start' }}>
        <div className="grow">
          <div className="row gap-8" style={{ marginBottom: 6 }}>
            <StatusChip status="completed" />
            <span className="chip outline mono">session_01HK3Z…</span>
            <span className="chip outline"><I name="clock" size={11} />4.2 с</span>
          </div>
          <h1 style={{ fontSize: 20, marginBottom: 2 }}>Электрическая зубная щётка Oral Pro с аккумулятором</h1>
          <p style={{ fontSize: 13 }}>Классификация выполнена за 3 шага · модель: gpt-4o · 1 642 токенов</p>
        </div>
        <div className="row gap-8">
          <button className="btn"><I name="copy" />Скопировать</button>
          <button className="btn"><I name="refresh" />Переклассифицировать</button>
          <button className="btn btn-primary"><I name="download" />Экспорт</button>
        </div>
      </div>

      {/* Hero result card */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-pad" style={{ display: 'grid', gridTemplateColumns: 'auto 1px 1fr auto', gap: 28, alignItems: 'center' }}>
          <div>
            <div className="kicker" style={{ marginBottom: 4 }}>Код ТН ВЭД</div>
            <div className="mono" style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--primary)' }}>
              8509&nbsp;80&nbsp;000&nbsp;0
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-subtle)', marginTop: 2 }}>EAEU · 10-знач.</div>
          </div>
          <div className="div-v" />
          <div>
            <div className="kicker" style={{ marginBottom: 4 }}>Наименование</div>
            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>
              Прочие электромеханические бытовые машины со встроенным электродвигателем
            </div>
            <div className="row gap-8">
              <span className="chip info"><I name="cpu" size={11} />ОПИ 1</span>
              <span className="chip info"><I name="cpu" size={11} />ОПИ 3б</span>
              <span className="chip outline">Раздел XVI · Группа 85</span>
            </div>
          </div>
          <div className="col gap-4" style={{ width: 160 }}>
            <div className="kicker">Уверенность</div>
            <Confidence value={0.87} />
            <div className="hint" style={{ fontSize: 11.5, color: 'var(--text-subtle)' }}>Высокая</div>
          </div>
        </div>
      </div>

      {/* Chain */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-head">
          <h3>Цепочка классификации</h3>
          <span className="sub">3 шага, 0 уточнений</span>
          <div className="grow" />
          <button className="btn btn-sm btn-ghost">Скрыть рассуждения<I name="chevronDown" /></button>
        </div>
        <div className="card-pad">
          <Chain steps={[
            { lvl: 'Раздел', code: 'XVI', desc: 'Машины, оборудование' },
            { lvl: 'Группа', code: '85', desc: 'Электрические машины' },
            { lvl: 'Позиция', code: '8509', desc: 'Бытовые электромех. машины' },
            { lvl: 'Субпоз.', code: '8509 80', desc: 'Прочие машины', current: true },
            { lvl: 'Код', code: '8509 80 000 0', desc: '10-знач.', current: true },
          ]} />
          <div className="div" />
          <div className="col gap-10">
            {[
              { step: '1. Раздел XVI', text: 'Товар — бытовое электромеханическое устройство, применяемое в быту. Относится к разделу XVI как машина с электроприводом.' },
              { step: '2. Группа 85 → Позиция 8509', text: 'Позиция 8509 охватывает бытовые электромеханические машины со встроенным электродвигателем (за исключением 8508 — пылесосы).' },
              { step: '3. Субпозиция 8509 80', text: 'Позиции 8509 10–40 покрывают конкретные типы (блендеры, соковыжималки, кухонные комбайны, измельчители для еды). Зубная щётка к ним не относится → «Прочие» (8509 80).' },
            ].map((r, i) => (
              <div key={i} className="row gap-12" style={{ alignItems: 'flex-start', fontSize: 12.5 }}>
                <div className="chip primary" style={{ minWidth: 140, justifyContent: 'center' }}>{r.step}</div>
                <div style={{ color: 'var(--text-muted)', lineHeight: 1.55 }}>{r.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rates + NTM */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: 16, marginBottom: 24 }}>
        <div className="card card-pad">
          <div className="kicker" style={{ marginBottom: 10 }}>Ставка ЕТТ</div>
          <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em' }}>10<span style={{ fontSize: 18, color: 'var(--text-muted)' }}>%</span></div>
          <div style={{ fontSize: 12, color: 'var(--text-subtle)', marginTop: 4 }}>Единый таможенный тариф ЕАЭС</div>
          <div className="div" />
          <div className="row gap-6 mute" style={{ fontSize: 11.5 }}><I name="info" size={11} />Режим: базовый · действует с 01.01.2024</div>
        </div>
        <div className="card card-pad">
          <div className="kicker" style={{ marginBottom: 10 }}>НДС и акциз</div>
          <div className="row gap-16" style={{ alignItems: 'baseline' }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 600 }}>12%</div>
              <div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>НДС КР</div>
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-muted)' }}>—</div>
              <div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>Акциз</div>
            </div>
          </div>
          <div className="div" />
          <div className="row gap-6 mute" style={{ fontSize: 11.5 }}><I name="check" size={11} />Подакцизным не является</div>
        </div>
        <div className="card">
          <div className="card-head" style={{ padding: '12px 16px' }}>
            <I name="shield" size={14} style={{ color: 'var(--info)' }} />
            <h3>Меры НТР</h3>
            <span className="chip info">3 применимы</span>
            <div className="grow" />
            <button className="btn btn-sm btn-ghost">Открыть<I name="arrow" /></button>
          </div>
          <div style={{ padding: '12px 16px' }}>
            <div className="col gap-8" style={{ fontSize: 12.5 }}>
              {[
                { t: 'Сертификат соответствия ТР ТС 004/2011', s: 'success' },
                { t: 'Сертификат ТР ТС 020/2011 (ЭМС)', s: 'success' },
                { t: 'Декларация соответствия СЭЗ', s: 'warn' },
              ].map((m, i) => (
                <div key={i} className="row gap-8">
                  <span className={'dot ' + m.s} />
                  <span className="grow">{m.t}</span>
                  <I name="chevronRight" size={12} className="faint" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Risk flags + action */}
      <div className="alert info">
        <I name="info" className="a-ico" size={18} />
        <div className="a-body grow">
          <div className="a-title">Рекомендуется проверка экспертом</div>
          Код 8509 80 является собирательной группой. Если устройство имеет отдельный массажный блок, возможна классификация в 9019 10. Уточните функциональное назначение у импортёра.
        </div>
        <button className="btn btn-sm">Отправить на ревью</button>
      </div>
    </Shell>
  );
}

function SingleClassifyNeedsInput() {
  const [power, setPower] = React.useState('');
  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ flex: 1, overflow: 'hidden', opacity: 0.55, pointerEvents: 'none' }}>
        <Shell active="single" crumbs={['Работа', 'Классификация товара']}>
          <div className="page-head">
            <h1>Классификация товара</h1>
          </div>
          <div className="card card-pad" style={{ maxWidth: 720 }}>
            <div className="field">
              <label>Описание товара</label>
              <div className="textarea" style={{ background: 'var(--bg-subtle)' }}>Электрическая зубная щётка Oral Pro с аккумулятором и 3 насадками…</div>
            </div>
          </div>
        </Shell>
      </div>

      {/* Side panel */}
      <div className="feap side-panel">
        <div className="side-panel-head">
          <div className="row gap-8" style={{ marginBottom: 8 }}>
            <StatusChip status="needs_input" />
            <span className="chip outline mono">попытка 1 / 3</span>
          </div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Нужны уточнения</h3>
          <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--text-subtle)' }}>
            Система дошла до субпозиции, но для выбора 10-значного кода нужны дополнительные параметры.
          </p>
        </div>

        <div className="side-panel-body col gap-20">
          <div>
            <div className="kicker" style={{ marginBottom: 8 }}>Цепочка решений</div>
            <div className="col gap-6">
              {[
                { ok: true, lvl: 'Раздел', code: 'XVI', d: 'Машины и оборудование' },
                { ok: true, lvl: 'Группа', code: '85', d: 'Электрические машины' },
                { ok: true, lvl: 'Позиция', code: '8509', d: 'Бытовые электромех. машины' },
                { ok: null, lvl: 'Субпоз.', code: '8509 ??', d: 'требуются данные' },
              ].map((s, i) => (
                <div key={i} className="row gap-10" style={{ padding: '8px 10px', background: s.ok ? 'var(--success-tint)' : 'var(--warn-tint)', borderRadius: 6, border: '1px solid ' + (s.ok ? 'var(--success-border)' : 'var(--warn-border)') }}>
                  <I name={s.ok ? 'check' : 'help'} size={13} style={{ color: s.ok ? 'var(--success)' : 'oklch(0.50 0.15 75)' }} />
                  <div className="grow">
                    <div style={{ fontSize: 12.5 }}>
                      <span className="kicker" style={{ marginRight: 8 }}>{s.lvl}</span>
                      <span className="mono" style={{ fontWeight: 600 }}>{s.code}</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{s.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="kicker" style={{ marginBottom: 8 }}>Вопросы</div>
            <div className="col gap-14">
              <div className="field">
                <label>Мощность электродвигателя</label>
                <div className="row gap-6">
                  <input className="input grow" placeholder="например, 1.5" value={power} onChange={e => setPower(e.target.value)} />
                  <select className="select" style={{ width: 90 }}><option>Вт</option><option>кВт</option></select>
                </div>
                <span className="hint">Нужно, чтобы различить 8509 40 и 8509 80.</span>
              </div>

              <div className="field">
                <label>Тип аккумулятора</label>
                <div className="row gap-6" style={{ flexWrap: 'wrap' }}>
                  {['Li-ion', 'Ni-MH', 'Сетевой', 'Не указан'].map((x, i) => (
                    <button key={i} className={'btn btn-sm' + (i === 0 ? ' btn-primary' : '')}>{x}</button>
                  ))}
                </div>
              </div>

              <div className="field">
                <label>Свободный комментарий</label>
                <textarea className="textarea" rows={3} placeholder="Любая дополнительная информация, которая может помочь…" />
              </div>
            </div>
          </div>

          <div className="alert warn">
            <I name="alert" className="a-ico" />
            <div className="a-body">
              После 3 неудачных уточнений сессия завершится. Опишите товар как можно подробнее.
            </div>
          </div>
        </div>

        <div className="side-panel-foot">
          <button className="btn btn-ghost">Отмена</button>
          <button className="btn">Сохранить черновик</button>
          <button className="btn btn-primary"><I name="arrow" />Отправить ответы</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { SingleClassifyIdle, SingleClassifyResult, SingleClassifyNeedsInput });
