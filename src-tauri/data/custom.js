console.log('%c[build] from PakePlus: https://github.com/Sjj1024/PakePlus', 'color:orangered;font-weight:bolder');
console.log('%c[inject] 启用跳转白名单控制 + 自动跳转数据库 + 屏蔽 Ctrl 快捷键 + 导航菜单 + 密码管理器', 'color:orange;font-weight:bold');

(function () {
  const STORE_KEY = 'pp_password_store';
  const { invoke } = window.__TAURI__.core;
  const ALLOW_HOSTS = ['xx.atomcrea.com', 'odoo.atomcrea.i234.me:13102'];
  const AUTO_DB = 'atom_db';
  let passwordPanelVisible = false;

  // ===== 跳转白名单控制 + window.open 重写 =====
  function isAllowedURL(url) {
    try {
      const u = new URL(url);
      return ALLOW_HOSTS.includes(u.host);
    } catch (err) {
      return false;
    }
  }

  function hookClick(e) {
    if (e.defaultPrevented) return;
    const origin = e.target.closest('a');
    const isBaseTargetBlank = document.querySelector('head base[target="_blank"]');
    if (origin && origin.href) {
      const href = origin.href;
      if (
        origin.target === '_blank' ||
        (isBaseTargetBlank && isBaseTargetBlank.target === '_blank')
      ) {
        e.preventDefault();
        if (isAllowedURL(href)) {
          console.log('[inject] 内部打开:', href);
          location.href = href;
        } else {
          console.log('[inject] 外部跳转默认浏览器:', href);
          invoke('open_url', { url: href });
        }
      }
    }
  }

  window.open = function (url, target, features) {
    if (isAllowedURL(url)) {
      console.log('[inject] window.open 内部跳转:', url);
      location.href = url;
    } else {
      console.log('[inject] window.open 外部跳转默认浏览器:', url);
      invoke('open_url', { url });
    }
  };

  document.addEventListener('click', hookClick, { capture: true });

  // ===== 自动跳转到指定数据库 atom_db =====
  function dbSelector() {
    const isDbPage =
      location.pathname === '/' || location.pathname === '/web/database/selector';
    const dbLinks = [...document.querySelectorAll('a')].filter(a =>
      a.href.includes(`?db=${AUTO_DB}`)
    );

    if (isDbPage && dbLinks.length > 0) {
      console.log('[inject] 自动跳转数据库:', dbLinks[0].href);
      location.href = dbLinks[0].href;
    } else if (
      isDbPage &&
      document.body.innerText.includes('Manage databases') &&
      location.href === 'https://odoo.atomcrea.i234.me:13102/'
    ) {
      location.href = `https://odoo.atomcrea.i234.me:13102/web/login?db=${AUTO_DB}`;
    }
  }

  // ===== 屏蔽 Odoo 中常见 Ctrl 快捷键 =====
  document.addEventListener(
    'keydown',
    function (e) {
      const isCtrlLike = e.key === 'Control' || e.key === 'Meta';
      const isAnnoyingCombo =
        e.ctrlKey && ['h', 'c', 'd', 'm', 's', 'i'].includes(e.key.toLowerCase());

      if (isCtrlLike || isAnnoyingCombo) {
        e.stopPropagation();
        if (!['v', 'x', 'a', 'z', 'y', 'f'].includes(e.key.toLowerCase())) {
          e.preventDefault();
        }
        console.log('[inject] 阻止 Ctrl 快捷键:', e.key);
      }
    },
    true
  );
  // ===== 创建浮动导航栏 =====
  function createNavBar() {
    const style = document.createElement('style');
    style.textContent = `
      .nav-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        transform: scale(0.66);
        transform-origin: center center;
        width: 100%;
        height: 100%;
        line-height: 1;
        text-align: center;
        user-select: none;
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);

    const navWrapper = document.createElement('div');
    navWrapper.style.position = 'fixed';
    navWrapper.style.bottom = '160px';
    navWrapper.style.right = '32px';
    navWrapper.style.zIndex = '9999';
    navWrapper.style.display = 'flex';
    navWrapper.style.flexDirection = 'column';
    navWrapper.style.alignItems = 'center';
    navWrapper.style.gap = '8px';
    navWrapper.style.width = '44px';

    let isExpanded = localStorage.getItem('menu_expanded') === 'true';

    const menuBox = document.createElement('div');
    menuBox.style.display = 'flex';
    menuBox.style.flexDirection = 'column';
    menuBox.style.alignItems = 'center';
    menuBox.style.gap = '8px';
    menuBox.style.transition = 'all 0.3s ease';
    menuBox.style.transform = isExpanded ? 'translateY(0)' : 'translateY(20px)';
    menuBox.style.opacity = isExpanded ? '1' : '0';
    menuBox.style.pointerEvents = isExpanded ? 'auto' : 'none';

    const createButton = (iconChar, onClick) => {
      const btn = document.createElement('button');
      btn.innerHTML = `<span class="nav-icon">${iconChar}</span>`;
      btn.style.width = '44px';
      btn.style.height = '44px';
      btn.style.display = 'flex';
      btn.style.alignItems = 'center';
      btn.style.justifyContent = 'center';
      btn.style.border = 'none';
      btn.style.borderRadius = '10px';
      btn.style.cursor = 'pointer';
      btn.style.fontWeight = 'normal';
      btn.style.fontFamily = 'system-ui, sans-serif';
      btn.style.transition = 'background 0.3s ease';
      btn.style.backdropFilter = 'blur(6px)';
      btn.style.webkitBackdropFilter = 'blur(6px)';
      btn.onclick = onClick;
      return btn;
    };

    const btnBack = createButton('<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAAA6UlEQVR4nO2ZPQrCQBBGB7SIhX223Fv4cwIP4BksMnfwLlaK1/AQqSz0BvY6IrpgscQNCJkZvgdD2vcg2Sy7RAAA0Jc1yYhr2byeZFI+yI6DSFPLfksyJovyaRorETl5thLRJc/aI0rkWWtEH3l+z0FNAOSHAvJDAfmhmNFlsppez0142JSfV+0t0kkWVSsFETrl42d+ROiWj90RNuRjPsKWfPyK4HA/qpFPAUvLAaURal+hkgj1H3FXhJllNBdh7kfmYivhYjOXQIQWEKEFRGjB9NGii8NdF8frLi44XFwxubjkAwDQX3kCE8vvOrI1jIUAAAAASUVORK5CYII=" alt="back">', () => history.back());
    const btnForward = createButton('<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAAA9klEQVR4nO2ZPwrCMBSHH1TwD7o3Y29hwAsIru8Mou0dPIvi4j08g4ObiIMHcNQnBQWHUttB8n7xfRC6fh+kSUiIDMP4b5gkKVKZl19Cg0mS3Mm6cCKFk92KpEOg8gIVwdXyGBFcL687gpvJ643gcsVxsmkYYBE/wyK0wBahhL+LyN1DpqPzaUaXAaFFlPKT/lEy2ovvHW5Lug4JJeJT/j08SkSVfIYSUSefvca4qzRikd633+QzrRFtA7ymqdR2Cnmt8nA/MSMvo4y8kTHyUYKRD3Ns8oEw+VCwyQeE0a8W4S93o7hej+KBI4onpige+QzDoOA8ARQA76A+T9XpAAAAAElFTkSuQmCC" alt="forward--v1">', () => history.forward());
    const btnHome = createButton('<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAABbklEQVR4nO3Yu0oDURCA4YM30CZIOhtFrGxTKTMGRPAJ0luoiC8g1hYK4gMI1hZaKESLaIilCAHBCzuTqIUWMWeCBDQ2So4IKl5iiELYXZgfpp75ioXlGKNpmqa9BSflbvAkBmQT0czVXiSdz3WluNy2S88miEcCyRySrCLZfWApIIt7H5P0vo4fIdlJYLuILJtIcgws95+PxDrTVEDCuda4V+gDLo2hJzNAdhnZbv0ANHgsNgMQy7p24Nv+1yOBZRrZLiHLBrJkkaRSc2mQAMD26c9LgwTA/yxVgCjgIwUYBTgFoAJEAcbPv1FNC3MY9o8YFWAUYBTACnAKSCpAFIB+AOL54gB6xXEgmUWWFWC7DWxPkeQxFIB6DXvSM8IWkYsTQLKAJOtA9ig0gEZDLs0DyxqyPQCy10i2GirA9wbPXMdvL97A8hB4QN2caxk6v+tFklFgOxXNXB5G0hc3nalcpXXHq/p9nqZpmqnZC6W+Md0cfW6gAAAAAElFTkSuQmCC" alt="windows8">', () => location.href = 'https://odoo.atomcrea.i234.me:13102/odoo');
    const btnNews = createButton('<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAAA60lEQVR4nO3VsQ7BUBTG8ZMwSCSsmvYJRGI0NTF6DmyuxeKZzFcnpr7E1RIGiaUIs8YRiU1aIXJ7y/dP7tjk/Np7UiKEEDImN4jYhEMABAAwAB8lFZtwhMWpBwACQOkBuLqWVgLwCIAIAAJA/hCA8v4fIAAUAELXEn/zWQGABICNAFDel5gAUACIv15iF4AIAPEOoDBV16wXmKTifj1OA5wSAZX5apf18CQVt0fHNMAkEeD4m07RW2T+FcpeyN3m5Xn4Gu+HNjvJO0BEtr9uVWfLbdbXqeSF7I4P3GvEPLD4fH/zL4dHCCHS3Q3sZnwI2nsQyQAAAABJRU5ErkJggg==" alt="news--v1">', () => location.href = 'https://odoo.atomcrea.i234.me:13102/blog/xin-wen-4');
    const btnChat = createButton('<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAAA1UlEQVR4nO3SMQrCQBCF4acIaqF9LiIiGdJ6mNxHsBesDYKdiIfYJE0gZdY7jIggGowoKNmV98PUO98yAGOMOVscqLo2ICAgQH8GkMzq/SAxrU9MQEKAEhAQYAgAAUqAEpAQoASAAENAYwQkBCgBQoAhAN8CuDD4pLaXFQIyzwH13njgOMlPY7iavFg+TO1hZuwILidNy2d2Ny3LIVxPnv/8NiqKAXxI6oC02szzvA9fksezWUd77cGn5HY21cq75S9dz8YuodqFj4VptYBqp+098M+dARP4r7S0g673AAAAAElFTkSuQmCC" alt="filled-chat">', () => location.href = 'https://odoo.atomcrea.i234.me:13102/odoo/discuss');
    const btnPass = createButton('<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAAD20lEQVR4nO1XXUxURxi9brDyUJI1aSr65v9P0IKCiTKzGxubqGsTTQVikxofhA1KQqRVY2Kkj31rH/rSN60vpi+tO8OqxQQfsBZqoxDK7je7iLSGhcW/IgJi5DOzZtdd710yg3cXTO5JTu7N7sw959z5+eYahgMHDhxYwdvWVkDDgRpJeW+8L9ge+q3II1gjBXaPCo6SRLBBCuxbMsAXG/MVNHxpOQX+HQH+OGn8bRLBn1LBf9oeurzWmC8gUb6FAvuZCPYim3ETgb+kwBgBvnNuXGOzq1IEPqeCtSubzjYqwP+uBHYoL+vEan7bRZLTdYK4gAD/ngo+ardxauao1JKaNgZoduXBOKZTajoBUnACcCdAXgN4/glidVMf+ksmE6xuiqK3N/j+BKhuimLDUsxg9TfROQxgGAYV/LmquL9kwhTAv2lCJ8Bzw24kKqVqgI0TWLdkClcYNxL0L5lC/yfjOgHu5yJAt6qBqhMR3OcexuVGe4L73cNYdSqiEYDdtj0AFSyovIh7W9C3cgDXuzoT3Lvq38Rvqv2JYNz+AMDP6ASoXz2Vmv/1q17o7ULATucigEfVwO6Lf5oW8e6LN9VHINxSaXuAXSK4iAL7X8VATeNdU4Caxj4188CebOj55QNtg0TE9xKIdxIYGZNXCnGfuQ37UcVEbcWYKUBt+TPFAPwHbW+yAYURfJskPLIvvZ0H+HoKbFpjO9QjsGlvOLBO2xuF+F/pfxoslGBRIGJ6k3sudOTGvODoO9dp0itikZSfzADxjvQAo1YBXCxkngoVY+jp0TvXqJ6fjmw1Tz0XD1kGkJ5nNQKSB86EbQ9QdRostVRHwGc1zzwQ32O14L39bYUE+B/2BWDtcpez0lL2JhvKVARGnsprNvOpEOHARxRY9F3NE8H6t0WvfjyTlq43ZXijrIQCG561eWAxIoIbjHzh6DIsbSjGB+lztG7zM9zZel3b/Ge/X8e60vGM+X6sGB/XF2NF3synzjprptCnsb36zndmnJUachUiWQHL7gxOugORae/xR5aiSX71xRB+euNaVuM7brbil4f/m/EZ3q8foTsQnZaa2U4Eyublat/cHcOFQUhtZeTkw8ljxVietd8AX0wEb07/AJL3RPCz3v5f3TONMD3xcDypIzWlttWJQAnJ2vBh65t9uKAFsLQjFlHpLw9kBPhByS23bi1U6VPWMdgnNZJ6Utu052sESFTnrT1DWHgFsCAIWNYVy6yANoNCfDQ54ouuCKzoGTZXXY2HpaqzfNBr87N8G5qaZV2xNPOzHwGt6mwHqN2aOauA80zTgQMHxtzhFfztgK1oTckqAAAAAElFTkSuQmCC" alt="cyber-security">', () => showPasswordManager(false));
    btnPass.id = 'pp-password-panel-button';

    menuBox.appendChild(btnBack);
    menuBox.appendChild(btnForward);
    menuBox.appendChild(btnHome);
    menuBox.appendChild(btnNews);
    menuBox.appendChild(btnChat);
    menuBox.appendChild(btnPass);

    const toggleBtn = createButton('<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAXUlEQVR4nO3WsQ3AIAxFQS/mqRkGeYYMQWaIUhjQnUTPq74jAIANZT1rpxcC6vCAGLP3fSVgNAcAh8sNxistcV0UEKcNWQqYTgngh+7hSktc/Z9Op0QJWE4JALjZC8rxEoqzbZuvAAAAAElFTkSuQmCC" alt="menu--v1">', () => {
      isExpanded = !isExpanded;
      localStorage.setItem('menu_expanded', isExpanded.toString());
      updateMenuDisplay();
    });

    const updateMenuDisplay = () => {
      menuBox.style.transform = isExpanded ? 'translateY(0)' : 'translateY(20px)';
      menuBox.style.opacity = isExpanded ? '1' : '0';
      menuBox.style.pointerEvents = isExpanded ? 'auto' : 'none';
    };

    const updateButtonColors = () => {
      const bg = getComputedStyle(document.body).backgroundColor;
      let isDark = false;
      if (bg.startsWith('rgb')) {
        const [r, g, b] = bg.match(/\d+/g).map(Number);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        isDark = brightness < 128;
      }
      const iconColor = isDark ? '#fff' : '#000';
      const bgColor = isDark ? '#ffffff22' : '#00000011';
      const hoverColor = isDark ? '#ffffff55' : '#00000022';

      [...menuBox.children, toggleBtn].forEach((btn) => {
        btn.style.background = bgColor;
        btn.style.color = iconColor;
        btn.onmouseenter = () => (btn.style.background = hoverColor);
        btn.onmouseleave = () => (btn.style.background = bgColor);
      });
    };

    navWrapper.appendChild(menuBox);
    navWrapper.appendChild(toggleBtn);
    document.body.appendChild(navWrapper);
    updateButtonColors();
    updateMenuDisplay();
  }
  function setNativeValue(el, val) {
    const lastValue = el.value;
    el.value = val;
    const tracker = el._valueTracker;
    if (tracker) tracker.setValue(lastValue);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function loadStore() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; }
    catch { return []; }
  }

  function saveStore(store) {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  }

  function isValidAccountInput(el) {
    const name = (el.name || el.id || '').toLowerCase();
    const placeholder = (el.placeholder || '').toLowerCase();
    const value = el.value?.trim();
    const type = el.type?.toLowerCase();

    if (type === 'password' || type === 'hidden') return false;
    if (/db|database|source|schema|env|库/.test(name + placeholder)) return false;

    const isEmailType = type === 'email';
    const hasKeyword = /user|email|账号|账户|login|phone|mobile/.test(name + placeholder);
    const isEmailFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value || '');
    const isPhoneFormat = /^[0-9]{9,}$/.test(value || '');

    return isEmailType || hasKeyword || isEmailFormat || isPhoneFormat;
  }

  function findValidUsernameInput(passwordInput) {
    const inputs = Array.from(document.querySelectorAll('input'));
    const pIndex = inputs.indexOf(passwordInput);
    if (pIndex === -1) return null;

    for (let i = pIndex - 1; i >= 0 && i >= pIndex - 3; i--) {
      const el = inputs[i];
      if (isValidAccountInput(el)) return el;
    }
    return null;
  }

  function trySaveCurrentPassword() {
    const pIn = document.querySelector('input[type="password"]');
    if (!pIn || !pIn.value) return;

    const uIn = findValidUsernameInput(pIn);
    if (!uIn || !uIn.value) return;

    const username = uIn.value.trim();
    const password = pIn.value.trim();
    const host = location.hostname;

    const extra = {};
    document.querySelectorAll('input, select').forEach(el => {
      const name = el.name?.toLowerCase() || '';
      if ((name.includes('db') || name.includes('source') || name.includes('env') || name.includes('port')) && el.value) {
        extra[name] = el.value.trim();
      }
    });

    let store = loadStore();
    const existsIndex = store.findIndex(e => e.host === host && e.username === username);
    if (existsIndex !== -1) {
      store[existsIndex] = { host, username, password, extra };
      console.log('[更新成功]', host, username, extra);
    } else {
      store.push({ host, username, password, extra });
      console.log('[保存成功]', host, username, extra);
    }

    saveStore(store);
  }

  function autoFillPasswordDropdown() {
    const store = loadStore();
    const matches = store.filter(e => e.host === location.hostname);
    if (matches.length === 0) return;

    document.querySelectorAll('input').forEach(input => {
      if (!isValidAccountInput(input)) return;

      input.addEventListener('focus', () => {
        document.querySelectorAll('.pp-dropdown').forEach(el => el.remove());

        const dropdown = document.createElement('div');
        dropdown.className = 'pp-dropdown';
        dropdown.style.position = 'absolute';
        dropdown.style.background = '#fff';
        dropdown.style.border = '1px solid #ccc';
        dropdown.style.borderRadius = '6px';
        dropdown.style.boxShadow = '0 4px 10px rgba(0,0,0,0.1)';
        dropdown.style.zIndex = '99999';
        dropdown.style.fontSize = '14px';
        dropdown.style.maxHeight = '200px';
        dropdown.style.overflowY = 'auto';

        matches.forEach(match => {
          const item = document.createElement('div');
          item.textContent = match.username + (match.note ? `（${match.note}）` : '');
          item.style.padding = '6px 10px';
          item.style.cursor = 'pointer';
          item.style.userSelect = 'none';
          item.onmouseenter = () => (item.style.background = '#f0f0f0');
          item.onmouseleave = () => (item.style.background = '#fff');
          item.onclick = () => {
            setNativeValue(input, match.username);
            const pIn = document.querySelector('input[type="password"]');
            if (pIn) setNativeValue(pIn, match.password);
            dropdown.remove();
            console.log(`[选择填充] ${match.username}`);
          };
          dropdown.appendChild(item);
        });

        const rect = input.getBoundingClientRect();
        dropdown.style.top = `${rect.bottom + window.scrollY}px`;
        dropdown.style.left = `${rect.left + window.scrollX}px`;
        dropdown.style.minWidth = `${rect.width}px`;

        document.body.appendChild(dropdown);

        input.addEventListener('blur', () => {
          setTimeout(() => dropdown.remove(), 150);
        }, { once: true });
      });
    });
  }
  function detectLoginAndSave() {
    document.addEventListener('submit', trySaveCurrentPassword, true);
    document.addEventListener('click', (e) => {
      const target = e.target.closest('button,input[type="submit"]');
      if (target) setTimeout(trySaveCurrentPassword, 100);
    }, true);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') setTimeout(trySaveCurrentPassword, 100);
    });
  }

  function observeDomChanges() {
    const observer = new MutationObserver(() => {
      autoFillPasswordDropdown();
      detectLoginAndSave();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      autoFillPasswordDropdown();
      detectLoginAndSave();
    }, 3000);
  }

  function forceSameWindowOpen() {
    document.querySelectorAll('a[target="_blank"]').forEach((a) => {
      a.setAttribute('target', '_self');
    });
  }

  function showPasswordManager(forceReload = false) {
    const oldPanel = document.querySelector('#pp-password-panel');
    if (oldPanel && !forceReload) {
      oldPanel.remove();
      passwordPanelVisible = false;
      return;
    }

    const panel = document.createElement('div');
    panel.id = 'pp-password-panel';
    panel.style.position = 'fixed';
    panel.style.bottom = '80px';
    panel.style.right = '20px';
    panel.style.width = '350px';
    panel.style.maxHeight = '70vh';
    panel.style.background = 'rgba(0,0,0,0.7)';
    panel.style.color = '#fff';
    panel.style.overflowY = 'auto';
    panel.style.borderRadius = '10px';
    panel.style.padding = '12px';
    panel.style.fontSize = '14px';
    panel.style.zIndex = '99999';
    panel.style.backdropFilter = 'blur(10px)';
    panel.innerHTML = '<strong>🔐 密码库</strong><br><br>';

    const store = loadStore();
    if (store.length === 0) {
      panel.innerHTML += '<div style="margin-top:10px;">暂无保存的账号密码。</div>';
    } else {
      store.forEach((entry, index) => {
        const { host, username, password, note, extra = {} } = entry;
        const db = extra.db || '';
        const item = document.createElement('div');
        item.style.marginBottom = '10px';
        item.innerHTML = `
          <div style="padding:6px; background:#ffffff11; border-radius:6px;">
            <div><b>🌐 ${host}</b></div>
            <div>👤 ${username}</div>
            <div>🔑 ${password}</div>
            ${db ? `<div>📦 ${db}</div>` : ''}
            <div style="margin-top:4px; display:flex; gap:6px;">
              <button style="background:rgba(255,255,255,0.12); border:none; border-radius:6px; padding:4px 10px; color:#fff; cursor:pointer;" onclick="(function(){
                const store = JSON.parse(localStorage.getItem('${STORE_KEY}')) || [];
                store.splice(${index}, 1);
                localStorage.setItem('${STORE_KEY}', JSON.stringify(store));
                location.reload();
              })()">删除</button>
              <button style="background:rgba(255,255,255,0.12); border:none; border-radius:6px; padding:4px 10px; color:#fff; cursor:pointer;" onclick="navigator.clipboard.writeText('${host} ${username} ${password} ${db}')">复制</button>
              <input type="text" placeholder="备注" value="${note || ''}" style="flex:1; border:none; border-radius:6px; background:rgba(255,255,255,0.15); padding:4px 8px; color:#fff;" oninput="(function(val){
                const store = JSON.parse(localStorage.getItem('${STORE_KEY}')) || [];
                if(store[${index}]){ store[${index}].note = val; localStorage.setItem('${STORE_KEY}', JSON.stringify(store)); }
              })(this.value)">
            </div>
          </div>
        `;
        panel.appendChild(item);
      });
    }

    const toolBox = document.createElement('div');
    toolBox.style.marginTop = '12px';
    toolBox.style.display = 'flex';
    toolBox.style.justifyContent = 'center';
    toolBox.style.gap = '10px';

    const buttonStyle = `
      flex: 1;
      padding: 6px 12px;
      border: none;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.12);
      color: #fff;
      cursor: pointer;
      backdrop-filter: blur(6px);
      transition: all 0.2s ease-in-out;
      text-align: center;
    `;

    const exportBtn = document.createElement('button');
    exportBtn.textContent = '📤 导出密码';
    exportBtn.style.cssText = buttonStyle;
    exportBtn.onclick = () => {
      const data = JSON.stringify(loadStore(), null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'passwords.json';
      a.click();
      URL.revokeObjectURL(url);
    };

    const importLabel = document.createElement('label');
    importLabel.innerText = '📥 导入密码';
    importLabel.style.cssText = buttonStyle;
    const importInput = document.createElement('input');
    importInput.type = 'file';
    importInput.accept = '.json';
    importInput.style.display = 'none';
    importInput.onchange = (e) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const imported = JSON.parse(reader.result);
          if (!Array.isArray(imported)) throw new Error('无效数据');
          const current = loadStore();
          const merged = [...current];
          imported.forEach(newEntry => {
            const exists = merged.some(old => old.host === newEntry.host && old.username === newEntry.username);
            if (!exists) merged.push(newEntry);
          });
          saveStore(merged);
          showPasswordManager(true);
        } catch {
          alert('导入失败：无效的 JSON 文件。');
        }
      };
      reader.readAsText(e.target.files[0]);
    };
    importLabel.appendChild(importInput);
    toolBox.appendChild(exportBtn);
    toolBox.appendChild(importLabel);
    panel.appendChild(toolBox);
    document.body.appendChild(panel);
    passwordPanelVisible = true;

    setTimeout(() => {
      const closeOnClickOutside = (e) => {
        const isInside = e.target.closest('#pp-password-panel') || e.target.closest('#pp-password-panel-button');
        if (!isInside) {
          document.removeEventListener('click', closeOnClickOutside, true);
          const panel = document.querySelector('#pp-password-panel');
          if (panel) panel.remove();
          passwordPanelVisible = false;
        }
      };
      document.addEventListener('click', closeOnClickOutside, true);
    }, 10);
  }

  // ===== 页面加载后初始化 =====
  window.addEventListener('DOMContentLoaded', () => {
    dbSelector();
    createNavBar();
    forceSameWindowOpen();
    autoFillPasswordDropdown();
    detectLoginAndSave();
    observeDomChanges();
  });
})();