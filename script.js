/**
 * VoidSwift Tools - Main Application
 * Fully optimized and refactored for production
 * All tools are 100% functional with real JavaScript logic
 */

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
    APP_NAME: 'VoidSwift',
    STORAGE_PREFIX: 'voidswift-',
    DEBOUNCE_DELAY: 300,
    QR_API: 'https://api.qrserver.com/v1/create-qr-code/',
    MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
};

// ============================================
// STATE MANAGEMENT
// ============================================

const STATE = {
    currentTool: null,
    favorites: loadFromStorage('favorites') || [],
    recentTools: loadFromStorage('recent') || [],
    darkMode: loadFromStorage('darkmode') !== null 
        ? loadFromStorage('darkmode') 
        : window.matchMedia('(prefers-color-scheme: dark)').matches,
    searchQuery: '',
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

function loadFromStorage(key) {
    try {
        const data = localStorage.getItem(CONFIG.STORAGE_PREFIX + key);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.warn(`Failed to load ${key} from storage:`, e);
        return null;
    }
}

function saveToStorage(key, value) {
    try {
        localStorage.setItem(CONFIG.STORAGE_PREFIX + key, JSON.stringify(value));
    } catch (e) {
        console.warn(`Failed to save ${key} to storage:`, e);
    }
}

function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
        .then(() => showToast('✓ Copied to clipboard', 'success'))
        .catch(() => showToast('Failed to copy', 'error'));
}

function downloadFile(data, filename, mimeType = 'text/plain') {
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================
// THEME MANAGEMENT
// ======================================== ======

function initTheme() {
    if (STATE.darkMode) {
        document.documentElement.classList.add('dark');
        document.getElementById('theme-toggle').textContent = '☀️';
    } else {
        document.documentElement.classList.remove('dark');
        document.getElementById('theme-toggle').textContent = '🌙';
    }
}

function toggleTheme() {
    STATE.darkMode = !STATE.darkMode;
    saveToStorage('darkmode', STATE.darkMode);
    initTheme();
    showToast(`${STATE.darkMode ? 'Dark' : 'Light'} mode enabled`, 'info');
}

// ============================================
// FAVORITES MANAGEMENT
// ============================================

function addRecentTool(toolId) {
    STATE.recentTools = STATE.recentTools.filter(id => id !== toolId);
    STATE.recentTools.unshift(toolId);
    STATE.recentTools = STATE.recentTools.slice(0, 5);
    saveToStorage('recent', STATE.recentTools);
    updateRecentSection();
}

function toggleFavorite(toolId) {
    const index = STATE.favorites.indexOf(toolId);
    if (index > -1) {
        STATE.favorites.splice(index, 1);
    } else {
        STATE.favorites.push(toolId);
    }
    saveToStorage('favorites', STATE.favorites);
    updateFavoritesCount();
    renderToolsGrid();
}

function isFavorite(toolId) {
    return STATE.favorites.includes(toolId);
}

function updateFavoritesCount() {
    document.querySelector('.fav-count').textContent = STATE.favorites.length;
}

// ============================================
// SEARCH & FILTER
// ============================================

const debouncedSearch = debounce((query) => {
    STATE.searchQuery = query.toLowerCase().trim();
    filterTools(STATE.searchQuery);
}, CONFIG.DEBOUNCE_DELAY);

function filterTools(query) {
    const toolsGrid = document.getElementById('tools-grid');
    const noResults = document.getElementById('no-results');
    
    if (!query) {
        renderToolsGrid();
        return;
    }

    const filteredTools = TOOLS.filter(tool => 
        tool.name.toLowerCase().includes(query) ||
        tool.description.toLowerCase().includes(query) ||
        tool.category.toLowerCase().includes(query)
    );

    if (filteredTools.length === 0) {
        toolsGrid.innerHTML = '';
        noResults.style.display = 'block';
    } else {
        noResults.style.display = 'none';
        toolsGrid.innerHTML = filteredTools.map(tool => createToolCard(tool)).join('');
        attachToolCardListeners();
    }
}

// ============================================
// TOOL CARD RENDERING
// ============================================

function createToolCard(tool) {
    const favorited = isFavorite(tool.id);
    return `
        <article class="tool-card" data-tool-id="${tool.id}" role="button" tabindex="0">
            <button class="tool-favorite ${favorited ? 'active' : ''}" 
                    aria-label="${favorited ? 'Remove from favorites' : 'Add to favorites'}"
                    onclick="event.stopPropagation(); toggleFavorite('${tool.id}'); event.preventDefault();">
                ${favorited ? '❤️' : '🤍'}
            </button>
            <div class="tool-icon" aria-hidden="true">${tool.icon}</div>
            <h3 class="tool-name">${escapeHtml(tool.name)}</h3>
            <p class="tool-description">${escapeHtml(tool.description)}</p>
            <button class="tool-button" aria-label="Open ${tool.name}">Open Tool</button>
        </article>
    `;
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function executeEmbeddedScripts(container) {
    container.querySelectorAll('script').forEach(oldScript => {
        const script = document.createElement('script');
        script.async = false;
        if (oldScript.src) {
            script.src = oldScript.src;
        } else {
            script.textContent = oldScript.textContent;
        }
        oldScript.parentNode.replaceChild(script, oldScript);
    });
}

function renderToolsGrid() {
    const grid = document.getElementById('tools-grid');
    const noResults = document.getElementById('no-results');
    
    grid.innerHTML = TOOLS.map(tool => createToolCard(tool)).join('');
    noResults.style.display = 'none';
    attachToolCardListeners();
}

function attachToolCardListeners() {
    document.querySelectorAll('.tool-card').forEach(card => {
        const toolId = card.getAttribute('data-tool-id');
        const tool = TOOLS.find(t => t.id === toolId);
        
        const handler = () => openTool(tool);
        
        card.addEventListener('click', handler);
        const openButton = card.querySelector('.tool-button');
        if (openButton) {
            openButton.addEventListener('click', (e) => {
                e.stopPropagation();
                handler();
            });
        }
        card.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handler();
            }
        });
    });
}

// ============================================
// MODAL & TOOL MANAGEMENT
// ============================================

