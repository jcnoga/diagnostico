// Verifica se está rodando via arquivo local (file://)
if (window.location.protocol === 'file:') {
    document.body.innerHTML = `
        <div style="display:flex; justify-content:center; align-items:center; height:100vh; background:#2c3e50; color:white; font-family:sans-serif; text-align:center;">
            <div>
                <h1 style="color:#e74c3c; font-size:3rem;">⚠️ Execução Bloqueada</h1>
                <p style="font-size:1.2rem; margin-top:20px;">Por motivos de segurança e conexão com o Firebase, <br>este aplicativo não pode ser executado diretamente pelo arquivo.</p>
                <hr style="border-color:#555; margin:20px 0;">
                <p><strong>Como resolver:</strong></p>
                <p>Utilize um servidor local (ex: VS Code Live Server, XAMPP, Python http.server)<br>ou hospede a aplicação na web.</p>
                <p style="color:#f1c40f; margin-top:15px;">O endereço deve começar com <strong>http://</strong> ou <strong>https://</strong></p>
            </div>
        </div>
    `;
    throw new Error("Execução via file:// bloqueada por segurança.");
}

// --- 1. CONFIGURAÇÃO DO FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyAp7z_Jof1hQdA1YPZcyXFCHk6vXaQ1jlM",
  authDomain: "diagnostico-a2247.firebaseapp.com",
  projectId: "diagnostico-a2247",
  storageBucket: "diagnostico-a2247.firebasestorage.app",
  messagingSenderId: "125978207628",
  appId: "1:125978207628:web:f5135603051550de1fe2a9",
  measurementId: "G-6R39CB3R52"
};

// --- GESTÃO DE ESTADOS E SEGURANÇA ---
window.unsubscribeListeners = [];
window.appTimers = [];
window.appIniciado = false;
window.usuarioAtual = null;
let appInicializado = false;

// Inicializa Firebase
let auth, db;
try {
    if (firebaseConfig.apiKey !== "COLE_SUA_API_KEY_AQUI") {
        firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        db = firebase.firestore();
        console.log("Firebase inicializado com sucesso");

        window.addEventListener("pageshow", function (event) {
          if (event.persisted) {
            location.reload();
          }
        });

        auth.onAuthStateChanged(async (user) => {
            if (appInicializado) return;
            appInicializado = true;

            if (user) {
                try {
                    await auth.signOut();
                } catch(e) {
                    console.warn("Erro no logout forçado:", e);
                }
                mostrarTelaLogin();
            } else {
                mostrarTelaLogin();
            }
        });

    } else {
        console.warn("Firebase Config não preenchido. As funcionalidades de nuvem não funcionarão.");
    }
} catch (e) {
    console.error("Erro ao inicializar Firebase:", e);
}

// --- FUNÇÕES DE SEGURANÇA E UI ---

function mostrarTelaLogin() {
    if(document.getElementById('loadingOverlay')) document.getElementById('loadingOverlay').style.display = 'none';
    if(document.getElementById('authScreen')) document.getElementById('authScreen').style.display = 'flex';
    if(document.querySelector('.container')) document.querySelector('.container').style.display = 'none';
    if(document.querySelector('header')) document.querySelector('header').style.display = 'none';
    currentUser = null;
    window.usuarioAtual = null;
}

function limpezaForcada() {
    try {
        localStorage.clear();
        sessionStorage.clear();
        if (window.indexedDB) {
            const req = window.indexedDB.deleteDatabase("firebaseLocalStorageDb");
            req.onsuccess = function () { console.log("DB Deleted"); };
            req.onerror = function () { console.log("DB Delete error"); };
        }
    } catch(e) { console.error(e); }
    location.reload();
}

function fecharApp() {
    if (window.unsubscribeListeners) {
        window.unsubscribeListeners.forEach(unsub => {
            if (typeof unsub === 'function') unsub();
        });
        window.unsubscribeListeners = [];
    }
    window.appIniciado = false;
    window.usuarioAtual = null;
    currentUser = null; 
    
    if (typeof timeoutId !== 'undefined') clearTimeout(timeoutId);
    if (window.appTimers) {
        window.appTimers.forEach(t => clearTimeout(t));
        window.appTimers = [];
    }
}

