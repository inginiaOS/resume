/* ===========================
   CONFIG — แก้ก่อน deploy
=========================== */
const LIFF_URL    = 'https://liff.line.me/YOUR_LIFF_ID_HERE';
const WEBHOOK_URL = 'https://hook.eu1.make.com/YOUR_WEBHOOK_ID';
const NOTIFY_AFTER_MS = 120000; // 2 นาที

/* ===========================
   STATE
=========================== */
const tracker = {
  startTime: Date.now(),
  source: 'Direct',
  medium: '',
  campaign: '',
  sectionsVisited: new Set(),
  sectionTime: {},         // section id → ms spent
  currentSection: null,
  currentSectionStart: null,
  skillClicks: 0,
  skillsOpened: [],
  notifShown: false,
  isReturn: false,
  device: 'Desktop',
};

/* ===========================
   1. UTM PARSING
=========================== */
function parseUTM() {
  const p = new URLSearchParams(window.location.search);
  const ref = document.referrer;
  tracker.source   = p.get('utm_source')   || (ref.includes('facebook') ? 'Facebook' : ref.includes('line') ? 'Line' : ref ? new URL(ref).hostname : 'Direct');
  tracker.medium   = p.get('utm_medium')   || '';
  tracker.campaign = p.get('utm_campaign') || '';
}

/* ===========================
   2. TIME-AWARE GREETING
=========================== */
function applyTimeGreeting() {
  const h = new Date().getHours();
  const greetEl  = document.getElementById('hero-greeting');
  const subEl    = document.getElementById('hero-sub');

  if (h >= 5 && h < 12) {
    greetEl.textContent = 'เช้านี้มีคนสมัครงานมาแล้วครับ';
    subEl.textContent   = 'เพิ่งเริ่มวันทำงานเหรอครับ — ผมก็เพิ่งเริ่มเหมือนกัน';
  } else if (h >= 12 && h < 14) {
    greetEl.textContent = 'พักเที่ยงแวะมาดูเหรอครับ';
    subEl.textContent   = 'ดีเลย — ผมมีเวลาไม่มากก็เหมือนกัน อ่านสั้นๆ ก็พอ';
  } else if (h >= 14 && h < 18) {
    greetEl.textContent = 'บ่ายแล้วยังหาคนอยู่เลย';
    subEl.textContent   = 'แสดงว่าคนที่ใช่ยังไม่เจอ — ลองดูผมก่อนก็ได้ครับ';
  } else if (h >= 18 && h < 22) {
    greetEl.textContent = 'หลังเลิกงานยังมานั่งหาคนอยู่';
    subEl.textContent   = 'แสดงว่าเรื่องนี้ไม่ใช่แค่งานปกติสำหรับคุณ';
  } else {
    greetEl.textContent = 'ดึกขนาดนี้ยังหาคนอยู่';
    subEl.textContent   = 'แสดงว่ามันเร่งด่วนจริงๆ — ผมออนไลน์ตลอดเหมือนกันครับ';
  }
}

/* ===========================
   3. DEVICE DETECTION
=========================== */
function detectDevice() {
  const ua = navigator.userAgent;
  if (/iPad|tablet/i.test(ua))          tracker.device = 'Tablet';
  else if (/Mobi|Android|iPhone/i.test(ua)) tracker.device = 'Mobile';
  else                                    tracker.device = 'Desktop';
}

/* ===========================
   4. RETURN VISITOR
=========================== */
function checkReturnVisitor() {
  const key = 'tee_visited';
  if (localStorage.getItem(key)) {
    tracker.isReturn = true;
    const nameEl = document.querySelector('.hero-name');
    if (nameEl) nameEl.innerHTML = 'กลับมาอีกแล้วครับ<br/>ยังคิดอยู่ใช่ไหม?';
    const subEl = document.getElementById('hero-sub');
    if (subEl) subEl.textContent = 'ผมยังรอการสัมภาษณ์อยู่นะครับ';
  } else {
    localStorage.setItem(key, '1');
  }
}

