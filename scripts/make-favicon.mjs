/**
 * 일회성: 나성닭강정 로고에서 수탉 마크를 따서 크림색 정사각 캔버스에 중앙 배치한 파비콘 생성
 * 사용: node scripts/make-favicon.mjs "<원본 경로>"
 */
import sharp from 'sharp'

const src = process.argv[2]
if (!src) {
  console.error('원본 경로를 인자로 주세요')
  process.exit(1)
}

const meta = await sharp(src).metadata()
console.log(`원본: ${meta.width}x${meta.height}`)

// 배경색 샘플: 마크 바로 옆 빈 영역 (비네트 톤 차이 방지)
const { data } = await sharp(src)
  .extract({ left: 870, top: 160, width: 1, height: 1 })
  .raw()
  .toBuffer({ resolveWithObject: true })
const bg = { r: data[0], g: data[1], b: data[2] }
console.log(`배경색: rgb(${bg.r},${bg.g},${bg.b})`)

// 수탉 마크 타이트 영역 (부스러기/텍스트/테두리 제외)
const mark = await sharp(src)
  .extract({ left: 420, top: 95, width: 510, height: 820 })
  .png()
  .toBuffer()

// 1000x1000 크림 캔버스 중앙 배치 (여백 포함)
const canvas = sharp({
  create: { width: 1000, height: 1000, channels: 3, background: bg },
}).composite([{ input: mark, left: 245, top: 82 }])

// 원본 비네트로 인한 패치 경계 제거: 밝은 배경 픽셀을 균일 크림색으로 평탄화
const { data: raw, info } = await canvas
  .raw()
  .toBuffer({ resolveWithObject: true })
for (let i = 0; i < raw.length; i += info.channels) {
  if (raw[i] >= 215 && raw[i + 1] >= 190 && raw[i + 2] >= 155) {
    raw[i] = bg.r
    raw[i + 1] = bg.g
    raw[i + 2] = bg.b
  }
}
const composed = await sharp(raw, {
  raw: { width: info.width, height: info.height, channels: info.channels },
})
  .png()
  .toBuffer()
await sharp(composed).resize(512, 512).png().toFile('app/icon.png')
await sharp(composed).resize(180, 180).png().toFile('app/apple-icon.png')
console.log('생성: app/icon.png (512), app/apple-icon.png (180)')
