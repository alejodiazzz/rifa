import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getFirestore, collection, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

// =============================================
// CONFIGURACIÓN
// =============================================
const firebaseConfig = {
    apiKey: "AIzaSyDdQlHmnKmc4DI54JBY2WTV5Hr5udGzomM",
    authDomain: "rifas-d45b9.firebaseapp.com",
    projectId: "rifas-d45b9",
    storageBucket: "rifas-d45b9.appspot.com",
    messagingSenderId: "56517378127",
    appId: "1:56517378127:web:de508e329602e2c5d52a3a",
    measurementId: "G-HP008E5L2D"
};

const WHATSAPP_NUMBER = '573219038353';
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'arte2025';

// =============================================
// ESTADO GLOBAL
// =============================================
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let tickets = [];
let isAdmin = false;
let selectedTickets = new Set();

// =============================================
// INICIALIZACIÓN
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    loadTickets();
    showSection('talonario');
    setupGraphicInteractivity();
    initCarousel();
    initAdmin();
    setupReservaPanel();
});

// =============================================
// CARRUSEL
// =============================================
function initCarousel() {
    const track = document.getElementById('carousel-track');
    const dots = document.querySelectorAll('.carousel-dots .dot');
    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');
    if (!track || !prevBtn || !nextBtn) return;

    let current = 0;
    const total = document.querySelectorAll('.carousel-slide').length;
    let autoplayTimer = null;

    function goTo(index) {
        current = (index + total) % total;
        track.style.transform = `translateX(-${current * 100}%)`;
        dots.forEach((dot, i) => dot.classList.toggle('active', i === current));
    }
    function startAutoplay() {
        stopAutoplay();
        autoplayTimer = setInterval(() => goTo(current + 1), 4500);
    }
    function stopAutoplay() {
        if (autoplayTimer) clearInterval(autoplayTimer);
    }

    prevBtn.addEventListener('click', () => { goTo(current - 1); startAutoplay(); });
    nextBtn.addEventListener('click', () => { goTo(current + 1); startAutoplay(); });
    dots.forEach(dot => {
        dot.addEventListener('click', () => { goTo(parseInt(dot.dataset.index)); startAutoplay(); });
    });
    track.parentElement.addEventListener('mouseenter', stopAutoplay);
    track.parentElement.addEventListener('mouseleave', startAutoplay);
    goTo(0);
    startAutoplay();
}

// =============================================
// INTERACTIVIDAD GRÁFICA (GANADOR)
// =============================================
function setupGraphicInteractivity() {
    const lotteryDigits = document.querySelectorAll('.lottery-number span');
    const winner1 = document.getElementById('winner-1');
    if (!winner1 || lotteryDigits.length < 4) return;

    const resetStyles = () => {
        lotteryDigits.forEach(d => { d.style.transform = 'scale(1)'; d.style.color = ''; });
    };
    winner1.addEventListener('mouseover', () => {
        resetStyles();
        lotteryDigits[2].style.transform = 'scale(1.25)';
        lotteryDigits[2].style.color = '#d4a017';
        lotteryDigits[3].style.transform = 'scale(1.25)';
        lotteryDigits[3].style.color = '#d4a017';
    });
    winner1.addEventListener('mouseout', resetStyles);
}

// =============================================
// FIREBASE – CARGA Y GUARDADO
// =============================================
async function loadTickets() {
    const ticketsCol = collection(db, 'tickets');
    onSnapshot(ticketsCol, (snapshot) => {
        if (snapshot.empty) {
            const initial = Array.from({ length: 100 }, (_, i) => ({
                number: i.toString().padStart(2, '0'),
                status: 'disponible',
                owner: ''
            }));
            initial.forEach(t => setDoc(doc(db, 'tickets', t.number), t));
            tickets = initial;
        } else {
            tickets = snapshot.docs.map(d => d.data());
            tickets.sort((a, b) => a.number.localeCompare(b.number));
        }
        renderTalonario();
        renderLista();
    });
}

async function saveData(ticketData) {
    await setDoc(doc(db, 'tickets', ticketData.number), ticketData);
}

// =============================================
// AUTENTICACIÓN DE ADMINISTRADOR
// =============================================
function initAdmin() {
    if (localStorage.getItem('rifaAdminSession') === 'active') {
        isAdmin = true;
        applyAdminUI(true);
    }

    const trigger = document.getElementById('admin-trigger');
    if (trigger) {
        trigger.addEventListener('click', () => {
            if (isAdmin) doAdminLogout();
            else document.getElementById('adminModal').style.display = 'block';
        });
    }

    ['admin-user', 'admin-pass'].forEach(id => {
        document.getElementById(id)?.addEventListener('keydown', e => {
            if (e.key === 'Enter') doAdminLogin();
        });
    });
}

