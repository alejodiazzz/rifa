import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
        import { getFirestore, collection, doc, getDocs, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

        // Your web app's Firebase configuration
        const firebaseConfig = {
            apiKey: "AIzaSyDdQlHmnKmc4DI54JBY2WTV5Hr5udGzomM",
            authDomain: "rifas-d45b9.firebaseapp.com",
            projectId: "rifas-d45b9",
            storageBucket: "rifas-d45b9.appspot.com",
            messagingSenderId: "56517378127",
            appId: "1:56517378127:web:de508e329602e2c5d52a3a",
            measurementId: "G-HP008E5L2D"
        };

        // Initialize Firebase
        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);

        let tickets = [];
        let currentTicketIndex = null;
        let selectedTickets = new Set();

        document.addEventListener('DOMContentLoaded', () => {
            loadTickets();
            showSection('talonario');
            setupGraphicInteractivity();
        });

        function setupGraphicInteractivity() {
            const lotteryDigits = document.querySelectorAll('.lottery-number span');
            const winner1 = document.getElementById('winner-1');
            const winner2 = document.getElementById('winner-2');
            const winner3 = document.getElementById('winner-3');

            if (!winner1 || !winner2 || !winner3) return;

            const resetStyles = () => {
                lotteryDigits.forEach(digit => {
                    digit.style.transform = 'scale(1)';
                    digit.style.color = 'inherit';
                });
            };

            winner1.addEventListener('mouseover', () => {
                resetStyles();
                lotteryDigits[2].style.transform = 'scale(1.2)';
                lotteryDigits[2].style.color = '#ffd700';
                lotteryDigits[3].style.transform = 'scale(1.2)';
                lotteryDigits[3].style.color = '#ffd700';
            });
            winner1.addEventListener('mouseout', resetStyles);

            winner2.addEventListener('mouseover', () => {
                resetStyles();
                lotteryDigits[1].style.transform = 'scale(1.2)';
                lotteryDigits[1].style.color = '#c0c0c0';
                lotteryDigits[2].style.transform = 'scale(1.2)';
                lotteryDigits[2].style.color = '#c0c0c0';
            });
            winner2.addEventListener('mouseout', resetStyles);

            winner3.addEventListener('mouseover', () => {
                resetStyles();
                lotteryDigits[0].style.transform = 'scale(1.2)';
                lotteryDigits[0].style.color = '#cd7f32';
                lotteryDigits[1].style.transform = 'scale(1.2)';
                lotteryDigits[1].style.color = '#cd7f32';
            });
            winner3.addEventListener('mouseout', resetStyles);
        }

        async function loadTickets() {
            const ticketsCol = collection(db, 'tickets');
            onSnapshot(ticketsCol, (snapshot) => {
                if (snapshot.empty) {
                    console.log("No tickets found, creating initial data...");
                    const initialTickets = Array.from({ length: 100 }, (_, i) => ({
                        number: i.toString().padStart(2, '0'),
                        status: 'disponible',
                        owner: ''
                    }));
                    initialTickets.forEach(ticket => {
                        setDoc(doc(db, "tickets", ticket.number), ticket);
                    });
                    tickets = initialTickets;
                } else {
                    const serverTickets = snapshot.docs.map(doc => doc.data());
                    serverTickets.sort((a, b) => a.number.localeCompare(b.number));
                    tickets = serverTickets;
                }
                renderTalonario();
                renderLista();
            });
        }

        async function saveData(ticketData) {
            await setDoc(doc(db, "tickets", ticketData.number), ticketData);
        }

        function renderTalonario() {
            const grid = document.getElementById('ticket-grid');
            grid.innerHTML = '';
            
            tickets.forEach((ticket, index) => {
                const ticketDiv = document.createElement('div');
                ticketDiv.className = `ticket ${ticket.status}`;
                ticketDiv.textContent = ticket.number;
                ticketDiv.onclick = (e) => {
                    if (e.ctrlKey || e.metaKey) {
                        toggleTicketSelection(index);
                    } else {
                        openModal(index);
                    }
                };
                grid.appendChild(ticketDiv);
            });

            updateStats();
        }

        function toggleTicketSelection(index) {
            if (selectedTickets.has(index)) {
                selectedTickets.delete(index);
            } else {
                selectedTickets.add(index);
            }
            renderTalonario();
        }

        function changeSelectedStatus(newStatus) {
            if (selectedTickets.size === 0) {
                alert('Mantén presionada la tecla Ctrl/Cmd y haz clic en los tickets para seleccionarlos');
                return;
            }

            selectedTickets.forEach(index => {
                const ticket = tickets[index];
                ticket.status = newStatus;
                saveData(ticket);
            });

            selectedTickets.clear();
        }

        function updateStats() {
            const stats = {
                disponible: 0,
                reservado: 0,
                vendido: 0
            };

            tickets.forEach(ticket => {
                stats[ticket.status]++;
            });

            document.getElementById('stat-available').textContent = stats.disponible;
            document.getElementById('stat-reserved').textContent = stats.reservado;
            document.getElementById('stat-sold').textContent = stats.vendido;
        }

        function renderLista() {
            const tbody = document.getElementById('list-tbody');
            tbody.innerHTML = '';
            
            tickets.forEach((ticket, index) => {
                const tr = document.createElement('tr');
                const statusText = {
                    'disponible': 'Disponible',
                    'reservado': 'Reservado',
                    'vendido': 'Vendido'
                };
                
                tr.innerHTML = `
                    <td><strong>${ticket.number}</strong></td>
                    <td><span class="ticket ${ticket.status}" style="padding: 0.5rem 1rem; display: inline-block; font-size: 0.9rem;">${statusText[ticket.status]}</span></td>
                    <td><input type="text" placeholder="Nombre del participante" value="${ticket.owner}" onblur="updateOwner(${index}, this.value)"></td>
                `;
                tbody.appendChild(tr);
            });
        }

        function updateOwner(index, owner) {
            tickets[index].owner = owner;
            saveData(tickets[index]);
        }

        function openModal(index) {
            currentTicketIndex = index;
            const ticket = tickets[index];
            
            document.getElementById('modal-ticket-number').textContent = ticket.number;
            document.getElementById('modal-owner-input').value = ticket.owner;
            document.getElementById('modal-status-select').value = ticket.status;
            
            document.getElementById('ticketModal').style.display = 'block';
        }

        function closeModal() {
            document.getElementById('ticketModal').style.display = 'none';
            currentTicketIndex = null;
        }

        function saveTicket() {
            if (currentTicketIndex === null) return;
            
            const owner = document.getElementById('modal-owner-input').value;
            const status = document.getElementById('modal-status-select').value;
            
            const ticket = tickets[currentTicketIndex];
            ticket.owner = owner;
            ticket.status = status;
            
            saveData(ticket);
            closeModal();
        }

        window.onclick = function(event) {
            const modal = document.getElementById('ticketModal');
            if (event.target === modal) {
                closeModal();
            }
        }

        function showSection(sectionId) {
            const isTalonario = sectionId === 'talonario';
            document.getElementById('capture-area').style.display = isTalonario ? 'block' : 'none';
            document.getElementById('lista').style.display = isTalonario ? 'none' : 'block';
            
            document.querySelectorAll('nav a').forEach(a => a.classList.remove('active'));
            const link = document.querySelector(`nav a[onclick="showSection('${sectionId}')"]`);
            if (link) link.classList.add('active');
        }

        function downloadPoster() {
            const downloadBtn = document.querySelector('.download-btn');
            downloadBtn.disabled = true;
            downloadBtn.textContent = 'Generando...';

            const posterWidth = 1080;
            const posterHeight = 1920;

            const poster = document.createElement('div');
            poster.id = 'poster-capture';
            poster.style.cssText = `
                width: ${posterWidth}px;
                height: ${posterHeight}px;
                background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0f3460 100%);
                display: flex;
                flex-direction: column;
                justify-content: space-around; /* Distribute content evenly */
                align-items: center;
                padding: 40px;
                box-sizing: border-box;
                position: absolute;
                top: 0;
                left: -9999px;
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

            // Delay to ensure rendering with new styles
            setTimeout(() => {
                html2canvas(poster, {
                    scale: 2, // High quality
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: null,
                    width: posterWidth,
                    height: posterHeight,
                }).then(canvas => {
                    const link = document.createElement('a');
                    link.download = 'poster-rifa-9x16.png';
                    link.href = canvas.toDataURL('image/png', 1.0);
                    link.click();
                }).catch(err => {
                    console.error("Error generating image:", err);
                    alert("Hubo un error al generar la imagen. Revisa la consola para más detalles.");
                }).finally(() => {
                    // Restore original DOM
                    originalStates.forEach((state, el) => {
                        if (state.sibling) {
                            state.parent.insertBefore(el, state.sibling);
                        } else {
                            state.parent.appendChild(el);
                        }
                    });
                    poster.remove();
                    downloadBtn.disabled = false;
                    downloadBtn.textContent = 'Descargar Póster';
                });
            }, 300); // A slightly longer delay to be safe
        }

        window.downloadPoster = downloadPoster;
        window.changeSelectedStatus = changeSelectedStatus;
        window.updateOwner = updateOwner;
        window.openModal = openModal;
        window.closeModal = closeModal;
        window.saveTicket = saveTicket;
        window.showSection = showSection;
