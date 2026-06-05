/* ─────────────────────────────────────────────────────────────
   Portfolio Parser — reads portfolio.md and renders the page
   ───────────────────────────────────────────────────────────── */

const CONTACT_ICONS = {
  'buron.dev':          { icon: '🌐', label: 'Website' },
  'github.com':         { icon: '⌥', label: 'GitHub' },
  'linkedin.com':       { icon: 'in', label: 'LinkedIn' },
  'wa.me':              { icon: '✆', label: 'Phone' },
  '(+55)':              { icon: '✆', label: 'Phone' },
  'mailto:':            { icon: '✉', label: 'Email' },
  '@':                  { icon: '✉', label: 'Email' },
};

// ── Fetch & kick off ──────────────────────────────────────────
async function init() {
  try {
    const res = await fetch('./portfolio.md');
    if (!res.ok) throw new Error('Could not load portfolio.md');
    const raw = await res.text();
    render(parse(raw));
  } catch (e) {
    document.getElementById('app').innerHTML =
      `<p style="color:#c84b2f;font-family:monospace;padding:2rem">
        Error loading portfolio.md: ${e.message}
      </p>`;
  }
}

// ── Strip YAML front-matter ───────────────────────────────────
function stripFrontMatter(text) {
  return text.replace(/^---[\s\S]*?---\n?/, '').trim();
}

