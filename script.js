    // Application State
    const state = {
        input: '',
        history: [],
        format: 'SVG',
        resolution: 1024,
        errorLevel: 'H'
    };

    // DOM Elements
    const inputEl = document.getElementById('qr-input');
    const historyContainer = document.getElementById('history-container');
    const historyList = document.getElementById('history-list');
    const errorOptions = document.getElementById('error-options');
    const formatOptions = document.getElementById('format-options');
    const resolutionOptions = document.getElementById('resolution-options');
    const previewContainer = document.getElementById('preview-container');

    // Options Constants
    const ERROR_LEVELS = ['L', 'M', 'Q', 'H'];
    const FORMATS = ['SVG', 'PNG'];
    const RESOLUTIONS = [512, 1024, 2048, 4096];

    // Helper: Generate SVG string markup
    function generateQR_SVG(text, errorLevel) {
        return new Promise((resolve, reject) => {
            QRCode.toString(text, {
                type: 'svg',
                errorCorrectionLevel: errorLevel,
                margin: 0,
                color: { dark: '#000000', light: '#ffffff' }
            }, (err, string) => {
                if (err) return reject(err);
                // Replace hardcoded sizes so it adapts to container width
                let svg = string;
                svg = svg.replace(/width=".*?"/, 'width="280"');
                svg = svg.replace(/height=".*?"/, 'height="280"');
                svg = svg.replace('<svg', '<svg class="qr-code"');
                resolve(svg);
            });
        });
    }

    // Helper: Generate Data URL for PNG export
    function generateQR_DataURL(text, errorLevel, resolution) {
        return new Promise((resolve, reject) => {
            QRCode.toDataURL(text, {
                type: 'image/png',
                errorCorrectionLevel: errorLevel,
                margin: 0,
                width: resolution,
                color: { dark: '#000000', light: '#ffffff' }
            }, (err, url) => {
                if (err) return reject(err);
                resolve(url);
            });
        });
    }

    // UI Rendering: Map state configuration into interactive buttons
    function renderButtons(container, options, currentValue, callback, isResolution = false) {
        container.innerHTML = '';
        options.forEach(opt => {
            const btn = document.createElement('button');
            const isActive = currentValue === opt;
            
            let baseClass = 'py-4 rounded-xl transition-all shadow-sm ';
            
            if (isResolution) {
                baseClass += 'flex flex-col items-center justify-center ';
            } else {
                baseClass += 'text-sm font-medium ';
            }

            // Active State Vs Inactive State CSS (matching App.tsx precise rules)
            if (isActive) {
                btn.className = baseClass + 'bg-black text-white border border-black shadow-md';
            } else {
                btn.className = baseClass + 'bg-white text-black border border-[#E5E5E7] hover:border-[#D2D2D7] hover:shadow';
            }

            // Resolution buttons have a sub-label ('px')
            if (isResolution) {
                btn.innerHTML = `<span class="text-sm font-medium">${opt}</span><span class="text-[10px] ${isActive ? 'opacity-80' : 'text-gray-400'}">px</span>`;
            } else {
                btn.textContent = opt;
            }

            // Click handler logic
            btn.onclick = () => {
                callback(opt);
                renderAll();
            };

            container.appendChild(btn);
        });
    }

    // UI Rendering: History row
    function updateHistory() {
        if (state.history.length > 0) {
            historyContainer.classList.remove('hidden');
            historyList.innerHTML = '';
            state.history.forEach(item => {
                const btn = document.createElement('button');
                btn.className = "px-4 py-2 bg-white border border-[#E5E5E7] shadow-sm rounded-full text-xs font-medium hover:border-[#D2D2D7] hover:shadow transition-all truncate max-w-[200px]";
                btn.textContent = item;
                btn.onclick = () => {
                    state.input = item;
                    inputEl.value = item;
                    renderAll();
                };
                historyList.appendChild(btn);
            });
        } else {
            historyContainer.classList.add('hidden');
        }
    }

    // UI Rendering: Card View
    function updatePreview() {
        if (!state.input.trim()) {
            // Empty State identical to React App.tsx component
            previewContainer.innerHTML = `
                <div class="w-full max-w-[460px] aspect-square border-2 border-dashed border-gray-200 rounded-[2rem] flex flex-col items-center justify-center text-gray-300 gap-5 fade-in">
                    <div class="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-sm">
                        <div class="w-6 h-6 bg-gray-200 rounded-sm"></div>
                    </div>
                    <span class="text-sm font-medium tracking-wide">Enter data to generate code</span>
                </div>
            `;
            return;
        }

        // Active State
        generateQR_SVG(state.input.trim(), state.errorLevel).then(svgContent => {
            previewContainer.innerHTML = `
                <div class="apple-card p-10 md:p-12 shadow-2xl w-full max-w-[460px] scale-in" id="qr-card">
                    <div class="bg-white border border-gray-100 rounded-2xl aspect-square mb-10 flex items-center justify-center p-8 shadow-inner" id="qr-svg-wrapper">
                        ${svgContent}
                    </div>
                    <div class="flex items-center justify-between">
                        <div class="flex flex-col overflow-hidden mr-4">
                            <span class="text-sm font-semibold truncate max-w-[180px]">${state.input.trim()}</span>
                            <span class="text-[10px] text-gray-400 uppercase tracking-widest mt-1">Generated Just Now</span>
                        </div>
                        <button id="download-btn" class="flex-shrink-0 bg-black text-white px-8 py-4 rounded-xl text-sm font-medium hover:opacity-90 transition-all active:scale-95 shadow-md uppercase tracking-wider">
                            Download
                        </button>
                    </div>
                </div>
            `;

            // Handle Download action dynamically based upon SVG vs PNG selection
            document.getElementById('download-btn').onclick = async () => {
                const text = state.input.trim();
                if (state.format === 'SVG') {
                    try {
                        const finalSvg = await new Promise((res, rej) => QRCode.toString(text, {
                            type: 'svg', errorCorrectionLevel: state.errorLevel, margin: 0, width: state.resolution, color: {dark: '#000', light: '#fff'}
                        }, (err, string) => err ? rej(err) : res(string)));
                        
                        const blob = new Blob([finalSvg], { type: 'image/svg+xml;charset=utf-8' });
                        const link = document.createElement('a');
                        link.download = `qr-code-${Date.now()}.svg`;
                        link.href = URL.createObjectURL(blob);
                        link.click();
                    } catch (e) {
                        console.error("SVG Export Error:", e);
                    }
                } else {
                    try {
                        const url = await generateQR_DataURL(text, state.errorLevel, state.resolution);
                        const link = document.createElement('a');
                        link.download = `qr-code-${Date.now()}.png`;
                        link.href = url;
                        link.click();
                    } catch (e) {
                        console.error("PNG Export Error:", e);
                    }
                }
            };
        });
    }

    // Bind live textarea inputs into state mutations
    inputEl.addEventListener('input', (e) => {
        state.input = e.target.value;
        updatePreview();
    });

    // Commit to history array once text interaction finishes blurring
    inputEl.addEventListener('blur', () => {
        const val = state.input.trim();
        if (val && !state.history.includes(val)) {
            state.history.unshift(val);
            state.history = state.history.slice(0, 5); // Keep last 5 entries
            updateHistory();
        }
    });

    // Primary render loop trigger
    function renderAll() {
        renderButtons(errorOptions, ERROR_LEVELS, state.errorLevel, val => state.errorLevel = val);
        renderButtons(formatOptions, FORMATS, state.format, val => state.format = val);
        renderButtons(resolutionOptions, RESOLUTIONS, state.resolution, val => state.resolution = val, true);
        updatePreview();
        updateHistory();
    }

    // App initialization
    renderAll();
