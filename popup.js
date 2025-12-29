document.addEventListener('DOMContentLoaded', () => {
  const logDiv = document.getElementById('log');
  const renewalDayInput = document.getElementById('renewalDay');
  const todayDisplay = document.getElementById('todayDate');
  const datePrefix = document.getElementById('datePrefix');
  const fixedLimitToggle = document.getElementById('fixedLimitToggle');
  const fixedLimitValue = document.getElementById('fixedLimitValue');
  const setDailyStartBtn = document.getElementById('setDailyStartBtn');
  const dailyStartInput = document.getElementById('dailyStartInput');
  const debugModeToggle = document.getElementById('debugModeToggle');
  const planStartCreditInput = document.getElementById('planStartCredit');
  const viewDiagnosticsBtn = document.getElementById('viewDiagnosticsBtn');
  
  // Numeric Display Settings
  const numericSettingsToggle = document.getElementById('numericSettingsToggle');
  const numericSettingsMenu = document.getElementById('numericSettingsMenu');
  const numericDisplayToggle = document.getElementById('numericDisplayToggle');
  const monthlyPriceInput = document.getElementById('monthlyPrice');
  const decimalPlacesSelect = document.getElementById('decimalPlaces');
  const previewRate = document.getElementById('previewRate');
  const previewValue = document.getElementById('previewValue');
  
  // Display Settings
  const displaySettingsToggle = document.getElementById('displaySettingsToggle');
  const displaySettingsMenu = document.getElementById('displaySettingsMenu');
  const displayCheckboxes = {
    showDailyStart: document.getElementById('showDailyStart'),
    showCurrentBalance: document.getElementById('showCurrentBalance'),
    showConsumedToday: document.getElementById('showConsumedToday'),
    showSinceLastCheck: document.getElementById('showSinceLastCheck'),
    showActualPace: document.getElementById('showActualPace'),
    showTargetPace: document.getElementById('showTargetPace'),
    showDaysInfo: document.getElementById('showDaysInfo'),
    showStatus: document.getElementById('showStatus')
  };

  const formatDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}/${m}/${d}`;
  };

  const updateDatePrefix = (renewalDay) => {
    const now = new Date();
    todayDisplay.innerText = formatDate(now);
    
    let displayDate = new Date(now.getFullYear(), now.getMonth(), renewalDay);
    if (now.getDate() >= renewalDay) {
      displayDate.setMonth(displayDate.getMonth() + 1);
    }
    
    const y = displayDate.getFullYear();
    const m = String(displayDate.getMonth() + 1).padStart(2, '0');
    datePrefix.innerText = `${y}/${m}/`;
  };

  const getPlanStartDate = (renewalDay) => {
    const now = new Date();
    let planStart = new Date(now.getFullYear(), now.getMonth(), renewalDay);
    
    if (now.getDate() < renewalDay) {
      planStart.setMonth(planStart.getMonth() - 1);
    }
    
    return planStart;
  };

  const getDaysElapsed = (planStartDate) => {
    const now = new Date();
    const diffTime = now - planStartDate;
    const daysElapsed = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, daysElapsed);
  };

  const calculateActualPace = (planStartCredit, currentCredit, daysElapsed) => {
    const consumed = planStartCredit - currentCredit;
    const actualPace = consumed / daysElapsed;
    return Math.round(actualPace * 10) / 10;
  };

  const calculateTargetPace = (planStartCredit, renewalDay) => {
    const now = new Date();
    const nextRenewal = new Date(now.getFullYear(), now.getMonth(), renewalDay);
    if (now.getDate() >= renewalDay) {
      nextRenewal.setMonth(nextRenewal.getMonth() + 1);
    }
    
    const planStart = getPlanStartDate(renewalDay);
    const totalDays = Math.ceil((nextRenewal - planStart) / (1000 * 60 * 60 * 24));
    const targetPace = planStartCredit / totalDays;
    
    return Math.round(targetPace * 10) / 10;
  };

  const getPaceStatus = (actualPace, targetPace) => {
    const diff = actualPace - targetPace;
    const percentDiff = (diff / targetPace) * 100;
    
    let status = '';
    let color = '';
    
    if (percentDiff < -10) {
      status = `🟢 Excellent (Saving ${Math.abs(Math.round(percentDiff))}%)`;
      color = '#34a853';
    } else if (percentDiff < 10) {
      status = '🟢 On Track';
      color = '#34a853';
    } else if (percentDiff < 30) {
      status = `🟡 Slightly Over (+${Math.round(percentDiff)}%)`;
      color = '#fbbc04';
    } else {
      status = `🔴 Over Target (+${Math.round(percentDiff)}%)`;
      color = '#ea4335';
    }
    
    return { status, color };
  };

  chrome.storage.local.get({ 
    history: [], 
    latest: null, 
    renewalDay: 1,
    fixedLimitEnabled: false,
    fixedLimitValue: 100,
    debugMode: false,
    planStartCredit: 10000,
    showDailyStart: true,
    showCurrentBalance: true,
    showConsumedToday: true,
    showSinceLastCheck: true,
    showActualPace: true,
    showTargetPace: true,
    showDaysInfo: true,
    showStatus: true,
    numericDisplayEnabled: false,
    monthlyPrice: 0,
    decimalPlaces: 0
  }, (data) => {
    if (chrome.runtime.lastError) {
      console.error('[Credit Tracker for Genspark] Failed to load settings:', chrome.runtime.lastError);
      logDiv.innerHTML = '<div style="padding:10px; color:#d93025; font-size:12px;">Failed to load data. Please reload the extension.</div>';
      return;
    }
    
    renewalDayInput.value = data.renewalDay;
    fixedLimitToggle.checked = data.fixedLimitEnabled;
    fixedLimitValue.value = data.fixedLimitValue;
    debugModeToggle.checked = data.debugMode;
    planStartCreditInput.value = data.planStartCredit;
    
    // Display Settings チェックボックスの状態を復元
    Object.keys(displayCheckboxes).forEach(key => {
      displayCheckboxes[key].checked = data[key];
    });
    
    // Numeric Display Settings の状態を復元
    numericDisplayToggle.checked = data.numericDisplayEnabled;
    monthlyPriceInput.value = data.monthlyPrice;
    decimalPlacesSelect.value = data.decimalPlaces;

// Fixed Daily Limit Mode による Display Settings の制御
const updateDisplaySettingsState = () => {
  const isFixedMode = fixedLimitToggle.checked;
  
  // Fixed Mode の場合、特定の項目を無効化
  const itemsToDisable = ['showActualPace', 'showTargetPace', 'showDaysInfo', 'showStatus'];
  
  itemsToDisable.forEach(key => {
    const checkbox = displayCheckboxes[key];
    if (isFixedMode) {
      checkbox.disabled = true;
      checkbox.parentElement.style.opacity = '0.5';
      checkbox.parentElement.style.cursor = 'not-allowed';
    } else {
      checkbox.disabled = false;
      checkbox.parentElement.style.opacity = '1';
      checkbox.parentElement.style.cursor = 'pointer';
    }
  });
};

// 初期状態を設定
updateDisplaySettingsState();

// Fixed Daily Limit Toggle の変更を監視
fixedLimitToggle.addEventListener('change', () => {
  updateDisplaySettingsState();
  saveSettings(); // 既存の保存処理を呼び出し
});

    


    updateDatePrefix(data.renewalDay);

    const saveSettings = () => {
      const renewalDay = parseInt(renewalDayInput.value) || 1;
      const fixedLimitEnabled = fixedLimitToggle.checked;
      const fixedLimit = parseInt(fixedLimitValue.value) || 100;
      const planStartCredit = parseInt(planStartCreditInput.value) || 10000;
      
      chrome.storage.local.set({ 
        renewalDay,
        fixedLimitEnabled,
        fixedLimitValue: fixedLimit,
        planStartCredit
      }, () => {
        if (chrome.runtime.lastError) {
          console.error('[Credit Tracker for Genspark] Failed to save settings:', chrome.runtime.lastError);
          alert('Failed to save settings. Storage may be full.');
          return;
        }
        
        updateDatePrefix(renewalDay);
        renderUI();
      });
    };

// Display Settings の初期状態とトグルスイッチ処理
displaySettingsMenu.style.display = 'none'; // 初期状態: 閉じている

displaySettingsToggle.addEventListener('change', () => {
  displaySettingsMenu.style.display = displaySettingsToggle.checked ? 'block' : 'none';
});

// Display Settings チェックボックスの変更を監視
Object.keys(displayCheckboxes).forEach(key => {
  displayCheckboxes[key].addEventListener('change', () => {
    const settings = {};
    Object.keys(displayCheckboxes).forEach(k => {
      settings[k] = displayCheckboxes[k].checked;
    });
    
    chrome.storage.local.set(settings, () => {
      if (chrome.runtime.lastError) {
        console.error('[Credit Tracker for Genspark] Failed to save display settings:', chrome.runtime.lastError);
        return;
      }
      
      // content.jsに更新通知を送信
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {action: 'updateDisplay'}, (response) => {
            // エラーは無視（ページがGensparkでない場合など）
          });
        }
      });
    });
  });
});


// ========================================
// Numeric Display Settings
// ========================================

// プレビューを更新する関数
function updateNumericPreview() {
  chrome.storage.local.get({
    planStartCredit: 10000,
    monthlyPrice: 0,
    decimalPlaces: 0
  }, (data) => {
    const { planStartCredit, monthlyPrice, decimalPlaces } = data;
    const conversionRate = planStartCredit > 0 ? monthlyPrice / planStartCredit : 0;
    const exampleValue = 100 * conversionRate;
    
    // 確実に数値に変換（0の場合も正しく処理）
    const decimalPlacesNum = (decimalPlaces !== undefined && decimalPlaces !== null) 
      ? parseInt(decimalPlaces, 10) 
      : 0;
    
    previewRate.textContent = conversionRate.toFixed(6);
    previewValue.textContent = exampleValue.toFixed(decimalPlacesNum);
  });
}

// 初期状態: メニューを閉じる
numericSettingsMenu.style.display = 'none';

// 外側トグル: メニューの展開/折りたたみ
numericSettingsToggle.addEventListener('change', () => {
  numericSettingsMenu.style.display = numericSettingsToggle.checked ? 'block' : 'none';
});

// 内側トグル: 表示モードの切り替え
numericDisplayToggle.addEventListener('change', () => {
  const numericDisplayEnabled = numericDisplayToggle.checked;
  chrome.storage.local.set({ numericDisplayEnabled }, () => {
    if (chrome.runtime.lastError) {
      console.error('[Credit Tracker for Genspark] Failed to save numeric display mode:', chrome.runtime.lastError);
      return;
    }
    
    // content.jsに更新通知を送信
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {action: 'updateDisplay'}, (response) => {
          // エラーは無視
        });
      }
    });
  });
});

// 月額料金の変更
monthlyPriceInput.addEventListener('input', () => {
  const monthlyPrice = parseFloat(monthlyPriceInput.value) || 0;
  chrome.storage.local.set({ monthlyPrice }, () => {
    if (chrome.runtime.lastError) {
      console.error('[Credit Tracker for Genspark] Failed to save monthly price:', chrome.runtime.lastError);
      return;
    }
    updateNumericPreview();
  });
});

// 小数点桁数の変更
decimalPlacesSelect.addEventListener('change', () => {
  const decimalPlaces = parseInt(decimalPlacesSelect.value, 10);
  chrome.storage.local.set({ decimalPlaces }, () => {
    if (chrome.runtime.lastError) {
      console.error('[Credit Tracker for Genspark] Failed to save decimal places:', chrome.runtime.lastError);
      return;
    }
    updateNumericPreview();
    
    // content.jsに更新通知を送信
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {action: 'updateDisplay'}, (response) => {
          // エラーは無視
        });
      }
    });
  });
});

// planStartCreditの変更を監視してプレビューを更新
planStartCreditInput.addEventListener('input', () => {
  updateNumericPreview();
});


    debugModeToggle.addEventListener('change', () => {
      const debugMode = debugModeToggle.checked;
      chrome.storage.local.set({ debugMode }, () => {
        if (chrome.runtime.lastError) {
          console.error('[Credit Tracker for Genspark] Failed to save debug mode:', chrome.runtime.lastError);
          return;
        }
        console.log(`[Credit Tracker for Genspark] Debug mode ${debugMode ? 'enabled' : 'disabled'}`);
        if (debugMode) {
          console.log('[Credit Tracker for Genspark] Reload the page to see debug logs');
        }
      });
    });

    // View Diagnostics ボタン
    viewDiagnosticsBtn.addEventListener('click', () => {
      chrome.tabs.create({
        url: chrome.runtime.getURL('diagnostic.html')
      });
    });

    // Numeric Display Settings - Menu Toggle
    numericSettingsToggle.addEventListener('change', () => {
      if (numericSettingsToggle.checked) {
        numericSettingsMenu.style.display = 'block';
      } else {
        numericSettingsMenu.style.display = 'none';
      }
    });

    // Numeric Display Settings - Calculate and Update Preview
    function updateNumericPreview() {
      const monthlyPrice = parseFloat(monthlyPriceInput.value) || 0;
      const planStartCredit = parseInt(planStartCreditInput.value) || 10000;
      const decimalPlaces = parseInt(decimalPlacesSelect.value) || 1;
      
      let conversionRate = 0;
      if (planStartCredit > 0) {
        conversionRate = monthlyPrice / planStartCredit;
      }
      
      const previewAmount = (100 * conversionRate).toFixed(decimalPlaces);
      
      previewRate.textContent = conversionRate.toFixed(6);
      previewValue.textContent = previewAmount;
    }

    // Numeric Display Settings - Save Settings
    function saveNumericSettings() {
      const numericDisplayEnabled = numericDisplayToggle.checked;
      const monthlyPrice = parseFloat(monthlyPriceInput.value) || 0;
      const decimalPlaces = parseInt(decimalPlacesSelect.value) || 1;
      
      chrome.storage.local.set({
        numericDisplayEnabled,
        monthlyPrice,
        decimalPlaces
      }, () => {
        if (chrome.runtime.lastError) {
          console.error('[Credit Tracker for Genspark] Failed to save numeric settings:', chrome.runtime.lastError);
          return;
        }
        
        // Update Credit Tracker card
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'updateDisplay' });
          }
        });
      });
    }

    // Numeric Display Settings - Event Listeners
    numericDisplayToggle.addEventListener('change', saveNumericSettings);
    monthlyPriceInput.addEventListener('input', () => {
      updateNumericPreview();
      saveNumericSettings();
    });
    decimalPlacesSelect.addEventListener('change', () => {
      updateNumericPreview();
      saveNumericSettings();
    });
    planStartCreditInput.addEventListener('change', updateNumericPreview);

    // Initialize Numeric Display Settings
    chrome.storage.local.get({
      numericDisplayEnabled: false,
      monthlyPrice: 0,
      decimalPlaces: 0
    }, (data) => {
      numericDisplayToggle.checked = data.numericDisplayEnabled;
      monthlyPriceInput.value = data.monthlyPrice;
      decimalPlacesSelect.value = (data.decimalPlaces !== undefined && data.decimalPlaces !== null) 
        ? data.decimalPlaces 
        : 0;
      updateNumericPreview();
    });

    const renderUI = () => {
      chrome.storage.local.get({ 
        history: [], 
        latest: null, 
        renewalDay: 1,
        fixedLimitEnabled: false,
        fixedLimitValue: 100,
        planStartCredit: 10000,
        numericDisplayEnabled: false,
        monthlyPrice: 0,
        decimalPlaces: 0
      }, (res) => {
        if (chrome.runtime.lastError) {
          console.error('[Credit Tracker for Genspark] Failed to render UI:', chrome.runtime.lastError);
          logDiv.innerHTML = '<div style="padding:10px; color:#d93025; font-size:12px;">Failed to load data.</div>';
          return;
        }
        
        const history = res.history;
        const latest = res.latest;
        const renewalDay = res.renewalDay;
        const fixedLimitEnabled = res.fixedLimitEnabled;
        const fixedLimit = res.fixedLimitValue;
        const planStartCredit = res.planStartCredit;

        if (!history || history.length === 0) {
          logDiv.innerHTML = '<div style="padding:10px; color:#999; font-size:12px;">No history recorded yet.</div>';
          setDailyStartBtn.disabled = true;
          return;
        }

        const today = new Date();
        const todayStr = formatDate(today);
        const todayLogs = history.filter(item => {
          const logDate = new Date(item.time);
          return formatDate(logDate) === todayStr;
        });
        
        let html = '';
        if (todayLogs.length > 0 && latest) {
          const firstCountToday = todayLogs[0].count;
          const currentCount = latest.count;
          const consumed = firstCountToday - currentCount;

          const planStartDate = getPlanStartDate(renewalDay);
          const daysElapsed = getDaysElapsed(planStartDate);
          const actualPace = calculateActualPace(planStartCredit, currentCount, daysElapsed);
          const targetPace = calculateTargetPace(planStartCredit, renewalDay);
          const paceStatus = getPaceStatus(actualPace, targetPace);

          html = `
    <div class="status-row">
      <span class="status-label">Daily Start:</span>
      <span class="status-value">${firstCountToday}</span>
    </div>
    <div class="status-row">
      <span class="status-label">Current Balance:</span>
      <span class="status-value">${currentCount}</span>
    </div>
    <div class="status-row" style="color:#d93025;">
      <span class="status-label">Consumed Today:</span>
      <span class="status-value">-${consumed}</span>
    </div>
    <div class="divider"></div>
    <div class="status-row" style="color:#1a73e8;">
      <span class="status-label">Actual Pace:</span>
      <span class="status-value">${actualPace} /day</span>
    </div>
    <div class="status-row" style="color:#5f6368;">
      <span class="status-label">Target Pace:</span>
      <span class="status-value">${targetPace} /day</span>
    </div>
    <div class="status-row" style="color:${paceStatus.color}; font-weight:bold; margin-top:8px;">
      <span class="status-label">Status:</span>
      <span class="status-value">${paceStatus.status}</span>
    </div>
    <div style="font-size:10px; color:#999; text-align:right; margin-top:4px;">
      (${daysElapsed} days elapsed since ${formatDate(planStartDate)})
    </div>
`;
          setDailyStartBtn.disabled = false;
        } else {
          setDailyStartBtn.disabled = true;
        }
        logDiv.innerHTML = html;
        
        // Numeric Display プレビューを更新
        updateNumericPreview();
      });
    };

    setDailyStartBtn.addEventListener('click', () => {
      setDailyStartBtn.disabled = true;
      const originalText = setDailyStartBtn.textContent;
      setDailyStartBtn.textContent = 'Setting...';
      
      chrome.storage.local.get({ history: [], latest: null }, (data) => {
        const resetButton = () => {
          setDailyStartBtn.disabled = false;
          setDailyStartBtn.textContent = originalText;
          setDailyStartBtn.style.background = '#4285f4';
        };
        
        if (chrome.runtime.lastError) {
          alert('Failed to load data: ' + chrome.runtime.lastError.message);
          resetButton();
          return;
        }

        // 入力フォームの値を取得
        const inputValue = dailyStartInput.value.trim();
        let dailyStartValue;
        
        if (inputValue === '') {
          // 入力が空の場合: 現在の残高を使用
          if (!data.latest || data.latest.count === undefined) {
            alert('No current balance data available. Please enter a value manually.');
            resetButton();
            return;
          }
          dailyStartValue = data.latest.count;
        } else {
          // 入力がある場合: 入力値を使用
          dailyStartValue = parseInt(inputValue, 10);
          
          // バリデーション
          if (isNaN(dailyStartValue) || dailyStartValue < 0 || dailyStartValue > 1000000) {
            alert('Please enter a valid value between 0 and 1,000,000.');
            resetButton();
            return;
          }
        }

        const currentCount = dailyStartValue;
        const now = new Date();
        const todayStr = formatDate(now);
        const fullTimeStr = now.toLocaleString();

        let history = data.history;
        let updatedHistory = [...history];

        updatedHistory = updatedHistory.filter(item => {
          const logDate = new Date(item.time);
          return formatDate(logDate) !== todayStr;
        });

        updatedHistory.unshift({ time: fullTimeStr, count: currentCount });

        if (updatedHistory.length > 50) updatedHistory.pop();

        chrome.storage.local.set({ history: updatedHistory }, () => {
          if (chrome.runtime.lastError) {
            alert('Failed to save: ' + chrome.runtime.lastError.message);
            resetButton();
            return;
          }

          console.log(`[Credit Tracker for Genspark] Daily Start set to ${currentCount}`);
          
          setDailyStartBtn.textContent = '✓ Done!';
          setDailyStartBtn.style.background = '#34a853';
          
          // 入力フォームをクリア
          dailyStartInput.value = '';
          
          renderUI();
          
          setTimeout(() => {
            resetButton();
          }, 1500);
        });
      });
    });

    renderUI();
    renewalDayInput.addEventListener('change', saveSettings);
    fixedLimitToggle.addEventListener('change', saveSettings);
    fixedLimitValue.addEventListener('change', saveSettings);
    planStartCreditInput.addEventListener('change', saveSettings);
  });
});
