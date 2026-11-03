export const AREA_CENTERS: Record<string, [number, number]> = {
  'Kabupaten Bangkalan': [-7.05, 112.74],
  'Kabupaten Banyuwangi': [-8.22, 114.37],
  'Kabupaten Blitar': [-8.10, 112.20],
  'Kabupaten Bojonegoro': [-7.15, 111.88],
  'Kabupaten Bondowoso': [-7.91, 113.82],
  'Kabupaten Gresik': [-7.16, 112.65],
  'Kabupaten Jember': [-8.17, 113.70],
  'Kabupaten Jombang': [-7.54, 112.23],
  'Kabupaten Kediri': [-7.82, 112.05],
  'Kabupaten Lamongan': [-7.12, 112.41],
  'Kabupaten Lumajang': [-8.13, 113.22],
  'Kabupaten Madiun': [-7.63, 111.53],
  'Kabupaten Magetan': [-7.64, 111.34],
  'Kabupaten Malang': [-8.15, 112.60],
  'Kabupaten Mojokerto': [-7.54, 112.46],
  'Kabupaten Nganjuk': [-7.61, 111.90],
  'Kabupaten Ngawi': [-7.40, 111.44],
  'Kabupaten Pacitan': [-8.20, 111.10],
  'Kabupaten Pamekasan': [-7.16, 113.48],
  'Kabupaten Pasuruan': [-7.73, 112.82],
  'Kabupaten Ponorogo': [-7.87, 111.46],
  'Kabupaten Probolinggo': [-7.86, 113.29],
  'Kabupaten Sampang': [-7.19, 113.24],
  'Kabupaten Sidoarjo': [-7.45, 112.70],
  'Kabupaten Situbondo': [-7.75, 114.01],
  'Kabupaten Sumenep': [-7.02, 113.86],
  'Kabupaten Trenggalek': [-8.05, 111.71],
  'Kabupaten Tuban': [-6.90, 111.99],
  'Kabupaten Tulungagung': [-8.10, 111.92],
  'Kota Batu': [-7.87, 112.53],
  'Kota Blitar': [-8.10, 112.17],
  'Kota Kediri': [-7.82, 112.01],
  'Kota Madiun': [-7.63, 111.52],
  'Kota Malang': [-7.98, 112.63],
  'Kota Mojokerto': [-7.47, 112.44],
  'Kota Pasuruan': [-7.65, 112.91],
  'Kota Probolinggo': [-7.75, 113.22],
  'Kota Surabaya': [-7.26, 112.75],
}

export const COLORS: Record<string, string> = {
  PLN: '#006199',
  'Non-PLN': '#E9AD2F',
  'Tidak diketahui': '#98A7B9',
  HCS: '#6B4EC6',
}

export const CHART_BLUE = '#087f83'

export const OWNERS = ['PLN', 'Non-PLN', 'Tidak diketahui']

export const POWER_OPTIONS = [
  { label: 'Semua kelompok', value: 'all' },
  { label: '≤ 22 kW', value: 'low' },
  { label: '> 22–50 kW', value: 'medium' },
  { label: '> 50–100 kW', value: 'fast' },
  { label: '> 100 kW', value: 'ultra' },
]

