// ========================================
// UI Graph Module
// ========================================

(function () {
    const Logger = window.GensparkTracker.Utils.Logger;
    const UICommon = window.GensparkTracker.UI.Common;

    const Graph = {
        panelId: 'genspark-graph-panel',
        overlayId: 'genspark-graph-overlay',

        toggleGraphPanel: function () {
            let panel = document.getElementById(this.panelId);
            if (panel) {
                this.close();
                return;
            }

            this.createGraphPanel();
        },

        close: function () {
            const panel = document.getElementById(this.panelId);
            const overlay = document.getElementById(this.overlayId);
            if (!panel || !overlay) return;

            // Prevent double close if animation is already running
            if (panel.classList.contains('closing')) return;
            panel.classList.add('closing');

            // Apply fade-out/scale-down animations
            panel.style.animation = 'scale-down 0.2s ease-in forwards';
            overlay.style.animation = 'fade-out-overlay 0.2s ease-in forwards';

            // Wait for animation to finish before removing from DOM
            setTimeout(() => {
                if (panel) panel.remove();
                if (overlay) overlay.remove();
            }, 200);
        },

        createGraphPanel: function () {
            // Create Overlay
            const overlay = document.createElement('div');
            overlay.id = this.overlayId;
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(15, 23, 42, 0.7);
                backdrop-filter: blur(8px);
                z-index: 9999;
                animation: fade-in-overlay 0.3s ease-out;
            `;
            overlay.onclick = () => this.close();

            // Create Panel (Scaled 1.2x from 700px -> 840px)
            const panel = document.createElement('div');
            panel.id = this.panelId;
            panel.style.cssText = `
                position: fixed;
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%);
                width: 840px;
                background: #0f172a;
                border: 2px solid #1e293b;
                border-radius: 16px;
                padding: 35px;
                color: #e2e8f0;
                box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.9), 0 0 20px rgba(16, 185, 129, 0.15);
                z-index: 10000;
                font-family: 'JetBrains Mono', 'Fira Code', monospace;
                animation: scale-up 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            `;

            panel.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 30px;">
                    <div>
                        <div style="font-weight: 900; font-size: 24px; color: #10b981; text-transform: uppercase; letter-spacing: 2px;">Consumption Draft</div>
                        <div style="display: flex; align-items: center; gap: 12px; margin-top: 6px;">
                            <div style="font-size: 12px; color: #64748b; font-weight: 700;">If the display looks incorrect, please check 'Renewal Day' and 'Plan Configuration' settings.</div>
                            <button id="graph-settings-btn" style="background: none; border: 1px solid #334155; color: #94a3b8; cursor: pointer; font-size: 9px; padding: 4px 10px; border-radius: 4px; transition: all 0.2s; font-weight: 600; font-family: inherit; display: flex; align-items: center; gap: 6px;">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                    <circle cx="12" cy="12" r="3"></circle>
                                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                                </svg>
                                SETTING
                            </button>
                        </div>
                        <div style="font-size: 11px; color: #64748b; margin-top: 4px; line-height: 1.4;">
                            The graph is calculated based on the last retrieved "Current Credit". To view the latest graph, please open the profile icon to update the "Current Credit".
                        </div>
                    </div>
                    <button id="close-graph-btn" style="background: none; border: 2px solid #1e293b; color: #94a3b8; cursor: pointer; font-size: 24px; width: 40px; height: 40px; border-radius: 6px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; font-weight: bold;">&times;</button>
                </div>
                <!-- SVG Container (Scaled 1.2x from 400px -> 480px) -->
                <div id="svg-graph-container" style="width: 100%; height: 480px; background: #020617; border: 2px solid #1e293b; border-radius: 6px; position: relative; overflow: visible;">
                    <!-- SVG will be injected here -->
                </div>
                <div style="display: flex; gap: 80px; margin-top: 30px; padding-top: 25px; border-top: 2px solid #1e293b;">
                    <div>
                        <div style="font-size: 12px; color: #64748b; margin-bottom: 8px; font-weight: 800;">CURRENT CREDIT</div>
                        <div id="graph-stat-current" style="font-size: 22px; font-weight: 900; color: #10b981;">---</div>
                    </div>
                    <div>
                        <div style="font-size: 12px; color: #64748b; margin-bottom: 8px; font-weight: 800;">IDEAL CREDIT (EST)</div>
                        <div id="graph-stat-ideal" style="font-size: 22px; font-weight: 900; color: #e2e8f0;">---</div>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);
            document.body.appendChild(panel);

            const closeBtn = document.getElementById('close-graph-btn');
            closeBtn.onmouseenter = () => {
                closeBtn.style.borderColor = '#ef4444';
                closeBtn.style.color = '#ef4444';
                closeBtn.style.background = 'rgba(239, 68, 68, 0.1)';
            };
            closeBtn.onmouseleave = () => {
                closeBtn.style.borderColor = '#1e293b';
                closeBtn.style.color = '#94a3b8';
                closeBtn.style.background = 'none';
            };
            closeBtn.onclick = () => this.close();

            const settingsBtn = document.getElementById('graph-settings-btn');
            settingsBtn.onmouseenter = () => {
                settingsBtn.style.borderColor = '#94a3b8';
                settingsBtn.style.color = '#e2e8f0';
            };
            settingsBtn.onmouseleave = () => {
                settingsBtn.style.borderColor = '#334155';
                settingsBtn.style.color = '#94a3b8';
            };
            settingsBtn.onclick = () => this.openSettingsOverlay();

            this.renderSVG();
        },

        // Open settings as an iframe overlay
        openSettingsOverlay: function () {
            if (document.getElementById('genspark-settings-overlay')) return;

            const overlay = document.createElement('div');
            overlay.id = 'genspark-settings-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.6);
                backdrop-filter: blur(4px);
                z-index: 100000;
                display: flex;
                justify-content: center;
                align-items: center;
                animation: fade-in-overlay 0.3s ease-out forwards;
            `;

            const panel = document.createElement('div');
            panel.id = 'genspark-settings-panel';
            panel.style.cssText = `
                width: 660px;
                height: 620px;
                background: #ffffff;
                border-radius: 12px;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                position: relative;
                overflow: hidden;
                animation: scale-up-settings 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                display: flex;
                flex-direction: column;
            `;

            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '&times;';
            closeBtn.style.cssText = `
                position: absolute;
                top: 10px;
                right: 15px;
                font-size: 28px;
                background: none;
                border: none;
                color: #64748b;
                cursor: pointer;
                z-index: 100001;
                line-height: 1;
                padding: 5px;
                transition: color 0.2s;
            `;
            closeBtn.onmouseover = () => { closeBtn.style.color = '#1e293b'; };
            closeBtn.onmouseout = () => { closeBtn.style.color = '#64748b'; };
            closeBtn.onclick = () => this.closeSettingsOverlay();

            const iframe = document.createElement('iframe');
            iframe.src = chrome.runtime.getURL('popup.html');
            iframe.style.cssText = `
                width: 100%;
                height: 100%;
                border: none;
                background: white;
            `;

            panel.appendChild(closeBtn);
            panel.appendChild(iframe);
            overlay.appendChild(panel);

            overlay.onclick = (e) => {
                if (e.target === overlay) this.closeSettingsOverlay();
            };

            document.body.appendChild(overlay);
        },

        // Close settings overlay with animation
        closeSettingsOverlay: function () {
            const overlay = document.getElementById('genspark-settings-overlay');
            const panel = document.getElementById('genspark-settings-panel');
            if (!overlay || !panel) return;

            if (overlay.classList.contains('closing')) return;
            overlay.classList.add('closing');

            overlay.style.animation = 'fade-out-overlay 0.2s ease-in forwards';
            panel.style.animation = 'scale-down-settings 0.2s ease-in forwards';

            setTimeout(() => {
                if (overlay) overlay.remove();
            }, 200);
        },

        renderSVG: function () {
            const container = document.getElementById('svg-graph-container');
            if (!container) return;

            chrome.storage.local.get({
                planStartCredit: 10000,
                purchasedCredits: 0,
                latest: null,
                renewalDay: 1
            }, (res) => {
                const totalCapacity = (res.planStartCredit || 10000) + (res.purchasedCredits || 0);
                const currentBalance = res.latest ? res.latest.count : 0;
                const renewalDay = res.renewalDay || 1;

                const now = new Date();
                let periodStart = new Date(now.getFullYear(), now.getMonth(), renewalDay);
                if (now.getDate() < renewalDay) periodStart.setMonth(periodStart.getMonth() - 1);
                let periodEnd = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, renewalDay);

                const totalTime = periodEnd - periodStart;
                const totalDays = totalTime / (1000 * 60 * 60 * 24);
                const timeProgress = Math.min(1, Math.max(0, (now - periodStart) / totalTime));

                const idealBalance = totalCapacity * (1 - timeProgress);
                const creditGap = currentBalance - idealBalance;
                const dailyPace = totalCapacity / totalDays;
                const daysGap = dailyPace > 0 ? (creditGap / dailyPace) : 0;

                // Update Stats
                document.getElementById('graph-stat-current').innerText = currentBalance.toLocaleString();
                document.getElementById('graph-stat-ideal').innerText = Math.round(idealBalance).toLocaleString();

                // SVG Config
                const width = container.clientWidth;
                const height = container.clientHeight;
                const marginTop = 70;
                const marginBottom = 100;
                const marginLeft = 120;
                const marginRight = 150; // Increased to accommodate horizontal gap text

                const frameWidth = width - marginLeft - marginRight;
                const frameHeight = height - marginTop - marginBottom;

                const getX = (p) => marginLeft + p * frameWidth;
                const getY = (c) => marginTop + (1 - (c / totalCapacity)) * frameHeight;

                const currentX = getX(timeProgress);
                const actualY = getY(currentBalance);
                const idealYAtCurrentX = getY(idealBalance);
                const idealXForActualY = getX(1 - (currentBalance / totalCapacity));

                const formatDate = (date) => `${date.getMonth() + 1}/${date.getDate()}`;

                let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" style="font-family: inherit;">
                    <defs>
                        <pattern id="grid" width="${frameWidth / 10}" height="${frameHeight / 10}" patternUnits="userSpaceOnUse">
                            <path d="M ${frameWidth / 10} 0 L 0 0 0 ${frameHeight / 10}" fill="none" stroke="#1e293b" stroke-width="0.7"/>
                        </pattern>
                        <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto">
                            <polygon points="0 0, 8 4, 0 8" fill="#10b981" />
                        </marker>
                        <!-- Backwards arrow for bidirectional arrows -->
                        <marker id="arrowhead-back" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto-start-reverse">
                            <polygon points="0 0, 8 4, 0 8" fill="#10b981" />
                        </marker>
                    </defs>

                    <!-- Background Grid -->
                    <rect x="${marginLeft}" y="${marginTop}" width="${frameWidth}" height="${frameHeight}" fill="url(#grid)" />
                    
                    <!-- Main Frame -->
                    <rect x="${marginLeft}" y="${marginTop}" width="${frameWidth}" height="${frameHeight}" fill="none" stroke="#334155" stroke-width="2" />

                    <!-- Ideal Pace Line (Reference) -->
                    <line x1="${getX(0)}" y1="${getY(totalCapacity)}" x2="${getX(1)}" y2="${getY(0)}" stroke="rgba(100, 116, 139, 0.5)" stroke-width="2" stroke-dasharray="10 5" />

                    <!-- Dimension Extension Lines (External) -->
                    <!-- Top Dimension (Time Gap) -->
                    <line x1="${currentX}" y1="${actualY}" x2="${currentX}" y2="${marginTop - 28}" stroke="#10b981" stroke-width="1.5" stroke-opacity="0.6" />
                    <line x1="${idealXForActualY}" y1="${actualY}" x2="${idealXForActualY}" y2="${marginTop - 28}" stroke="#10b981" stroke-width="1.5" stroke-opacity="0.6" />
                    
                    <!-- Right Dimension (Credit Gap) -->
                    <line x1="${currentX}" y1="${actualY}" x2="${width - marginRight + 35}" y2="${actualY}" stroke="#10b981" stroke-width="1.5" stroke-opacity="0.6" />
                    <line x1="${currentX}" y1="${idealYAtCurrentX}" x2="${width - marginRight + 35}" y2="${idealYAtCurrentX}" stroke="#10b981" stroke-width="1.5" stroke-opacity="0.6" />

                    <!-- Internal Logic Indicators (Dashed) -->
                    <line x1="${currentX}" y1="${actualY}" x2="${idealXForActualY}" y2="${actualY}" stroke="#10b981" stroke-width="2" stroke-dasharray="4 4" />
                    <line x1="${currentX}" y1="${actualY}" x2="${currentX}" y2="${idealYAtCurrentX}" stroke="#10b981" stroke-width="2" stroke-dasharray="4 4" />

                    <!-- Projection Lines to Axes -->
                    <line x1="${currentX}" y1="${actualY}" x2="${marginLeft}" y2="${actualY}" stroke="rgba(16, 185, 129, 0.3)" stroke-width="1.2" stroke-dasharray="5 3" />
                    <line x1="${currentX}" y1="${actualY}" x2="${currentX}" y2="${height - marginBottom + 55}" stroke="rgba(16, 185, 129, 0.3)" stroke-width="1.2" stroke-dasharray="5 3" />

                    <!-- Dimension Arrows & Text (Larger & Bolder) -->
                    <!-- Day Gap Arrow (Bidirectional) -->
                    <g transform="translate(0, ${marginTop - 20})">
                        <line x1="${currentX}" y1="0" x2="${idealXForActualY}" y2="0" stroke="#10b981" stroke-width="1.5" marker-start="url(#arrowhead-back)" marker-end="url(#arrowhead)" />
                        <text x="${(currentX + idealXForActualY) / 2}" y="-12" fill="#10b981" font-size="14" text-anchor="middle" font-weight="900">
                            ${daysGap >= 0 ? '+' : ''}${daysGap.toFixed(1)} DAYS
                        </text>
                    </g>

                    <!-- Credit Gap Arrow (Bidirectional & Horizontal Text) -->
                    <g transform="translate(${width - marginRight + 25}, 0)">
                        <line x1="0" y1="${actualY}" x2="0" y2="${idealYAtCurrentX}" stroke="#10b981" stroke-width="1.5" marker-start="url(#arrowhead-back)" marker-end="url(#arrowhead)" />
                        <text x="15" y="${(actualY + idealYAtCurrentX) / 2 + 5}" fill="#10b981" font-size="14" text-anchor="start" font-weight="900">
                            ${Math.abs(Math.round(creditGap)).toLocaleString()} CR
                        </text>
                    </g>

                    <!-- Static Scale Labels (Larger & Bolder) -->
                    <!-- Y-Scale -->
                    <text x="${marginLeft - 15}" y="${marginTop - 15}" fill="#64748b" font-size="12" font-weight="800" text-anchor="end">${totalCapacity.toLocaleString()}</text>
                    <text x="${marginLeft - 15}" y="${height - marginBottom + 5}" fill="#64748b" font-size="12" font-weight="800" text-anchor="end">0</text>
                    
                    <!-- X-Scale (Renewal days closer to axis) -->
                    <text x="${getX(0)}" y="${height - marginBottom + 25}" fill="#64748b" font-size="11" font-weight="800" text-anchor="middle">START: ${formatDate(periodStart)}</text>
                    <text x="${getX(1)}" y="${height - marginBottom + 25}" fill="#64748b" font-size="11" font-weight="800" text-anchor="middle">RENEW: ${formatDate(periodEnd)}</text>

                    <!-- Axis Intersection Labels (Drawn last to be on top) -->
                    <!-- Y-Axis Intersection -->
                    <rect x="${marginLeft - 85}" y="${actualY - 14}" width="80" height="28" rx="4" fill="#10b981" />
                    <text x="${marginLeft - 45}" y="${actualY + 6}" fill="#0f172a" font-size="14" font-weight="900" text-anchor="middle">${currentBalance}</text>
                    
                    <!-- X-Axis Intersection (Moved to bottom position replacing Today label) -->
                    <rect x="${currentX - 45}" y="${height - marginBottom + 55}" width="90" height="28" rx="4" fill="#10b981" />
                    <text x="${currentX}" y="${height - marginBottom + 74}" fill="#0f172a" font-size="14" font-weight="900" text-anchor="middle">${formatDate(now)}</text>

                    <!-- Plot Point -->
                    <circle cx="${currentX}" cy="${actualY}" r="8" fill="#10b981" stroke="#0f172a" stroke-width="3" />
                </svg>`;

                container.innerHTML = svg;
            });
        }
    };

    window.GensparkTracker.UI.Graph = Graph;

    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fade-in-overlay { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fade-out-overlay { from { opacity: 1; } to { opacity: 0; } }
        @keyframes scale-up {
            from { opacity: 0; transform: translate(-50%, -48%) scale(0.98); }
            to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes scale-down {
            from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            to { opacity: 0; transform: translate(-50%, -48%) scale(0.98); }
        }
        @keyframes scale-up-settings {
            from { opacity: 0; transform: scale(0.95) translateY(10px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes scale-down-settings {
            from { opacity: 1; transform: scale(1) translateY(0); }
            to { opacity: 0; transform: scale(0.95) translateY(10px); }
        }
    `;
    document.head.appendChild(style);
})();
