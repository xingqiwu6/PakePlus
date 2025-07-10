console.log('%c[inject] 启动导航栏 + 密码管理 + 跳转白名单控制', 'color:orange;font-weight:bold');

(function () {
  const STORE_KEY = 'pp_password_store';
  let passwordPanelVisible = false;

  // ===== 白名单网址控制逻辑 =====
  const { invoke } = window.__TAURI__.core;
  const ALLOW_HOSTS = ['xx.atomcrea.com', 'odoo.atomcrea.i234.me:13102'];

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

  // ====== 密码管理逻辑开始 ======

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

    const store = loadStore();
    const exists = store.some(e => e.host === host && e.username === username);
    if (!exists) {
      store.push({ host, username, password, extra });
      saveStore(store);
      console.log('[保存成功]', host, username, extra);
    } else {
      console.log('[跳过保存] 已存在或重复');
    }
  }
  function autoFillPasswordDropdown() {
    const store = loadStore();
    const matches = store.filter(e => e.host === location.hostname);
    if (matches.length === 0) return;

    document.querySelectorAll('input').forEach(input => {
      if (!isValidAccountInput(input)) return;

      input.addEventListener('focus', () => {
        // 删除旧的下拉框
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
  function createNavBar() {
    const navBar = document.createElement('div');
    navBar.style.position = 'fixed';
    navBar.style.bottom = '20px';
    navBar.style.right = '15px';
    navBar.style.zIndex = '9999';
    navBar.style.display = 'flex';
    navBar.style.alignItems = 'center';
    navBar.style.gap = '6px';

    let isExpanded = localStorage.getItem('menu_expanded') === 'true';

    const menuBox = document.createElement('div');
    menuBox.style.display = 'flex';
    menuBox.style.gap = '6px';
    menuBox.style.padding = '6px';
    menuBox.style.background = 'rgba(255, 255, 255, 0.05)';
    menuBox.style.backdropFilter = 'blur(6px)';
    menuBox.style.borderRadius = '6px';
    menuBox.style.boxShadow = '0 2px 5px rgba(0,0,0,0.15)';
    menuBox.style.transition = 'all 0.3s ease';

    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = '☰';
    toggleBtn.style.padding = '6px 10px';
    toggleBtn.style.border = 'none';
    toggleBtn.style.borderRadius = '6px';
    toggleBtn.style.cursor = 'pointer';
    toggleBtn.style.fontSize = '16px';
    toggleBtn.style.fontWeight = 'bold';
    toggleBtn.style.backdropFilter = 'blur(6px)';
    toggleBtn.style.transition = 'background 0.3s ease';

    const createButton = (text, onClick) => {
      const btn = document.createElement('button');
      btn.textContent = text;
      btn.style.padding = '6px 12px';
      btn.style.border = 'none';
      btn.style.borderRadius = '4px';
      btn.style.cursor = 'pointer';
      btn.style.fontWeight = 'bold';
      btn.onclick = onClick;
      return btn;
    };

    const homeBtn = createButton('⌂', () => location.href = 'https://xx.atomcrea.com/');
    const backBtn = createButton('←', () => history.back());
    const forwardBtn = createButton('→', () => history.forward());
    const passBtn = createButton('⚷', () => showPasswordManager(false));
    passBtn.id = 'pp-password-panel-button';

    menuBox.appendChild(backBtn);
    menuBox.appendChild(forwardBtn);
    menuBox.appendChild(homeBtn);
    menuBox.appendChild(passBtn);

    toggleBtn.onclick = () => {
      isExpanded = !isExpanded;
      localStorage.setItem('menu_expanded', isExpanded.toString());
      updateMenuDisplay();
    };

    const updateMenuDisplay = () => {
      if (isExpanded) {
        menuBox.style.transform = 'translateX(0)';
        menuBox.style.opacity = '1';
        menuBox.style.pointerEvents = 'auto';
      } else {
        menuBox.style.transform = 'translateX(100%)';
        menuBox.style.opacity = '0';
        menuBox.style.pointerEvents = 'none';
      }
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

    navBar.appendChild(menuBox);
    navBar.appendChild(toggleBtn);
    document.body.appendChild(navBar);
    updateButtonColors();
    updateMenuDisplay();
  }

  window.addEventListener('DOMContentLoaded', () => {
    createNavBar();
    forceSameWindowOpen();
    autoFillPasswordDropdown();
    detectLoginAndSave();
    observeDomChanges();
  });
})();
