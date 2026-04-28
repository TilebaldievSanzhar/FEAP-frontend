// Screens 7 & 8 — TNVED tree browser + code card, NTM verify

function TnvedTree() {
  const TreeNode = ({ code, desc, level, open, selected, hasChildren, count }) => (
    <div className={'tree-node' + (selected ? ' selected' : '')} style={{ paddingLeft: 8 + level * 14 }}>
      {hasChildren ? <I name={open ? 'chevronDown' : 'chevronRight'} size={12} className="caret" /> : <span style={{ width: 12, display: 'inline-block' }} />}
      <span className="code">{code}</span>
      <span className="grow" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{desc}</span>
      {count != null && <span className="chip outline" style={{ fontSize: 10.5, height: 18 }}>{count}</span>}
    </div>
  );
  return (
    <Shell active="tree" crumbs={['Справочники', 'Дерево ТН ВЭД', 'Раздел XVI', 'Группа 85', '8509']}>
      <div className="page-head">
        <h1>Дерево ТН ВЭД</h1>
        <p>21 раздел, 97 групп, 5 387 кодов. Навигация lazy — подгружаем при раскрытии.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 24, alignItems: 'start' }}>
        {/* Tree panel */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: 12, borderBottom: '1px solid var(--border)', position: 'relative' }}>
            <I name="search" size={13} style={{ position: 'absolute', left: 22, top: 20, color: 'var(--text-faint)' }} />
            <input className="input" placeholder="Код или фрагмент описания…" style={{ paddingLeft: 30 }} />
          </div>
          <div className="scroll tree" style={{ maxHeight: 640, padding: '8px 6px' }}>
            <TreeNode code="I" desc="Живые животные" level={0} hasChildren count={5} />
            <TreeNode code="…" desc="" level={0} />
            <TreeNode code="XV" desc="Недрагоценные металлы" level={0} hasChildren count={11} />
            <TreeNode code="XVI" desc="Машины, оборудование и механизмы" level={0} hasChildren open count={2} />
            <div className="tree-children">
              <TreeNode code="84" desc="Реакторы, котлы, оборудование" level={1} hasChildren />
              <TreeNode code="85" desc="Электрические машины" level={1} hasChildren open />
              <div className="tree-children">
                <TreeNode code="8501" desc="Электродвигатели и генераторы" level={2} hasChildren />
                <TreeNode code="8508" desc="Пылесосы" level={2} hasChildren />
                <TreeNode code="8509" desc="Машины электромеханические бытовые" level={2} hasChildren open selected />
                <div className="tree-children">
                  <TreeNode code="8509 40" desc="Измельчители, соковыжималки, миксеры" level={3} hasChildren />
                  <TreeNode code="8509 80" desc="Прочие машины" level={3} hasChildren open />
                  <div className="tree-children">
                    <TreeNode code="8509 80 000 0" desc="Прочие (вкл. электрощётки)" level={4} selected />
                  </div>
                  <TreeNode code="8509 90" desc="Части" level={3} hasChildren />
                </div>
                <TreeNode code="8510" desc="Электробритвы, машинки для стрижки" level={2} hasChildren />
              </div>
            </div>
            <TreeNode code="XVII" desc="Средства транспорта" level={0} hasChildren />
            <TreeNode code="…" desc="" level={0} />
          </div>
        </div>

        {/* Code detail */}
        <div className="col gap-16">
          <div className="card">
            <div className="card-pad" style={{ display: 'grid', gridTemplateColumns: 'auto 1px 1fr auto', gap: 24, alignItems: 'center' }}>
              <div>
                <div className="kicker">Код ТН ВЭД ЕАЭС</div>
                <div className="mono" style={{ fontSize: 26, fontWeight: 600, color: 'var(--primary)', letterSpacing: '-0.01em' }}>8509 80 000 0</div>
              </div>
              <div className="div-v" />
              <div>
                <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>
                  Машины электромеханические бытовые со встроенным электродвигателем, прочие
                </div>
                <div className="row gap-6">
                  <span className="chip outline">Раздел XVI</span>
                  <span className="chip outline">Группа 85</span>
                  <span className="chip outline">Товарная позиция 8509</span>
                </div>
              </div>
              <div className="row gap-6">
                <button className="btn btn-sm"><I name="copy" /></button>
                <button className="btn btn-sm"><I name="link" /></button>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <div className="stat"><span className="label">Ставка ЕТТ</span><div className="val">10<span className="unit">%</span></div><span className="hint">Базовый режим</span></div>
            <div className="stat"><span className="label">НДС КР</span><div className="val">12<span className="unit">%</span></div><span className="hint">Стандартная ставка</span></div>
            <div className="stat"><span className="label">Акциз</span><div className="val" style={{ color: 'var(--text-faint)' }}>—</div><span className="hint">Не подакцизный</span></div>
            <div className="stat"><span className="label">Меры НТР</span><div className="val">3</div><span className="hint">2 обязательные</span></div>
          </div>

          <div className="card">
            <div className="card-head">
              <I name="shield" size={14} style={{ color: 'var(--info)' }} />
              <h3>Меры нетарифного регулирования</h3>
              <span className="sub">на 24.04.2026</span>
              <div className="grow" />
              <button className="btn btn-sm"><I name="checkCircle" />Проверить для товара</button>
            </div>
            <div className="col" style={{ padding: '8px 0' }}>
              {[
                { t: 'ТР ТС 004/2011', s: 'Безопасность низковольтного оборудования', tag: 'Обязательно', tone: 'warn', act: 'Сертификат соответствия' },
                { t: 'ТР ТС 020/2011', s: 'Электромагнитная совместимость', tag: 'Обязательно', tone: 'warn', act: 'Сертификат соответствия' },
                { t: 'СЭЗ', s: 'Единые санитарно-эпидемиологические требования', tag: 'Возможно', tone: 'neutral', act: 'Декларация соответствия' },
              ].map((m, i) => (
                <div key={i} className="row gap-12" style={{ padding: '12px 24px', borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--primary-tint)', color: 'var(--primary)', display: 'grid', placeItems: 'center' }}>
                    <I name="shield" />
                  </div>
                  <div className="grow">
                    <div className="row gap-8">
                      <span style={{ fontWeight: 500 }}>{m.t}</span>
                      <span className={'chip ' + m.tone}>{m.tag}</span>
                    </div>
                    <div className="mute" style={{ fontSize: 12.5, marginTop: 2 }}>{m.s}</div>
                  </div>
                  <div className="col" style={{ alignItems: 'flex-end' }}>
                    <div className="kicker">Документ</div>
                    <div style={{ fontSize: 12.5 }}>{m.act}</div>
                  </div>
                  <I name="chevronRight" className="faint" />
                </div>
              ))}
            </div>
          </div>

          <div className="card card-pad">
            <div className="kicker" style={{ marginBottom: 10 }}>Примечания к группе 85</div>
            <ol style={{ paddingLeft: 18, margin: 0, fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.7 }}>
              <li>В группу 85 не включаются электрически нагреваемые одеяла и подобные предметы (товарная позиция 6301, 6306) …</li>
              <li>Для целей товарной позиции 8509 термин «бытовые электромеханические машины» означает машины массой не более 20 кг …</li>
            </ol>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function NtmVerify() {
  return (
    <Shell active="ntm" crumbs={['Справочники', 'Меры НТР', 'Верификация']}>
      <div className="page-head">
        <h1>Верификация мер НТР</h1>
        <p>Двойное соответствие: проверяем, применима ли конкретная мера к конкретному описанию товара.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 24, alignItems: 'start' }}>
        <div className="card card-pad col gap-16">
          <div className="field">
            <label>Код ТН ВЭД</label>
            <input className="input mono" defaultValue="8509 80 000 0" />
            <span className="hint">10 знаков · можно вставить с пробелами</span>
          </div>
          <div className="field">
            <label>Описание товара</label>
            <textarea className="textarea" rows={7} defaultValue="Электрическая зубная щётка Oral Pro с аккумулятором Li-ion 3.7В, мощность 1.2 Вт, 3 сменные насадки в комплекте. Бренд: Oral Pro. Производитель: Shenzhen Oral Tech Co. Ltd." />
          </div>
          <div className="field">
            <label>Страна происхождения</label>
            <select className="select"><option>Китай (CN)</option><option>Турция</option></select>
          </div>
          <button className="btn btn-primary btn-lg"><I name="shield" />Проверить применимость</button>
        </div>

        {/* Results */}
        <div className="col gap-12">
          <div className="alert info">
            <I name="info" className="a-ico" />
            <div className="a-body grow">
              <div className="a-title">Проверка завершена · 3 меры проанализированы</div>
              Модель проверила каждое требование меры против описания. Смотрите обоснование для каждого пункта.
            </div>
            <span className="chip outline"><I name="clock" size={11} />6.8 с</span>
          </div>

          {[
            {
              code: 'ТР ТС 004/2011', t: 'Безопасность низковольтного оборудования',
              verdict: 'applies', tone: 'success', icon: 'checkCircle', label: 'Применима',
              why: 'Товар работает от встроенного аккумулятора 3.7 В и может заряжаться от сетевого адаптера. Подпадает под определение низковольтного оборудования согласно п. 2 ТР ТС.',
              action: 'Требуется сертификат соответствия, схема 1с или 3с',
              citations: ['ТР ТС 004/2011, п. 2', 'Приложение 1, строка 14'],
            },
            {
              code: 'ТР ТС 020/2011', t: 'Электромагнитная совместимость технических средств',
              verdict: 'applies', tone: 'success', icon: 'checkCircle', label: 'Применима',
              why: 'Электрическое устройство, генерирующее ЭМП в процессе работы. Попадает под действие регламента.',
              action: 'Сертификат соответствия. Если уже есть ТР ТС 004 — обычно оформляется единым сертификатом.',
              citations: ['ТР ТС 020/2011, ст. 1'],
            },
            {
              code: 'СЭЗ', t: 'Единые санитарно-эпидемиологические требования',
              verdict: 'uncertain', tone: 'warn', icon: 'help', label: 'Сомнительно',
              why: 'Зубная щётка контактирует со слизистой. Однако, классификация к «товарам, подлежащим санконтролю» зависит от того, идёт ли речь о самой щётке или только о сменных насадках. В описании это не различается.',
              action: 'Уточнить у производителя: есть ли СГР на насадки отдельно',
              citations: ['Решение КТС №299, Раздел II, п. 9'],
            },
          ].map((m, i) => (
            <div key={i} className="card">
              <div className="card-pad col gap-12">
                <div className="row gap-12" style={{ alignItems: 'flex-start' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: m.tone === 'success' ? 'var(--success-tint)' : 'var(--warn-tint)', color: m.tone === 'success' ? 'var(--success)' : 'oklch(0.50 0.15 75)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <I name={m.icon} size={18} />
                  </div>
                  <div className="grow">
                    <div className="row gap-8" style={{ marginBottom: 2 }}>
                      <span className="mono" style={{ fontSize: 12.5, color: 'var(--text-subtle)', fontWeight: 500 }}>{m.code}</span>
                      <span className={'chip ' + m.tone}>{m.label}</span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{m.t}</div>
                  </div>
                  <button className="btn btn-sm btn-ghost"><I name="more" /></button>
                </div>

                <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.55, paddingLeft: 52 }}>
                  <div className="kicker" style={{ marginBottom: 4 }}>Обоснование</div>
                  {m.why}
                </div>

                <div className="row gap-8" style={{ paddingLeft: 52, flexWrap: 'wrap' }}>
                  <div className="kicker" style={{ width: '100%', marginBottom: -2 }}>Ссылки</div>
                  {m.citations.map((c, j) => <span key={j} className="chip outline mono" style={{ fontSize: 11 }}><I name="book" size={10} />{c}</span>)}
                </div>

                <div style={{ paddingLeft: 52 }}>
                  <div className="alert" style={{ background: 'var(--bg-subtle)' }}>
                    <I name="arrow" className="a-ico" size={16} />
                    <div className="a-body">
                      <div className="a-title" style={{ fontSize: 12 }}>Что делать</div>
                      {m.action}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}

Object.assign(window, { TnvedTree, NtmVerify });