async function iniciarApp(user) {
     window.appIniciado = true;
     if (!currentUser) {
         showLoading();
         try {
             const doc = await db.collection("users").doc(user.uid).get();
             if (doc.exists) {
                 await loginSuccess(user.uid, doc.data());
             } else {
                 auth.signOut();
                 hideLoading();
                 switchAuthView('loginView'); 
             }
         } catch (e) {
             console.error("Erro ao recuperar sessão:", e);
             hideLoading();
             authScreen.style.display = 'flex';
         }
     }
}

async function iniciarAppSeguro(user) {
    fecharApp();
    await iniciarApp(user);
}

// --- CONSTANTES DE LICENCIAMENTO ---
const CONST_ADD = 13;
const CONST_MULT = 9;
const CONST_BASE = 1954;
let generatedRandomNumber = 0; 
let currentUser = null; 

// --- Elementos DOM ---
const authScreen = document.getElementById('authScreen');
const appContainer = document.querySelector('.container');
const userDisplay = document.getElementById('userWelcomeDisplay');
const reportUserSpan = document.getElementById('reportUser');
const lockScreen = document.getElementById('lockScreen');
const loadingOverlay = document.getElementById('loadingOverlay');

function showLoading(msg) { 
    if(msg) document.getElementById('loadingText').textContent = msg;
    loadingOverlay.style.display = 'flex'; 
}
function hideLoading() { 
    loadingOverlay.style.display = 'none'; 
    document.getElementById('loadingText').textContent = 'Carregando...';
}

// --- AUTH LOGIC ---

