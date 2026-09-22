const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches
const $ = (s, r = document) => r.querySelector(s)
const $$ = (s, r = document) => [...r.querySelectorAll(s)]
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

/* ---------- split: буквы для вордмарка, слова для заголовков ----------
   Режем до снятия шторки: замер и разбиение идут за ней, показ – дешёвый opacity/transform. */
function split(el, cls, byChar) {
  const text = el.textContent
  el.setAttribute('aria-label', text)
  el.textContent = ''
  let n = 0
  text.split(' ').forEach((word, wi, arr) => {
    const w = document.createElement('span')
    w.style.display = 'inline-block'
    w.style.whiteSpace = 'nowrap'
    w.setAttribute('aria-hidden', 'true')
    if (byChar) {
      for (const c of word) {
        const s = document.createElement('span')
        s.className = cls; s.textContent = c; s.style.setProperty('--n', n++)
        w.appendChild(s)
      }
    } else {
      w.className = cls; w.textContent = word; w.style.setProperty('--n', n++)
    }
    el.appendChild(w)
    if (wi < arr.length - 1) el.appendChild(document.createTextNode(' '))
  })
}
$$('[data-chars]').forEach(el => split(el, 'ch', true))
$$('[data-words]').forEach(el => { split(el, 'wd', false); el.classList.add('rvh') })

// слова заявления: каждое – отдельный span, внутри em тоже
const scrub = $('#scrub')
const scrubWords = []
if (scrub) {
  const walk = node => {
    [...node.childNodes].forEach(ch => {
      if (ch.nodeType === 3) {
        const frag = document.createDocumentFragment()
        ch.textContent.split(/(\s+)/).forEach(tok => {
          if (!tok.trim()) { frag.appendChild(document.createTextNode(tok)); return }
          const s = document.createElement('span'); s.className = 'w'; s.textContent = tok
          scrubWords.push(s); frag.appendChild(s)
        })
        node.replaceChild(frag, ch)
      } else walk(ch)
    })
  }
  walk(scrub)
}

/* ---------- сцены GetLayers: iframe + их собственный протокол встраивания ---------- */
function mountScene(host) {
  if (reduce || host.firstChild) return null
  const f = document.createElement('iframe')
  f.src = host.dataset.src
  f.title = ''
  f.setAttribute('aria-hidden', 'true')
  f.tabIndex = -1
  f.addEventListener('load', () => {
    f.contentWindow.postMessage({ gl: 1, type: 'card' }, '*')   // без панели и собственного fade
    setTimeout(() => f.classList.add('on'), 250)                 // ≥1 кадр отрисован
    host.dispatchEvent(new Event('sceneready'))
  })
  host.appendChild(f)
  return f
}
const unmountScene = host => host.replaceChildren()

/* ---------- loader: честный счётчик с потолком 92 ---------- */
const loader = $('#loader'), ldNum = $('#ldNum'), ldBar = $('#ldBar')
const MIN_VISIBLE = 1400, HARD_CAP = 6500
const t0 = performance.now()
let ready = false, v = 0, last = t0, opened = false
const sig = { fonts: false, load: false, scene: false }
const check = () => { ready = sig.fonts && sig.load && sig.scene }

document.fonts.ready.then(() => { sig.fonts = true; check() })
if (document.readyState === 'complete') sig.load = true
else addEventListener('load', () => { sig.load = true; check() })

const drapeHost = $('#drapeHost')
let drape = mountScene(drapeHost)
if (drape) drapeHost.addEventListener('sceneready', () => { sig.scene = true; check() }, { once: true })
else sig.scene = true
check()

function open() {
  if (opened) return
  opened = true
  // ворота открываются в НАЧАЛЕ ухода шторки: контент въезжает сквозь неё
  document.body.classList.add('open')
  loader.classList.add('out')
  loader.addEventListener('transitionend', () => {
    document.body.classList.remove('loading')   // скролл отпускаем позже, на onRest
    loader.remove()
    startCounters()
  }, { once: true })
}

if (reduce) { document.body.classList.add('open'); document.body.classList.remove('loading'); opened = true }
else (function tick(now) {
  const dt = Math.min((now - last) / 1000, .05); last = now
  const elapsed = now - t0
  const isReady = (ready && elapsed > MIN_VISIBLE) || elapsed > HARD_CAP
  if (isReady && v >= 99.4) v = 100
  else { const ceil = isReady ? 100 : 92; v += (ceil - v) * (isReady ? 6 : 1.7) * dt }
  ldNum.textContent = Math.floor(v)
  ldBar.style.transform = 'scaleX(' + v / 100 + ')'
  if (v >= 100) return open()
  requestAnimationFrame(tick)
})(t0)

