/*
  NoteSync Chatbot & Interactivity
  This script handles the chatbot and Supabase CRUD operations.
*/

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. SESSION VALIDATION ON STARTUP ---
    // This logic checks if the user has visited before and has a valid token
    const checkSession = async () => {
        const savedToken = localStorage.getItem('noteSync_token');
        if (savedToken) {
            try {
                const response = await fetch('/api/users/validate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: savedToken })
                });

                if (response.ok) {
                    const result = await response.json();
                    const userData = result.data;

                    // User found! Skip the registration introduction
                    isFirstMessage = false;
                    waitingForFirstName = false;
                    waitingForLastName = false;
                    waitingForEmail = false;

                    // Restore user state from the backend response
                    userId = userData.id; // CRITICAL: Store the ID for saving history
                    userFirstName = userData.first_name;
                    userLastName = userData.last_name;
                    userEmail = userData.email;

                    // Update lock icon state
                    const lockIcon = document.getElementById('workspace-lock-icon');
                    if (lockIcon) {
                        lockIcon.classList.remove('fa-lock');
                        lockIcon.classList.add('fa-lock-open');
                    }

                    // TWEAK: Show Note Entry UI instead of redirecting if on landing page
                    const regCard = document.getElementById('registration-card');
                    const notesCard = document.getElementById('notes-entry-card');
                    const greeting = document.getElementById('notes-greeting');
                    if (regCard && notesCard) {
                        regCard.style.display = 'none';
                        notesCard.style.display = 'block';
                        if (greeting) greeting.innerHTML = `Welcome, <span style="color:var(--primary); font-weight:700;">${userFirstName} ${userLastName}</span>! Feel free to write your notes below:`;
                    }

                    // Update the chat UI with a personalized greeting
                    const chatMessages = document.getElementById('chat-messages');
                    chatMessages.innerHTML = `
                        <div class="message bot-message">
                            Welcome back, ${userFirstName}! How can I assist you today?
                        </div>
                    `;
                } else {
                    // Token is invalid/expired, remove it to allow fresh login
                    localStorage.removeItem('noteSync_token');
                }
            } catch (error) {
                console.error("Session check failed:", error);
            }
        }
    };

    // --- 2. CHATBOT TOGGLE LOGIC ---
    const chatbotBtn = document.querySelector('.chatbot-toggle-btn');
    const chatWindow = document.querySelector('.chat-window');

    if (chatbotBtn && chatWindow) {
        chatbotBtn.addEventListener('click', () => {
            chatWindow.classList.toggle('hidden');
        });
    }

    // --- 3. HERO REGISTRATION FORM ---
    const heroRegForm = document.getElementById('hero-registration-form');
    const regSubmitBtn = document.getElementById('reg-submit-btn');

    if (heroRegForm) {
        heroRegForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const firstName = document.getElementById('reg-first-name').value.trim();
            const lastName = document.getElementById('reg-last-name').value.trim();
            const email = document.getElementById('reg-email').value.trim();

            if (!firstName || !lastName || !email) return;

            // Update UI state
            const originalBtnText = regSubmitBtn.innerHTML;
            regSubmitBtn.disabled = true;
            regSubmitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Unlocking...';

            try {
                const response = await fetch('/api/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        firstName,
                        lastName,
                        email
                    })
                });

                if (response.ok) {
                    const result = await response.json();
                    userId = result.data.id;
                    userFirstName = firstName;
                    userLastName = lastName;
                    userEmail = email;

                    if (result.data.session_token) {
                        localStorage.setItem('noteSync_token', result.data.session_token);
                    }

                    // Success animation/feedback
                    regSubmitBtn.innerHTML = '<i class="fa-solid fa-check"></i> Workspace Unlocked!';
                    regSubmitBtn.style.background = '#10b981'; // Success green

                    // TWEAK: Show Note Entry UI instead of redirecting
                    const regCard = document.getElementById('registration-card');
                    const notesCard = document.getElementById('notes-entry-card');
                    const greeting = document.getElementById('notes-greeting');
                    
                    if (regCard && notesCard) {
                        regCard.style.display = 'none';
                        notesCard.style.display = 'block';
                        if (greeting) greeting.innerHTML = `Welcome, <span style="color:var(--primary); font-weight:700;">${userFirstName} ${userLastName}</span>! Feel free to write your notes below:`;
                    } else {
                        setTimeout(() => {
                            window.location.href = "/notes"; 
                        }, 1000);
                    }
                } else {
                    const error = await response.json();
                    alert("Registration failed: " + (error.message || "Unknown error"));
                    regSubmitBtn.disabled = false;
                    regSubmitBtn.innerHTML = originalBtnText;
                }
            } catch (error) {
                console.error("Registration error:", error);
                alert("Connection error. Please try again.");
                regSubmitBtn.disabled = false;
                regSubmitBtn.innerHTML = originalBtnText;
            }
        });
    }

    // --- 4. CHATBOT MESSAGE LOGIC (Simplified) ---
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');

    // Registration state (now used mainly for identity)
    let userFirstName = "";
    let userLastName = "";
    let userEmail = "";
    let userId = null;

    function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);
        messageDiv.textContent = text;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async function saveMessageToHistory(text) {
        if (!userId) return;
        try {
            await fetch('/api/history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, message: text })
            });
        } catch (error) {
            console.error("Error saving history:", error);
        }
    }

    if (chatForm) {
        chatForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const messageText = chatInput.value.trim();
            if (!messageText) return;

            addMessage(messageText, 'user');
            chatInput.value = "";

            if (userId) saveMessageToHistory(messageText);

            setTimeout(() => {
                const response = userId
                    ? `I've noted that for you, ${userFirstName}.`
                    : "I've noted your message. Please unlock your workspace to save history.";
                addMessage(response, 'bot');
            }, 800);
        });
    }

    // --- 5. SCROLL ANIMATIONS ---
    const observerOptions = { threshold: 0.1 };
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.feature-card, .hero-content, .hero-card-container').forEach(el => {
        el.style.opacity = "0";
        el.style.transform = "translateY(30px)";
        el.style.transition = "all 0.8s cubic-bezier(0.22, 1, 0.36, 1)";
        observer.observe(el);
    });

    // CSS class for the animation
    const styleAttr = document.createElement('style');
    styleAttr.innerHTML = `
        .animate-in {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
    `;
    document.head.appendChild(styleAttr);

    // Startup Execution
    checkSession();

    // --- 5. NOTES PAGE SHARED HISTORY LOGIC ---
    const notesGrid = document.getElementById('notes-grid');

    if (notesGrid) {
        const loadAllNotes = async () => {
            try {
                if (!userId) await checkSession();

                const response = await fetch('/api/history_all');
                const notes = await response.json();
                
                notesGrid.innerHTML = "";
                
                if (!notes || notes.length === 0) {
                    notesGrid.innerHTML = `
                        <div class="loading-placeholder">
                            <i class="fa-solid fa-folder-open"></i>
                            <p>No community notes found yet. Be the first to share!</p>
                        </div>
                    `;
                    return;
                }

                // Update Stats (Essential Only)
                document.getElementById('total-notes-count').textContent = notes.length.toLocaleString();
                document.getElementById('total-users-count').textContent = [...new Set(notes.map(n => n.user_id))].length;
                document.getElementById('today-notes-count').textContent = notes.filter(n => new Date(n.created_at).toDateString() === new Date().toDateString()).length;
                document.getElementById('showing-count').textContent = `${notes.length} total community notes`;

                notes.forEach(note => {
                    const isOwner = userId && String(note.user_id) === String(userId);
                    
                    const userName = note.Users ? `${note.Users.first_name} ${note.Users.last_name}` : `User #${note.user_id}`;
                    
                    const card = document.createElement('div');
                    card.className = `note-card`;
                    
                    card.innerHTML = `
                        <div class="note-card-header">
                            <div class="user-meta">
                                <img src="https://ui-avatars.com/api/?name=${userName}&background=6366f1&color=fff" alt="User">
                                <div>
                                    <span class="name">${userName}</span>
                                    <span class="time">${new Date(note.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="note-card-body">
                            <p>${note.message}</p>
                        </div>
                        
                        <div class="note-card-footer">
                            ${isOwner ? `
                                <button class="footer-btn delete" onclick="deleteNote(${note.id})" title="Remove">
                                    <i class="fa-solid fa-trash-can"></i>
                                </button>
                            ` : ''}
                        </div>
                    `;
                    notesGrid.appendChild(card);
                });
            } catch (error) {
                console.error("Error loading notes:", error);
                notesGrid.innerHTML = `
                    <div class="loading-placeholder">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                        <p>Connection error. Please refresh the page.</p>
                    </div>
                `;
            }
        };

        window.deleteNote = async (id) => {
            if (!confirm("Are you sure you want to delete this shared note?")) return;
            
            try {
                const response = await fetch(`/api/history/${id}`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    loadAllNotes();
                } else {
                    alert("Failed to delete note.");
                }
            } catch (error) {
                console.error("Delete error:", error);
            }
        };
        loadAllNotes();

        // --- BELL NOTIFICATION BUTTON ---
        const notifsBtn = document.getElementById('notifications-btn');
        if (notifsBtn) {
            notifsBtn.addEventListener('click', () => {
                // Toggle a simple tooltip/alert — extend this with a real panel later
                const badge = document.getElementById('notif-badge');
                const count = parseInt(badge?.textContent || '0');
                if (count > 0) {
                    alert(`You have ${count} new notification(s).`);
                    updateNotifBadge(0);
                } else {
                    alert('No new notifications.');
                }
            });
        }

        // --- SEARCH & SORT LOGIC ---
        let allNotes = []; // cache of loaded notes

        const originalLoad = loadAllNotes;
        // Override to also cache notes for filtering
        const loadAndCache = async () => {
            await originalLoad();
            // After load, re-read the rendered cards for client-side filtering
        };

        // Live search: filters already-rendered cards
        const filterCards = () => {
            const query = (document.getElementById('grid-search')?.value || document.getElementById('top-search')?.value || '').toLowerCase().trim();
            const cards = document.querySelectorAll('#notes-grid .note-card');
            cards.forEach(card => {
                const text = card.querySelector('.note-card-body p')?.textContent.toLowerCase() || '';
                const name = card.querySelector('.user-meta .name')?.textContent.toLowerCase() || '';
                card.style.display = (text.includes(query) || name.includes(query)) ? '' : 'none';
            });
        };

        const gridSearch = document.getElementById('grid-search');
        const topSearch = document.getElementById('top-search');
        const sortOrder = document.getElementById('sort-order');

        if (gridSearch) gridSearch.addEventListener('input', filterCards);
        if (topSearch) topSearch.addEventListener('input', () => {
            if (gridSearch) gridSearch.value = topSearch.value;
            filterCards();
        });

        if (sortOrder) {
            sortOrder.addEventListener('change', () => {
                const grid = document.getElementById('notes-grid');
                const cards = Array.from(grid.querySelectorAll('.note-card'));
                cards.sort((a, b) => {
                    const aDate = new Date(a.querySelector('.user-meta .time')?.textContent || 0);
                    const bDate = new Date(b.querySelector('.user-meta .time')?.textContent || 0);
                    return sortOrder.value === 'latest' ? bDate - aDate : aDate - bDate;
                });
                cards.forEach(card => grid.appendChild(card));
            });
        }
    }
    // Initial state (hidden)
    updateNotifBadge(0);

    // --- HERO NOTE SAVING LOGIC ---
    const saveHeroNoteBtn = document.getElementById('save-hero-note-btn');
    const heroNoteInput = document.getElementById('hero-note-input');

    if (saveHeroNoteBtn) {
        saveHeroNoteBtn.addEventListener('click', async () => {
            const message = heroNoteInput.value.trim();
            if (!message) return;
            if (!userId) {
                alert("Please unlock your workspace first!");
                return;
            }

            saveHeroNoteBtn.disabled = true;
            saveHeroNoteBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Saving...';

            try {
                const response = await fetch('/api/history', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, message })
                });

                if (response.ok) {
                    saveHeroNoteBtn.innerHTML = '<i class="fa-solid fa-check"></i> Saved Successfully!';
                    saveHeroNoteBtn.style.background = '#10b981';
                    heroNoteInput.value = "";
                    
                    setTimeout(() => {
                        saveHeroNoteBtn.disabled = false;
                        saveHeroNoteBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Save Notes';
                        saveHeroNoteBtn.style.background = '';
                    }, 3000);
                }
            } catch (error) {
                console.error("Hero save error:", error);
                saveHeroNoteBtn.disabled = false;
                saveHeroNoteBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Save Notes';
            }
        });
    }
});

/* Notification Badge Logic Helper */
const updateNotifBadge = (count) => {
    const badge = document.getElementById('notif-badge');
    if (!badge) return;
    if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'block';
    } else {
        badge.style.display = 'none';
    }
};
