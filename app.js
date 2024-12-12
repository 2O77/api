const express = require('express')
const mysql = require('mysql2')
const app = express()
const PORT = 3000

app.use(express.json())

// MySQL bağlantısı
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '354657',
  database: 'clothing_app',
})

db.connect((err) => {
  if (err) {
    console.error('Veritabanı bağlantı hatası:', err)
    return
  }
  console.log('Veritabanına bağlanıldı.')
})

const { v4: uuidv4 } = require('uuid')

app.post('/products', (req, res) => {
  const { count, productData } = req.body

  if (!count || !productData) {
    return res.status(400).json({ error: 'Eksik veri gönderildi.' })
  }

  const { model, size, price, city, sale_date } = productData

  if (!sale_date) {
    return res.status(400).json({ error: 'Sale date gerekli.' })
  }

  // Ürünleri oluştur
  const products = []
  for (let i = 0; i < count; i++) {
    const productId = uuidv4() // Her ürün için benzersiz ID oluştur

    const product = {
      id: productId,
      model,
      size,
      price,
      city,
      sale_date, // sale_date ekleniyor
    }

    products.push(product)
  }

  // Ürünleri veritabanına ekle
  const insertQuery = `
    INSERT INTO products (id, model, size, price, city, sale_date)
    VALUES ?
  `

  const values = products.map((product) => [
    product.id,
    product.model,
    product.size,
    product.price,
    product.city,
    product.sale_date,
  ])

  db.query(insertQuery, [values], (err, results) => {
    if (err) {
      console.error('Veritabanı hatası:', err)
      return res.status(500).json({ error: 'Veritabanı hatası.' })
    }

    res.json({
      message: `${results.affectedRows} ürün başarıyla oluşturuldu.`,
    })
  })
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

    const product = results[0]

    res.json({
      type: product.model || null,
      size: product.size || null,
      price: product.price || null,
      city: product.city || null,
    })
  })
})

app.post('/poll/:pollID', (req, res) => {
  const { pollID } = req.params
  const {
    client_gender,
    client_birthdate,
    rating,
    expected_price,
    true_false_question_1,
    true_false_question_2,
    true_false_question_3,
    true_false_question_4,
    true_false_question_5,
    true_false_question_6,
  } = req.body

  if (
    !client_gender ||
    !client_birthdate ||
    typeof rating === 'undefined' ||
    typeof expected_price === 'undefined'
  ) {
    return res.status(400).json({ error: 'Eksik veya hatalı veri gönderildi.' })
  }

  // PollID'nin daha önce var olup olmadığını kontrol et
  const checkPollExistsQuery = 'SELECT * FROM polls WHERE id = ?'
  db.query(checkPollExistsQuery, [pollID], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Veritabanı hatası.' })
    }

    // Eğer anket zaten varsa, hata mesajı döndür
    if (results.length > 0) {
      return res
        .status(403)
        .json({ error: 'Çözdüğünüz anketi bir daha çözemezsiniz.' })
    }

    // Anketi oluştur
    const createPollQuery = `
      INSERT INTO polls (
        id, 
        client_gender, 
        client_birthdate, 
        rating, 
        expected_price,
        true_false_question_1, 
        true_false_question_2, 
        true_false_question_3, 
        true_false_question_4, 
        true_false_question_5, 
        true_false_question_6 
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

    db.query(
      createPollQuery,
      [
        pollID,
        client_gender,
        client_birthdate,
        rating,
        expected_price,
        true_false_question_1,
        true_false_question_2,
        true_false_question_3,
        true_false_question_4,
        true_false_question_5,
        true_false_question_6,
      ],
      (err, results) => {
        if (err) {
          if (err.code === 'ER_DUP_ENTRY') {
            return res
              .status(403)
              .json({ error: 'Çözdüğünüz anketi bir daha çözemezsiniz.' })
          }
          console.error('Veritabanı hatası:', err)
          return res.status(500).json({ error: 'Veritabanı hatası.' })
        }

        res.json({
          message: 'Anket başarıyla oluşturuldu.',
        })
      },
    )
  })
})

app.post('/dashboard', (req, res) => {
  const { city, age_range, type, size, gender } = req.body

  let query = `
    SELECT
        DATE_FORMAT(products.sale_date, '%Y-%m') AS month,
        AVG(polls.true_false_question_1) AS avg_question_1,
        AVG(polls.true_false_question_2) AS avg_question_2,
        AVG(polls.expected_price) AS avg_expected_price,
        AVG(polls.rating) AS avg_rating,
        AVG(products.price) AS avg_price
    FROM
        polls
    JOIN
        products ON polls.id = products.id
    WHERE 1=1
  `

  const filters = []

  if (city) {
    query += ' AND city = ?'
    filters.push(city)
  }
  if (age_range) {
    query += ' AND YEAR(CURDATE()) - YEAR(client_birthdate) BETWEEN ? AND ?'
    filters.push(...age_range.split('-').map(Number))
  }
  if (type) {
    query += ' AND products.model = ?'
    filters.push(type)
  }
  if (size) {
    query += ' AND size = ?'
    filters.push(size)
  }
  if (gender) {
    query += ' AND gender = ?'
    filters.push(gender)
  }

  query += `
    GROUP BY DATE_FORMAT(products.sale_date, '%Y-%m')
  `

  db.query(query, filters, (err, results) => {
    if (err) {
      console.error('SQL Error:', err)
      return res
        .status(500)
        .json({ error: 'Veritabanı hatası.', details: err.message })
    }
    res.json(results)
  })
})

app.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda çalışıyor.`)
})
