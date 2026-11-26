/* ARC AI: sitenin yapay zekâ destek asistanı. Sağ alttaki balon + sohbet penceresi; cevaplar Supabase edge function
   `arc-ai`dan (Claude API) gelir, API anahtarı yalnız sunucuda. ARC Key Generator ile hiçbir bağı yoktur.
   Sohbet geçmişi yalnız bu tarayıcıda (localStorage) tutulur. */
(() => {
  'use strict';
  if (window.__arcAi) return;
  window.__arcAi = true;

  const ADRES = 'https://vzibpccxwknhakzgmxfy.supabase.co/functions/v1/arc-ai';
  const DISCORD = 'https://discord.gg/n9tyDcqwbA';
  const KAYIT = 'arcai_gecmis_v1';
  const ACIK = 'arcai_acik_v1';
  const SINIR = 1200;            // sunucudaki kullanıcı mesajı sınırıyla aynı
  const GONDERILEN = 12;         // sunucuya giden son mesaj sayısı
  const SAKLANAN = 60;
  const KARSILAMA = 'Merhaba! 👋 Ben **ARC AI**. ARC, ürünlerimiz, lisans, kurulum ve Discord topluluğu hakkında sorularını yanıtlayabilirim.\n\nAşağıdaki konulardan birini seçebilir ya da sorunu yazabilirsin.';
  const HIZLI = [
    ['urun', 'Ürünler Hakkında', 'ARC\'ta hangi ürünler var, ne işe yarıyorlar?'],
    ['lisans', 'Lisans ve Satın Alma', 'Lisans nasıl satın alınır, anahtarım nasıl gelir?'],
    ['kurulum', 'Kurulum Rehberi', 'ARC\'ı adım adım nasıl indirip kurarım?'],
    ['sss', 'Sık Sorulan Sorular', 'En sık sorulan soruları ve cevaplarını özetler misin?'],
    ['discord', 'Discord\'a Katılma', 'Discord sunucusuna nasıl katılırım, orada neler var?'],
    ['diger', 'Diğer Konular', null],
  ];

  const SVG = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;
  const IKON = {
    urun: SVG('<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>'),
    lisans: SVG('<circle cx="8" cy="15" r="4"/><path d="m10.8 12.2 7.7-7.7M16 7l2 2M14 9l2 2"/>'),
    kurulum: SVG('<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>'),
    sss: SVG('<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5h.01"/>'),
    discord: SVG('<path d="M8.5 7.5c2.3-.7 4.7-.7 7 0M7.5 16.5c2.9 1 6.1 1 9 0"/><path d="M15.5 7.5 17 5c1.8.7 3.2 1.8 4 3 1 3.4.8 6.7-.6 9.8-1.3 1-2.7 1.6-4.2 2l-1.2-2.3M8.5 7.5 7 5c-1.8.7-3.2 1.8-4 3-1 3.4-.8 6.7.6 9.8 1.3 1 2.7 1.6 4.2 2l1.2-2.3"/><circle cx="9.5" cy="12.5" r="1"/><circle cx="14.5" cy="12.5" r="1"/>'),
    diger: SVG('<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>'),
    gonder: SVG('<path d="M5 12h13M13 6l6 6-6 6"/>'),
    kapat: SVG('<path d="M6 6l12 12M18 6 6 18"/>'),
    yeni: SVG('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>'),
    kopya: SVG('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>'),
    tamam: SVG('<path d="M5 12l5 5 9-10"/>'),
    sohbet: SVG('<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M8.5 11h.01M12 11h.01M15.5 11h.01"/>'),
  };

  const css = `
  .arcai-k, .arcai-k * { box-sizing: border-box; }
  .arcai-k { --a-bg: rgba(13,10,24,.86); --a-cam: rgba(255,255,255,.045); --a-cizgi: rgba(196,168,255,.16); --a-mor: #8b5cf6; --a-lila: #c4a8ff;
    --a-yazi: #ece8f6; --a-sonuk: #9a92b3; --a-ok: #22c55e; font-family: "Onest", "Segoe UI", system-ui, sans-serif; color: var(--a-yazi); }
  .arcai-balon { position: fixed; z-index: 45; right: max(22px, env(safe-area-inset-right, 0px)); bottom: calc(22px + env(safe-area-inset-bottom, 0px) + var(--arcai-ust, 0px));
    width: 62px; height: 62px; border-radius: 50%; border: 1px solid rgba(196,168,255,.45); cursor: pointer; display: grid; place-items: center; padding: 0;
    background: radial-gradient(circle at 30% 25%, #a78bfa, #7c3aed 55%, #4c1d95); color: #fff;
    box-shadow: 0 14px 40px rgba(124,58,237,.55), 0 0 0 6px rgba(139,92,246,.12), inset 0 1px 0 rgba(255,255,255,.3);
    transition: transform .35s cubic-bezier(.34,1.56,.64,1), box-shadow .3s, bottom .3s; }
  .arcai-balon:hover { transform: translateY(-3px) scale(1.05); box-shadow: 0 18px 50px rgba(124,58,237,.7), 0 0 0 8px rgba(139,92,246,.16), inset 0 1px 0 rgba(255,255,255,.3); }
  .arcai-balon:focus-visible { outline: 2px solid var(--a-lila); outline-offset: 4px; }
  .arcai-balon svg { width: 28px; height: 28px; }
  .arcai-balon .arcai-nokta { position: absolute; right: 4px; top: 4px; width: 13px; height: 13px; border-radius: 50%; background: var(--a-ok); border: 2px solid #1a1030; }
  .arcai-balon .arcai-nokta::after { content: ""; position: absolute; inset: -2px; border-radius: 50%; border: 2px solid var(--a-ok); animation: arcaiNabiz 2s ease-out infinite; }
  .arcai-balon.acik { transform: scale(.85); opacity: 0; pointer-events: none; }
  .arcai-ipucu { position: fixed; z-index: 45; right: calc(max(22px, env(safe-area-inset-right, 0px)) + 74px); bottom: calc(34px + env(safe-area-inset-bottom, 0px) + var(--arcai-ust, 0px));
    padding: 9px 14px; border-radius: 14px 14px 4px 14px; background: var(--a-bg); border: 1px solid var(--a-cizgi); backdrop-filter: blur(16px); font-size: 13.5px; font-weight: 600;
    box-shadow: 0 10px 30px rgba(0,0,0,.4); white-space: nowrap; animation: arcaiGel .5s .8s both; pointer-events: none; transition: bottom .3s; }

  .arcai-pencere { position: fixed; z-index: 45; right: max(22px, env(safe-area-inset-right, 0px)); bottom: calc(22px + env(safe-area-inset-bottom, 0px));
    width: 400px; height: min(640px, calc(100dvh - 44px)); display: flex; flex-direction: column; border-radius: 24px; overflow: hidden;
    background: linear-gradient(180deg, rgba(24,18,44,.9), var(--a-bg)); border: 1px solid var(--a-cizgi); backdrop-filter: blur(22px) saturate(1.3); -webkit-backdrop-filter: blur(22px) saturate(1.3);
    box-shadow: 0 30px 80px rgba(0,0,0,.6), 0 0 60px rgba(124,58,237,.22), inset 0 1px 0 rgba(255,255,255,.06);
    transform-origin: bottom right; animation: arcaiAc .38s cubic-bezier(.34,1.3,.64,1); }
  .arcai-pencere[hidden] { display: none; }
  .arcai-pencere::before { content: ""; position: absolute; inset: -120px auto auto -60px; width: 260px; height: 220px; background: radial-gradient(closest-side, rgba(139,92,246,.35), transparent); pointer-events: none; }
  .arcai-bas { position: relative; display: flex; align-items: center; gap: 12px; padding: 16px 14px 14px 16px; border-bottom: 1px solid var(--a-cizgi); }
  .arcai-logo { position: relative; flex: none; width: 46px; height: 46px; border-radius: 14px; display: grid; place-items: center;
    background: linear-gradient(145deg, rgba(139,92,246,.35), rgba(76,29,149,.35)); border: 1px solid rgba(196,168,255,.35); box-shadow: 0 0 22px rgba(139,92,246,.35); }
  .arcai-logo img { width: 32px; height: 32px; filter: drop-shadow(0 0 8px rgba(196,168,255,.6)); }
  .arcai-logo i { position: absolute; right: -3px; bottom: -3px; width: 13px; height: 13px; border-radius: 50%; background: var(--a-ok); border: 2.5px solid #140f24; }
  .arcai-ad { flex: 1; min-width: 0; }
  .arcai-ad b { display: flex; align-items: center; gap: 8px; font: 700 17px/1.1 "Unbounded", "Segoe UI", sans-serif; letter-spacing: .01em; }
  .arcai-ad b span { font: 700 10.5px/1 "Onest", sans-serif; letter-spacing: .04em; padding: 4px 8px; border-radius: 99px; color: #fff; background: linear-gradient(90deg, #8b5cf6, #a855f7); box-shadow: 0 0 12px rgba(139,92,246,.6); }
  .arcai-ad small { display: block; margin-top: 5px; font-size: 12.5px; color: var(--a-sonuk); }
  .arcai-ikon { flex: none; width: 36px; height: 36px; border-radius: 11px; border: 0; background: transparent; color: var(--a-sonuk); display: grid; place-items: center; cursor: pointer; transition: background .2s, color .2s; }
  .arcai-ikon:hover { background: rgba(255,255,255,.07); color: var(--a-yazi); }
  .arcai-ikon:focus-visible { outline: 2px solid var(--a-lila); outline-offset: 1px; }
  .arcai-ikon svg { width: 19px; height: 19px; }

  .arcai-akis { position: relative; flex: 1; overflow-y: auto; overscroll-behavior: contain; padding: 18px 14px 8px; display: flex; flex-direction: column; gap: 14px; scrollbar-width: thin; scrollbar-color: rgba(196,168,255,.25) transparent; }
  .arcai-m { display: flex; gap: 10px; align-items: flex-end; animation: arcaiGel .32s ease both; }
  .arcai-m.ben { flex-direction: row-reverse; }
  .arcai-av { flex: none; width: 34px; height: 34px; border-radius: 11px; display: grid; place-items: center; background: rgba(139,92,246,.18); border: 1px solid rgba(196,168,255,.25); }
  .arcai-av img { width: 22px; height: 22px; }
  .arcai-m.ben .arcai-av { border-radius: 50%; background: rgba(139,92,246,.3); color: var(--a-lila); }
  .arcai-m.ben .arcai-av svg { width: 18px; height: 18px; }
  .arcai-kutu { position: relative; max-width: 80%; padding: 11px 14px 8px; border-radius: 18px 18px 18px 6px; background: var(--a-cam); border: 1px solid var(--a-cizgi); font-size: 14.5px; line-height: 1.55; overflow-wrap: anywhere; }
  .arcai-m.ben .arcai-kutu { border-radius: 18px 18px 6px 18px; background: linear-gradient(135deg, #7c3aed, #9333ea); border-color: rgba(216,180,254,.4); box-shadow: 0 8px 24px rgba(124,58,237,.35); color: #fff; }
  .arcai-kutu p { margin: 0 0 8px; } .arcai-kutu p:last-of-type { margin-bottom: 0; }
  .arcai-kutu ol, .arcai-kutu ul { margin: 4px 0 8px; padding-left: 20px; } .arcai-kutu li { margin: 3px 0; }
  .arcai-kutu a { color: var(--a-lila); font-weight: 600; text-decoration: underline; text-underline-offset: 3px; }
  .arcai-m.ben .arcai-kutu a { color: #fff; }
  .arcai-kutu strong { color: #fff; }
  .arcai-alt { display: flex; align-items: center; justify-content: flex-end; gap: 6px; margin-top: 4px; font-size: 11px; color: var(--a-sonuk); }
  .arcai-m.ben .arcai-alt { color: rgba(255,255,255,.75); }
  .arcai-alt svg { width: 13px; height: 13px; }
  .arcai-kopya { border: 0; background: transparent; color: inherit; padding: 2px; border-radius: 6px; cursor: pointer; display: inline-grid; opacity: .75; }
  .arcai-kopya:hover, .arcai-kopya:focus-visible { opacity: 1; color: var(--a-lila); outline: none; }
  .arcai-yaziyor { display: inline-flex; gap: 5px; padding: 6px 2px; }
  .arcai-yaziyor i { width: 7px; height: 7px; border-radius: 50%; background: var(--a-lila); animation: arcaiZipla 1.2s ease-in-out infinite; }
  .arcai-yaziyor i:nth-child(2) { animation-delay: .15s; } .arcai-yaziyor i:nth-child(3) { animation-delay: .3s; }

  .arcai-hizli { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding-left: 44px; animation: arcaiGel .4s .1s both; }
  .arcai-hizli button { display: flex; align-items: center; gap: 9px; min-height: 44px; padding: 9px 12px; border-radius: 14px; cursor: pointer; text-align: left;
    color: var(--a-yazi); font-weight: 600; font-size: 13px; line-height: 1.25; font-family: inherit; background: rgba(139,92,246,.08); border: 1px solid var(--a-cizgi); transition: background .2s, border-color .2s, transform .2s; }
  .arcai-hizli button:hover { background: rgba(139,92,246,.2); border-color: rgba(196,168,255,.45); transform: translateY(-1px); }
  .arcai-hizli button:focus-visible { outline: 2px solid var(--a-lila); outline-offset: 1px; }
  .arcai-hizli svg { flex: none; width: 18px; height: 18px; color: var(--a-lila); }

  .arcai-dc { display: flex; align-items: center; justify-content: center; gap: 9px; margin: 6px 14px 0; min-height: 42px; border-radius: 14px; text-decoration: none;
    color: #e9ddff; font: 700 13.5px "Onest", sans-serif; background: rgba(88,101,242,.12); border: 1px solid rgba(139,92,246,.45); transition: background .2s, box-shadow .2s; }
  .arcai-dc:hover { background: rgba(139,92,246,.25); box-shadow: 0 0 20px rgba(139,92,246,.35); }
  .arcai-dc.vurgu { background: linear-gradient(90deg, rgba(124,58,237,.55), rgba(88,101,242,.5)); color: #fff; box-shadow: 0 0 24px rgba(139,92,246,.45); animation: arcaiGel .4s both; }
  .arcai-dc svg { width: 19px; height: 19px; }
  .arcai-giris { display: flex; align-items: flex-end; gap: 10px; padding: 12px 14px calc(14px + env(safe-area-inset-bottom, 0px)); }
  .arcai-giris label { flex: 1; position: relative; display: block; }
  .arcai-giris textarea { display: block; width: 100%; min-height: 46px; max-height: 120px; resize: none; overflow-y: hidden; scrollbar-width: thin; padding: 12px 15px; border-radius: 16px; outline: none;
    color: var(--a-yazi); font-size: 15px; line-height: 1.45; font-family: inherit; background: rgba(255,255,255,.05); border: 1px solid var(--a-cizgi); transition: border-color .2s, box-shadow .2s; }
  .arcai-giris textarea::placeholder { color: var(--a-sonuk); }
  .arcai-giris textarea:focus { border-color: rgba(196,168,255,.6); box-shadow: 0 0 0 3px rgba(139,92,246,.2); }
  .arcai-sayac { position: absolute; right: 12px; bottom: -16px; font-size: 10.5px; color: var(--a-sonuk); }
  .arcai-sayac.asti { color: #f87171; }
  .arcai-gonder { flex: none; width: 46px; height: 46px; border-radius: 15px; border: 0; cursor: pointer; display: grid; place-items: center; color: #fff;
    background: linear-gradient(135deg, #8b5cf6, #7c3aed); box-shadow: 0 8px 22px rgba(124,58,237,.5); transition: transform .2s, opacity .2s; }
  .arcai-gonder:hover:not(:disabled) { transform: translateY(-1px) scale(1.04); }
  .arcai-gonder:disabled { opacity: .45; cursor: default; box-shadow: none; }
  .arcai-gonder:focus-visible { outline: 2px solid var(--a-lila); outline-offset: 2px; }
  .arcai-gonder svg { width: 21px; height: 21px; }
  .arcai-not { padding: 0 16px 10px; margin-top: -4px; font-size: 10.5px; color: var(--a-sonuk); text-align: center; }

  @keyframes arcaiAc { from { opacity: 0; transform: translateY(16px) scale(.92); } }
  @keyframes arcaiGel { from { opacity: 0; transform: translateY(8px); } }
  @keyframes arcaiZipla { 0%, 60%, 100% { transform: translateY(0); opacity: .45; } 30% { transform: translateY(-5px); opacity: 1; } }
  @keyframes arcaiNabiz { from { transform: scale(1); opacity: .8; } to { transform: scale(2.2); opacity: 0; } }
  @media (max-width: 520px) {
    .arcai-pencere { inset: 0; width: auto; height: auto; border-radius: 0; border: 0; background: #0d0a18; animation-name: arcaiGel; }
    .arcai-balon { right: 16px; bottom: calc(16px + env(safe-area-inset-bottom, 0px) + var(--arcai-ust, 0px)); width: 56px; height: 56px; }
    .arcai-ipucu { display: none; }
    .arcai-hizli { padding-left: 0; }
    .arcai-kutu { max-width: 86%; }
  }
  @media (prefers-reduced-motion: reduce) { .arcai-k *, .arcai-k *::before, .arcai-k *::after { animation: none !important; transition: none !important; } }`;

  // ---------- yardımcılar ----------
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const saat = (t) => new Date(t).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const oku = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
  const yaz = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* özel pencere: geçmiş tutulmaz */ } };
  const BOLUM = { ucretsiz: 'Ücretsiz uygulamalar', lisans: 'Lisans', urunler: 'Ürünler', indir: 'İndir', ets2: 'ETS2 Auto Drive', arcplay: 'ARC Play', fishing: 'Rina Auto Fishing',
    macro: 'ARC Macro', drive: 'ARC Drive', phone: 'ARC Phone', studio: 'ARC Studio', soundpad: 'Universal Soundpad', yenilikler: 'Yenilikler', sss: 'Sıkça sorulanlar' };
  const GUVENLI_HOST = /^(?:www\.)?(?:arcappss\.com\.tr|discord\.gg|discord\.com)$/i;

  // Güvenli bağlantı: yalnız ARC sitesi ve Discord tıklanabilir, diğerleri düz metin kalır
  function baglanti(url) {
    const temiz = url.replace(/[.,;:!?)]+$/, '');
    const kalan = url.slice(temiz.length);
    let u;
    try { u = new URL(temiz); } catch { return esc(url); }
    if (u.protocol !== 'https:' || !GUVENLI_HOST.test(u.hostname)) return esc(url);
    const ic = /arcappss\.com\.tr$/i.test(u.hostname);
    const yazi = ic ? (BOLUM[u.hash.slice(1)] ? BOLUM[u.hash.slice(1)] : u.pathname === '/gizlilik.html' ? 'Gizlilik' : 'arcappss.com.tr') : 'Discord sunucusu';
    return `<a href="${esc(u.href)}"${ic ? ' data-ic="1"' : ' target="_blank" rel="noopener noreferrer"'}>${esc(yazi)}</a>${esc(kalan)}`;
  }
  function satirIci(t) {
    // önce kaçır, sonra kalın; bağlantılar ham metinden bulunur ki kaçırma URL'yi bozmasın
    return t.split(/(https:\/\/[^\s<>"']+)/g).map((p, i) => (i % 2 ? baglanti(p) : esc(p).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'))).join('');
  }
  function bicimle(metin) {
    const satirlar = String(metin).replace(/\r/g, '').split('\n');
    let html = '', liste = null, paragraf = [];
    const pKapat = () => { if (paragraf.length) { html += '<p>' + paragraf.map(satirIci).join('<br>') + '</p>'; paragraf = []; } };
    const lKapat = () => { if (liste) { html += `</${liste}>`; liste = null; } };
    for (const s of satirlar) {
      const num = /^\s*\d+[.)]\s+(.*)$/.exec(s), mad = /^\s*[-•*]\s+(.*)$/.exec(s);
      if (num || mad) {
        pKapat();
        const tur = num ? 'ol' : 'ul';
        if (liste !== tur) { lKapat(); html += `<${tur}>`; liste = tur; }
        html += '<li>' + satirIci((num || mad)[1]) + '</li>';
      } else if (!s.trim()) { pKapat(); lKapat(); }
      else { lKapat(); paragraf.push(s.trim()); }
    }
    pKapat(); lKapat();
    return html;
  }

  // ---------- durum ----------
  let gecmis = [];
  try { const g = JSON.parse(oku(KAYIT) || '[]'); if (Array.isArray(g)) gecmis = g.filter((m) => m && (m.rol === 'kullanici' || m.rol === 'asistan') && typeof m.metin === 'string').slice(-SAKLANAN); } catch { gecmis = []; }
  let bekliyor = false;
  const kaydet = () => yaz(KAYIT, JSON.stringify(gecmis.slice(-SAKLANAN)));

  // ---------- DOM ----------
  const stil = document.createElement('style'); stil.textContent = css; document.head.appendChild(stil);
  const kok = document.createElement('div'); kok.className = 'arcai-k';
  kok.innerHTML = `
    <button class="arcai-balon" type="button" aria-label="ARC AI destek asistanını aç" aria-haspopup="dialog" aria-expanded="false">${IKON.sohbet}<span class="arcai-nokta"></span></button>
    <div class="arcai-ipucu" hidden>Sorun mu var? ARC AI'ye sor 💬</div>
    <div class="arcai-pencere" role="dialog" aria-label="ARC AI destek asistanı" hidden>
      <div class="arcai-bas">
        <div class="arcai-logo"><img src="arc.png" alt=""><i title="Çevrimiçi"></i></div>
        <div class="arcai-ad"><b>ARC AI <span>Beta</span></b><small>Akıllı Destek Asistanı</small></div>
        <button class="arcai-ikon" type="button" data-is="yeni" title="Yeni sohbet" aria-label="Yeni sohbet başlat">${IKON.yeni}</button>
        <button class="arcai-ikon" type="button" data-is="kapat" title="Kapat" aria-label="Sohbeti kapat">${IKON.kapat}</button>
      </div>
      <div class="arcai-akis" aria-live="polite" aria-relevant="additions"></div>
      <a class="arcai-dc" href="${DISCORD}" target="_blank" rel="noopener noreferrer">${IKON.discord}Discord'a Yönlendir</a>
      <form class="arcai-giris" novalidate>
        <label><span style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Mesajın</span>
          <textarea rows="1" maxlength="${SINIR}" placeholder="Mesajınızı yazın…" autocomplete="off"></textarea><span class="arcai-sayac" hidden></span></label>
        <button class="arcai-gonder" type="submit" aria-label="Gönder" disabled>${IKON.gonder}</button>
      </form>
      <div class="arcai-not">ARC AI yanılabilir. Kart bilgisi, şifre ya da lisans anahtarı paylaşma.</div>
    </div>`;
  document.body.appendChild(kok);

  const $ = (s) => kok.querySelector(s);
  const balon = $('.arcai-balon'), ipucu = $('.arcai-ipucu'), pencere = $('.arcai-pencere'), akis = $('.arcai-akis');
  const form = $('.arcai-giris'), alan = $('textarea'), gonderBtn = $('.arcai-gonder'), sayac = $('.arcai-sayac'), dcBtn = $('.arcai-dc');

  function mesajEl(m, anim = true) {
    const el = document.createElement('div');
    el.className = 'arcai-m' + (m.rol === 'kullanici' ? ' ben' : '');
    if (!anim) el.style.animation = 'none';
    const av = m.rol === 'kullanici' ? `<div class="arcai-av">${SVG('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>')}</div>` : '<div class="arcai-av"><img src="arc.png" alt=""></div>';
    const alt = m.rol === 'kullanici'
      ? `<span>${esc(saat(m.t))}</span>${IKON.tamam}`
      : `<span>${esc(saat(m.t))}</span><button class="arcai-kopya" type="button" title="Kopyala" aria-label="Mesajı kopyala">${IKON.kopya}</button>`;
    el.innerHTML = `${av}<div class="arcai-kutu">${m.rol === 'kullanici' ? '<p>' + esc(m.metin).replace(/\n/g, '<br>') + '</p>' : bicimle(m.metin)}<div class="arcai-alt">${alt}</div></div>`;
    const k = el.querySelector('.arcai-kopya');
    if (k) k.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(m.metin.replace(/\*\*/g, '')); k.innerHTML = IKON.tamam; setTimeout(() => { k.innerHTML = IKON.kopya; }, 1600); }
      catch { k.title = 'Kopyalanamadı'; }
    });
    return el;
  }
  function hizliEl() {
    const el = document.createElement('div');
    el.className = 'arcai-hizli';
    el.innerHTML = HIZLI.map(([id, ad]) => `<button type="button" data-h="${id}">${IKON[id]}<span>${esc(ad)}</span></button>`).join('');
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-h]'); if (!b) return;
      const h = HIZLI.find((x) => x[0] === b.dataset.h);
      if (!h[2]) { alan.focus(); alan.placeholder = 'Sorunu kendi cümlelerinle yaz…'; return; }
      gonder(h[2]);
    });
    return el;
  }
  function asagi() { akis.scrollTop = akis.scrollHeight; }
  function ciz() {
    akis.innerHTML = '';
    akis.appendChild(mesajEl({ rol: 'asistan', metin: KARSILAMA, t: gecmis[0]?.t || Date.now() }, false));
    akis.appendChild(hizliEl());
    gecmis.forEach((m) => akis.appendChild(mesajEl(m, false)));
    dcBtn.classList.toggle('vurgu', !!gecmis[gecmis.length - 1]?.discord);
    asagi();
  }

  function ac() {
    pencere.hidden = false; balon.classList.add('acik'); balon.setAttribute('aria-expanded', 'true'); ipucu.hidden = true;
    yaz(ACIK, '1'); ciz();
    if (window.matchMedia('(max-width: 520px)').matches) document.documentElement.style.overflow = 'hidden';
    else setTimeout(() => alan.focus(), 60);
  }
  function kapat() {
    pencere.hidden = true; balon.classList.remove('acik'); balon.setAttribute('aria-expanded', 'false');
    document.documentElement.style.overflow = ''; yaz(ACIK, null); balon.focus();
  }

  const HATA = {
    yavas: ['Biraz hızlı gittik. Birkaç saniye sonra yeniden dener misin?', false],
    gunluk: ['Bugünlük mesaj sınırına ulaştın. Discord destek ekibimiz sana hemen yardımcı olabilir.', true],
    dolu: ['ARC AI şu an çok yoğun. Biraz sonra yeniden dene ya da Discord destek ekibimize yaz.', true],
    gecersiz: ['Mesajını işleyemedim. Daha kısa yazıp yeniden dener misin?', false],
    sunucu: ['Şu an cevap veremiyorum. Biraz sonra yeniden dene ya da Discord destek ekibimize yaz.', true],
    ag: ['Bağlantı kurulamadı. İnternet bağlantını kontrol edip yeniden dener misin?', false],
  };

  async function gonder(metin) {
    metin = String(metin || '').trim().slice(0, SINIR);
    if (!metin || bekliyor) return;
    bekliyor = true; gonderBtn.disabled = true;
    const ben = { rol: 'kullanici', metin, t: Date.now() };
    gecmis.push(ben); kaydet();
    akis.appendChild(mesajEl(ben));
    const yaziyor = document.createElement('div');
    yaziyor.className = 'arcai-m';
    yaziyor.innerHTML = '<div class="arcai-av"><img src="arc.png" alt=""></div><div class="arcai-kutu" aria-label="ARC AI yazıyor"><span class="arcai-yaziyor"><i></i><i></i><i></i></span></div>';
    akis.appendChild(yaziyor); asagi();

    let cevap, discord = false;
    try {
      const r = await fetch(ADRES, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mesajlar: gecmis.slice(-GONDERILEN).map(({ rol, metin }) => ({ rol, metin })) }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok && typeof d.cevap === 'string' && d.cevap) { cevap = d.cevap; discord = !!d.discord; }
      else [cevap, discord] = HATA[d.hata] || HATA.sunucu;
      if (!r.ok) gecmis.pop(); // başarısız mesaj geçmişte kalmasın; tekrar yazılabilsin
    } catch {
      [cevap, discord] = HATA.ag; gecmis.pop();
    }
    yaziyor.remove();
    const m = { rol: 'asistan', metin: cevap, t: Date.now(), discord };
    if (gecmis[gecmis.length - 1] === ben) { gecmis.push(m); kaydet(); }
    else { kaydet(); m.gecici = true; }
    akis.appendChild(mesajEl(m));
    dcBtn.classList.toggle('vurgu', discord);
    asagi();
    bekliyor = false; durumGuncelle();
  }

  function durumGuncelle() {
    const n = alan.value.length;
    gonderBtn.disabled = bekliyor || !alan.value.trim();
    sayac.hidden = n < SINIR - 200; sayac.textContent = `${n}/${SINIR}`; sayac.classList.toggle('asti', n >= SINIR);
    alan.style.height = 'auto'; alan.style.height = Math.min(alan.scrollHeight, 120) + 'px'; alan.style.overflowY = alan.scrollHeight > 120 ? 'auto' : 'hidden';
  }

  // ---------- olaylar ----------
  balon.addEventListener('click', ac);
  $('[data-is="kapat"]').addEventListener('click', kapat);
  $('[data-is="yeni"]').addEventListener('click', () => { if (bekliyor) return; gecmis = []; kaydet(); alan.value = ''; durumGuncelle(); ciz(); alan.focus(); });
  form.addEventListener('submit', (e) => { e.preventDefault(); const t = alan.value; alan.value = ''; durumGuncelle(); gonder(t); });
  alan.addEventListener('input', durumGuncelle);
  alan.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit(); } });
  pencere.addEventListener('keydown', (e) => { if (e.key === 'Escape') kapat(); });
  // site içi bağlantı: mobilde pencereyi kapatıp bölüme git
  akis.addEventListener('click', (e) => { const a = e.target.closest('a[data-ic]'); if (a && window.matchMedia('(max-width: 520px)').matches) kapat(); });

  // Sağ alttaki "yeni sürüm" kartı (.yp) açıkken balon onun üstüne çıkar
  let ypBoy = null;
  const ypIzle = () => {
    const yp = document.querySelector('.yp');
    if (yp && !yp.dataset.arcai) { yp.dataset.arcai = '1'; (ypBoy ??= new ResizeObserver(ypIzle)).observe(yp); } // görsel yüklenince boyu değişir
    kok.style.setProperty('--arcai-ust', yp && yp.offsetHeight ? (yp.offsetHeight + 14) + 'px' : '0px');
  };
  new MutationObserver(ypIzle).observe(document.body, { childList: true });
  ypIzle();

  if (oku(ACIK) === '1') ac();
  else if (!oku(KAYIT)) setTimeout(() => { if (pencere.hidden) { ipucu.hidden = false; setTimeout(() => { ipucu.hidden = true; }, 9000); } }, 4000);
})();
