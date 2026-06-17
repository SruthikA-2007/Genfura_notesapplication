/*
  NoteSync Chatbot & Interactivity
  This script handles the chatbot and button popups.
*/

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. THEME TOGGLE LOGIC ---
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = themeToggle.querySelector('i');
    
    // Check for saved theme in localStorage
    if (localStorage.getItem('theme') === 'light') {
        document.body.classList.add('light-mode');
        themeIcon.classList.replace('fa-moon', 'fa-sun');
    }

    themeToggle.addEventListener('click', () => {
        const isLight = document.body.classList.toggle('light-mode');
        
        // Update Icon and Save preference
        if (isLight) {
            themeIcon.classList.replace('fa-moon', 'fa-sun');
            localStorage.setItem('theme', 'light');
        } else {
            themeIcon.classList.replace('fa-sun', 'fa-moon');
            localStorage.setItem('theme', 'dark');
        }
    });


    // --- 2. CHATBOT TOGGLE LOGIC ---
    const chatbotBtn = document.querySelector('.chatbot-toggle-btn');
    const chatWindow = document.querySelector('.chat-window');

    // When we click the button, show or hide the chat window
    chatbotBtn.addEventListener('click', () => {
        chatWindow.classList.toggle('hidden');
    });


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


    // --- 3. LOGIN & SIGNUP POPUPS ---
    const loginBtn = document.getElementById('login-btn');
    const signupBtn = document.getElementById('signup-btn');

    loginBtn.addEventListener('click', () => {
        alert("Login feature coming soon!");
    });

    signupBtn.addEventListener('click', () => {
        alert("Signup feature coming soon!");
    });

});
