document.addEventListener('DOMContentLoaded', () => {
  const lastSuccessDiv = document.getElementById('lastSuccess');
  const strategyStatsDiv = document.getElementById('strategyStats');
  const failureLogsDiv = document.getElementById('failureLogs');
  const successHistoryDiv = document.getElementById('successHistory');
  const sidebarFailuresDiv = document.getElementById('sidebarFailures');
  const exportBtn = document.getElementById('exportBtn');
  const clearBtn = document.getElementById('clearBtn');
  
  // データ読み込み
  chrome.storage.local.get({
    strategyStats: {},
    failureLogs: [],
    successHistory: [],
    sidebarFailureLogs: []
  }, (data) => {
    if (chrome.runtime.lastError) {
      lastSuccessDiv.innerHTML = '<span class="error">Failed to load data</span>';
      return;
    }
    
    // 最後の成功
    const lastSuccess = data.strategyStats.lastSuccess;
    if (lastSuccess) {
      const timeStr = new Date(lastSuccess.time).toLocaleString();
      lastSuccessDiv.innerHTML = `
        <div class="stat-grid">
          <div class="stat-label">Strategy:</div>
          <div class="stat-value success">Strategy ${lastSuccess.strategy}</div>
          <div class="stat-label">Time:</div>
          <div class="stat-value">${timeStr}</div>
          <div class="stat-label">Credit Value:</div>
          <div class="stat-value">${lastSuccess.value}</div>
        </div>
      `;
    } else {
      lastSuccessDiv.innerHTML = '<span class="error">No success recorded yet</span>';
    }
    
    // 戦略統計
    const stats = data.strategyStats;
    let statsHTML = '<pre>';
    let totalAttempts = 0;
    for (let i = 1; i <= 5; i++) {
      const key = `strategy_${i}`;
      const count = stats[key] || 0;
      totalAttempts += count;
      statsHTML += `Strategy ${i}: ${count.toString().padStart(4, ' ')} times\n`;
    }
    statsHTML += `${'─'.repeat(25)}\n`;
    statsHTML += `Total:      ${totalAttempts.toString().padStart(4, ' ')} times`;
    statsHTML += '</pre>';
    strategyStatsDiv.innerHTML = statsHTML;
    
    // 成功履歴
    const successes = data.successHistory;
    if (successes.length === 0) {
      successHistoryDiv.innerHTML = '<span class="warning">No history recorded yet</span>';
    } else {
      let histHTML = '<pre>';
      histHTML += 'Time           | Strategy | Credit\n';
      histHTML += '───────────────┼──────────┼────────\n';
      successes.slice(-10).reverse().forEach((log) => {
        const time = log.time.split('T')[1]?.split('.')[0] || log.time;
        const timeStr = time.padEnd(14, ' ');
        const strategyStr = `S${log.strategy}`.padEnd(9, ' ');
        const valueStr = log.value.toString().padStart(6, ' ');
        histHTML += `${timeStr} | ${strategyStr} | ${valueStr}\n`;
      });
      histHTML += '</pre>';
      successHistoryDiv.innerHTML = histHTML;
    }
    
    // 失敗ログ
    const failures = data.failureLogs;
    if (failures.length === 0) {
      failureLogsDiv.innerHTML = '<span class="success">No failures recorded ✓</span>';
    } else {
      let failHTML = `<div class="error">${failures.length} failure(s) recorded</div>`;
      failHTML += '<pre>';
      
      failures.slice(-3).reverse().forEach((log, idx) => {
        failHTML += `\n${'═'.repeat(50)}\n`;
        failHTML += `Failure ${failures.length - idx}\n`;
        failHTML += `${'─'.repeat(50)}\n`;
        failHTML += `Time: ${log.time}\n`;
        failHTML += `URL:  ${log.url}\n`;
        
        if (log.selectors) {
          failHTML += `\nSelector Availability:\n`;
          for (const [key, value] of Object.entries(log.selectors)) {
            const status = value ? '✓ Found' : '✗ Not Found';
            failHTML += `  ${key.padEnd(20, ' ')}: ${status}\n`;
          }
        }
        
        if (log.allClasses && log.allClasses.length > 0) {
          failHTML += `\nDetected Classes:\n`;
          log.allClasses.slice(0, 5).forEach(className => {
            failHTML += `  - ${className}\n`;
          });
          if (log.allClasses.length > 5) {
            failHTML += `  ... and ${log.allClasses.length - 5} more\n`;
          }
        }
      });
      
      failHTML += '</pre>';
      
      if (failures.length > 3) {
        failHTML += `<div class="info-text">Showing last 3 of ${failures.length} failures. Export data to see all.</div>`;
      }
      
      failureLogsDiv.innerHTML = failHTML;
    }
    
    // サイドバー失敗ログ
    const sidebarLogs = data.sidebarFailureLogs;
    if (sidebarLogs.length === 0) {
      sidebarFailuresDiv.innerHTML = '<span class="success">No sidebar failures recorded ✓</span>';
    } else {
      let sidebarHTML = `<div class="warning">${sidebarLogs.length} sidebar failure(s) recorded</div>`;
      sidebarHTML += '<pre>';
      
      sidebarLogs.slice(-3).reverse().forEach((log, idx) => {
        sidebarHTML += `\n${'═'.repeat(50)}\n`;
        sidebarHTML += `Sidebar Failure ${sidebarLogs.length - idx}\n`;
        sidebarHTML += `${'─'.repeat(50)}\n`;
        sidebarHTML += `Time: ${log.time}\n`;
        
        if (log.selectors) {
          sidebarHTML += `\nSelector Availability:\n`;
          for (const [key, value] of Object.entries(log.selectors)) {
            const status = value ? '✓ Found' : '✗ Not Found';
            sidebarHTML += `  ${key.padEnd(20, ' ')}: ${status}\n`;
          }
        }
        
        if (log.sidebarClasses && log.sidebarClasses.length > 0) {
          sidebarHTML += `\nSidebar Classes:\n`;
          log.sidebarClasses.slice(0, 3).forEach(className => {
            sidebarHTML += `  - ${className}\n`;
          });
          if (log.sidebarClasses.length > 3) {
            sidebarHTML += `  ... and ${log.sidebarClasses.length - 3} more\n`;
          }
        }
        
        if (log.footerClasses && log.footerClasses.length > 0) {
          sidebarHTML += `\nFooter Classes:\n`;
          log.footerClasses.slice(0, 3).forEach(className => {
            sidebarHTML += `  - ${className}\n`;
          });
          if (log.footerClasses.length > 3) {
            sidebarHTML += `  ... and ${log.footerClasses.length - 3} more\n`;
          }
        }
      });
      
      sidebarHTML += '</pre>';
      
      if (sidebarLogs.length > 3) {
        sidebarHTML += `<div class="info-text">Showing last 3 of ${sidebarLogs.length} failures. Export data to see all.</div>`;
      }
      
      sidebarFailuresDiv.innerHTML = sidebarHTML;
    }
  });
  
  // エクスポート機能
  exportBtn.addEventListener('click', () => {
    chrome.storage.local.get(null, (allData) => {
      if (chrome.runtime.lastError) {
        alert('Failed to export data: ' + chrome.runtime.lastError.message);
        return;
      }
      
      const dataStr = JSON.stringify(allData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `credit-tracker-for-genspark-diagnostic-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  });
  
  // ログクリア機能
  clearBtn.addEventListener('click', () => {
    const confirmation = confirm(
      'Clear all diagnostic logs?\n\n' +
      '✓ Clears: Strategy stats, success history, failure logs, sidebar failures\n' +
      '✓ Preserves: User data (credit history, settings)\n\n' +
      'Continue?'
    );
    
    if (confirmation) {
      chrome.storage.local.set({
        failureLogs: [],
        strategyStats: {},
        successHistory: [],
        sidebarFailureLogs: []
      }, () => {
        if (chrome.runtime.lastError) {
          alert('Failed to clear logs: ' + chrome.runtime.lastError.message);
        } else {
          alert('Diagnostic logs cleared successfully!');
          location.reload();
        }
      });
    }
  });
});
