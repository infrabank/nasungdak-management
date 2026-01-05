import bcrypt from 'bcryptjs'

async function generateHash() {
  const password = '1'
  const hash = await bcrypt.hash(password, 10)

  console.log('\n=================================')
  console.log('비밀번호 해시 생성 완료')
  console.log('=================================\n')
  console.log(`비밀번호: ${password}`)
  console.log(`해시: ${hash}`)
  console.log('\n.env 파일에 다음 값을 설정하세요:')
  console.log(`AUTH_PASSWORD_HASH="${hash}"`)
  console.log('\n=================================\n')
}

generateHash()
