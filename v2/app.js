requestAnimationFrame(() => document.documentElement.classList.add('ready'))
const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches

const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) }
}), { threshold: .12, rootMargin: '0px 0px -6% 0px' })
document.querySelectorAll('.rv').forEach(el => io.observe(el))

// цифры досчитываются, а не появляются
document.querySelectorAll('[data-count]').forEach(el => {
  if (reduce) return
  const end = +el.dataset.count, suf = el.dataset.suffix || ''
  el.textContent = '0' + suf
  const co = new IntersectionObserver(es => {
    if (!es[0].isIntersecting) return
    co.disconnect()
    const t0 = performance.now(), d = 1800
    ;(function tick(t) {
      const p = Math.min(1, (t - t0) / d), v = 1 - Math.pow(1 - p, 3)
      el.textContent = Math.round(end * v) + suf
      if (p < 1) requestAnimationFrame(tick)
    })(t0)
  })
  co.observe(el)
})

// видео грузим только по клику
function mount(b) {
  const f = document.createElement('iframe')
  f.src = 'https://rutube.ru/play/embed/' + b.dataset.v + '/?autoplay=1'
  f.allow = 'autoplay; fullscreen; encrypted-media'
  f.allowFullscreen = true
  b.replaceChildren(f)
}
document.querySelectorAll('.vbtn').forEach(b => b.addEventListener('click', () => mount(b)))

// отзывы: список слева управляет панелью справа
const vb = document.getElementById('voiceBtn')
const tabs = document.querySelectorAll('.vlist button')
tabs.forEach(t => t.addEventListener('click', () => {
  tabs.forEach(x => x.setAttribute('aria-selected', x === t))
  vb.dataset.v = t.dataset.v
  const img = document.createElement('img')
  img.src = '../assets/img/' + t.dataset.img
  img.alt = ''
  const play = document.createElement('span')
  play.className = 'play'
  vb.replaceChildren(img, play)
  document.getElementById('voiceName').textContent = t.dataset.name
  document.getElementById('voiceLink').href = 'https://rutube.ru/video/' + t.dataset.v + '/?r=wd'
}))

document.getElementById('leadForm').addEventListener('submit', e => {
  e.preventDefault()
  e.target.querySelector('.ok').classList.add('on')
})
