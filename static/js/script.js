/*
  NoteSync Chatbot & Interactivity
  This script handles the chatbot and button popups.
*/

document.addEventListener('DOMContentLoaded', () => {




    // --- 2. CHATBOT TOGGLE LOGIC ---
    const chatbotBtn = document.querySelector('.chatbot-toggle-btn');
    const chatWindow = document.querySelector('.chat-window');

    // When we click the button, show or hide the chat window
    if (chatbotBtn && chatWindow) {
        chatbotBtn.addEventListener('click', () => {
            chatWindow.classList.toggle('hidden');
        });
    }


    // --- 3. CHAT MESSAGE LOGIC ---
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');

    // State variables to remember user details
    let isFirstMessage = true;
    let waitingForFirstName = false;
    let waitingForLastName = false;
    let userFirstName = "";
    let userLastName = "";

    // Function to add a message bubble to the chat
    function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);
        messageDiv.textContent = text;

        chatMessages.appendChild(messageDiv);

        // Scroll to the latest message
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Handle the "Send" action
    if (chatForm) {
        chatForm.addEventListener('submit', (event) => {
            event.preventDefault(); // Stop page from refreshing

            const messageText = chatInput.value.trim();
            if (!messageText) return;

            // Display user message
            addMessage(messageText, 'user');
            chatInput.value = ""; // Clear input

            // Bot Response logic
            setTimeout(() => {
                if (isFirstMessage) {
                    addMessage("Before we continue, please enter your First Name.", 'bot');
                    isFirstMessage = false;
                    waitingForFirstName = true;
                }
                else if (waitingForFirstName) {
                    userFirstName = messageText;
                    waitingForFirstName = false;
                    waitingForLastName = true;
                    addMessage(`Thank you ${userFirstName}! Please enter your Last Name.`, 'bot');
                }
                else if (waitingForLastName) {
                    userLastName = messageText;
                    waitingForLastName = false;
                    addMessage(`Nice to meet you, ${userFirstName} ${userLastName}! How can I assist you with your notes today?`, 'bot');
                }
                else {
                    addMessage("Your request has been received. This feature will be connected to the notes system later.", 'bot');
                }
            }, 800);
        });
    }


    // --- 3. LOGIN, SIGNUP & CONTACT POPUPS ---

    const loginBtn = document.getElementById('login-btn');
    const signupBtn = document.getElementById('signup-btn');



    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            alert("Login feature coming soon!");
        });
    }

    if (signupBtn) {
        signupBtn.addEventListener('click', () => {
            alert("Signup feature coming soon!");
        });
    }


    // --- 4. CONTACT FORM LOGIC ---
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        const recordsBody = document.getElementById('records-body');
        const noRecordsDiv = document.getElementById('no-records');

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

        const loadRecords = () => {
            const records = JSON.parse(localStorage.getItem('contactRecords') || '[]');
            displayRecords(records);
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
                row.innerHTML = `
                    <td>${record.firstName}</td>
                    <td>${record.lastName}</td>
                    <td>${record.age}</td>
                    <td>${record.gender}</td>
                    <td>${record.mobile}</td>
                    <td>${record.email}</td>
                    <td>${record.address || '-'}</td>
                    <td>${record.message}</td>
                    <td>${record.submittedAt || '-'}</td>
                `;
                recordsBody.appendChild(row);
            });
        };

        const saveRecord = (record) => {
            const records = JSON.parse(localStorage.getItem('contactRecords') || '[]');
            
            // Check for existing record with same Email OR Mobile Number
            const existingIndex = records.findIndex(r => 
                r.email === record.email || r.mobile === record.mobile
            );

            if (existingIndex !== -1) {
                // Update existing record
                records[existingIndex] = record;
            } else {
                // Add new record
                records.push(record);
            }

            localStorage.setItem('contactRecords', JSON.stringify(records));
            displayRecords(records);
        };

        const validateField = (id, isValid) => {
            const group = document.getElementById(`group-${id}`);
            if (group) {
                if (isValid) {
                    group.classList.remove('error');
                } else {
                    group.classList.add('error');
                }
            }
            return isValid;
        };

        const validateSpecificField = (id) => {
            switch(id) {
                case 'first-name':
                    return validateField('first-name', inputs.firstName.value.trim() !== "");
                case 'last-name':
                    return validateField('last-name', inputs.lastName.value.trim() !== "");
                case 'age':
                    const ageVal = parseInt(inputs.age.value);
                    return validateField('age', !isNaN(ageVal) && ageVal >= 1 && ageVal <= 99 && inputs.age.value.length <= 2);
                case 'gender':
                    return validateField('gender', inputs.gender.value !== "");
                case 'mobile':
                    return validateField('mobile', /^[0-9]{10}$/.test(inputs.mobile.value));
                case 'email':
                    return validateField('email', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inputs.email.value));
                case 'message':
                    return validateField('message', inputs.message.value.trim() !== "");
                default:
                    return true;
            }
        };

        const checkValidation = () => {
            let isAllValid = true;
            if (!validateSpecificField('first-name')) isAllValid = false;
            if (!validateSpecificField('last-name')) isAllValid = false;
            if (!validateSpecificField('age')) isAllValid = false;
            if (!validateSpecificField('gender')) isAllValid = false;
            if (!validateSpecificField('mobile')) isAllValid = false;
            if (!validateSpecificField('email')) isAllValid = false;
            if (!validateSpecificField('message')) isAllValid = false;
            return isAllValid;
        };

        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (checkValidation()) {
                const submitBtn = contactForm.querySelector('button[type="submit"]');
                const originalText = submitBtn.textContent;

                submitBtn.disabled = true;
                submitBtn.textContent = "Submitting...";

                try {
                    const newRecord = {
                        firstName: inputs.firstName.value.trim(),
                        lastName: inputs.lastName.value.trim(),
                        age: inputs.age.value,
                        gender: inputs.gender.value,
                        mobile: inputs.mobile.value,
                        email: inputs.email.value,
                        address: inputs.address.value.trim(),
                        message: inputs.message.value.trim(),
                        submittedAt: new Date().toLocaleString()
                    };

                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    saveRecord(newRecord);
                    alert("Success! Your record has been saved.");
                    contactForm.reset();
                } catch (error) {
                    alert("An error occurred. Please try again.");
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }
            }
        });

        loadRecords();

        // Specific field validation on blur/interaction
        if (inputs.firstName) inputs.firstName.addEventListener('blur', () => validateSpecificField('first-name'));
        if (inputs.lastName) inputs.lastName.addEventListener('blur', () => validateSpecificField('last-name'));
        if (inputs.age) inputs.age.addEventListener('blur', () => validateSpecificField('age'));
        if (inputs.gender) {
            inputs.gender.addEventListener('change', () => validateSpecificField('gender'));
            inputs.gender.addEventListener('blur', () => validateSpecificField('gender'));
        }
        if (inputs.mobile) inputs.mobile.addEventListener('blur', () => validateSpecificField('mobile'));
        if (inputs.email) inputs.email.addEventListener('blur', () => validateSpecificField('email'));
        if (inputs.message) inputs.message.addEventListener('blur', () => validateSpecificField('message'));

        // Real-time error clearing
        Object.keys(inputs).forEach(key => {
            const input = inputs[key];
            if (!input) return;
            const id = input.id;
            input.addEventListener('input', () => {
                const group = input.closest('.form-group');
                if (group && group.classList.contains('error')) {
                    validateSpecificField(id);
                }
            });
        });
    }

});