/* ===========================
   3. SCROLL VELOCITY / SECTION TIME
=========================== */
function initSectionObserver() {
  const sections = document.querySelectorAll('section[id]');

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const id = entry.target.id;
      if (entry.isIntersecting) {
        tracker.sectionsVisited.add(id);
        tracker.currentSection      = id;
        tracker.currentSectionStart = Date.now();
      } else {
        if (tracker.currentSection === id && tracker.currentSectionStart) {
          tracker.sectionTime[id] = (tracker.sectionTime[id] || 0) + (Date.now() - tracker.currentSectionStart);
          tracker.currentSectionStart = null;
        }
      }
    });
  }, { threshold: 0.4 });

  sections.forEach(s => obs.observe(s));

  // animate on scroll
  const animObs = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) setTimeout(() => entry.target.classList.add('visible'), i * 80);
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.exp-item, .system-item, .specialist-item').forEach(el => animObs.observe(el));
}

function getTopSection() {
  const labels = {
    'section-hero': 'Hero',
    'section-experience': 'ประสบการณ์',
    'section-specialist': 'ความเชี่ยวชาญ',
    'section-skills': 'Skills',
    'section-system': 'ระบบ',
    'section-reveal': 'Reveal',
  };
  let top = null, maxTime = 0;
  Object.entries(tracker.sectionTime).forEach(([k, v]) => {
    if (v > maxTime) { maxTime = v; top = k; }
  });
  return top ? (labels[top] || top) : '—';
}

/* ===========================
   TIME NOTIFICATION
=========================== */
function initTimeNotification() {
  setTimeout(() => {
    if (tracker.sectionsVisited.has('section-skills') && !tracker.notifShown) showNotif();
  }, NOTIFY_AFTER_MS);

  const fallbackObs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting && !tracker.notifShown) showNotif(); });
  }, { threshold: 0.3 });
  const sys = document.getElementById('section-system');
  if (sys) fallbackObs.observe(sys);
}

function showNotif() {
  if (tracker.notifShown) return;
  tracker.notifShown = true;
  const elapsed = Math.floor((Date.now() - tracker.startTime) / 1000);
  document.getElementById('notif-time').textContent = formatTime(elapsed);
  document.getElementById('time-notification').classList.add('show');
  setTimeout(() => document.getElementById('time-notification').classList.remove('show'), 12000);
}

function scrollToSystem() {
  document.getElementById('section-system').scrollIntoView({ behavior: 'smooth' });
  document.getElementById('time-notification').classList.remove('show');
}

function formatTime(secs) {
  const m = Math.floor(secs / 60), s = secs % 60;
  return m > 0 ? `${m} นาที ${s} วินาที` : `${s} วินาที`;
}

/* ===========================
   SKILL POPUP
=========================== */
const skillData = {
  strategy: { num:'01', title:'Marketing Strategy', body:'วางกลยุทธ์รายเดือนจากตัวแปรจริงของธุรกิจ — เป้าหมาย งบ ระยะเวลา และทรัพยากรที่มีอยู่จริง ไม่ใช่แผนที่ดูดีในสไลด์แต่ execute ไม่ได้ ผลที่ได้คือแผนที่คนในองค์กรทำตามได้จริงโดยไม่ต้องจ้าง agency เพิ่ม' },
  brief:    { num:'02', title:'Brief & Direction',  body:'รับ brief จากลูกค้าโดยตรง แล้วแปลงออกมาเป็น direction ที่ทีม creative, copywriter และ media buyer เข้าใจและลงมือได้ทันที โดยไม่ต้องถามซ้ำ ลด revision loop และเวลาที่เสียกับการแก้งานผิดทิศ' },
  media:    { num:'03', title:'Paid Media',         body:'ยิง paid ads และอ่าน data ได้ก่อนงบหมด รู้ว่า campaign ไหนควรหยุด campaign ไหนควร scale และทำไม เชี่ยวชาญ Facebook Ads ในระดับที่อ่าน parameter และคาดการณ์ผลได้ก่อนยิงจริง' },
  ai:       { num:'04', title:'AI System Design',   body:'ออกแบบระบบที่ให้ AI ทำงานในกรอบการตลาดที่ถูกต้องได้ ตั้งแต่ generate brief, เขียน copy, ไปจนถึงตรวจ content ก่อน post โดยไม่ต้องอธิบายแบรนด์ซ้ำทุกครั้ง ใช้ AI ตัดงานซ้ำซ้อนออกจากกระบวนการทำงานจริง' },
  pitch:    { num:'05', title:'Pitch & Present',    body:'นำเสนอและ pitch งานได้ แต่จุดแข็งอยู่ที่การคิดและแก้ปัญหา ไม่ใช่การประสานงาน ความต่างคือสามารถตอบคำถามในห้องได้ด้วยความเข้าใจจริง ไม่ใช่แค่อ่านสไลด์' },
  endtoend: { num:'06', title:'End-to-End Planning',body:'ดูแลลูกค้าได้ตั้งแต่ต้นจนจบในคนเดียว ตั้งแต่วิเคราะห์ธุรกิจ วาง strategy รายเดือน สร้าง brand direction ไปจนถึงดูแล execution จริง ทำให้ agency ประหยัด headcount ได้อย่างน้อย 1 ตำแหน่ง' },
};

