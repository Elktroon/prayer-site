import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

/* ================= إعدادات تقدر تعدّلها ================= */
const POINTS_PER_PRAYER = 5;     // نقط كل صلاة
const FULL_DAY_BONUS = 10;       // بونص اليوم الكامل (5 من 5). خليه 0 لو مش عايزه
const REVIEW_BY_PARTNER = true;  // true = زرار المراجعة بيظهر عند الطرف التاني (هو اللي بيراجع صوري)
                                 // false = كل واحد يقفل يومه بنفسه
/* ======================================================== */

const PEOPLE = {
  electron: { name: 'اليكترون', avatar: '🧔' },
  wife:     { name: 'مرات اليكترون', avatar: '🧕' },
};
const other = (p) => (p === 'electron' ? 'wife' : 'electron');

const PRAYERS = [
  { key: 'fajr',    name: 'الفجر',  icon: '🌅' },
  { key: 'dhuhr',   name: 'الظهر',  icon: '☀️' },
  { key: 'asr',     name: 'العصر',  icon: '🌤️' },
  { key: 'maghrib', name: 'المغرب', icon: '🌇' },
  { key: 'isha',    name: 'العشاء', icon: '🌙' },
];

const GESTURES = [
  { e: '👍', t: 'إبهام لفوق' },
  { e: '✌️', t: 'علامة النصر بصباعين' },
  { e: '🤞', t: 'صباعين متشابكين' },
  { e: '👌', t: 'علامة تمام (OK)' },
  { e: '🤟', t: 'ثلاث صوابع (أحبك)' },
  { e: '🤙', t: 'إبهام وخنصر (اتصل بيا)' },
  { e: '👋', t: 'تلويح بالسلام' },
  { e: '✋', t: 'كف مفتوح' },
  { e: '🖖', t: 'تحية فولكان' },
  { e: '☝️', t: 'السبابة لفوق' },
  { e: '👊', t: 'قبضة مضمومة' },
  { e: '🤘', t: 'قرون الروك' },
  { e: '🤏', t: 'قرصة صغيرة' },
  { e: '👏', t: 'تصفيق' },
  { e: '🫶', t: 'قلب بالإيدين' },
  { e: '💪', t: 'عضلة الذراع' },
  { e: '🤲', t: 'كفين مفتوحين للدعاء' },
  { e: '👉', t: 'إشارة بالسبابة لليمين' },
];

const VERSES = [
  { t: 'وَأْمُرْ أَهْلَكَ بِالصَّلَاةِ وَاصْطَبِرْ عَلَيْهَا', s: 'سورة طه، آية 132' },
  { t: 'إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَّوْقُوتًا', s: 'سورة النساء، آية 103' },
  { t: 'حَافِظُوا عَلَى الصَّلَوَاتِ وَالصَّلَاةِ الْوُسْطَىٰ', s: 'سورة البقرة، آية 238' },
  { t: 'وَأَقِمِ الصَّلَاةَ ۖ إِنَّ الصَّلَاةَ تَنْهَىٰ عَنِ الْفَحْشَاءِ وَالْمُنكَرِ', s: 'سورة العنكبوت، آية 45' },
  { t: 'وَاسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ', s: 'سورة البقرة، آية 45' },
  { t: 'الصَّلَاةُ نُورٌ', s: 'حديث شريف، رواه مسلم' },
  { t: 'أَوَّلُ مَا يُحَاسَبُ عَلَيْهِ الْعَبْدُ يَوْمَ الْقِيَامَةِ الصَّلَاةُ', s: 'حديث شريف، رواه الترمذي والنسائي' },
];

const LEVELS = [
  { min: 0,   name: 'بداية الطريق' },
  { min: 50,  name: 'محافظ' },
  { min: 150, name: 'ثابت' },
  { min: 300, name: 'مرابط' },
  { min: 600, name: 'من أهل المحراب' },
];

/* ================= الحالة ================= */
const state = {
  me: localStorage.getItem('me'),
  view: null,
  prayers: [],
  reviews: [],
};

const $ = (id) => document.getElementById(id);

