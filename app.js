const express = require('express')
const mysql = require('mysql2')
const app = express()
const cors = require('cors')
const PORT = 3000
const jwt = require('jsonwebtoken')

app.use(express.json())
app.use(cors())

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

  const products = []
  for (let i = 0; i < count; i++) {
    const productId = uuidv4()

    const product = {
      id: productId,
      model,
      size,
      price,
      city,
      sale_date,
    }

    products.push(product)
  }

  const insertQuery = `
    INSERT INTO products (id, model, size, city, sale_date)
    VALUES ?
  `

  const values = products.map((product) => [
    product.id,
    product.model,
    product.size,
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

const secretKey = 'my_secret_key'

app.post('/admins', (req, res) => {
  const { username, password } = req.body

  const query = 'SELECT * FROM admins WHERE username = ? AND password = ?'
  db.query(query, [username, password], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Veritabanı hatası.' })
    }
    if (results.length === 0) {
      return res.status(404).json({ message: 'İsim veya şifre yanlış.' })
    }

    const payload = { id: results[0].user_id, username: results[0].username }
    const token = jwt.sign(payload, secretKey, { expiresIn: '1h' })

    console.log('Giriş başarılı:', results[0].username, results[0].user_id)

    res.json({
      message: 'Giriş başarılı.',
      token: token,
    })
  })
})

