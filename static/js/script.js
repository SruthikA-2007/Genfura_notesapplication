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

                    // Update the chat UI with a one-time welcome message
                    const chatMessages = document.getElementById('chat-messages');
                    const hasBeenWelcomed = localStorage.getItem('noteSync_welcomed');
                    
                    if (!hasBeenWelcomed) {
                        chatMessages.innerHTML = `
                            <div class="message bot-message">
                                Welcome to Notes, ${userFirstName}!
                            </div>
                        `;
                        localStorage.setItem('noteSync_welcomed', 'true');
                    } else {
                        // Clear existing manual messages, polling will fill it
                        chatMessages.innerHTML = "";
                    }

                    // Start polling for shared chat messages
                    startChatPolling();
                } else {
                    // Token is invalid/expired, show generic welcome
                    showGenericWelcome();
                    localStorage.removeItem('noteSync_token');
                }
            } catch (error) {
                console.error("Session check failed:", error);
                showGenericWelcome();
            }
        } else {
            // No token at all, show generic welcome
            showGenericWelcome();
        }
    };

    const showGenericWelcome = () => {
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages && chatMessages.children.length === 0) {
            chatMessages.innerHTML = `
                <div class="message bot-message">
                    Welcome to Notes!
                </div>
            `;
        }
        // Disable chat input for guests
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.placeholder = "Unlock workspace to chat...";
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

    function addMessage(text, sender, name = "") {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);
        
        if (name && sender !== 'bot' && sender !== 'system') {
            const nameSpan = document.createElement('span');
            nameSpan.style.display = 'block';
            nameSpan.style.fontSize = '0.7rem';
            nameSpan.style.marginBottom = '2px';
            nameSpan.style.opacity = '0.7';
            nameSpan.textContent = name;
            messageDiv.appendChild(nameSpan);
        }

        const textSpan = document.createElement('span');
        textSpan.textContent = text;
        messageDiv.appendChild(textSpan);
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async function saveMessageToChat(text) {
        if (!userId) return;
        try {
            await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, message: text })
            });
            loadChatMessages(); // Refresh immediately after sending
        } catch (error) {
            console.error("Error saving chat:", error);
        }
    }

    async function loadChatMessages() {
        try {
            const response = await fetch('/api/chat');
            const messages = await response.json();
            
            const chatMessages = document.getElementById('chat-messages');
            
            // Collect existing system messages (ephemeral)
            const systemMessages = Array.from(chatMessages.querySelectorAll('.bot-message'))
                .filter(el => !el.textContent.includes('Welcome to Notes')) // Don't duplicate welcome
                .map(el => el.outerHTML);

            // Re-build content
            const welcomeMsg = localStorage.getItem('noteSync_token') ? 
                `<div class="message bot-message">Welcome to Notes, ${userFirstName}!</div>` : "";
            
            let newContent = "";
            const hasBeenWelcomed = localStorage.getItem('noteSync_welcomed');
            if (hasBeenWelcomed) {
                newContent = welcomeMsg;
            }

            messages.forEach(msg => {
                const isMe = (userId && String(msg.user_id) === String(userId));
                const sender = isMe ? 'user' : 'other';
                const userName = msg.Users ? `${msg.Users.first_name} ${msg.Users.last_name}` : `User #${msg.user_id}`;
                
                newContent += `
                    <div class="message ${sender}-message">
                        <span style="display:block; font-size:0.7rem; margin-bottom:2px; opacity:0.7; font-weight: 500;">
                            ${isMe ? 'You' : userName}
                        </span>
                        <span>${msg.message}</span>
                    </div>
                `;
            });

            // Add back ephemeral system messages
            systemMessages.forEach(sm => {
                if (!newContent.includes(sm)) newContent += sm;
            });

            if (chatMessages.innerHTML !== newContent) {
                chatMessages.innerHTML = newContent;
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
        } catch (error) {
            console.error("Error loading chat:", error);
        }
    }

    function startChatPolling() {
        loadChatMessages();
        setInterval(loadChatMessages, 5000); // Poll every 5 seconds
    }

    if (chatForm) {
        chatForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const messageText = chatInput.value.trim();
            if (!messageText) return;

            if (!userId) {
                alert("Please unlock your workspace to send messages.");
                return;
            }

            saveMessageToChat(messageText);
            chatInput.value = "";
            // AI Responses Disabled
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
                const totalNotes = document.getElementById('total-notes-count');
                const totalUsers = document.getElementById('total-users-count');
                const todayNotes = document.getElementById('today-notes-count');
                const showingCount = document.getElementById('showing-count');

                if (totalNotes) totalNotes.textContent = notes.length.toLocaleString();
                if (totalUsers) totalUsers.textContent = [...new Set(notes.map(n => n.user_id))].length;
                if (todayNotes) todayNotes.textContent = notes.filter(n => new Date(n.created_at).toDateString() === new Date().toDateString()).length;
                if (showingCount) showingCount.textContent = `${notes.length} total community notes`;

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
                    
                    // Show system message in chatbot
                    addMessage(`Your note '${message}' has been saved, ${userFirstName}.`, 'bot');
                    
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

    // --- 6. COLLECTION PAGE LOGIC ---
    const folderGrid = document.getElementById('folder-grid');
    const viewFolders = document.getElementById('view-folders');
    const viewNotes = document.getElementById('view-notes');
    const backBtn = document.getElementById('back-btn');
    const notesGridInner = document.getElementById('notes-grid-inner');
    const breadcrumbName = document.getElementById('breadcrumb-name');

    if (folderGrid) {
        let allCollections = [];

        const loadCollections = async () => {
            try {
                if (!userId) await checkSession();
                const response = await fetch('/api/notes_grouped');
                allCollections = await response.json();
                renderFolders(allCollections);
            } catch (error) {
                console.error("Collection load error:", error);
                folderGrid.innerHTML = `<p style="padding:20px; opacity:0.6;">Error loading collections.</p>`;
            }
        };

        const renderFolders = (collections) => {
            folderGrid.innerHTML = "";
            if (collections.length === 0) {
                folderGrid.innerHTML = `<p style="padding:20px; opacity:0.6;">No user collections found.</p>`;
                return;
            }

            collections.forEach(user => {
                const folder = document.createElement('div');
                folder.className = 'col-folder-card';
                folder.innerHTML = `
                    <div class="col-folder-icon"><i class="fa-solid fa-folder"></i></div>
                    <div class="col-folder-info">
                        <h3 class="col-folder-name">${user.name}</h3>
                        <p class="col-folder-count">${user.notes.length} saved notes</p>
                    </div>
                `;
                folder.addEventListener('click', () => showUserNotes(user));
                folderGrid.appendChild(folder);
            });
        };

        const showUserNotes = (user) => {
            viewFolders.style.display = 'none';
            viewNotes.style.display = 'block';
            breadcrumbName.textContent = user.name;

            notesGridInner.innerHTML = "";
            user.notes.forEach(note => {
                const isOwner = userId && String(user.user_id) === String(userId);
                const card = document.createElement('div');
                card.className = 'col-note-card';
                card.innerHTML = `
                    <div class="col-note-text">${note.message}</div>
                    <div class="col-note-meta">
                        <div class="col-note-time">
                            <i class="fa-regular fa-clock"></i>
                            ${new Date(note.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </div>
                        <div class="col-note-actions">
                            ${isOwner ? `
                                <button class="footer-btn edit" onclick="openEditModal(${note.id}, '${note.message.replace(/'/g, "\\'")}')" title="Edit">
                                    <i class="fa-solid fa-pen-to-square"></i>
                                </button>
                                <button class="footer-btn delete" onclick="deleteNote(${note.id})" title="Delete">
                                    <i class="fa-solid fa-trash-can"></i>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `;
                notesGridInner.appendChild(card);
            });
        };

        if (backBtn) {
            backBtn.addEventListener('click', () => {
                viewFolders.style.display = 'block';
                viewNotes.style.display = 'none';
            });
        }

        // Search logic
        const folderSearch = document.getElementById('folder-search');
        if (folderSearch) {
            folderSearch.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase();
                const filtered = allCollections.filter(u => u.name.toLowerCase().includes(query));
                renderFolders(filtered);
            });
        }

        loadCollections();
    }

    // Modal Logic for Editing
    const editModal = document.getElementById('edit-modal-overlay');
    const editArea = document.getElementById('edit-note-text');
    const cancelEditBtn = document.getElementById('edit-cancel-btn');
    const saveEditBtn = document.getElementById('edit-save-btn');
    let currentEditId = null;

    window.openEditModal = (id, text) => {
        currentEditId = id;
        editArea.value = text;
        editModal.classList.add('active');
    };

    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', () => {
            editModal.classList.remove('active');
            currentEditId = null;
        });
    }

    if (saveEditBtn) {
        saveEditBtn.addEventListener('click', async () => {
            const newText = editArea.value.trim();
            if (!newText || !currentEditId) return;

            try {
                const response = await fetch(`/api/history/${currentEditId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: newText })
                });

                if (response.ok) {
                    editModal.classList.remove('active');
                    location.reload(); // Simple refresh to show changes
                } else {
                    alert("Update failed.");
                }
            } catch (error) {
                console.error("Edit error:", error);
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
