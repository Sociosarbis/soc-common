import mysql from 'mysql'

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: ''
})

connection.connect()

connection.query('CREATE TABLE IF NOT EXISTS user_key_store (\n' +
  ' uid INT NOT NULL,\n' +
  ' `key` VARCHAR(50) NOT NULL,\n' +
  ' `value` TEXT,\n' +
  ' ctime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,\n' +
  ' mtime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,\n' +
  ' PRIMARY KEY(uid, `key`),\n' +
  ' INDEX uid_asc (uid)\n' +
  ') ENGINE=INNODB'
  , (err, results) => {
  if (err) throw err
  console.log(results)
})

connection.query('DROP TRIGGER IF EXISTS user_key_store_update', (err, results) => {
    if (err) throw err
    console.log(results)
  }
)

connection.query('CREATE TRIGGER user_key_store_update BEFORE UPDATE ON user_key_store FOR EACH ROW\n' +
  'SET NEW.mtime = CURRENT_TIMESTAMP()', (err, results) => {
    if (err) throw err
    console.log(results)
  }
)

connection.query('INSERT IGNORE INTO user_key_store (uid, `key`, `value`)\n' +
  "VALUES (20200916, 'birth', '19940321'),\n" +
  "(20200916, 'pet', 'dog')", (err, results) => {
    if (err) throw err
    console.log(results)
  })

connection.query('UPDATE user_key_store\n' +
  "SET `value` = 'cat'\n" +
  "WHERE uid = 20200916 AND\n" +
  "`key` = 'pet'", (err, results) => {
    if (err) throw err
    console.log(results)
})

connection.query("SELECT `value`, mtime FROM user_key_store WHERE `key` = 'pet' AND uid = 20200916 LIMIT 1", (err, results) => {
    if (err) throw err
    console.log(results)
})

connection.end()

