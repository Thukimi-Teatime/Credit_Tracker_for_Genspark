document.addEventListener('DOMContentLoaded', () => {
  const lastSuccessDiv = document.getElementById('lastSuccess');
  const stageStatsDiv = document.getElementById('stageStats');
  const failureLogsDiv = document.getElementById('failureLogs');
  const successHistoryDiv = document.getElementById('successHistory');
  const sidebarFailuresDiv = document.getElementById('sidebarFailures');
  const sidebarStageStatsDiv = document.getElementById('sidebarStageStats');
  const exportBtn = document.getElementById('exportBtn');
  const clearBtn = document.getElementById('clearBtn');

  // Load data
  chrome.storage.local.get({
    stageStats: {},
    sidebarStageStats: {},
    failureLogs: [],
    successHistory: [],
    sidebarFailureLogs: []
  }, (data) => {
    if (chrome.runtime.lastError) {
      lastSuccessDiv.textContent = '';
      const span = document.createElement('span');
      span.className = 'error';
      span.textContent = 'Failed to load data';
      lastSuccessDiv.appendChild(span);
      return;
    }

    // Last success
    const lastSuccess = data.stageStats.lastSuccess;
    if (lastSuccess) {
      const timeStr = new Date(lastSuccess.time).toLocaleString();

      lastSuccessDiv.textContent = '';
      const statGrid = document.createElement('div');
      statGrid.className = 'stat-grid';

      const createStatItem = (label, value, valueClass = '') => {
        const labelDiv = document.createElement('div');
        labelDiv.className = 'stat-label';
        labelDiv.textContent = label;

        const valueDiv = document.createElement('div');
        valueDiv.className = `stat-value ${valueClass}`.trim();
        valueDiv.textContent = value;

        statGrid.appendChild(labelDiv);
        statGrid.appendChild(valueDiv);
      };

      createStatItem('Stage:', `Stage ${lastSuccess.stage}`, 'success');
      createStatItem('Time:', timeStr);
      createStatItem('Credit Value:', lastSuccess.value);

      lastSuccessDiv.appendChild(statGrid);

    } else {
      lastSuccessDiv.textContent = '';
      const span = document.createElement('span');
      span.className = 'error';
      span.textContent = 'No success recorded yet';
      lastSuccessDiv.appendChild(span);
    }

    // Stage statistics (3 Stage spec)
    const stats = data.stageStats;
    let statsText = '';
    let totalAttempts = 0;
    for (let i = 1; i <= 3; i++) {
      const key = `stage_${i}`;
      const count = stats[key] || 0;
      totalAttempts += count;
      statsText += `Stage ${i}:    ${count.toString().padStart(4, ' ')} times\n`;
    }
    statsText += `${'─'.repeat(25)}\n`;
    statsText += `Total:      ${totalAttempts.toString().padStart(4, ' ')} times`;

    stageStatsDiv.textContent = '';
    const statsPre = document.createElement('pre');
    statsPre.textContent = statsText;
    stageStatsDiv.appendChild(statsPre);

    // Success history
    const successes = data.successHistory;
    if (successes.length === 0) {
      successHistoryDiv.textContent = '';
      const span = document.createElement('span');
      span.className = 'warning';
      span.textContent = 'No history recorded yet';
      successHistoryDiv.appendChild(span);
    } else {
      let histText = '';
      histText += 'Time           | Stage | Credit\n';
      histText += '───────────────┼───────┼────────\n';
      successes.slice(-10).reverse().forEach((log) => {
        const time = log.time.split('T')[1]?.split('.')[0] || log.time;
        const timeStr = time.padEnd(14, ' ');
        const stageStr = `ST${log.stage}`.padEnd(5, ' ');
        const valueStr = log.value.toString().padStart(6, ' ');
        histText += `${timeStr} | ${stageStr} | ${valueStr}\n`;
      });

      successHistoryDiv.textContent = '';
      const histPre = document.createElement('pre');
      histPre.textContent = histText;
      successHistoryDiv.appendChild(histPre);
    }

    // Failure log
    const failures = data.failureLogs;
    if (failures.length === 0) {
      failureLogsDiv.textContent = '';
      const span = document.createElement('span');
      span.className = 'success';
      span.textContent = 'No failures recorded ✓';
      failureLogsDiv.appendChild(span);
    } else {
      failureLogsDiv.textContent = '';

      const countDiv = document.createElement('div');
      countDiv.className = 'error';
      countDiv.textContent = `${failures.length} failure(s) recorded`;
      failureLogsDiv.appendChild(countDiv);

      let failText = '';
      failures.slice(-3).reverse().forEach((log, idx) => {
        failText += `\n${'═'.repeat(50)}\n`;
        failText += `Failure ${failures.length - idx}\n`;
        failText += `${'─'.repeat(50)}\n`;
        failText += `Time: ${log.time}\n`;
        failText += `URL:  ${log.url}\n`;

        if (log.selectors) {
          failText += `\nSelector Availability:\n`;
          for (const [key, value] of Object.entries(log.selectors)) {
            const status = value ? '✓ Found' : '✗ Not Found';
            failText += `  ${key.padEnd(20, ' ')}: ${status}\n`;
          }
        }

        if (log.allClasses && log.allClasses.length > 0) {
          failText += `\nDetected Classes:\n`;
          log.allClasses.slice(0, 5).forEach(className => {
            failText += `  - ${className}\n`;
          });
          if (log.allClasses.length > 5) {
            failText += `  ... and ${log.allClasses.length - 5} more\n`;
          }
        }
      });

      const failPre = document.createElement('pre');
      failPre.textContent = failText;
      failureLogsDiv.appendChild(failPre);

      if (failures.length > 3) {
        const infoDiv = document.createElement('div');
        infoDiv.className = 'info-text';
        infoDiv.textContent = `Showing last 3 of ${failures.length} failures. Export data to see all.`;
        failureLogsDiv.appendChild(infoDiv);
      }
    }

    // Sidebar failure log
    const sidebarLogs = data.sidebarFailureLogs;
    if (sidebarLogs.length === 0) {
      sidebarFailuresDiv.textContent = '';
      const span = document.createElement('span');
      span.className = 'success';
      span.textContent = 'No sidebar failures recorded ✓';
      sidebarFailuresDiv.appendChild(span);
    } else {
      sidebarFailuresDiv.textContent = '';

      const countDiv = document.createElement('div');
      countDiv.className = 'warning';
      countDiv.textContent = `${sidebarLogs.length} sidebar failure(s) recorded`;
      sidebarFailuresDiv.appendChild(countDiv);

      let sidebarText = '';
      sidebarLogs.slice(-3).reverse().forEach((log, idx) => {
        sidebarText += `\n${'═'.repeat(50)}\n`;
        sidebarText += `Sidebar Failure ${sidebarLogs.length - idx}\n`;
        sidebarText += `${'─'.repeat(50)}\n`;
        sidebarText += `Time: ${log.time}\n`;

        if (log.selectors) {
          sidebarText += `\nSelector Availability:\n`;
          for (const [key, value] of Object.entries(log.selectors)) {
            const status = value ? '✓ Found' : '✗ Not Found';
            sidebarText += `  ${key.padEnd(20, ' ')}: ${status}\n`;
          }
        }

        if (log.sidebarClasses && log.sidebarClasses.length > 0) {
          sidebarText += `\nSidebar Classes:\n`;
          log.sidebarClasses.slice(0, 3).forEach(className => {
            sidebarText += `  - ${className}\n`;
          });
          if (log.sidebarClasses.length > 3) {
            sidebarText += `  ... and ${log.sidebarClasses.length - 3} more\n`;
          }
        }

        if (log.footerClasses && log.footerClasses.length > 0) {
          sidebarText += `\nFooter Classes:\n`;
          log.footerClasses.slice(0, 3).forEach(className => {
            sidebarText += `  - ${className}\n`;
          });
          if (log.footerClasses.length > 3) {
            sidebarText += `  ... and ${log.footerClasses.length - 3} more\n`;
          }
        }
      });

      const sidebarPre = document.createElement('pre');
      sidebarPre.textContent = sidebarText;
      sidebarFailuresDiv.appendChild(sidebarPre);

      if (sidebarLogs.length > 3) {
        const infoDiv = document.createElement('div');
        infoDiv.className = 'info-text';
        infoDiv.textContent = `Showing last 3 of ${sidebarLogs.length} failures. Export data to see all.`;
        sidebarFailuresDiv.appendChild(infoDiv);
      }
    }

    // Sidebar stage statistics
    const sbStats = data.sidebarStageStats || {};
    let sbStatsText = '';
    let sbTotal = 0;
    for (let i = 1; i <= 3; i++) {
      const key = `stage_${i}`;
      const count = sbStats[key] || 0;
      sbTotal += count;
      sbStatsText += `Stage ${i}:    ${count.toString().padStart(4, ' ')} times\n`;
    }
    sbStatsText += `${'─'.repeat(25)}\n`;
    sbStatsText += `Total:      ${sbTotal.toString().padStart(4, ' ')} times`;
    if (sbStats.lastSuccess) {
      sbStatsText += `\nLatest:     Stage ${sbStats.lastSuccess.stage} (${new Date(sbStats.lastSuccess.time).toLocaleTimeString()})`;
    }

    sidebarStageStatsDiv.textContent = '';
    const sbStatsPre = document.createElement('pre');
    sbStatsPre.textContent = sbStatsText;
    sidebarStageStatsDiv.appendChild(sbStatsPre);
  });

  // Export function
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

  // Log clear function
  clearBtn.addEventListener('click', () => {
    const confirmation = confirm(
      'Clear all diagnostic logs?\n\n' +
      '✓ Clears: Stage stats, success history, failure logs, sidebar failures\n' +
      '✓ Preserves: User data (credit history, settings)\n\n' +
      'Continue?'
    );

    if (confirmation) {
      chrome.storage.local.set({
        failureLogs: [],
        stageStats: {},
        sidebarStageStats: {},
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
