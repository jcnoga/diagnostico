// Verifica se está rodando via arquivo local (file://)
if (window.location.protocol === 'file:') {
    // Pára o carregamento e exibe mensagem de erro
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
    // Lança um erro para parar a execução do restante dos scripts
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

// --- GESTÃO DE ESTADOS E VARIÁVEIS GLOBAIS ---
window.unsubscribeListeners = [];
window.appTimers = [];
let currentUser = null; 

// --- INICIALIZAÇÃO DO FIREBASE ---
let auth, db;
try {
    if (firebaseConfig.apiKey.startsWith("AIza")) {
        firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        db = firebase.firestore();
        console.log("Firebase inicializado com sucesso");
    } else {
        throw new Error("Firebase Config não preenchido.");
    }
} catch (e) {
    console.error("Erro fatal ao inicializar Firebase:", e);
    alert("Erro crítico: Não foi possível conectar ao Firebase. Verifique a configuração.");
}

// --- Elementos DOM ---
const authScreen = document.getElementById('authScreen');
const appContainer = document.querySelector('.container');
const userDisplay = document.getElementById('userWelcomeDisplay');
const reportUserSpan = document.getElementById('reportUser');
const lockScreen = document.getElementById('lockScreen');
const loadingOverlay = document.getElementById('loadingOverlay');

function showLoading() { if(loadingOverlay) loadingOverlay.style.display = 'flex'; }
function hideLoading() { if(loadingOverlay) loadingOverlay.style.display = 'none'; }


// --- CONTROLE CENTRAL DE AUTENTICAÇÃO (LÓGICA CORRIGIDA) ---
if(auth) {
    auth.onAuthStateChanged(async (user) => {
        showLoading();
        if (user) {
            console.log("Auth State Changed: User Logged In ->", user.email);
            // Usuário está logado, buscar dados no Firestore
            try {
                const doc = await db.collection("users").doc(user.uid).get();
                if (doc.exists) {
                    // Dados do usuário encontrados, validar licença e iniciar o app
                    await validateAndStartSession(user.uid, doc.data());
                } else {
                    // Estado inconsistente (usuário no Auth, mas sem dados no DB)
                    console.warn("Usuário autenticado sem perfil no Firestore. Forçando logout.");
                    await auth.signOut(); // Isso irá re-disparar o onAuthStateChanged, caindo no 'else'
                }
            } catch (error) {
                console.error("Erro ao buscar dados do usuário:", error);
                alert("Ocorreu um erro ao carregar seu perfil. Tente novamente.");
                await auth.signOut();
            }
        } else {
            console.log("Auth State Changed: User Logged Out");
            // Usuário não está logado, garantir que a tela de login seja exibida
            cleanupAndShowLogin();
        }
    });
} else {
    // Se o Firebase falhou em inicializar, mostrar erro.
    hideLoading();
    document.body.innerHTML = `<div style="text-align:center; padding-top:50px;"><h1>Erro Crítico de Conexão</h1><p>Não foi possível inicializar o Firebase.</p></div>`;
}


// --- FUNÇÕES DE LÓGICA E UI ---

function cleanupAndShowLogin() {
    fecharApp(); // Garante que timers e listeners antigos sejam limpos
    if(authScreen) authScreen.style.display = 'flex';
    if(appContainer) appContainer.style.display = 'none';
    if(document.querySelector('header')) document.querySelector('header').style.display = 'none';
    if(lockScreen) lockScreen.style.display = 'none';
    hideLoading();
}

async function validateAndStartSession(uid, userData) {
    const nowTime = Date.now();
    
    // Regra de reforço para Admin
    if (userData.email === 'jcnvap@gmail.com') {
        const minAdminExp = nowTime + (1000 * 60 * 60 * 24 * 365);
        if (!userData.license || userData.license.expiration < minAdminExp) {
             userData.license = userData.license || {};
             userData.license.expiration = nowTime + (9999 * 24 * 60 * 60 * 1000); 
        }
    }

    // Validação de data retroativa (anti-fraude)
    if (userData.license && userData.license.lastAccess > nowTime + 120000) { 
        alert("Erro de segurança: A data do seu dispositivo parece estar incorreta. Por favor, ajuste o relógio e tente novamente.");
        await auth.signOut();
        return;
    }

    // Atualiza o último acesso no banco de dados
    userData.license.lastAccess = nowTime;
    await db.collection("users").doc(uid).update({ 
        "license.lastAccess": nowTime,
        "license.expiration": userData.license.expiration 
    });

    // Define o usuário global
    currentUser = { uid: uid, ...userData };

    // Verifica se a licença está expirada
    if (nowTime > userData.license.expiration) {
        console.log("Licença expirada. Mostrando tela de bloqueio.");
        authScreen.style.display = 'none';
        lockScreen.style.display = 'flex';
        hideLoading();
        return;
    }

    // Sucesso! Inicia o aplicativo.
    proceedToApp();
}

function proceedToApp() {
    console.log("Iniciando aplicativo para:", currentUser.email);
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
    hideLoading();
}

// --- FUNÇÕES DE EVENTOS (LOGIN, CADASTRO, LOGOUT) ---

async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const pass = document.getElementById('regPass').value;

    if (!name || !email || !pass) return alert("Preencha todos os campos.");
    
    showLoading();
    try {
        const userCred = await auth.createUserWithEmailAndPassword(email, pass);
        const uid = userCred.user.uid;

        const now = new Date();
        let expirationTime = now.getTime() + (30 * 24 * 60 * 60 * 1000); // 30 dias grátis
        if (email === 'jcnvap@gmail.com') {
            expirationTime = now.getTime() + (9999 * 24 * 60 * 60 * 1000); // Admin
        }

        const userData = {
            name: name,
            email: email,
            role: (email === 'jcnvap@gmail.com') ? 'admin' : 'user',
            license: {
                expiration: expirationTime,
                lastAccess: now.getTime()
            },
            diagnosisData: {}
        };

        await db.collection("users").doc(uid).set(userData);
        // O onAuthStateChanged vai lidar com o início do app automaticamente.
        alert("Conta criada com sucesso! Redirecionando...");

    } catch (error) {
        console.error(error);
        let msg = "Erro ao cadastrar: " + error.message;
        if(error.code === 'auth/email-already-in-use') msg = "E-mail já está em uso.";
        if(error.code === 'auth/weak-password') msg = "A senha deve ter pelo menos 6 caracteres.";
        alert(msg);
        hideLoading();
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPass').value;

    showLoading();
    try {
        // Apenas faz o login. O onAuthStateChanged cuida do resto.
        await auth.signInWithEmailAndPassword(email, pass);
    } catch (error) {
        console.error(error);
        alert("Erro ao entrar: " + error.message);
        hideLoading(); // Esconde o loading apenas em caso de falha.
    }
}

async function handleLogout() {
    showLoading();
    await auth.signOut();
    // O onAuthStateChanged vai cuidar de limpar a UI e mostrar a tela de login.
}

async function handleForgot(e) {
    e.preventDefault();
    const email = document.getElementById('forgotEmail').value;
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

function fecharApp() {
    console.log("Encerrando sessão local...");
    if (window.appTimers) {
        window.appTimers.forEach(t => clearTimeout(t));
        window.appTimers = [];
    }
    currentUser = null;
}

function limpezaForcada() {
    if(confirm("Isso limpará todos os dados locais e recarregará a página. Deseja continuar?")) {
        localStorage.clear();
        sessionStorage.clear();
        if (window.indexedDB) {
            window.indexedDB.deleteDatabase("firebaseLocalStorageDb");
        }
        location.reload();
    }
}

function switchAuthView(viewId) {
    document.querySelectorAll('.auth-view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
}


// --- LÓGICA DO FORMULÁRIO E SALVAMENTO ---

let timeoutId;
const form = document.getElementById("diagnosisForm");

form.querySelectorAll("input, select, textarea").forEach(field => {
    field.addEventListener("input", () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(saveToFirebase, 2000);
        window.appTimers.push(timeoutId);
    });
    field.addEventListener("change", saveToFirebase);
});

async function saveToFirebase() {
    if (!currentUser || !currentUser.uid) return;
    
    const formData = new FormData(form);
    const data = {};
    formData.forEach((value, key) => { data[key] = value; });

    currentUser.diagnosisData = data;

    const cloudStatus = document.querySelector('.cloud-status');
    if (cloudStatus) cloudStatus.innerHTML = `<span class="cloud-dot" style="background:yellow"></span> Salvando...`;
    
    try {
        await db.collection("users").doc(currentUser.uid).update({ diagnosisData: data });
        if (cloudStatus) cloudStatus.innerHTML = `<span class="cloud-dot"></span> Firebase Conectado`;
    } catch (e) {
        console.error("Erro ao salvar", e);
        if (cloudStatus) cloudStatus.innerHTML = `<span class="cloud-dot" style="background:red"></span> Erro ao salvar`;
    }
}

function loadFormDataFromObject(data) {
    Object.keys(data).forEach(key => {
        const fields = document.getElementsByName(key);
        if (fields.length > 0) {
            const field = fields[0];
            if (field.type === "radio") {
                fields.forEach(f => {
                    if (f.value === data[key]) f.checked = true;
                });
            } else {
                field.value = data[key];
            }
            if (key === 'ads_investe') toggleAdsDetail(data[key]);
            if (key === 'mktp_vende') toggleMktpDetail(data[key]);
        }
    });
    showStep(0); // Sempre inicia o form na primeira etapa
}


// --- SISTEMA DE BLOQUEIO E CONTRA-SENHA ---
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

    const codeInput = parseInt(parts[0], 10);
    const daysInput = parseInt(parts[1], 10);
    
    const expectedCode = (generatedRandomNumber + 13) * 9 + 1954;

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
            
            alert(`Licença renovada por ${daysInput} dias!`);
            
            document.getElementById('unlockInput').value = "";
            document.getElementById('displayRandomCode').style.display = 'none';
            
            proceedToApp(); // Inicia o app após desbloqueio
        } catch(e) {
            console.error(e);
            alert("Erro ao atualizar licença no banco de dados.");
        } finally {
            hideLoading();
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

// --- UI HELPERS E NAVEGAÇÃO DO FORMULÁRIO ---
let currentStep = 0;
const steps = Array.from(document.querySelectorAll(".step"));

function showStep(n) {
    steps.forEach((step, index) => {
        step.style.display = index === n ? "block" : "none";
        step.classList.toggle("active", index === n);
    });
    
    document.getElementById("prevBtn").style.visibility = n === 0 ? "hidden" : "visible";
    document.getElementById("nextBtn").style.display = n === steps.length - 1 ? "none" : "inline-block";
    document.getElementById("submitBtn").style.display = n === steps.length - 1 ? "inline-block" : "none";
    
    const progressBar = document.getElementById("progressBar");
    if(progressBar) progressBar.style.width = ((n + 1) / steps.length) * 100 + "%";
    window.scrollTo(0, 0);
}

function nextPrev(n) {
    if (n === 1 && !validateForm()) return;
    
    currentStep += n;
    
    if (currentStep >= steps.length) {
        generateReport();
        return;
    }
    showStep(currentStep);
}

function validateForm() {
    let valid = true;
    const currentInputs = steps[currentStep].querySelectorAll("input[required], select[required], textarea[required]");
    currentInputs.forEach(input => {
        if (!input.value.trim()) {
            input.style.borderColor = "#ff6b6b";
            valid = false;
        } else {
            input.style.borderColor = "#ccc";
        }
    });
    if (!valid) alert("Preencha os campos obrigatórios.");
    return valid;
}

function updateDaysBadge() {
    if (!currentUser) return;
    const now = Date.now();
    const diff = currentUser.license.expiration - now;
    const daysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    document.getElementById('daysBadge').textContent = `${daysLeft}d`;
}

function openSettings() {
    const modal = document.getElementById('settingsModal');
    const now = Date.now();
    const exp = currentUser.license.expiration;
    const daysLeft = Math.max(0, Math.ceil((exp - now) / (1000 * 60 * 60 * 24)));
    
    document.getElementById('settingsUser').textContent = currentUser.name;
    document.getElementById('settingsStatus').textContent = daysLeft > 0 ? "Ativo" : "Expirado";
    document.getElementById('settingsDate').textContent = new Date(exp).toLocaleDateString();
    document.getElementById('settingsDaysLeft').textContent = daysLeft;
    modal.style.display = 'flex';
}

function closeSettings() { document.getElementById('settingsModal').style.display = 'none'; }
function toggleAdsDetail(val) { document.getElementById('adsDetails').style.display = (val === 'Sim') ? 'block' : 'none'; }
function toggleMktpDetail(val) { document.getElementById('mktpDetails').style.display = (val === 'Sim') ? 'block' : 'none'; }


// --- FUNÇÕES DE RELATÓRIO, IA E BACKUP ---

function generateReport() {
    document.getElementById("diagnosisForm").style.display = "none";
    document.querySelector('.nav-buttons').style.display = 'none';
    document.getElementById("reportSection").style.display = "block";
    
    const now = new Date();
    document.getElementById("reportDate").innerText = now.toLocaleDateString() + " às " + now.toLocaleTimeString();
    
    let html = "";
    steps.forEach((step) => {
        const title = step.querySelector('.step-header h2').innerText;
        html += `<div class="report-block"><h3>${title}</h3>`;
        const inputs = step.querySelectorAll("input, select, textarea");
        let processedNames = new Set();
        inputs.forEach(input => {
            if (input.type === "submit" || input.type === "button" || processedNames.has(input.name)) return;
            if (input.closest('#adsDetails')?.style.display === 'none') return;
            if (input.closest('#mktpDetails')?.style.display === 'none') return;

            let val;
            let labelText = input.closest('.form-group')?.querySelector('label')?.innerText.split('?')[0].replace('*','').trim() || input.name;

            if(input.type === "radio") {
                const checked = step.querySelector(`input[name="${input.name}"]:checked`);
                val = checked ? checked.value : "Não informado";
            } else {
                 val = input.value;
            }

            if(val) {
                 html += `<div class="report-item"><strong>${labelText}</strong><span>${val}</span></div>`;
                 processedNames.add(input.name);
            }
        });
        html += `</div>`;
    });
    document.getElementById("reportContent").innerHTML = html;

    sendReportByEmail();
}

function sendReportByEmail() {
    alert("Seu programa de e-mail será aberto para enviar o diagnóstico. Por favor, verifique e clique em 'Enviar'.");

    const recipient = "websitelogx@gmail.com";
    const companyName = currentUser.diagnosisData.empresa_nome || "Empresa Não Informada";
    const subject = `Diagnóstico Empresarial - ${companyName}`;
    
    let body = `Relatório de Diagnóstico para a empresa: ${companyName}\n`;
    body += `Gerado por: ${currentUser.name} (${currentUser.email})\n`;
    body += `Data: ${new Date().toLocaleString()}\n`;
    body += "------------------------------------------------------\n\n";

    steps.forEach((step) => {
        const title = step.querySelector('.step-header h2').innerText;
        body += `--- ${title.toUpperCase()} ---\n\n`;

        const inputs = step.querySelectorAll("input, select, textarea");
        let processedNames = new Set();
        inputs.forEach(input => {
             if (input.type === "submit" || input.type === "button" || processedNames.has(input.name)) return;
            if (input.closest('#adsDetails')?.style.display === 'none') return;
            if (input.closest('#mktpDetails')?.style.display === 'none') return;

            let val;
            let labelText = input.closest('.form-group')?.querySelector('label')?.innerText.split('?')[0].replace('*','').trim() || input.name;

            if(input.type === "radio") {
                const checked = step.querySelector(`input[name="${input.name}"]:checked`);
                val = checked ? checked.value : "Não informado";
            } else {
                val = input.value;
            }

            if(val) {
                 body += `${labelText}: ${val}\n`;
                 processedNames.add(input.name);
            }
        });
        body += "\n";
    });

    const mailtoLink = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink, '_self');
}

function editForm() {
    document.getElementById("reportSection").style.display = "none";
    document.getElementById("diagnosisForm").style.display = "block";
    document.querySelector('.nav-buttons').style.display = 'flex';
    currentStep = 0;
    showStep(currentStep);
    window.scrollTo(0, 0);
}

// *** LÓGICA COMPLETA DA IA RESTAURADA ***
async function generateAdvice() {
    showLoading();
    
    // Leitura integral dos dados (simulação de processamento)
    await new Promise(r => setTimeout(r, 1500)); 
    
    const data = currentUser.diagnosisData || {};
    const nomeEmpresa = data.empresa_nome || "Sua Empresa";
    const segmento = (data.empresa_segmento || "").toLowerCase();
    const faturamento = parseFloat(data.empresa_faturamento || 0);
    
    // Identificadores de contexto
    const isVarejo = ["varejo", "loja", "comércio", "venda", "produto", "roupas", "moda", "mercado"].some(k => segmento.includes(k));
    const isB2C = (data.empresa_publico === "B2C" || data.empresa_publico === "Hibrido");
    
    const adviceHeader = document.querySelector('#adviceSection h2');
    adviceHeader.innerText = "Plano de Ação Estratégico (Consultor IA)";

    let html = `<div class="advice-intro">
        <strong>Análise para: ${nomeEmpresa}</strong><br>
        Com base na leitura integral do seu diagnóstico, preparamos as seguintes recomendações profissionais, focadas em eficiência e crescimento.
    </div>`;

    // ---------------------------------------------------------
    // 1. OTIMIZAÇÃO E CORTE DE CUSTOS (PRIORIDADE 1)
    // ---------------------------------------------------------
    let costsAdvice = `<h4>1. Saneamento Financeiro e Redução de Custos</h4>
    <p style="margin-bottom:10px;">Antes de buscar novas receitas, é crucial estancar vazamentos financeiros.</p>
    <ul>`;
    
    // Assinaturas e Recorrentes
    costsAdvice += `<li><strong>Auditoria de Assinaturas (SaaS/Serviços):</strong> Revise imediatamente extratos de cartão corporativo. Cancele softwares duplicados ou subutilizados.</li>`;
    
    // Telefonia/Internet
    costsAdvice += `<li><strong>Renegociação de Contratos (Telecom):</strong> Se seus contratos de internet e telefonia têm mais de 12 meses, solicite cotação na concorrência e exija redução na operadora atual. A economia média é de 20%.</li>`;
    
    // Eficiência Operacional
    costsAdvice += `<li><strong>Eficiência Operacional:</strong> Implemente política de "Desperdício Zero". Troque iluminação por LED (se loja física) e instale sensores de presença em áreas comuns.</li>`;
    
    // Controle Financeiro Específico
    if(data.fin_controle !== "Sim") {
        costsAdvice += `<li><b style="color:#e74c3c">Ação Crítica:</b> Implemente um DRE (Demonstrativo de Resultado) gerencial imediatamente. Sem saber exatamente para onde vai cada centavo, qualquer estratégia de venda é arriscada.</li>`;
    }
    
    // Dívidas
    if(data.fin_dividas && data.fin_dividas.length > 5) {
        costsAdvice += `<li><strong>Gestão de Passivos:</strong> Priorize a renegociação das dívidas citadas (${data.fin_dividas.substring(0, 30)}...). Troque dívidas caras (cheque especial/cartão) por crédito com garantia (imóvel/veículo) que possui juros menores.</li>`;
    }
    
    costsAdvice += `</ul>`;
    html += `<div class="advice-card">${costsAdvice}</div>`;

    // ---------------------------------------------------------
    // 2. ESTRATÉGIA DIGITAL E POSICIONAMENTO (MERCADO ATUAL)
    // ---------------------------------------------------------
    let digitalAdvice = `<h4>2. Estratégia Digital 360º</h4><ul>`;

    // Redes Sociais
    digitalAdvice += `<li><strong>Instagram e Facebook:</strong> Não utilize apenas como vitrine de fotos estáticas. O algoritmo atual prioriza vídeos curtos (Reels). Humanize a marca mostrando bastidores e "quem faz". A constância sugerida é de 1 post no feed e 5 a 10 stories diários.</li>`;
    
    // Google Meu Negócio
    if(data.seo_gmn !== "Sim") {
        digitalAdvice += `<li><strong>Google Meu Negócio (Urgente):</strong> Sua empresa precisa aparecer no mapa. É tráfego gratuito e qualificado. Cadastre-se, adicione fotos reais e peça avaliações para os melhores clientes.</li>`;
    } else {
        digitalAdvice += `<li><strong>Otimização Google Maps:</strong> Responda a todas as avaliações (boas ou ruins) em até 24h. Adicione fotos novas semanalmente para manter relevância no topo das buscas locais.</li>`;
    }

    // Site e Landing Pages
    if(data.site_possui === "Nao") {
        digitalAdvice += `<li><strong>Landing Pages:</strong> Mesmo sem um site complexo, crie Landing Pages (Páginas de Venda Única) para suas promoções específicas. Isso aumenta a conversão de campanhas pagas drasticamente em comparação a mandar o cliente para o WhatsApp direto.</li>`;
    } else {
        digitalAdvice += `<li><strong>Experiência do Site:</strong> Verifique a velocidade de carregamento mobile. Se demorar mais de 3 segundos, você está perdendo até 40% do tráfego pago.</li>`;
    }

    // Marketplaces
    if(isVarejo) {
        if(data.mktp_vende === "Nao") {
            digitalAdvice += `<li><strong>Diversificação em Marketplaces:</strong> Inicie operação no Mercado Livre ou Shopee. Eles possuem tráfego próprio gigantesco. Use-os como canal de aquisição de cliente (primeira venda) e tente fidelizar para venda direta depois.</li>`;
        } else {
            digitalAdvice += `<li><strong>Expansão de Canais:</strong> Se já vende em um marketplace, espelhe o estoque para outros (ex: Amazon, Magalu) usando um ERP integrador (hub), diluindo o risco de bloqueio de conta.</li>`;
        }
    }

    // Tráfego Pago vs Orgânico
    if(data.ads_investe === "Nao") {
        digitalAdvice += `<li><strong>Tráfego Pago (Ads):</strong> O alcance orgânico está morrendo. Separe uma verba de teste (ex: R$ 300-500) para Google Ads (fundo de funil/quem já busca o produto) ou Meta Ads (geração de desejo).</li>`;
    } else {
        digitalAdvice += `<li><strong>Otimização de ROI:</strong> Como já investe, foque em Remarketing (mostrar anúncio para quem visitou o site mas não comprou). É o custo por conversão mais barato disponível.</li>`;
    }
    
    digitalAdvice += `</ul>`;
    html += `<div class="advice-card">${digitalAdvice}</div>`;

    // ---------------------------------------------------------
    // 3. SOURCING E IMPORTAÇÃO (SE APLICÁVEL)
    // ---------------------------------------------------------
    if(isVarejo && isB2C) {
        let chinaAdvice = `<h4>3. Estratégia de Suprimentos (Importação)</h4><ul>`;
        chinaAdvice += `<li><strong>Importação Direta da China:</strong> Dado o seu segmento (${segmento}), existe alta oportunidade de margem na importação direta.</li>`;
        
        if(faturamento > 50000) {
            chinaAdvice += `<li><strong>Importação Simplificada:</strong> Com seu faturamento, avalie utilizar empresas de "Trading" para importar pequenos lotes (até US$ 3.000) via Remessa Expressa para testar novos produtos com marca própria (Private Label) antes de grandes investimentos.</li>`;
        } else {
            chinaAdvice += `<li><strong>Sourcing via Alibaba/AliExpress:</strong> Comece validando produtos comprando unitariamente para revenda (dropshipping nacional ou estoque mínimo) para validar a aceitação do público antes de comprar em atacado.</li>`;
        }
        
        chinaAdvice += `<li><strong>Precificação na Importação:</strong> Lembre-se de calcular o custo nacionalizado (Preço + Frete + Imposto 60% + ICMS) para garantir que a margem final seja superior à compra local.</li>`;
        chinaAdvice += `</ul>`;
        html += `<div class="advice-card">${chinaAdvice}</div>`;
    }

    document.getElementById("adviceContent").innerHTML = html;
    hideLoading();
    document.getElementById("adviceSection").scrollIntoView({ behavior: 'smooth' });
}


function backupData() {
    if(!currentUser) return;
    const backupObj = {
        userProfile: { name: currentUser.name, email: currentUser.email },
        diagnosisData: currentUser.diagnosisData
    };
    const blob = new Blob([JSON.stringify(backupObj, null, 2)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup_${currentUser.diagnosisData.empresa_nome}_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
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
                if(confirm("Isso substituirá os dados do formulário atual. Deseja continuar?")){
                    showLoading();
                    loadFormDataFromObject(content.diagnosisData);
                    await saveToFirebase();
                    hideLoading();
                    alert("Dados restaurados e salvos no Firebase!");
                }
            } else {
                alert("Arquivo de backup inválido.");
            }
        } catch(err) { 
            alert("Erro ao ler arquivo: " + err.message); 
        } finally {
            event.target.value = null; // Limpa o input de arquivo
        }
    };
    reader.readAsText(file);
}