function switchAuthView(viewId) {
    document.querySelectorAll('.auth-view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
}

async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const pass = document.getElementById('regPass').value;

    if(!name || !email || !pass) return alert("Preencha todos os campos.");
    if(!auth) return alert("Erro: Firebase não configurado.");

    showLoading();
    try {
        const userCred = await auth.createUserWithEmailAndPassword(email, pass);
        const uid = userCred.user.uid;
        const now = new Date();
        let expirationTime;

        if (email === 'jcnvap@gmail.com') {
            expirationTime = now.getTime() + (9999 * 24 * 60 * 60 * 1000);
        } else {
            expirationTime = now.getTime() + (30 * 24 * 60 * 60 * 1000);
        }

        const userData = {
            name: name,
            email: email,
            role: (email === 'jcnvap@gmail.com') ? 'admin' : 'user',
            license: { expiration: expirationTime, lastAccess: now.getTime() },
            diagnosisData: {}
        };

        await db.collection("users").doc(uid).set(userData);
        alert("Conta criada com sucesso no Firebase!");
        await loginSuccess(uid, userData);

    } catch (error) {
        let msg = "Erro ao cadastrar: " + error.message;
        if(error.code === 'auth/email-already-in-use') msg = "E-mail já está em uso.";
        alert(msg);
    } finally {
        hideLoading();
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPass').value;

    if(!auth) return alert("Erro: Firebase não configurado.");

    showLoading();
    try {
        const userCred = await auth.signInWithEmailAndPassword(email, pass);
        const uid = userCred.user.uid;
        const doc = await db.collection("users").doc(uid).get();
        if (doc.exists) {
            await loginSuccess(uid, doc.data());
        } else {
            alert("Dados do perfil não encontrados.");
            auth.signOut();
        }
    } catch (error) {
        alert("Erro ao entrar: " + error.message);
    } finally {
        hideLoading();
    }
}

async function handleForgot(e) {
    e.preventDefault();
    const email = document.getElementById('forgotEmail').value;
    if(!auth) return;
    showLoading();
    try {
        await auth.sendPasswordResetEmail(email);
        alert("Link de redefinição enviado para " + email);
        switchAuthView('loginView');
    } catch (error) {
        alert("Erro: " + error.message);
    } finally {
        hideLoading();
    }
}

async function loginSuccess(uid, userData) {
    const nowTime = Date.now();
    
    if (userData.email === 'jcnvap@gmail.com') {
        const minAdminExp = nowTime + (1000 * 60 * 60 * 24 * 365);
        if (userData.license.expiration < minAdminExp) {
             userData.license.expiration = nowTime + (9999 * 24 * 60 * 60 * 1000); 
        }
    }

    if (userData.license.lastAccess > nowTime + 120000) { 
        alert("Erro de segurança: Relógio do dispositivo incorreto.");
        hideLoading();
        return;
    }

    userData.license.lastAccess = nowTime;
    
    await db.collection("users").doc(uid).update({ 
        "license.lastAccess": nowTime,
        "license.expiration": userData.license.expiration 
    });

    currentUser = { uid: uid, ...userData };
    window.usuarioAtual = currentUser;

    if (nowTime > userData.license.expiration) {
        authScreen.style.display = 'none';
        lockScreen.style.display = 'flex';
        hideLoading();
        return;
    }

    proceedToApp();
}

function proceedToApp() {
    authScreen.style.display = 'none';
    lockScreen.style.display = 'none';
    appContainer.style.display = 'block'; 
    document.querySelector('.nav-buttons').style.display = 'flex';
    document.querySelector('header').style.display = 'block';
    document.querySelector('.progress-container').style.display = 'block';
    
    userDisplay.textContent = `Olá, ${currentUser.name}`;
    reportUserSpan.textContent = currentUser.name;

    updateDaysBadge();
    
    if (currentUser.diagnosisData) {
        loadFormDataFromObject(currentUser.diagnosisData);
    }
    const btnAi = document.querySelector('.btn-ai');
    btnAi.style.display = 'inline-flex';
}

function handleLogout() {
    if(auth) {
        auth.signOut().then(() => {
            fecharApp();
            location.reload();
        });
    } else {
        location.reload();
    }
}

window.onload = function() {
    if(!auth) authScreen.style.display = 'flex';
};

// --- SALVAMENTO AUTOMÁTICO ---
let timeoutId;
const form = document.getElementById("diagnosisForm");

form.querySelectorAll("input, select, textarea").forEach(field => {
    field.addEventListener("input", () => {
        if (typeof timeoutId !== 'undefined') clearTimeout(timeoutId);
        timeoutId = setTimeout(saveToFirebase, 2000);
        window.appTimers.push(timeoutId);
    });
    field.addEventListener("change", saveToFirebase);
});

async function saveToFirebase() {
    if(!currentUser || !currentUser.uid) return;
    
    const formData = new FormData(form);
    const data = {};
    formData.forEach((value, key) => {
        data[key] = value;
    });

    currentUser.diagnosisData = data;
    const cloudStatus = document.querySelector('.cloud-status');
    if(cloudStatus) cloudStatus.innerHTML = `<span class="cloud-dot" style="background:yellow"></span> Salvando...`;
    
    try {
        await db.collection("users").doc(currentUser.uid).update({
            diagnosisData: data
        });
        if(cloudStatus) cloudStatus.innerHTML = `<span class="cloud-dot"></span> Firebase Conectado`;
    } catch (e) {
        console.error("Erro ao salvar", e);
        if(cloudStatus) cloudStatus.innerHTML = `<span class="cloud-dot" style="background:red"></span> Erro ao salvar`;
    }
}

function loadFormDataFromObject(data) {
    Object.keys(data).forEach(key => {
        const fields = document.getElementsByName(key);
        if (fields.length > 0) {
            const field = fields[0];
            if (field.type === "radio") {
                for(let i=0; i<fields.length; i++) {
                    if(fields[i].value === data[key]) fields[i].checked = true;
                }
            } else if (field.type === "checkbox") {
                field.checked = true;
            } else {
                field.value = data[key];
            }
            if(key === 's9_investe_ads') toggleAdsDetail(data[key]);
            if(key === 's12_vende_mktp') toggleMktpDetail(data[key]);
        }
    });
    showStep(currentStep); 
}

// --- LICENCIAMENTO ---
function generateRandomCode() {
    generatedRandomNumber = Math.floor(Math.random() * 901) + 100;
    const display = document.getElementById('displayRandomCode');
    display.textContent = generatedRandomNumber;
    display.style.display = 'block';
}

async function validateUnlock() {
    const input = document.getElementById('unlockInput').value.trim();
    const parts = input.split('-');
    
    if (parts.length !== 2) return alert("Formato inválido. Use XXXXX-YYY.");

    const codeInput = parseInt(parts[0]);
    const daysInput = parseInt(parts[1]);
    const expectedCode = (generatedRandomNumber + CONST_ADD) * CONST_MULT + CONST_BASE;

    if (codeInput === expectedCode) {
        const now = new Date();
        const newExpiration = now.getTime() + (daysInput * 24 * 60 * 60 * 1000);
        
        showLoading();
        try {
            await db.collection("users").doc(currentUser.uid).update({
                "license.expiration": newExpiration,
                "license.lastAccess": now.getTime()
            });
            currentUser.license.expiration = newExpiration;
            currentUser.license.lastAccess = now.getTime();
            
            hideLoading();
            alert(`Licença renovada por ${daysInput} dias!`);
            proceedToApp();
        } catch(e) {
            hideLoading();
            alert("Erro ao atualizar licença.");
        }
    } else {
        alert("Contra-senha inválida.");
    }
}

function openLockScreenForRenewal() {
    closeSettings();
    appContainer.style.display = 'none';
    document.querySelector('.nav-buttons').style.display = 'none';
    document.querySelector('header').style.display = 'none';
    lockScreen.style.display = 'flex';
}

// --- UI HELPERS ---
let currentStep = 0;
const steps = document.querySelectorAll(".step");

function showStep(n) {
    steps.forEach((step, index) => {
        step.classList.remove("active");
        step.style.display = "none";
        if (index === n) {
            step.classList.add("active");
            step.style.display = "block";
        }
    });
    
    document.getElementById("prevBtn").style.visibility = n === 0 ? "hidden" : "visible";
    
    if (n === steps.length - 1) {
        document.getElementById("nextBtn").style.display = "none";
        document.getElementById("submitBtn").style.display = "inline-block";
    } else {
        document.getElementById("nextBtn").style.display = "inline-block";
        document.getElementById("nextBtn").innerHTML = "Próximo";
        document.getElementById("submitBtn").style.display = "none";
    }
    const progressBar = document.getElementById("progressBar");
    if(progressBar) progressBar.style.width = ((n + 1) / steps.length) * 100 + "%";
    window.scrollTo(0, 0);
}

function nextPrev(n) {
    if (n === 1 && !validateForm()) return false;
    steps[currentStep].style.display = "none";
    currentStep += n;
    
    if (currentStep >= steps.length) {
        generateReport();
        return false;
    }
    showStep(currentStep);
}

function validateForm() {
    let valid = true;
    const currentInputs = steps[currentStep].querySelectorAll("input[required], select[required], textarea[required]");
    currentInputs.forEach(input => {
        if (input.value.trim() === "") {
            input.style.borderColor = "#ff6b6b";
            valid = false;
        } else {
            input.style.borderColor = "#ccc";
        }
    });
    if (!valid) alert("Preencha os campos obrigatórios marcados.");
    return valid;
}

function updateDaysBadge() {
    if (!currentUser) return;
    const now = Date.now();
    const diff = currentUser.license.expiration - now;
    const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
    document.getElementById('daysBadge').textContent = daysLeft > 0 ? `${daysLeft}d` : '0d';
}

function openSettings() {
    const modal = document.getElementById('settingsModal');
    const now = Date.now();
    const exp = currentUser.license.expiration;
    const daysLeft = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
    
    document.getElementById('settingsUser').textContent = currentUser.name;
    document.getElementById('settingsStatus').textContent = daysLeft > 0 ? "Ativo (Firebase)" : "Expirado";
    document.getElementById('settingsDate').textContent = new Date(exp).toLocaleDateString();
    document.getElementById('settingsDaysLeft').textContent = daysLeft;
    modal.style.display = 'flex';
}

function closeSettings() { document.getElementById('settingsModal').style.display = 'none'; }

function toggleAdsDetail(val) { document.getElementById('adsDetails').style.display = (val === 'Sim') ? 'block' : 'none'; }
function toggleMktpDetail(val) { document.getElementById('mktpDetails').style.display = (val === 'Sim') ? 'block' : 'none'; }

// --- RELATÓRIO E IA ---
async function generateReport() {
    document.getElementById("diagnosisForm").style.display = "none";
    document.querySelector('.nav-buttons').style.display = 'none';
    document.getElementById("reportSection").style.display = "block";
    
    const now = new Date();
    document.getElementById("reportDate").innerText = now.toLocaleDateString() + " às " + now.toLocaleTimeString();
    
    // 1. Gera o HTML visual
    let html = "";
    // Armazena os dados para envio
    let dataToSend = { ...currentUser.diagnosisData };

    steps.forEach((step) => {
        const title = step.querySelector('.step-header h2').innerText;
        html += `<div class="report-block"><h3>${title}</h3>`;
        const inputs = step.querySelectorAll("input, select, textarea");
        let processedNames = [];
        inputs.forEach(input => {
            if (input.type === "submit" || input.type === "button") return;
            if (input.closest('#adsDetails') && input.closest('#adsDetails').style.display === 'none') return;
            if (input.closest('#mktpDetails') && input.closest('#mktpDetails').style.display === 'none') return;

            if(processedNames.includes(input.name)) return;
            
            let val = input.value;
            let labelText = input.name;
            if (input.closest('.form-group')) {
                const label = input.closest('.form-group').querySelector('label');
                if(label) labelText = label.innerText.split('?')[0].replace('*','').trim();
            }

            if(input.type === "radio") {
                const checked = step.querySelector(`input[name="${input.name}"]:checked`);
                val = checked ? checked.value : "Não informado";
            } else if (input.tagName === "SELECT") {
                 val = input.options[input.selectedIndex].text;
            }

            // Atualiza objeto de envio com valores frescos do DOM
            if(input.name) dataToSend[input.name] = val;

            if(val) {
                 html += `<div class="report-item"><strong>${labelText}</strong><span>${val}</span></div>`;
                 processedNames.push(input.name);
            }
        });
        html += `</div>`;
    });
    document.getElementById("reportContent").innerHTML = html;

    // 2. Envia para o email automaticamente
    await sendDiagnosisToEmail(dataToSend);
}

// --- FUNÇÃO DE ENVIO DE EMAIL ---
async function sendDiagnosisToEmail(data) {
    const submitBtn = document.getElementById("submitBtn");
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = "Enviando...";
    submitBtn.disabled = true;

    // FormSubmit Endpoint
    const url = "https://formsubmit.co/ajax/websitelogx@gmail.com";
    
    // Adiciona metadados para o email
    const payload = {
        _subject: "Novo Diagnóstico - " + (data.s1_identificacao || "Cliente"),
        _template: "table", // Formato tabela
        _captcha: "false",  // Desativa captcha
        ...data // Espalha os dados do formulário
    };

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            alert("Diagnóstico gerado e enviado para websitelogx@gmail.com com sucesso!");
        } else {
            console.error("Erro no envio:", response.statusText);
            alert("Diagnóstico gerado, mas houve um erro ao enviar o email automático.");
        }
    } catch (error) {
        console.error("Erro de rede:", error);
        alert("Diagnóstico gerado. Erro de conexão ao enviar email.");
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

function editForm() {
    document.getElementById("reportSection").style.display = "none";
    document.getElementById("diagnosisForm").style.display = "block";
    document.querySelector('.nav-buttons').style.display = 'flex';
    currentStep = 0;
    showStep(currentStep);
    window.scrollTo(0, 0);
}

// --- LÓGICA DE IA / PLANO DE AÇÃO ---
async function generateAdvice() {
    showLoading("Analisando com IA...");
    await new Promise(r => setTimeout(r, 1500)); 
    
    const data = currentUser.diagnosisData || {};
    
    const nomeEmpresa = data.s1_identificacao || "Sua Empresa";
    const segmento = (data.s1_segmento || "").toLowerCase();
    const controleCustos = data.s2_controle_custos || "";
    const investeAds = data.s9_investe_ads;
    
    const isVarejo = ["varejo", "loja", "comércio", "venda", "moda", "mercado"].some(k => segmento.includes(k));
    const adviceHeader = document.querySelector('#adviceSection h2');
    adviceHeader.innerText = "Plano de Ação Estratégico (Consultor IA)";

    let html = `<div class="advice-intro">
        <strong>Análise para: ${nomeEmpresa}</strong><br>
        Com base nas 15 áreas analisadas, aqui estão as recomendações prioritárias:
    </div>`;

    let finAdvice = `<h4>1. Gestão Financeira e Custos</h4><ul>`;
    if(!controleCustos.toLowerCase().includes("erp") && !controleCustos.toLowerCase().includes("software")) {
        finAdvice += `<li><strong>Profissionalização:</strong> Você mencionou não usar ERP robusto. Migrar de planilhas para um sistema como Bling ou Tiny reduzirá erros em até 40%.</li>`;
    }
    if(data.s2_fluxo_caixa === "Nao" || data.s2_fluxo_caixa === "Nenhum") {
        finAdvice += `<li><strong>Fluxo de Caixa Projetado:</strong> Implemente imediatamente a projeção para 3 meses. Olhar apenas o "realizado" é dirigir pelo retrovisor.</li>`;
    }
    finAdvice += `</ul>`;
    html += `<div class="advice-card">${finAdvice}</div>`;

    let mktAdvice = `<h4>2. Aceleração de Vendas</h4><ul>`;
    if(investeAds === "Nao") {
        mktAdvice += `<li><strong>Tráfego Pago:</strong> O alcance orgânico é limitado. Inicie testes com verba pequena (R$ 10/dia) no Meta Ads para atrair público local.</li>`;
    }
    if(data.s5_funil !== "Sim") {
        mktAdvice += `<li><strong>Funil de Vendas:</strong> Formalize as etapas (Lead -> Qualificação -> Proposta -> Fechamento). Sem isso, você não sabe onde está perdendo clientes.</li>`;
    }
    mktAdvice += `</ul>`;
    html += `<div class="advice-card">${mktAdvice}</div>`;

    let stratAdvice = `<h4>3. Estratégia e Processos</h4><ul>`;
    if(data.s13_pop === "Nao") {
        stratAdvice += `<li><strong>Documentação (POP):</strong> Para escalar, você precisa de processos. Comece documentando a tarefa mais repetitiva da empresa.</li>`;
    }
    if(isVarejo && data.s12_vende_mktp === "Nao") {
        stratAdvice += `<li><strong>Marketplaces:</strong> Seu segmento tem alta aderência em Mercado Livre/Shopee. Considere expandir para estes canais para reduzir dependência da venda física.</li>`;
    }
    stratAdvice += `</ul>`;
    html += `<div class="advice-card">${stratAdvice}</div>`;

    document.getElementById("adviceContent").innerHTML = html;
    hideLoading();
    document.getElementById("adviceSection").scrollIntoView({ behavior: 'smooth' });
}

// --- BACKUP & RESTORE ---
function backupData() {
    if(!currentUser) return;
    const backupObj = {
        userProfile: { name: currentUser.name, email: currentUser.email },
        diagnosisData: currentUser.diagnosisData
    };
    const blob = new Blob([JSON.stringify(backupObj)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "backup_firebase_" + new Date().toISOString().slice(0,10) + ".json";
    document.body.appendChild(a);
    a.click();
}

function restoreData() { document.getElementById('restoreInput').click(); }

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const content = JSON.parse(e.target.result);
            if(content.diagnosisData) {
                showLoading();
                loadFormDataFromObject(content.diagnosisData);
                await db.collection("users").doc(currentUser.uid).update({
                    diagnosisData: content.diagnosisData
                });
                currentUser.diagnosisData = content.diagnosisData;
                hideLoading();
                alert("Dados restaurados!");
            } else {
                alert("Arquivo inválido.");
            }
        } catch(err) { 
            alert("Erro ao ler arquivo."); 
        }
    };
    reader.readAsText(file);
}

