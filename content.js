console.log("[Credit Tracker for Genspark] Script loaded at:", new Date().toLocaleString());

// ========================================
// デバッグモード設定
// ========================================

let isDebugMode = false;

// 起動時に設定を読み込み
chrome.storage.local.get({ debugMode: false }, (data) => {
  isDebugMode = data.debugMode;
  console.log(`[Credit Tracker for Genspark] Debug mode: ${isDebugMode ? 'ON' : 'OFF'}`);
});

// デバッグログ用のヘルパー関数
// デバッグログ用のヘルパー関数（タイムスタンプ付き）
function debugLog(...args) {
  if (isDebugMode) {
    const elapsed = detectionStartTime > 0 
      ? (performance.now() - detectionStartTime).toFixed(1)
      : '0.0';
    console.log(`[+${elapsed}ms]`, ...args);
  }
}

function debugWarn(...args) {
  if (isDebugMode) {
    const elapsed = detectionStartTime > 0 
      ? (performance.now() - detectionStartTime).toFixed(1)
      : '0.0';
    console.warn(`[+${elapsed}ms]`, ...args);
  }
}


// ========================================
// 変数定義
// ========================================

let lastProcessedCount = null;
let retryCount = 0;
const MAX_RETRIES = 3;
let isProcessing = false;
let observerTimeout = null;
const DEBOUNCE_DELAY = 300;
let isPopupOpen = false;
let hasProcessedCurrentPopup = false;
let isClosing = false;
let lastCloseTime = 0;
let lastStorageWarning = 0;
const STORAGE_WARNING_INTERVAL = 3600000;

// 新しい検出システム用の変数
let detectionAttemptCount = 0;
let detectedValues = [];
let detectedStrategies = [];
const MAX_DETECTION_ATTEMPTS = 8;
const QUICK_CONFIRM_COUNT = 2;
const ZERO_CONFIRM_COUNT = 4;
const DETECTION_INTERVAL = 200;

// ★測定用の変数
let detectionStartTime = 0;
let lastAttemptTime = 0;
let attemptTimestamps = [];


/**
 * クレジット値を取得する堅牢な関数
 * 複数の戦略を試行し、最初に成功した方法を使用
 */
function getCreditValue() {
  const strategies = [
    // 戦略1: 現在の構造（.credit-left-item の2番目の子要素）
    () => {
      const container = document.querySelector('.credit-left-item');
      if (!container || !container.children[1]) return null;
      
      const valueElement = container.children[1];
      const text = valueElement.innerText || valueElement.textContent;
      if (!text) return null;
      
      return parseAndValidateCreditValue(text);
    },
    
    // 戦略2: より具体的なセレクタ（クラス名の組み合わせ）
    () => {
      const valueElement = document.querySelector('.credit-left-item > *:nth-child(2)');
      if (!valueElement) return null;
      
      const text = valueElement.innerText || valueElement.textContent;
      if (!text) return null;
      
      return parseAndValidateCreditValue(text);
    },
    
    // 戦略3: テキストコンテンツから数値を探す
    () => {
      const container = document.querySelector('.credit-left-item');
      if (!container) return null;
      
      const allText = container.innerText || container.textContent;
      if (!allText) return null;
      
      // "123" のような数値パターンを探す
      const matches = allText.match(/\b\d{1,10}\b/g);
      if (!matches || matches.length === 0) return null;
      
      // 最も大きい数値を採用（クレジット数は通常最大の数値）
      const numbers = matches.map(m => parseInt(m, 10)).filter(n => !isNaN(n));
      if (numbers.length === 0) return null;
      
      const maxNumber = Math.max(...numbers);
      return maxNumber >= 0 ? maxNumber : null;  // ★0も許可
    },
    
    // 戦略4: data属性やaria属性から探す
    () => {
      const elements = document.querySelectorAll('.credit-left-item [data-value], .credit-left-item [aria-valuenow]');
      for (const el of elements) {
        const value = el.getAttribute('data-value') || el.getAttribute('aria-valuenow');
        if (value) {
          const parsed = parseAndValidateCreditValue(value);
          if (parsed !== null) return parsed;
        }
      }
      return null;
    },
    
    // 戦略5: より広範囲な検索（credit, balance などのキーワード）
    () => {
      const possibleContainers = document.querySelectorAll('[class*="credit"], [class*="balance"], [class*="point"]');
      
      for (const container of possibleContainers) {
        // コンテナ内のテキストから数値を抽出
        const text = container.innerText || container.textContent;
        if (!text) continue;
        
        const parsed = parseAndValidateCreditValue(text);
        if (parsed !== null && parsed >= 0 && parsed < 1000000) {
          // 妥当な範囲の数値のみ採用（★0も含む）
          return parsed;
        }
      }
      return null;
    }
  ];
  
  // 各戦略を順番に試行
  for (let i = 0; i < strategies.length; i++) {
    try {
      const result = strategies[i]();
      // ★0も有効な値として扱う
      if (result !== null && result !== undefined && result >= 0) {
        // 成功した戦略番号と値を返す（ログは後で呼び出し元で記録）
        return { value: result, strategy: i + 1 };
      }
    } catch (error) {
      // エラーが発生しても次の戦略を試す
      logError(i + 1, error);
    }
  }
  
  // すべての戦略が失敗
  logFailure();
  return null;
}

/**
 * テキストから数値を抽出し、妥当性を検証
 */
function parseAndValidateCreditValue(text) {
  if (!text || typeof text !== 'string') return null;
  
  // カンマ、スペース、その他の区切り文字を除去
  const cleaned = text.replace(/[,\s]/g, '');
  
  // 数値のみを抽出
  const numberMatch = cleaned.match(/\d+/);
  if (!numberMatch) return null;
  
  const value = parseInt(numberMatch[0], 10);
  
  // 妥当性チェック
  if (isNaN(value)) return null;
  if (value < 0) return null;
  if (value > 10000000) return null;
  
  return value;
}

