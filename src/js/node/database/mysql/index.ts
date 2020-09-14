import mysql from 'mysql'

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '***************',
  database: '****'
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
  , (err, results, fields) => {
  if (err) throw err
  console.log(results)
})

connection.end()

