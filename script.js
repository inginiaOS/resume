/* ===========================
   CONFIG — แก้ตรงนี้ก่อน deploy
=========================== */
const LIFF_URL = 'https://liff.line.me/YOUR_LIFF_ID_HERE'; // ← ใส่ LIFF ID จริง
const WEBHOOK_URL = 'https://hook.eu1.make.com/YOUR_WEBHOOK_ID'; // ← ใส่ Make webhook จริง
const NOTIFY_AFTER_SECONDS = 120; // trigger notification หลัง 2 นาที

/* ===========================
   TRACKING STATE
=========================== */
const tracker = {
  startTime: Date.now(),
  source: 'direct',
  medium: '',
  campaign: '',
  sectionsVisited: new Set(),
  skillClicks: 0,
  skillsOpened: [],
  notifShown: false,
  ctaClicked: false,
};

/* ===========================
   UTM PARSING
=========================== */
function parseUTM() {
  const params = new URLSearchParams(window.location.search);
  tracker.source   = params.get('utm_source')   || document.referrer || 'direct';
  tracker.medium   = params.get('utm_medium')   || '';
  tracker.campaign = params.get('utm_campaign') || '';

  // แปลง referrer ให้อ่านง่าย
  if (tracker.source.includes('facebook'))  tracker.source = 'Facebook';
  else if (tracker.source.includes('line')) tracker.source = 'Line';
  else if (tracker.source === '')           tracker.source = 'Direct';
}

/* ===========================
   SECTION OBSERVER
=========================== */
function initSectionObserver() {
  const sections = document.querySelectorAll('section[id]');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        tracker.sectionsVisited.add(entry.target.id);
      }
    });
  }, { threshold: 0.3 });

  sections.forEach(s => observer.observe(s));

  // Animate items on scroll
  const animItems = document.querySelectorAll('.exp-item, .system-item');
  const animObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('visible'), i * 100);
      }
    });
  }, { threshold: 0.15 });

  animItems.forEach(el => animObserver.observe(el));
}

/* ===========================
   TIME NOTIFICATION
=========================== */
function initTimeNotification() {
  setTimeout(() => {
    // trigger เฉพาะตอนที่ scroll เข้า section skills แล้ว
    if (tracker.sectionsVisited.has('section-skills') && !tracker.notifShown) {
      showNotification();
    }
  }, NOTIFY_AFTER_SECONDS * 1000);

  // fallback: ถ้าเลื่อนลงถึง system section แล้วยังไม่ show ให้ show เลย
  const systemSection = document.getElementById('section-system');
  const fallbackObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !tracker.notifShown) {
        showNotification();
      }
    });
  }, { threshold: 0.2 });

  if (systemSection) fallbackObserver.observe(systemSection);
}

function showNotification() {
  if (tracker.notifShown) return;
  tracker.notifShown = true;

  const elapsed = Math.floor((Date.now() - tracker.startTime) / 1000);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const timeStr = mins > 0 ? `${mins} นาที ${secs} วินาที` : `${secs} วินาที`;

  document.getElementById('notif-time').textContent = timeStr;
  document.getElementById('time-notification').classList.add('show');

  // ซ่อนอัตโนมัติหลัง 12 วินาที
  setTimeout(() => {
    document.getElementById('time-notification').classList.remove('show');
  }, 12000);
}

function scrollToSystem() {
  document.getElementById('section-system').scrollIntoView({ behavior: 'smooth' });
  document.getElementById('time-notification').classList.remove('show');
}

