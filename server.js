const express = require('express');
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const session = require('express-session');
const MongoStore = require('connect-mongo');

// MongoDB URI and connection
mongoose.connect('mongodb://localhost:27017/StudySync', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("Database connected"))
  .catch(err => console.log("Database connection error:", err));


// Define the user schema
const userSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String
}, { collection: 'users' }); // Explicitly specify the collection name

const User = mongoose.model('User', userSchema);


// Define the upload schema (for regular uploads)
const uploadSchema = new mongoose.Schema({
    email: String,
    sem: String,
    subject: String,
    unit: String,
    file: String,
});

const Upload = mongoose.model('Upload', uploadSchema);

// Define the assignment schema (for assignment uploads)
const assignmentSchema = new mongoose.Schema({
    subject: String,
    unit: String,
    file: String,
});

const Assignment = mongoose.model('Assignment', assignmentSchema);

// Define the notes schema (for notes uploads)
const notesSchema = new mongoose.Schema({
    subject: String,
    unit: String,
    file: String,
});

const Notes = mongoose.model('Notes', notesSchema);

// Define the notes schema (for notes uploads)
const qpaperSchema = new mongoose.Schema({
    subject: String,
    exam_name: String,
    year:String,
    file: String,
});

const QPapers = mongoose.model('QPapers', qpaperSchema);

// Setup Express and Middleware
const app = express();
const PORT = 3000;

// Serving static files (like HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploadsAssignment', express.static(path.join(__dirname, 'assignments')));
app.use('/uploadsNotes', express.static(path.join(__dirname, 'notes')));
app.use('/uploadsQPapers', express.static(path.join(__dirname, 'qpapers')));

// Session setup with MongoDB store
app.use(session({
    secret: 'studySyncSecret',
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({ mongoUrl: 'mongodb://localhost:27017/StudySync' })
}));

/// Multer Storage Configuration for uploads (regular uploads)
const storageUploads = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        // Retain original file name
        cb(null, file.originalname);
    }
});

// Multer Storage Configuration for assignments
const storageAssignments = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'assignments/');
    },
    filename: (req, file, cb) => {
        // Retain original file name
        cb(null, file.originalname);
    }
});

// Multer Storage Configuration for notes
const storageNotes = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'notes/');
    },
    filename: (req, file, cb) => {
        // Retain original file name
        cb(null, file.originalname);
    }
});

// Multer Storage Configuration for qpapers
const storageQPapers = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'qpapers/');
    },
    filename: (req, file, cb) => {
        // Retain original file name
        cb(null, file.originalname);
    }
});


const upload = multer({ storage: storageUploads });
const uploadAssignment = multer({ storage: storageAssignments });
const uploadNotes = multer({ storage: storageNotes });
const uploadQPapers = multer({ storage: storageQPapers });

// Handle Signup
app.post('/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Check if the email already exists
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.send(`
                <script>
                    alert('Email is already registered!');
                    window.location.href = 'account.html';
                </script>
            `);
        }

        // Hash the password and save the new user
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            username,
            email,
            password: hashedPassword
        });

        await newUser.save();
        res.send(`
            <script>
                alert('Registration successful!');
                window.location.href = 'signup.html';
            </script>
        `);
    } catch (err) {
        console.error("Error in signup:", err);
        res.status(500).send("Error occurred while signing up");
    }
});

// Handle Login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // Check if the user exists
    const user = await User.findOne({ email });

    if (!user) {
        return res.send(`
            <script>
                alert('Email not found!');
                window.location.href = 'account.html';
            </script>
        `);
    }

    // Compare the password
    const match = await bcrypt.compare(password, user.password);

    if (match) {
        req.session.user = user;
        return res.send(`
            <script>
                alert('Login Successful!');
                window.location.href = 'login.html';
            </script>
        `);
    } else {
        res.send(`
            <script>
                alert('Invalid password!');
                window.location.href = 'account.html';
            </script>
        `);
    }
});