function openSkill(key) {
  tracker.skillClicks++;
  if (!tracker.skillsOpened.includes(key)) tracker.skillsOpened.push(key);
  const d = skillData[key];
  document.getElementById('popup-num').textContent   = d.num;
  document.getElementById('popup-title').textContent = d.title;
  document.getElementById('popup-body').textContent  = d.body;
  document.getElementById('popup-overlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeSkill() {
  document.getElementById('popup-overlay').classList.remove('active');
  document.body.style.overflow = '';
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSkill(); });

/* ===========================
   REVEAL STATS + INSIGHT
=========================== */
function buildInsight() {
  const top = getTopSection();
  const insightMap = {
    'ประสบการณ์':    'คุณหยุดอ่านที่ประสบการณ์นานที่สุด — แปลว่า track record สำคัญสำหรับคุณ',
    'ความเชี่ยวชาญ': 'คุณสนใจความเชี่ยวชาญเฉพาะด้านมากที่สุด — ตรงกับสิ่งที่คุณกำลังมองหาใช่ไหมครับ',
    'Skills':        'คุณกดดู skills หลายตัว — แสดงว่าคุณกำลัง evaluate อย่างจริงจัง',
    'ระบบ':          'คุณอ่าน section ระบบนานที่สุด — นั่นแปลว่าคุณเห็นคุณค่าของ infrastructure ไม่ใช่แค่คนทำงาน',
  };
  return insightMap[top] || `Section ที่คุณหยุดอ่านนานที่สุดคือ "${top}" — ผมจดไว้แล้วครับ`;
}

function updateRevealStats() {
  const elapsed = Math.floor((Date.now() - tracker.startTime) / 1000);
  if (tracker.currentSection && tracker.currentSectionStart) {
    tracker.sectionTime[tracker.currentSection] = (tracker.sectionTime[tracker.currentSection] || 0) + (Date.now() - tracker.currentSectionStart);
    tracker.currentSectionStart = Date.now();
  }
  document.getElementById('stat-source').textContent  = tracker.source;
  document.getElementById('stat-time').textContent    = formatTime(elapsed);
  document.getElementById('stat-top-section').textContent = getTopSection();
  document.getElementById('stat-device').textContent  = tracker.device + (tracker.isReturn ? ' · กลับมาอีกครั้ง' : '');

  const insightEl = document.getElementById('reveal-insight');
  if (insightEl && elapsed > 10) insightEl.textContent = buildInsight();
}

const revealObs = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) updateRevealStats(); });
}, { threshold: 0.2 });
const revealEl = document.getElementById('section-reveal');
if (revealEl) revealObs.observe(revealEl);
setInterval(updateRevealStats, 5000);

/* ===========================
   LIFF + MAKE
=========================== */
function openLiff() {
  const elapsed = Math.floor((Date.now() - tracker.startTime) / 1000);
  const payload = {
    source:           tracker.source,
    medium:           tracker.medium,
    campaign:         tracker.campaign,
    time_on_page:     formatTime(elapsed),
    time_seconds:     elapsed,
    top_section:      getTopSection(),
    device:           tracker.device,
    is_return:        tracker.isReturn,
    skill_clicks:     tracker.skillClicks,
    skills_opened:    tracker.skillsOpened,
    sections_visited: Array.from(tracker.sectionsVisited),
    timestamp:        new Date().toISOString(),
  };

  if (WEBHOOK_URL !== 'https://hook.eu1.make.com/YOUR_WEBHOOK_ID') {
    fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  }

  setTimeout(() => { window.location.href = LIFF_URL; }, 300);
}

/* ===========================
   INIT
=========================== */
document.addEventListener('DOMContentLoaded', () => {
  parseUTM();
  detectDevice();
  checkReturnVisitor();
  applyTimeGreeting();
  initSectionObserver();
  initTimeNotification();
});
