import { createClient } from '@sanity/client'

const client = createClient({
  projectId: '18oh8tdj',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_TOKEN,
  useCdn: false,
})

async function run() {
await client.createOrReplace({
  _id: 'about',
  _type: 'about',
  name: 'Hunwoo Lee',
  nameKorean: '이헌우',
  role: 'Visual Artist',
  location: 'Chicago, USA',
  education: [
    { _key: 'edu1', abbr: 'DEMS',  full: 'Dhahran Elementary Middle School',   years: '2015–2019' },
    { _key: 'edu2', abbr: 'TASIS', full: 'The American School In Switzerland',  years: '2019–2023' },
    { _key: 'edu3', abbr: 'SAIC',  full: 'School of Arts Institute of Chicago', years: '2023–'     },
  ],
  exhibitions: [
    { _key: 'exh1', title: '"Mind Mapped"',     event: 'Art-Bash 2024',                venue: 'SAIC' },
    { _key: 'exh2', title: '"Passport Portal"', event: 'Intervening the Archive 2024', venue: 'SAIC' },
    { _key: 'exh3', title: '"Collage"',         event: 'KUAA CONNECT 2024',            venue: ''     },
  ],
  experiences: [
    { _key: 'exp1', role: 'Intern',        org: 'Korean Galleries Corp.', sub: '한국화랑협회' },
    { _key: 'exp2', role: 'Design Intern', org: 'KIAF 2024',              sub: ''              },
  ],
})

console.log('About document created.')
}

run()