// Handle file upload (regular upload from upload.html)
app.post('/upload', upload.single('fileUpload'), async (req, res) => {
    const { email, sem, subject, unit } = req.body;
    const file = req.file;

    // Check if the email exists in the database
    const userExists = await User.findOne({ email });

    if (userExists) {
        const newUpload = new Upload({
            email: email,
            sem: sem,
            subject: subject,
            unit: unit,
            file: file.filename,
        });

        await newUpload.save();
        res.send(`
            <script>
                alert('Upload successful!');
                window.location.href = 'index.html';
            </script>
        `);
    } else {
        res.send(`
            <script>
                alert('Email not registered!');
                window.location.href = 'upload.html';
            </script>
        `);
    }
});

// Handle assignment uploads (from assignments.html)
app.post('/uploadAssignment', uploadAssignment.single('fileUpload'), async (req, res) => {
    const { subject, unit } = req.body;
    const file = req.file;

    if (!file) {
        return res.send(`
            <script>
                alert('Please upload a file!');
                window.location.href = 'assignments.html';
            </script>
        `);
    }

    const newAssignment = new Assignment({
        subject: subject,
        unit: unit,
        file: file.filename
    });

    await newAssignment.save();
    res.send(`
        <script>
            alert('Assignment uploaded successfully!');
            window.location.href = 'assignments.html';
        </script>
    `);
});

// Handle notes uploads (from notes.html)
app.post('/uploadNotes', uploadNotes.single('fileUpload'), async (req, res) => {
    const { subject, unit } = req.body;
    const file = req.file;

    if (!file) {
        return res.send(`
            <script>
                alert('Please upload a file!');
                window.location.href = 'notes.html';
            </script>
        `);
    }

    const newNote = new Notes({
        subject: subject,
        unit: unit,
        file: file.filename
    });

    await newNote.save();
    res.send(`
        <script>
            alert('Notes uploaded successfully!');
            window.location.href = 'notes.html';
        </script>
    `);
});

// Handle qpapers uploads (from qpapers.html)
app.post('/uploadQPaper', uploadQPapers.single('fileUpload'), async (req, res) => {
    const { subject, exam_name,year } = req.body;
    const file = req.file;

    if (!file) {
        return res.send(`
            <script>
                alert('Please upload a file!');
                window.location.href = 'qpapers.html';
            </script>
        `);
    }

    const newQPaper = new QPapers({
        subject: subject,
        exam_name: exam_name,
        year: year,
        file: file.filename
    });

    await newQPaper.save();
    res.send(`
        <script>
            alert('Question Paper uploaded successfully!');
            window.location.href = 'qpapers.html';
        </script>
    `);
});

app.get('/api/assignments', async (req, res) => {
    try {
        const { subject, unit } = req.query;
        let query = {};
        if (subject) query.subject = subject;
        if (unit) query.unit = unit;

        const assignments = await Assignment.find(query);
        res.json(assignments);
    } catch (error) {
        console.error('Error fetching assignments:', error);
        res.status(500).json({ message: 'Error fetching assignments' });
    }
});

app.get('/api/notes', async (req, res) => {
    try {
        const { subject, unit } = req.query;
        let query = {};
        if (subject) query.subject = subject;
        if (unit) query.unit = unit;

        const notes = await Notes.find(query);
        res.json(notes);
    } catch (error) {
        console.error('Error fetching notes:', error);
        res.status(500).json({ message: 'Error fetching notes' });
    }
});

app.get('/api/qpapers', async (req, res) => {
    try {
        const { subject, exam_name } = req.query;
        let query = {};
        if (subject) query.subject = subject;
        if (exam_name) query.exam_name = exam_name;

        const qpapers = await QPapers.find(query);
        res.json(qpapers);
    } catch (error) {
        console.error('Error fetching question papers :', error);
        res.status(500).json({ message: 'Error fetching question papers' });
    }
});

// Route to download assignments
app.get('/downloadAssignment/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'assignments', filename);
    res.download(filePath, (err) => {
        if (err) {
            console.error('Error downloading assignment:', err);
            res.status(500).send('Error downloading assignment');
        }
    });
});

app.get('/downloadNotes/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'notes', filename); // Adjust path as needed
    res.download(filePath, (err) => {
        if (err) {
            console.error('Error downloading note:', err);
            res.status(500).send('Error downloading note');
        }
    });
});


// Route to download question papers
app.get('/downloadQPaper/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'qpapers', filename);
    res.download(filePath, (err) => {
        if (err) {
            console.error('Error downloading question paper:', err);
            res.status(500).send('Error downloading question paper');
        }
    });
});

// Default route: serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
