/*
  NoteSync Chatbot & Interactivity
  This script handles the chatbot and Supabase CRUD operations.
*/

document.addEventListener('DOMContentLoaded', () => {

    // --- 2. CHATBOT TOGGLE LOGIC ---
    const chatbotBtn = document.querySelector('.chatbot-toggle-btn');
    const chatWindow = document.querySelector('.chat-window');

    if (chatbotBtn && chatWindow) {
        chatbotBtn.addEventListener('click', () => {
            chatWindow.classList.toggle('hidden');
        });
    }

    // --- 3. CHAT MESSAGE LOGIC ---
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');

    let isFirstMessage = true;
    let waitingForFirstName = false;
    let waitingForLastName = false;
    let userFirstName = "";
    let userLastName = "";

    function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);
        messageDiv.textContent = text;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    if (chatForm) {
        chatForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const messageText = chatInput.value.trim();
            if (!messageText) return;
            addMessage(messageText, 'user');
            chatInput.value = "";
            setTimeout(() => {
                if (isFirstMessage) {
                    addMessage("Before we continue, please enter your First Name.", 'bot');
                    isFirstMessage = false;
                    waitingForFirstName = true;
                } else if (waitingForFirstName) {
                    userFirstName = messageText;
                    waitingForFirstName = false;
                    waitingForLastName = true;
                    addMessage(`Thank you ${userFirstName}! Please enter your Last Name.`, 'bot');
                } else if (waitingForLastName) {
                    userLastName = messageText;
                    waitingForLastName = false;
                    addMessage(`Nice to meet you, ${userFirstName} ${userLastName}! How can I assist you with your notes today?`, 'bot');
                } else {
                    addMessage("Your request has been received. This feature will be connected soon.", 'bot');
                }
            }, 800);
        });
    }

    // --- 4. SUPABASE CRUD LOGIC ---
    const contactForm = document.getElementById('contact-form');
    let editingId = null; // Track if we are editing an existing record

    if (contactForm) {
        const recordsBody = document.getElementById('records-body');
        const noRecordsDiv = document.getElementById('no-records');
        const submitBtn = contactForm.querySelector('button[type="submit"]');

        const inputs = {
            firstName: document.getElementById('first-name'),
            lastName: document.getElementById('last-name'),
            age: document.getElementById('age'),
            gender: document.getElementById('gender'),
            mobile: document.getElementById('mobile'),
            email: document.getElementById('email'),
            address: document.getElementById('address'),
            message: document.getElementById('message')
        };

        const loadRecords = async () => {
            try {
                const response = await fetch('/api/contact');
                const records = await response.json();
                displayRecords(records);
            } catch (error) {
                console.error("Error loading records:", error);
            }
        };

        const displayRecords = (records) => {
            if (!recordsBody) return;
            recordsBody.innerHTML = "";
            if (records.length === 0) {
                if (noRecordsDiv) noRecordsDiv.style.display = "block";
                return;
            }
            if (noRecordsDiv) noRecordsDiv.style.display = "none";
            
            records.forEach(record => {
                const row = document.createElement('tr');
                // Mapping Supabase column names to the table display
                row.innerHTML = `
                    <td>${record.firstName}</td>
                    <td>${record.lastName}</td>
                    <td>${record.Age}</td>
                    <td>${record.Gender}</td>
                    <td>${record.mobileNumber}</td>
                    <td>${record.emailAddress}</td>
                    <td>${record.Address || '-'}</td>
                    <td>${record.Description}</td>
                    <td>${new Date(record.submittedTime || Date.now()).toLocaleString()}</td>
                    <td>
                        <div style="display: flex; gap: 10px;">
                            <button onclick="editRecord(${record.Id})" class="btn-icon" title="Edit">
                                <i class="fa-solid fa-pen-to-square" style="color: var(--primary-color);"></i>
                            </button>
                            <button onclick="deleteRecord(${record.Id})" class="btn-icon" title="Delete">
                                <i class="fa-solid fa-trash" style="color: #ef4444;"></i>
                            </button>
                        </div>
                    </td>
                `;
                recordsBody.appendChild(row);
            });
        };

        // --- EXPOSE CRUD FUNCTIONS TO WINDOW ---
        window.deleteRecord = async (Id) => {
            if (!confirm("Are you sure you want to delete this record?")) return;
            try {
                const response = await fetch(`/api/contact/${Id}`, { method: 'DELETE' });
                if (response.ok) {
                    await loadRecords();
                }
            } catch (error) {
                alert("Delete failed.");
            }
        };

        window.editRecord = async (id) => {
            try {
                // Find local record first (to avoid extra fetch) or fetch from API
                const response = await fetch('/api/contact');
                const records = await response.json();
                const record = records.find(r => r.Id === id);
                
                if (record) {
                    editingId = id;
                    inputs.firstName.value = record.firstName;
                    inputs.lastName.value = record.lastName;
                    inputs.age.value = record.Age;
                    inputs.gender.value = record.Gender;
                    inputs.mobile.value = record.mobileNumber;
                    inputs.email.value = record.emailAddress;
                    inputs.address.value = record.Address || "";
                    inputs.message.value = record.Description;
                    
                    submitBtn.textContent = "Update Record";
                    window.scrollTo({ top: contactForm.offsetTop - 100, behavior: 'smooth' });
                }
            } catch (error) {
                console.error("Edit failed:", error);
            }
        };

        const saveRecord = async (record) => {
            const url = editingId ? `/api/contact/${editingId}` : '/api/contact';
            const method = editingId ? 'PUT' : 'POST';
            
            try {
                const response = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(record),
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    alert(editingId ? "Record updated successfully!" : "Record created successfully!");
                    editingId = null;
                    submitBtn.textContent = "Submit";
                    contactForm.reset();
                    await loadRecords();
                } else {
                    // Show the actual server error for debugging
                    alert("Server Error: " + (result.message || JSON.stringify(result)));
                }
            } catch (error) {
                alert("Network Error: " + error.message);
            }
        };

        const validateSpecificField = (id) => {
            const validateField = (id, isValid) => {
                const group = document.getElementById(`group-${id}`);
                if (group) {
                    isValid ? group.classList.remove('error') : group.classList.add('error');
                }
                return isValid;
            };

            switch(id) {
                case 'first-name': return validateField('first-name', inputs.firstName.value.trim() !== "");
                case 'last-name': return validateField('last-name', inputs.lastName.value.trim() !== "");
                case 'age':
                    const ageVal = parseInt(inputs.age.value);
                    return validateField('age', !isNaN(ageVal) && ageVal >= 1 && ageVal <= 99);
                case 'gender': return validateField('gender', inputs.gender.value !== "");
                case 'mobile': return validateField('mobile', /^[0-9]{10}$/.test(inputs.mobile.value));
                case 'email': return validateField('email', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inputs.email.value));
                case 'message': return validateField('message', inputs.message.value.trim() !== "");
                default: return true;
            }
        };

        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Simple validation check before submitting
            let isValid = true;
            ['first-name', 'last-name', 'age', 'gender', 'mobile', 'email', 'message'].forEach(f => {
                if (!validateSpecificField(f)) isValid = false;
            });

            if (isValid) {
                submitBtn.disabled = true;
                const originalText = submitBtn.textContent;
                submitBtn.textContent = "Processing...";

                const data = {
                    firstName: inputs.firstName.value.trim(),
                    lastName: inputs.lastName.value.trim(),
                    age: inputs.age.value,
                    gender: inputs.gender.value,
                    mobile: inputs.mobile.value,
                    email: inputs.email.value,
                    address: inputs.address.value.trim(),
                    message: inputs.message.value.trim()
                };

                await saveRecord(data);
                
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });

        loadRecords();
    }
});
