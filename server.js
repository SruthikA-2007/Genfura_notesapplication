const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, './')));

// In-memory data store for notes (simulating a database)
let notes = [
    { id: 1, title: 'Welcome note', content: 'This is a note from the backend!', color: 'purple', author: 'System' }
];

// API Endpoints
app.get('/api/notes', (req, res) => {
    res.json(notes);
});

app.post('/api/notes', (req, res) => {
    const newNote = {
        id: Date.now(),
        ...req.body
    };
    notes.push(newNote);
    res.status(201).json(newNote);
});

app.delete('/api/notes/:id', (req, res) => {
    const { id } = req.params;
    notes = notes.filter(note => note.id != id);
    res.status(204).send();
});

// Chatbot endpoint (simple placeholder)
app.post('/api/chat', (req, res) => {
    const { message, firstName, lastName } = req.body;
    // Here you could integrate with an actual AI service
    res.json({ response: "Message received by backend. Processing..." });
});

// Serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