/**
 * ログ記録関数（デバッグ・問題調査用）
 */
function logSuccess(strategyNumber, value) {
  debugLog(`[Credit Tracker for Genspark] Strategy ${strategyNumber} succeeded. Credit: ${value}`);
  
  // 成功した戦略を記録（統計情報として保存）
  chrome.storage.local.get({ strategyStats: {}, successHistory: [] }, (data) => {
    if (chrome.runtime.lastError) {
      debugWarn('[Credit Tracker for Genspark] Failed to log success:', chrome.runtime.lastError);
      return;
    }
    
    const stats = data.strategyStats;
    const key = `strategy_${strategyNumber}`;
    stats[key] = (stats[key] || 0) + 1;
    stats.lastSuccess = {
      strategy: strategyNumber,
      time: new Date().toISOString(),
      value: value
    };
    
    // 成功履歴を記録（時系列分析用）
    const successHistory = data.successHistory;
    successHistory.push({
      strategy: strategyNumber,
      time: new Date().toISOString(),
      value: value
    });
    
    // 最新100件まで保持
    if (successHistory.length > 100) successHistory.shift();
    
    chrome.storage.local.set({ 
      strategyStats: stats,
      successHistory: successHistory
    });
  });
}

function logError(strategyNumber, error) {
  debugWarn(`[Credit Tracker for Genspark] Strategy ${strategyNumber} failed:`, error.message);
}

function logFailure() {
  console.error('[Credit Tracker for Genspark] All strategies failed to get credit value');
  
  // 失敗時の詳細情報を収集
  const debugInfo = {
    time: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent,
    
    // 各セレクタの存在確認
    selectors: {
      'credit-left-item': !!document.querySelector('.credit-left-item'),
      'credit-left': !!document.querySelector('.item.credit-left'),
      'n-popover': !!document.querySelector('.n-popover.n-popover-shared'),
    },
    
    // 関連要素のHTML（より詳細に）
    creditLeftItemHTML: document.querySelector('.credit-left-item')?.outerHTML || 'NOT FOUND',
    creditLeftHTML: document.querySelector('.item.credit-left')?.outerHTML?.substring(0, 2000) || 'NOT FOUND',
    
    // ページ全体のクラス名リスト（パターン分析用）
    allClasses: Array.from(document.querySelectorAll('[class*="credit"], [class*="balance"]'))
      .map(el => el.className)
      .slice(0, 20), // 最大20個
  };
  
  chrome.storage.local.get({ failureLogs: [] }, (data) => {
    if (chrome.runtime.lastError) {
      debugWarn('[Credit Tracker for Genspark] Failed to log failure:', chrome.runtime.lastError);
      return;
    }
    
    const logs = data.failureLogs;
    logs.push(debugInfo);
    
    // 最新20件まで保持（増量）
    if (logs.length > 20) logs.shift();
    
    chrome.storage.local.set({ failureLogs: logs });
  });
}

/**
 * サイドバー表示の失敗をログに記録
 */
function logSidebarFailure() {
  const debugInfo = {
    time: new Date().toISOString(),
    url: window.location.href,
    type: 'sidebar_display_failure',
    
    // 各セレクタの存在確認
    selectors: {
      'sidebar-footer': !!document.querySelector('.sidebar-footer'),
      'sidebar': !!document.querySelector('.sidebar'),
      'footer': !!document.querySelector('footer'),
      'navigation': !!document.querySelector('nav'),
    },
    
    // 関連要素のクラス名
    sidebarClasses: Array.from(document.querySelectorAll('[class*="sidebar"]'))
      .map(el => el.className)
      .slice(0, 10),
    
    footerClasses: Array.from(document.querySelectorAll('[class*="footer"]'))
      .map(el => el.className)
      .slice(0, 10),
  };
  
  chrome.storage.local.get({ sidebarFailureLogs: [] }, (data) => {
    if (chrome.runtime.lastError) {
      debugWarn('[Credit Tracker for Genspark] Failed to log sidebar failure:', chrome.runtime.lastError);
      return;
    }
    
    const logs = data.sidebarFailureLogs;
    logs.push(debugInfo);
    
    // 最新10件まで保持
    if (logs.length > 10) logs.shift();
    
    chrome.storage.local.set({ sidebarFailureLogs: logs });
  });
}

/**
 * 検出された値の安定性をチェックし、確定した値を返す
 * 非ゼロ値を優先的に採用する
 * @returns {number|null} 確定した値、まだ不安定ならnull
 */
