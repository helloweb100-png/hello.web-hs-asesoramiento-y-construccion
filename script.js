/* =====================================================================
   HS ASESORAMIENTO Y CONSTRUCCIÓN
   Interacciones y animaciones.
   Dependencias: GSAP + ScrollTrigger + Lenis (cargadas desde CDN).
   Si alguna librería falla, la página sigue siendo totalmente usable.
   ===================================================================== */
(() => {
    'use strict';

    const root = document.documentElement;
    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

    const WA_NUMBER = '524433517787';
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
    const staticMode = reduceMotion || !hasGSAP;

    let lenis = null;
    let lenisTick = null;
    let particles = null;

    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    if (staticMode) root.classList.add('rm');

    /* -----------------------------------------------------------------
       Utilidades
    ----------------------------------------------------------------- */
    const splitWords = (el) => {
        const walk = (node) => {
            Array.from(node.childNodes).forEach((child) => {
                if (child.nodeType === 3) {
                    const frag = document.createDocumentFragment();
                    child.textContent.split(/(\s+)/).forEach((tok) => {
                        if (!tok) return;
                        if (/^\s+$/.test(tok)) {
                            frag.appendChild(document.createTextNode(' '));
                        } else {
                            const w = document.createElement('span');
                            const inner = document.createElement('span');
                            w.className = 'w';
                            inner.className = 'w__in';
                            inner.textContent = tok;
                            w.appendChild(inner);
                            frag.appendChild(w);
                        }
                    });
                    node.replaceChild(frag, child);
                } else if (child.nodeType === 1) {
                    walk(child);
                }
            });
        };
        walk(el);
        return $$('.w__in', el);
    };

    const scrollToTarget = (target) => {
        if (lenis) {
            lenis.scrollTo(target, { offset: 0, duration: 1.8, easing: (t) => 1 - Math.pow(1 - t, 4) });
        } else {
            target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
        }
    };

    /* =================================================================
       UI BÁSICA (no depende de GSAP)
    ================================================================= */
    const initAnchors = () => {
        document.addEventListener('click', (e) => {
            const a = e.target.closest('a[href^="#"]');
            if (!a) return;
            const id = a.getAttribute('href');
            if (!id || id.length < 2) return;
            const target = document.querySelector(id);
            if (!target) return;
            e.preventDefault();
            if (history.pushState) history.pushState(null, '', id);
            scrollToTarget(target);
        });
    };

    const initMenu = () => {
        const nav = $('#nav');
        const btn = $('#menu-btn');
        const menu = $('#mobile-menu');
        if (!nav || !btn || !menu) return;
        menu.inert = true;

        const setOpen = (open) => {
            nav.classList.toggle('is-open', open);
            btn.setAttribute('aria-expanded', String(open));
            btn.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
            menu.setAttribute('aria-hidden', String(!open));
            menu.inert = !open;
            if (lenis) {
                open ? lenis.stop() : lenis.start();
            } else {
                document.body.style.overflow = open ? 'hidden' : '';
            }
        };

        btn.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
        menu.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && nav.classList.contains('is-open')) {
                setOpen(false);
                btn.focus();
            }
        });
        window.matchMedia('(min-width: 1024px)').addEventListener('change', (e) => { if (e.matches) setOpen(false); });
    };

    const initFaq = () => {
        const items = $$('.acc__item');
        const toggle = (item, open) => {
            item.classList.toggle('is-open', open);
            $('.acc__btn', item).setAttribute('aria-expanded', String(open));
        };
        items.forEach((item) => {
            $('.acc__btn', item).addEventListener('click', () => {
                const open = !item.classList.contains('is-open');
                items.forEach((other) => { if (other !== item) toggle(other, false); });
                toggle(item, open);
                if (hasGSAP) setTimeout(() => ScrollTrigger.refresh(), 700);
            });
        });
    };

    const initCompare = () => {
        $$('.compare').forEach((box) => {
            const range = $('.compare__range', box);
            range.addEventListener('input', () => box.style.setProperty('--pos', range.value + '%'));
        });

        const tabs = $$('.ba__tab');
        const panels = $$('.ba__panel');
        const activate = (index, focus) => {
            tabs.forEach((tab, i) => {
                const on = i === index;
                tab.classList.toggle('is-active', on);
                tab.setAttribute('aria-selected', String(on));
                tab.tabIndex = on ? 0 : -1;
                if (on && focus) tab.focus();
            });
            panels.forEach((panel, i) => {
                const on = i === index;
                panel.hidden = !on;
                panel.classList.toggle('is-active', on);
                if (on) {
                    const box = $('.compare', panel);
                    const range = $('.compare__range', box);
                    range.value = 50;
                    box.style.setProperty('--pos', '50%');
                }
            });
        };
        tabs.forEach((tab, i) => {
            tab.addEventListener('click', () => activate(i));
            tab.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowRight') { e.preventDefault(); activate((i + 1) % tabs.length, true); }
                if (e.key === 'ArrowLeft') { e.preventDefault(); activate((i - 1 + tabs.length) % tabs.length, true); }
            });
        });
    };

    const initVideos = () => {
        const frames = $$('.vid');
        if (!frames.length) return;
        const sync = (video, btn) => {
            const paused = video.paused;
            btn.setAttribute('aria-label', paused ? 'Reproducir video' : 'Pausar video');
            btn.innerHTML = paused ? '<i class="ph ph-play" aria-hidden="true"></i>' : '<i class="ph ph-pause" aria-hidden="true"></i>';
        };
        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                const video = $('video', entry.target);
                if (entry.isIntersecting) {
                    if (!video.dataset.userPaused && !reduceMotion) video.play().catch(() => {});
                } else {
                    video.pause();
                }
            });
        }, { threshold: 0.5 });

        frames.forEach((frame) => {
            const video = $('video', frame);
            const btn = $('.vid__btn', frame);
            video.addEventListener('play', () => sync(video, btn));
            video.addEventListener('pause', () => sync(video, btn));
            btn.addEventListener('click', () => {
                if (video.paused) { delete video.dataset.userPaused; video.play().catch(() => {}); }
                else { video.dataset.userPaused = '1'; video.pause(); }
            });
            sync(video, btn);
            io.observe(frame);
        });
    };

    const initForm = () => {
        const form = $('#wa-form');
        if (!form) return;
        const fields = {
            nombre: { el: form.elements.nombre, err: $('#e-nombre'), msg: 'Escribe tu nombre para saber cómo llamarte.' },
            servicio: { el: form.elements.servicio, err: $('#e-servicio'), msg: 'Elige qué necesitas para armar tu presupuesto.' }
        };
        const setError = (key, bad) => {
            const f = fields[key];
            f.err.textContent = bad ? f.msg : '';
            f.el.setAttribute('aria-invalid', bad ? 'true' : 'false');
        };
        Object.keys(fields).forEach((key) => {
            const f = fields[key];
            f.el.addEventListener('input', () => setError(key, !f.el.value.trim()));
            f.el.addEventListener('change', () => setError(key, !f.el.value.trim()));
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = fields.nombre.el.value.trim();
            const service = fields.servicio.el.value;
            setError('nombre', !name);
            setError('servicio', !service);
            if (!name) { fields.nombre.el.focus(); return; }
            if (!service) { fields.servicio.el.focus(); return; }

            const tipo = form.elements.tipo.value === 'negocio' ? 'negocio' : 'hogar';
            const detail = form.elements.mensaje.value.trim();
            let text = `Hola, soy ${name}. Quiero cotizar para mi ${tipo}: ${service}.`;
            if (detail) text += ` Detalles: ${detail}`;
            text += ' Te escribo desde tu página web.';
            window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
        });
    };

    /* En móvil (o sin animaciones) cada imagen del proceso vive dentro de su paso.
       En escritorio con animaciones viven en el escenario fijado. */
    const initProcessLayout = () => {
        const stage = $('.stage');
        const imgs = $$('.stage__img');
        if (!stage || !imgs.length) return;
        const desktop = window.matchMedia('(min-width: 1024px)');
        const anchor = $('.stage__marks', stage);
        const place = () => {
            const useStage = desktop.matches && !staticMode;
            imgs.forEach((img) => {
                if (useStage) {
                    if (img.parentElement !== stage) stage.insertBefore(img, anchor);
                } else {
                    const step = $(`.step[data-step="${img.dataset.step}"]`);
                    if (step && img.parentElement !== step) step.appendChild(img);
                    img.classList.remove('is-active');
                }
            });
            if (useStage) {
                const current = $('.step.is-active');
                const idx = current ? current.dataset.step : '0';
                imgs.forEach((img) => img.classList.toggle('is-active', img.dataset.step === idx));
            }
        };
        place();
        desktop.addEventListener('change', place);
    };

    /* =================================================================
       PRELOADER (spinner de carga "plano a obra")
    ================================================================= */
    const runPreloader = () => new Promise((resolve) => {
        const pre = $('#preloader');
        const done = () => {
            if (pre) pre.style.display = 'none';
            root.classList.remove('is-loading');
            resolve();
        };
        if (!pre) { done(); return; }

        if (staticMode) {
            if (hasGSAP) gsap.to(pre, { opacity: 0, duration: 0.4, onComplete: done });
            else done();
            return;
        }

        const draws = $$('.pre-draw', pre);
        draws.forEach((el) => {
            const len = el.getTotalLength ? el.getTotalLength() : 320;
            el.style.strokeDasharray = len;
            el.style.strokeDashoffset = len;
        });

        const pct = $('.pre-pct b', pre);
        const phase = $('.pre-phase', pre);
        const bar = $('.pre-bar i', pre);
        const phases = [[0, 'Trazando planos'], [30, 'Levantando estructura'], [62, 'Aplicando acabados'], [92, 'Entregando tu espacio']];
        const state = { p: 0 };
        const render = () => {
            const v = Math.round(state.p);
            pct.textContent = v;
            bar.style.transform = `scaleX(${state.p / 100})`;
            for (let i = phases.length - 1; i >= 0; i--) {
                if (v >= phases[i][0]) {
                    if (phase.textContent !== phases[i][1]) phase.textContent = phases[i][1];
                    break;
                }
            }
        };

        const ready = new Promise((res) => {
            if (document.readyState === 'complete') res();
            else window.addEventListener('load', res, { once: true });
            setTimeout(res, 5000);
        });

        const exit = () => {
            gsap.timeline({ onComplete: done })
                .to('.pre-core', { scale: 0.9, opacity: 0, duration: 0.55, ease: 'power2.in' })
                .to(['.pre-seam', '.pre-grid'], { opacity: 0, duration: 0.35 }, '<')
                .to('.pre-curtain--l', { xPercent: -101, duration: 1.1, ease: 'power4.inOut' }, '-=0.1')
                .to('.pre-curtain--r', { xPercent: 101, duration: 1.1, ease: 'power4.inOut' }, '<')
                .add(() => resolveEarly(), '-=0.6');
        };
        // Se libera el hero mientras las cortinas terminan de abrirse
        let released = false;
        const resolveEarly = () => {
            if (released) return;
            released = true;
            root.classList.remove('is-loading');
            resolve();
        };

        gsap.timeline()
            .from('.pre-mark', { scale: 0.85, opacity: 0, duration: 0.8, ease: 'power3.out' }, 0)
            .to(draws, { strokeDashoffset: 0, duration: 1.5, stagger: 0.12, ease: 'power2.inOut' }, 0.1)
            .to('.pre-fill', { opacity: 1, duration: 0.7, ease: 'power2.out' }, 1.4)
            .to(state, { p: 92, duration: 2.1, ease: 'power1.inOut', onUpdate: render }, 0)
            .add(() => {
                ready.then(() => {
                    gsap.to(state, { p: 100, duration: 0.45, ease: 'power2.out', onUpdate: render, onComplete: exit });
                });
            });
    });

    /* =================================================================
       HERO
    ================================================================= */
    const prepareHero = () => {
        gsap.set('.hero__line-in', { yPercent: 118 });
        gsap.set('[data-hero="in"]', { opacity: 0, y: 30 });
        gsap.set('[data-hero="visual"]', { opacity: 0, y: 60, scale: 0.94 });
        const words = $$('.rot__w');
        gsap.set(words.slice(1), { yPercent: 100, opacity: 0 });
    };

    const heroIntro = () => {
        gsap.timeline({ defaults: { ease: 'power4.out' } })
            .to('.hero__line-in', { yPercent: 0, duration: 1.3, stagger: 0.12 }, 0)
            .to('[data-hero="in"]', { opacity: 1, y: 0, duration: 1, stagger: 0.12 }, 0.35)
            .to('[data-hero="visual"]', { opacity: 1, y: 0, scale: 1, duration: 1.5 }, 0.25)
            .add(() => gsap.set('.hero__line-in', { clearProps: 'transform' }), 1.7)
            .add(heroLoops, 1);
    };

    /* Solo la palabra rotativa vive en JS. El barrido plano-obra, las cotas,
       los anillos y la etiqueta de fase son animaciones CSS de compositor. */
    const heroLoops = () => {
        const words = $$('.rot__w');
        if (words.length < 2) return;
        let i = 0;
        const step = () => {
            const cur = words[i];
            i = (i + 1) % words.length;
            const nxt = words[i];
            gsap.timeline({ onComplete: () => gsap.delayedCall(2.2, step) })
                .to(cur, { yPercent: -100, opacity: 0, duration: 0.7, ease: 'power3.inOut' })
                .fromTo(nxt, { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.7, ease: 'power3.inOut' }, '<0.1');
        };
        gsap.delayedCall(2.4, step);
    };

    const initHeroPointer = () => {
        const hero = $('.hero');
        const glow = $('#hero-glow');
        const frame = $('#hero-frame');
        if (!hero || !frame || !finePointer || reduceMotion) return;
        gsap.set(frame, { transformPerspective: 900 });
        const rx = gsap.quickTo(frame, 'rotationX', { duration: 0.9, ease: 'power3' });
        const ry = gsap.quickTo(frame, 'rotationY', { duration: 0.9, ease: 'power3' });
        gsap.set(glow, { x: hero.clientWidth * 0.72, y: hero.clientHeight * 0.3 });
        const gx = gsap.quickTo(glow, 'x', { duration: 0.9, ease: 'power3' });
        const gy = gsap.quickTo(glow, 'y', { duration: 0.9, ease: 'power3' });
        let ticking = false;
        hero.addEventListener('pointermove', (e) => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                const r = hero.getBoundingClientRect();
                const x = e.clientX - r.left;
                const y = e.clientY - r.top;
                gx(x);
                gy(y);
                ry((x / r.width - 0.5) * 8);
                rx(-(y / r.height - 0.5) * 8);
                ticking = false;
            });
        }, { passive: true });
        hero.addEventListener('pointerleave', () => { rx(0); ry(0); });
    };

    /* Red de partículas: nodos que se conectan, como un plano vivo.
       Optimizada: las líneas se agrupan por transparencia (4 trazos por
       fotograma en lugar de cientos), ~35 fps y resolución acotada. */
    const initParticles = () => {
        const canvas = $('#hero-canvas');
        const hero = $('.hero');
        if (!canvas || !hero || reduceMotion) return null;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        const BUCKETS = 4;
        const segs = Array.from({ length: BUCKETS }, () => []);
        const mouseSegs = [];
        let w = 0, h = 0, pts = [], raf = 0, last = 0, running = false, visible = true, dead = false;
        const mouse = { x: -999, y: -999 };

        const build = () => {
            const n = Math.round(Math.min(60, Math.max(22, (w * h) / 22000)));
            pts = Array.from({ length: n }, () => ({
                x: Math.random() * w,
                y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                r: Math.random() * 1.3 + 0.7,
                hot: Math.random() < 0.12
            }));
        };
        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, rect.width > 900 ? 1 : 1.5);
            w = rect.width;
            h = rect.height;
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            build();
        };

        const frame = (t) => {
            raf = requestAnimationFrame(frame);
            const elapsed = t - last;
            if (elapsed < 28) return;
            last = t;
            const dt = Math.min(48, elapsed) / 16.67;
            ctx.clearRect(0, 0, w, h);
            const link = w < 700 ? 100 : 140;
            const link2 = link * link;

            for (const p of pts) {
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                if (p.x < -10) p.x = w + 10; else if (p.x > w + 10) p.x = -10;
                if (p.y < -10) p.y = h + 10; else if (p.y > h + 10) p.y = -10;
                const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
                if (d2 < 19600) {
                    const d = Math.sqrt(d2) || 1;
                    const f = (1 - d / 140) * 0.7 * dt;
                    p.x += (dx / d) * f;
                    p.y += (dy / d) * f;
                }
            }

            for (let b = 0; b < BUCKETS; b++) segs[b].length = 0;
            mouseSegs.length = 0;
            for (let i = 0; i < pts.length; i++) {
                const a = pts[i];
                for (let j = i + 1; j < pts.length; j++) {
                    const q = pts[j];
                    const dx = a.x - q.x, dy = a.y - q.y, d2 = dx * dx + dy * dy;
                    if (d2 < link2) {
                        const k = Math.min(BUCKETS - 1, ((1 - Math.sqrt(d2) / link) * BUCKETS) | 0);
                        segs[k].push(a.x, a.y, q.x, q.y);
                    }
                }
                const mx = a.x - mouse.x, my = a.y - mouse.y;
                if (mx * mx + my * my < 28900) mouseSegs.push(a.x, a.y, mouse.x, mouse.y);
            }

            ctx.lineWidth = 1;
            for (let b = 0; b < BUCKETS; b++) {
                const list = segs[b];
                if (!list.length) continue;
                ctx.strokeStyle = `rgba(79,180,255,${0.1 + (b / (BUCKETS - 1)) * 0.3})`;
                ctx.beginPath();
                for (let i = 0; i < list.length; i += 4) { ctx.moveTo(list[i], list[i + 1]); ctx.lineTo(list[i + 2], list[i + 3]); }
                ctx.stroke();
            }
            if (mouseSegs.length) {
                ctx.strokeStyle = 'rgba(255,93,112,.4)';
                ctx.beginPath();
                for (let i = 0; i < mouseSegs.length; i += 4) { ctx.moveTo(mouseSegs[i], mouseSegs[i + 1]); ctx.lineTo(mouseSegs[i + 2], mouseSegs[i + 3]); }
                ctx.stroke();
            }

            ctx.fillStyle = 'rgba(150,210,255,.8)';
            ctx.beginPath();
            for (const p of pts) if (!p.hot) { ctx.moveTo(p.x + p.r, p.y); ctx.arc(p.x, p.y, p.r, 0, 6.2832); }
            ctx.fill();
            ctx.fillStyle = 'rgba(255,93,112,.9)';
            ctx.beginPath();
            for (const p of pts) if (p.hot) { ctx.moveTo(p.x + p.r * 1.5, p.y); ctx.arc(p.x, p.y, p.r * 1.5, 0, 6.2832); }
            ctx.fill();
        };

        const start = () => { if (running || dead) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); };
        const stop = () => { running = false; cancelAnimationFrame(raf); };
        const sync = () => (visible && !document.hidden ? start() : stop());

        resize();
        let rt;
        window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 200); });
        hero.addEventListener('pointermove', (e) => {
            const r = canvas.getBoundingClientRect();
            mouse.x = e.clientX - r.left;
            mouse.y = e.clientY - r.top;
        }, { passive: true });
        hero.addEventListener('pointerleave', () => { mouse.x = mouse.y = -999; });
        new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }, { threshold: 0 }).observe(hero);
        document.addEventListener('visibilitychange', sync);
        start();

        return { destroy() { dead = true; stop(); canvas.style.display = 'none'; } };
    };

    /* =================================================================
       SCROLL (Lenis + ScrollTrigger)
    ================================================================= */
    const initLenis = () => {
        // En tactil el scroll nativo ya es suave y corre en el compositor: no se intercepta.
        if (reduceMotion || !finePointer || typeof window.Lenis === 'undefined') return null;
        const l = new Lenis({ lerp: 0.12, wheelMultiplier: 1, smoothWheel: true });
        l.on('scroll', ScrollTrigger.update);
        lenisTick = (time) => l.raf(time * 1000);
        gsap.ticker.add(lenisTick);
        gsap.ticker.lagSmoothing(0);
        return l;
    };

    const initNav = () => {
        const nav = $('#nav');
        const bar = $('.scroll-progress i');
        ScrollTrigger.create({
            start: 0,
            end: 'max',
            onUpdate: (self) => {
                const y = self.scroll();
                bar.style.transform = `scaleX(${self.progress})`;
                nav.classList.toggle('is-scrolled', y > 40);
                if (nav.classList.contains('is-open')) return;
                if (self.direction === 1 && y > 500) nav.classList.add('is-hidden');
                else if (self.direction === -1 || y <= 500) nav.classList.remove('is-hidden');
            }
        });

        const links = $$('.nav__links a');
        links.forEach((link) => {
            const section = $(link.getAttribute('href'));
            if (!section) return;
            ScrollTrigger.create({
                trigger: section,
                start: 'top 55%',
                end: 'bottom 55%',
                onToggle: (self) => {
                    if (self.isActive) {
                        links.forEach((l) => l.removeAttribute('aria-current'));
                        link.setAttribute('aria-current', 'true');
                    } else {
                        link.removeAttribute('aria-current');
                    }
                }
            });
        });
    };

    // Parallax del hero solo en escritorio: en móvil el scroll nativo queda limpio.
    const initHeroScroll = () => {
        gsap.matchMedia().add('(min-width: 1024px)', () => {
            const trigger = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true };
            gsap.to('.hero__copy', { yPercent: -14, opacity: 0.1, ease: 'none', scrollTrigger: trigger });
            gsap.to('.hero__visual', { yPercent: -10, ease: 'none', scrollTrigger: trigger });
        });
    };

    const initMarquee = () => {
        const strip = $('.strip');
        const track = $('.strip__track');
        if (!strip || !track) return;
        const tween = gsap.to(track, { xPercent: -50, ease: 'none', duration: 30, repeat: -1, paused: true });
        let dir = 1, boost = 0, cur = 1, ticking = false;
        const tick = () => {
            boost *= 0.92;
            cur += (dir * (1 + boost) - cur) * 0.1;
            tween.timeScale(cur);
        };
        // Solo corre mientras la franja está en pantalla
        ScrollTrigger.create({
            trigger: strip,
            start: 'top bottom',
            end: 'bottom top',
            onToggle: (self) => {
                if (self.isActive && !ticking) { ticking = true; tween.play(); gsap.ticker.add(tick); }
                else if (!self.isActive && ticking) { ticking = false; tween.pause(); gsap.ticker.remove(tick); }
            },
            onUpdate: (self) => {
                dir = self.direction || dir;
                boost = Math.min(Math.abs(self.getVelocity()) / 350, 7);
            }
        });
    };

    const initReveals = () => {
        // Titulares palabra por palabra
        $$('[data-split]').forEach((el) => {
            const words = splitWords(el);
            gsap.set(words, { yPercent: 118 });
            ScrollTrigger.create({
                trigger: el,
                start: 'top 86%',
                once: true,
                onEnter: () => gsap.to(words, { yPercent: 0, duration: 1.2, ease: 'power4.out', stagger: 0.04, onComplete: () => gsap.set(words, { clearProps: 'transform' }) })
            });
        });

        // Elementos sueltos
        const items = $$('[data-reveal]');
        gsap.set(items, { opacity: 0, y: 40 });
        ScrollTrigger.batch(items, {
            start: 'top 90%',
            once: true,
            onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', stagger: 0.12, overwrite: true })
        });

        // Listas con cascada
        $$('[data-stagger]').forEach((list) => {
            const kids = Array.from(list.children);
            gsap.set(kids, { opacity: 0, y: 34 });
            ScrollTrigger.create({
                trigger: list,
                start: 'top 86%',
                once: true,
                onEnter: () => gsap.to(kids, { opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.1 })
            });
        });
    };

    const initCounters = () => {
        $$('.count').forEach((el) => {
            const to = Number(el.dataset.to) || 0;
            const obj = { v: 0 };
            el.textContent = '0';
            ScrollTrigger.create({
                trigger: el,
                start: 'top 88%',
                once: true,
                onEnter: () => gsap.to(obj, {
                    v: to,
                    duration: 2.2,
                    ease: 'power2.out',
                    onUpdate: () => { el.textContent = Math.round(obj.v); }
                })
            });
        });
    };

    const initTiles = () => {
        const tiles = $$('.tile');
        gsap.set(tiles, { opacity: 0, y: 60 });
        ScrollTrigger.batch(tiles, {
            start: 'top 92%',
            once: true,
            onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out', stagger: 0.12, overwrite: true })
        });

        if (!finePointer) return;
        tiles.forEach((tile) => {
            gsap.set(tile, { transformPerspective: 900 });
            const rx = gsap.quickTo(tile, 'rotationX', { duration: 0.6, ease: 'power3' });
            const ry = gsap.quickTo(tile, 'rotationY', { duration: 0.6, ease: 'power3' });
            tile.addEventListener('pointermove', (e) => {
                const r = tile.getBoundingClientRect();
                const x = e.clientX - r.left;
                const y = e.clientY - r.top;
                tile.style.setProperty('--mx', x + 'px');
                tile.style.setProperty('--my', y + 'px');
                ry((x / r.width - 0.5) * 6);
                rx(-(y / r.height - 0.5) * 6);
            });
            tile.addEventListener('pointerleave', () => { rx(0); ry(0); });
        });
    };

    const initMagnetic = () => {
        if (!finePointer) return;
        $$('.magnetic').forEach((el) => {
            const xTo = gsap.quickTo(el, 'x', { duration: 0.7, ease: 'elastic.out(1, 0.5)' });
            const yTo = gsap.quickTo(el, 'y', { duration: 0.7, ease: 'elastic.out(1, 0.5)' });
            el.addEventListener('pointermove', (e) => {
                const r = el.getBoundingClientRect();
                xTo((e.clientX - (r.left + r.width / 2)) * 0.28);
                yTo((e.clientY - (r.top + r.height / 2)) * 0.4);
            });
            el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
        });
    };

    /* Secciones con layout distinto según pantalla */
    const initResponsiveSections = () => {
        const mm = gsap.matchMedia();

        // PROCESO: escenario fijado en escritorio
        mm.add('(min-width: 1024px)', () => {
            const pin = $('.process__pin');
            const steps = $$('.step');
            const imgs = $$('.stage .stage__img');
            const rail = $('.process__rail i');
            const tag = $('#stage-tag');
            const labels = ['Tu idea', 'Plano y render', 'Propuesta', 'Obra entregada'];
            let cur = -1;
            const setStep = (i) => {
                if (i === cur) return;
                cur = i;
                steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
                imgs.forEach((im, k) => im.classList.toggle('is-active', k === i));
                tag.textContent = labels[i];
            };
            setStep(0);
            ScrollTrigger.create({
                trigger: pin,
                start: 'top top',
                end: '+=300%',
                pin: true,
                anticipatePin: 1,
                onUpdate: (self) => {
                    setStep(Math.min(steps.length - 1, Math.floor(self.progress * steps.length)));
                    rail.style.transform = `scaleX(${self.progress})`;
                }
            });
            gsap.from('.stage', { opacity: 0, y: 70, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: '.process', start: 'top 70%', once: true } });
        });

        // PROCESO: pasos apilados en móvil y tablet
        mm.add('(max-width: 1023px)', () => {
            const steps = $$('.step');
            gsap.set(steps, { opacity: 0, y: 40 });
            ScrollTrigger.batch(steps, {
                start: 'top 88%',
                once: true,
                onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.12, overwrite: true })
            });
        });

        // OBRAS: galería que se desplaza en horizontal con el scroll
        mm.add('(min-width: 1024px)', () => {
            const pin = $('.work__pin');
            const track = $('.work__track');
            const viewport = $('.work__viewport');
            if (!pin || !track) return;
            $$('.work__media img, .stage__img img').forEach((img) => { img.loading = 'eager'; });

            const padLeft = () => parseFloat(getComputedStyle(viewport).paddingLeft) || 0;
            const dist = () => Math.max(0, track.scrollWidth + padLeft() - window.innerWidth);

            gsap.to(track, {
                x: () => -dist(),
                ease: 'none',
                scrollTrigger: {
                    trigger: pin,
                    start: 'top top',
                    end: () => '+=' + dist(),
                    pin: true,
                    scrub: true,
                    anticipatePin: 1,
                    invalidateOnRefresh: true
                }
            });
        });
    };

    const initCompareDemo = () => {
        const panels = $('.ba__panels');
        if (!panels) return;
        ScrollTrigger.create({
            trigger: panels,
            start: 'top 70%',
            once: true,
            onEnter: () => {
                const box = $('.ba__panel.is-active .compare');
                const range = $('.compare__range', box);
                const o = { v: 50 };
                const apply = () => { box.style.setProperty('--pos', o.v + '%'); range.value = o.v; };
                const tl = gsap.timeline({ delay: 0.5 })
                    .to(o, { v: 16, duration: 1.1, ease: 'power2.inOut', onUpdate: apply })
                    .to(o, { v: 84, duration: 1.7, ease: 'power2.inOut', onUpdate: apply })
                    .to(o, { v: 50, duration: 1, ease: 'power2.inOut', onUpdate: apply });
                box.addEventListener('pointerdown', () => tl.kill(), { once: true });
            }
        });
    };

    const initUsp = () => {
        const title = $('[data-scrub]');
        if (title) {
            const words = splitWords(title);
            gsap.set(words, { opacity: 0.14 });
            gsap.to(words, {
                opacity: 1,
                ease: 'none',
                stagger: 0.08,
                scrollTrigger: { trigger: title, start: 'top 80%', end: 'bottom 50%', scrub: true }
            });
        }
        gsap.fromTo('.usp__bg', { yPercent: -8 }, {
            yPercent: 8,
            ease: 'none',
            scrollTrigger: { trigger: '.usp', start: 'top bottom', end: 'bottom top', scrub: true }
        });
    };

    const initParallaxMisc = () => {
        gsap.fromTo('.footer__big', { yPercent: 28, opacity: 0.3 }, {
            yPercent: 0,
            opacity: 1,
            ease: 'none',
            scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: true }
        });
    };

    const initFab = () => {
        const fab = $('.fab');
        if (!fab) return;
        if (!reduceMotion) gsap.from(fab, { scale: 0, duration: 0.9, ease: 'back.out(1.8)', delay: 0.8 });
        setTimeout(() => {
            fab.classList.add('is-tip');
            setTimeout(() => fab.classList.remove('is-tip'), 4500);
        }, 6500);
    };

    /* Las animaciones CSS infinitas se pausan cuando su zona sale de pantalla */
    const initOffscreenPause = () => {
        const els = $$('[data-offscreen-pause]');
        if (!els.length || !('IntersectionObserver' in window)) return;
        const io = new IntersectionObserver((entries) => {
            entries.forEach((e) => e.target.classList.toggle('is-off', !e.isIntersecting));
        }, { rootMargin: '80px' });
        els.forEach((el) => io.observe(el));
    };

    /* Si el equipo no sostiene ~40 fps con el hero activo, se pasa a modo ligero:
       sin partículas, auroras ni blur. La página sigue viéndose y funcionando igual. */
    const goLite = () => {
        if (root.classList.contains('lite')) return;
        root.classList.add('lite');
        if (particles) { particles.destroy(); particles = null; }
        if (lenis) {
            if (lenisTick) gsap.ticker.remove(lenisTick);
            lenis.destroy();
            lenis = null;
        }
        if (hasGSAP) ScrollTrigger.refresh();
    };
    const initAutoLite = () => {
        const nav = navigator;
        if ((nav.connection && nav.connection.saveData) || (nav.deviceMemory && nav.deviceMemory <= 2)) { goLite(); return; }
        const samples = [];
        let last = performance.now();
        let skip = 20;
        const loop = (t) => {
            const d = t - last;
            last = t;
            if (document.hidden) { skip = 20; samples.length = 0; requestAnimationFrame(loop); return; }
            if (skip-- > 0) { requestAnimationFrame(loop); return; }
            samples.push(d);
            if (samples.length < 90) { requestAnimationFrame(loop); return; }
            samples.sort((a, b) => a - b);
            if (samples[45] > 26) goLite();
        };
        requestAnimationFrame(loop);
    };

    /* =================================================================
       ARRANQUE
    ================================================================= */
    const initScrollAnimations = () => {
        initNav();
        initHeroScroll();
        initMarquee();
        initReveals();
        initCounters();
        initTiles();
        initMagnetic();
        initResponsiveSections();
        initCompareDemo();
        initUsp();
        initParallaxMisc();
    };

    const boot = () => {
        initAnchors();
        initMenu();
        initFaq();
        initCompare();
        initVideos();
        initForm();
        initProcessLayout();
        initOffscreenPause();

        if (!hasGSAP) {
            // Sin librerías de animación: se muestra todo sin efectos
            const pre = $('#preloader');
            if (pre) pre.style.display = 'none';
            root.classList.remove('is-loading');
            return;
        }

        gsap.registerPlugin(ScrollTrigger);
        ScrollTrigger.config({ ignoreMobileResize: true });

        if (reduceMotion) {
            // Versión estática accesible: sin pines, sin parallax
            runPreloader().then(() => {
                initNav();
                initFab();
            });
            return;
        }

        lenis = initLenis();
        if (lenis) lenis.stop();
        prepareHero();
        particles = initParticles();
        initHeroPointer();

        // Seguro: si algo tarda demasiado, se libera la página
        const failsafe = setTimeout(() => {
            const pre = $('#preloader');
            if (pre) pre.style.display = 'none';
            root.classList.remove('is-loading');
            if (lenis) lenis.start();
        }, 9000);

        runPreloader().then(() => {
            clearTimeout(failsafe);
            if (lenis) lenis.start();
            heroIntro();
            initScrollAnimations();
            initFab();
            ScrollTrigger.refresh();
            setTimeout(initAutoLite, 2500);
        });

        window.addEventListener('load', () => ScrollTrigger.refresh());
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
    };

    boot();
})();
