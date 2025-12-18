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
}

// --- GESTÃO DE ESTADOS E SEGURANÇA (NOVAS VARIÁVEIS) ---
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

        // --- DETECTAR REABERTURA DE ABA (Adicionado conforme solicitação) ---
        window.addEventListener("pageshow", function (event) {
          if (event.persisted) {
            location.reload();
          }
        });

        // --- LISTENER DE AUTH INTEGRADO COM ROTINA DE LIMPEZA ---
        auth.onAuthStateChanged(async (user) => {
            if (appInicializado) return;
            appInicializado = true;

            if (user) {
                // Se usuário detectado, força logout para evitar estado inconsistente
                console.log("Detectado usuário na inicialização. Forçando logout para garantir estado limpo.");
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

// --- NOVAS FUNÇÕES DE SEGURANÇA E UI SOLICITADAS ---

function mostrarTelaLogin() {
    // Garante que a UI esteja no estado de Login
    if(document.getElementById('loadingOverlay')) document.getElementById('loadingOverlay').style.display = 'none';
    if(document.getElementById('authScreen')) document.getElementById('authScreen').style.display = 'flex';
    if(document.querySelector('.container')) document.querySelector('.container').style.display = 'none';
    if(document.querySelector('header')) document.querySelector('header').style.display = 'none';
    // Reseta variáveis globais
    currentUser = null;
    window.usuarioAtual = null;
}

function limpezaForcada() {
    try {
        localStorage.clear();
        sessionStorage.clear();
        // Tenta deletar banco interno do Firebase Auth para reset total
        if (window.indexedDB) {
            const req = window.indexedDB.deleteDatabase("firebaseLocalStorageDb");
            req.onsuccess = function () { console.log("DB Deleted"); };
            req.onerror = function () { console.log("DB Delete error"); };
        }
    } catch(e) { console.error(e); }
    location.reload();
}

function fecharApp() {
    console.log("Encerrando app...");
    
    // Remover listeners do Firestore
    if (window.unsubscribeListeners) {
        window.unsubscribeListeners.forEach(unsub => {
            if (typeof unsub === 'function') unsub();
        });
        window.unsubscribeListeners = [];
    }
    
    // Cancelar estados globais
    window.appIniciado = false;
    window.usuarioAtual = null;
    currentUser = null; 
    
    // Limpar timers
    if (typeof timeoutId !== 'undefined') clearTimeout(timeoutId);
    
    if (window.appTimers) {
        window.appTimers.forEach(t => clearTimeout(t));
        window.appTimers = [];
    }
}

async function iniciarApp(user) {
     console.log("Sessão ativa detectada para: ", user.email);
     window.appIniciado = true;
     
     // Lógica de recuperação de sessão existente
     if (!currentUser) {
         showLoading();
         try {
             const doc = await db.collection("users").doc(user.uid).get();
             if (doc.exists) {
                 await loginSuccess(user.uid, doc.data());
             } else {
                 // Sessão existe mas sem dados no banco (inconsistência)
                 console.warn("Usuário autenticado mas sem dados de perfil.");
                 auth.signOut();
                 hideLoading();
                 switchAuthView('loginView'); 
             }
         } catch (e) {
             console.error("Erro ao recuperar sessão:", e);
             hideLoading();
             // Fallback para tela de login
             authScreen.style.display = 'flex';
         }
     }
}

async function iniciarAppSeguro(user) {
    fecharApp();      // ⛔ fecha tudo primeiro
    await iniciarApp(user); // ✅ inicia do zero
}

// --- CONSTANTES DE SEGURANÇA E LICENCIAMENTO ---
const CONST_ADD = 13;
const CONST_MULT = 9;
const CONST_BASE = 1954;
let generatedRandomNumber = 0; 

// --- ESTADO DA APLICAÇÃO ---
let currentUser = null; 

// --- Elementos DOM ---
const authScreen = document.getElementById('authScreen');
const appContainer = document.querySelector('.container');
const userDisplay = document.getElementById('userWelcomeDisplay');
const reportUserSpan = document.getElementById('reportUser');
const lockScreen = document.getElementById('lockScreen');
const loadingOverlay = document.getElementById('loadingOverlay');

function showLoading() { loadingOverlay.style.display = 'flex'; }
function hideLoading() { loadingOverlay.style.display = 'none'; }

// --- AUTH & FIRESTORE LOGIC ---

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
    if(!auth) return alert("Erro: Firebase não configurado no código.");

    showLoading();
    try {
        // 1. Cria usuário no Authentication
        const userCred = await auth.createUserWithEmailAndPassword(email, pass);
        const uid = userCred.user.uid;

        // 2. Prepara dados da licença (30 dias grátis ou Admin)
        const now = new Date();
        let expirationTime;

        // Regra 6: Admin tem 9999 dias
        if (email === 'jcnvap@gmail.com') {
            expirationTime = now.getTime() + (9999 * 24 * 60 * 60 * 1000);
        } else {
            // Regra 2: 30 dias grátis
            expirationTime = now.getTime() + (30 * 24 * 60 * 60 * 1000);
        }

        const userData = {
            name: name,
            email: email,
            role: (email === 'jcnvap@gmail.com') ? 'admin' : 'user',
            license: {
                expiration: expirationTime,
                lastAccess: now.getTime()
            },
            diagnosisData: {} // Dados do formulário vazio
        };

        // 3. Salva no Firestore
        await db.collection("users").doc(uid).set(userData);
        
        alert("Conta criada com sucesso no Firebase!");
        // Login automático após cadastro
        await loginSuccess(uid, userData);

    } catch (error) {
        console.error(error);
        let msg = "Erro ao cadastrar: " + error.message;
        if(error.code === 'auth/email-already-in-use') msg = "E-mail já está em uso.";
        if(error.code === 'auth/weak-password') msg = "A senha deve ter pelo menos 6 caracteres.";
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
        
        // Busca dados no Firestore
        const doc = await db.collection("users").doc(uid).get();
        if (doc.exists) {
            await loginSuccess(uid, doc.data());
        } else {
            // Usuário existe no Auth mas não no Firestore (fallback de integridade)
            alert("Dados do perfil não encontrados. Entre em contato com suporte.");
            auth.signOut();
        }
    } catch (error) {
        console.error(error);
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

// Função central de validação de acesso
async function loginSuccess(uid, userData) {
    const nowTime = Date.now();
    
    // Regra 6: Reforço de Admin caso o banco esteja desatualizado
    if (userData.email === 'jcnvap@gmail.com') {
        const minAdminExp = nowTime + (1000 * 60 * 60 * 24 * 365);
        if (userData.license.expiration < minAdminExp) {
             userData.license.expiration = nowTime + (9999 * 24 * 60 * 60 * 1000); 
        }
    }

    // Regra 5: Validação de data retroativa
    // Tolerância de 2 minutos para diferenças de relógio
    if (userData.license.lastAccess > nowTime + 120000) { 
        alert("Erro de segurança: A data do seu dispositivo parece estar errada (atrasada em relação ao último acesso registrado). Por favor, ajuste o relógio.");
        hideLoading();
        // Não permite prosseguir
        return;
    }

    // Atualiza lastAccess no banco (Persistência da Regra 5)
    // Fazemos isso sem esperar (fire and forget) para não travar a UI, ou esperamos se for crítico.
    // Aqui vamos esperar para garantir consistência.
    userData.license.lastAccess = nowTime;
    
    await db.collection("users").doc(uid).update({ 
        "license.lastAccess": nowTime,
        // Atualiza expiração caso tenha sido corrigida pelo admin check
        "license.expiration": userData.license.expiration 
    });

    // Atualiza objeto local
    currentUser = { uid: uid, ...userData };
    window.usuarioAtual = currentUser; // Sincroniza com a nova variável global

    // Verifica Expiração (Regra 4)
    if (nowTime > userData.license.expiration) {
        authScreen.style.display = 'none';
        lockScreen.style.display = 'flex'; // Exibe tela de bloqueio
        hideLoading();
        return;
    }

    // Sucesso: Libera App
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
    
    // Carregar dados salvos no Firestore para o formulário
    if (currentUser.diagnosisData) {
        loadFormDataFromObject(currentUser.diagnosisData);
    }

    // Regra 7: Botão IA visível para todos
    const btnAi = document.querySelector('.btn-ai');
    btnAi.style.display = 'inline-flex';
}

function handleLogout() {
    if(auth) {
        auth.signOut().then(() => {
            fecharApp(); // Garante limpeza ao sair
            location.reload();
        });
    } else {
        location.reload();
    }
}

window.onload = function() {
    if(!auth) {
         // Fallback se firebase não carregar
         authScreen.style.display = 'flex';
    }
    // A verificação de usuário agora ocorre automaticamente pelo listener do auth.
};

// --- SALVAMENTO DE DADOS (AUTO-SAVE NO FIRESTORE) ---
let timeoutId;
const form = document.getElementById("diagnosisForm");

form.querySelectorAll("input, select, textarea").forEach(field => {
    field.addEventListener("input", () => {
        if (typeof timeoutId !== 'undefined') clearTimeout(timeoutId);
        // Adiciona o novo timer ao array global para gestão segura
        timeoutId = setTimeout(saveToFirebase, 2000); // Debounce 2s
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

    // Atualiza objeto local
    currentUser.diagnosisData = data;

    // UI de salvamento
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
            if(key === 'ads_investe') toggleAdsDetail(data[key]);
            if(key === 'mktp_vende') toggleMktpDetail(data[key]);
        }
    });
    // Atualiza navegação visualmente
    showStep(currentStep); 
}

// --- SISTEMA DE BLOQUEIO E CONTRA-SENHA (REGRA 3 e 4) ---
function generateRandomCode() {
    // Regra 3: Número entre 100 e 1000
    generatedRandomNumber = Math.floor(Math.random() * 901) + 100;
    const display = document.getElementById('displayRandomCode');
    display.textContent = generatedRandomNumber;
    display.style.display = 'block';
}

async function validateUnlock() {
    const input = document.getElementById('unlockInput').value.trim();
    // Regra 4: Formato XXXXX-YYY
    const parts = input.split('-');
    
    if (parts.length !== 2) return alert("Formato inválido. Use XXXXX-YYY.");

    const codeInput = parseInt(parts[0]);
    const daysInput = parseInt(parts[1]);
    
    // Regra 3: Fórmula (R + 13) * 9 + 1954
    const expectedCode = (generatedRandomNumber + CONST_ADD) * CONST_MULT + CONST_BASE;

    if (codeInput === expectedCode) {
        const now = new Date();
        // Adiciona dias à data atual
        const newExpiration = now.getTime() + (daysInput * 24 * 60 * 60 * 1000);
        
        showLoading();
        try {
            // Atualiza Firestore
            await db.collection("users").doc(currentUser.uid).update({
                "license.expiration": newExpiration,
                "license.lastAccess": now.getTime()
            });
            
            // Atualiza local
            currentUser.license.expiration = newExpiration;
            currentUser.license.lastAccess = now.getTime();
            
            hideLoading();
            alert(`Licença renovada no Firebase por ${daysInput} dias!`);
            
            document.getElementById('unlockInput').value = "";
            document.getElementById('displayRandomCode').style.display = 'none';
            
            proceedToApp();
        } catch(e) {
            console.error(e);
            hideLoading();
            alert("Erro ao atualizar licença no banco de dados.");
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
        step.style.display = "none"; // Garante ocultação
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
    
    // Oculta step atual
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

// --- IA / RELATÓRIO / BACKUP ---
function generateReport() {
    document.getElementById("diagnosisForm").style.display = "none";
    document.querySelector('.nav-buttons').style.display = 'none';
    document.getElementById("reportSection").style.display = "block";
    
    const now = new Date();
    document.getElementById("reportDate").innerText = now.toLocaleDateString() + " às " + now.toLocaleTimeString();
    
    // Renderiza relatório simples
    let html = "";
    steps.forEach((step) => {
        const title = step.querySelector('.step-header h2').innerText;
        html += `<div class="report-block"><h3>${title}</h3>`;
        // Logica de extração de inputs igual ao original
        const inputs = step.querySelectorAll("input, select, textarea");
        let processedNames = [];
        inputs.forEach(input => {
            if (input.type === "submit" || input.type === "button") return;
            if (input.closest('#adsDetails') && input.closest('#adsDetails').style.display === 'none') return;
            if (input.closest('#mktpDetails') && input.closest('#mktpDetails').style.display === 'none') return;

            if(processedNames.includes(input.name)) return;
            
            let val = input.value;
            let labelText = input.name; // Fallback

            // Tenta pegar label
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

            if(val) {
                 html += `<div class="report-item"><strong>${labelText}</strong><span>${val}</span></div>`;
                 processedNames.push(input.name);
            }
        });
        html += `</div>`;
    });
    document.getElementById("reportContent").innerHTML = html;
}

// --- NOVA FUNÇÃO DE EDIÇÃO (VOLTA P/ PAGINA 1) ---
function editForm() {
    document.getElementById("reportSection").style.display = "none";
    document.getElementById("diagnosisForm").style.display = "block";
    document.querySelector('.nav-buttons').style.display = 'flex';
    
    // Reseta a visualização para a primeira etapa
    currentStep = 0;
    showStep(currentStep);
    
    // Se necessário, rola para o topo
    window.scrollTo(0, 0);
}

// --- NOVA LÓGICA DE IA / PLANO DE AÇÃO ---
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
    // Lógica: Sugerir apenas se for comércio/varejo e tiver faturamento relevante ou perfil B2C
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

    // Atualiza HTML e rola
    document.getElementById("adviceContent").innerHTML = html;
    hideLoading();
    document.getElementById("adviceSection").scrollIntoView({ behavior: 'smooth' });
}

// --- BACKUP & RESTORE (JSON Local <-> Firebase) ---
function backupData() {
    if(!currentUser) return;
    // Cria arquivo JSON com os dados atuais do usuário
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
                // Carrega no form visualmente
                loadFormDataFromObject(content.diagnosisData);
                // Salva no Firebase
                await db.collection("users").doc(currentUser.uid).update({
                    diagnosisData: content.diagnosisData
                });
                // Atualiza objeto local
                currentUser.diagnosisData = content.diagnosisData;
                
                hideLoading();
                alert("Dados restaurados e sincronizados com Firebase!");
            } else {
                alert("Arquivo de backup inválido.");
            }
        } catch(err) { 
            alert("Erro ao ler arquivo: " + err.message); 
        }
    };
    reader.readAsText(file);
}

async function clearData() { 
    if(confirm("Deseja limpar todos os dados do formulário no Firebase?")) {
        form.reset();
        await saveToFirebase();
        location.reload(); 
    } 
}

async function fillDemoData() {
    if(!confirm("Isso substituirá os dados atuais por dados de teste completos.")) return;

    // 1. Dados Completos e Realistas de Pequeno Comércio
    const demoData = {
        empresa_nome: "Loja Modelo & Estilo",
        empresa_cnpj: "12.345.678/0001-90",
        empresa_segmento: "Comércio Varejista de Roupas",
        empresa_tempo: "5",
        empresa_funcionarios: "4",
        empresa_faturamento: "55000.00",
        empresa_regime: "Simples Nacional",
        empresa_publico: "B2C",
        fin_controle: "Parcial",
        fin_custos_fixos: "15000.00",
        fin_custos_variaveis: "Taxas de cartão (3.5%), Comissões (3%), Impostos (Simples), Embalagens.",
        fin_margem: "Nao",
        fin_ponto_equilibrio: "Nao",
        fin_dividas: "Empréstimo bancário (parcela de R$ 1.500).",
        fin_fluxo_caixa: "Nao",
        prec_metodo: "Multiplico o preço de custo por 2.0 (Markup).",
        prec_top_vendas: "Camisetas, Calças Jeans, Acessórios.",
        prec_menor_lucro: "Produtos em promoção ou ponta de estoque.",
        prec_ticket_medio: "120.00",
        prec_descontos: "5% para pagamento no PIX ou dinheiro.",
        atend_canais: "WhatsApp, Instagram e Telefone.",
        atend_tempo: "Ate 1h",
        atend_posvenda: "Nao",
        atend_reclamacoes: "Demora na entrega ou falta de numeração.",
        vendas_canais_aquisicao: "Instagram, Fachada da loja, Indicação.",
        vendas_funil: "Mais ou menos",
        vendas_metas: "Nao",
        vendas_perdas: "Cliente acha caro ou não tem o tamanho.",
        promo_frequencia: "Sazonalmente",
        promo_analise: "Nao",
        mkt_redes: "Instagram e Facebook.",
        mkt_frequencia: "2 a 3 vezes por semana.",
        mkt_converte: "Pouco",
        seo_gmn: "Sim",
        seo_conteudo: "Nao",
        ads_investe: "Sim",
        ads_plataformas: "Instagram (Botão Turbinar)",
        ads_valor: "300.00",
        ads_cpl: "Nao",
        site_possui: "Nao",
        site_analytics: "Nao",
        tec_erp: "Sistema de gestão básico (Bling/Tiny).",
        tec_crm: "Nao",
        tec_manual: "Muito",
        mktp_vende: "Sim",
        mktp_quais: "Shopee e Mercado Livre (iniciando).",
        mktp_estoque: "Nao",
        pp_funcoes: "Parcial",
        pp_processos: "Nao",
        pp_gargalos: "Falta de tempo para gestão, faço tudo sozinho(a).",
        obj_problemas: "Sobra pouco dinheiro no fim do mês, não sei precificar corretamente.",
        obj_perda_dinheiro: "Estoque parado e taxas de cartão.",
        obj_principal: "Organizar o financeiro e aumentar o lucro.",
        obj_metas: "Contratar um gerente e abrir e-commerce.",
        obj_obs: "Preciso de ajuda urgente com fluxo de caixa."
    };

    // 2. Itera sobre o objeto e preenche o DOM
    for (const key in demoData) {
        const val = demoData[key];
        const fields = document.getElementsByName(key);

        if (fields.length > 0) {
            const field = fields[0]; 

            if (field.type === 'radio') {
                // Radio Buttons
                const radio = document.querySelector(`input[name="${key}"][value="${val}"]`);
                if (radio) radio.checked = true;
            } else {
                // Text, Number, Select, Textarea
                field.value = val;
            }
        }
    }

    // 3. Controla visibilidade de campos condicionais
    if (typeof toggleAdsDetail === 'function') toggleAdsDetail(demoData.ads_investe);
    if (typeof toggleMktpDetail === 'function') toggleMktpDetail(demoData.mktp_vende);

    // 4. Salva no Firebase
    await saveToFirebase();
    alert("Dados de teste preenchidos com sucesso!");
}