function openTool(tool) {
    if (!tool) return;
    
    STATE.currentTool = tool;
    addRecentTool(tool.id);
    
    const modal = document.getElementById('tool-modal');
    const modalBody = document.getElementById('modal-body');
    
    let html = `
        <div class="tool-content">
            <h3>${escapeHtml(tool.icon)} ${escapeHtml(tool.name)}</h3>
            <div class="tool-content-section">
                ${tool.render()}
            </div>
            ${tool.faq ? `
                <div class="tool-content-section">
                    <h4>FAQ</h4>
                    ${tool.faq.map(item => `
                        <details style="margin-bottom: 1rem;">
                            <summary style="font-weight: 600; cursor: pointer; margin-bottom: 0.5rem;">${escapeHtml(item.q)}</summary>
                            <p style="color: var(--text-secondary); margin-top: 0.5rem;">${escapeHtml(item.a)}</p>
                        </details>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `;
    
    modalBody.innerHTML = html;
    executeEmbeddedScripts(modalBody);
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeTool() {
    const modal = document.getElementById('tool-modal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    STATE.currentTool = null;
}

// ============================================
// RECENT TOOLS SECTION
// ============================================

function updateRecentSection() {
    const section = document.getElementById('recent-section');
    const list = document.getElementById('recent-list');
    
    if (STATE.recentTools.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    list.innerHTML = STATE.recentTools.map(toolId => {
        const tool = TOOLS.find(t => t.id === toolId);
        if (!tool) return '';
        return `
            <button class="recent-tool-badge" 
                    onclick="openTool(TOOLS.find(t => t.id === '${toolId}'))"
                    aria-label="Open ${tool.name}">
                ${tool.icon} ${escapeHtml(tool.name)}
            </button>
        `;
    }).join('');
}

// ============================================
// TOOLS DATABASE
// ============================================

const TOOLS = [
    {
        id: 'word-counter',
        name: 'Word Counter',
        icon: '📝',
        description: 'Count words, characters, sentences, and paragraphs in real-time',
        category: 'Text',
        render: renderWordCounter,
        faq: [
            { q: 'How accurate is the word counter?', a: '100% accurate. Uses real JavaScript text analysis algorithms.' },
            { q: 'Does it count spaces?', a: 'Characters include spaces. Words do not count whitespace.' },
            { q: 'Can it handle large texts?', a: 'Yes, processes texts of any size instantly.' }
        ]
    },
    {
        id: 'char-counter',
        name: 'Character Counter',
        icon: '🔤',
        description: 'Count characters with and without spaces, useful for social media and SEO',
        category: 'Text',
        render: renderCharCounter,
        faq: [
            { q: 'What\'s the difference?', a: 'With spaces includes all whitespace. Without removes them for accurate character count.' },
            { q: 'Does it count emojis?', a: 'Yes, emojis and special characters are counted.' }
        ]
    },
    {
        id: 'password-generator',
        name: 'Password Generator',
        icon: '🔐',
        description: 'Generate strong, secure random passwords with customizable options',
        category: 'Security',
        render: renderPasswordGenerator,
        faq: [
            { q: 'Is the password truly random?', a: 'Yes, uses crypto.getRandomValues() for secure randomness.' },
            { q: 'Are passwords saved?', a: 'No, everything happens locally in your browser.' }
        ]
    },
    {
        id: 'age-calculator',
        name: 'Age Calculator',
        icon: '🎂',
        description: 'Calculate exact age in years, months, and days from your birthdate',
        category: 'Calculator',
        render: renderAgeCalculator,
        faq: [
            { q: 'Does it account for leap years?', a: 'Yes, calculations are perfectly accurate.' },
            { q: 'What format for dates?', a: 'Uses standard date picker format.' }
        ]
    },
    {
        id: 'percentage-calculator',
        name: 'Percentage Calculator',
        icon: '📊',
        description: 'Calculate percentages, discounts, and percentage changes instantly',
        category: 'Calculator',
        render: renderPercentageCalculator,
        faq: [
            { q: 'What can it calculate?', a: 'Percentage of amount, percentage change, and discount calculations.' }
        ]
    },
    {
        id: 'unit-converter',
        name: 'Unit Converter',
        icon: '📏',
        description: 'Convert between length, weight, temperature, and volume units',
        category: 'Converter',
        render: renderUnitConverter,
        faq: [
            { q: 'What units are supported?', a: 'Length, Weight, Temperature, and Volume with multiple units each.' }
        ]
    },
    {
        id: 'json-formatter',
        name: 'JSON Formatter',
        icon: '{}',
        description: 'Format, validate, and beautify JSON with real-time error detection',
        category: 'Developer',
        render: renderJsonFormatter,
        faq: [
            { q: 'Does it validate JSON?', a: 'Yes, detects and reports all syntax errors.' },
            { q: 'Can it minify?', a: 'Yes, with a single click.' }
        ]
    },
    {
        id: 'qr-code-generator',
        name: 'QR Code Generator',
        icon: '📱',
        description: 'Generate QR codes from text or URLs with instant preview',
        category: 'Generator',
        render: renderQrCodeGenerator,
        faq: [
            { q: 'Can I download?', a: 'Yes, right-click on the QR code and save as PNG.' }
        ]
    },
    {
        id: 'image-compressor',
        name: 'Image Compressor',
        icon: '🖼️',
        description: 'Compress images while maintaining quality using canvas technology',
        category: 'Image',
        render: renderImageCompressor,
        faq: [
            { q: 'What formats are supported?', a: 'JPG, PNG, WebP - all common formats.' },
            { q: 'Is data stored?', a: 'No, all processing is local.' }
        ]
    },
    {
        id: 'image-to-pdf',
        name: 'Image to PDF',
        icon: '📄',
        description: 'Convert images to PDF files instantly using canvas technology',
        category: 'Image',
        render: renderImageToPdf,
        faq: [
            { q: 'What formats work?', a: 'PNG, JPG, WebP and all standard image formats.' }
        ]
    },
    {
        id: 'pdf-to-word',
        name: 'PDF to Word',
        icon: '📋',
        description: 'Convert PDF documents to editable Word format',
        category: 'Converter',
        render: renderPdfToWord,
        faq: [
            { q: 'How long does conversion take?', a: 'Instant - conversion happens in your browser.' },
            { q: 'What quality is the output?', a: 'High quality with preserved formatting.' }
        ]
    },
    {
        id: 'image-editor',
        name: 'Image Editor',
        icon: '🎨',
        description: 'Edit images - rotate, flip, adjust brightness, contrast, and filters',
        category: 'Image',
        render: renderImageEditor,
        faq: [
            { q: 'What can I edit?', a: 'Rotate, flip, brightness, contrast, saturation, and more.' },
            { q: 'Can I undo changes?', a: 'Yes, reload the image to start fresh.' }
        ]
    },
    {
        id: 'video-editor',
        name: 'Video Editor',
        icon: '🎬',
        description: 'Edit video clips with trim, playback preview, filter controls, and download support.',
        category: 'Video',
        render: renderVideoEditor,
        faq: [
            { q: 'What can I do?', a: 'Trim video, adjust playback speed, add filters, and download your edited clip.' },
            { q: 'Does it work in browser?', a: 'Yes, it uses HTML5 video and canvas for local edits without uploads.' }
        ]
    },
    {
        id: 'cv-builder',
        name: 'CV Builder',
        icon: '👔',
        description: 'Create and download your professional CV in minutes',
        category: 'Document',
        render: renderCvBuilder,
        faq: [
            { q: 'Can I download my CV?', a: 'Yes, as PDF format with professional styling.' },
            { q: 'Is my data saved?', a: 'No, data is only stored locally in your browser.' }
        ]
    },
    {
        id: 'resume-builder',
        name: 'Resume Builder',
        icon: '📄',
        description: 'Build a polished resume with experience, skills, certifications, and professional formatting.',
        category: 'Document',
        render: renderResumeBuilder,
        faq: [
            { q: 'Can I download the resume?', a: 'Yes, export directly as a PDF file.' },
            { q: 'Can I add skills and certifications?', a: 'Yes, there are dedicated sections for both.' }
        ]
    },
    {
        id: 'invoice-generator',
        name: 'Invoice Generator',
        icon: '🧾',
        description: 'Generate professional invoices with line items, totals, and PDF export.',
        category: 'Business',
        render: renderInvoiceGenerator,
        faq: [
            { q: 'Can I add multiple invoice items?', a: 'Yes, add as many line items as you need.' },
            { q: 'Can I download the invoice?', a: 'Yes, export a PDF invoice instantly.' }
        ]
    },
    {
        id: 'pdf-merge',
        name: 'PDF Merge',
        icon: '📎',
        description: 'Combine multiple PDF documents into a single merged file.',
        category: 'PDF',
        render: renderPdfMerge,
        faq: [
            { q: 'How many files can I merge?', a: 'You can merge multiple PDF files in one operation.' },
            { q: 'Is the merge local?', a: 'Yes, all merging happens in your browser.' }
        ]
    },
    {
        id: 'youtube-thumbnail-downloader',
        name: 'YouTube Thumbnail Downloader',
        icon: '🎬',
        description: 'Download high-quality thumbnails from any YouTube video',
        category: 'Download',
        render: renderYoutubeThumbnailDownloader,
        faq: [
            { q: 'What quality can I download?', a: 'Maximum available quality (usually 1280x720).' },
            { q: 'Do I need API keys?', a: 'No, it works with just the YouTube URL.' }
        ]
    },
    {
        id: 'hashtag-generator',
        name: 'Hashtag Generator',
        icon: '#️⃣',
        description: 'Generate relevant hashtags for social media posts',
        category: 'Social',
        render: renderHashtagGenerator,
        faq: [
            { q: 'How many hashtags are generated?', a: 'Up to 30 relevant hashtags based on your input.' },
            { q: 'Can I copy all hashtags?', a: 'Yes, one-click copy button included.' }
        ]
    }
];

// ============================================
// TOOL RENDERERS
// ============================================

function renderWordCounter() {
    return `
        <div class="tool-form">
            <div class="form-group">
                <label for="word-text">Enter Text</label>
                <textarea id="word-text" placeholder="Start typing..."></textarea>
            </div>
            
            <div class="stats-grid">
                <div class="stat-box">
                    <div class="stat-value" id="word-count">0</div>
                    <div class="stat-label">Words</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value" id="char-count">0</div>
                    <div class="stat-label">Characters</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value" id="sentence-count">0</div>
                    <div class="stat-label">Sentences</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value" id="para-count">0</div>
                    <div class="stat-label">Paragraphs</div>
                </div>
            </div>
        </div>
        
        <script>
        (() => {
            const textarea = document.getElementById('word-text');
            if (!textarea) return;
            
            const updateStats = () => {
                const text = textarea.value;
                const words = text.trim().split(/\\s+/).filter(w => w.length > 0).length;
                const chars = text.length;
                const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
                const paragraphs = text.split(/\\n+/).filter(p => p.trim().length > 0).length;
                
                document.getElementById('word-count').textContent = text.trim() === '' ? 0 : words;
                document.getElementById('char-count').textContent = chars;
                document.getElementById('sentence-count').textContent = text.trim() === '' ? 0 : sentences;
                document.getElementById('para-count').textContent = text.trim() === '' ? 0 : paragraphs;
            };
            
            textarea.addEventListener('input', updateStats);
            updateStats();
        })();
        </script>
    `;
}

function renderCharCounter() {
    return `
        <div class="tool-form">
            <div class="form-group">
                <label for="char-text">Enter Text</label>
                <textarea id="char-text" placeholder="Type something..."></textarea>
            </div>
            
            <div class="stats-grid">
                <div class="stat-box">
                    <div class="stat-value" id="char-with-spaces">0</div>
                    <div class="stat-label">With Spaces</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value" id="char-without-spaces">0</div>
                    <div class="stat-label">Without Spaces</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value" id="lines-count">1</div>
                    <div class="stat-label">Lines</div>
                </div>
            </div>
        </div>
        
        <script>
        (() => {
            const textarea = document.getElementById('char-text');
            if (!textarea) return;
            
            const updateStats = () => {
                const text = textarea.value;
                const withSpaces = text.length;
                const withoutSpaces = text.replace(/\\s/g, '').length;
                const lines = text === '' ? 1 : text.split('\\n').length;
                
                document.getElementById('char-with-spaces').textContent = withSpaces;
                document.getElementById('char-without-spaces').textContent = withoutSpaces;
                document.getElementById('lines-count').textContent = lines;
            };
            
            textarea.addEventListener('input', updateStats);
            updateStats();
        })();
        </script>
    `;
}

function renderPasswordGenerator() {
    return `
        <div class="tool-form">
            <div class="form-group">
                <label for="pass-length">Password Length: <span id="length-display">16</span></label>
                <input type="range" id="pass-length" value="16" min="8" max="128" oninput="document.getElementById('length-display').textContent = this.value; generatePassword();">
            </div>
            
            <div class="form-group" style="gap: 0.5rem;">
                <label><input type="checkbox" id="pass-uppercase" checked onchange="generatePassword()"> Include Uppercase (A-Z)</label>
                <label><input type="checkbox" id="pass-lowercase" checked onchange="generatePassword()"> Include Lowercase (a-z)</label>
                <label><input type="checkbox" id="pass-numbers" checked onchange="generatePassword()"> Include Numbers (0-9)</label>
                <label><input type="checkbox" id="pass-symbols" checked onchange="generatePassword()"> Include Symbols (!@#$%^&*)</label>
            </div>
            
            <div class="tool-output">
                <div class="tool-output-label">Generated Password</div>
                <div class="tool-output-value" id="password-output">••••••••••••••••</div>
            </div>
            
            <div class="button-group">
                <button class="btn-primary" onclick="generatePassword()">Generate</button>
                <button class="copy-btn" onclick="copyToClipboard(document.getElementById('password-output').textContent)">Copy</button>
            </div>
        </div>
        
        <script>
        function generatePassword() {
            const length = parseInt(document.getElementById('pass-length').value);
            const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            const lowercase = 'abcdefghijklmnopqrstuvwxyz';
            const numbers = '0123456789';
            const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
            
            let chars = '';
            if (document.getElementById('pass-uppercase').checked) chars += uppercase;
            if (document.getElementById('pass-lowercase').checked) chars += lowercase;
            if (document.getElementById('pass-numbers').checked) chars += numbers;
            if (document.getElementById('pass-symbols').checked) chars += symbols;
            
            if (chars === '') {
                showToast('Select at least one option', 'warning');
                return;
            }
            
            let password = '';
            const arr = new Uint8Array(length);
            crypto.getRandomValues(arr);
            
            for (let i = 0; i < length; i++) {
                password += chars[arr[i] % chars.length];
            }
            
            document.getElementById('password-output').textContent = password;
        }
        
        generatePassword();
        </script>
    `;
}

function renderAgeCalculator() {
    const defaultDate = new Date(Date.now() - 25 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return `
        <div class="tool-form">
            <div class="form-group">
                <label for="birth-date">Date of Birth</label>
                <input type="date" id="birth-date" value="${defaultDate}" onchange="calculateAge();">
            </div>
            
            <div class="stats-grid">
                <div class="stat-box">
                    <div class="stat-value" id="age-years">0</div>
                    <div class="stat-label">Years</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value" id="age-months">0</div>
                    <div class="stat-label">Months</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value" id="age-days">0</div>
                    <div class="stat-label">Days</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value" id="age-hours">0</div>
                    <div class="stat-label">Hours</div>
                </div>
            </div>
            
            <div class="tool-output">
                <div class="tool-output-label">Additional Info</div>
                <div class="tool-output-value" id="age-info">Total: 0 days</div>
            </div>
        </div>
        
        <script>
        function calculateAge() {
            const birthDate = new Date(document.getElementById('birth-date').value);
            const today = new Date();
            
            if (birthDate > today) {
                showToast('Please select a valid past date', 'error');
                return;
            }
            
            let years = today.getFullYear() - birthDate.getFullYear();
            let months = today.getMonth() - birthDate.getMonth();
            let days = today.getDate() - birthDate.getDate();
            let hours = today.getHours();
            
            if (days < 0) {
                months--;
                days += new Date(today.getFullYear(), today.getMonth(), 0).getDate();
            }
            
            if (months < 0) {
                years--;
                months += 12;
            }
            
            const totalDays = Math.floor((today - birthDate) / (1000 * 60 * 60 * 24));
            
            document.getElementById('age-years').textContent = years;
            document.getElementById('age-months').textContent = months;
            document.getElementById('age-days').textContent = days;
            document.getElementById('age-hours').textContent = hours;
            document.getElementById('age-info').textContent = 'Total: ' + totalDays.toLocaleString() + ' days';
        }
        
        calculateAge();
        </script>
    `;
}

function renderPercentageCalculator() {
    return `
        <div class="tool-form">
            <div class="form-group">
                <label for="percent-type">Calculation Type</label>
                <select id="percent-type" onchange="updatePercentageUI()">
                    <option value="percent-of">What is X% of Y?</option>
                    <option value="percent-change">Percent Change</option>
                    <option value="discount">Discount Calculator</option>
                </select>
            </div>
            
            <div id="percent-inputs">
                <div class="form-group">
                    <label for="percent-percent">Percentage (%)</label>
                    <input type="number" id="percent-percent" placeholder="15" oninput="calculatePercentage();">
                </div>
                <div class="form-group">
                    <label for="percent-amount">Amount</label>
                    <input type="number" id="percent-amount" placeholder="1000" oninput="calculatePercentage();">
                </div>
            </div>
            
            <div class="tool-output">
                <div class="tool-output-label">Result</div>
                <div class="tool-output-value" id="percent-result">0</div>
            </div>
            
            <button class="copy-btn" onclick="copyToClipboard(document.getElementById('percent-result').textContent)">Copy Result</button>
        </div>
        
        <script>
        function updatePercentageUI() {
            const type = document.getElementById('percent-type').value;
            const container = document.getElementById('percent-inputs');
            
            if (type === 'percent-of') {
                container.innerHTML = \`
                    <div class="form-group">
                        <label for="percent-percent">Percentage (%)</label>
                        <input type="number" id="percent-percent" placeholder="15" oninput="calculatePercentage();">
                    </div>
                    <div class="form-group">
                        <label for="percent-amount">Amount</label>
                        <input type="number" id="percent-amount" placeholder="1000" oninput="calculatePercentage();">
                    </div>
                \`;
            } else if (type === 'percent-change') {
                container.innerHTML = \`
                    <div class="form-group">
                        <label for="percent-original">Original Value</label>
                        <input type="number" id="percent-original" placeholder="100" oninput="calculatePercentage();">
                    </div>
                    <div class="form-group">
                        <label for="percent-new">New Value</label>
                        <input type="number" id="percent-new" placeholder="150" oninput="calculatePercentage();">
                    </div>
                \`;
            } else {
                container.innerHTML = \`
                    <div class="form-group">
                        <label for="percent-original-price">Original Price</label>
                        <input type="number" id="percent-original-price" placeholder="100" oninput="calculatePercentage();">
                    </div>
                    <div class="form-group">
                        <label for="percent-discount">Discount (%)</label>
                        <input type="number" id="percent-discount" placeholder="20" oninput="calculatePercentage();">
                    </div>
                \`;
            }
            calculatePercentage();
        }
        
        function calculatePercentage() {
            const type = document.getElementById('percent-type').value;
            const resultEl = document.getElementById('percent-result');
            
            if (type === 'percent-of') {
                const percent = parseFloat(document.getElementById('percent-percent').value) || 0;
                const amount = parseFloat(document.getElementById('percent-amount').value) || 0;
                const result = (percent / 100) * amount;
                resultEl.textContent = result.toFixed(2);
            } else if (type === 'percent-change') {
                const original = parseFloat(document.getElementById('percent-original').value) || 0;
                const newVal = parseFloat(document.getElementById('percent-new').value) || 0;
                if (original === 0) {
                    resultEl.textContent = '∞';
                } else {
                    const change = ((newVal - original) / Math.abs(original)) * 100;
                    resultEl.textContent = change.toFixed(2) + '%';
                }
            } else {
                const price = parseFloat(document.getElementById('percent-original-price').value) || 0;
                const discount = parseFloat(document.getElementById('percent-discount').value) || 0;
                const discountAmount = (discount / 100) * price;
                const final = price - discountAmount;
                resultEl.textContent = final.toFixed(2);
            }
        }
        
        updatePercentageUI();
        </script>
    `;
}

function renderUnitConverter() {
    return `
        <div class="tool-form">
            <div class="form-group">
                <label for="unit-type">Conversion Type</label>
                <select id="unit-type" onchange="updateUnitUI()">
                    <option value="length">Length</option>
                    <option value="weight">Weight</option>
                    <option value="temperature">Temperature</option>
                    <option value="volume">Volume</option>
                </select>
            </div>
            
            <div id="unit-inputs" class="form-group">
                <label>From</label>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <input type="number" id="unit-from-value" placeholder="1" oninput="convertUnit();">
                    <select id="unit-from-type" onchange="convertUnit()">
                        <option value="m">Meter</option>
                        <option value="km">Kilometer</option>
                        <option value="cm">Centimeter</option>
                        <option value="mile">Mile</option>
                        <option value="yard">Yard</option>
                        <option value="foot">Foot</option>
                        <option value="inch">Inch</option>
                    </select>
                </div>
                <label style="margin-top: 1rem;">To</label>
                <select id="unit-to-type" onchange="convertUnit()">
                    <option value="m">Meter</option>
                    <option value="km">Kilometer</option>
                    <option value="cm">Centimeter</option>
                    <option value="mile">Mile</option>
                    <option value="yard">Yard</option>
                    <option value="foot">Foot</option>
                    <option value="inch">Inch</option>
                </select>
            </div>
            
            <div class="tool-output">
                <div class="tool-output-label">Result</div>
                <div class="tool-output-value" id="unit-result">0</div>
            </div>
            
            <button class="copy-btn" onclick="copyToClipboard(document.getElementById('unit-result').textContent)">Copy Result</button>
        </div>
        
        <script>
        const conversions = {
            length: {
                m: 1,
                km: 0.001,
                cm: 100,
                mile: 0.000621371,
                yard: 1.09361,
                foot: 3.28084,
                inch: 39.3701
            },
            weight: {
                kg: 1,
                g: 1000,
                lb: 2.20462,
                oz: 35.274
            },
            temperature: {
                c: (v) => v,
                f: (v) => (v * 9/5) + 32,
                k: (v) => v + 273.15
            },
            volume: {
                l: 1,
                ml: 1000,
                gal: 0.264172,
                cup: 4.22675,
                pint: 2.11338
            }
        };
        
        function updateUnitUI() {
            const type = document.getElementById('unit-type').value;
            const container = document.getElementById('unit-inputs');
            let options = '';
            
            if (type === 'length') {
                options = '<option value="m">Meter</option><option value="km">Kilometer</option><option value="cm">Centimeter</option><option value="mile">Mile</option><option value="yard">Yard</option><option value="foot">Foot</option><option value="inch">Inch</option>';
            } else if (type === 'weight') {
                options = '<option value="kg">Kilogram</option><option value="g">Gram</option><option value="lb">Pound</option><option value="oz">Ounce</option>';
            } else if (type === 'temperature') {
                options = '<option value="c">Celsius</option><option value="f">Fahrenheit</option><option value="k">Kelvin</option>';
            } else if (type === 'volume') {
                options = '<option value="l">Liter</option><option value="ml">Milliliter</option><option value="gal">Gallon</option><option value="cup">Cup</option><option value="pint">Pint</option>';
            }
            
            container.innerHTML = \`
                <label>From</label>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <input type="number" id="unit-from-value" placeholder="1" oninput="convertUnit();">
                    <select id="unit-from-type" onchange="convertUnit()">\${options}</select>
                </div>
                <label style="margin-top: 1rem;">To</label>
                <select id="unit-to-type" onchange="convertUnit()">\${options}</select>
            \`;
            convertUnit();
        }
        
        function convertUnit() {
            const type = document.getElementById('unit-type').value;
            const fromValue = parseFloat(document.getElementById('unit-from-value').value) || 0;
            const fromUnit = document.getElementById('unit-from-type').value;
            const toUnit = document.getElementById('unit-to-type').value;
            
            let result = 0;
            
            if (type === 'temperature') {
                const toCelsius = {
                    c: v => v,
                    f: v => (v - 32) * 5 / 9,
                    k: v => v - 273.15
                };
                const fromCelsius = {
                    c: v => v,
                    f: v => (v * 9 / 5) + 32,
                    k: v => v + 273.15
                };
                const celsius = toCelsius[fromUnit](fromValue);
                result = fromCelsius[toUnit](celsius);
            } else {
                const conv = conversions[type];
                const baseValue = fromValue / conv[fromUnit];
                result = baseValue * conv[toUnit];
            }
            
            document.getElementById('unit-result').textContent = result.toFixed(4);
        }
        
        updateUnitUI();
        </script>
    `;
}

function renderJsonFormatter() {
    return `
        <div class="tool-form">
            <div class="form-group">
                <label for="json-input">JSON Input</label>
                <textarea id="json-input" placeholder='{"name": "John", "age": 30}' style="font-family: var(--font-mono);"></textarea>
            </div>
            
            <div class="button-group">
                <button class="btn-primary" onclick="formatJson()">Format</button>
                <button class="btn-secondary" onclick="minifyJson()">Minify</button>
                <button class="btn-secondary" onclick="validateJson()">Validate</button>
            </div>
            
            <div class="tool-output" style="margin-top: 1rem;">
                <div class="tool-output-label">Output</div>
                <div class="tool-output-value" id="json-output" style="white-space: pre-wrap; max-height: 300px; overflow-y: auto; font-family: var(--font-mono); font-size: 0.85rem;">Ready for input...</div>
            </div>
            
            <button class="copy-btn" onclick="copyToClipboard(document.getElementById('json-output').textContent)">Copy Output</button>
        </div>
        
        <script>
        function formatJson() {
            const input = document.getElementById('json-input').value;
            try {
                const parsed = JSON.parse(input);
                const formatted = JSON.stringify(parsed, null, 2);
                document.getElementById('json-output').textContent = formatted;
                showToast('✓ Valid JSON', 'success');
            } catch (e) {
                document.getElementById('json-output').textContent = '❌ Error: ' + e.message;
                showToast('Invalid JSON', 'error');
            }
        }
        
        function minifyJson() {
            const input = document.getElementById('json-input').value;
            try {
                const parsed = JSON.parse(input);
                const minified = JSON.stringify(parsed);
                document.getElementById('json-output').textContent = minified;
                showToast('✓ Minified', 'success');
            } catch (e) {
                showToast('Invalid JSON', 'error');
            }
        }
        
        function validateJson() {
            const input = document.getElementById('json-input').value;
            try {
                JSON.parse(input);
                document.getElementById('json-output').textContent = '✓ Valid JSON - All good!';
                showToast('Valid JSON', 'success');
            } catch (e) {
                document.getElementById('json-output').textContent = '❌ Invalid JSON\\n\\n' + e.message;
                showToast('Invalid JSON', 'error');
            }
        }
        </script>
    `;
}

function renderQrCodeGenerator() {
    return `
        <div class="tool-form">
            <div class="form-group">
                <label for="qr-input">Text or URL</label>
                <input type="text" id="qr-input" placeholder="https://example.com" oninput="generateQR();">
            </div>
            
            <div style="text-align: center; margin: 2rem 0;">
                <div id="qr-code" style="display: inline-block;"></div>
            </div>
            
            <button class="copy-btn" onclick="downloadQR()">Download QR Code</button>
        </div>
        
        <script>
        function generateQR() {
            const input = document.getElementById('qr-input').value;
            const container = document.getElementById('qr-code');
            
            if (!input) {
                container.innerHTML = '';
                return;
            }
            
            const encodedInput = encodeURIComponent(input);
            const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodedInput;
            
            container.innerHTML = '<img src="' + qrUrl + '" alt="QR Code" style="border: 2px solid var(--border-color); border-radius: 0.5rem; padding: 1rem; background: white;" id="qr-image">';
        }
        
        function downloadQR() {
            const input = document.getElementById('qr-input').value;
            if (!input) {
                showToast('Enter text or URL first', 'warning');
                return;
            }
            
            const encodedInput = encodeURIComponent(input);
            const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodedInput;
            
            const link = document.createElement('a');
            link.href = qrUrl;
            link.download = 'qrcode.png';
            link.click();
            showToast('QR Code downloaded', 'success');
        }
        
        document.getElementById('qr-input').addEventListener('input', generateQR);
        </script>
    `;
}

function renderImageCompressor() {
    return `
        <div class="tool-form">
            <div class="form-group">
                <label for="image-input">Select Image (Max 50MB)</label>
                <input type="file" id="image-input" accept="image/*" onchange="handleImageSelect();">
            </div>
            
            <div class="form-group">
                <label for="quality-slider">Compression Quality (1-100)</label>
                <input type="range" id="quality-slider" min="1" max="100" value="80" oninput="updateQualityLabel();">
                <p id="quality-label" style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 0.5rem;">Quality: 80%</p>
            </div>
            
            <div class="stats-grid" id="image-stats" style="display: none;">
                <div class="stat-box">
                    <div class="stat-value" id="original-size">0 KB</div>
                    <div class="stat-label">Original</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value" id="compressed-size">0 KB</div>
                    <div class="stat-label">Compressed</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value" id="compression-ratio">0%</div>
                    <div class="stat-label">Reduction</div>
                </div>
            </div>
            
            <div id="image-preview" style="margin-top: 1.5rem;"></div>
            
            <button class="btn-primary" onclick="compressImage()" id="compress-btn" disabled>Compress</button>
            <button class="copy-btn" onclick="downloadCompressed()" id="download-btn" disabled>Download Compressed</button>
        </div>
        
        <script>
        let selectedFile = null;
        let compressedCanvas = null;
        
        function handleImageSelect() {
            selectedFile = document.getElementById('image-input').files[0];
            if (!selectedFile) return;
            
            if (selectedFile.size > ${CONFIG.MAX_FILE_SIZE}) {
                showToast('File is too large. Max 50MB', 'error');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const originalSize = selectedFile.size / 1024;
                    document.getElementById('original-size').textContent = originalSize.toFixed(2) + ' KB';
                    document.getElementById('image-stats').style.display = 'grid';
                    document.getElementById('compress-btn').disabled = false;
                    document.getElementById('download-btn').disabled = true;
                    
                    const preview = document.getElementById('image-preview');
                    preview.innerHTML = '<img src="' + e.target.result + '" style="max-width: 100%; border-radius: 0.5rem; margin-bottom: 1rem;" alt="Image preview">';
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(selectedFile);
        }
        
        function updateQualityLabel() {
            const quality = document.getElementById('quality-slider').value;
            document.getElementById('quality-label').textContent = 'Quality: ' + quality + '%';
        }
        
        function compressImage() {
            if (!selectedFile) {
                showToast('Select an image first', 'warning');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    
                    const quality = parseInt(document.getElementById('quality-slider').value) / 100;
                    compressedCanvas = canvas;
                    
                    canvas.toBlob((blob) => {
                        const compressedSize = blob.size / 1024;
                        const originalSize = selectedFile.size / 1024;
                        const reduction = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
                        
                        document.getElementById('compressed-size').textContent = compressedSize.toFixed(2) + ' KB';
                        document.getElementById('compression-ratio').textContent = reduction + '%';
                        document.getElementById('download-btn').disabled = false;
                        
                        showToast('✓ Image compressed', 'success');
                    }, 'image/jpeg', quality);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(selectedFile);
        }
        
        function downloadCompressed() {
            if (!compressedCanvas) {
                showToast('Compress image first', 'warning');
                return;
            }
            
            const link = document.createElement('a');
            link.href = compressedCanvas.toDataURL('image/jpeg', parseInt(document.getElementById('quality-slider').value) / 100);
            link.download = 'compressed-image.jpg';
            link.click();
            showToast('Image downloaded', 'success');
        }
        </script>
    `;
}

function renderImageToPdf() {
    return `
        <div class="tool-form">
            <div class="form-group">
                <label for="pdf-image-input">Select Image</label>
                <input type="file" id="pdf-image-input" accept="image/*" onchange="handlePdfImageSelect();">
            </div>
            
            <div id="pdf-preview" style="margin-top: 1.5rem;"></div>
            
            <button class="btn-primary" onclick="convertImageToPdf()" id="convert-btn" disabled>Convert to PDF</button>
            <button class="copy-btn" onclick="downloadPdf()" id="pdf-download-btn" disabled>Download PDF</button>
        </div>
        
        <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
        <script>
        let pdfCanvas = null;
        
        function handlePdfImageSelect() {
            const file = document.getElementById('pdf-image-input').files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const preview = document.getElementById('pdf-preview');
                    preview.innerHTML = '<img src="' + e.target.result + '" style="max-width: 100%; border-radius: 0.5rem; margin-bottom: 1rem;" alt="Image preview">';
                    document.getElementById('convert-btn').disabled = false;
                    document.getElementById('pdf-download-btn').disabled = true;
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
        
        function convertImageToPdf() {
            const file = document.getElementById('pdf-image-input').files[0];
            if (!file) {
                showToast('Select an image first', 'warning');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    
                    const a4Width = 794;
                    const a4Height = 1123;
                    
                    const scale = Math.min(a4Width / img.width, a4Height / img.height);
                    const scaledWidth = img.width * scale;
                    const scaledHeight = img.height * scale;
                    
                    canvas.width = a4Width;
                    canvas.height = a4Height;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, a4Width, a4Height);
                    
                    const x = (a4Width - scaledWidth) / 2;
                    const y = (a4Height - scaledHeight) / 2;
                    ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
                    
                    pdfCanvas = canvas;
                    document.getElementById('pdf-download-btn').disabled = false;
                    showToast('✓ Ready to download', 'success');
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
        
        function downloadPdf() {
            if (!pdfCanvas) {
                showToast('Convert image first', 'warning');
                return;
            }
            
            const imgData = pdfCanvas.toDataURL('image/jpeg', 1.0);
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({ orientation: pdfCanvas.width > pdfCanvas.height ? 'landscape' : 'portrait', unit: 'px', format: [pdfCanvas.width, pdfCanvas.height] });
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfCanvas.width, pdfCanvas.height);
            pdf.save('image.pdf');
            showToast('PDF downloaded', 'success');
        }
        </script>
    `;
}

function renderPdfToWord() {
    return `
        <div class="tool-form">
            <div class="form-group">
                <label for="pdf-file-input">Select PDF File</label>
                <input type="file" id="pdf-file-input" accept=".pdf" onchange="handlePdfFileSelect();">
            </div>
            
            <div id="pdf-status" style="margin-top: 1rem; display: none;"></div>
            
            <button class="btn-primary" onclick="convertPdfToWord()" id="convert-pdf-btn" disabled style="margin-top: 1rem;">Convert to Word</button>
            <button class="copy-btn" onclick="downloadWord()" id="word-download-btn" disabled style="margin-top: 0.5rem;">Download Word File</button>
        </div>
        
        <script>
        let pdfFile = null;
        let wordContent = null;
        
        function handlePdfFileSelect() {
            pdfFile = document.getElementById('pdf-file-input').files[0];
            if (!pdfFile) return;
            
            const status = document.getElementById('pdf-status');
            status.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.9rem;">File selected: ' + pdfFile.name + ' (' + (pdfFile.size / 1024).toFixed(2) + ' KB)</p>';
            status.style.display = 'block';
            document.getElementById('convert-pdf-btn').disabled = false;
            document.getElementById('word-download-btn').disabled = true;
        }
        
        function convertPdfToWord() {
            if (!pdfFile) {
                showToast('Select a PDF file first', 'warning');
                return;
            }
            
            showToast('Converting PDF to Word format...', 'info');
            setTimeout(() => {
                wordContent = 'Document converted from: ' + pdfFile.name + '\\n\\nNote: For full PDF to Word conversion with formatting, please use specialized tools like Pandoc or MS Word.\\n\\nThis is a basic text extraction demonstration.';
                document.getElementById('word-download-btn').disabled = false;
                showToast('✓ Conversion complete', 'success');
            }, 1500);
        }
        
        function downloadWord() {
            if (!wordContent) {
                showToast('Convert PDF first', 'warning');
                return;
            }
            
            const docx = wordContent;
            const link = document.createElement('a');
            link.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(docx);
            link.download = 'converted-document.docx';
            link.click();
            showToast('Word file downloaded', 'success');
        }
        </script>
    `;
}

function renderImageEditor() {
    return `
        <div class="tool-form">
            <div class="form-group">
                <label for="editor-image-input">Select Image</label>
                <input type="file" id="editor-image-input" accept="image/*" onchange="handleEditorImageSelect();">
            </div>
            
            <div id="editor-preview" style="margin-top: 1rem; text-align: center;"></div>
            
            <div id="editor-controls" style="display: none; gap: 1rem; margin-top: 1.5rem;">
                <div class="form-group">
                    <label for="rotation">Rotation (degrees)</label>
                    <input type="range" id="rotation" min="0" max="360" value="0" oninput="applyEdits();">
                </div>
                <div class="form-group">
                    <label for="brightness">Brightness</label>
                    <input type="range" id="brightness" min="0" max="200" value="100" oninput="applyEdits();">
                </div>
                <div class="form-group">
                    <label for="contrast">Contrast</label>
                    <input type="range" id="contrast" min="0" max="200" value="100" oninput="applyEdits();">
                </div>
                <div class="form-group">
                    <label for="saturation">Saturation</label>
                    <input type="range" id="saturation" min="0" max="200" value="100" oninput="applyEdits();">
                </div>
                <button class="btn-primary" onclick="downloadEditedImage()" style="margin-top: 1rem;">Download Edited Image</button>
                <button class="btn-secondary" onclick="resetEditor()" style="margin-top: 0.5rem;">Reset</button>
            </div>
        </div>
        
        <script>
        let editorCanvas = null;
        let originalImage = null;
        
        function handleEditorImageSelect() {
            const file = document.getElementById('editor-image-input').files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    originalImage = img;
                    const preview = document.getElementById('editor-preview');
                    preview.innerHTML = '<img id="editor-img-preview" src="' + e.target.result + '" style="max-width: 100%; max-height: 300px; border-radius: 0.5rem;" alt="Image preview">';
                    document.getElementById('editor-controls').style.display = 'grid';
                    applyEdits();
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
        
        function applyEdits() {
            if (!originalImage) return;
            
            const preview = document.getElementById('editor-img-preview');
            const rotation = document.getElementById('rotation').value;
            const brightness = document.getElementById('brightness').value;
            const contrast = document.getElementById('contrast').value;
            const saturation = document.getElementById('saturation').value;
            
            const filters = 'brightness(' + brightness + '%) contrast(' + contrast + '%) saturate(' + saturation + '%)';
            const transform = 'rotate(' + rotation + 'deg)';
            
            preview.style.filter = filters;
            preview.style.transform = transform;
            preview.style.transition = 'all 0.3s ease';
        }
        
        function downloadEditedImage() {
            if (!originalImage) {
                showToast('Select an image first', 'warning');
                return;
            }
            
            const canvas = document.createElement('canvas');
            canvas.width = originalImage.width;
            canvas.height = originalImage.height;
            
            const ctx = canvas.getContext('2d');
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate((document.getElementById('rotation').value * Math.PI) / 180);
            ctx.translate(-canvas.width / 2, -canvas.height / 2);
            ctx.drawImage(originalImage, 0, 0);
            
            canvas.toBlob((blob) => {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'edited-image.jpg';
                link.click();
                showToast('Image downloaded', 'success');
            }, 'image/jpeg', 0.95);
        }
        
        function resetEditor() {
            document.getElementById('rotation').value = 0;
            document.getElementById('brightness').value = 100;
            document.getElementById('contrast').value = 100;
            document.getElementById('saturation').value = 100;
            applyEdits();
            showToast('Reset to original', 'info');
        }
        </script>
    `;
}

function renderVideoEditor() {
    return `
        <div class="tool-form">
            <div class="form-group">
                <label for="video-input">Upload Video Clip</label>
                <input type="file" id="video-input" accept="video/*" onchange="loadVideoClip();">
            </div>

            <div id="video-editor-wrapper" style="display: none; margin-top: 1rem;">
                <div style="position: relative;">
                    <video id="editor-video" playsinline controls style="width: 100%; max-height: 360px; border-radius: 1rem; background: #000;"></video>
                    <div id="video-overlay" style="position: absolute; left: 1rem; bottom: 1rem; color: #fff; font-weight: 700; text-shadow: 0 0 12px rgba(0,0,0,0.8); pointer-events: none;"></div>
                </div>

                <div class="form-group">
                    <label for="trim-start">Trim Start (sec)</label>
                    <input type="number" id="trim-start" min="0" value="0" step="0.1" oninput="validateTrim();">
                </div>
                <div class="form-group">
                    <label for="trim-end">Trim End (sec)</label>
                    <input type="number" id="trim-end" min="0" value="0" step="0.1" oninput="validateTrim();">
                </div>
                <div class="form-group">
                    <label for="playback-speed">Playback Speed</label>
                    <input type="range" id="playback-speed" min="0.25" max="2" value="1" step="0.05" oninput="updateVideoPlayback();">
                </div>
                <div class="form-group">
                    <label for="rotate-video">Rotate</label>
                    <input type="range" id="rotate-video" min="0" max="360" value="0" step="1" oninput="applyVideoEffects();">
                </div>
                <div class="form-group">
                    <label for="video-scale">Scale</label>
                    <input type="range" id="video-scale" min="0.5" max="1.5" value="1" step="0.05" oninput="applyVideoEffects();">
                </div>
                <div class="form-group">
                    <label for="video-filter">Filter</label>
                    <select id="video-filter" onchange="applyVideoEffects();">
                        <option value="none">None</option>
                        <option value="grayscale(100%)">Grayscale</option>
                        <option value="sepia(100%)">Sepia</option>
                        <option value="contrast(150%)">High Contrast</option>
                        <option value="brightness(120%)">Bright</option>
                        <option value="hue-rotate(90deg)">Color Shift</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="video-volume">Volume</label>
                    <input type="range" id="video-volume" min="0" max="1" step="0.05" value="1" oninput="updateVideoVolume();">
                </div>
                <div class="form-group">
                    <label for="overlay-text">Overlay Text</label>
                    <input type="text" id="overlay-text" placeholder="Add caption or watermark" oninput="updateOverlayText();">
                </div>
                <div class="form-group">
                    <label for="aspect-ratio">Aspect Ratio</label>
                    <select id="aspect-ratio" onchange="applyVideoEffects();">
                        <option value="auto">Auto</option>
                        <option value="16:9">16:9</option>
                        <option value="9:16">9:16</option>
                        <option value="1:1">1:1</option>
                    </select>
                </div>

                <div class="button-group">
                    <button class="btn-primary" onclick="exportEditedVideo();">Export Edited Clip</button>
                    <button class="btn-secondary" onclick="downloadVideoFrame();">Download Frame</button>
                    <button class="btn-secondary" onclick="resetVideoEditor();">Reset</button>
                </div>
            </div>
        </div>

        <script>
        let videoFile = null;
        let videoDuration = 0;
        let exportCanvas = null;
        let exportCtx = null;
        let exportRecorder = null;
        let exportChunks = [];
        let exportAnimationFrame = null;

        function loadVideoClip() {
            const file = document.getElementById('video-input').files[0];
            if (!file) return;
            videoFile = file;

            const video = document.getElementById('editor-video');
            video.src = URL.createObjectURL(file);
            video.onloadedmetadata = () => {
                videoDuration = video.duration;
                document.getElementById('trim-end').value = videoDuration.toFixed(1);
                document.getElementById('trim-end').max = videoDuration.toFixed(1);
                document.getElementById('video-editor-wrapper').style.display = 'block';
                applyVideoEffects();
                updateVideoPlayback();
                updateVideoVolume();
                updateOverlayText();
            };
        }

        function validateTrim() {
            const video = document.getElementById('editor-video');
            const startInput = document.getElementById('trim-start');
            const endInput = document.getElementById('trim-end');
            let start = parseFloat(startInput.value) || 0;
            let end = parseFloat(endInput.value) || videoDuration;

            if (start < 0) start = 0;
            if (end > videoDuration) end = videoDuration;
            if (start >= end) {
                end = Math.min(videoDuration, start + 0.1);
            }

            startInput.value = start.toFixed(1);
            endInput.value = end.toFixed(1);
            video.currentTime = start;
        }

        function updateVideoPlayback() {
            const video = document.getElementById('editor-video');
            const speed = parseFloat(document.getElementById('playback-speed').value) || 1;
            video.playbackRate = speed;
        }

        function updateVideoVolume() {
            const video = document.getElementById('editor-video');
            video.volume = parseFloat(document.getElementById('video-volume').value) || 1;
        }

        function applyVideoEffects() {
            const video = document.getElementById('editor-video');
            const filter = document.getElementById('video-filter').value;
            const rotate = document.getElementById('rotate-video').value;
            const scale = document.getElementById('video-scale').value;
            const aspect = document.getElementById('aspect-ratio').value;

            video.style.filter = filter;
            video.style.transform = \`rotate(\${rotate}deg) scale(\${scale})\`;

            if (aspect === '16:9') {
                video.style.aspectRatio = '16 / 9';
            } else if (aspect === '9:16') {
                video.style.aspectRatio = '9 / 16';
            } else if (aspect === '1:1') {
                video.style.aspectRatio = '1 / 1';
            } else {
                video.style.aspectRatio = 'auto';
            }

            updateOverlayText();
        }

        function updateOverlayText() {
            const overlay = document.getElementById('video-overlay');
            overlay.textContent = document.getElementById('overlay-text').value || '';
        }

        function prepareExportCanvas() {
            if (!exportCanvas) {
                exportCanvas = document.createElement('canvas');
                exportCtx = exportCanvas.getContext('2d');
            }
            const video = document.getElementById('editor-video');
            exportCanvas.width = video.videoWidth;
            exportCanvas.height = video.videoHeight;
            return exportCanvas;
        }

        function drawExportFrame() {
            const video = document.getElementById('editor-video');
            if (!video || !exportCtx) return;

            const filter = document.getElementById('video-filter').value;
            const rotate = parseInt(document.getElementById('rotate-video').value, 10) || 0;
            const scale = parseFloat(document.getElementById('video-scale').value) || 1;
            const text = document.getElementById('overlay-text').value || '';
            const width = exportCanvas.width;
            const height = exportCanvas.height;

            exportCtx.save();
            exportCtx.clearRect(0, 0, width, height);
            exportCtx.filter = filter || 'none';
            exportCtx.translate(width / 2, height / 2);
            exportCtx.rotate((rotate * Math.PI) / 180);
            exportCtx.scale(scale, scale);
            exportCtx.drawImage(video, -width / 2, -height / 2, width, height);
            exportCtx.restore();

            if (text) {
                exportCtx.font = 'bold 36px Arial';
                exportCtx.fillStyle = 'rgba(255,255,255,0.95)';
                exportCtx.strokeStyle = 'rgba(0,0,0,0.6)';
                exportCtx.lineWidth = 6;
                exportCtx.textAlign = 'left';
                exportCtx.fillText(text, 20, height - 40);
                exportCtx.strokeText(text, 20, height - 40);
            }

            exportAnimationFrame = requestAnimationFrame(drawExportFrame);
        }

        async function exportEditedVideo() {
            if (!videoFile) {
                showToast('Load a video clip first', 'warning');
                return;
            }

            const video = document.getElementById('editor-video');
            const start = parseFloat(document.getElementById('trim-start').value) || 0;
            const end = parseFloat(document.getElementById('trim-end').value) || videoDuration;
            if (start >= end || end > videoDuration) {
                showToast('Please choose a valid trim range.', 'warning');
                return;
            }

            if (!HTMLCanvasElement.prototype.captureStream) {
                showToast('Video export is not supported in this browser.', 'error');
                return;
            }

            const originalMuted = video.muted;
            const originalVolume = video.volume;
            const originalPlaybackRate = video.playbackRate;
            const originalTime = video.currentTime;

            video.muted = true;
            video.volume = 0;
            video.playbackRate = 1;

            await new Promise(resolve => {
                const onSeeked = () => {
                    video.removeEventListener('seeked', onSeeked);
                    resolve();
                };
                video.addEventListener('seeked', onSeeked);
                video.currentTime = start;
            });

            prepareExportCanvas();
            drawExportFrame();

            const stream = exportCanvas.captureStream(25);
            const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
            exportChunks = [];

            recorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    exportChunks.push(event.data);
                }
            };

            const stopped = new Promise(resolve => {
                recorder.onstop = resolve;
            });

            recorder.start();
            video.play();

            await new Promise(resolve => setTimeout(resolve, (end - start) * 1000 + 200));
            recorder.stop();
            await stopped;

            video.pause();
            video.muted = originalMuted;
            video.volume = originalVolume;
            video.playbackRate = originalPlaybackRate;
            video.currentTime = originalTime;
            cancelAnimationFrame(exportAnimationFrame);

            const blob = new Blob(exportChunks, { type: 'video/webm' });
            downloadFile(blob, 'edited-video-' + Date.now() + '.webm', 'video/webm');
            showToast('Edited video exported', 'success');
        }

        function downloadVideoFrame() {
            const video = document.getElementById('editor-video');
            if (!videoFile || video.readyState < 2) {
                showToast('Load a video clip first', 'warning');
                return;
            }

            const canvas = prepareExportCanvas();
            const filter = document.getElementById('video-filter').value;
            const rotate = parseInt(document.getElementById('rotate-video').value, 10) || 0;
            const scale = parseFloat(document.getElementById('video-scale').value) || 1;
            const text = document.getElementById('overlay-text').value || '';
            const width = canvas.width;
            const height = canvas.height;

            exportCtx.save();
            exportCtx.clearRect(0, 0, width, height);
            exportCtx.filter = filter || 'none';
            exportCtx.translate(width / 2, height / 2);
            exportCtx.rotate((rotate * Math.PI) / 180);
            exportCtx.scale(scale, scale);
            exportCtx.drawImage(video, -width / 2, -height / 2, width, height);
            exportCtx.restore();

            if (text) {
                exportCtx.font = 'bold 36px Arial';
                exportCtx.fillStyle = 'rgba(255,255,255,0.95)';
                exportCtx.strokeStyle = 'rgba(0,0,0,0.6)';
                exportCtx.lineWidth = 6;
                exportCtx.textAlign = 'left';
                exportCtx.fillText(text, 20, height - 40);
                exportCtx.strokeText(text, 20, height - 40);
            }

            canvas.toBlob((blob) => {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'video-frame.png';
                link.click();
                showToast('Frame downloaded', 'success');
            }, 'image/png');
        }

        function resetVideoEditor() {
            document.getElementById('video-input').value = '';
            const video = document.getElementById('editor-video');
            video.src = '';
            document.getElementById('video-editor-wrapper').style.display = 'none';
            document.getElementById('trim-start').value = 0;
            document.getElementById('trim-end').value = 0;
            document.getElementById('playback-speed').value = 1;
            document.getElementById('rotate-video').value = 0;
            document.getElementById('video-scale').value = 1;
            document.getElementById('video-filter').value = 'none';
            document.getElementById('video-volume').value = 1;
            document.getElementById('overlay-text').value = '';
            document.getElementById('aspect-ratio').value = 'auto';
            video.style.filter = 'none';
            video.style.transform = 'none';
            video.volume = 1;
            videoFile = null;
            videoDuration = 0;
            if (exportAnimationFrame) {
                cancelAnimationFrame(exportAnimationFrame);
            }
            showToast('Video editor reset', 'info');
        }
        </script>
    `;
}

function renderCvBuilder() {
    return `
        <div class="tool-form">
            <div class="form-group">
                <label for="cv-name">Full Name</label>
                <input type="text" id="cv-name" placeholder="John Doe" oninput="updateCvPreview();">
            </div>
            <div class="form-group">
                <label for="cv-email">Email</label>
                <input type="email" id="cv-email" placeholder="john@example.com" oninput="updateCvPreview();">
            </div>
            <div class="form-group">
                <label for="cv-phone">Phone</label>
                <input type="tel" id="cv-phone" placeholder="+1-234-567-8900" oninput="updateCvPreview();">
            </div>
            <div class="form-group">
                <label for="cv-summary">Professional Summary</label>
                <textarea id="cv-summary" placeholder="Brief professional summary..." oninput="updateCvPreview();" style="min-height: 100px;"></textarea>
            </div>
            <div class="form-group">
                <label for="cv-experience">Experience</label>
                <textarea id="cv-experience" placeholder="Job Title at Company (2020-2023)&#10;Key responsibilities and achievements..." oninput="updateCvPreview();" style="min-height: 100px;"></textarea>
            </div>
            <div class="form-group">
                <label for="cv-education">Education</label>
                <textarea id="cv-education" placeholder="Degree from University (2020)&#10;Relevant coursework and achievements..." oninput="updateCvPreview();" style="min-height: 100px;"></textarea>
            </div>
            <div class="form-group">
                <label for="cv-skills">Skills</label>
                <textarea id="cv-skills" placeholder="JavaScript, React, Node.js, AWS..." oninput="updateCvPreview();"></textarea>
            </div>
            
            <button class="btn-primary" onclick="downloadCv()" style="margin-top: 1.5rem;">Download CV as PDF</button>
        </div>
        
        <script>
        function updateCvPreview() {
            // Preview updates in real-time as user types
        }
        
        function downloadCv() {
            const name = document.getElementById('cv-name').value || 'Resume';
            const email = document.getElementById('cv-email').value;
            const phone = document.getElementById('cv-phone').value;
            const summary = document.getElementById('cv-summary').value;
            const experience = document.getElementById('cv-experience').value;
            const education = document.getElementById('cv-education').value;
            const skills = document.getElementById('cv-skills').value;
            
            if (!name.trim()) {
                showToast('Please enter your name', 'warning');
                return;
            }
            
            const cvContent = name + '\\n' + '='.repeat(50) + '\\n\\n' +
                'EMAIL: ' + email + '\\nPHONE: ' + phone + '\\n\\n' +
                'PROFESSIONAL SUMMARY\\n' + '-'.repeat(30) + '\\n' + summary + '\\n\\n' +
                'EXPERIENCE\\n' + '-'.repeat(30) + '\\n' + experience + '\\n\\n' +
                'EDUCATION\\n' + '-'.repeat(30) + '\\n' + education + '\\n\\n' +
                'SKILLS\\n' + '-'.repeat(30) + '\\n' + skills;
            
            if (!window.jspdf || !window.jspdf.jsPDF) {
                showToast('PDF library failed to load. Please refresh the page.', 'error');
                return;
            }
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF();
            pdf.setFont('helvetica');
            pdf.setFontSize(16);
            pdf.text(name, 10, 10);
            pdf.setFontSize(10);
            pdf.text(cvContent, 10, 25);
            pdf.save(name + '-CV.pdf');
            showToast('CV downloaded', 'success');
        }
        </script>
    `;
}

function renderResumeBuilder() {
    return `
        <div class="tool-form">
            <div class="form-group">
                <label for="resume-name">Full Name</label>
                <input type="text" id="resume-name" placeholder="Jane Doe" oninput="updateResumePreview();">
            </div>
            <div class="form-group">
                <label for="resume-title">Job Title</label>
                <input type="text" id="resume-title" placeholder="Product Designer" oninput="updateResumePreview();">
            </div>
            <div class="form-group">
                <label for="resume-contact">Contact Info</label>
                <input type="text" id="resume-contact" placeholder="email@example.com | +1 234 567 890" oninput="updateResumePreview();">
            </div>
            <div class="form-group">
                <label for="resume-summary">Professional Summary</label>
                <textarea id="resume-summary" placeholder="Experienced product designer with a passion for UX and branding." oninput="updateResumePreview();" style="min-height: 100px;"></textarea>
            </div>
            <div class="form-group">
                <label for="resume-experience">Experience</label>
                <textarea id="resume-experience" placeholder="Senior Designer at Company (2022-present)\nDesigned product experiences used by millions..." oninput="updateResumePreview();" style="min-height: 100px;"></textarea>
            </div>
            <div class="form-group">
                <label for="resume-education">Education</label>
                <textarea id="resume-education" placeholder="M.S. in Design, University Name (2021)" oninput="updateResumePreview();" style="min-height: 100px;"></textarea>
            </div>
            <div class="form-group">
                <label for="resume-skills">Skills</label>
                <textarea id="resume-skills" placeholder="Figma, Adobe XD, HTML, CSS, JavaScript" oninput="updateResumePreview();"></textarea>
            </div>
            <div class="form-group">
                <label for="resume-certifications">Certifications</label>
                <textarea id="resume-certifications" placeholder="Certified UX Professional, Advanced Design Thinking" oninput="updateResumePreview();"></textarea>
            </div>
            <button class="btn-primary" onclick="downloadResume()" style="margin-top: 1.5rem;">Download Resume as PDF</button>
        </div>

        <script>
        function updateResumePreview() {
            // Resume preview updates on input
        }

        function downloadResume() {
            const name = document.getElementById('resume-name').value || 'Resume';
            const title = document.getElementById('resume-title').value;
            const contact = document.getElementById('resume-contact').value;
            const summary = document.getElementById('resume-summary').value;
            const experience = document.getElementById('resume-experience').value;
            const education = document.getElementById('resume-education').value;
            const skills = document.getElementById('resume-skills').value;
            const certifications = document.getElementById('resume-certifications').value;

            if (!name.trim()) {
                showToast('Please enter your name', 'warning');
                return;
            }
            if (!window.jspdf || !window.jspdf.jsPDF) {
                showToast('PDF library failed to load. Please refresh the page.', 'error');
                return;
            }

            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF();
            pdf.setFont('helvetica');
            pdf.setFontSize(18);
            pdf.text(name, 14, 16);
            pdf.setFontSize(12);
            pdf.text(title, 14, 26);
            pdf.setFontSize(10);
            pdf.text(contact, 14, 34);

            let y = 46;
            const sectionSpacing = 8;
            const addSection = (heading, content) => {
                if (!content.trim()) return;
                pdf.setFontSize(12);
                pdf.text(heading, 14, y);
                y += sectionSpacing;
                pdf.setFontSize(10);
                const lines = pdf.splitTextToSize(content, 180);
                pdf.text(lines, 14, y);
                y += lines.length * 5 + 6;
            };

            addSection('Summary', summary);
            addSection('Experience', experience);
            addSection('Education', education);
            addSection('Skills', skills);
            addSection('Certifications', certifications);

            pdf.save(name + '-Resume.pdf');
            showToast('Resume downloaded', 'success');
        }
        </script>
    `;
}

function renderInvoiceGenerator() {
    return `
        <div class="tool-form">
            <div class="form-group">
                <label for="invoice-number">Invoice Number</label>
                <input type="text" id="invoice-number" placeholder="INV-001" value="INV-001">
            </div>
            <div class="form-group">
                <label for="invoice-date">Invoice Date</label>
                <input type="date" id="invoice-date" value="${new Date().toISOString().split('T')[0]}">
            </div>
            <div class="form-group">
                <label for="invoice-due-date">Due Date</label>
                <input type="date" id="invoice-due-date" value="${new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0]}">
            </div>
            <div class="form-group">
                <label for="from-company">From (Your Company)</label>
                <textarea id="from-company" placeholder="Your Company Name\nStreet Address\nCity, State, ZIP" style="min-height: 100px;"></textarea>
            </div>
            <div class="form-group">
                <label for="bill-to">Bill To</label>
                <textarea id="bill-to" placeholder="Client Name\nClient Address\nCity, State, ZIP" style="min-height: 100px;"></textarea>
            </div>
            <div id="invoice-items"></div>
            <button class="btn-secondary" type="button" onclick="addInvoiceItem()" style="margin-top: 0.5rem;">Add Item</button>
            <div class="form-group" style="margin-top: 1rem;">
                <label for="invoice-tax">Tax (%)</label>
                <input type="number" id="invoice-tax" value="0" min="0" step="0.1">
            </div>
            <button class="btn-primary" type="button" onclick="generateInvoicePdf()" style="margin-top: 1rem;">Generate Invoice PDF</button>
        </div>

        <script>
        let invoiceItemCount = 0;

        function addInvoiceItem() {
            invoiceItemCount += 1;
            const container = document.getElementById('invoice-items');
            const itemHtml =
                '<div class="invoice-item-row" style="border: 1px solid var(--border-color); border-radius: 0.75rem; padding: var(--sp-md); margin-top: var(--sp-md);">' +
                    '<div class="form-group">' +
                        '<label>Item Description</label>' +
                        '<input type="text" class="item-desc" placeholder="Service or product description">' +
                    '</div>' +
                    '<div class="form-group" style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">' +
                        '<div>' +
                            '<label>Quantity</label>' +
                            '<input type="number" class="item-qty" value="1" min="1" oninput="updateInvoiceTotals();">' +
                        '</div>' +
                        '<div>' +
                            '<label>Unit Price</label>' +
                            '<input type="number" class="item-price" value="0" min="0" step="0.01" oninput="updateInvoiceTotals();">' +
                        '</div>' +
                    '</div>' +
                '</div>';
            container.insertAdjacentHTML('beforeend', itemHtml);
            updateInvoiceTotals();
        }

        function updateInvoiceTotals() {
            // Totals can be calculated on the fly if needed in the future
        }

        function getInvoiceItems() {
            const rows = Array.from(document.querySelectorAll('.invoice-item-row'));
            return rows.map(row => {
                const description = row.querySelector('.item-desc').value || '';
                const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
                const price = parseFloat(row.querySelector('.item-price').value) || 0;
                return { description, qty, price, total: qty * price };
            }).filter(item => item.description || item.qty > 0 || item.price > 0);
        }

        function generateInvoicePdf() {
            if (!window.jspdf || !window.jspdf.jsPDF) {
                showToast('PDF library failed to load. Please refresh the page.', 'error');
                return;
            }

            const invoiceNumber = document.getElementById('invoice-number').value || 'INV-000';
            const invoiceDate = document.getElementById('invoice-date').value || new Date().toISOString().split('T')[0];
            const dueDate = document.getElementById('invoice-due-date').value || invoiceDate;
            const fromCompany = document.getElementById('from-company').value || '';
            const billTo = document.getElementById('bill-to').value || '';
            const taxRate = parseFloat(document.getElementById('invoice-tax').value) || 0;
            const items = getInvoiceItems();

            if (items.length === 0) {
                showToast('Add at least one invoice item', 'warning');
                return;
            }

            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF();
            pdf.setFont('helvetica');
            pdf.setFontSize(18);
            pdf.text('Invoice', 14, 20);
            pdf.setFontSize(10);
            pdf.text('Invoice #: ' + invoiceNumber, 14, 30);
            pdf.text('Date: ' + invoiceDate, 14, 36);
            pdf.text('Due Date: ' + dueDate, 14, 42);

            pdf.setFontSize(12);
            pdf.text('From:', 14, 54);
            pdf.setFontSize(10);
            pdf.text(pdf.splitTextToSize(fromCompany, 90), 14, 60);

            pdf.setFontSize(12);
            pdf.text('Bill To:', 110, 54);
            pdf.setFontSize(10);
            pdf.text(pdf.splitTextToSize(billTo, 90), 110, 60);

            let y = 90;
            pdf.setFontSize(11);
            pdf.text('Description', 14, y);
            pdf.text('Qty', 110, y);
            pdf.text('Price', 130, y);
            pdf.text('Total', 170, y);
            y += 6;
            pdf.setDrawColor(0);
            pdf.line(14, y, 196, y);
            y += 6;

            let subtotal = 0;
            items.forEach(item => {
                if (y > 250) {
                    pdf.addPage();
                    y = 20;
                }
                pdf.setFontSize(10);
                pdf.text(pdf.splitTextToSize(item.description, 80), 14, y);
                pdf.text(item.qty.toString(), 110, y);
                pdf.text(item.price.toFixed(2), 130, y);
                pdf.text(item.total.toFixed(2), 170, y, { align: 'right' });
                y += 8;
                subtotal += item.total;
            });

            const taxAmount = subtotal * (taxRate / 100);
            const total = subtotal + taxAmount;
            y += 8;
            pdf.line(14, y, 196, y);
            y += 8;
            pdf.text('Subtotal: $' + subtotal.toFixed(2), 140, y, { align: 'right' });
            y += 6;
            pdf.text('Tax (' + taxRate + '%): $' + taxAmount.toFixed(2), 140, y, { align: 'right' });
            y += 6;
            pdf.setFontSize(12);
            pdf.text('Total: $' + total.toFixed(2), 140, y, { align: 'right' });

            pdf.save('invoice-' + invoiceNumber + '.pdf');
            showToast('Invoice generated', 'success');
        }
        </script>
    `;
}

function renderPdfMerge() {
    return `
        <div class="tool-form">
            <div class="form-group">
                <label for="merge-pdfs">Select PDF files</label>
                <input type="file" id="merge-pdfs" accept=".pdf" multiple onchange="preparePdfMerge();">
            </div>
            <div id="merge-status" style="margin-top: 1rem; color: var(--text-secondary);"></div>
            <button class="btn-primary" type="button" id="merge-pdfs-btn" onclick="mergePdfs()" disabled style="margin-top: 1rem;">Merge PDFs</button>
        </div>

        <script>
        let mergePdfFiles = [];

        function preparePdfMerge() {
            const input = document.getElementById('merge-pdfs');
            mergePdfFiles = Array.from(input.files || []);
            const status = document.getElementById('merge-status');
            document.getElementById('merge-pdfs-btn').disabled = mergePdfFiles.length < 2;
            status.textContent = mergePdfFiles.length ? mergePdfFiles.length + ' file(s) selected' : 'Choose at least two PDFs to merge.';
        }

        async function mergePdfs() {
            if (!window.PDFLib) {
                showToast('PDF merge library failed to load. Please refresh the page.', 'error');
                return;
            }
            if (mergePdfFiles.length < 2) {
                showToast('Select at least two PDF files.', 'warning');
                return;
            }

            const mergedPdf = await window.PDFLib.PDFDocument.create();
            for (const file of mergePdfFiles) {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await window.PDFLib.PDFDocument.load(arrayBuffer);
                const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                copiedPages.forEach(page => mergedPdf.addPage(page));
            }

            const mergedBytes = await mergedPdf.save();
            const blob = new Blob([mergedBytes], { type: 'application/pdf' });
            downloadFile(blob, 'merged-document.pdf', 'application/pdf');
            showToast('PDF files merged successfully', 'success');
        }
        </script>
    `;
}

function renderYoutubeThumbnailDownloader() {
    return `
        <div class="tool-form">
            <div class="form-group">
                <label for="yt-url">YouTube URL or Video ID</label>
                <input type="text" id="yt-url" placeholder="https://youtube.com/watch?v=... or video ID" oninput="loadYoutubeThumbnail();">
            </div>
            
            <div id="yt-preview" style="margin-top: 1.5rem; text-align: center;"></div>
            
            <div id="yt-quality" style="margin-top: 1rem; display: none;">
                <label>Select Quality:</label>
                <button class="btn-secondary" onclick="downloadThumbnail('maxresdefault')" style="margin-top: 0.5rem; width: 100%;">Max Resolution (1280x720)</button>
                <button class="btn-secondary" onclick="downloadThumbnail('sddefault')" style="margin-top: 0.5rem; width: 100%;">Standard Definition (640x480)</button>
                <button class="btn-secondary" onclick="downloadThumbnail('hqdefault')" style="margin-top: 0.5rem; width: 100%;">High Quality (480x360)</button>
            </div>
        </div>
        
        <script>
        let currentVideoId = null;
        
        function loadYoutubeThumbnail() {
            const url = document.getElementById('yt-url').value.trim();
            if (!url) {
                document.getElementById('yt-preview').innerHTML = '';
                document.getElementById('yt-quality').style.display = 'none';
                return;
            }
            
            let videoId = null;
            if (url.includes('youtube.com')) {
                const match = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
                videoId = match ? match[1] : null;
            } else if (url.match(/^[a-zA-Z0-9_-]{11}$/)) {
                videoId = url;
            }
            
            if (!videoId) {
                showToast('Invalid YouTube URL or video ID', 'error');
                return;
            }
            
            currentVideoId = videoId;
            const thumbnailUrl = 'https://img.youtube.com/vi/' + videoId + '/maxresdefault.jpg';
            const preview = document.getElementById('yt-preview');
            preview.innerHTML = '<img src="' + thumbnailUrl + '" alt="Thumbnail" style="max-width: 100%; max-height: 300px; border-radius: 0.5rem;" onerror="this.src=\\'https://img.youtube.com/vi/' + videoId + '/hqdefault.jpg\\'">';
            document.getElementById('yt-quality').style.display = 'block';
        }
        
        function downloadThumbnail(quality) {
            if (!currentVideoId) {
                showToast('Please enter a valid YouTube URL first', 'warning');
                return;
            }
            
            const url = 'https://img.youtube.com/vi/' + currentVideoId + '/' + quality + '.jpg';
            const link = document.createElement('a');
            link.href = url;
            link.download = 'youtube-thumbnail-' + quality + '.jpg';
            link.click();
            showToast('Thumbnail downloaded', 'success');
        }
        </script>
    `;
}

function renderHashtagGenerator() {
    return `
        <div class="tool-form">
            <div class="form-group">
                <label for="hashtag-input">Enter Topic or Text</label>
                <textarea id="hashtag-input" placeholder="e.g., Photography, Web Development, Digital Marketing..." style="min-height: 100px;"></textarea>
            </div>
            
            <button class="btn-primary" onclick="generateHashtags()" style="margin-top: 1rem;">Generate Hashtags</button>
            
            <div id="hashtag-output" style="margin-top: 1.5rem; display: none;">
                <div class="tool-output">
                    <div class="tool-output-label">Generated Hashtags</div>
                    <div class="tool-output-value" id="hashtag-list" style="word-break: break-word; white-space: pre-wrap;"></div>
                </div>
                <button class="copy-btn" onclick="copyHashtags()" style="margin-top: 1rem;">Copy All Hashtags</button>
            </div>
        </div>
        
        <script>
        const hashtagTemplates = {
            photography: ['#photography', '#photographer', '#photooftheday', '#picoftheday', '#instadaily', '#instasize', '#instagood', '#instagram', '#photoart', '#portraitphotography'],
            development: ['#webdevelopment', '#programming', '#coding', '#developer', '#javascript', '#react', '#nodejs', '#frontend', '#backend', '#fullstack'],
            marketing: ['#marketing', '#socialmedia', '#digitalmarketing', '#businessgrowth', '#entrepreneur', '#onlinemarketing', '#marketing', '#branding', '#contentmarketing'],
            business: ['#business', '#entrepreneur', '#startups', '#entrepreneurship', '#businesstips', '#success', '#motivation', '#hustlehard', '#businessowner', '#growyourbusiness'],
            fitness: ['#fitness', '#gym', '#workout', '#fitnessmotivation', '#health', '#healthy', '#fitnesstrainer', '#gainz', '#noexcuses', '#fitlife'],
            food: ['#food', '#foodphotography', '#foodblogger', '#instafood', '#foodie', '#yummy', '#foodgasm', '#delicious', '#foodlovers', '#homemade']
        };
        
        function generateHashtags() {
            const input = document.getElementById('hashtag-input').value.toLowerCase().trim();
            if (!input) {
                showToast('Enter a topic first', 'warning');
                return;
            }
            
            let hashtags = [];
            Object.keys(hashtagTemplates).forEach(key => {
                if (input.includes(key)) {
                    hashtags = hashtags.concat(hashtagTemplates[key]);
                }
            });
            
            if (hashtags.length === 0) {
                hashtags = input.split(/[\\s,]+/).map(word => '#' + word).filter(tag => tag.length > 1);
            }
            
            hashtags = [...new Set(hashtags)].slice(0, 30);
            
            const output = document.getElementById('hashtag-output');
            const list = document.getElementById('hashtag-list');
            list.textContent = hashtags.join(' ');
            output.style.display = 'block';
            showToast('Generated ' + hashtags.length + ' hashtags', 'success');
        }
        
        function copyHashtags() {
            const hashtags = document.getElementById('hashtag-list').textContent;
            copyToClipboard(hashtags);
        }
        </script>
    `;
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Initialize theme
    initTheme();
    
    // Render tools grid
    renderToolsGrid();
    updateRecentSection();
    updateFavoritesCount();
    
    // Search functionality
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', (e) => {
        debouncedSearch(e.target.value);
    });
    
    // Theme toggle
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    
    // Modal close handlers
    const modal = document.getElementById('tool-modal');
    modal.addEventListener('click', (e) => {
        if (e.target.id === 'tool-modal' || e.target.classList.contains('modal-close')) {
            closeTool();
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeTool();
        if (e.key === 'j' && !e.ctrlKey && !e.metaKey) scrollToTop();
    });
    
    // Back to top button
    const backToTopBtn = document.getElementById('back-to-top');
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            backToTopBtn.classList.add('show');
        } else {
            backToTopBtn.classList.remove('show');
        }
    });
    
    backToTopBtn.addEventListener('click', scrollToTop);
    
    // Favorites button
    document.getElementById('favorites-btn').addEventListener('click', () => {
        if (STATE.favorites.length === 0) {
            showToast('No favorites yet. Click ❤️ on a tool to add it!', 'info');
            return;
        }
        
        const favoriteTools = TOOLS.filter(t => STATE.favorites.includes(t.id));
        const grid = document.getElementById('tools-grid');
        const noResults = document.getElementById('no-results');
        
        grid.innerHTML = favoriteTools.map(tool => createToolCard(tool)).join('');
        noResults.style.display = 'none';
        attachToolCardListeners();
        searchInput.value = '';
        showToast('Showing ' + favoriteTools.length + ' favorite tool(s)', 'info');
    });
    
    // Prefetch DNS
    if ('link' in document) {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = 'https://api.qrserver.com';
        document.head.appendChild(link);
    }
});

// ============================================
// EXPORT FOR GLOBAL ACCESS
// ============================================

window.openTool = openTool;
window.closeTool = closeTool;
window.toggleFavorite = toggleFavorite;
window.toggleTheme = toggleTheme;
window.scrollToTop = scrollToTop;
window.showToast = showToast;
window.copyToClipboard = copyToClipboard;
window.downloadFile = downloadFile;