/* ---------- ткань: курсор пробрасываем сообщением, клики остаются у страницы ---------- */
const hero = $('#hero')
let lastAim = 0, heroVisible = true
const aim = (x, y) => drape && drape.contentWindow && drape.contentWindow.postMessage({ gl: 1, type: 'aim', x, y }, '*')
hero.addEventListener('pointermove', e => {
  const r = hero.getBoundingClientRect()
  lastAim = performance.now()
  aim((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height)
}, { passive: true })
// без указателя (тач, простой) ткань ведёт невидимая рука – складки не замирают
if (!reduce) (function idle(now) {
  if (heroVisible && now - lastAim > 2200) {
    const t = now / 1000
    aim(.5 + .34 * Math.sin(t * .31), .5 + .26 * Math.sin(t * .47 + 1.3))
  }
  requestAnimationFrame(idle)
})(performance.now())

new IntersectionObserver(([e]) => {
  heroVisible = e.isIntersecting
  $('#dock').classList.toggle('on', !e.isIntersecting)
  // вне экрана WebGL-контекст не держим
  if (!e.isIntersecting && drape) { unmountScene(drapeHost); drape = null }
  else if (e.isIntersecting && !drape && opened) drape = mountScene(drapeHost)
}, { threshold: 0, rootMargin: '60% 0px 60% 0px' }).observe(hero)

/* ---------- поле: ленивая сцена, прогресс скролла → iAnimation ---------- */
const field = $('#field'), terrainHost = $('#terrainHost')
let terrain = null
new IntersectionObserver(([e]) => {
  if (e.isIntersecting && !terrain) terrain = mountScene(terrainHost)
  else if (!e.isIntersecting && terrain) { unmountScene(terrainHost); terrain = null }
}, { rootMargin: '80% 0px 80% 0px' }).observe(field)

/* ---------- один скролл-клок на всё, пишем в переменные, не в состояние ---------- */
let ticking = false
function onScroll() {
  if (ticking) return
  ticking = true
  requestAnimationFrame(() => {
    ticking = false
    const vh = innerHeight
    if (scrub && !reduce) {
      const r = scrub.getBoundingClientRect()
      const p = clamp((vh * .82 - r.top) / (r.height + vh * .38), 0, 1)
      const lit = Math.round(p * scrubWords.length)
      scrubWords.forEach((w, i) => w.classList.toggle('lit', i < lit))
    }
    if (terrain && terrain.contentWindow) {
      const r = field.getBoundingClientRect()
      const p = clamp(-r.top / (r.height - vh), 0, 1)
      terrain.contentWindow.postMessage({ gl: 1, type: 'progress', v: p }, '*')
    }
  })
}
addEventListener('scroll', onScroll, { passive: true })
onScroll()

/* ---------- появление ниже первого экрана ---------- */
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) }
}), { threshold: .2, rootMargin: '0px 0px -8% 0px' })
$$('.rv, .rvh').forEach(el => io.observe(el))

/* ---------- цифры досчитываются ---------- */
function startCounters() {
  if (reduce) return
  $$('[data-count]').forEach(el => {
    const end = +el.dataset.count, suf = el.dataset.suffix || ''
    const s = performance.now() + 700, d = 2000
    el.textContent = '0' + suf
    ;(function tick(t) {
      const p = clamp((t - s) / d, 0, 1), k = 1 - Math.pow(1 - p, 4)
      el.textContent = Math.round(end * k) + suf
      if (p < 1) requestAnimationFrame(tick)
    })(performance.now())
  })
}

/* ---------- каталог: колонка под курсором раскрывается ---------- */
const cols = $$('#cols .col')
cols.forEach(c => {
  const on = () => cols.forEach(x => x.classList.toggle('on', x === c))
  c.addEventListener('pointerenter', on)
  c.addEventListener('focus', on)
})

/* ---------- видео по клику, форма-заглушка ---------- */
$$('.vbtn').forEach(b => b.addEventListener('click', () => {
  const f = document.createElement('iframe')
  f.src = 'https://rutube.ru/play/embed/' + b.dataset.v + '/?autoplay=1'
  f.allow = 'autoplay; fullscreen; encrypted-media'
  f.allowFullscreen = true
  b.replaceChildren(f)
}))
$('#leadForm').addEventListener('submit', e => { e.preventDefault(); $('.ok', e.target).classList.add('on') })
