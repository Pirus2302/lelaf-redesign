// Переключатель вариантов для показа клиенту: одна плашка на всех трёх прототипах
(() => {
  const items = [
    { id: 'v1', label: '1', title: 'Вариант 1 – Чистый' },
    { id: 'v2', label: '2', title: 'Вариант 2 – Тёплый редакционный' },
    { id: 'wow', label: 'WOW', title: 'Вариант WOW – Живое полотно' },
  ]
  const current = items.find(i => location.pathname.includes('/' + i.id + '/'))
  const dark = current && current.id === 'wow'

  const css = document.createElement('style')
  css.textContent = `
  .vsw{position:fixed;left:16px;bottom:20px;z-index:90;display:flex;align-items:center;gap:2px;padding:5px;border-radius:999px;
    font:600 12px/1 Manrope,Montserrat,system-ui,sans-serif;letter-spacing:.04em;
    background:${dark ? 'rgba(10,11,9,.72)' : 'rgba(255,255,255,.9)'};color:${dark ? '#fff' : '#1b231d'};
    border:1px solid ${dark ? 'rgba(255,255,255,.18)' : 'rgba(27,35,29,.14)'};
    backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);box-shadow:0 8px 30px rgba(0,0,0,.12)}
  .vsw a{display:inline-flex;align-items:center;justify-content:center;min-width:36px;height:36px;padding:0 12px;border-radius:999px;
    color:inherit;text-decoration:none;opacity:.6;transition:opacity .2s,background .2s}
  .vsw a:hover{opacity:1;background:${dark ? 'rgba(255,255,255,.1)' : 'rgba(27,35,29,.07)'}}
  .vsw a[aria-current]{opacity:1;background:${dark ? '#fff' : '#2e4435'};color:${dark ? '#0a1413' : '#fff'}}
  .vsw span{padding:0 8px 0 12px;opacity:.55;font-weight:500}
  .vsw .all{font-size:16px;padding:0 10px}
  .vsw{transition:opacity .25s}
  .vsw.top{top:104px;bottom:auto;left:clamp(16px,3.4vw,48px)}
  ${dark ? '@media (max-width:1180px){.vsw{bottom:88px}}' : ''}
  @media (max-width:760px){.vsw{left:10px;bottom:${dark ? '88px' : '12px'}}.vsw.top{top:84px;left:14px}.vsw span{display:none}}
  @media print{.vsw{display:none}}`
  document.head.appendChild(css)

  const bar = document.createElement('nav')
  bar.className = 'vsw'
  bar.setAttribute('aria-label', 'Варианты редизайна')
  const all = document.createElement('a')
  all.href = '../'; all.className = 'all'; all.title = 'Все варианты'; all.textContent = '←'
  const cap = document.createElement('span')
  cap.textContent = 'Вариант'
  bar.append(all, cap)
  items.forEach(i => {
    const a = document.createElement('a')
    a.href = '../' + i.id + '/'; a.textContent = i.label; a.title = i.title
    if (current && current.id === i.id) a.setAttribute('aria-current', 'page')
    bar.appendChild(a)
  })
  document.body.appendChild(bar)

  // WOW: первый экран занят по низу – пока нижняя навигация скрыта, плашка стоит под шапкой
  const dock = document.getElementById('dock')
  if (dark && dock) {
    const place = () => {
      const top = !dock.classList.contains('on')
      if (bar.classList.contains('top') === top) return
      bar.style.opacity = '0'
      setTimeout(() => { bar.classList.toggle('top', top); bar.style.opacity = '' }, 250)
    }
    bar.classList.add('top')
    new MutationObserver(place).observe(dock, { attributes: true, attributeFilter: ['class'] })
  }
})()
