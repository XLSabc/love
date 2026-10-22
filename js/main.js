(() => {
  'use strict';

  const CONFIG = Object.assign({
    recipient: '你',
    sender: '一个喜欢你的人',
    date: '2026.10.20',
    dateISO: '2026-10-20',
    pageTitle: '致你｜一封写给你的信',
    stars: []
  }, window.LOVE_CONFIG || {});

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(pointer: fine)');

  let motionReduced = reduceMotion.matches;

  function bindNoteToggle(trigger, note, { scroll = 'nearest' } = {}) {
    if (!trigger || !note) return;
    let closeTimer = 0;

    trigger.addEventListener('click', () => {
      const isOpen = trigger.getAttribute('aria-expanded') === 'true';
      const willOpen = !isOpen;
      trigger.setAttribute('aria-expanded', String(willOpen));
      clearTimeout(closeTimer);

      if (willOpen) {
        note.hidden = false;
        requestAnimationFrame(() => note.classList.add('is-visible'));
        if (scroll) {
          window.setTimeout(() => {
            note.scrollIntoView({
              behavior: motionReduced ? 'auto' : 'smooth',
              block: scroll,
              inline: 'nearest'
            });
          }, 90);
        }
      } else {
        note.classList.remove('is-visible');
        closeTimer = window.setTimeout(() => { note.hidden = true; }, 500);
      }
    });
  }

  /* ------------------------------------------------------------
     基础信息
     ------------------------------------------------------------ */
  function applyConfig() {
    $$('[data-recipient]').forEach(el => { el.textContent = CONFIG.recipient; });
    $$('[data-sender]').forEach(el => { el.textContent = CONFIG.sender; });
    $$('[data-date]').forEach(el => { el.textContent = CONFIG.date; });

    let title = CONFIG.pageTitle || document.title;
    if (CONFIG.recipient && CONFIG.recipient !== '你') {
      title = title.replace('致你', `致${CONFIG.recipient}`);
    }
    document.title = title;

    const metaTitle = document.querySelector('meta[property="og:title"]');
    if (metaTitle) metaTitle.setAttribute('content', title);
  }

  /* ------------------------------------------------------------
     开场
     ------------------------------------------------------------ */
  function initIntro() {
    const intro = $('#intro');
    const openBtn = $('#openLetter');
    const skipBtn = $('#skipIntro');
    const main = $('#main');
    if (!intro || !openBtn) return;

    const pageChrome = [$('.topbar'), $('.rail'), $('.sound'), main, $('.footer'), $('.skip-link')].filter(Boolean);
    let opened = false;
    let storedOpen = false;

    try {
      storedOpen = sessionStorage.getItem('letter-opened') === '1';
    } catch (err) {
      storedOpen = false;
    }

    const params = new URLSearchParams(location.search);
    const skipRequested = params.get('skipIntro') === '1';
    const forceIntro = params.get('intro') === '1';
    const instant = !forceIntro && (storedOpen || skipRequested || document.documentElement.classList.contains('intro-opened'));

    if (!instant) {
      if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
      window.scrollTo(0, 0);
      document.documentElement.classList.add('is-locked');
      pageChrome.forEach(el => { el.setAttribute('inert', ''); });
      requestAnimationFrame(() => document.body.classList.add('is-loaded'));
    }

    const unlock = () => {
      document.documentElement.classList.remove('is-locked');
      document.body.classList.remove('is-locked');
      pageChrome.forEach(el => { el.removeAttribute('inert'); });
    };

    const finish = (withAnimation = true) => {
      if (opened) return;
      opened = true;

      try { sessionStorage.setItem('letter-opened', '1'); } catch (err) { /* ignore */ }

      if (!withAnimation || motionReduced) {
        intro.remove();
        unlock();
        document.body.classList.add('is-open', 'is-loaded');
        main.focus({ preventScroll: true });
        return;
      }

      intro.classList.add('is-leaving');
      document.body.classList.add('is-open', 'is-loaded');
      unlock();

      window.setTimeout(() => {
        intro.remove();
        main.focus({ preventScroll: true });
      }, 1250);
    };

    if (instant) {
      intro.remove();
      unlock();
      document.body.classList.add('is-open', 'is-loaded');
      return;
    }

    openBtn.addEventListener('click', () => finish(true));
    skipBtn?.addEventListener('click', () => finish(false));

    intro.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        finish(false);
      }
    });

    window.setTimeout(() => {
      if (!opened) openBtn.focus({ preventScroll: true });
    }, 1400);
  }

  /* ------------------------------------------------------------
     滚动入场
     ------------------------------------------------------------ */
  function initReveal() {
    const items = $$('[data-reveal]');
    if (!items.length) return;

    if (motionReduced || !('IntersectionObserver' in window)) {
      items.forEach(el => el.classList.add('is-in'));
      return;
    }

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -7% 0px'
    });

    items.forEach(el => observer.observe(el));
  }

  /* ------------------------------------------------------------
     章节指示
     ------------------------------------------------------------ */
  function initChapterRail() {
    const sections = $$('[data-chapter]');
    const links = $$('.rail__nav a');
    const num = $('#chapterNum');
    const name = $('#chapterName');
    const progress = $('#railProgress');
    const topProgress = $('#readProgress');
    if (!sections.length) return;

    let ticking = false;

    const update = () => {
      ticking = false;
      const marker = window.innerHeight * 0.38;
      let active = sections[0];
      let topActive = sections[0];

      sections.forEach(section => {
        const top = section.getBoundingClientRect().top;
        if (top <= marker) active = section;
        if (top <= 2) topActive = section;
      });

      document.body.classList.toggle('nav-on-red', topActive.dataset.nav === 'red');

      const activeId = active.id;
      const label = active.dataset.label || '';
      if (num) num.textContent = active.dataset.chapter || '01';
      if (name) name.textContent = label;

      links.forEach(link => {
        const isActive = link.dataset.section === activeId;
        link.classList.toggle('is-active', isActive);
        if (isActive) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });

      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      if (progress) progress.style.transform = `scaleY(${ratio})`;
      if (topProgress) topProgress.style.transform = `scaleX(${ratio})`;
    };

    const request = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    update();
  }

  /* ------------------------------------------------------------
     自定义光标
     ------------------------------------------------------------ */
  function initCursor() {
    if (!finePointer.matches || motionReduced) return;
    const cursor = $('#cursor');
    if (!cursor) return;
    const dot = $('.cursor__dot', cursor);
    const ring = $('.cursor__ring', cursor);
    if (!dot || !ring) return;

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;
    let visible = false;
    let raf = 0;

    const render = () => {
      rx += (mx - rx) * 0.15;
      ry += (my - ry) * 0.15;
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(-50%, -50%)`;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
      if (visible) raf = requestAnimationFrame(render);
    };

    document.addEventListener('pointermove', event => {
      mx = event.clientX;
      my = event.clientY;
      document.body.classList.add('cursor-ready');
      if (!visible) {
        visible = true;
        rx = mx;
        ry = my;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(render);
      }
      cursor.classList.toggle('cursor--active', Boolean(event.target.closest('a, button, .promise, .sky-star')));
    }, { passive: true });

    document.addEventListener('pointerdown', () => cursor.classList.add('cursor--down'));
    document.addEventListener('pointerup', () => cursor.classList.remove('cursor--down'));

    document.addEventListener('pointerleave', () => {
      visible = false;
      document.body.classList.remove('cursor-ready');
      cursor.style.opacity = '0';
      cancelAnimationFrame(raf);
    });

    document.addEventListener('pointerenter', () => {
      visible = true;
      cursor.style.opacity = '';
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(render);
    });
  }

  /* ------------------------------------------------------------
     主视觉轻微视差 + 卡片光晕
     ------------------------------------------------------------ */
  function initParallax() {
    if (motionReduced || !finePointer.matches) return;
    const hero = $('.hero');
    const art = $('.hero-art');
    if (hero && art) {
      let frame = 0;
      hero.addEventListener('pointermove', event => {
        if (frame) return;
        frame = requestAnimationFrame(() => {
          frame = 0;
          const rect = hero.getBoundingClientRect();
          const x = (event.clientX - rect.left) / rect.width - 0.5;
          const y = (event.clientY - rect.top) / rect.height - 0.5;
          art.style.setProperty('--px', `${(x * 12).toFixed(2)}px`);
          art.style.setProperty('--py', `${(y * 12).toFixed(2)}px`);
        });
      }, { passive: true });

      hero.addEventListener('pointerleave', () => {
        art.style.setProperty('--px', '0px');
        art.style.setProperty('--py', '0px');
      });
    }

    $$('[data-glow], .moment').forEach(card => {
      card.addEventListener('pointermove', event => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--gx', `${((event.clientX - rect.left) / rect.width * 100).toFixed(1)}%`);
        card.style.setProperty('--gy', `${((event.clientY - rect.top) / rect.height * 100).toFixed(1)}%`);
      }, { passive: true });
    });
  }

  /* ------------------------------------------------------------
     手风琴
     ------------------------------------------------------------ */
  function initAccordion() {
    const reasons = $$('.reason');
    const extra = $('#reasonExtra');
    if (!reasons.length) return;

    const opened = new Set();
    reasons.forEach((reason, index) => {
      if (reason.classList.contains('is-open')) opened.add(index);
    });

    reasons.forEach((reason, index) => {
      const trigger = $('.reason__trigger', reason);
      if (!trigger) return;

      trigger.addEventListener('click', () => {
        const willOpen = !reason.classList.contains('is-open');

        reasons.forEach(other => {
          other.classList.remove('is-open');
          const otherTrigger = $('.reason__trigger', other);
          if (otherTrigger) otherTrigger.setAttribute('aria-expanded', 'false');
        });

        if (willOpen) {
          reason.classList.add('is-open');
          trigger.setAttribute('aria-expanded', 'true');
          opened.add(index);
          if (extra && opened.size >= reasons.length && extra.hidden) {
            extra.hidden = false;
            requestAnimationFrame(() => extra.classList.add('is-visible'));
          }
        }
      });
    });
  }

  /* ------------------------------------------------------------
     想一起完成的事
     ------------------------------------------------------------ */
  function initPromises() {
    const buttons = $$('.promise');
    const countEl = $('#promiseCount');
    const extra = $('#promiseExtra');
    if (!buttons.length) return;

    const storageKey = 'letter-promises-v1';
    let saved = [];

    try {
      saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (!Array.isArray(saved)) saved = [];
    } catch (err) {
      saved = [];
    }

    const persist = () => {
      try { localStorage.setItem(storageKey, JSON.stringify(saved)); } catch (err) { /* ignore */ }
    };

    const update = () => {
      if (countEl) countEl.textContent = String(saved.length);
      const label = $('.promise-counter i');
      if (label) {
        label.textContent = saved.length === buttons.length && saved.length > 0
          ? '都收好了，等你一起'
          : '已收进口袋';
      }

      if (extra) {
        const complete = saved.length === buttons.length && saved.length > 0;
        if (complete && extra.hidden) {
          extra.hidden = false;
          requestAnimationFrame(() => extra.classList.add('is-visible'));
        } else if (!complete) {
          extra.classList.remove('is-visible');
          extra.hidden = true;
        }
      }
    };

    buttons.forEach((button, index) => {
      if (saved.includes(index)) {
        button.classList.add('is-checked');
        button.setAttribute('aria-pressed', 'true');
      }

      button.addEventListener('click', () => {
        const isChecked = button.classList.toggle('is-checked');
        button.setAttribute('aria-pressed', String(isChecked));

        if (isChecked) {
          if (!saved.includes(index)) saved.push(index);
          button.animate(
            [
              { transform: 'scale(1)' },
              { transform: 'scale(0.985)' },
              { transform: 'scale(1)' }
            ],
            { duration: 340, easing: 'cubic-bezier(.16,1,.3,1)' }
          );
        } else {
          saved = saved.filter(item => item !== index);
        }

        persist();
        update();
      });
    });

    update();
  }

  /* ------------------------------------------------------------
     心动时间线
     ------------------------------------------------------------ */
  function initTimeline() {
    const body = $('.timeline__body');
    const fill = $('#timelineProgress');
    const items = $$('.timeline__item');
    if (!body || !fill) return;

    let ticking = false;

    const update = () => {
      ticking = false;
      const rect = body.getBoundingClientRect();
      const viewport = window.innerHeight;
      const progress = Math.min(1, Math.max(0, (viewport * 0.56 - rect.top) / Math.max(rect.height, 1)));
      const threshold = viewport * 0.64;

      fill.style.transform = `scaleY(${progress.toFixed(4)})`;
      items.forEach(item => {
        item.classList.toggle('is-passed', item.getBoundingClientRect().top <= threshold);
      });
    };

    const request = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    update();
  }

  /* ------------------------------------------------------------
     没有寄出的短信
     ------------------------------------------------------------ */
  function initUnsent() {
    const notes = $$('.unsent-note');
    const extra = $('#unsentExtra');
    if (!notes.length) return;

    const opened = new Set();
    notes.forEach((note, index) => {
      if (note.classList.contains('is-open')) opened.add(index);
    });

    const setOpen = (note, open) => {
      note.classList.toggle('is-open', open);
      const button = $('.unsent-note__toggle', note);
      const action = $('.unsent-note__open span', note);
      if (button) button.setAttribute('aria-expanded', String(open));
      if (action) action.textContent = open ? '收起' : '展开';
    };

    notes.forEach((note, index) => {
      const button = $('.unsent-note__toggle', note);
      if (!button) return;

      button.addEventListener('click', () => {
        const willOpen = !note.classList.contains('is-open');
        notes.forEach(other => setOpen(other, false));
        if (willOpen) {
          setOpen(note, true);
          opened.add(index);
          if (extra && opened.size >= notes.length && extra.hidden) {
            extra.hidden = false;
            requestAnimationFrame(() => extra.classList.add('is-visible'));
          }
        }
      });
    });
  }

  /* ------------------------------------------------------------
     邮戳下的一句话
     ------------------------------------------------------------ */
  function initStampSecret() {
    const stamp = $('#stampSecret');
    const note = $('#stampNote');
    if (!stamp || !note) return;

    let closeTimer = 0;

    stamp.addEventListener('click', () => {
      const isOpen = stamp.getAttribute('aria-expanded') === 'true';
      const willOpen = !isOpen;
      stamp.setAttribute('aria-expanded', String(willOpen));
      clearTimeout(closeTimer);

      if (willOpen) {
        note.hidden = false;
        requestAnimationFrame(() => note.classList.add('is-visible'));
      } else {
        note.classList.remove('is-visible');
        closeTimer = window.setTimeout(() => { note.hidden = true; }, 500);
      }
    });
  }

  /* ------------------------------------------------------------
     日期旁的一句话
     ------------------------------------------------------------ */
  function initLetterDateSecret() {
    const date = $('#letterDateSecret');
    const note = $('#dateNote');
    if (!date || !note) return;

    let closeTimer = 0;

    date.addEventListener('click', () => {
      const isOpen = date.getAttribute('aria-expanded') === 'true';
      const willOpen = !isOpen;
      date.setAttribute('aria-expanded', String(willOpen));
      clearTimeout(closeTimer);

      if (willOpen) {
        note.hidden = false;
        requestAnimationFrame(() => note.classList.add('is-visible'));
        window.setTimeout(() => {
          note.scrollIntoView({
            behavior: motionReduced ? 'auto' : 'smooth',
            block: 'nearest'
          });
        }, 90);
      } else {
        note.classList.remove('is-visible');
        closeTimer = window.setTimeout(() => { note.hidden = true; }, 500);
      }
    });
  }

  /* ------------------------------------------------------------
     一页信 / 落款 / P.S. / 问号 / 藏头 / WHY 计数
     ------------------------------------------------------------ */
  function initPageSecret() {
    const page = $('#pageSecret');
    if (!page) return;

    page.addEventListener('click', () => {
      const isOpen = page.getAttribute('aria-pressed') === 'true';
      const next = !isOpen;
      page.setAttribute('aria-pressed', String(next));
      page.textContent = next ? 'PAGE 01 / ∞' : 'PAGE 01 / 01';
    });
  }

  function initSignatureSecret() {
    bindNoteToggle($('#signSecret'), $('#signNote'), { scroll: 'nearest' });
  }

  function initPostscriptSecret() {
    bindNoteToggle($('#psSecret'), $('#ppsNote'), { scroll: 'nearest' });
  }

  function initQuestionSecret() {
    bindNoteToggle($('#questionSecret'), $('#questionNote'), { scroll: 'nearest' });
  }

  function initAnswerSecret() {
    bindNoteToggle($('#answerSecret'), $('#answerNote'), { scroll: 'nearest' });
  }

  function initPoemMore() {
    bindNoteToggle($('#poemMore'), $('#poemMoreLine'), { scroll: 'center' });
  }

  function initReasonsCountSecret() {
    bindNoteToggle($('#reasonsCountSecret'), $('#reasonsCountNote'), { scroll: 'nearest' });
  }

  function initTextSecrets() {
    const reading = $('#readingSecret');
    const readingLabel = reading ? $('b', reading) : null;
    if (reading && readingLabel) {
      reading.addEventListener('click', () => {
        const isOpen = reading.getAttribute('aria-pressed') === 'true';
        const next = !isOpen;
        reading.setAttribute('aria-pressed', String(next));
        readingLabel.textContent = next ? '读慢一点，我等你。' : '慢慢读，不着急';
      });
    }

    const reason = $('#reasonSecret');
    const reasonLabel = reason ? $('em', reason) : null;
    if (reason && reasonLabel) {
      reason.addEventListener('click', () => {
        const isOpen = reason.getAttribute('aria-pressed') === 'true';
        const next = !isOpen;
        reason.setAttribute('aria-pressed', String(next));
        reasonLabel.textContent = next ? 'the reason is you.' : 'the reason of all things';
      });
    }
  }

  /* ------------------------------------------------------------
     只在某个时刻出现
     ------------------------------------------------------------ */
  function initTimeSecrets() {
    const show = note => {
      if (!note) return;
      note.hidden = false;
      requestAnimationFrame(() => note.classList.add('is-visible'));
    };

    const now = new Date();
    if (now.getHours() === 5 && now.getMinutes() === 20) show($('#timeNote'));
    if (now.getMonth() === 9 && now.getDate() === 20) show($('#anniversaryNote'));

    let returning = false;
    try {
      returning = localStorage.getItem('letter-returned-v1') === '1';
      localStorage.setItem('letter-returned-v1', '1');
    } catch (err) {
      returning = false;
    }
    if (returning) show($('#returnNote'));
  }

  /* ------------------------------------------------------------
     Konami
     ------------------------------------------------------------ */
  function initKonami() {
    const field = $('#petalField');
    if (!field) return;

    const sequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let position = 0;

    const petals = () => {
      if (!document.body.classList.contains('is-open')) return;
      field.innerHTML = '';

      if (motionReduced) {
        const message = document.createElement('p');
        message.className = 'petal-message';
        message.textContent = '你居然记得这个。';
        field.appendChild(message);
        window.setTimeout(() => { field.innerHTML = ''; }, 2600);
        return;
      }

      for (let i = 0; i < 22; i++) {
        const petal = document.createElement('span');
        petal.className = 'konami-petal';
        petal.style.setProperty('--x', `${Math.random() * 100}vw`);
        petal.style.setProperty('--size', `${7 + Math.random() * 11}px`);
        petal.style.setProperty('--dur', `${2.8 + Math.random() * 2.4}s`);
        petal.style.setProperty('--delay', `${Math.random() * 0.9}s`);
        petal.style.setProperty('--rot', `${Math.random() * 180}deg`);
        petal.style.setProperty('--drift', `${(Math.random() * 2 - 1) * 120}px`);
        field.appendChild(petal);
      }

      window.setTimeout(() => { field.innerHTML = ''; }, 6200);
    };

    window.addEventListener('keydown', event => {
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      if (key === sequence[position]) {
        position += 1;
        if (position === sequence.length) {
          position = 0;
          petals();
        }
      } else {
        position = key === sequence[0] ? 1 : 0;
      }
    });
  }

  /* ------------------------------------------------------------
     火漆下的一句话
     ------------------------------------------------------------ */
  function initLetterSecret() {
    const seal = $('#letterSeal');
    const secret = $('#letterSecret');
    if (!seal || !secret) return;

    let closeTimer = 0;

    seal.addEventListener('click', () => {
      const isOpen = seal.getAttribute('aria-expanded') === 'true';
      const willOpen = !isOpen;
      seal.setAttribute('aria-expanded', String(willOpen));
      seal.setAttribute('aria-label', willOpen ? '合上火漆下的秘密' : '打开火漆下的秘密');
      clearTimeout(closeTimer);

      if (willOpen) {
        secret.hidden = false;
        requestAnimationFrame(() => secret.classList.add('is-visible'));
        window.setTimeout(() => {
          secret.scrollIntoView({
            behavior: motionReduced ? 'auto' : 'smooth',
            block: 'nearest'
          });
        }, 90);
      } else {
        secret.classList.remove('is-visible');
        closeTimer = window.setTimeout(() => { secret.hidden = true; }, 500);
      }
    });
  }

  /* ------------------------------------------------------------
     版本附记 / 页脚彩蛋
     ------------------------------------------------------------ */
  function initColophon() {
    const button = $('#colophonEdition');
    const secret = $('#colophonSecret');
    if (!button || !secret) return;

    let closeTimer = 0;

    button.addEventListener('click', () => {
      const isOpen = button.getAttribute('aria-expanded') === 'true';
      const willOpen = !isOpen;
      button.setAttribute('aria-expanded', String(willOpen));
      button.setAttribute('aria-label', willOpen ? '收起版本附记' : '展开版本附记');
      button.classList.toggle('is-open', willOpen);
      clearTimeout(closeTimer);

      if (willOpen) {
        secret.hidden = false;
        requestAnimationFrame(() => secret.classList.add('is-visible'));
        window.setTimeout(() => {
          secret.scrollIntoView({
            behavior: motionReduced ? 'auto' : 'smooth',
            block: 'nearest'
          });
        }, 90);
      } else {
        secret.classList.remove('is-visible');
        closeTimer = window.setTimeout(() => { secret.hidden = true; }, 500);
      }
    });
  }

  /* ------------------------------------------------------------
     轻微磁吸按钮
     ------------------------------------------------------------ */
  function initMagnetic() {
    if (!finePointer.matches || motionReduced) return;

    $$('.btn, .poem__button').forEach(button => {
      const move = event => {
        const rect = button.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        button.style.setProperty('--mx', `${(x * 4).toFixed(2)}px`);
        button.style.setProperty('--my', `${(y * 3).toFixed(2)}px`);
      };

      const reset = () => {
        button.style.setProperty('--mx', '0px');
        button.style.setProperty('--my', '0px');
      };

      button.addEventListener('pointermove', move, { passive: true });
      button.addEventListener('pointerleave', reset);
      button.addEventListener('blur', reset);
    });
  }

  /* ------------------------------------------------------------
     复制走的一句
     ------------------------------------------------------------ */
  function initCopySecret() {
    const toast = $('#copySecret');
    if (!toast) return;

    let hideTimer = 0;
    let lastShown = 0;

    const hide = () => {
      toast.classList.remove('is-visible');
      hideTimer = window.setTimeout(() => { toast.hidden = true; }, 500);
    };

    document.addEventListener('copy', () => {
      const selection = window.getSelection();
      const text = selection ? selection.toString().trim() : '';
      if (text.length < 8) return;

      let node = selection.anchorNode;
      if (node && node.nodeType === Node.TEXT_NODE) node = node.parentElement;
      if (!(node instanceof Element) || !node.closest('.letter, .poem, .finale__inner, .epilogue-section')) return;

      const now = Date.now();
      if (now - lastShown < 4000) return;
      lastShown = now;

      clearTimeout(hideTimer);
      toast.hidden = false;
      requestAnimationFrame(() => toast.classList.add('is-visible'));
      hideTimer = window.setTimeout(hide, 5200);
    });
  }

  /* ------------------------------------------------------------
     停留很久时的一行字
     ------------------------------------------------------------ */
  function initIdleNote() {
    const note = $('#idleNote');
    if (!note) return;

    let idleTimer = 0;
    let hideTimer = 0;
    let lastReset = 0;
    let visible = false;

    const hide = () => {
      if (!visible) return;
      visible = false;
      note.classList.remove('is-visible');
      hideTimer = window.setTimeout(() => { note.hidden = true; }, 500);
    };

    const show = () => {
      if (document.hidden || !document.body.classList.contains('is-open')) return;
      clearTimeout(hideTimer);
      note.hidden = false;
      visible = true;
      requestAnimationFrame(() => note.classList.add('is-visible'));
    };

    const schedule = () => {
      clearTimeout(idleTimer);
      idleTimer = window.setTimeout(show, 45000);
    };

    const reset = () => {
      hide();
      const now = performance.now();
      if (now - lastReset < 300) return;
      lastReset = now;
      schedule();
    };

    ['pointermove', 'wheel', 'touchstart', 'keydown', 'scroll'].forEach(type => {
      window.addEventListener(type, reset, { passive: true });
    });

    schedule();
  }

  /* ------------------------------------------------------------
     星图的观测对象
     ------------------------------------------------------------ */
  function initSkyCoordinates() {
    const button = $('#skyCoords');
    const note = $('#skyNote');
    if (!button || !note) return;

    button.addEventListener('click', () => {
      const index = $('#skyNoteIndex');
      const title = $('#skyNoteTitle');
      const text = $('#skyNoteText');
      note.classList.add('is-secret');
      if (index) index.textContent = 'OBSERVATION / 01';
      if (title) title.textContent = '你';
      if (text) text.textContent = '赤经 00h 00m 01s，赤纬 +31°14′。无论天球怎么转，我的坐标都一直朝着你。';
    });
  }

  /* ------------------------------------------------------------
     第五季
     ------------------------------------------------------------ */
  function initSeasonSecret() {
    const cards = $$('.season');
    const extra = $('#seasonExtra');
    if (!cards.length) return;

    const touched = new Set();

    cards.forEach((card, index) => {
      const reveal = () => {
        if (touched.has(index)) return;
        touched.add(index);
        card.classList.add('is-touched');
        card.setAttribute('aria-pressed', 'true');

        if (extra && touched.size >= cards.length && extra.hidden) {
          extra.hidden = false;
          requestAnimationFrame(() => extra.classList.add('is-visible'));
          window.setTimeout(() => {
            extra.scrollIntoView({
              behavior: motionReduced ? 'auto' : 'smooth',
              block: 'nearest'
            });
          }, 90);
        }
      };

      card.addEventListener('click', reveal);
      card.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        reveal();
      });
    });
  }

  /* ------------------------------------------------------------
     WHY 下面的一句话
     ------------------------------------------------------------ */
  function initWhySecret() {
    const button = $('#whySecretBtn');
    const note = $('#whySecret');
    if (!button || !note) return;

    let closeTimer = 0;

    button.addEventListener('click', () => {
      const isOpen = button.getAttribute('aria-expanded') === 'true';
      const willOpen = !isOpen;
      button.setAttribute('aria-expanded', String(willOpen));
      clearTimeout(closeTimer);

      if (willOpen) {
        note.hidden = false;
        requestAnimationFrame(() => note.classList.add('is-visible'));
      } else {
        note.classList.remove('is-visible');
        closeTimer = window.setTimeout(() => { note.hidden = true; }, 500);
      }
    });
  }

  /* ------------------------------------------------------------
     时间线的下一页
     ------------------------------------------------------------ */
  function initTimelineMore() {
    const button = $('#timelineMore');
    const item = $('#timelineAfter');
    if (!button || !item) return;

    button.addEventListener('click', () => {
      if (!item.hidden) return;
      item.hidden = false;
      requestAnimationFrame(() => item.classList.add('is-visible'));
      button.setAttribute('aria-expanded', 'true');
      window.setTimeout(() => {
        item.scrollIntoView({
          behavior: motionReduced ? 'auto' : 'smooth',
          block: 'nearest'
        });
      }, 90);
    });
  }

  /* ------------------------------------------------------------
     月亮下的一句话
     ------------------------------------------------------------ */
  function initMoonSecret() {
    const trigger = $('.moment__visual--interactive');
    const note = $('#moonSecretNote');
    if (!trigger || !note) return;

    let closeTimer = 0;

    const toggle = () => {
      const isOpen = trigger.getAttribute('aria-expanded') === 'true';
      const willOpen = !isOpen;
      trigger.setAttribute('aria-expanded', String(willOpen));
      trigger.setAttribute('aria-label', willOpen ? '合上月亮下的话' : '轻触月亮，读一句没有发出去的话');
      clearTimeout(closeTimer);

      if (willOpen) {
        note.hidden = false;
        requestAnimationFrame(() => note.classList.add('is-visible'));
      } else {
        note.classList.remove('is-visible');
        closeTimer = window.setTimeout(() => { note.hidden = true; }, 500);
      }
    };

    trigger.addEventListener('click', toggle);
    trigger.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      toggle();
    });
  }

  /* ------------------------------------------------------------
     对一颗星许愿
     ------------------------------------------------------------ */
  function initWishStar() {
    const star = $('#wishStar');
    const note = $('#wishNote');
    if (!star || !note) return;

    let closeTimer = 0;

    star.addEventListener('click', () => {
      const isOpen = star.getAttribute('aria-pressed') === 'true';
      const willOpen = !isOpen;
      star.setAttribute('aria-pressed', String(willOpen));
      clearTimeout(closeTimer);

      if (willOpen) {
        note.hidden = false;
        requestAnimationFrame(() => note.classList.add('is-visible'));
      } else {
        note.classList.remove('is-visible');
        closeTimer = window.setTimeout(() => { note.hidden = true; }, 500);
      }
    });
  }

  /* ------------------------------------------------------------
     你在这里
     ------------------------------------------------------------ */
  function initHereSecret() {
    const button = $('#hereSecret');
    if (!button) return;

    button.addEventListener('click', () => {
      const isRevealed = button.getAttribute('aria-pressed') === 'true';
      const next = !isRevealed;
      button.setAttribute('aria-pressed', String(next));
      button.classList.toggle('is-revealed', next);
      button.textContent = next ? '一直是你' : '你在这里';
      button.setAttribute('aria-label', next ? '这行字已经变成了：一直是你' : '轻触这行竖排小字');
    });
  }

  /* ------------------------------------------------------------
     太阳下的一行字
     ------------------------------------------------------------ */
  function initSunSecret() {
    const sun = $('#sunSecret');
    const note = $('#sunSecretNote');
    const art = $('.hero-art');
    if (!sun || !note) return;

    let closeTimer = 0;

    sun.addEventListener('click', () => {
      const isOpen = sun.getAttribute('aria-expanded') === 'true';
      const willOpen = !isOpen;
      sun.setAttribute('aria-expanded', String(willOpen));
      sun.setAttribute('aria-label', willOpen ? '合上太阳下的话' : '轻触太阳，读一行没有写进信里的话');
      clearTimeout(closeTimer);

      if (willOpen) {
        note.hidden = false;
        if (art) art.classList.add('is-sun-open');
        requestAnimationFrame(() => note.classList.add('is-visible'));
      } else {
        note.classList.remove('is-visible');
        if (art) art.classList.remove('is-sun-open');
        closeTimer = window.setTimeout(() => { note.hidden = true; }, 500);
      }
    });
  }

  /* ------------------------------------------------------------
     键盘里的 love
     ------------------------------------------------------------ */
  function initLoveSecret() {
    const toast = $('#loveSecret');
    if (!toast) return;

    let buffer = '';
    let hideTimer = 0;

    const hide = () => {
      toast.classList.remove('is-visible');
      hideTimer = window.setTimeout(() => { toast.hidden = true; }, 520);
    };

    const show = () => {
      if (!document.body.classList.contains('is-open')) return;
      clearTimeout(hideTimer);
      toast.hidden = false;
      requestAnimationFrame(() => toast.classList.add('is-visible'));
      hideTimer = window.setTimeout(hide, 7200);
    };

    document.addEventListener('keydown', event => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (!event.key || event.key.length !== 1) return;

      const target = event.target;
      if (target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"]')) return;

      buffer = `${buffer}${event.key.toLowerCase()}`.slice(-4);
      if (buffer === 'love') {
        buffer = '';
        show();
      }
    });
  }

  /* ------------------------------------------------------------
     信纸脚注
     ------------------------------------------------------------ */
  function initLetterFootnote() {
    const mark = $('#letterFootnote');
    const note = $('#letterFootnoteNote');
    if (!mark || !note) return;

    let closeTimer = 0;

    mark.addEventListener('click', () => {
      const isOpen = mark.getAttribute('aria-expanded') === 'true';
      const willOpen = !isOpen;
      mark.setAttribute('aria-expanded', String(willOpen));
      clearTimeout(closeTimer);

      if (willOpen) {
        note.hidden = false;
        requestAnimationFrame(() => note.classList.add('is-visible'));
        window.setTimeout(() => {
          note.scrollIntoView({
            behavior: motionReduced ? 'auto' : 'smooth',
            block: 'nearest'
          });
        }, 90);
      } else {
        note.classList.remove('is-visible');
        closeTimer = window.setTimeout(() => { note.hidden = true; }, 500);
      }
    });
  }

  /* ------------------------------------------------------------
     控制台里的一句话
     ------------------------------------------------------------ */
  function initConsoleNote() {
    try {
      console.log(
        '%cA LETTER FOR YOU',
        'font: 300 26px Georgia, "Times New Roman", serif; color: #a33a2a; letter-spacing: 2px;'
      );
      console.log(
        '%c如果你翻到了这里，说明你对这封信有一点好奇。\n页面上还有一颗不在图上的星。\n或者，试着在键盘上打出 love。',
        'font: 13px "Songti SC", "STSong", serif; color: #6b6358; line-height: 1.9;'
      );
    } catch (err) {
      /* console is optional */
    }
  }

  /* ------------------------------------------------------------
     第 00 章
     ------------------------------------------------------------ */
  function initZeroChapter() {
    const dialog = $('#zeroDialog');
    const close = $('#zeroClose');
    const brand = $('.topbar__brand');
    const monogram = $('.footer__monogram');
    if (!dialog) return;

    const open = () => {
      if (!document.body.classList.contains('is-open')) return;
      if (document.querySelector('dialog[open]')) return;
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
      document.body.classList.add('dialog-open');
    };

    const closeDialog = () => {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    };

    brand?.addEventListener('dblclick', event => {
      event.preventDefault();
      open();
    });
    brand?.addEventListener('click', event => {
      if (event.detail > 1) event.preventDefault();
    });

    monogram?.addEventListener('dblclick', event => {
      event.preventDefault();
      open();
    });

    document.addEventListener('keydown', event => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key !== '0') return;
      const target = event.target;
      if (target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"]')) return;
      event.preventDefault();
      open();
    });

    close?.addEventListener('click', closeDialog);
    dialog.addEventListener('close', () => {
      document.body.classList.remove('dialog-open');
    });
    dialog.addEventListener('click', event => {
      if (event.target === dialog) closeDialog();
    });
  }

  /* ------------------------------------------------------------
     深夜才出现的一行字
     ------------------------------------------------------------ */
  function initNightNote() {
    const note = $('#nightNote');
    if (!note) return;

    const hour = new Date().getHours();
    if (hour >= 23 || hour < 4) {
      note.hidden = false;
      requestAnimationFrame(() => note.classList.add('is-visible'));
    }
  }

  /* ------------------------------------------------------------
     切走标签页时的一句悄悄话
     ------------------------------------------------------------ */
  function initTitleSecret() {
    const original = document.title;
    let resetTimer = 0;

    document.addEventListener('visibilitychange', () => {
      clearTimeout(resetTimer);
      if (document.hidden) {
        document.title = '你还在吗？';
      } else {
        document.title = '欢迎回来。';
        resetTimer = window.setTimeout(() => { document.title = original; }, 2200);
      }
    });
  }

  /* ------------------------------------------------------------
     后记 / OR THE BEGINNING
     ------------------------------------------------------------ */
  function initEpilogue() {
    const button = $('#openEpilogue');
    const section = $('#epilogue');
    if (!button || !section) return;

    button.addEventListener('click', () => {
      if (!section.hidden) {
        section.scrollIntoView({ behavior: motionReduced ? 'auto' : 'smooth', block: 'start' });
        return;
      }

      section.hidden = false;
      requestAnimationFrame(() => section.classList.add('is-visible'));
      button.setAttribute('aria-expanded', 'true');
      window.setTimeout(() => {
        section.scrollIntoView({
          behavior: motionReduced ? 'auto' : 'smooth',
          block: 'start'
        });
      }, 90);
    });
  }

  /* ------------------------------------------------------------
     最后一句没有说出口的答案
     ------------------------------------------------------------ */
  function initFinaleSecret() {
    const button = $('#finaleSecret');
    const note = $('#finaleSecretNote');
    if (!button || !note) return;

    let closeTimer = 0;

    button.addEventListener('click', () => {
      const isOpen = button.getAttribute('aria-expanded') === 'true';
      const willOpen = !isOpen;
      button.setAttribute('aria-expanded', String(willOpen));
      clearTimeout(closeTimer);

      if (willOpen) {
        note.hidden = false;
        requestAnimationFrame(() => note.classList.add('is-visible'));
        window.setTimeout(() => {
          note.scrollIntoView({
            behavior: motionReduced ? 'auto' : 'smooth',
            block: 'nearest'
          });
        }, 90);
      } else {
        note.classList.remove('is-visible');
        closeTimer = window.setTimeout(() => { note.hidden = true; }, 500);
      }
    });
  }

  /* ------------------------------------------------------------
     诗页印章
     ------------------------------------------------------------ */
  function initPoemSealSecret() {
    const seal = $('#poemSeal');
    const echo = $('#poemEcho');
    if (!seal || !echo) return;

    let closeTimer = 0;

    seal.addEventListener('click', () => {
      const isOpen = seal.getAttribute('aria-expanded') === 'true';
      const willOpen = !isOpen;
      seal.setAttribute('aria-expanded', String(willOpen));
      seal.setAttribute('aria-label', willOpen ? '合上诗的另一面' : '轻触印章，翻开诗的另一面');
      clearTimeout(closeTimer);

      if (willOpen) {
        echo.hidden = false;
        requestAnimationFrame(() => echo.classList.add('is-visible'));
        window.setTimeout(() => {
          echo.scrollIntoView({
            behavior: motionReduced ? 'auto' : 'smooth',
            block: 'center'
          });
        }, 90);
      } else {
        echo.classList.remove('is-visible');
        closeTimer = window.setTimeout(() => { echo.hidden = true; }, 500);
      }
    });
  }

  /* ------------------------------------------------------------
     藏头诗
     ------------------------------------------------------------ */
  function initAcrostic() {
    const button = $('#readAcrostic');
    const poem = $('#poem');
    const answer = $('#acrosticAnswer');
    if (!button || !poem || !answer) return;

    let closeTimer = 0;

    button.addEventListener('click', () => {
      const isOpen = button.getAttribute('aria-expanded') === 'true';
      const willOpen = !isOpen;
      const label = $('span', button);
      clearTimeout(closeTimer);

      if (willOpen) {
        answer.hidden = false;
        requestAnimationFrame(() => answer.classList.add('is-visible'));
        poem.classList.add('is-revealed');
        button.setAttribute('aria-expanded', 'true');
        if (label) label.textContent = '收好这四个字';
        window.setTimeout(() => {
          answer.scrollIntoView({
            behavior: motionReduced ? 'auto' : 'smooth',
            block: 'nearest',
            inline: 'nearest'
          });
        }, 90);
      } else {
        answer.classList.remove('is-visible');
        poem.classList.remove('is-revealed');
        button.setAttribute('aria-expanded', 'false');
        if (label) label.textContent = '读出藏头';
        closeTimer = window.setTimeout(() => { answer.hidden = true; }, 500);
      }
    });
  }

  /* ------------------------------------------------------------
     星图
     ------------------------------------------------------------ */
  function heartPoint(t) {
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    return { x, y };
  }

  class StarMap {
    constructor(canvas, host, stars) {
      this.canvas = canvas;
      this.host = host;
      this.ctx = canvas.getContext('2d');
      this.stars = stars;
      this.active = 0;
      this.buttons = [];
      this.visible = false;
      this.pointer = { x: 0, y: 0, active: false };
      this.raf = 0;
      this.w = 0;
      this.h = 0;
      this.dpr = 1;
      this.nextShoot = 0;
      this.shooting = [];
      this.time = 0;
      this.visited = new Set();
      this.onAllVisited = null;

      this.buildDom();
      this.bind();
      this.resize();

      if ('ResizeObserver' in window) {
        this.ro = new ResizeObserver(() => this.resize());
        this.ro.observe(host);
      } else {
        window.addEventListener('resize', () => this.resize());
      }

      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          this.visible = entry.isIntersecting;
          if (this.visible) this.start();
          else this.stop();
        });
      }, { threshold: 0.12 });

      observer.observe(host);
    }

    buildDom() {
      const holder = $('#skyStars');
      if (!holder) return;

      holder.innerHTML = '';
      this.buttons = this.stars.map((star, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'sky-star';
        button.setAttribute('aria-label', `${star.title}：${star.text}`);
        button.dataset.index = String(index);

        const dot = document.createElement('span');
        dot.className = 'sky-star__dot';
        dot.setAttribute('aria-hidden', 'true');

        const label = document.createElement('span');
        label.className = 'sky-star__label';
        label.textContent = star.title;

        button.append(dot, label);

        button.addEventListener('mouseenter', () => this.setActive(index));
        button.addEventListener('focus', () => this.setActive(index));
        button.addEventListener('click', event => {
          event.preventDefault();
          this.setActive(index);
          button.blur();
        });

        holder.appendChild(button);
        return button;
      });
    }

    bind() {
      this.host.addEventListener('pointermove', event => {
        const rect = this.host.getBoundingClientRect();
        this.pointer.x = event.clientX - rect.left;
        this.pointer.y = event.clientY - rect.top;
        this.pointer.active = true;
        if (motionReduced) this.draw(this.time);
      }, { passive: true });

      this.host.addEventListener('pointerleave', () => {
        this.pointer.active = false;
        if (motionReduced) this.draw(this.time);
      });

      if ('matchMedia' in window) {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const onChange = event => {
          motionReduced = event.matches;
          if (motionReduced) {
            this.stop();
            this.draw(this.time);
          } else if (this.visible) {
            this.start();
          }
        };
        if (mq.addEventListener) mq.addEventListener('change', onChange);
        else mq.addListener(onChange);
      }
    }

    setActive(index) {
      if (index < 0 || index >= this.stars.length) return;
      this.active = index;

      $('#skyNote')?.classList.remove('is-secret');

      this.buttons.forEach((button, i) => {
        const active = i === index;
        button.classList.toggle('is-active', active);
        if (active) button.setAttribute('aria-current', 'true');
        else button.removeAttribute('aria-current');
      });

      const star = this.stars[index];
      const noteIndex = $('#skyNoteIndex');
      const noteTitle = $('#skyNoteTitle');
      const noteText = $('#skyNoteText');
      if (noteIndex) noteIndex.textContent = `STAR ${String(index + 1).padStart(2, '0')} / ${String(this.stars.length).padStart(2, '0')}`;
      if (noteTitle) noteTitle.textContent = star.title;
      if (noteText) noteText.textContent = star.text;

      this.visited.add(index);
      if (this.visited.size >= this.stars.length && typeof this.onAllVisited === 'function') {
        const reveal = this.onAllVisited;
        this.onAllVisited = null;
        reveal();
      }

      if (motionReduced) this.draw(this.time);
    }

    resize() {
      const rect = this.host.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      this.w = rect.width;
      this.h = rect.height;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = Math.round(this.w * this.dpr);
      this.canvas.height = Math.round(this.h * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

      this.computeHeart();
      this.buildBackground();
      this.positionStars();

      if (motionReduced) this.draw(this.time);
    }

    computeHeart() {
      const mobile = this.w < 760;
      const availableW = this.w * (mobile ? 0.9 : 0.6);
      const availableH = this.h * (mobile ? 0.56 : 0.76);
      const scale = Math.min(availableW / 32, availableH / 25);

      this.scale = scale;
      this.cx = this.w * (mobile ? 0.5 : 0.43);
      this.cy = this.h * (mobile ? 0.37 : 0.46) - 4.5 * scale;

      const total = 220;
      this.heart = [];
      for (let i = 0; i < total; i += 1) {
        const t = (i / total) * Math.PI * 2;
        const p = heartPoint(t);
        this.heart.push({
          x: this.cx + p.x * scale,
          y: this.cy - p.y * scale
        });
      }

      const tValues = [0.55, 1.28, 2.15, 2.95, 3.95, 5.3, 5.95];
      this.points = tValues.map((t, index) => {
        const p = heartPoint(t);
        return {
          x: this.cx + p.x * scale,
          y: this.cy - p.y * scale,
          star: this.stars[index] || this.stars[this.stars.length - 1]
        };
      });
    }

    buildBackground() {
      const count = Math.max(70, Math.min(230, Math.floor((this.w * this.h) / 7200)));
      this.dust = Array.from({ length: count }, () => ({
        x: Math.random() * this.w,
        y: Math.random() * this.h,
        r: Math.random() * 1.15 + 0.25,
        base: Math.random() * 0.45 + 0.12,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.0012 + 0.00035,
        warm: Math.random() > 0.72
      }));
    }

    positionStars() {
      if (!this.points) return;
      this.buttons.forEach((button, index) => {
        const point = this.points[index];
        if (!point) return;
        const xPct = (point.x / this.w) * 100;
        const yPct = (point.y / this.h) * 100;
        button.style.setProperty('--x', `${xPct}%`);
        button.style.setProperty('--y', `${yPct}%`);
        button.classList.toggle('is-below', yPct < 28);
        button.classList.toggle('align-left', xPct < 22);
        button.classList.toggle('align-right', xPct > 78);
      });
    }

    start() {
      if (this.raf) return;
      this.nextShoot = performance.now() + 4500;
      this.last = performance.now();
      const loop = now => {
        this.raf = requestAnimationFrame(loop);
        this.time = now;
        this.draw(now);
      };
      this.raf = requestAnimationFrame(loop);
    }

    stop() {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }

    draw(now = 0) {
      const ctx = this.ctx;
      if (!ctx || !this.w) return;

      ctx.clearRect(0, 0, this.w, this.h);

      // cursor light
      if (this.pointer.active && !motionReduced) {
        const glow = ctx.createRadialGradient(this.pointer.x, this.pointer.y, 0, this.pointer.x, this.pointer.y, 150);
        glow.addColorStop(0, 'rgba(201, 174, 128, 0.09)');
        glow.addColorStop(0.45, 'rgba(163, 58, 42, 0.035)');
        glow.addColorStop(1, 'rgba(163, 58, 42, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(this.pointer.x - 150, this.pointer.y - 150, 300, 300);
      }

      // dust
      this.dust?.forEach(star => {
        const twinkle = motionReduced ? 0.72 : 0.6 + Math.sin(now * star.speed + star.phase) * 0.4;
        ctx.beginPath();
        ctx.fillStyle = star.warm
          ? `rgba(201, 174, 128, ${(star.base * twinkle).toFixed(3)})`
          : `rgba(239, 232, 218, ${(star.base * twinkle).toFixed(3)})`;
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();
      });

      if (!this.heart?.length) return;

      // a barely-there fill
      ctx.beginPath();
      this.heart.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.closePath();
      ctx.fillStyle = 'rgba(163, 58, 42, 0.018)';
      ctx.fill();

      // constellation outline
      ctx.beginPath();
      this.heart.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.closePath();
      ctx.strokeStyle = 'rgba(201, 174, 128, 0.16)';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // tiny points along the outline
      for (let i = 0; i < this.heart.length; i += 11) {
        const point = this.heart[i];
        ctx.beginPath();
        ctx.fillStyle = 'rgba(201, 174, 128, 0.38)';
        ctx.arc(point.x, point.y, 0.9, 0, Math.PI * 2);
        ctx.fill();
      }

      // constellation joins
      this.points?.forEach((point, index) => {
        const next = this.points[(index + 1) % this.points.length];
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
        ctx.lineTo(next.x, next.y);
        ctx.strokeStyle = index === this.active
          ? 'rgba(213, 187, 146, 0.46)'
          : 'rgba(201, 174, 128, 0.18)';
        ctx.lineWidth = index === this.active ? 1 : 0.7;
        ctx.stroke();
      });

      // pointer to nearest stars
      if (this.pointer.active && this.points) {
        const nearest = this.points
          .map((point, index) => ({
            index,
            dist: Math.hypot(point.x - this.pointer.x, point.y - this.pointer.y)
          }))
          .sort((a, b) => a.dist - b.dist)
          .slice(0, 2);

        nearest.forEach(({ index, dist }) => {
          if (dist > 380) return;
          const point = this.points[index];
          ctx.beginPath();
          ctx.moveTo(point.x, point.y);
          ctx.lineTo(this.pointer.x, this.pointer.y);
          ctx.strokeStyle = `rgba(201, 174, 128, ${(0.13 * (1 - dist / 380)).toFixed(3)})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        });
      }

      // active glow
      const active = this.points?.[this.active];
      if (active) {
        const pulse = motionReduced ? 1 : 1 + Math.sin(now * 0.0015) * 0.12;
        const glow = ctx.createRadialGradient(active.x, active.y, 0, active.x, active.y, 42 * pulse);
        glow.addColorStop(0, 'rgba(214, 186, 142, 0.23)');
        glow.addColorStop(0.5, 'rgba(163, 58, 42, 0.09)');
        glow.addColorStop(1, 'rgba(163, 58, 42, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(active.x, active.y, 42 * pulse, 0, Math.PI * 2);
        ctx.fill();
      }

      // main stars
      this.points?.forEach((point, index) => {
        const isActive = index === this.active;
        ctx.beginPath();
        ctx.fillStyle = isActive ? 'rgba(239, 232, 218, 1)' : 'rgba(201, 174, 128, 0.75)';
        ctx.arc(point.x, point.y, isActive ? 2.2 : 1.4, 0, Math.PI * 2);
        ctx.fill();
      });

      // shooting stars
      if (!motionReduced) {
        if (now > this.nextShoot) {
          this.spawnShooting(now);
          this.nextShoot = now + 6500 + Math.random() * 6500;
        }

        this.shooting = this.shooting.filter(shoot => {
          shoot.x += shoot.vx;
          shoot.y += shoot.vy;
          shoot.life += 0.012;
          if (shoot.life >= 1) return false;

          const tailX = shoot.x - shoot.vx * 22;
          const tailY = shoot.y - shoot.vy * 22;
          const gradient = ctx.createLinearGradient(shoot.x, shoot.y, tailX, tailY);
          gradient.addColorStop(0, `rgba(239, 232, 218, ${0.5 * (1 - shoot.life)})`);
          gradient.addColorStop(1, 'rgba(239, 232, 218, 0)');
          ctx.beginPath();
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 1;
          ctx.moveTo(shoot.x, shoot.y);
          ctx.lineTo(tailX, tailY);
          ctx.stroke();
          return true;
        });
      }
    }

    spawnShooting(now) {
      this.shooting.push({
        x: this.w * (0.15 + Math.random() * 0.65),
        y: this.h * (0.08 + Math.random() * 0.25),
        vx: 3.2 + Math.random() * 2.5,
        vy: 0.8 + Math.random() * 1.2,
        life: 0
      });
    }
  }

  function initStarMap() {
    const canvas = $('#starCanvas');
    const host = $('#sky');
    if (!canvas || !host) return;

    const stars = Array.isArray(CONFIG.stars) && CONFIG.stars.length
      ? CONFIG.stars
      : [
        { title: '初见', text: '那天你抬头的时候，世界忽然安静了一下。' },
        { title: '心动', text: '喜欢是在很多个普通瞬间里，悄悄偏向了你。' },
        { title: '晚安', text: '一天里最好的部分，总是和你有关。' },
        { title: '想念', text: '想念没有声音，却替我回答了“你在想谁”。' },
        { title: '以后', text: '有光，有饭香，有你坐在对面，就很好。' },
        { title: '我们', text: '这个词，我把它轻轻放在你面前。' },
        { title: '此刻', text: '你会不会也有一点点，和我一样的心动。' }
      ];

    const map = new StarMap(canvas, host, stars);
    map.setActive(0);

    const secretButton = $('#skySecret');
    const note = $('#skyNote');
    const secretStar = CONFIG.secretStar || {
      title: '你',
      text: '前面七颗星，都是我一个人的心事。第八颗不在地图上，它在你读到这里的时候，刚好亮了一下。'
    };

    if (secretButton && note) {
      map.onAllVisited = () => {
        secretButton.hidden = false;
        requestAnimationFrame(() => secretButton.classList.add('is-visible'));
      };

      secretButton.addEventListener('click', () => {
        const noteIndex = $('#skyNoteIndex');
        const noteTitle = $('#skyNoteTitle');
        const noteText = $('#skyNoteText');
        const hint = $('.sky__hint');
        const label = $('span:last-child', secretButton);

        note.classList.add('is-secret');
        if (noteIndex) noteIndex.textContent = 'STAR 08 / 08';
        if (noteTitle) noteTitle.textContent = secretStar.title;
        if (noteText) noteText.textContent = secretStar.text;
        if (hint) {
          hint.textContent = '✦ · YOU FOUND THE STAR · 你找到了一颗不在图上的星 · ✦';
          hint.classList.add('is-found');
        }
        secretButton.classList.add('is-found');
        if (label) label.textContent = '第八颗星，已找到';
      });
    }

    window.__starMap = map;
  }

  /* ------------------------------------------------------------
     环境音：用 Web Audio 现场生成，不加载音频文件
     ------------------------------------------------------------ */
  class Ambient {
    constructor(button) {
      this.button = button;
      this.ctx = null;
      this.master = null;
      this.bus = null;
      this.reverb = null;
      this.on = false;
      this.timers = new Set();
      this.label = $('.sound__label', button);
      this.droneStarted = false;
      this.ready = false;
    }

    init() {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;

      try {
        this.ctx = new AC();
        const ctx = this.ctx;

        this.master = ctx.createGain();
        this.master.gain.value = 0;
        this.master.connect(ctx.destination);

        this.bus = ctx.createGain();
        this.bus.gain.value = 0.85;
        this.bus.connect(this.master);

        this.reverb = ctx.createConvolver();
        this.reverb.buffer = this.makeImpulse(3.4, 2.7);
        const wet = ctx.createGain();
        wet.gain.value = 0.42;
        this.reverb.connect(wet);
        wet.connect(this.master);
        this.bus.connect(this.reverb);

        this.startDrone();
        this.ready = true;
        return true;
      } catch (err) {
        console.warn('Ambient audio could not be initialised.', err);
        return false;
      }
    }

    makeImpulse(duration, decay) {
      const ctx = this.ctx;
      const length = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
      for (let channel = 0; channel < 2; channel += 1) {
        const data = buffer.getChannelData(channel);
        for (let i = 0; i < length; i += 1) {
          data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
        }
      }
      return buffer;
    }

    startDrone() {
      if (this.droneStarted) return;
      const ctx = this.ctx;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 360;
      filter.Q.value = 0.4;

      const droneGain = ctx.createGain();
      droneGain.gain.value = 0.018;
      filter.connect(droneGain);
      droneGain.connect(this.bus);

      [55, 110, 164.81].forEach((frequency, index) => {
        const osc = ctx.createOscillator();
        osc.type = index === 0 ? 'sine' : 'triangle';
        osc.frequency.value = frequency;
        osc.detune.value = index === 0 ? -3 : index === 1 ? 4 : -5;
        const voice = ctx.createGain();
        voice.gain.value = index === 0 ? 0.55 : 0.18;
        osc.connect(voice);
        voice.connect(filter);
        osc.start();
      });

      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.035;
      lfoGain.gain.value = 0.006;
      lfo.connect(lfoGain);
      lfoGain.connect(droneGain.gain);
      lfo.start();

      this.droneStarted = true;
    }

    queue(fn, delay) {
      const timer = window.setTimeout(() => {
        this.timers.delete(timer);
        if (this.on) fn();
      }, delay);
      this.timers.add(timer);
    }

    pad(frequencies) {
      const ctx = this.ctx;
      const now = ctx.currentTime;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 900;
      filter.Q.value = 0.3;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.012, now + 3.2);
      gain.gain.setValueAtTime(0.012, now + 5.6);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 12.5);

      filter.connect(gain);
      gain.connect(this.bus);

      frequencies.forEach(frequency => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = frequency;
        osc.detune.value = (Math.random() - 0.5) * 7;
        osc.connect(filter);
        osc.start(now);
        osc.stop(now + 12.8);
      });
    }

    bell() {
      const ctx = this.ctx;
      const now = ctx.currentTime + 0.03;
      const notes = [587.33, 659.25, 739.99, 880, 987.77, 1174.66];
      const frequency = notes[Math.floor(Math.random() * notes.length)];

      [1, 2.01].forEach((multiple, index) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = frequency * multiple;
        const gain = ctx.createGain();
        const volume = index === 0 ? 0.028 : 0.007;
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(volume, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.4);
        osc.connect(gain);
        gain.connect(this.bus);
        osc.start(now);
        osc.stop(now + 3.6);
      });
    }

    schedule() {
      this.pad([146.83, 220, 293.66, 369.99, 440]);
      this.queue(() => {
        this.bell();
        this.queue(() => {
          this.pad([130.81, 196, 293.66, 329.63, 440]);
        }, 4200);
      }, 6100);

      this.queue(() => {
        this.bell();
        this.schedule();
      }, 12500);
    }

    clearTimers() {
      this.timers.forEach(timer => clearTimeout(timer));
      this.timers.clear();
    }

    async toggle() {
      if (!this.ready && !this.init()) {
        this.button.hidden = true;
        return;
      }

      this.on = !this.on;

      if (this.ctx.state === 'suspended') {
        try { await this.ctx.resume(); } catch (err) { /* ignore */ }
      }

      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(this.on ? 0.42 : 0, now, this.on ? 1.4 : 0.7);

      if (this.on) {
        this.schedule();
      } else {
        this.clearTimers();
      }

      this.button.classList.toggle('is-on', this.on);
      this.button.setAttribute('aria-pressed', String(this.on));
      this.button.setAttribute('aria-label', this.on ? '关闭环境音' : '开启环境音');
      if (this.label) this.label.textContent = this.on ? 'SOUND ON' : 'SOUND OFF';
    }
  }

  function initSound() {
    const button = $('#soundToggle');
    if (!button) return;
    const engine = new Ambient(button);
    button.addEventListener('click', () => engine.toggle());

    document.addEventListener('visibilitychange', () => {
      if (!engine.ready) return;
      if (document.hidden) {
        engine.ctx.suspend().catch(() => {});
      } else if (engine.on) {
        engine.ctx.resume().catch(() => {});
      }
    });
  }

  /* ------------------------------------------------------------
     最后一个回答
     ------------------------------------------------------------ */
  function initFinale() {
    const yes = $('#sayYes');
    const think = $('#thinkAgain');
    const reply = $('#thinkReply');
    const dialog = $('#yesDialog');
    const close = $('#yesClose');
    const again = $('#yesAgain');
    const save = $('#saveMoment');
    const petals = $('#petals');
    if (!yes || !dialog) return;

    think?.addEventListener('click', () => {
      if (!reply) return;
      const willShow = reply.hidden;
      reply.hidden = !willShow;
      think.setAttribute('aria-expanded', String(willShow));

      if (willShow) {
        reply.classList.remove('is-visible');
        requestAnimationFrame(() => reply.classList.add('is-visible'));
        think.querySelector('span').textContent = '好，我再想想';
      } else {
        think.querySelector('span').textContent = '让我再想想';
      }
    });

    const addPetals = () => {
      if (!petals || motionReduced) return;
      petals.innerHTML = '';
      const colors = ['#a33a2a', '#c26f56', '#d9b98f', '#efe3d1', '#8e4234'];

      for (let i = 0; i < 38; i += 1) {
        const petal = document.createElement('span');
        petal.className = 'petal';
        petal.style.left = `${Math.random() * 100}%`;
        petal.style.setProperty('--size', `${6 + Math.random() * 12}px`);
        petal.style.setProperty('--dur', `${5 + Math.random() * 5}s`);
        petal.style.setProperty('--delay', `${Math.random() * 4}s`);
        petal.style.setProperty('--sway', `${-70 + Math.random() * 140}px`);
        petal.style.setProperty('--spin', `${180 + Math.random() * 540}deg`);
        petal.style.setProperty('--color', colors[Math.floor(Math.random() * colors.length)]);
        petals.appendChild(petal);
      }
    };

    yes.addEventListener('click', () => {
      if (typeof dialog.showModal !== 'function') {
        dialog.setAttribute('open', '');
      } else {
        dialog.showModal();
      }
      document.body.classList.add('dialog-open');
      addPetals();
    });

    const closeDialog = () => {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    };

    close?.addEventListener('click', closeDialog);

    again?.addEventListener('click', () => {
      closeDialog();
      window.setTimeout(() => {
        document.getElementById('chapter-05')?.scrollIntoView({ behavior: motionReduced ? 'auto' : 'smooth' });
      }, 80);
    });

    dialog.addEventListener('close', () => {
      document.body.classList.remove('dialog-open');
      if (petals) petals.innerHTML = '';
    });

    dialog.addEventListener('click', event => {
      if (event.target === dialog) closeDialog();
    });

    save?.addEventListener('click', async () => {
      if (save.disabled) return;
      const original = save.textContent;
      save.disabled = true;
      save.textContent = '正在保存…';

      try {
        await makeKeepsake();
        save.textContent = '已保存 ✓';
        window.setTimeout(() => {
          save.textContent = original;
          save.disabled = false;
        }, 2200);
      } catch (err) {
        console.warn('Keepsake could not be generated.', err);
        save.textContent = '请截图保存';
        window.setTimeout(() => {
          save.textContent = original;
          save.disabled = false;
        }, 2600);
      }
    });
  }

  async function makeKeepsake() {
    if (document.fonts?.ready) {
      try { await document.fonts.ready; } catch (err) { /* ignore */ }
    }

    const width = 1080;
    const height = 1350;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    const paper = '#f2ede3';
    const ink = '#1c1a17';
    const red = '#a33a2a';
    const gold = '#a88455';

    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, width, height);

    // paper grain
    for (let i = 0; i < 1600; i += 1) {
      ctx.fillStyle = `rgba(28, 26, 23, ${Math.random() * 0.018})`;
      ctx.fillRect(Math.random() * width, Math.random() * height, 1, 1);
    }

    // frame
    ctx.strokeStyle = 'rgba(28, 26, 23, 0.28)';
    ctx.lineWidth = 1;
    ctx.strokeRect(52, 52, width - 104, height - 104);
    ctx.strokeStyle = 'rgba(28, 26, 23, 0.1)';
    ctx.strokeRect(64, 64, width - 128, height - 128);

    // red sun
    const sun = ctx.createRadialGradient(842, 324, 10, 810, 332, 190);
    sun.addColorStop(0, '#cf8062');
    sun.addColorStop(0.55, '#b44d38');
    sun.addColorStop(1, 'rgba(163, 58, 42, 0.88)');
    ctx.fillStyle = sun;
    ctx.beginPath();
    ctx.arc(820, 330, 155, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(168, 132, 85, 0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(820, 330, 216, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(820, 330, 238, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(168, 132, 85, 0.22)';
    ctx.stroke();

    // small star
    ctx.fillStyle = gold;
    ctx.font = '18px "Cormorant Garamond", serif';
    ctx.fillText('✦', 712, 182);

    ctx.letterSpacing = '3px';
    ctx.fillStyle = ink;
    ctx.font = '500 17px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.fillText('PRIVATE EDITION / NO. 001', 102, 126);
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(28, 26, 23, 0.6)';
    ctx.fillText(CONFIG.date, width - 102, 126);
    ctx.textAlign = 'left';
    ctx.letterSpacing = '0px';

    ctx.fillStyle = red;
    ctx.beginPath();
    ctx.arc(106, 184, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = ink;
    ctx.font = '300 92px "Noto Serif SC", "Songti SC", serif';
    ctx.fillText('故事有了', 98, 468);
    ctx.fillText('第二位作者。', 98, 576);

    ctx.fillStyle = '#a33a2a';
    ctx.font = 'italic 300 38px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('the beginning of us', 104, 644);

    // line + quote
    ctx.strokeStyle = 'rgba(28, 26, 23, 0.2)';
    ctx.beginPath();
    ctx.moveTo(100, 718);
    ctx.lineTo(560, 718);
    ctx.stroke();

    ctx.fillStyle = 'rgba(28, 26, 23, 0.74)';
    ctx.font = '300 30px "Noto Serif SC", "Songti SC", serif';
    ctx.fillText('从今天起，普通的日子也有了光。', 100, 786);
    ctx.fillText('以后请多指教，我最喜欢的人。', 100, 836);

    // small constellation
    const cx = 820;
    const cy = 1010;
    const scale = 5.6;
    ctx.beginPath();
    for (let i = 0; i <= 120; i += 1) {
      const t = (i / 120) * Math.PI * 2;
      const p = heartPoint(t);
      const x = cx + p.x * scale;
      const y = cy - p.y * scale;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(168, 132, 85, 0.45)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    for (let i = 0; i < 18; i += 1) {
      const t = (i / 18) * Math.PI * 2;
      const p = heartPoint(t);
      ctx.beginPath();
      ctx.fillStyle = 'rgba(168, 132, 85, 0.9)';
      ctx.arc(cx + p.x * scale, cy - p.y * scale, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // names
    ctx.strokeStyle = 'rgba(28, 26, 23, 0.2)';
    ctx.beginPath();
    ctx.moveTo(100, 1040);
    ctx.lineTo(700, 1040);
    ctx.stroke();

    ctx.fillStyle = 'rgba(28, 26, 23, 0.52)';
    ctx.font = '500 14px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.letterSpacing = '3px';
    ctx.fillText('TO', 102, 1096);
    ctx.fillText('FROM', 422, 1096);
    ctx.letterSpacing = '0px';

    ctx.fillStyle = ink;
    ctx.font = '400 28px "Noto Serif SC", "Songti SC", serif';
    ctx.fillText(CONFIG.recipient, 102, 1136);
    ctx.fillText(CONFIG.sender, 422, 1136);

    ctx.fillStyle = 'rgba(28, 26, 23, 0.52)';
    ctx.font = 'italic 300 28px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('made slowly, with a very full heart', 100, 1220);
    ctx.textAlign = 'right';
    ctx.font = '500 13px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.letterSpacing = '2px';
    ctx.fillText('NO. 001 / 001', width - 102, 1220);
    ctx.letterSpacing = '0px';
    ctx.textAlign = 'left';

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('Empty image');

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `我们的第一页-${CONFIG.dateISO}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  /* ------------------------------------------------------------
     其他小细节
     ------------------------------------------------------------ */
  function initMisc() {
    // 给卡片添加光晕跟踪
    $$('.moment').forEach(card => card.setAttribute('data-glow', ''));

    // 不支持 hover 的设备上，避免出现隐藏交互
    if (!finePointer.matches) document.body.classList.add('is-touch');

    // 用户切换“减少动态效果”时，去掉未播放完的遮罩
    if (reduceMotion.addEventListener) {
      reduceMotion.addEventListener('change', event => {
        motionReduced = event.matches;
        if (motionReduced) {
          $$('[data-reveal]').forEach(el => el.classList.add('is-in'));
          document.body.classList.add('motion-reduced');
        }
      });
    }
  }

  function init() {
    applyConfig();
    initIntro();
    initReveal();
    initChapterRail();
    initCursor();
    initParallax();
    initAccordion();
    initWhySecret();
    initReasonsCountSecret();
    initSkyCoordinates();
    initSeasonSecret();
    initIdleNote();
    initCopySecret();
    initTimeSecrets();
    initKonami();
    initPromises();
    initTimeline();
    initTimelineMore();
    initUnsent();
    initStampSecret();
    initPageSecret();
    initSignatureSecret();
    initPostscriptSecret();
    initLetterDateSecret();
    initLetterSecret();
    initLetterFootnote();
    initMoonSecret();
    initWishStar();
    initHereSecret();
    initTextSecrets();
    initSunSecret();
    initLoveSecret();
    initPoemSealSecret();
    initAnswerSecret();
    initPoemMore();
    initEpilogue();
    initFinaleSecret();
    initQuestionSecret();
    initTitleSecret();
    initNightNote();
    initZeroChapter();
    initColophon();
    initMagnetic();
    initConsoleNote();
    initAcrostic();
    initStarMap();
    initSound();
    initFinale();
    initMisc();
    document.documentElement.classList.add('is-ready');

    if (motionReduced) document.body.classList.add('motion-reduced');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