function doAdminLogin() {
    const user = document.getElementById('admin-user').value.trim();
    const pass = document.getElementById('admin-pass').value;

    if (user === ADMIN_USER && pass === ADMIN_PASS) {
        isAdmin = true;
        localStorage.setItem('rifaAdminSession', 'active');
        closeAdminModal();
        applyAdminUI(true);
        renderTalonario();
        renderLista();
    } else {
        const content = document.querySelector('#adminModal .modal-content');
        content.classList.add('shake');
        setTimeout(() => content.classList.remove('shake'), 500);
        document.getElementById('admin-pass').value = '';
        document.getElementById('admin-pass').focus();
    }
}

function doAdminLogout() {
    isAdmin = false;
    localStorage.removeItem('rifaAdminSession');
    selectedTickets.clear();
    applyAdminUI(false);
    renderTalonario();
    renderLista();
}

function applyAdminUI(active) {
    document.getElementById('admin-badge')?.classList.toggle('hidden', !active);
    document.getElementById('reserva-panel')?.classList.toggle('hidden', active);
    document.body.classList.toggle('admin-mode', active);
}

function closeAdminModal() {
    const modal = document.getElementById('adminModal');
    if (modal) {
        modal.style.display = 'none';
        document.getElementById('admin-user').value = '';
        document.getElementById('admin-pass').value = '';
    }
}

// =============================================
// PANEL DE RESERVA (MODO USUARIO)
// =============================================
function setupReservaPanel() {
    document.getElementById('usuario-nombre')?.addEventListener('input', updateReservaPanel);
    document.getElementById('btn-reservar')?.addEventListener('click', reservarNumeros);
}

function updateReservaPanel() {
    if (isAdmin) return;
    const nombre = document.getElementById('usuario-nombre')?.value.trim() || '';
    const count = selectedTickets.size;
    const infoEl = document.getElementById('seleccion-info');
    const btnReservar = document.getElementById('btn-reservar');

    if (infoEl) {
        if (count === 0) {
            infoEl.textContent = 'Haz clic en los números azules para seleccionarlos';
        } else {
            const nums = [...selectedTickets].map(i => tickets[i]?.number).filter(Boolean).join(', ');
            infoEl.innerHTML = `<strong>${count}</strong> número${count > 1 ? 's' : ''} seleccionado${count > 1 ? 's' : ''}: <em>${nums}</em>`;
        }
    }

    if (btnReservar) {
        const ready = count > 0 && nombre.length > 0;
        btnReservar.disabled = !ready;
        btnReservar.classList.toggle('btn-ready', ready);
    }
}

async function reservarNumeros() {
    const nombre = document.getElementById('usuario-nombre')?.value.trim();
    const btnReservar = document.getElementById('btn-reservar');

    if (!nombre) {
        const input = document.getElementById('usuario-nombre');
        input.classList.add('shake');
        input.focus();
        setTimeout(() => input.classList.remove('shake'), 500);
        return;
    }
    if (selectedTickets.size === 0) return;

    // Bloquear UI mientras se procesa
    btnReservar.disabled = true;
    btnReservar.textContent = '⏳ Reservando...';

    const numerosReservados = [];
    const promises = [];

    selectedTickets.forEach(index => {
        const ticket = tickets[index];
        if (ticket && ticket.status === 'disponible') {
            ticket.status = 'reservado';
            ticket.owner = nombre;
            numerosReservados.push(ticket.number);
            promises.push(saveData(ticket));
        }
    });

    await Promise.all(promises);

    if (numerosReservados.length > 0) {
        const numerosStr = numerosReservados.join(', ');
        const msg = encodeURIComponent(
            `¡Hola! 🎨 Quiero confirmar la reserva de los números *${numerosStr}* a nombre de *${nombre}* para la rifa solidaria de arte. 🎟️✨`
        );
        // Pequeño delay para que el usuario vea el feedback antes de abrir WhatsApp
        setTimeout(() => {
            window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank');
        }, 300);
    }

    // Resetear estado
    selectedTickets.clear();
    document.getElementById('usuario-nombre').value = '';
    btnReservar.textContent = '🎟️ Reservar Números';
    btnReservar.classList.remove('btn-ready');
    updateReservaPanel();
}