/* ===========================
   SKILL POPUP DATA
=========================== */
const skillData = {
  strategy: {
    num: '01',
    title: 'Marketing Strategy',
    body: 'วางกลยุทธ์รายเดือนจากตัวแปรจริงของธุรกิจ — เป้าหมาย งบ ระยะเวลา และทรัพยากรที่มีอยู่จริง ไม่ใช่แผนที่ดูดีในสไลด์แต่ execute ไม่ได้ ผลที่ได้คือแผนที่คนในองค์กรทำตามได้จริงโดยไม่ต้องจ้าง agency เพิ่ม'
  },
  brief: {
    num: '02',
    title: 'Brief & Direction',
    body: 'รับ brief จากลูกค้าโดยตรง แล้วแปลงออกมาเป็น direction ที่ทีม creative, copywriter และ media buyer เข้าใจและลงมือได้ทันที โดยไม่ต้องถามซ้ำ ลด revision loop และเวลาที่เสียกับการแก้งานผิดทิศ'
  },
  media: {
    num: '03',
    title: 'Paid Media',
    body: 'ยิง paid ads และอ่าน data ได้ก่อนงบหมด รู้ว่า campaign ไหนควรหยุด campaign ไหนควร scale และทำไม มีประสบการณ์ตรงกับ Facebook Ads ในระดับที่อ่าน parameter และคาดการณ์ผลได้ก่อนยิงจริง'
  },
  ai: {
    num: '04',
    title: 'AI System Design',
    body: 'ออกแบบระบบที่ให้ AI ทำงานในกรอบการตลาดที่ถูกต้องได้ ตั้งแต่ generate brief, เขียน copy, ไปจนถึงตรวจ content ก่อน post โดยไม่ต้องอธิบายแบรนด์ซ้ำทุกครั้ง ใช้ AI ตัดงานซ้ำซ้อนออกจากกระบวนการทำงานจริง'
  },
  pitch: {
    num: '05',
    title: 'Pitch & Present',
    body: 'นำเสนอและ pitch งานได้ แต่จุดแข็งอยู่ที่การคิดและแก้ปัญหา ไม่ใช่การประสานงาน ความต่างคือสามารถตอบคำถามในห้องได้ด้วยความเข้าใจจริง ไม่ใช่แค่อ่านสไลด์'
  },
  endtoend: {
    num: '06',
    title: 'End-to-End Planning',
    body: 'ดูแลลูกค้าได้ตั้งแต่ต้นจนจบในคนเดียว ตั้งแต่วิเคราะห์ธุรกิจ วาง strategy รายเดือน สร้าง brand direction ไปจนถึงดูแล execution จริง ทำให้ agency ประหยัด headcount ได้อย่างน้อย 1 ตำแหน่ง'
  }
};

function openSkill(key) {
  tracker.skillClicks++;
  if (!tracker.skillsOpened.includes(key)) tracker.skillsOpened.push(key);

  const data = skillData[key];
  document.getElementById('popup-num').textContent = data.num;
  document.getElementById('popup-title').textContent = data.title;
  document.getElementById('popup-body').textContent = data.body;
  document.getElementById('popup-overlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeSkill() {
  document.getElementById('popup-overlay').classList.remove('active');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeSkill();
});

/* ===========================
   REVEAL STATS
=========================== */
function updateRevealStats() {
  const elapsed = Math.floor((Date.now() - tracker.startTime) / 1000);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  document.getElementById('stat-source').textContent = tracker.source || 'Direct';
  document.getElementById('stat-time').textContent =
    mins > 0 ? `${mins} นาที ${secs} วินาที` : `${secs} วินาที`;
  document.getElementById('stat-sections').textContent =
    `${tracker.sectionsVisited.size} sections`;
  document.getElementById('stat-clicks').textContent =
    tracker.skillClicks > 0 ? `${tracker.skillClicks} ครั้ง` : '0 ครั้ง';
}

// อัพเดต stats ทุก 5 วินาที
setInterval(updateRevealStats, 5000);

// อัพเดตเมื่อ scroll เข้า reveal section
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) updateRevealStats();
  });
}, { threshold: 0.2 });

const revealSection = document.getElementById('section-reveal');
if (revealSection) revealObserver.observe(revealSection);

/* ===========================
   LIFF + MAKE WEBHOOK
=========================== */
function openLiff() {
  tracker.ctaClicked = true;

  const elapsed = Math.floor((Date.now() - tracker.startTime) / 1000);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const timeStr = mins > 0 ? `${mins} นาที ${secs} วินาที` : `${secs} วินาที`;

  const payload = {
    source: tracker.source,
    medium: tracker.medium,
    campaign: tracker.campaign,
    time_on_page: timeStr,
    time_seconds: elapsed,
    sections_visited: Array.from(tracker.sectionsVisited),
    skill_clicks: tracker.skillClicks,
    skills_opened: tracker.skillsOpened,
    notif_shown: tracker.notifShown,
    timestamp: new Date().toISOString(),
  };

  // ยิง webhook ไปที่ Make ก่อน redirect
  if (WEBHOOK_URL !== 'https://hook.eu1.make.com/YOUR_WEBHOOK_ID') {
    fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  }

  // redirect ไป LIFF
  setTimeout(() => {
    window.location.href = LIFF_URL;
  }, 300);
}

/* ===========================
   INIT
=========================== */
document.addEventListener('DOMContentLoaded', () => {
  parseUTM();
  initSectionObserver();
  initTimeNotification();
  updateRevealStats();
});