function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

function confetti() {
  const box = $('confetti');
  const items = ['⭐', '🌙', '✨', '🕌', '💚', '🤲'];
  for (let i = 0; i < 28; i++) {
    const el = document.createElement('i');
    el.textContent = items[i % items.length];
    el.style.left = Math.random() * 100 + '%';
    el.style.animationDelay = Math.random() * 0.8 + 's';
    box.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }
}

/* ================= تحميل البيانات ================= */
async function load() {
  const [p, r] = await Promise.all([
    sb.from('prayers').select('*').order('created_at', { ascending: true }),
    sb.from('reviews').select('*'),
  ]);
  if (p.error || r.error) {
    console.error(p.error || r.error);
    toast('في مشكلة في الاتصال، راجع config.js');
    return;
  }
  state.prayers = p.data;
  state.reviews = r.data;
  render();
}

/* ================= الحسابات ================= */
function stats(person) {
  const revs = state.reviews
    .filter((r) => r.person === person)
    .sort((a, b) => b.day_no - a.day_no);
  const day = (revs[0]?.day_no || 0) + 1;            // رقم اليوم الحالي (المفتوح)
  const all = state.prayers.filter((x) => x.person === person);
  const today = all.filter((x) => x.day_no === day);
  const fullDays = revs.filter((r) => r.prayers_count === 5).length;
  const points = all.length * POINTS_PER_PRAYER + fullDays * FULL_DAY_BONUS;
  let streak = 0;
  for (const r of revs) { if (r.prayers_count === 5) streak++; else break; }
  const level = [...LEVELS].reverse().find((l) => points >= l.min).name;
  return { revs, day, all, today, fullDays, points, streak, level, closed: revs.length };
}

function gestureFor(person, day, prayer) {
  let h = 0;
  for (const c of `${person}|${day}|${prayer}`) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return GESTURES[h % GESTURES.length];
}

/* ================= الرسم ================= */
function render() {
  if (!state.me) return showChooser();
  if (!state.view) state.view = state.me;

  $('who').innerHTML = `أنت: <b>${PEOPLE[state.me].name}</b> · <button id="switch">تغيير</button>`;
  $('switch').onclick = showChooser;

  const day = new Date().getDate() + new Date().getMonth() * 3;
  const v = VERSES[day % VERSES.length];
  $('verse').innerHTML = `<div class="txt">﴿ ${v.t} ﴾</div><div class="src">${v.s}</div>`;

  renderBoard();
  renderProfile();
  renderGallery();
}

function renderBoard() {
  const s = { electron: stats('electron'), wife: stats('wife') };
  const leader = s.electron.points === s.wife.points ? null : (s.electron.points > s.wife.points ? 'electron' : 'wife');
  $('board').innerHTML = ['electron', 'wife'].map((p) => `
    <div class="pcard ${state.view === p ? 'active' : ''}" data-p="${p}">
      ${leader === p ? '<div class="crown">👑</div>' : ''}
      <div class="av">${PEOPLE[p].avatar}</div>
      <div class="nm">${PEOPLE[p].name}</div>
      <div class="lvl">${s[p].level}</div>
      <div class="pts">${s[p].points} <small>نقطة</small></div>
      <div class="mini"><span>📅 ${s[p].closed} يوم</span><span>🔥 ${s[p].streak}</span></div>
    </div>`).join('');
  document.querySelectorAll('.pcard').forEach((el) => {
    el.onclick = () => { state.view = el.dataset.p; render(); };
  });
}