async function clearData() { 
    if(confirm("Deseja limpar todos os dados do formulário? Esta ação não pode ser desfeita.")) {
        form.reset();
        await saveToFirebase();
        alert("Formulário limpo.");
        currentStep = 0;
        showStep(currentStep);
    } 
}

async function fillDemoData() {
    if(!confirm("Isso substituirá os dados atuais por dados de teste.")) return;
    const demoData = {
        empresa_nome: "Loja Modelo & Estilo", empresa_email_contato: "contato@lojamodelo.com.br", empresa_whatsapp: "(11) 98765-4321", empresa_cnpj: "12.345.678/0001-90", empresa_segmento: "Comércio Varejista de Roupas", empresa_tempo: "5", empresa_funcionarios: "4", empresa_faturamento: "55000.00", empresa_regime: "Simples Nacional", empresa_publico: "B2C", fin_controle: "Parcial", fin_custos_fixos: "15000.00", fin_custos_variaveis: "Taxas de cartão (3.5%), Comissões (3%), Impostos (Simples), Embalagens.", fin_margem: "Nao", fin_ponto_equilibrio: "Nao", fin_dividas: "Empréstimo bancário (parcela de R$ 1.500).", fin_fluxo_caixa: "Nao", prec_metodo: "Multiplico o preço de custo por 2.0 (Markup).", prec_top_vendas: "Camisetas, Calças Jeans, Acessórios.", prec_menor_lucro: "Produtos em promoção ou ponta de estoque.", prec_ticket_medio: "120.00", prec_descontos: "5% para pagamento no PIX ou dinheiro.", atend_canais: "WhatsApp, Instagram e Telefone.", atend_tempo: "Ate 1h", atend_posvenda: "Nao", atend_reclamacoes: "Demora na entrega ou falta de numeração.", vendas_canais_aquisicao: "Instagram, Fachada da loja, Indicação.", vendas_funil: "Mais ou menos", vendas_metas: "Nao", vendas_perdas: "Cliente acha caro ou não tem o tamanho.", promo_frequencia: "Sazonalmente", promo_analise: "Nao", mkt_redes: "Instagram e Facebook.", mkt_frequencia: "2 a 3 vezes por semana.", mkt_converte: "Pouco", seo_gmn: "Sim", seo_conteudo: "Nao", ads_investe: "Sim", ads_plataformas: "Instagram (Botão Turbinar)", ads_valor: "300.00", ads_cpl: "Nao", site_possui: "Nao", site_analytics: "Nao", tec_erp: "Sistema de gestão básico (Bling/Tiny).", tec_crm: "Nao", tec_manual: "Muito", mktp_vende: "Sim", mktp_quais: "Shopee e Mercado Livre (iniciando).", mktp_estoque: "Nao", pp_funcoes: "Parcial", pp_processos: "Nao", pp_gargalos: "Falta de tempo para gestão, faço tudo sozinho(a).", obj_problemas: "Sobra pouco dinheiro no fim do mês, não sei precificar corretamente.", obj_perda_dinheiro: "Estoque parado e taxas de cartão.", obj_principal: "Organizar o financeiro e aumentar o lucro.", obj_metas: "Contratar um gerente e abrir e-commerce.", obj_obs: "Preciso de ajuda urgente com fluxo de caixa."
    };
    loadFormDataFromObject(demoData);
    await saveToFirebase();
    alert("Dados de teste preenchidos!");
}