// =============================================
// ACCIONES EXCLUSIVAS DE ADMIN
// =============================================
function aprobarVenta(index) {
    if (!isAdmin) return;
    const ticket = tickets[index];
    if (!ticket || ticket.status !== 'reservado') return;
    ticket.status = 'vendido';
    saveData(ticket);
}

function liberarNumero(index) {
    if (!isAdmin) return;
    const ticket = tickets[index];
    if (!ticket) return;
    ticket.status = 'disponible';
    ticket.owner = '';
    saveData(ticket);
}

function editarNombre(index) {
    if (!isAdmin) return;
    const ticket = tickets[index];
    if (!ticket) return;
    const newName = prompt(`✏️ Editar nombre para el número ${ticket.number}:`, ticket.owner);
    if (newName !== null) {
        ticket.owner = newName.trim();
        saveData(ticket);
    }
}

// =============================================
// RENDERIZADO DEL TALONARIO
// =============================================
function renderTalonario() {
    const grid = document.getElementById('ticket-grid');
    if (!grid) return;
    grid.innerHTML = '';

    tickets.forEach((ticket, index) => {
        const div = document.createElement('div');
        div.className = `ticket ${ticket.status}`;
        if (selectedTickets.has(index)) div.classList.add('seleccionado');

        if (isAdmin) {
            // ── MODO ADMIN ──────────────────────────────────
            div.classList.add('ticket-admin');
            div.innerHTML = `<span class="tnum">${ticket.number}</span>`;

            if (ticket.owner) {
                const ownerEl = document.createElement('span');
                ownerEl.className = 'ticket-owner-mini';
                ownerEl.textContent = ticket.owner;
                div.appendChild(ownerEl);
            }

            const actions = document.createElement('div');
            actions.className = 'admin-actions';

            if (ticket.status === 'reservado') {
                actions.innerHTML = `
                    <button class="admin-btn approve" title="Confirmar pago → Vendido" onclick="aprobarVenta(${index})">✅</button>
                    <button class="admin-btn release" title="Liberar → Disponible" onclick="liberarNumero(${index})">✕</button>
                    <button class="admin-btn edit" title="Editar nombre" onclick="editarNombre(${index})">✏️</button>`;
            } else if (ticket.status === 'vendido') {
                actions.innerHTML = `
                    <button class="admin-btn release" title="Devolver a Reservado" onclick="liberarNumero(${index})">↩️</button>
                    <button class="admin-btn edit" title="Editar nombre" onclick="editarNombre(${index})">✏️</button>`;
            } else {
                actions.innerHTML = `
                    <button class="admin-btn edit" title="Reservar manualmente" onclick="adminReservarManual(${index})">📝</button>`;
            }

            div.appendChild(actions);

        } else {
            // ── MODO USUARIO ─────────────────────────────────
            div.innerHTML = `<span class="tnum">${ticket.number}</span>`;

            if (ticket.status === 'reservado' || ticket.status === 'vendido') {
                div.classList.add('no-click');
                if (ticket.owner) div.title = ticket.status === 'reservado'
                    ? `Reservado por: ${ticket.owner}`
                    : `Vendido a: ${ticket.owner}`;
            } else {
                div.addEventListener('click', () => toggleTicketSelection(index));
                div.title = 'Clic para seleccionar';
            }
        }

        grid.appendChild(div);
    });

    updateStats();
    if (!isAdmin) updateReservaPanel();
}

function adminReservarManual(index) {
    if (!isAdmin) return;
    const ticket = tickets[index];
    const nombre = prompt(`📝 Reservar número ${ticket.number} – Nombre del comprador:`, '');
    if (nombre && nombre.trim()) {
        ticket.status = 'reservado';
        ticket.owner = nombre.trim();
        saveData(ticket);
    }
}

function toggleTicketSelection(index) {
    if (isAdmin) return;
    if (selectedTickets.has(index)) {
        selectedTickets.delete(index);
    } else {
        selectedTickets.add(index);
    }
    renderTalonario();
}

function updateStats() {
    const stats = { disponible: 0, reservado: 0, vendido: 0 };
    tickets.forEach(t => { stats[t.status]++; });
    document.getElementById('stat-available').textContent = stats.disponible;
    document.getElementById('stat-reserved').textContent = stats.reservado;
    document.getElementById('stat-sold').textContent = stats.vendido;
}