async function clearData() { 
    if(confirm("Deseja limpar todos os dados do formulário?")) {
        form.reset();
        await saveToFirebase();
        location.reload(); 
    } 
}

async function fillDemoData() {
    if(!confirm("Substituir dados atuais por dados de teste?")) return;

    // Atualizado para os novos names (s1_..., s2_...)
    const demoData = {
        s1_identificacao: "Empresa Modelo Ltda - 12.345.678/0001-90",
        s1_segmento: "Varejo de Roupas",
        s1_tempo_operacao: "5 anos",
        s1_funcionarios: "6",
        s1_faturamento: "85000.00",
        s1_regime: "Simples Nacional",
        s1_publico: "B2C",
        
        s2_controle_custos: "Planilhas Excel, controle manual.",
        s2_custos_fixos: "25000.00",
        s2_custos_variaveis: "Taxas cartão 4%, Imposto 6%, Comissão 3%.",
        s2_margem_lucro: "Nao",
        s2_ponto_equilibrio: "Sim",
        s2_dividas: "Empréstimo R$ 50k (Banco X).",
        s2_fluxo_caixa: "Nao",
        
        s3_metodologia: "Markup de 2.0 sobre o custo.",
        s3_considera_custos: "Sim",
        s3_top_produtos: "Camisetas, Calças Jeans, Acessórios.",
        s3_menor_margem: "Produtos de inverno.",
        s3_ticket_medio: "150.00",
        s3_politica_descontos: "5% à vista.",
        
        s4_canais_atendimento: "WhatsApp e Instagram.",
        s4_tempo_resposta: "2 horas",
        s4_pos_venda: "Nao",
        s4_reclamacoes: "Demora na entrega.",
        s4_impacto_reclamacoes: "Sim",
        
        s5_aquisicao: "Instagram e Fachada.",
        s5_funil: "Informal",
        s5_metas: "Sim",
        s5_acompanhamento: "Planilha mensal.",
        s5_motivos_perda: "Preço e falta de tamanho.",
        
        s6_frequencia_promo: "Mensalmente",
        s6_planejamento: "Nao",
        s6_roi: "Nao",
        s6_prejuizo: "Nao",
        
        s7_redes_sociais: "Instagram e TikTok.",
        s7_frequencia_post: "3x semana",
        s7_objetivo_redes: "Ambos",
        s7_metricas: "Nao",
        
        s8_gmn: "Sim",
        s8_conteudo: "Nao",
        s8_contribuicao_online: "Sim",
        
        s9_investe_ads: "Sim",
        s9_plataformas: "Instagram (Botão impulsionar)",
        s9_valor_investido: "500.00",
        s9_cpl: "Nao",
        s9_roi_ads: "Nao",
        
        s10_site: "Nao",
        s10_canal_proprio: "Nao",
        s10_analytics: "Nao",
        s10_intencao: "Curto Prazo",
        
        s11_erp: "Bling",
        s11_erp_atende: "Parcialmente",
        s11_crm: "Nao",
        s11_manual: "Muito",
        s11_retrabalho: "Sim, digitação manual de pedidos.",
        
        s12_vende_mktp: "Sim",
        s12_plataformas: "Shopee",
        s12_integracao: "Nao",
        s12_taxas: "Nao",
        
        s13_funcoes: "Parcialmente",
        s13_pop: "Nao",
        s13_gargalos: "Expedição e Financeiro.",
        s13_tempo_gestor: "Nao",
        
        s14_problemas_financeiros: "Sobra pouco dinheiro no fim do mês.",
        s14_perda_dinheiro: "Estoque parado.",
        s14_objetivo_curto: "Organizar o caixa.",
        s14_metas_futuras: "Abrir e-commerce.",
        s14_urgencia: "Sim, fluxo de caixa.",
        
        s15_infos_adicionais: "Nenhuma.",
        s15_disponibilidade: "Sim",
        s15_expectativas: "Ter clareza dos números."
    };

    for (const key in demoData) {
        const val = demoData[key];
        const fields = document.getElementsByName(key);
        if (fields.length > 0) {
            const field = fields[0]; 
            if (field.type === 'radio') {
                const radio = document.querySelector(`input[name="${key}"][value="${val}"]`);
                if (radio) radio.checked = true;
            } else {
                field.value = val;
            }
        }
    }

    if (typeof toggleAdsDetail === 'function') toggleAdsDetail(demoData.s9_investe_ads);
    if (typeof toggleMktpDetail === 'function') toggleMktpDetail(demoData.s12_vende_mktp);

    await saveToFirebase();
    alert("Dados de teste preenchidos!");
}