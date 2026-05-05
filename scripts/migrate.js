const { execSync } = require('child_process')

const name = process.argv[2]

if (!name) {
  console.error('\n❌  Migration-Name fehlt.')
  console.error('    Nutzung: npm run db:migrate -- <name>\n')
  process.exit(1)
}

execSync(`prisma migrate dev --name ${name}`, { stdio: 'inherit' })