function renderProfile() {
  const p = state.view;
  const s = stats(p);
  const mine = p === state.me;
  const canReview = REVIEW_BY_PARTNER ? state.me === other(p) : mine;
  const pct = (s.today.length / 5) * 100;

  const badges = [];
  if (s.streak >= 3)  badges.push('🔥 3 أيام متواصلة');
  if (s.streak >= 7)  badges.push('🏅 أسبوع كامل');
  if (s.streak >= 30) badges.push('🏆 شهر كامل');
  if (s.fullDays >= 1) badges.push(`⭐ ${s.fullDays} يوم كامل`);

  const tiles = PRAYERS.map((pr) => {
    const done = s.today.find((x) => x.prayer === pr.key);
    if (done) {
      return `<div class="tile done">
        <div class="pn">${pr.icon} ${pr.name}</div>
        <img src="${done.photo_url}" data-lb="${done.id}" alt="${pr.name}" />
        <div class="st">${done.gesture} تمت ✓ +${POINTS_PER_PRAYER}</div>
      </div>`;
    }
    return `<div class="tile">
      <div class="pn">${pr.icon} ${pr.name}</div>
      <div class="ic">🕋</div>
      ${mine ? `<button class="btn" data-pray="${pr.key}">سجّل صلاتي</button>` : '<div class="st">لسه…</div>'}
    </div>`;
  }).join('');

  $('profile').innerHTML = `
    <div class="panel">
      <h2>${PEOPLE[p].avatar} ${PEOPLE[p].name} <span class="badge">اليوم ${s.day}</span></h2>
      <div class="progress"><i style="width:${pct}%"></i></div>
      <div style="font-size:.85rem;color:#555">${s.today.length} / 5 صلوات النهارده</div>
      ${badges.length ? `<div class="badges">${badges.map((b) => `<span>${b}</span>`).join('')}</div>` : ''}
      <div class="prayers" style="margin-top:12px">${tiles}</div>
      ${canReview ? `<button class="btn gold full" id="review" ${s.today.length ? '' : 'disabled'}>✅ تم المراجعة وقفل اليوم ${s.day}</button>` : ''}
    </div>`;

  document.querySelectorAll('[data-pray]').forEach((b) => (b.onclick = () => openPrayModal(b.dataset.pray)));
  document.querySelectorAll('[data-lb]').forEach((img) => {
    img.onclick = () => openLightbox(state.prayers.find((x) => x.id == img.dataset.lb));
  });
  if ($('review')) $('review').onclick = () => closeDay(p);
}

function renderGallery() {
  const p = state.view;
  const s = stats(p);
  const byDay = {};
  s.all.forEach((x) => (byDay[x.day_no] = byDay[x.day_no] || []).push(x));
  const days = Object.keys(byDay).map(Number).sort((a, b) => b - a);

  const html = days.length ? days.map((d) => {
    const rev = s.revs.find((r) => r.day_no === d);
    return `<div class="day">
      <h3><span>اليوم ${d}</span><span>${rev ? `تمت المراجعة ✓ (${rev.prayers_count}/5)` : 'جاري…'}</span></h3>
      <div class="grid">
        ${byDay[d].map((x) => {
          const pr = PRAYERS.find((q) => q.key === x.prayer);
          return `<div class="thumb" data-lb="${x.id}"><img src="${x.photo_url}" loading="lazy" /><b>${x.gesture}</b><span>${pr.name}</span></div>`;
        }).join('')}
      </div>
    </div>`;
  }).join('') : '<div class="empty">لسه مفيش صور… أول صلاة هتبقى بداية جميلة 🌙</div>';

  $('gallery').innerHTML = `<div class="panel"><h2>🖼️ ألبوم ${PEOPLE[p].name}</h2>${html}</div>`;
  document.querySelectorAll('#gallery [data-lb]').forEach((el) => {
    el.onclick = () => openLightbox(state.prayers.find((x) => x.id == el.dataset.lb));
  });
}

/* ================= النوافذ ================= */
function showChooser() {
  const c = $('chooser');
  c.classList.remove('hidden');
  c.innerHTML = `<div class="sheet">
    <h3>أنت مين؟</h3>
    <p style="margin:8px 0 14px;color:#666">اختار حسابك (هيتحفظ على الموبايل ده)</p>
    <button class="btn full" data-me="electron">🧔 اليكترون</button>
    <button class="btn full" data-me="wife">🧕 مرات اليكترون</button>
  </div>`;
  c.querySelectorAll('[data-me]').forEach((b) => {
    b.onclick = () => {
      state.me = b.dataset.me;
      state.view = state.me;
      localStorage.setItem('me', state.me);
      c.classList.add('hidden');
      render();
    };
  });
}

