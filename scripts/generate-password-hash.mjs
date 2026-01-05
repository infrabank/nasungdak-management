import bcrypt from 'bcryptjs'

const password = process.argv[2] || '1'

bcrypt.hash(password, 10).then(hash => {
  console.log('\n======================')
  console.log('Password:', password)
  console.log('Hash:', hash)
  console.log('======================\n')
  console.log('Add this to your .env file:')
  console.log(`AUTH_PASSWORD_HASH="${hash}"`)
  console.log('\n')
}).catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
