const express = require('express')
const mysql = require('mysql2')
const app = express()
const PORT = 3000

app.use(express.json())

// MySQL bağlantısı
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root', // Veritabanı kullanıcı adı
  password: '354657', // Veritabanı şifresi
  database: 'clothing_app', // Veritabanı adı
})

db.connect((err) => {
  if (err) {
    console.error('Veritabanı bağlantı hatası:', err)
    return
  }
  console.log('Veritabanına bağlanıldı.')
})

app.get('/poll/:pollID', (req, res) => {
  const { pollID } = req.params

  const query = 'SELECT * FROM products WHERE id = ?'
  db.query(query, [pollID], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Veritabanı hatası.' })
    }
    if (results.length === 0) {
      return res.status(404).json({ message: 'Ürün bulunamadı.' })
    }
    res.json(results[0])
  })
})

app.post('/poll/:pollID', (req, res) => {
  const { pollID } = req.params
  const {
    gender,
    age,
    rating,
    expected_price,
    true_false_question_1,
    true_false_question_2,
    true_false_question_3,
    true_false_question_4,
    true_false_question_5,
    true_false_question_6,
  } = req.body

  const query = `
            UPDATE products 
            SET 
                    client_rating = ?, 
                    client_expected_price = ?, 
                    client_age = ?, 
                    client_gender = ?, 
                    true_false_question_1 = ?, 
                    true_false_question_2 = ?, 
                    true_false_question_3 = ?, 
                    true_false_question_4 = ?, 
                    true_false_question_5 = ?, 
                    true_false_question_6 = ? 
            WHERE id = ?
    `

  db.query(
    query,
    [
      rating,
      expected_price,
      age,
      gender,
      true_false_question_1,
      true_false_question_2,
      true_false_question_3,
      true_false_question_4,
      true_false_question_5,
      true_false_question_6,
      pollID,
    ],
    (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Veritabanı hatası.' })
      }

      res.json({
        message: 'Ürün güncellendi.',
        affectedRows: results.affectedRows,
      })
    },
  )
})

app.post('/dashboard', (req, res) => {
  const { city, age_range, type, size, gender } = req.body

  let query = 'SELECT * FROM products WHERE 1=1'
  const filters = []

  if (city) {
    query += ' AND city = ?'
    filters.push(city)
  }
  if (age_range) {
    query += ' AND client_age BETWEEN ? AND ?'
    filters.push(...age_range.split('-').map(Number))
  }
  if (type) {
    query += ' AND type = ?'
    filters.push(type)
  }
  if (size) {
    query += ' AND size = ?'
    filters.push(size)
  }
  if (gender) {
    query += ' AND client_gender = ?'
    filters.push(gender)
  }

  db.query(query, filters, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Veritabanı hatası.' })
    }
    res.json(results)
  })
})

app.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda çalışıyor.`)
})
