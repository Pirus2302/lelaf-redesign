/* WOW · «Полотно» — вся логика страницы
   1. загрузчик честно ждёт шрифты, load и два фото первого экрана
   2. полотно на первом экране тянется курсором (фактура – фото клиента)
   3. появления из размытия, счётчики, подсветка фразы скроллом
   4. видео и сцена cubic-gradient монтируются только когда нужны */
(() => {
  const q = (s, r = document) => r.querySelector(s)
  const qa = (s, r = document) => Array.from(r.querySelectorAll(s))
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches

  /* ── разбивка на слова (без innerHTML) ───────────────────────── */
  qa('[data-words]').forEach(el => {
    const words = (el.textContent || '').trim().split(/\s+/)
    const kids = Array.from(el.childNodes)
    const accent = kids.find(n => n.nodeType === 1 && (n.tagName === 'EM' || n.tagName === 'I'))
    const accentWords = accent ? (accent.textContent || '').trim().split(/\s+/) : []
    el.replaceChildren()
    words.forEach((w, i) => {
      const s = document.createElement('span')
      s.textContent = w
      s.style.transitionDelay = (i * 55) + 'ms'
      if (accentWords.includes(w)) s.style.color = 'var(--green)'
      el.appendChild(s)
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '))
    })
  })

  /* ── лента: дублируем для бесшовной прокрутки ────────────────── */
  const track = q('#mqTrack')
  if (track) {
    Array.from(track.children).forEach(n => {
      const c = n.cloneNode(true)
      c.setAttribute('aria-hidden', 'true')
      track.appendChild(c)
    })
  }

  /* ── полотно на первом экране ────────────────────────────────── */
  const stage = q('#stage'), cv = q('#cover')
  const hint = q('#hint'), hintText = q('#hintText')
  let coverReady = false
  if (hintText && !matchMedia('(hover: hover)').matches) hintText.textContent = 'Проведите пальцем – укрываем поле'

  const fleece = new Image()
  fleece.src = '../assets/img/fleece.jpg'

  if (cv && stage) {
    const ctx = cv.getContext('2d')
    let W = 0, H = 0, dpr = 1
    let target = 0.42, edge = 0.42          // доля ширины, укрытая полотном
    let manual = false, lastMove = 0, visible = true, raf = 0

    const size = () => {
      const r = stage.getBoundingClientRect()
      dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      W = Math.max(1, Math.round(r.width * dpr)); H = Math.max(1, Math.round(r.height * dpr))
      cv.width = W; cv.height = H
    }

    // край полотна: лёгкая волна, как у висящей ткани
    const wave = (y, t) => {
      const u = y / H
      return (Math.sin(u * 5.4 + t * 0.9) * 0.5 + Math.sin(u * 11 - t * 0.6) * 0.28) * Math.min(46, W * 0.03)
    }

    const paint = t => {
      const x = edge * W
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.globalCompositeOperation = 'source-over'
      ctx.clearRect(0, 0, W, H)
      if (x < 2) return

      ctx.save()
      ctx.beginPath()
      ctx.moveTo(0, -2)
      const step = H / 26
      for (let y = -2; y <= H + step; y += step) ctx.lineTo(x + wave(y, t), y)
      ctx.lineTo(0, H + 2)
      ctx.closePath()
      ctx.clip()

      if (fleece.complete && fleece.naturalWidth) {
        const s = Math.max(W / fleece.naturalWidth, H / fleece.naturalHeight)
        const w = fleece.naturalWidth * s, h = fleece.naturalHeight * s
        ctx.drawImage(fleece, (W - w) / 2 - W * 0.06, (H - h) / 2, w, h)
      } else { ctx.fillStyle = '#41705c'; ctx.fillRect(0, 0, W, H) }

      // подсвеченная фалда у самого края и тень в глубине полотна
      const lit = ctx.createLinearGradient(x - 120 * dpr, 0, x, 0)
      lit.addColorStop(0, 'rgba(0,0,0,0.20)')
      lit.addColorStop(0.72, 'rgba(255,255,255,0.10)')
      lit.addColorStop(1, 'rgba(255,255,255,0.34)')
      ctx.fillStyle = lit
      ctx.fillRect(x - 120 * dpr, -2, 122 * dpr, H + 4)
      ctx.restore()

      // тень, которую полотно кладёт на открытое поле
      const sh = ctx.createLinearGradient(x, 0, x + 90 * dpr, 0)
      sh.addColorStop(0, 'rgba(14,24,16,0.34)')
      sh.addColorStop(1, 'rgba(14,24,16,0)')
      ctx.fillStyle = sh
      ctx.beginPath()
      ctx.moveTo(x - 1, -2)
      const st2 = H / 26
      for (let y = -2; y <= H + st2; y += st2) ctx.lineTo(x + wave(y, t) + 90 * dpr, y)
      for (let y = H + st2; y >= -2; y -= st2) ctx.lineTo(x + wave(y, t), y)
      ctx.closePath()
      ctx.fill()
    }

    const frame = () => {
      raf = 0
      if (!visible) return
      const now = performance.now(), t = now / 1000
      if (!manual || now - lastMove > 5000) {          // сам показывает, как это работает
        manual = false
        target = 0.5 + 0.28 * Math.sin(t * 0.42)
        if (hint) hint.classList.remove('off')
      }
      edge += (target - edge) * 0.09                   // полотно идёт с весом, не рывком
      paint(t)
      raf = requestAnimationFrame(frame)
    }
    const kick = () => { if (!raf && visible) raf = requestAnimationFrame(frame) }

    stage.addEventListener('pointermove', e => {
      const r = stage.getBoundingClientRect()
      manual = true; lastMove = performance.now()
      target = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))
      if (hint) hint.classList.add('off')
      if (calm) { edge = target; paint(0) } else kick()
    }, { passive: true })

    size()
    addEventListener('resize', () => { size(); paint(performance.now() / 1000) }, { passive: true })

    new IntersectionObserver(es => {
      visible = es[0].isIntersecting
      if (visible && !calm) kick()
      else if (raf) { cancelAnimationFrame(raf); raf = 0 }
    }, { threshold: 0.02 }).observe(stage)

    const start = () => { coverReady = true; if (calm) { edge = target = 0.46; paint(0) } else kick() }
    fleece.complete ? start() : fleece.addEventListener('load', start, { once: true })
  }

  /* ── загрузчик · forma-loader ────────────────────────────────── */
  const loader = q('#loader'), ldNum = q('#ldNum'), ldBar = q('#ldBar')
  const MIN_VISIBLE = 1200, HARD_CAP = 6000, CEIL = 92
  const t0 = performance.now()
  let v = 0, last = t0, done = false

  const signals = []
  const wait = p => { const s = { ok: false }; signals.push(s); p.then(() => { s.ok = true }, () => { s.ok = true }) }
  wait(document.fonts ? document.fonts.ready : Promise.resolve())
  wait(document.readyState === 'complete' ? Promise.resolve() : new Promise(r => addEventListener('load', r, { once: true })))
  const plate = q('#plate')
  wait(plate && !plate.complete ? new Promise(r => { plate.addEventListener('load', r, { once: true }); plate.addEventListener('error', r, { once: true }) }) : Promise.resolve())
  wait(new Promise(r => { fleece.complete ? r() : (fleece.addEventListener('load', r, { once: true }), fleece.addEventListener('error', r, { once: true })) }))

  const ready = () => signals.every(s => s.ok)

  const open = () => {
    if (done) return
    done = true
    v = 100
    if (ldNum) ldNum.textContent = '100'
    if (ldBar) ldBar.style.transform = 'scaleX(1)'
    // шторка уходит, а контент уже поднимается сквозь неё
    document.body.classList.add('open')
    const end = () => {
      document.body.classList.remove('loading')
      if (loader) loader.remove()
    }
    if (loader) loader.addEventListener('transitionend', end, { once: true })
    setTimeout(end, 1400)
  }

  const tick = now => {
    const dt = Math.min((now - last) / 1000, 0.05); last = now
    const r = ready() && now - t0 >= MIN_VISIBLE
    if (r && v >= 99.4) v = 100
    else { const c = r ? 100 : CEIL; v += (c - v) * (r ? 6 : 1.7) * dt }
    if (ldNum) ldNum.textContent = String(Math.min(100, Math.round(v)))
    if (ldBar) ldBar.style.transform = 'scaleX(' + (Math.min(100, v) / 100).toFixed(4) + ')'
    if (v >= 99.9 || now - t0 > HARD_CAP) open()
    else requestAnimationFrame(tick)
  }
  if (loader && !calm) requestAnimationFrame(tick); else open()

  /* ── появления ───────────────────────────────────────────────── */
  const io = new IntersectionObserver(es => {
    es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } })
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' })
  qa('.rv, [data-words]').forEach(el => io.observe(el))

  /* ── счётчики ────────────────────────────────────────────────── */
  const cio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return
    const el = e.target, to = parseFloat(el.dataset.count), sfx = el.dataset.suffix || ''
    cio.unobserve(el)
    if (calm) { el.textContent = to.toLocaleString('ru-RU') + sfx; return }
    const dur = 1500, s = performance.now()
    const step = n => {
      const p = Math.min(1, (n - s) / dur), e2 = 1 - Math.pow(1 - p, 3)
      el.textContent = Math.round(to * e2).toLocaleString('ru-RU') + (p === 1 ? sfx : '')
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }), { threshold: 0.5 })
  qa('[data-count]').forEach(el => cio.observe(el))

  /* ── на тач-экранах полотно укрывает карточку само ───────────── */
  if (!matchMedia('(hover: hover)').matches) {
    const lead = q('#worksLead')
    if (lead) lead.textContent = 'Полотно укрывает фото, когда карточка попадает в кадр'
    const wio = new IntersectionObserver(es => es.forEach(e => {
      e.target.classList.toggle('covered', e.isIntersecting)
    }), { threshold: 0.55 })
    qa('.work').forEach(el => wio.observe(el))
  }

  /* ── подсветка фразы скроллом · artist-statement ─────────────── */
  const scrub = q('[data-scrub]')
  let scrubWords = []
  if (scrub) {
    const walk = node => {
      Array.from(node.childNodes).forEach(n => {
        if (n.nodeType === 3) {
          const parts = (n.textContent || '').split(/(\s+)/)
          const frag = document.createDocumentFragment()
          parts.forEach(p => {
            if (!p.trim()) { frag.appendChild(document.createTextNode(p)); return }
            const s = document.createElement('span')
            s.textContent = p; s.className = 'dim'
            frag.appendChild(s)
          })
          node.replaceChild(frag, n)
        } else if (n.nodeType === 1) walk(n)
      })
    }
    walk(scrub)
    scrubWords = qa('span.dim', scrub)
  }

  /* ── один скролл-такт на всё ─────────────────────────────────── */
  const plateEl = q('#plate')
  let sraf = 0
  const onScroll = () => {
    sraf = 0
    if (plateEl && !calm) {
      const r = stage.getBoundingClientRect()
      const p = Math.max(-1, Math.min(1, (r.top + r.height / 2 - innerHeight / 2) / innerHeight))
      plateEl.style.transform = 'translateY(' + (-p * 26).toFixed(1) + 'px)'
    }
    if (scrubWords.length) {
      const r = scrub.getBoundingClientRect()
      const p = 1 - (r.top - innerHeight * 0.22) / (innerHeight * 0.58)
      const lit = Math.round(Math.max(0, Math.min(1, p)) * scrubWords.length)
      scrubWords.forEach((s, i) => s.classList.toggle('dim', i >= lit))
    }
  }
  addEventListener('scroll', () => { if (!sraf) sraf = requestAnimationFrame(onScroll) }, { passive: true })
  onScroll()

  /* ── видео Rutube по клику ───────────────────────────────────── */
  qa('.vbtn').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.v
    if (!id) return
    const f = document.createElement('iframe')
    f.src = 'https://rutube.ru/play/embed/' + id + '/?autoplay=1'
    f.title = b.getAttribute('aria-label') || 'Видео'
    f.allow = 'clipboard-write; autoplay; fullscreen'
    f.setAttribute('allowfullscreen', '')
    b.replaceChildren(f)
    b.style.cursor = 'default'
  }))

  /* ── стрелки карусели ────────────────────────────────────────── */
  const tr = q('#track')
  if (tr) {
    const by = () => (tr.querySelector('.vcard') ? tr.querySelector('.vcard').getBoundingClientRect().width + 20 : 320)
    const prev = q('#carPrev'), next = q('#carNext')
    if (prev) prev.addEventListener('click', () => tr.scrollBy({ left: -by(), behavior: 'smooth' }))
    if (next) next.addEventListener('click', () => tr.scrollBy({ left: by(), behavior: 'smooth' }))
  }

  /* ── сцена cubic-gradient: только пока видна ─────────────────── */
  const host = q('#mosaicHost')
  if (host && !calm) {
    let frameEl = null
    new IntersectionObserver(es => {
      const on = es[0].isIntersecting
      if (on && !frameEl) {
        frameEl = document.createElement('iframe')
        frameEl.src = host.dataset.src
        frameEl.setAttribute('tabindex', '-1')
        frameEl.setAttribute('aria-hidden', 'true')
        frameEl.setAttribute('loading', 'lazy')
        host.appendChild(frameEl)
        setTimeout(() => frameEl && frameEl.classList.add('on'), 60)
      } else if (!on && frameEl) {
        frameEl.remove(); frameEl = null
      }
    }, { rootMargin: '220px 0px' }).observe(host)
  }

  /* ── меню и форма ────────────────────────────────────────────── */
  const burger = q('#burger')
  if (burger) burger.addEventListener('click', () => q('#hd').classList.toggle('open'))
  qa('#hd .hd-nav a').forEach(a => a.addEventListener('click', () => q('#hd').classList.remove('open')))

  const form = q('#leadForm')
  if (form) form.addEventListener('submit', e => {
    e.preventDefault()
    const ok = q('#ok')
    if (ok) ok.classList.add('on')
    form.reset()
  })

  void coverReady
})()