function checkValueStability() {
  if (detectedValues.length === 0) {
    return null;
  }
  
  const lastValue = detectedValues[detectedValues.length - 1];
  const hasNonZero = detectedValues.some(v => v > 0);
  
  // ★優先度1: 非ゼロ値が2回連続 → 即座に確定
  if (lastValue > 0 && detectedValues.length >= QUICK_CONFIRM_COUNT) {
    const lastN = detectedValues.slice(-QUICK_CONFIRM_COUNT);
    const allSame = lastN.every(v => v === lastValue);
    
    if (allSame) {
      debugLog(`[Credit Tracker for Genspark] → Non-zero value (${lastValue}) detected ${QUICK_CONFIRM_COUNT} times consecutively`);
      return lastValue;
    }
  }
  
  // ★優先度2: 配列内に非ゼロ値が存在する場合、それを優先
  if (hasNonZero) {
    // 非ゼロ値のみ抽出
    const nonZeroValues = detectedValues.filter(v => v > 0);
    
    debugLog(`[Credit Tracker for Genspark] → Non-zero values detected: [${nonZeroValues.join(', ')}]`);
    
    // 非ゼロ値が2回以上ある場合
    if (nonZeroValues.length >= QUICK_CONFIRM_COUNT) {
      const lastNonZero = nonZeroValues[nonZeroValues.length - 1];
      const lastTwoNonZero = nonZeroValues.slice(-QUICK_CONFIRM_COUNT);
      
      if (lastTwoNonZero.length === QUICK_CONFIRM_COUNT && lastTwoNonZero.every(v => v === lastNonZero)) {
        debugLog(`[Credit Tracker for Genspark] → Non-zero value (${lastNonZero}) confirmed ${QUICK_CONFIRM_COUNT} times (ignoring previous zeros)`);
        return lastNonZero;
      }
    }
    
    // 最大試行に達していて、非ゼロが1回でもある → 最後の非ゼロを採用
    if (detectionAttemptCount >= MAX_DETECTION_ATTEMPTS && nonZeroValues.length >= 1) {
      const lastNonZero = nonZeroValues[nonZeroValues.length - 1];
      debugLog(`[Credit Tracker for Genspark] → Max attempts reached, adopting last non-zero value: ${lastNonZero}`);
      return lastNonZero;
    }
  }
  
  // ★優先度3: 最大試行回数に達した場合の最終判定
  if (detectionAttemptCount >= MAX_DETECTION_ATTEMPTS) {
    debugLog(`[Credit Tracker for Genspark] → Max attempts reached, performing final judgment`);
    debugLog(`[Credit Tracker for Genspark] → Detected values: [${detectedValues.join(', ')}]`);
    
    // 非ゼロが一度も出ていない場合
    if (!hasNonZero) {
      // ゼロが4回以上続いている場合、ゼロを採用
      if (detectedValues.length >= ZERO_CONFIRM_COUNT) {
        const zeroCount = detectedValues.filter(v => v === 0).length;
        
        if (zeroCount >= ZERO_CONFIRM_COUNT) {
          debugLog(`[Credit Tracker for Genspark] → Zero detected ${zeroCount} times (no non-zero detected)`);
          debugLog(`[Credit Tracker for Genspark] → Zero is considered valid, will be saved`);
          return 0;
        }
      }
      
      // 最も頻出する値を採用
      const frequencyMap = {};
      detectedValues.forEach(v => {
        frequencyMap[v] = (frequencyMap[v] || 0) + 1;
      });
      
      let maxFreq = 0;
      let mostFrequentValue = null;
      
      for (const [value, freq] of Object.entries(frequencyMap)) {
        if (freq > maxFreq) {
          maxFreq = freq;
          mostFrequentValue = parseInt(value);
        }
      }
      
      if (mostFrequentValue !== null && maxFreq >= 2) {
        debugLog(`[Credit Tracker for Genspark] → Most frequent value: ${mostFrequentValue} (appeared ${maxFreq} times)`);
        return mostFrequentValue;
      }
    }
    
    debugLog(`[Credit Tracker for Genspark] → No stable value found`);
    return null;
  }
  
  // まだ安定していない
  debugLog(`[Credit Tracker for Genspark] → Value not stable yet (${detectedValues.length} values collected)`);
  return null;
}


/**
 * 検出処理のサマリーを表示
 */
function printDetectionSummary() {
  if (!isDebugMode || attemptTimestamps.length === 0) return;
  
  console.group('[Credit Tracker for Genspark] 📊 Detection Summary');
  
  // 基本情報
  console.log(`Total attempts: ${attemptTimestamps.length}`);
  console.log(`Detected values: [${detectedValues.join(', ')}]`);
  
  // 処理時間の統計
  const durations = attemptTimestamps.map(a => a.duration);
  const intervals = attemptTimestamps.map(a => a.interval).filter(i => i > 0);
  
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const maxDuration = Math.max(...durations);
  const minDuration = Math.min(...durations);
  
  console.log(`\nProcessing time per attempt:`);
  console.log(`  Average: ${avgDuration.toFixed(2)}ms`);
  console.log(`  Min: ${minDuration.toFixed(2)}ms`);
  console.log(`  Max: ${maxDuration.toFixed(2)}ms`);
  
  if (intervals.length > 0) {
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const maxInterval = Math.max(...intervals);
    const minInterval = Math.min(...intervals);
    
    console.log(`\nInterval between attempts:`);
    console.log(`  Average: ${avgInterval.toFixed(1)}ms`);
    console.log(`  Min: ${minInterval.toFixed(1)}ms`);
    console.log(`  Max: ${maxInterval.toFixed(1)}ms`);
  }
  
  // 詳細テーブル
  console.log(`\nDetailed breakdown:`);
  console.table(attemptTimestamps.map(a => ({
    'Attempt': a.attempt,
    'Value': a.value !== null ? a.value : 'null',
    'Duration (ms)': a.duration.toFixed(2),
    'Interval (ms)': a.interval.toFixed(1)
  })));
  
  console.groupEnd();
}


// Create embedded tracker next to credit display
function createEmbeddedTracker() {
  const creditLeftContainer = document.querySelector('.item.credit-left');
  
  if (!creditLeftContainer) {
    return false;
  }
  
  if (document.getElementById('genspark-embedded-tracker')) {
    return true;
  }
  
  const trackerDiv = document.createElement('div');
  trackerDiv.id = 'genspark-embedded-tracker';
  trackerDiv.style.cssText = `
    margin-top: 12px;
    padding: 16px;
    background: linear-gradient(135deg, #4c1d95 0%, #3b0764 100%);
    border-radius: 8px;
    border: 1px solid #6b21a8;
    font-size: 12px;
    font-family: sans-serif;
    box-shadow: 0 2px 8px rgba(59, 7, 100, 0.4);
  `;
  
  trackerDiv.innerHTML = `
    <div style="margin-bottom: 10px; font-weight: bold; color: #ffffff; font-size: 14px; border-bottom: 2px solid #7c3aed; padding-bottom: 6px;">
      Credit Tracker
    </div>
    <div id="embedded-tracker-content">Loading...</div>
  `;
  
  const creditLeftItem = creditLeftContainer.querySelector('.credit-left-item');
  if (creditLeftItem) {
    creditLeftItem.insertAdjacentElement('afterend', trackerDiv);
    return true;
  } else {
    return false;
  }
}

