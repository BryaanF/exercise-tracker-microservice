const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const bodyParser = require('body-parser')
const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
});

const exerciseSchema = new mongoose.Schema({
  description: String,
  duration: Number,
  date: { type: Date, default: Date.now },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

const mongo_uri = process.env.MONGO_URI;

// Connect to MongoDB using Mongoose
mongoose.connect(mongo_uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});


app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users', async (req, res) => {
  const { username } = req.body;
  try {
    // Cek apakah user sudah ada di database
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      // Jika user sudah ada, kembalikan data user yang ada
      return res.json({ username: existingUser.username, _id: existingUser._id });
    }

    // Jika user belum ada, buat user baru
    const newUser = new User({ username });
    await newUser.save();
    res.json({ username: newUser.username, _id: newUser._id });
  } catch (error) {
    res.status(400).json({ error: 'Invalid data' });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    // Ambil semua user dari database
    const users = await User.find({}, { username: 1, _id: 1 });
    // Kirim respon JSON
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});


//endpoint untuk menyimpan data exercise dari seorang user
app.post('/api/users/:_id/exercises', async (req, res) => {
  const { _id } = req.params;
  const { description, duration, date } = req.body;

  try {
    // Cari user berdasarkan _id
    const user = await User.findById(_id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Buat tanggal exercise
    const exerciseDate = date ? new Date(date) : new Date();

    // Simpan data exercise ke tabel Exercise
    const newExercise = new Exercise({
      description,
      duration: Number(duration),
      date: exerciseDate,
      userId: user._id, // Merujuk ke _id user
    });

    const savedExercise = await newExercise.save();

    // Kirim respon JSON
    res.json({
      username: user.username,
      description: savedExercise.description,
      duration: savedExercise.duration,
      date: savedExercise.date.toDateString(),
      _id: user._id,
    });
  } catch (error) {
    res.status(400).json({ error: 'Invalid data' });
  }
});

app.get('/api/users/:_id/logs', async (req, res) => {
  const { _id } = req.params; // Ambil _id dari parameter
  const { from, to, limit } = req.query; // Ambil query opsional

  try {
    // Cari user berdasarkan _id
    const user = await User.findById(_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Query untuk mengambil data exercise dari tabel Exercise
    let query = { userId: _id }; // Filter berdasarkan userId

    // Tambahkan filter tanggal "from" dan "to" jika ada
    if (from || to) {
      query.date = {};
      if (from) {
        const fromDate = new Date(from);
        if (!isNaN(fromDate)) {
          query.date.$gte = fromDate; // Tanggal lebih besar atau sama dengan "from"
        }
      }
      if (to) {
        const toDate = new Date(to);
        if (!isNaN(toDate)) {
          query.date.$lte = toDate; // Tanggal lebih kecil atau sama dengan "to"
        }
      }
    }

    // Ambil data exercise dari tabel Exercise dengan filter dan limit
    let exercisesQuery = Exercise.find(query).sort({ date: 1 }); // Urutkan berdasarkan tanggal
    if (limit && !isNaN(Number(limit))) {
      exercisesQuery = exercisesQuery.limit(Number(limit)); // Batasi jumlah data jika "limit" diberikan
    }

    const exerciseLogs = await exercisesQuery;

    // Format log data
    const log = exerciseLogs.map(entry => ({
      description: entry.description,
      duration: entry.duration,
      date: entry.date.toDateString(),
    }));

    // Kirim respon JSON
    res.json({
      username: user.username,
      count: log.length,
      _id: user._id,
      log,
    });
  } catch (error) {
    // Tangani error jika terjadi masalah
    res.status(400).json({ error: 'Invalid data' });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