// ── Parse markdown into structured data ──────────────────────
function parse(raw) {
  const text = stripFrontMatter(raw);
  const lines = text.split('\n');

  const data = {
    name: '',
    contacts: [],
    summary: '',
    experience: [],
    education: [],
    skills: {},
    certifications: [],
    awards: [],
    projects: [],
  };

  let section = null;
  let currentExp = null;
  let currentEdu = null;
  let currentProject = null;
  let summaryLines = [];

  function flushExp() {
    if (currentExp) { data.experience.push(currentExp); currentExp = null; }
  }
  function flushEdu() {
    if (currentEdu) { data.education.push(currentEdu); currentEdu = null; }
  }
  function flushProject() {
    if (currentProject) { data.projects.push(currentProject); currentProject = null; }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // H1 = name
    if (/^#\s+(.+)/.test(trimmed) && !data.name) {
      data.name = trimmed.replace(/^#\s+/, '');
      continue;
    }

    // H2 = section headers
    if (/^##\s+/.test(trimmed)) {
      flushExp(); flushEdu(); flushProject();
      const sec = trimmed.replace(/^##\s+/, '').toLowerCase();
      if (sec.includes('summary'))         section = 'summary';
      else if (sec.includes('experience')) section = 'experience';
      else if (sec.includes('education'))  section = 'education';
      else if (sec.includes('skill'))      section = 'skills';
      else if (sec.includes('certif'))     section = 'certifications';
      else if (sec.includes('award') || sec.includes('honor')) section = 'awards';
      else if (sec.includes('project'))    section = 'projects';
      else section = null;
      continue;
    }

    // Contact lines (lines with iconify / links before first ##)
    if (!section && (trimmed.includes('http') || trimmed.includes('mailto:') || trimmed.includes('(+'))) {
      // Extract all markdown links from the line
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      let m;
      while ((m = linkRegex.exec(trimmed)) !== null) {
        data.contacts.push({ text: m[1], href: m[2] });
      }
      // Plain text phone numbers
      const phoneMatch = trimmed.match(/(\(\+\d+\)[\s\d-]+)/);
      if (phoneMatch && !trimmed.includes('](')) {
        data.contacts.push({ text: phoneMatch[1].trim(), href: null });
      }
      continue;
    }

    // ── Summary ──
    if (section === 'summary' && trimmed && !trimmed.startsWith('#')) {
      summaryLines.push(trimmed);
      data.summary = summaryLines.join(' ');
      continue;
    }

    // ── Experience ──
    if (section === 'experience') {
      // Bold role line: **Role**
      const boldMatch = trimmed.match(/^\*\*([^*]+)\*\*\s*$/);
      const tripleMatch = trimmed.match(/^\*\*([^*]+)\*\*\s*:\s*\*\*([^*]+)\*\*\s*:\s*\*\*([^*]+)\*\*/);

      if (tripleMatch) {
        flushExp();
        currentExp = { role: tripleMatch[1], company: tripleMatch[2], date: tripleMatch[3], bullets: [] };
      } else if (boldMatch && !currentExp) {
        flushExp();
        currentExp = { role: boldMatch[1], company: '', date: '', bullets: [] };
      } else if (currentExp) {
        // company / date continuation via : separator
        if (trimmed.startsWith(': **')) {
          const parts = trimmed.split(/\s*:\s*\*\*/).filter(Boolean);
          parts.forEach(p => {
            const val = p.replace(/\*\*/g, '').trim();
            if (!currentExp.company) currentExp.company = val;
            else if (!currentExp.date) currentExp.date = val;
          });
        } else if (trimmed.startsWith('- ')) {
          currentExp.bullets.push(trimmed.replace(/^-\s+/, ''));
        }
      }
      continue;
    }

    // ── Education ──
    if (section === 'education') {
      const tripleMatch = trimmed.match(/^\*\*([^*]+)\*\*\s*:\s*\*\*([^*]+)\*\*/);
      const boldMatch   = trimmed.match(/^\*\*([^*]+)\*\*/);

      if (tripleMatch) {
        flushEdu();
        currentEdu = { degree: tripleMatch[1], date: tripleMatch[2], school: '', location: '', coursework: '' };
      } else if (boldMatch && !currentEdu) {
        flushEdu();
        currentEdu = { degree: boldMatch[1], date: '', school: '', location: '', coursework: '' };
      } else if (currentEdu) {
        if (trimmed.startsWith(': ')) {
          const val = trimmed.replace(/^:\s*/, '');
          if (!currentEdu.date) currentEdu.date = val;
        } else if (trimmed.includes('Universidade') || trimmed.includes('Institute') ||
                   trimmed.includes('University') || trimmed.includes('Unijuí') ||
                   trimmed.includes('Farroupilha') || trimmed.match(/^[A-Z][^\|]+\|/)) {
          // school line possibly with location after |
          const parts = trimmed.split(/\s*\|\s*/);
          currentEdu.school = parts[0].replace(/\s*:\s*.*/, '').trim();
          if (parts[1]) currentEdu.location = parts[1].trim();
        } else if (trimmed.startsWith(': ') || trimmed.match(/^(Ijuí|Santo)/)) {
          currentEdu.location = trimmed.replace(/^:\s*/, '');
        } else if (trimmed.toLowerCase().startsWith('relevant')) {
          currentEdu.coursework = trimmed.replace(/^relevant coursework:\s*/i, '');
        }
      }
      continue;
    }

    // ── Skills ──
    if (section === 'skills') {
      const match = trimmed.match(/^\*\*([^:*]+):\*\*\s*(.+)/);
      if (match) {
        const key = match[1].trim();
        // strip iconify tags and clean up
        const val = match[2]
          .replace(/<span[^>]*>.*?<\/span>/g, '')
          .replace(/\s*,\s*/g, ', ')
          .trim();
        data.skills[key] = val.split(/,\s*(?![^(]*\))/).map(s => s.trim()).filter(Boolean);
      }
      continue;
    }

    // ── Certifications ──
    if (section === 'certifications') {
      const match = trimmed.match(/^\*\*([^*]+)\*\*,?\s*([^:*]+)?\s*:\s*(\d{4})/);
      if (match) {
        data.certifications.push({ name: match[1].trim(), issuer: (match[2] || '').trim(), year: match[3] });
      } else {
        // alternate: **Name**, Issuer on one line, year on next via :
        const nameMatch = trimmed.match(/^\*\*([^*]+)\*\*,\s*(.+)/);
        if (nameMatch) {
          data.certifications.push({ name: nameMatch[1].trim(), issuer: nameMatch[2].trim(), year: '' });
        }
        const yearLine = trimmed.match(/^:\s*(\d{4})$/);
        if (yearLine && data.certifications.length) {
          data.certifications[data.certifications.length - 1].year = yearLine[1];
        }
      }
      continue;
    }

    // ── Awards ──
    if (section === 'awards') {
      const match = trimmed.match(/^\*\*([^*]+)\*\*,?\s*([^:]*?)\s*:\s*(\d{4})/);
      if (match) {
        data.awards.push({ name: match[1].trim(), detail: match[2].trim(), year: match[3] });
      }
      continue;
    }

    // ── Projects ──
    if (section === 'projects') {
      // project name lines: - **Name** or - **Name**
      const nameMatch = trimmed.match(/^-\s+\*\*([^*]+)\*\*/);
      if (nameMatch) {
        flushProject();
        currentProject = { name: nameMatch[1].trim(), desc: '' };
      } else if (currentProject && trimmed && !trimmed.startsWith('-')) {
        currentProject.desc += (currentProject.desc ? ' ' : '') + trimmed;
      }
      continue;
    }
  }

  flushExp(); flushEdu(); flushProject();
  return data;
}

// ── Render to DOM ─────────────────────────────────────────────
function render(data) {
  const app = document.getElementById('app');
  app.innerHTML = '';

  // Nav
  buildNav(data);

  // Hero
  app.appendChild(buildHero(data));

  // Sections in order
  if (data.experience.length)     app.appendChild(buildExperience(data.experience));
  if (data.education.length)      app.appendChild(buildEducation(data.education));
  if (Object.keys(data.skills).length) app.appendChild(buildSkills(data.skills));
  if (data.certifications.length) app.appendChild(buildCertifications(data.certifications));
  if (data.awards.length)         app.appendChild(buildAwards(data.awards));
  if (data.projects.length)       app.appendChild(buildProjects(data.projects));
}

function buildNav(data) {
  const nav = document.getElementById('top-nav');
  const sections = ['Experience', 'Education', 'Skills', 'Certifications', 'Awards', 'Projects'];
  sections.forEach(s => {
    const a = document.createElement('a');
    a.href = `#${s.toLowerCase()}`;
    a.textContent = s;
    nav.appendChild(a);
  });
}

function buildHero(data) {
  const hero = el('div', 'hero');

  // Name
  const nameParts = data.name.split(' ');
  const last = nameParts.pop();
  const nameEl = el('h1', 'hero-name');
  nameEl.innerHTML = nameParts.join(' ') + ' <em>' + last + '</em>';
  hero.appendChild(nameEl);

  // Contacts
  if (data.contacts.length) {
    const grid = el('div', 'contact-grid');
    data.contacts.forEach(c => {
      const a = el('a', 'contact-item');
      if (c.href) { a.href = c.href; a.target = '_blank'; a.rel = 'noopener'; }

      // Pick icon from URL/text
      let icon = '→';
      for (const [key, val] of Object.entries(CONTACT_ICONS)) {
        if ((c.href || c.text || '').toLowerCase().includes(key.toLowerCase())) {
          icon = val.icon; break;
        }
      }
      const iconSpan = el('span', 'ci');
      iconSpan.textContent = icon;
      a.appendChild(iconSpan);
      a.appendChild(document.createTextNode(c.text));
      grid.appendChild(a);
    });
    hero.appendChild(grid);
  }

  // Summary
  if (data.summary) {
    const p = el('p', 'hero-summary');
    p.textContent = data.summary;
    hero.appendChild(p);
  }

  return hero;
}

function buildExperience(items) {
  const section = makeSection('Experience', 'experience');
  items.forEach(exp => {
    const card = el('div', 'exp-card');

    const role = el('div', 'exp-role'); role.textContent = exp.role;
    const company = el('div', 'exp-company'); company.textContent = exp.company;
    const date = el('div', 'exp-date'); date.textContent = exp.date;

    card.appendChild(role);
    card.appendChild(date);
    card.appendChild(company);

    if (exp.bullets.length) {
      const ul = el('ul', 'exp-bullets');
      exp.bullets.forEach(b => {
        const li = document.createElement('li');
        li.textContent = b;
        ul.appendChild(li);
      });
      card.appendChild(ul);
    }

    section.querySelector('.section-body').appendChild(card);
  });
  return section;
}

function buildEducation(items) {
  const section = makeSection('Education', 'education');
  items.forEach(edu => {
    const card = el('div', 'edu-card');

    const degree = el('div', 'edu-degree'); degree.textContent = edu.degree;
    const meta = el('div', 'edu-meta');
    const school = el('span', 'edu-school'); school.textContent = edu.school || '';
    const date   = el('span', 'edu-date');   date.textContent   = edu.date || '';
    meta.appendChild(school); meta.appendChild(date);

    card.appendChild(degree);
    card.appendChild(meta);

    if (edu.coursework) {
      const cw = el('div', 'edu-coursework');
      cw.textContent = 'Coursework: ' + edu.coursework;
      card.appendChild(cw);
    }

    section.querySelector('.section-body').appendChild(card);
  });
  return section;
}

function buildSkills(skills) {
  const section = makeSection('Skills', 'skills');
  const grid = el('div', 'skills-grid');

  Object.entries(skills).forEach(([key, tags]) => {
    const row = el('div', 'skill-row');
    const k = el('span', 'skill-key'); k.textContent = key;
    const tagWrap = el('div', 'skill-tags');
    tags.forEach(t => {
      const tag = el('span', 'tag');
      // Strip icon markup leftovers
      tag.textContent = t.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      if (tag.textContent) tagWrap.appendChild(tag);
    });
    row.appendChild(k);
    row.appendChild(tagWrap);
    grid.appendChild(row);
  });

  section.querySelector('.section-body').appendChild(grid);
  return section;
}

function buildCertifications(certs) {
  const section = makeSection('Certifications', 'certifications');
  const list = el('div', 'cert-list');
  certs.forEach(c => {
    const item = el('div', 'cert-item');
    const left = el('div');
    const name = el('div', 'cert-name'); name.textContent = c.name;
    const issuer = el('div', 'cert-issuer'); issuer.textContent = c.issuer;
    left.appendChild(name); left.appendChild(issuer);
    const year = el('div', 'cert-year'); year.textContent = c.year;
    item.appendChild(left); item.appendChild(year);
    list.appendChild(item);
  });
  section.querySelector('.section-body').appendChild(list);
  return section;
}

function buildAwards(awards) {
  const section = makeSection('Awards & Honors', 'awards');
  const list = el('div', 'award-list');
  awards.forEach(a => {
    const item = el('div', 'award-item');
    const left = el('div');
    const name = el('div', 'award-name'); name.textContent = a.name;
    const detail = el('div', 'award-detail'); detail.textContent = a.detail;
    left.appendChild(name); left.appendChild(detail);
    const year = el('div', 'award-year'); year.textContent = a.year;
    item.appendChild(left); item.appendChild(year);
    list.appendChild(item);
  });
  section.querySelector('.section-body').appendChild(list);
  return section;
}

function buildProjects(projects) {
  const section = makeSection('Projects', 'projects');
  const grid = el('div', 'projects-grid');
  projects.forEach(p => {
    const card = el('div', 'project-card');
    const name = el('div', 'project-name'); name.textContent = p.name;
    const desc = el('div', 'project-desc'); desc.textContent = p.desc;
    card.appendChild(name); card.appendChild(desc);
    grid.appendChild(card);
  });
  section.querySelector('.section-body').appendChild(grid);
  return section;
}

// ── Helpers ───────────────────────────────────────────────────
function el(tag, className) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  return e;
}

function makeSection(title, id) {
  const wrap = el('div', 'portfolio-section');
  wrap.id = id;
  const label = el('div', 'section-label');
  label.textContent = title;
  const body = el('div', 'section-body');
  wrap.appendChild(label);
  wrap.appendChild(body);
  return wrap;
}

// ── Boot ──────────────────────────────────────────────────────
init();