// Update embedded tracker content
function updateEmbeddedTracker() {
  const contentDiv = document.getElementById('embedded-tracker-content');
  if (!contentDiv) {
    return;
  }
  
  chrome.storage.local.get({ 
    history: [], 
    latest: null, 
    renewalDay: 1,
    previousBalance: null,
    planStartCredit: 10000,
    fixedLimitEnabled: false,
    fixedLimitValue: 100,
    showDailyStart: true,
    showCurrentBalance: true,
    showConsumedToday: true,
    showSinceLastCheck: true,
    showActualPace: true,
    showTargetPace: true,
    showDaysInfo: true,
    showStatus: true
  }, (res) => {
    if (chrome.runtime.lastError) {
      console.error('[Credit Tracker for Genspark] Failed to update embedded tracker:', chrome.runtime.lastError);
      contentDiv.innerHTML = '<div style="color:#fca5a5;">Failed to load data.</div>';
      return;
    }
    
    const history = res.history;
    const latest = res.latest;
    const renewalDay = res.renewalDay;
    const previousBalance = res.previousBalance;
    const planStartCredit = res.planStartCredit;

    if (!history || history.length === 0 || !latest) {
      contentDiv.innerHTML = '<div style="color:#d8b4fe;">No data available yet.</div>';
      return;
    }

    const today = new Date();
    const formatDate = (date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}/${m}/${d}`;
    };
    const todayStr = formatDate(today);
    
    const todayLogs = history.filter(item => {
      const logDate = new Date(item.time);
      return formatDate(logDate) === todayStr;
    });

    if (todayLogs.length === 0) {
      contentDiv.innerHTML = '<div style="color:#d8b4fe;">No data recorded for today yet.</div>';
      return;
    }

    const firstCountToday = todayLogs[0].count;
    const currentCount = latest.count;
    const consumed = firstCountToday - currentCount;

    let sinceLastCheck = 0;
    if (previousBalance !== null && previousBalance >= currentCount) {
      sinceLastCheck = previousBalance - currentCount;
    }

    // プラン開始日の計算
    const now = new Date();
    let planStart = new Date(now.getFullYear(), now.getMonth(), renewalDay);
    if (now.getDate() < renewalDay) {
      planStart.setMonth(planStart.getMonth() - 1);
    }

    // 経過日数の計算
    const daysElapsed = Math.max(1, Math.ceil((now - planStart) / (1000 * 60 * 60 * 24)));

    // Actual Paceの計算
    const consumedTotal = planStartCredit - currentCount;
    const actualPace = Math.round((consumedTotal / daysElapsed) * 10) / 10;

    // Target Paceと残り日数の計算
    let nextRenewal = new Date(now.getFullYear(), now.getMonth(), renewalDay);
    if (now.getDate() >= renewalDay) {
      nextRenewal.setMonth(nextRenewal.getMonth() + 1);
    }
    const daysLeft = Math.max(1, Math.ceil((nextRenewal - now) / (1000 * 60 * 60 * 24)));
    const totalDays = Math.ceil((nextRenewal - planStart) / (1000 * 60 * 60 * 24));
    const targetPace = Math.round((planStartCredit / totalDays) * 10) / 10;

    // Status判定
    const diff = actualPace - targetPace;
    const percentDiff = (diff / targetPace) * 100;

    let statusText = '';
    let statusColor = '';

    if (percentDiff < -10) {
      statusText = `Excellent<br>(Saving ${Math.abs(Math.round(percentDiff))}%)`;
      statusColor = '#34a853';
    } else if (percentDiff < 10) {
      statusText = 'On Track';
      statusColor = '#34a853';
    } else if (percentDiff < 30) {
      statusText = `Slightly Over<br>(+${Math.round(percentDiff)}%)`;
      statusColor = '#fbbc04';
    } else {
      statusText = `Over Target<br>(+${Math.round(percentDiff)}%)`;
      statusColor = '#ea4335';
    }

    // Fixed Daily Limit Mode の判定
    const fixedLimitEnabled = res.fixedLimitEnabled;
    const fixedLimitValue = res.fixedLimitValue || 100;

    // 各項目のHTML生成（条件分岐）
    const dailyStartHTML = res.showDailyStart ? `
  <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #c4b5fd;">
    <span>Daily Start:</span>
    <span style="font-weight: bold;">${firstCountToday}</span>
  </div>
    ` : '';

    const currentBalanceHTML = res.showCurrentBalance ? `
  <div style="display: flex; justify-content: space-between; margin-bottom: 10px; color: #c4b5fd;">
    <span>Current Balance:</span>
    <span style="font-weight: bold;">${currentCount}</span>
  </div>
    ` : '';

    const consumedTodayHTML = res.showConsumedToday ? `
  <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #fca5a5;">
    <span>Consumed Today:</span>
    <span style="font-weight: bold;">-${consumed}</span>
  </div>
    ` : '';

    const sinceLastCheckHTML = res.showSinceLastCheck ? `
  <div style="display: flex; justify-content: space-between; margin-bottom: 10px; color: #fdba74;">
    <span>Since Last Check:</span>
    <span style="font-weight: bold;">-${sinceLastCheck}</span>
  </div>
    ` : '';

    // Fixed Daily Limit Mode の場合は Daily Limit を表示、それ以外は Actual Pace 等を表示
    let bottomSectionHTML = '';

    if (fixedLimitEnabled) {
      // Fixed Daily Limit Mode: Daily Limit のみ表示
      bottomSectionHTML = `
  <div style="display: flex; justify-content: space-between; margin-bottom: 2px; color: #67e8f9;">
    <span style="font-weight: bold;">Daily Limit:</span>
    <span style="font-weight: bold;">${fixedLimitValue} /day</span>
  </div>
  `;
    } else {
      // 通常モード: Actual Pace, Target Pace, Days Info, Status を表示
      const actualPaceHTML = res.showActualPace ? `
  <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #67e8f9;">
    <span>Actual Pace:</span>
    <span style="font-weight: bold;">${actualPace} /day</span>
  </div>
    ` : '';

      const targetPaceHTML = res.showTargetPace ? `
  <div style="display: flex; justify-content: space-between; margin-bottom: 2px; color: #a5b4fc;">
    <span>Target Pace:</span>
    <span style="font-weight: bold;">${targetPace} /day</span>
  </div>
    ` : '';

      const daysInfoHTML = res.showDaysInfo ? `
  <div style="font-size: 10px; color: #c4b5fd; text-align: right; margin-top: 2px;">
    (${daysElapsed} days elapsed / ${daysLeft} days left)
  </div>
    ` : '';

      const statusHTML = res.showStatus ? `
  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-top: 8px; color: ${statusColor}; font-weight: bold;">
    <span style="white-space: nowrap; margin-right: 8px;">Status:</span>
    <span style="text-align: right; line-height: 1.3;">${statusText}</span>
  </div>
    ` : '';

      bottomSectionHTML = actualPaceHTML + targetPaceHTML + daysInfoHTML + statusHTML;
    }

    // 区切り線の表示判定
    const showTopSection = res.showDailyStart || res.showCurrentBalance || 
                           res.showConsumedToday || res.showSinceLastCheck;
    const showBottomSection = bottomSectionHTML.trim().length > 0;

    const dividerHTML = (showTopSection && showBottomSection) ? `
  <div style="border-top: 1px solid #7c3aed; margin: 10px 0;"></div>
    ` : '';

    // 最終的なHTML組み立て
    const html = `
  ${dailyStartHTML}
  ${currentBalanceHTML}
  ${consumedTodayHTML}
  ${sinceLastCheckHTML}
  ${dividerHTML}
  ${bottomSectionHTML}
`;

    contentDiv.innerHTML = html;
  });
}

const dropdownObserver = new MutationObserver((mutations) => {
  const dropdown = document.querySelector('.n-popover.n-popover-shared');
  
  if (dropdown) {
    const style = window.getComputedStyle(dropdown);
    const isVisible = style.display !== 'none';
    
    if (isVisible && !isPopupOpen) {
      // ポップアップが開いた
      isPopupOpen = true;
      hasProcessedCurrentPopup = false;
      isClosing = false;
      detectionAttemptCount = 0;
      detectedValues = [];
      detectedStrategies = [];
      
      // ★測定開始
      detectionStartTime = performance.now();
      lastAttemptTime = 0;
      attemptTimestamps = [];
      console.log('[Credit Tracker for Genspark] 📊 Detection started');
      
      debugLog('[Credit Tracker for Genspark] Popup opened (via dropdown)');
      
      // トラッカー表示
      const existingTracker = document.getElementById('genspark-embedded-tracker');
      if (!existingTracker) {
        const created = createEmbeddedTracker();
        if (created) {
          updateEmbeddedTracker();
        }
      } else {
        updateEmbeddedTracker();
      }
      
    } else if (!isVisible && isPopupOpen) {
      // ポップアップが閉じ始めた
      isPopupOpen = false;
      isClosing = true;
      debugLog('[Credit Tracker for Genspark] Popup closing (via dropdown)');
      
      // 要素が完全に消えるまで待機する関数（再帰的チェック）
      const waitForElementRemoval = (attemptCount = 0) => {
        const maxAttempts = 20;
        
        const container = document.querySelector('.credit-left-item');
        
        if (!container) {
          // 要素が完全に消えた
          hasProcessedCurrentPopup = false;
          isClosing = false;
          detectedValues = [];
          detectedStrategies = [];
          lastCloseTime = Date.now();
          
          // ★測定終了（確定せずに閉じた場合）
          if (detectionStartTime > 0) {
            const totalTime = performance.now() - detectionStartTime;
            console.log(`[Credit Tracker for Genspark] 📊 Detection aborted (popup closed) - Total: ${totalTime.toFixed(1)}ms`);
            detectionStartTime = 0;
          }
          
          debugLog('[Credit Tracker for Genspark] Popup closed (complete)');
        } else if (attemptCount < maxAttempts) {
          setTimeout(() => waitForElementRemoval(attemptCount + 1), 100);
        } else {
          debugWarn('[Credit Tracker for Genspark] Element removal timeout - forcing reset');
          hasProcessedCurrentPopup = false;
          isClosing = false;
      detectedStrategies = [];
          detectionAttemptCount = 0;
          detectedValues = [];
          detectedStrategies = [];
          lastCloseTime = Date.now();
          detectionStartTime = 0;
        }
      };
      
      waitForElementRemoval();
    }
  }
});


dropdownObserver.observe(document.body, { 
  childList: true, 
  subtree: true,
  attributes: true,
  attributeFilter: ['style', 'class']
});

/**
 * クレジット値の処理（重複チェックと保存）
 */
function processCreditValue(count) {
  if (lastProcessedCount === count) {
    return;
  }
  
  isProcessing = true;
  lastProcessedCount = count;
  
  saveCredit(count, () => {
    const existingTracker = document.getElementById('genspark-embedded-tracker');
    if (existingTracker) {
      updateEmbeddedTracker();
    }
    isProcessing = false;
  });
}

const observer = new MutationObserver(() => {
  if (observerTimeout) {
    clearTimeout(observerTimeout);
  }
  
  observerTimeout = setTimeout(() => {
    if (isProcessing) return;
    if (isClosing) return;
    
    const container = document.querySelector('.credit-left-item');
    
    if (container) {
      // ポップアップが開いている
      
      if (!isPopupOpen) {
        const now = Date.now();
        const timeSinceLastClose = now - lastCloseTime;
        
        if (timeSinceLastClose > 1000 || lastCloseTime === 0) {
          isPopupOpen = true;
      detectedStrategies = [];
          hasProcessedCurrentPopup = false;
          detectionAttemptCount = 0;
          detectedValues = [];
          detectedStrategies = [];
          
          // ★測定開始（fallback detection）
          detectionStartTime = performance.now();
          lastAttemptTime = 0;
          attemptTimestamps = [];
          console.log('[Credit Tracker for Genspark] 📊 Detection started (fallback)');
          
          debugLog('[Credit Tracker for Genspark] Popup opened (fallback detection)');
        } else {
          debugLog('[Credit Tracker for Genspark] Ignoring false positive detection (too soon after close)');
          return;
        }
      }
      
      if (hasProcessedCurrentPopup) {
        return;
      }
      
      // 最大試行回数チェック
      if (detectionAttemptCount >= MAX_DETECTION_ATTEMPTS) {
        debugLog('[Credit Tracker for Genspark] Max detection attempts reached');
        hasProcessedCurrentPopup = true;
        
        // ★測定終了（最大試行到達）
        if (detectionStartTime > 0) {
          const totalTime = performance.now() - detectionStartTime;
          console.log(`[Credit Tracker for Genspark] 📊 Detection ended (max attempts) - Total: ${totalTime.toFixed(1)}ms`);
          printDetectionSummary();
          detectionStartTime = 0;
        }
        
        return;
      }
      
      // ★検出試行のタイムスタンプ記録
      const attemptStartTime = performance.now();
      const timeSinceLastAttempt = lastAttemptTime > 0 
        ? (attemptStartTime - lastAttemptTime).toFixed(1)
        : '0.0';
      
      const result = getCreditValue();
      
      // ★検出処理時間を記録
      const attemptDuration = (performance.now() - attemptStartTime).toFixed(2);
      
      if (result === null) {
        detectionAttemptCount++;
        debugLog(`[Credit Tracker for Genspark] Detection attempt ${detectionAttemptCount}/${MAX_DETECTION_ATTEMPTS}: null (no value found) [took ${attemptDuration}ms, interval ${timeSinceLastAttempt}ms]`);
        
        lastAttemptTime = attemptStartTime;
        attemptTimestamps.push({
          attempt: detectionAttemptCount,
          value: null,
          duration: parseFloat(attemptDuration),
          interval: parseFloat(timeSinceLastAttempt)
        });
        
        // リトライ
        setTimeout(() => {
          const dummy = document.createElement('span');
          dummy.style.display = 'none';
          document.body.appendChild(dummy);
          document.body.removeChild(dummy);
        }, DETECTION_INTERVAL);
        
        return;
      }
      
      // 値を検出した
      detectionAttemptCount++;
      detectedValues.push(result.value);
      detectedStrategies.push(result.strategy);
      debugLog(`[Credit Tracker for Genspark] Detection attempt ${detectionAttemptCount}/${MAX_DETECTION_ATTEMPTS}: ${result.value} (Strategy ${result.strategy}) [took ${attemptDuration}ms, interval ${timeSinceLastAttempt}ms]`);
      
      lastAttemptTime = attemptStartTime;
      attemptTimestamps.push({
        attempt: detectionAttemptCount,
        value: result.value,
        duration: parseFloat(attemptDuration),
        interval: parseFloat(timeSinceLastAttempt)
      });
      
      // 安定性チェック
      const stableValue = checkValueStability();
      
      if (stableValue !== null) {
        debugLog(`[Credit Tracker for Genspark] ✓ Stable value confirmed: ${stableValue} (adopted after ${detectionAttemptCount} attempts)`);
        
        // ★測定終了（値確定）
        if (detectionStartTime > 0) {
          const totalTime = performance.now() - detectionStartTime;
          console.log(`[Credit Tracker for Genspark] 📊 Detection completed - Total: ${totalTime.toFixed(1)}ms`);
          printDetectionSummary();
          detectionStartTime = 0;
        }
        
        
        // ★値が確定したので、使用された戦略をログに記録
        // 確定した値に対応する戦略番号を取得（最後に検出された値の戦略を使用）
        const confirmedStrategyIndex = detectedValues.lastIndexOf(stableValue);
        if (confirmedStrategyIndex !== -1 && confirmedStrategyIndex < detectedStrategies.length) {
          const usedStrategy = detectedStrategies[confirmedStrategyIndex];
          logSuccess(usedStrategy, stableValue);
        }
        
        processCreditValue(stableValue);
        hasProcessedCurrentPopup = true;
      } else {
        // まだ安定していない、リトライ続行
        debugLog(`[Credit Tracker for Genspark] Value not stable yet, continuing detection...`);
        
        // 次の検出を促す
        if (detectionAttemptCount < MAX_DETECTION_ATTEMPTS) {
          setTimeout(() => {
            const dummy = document.createElement('span');
            dummy.style.display = 'none';
            document.body.appendChild(dummy);
            document.body.removeChild(dummy);
          }, DETECTION_INTERVAL);
        }
      }
      
    } else {
      // ポップアップが閉じている
      if (isPopupOpen && !isClosing) {
      detectedStrategies = [];
        isPopupOpen = false;
        hasProcessedCurrentPopup = false;
        detectionAttemptCount = 0;
        detectedValues = [];
        detectedStrategies = [];
        lastCloseTime = Date.now();
        
        // ★測定終了（fallback close）
        if (detectionStartTime > 0) {
          const totalTime = performance.now() - detectionStartTime;
          console.log(`[Credit Tracker for Genspark] 📊 Detection ended (popup closed) - Total: ${totalTime.toFixed(1)}ms`);
          detectionStartTime = 0;
        }
        
        debugLog('[Credit Tracker for Genspark] Popup closed (fallback detection)');
      }
    }
    
  }, DEBOUNCE_DELAY);
});


observer.observe(document.body, { childList: true, subtree: true });

function saveCredit(currentCount, callback) {
  // ★0も保存できるように変更
  chrome.storage.local.get({ 
    history: [], 
    latest: null,
    previousBalance: null 
  }, (data) => {
    if (chrome.runtime.lastError) {
      console.error('[Credit Tracker for Genspark] Storage get failed:', chrome.runtime.lastError);
      if (callback) callback();
      return;
    }

    if (data.latest && data.latest.count === currentCount) {
      if (callback) callback();
      return;
    }

    let history = data.history;
    const now = new Date();
    const todayStr = now.toLocaleDateString();
    const fullTimeStr = now.toLocaleString();

    let newPreviousBalance = data.latest ? data.latest.count : null;

    const latestData = { time: fullTimeStr, count: currentCount };

    let updatedHistory = [...history];
    let isFirstToday = true;

    if (history.length > 0) {
      try {
        const lastEntryTime = history[0].time;
        const lastEntryDate = lastEntryTime.includes(' ') 
          ? lastEntryTime.split(' ')[0] 
          : lastEntryTime.split('T')[0];
        
        if (lastEntryDate === todayStr) {
          isFirstToday = false;
        }
      } catch (error) {
        debugWarn('[Credit Tracker for Genspark] Date parsing error:', error);
        isFirstToday = true;
      }
    }

    if (isFirstToday) {
      updatedHistory.unshift({ time: fullTimeStr, count: currentCount });
      if (updatedHistory.length > 50) updatedHistory.pop();
    }

    const dataToSave = { 
      history: updatedHistory, 
      latest: latestData,
      previousBalance: newPreviousBalance
    };
    
    const estimatedSize = JSON.stringify(dataToSave).length;
    const maxSize = 5 * 1024 * 1024;
    
    if (estimatedSize > maxSize * 0.9) {
      debugWarn('[Credit Tracker for Genspark] Storage nearly full, trimming history');
      updatedHistory = updatedHistory.slice(0, 30);
      dataToSave.history = updatedHistory;
    }

    chrome.storage.local.set(dataToSave, () => {
      if (chrome.runtime.lastError) {
        console.error('[Credit Tracker for Genspark] Storage save failed:', chrome.runtime.lastError);
        
        debugLog('[Credit Tracker for Genspark] Attempting to save with reduced history...');
        
        const reducedData = {
          history: updatedHistory.slice(0, 10),
          latest: latestData,
          previousBalance: newPreviousBalance
        };
        
        chrome.storage.local.set(reducedData, () => {
          if (chrome.runtime.lastError) {
            console.error('[Credit Tracker for Genspark] Retry also failed:', chrome.runtime.lastError);
            chrome.storage.local.set({ latest: latestData }, () => {
              if (chrome.runtime.lastError) {
                console.error('[Credit Tracker for Genspark] Critical: Cannot save any data');
              }
            });
          } else {
            debugLog('[Credit Tracker for Genspark] Saved with reduced history (10 entries)');
            updateSidebarBalance();
          }
          if (callback) callback();
        });
        
        return;
      }
      
      updateSidebarBalance();
      if (callback) callback();
    });
  });
}

/**
 * ストレージ使用状況をチェックし、必要に応じて警告
 */
function checkStorageUsage() {
  chrome.storage.local.getBytesInUse(null, (bytesInUse) => {
    if (chrome.runtime.lastError) {
      console.error('[Credit Tracker for Genspark] Failed to check storage usage:', chrome.runtime.lastError);
      return;
    }
    
    const maxBytes = 5 * 1024 * 1024;
    const usagePercent = (bytesInUse / maxBytes) * 100;
    
    debugLog(`[Credit Tracker for Genspark] Storage usage: ${bytesInUse} bytes (${usagePercent.toFixed(1)}%)`);
    
    const now = Date.now();
    if (usagePercent > 80 && (now - lastStorageWarning) > STORAGE_WARNING_INTERVAL) {
      debugWarn('[Credit Tracker for Genspark] Storage usage is high:', usagePercent.toFixed(1) + '%');
      lastStorageWarning = now;
      
      chrome.storage.local.get({ history: [] }, (data) => {
        if (chrome.runtime.lastError) return;
        
        const history = data.history;
        if (history.length > 30) {
          const trimmedHistory = history.slice(0, 30);
          chrome.storage.local.set({ history: trimmedHistory }, () => {
            if (!chrome.runtime.lastError) {
              debugLog('[Credit Tracker for Genspark] Automatically trimmed history to 30 entries');
            }
          });
        }
      });
    }
  });
}

// Add Current Balance display above sidebar-footer
function addBalanceAboveSidebarFooter() {
  // 既に追加済みかチェック
  if (document.getElementById('balance-display-sidebar')) {
    return true;
  }
  
  // 戦略1: .sidebar-footer を探す（現在の構造）
  let insertionPoint = document.querySelector('.sidebar-footer');
  let insertMethod = 'beforebegin';
  let strategyUsed = 0;
  
  if (insertionPoint) {
    strategyUsed = 1;
    debugLog('[Credit Tracker for Genspark] Sidebar: Strategy 1 succeeded');
  }
  
  // 戦略2: クラス名に sidebar と footer を含む要素
  if (!insertionPoint) {
    const elements = document.querySelectorAll('[class*="sidebar"][class*="footer"]');
    if (elements.length > 0) {
      insertionPoint = elements[0];
      strategyUsed = 2;
      debugLog('[Credit Tracker for Genspark] Sidebar: Strategy 2 succeeded');
    }
  }
  
  // 戦略3: sidebar の最初に追加
  if (!insertionPoint) {
    const sidebar = document.querySelector('.sidebar, [class*="sidebar"]');
    if (sidebar) {
      insertionPoint = sidebar;
      insertMethod = 'prepend';
      strategyUsed = 3;
      debugLog('[Credit Tracker for Genspark] Sidebar: Strategy 3 succeeded');
    }
  }
  
  // 戦略4: footer タグまたは role="contentinfo"
  if (!insertionPoint) {
    insertionPoint = document.querySelector('footer, [role="contentinfo"]');
    if (insertionPoint) {
      strategyUsed = 4;
      debugLog('[Credit Tracker for Genspark] Sidebar: Strategy 4 succeeded');
    }
  }
  
  // 戦略5: 最終手段 - sidebar または nav の最初に追加
  if (!insertionPoint) {
    const containers = document.querySelectorAll('.sidebar, [class*="sidebar"], nav, [role="navigation"]');
    if (containers.length > 0) {
      insertionPoint = containers[0];
      insertMethod = 'prepend';
      strategyUsed = 5;
      debugLog('[Credit Tracker for Genspark] Sidebar: Strategy 5 succeeded');
    }
  }
  
  // すべての戦略が失敗した場合
  if (!insertionPoint) {
    debugWarn('[Credit Tracker for Genspark] Sidebar: All strategies failed - cannot add balance display');
    logSidebarFailure();
    return false;
  }
  
  // 要素を作成
  const balanceDiv = document.createElement('div');
  balanceDiv.id = 'balance-display-sidebar';
  balanceDiv.style.cssText = `
    padding: 10px !important;
    text-align: center !important;
    color: white !important;
    background: rgba(0, 0, 0, 0.85) !important;
    border-radius: 5px !important;
    margin: 8px 8px 8px 2px !important;
    display: block !important;
    visibility: visible !important;
    position: relative !important;
    z-index: 1 !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
    max-width: 90% !important;
    box-sizing: border-box !important;
  `;
  balanceDiv.innerHTML = `
    <div style="font-size: 11px; margin-bottom: 4px; opacity: 0.8;">[Log] Current Balance</div>
    <div id="balance-value-sidebar" style="font-size: 16px; font-weight: bold;">---</div>
  `;
  
  // 挿入
  try {
    if (insertMethod === 'beforebegin') {
      insertionPoint.insertAdjacentElement('beforebegin', balanceDiv);
    } else if (insertMethod === 'prepend') {
      insertionPoint.insertAdjacentElement('afterbegin', balanceDiv);
    } else {
      insertionPoint.appendChild(balanceDiv);
    }
    debugLog(`[Credit Tracker for Genspark] Sidebar balance added successfully (Strategy ${strategyUsed})`);
    updateSidebarBalance();
    return true;
  } catch (error) {
    console.error('[Credit Tracker for Genspark] Failed to insert sidebar balance:', error);
    logSidebarFailure();
    return false;
  }
}

// Update sidebar balance display
function updateSidebarBalance() {
  const balanceValueDiv = document.getElementById('balance-value-sidebar');
  if (!balanceValueDiv) return;
  
  chrome.storage.local.get({ latest: null }, (res) => {
    if (chrome.runtime.lastError) {
      console.error('[Credit Tracker for Genspark] Failed to update sidebar balance:', chrome.runtime.lastError);
      balanceValueDiv.textContent = 'ERROR';
      return;
    }
    
    if (res.latest && res.latest.count !== undefined) {
      balanceValueDiv.textContent = res.latest.count;
    } else {
      balanceValueDiv.textContent = '---';
    }
  });
}

// MutationObserver with debounce
let sidebarObserverTimeout = null;
let sidebarInitialLoadComplete = false;

const sidebarObserver = new MutationObserver(() => {
  // 初回読み込み完了後のみ動作
  if (!sidebarInitialLoadComplete) {
    debugLog('[Credit Tracker for Genspark] Observer triggered but ignoring (initial load not complete)');
    return;
  }
  
  // 既存のタイムアウトをキャンセル（デバウンス）
  if (sidebarObserverTimeout) {
    clearTimeout(sidebarObserverTimeout);
  }
  
  // 100ms 後に実行（DOM の更新完了を待つ）
  sidebarObserverTimeout = setTimeout(() => {
    debugLog('[Credit Tracker for Genspark] Observer triggered, adding sidebar balance');
    addBalanceAboveSidebarFooter();
  }, 100);
});

sidebarObserver.observe(document.body, { 
  childList: true, 
  subtree: true 
});

// 初回呼び出し（リトライ付き）
let sidebarRetryCount = 0;
const MAX_SIDEBAR_RETRIES = 5;

function tryAddSidebarWithRetry() {
  // 既に追加済みかチェック
  if (document.getElementById('balance-display-sidebar')) {
    debugLog('[Credit Tracker for Genspark] Sidebar balance already exists');
    sidebarInitialLoadComplete = true;
    debugLog('[Credit Tracker for Genspark] Observer enabled');
    return;
  }
  
  // .sidebar-footer が存在するかチェック
  const sidebarFooter = document.querySelector('.sidebar-footer');
  
  if (sidebarFooter) {
    // 存在する場合は Strategy 1 が使える
    debugLog('[Credit Tracker for Genspark] Initial call, adding sidebar balance (.sidebar-footer found)');
    addBalanceAboveSidebarFooter();
    
    // Observer を有効化
    setTimeout(() => {
      sidebarInitialLoadComplete = true;
      debugLog('[Credit Tracker for Genspark] Observer enabled');
    }, 500);
    
  } else if (sidebarRetryCount < MAX_SIDEBAR_RETRIES) {
    // 見つからない場合はリトライ
    sidebarRetryCount++;
    debugLog(`[Credit Tracker for Genspark] .sidebar-footer not found, retry ${sidebarRetryCount}/${MAX_SIDEBAR_RETRIES} in 500ms`);
    
    setTimeout(tryAddSidebarWithRetry, 500);
    
  } else {
    // 最大リトライ回数に達したらフォールバック
    debugLog('[Credit Tracker for Genspark] Max retries reached, falling back to Strategy 3');
    addBalanceAboveSidebarFooter();
    
    // Observer を有効化
    setTimeout(() => {
      sidebarInitialLoadComplete = true;
      debugLog('[Credit Tracker for Genspark] Observer enabled');
    }, 500);
  }
}

// 初回呼び出し開始
setTimeout(tryAddSidebarWithRetry, 1000);

// 初回ストレージチェック
setTimeout(checkStorageUsage, 5000);

// 1時間ごとにストレージチェック
setInterval(checkStorageUsage, 3600000);

// popup.jsからの更新通知を受け取るリスナー
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateDisplay') {
    debugLog('[Credit Tracker for Genspark] Received display update request from popup');
    updateEmbeddedTracker();
    sendResponse({status: 'updated'});
  }
});