function openLightbox(x) {
  const pr = PRAYERS.find((q) => q.key === x.prayer);
  const lb = $('lightbox');
  lb.classList.remove('hidden');
  lb.innerHTML = `<div class="lb" style="text-align:center">
    <img src="${x.photo_url}" />
    <p>${PEOPLE[x.person].name} · ${pr.name} · اليوم ${x.day_no} · ${x.gesture}</p>
  </div>`;
  lb.onclick = () => lb.classList.add('hidden');
}

function openPrayModal(prayerKey) {
  const me = state.me;
  const s = stats(me);
  const pr = PRAYERS.find((q) => q.key === prayerKey);
  const g = gestureFor(me, s.day, prayerKey);
  let blob = null;

  const m = $('modal');
  m.classList.remove('hidden');
  m.innerHTML = `<div class="sheet">
    <h3>${pr.icon} صلاة ${pr.name}</h3>
    <p style="color:#666;margin-top:4px">اتصوّر على سجادة الصلاة وإنت بتعمل الحركة دي:</p>
    <div class="gesture">${g.e}</div>
    <div class="gdesc">${g.t}</div>
    <input type="file" id="file" accept="image/*" capture="user" hidden />
    <img id="prev" class="preview hidden" />
    <button class="btn full" id="pick">📸 افتح الكاميرا</button>
    <button class="btn gold full hidden" id="send">رفع الصورة وتسجيل الصلاة (+${POINTS_PER_PRAYER})</button>
    <div class="note">⚠️ بعد الرفع مش هتقدر تمسح الصورة أو تغيّرها.</div>
    <button class="link" id="cancel">إلغاء</button>
  </div>`;

  const close = () => m.classList.add('hidden');
  $('cancel').onclick = close;
  $('pick').onclick = () => $('file').click();

  $('file').onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    blob = await compress(f);
    $('prev').src = URL.createObjectURL(blob);
    $('prev').classList.remove('hidden');
    $('send').classList.remove('hidden');
    $('pick').textContent = '🔄 إعادة التصوير (قبل الرفع)';
  };

  $('send').onclick = async () => {
    if (!blob) return;
    $('send').disabled = true;
    $('send').textContent = 'جاري الرفع…';
    try {
      const path = `${me}/day${s.day}/${prayerKey}.jpg`;
      const up = await sb.storage.from('photos').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
      if (up.error) throw up.error;
      const { data } = sb.storage.from('photos').getPublicUrl(path);
      const ins = await sb.from('prayers').insert({
        person: me, day_no: s.day, prayer: prayerKey, gesture: g.e, photo_url: data.publicUrl,
      });
      if (ins.error) throw ins.error;
      close();
      confetti();
      toast(`تقبل الله 🤲 +${POINTS_PER_PRAYER} نقاط`);
      await load();
    } catch (err) {
      console.error(err);
      toast('حصلت مشكلة. ممكن الصلاة دي متسجلة قبل كده');
      $('send').disabled = false;
      $('send').textContent = 'حاول تاني';
    }
  };
}

async function compress(file) {
  const bmp = await createImageBitmap(file);
  const max = 1280;
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res) => c.toBlob(res, 'image/jpeg', 0.8));
}

async function closeDay(person) {
  const s = stats(person);
  if (!s.today.length) return;
  const ok = confirm(`تقفل يوم ${s.day} لـ ${PEOPLE[person].name}؟\nعدد الصلوات: ${s.today.length} من 5\nمش هينفع ترجع فيها بعد كده.`);
  if (!ok) return;
  const { error } = await sb.from('reviews').insert({
    person, day_no: s.day, prayers_count: s.today.length,
  });
  if (error) { console.error(error); toast('حصلت مشكلة في القفل'); return; }
  confetti();
  toast(s.today.length === 5 ? 'ما شاء الله! يوم كامل 🌟' : 'اتقفل اليوم. بداية يوم جديد بإذن الله 🌙');
  await load();
}

load();
setInterval(load, 45000); // تحديث تلقائي كل 45 ثانية