app.get('/admins', (req, res) => {
  const token =
    req.headers.authorization && req.headers.authorization.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: 'Token gerekli.' })
  }

  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Geçersiz token.' })
    }

    const query = 'SELECT * FROM admins WHERE user_id = ?'
    db.query(query, [decoded.id], (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Veritabanı hatası.' })
      }

      if (results.length === 0) {
        return res.status(404).json({ message: 'Kullanıcı bulunamadı.' })
      }

      res.json({
        id: results[0].user_id,
        username: results[0].username,
      })
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

  const checkPollExistsQuery = 'SELECT * FROM polls WHERE id = ?'
  db.query(checkPollExistsQuery, [pollID], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Veritabanı hatası.' })
    }

    if (results.length > 0) {
      return res
        .status(403)
        .json({ error: 'Çözdüğünüz anketi bir daha çözemezsiniz.' })
    }

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
  const { city, age_range, model, size, gender } = req.body

  let query = `
    SELECT
        DATE_FORMAT(products.sale_date, '%Y-%m') AS month,
        AVG(polls.true_false_question_1) AS avg_question_1,
        AVG(polls.true_false_question_2) AS avg_question_2,
        AVG(polls.true_false_question_3) AS avg_question_3,
        AVG(polls.true_false_question_4) AS avg_question_4,
        AVG(polls.true_false_question_5) AS avg_question_5,
        AVG(polls.true_false_question_6) AS avg_question_6,
        AVG(polls.expected_price) AS avg_expected_price,
        AVG(polls.rating) AS avg_rating
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
  if (model) {
    query += ' AND model = ?'
    filters.push(model)
  }
  if (size) {
    query += ' AND size = ?'
    filters.push(size)
  }
  if (gender) {
    query += ' AND client_gender = ?'
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

app.post('/poll/create/:count', async (req, res) => {
  const count = parseInt(req.params.count)

  if (isNaN(count) || count <= 0) {
    return res.status(400).json({
      error: 'Invalid count parameter. It must be a positive integer.',
    })
  }

  const cities = [
    'Adana',
    'Adıyaman',
    'Afyonkarahisar',
    'Ağrı',
    'Aksaray',
    'Amasya',
    'Ankara',
    'Antalya',
    'Ardahan',
    'Artvin',
    'Aydın',
    'Balıkesir',
    'Bartın',
    'Batman',
    'Bayburt',
    'Bilecik',
    'Bingöl',
    'Bitlis',
    'Bolu',
    'Burdur',
    'Bursa',
    'Çanakkale',
    'Çankırı',
    'Çorum',
    'Denizli',
    'Diyarbakır',
    'Düzce',
    'Edirne',
    'Elazığ',
    'Erzincan',
    'Erzurum',
    'Eskişehir',
    'Gaziantep',
    'Giresun',
    'Gümüşhane',
    'Hakkari',
    'Hatay',
    'Iğdır',
    'Isparta',
    'İstanbul',
    'İzmir',
    'Kahramanmaraş',
    'Karabük',
    'Karaman',
    'Kars',
    'Kastamonu',
    'Kayseri',
    'Kırıkkale',
    'Kırklareli',
    'Kırşehir',
    'Kilis',
    'Kocaeli',
    'Konya',
    'Kütahya',
    'Malatya',
    'Manisa',
    'Mardin',
    'Mersin',
    'Muğla',
    'Muş',
    'Nevşehir',
    'Niğde',
    'Ordu',
    'Osmaniye',
    'Rize',
    'Sakarya',
    'Samsun',
    'Siirt',
    'Sinop',
    'Sivas',
    'Şanlıurfa',
    'Şırnak',
    'Tekirdağ',
    'Tokat',
    'Trabzon',
    'Tunceli',
    'Uşak',
    'Van',
    'Yalova',
    'Yozgat',
    'Zonguldak',
  ]
  const models = [
    'sarı mont',
    'kırmızı kazak',
    'kot pantolon',
    'converse ayakkabı',
    'gri atkı',
  ]
  const sizes = ['xxl', 'xl', 'l', 'm', 's', 'xs']
  const genders = ['male', 'female', 'other']
  const modelPrices = {
    'sarı mont': Math.floor(Math.random() * (1000 - 500 + 1)) + 500,
    'kırmızı kazak': Math.floor(Math.random() * (500 - 100 + 1)) + 100,
    'kot pantolon': Math.floor(Math.random() * (700 - 300 + 1)) + 300,
    'converse ayakkabı': Math.floor(Math.random() * (800 - 400 + 1)) + 400,
    'gri atkı': Math.floor(Math.random() * (300 - 100 + 1)) + 100,
  }

  const randomDate = (start, end) => {
    return new Date(
      start.getTime() + Math.random() * (end.getTime() - start.getTime()),
    )
  }

  const products = []
  const polls = []

  for (let i = 0; i < count; i++) {
    const model = models[Math.floor(Math.random() * models.length)]
    const price = modelPrices[model]
    const id = uuidv4()

    const product = {
      id: id,
      model,
      size: sizes[Math.floor(Math.random() * sizes.length)],
      sale_date: randomDate(new Date(2024, 0, 1), new Date(2024, 11, 31))
        .toISOString()
        .split('T')[0],
      city: cities[Math.floor(Math.random() * cities.length)],
    }

    products.push(product)

    // Poll için soruları bağımsız olarak her seferinde farklı değerlerle üretiyoruz
    const poll = {
      id: id,
      true_false_question_1: Math.random() > 0.5,
      true_false_question_2: Math.random() > 0.5,
      true_false_question_3: Math.random() > 0.5,
      true_false_question_4: Math.random() > 0.5,
      true_false_question_5: Math.random() > 0.5,
      true_false_question_6: Math.random() > 0.5,
      client_gender: genders[Math.floor(Math.random() * genders.length)],
      client_birthdate: randomDate(new Date(1945, 0, 1), new Date(2005, 11, 31))
        .toISOString()
        .split('T')[0],
      rating: Math.floor(Math.random() * 5) + 1,
      expected_price: price + (Math.random() > 0.5 ? 100 : -100),
    }
    polls.push(poll)
  }

  try {
    // Inserting products
    for (const product of products) {
      await db.execute(
        `INSERT INTO products (id, model, size, sale_date, city) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          product.id,
          product.model,
          product.size,
          product.sale_date,
          product.city,
        ],
      )
    }
    // Inserting polls
    for (const poll of polls) {
      await db.execute(
        `INSERT INTO polls (
          id, true_false_question_1, true_false_question_2, true_false_question_3, 
          true_false_question_4, true_false_question_5, true_false_question_6, 
          client_gender, client_birthdate, rating, expected_price
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          poll.id,
          poll.true_false_question_1,
          poll.true_false_question_2,
          poll.true_false_question_3,
          poll.true_false_question_4,
          poll.true_false_question_5,
          poll.true_false_question_6,
          poll.client_gender,
          poll.client_birthdate,
          poll.rating,
          poll.expected_price,
        ],
      )
    }

    res.json({ polls, products })
  } catch (error) {
    console.error('Database error:', error)
    res.status(500).json({ error: 'An error occurred while saving data.' })
  } finally {
    db.end()
  }
})

app.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda çalışıyor.`)
})