// =============================================
// LISTA DE PARTICIPANTES
// =============================================
function renderLista() {
    const tbody = document.getElementById('list-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const labels = { 'disponible': 'Disponible', 'reservado': 'Reservado', 'vendido': 'Vendido' };

    tickets.forEach((ticket, index) => {
        const tr = document.createElement('tr');
        const nameCell = isAdmin
            ? `<input type="text" placeholder="Nombre" value="${ticket.owner}" onblur="updateOwner(${index}, this.value)">`
            : (ticket.owner || '—');

        tr.innerHTML = `
            <td><strong>${ticket.number}</strong></td>
            <td><span class="ticket ${ticket.status}" style="padding:0.4rem 0.8rem; display:inline-block; font-size:0.85rem;">${labels[ticket.status]}</span></td>
            <td>${nameCell}</td>
        `;
        tbody.appendChild(tr);
    });
}

function updateOwner(index, owner) {
    tickets[index].owner = owner;
    saveData(tickets[index]);
}

// =============================================
// NAVEGACIÓN
// =============================================
function showSection(sectionId) {
    const isTalonario = sectionId === 'talonario';
    document.getElementById('capture-area').style.display = isTalonario ? 'block' : 'none';
    document.getElementById('lista').style.display = isTalonario ? 'none' : 'block';
    document.querySelectorAll('nav a').forEach(a => a.classList.remove('active'));
    const link = document.querySelector(`nav a[onclick="showSection('${sectionId}')"]`);
    if (link) link.classList.add('active');
}

// =============================================
// CIERRE DE MODALES AL HACER CLIC FUERA
// =============================================
window.onclick = function (event) {
    const adminModal = document.getElementById('adminModal');
    if (event.target === adminModal) closeAdminModal();
};

// =============================================
// DESCARGA DE PÓSTER
// =============================================
function downloadPoster() {
    const downloadBtn = document.querySelector('.download-btn');
    downloadBtn.disabled = true;
    downloadBtn.textContent = 'Generando...';

    const posterWidth = 1080;
    const posterHeight = 1920;

    const poster = document.createElement('div');
    poster.id = 'poster-capture';
    poster.style.cssText = `
        width: ${posterWidth}px; height: ${posterHeight}px;
        background: linear-gradient(160deg, #0d1b3e 0%, #162447 50%, #1e3a5f 100%);
        display: flex; flex-direction: column;
        justify-content: space-around; align-items: center;
        padding: 40px; box-sizing: border-box;
        position: absolute; top: 0; left: -9999px;
    `;

    const elementsToCapture = {
        header: document.querySelector('#capture-area header'),
        prizes: document.querySelector('#capture-area .prizes'),
        explanation: document.querySelector('#capture-area .explanation'),
        talonario: document.getElementById('talonario'),
        legend: document.querySelector('.legend'),
    };

    const originalStates = new Map();
    Object.values(elementsToCapture).forEach(el => {
        if (el) {
            originalStates.set(el, { parent: el.parentNode, sibling: el.nextSibling });
            poster.appendChild(el);
        }
    });

    document.body.appendChild(poster);
    poster.classList.add('poster-capture-mode');

    setTimeout(() => {
        html2canvas(poster, {
            scale: 2, useCORS: true, allowTaint: true,
            backgroundColor: null, width: posterWidth, height: posterHeight,
        }).then(canvas => {
            const link = document.createElement('a');
            link.download = 'poster-rifa-9x16.png';
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
        }).catch(err => {
            console.error('Error generating image:', err);
            alert('Hubo un error al generar la imagen. Revisa la consola.');
        }).finally(() => {
            originalStates.forEach((state, el) => {
                if (state.sibling) state.parent.insertBefore(el, state.sibling);
                else state.parent.appendChild(el);
            });
            poster.remove();
            downloadBtn.disabled = false;
            downloadBtn.textContent = 'Descargar Póster';
        });
    }, 300);
}

// =============================================
// EXPORTS GLOBALES
// =============================================
window.showSection = showSection;
window.downloadPoster = downloadPoster;
window.updateOwner = updateOwner;
window.doAdminLogin = doAdminLogin;
window.doAdminLogout = doAdminLogout;
window.closeAdminModal = closeAdminModal;
window.aprobarVenta = aprobarVenta;
window.liberarNumero = liberarNumero;
window.editarNombre = editarNombre;
window.adminReservarManual = adminReservarManual;
window.changeSelectedStatus = function () { };   // legacy stub
